import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import mapa


class MapaTest(unittest.TestCase):
    def test_versioned_output_and_pinned_offline_cli(self):
        with tempfile.TemporaryDirectory() as tmp:
            video = Path(tmp)
            (video / 'voz').mkdir()
            (video / 'voz' / 'tempos.json').write_text(json.dumps({'frases': []}), encoding='utf-8')
            (video / 'partitura.json').write_text(json.dumps({'takes': [{'take': 1, 't0': 0, 't1': 1, 'frase': 'teste'}]}), encoding='utf-8')
            (video / 'package.json').write_text(json.dumps({'scripts': {'check': 'npx --yes hyperframes@0.8.191 check'}}), encoding='utf-8')
            calls = []
            def snapshot(cmd, **kwargs):
                calls.append(cmd)
                (Path(cmd[cmd.index('-o') + 1]) / 'frame-0.png').write_bytes(b'frame')
            with patch.object(sys, 'argv', ['mapa.py', str(video)]), patch.object(mapa.subprocess, 'run', side_effect=snapshot):
                mapa.main()
                mapa.main()
            self.assertTrue((video / 'conferencia' / 'mapa-r1' / 'mapa.html').is_file())
            self.assertTrue((video / 'conferencia' / 'mapa-r2' / 'mapa.html').is_file())
            self.assertIn('hyperframes@0.8.191', calls[0])
            self.assertIn('--offline', calls[0])
            self.assertIn('--no-install', calls[0])

    def test_failure_does_not_leave_partial_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            video = Path(tmp)
            (video / 'voz').mkdir()
            (video / 'voz' / 'tempos.json').write_text('{"frases": []}', encoding='utf-8')
            (video / 'partitura.json').write_text('{"takes": [{"take": 1, "t0": 0, "t1": 1}]}', encoding='utf-8')
            (video / 'package.json').write_text('{"scripts": {"check": "hyperframes@0.8.191 check"}}', encoding='utf-8')
            with patch.object(sys, 'argv', ['mapa.py', str(video)]), \
                 patch.object(mapa.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, 'npx')):
                with self.assertRaises(subprocess.CalledProcessError):
                    mapa.main()
            self.assertEqual(list((video / 'conferencia').iterdir()), [])


if __name__ == '__main__':
    unittest.main()
