import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from montar_index import normalizar_termo, marcar_termos

SCRIPT = Path(__file__).with_name('montar_index.py')
ROOT = SCRIPT.parent.parent

class TestChave(unittest.TestCase):
    def gerar(self, partitura):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / 'voz').mkdir()
            data = {'duracao': 3, 'palavras': [
                {'palavra': 'PÍNO,', 'inicio': 0.5, 'fim': 0.9},
                {'palavra': 'pino', 'inicio': 1.5, 'fim': 1.9}]}
            (folder / 'voz/tempos.json').write_text(json.dumps(data), encoding='utf-8')
            (folder / 'partitura.json').write_text(json.dumps(partitura), encoding='utf-8')
            (folder / 'index.modelo.html').write_text('__TEMPOS__ __DURACAO__ <!--__LEGENDAS__-->', encoding='utf-8')
            subprocess.run([sys.executable, str(SCRIPT), str(folder), '--saida', 'resultado.html'], check=True, capture_output=True)
            return (folder / 'resultado.html').read_text(encoding='utf-8')

    def test_termo_no_take_normalizado(self):
        result = self.gerar({'takes': [{'t0': 0, 't1': 1, 'termos': ['pino']}, {'t0': 1, 't1': 3}]})
        self.assertEqual(result.count('clip chave'), 1)
        self.assertIn('clip chave" data-start="0.500"', result)
        self.assertIn('"destaque": true', result)

    def test_sem_termos(self):
        result = self.gerar({'takes': [{'t0': 0, 't1': 3}]})
        self.assertNotIn('clip chave', result)

    def test_comparacao_exata_de_termos_compostos(self):
        self.assertEqual(normalizar_termo(' «PÍNO-MÓLA!» '), 'pino-mola')
        self.assertEqual(len({normalizar_termo(s) for s in ('pino-mola', 'pino mola', 'pinomola')}), 3)
        words = ['pino-mola', 'pino mola', 'pinomola', 'pinos', 'pino', 'repino', 'PÍNO!']
        data = {'palavras': [{'palavra': w, 'inicio': 0.5} for w in words]}
        marcar_termos(data, {'takes': [{'t0': 0, 't1': 1, 'termos': ['pino', 'pino-mola']}]})
        self.assertEqual([w['palavra'] for w in data['palavras'] if w.get('destaque')], ['pino-mola', 'pino', 'PÍNO!'])

    def test_retroceder_nos_modelos_e_no_html_gerado(self):
        for template in (ROOT / 'modelo-video/modelos/index.modelo.html',):
            with self.subTest(template=template), tempfile.TemporaryDirectory() as tmp:
                folder = Path(tmp)
                (folder / 'voz').mkdir()
                (folder / 'voz/tempos.json').write_text(json.dumps({'duracao': 1, 'palavras': []}), encoding='utf-8')
                (folder / 'index.modelo.html').write_text(template.read_text(encoding='utf-8'), encoding='utf-8')
                subprocess.run([sys.executable, str(SCRIPT), str(folder), '--saida', 'resultado.html'], check=True, capture_output=True)
                generated = (folder / 'resultado.html').read_text(encoding='utf-8')
                self.assertIn('<span class="apv-retroceder-icone">◀◀</span>', generated)
                self.assertNotIn('??', generated)

if __name__ == '__main__':
    unittest.main()
