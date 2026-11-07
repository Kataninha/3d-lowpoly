"""Renderiza as vistas da vitrine do cenario (P2) com o Chromium headless do Playwright. Rodar da raiz do workspace:
python videos/13-piscina-no-topo/modelos/cenario/renderizar.py [vista ...]"""
from pathlib import Path
import functools, http.server, threading, subprocess, json, re, html, sys
raiz = Path.cwd()
saida = raiz / 'videos/13-piscina-no-topo/previews/p2-cenario'
chrome = sorted((Path.home() / 'AppData/Local/ms-playwright').glob('chromium-*/chrome-win64/chrome.exe'))[-1]
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(raiz)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{srv.server_port}/videos/13-piscina-no-topo/modelos/cenario/vitrine.html'
base = [str(chrome), '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--virtual-time-budget=60000']
vistas = sys.argv[1:] or ['torre-geral', 'torre-close', 'torre-corte', 'torre-cru', 'torre-vestindo', 'sala-geral', 'sala-close', 'sala-corte', 'sala-estalo', 'obra-geral', 'obra-close', 'obra-corte', 'raiox-geral', 'raiox-close', 'raiox-corte', 'raiox-varredura', 'sala-na-torre']
res = {}
mf = saida / 'medidas.json'
if mf.exists():
    res = json.loads(mf.read_text(encoding='utf8'))
try:
    for v in vistas:
        v, _, extra = v.partition('&')   # ex.: torre-cru&dbg=640,740,720,1060 lista as pecas sob esse retangulo de tela
        if extra:
            url_v = f'{url}?v={v}&{extra}'
            d = subprocess.run(base + ['--dump-dom', url_v], capture_output=True, text=True, timeout=240)
            m = re.search(r'data-test="([^"]*)"', d.stdout)
            print(json.dumps(json.loads(html.unescape(m.group(1))).get('dbg'), ensure_ascii=False) if m else d.stderr[-300:])
            continue
        alvo = saida / f'{v}.png'
        for _ in range(3):   # swiftshader as vezes estoura o tempo virtual: repete
            c = subprocess.run(base + ['--window-size=720,1280', f'--screenshot={alvo}', f'{url}?v={v}'], capture_output=True, text=True, timeout=240)
            d = subprocess.run(base + ['--dump-dom', f'{url}?v={v}'], capture_output=True, text=True, timeout=240)
            m = re.search(r'data-test="([^"]*)"', d.stdout)
            if m and 'erro' not in m.group(1) and alvo.exists() and alvo.stat().st_size > 20000: break   # PNG pequeno = quadro em branco
        res[v] = json.loads(html.unescape(m.group(1))) if m else {'erro': (c.stderr + d.stderr)[-800:]}
        print(v, 'ok' if alvo.exists() and m else 'FALHOU', flush=True)
finally:
    srv.shutdown()
mf.write_text(json.dumps(res, indent=1, ensure_ascii=False), encoding='utf8')
