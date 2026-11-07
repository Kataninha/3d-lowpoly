"""Roda qc/planejar.html no Chromium headless e grava camera.json + diagnosticos em qc/.
Uso (da raiz do workspace): python videos/13-piscina-no-topo/qc/planejar.py"""
from pathlib import Path
import html, http.server, json, re, subprocess, threading

RAIZ = Path.cwd()
VIDEO = RAIZ / 'videos/13-piscina-no-topo'
H = type('H', (http.server.SimpleHTTPRequestHandler,), {'log_message': lambda *a, **k: None, '__init__': lambda self, *a, **k: http.server.SimpleHTTPRequestHandler.__init__(self, *a, directory=str(RAIZ), **k)})
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
chrome = sorted((Path.home() / 'AppData/Local/ms-playwright').glob('chromium-*/chrome-win64/chrome.exe'))[-1]
r = subprocess.run([str(chrome), '--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--virtual-time-budget=600000', '--dump-dom',
                    f'http://127.0.0.1:{srv.server_port}/videos/13-piscina-no-topo/qc/planejar.html'], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=1200)
srv.shutdown()
m = re.search(r'data-plano="([^"]*)"', r.stdout)
if not m:
    raise SystemExit('sem saida: ' + (r.stderr or r.stdout)[-1500:])
d = json.loads(html.unescape(m.group(1)))
qc = VIDEO / 'qc'
(qc / 'camera-registro.json').write_text(json.dumps(d['registro'], indent=1, ensure_ascii=False), encoding='utf-8')
(qc / 'camera-diagnostico.json').write_text(json.dumps({k: d[k] for k in ('candidatos', 'reprovados', 'erros')}, indent=1, ensure_ascii=False), encoding='utf-8')
def fundir(cam, takes):
    """Contrato de ferramentas/camera_contract.py: 1 keyframe por take; sub-takes viram samples (corte = 2 samples a 1 ms)."""
    por = {}
    for k in cam['keyframes']:
        por.setdefault(k['take'], []).append(k)
    out = []
    for i, tk in enumerate(takes):
        subs = por[tk['take']]
        t0 = 0 if i == 0 else tk['t0']
        fim = takes[i + 1]['t0'] if i + 1 < len(takes) else tk['t1']
        amostras = []
        for j, k in enumerate(subs):
            ss = [dict(s) for s in k['samples']]
            if len(ss) == 1: ss[0]['t'] = k['tempo']
            if j + 1 < len(subs):
                if len(ss) == 1: ss.append(dict(ss[0]))
                ss[-1]['t'] = round(subs[j + 1]['tempo'] - 0.001, 4)    # corte seco entre sub-takes
            amostras += ss
        amostras[0]['t'] = max(amostras[0]['t'], tk['t0'])
        lim = round(tk['t1'] - 0.001, 4)
        if amostras[-1]['t'] > lim:                                    # mantem a imagem: pose interpolada em lim (como samplePose)
            for n in range(1, len(amostras)):
                a, b = amostras[n - 1], amostras[n]
                if b['t'] >= lim:
                    f = (lim - a['t']) / (b['t'] - a['t']) if b['t'] > a['t'] else 1
                    mix = lambda u, v: [x + (y - x) * f for x, y in zip(u, v)]
                    amostras = amostras[:n] + [{'t': lim, 'position': mix(a['position'], b['position']), 'target': mix(a['target'], b['target']), 'fov': a['fov'] + (b['fov'] - a['fov']) * f}]
                    break
        if len(amostras) == 1:
            amostras.append({**amostras[0], 't': round(tk['t1'] - 0.001, 4)})
        need = 5 if tk['shotType'] in ('TRK', 'REV') else 3
        while len(amostras) < need:                                   # densifica por interpolacao linear (mesma imagem do samplePose)
            gaps = [(amostras[n + 1]['t'] - amostras[n]['t'], n) for n in range(len(amostras) - 1)]
            g, n = max(gaps)
            a, b = amostras[n], amostras[n + 1]
            if g < 0.004:
                amostras.insert(n + 1, {**b, 't': round(b['t'] - 0.0005, 4)}); continue
            f = 0.5
            mix = lambda u, v: [x + (y - x) * f for x, y in zip(u, v)]
            amostras.insert(n + 1, {'t': round(a['t'] + g * f, 4), 'position': mix(a['position'], b['position']), 'target': mix(a['target'], b['target']), 'fov': a['fov'] + (b['fov'] - a['fov']) * f})
        k0 = dict(subs[0])
        k0.update({'tempo': t0, 'duracao': fim - t0, 'alvo': tk['subjectId'], 'candidato': 'A', 'corte': True, 'shotType': tk['shotType'], 'samples': amostras,
                   'fimPosicao': amostras[-1]['position'], 'fimFov': amostras[-1]['fov'], 'posicao': amostras[0]['position'], 'fov': amostras[0]['fov']})
        k0['direcao'] = [a - b for a, b in zip(amostras[0]['position'], amostras[0]['target'])]
        out.append(k0)
    return {**cam, 'keyframes': out}


if d.get('camera'):
    d['camera'] = fundir(d['camera'], json.loads((VIDEO / 'partitura.json').read_text(encoding='utf-8'))['takes'])
    (VIDEO / 'camera.json').write_text(json.dumps(d['camera'], indent=1, ensure_ascii=False), encoding='utf-8')
print('erros', len(d['erros']), 'reprovados', len(d['reprovados']), 'keyframes', len(d.get('camera', {}).get('keyframes', [])))
for e in d['erros']: print(' ERRO', e)
for x in d['reprovados']: print(' 90% falhou:', x['take'], x['t0'], x['alvo'], x['checks'])
