import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar_partitura
from test_takes import validar_direcao


class GerarPartituraTests(unittest.TestCase):
    def projeto(self, tmp):
        pasta = Path(tmp)
        (pasta / 'roteiro.txt').write_text('[curious] Se você cava\nEssa é a vala\n', encoding='utf-8')
        takes = [dict(frase=0, heroi='ze', ze_tam='grande', ze='M04 susto', motivo_ze='sofre', tipo_camera='falha', prova=[(0, 'CAVA')]),
                 dict(frase=1, heroi='peca', ze_tam='fora', ze='ausente', tipo_camera='nome', prova=[(1, 'vala')])]
        (pasta / 'takes.json').write_text(json.dumps(takes), encoding='utf-8')
        return pasta

    def test_estimativa_gera_partitura_valida(self):
        with tempfile.TemporaryDirectory() as tmp:
            pasta = self.projeto(tmp)
            takes, dados = gerar_partitura.gerar(pasta)
            self.assertLess(takes[0]['t1'], takes[1]['t0'])
            self.assertGreater(takes[0]['prova'][0], takes[0]['t0'])
            self.assertEqual(dados['palavras'][0]['palavra'], 'Se')
            salvo = json.loads((pasta / 'partitura.json').read_text(encoding='utf-8'))
            self.assertFalse(any(validar_direcao(salvo).values()))
            self.assertIn('| fora |', (pasta / 'partitura.md').read_text(encoding='utf-8'))

    def test_destaque_explicito_e_padrao_por_termos(self):
        with tempfile.TemporaryDirectory() as tmp:
            pasta = self.projeto(tmp)
            takes = json.loads((pasta / 'takes.json').read_text(encoding='utf-8'))
            takes[0].update(alvo='vala', termos=['cava'], destaque=[['pa', 'Você']])
            takes[1].update(alvo='vala', termos=['vala'])
            (pasta / 'takes.json').write_text(json.dumps(takes), encoding='utf-8')
            saida, _ = gerar_partitura.gerar(pasta)
            self.assertEqual(saida[0]['destaque'], [['pa', 'Você', 0]])
            self.assertEqual(saida[1]['destaque'], [['vala', 'vala', 1]])
            salvo = json.loads((pasta / 'partitura.json').read_text(encoding='utf-8'))
            self.assertEqual(salvo['takes'][1]['destaque'], [['vala', 'vala', 1]])
            takes[1]['destaque'] = [['vala', 'ponte']]
            (pasta / 'takes.json').write_text(json.dumps(takes), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'destaque ausente'):
                gerar_partitura.gerar(pasta)

    def test_palavra_ausente_e_takes_vazio_falham(self):
        with tempfile.TemporaryDirectory() as tmp:
            pasta = self.projeto(tmp)
            (pasta / 'takes.json').write_text(json.dumps([dict(frase=0, prova=[(0, 'ponte')])]), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Palavra ausente'):
                gerar_partitura.gerar(pasta)
            (pasta / 'takes.json').write_text('[]', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'vazio'):
                gerar_partitura.gerar(pasta)


if __name__ == '__main__':
    unittest.main()
