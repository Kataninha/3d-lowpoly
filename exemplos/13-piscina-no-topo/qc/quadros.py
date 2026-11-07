"""Renderiza quadros da montagem-cena.js com o Chromium headless (swiftshader) e grava PNGs.
Uso (da raiz do workspace): python videos/13-piscina-no-topo/qc/quadros.py <saida> <t1,t2,...> [--sem]
Os tempos sao renderizados NA ORDEM dada, num unico carregamento (serve ao teste de seek)."""
from pathlib import Path
import base64, functools, html, http.server, json, re, subprocess, sys, threading

RAIZ = Path.cwd()
VIDEO = RAIZ / 'videos/13-piscina-no-topo'


def chrome():
    return sorted((Path.home() / 'AppData/Local/ms-playwright').glob('chromium-*/chrome-win64/chrome.exe'))[-1]


def renderizar(tempos, saida=None, nomes=None, png=True, espera=240000, contato=False):
    # o import dinamico falha as vezes no 1o carregamento (corrida do Chromium headless): repete ate 3 vezes
    for tentativa in range(6):
        try:
            return _renderizar(tempos, saida, nomes, png, espera, contato)
        except RuntimeError as e:
            if 'Failed to fetch dynamically imported module' not in str(e) or tentativa == 5:
                raise


def _renderizar(tempos, saida=None, nomes=None, png=True, espera=240000, contato=False):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(RAIZ))
    handler = type("H", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a, **k: None, "__init__": lambda self, *a, **k: http.server.SimpleHTTPRequestHandler.__init__(self, *a, directory=str(RAIZ), **k)})
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        url = f'http://127.0.0.1:{srv.server_port}/videos/13-piscina-no-topo/previews/animatic/lote.html?t=' + ','.join(str(t) for t in tempos) + ('' if png else '&sem=1') + ('&contato=1' if contato else '')
        cmd = [str(chrome()), '--headless=new', '--no-sandbox', '--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
               '--hide-scrollbars', '--window-size=540,960', f'--virtual-time-budget={espera}', '--dump-dom', url]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=1500)
        m = re.search(r'data-frames="([^"]*)"', r.stdout)
        if not m:
            raise RuntimeError('sem saida: ' + (r.stderr or r.stdout)[-1200:])
        dados = json.loads(html.unescape(m.group(1)))
        if dados['erro']:
            raise RuntimeError(dados['erro'])
        if saida:
            saida = Path(saida); saida.mkdir(parents=True, exist_ok=True)
            for i, f in enumerate(dados['frames']):
                nome = (nomes[i] if nomes else f"t{f['t']:g}") + '.png'
                (saida / nome).write_bytes(base64.b64decode(f['png'].split(',', 1)[1]))
        return dados['frames']
    finally:
        srv.shutdown()


if __name__ == '__main__':
    saida, ts = sys.argv[1], [float(x) for x in sys.argv[2].split(',')]
    for f in renderizar(ts, saida, png='--sem' not in sys.argv):
        print(f['t'], f['info'])
