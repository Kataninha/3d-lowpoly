import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import provas


class ProvasTest(unittest.TestCase):
    def test_real_frames_and_out_of_range(self):
        with tempfile.TemporaryDirectory() as tmp:
            video = Path(tmp)
            (video / 'previews').mkdir()
            preview = video / 'previews' / 'preview-r1.mp4'
            subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=64x96:r=10:d=1',
                            '-c:v', 'libx264', str(preview)], check=True)
            score = {'takes': [{'take': 1, 'acao_peca': 'abre a tampa', 'prova': [0.2, 0.7]}]}
            (video / 'partitura.json').write_text(json.dumps(score), encoding='utf-8')
            script = Path(__file__).with_name('provas.py')
            cmd = [sys.executable, str(script), str(video)]
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
            self.assertEqual(result.returncode, 0, result.stderr)
            out = video / 'conferencia' / 'provas-r1'
            self.assertTrue((out / 'folha.html').is_file())
            self.assertTrue((out / 'folha.png').is_file())
            data = json.loads((out / 'provas.json').read_text(encoding='utf-8'))
            self.assertEqual(len(data), 2)
            self.assertTrue(all((out / item['png']).is_file() for item in data))
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((video / 'conferencia' / 'provas-r2' / 'folha.png').is_file())
            self.assertTrue((out / 'folha.png').is_file())
            score['takes'][0]['prova'] = [1.0]
            (video / 'partitura.json').write_text(json.dumps(score), encoding='utf-8')
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('duração', result.stderr)
            self.assertFalse((video / 'conferencia' / 'provas-r3').exists())

    def test_failure_after_staging_leaves_no_partial_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            video = Path(tmp)
            (video / 'partitura.json').write_text(json.dumps({'takes': [{'take': 1, 'acao_peca': 'x', 'prova': [0.2]}]}), encoding='utf-8')
            with patch.object(sys, 'argv', ['provas.py', str(video), '--preview', 'v.mp4']), \
                 patch.object(provas, 'duration', return_value=1), \
                 patch.object(provas.subprocess, 'run', side_effect=RuntimeError('falhou')):
                with self.assertRaises(RuntimeError):
                    provas.main()
            self.assertEqual(list((video / 'conferencia').iterdir()), [])


if __name__ == '__main__':
    unittest.main()
