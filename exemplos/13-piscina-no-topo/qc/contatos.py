"""Teste de contatos (mao -> alvo <= 0,05 u) nos tempos de prova da partitura. Raiz do workspace:
python videos/13-piscina-no-topo/qc/contatos.py"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from quadros import renderizar, VIDEO
takes = json.loads((VIDEO / 'partitura.json').read_text(encoding='utf-8'))['takes']
alvo = {7, 8, 9, 10, 11, 12, 14, 15, 16}
ts, dono = [], []
for tk in takes:
    if tk['take'] in alvo:
        for t in tk['prova']: ts.append(t); dono.append(tk['take'])
# tempos extras onde a acao principal acontece
extras = {8: [42.9, 44.0, 45.0, 52.5], 10: [61.8, 62.5], 12: [85.9], 15: [104.2, 104.6], 16: [110.9, 111.5, 112.9], 14: [98.6], 9: [55.5, 56.5], 7: [41.0, 41.3]}
for n, l in extras.items():
    for t in l: ts.append(t); dono.append(n)
res = []
for f, n in zip(renderizar(ts, png=False, contato=True), dono):
    info = f['info']
    ok = None
    if info:
        d = info.get('distancia')
        ok = (d is not None and d <= 0.05) if d is not None else (info.get('afundamento', 0) >= 0.8)
    res.append({'take': n, 't': f['t'], 'medida': info, 'ok': ok})
(VIDEO / 'qc' / 'contatos-r3.json').write_text(json.dumps(res, indent=1, ensure_ascii=False), encoding='utf-8')
for r in sorted(res, key=lambda r: r['t']): print(r['take'], r['t'], r['medida'], 'OK' if r['ok'] else ('FALHA' if r['ok'] is False else 'sem contato no quadro'))
