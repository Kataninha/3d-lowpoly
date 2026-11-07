from pathlib import Path
import functools, http.server, threading, subprocess, json, re
root=Path.cwd(); out=root/'biblioteca/personagens/ze-desmonte/referencias-v2'
chrome=Path.home()/'AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/biblioteca/personagens/ze-desmonte/referencias-v2/estudio.html'
base=[str(chrome),'--headless=new','--no-sandbox','--disable-gpu-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars','--virtual-time-budget=5000']
try:
 for name,qs,w,h in [('frente','giro=0',800,1000),('tres-quartos','giro=0.65',800,1000),('perfil','giro=1.570796',800,1000),('costas','giro=3.141593',800,1000),('rosto','close=1',800,1000),('antes-depois','compare=1',1200,1000),('bracos-abertos','pose=bra%C3%A7osAbertos',800,1000),('comemorar','pose=comemorar',800,1000)]:
  target=out/(name+'.png')
  if target.exists(): raise RuntimeError('Output exists: '+str(target))
  c=subprocess.run(base+[f'--window-size={w},{h}',f'--screenshot={target}',url+f'?w={w}&h={h}&'+qs],capture_output=True,text=True,timeout=60)
  if c.returncode or not target.exists(): raise RuntimeError(c.stderr)
  print(name, target.stat().st_size,flush=True)
 c=subprocess.run(base+['--dump-dom',url+'?w=800&h=1000'],capture_output=True,text=True,timeout=60)
 match=re.search(r'data-test="([^"]+)"',c.stdout)
 if not match: raise RuntimeError('test result absent: '+c.stderr[-2000:])
 import html
 result=json.loads(html.unescape(match.group(1))); print(json.dumps(result,ensure_ascii=False))
 (out/'teste-resultado.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 if result['failures']: raise RuntimeError('test failed')
finally: server.shutdown()
