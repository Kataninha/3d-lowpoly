import json, sys, unittest
from pathlib import Path
import tempfile
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parent))
import conferir
from conferir import measure, write_report
class TestConferir(unittest.TestCase):
    def test_missing_input_fails(self):
        with self.assertRaises(Exception): measure(Path('arquivo-que-nao-existe.mp4'))

    def test_motion_metrics_are_informational(self):
        for value in (35, 45, 60, None):
            with self.subTest(value=value), tempfile.TemporaryDirectory() as tmp:
                data = {'duracao_s': 1, 'lufs_integrado': None, 'pico_dbtp': None,
                        'mudancas_fortes_s': [], 'intervalo_medio_s': None,
                        'quase_parado_percentual': value,
                        'sfx': {'contagem': None, 'metodo': 'indisponível'}}
                write_report(Path(tmp), 'video.mp4', None, data)
                report = (Path(tmp) / 'resumo.md').read_text(encoding='utf-8')
                self.assertIn('só informativos', report)
                self.assertNotIn('ACIMA DA META', report)
                self.assertNotIn('meta ≤ 45%', report)
                self.assertIn('≤ -1 dBTP', report)
    def test_direction_summary_is_informational(self):
        takes = [{'t0': 0, 't1': 3, 'ze_tam': 'grande', 'tipo_camera': 'falha'},
                 {'t0': 3, 't1': 12, 'ze_tam': 'fora', 'tipo_camera': 'mecanismo'}]
        data = conferir.resumo_direcao(takes)
        self.assertEqual((data['takes'], data['segundos_por_take']), (2, 6))
        self.assertEqual(data['ze_percentual'], {'grande': 25, 'fora': 75})
        with tempfile.TemporaryDirectory() as tmp:
            write_report(Path(tmp), 'video.mp4', None, {'duracao_s': 1, 'lufs_integrado': None, 'pico_dbtp': None,
                         'mudancas_fortes_s': [], 'intervalo_medio_s': None, 'quase_parado_percentual': None,
                         'sfx': {'contagem': None, 'metodo': 'indisponível'}, 'direcao': data})
            report = (Path(tmp) / 'resumo.md').read_text(encoding='utf-8')
        self.assertIn('só informativo', report)
        self.assertIn('Zé: grande 25%', report)

    def test_sfx_per_minute_uses_disparos_and_video_duration(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            video = root / 'previews' / 'preview.mp4'
            video.parent.mkdir()
            video.touch()
            sounds = root / 'som'
            sounds.mkdir()
            (sounds / 'disparos.json').write_text(json.dumps({'duracao': 200, 'eventos': [{}] * 15}), encoding='utf-8')
            data = {'duracao_s': 60, 'lufs_integrado': None, 'pico_dbtp': None,
                    'mudancas_fortes_s': [], 'intervalo_medio_s': None,
                    'quase_parado_percentual': 60, 'sfx': {'contagem': 99, 'metodo': 'estimativa'}}
            out = root / 'relatorio'
            with patch.object(sys, 'argv', ['conferir.py', str(video), '--saida', str(out), '--limite-sfx-min', '14']), \
                 patch.object(conferir, 'measure', return_value=data), patch.object(conferir, 'sheet'):
                conferir.main()
            report = (out / 'resumo.md').read_text(encoding='utf-8')
            self.assertIn('15.00 SFX/min', report)
            self.assertIn('ACIMA DO LIMITE', report)
            self.assertEqual(json.loads((out / 'resumo.json').read_text(encoding='utf-8'))['sfx_disparos']['contagem'], 15)

    def test_missing_disparos_fails_with_limit(self):
        with tempfile.TemporaryDirectory() as tmp:
            video = Path(tmp) / 'video.mp4'
            video.touch()
            with patch.object(sys, 'argv', ['conferir.py', str(video), '--limite-sfx-min', '14']), self.assertRaises(SystemExit):
                conferir.main()

if __name__ == '__main__': unittest.main()
