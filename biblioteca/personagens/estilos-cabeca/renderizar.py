"""Renderiza a folha dos 10 estilos. Uso (da raiz do workspace): python biblioteca/personagens/estilos-cabeca/renderizar.py"""
from pathlib import Path
import functools, http.server, threading, subprocess, re, html
root=Path.cwd(); pasta=root/'biblioteca/personagens/estilos-cabeca'
chrome=Path.home()/'AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/biblioteca/personagens/estilos-cabeca/estudio.html'
base=[str(chrome),'--headless=new','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars','--virtual-time-budget=8000','--window-size=1500,700']
try:
 for nome,qs in [('estilos-tq','giro=0.45'),('estilos-frente','giro=0'),('estilos-costas','giro=3.1416')]:
  alvo=pasta/(nome+'.png'); c=subprocess.run(base+[f'--screenshot={alvo}',url+'?'+qs],capture_output=True,text=True,timeout=90)
  if c.returncode or not alvo.exists(): raise RuntimeError(c.stderr)
  print(nome)
 c=subprocess.run(base+['--dump-dom',url],capture_output=True,text=True,timeout=90)
 m=re.search(r'data-test="([^"]+)"',c.stdout); print('erros:',html.unescape(m.group(1)) if m else 'AUSENTE '+c.stderr[-800:])
finally: server.shutdown()
