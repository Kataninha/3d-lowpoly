import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import novo_video
import sons

SCRIPT = Path(__file__).with_name('pipeline.py')

class PipelineTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.videos = Path(self.tmp.name)
        self.video = self.videos / '01-teste'
        self.video.mkdir()

    def run_cli(self, *args):
        return subprocess.run([sys.executable, str(SCRIPT), '--videos', str(self.videos), *args], capture_output=True, text=True, encoding='utf-8')

    def state(self, stage='plano_aprovado'):
        (self.video / 'estado.json').write_text(json.dumps({'etapa': stage, 'velocidade_voz': 1.0, 'reprovacoes_p3': 0, 'historico': []}), encoding='utf-8')

    def test_pending_waits_for_user_audio(self):
        self.state()
        self.assertEqual(self.run_cli('pendente').returncode, 1)
        voice = self.video / 'voz'
        voice.mkdir()
        (voice / 'voz.wav').write_bytes(b'output')
        self.assertEqual(self.run_cli('pendente').returncode, 1)
        (voice / 'original.mp3').write_bytes(b'input')
        result = self.run_cli('pendente')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('voz', result.stdout)
        self.assertIn('01-teste', result.stdout)

    def test_script_approval_is_explicit_even_with_audio(self):
        self.state('roteiro_pendente')
        voice = self.video / 'voz'
        voice.mkdir()
        (voice / 'original.mp3').write_bytes(b'audio')
        self.assertNotIn('voz -', self.run_cli('pendente').stdout)
        self.assertNotEqual(self.run_cli('iniciar', '01-teste').returncode, 0)
        self.assertNotEqual(self.run_cli('preparar-voz', '01-teste').returncode, 0)
        self.assertNotEqual(self.run_cli('avancar', '01-teste', 'voz').returncode, 0)
        for gate in ('roteiro_aprovado', 'plano_pendente'):
            self.assertEqual(self.run_cli('avancar', '01-teste', gate).returncode, 0)
        self.assertNotIn('voz -', self.run_cli('pendente').stdout)
        self.assertEqual(self.run_cli('avancar', '01-teste', 'plano_aprovado').returncode, 0)
        self.assertIn('voz -', self.run_cli('pendente').stdout)

    def test_p4_requires_publication_and_retrospective(self):
        self.state('render')
        (self.video / 'publicacao.md').write_text('Titulo e legenda', encoding='utf-8')
        self.assertNotEqual(self.run_cli('avancar', '01-teste', 'P4').returncode, 0)
        (self.video / 'retrospectiva.md').write_text('O que funcionou e o que mudar', encoding='utf-8')
        self.assertEqual(self.run_cli('avancar', '01-teste', 'P4').returncode, 0)

    def test_advance_requires_next_or_same_and_force_is_recorded(self):
        self.state('voz')
        before = (self.video / 'estado.json').read_bytes()
        self.assertNotEqual(self.run_cli('avancar', '01-teste', 'P1').returncode, 0)
        self.assertEqual(before, (self.video / 'estado.json').read_bytes())
        self.assertEqual(self.run_cli('avancar', '01-teste', 'P1', '--forcar').returncode, 0)
        state = json.loads((self.video / 'estado.json').read_text(encoding='utf-8'))
        self.assertTrue(state['historico'][-1]['forcado'])
        self.assertEqual(state['historico'][-1]['de'], 'voz')
        self.assertEqual(self.run_cli('avancar', '01-teste', 'P1').returncode, 0)

    def test_rejection_returns_to_montage_and_records_history(self):
        self.state('montagem')
        result = self.run_cli('reprovar', '01-teste')
        self.assertEqual(result.returncode, 0, result.stderr)
        state = json.loads((self.video / 'estado.json').read_text(encoding='utf-8'))
        self.assertEqual(state['etapa'], 'P2')
        self.assertEqual(state['reprovacoes_p3'], 1)
        self.assertEqual(state['historico'][0]['etapa'], 'P3_reprovado')
        self.assertTrue(state['historico'][0]['data'])
        result = self.run_cli('pendente')
        self.assertEqual(result.returncode, 0)
        self.assertIn('montagem', result.stdout)

    def test_three_consecutive_rejections_pause(self):
        self.state('montagem')
        for index in range(3):
            if index:
                self.assertEqual(self.run_cli('avancar', '01-teste', 'montagem').returncode, 0)
            self.assertEqual(self.run_cli('reprovar', '01-teste').returncode, 0)
        result = self.run_cli('pendente')
        self.assertEqual(result.returncode, 1)
        self.assertIn('pausado', result.stdout)

    def test_p3_approval_resets_rejections(self):
        self.state('montagem')
        self.assertEqual(self.run_cli('reprovar', '01-teste').returncode, 0)
        self.assertEqual(self.run_cli('avancar', '01-teste', 'montagem').returncode, 0)
        self.assertEqual(self.run_cli('avancar', '01-teste', 'P3').returncode, 0)
        state = json.loads((self.video / 'estado.json').read_text(encoding='utf-8'))
        self.assertEqual(state['reprovacoes_p3'], 0)
        self.assertEqual(state['historico'][-1]['etapa'], 'P3')

    def test_rejection_requires_montage(self):
        self.state('P2')
        before = (self.video / 'estado.json').read_bytes()
        self.assertNotEqual(self.run_cli('reprovar', '01-teste').returncode, 0)
        self.assertEqual((self.video / 'estado.json').read_bytes(), before)

    def test_prevent_overwrite_voice(self):
        self.state()
        voice = self.video / 'voz'
        voice.mkdir()
        (voice / 'original.mp3').write_bytes(b'input')
        (voice / 'voz.wav').write_bytes(b'keep')
        self.assertNotEqual(self.run_cli('preparar-voz', '01-teste').returncode, 0)
        self.assertEqual((voice / 'voz.wav').read_bytes(), b'keep')

    def test_new_video_excludes_example_voice_timings(self):
        root = self.videos
        voice = root / 'modelo-video' / 'voz'
        voice.mkdir(parents=True)
        for name in ('tempos.json', 'eventos.json', 'instrucoes.txt'):
            (voice / name).write_text('example', encoding='utf-8')
        (root / 'modelo-video' / 'index.html').write_text('template', encoding='utf-8')
        template_script = Path(__file__).resolve().parent.parent / 'modelo-video' / 'roteiro.txt'
        (root / 'modelo-video' / 'roteiro.txt').write_bytes(template_script.read_bytes())
        with patch.object(novo_video, 'ROOT', root), patch.object(novo_video, 'sync'), \
             patch.object(sys, 'argv', ['novo_video.py', 'teste']):
            novo_video.main()
        self.assertIn('Veja a pe\u00e7a por dentro.', (root / 'videos' / '10-teste' / 'roteiro.txt').read_text(encoding='utf-8'))
        new_voice = root / 'videos' / '10-teste' / 'voz'
        project = new_voice.parent
        self.assertEqual(json.loads((project / 'estado.json').read_text(encoding='utf-8'))['etapa'], 'esqueleto_pendente')
        self.assertTrue(all((project / name).is_dir() for name in ('tarefas', 'previews', 'qc')))
        self.assertIn('prova', json.loads((project / 'partitura.json').read_text(encoding='utf-8'))['takes'][0])
        self.assertTrue(new_voice.is_dir())
        self.assertFalse((new_voice / 'tempos.json').exists())
        self.assertFalse((new_voice / 'eventos.json').exists())
        self.assertTrue((new_voice / 'instrucoes.txt').exists())
        self.assertTrue((voice / 'tempos.json').exists())

    def test_new_video_keeps_placeholder_audio_but_excludes_sample_events(self):
        root = self.videos
        sound = root / 'modelo-video' / 'som'
        sound.mkdir(parents=True)
        (sound / 'sfx.wav').write_bytes(b'placeholder')
        (sound / 'disparos.json').write_text('{}', encoding='utf-8')
        (sound / 'outro.txt').write_text('keep', encoding='utf-8')
        with patch.object(novo_video, 'ROOT', root), patch.object(novo_video, 'sync'), \
             patch.object(sys, 'argv', ['novo_video.py', 'teste']):
            novo_video.main()
        new_sound = root / 'videos' / '10-teste' / 'som'
        self.assertEqual((new_sound / 'sfx.wav').read_bytes(), b'placeholder')
        self.assertFalse((new_sound / 'disparos.json').exists())
        self.assertTrue((new_sound / 'outro.txt').exists())

    def test_sounds_replace_identical_placeholders_and_preserve_different_files(self):
        template = self.videos / 'template-som'
        template.mkdir()
        sound = self.video / 'som'
        sound.mkdir()
        events = self.video / 'eventos.json'
        events.write_text(json.dumps({'duracao': .2, 'eventos': [{'tempo': 0, 'som': 'tic'}]}), encoding='utf-8')
        for name in ('sfx.wav', 'disparos.json'):
            (template / name).write_bytes(b'placeholder-' + name.encode())
            (sound / name).write_bytes((template / name).read_bytes())
        with patch.object(sons, 'TEMPLATE_SOUND', template):
            sons.generate(self.video, events)
            self.assertNotEqual((sound / 'sfx.wav').read_bytes(), (template / 'sfx.wav').read_bytes())
            self.assertEqual(len(json.loads((sound / 'disparos.json').read_text(encoding='utf-8'))['eventos']), 1)
            for name in ('sfx.wav', 'disparos.json'):
                (sound / name).write_bytes((template / name).read_bytes())
            (sound / 'disparos.json').write_bytes(b'real work')
            with self.assertRaises(FileExistsError):
                sons.generate(self.video, events)
            self.assertEqual((sound / 'disparos.json').read_bytes(), b'real work')
            self.assertEqual((sound / 'sfx.wav').read_bytes(), (template / 'sfx.wav').read_bytes())
            (sound / 'disparos.json').write_bytes((template / 'disparos.json').read_bytes())
            (sound / 'sfx.wav').write_bytes(b'real audio')
            with self.assertRaises(FileExistsError):
                sons.generate(self.video, events)
            self.assertEqual((sound / 'sfx.wav').read_bytes(), b'real audio')

    def test_started_stage_is_not_pending_and_advance_clears_it(self):
        self.state('voz')
        result = self.run_cli('iniciar', '01-teste')
        self.assertEqual(result.returncode, 0, result.stderr)
        state = json.loads((self.video / 'estado.json').read_text(encoding='utf-8'))
        self.assertEqual(state['em_andamento']['etapa'], 'P0')
        datetime.fromisoformat(state['em_andamento']['desde'])
        result = self.run_cli('pendente')
        self.assertEqual((result.returncode, result.stdout), (1, ''))
        self.assertIn('P0', self.run_cli('status').stdout)
        self.assertEqual(self.run_cli('avancar', '01-teste', 'P0').returncode, 0)
        state = json.loads((self.video / 'estado.json').read_text(encoding='utf-8'))
        self.assertFalse(state.get('em_andamento'))

    def test_started_stage_over_90_minutes_alerts(self):
        self.state('voz')
        path = self.video / 'estado.json'
        state = json.loads(path.read_text(encoding='utf-8'))
        since = datetime.now(timezone.utc) - timedelta(minutes=91)
        state['em_andamento'] = {'etapa': 'P0', 'desde': since.isoformat()}
        path.write_text(json.dumps(state), encoding='utf-8')
        result = self.run_cli('pendente')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('01-teste: P0 em andamento desde ', result.stdout)

    def test_rejection_clears_started_stage(self):
        self.state('montagem')
        self.assertEqual(self.run_cli('iniciar', '01-teste').returncode, 0)
        self.assertEqual(self.run_cli('reprovar', '01-teste').returncode, 0)
        state = json.loads((self.video / 'estado.json').read_text(encoding='utf-8'))
        self.assertFalse(state.get('em_andamento'))

    def insumo(self, obrigatorio=True, limite='P2'):
        item = {'id': 'sfx-liquidificador', 'tipo': 'sfx', 'descricao': 'Som do motor',
                'arquivo': 'insumos/sfx-liquidificador.mp3', 'etapa_limite': limite,
                'obrigatorio': obrigatorio}
        (self.video / 'insumos.json').write_text(json.dumps([item]), encoding='utf-8')

    def test_missing_required_input_blocks_and_other_extension_releases(self):
        self.state('P1')
        self.insumo()
        listing = self.run_cli('insumos', '01-teste')
        self.assertIn('sfx-liquidificador', listing.stdout)
        self.assertIn('faltando', listing.stdout)
        self.assertIn('Som do motor', listing.stdout)
        result = self.run_cli('pendente')
        self.assertEqual(result.returncode, 1)
        self.assertIn('aguardando usuário: sfx-liquidificador', result.stdout)
        self.assertIn('aguardando 1 insumos', self.run_cli('status').stdout)
        before = (self.video / 'estado.json').read_bytes()
        for args in [('iniciar', '01-teste'), ('avancar', '01-teste', 'P2'), ('avancar', '01-teste', 'P3')]:
            result = self.run_cli(*args)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('sfx-liquidificador', result.stderr)
            self.assertEqual((self.video / 'estado.json').read_bytes(), before)
        directory = self.video / 'insumos'
        directory.mkdir()
        (directory / 'sfx-liquidificador.txt').write_text('not audio', encoding='utf-8')
        self.assertEqual(self.run_cli('pendente').returncode, 1)
        (directory / 'sfx-liquidificador.wav').write_bytes(b'audio')
        self.assertIn('entregue', self.run_cli('insumos', '01-teste').stdout)
        self.assertEqual(self.run_cli('pendente').returncode, 0)
        self.assertEqual(self.run_cli('iniciar', '01-teste').returncode, 0)

    def test_waiver_releases_required_input(self):
        self.state('P1')
        self.insumo()
        self.assertEqual(self.run_cli('dispensar', '01-teste', 'sfx-liquidificador').returncode, 0)
        data = json.loads((self.video / 'insumos.json').read_text(encoding='utf-8'))
        self.assertTrue(data[0]['dispensado'])
        self.assertEqual(self.run_cli('pendente').returncode, 0)

    def test_optional_and_future_inputs_do_not_block(self):
        self.state('P1')
        self.insumo(obrigatorio=False)
        self.assertEqual(self.run_cli('pendente').returncode, 0)
        self.assertEqual(self.run_cli('avancar', '01-teste', 'P2').returncode, 0)
        self.state('voz')
        self.insumo(limite='P2')
        self.assertEqual(self.run_cli('pendente').returncode, 0)
        self.assertEqual(self.run_cli('avancar', '01-teste', 'P0').returncode, 0)
        self.assertEqual(self.run_cli('avancar', '01-teste', 'P1').returncode, 0)
        self.assertEqual(self.run_cli('pendente').returncode, 1)

if __name__ == '__main__':
    unittest.main()
