import subprocess, sys, unittest
from pathlib import Path
from unittest.mock import patch
from conferir import count_onsets, measure
ROOT=Path(__file__).resolve().parent.parent
class WFHP3Tests(unittest.TestCase):
    def test_p3_requires_separate_sfx_before_writing(self):
        proc=subprocess.run([sys.executable,str(ROOT/'ferramentas/conferir.py'),'inexistente.mp4','--modo','P3'],capture_output=True,text=True)
        self.assertNotEqual(proc.returncode,0)
        self.assertIn('--sfx',proc.stderr)
        self.assertIn('INVALIDA',proc.stderr)
    def test_separate_sample_detects_three_events(self):
        self.assertEqual(len(count_onsets(ROOT/'ferramentas/fixtures/sfx-3-eventos.wav')),3)
    @patch('conferir.count_onsets',return_value=[1.0])
    @patch('conferir.run')
    @patch('conferir.probe',return_value={'format':{'duration':'8'},'streams':[{'codec_type':'audio'}]})
    def test_mixed_audio_is_not_valid_for_p3(self,probe,run,onsets):
        run.return_value=type('Output',(),{'stderr':''})()
        self.assertFalse(measure(Path('example.mp4'))['sfx']['valida_p3'])
        self.assertTrue(measure(Path('example.mp4'),Path('sfx.wav'))['sfx']['valida_p3'])
if __name__=='__main__': unittest.main()
