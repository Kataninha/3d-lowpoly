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


class DirecaoTests(unittest.TestCase):
    def test_direcao_no_chromium(self):
        root = Path(__file__).resolve().parent.parent
        candidates = sorted((Path.home() / 'AppData/Local/ms-playwright').glob('chromium-*/chrome-win64/chrome.exe'), reverse=True)
        chrome = str(candidates[0]) if candidates else shutil.which('chromium') or shutil.which('google-chrome')
        self.assertTrue(chrome, 'Chromium necessário')
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            url = f'http://127.0.0.1:{server.server_port}/ferramentas/fixtures/direcao.html'
            result = subprocess.run([chrome, '--headless=new', '--no-sandbox', '--virtual-time-budget=10000', '--dump-dom', url], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=90)
            self.assertEqual(result.returncode, 0, result.stderr[-1000:])
            match = re.search(r'data-test="([^"]+)"', result.stdout)
            self.assertIsNotNone(match, result.stderr[-1000:])
            self.assertEqual(json.loads(html.unescape(match.group(1))), [])
        finally:
            server.shutdown()
            server.server_close()
