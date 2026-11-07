from pathlib import Path
import functools, http.server, threading, subprocess, json, html, re, sys
# Separação ombro/cabeça x tronco em todas as poses e moves; sai com erro se algum gap passar de 0,05.
root=Path(__file__).resolve().parents[4]
chrome=Path.home()/'AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'
class Quieto(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*a): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quieto,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/biblioteca/personagens/ze-desmonte/referencias-v3/teste-ossos.html'
c=subprocess.run([str(chrome),'--headless=new','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--virtual-time-budget=8000','--enable-logging=stderr','--v=0','--dump-dom',url],capture_output=True,text=True,timeout=90)
server.shutdown()
m=re.search(r'data-test="([^"]+)"',c.stdout)
if not m:
  print('SEM RESULTADO\n'+'\n'.join(l for l in c.stderr.splitlines() if 'extensions' not in l)); sys.exit(2)
r=json.loads(html.unescape(m.group(1))); print(json.dumps(r,ensure_ascii=False))
sys.exit(1 if r.get('erro') or r['acima'] else 0)
