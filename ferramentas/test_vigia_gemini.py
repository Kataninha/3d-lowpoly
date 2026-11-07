import datetime
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('vigia_gemini.py')


class VigiaTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.state = self.root / 'state.json'
        self.log = self.root / 'cli-test.log'

    def run_vigia(self):
        return subprocess.run([sys.executable, str(SCRIPT), '--log-dir', str(self.root),
                               '--state-file', str(self.state)], capture_output=True,
                              text=True, encoding='utf-8')

    def test_empty_then_new_event_and_repeat(self):
        first = self.run_vigia()
        self.assertEqual((first.returncode, first.stdout), (1, ''))
        self.log.write_text('E1028 19:12:53.580799 errorreport.go UNAUTHENTICATED (code 401)\n', encoding='utf-8')
        result = self.run_vigia()
        self.assertEqual(result.returncode, 0, result.stderr)
        year = datetime.datetime.now().year
        self.assertEqual(result.stdout.strip(), f'Gemini caiu com 401 em {year}-10-28 19:12:53 (cli-test.log). Reenviar o último pedido do ponto salvo (BUGS B14).')
        again = self.run_vigia()
        self.assertEqual((again.returncode, again.stdout), (1, ''))

    def test_first_execution_suppresses_old_event(self):
        self.log.write_text('E1028 19:12:53.580799 errorreport.go UNAUTHENTICATED (code 401)\n', encoding='utf-8')
        first = self.run_vigia()
        self.assertEqual((first.returncode, first.stdout), (1, ''))
        self.assertTrue(self.state.exists())
        self.assertEqual((self.run_vigia().returncode, self.run_vigia().stdout), (1, ''))

    def test_latest_by_timestamp_not_file_order_and_old_does_not_alert(self):
        self.run_vigia()
        self.log.write_text('E1028 19:12:54.000000 errorreport.go UNAUTHENTICATED (code 401)\nE1028 19:12:53.000000 errorreport.go UNAUTHENTICATED (code 401)\n', encoding='utf-8')
        result = self.run_vigia()
        self.assertIn('19:12:54', result.stdout)
        self.log.write_text('E1028 19:12:52.000000 errorreport.go UNAUTHENTICATED (code 401)\n', encoding='utf-8')
        self.assertEqual(self.run_vigia().returncode, 1)


if __name__ == '__main__':
    unittest.main()
