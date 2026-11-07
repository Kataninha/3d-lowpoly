"""Regression coverage for the new camera and approval contracts."""
import json
from pathlib import Path
import tempfile
import unittest

from camera_contract import validate_intent, validate_selected_camera
from importar_transcricao import convert
from pipeline import new_state, read_state, require_render_approval, save_state
from sincronizar import sha256


class WorkflowPDFTests(unittest.TestCase):
    def test_real_hyperframes_array_keeps_timestamps(self):
        result = convert([{'text': 'Veja', 'start': .2, 'end': .7}], 'Veja.', 1)
        self.assertEqual(result['palavras'][0]['inicio'], .2)
        self.assertEqual(result['palavras'][0]['fim'], .7)
        with self.assertRaisesRegex(ValueError, 'mismatch'):
            convert([{'text': 'Outra', 'start': .2, 'end': .7}], 'Veja.', 1)

    def test_relation_requires_both_targets_and_valid_samples(self):
        take = dict(shotType='REL', subjectId='roda', relatedIds=['eixo'], leitura='Roda gira o eixo', t0=.2, t1=2)
        validate_intent(take)
        with self.assertRaisesRegex(ValueError, 'at least two'):
            validate_intent({**take, 'relatedIds': []})
        key = dict(alvo='roda', candidato='B', tempo=0, duracao=2,
                   samples=[dict(t=t, position=[0, 0, 3], target=[0, 0, 0], fov=38) for t in (.2, 1, 1.99)])
        data = dict(fontes=['camera.json'], keyframes=[key])
        validate_selected_camera(data, [take])
        key['samples'][1]['t'] = 2
        with self.assertRaisesRegex(ValueError, 'invalid sampled'):
            validate_selected_camera(data, [take])

    def test_audio_change_revokes_fixture_approval(self):
        with tempfile.TemporaryDirectory() as tmp:
            video = Path(tmp)
            (video / 'voz').mkdir()
            (video / 'qc').mkdir()
            voice = video / 'voz/voz.wav'
            voice.write_bytes(b'voice A fixture')
            evidence = video / 'qc/approval.md'
            evidence.write_text('Synthetic unit test evidence', encoding='utf-8')
            state = new_state(video)
            state['etapa'] = 'P3'
            state['aprovacao_render'] = dict(usuario='fixture', data='2026-11-02',
                evidencia='qc/approval.md', evidencia_sha256=sha256(evidence), inputs_sha256=state['hashes'])
            save_state(video, state)
            require_render_approval(video, read_state(video))
            voice.write_bytes(b'voice B fixture')
            current = read_state(video)
            self.assertEqual(current['etapa'], 'plano_aprovado')
            with self.assertRaisesRegex(ValueError, 'explicit user approval'):
                require_render_approval(video, current)
