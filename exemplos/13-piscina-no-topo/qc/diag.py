import functools, html, http.server, json, re, subprocess, threading
from pathlib import Path
RAIZ = Path.cwd()
H = type("H", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a, **k: None, "__init__": lambda self, *a, **k: http.server.SimpleHTTPRequestHandler.__init__(self, *a, directory=str(RAIZ), **k)})
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
chrome = sorted((Path.home() / 'AppData/Local/ms-playwright').glob('chromium-*/chrome-win64/chrome.exe'))[-1]
r = subprocess.run([str(chrome), '--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--virtual-time-budget=60000', '--enable-logging=stderr', '--v=0', '--dump-dom', f'http://127.0.0.1:{srv.server_port}/videos/13-piscina-no-topo/qc/diag.html'], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
m = re.search(r'data-diag="([^"]*)"', r.stdout)
print('\n'.join(json.loads(html.unescape(m.group(1)))) if m else r.stdout[-500:])
print([l for l in r.stderr.splitlines() if 'CONSOLE' in l][:10])
srv.shutdown()
