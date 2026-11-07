"""Renderiza PNGs do Zé v4. Uso (da raiz do workspace): python biblioteca/personagens/ze/referencias-v4/renderizar.py [nome=querystring ...]"""
from pathlib import Path
import functools, http.server, threading, subprocess, sys, json, re, html
root=Path.cwd(); out=root/'biblioteca/personagens/ze/referencias-v4'
chrome=Path.home()/'AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/biblioteca/personagens/ze/referencias-v4/estudio.html'
base=[str(chrome),'--headless=new','--no-sandbox','--disable-gpu-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars','--virtual-time-budget=8000']
shots=[('frente','giro=0'),('tres-quartos','giro=0.65'),('costas','giro=3.1416'),('perfil','giro=1.5708'),
 ('close-neutro','close=1&emocao=neutro&w=600&h=600'),('close-preocupado','close=1&emocao=preocupado&w=600&h=600'),
 ('close-bravo','close=1&emocao=bravo&w=600&h=600'),('close-triste','close=1&emocao=triste&w=600&h=600'),
 ('close-surpreso','close=1&emocao=surpreso&w=600&h=600'),('close-feliz','close=1&emocao=feliz&w=600&h=600'),
 ('capacete-frente','capacete=1&emocao=preocupado&pose=bra%C3%A7osAbertos'),('capacete-close','capacete=1&close=1&emocao=preocupado&w=600&h=600')]
if len(sys.argv)>1: shots=[tuple(a.split('=',1)) for a in sys.argv[1:]]
try:
 for name,qs in shots:
  target=out/(name+'.png')
  c=subprocess.run(base+['--window-size=800,1000' if 'w=' not in qs else '--window-size=600,600',f'--screenshot={target}',url+'?'+qs],capture_output=True,text=True,timeout=90)
  if c.returncode or not target.exists(): raise RuntimeError(c.stderr)
  print(name,flush=True)
 c=subprocess.run(base+['--dump-dom',url],capture_output=True,text=True,timeout=90)
 m=re.search(r'data-test="([^"]+)"',c.stdout)
 print('compatibilidade:',html.unescape(m.group(1)) if m else 'AUSENTE '+c.stderr[-800:])
finally: server.shutdown()
