"""Animatic de P2: um quadro no meio de cada keyframe de camera.json (rodar da raiz do workspace).
Uso: python videos/13-piscina-no-topo/qc/animatic.py <pasta-saida> [extra t,t,...]"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from quadros import renderizar, VIDEO
cam = json.loads((VIDEO / 'camera.json').read_text(encoding='utf-8'))
ks = cam['keyframes']
mids, nomes = [], []
for i, k in enumerate(ks):
    for rot, u in (('ini', 0.06), ('meio', 0.5), ('fim', 0.94)):
        t = round(k['tempo'] + u * k['duracao'], 2)
        mids.append(t); nomes.append(f"k{i+1:02d}-take{k['take']:02d}-{rot}-t{t:g}")
if len(sys.argv) > 3:
    sel = {int(x) for x in sys.argv[3].split(',')}
    pares = [(t, n) for t, n in zip(mids, nomes) if int(n.split('-take')[1][:2]) in sel]
    mids, nomes = [p[0] for p in pares], [p[1] for p in pares]
if len(sys.argv) > 2 and sys.argv[2] != '-':
    for t in sys.argv[2].split(','):
        mids.append(float(t)); nomes.append(f'extra-t{float(t):g}')
saida = Path(sys.argv[1])
for f, n in zip(renderizar(mids, saida, nomes), nomes):
    print(n, f['info'])
