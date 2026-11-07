from pathlib import Path
import functools, http.server, threading, subprocess, json, re, html
root=Path.cwd(); out=root/'biblioteca/personagens/ze-desmonte/referencias-v3'
chrome=Path.home()/'AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe'
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/biblioteca/personagens/ze-desmonte/referencias-v3/estudio.html'
base=[str(chrome),'--headless=new','--no-sandbox','--disable-gpu-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--hide-scrollbars','--virtual-time-budget=8000']
try:
 for name,qs in [('frente','giro=0'),('tres-quartos','giro=0.65'),('perfil','giro=1.570796'),('maos-na-cabeca','pose=maosNaCabeca'),('apontar','pose=apontar'),('comemorar','pose=comemorar'),('capacete-tres-quartos','giro=0.65&capacete=1&close=1'),('braco-para-cima','pose=ideia&giro=0.35&t=2'),('silhueta-v3','sil=1')]:
  target=out/(name+'.png')
  c=subprocess.run(base+['--window-size=800,1000',f'--screenshot={target}',url+'?'+qs],capture_output=True,text=True,timeout=60)
  if c.returncode or not target.exists(): raise RuntimeError(c.stderr)
  print(name,flush=True)
 c=subprocess.run(base+['--dump-dom',url],capture_output=True,text=True,timeout=60)
 match=re.search(r'data-test="([^"]+)"',c.stdout)
 if not match: raise RuntimeError('test result absent: '+c.stderr[-2000:])
 fails=json.loads(html.unescape(match.group(1))); print('compatibilidade:',fails)
 if fails: raise RuntimeError(str(fails))
 comparison=out/'comparacao.png'
 c=subprocess.run(['ffmpeg','-y','-v','error','-i',str(out/'referencia-usuario.png'),'-i',str(out/'frente.png'),'-filter_complex','[0:v]crop=270:615:0:10,scale=-2:900,pad=600:1000:(ow-iw)/2:50:color=0xeee9df[a];[1:v]crop=400:900:200:50,scale=-2:900,pad=600:1000:(ow-iw)/2:50:color=0xeee9df[b];[a][b]hstack=inputs=2','-frames:v','1',str(comparison)],capture_output=True,text=True,timeout=60)
 if c.returncode: raise RuntimeError(c.stderr)

finally: server.shutdown()
