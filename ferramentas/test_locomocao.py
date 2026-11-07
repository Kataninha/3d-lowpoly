import functools
import html
import http.server
import json
from pathlib import Path
import re
import shutil
import subprocess
import threading
import unittest

ALTURA_MAX = 0.03    # sola mais baixa vs chão (unidades mundo)
RAZAO_PATINA_MAX = 0.35  # deslocamento do pé de apoio / deslocamento da raiz por quadro
FIM_MAX = 1e-3       # pernas em repouso no fim


def medir():
    root = Path(__file__).resolve().parent.parent
    candidates = sorted((Path.home() / 'AppData/Local/ms-playwright').glob('chromium-*/chrome-win64/chrome.exe'), reverse=True)
    chrome = str(candidates[0]) if candidates else shutil.which('chromium') or shutil.which('google-chrome')
    assert chrome, 'Chromium necessário'
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        url = f'http://127.0.0.1:{server.server_port}/ferramentas/fixtures/locomocao.html'
        r = subprocess.run([chrome, '--headless=new', '--no-sandbox', '--virtual-time-budget=20000', '--dump-dom', url],
                           capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=120)
        m = re.search(r'data-test="([^"]+)"', r.stdout)
        assert m, r.stderr[-1000:]
        return json.loads(html.unescape(m.group(1)))['resultados']
    finally:
        server.shutdown(); server.server_close()


class LocomocaoTests(unittest.TestCase):
    def test_m09_pes_no_chao_sem_patinar(self):
        for r in medir():
            with self.subTest(r['nome']):
                self.assertLessEqual(r['maxAltura'], ALTURA_MAX, 'pé flutua ou afunda')
                self.assertLessEqual(r['razaoPatina'], RAZAO_PATINA_MAX, 'pé de apoio patina')
                self.assertGreater(r['contato'], 5, 'sem quadros de contato')
                f = r['fim']
                self.assertLessEqual(max(abs(f['pernaE']), abs(f['pernaD']), abs(f['joelhoE']), abs(f['joelhoD'])), FIM_MAX, 'termina no meio do passo')
                self.assertLessEqual(f['pos'], 1e-6, 'não chega ao destino')


if __name__ == '__main__':
    if __import__('sys').argv[1:] == ['--medir']:
        for r in medir(): print(json.dumps(r))
    else:
        unittest.main()
