import copy
import html
import json
import re
import unittest

from montar_index import caption_text, gerar_cartoes


class CartaoTest(unittest.TestCase):
    def setUp(self):
        self.data = {'duracao': 5, 'palavras': [
            {'palavra': 'Cimento,', 'inicio': 1, 'fim': 1.3},
            {'palavra': 'areia', 'inicio': 1.5, 'fim': 1.8},
            {'palavra': 'água', 'inicio': 2, 'fim': 2.3},
        ]}
        self.take = {'t0': 0, 't1': 4, 'cartao': [
            {'rotulo': 'Cimento', 'palavra': 'cimento', 'icone': 'cimento'},
            {'rotulo': 'Areia', 'palavra': 'areia', 'icone': 'areia'},
            {'rotulo': 'Água', 'palavra': 'agua', 'icone': 'agua'},
        ]}

    def test_tres_palavras_sincronizadas(self):
        card = gerar_cartoes(self.data, {'takes': [self.take]})
        starts = re.findall(r'class="clip apv-cartao-entrada" data-start="([\d.]+)"', card)
        self.assertEqual(starts, ['1.000', '1.500', '2.000'])
        self.assertEqual(card.count('<svg '), 3)
        self.assertEqual(card.count('apv-cartao-mais'), 2)
        self.assertIn('data-fim-fala="2.300"', card)
        self.assertIn('data-duration="1.433"', card)

    def test_ausencia_preserva_html_anterior(self):
        captions = [f'<div>{html.escape(caption_text(w["palavra"]))}</div>' for w in self.data['palavras']]
        previous = '\n'.join(captions)
        for score in ({}, {'takes': [{'t0': 0, 't1': 4}]}, {'takes': [{'t0': 0, 't1': 4, 'cartao': []}]}):
            cards = gerar_cartoes(self.data, score)
            self.assertEqual('\n'.join(([cards] if cards else []) + captions), previous)

    def test_rejeita_ambiguidade_e_ordem(self):
        duplicated = copy.deepcopy(self.data)
        duplicated['palavras'].append({'palavra': 'cimento', 'inicio': 3, 'fim': 3.2})
        with self.assertRaisesRegex(ValueError, 'ambígua'):
            gerar_cartoes(duplicated, [self.take])
        reversed_take = copy.deepcopy(self.take)
        reversed_take['cartao'].reverse()
        with self.assertRaisesRegex(ValueError, 'Ordem'):
            gerar_cartoes(self.data, [reversed_take])


if __name__ == '__main__':
    unittest.main()
