"""Animatic em MP4: quadros a cada 1 s (540x960) em lotes, montados com ffmpeg a 2 fps de exibicao.
Uso (raiz do workspace): python videos/13-piscina-no-topo/qc/animatic_video.py <saida.mp4>"""
import shutil, subprocess, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from quadros import renderizar
saida = Path(sys.argv[1]); passo = 1.0
ts = [round(i * passo + 0.05, 2) for i in range(138)]
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    for i in range(0, len(ts), 23):
        lote = ts[i:i + 23]
        renderizar(lote, tmp, [f'f{i + k:04d}' for k in range(len(lote))])
        print('lote', i, flush=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '2', '-i', str(tmp / 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(saida)], check=True)
print('ok', saida)
