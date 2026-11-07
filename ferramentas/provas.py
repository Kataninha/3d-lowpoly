"""Extrai quadros de prova do preview e cria uma folha de conferência."""
import argparse
import html
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile


def publish_version(staged, prefix):
    """Publica somente diretórios concluídos, mantendo versões anteriores."""
    for number in range(1, 1000000):
        target = staged.parent.parent / f'{prefix}-r{number}'
        if target.exists():
            continue
        try:
            os.rename(staged, target)
            return target
        except FileExistsError:
            continue
    raise ValueError('limite de versões excedido')


def takes_from(path):
    data = json.loads(path.read_text(encoding='utf-8-sig'))
    takes = data if isinstance(data, list) else data['takes']
    if not isinstance(takes, list) or not takes:
        raise ValueError('partitura sem takes')
    return takes


def duration(video):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                             '-of', 'default=noprint_wrappers=1:nokey=1', str(video)],
                            check=True, capture_output=True, text=True)
    value = float(result.stdout.strip())
    if not math.isfinite(value) or value <= 0:
        raise ValueError('duração inválida')
    return value


def preview_path(video, supplied):
    if supplied:
        path = Path(supplied)
        return path if path.is_absolute() else video / path
    candidates = list((video / 'previews').glob('preview-r*.mp4'))
    if not candidates:
        raise ValueError('nenhum preview encontrado; use --preview')
    def version(p):
        match = re.search(r'preview-r(\d+)', p.name)
        return (int(match.group(1)) if match else -1, p.name)
    return max(candidates, key=version)


def screenshot(page, target, height):
    browsers = [Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe'),
                Path(r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')]
    browser = next((p for p in browsers if p.is_file()), None)
    if browser is None:
        raise ValueError('Chrome ou Edge necessário para gerar folha.png')
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run([str(browser), '--headless', '--disable-gpu', '--hide-scrollbars',
                        f'--user-data-dir={profile}', f'--window-size=1200,{height}',
                        f'--screenshot={target.resolve()}', page.resolve().as_uri()],
                       check=True, capture_output=True)
    if not target.is_file():
        raise ValueError('navegador não criou folha.png')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('video', type=Path)
    parser.add_argument('--preview')
    args = parser.parse_args()
    video = args.video.resolve()
    source = preview_path(video, args.preview)
    length = duration(source)
    items = []
    for take in takes_from(video / 'partitura.json'):
        for time in take['prova']:
            if isinstance(time, bool) or not isinstance(time, (int, float)) or not math.isfinite(time) or not 0 <= time < length:
                raise ValueError(f'tempo de prova {time} fora da duração {length:.3f}s')
            items.append({'take': take['take'], 'acao': take['acao_peca'], 'tempo': time,
                          'png': f'quadro-{len(items)+1:03d}.png'})
    if not items:
        raise ValueError('partitura sem tempos de prova')
    conference = video / 'conferencia'
    conference.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.provas-', dir=conference) as tmp:
        out = Path(tmp) / 'saida'
        out.mkdir()
        rows = []
        for item in items:
            subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-ss', str(item['tempo']),
                            '-i', str(source), '-frames:v', '1', str(out / item['png'])], check=True)
            if not (out / item['png']).is_file():
                raise ValueError(f"nenhum quadro em {item['tempo']}s")
            rows.append(f'<article><img src="{item["png"]}"><div><b>Take {html.escape(str(item["take"]))} · {item["tempo"]} s</b><p>{html.escape(str(item["acao"]))}</p></div></article>')
        page = '<!doctype html><meta charset="utf-8"><title>Provas</title><style>body{font:16px Arial;margin:20px;background:#eee}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}article{background:white;padding:10px;height:380px;overflow:hidden}img{height:270px;max-width:100%;object-fit:contain}p{margin:8px 0}</style><h1>Provas da partitura</h1><main>' + ''.join(rows) + '</main>'
        (out / 'folha.html').write_text(page, encoding='utf-8')
        (out / 'provas.json').write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        screenshot(out / 'folha.html', out / 'folha.png', 100 + math.ceil(len(items) / 3) * 402)
        final = publish_version(out, 'provas')
    print(final / 'folha.html')


if __name__ == '__main__':
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
    try:
        main()
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as exc:
        print(f'Erro: {exc}', file=sys.stderr)
        sys.exit(2)
