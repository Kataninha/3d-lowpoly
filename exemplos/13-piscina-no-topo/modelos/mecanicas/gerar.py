"""Gera os PNGs de prova das mecanicas (Chrome headless + servidor local ja ativo).
Uso: python gerar.py <porta> <saida> [mecanica ...]   (sem mecanicas = todas as de index.js via lista abaixo)"""
import json, subprocess, sys, tempfile, re
from pathlib import Path

CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
porta, saida = sys.argv[1], Path(sys.argv[2]).resolve(); saida.mkdir(parents=True, exist_ok=True)
def chrome(args, size='900,700', **kw):
    with tempfile.TemporaryDirectory() as prof:
        return subprocess.run([CHROME, '--headless', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
                               '--hide-scrollbars', f'--user-data-dir={prof}', f'--window-size={size}', '--virtual-time-budget=3000', *args],
                              check=True, capture_output=True, timeout=90, **kw)
dom = chrome(['--dump-dom', f'http://127.0.0.1:{porta}/modelos/mecanicas/vitrine.html?m=_lista'], text=True, encoding='utf-8').stdout
tempos = json.loads(re.search(r'<title>lista (.*?)</title>', dom).group(1))
alvos = sys.argv[3:] or list(tempos)
(saida / 'sfx-encaixe.json').write_text(json.dumps({k: v['sfx'] for k, v in tempos.items()}, indent=1), encoding='utf-8')
for m in alvos:
    W, H = tempos[m]['size']
    for i, t in enumerate(tempos[m]['tempos']):
        png = saida / f'{m}-{i+1}-t{t:g}.png'
        url = f'http://127.0.0.1:{porta}/modelos/mecanicas/vitrine.html?m={m}&t={t}&w={W}&h={H}'
        chrome([f'--screenshot={png}', url], size=f'{W},{H}')
        print(png.name, png.stat().st_size)
    # folha de contato (5 quadros 3x2) para conferencia rapida; os PNGs individuais seguem sendo as provas
    pngs = sorted(saida.glob(f'{m}-[0-9]-t*.png'))
    if len(pngs) == 5:
        ht = round(600 * H / W); fc = ''.join(f'[{i}:v]scale=600:{ht}[s{i}];' for i in range(5)) + f'[s0][s1][s2][s3][s4]xstack=inputs=5:layout=0_0|600_0|1200_0|0_{ht}|600_{ht}:fill=white'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', *sum((['-i', str(p)] for p in pngs), []), '-filter_complex', fc, str(saida / f'{m}-folha.png')], check=True)
