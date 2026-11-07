"""Mapa de takes a partir de snapshots HyperFrames, sem render completo."""
import argparse
import html
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

from provas import takes_from, publish_version


def hyperframes_version(video):
    package = json.loads((video / 'package.json').read_text(encoding='utf-8-sig'))
    versions = set()
    for section in ('dependencies', 'devDependencies'):
        value = package.get(section, {}).get('hyperframes')
        if value:
            versions.add(value)
    for script in package.get('scripts', {}).values():
        versions.update(re.findall(r'(?<![\w@/-])hyperframes@(\d+\.\d+\.\d+)(?![\w.\-])', script))
    if len(versions) != 1 or not re.fullmatch(r'\d+\.\d+\.\d+', next(iter(versions), '')):
        raise ValueError('package.json deve fixar uma única versão exata do HyperFrames')
    return versions.pop()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('video', type=Path)
    ap.add_argument('--referencia', type=Path)
    ap.add_argument('--tempos-ref', type=Path, help='JSON de tempos da referência, opcional')
    args = ap.parse_args()
    video = args.video.resolve()
    takes = takes_from(video / 'partitura.json')
    voice = json.loads((video / 'voz' / 'tempos.json').read_text(encoding='utf-8-sig'))
    frases = voice['frases']
    mids = [(float(t['t0']) + float(t['t1'])) / 2 for t in takes]
    if any(float(t['t0']) < 0 or float(t['t1']) <= float(t['t0']) for t in takes):
        raise ValueError('intervalo de take inválido')
    version = hyperframes_version(video)
    conference = video / 'conferencia'
    conference.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.mapa-', dir=conference) as tmp:
        out = Path(tmp) / 'saida'
        out.mkdir()
        frames = out / 'quadros'
        frames.mkdir()
        npx = 'npx.cmd' if sys.platform == 'win32' else 'npx'
        subprocess.run([npx, '--offline', '--no-install', f'hyperframes@{version}', 'snapshot', str(video), '--at',
                        ','.join(str(t) for t in mids), '--no-end', '--describe', 'false',
                        '-o', str(frames)], check=True)
        photos = sorted(frames.glob('frame-*.png'), key=lambda p: int(re.search(r'frame-(\d+)', p.name).group(1)))
        if len(photos) != len(takes):
            raise ValueError(f'esperados {len(takes)} quadros, encontrados {len(photos)}')
        ref_times = None
        if args.tempos_ref:
            ref_times = json.loads(args.tempos_ref.read_text(encoding='utf-8-sig'))['frases']
        rows = []
        for i, (take, mid, photo) in enumerate(zip(takes, mids, photos)):
            text = take.get('frase') or next((f['texto'] for f in frases if f['inicio'] <= mid < f['fim']), '')
            ref = ''
            if args.referencia:
                time = mid
                if ref_times and i < len(ref_times):
                    f = ref_times[i]
                    time = (f.get('inicio', f.get('s')) + f.get('fim', f.get('e'))) / 2
                target = frames / f'ref-{i+1:03d}.png'
                subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-ss', str(time), '-i',
                                str(args.referencia), '-frames:v', '1', str(target)], check=True)
                if not target.is_file():
                    raise ValueError(f'referência sem quadro em {time}s')
                ref = f'<img src="quadros/{target.name}" alt="referência">'
            rows.append(f'<div class="take"><div class="imgs"><img src="quadros/{photo.name}" alt="take">{ref}</div><div><b>Take {html.escape(str(take["take"]))} · {mid:.2f} s</b><p>{html.escape(str(text))}</p></div></div>')
        page = '<!doctype html><meta charset="utf-8"><title>Mapa de takes</title><style>body{font:17px Arial;margin:32px;background:#f6f5f2}.take{display:flex;gap:20px;padding:14px 0;border-bottom:1px solid #ddd}.imgs{display:flex;gap:8px}img{width:180px;object-fit:contain}p{max-width:60ch}</style><h1>Mapa de takes</h1>' + ''.join(rows)
        (out / 'mapa.html').write_text(page, encoding='utf-8')
        final = publish_version(out, 'mapa')
    print(final / 'mapa.html')


if __name__ == '__main__':
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
    try:
        main()
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as exc:
        print(f'Erro: {exc}', file=sys.stderr)
        sys.exit(2)
