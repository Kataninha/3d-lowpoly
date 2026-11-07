"""Folha de contato 3x2 com os PNGs de uma pasta (ordem alfabetica): python folha.py <pasta> [inicio] [n]"""
import subprocess, sys
from pathlib import Path
pasta = Path(sys.argv[1]); ini = int(sys.argv[2]) if len(sys.argv) > 2 else 0; n = int(sys.argv[3]) if len(sys.argv) > 3 else 9
pngs = sorted(p for p in pasta.glob('*.png') if not p.name.startswith('folha'))[ini:ini + n]
w, h = 300, 533
fc = ''.join(f'[{i}:v]scale={w}:{h}[s{i}];' for i in range(len(pngs))) + ''.join(f'[s{i}]' for i in range(len(pngs))) + f"xstack=inputs={len(pngs)}:layout=" + '|'.join(f'{(i%3)*w}_{(i//3)*h}' for i in range(len(pngs))) + ':fill=black'
out = pasta / f'folha-{ini//n+1}.png'
subprocess.run(['ffmpeg', '-v', 'error', '-y', *sum((['-i', str(p)] for p in pngs), []), '-filter_complex', fc, str(out)], check=True)
print(out, [p.name for p in pngs])
