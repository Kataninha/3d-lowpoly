import functools
import http.server
import os
from pathlib import Path
import subprocess
import threading
import tempfile
import unittest


class MontagemTests(unittest.TestCase):
    def test_chromium_and_visuals(self):
        root = Path(__file__).resolve().parent.parent
        cache = Path(os.environ['LOCALAPPDATA']) / 'npm-cache' / '_npx'
        modules = list(cache.glob('*/node_modules/playwright'))
        self.assertTrue(modules, 'Playwright não instalado')
        browsers = sorted((Path(os.environ['LOCALAPPDATA']) / 'ms-playwright').glob('chromium-*/chrome-win64/chrome.exe'), reverse=True)
        self.assertTrue(browsers, 'Chromium não instalado')
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        output = Path(temp.name)
        script = r'''const {chromium}=require(process.argv[1]);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.argv[4],args:['--use-angle=swiftshader']});
try {const page=await browser.newPage({viewport:{width:960,height:720}});
for(const [name,t] of [['parede-0',0],['parede-25',.75],['parede-50',1.5],['parede-75',2.25],['parede-100',3],['verga-40',.48],['telha-translucida',1]]){
await page.goto(process.argv[2]+'?t='+t);await page.waitForFunction(()=>document.body.dataset.test!==undefined);const errors=await page.getAttribute('body','data-test');if(errors!=='[]')throw Error(errors);const path=require('path').join(process.argv[3],name+'.png');if(!require('fs').existsSync(path))await page.screenshot({path});}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});'''
        try:
            url = f'http://127.0.0.1:{server.server_port}/ferramentas/fixtures/montagem.html'
            result = subprocess.run(['node', '-e', script, str(modules[0]), url, str(output.resolve()), str(browsers[0])], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=90)
            self.assertEqual(result.returncode, 0, result.stderr)
        finally:
            server.shutdown()
            server.server_close()


if __name__ == '__main__':
    unittest.main()