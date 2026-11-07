import json
import math
import re
import contextlib
import functools
import html
import http.server
import io
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest import mock
from pathlib import Path

def validar(data, cena=None):
    errors = {"duracao": [], "saltos": [], "fontes": [], "alvos": []}
    if not isinstance(data, dict):
        errors['duracao'].append('câmera deve ser um objeto')
        return errors
    keys = data.get("keyframes", [])
    if not isinstance(keys, list) or not keys:
        errors["duracao"].append("keyframes ausentes")
        return errors
    fontes = data.get("fontes", ["camera.json"])
    if fontes != ['camera.json']:
        errors['fontes'].append('a única fonte declarada deve ser camera.json')
    for i, key in enumerate(keys):
        if isinstance(key, dict) and key.get('fonte', 'camera.json') != 'camera.json':
            errors['fontes'].append(f'take {i+1}: fonte divergente de camera.json')
    if cena is not None:
        if not isinstance(cena, str):
            errors['fontes'].append('código de cena inválido')
        else:
            # Detect common independent camera controls; this is a static heuristic,
            # not a proof that arbitrary JavaScript has exactly one camera source.
            checks = {
                'órbita': r'\b(?:OrbitControls|orbit|orbita|orbitar|orbitCamera|orbitCam|cameraOrbit)\b',
                'pulso': r'\b(?:pulse|pulso|cameraPulse|pulseCamera|cameraPulso|pulsoCamera)\b',
                'blend extra': r'\b(?:cameraBlend|blendCamera|blendCameraAt|cameraBlendAt)\b',
                'alteração adicional': r'\bcamera\s*\.\s*(?:(?:position|rotation)\s*\.\s*[xyz]|fov)\s*(?:\+=|-=)',
                'câmera alternativa': r'\b(?:function\s+)?camera(?:Ze|Orbit|Pulse|Blend)At\s*\(',
                'fonte extra': r'''(?:from\s*|import\s*\()\s*['\"][^'\"]*camera(?!\.json\b)[^'\"]*\.(?:js|mjs|json)['\"]''',
            }
            for name, pattern in checks.items():
                if re.search(pattern, cena.replace('./kit/camera/diretor.js', ''), re.IGNORECASE):
                    errors['fontes'].append(f'cena: possível segunda fonte ({name})')
    def num(value):
        return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
    def vector(value):
        return isinstance(value, (list, tuple)) and len(value) == 3 and all(num(x) for x in value)
    for i, k in enumerate(keys):
        if not isinstance(k, dict):
            errors['duracao'].append(f'take {i+1}: deve ser um objeto')
            continue
        if not (isinstance(k.get('alvo'), str) and k['alvo'].strip()) and not vector(k.get('alvo')):
            errors["alvos"].append(f"take {i+1}: alvo ausente")
        if not vector(k.get('posicao')) or ('fimPosicao' in k and not vector(k['fimPosicao'])):
            errors['duracao'].append(f'take {i+1}: posição inválida ou ausente')
        direction=k.get('direcao', k.get('posicao'))
        if not vector(direction) or sum(x*x for x in direction) <= 1e-12:
            errors['duracao'].append(f'take {i+1}: direção inválida ou nula')
        if 'fimAlvo' in k and not vector(k['fimAlvo']):
            errors['alvos'].append(f'take {i+1}: alvo final inválido')
        if not num(k.get('fov')) or not 0 < k['fov'] < 180:
            errors['duracao'].append(f'take {i+1}: FOV inválido ou ausente')
        if 'easing' in k and k['easing'] not in ('sine.inOut', 'power2.out', 'linear'):
            errors['duracao'].append(f'take {i+1}: easing desconhecido')
        if 'fimFov' in k and (not num(k['fimFov']) or not 0 < k['fimFov'] < 180):
            errors['duracao'].append(f'take {i+1}: FOV final inválido')
        try:
            if not num(k.get('tempo')) or not num(k.get('duracao')):
                raise ValueError('tempo/duração não numérico')
            start, duration = k["tempo"], k["duracao"]
            if not math.isfinite(start) or not math.isfinite(duration) or start < 0 or duration <= 0 or (duration < .3 and not k.get("corte")):
                errors["duracao"].append(f"take {i+1}: duração/tempo inválido")
            if i:
                prev = keys[i-1]
                delta = start - float(prev["tempo"])
                if delta <= 0 or (delta < .3 and not k.get("corte")) or abs(delta - float(prev["duracao"])) > 1e-4:
                    errors["duracao"].append(f"take {i+1}: intervalo inválido")
                if not k.get("corte"):
                    a, b = prev.get("fimPosicao", prev["posicao"]), k["posicao"]
                    # Video 07 interpolates position over 0.45 s; FOV is set
                    # immediately in cameraAt(), even during that blend.
                    blend = float(k.get("transicao", data.get("transicao", .45)))
                    if math.dist(a,b) > 1e-5 and (blend < .3 or blend > float(k["duracao"])):
                        errors["saltos"].append(f"take {i+1} ({start:g}s): posicao sem transicao suficiente")
                    if abs(float(prev.get("fimFov", prev["fov"])) - float(k["fov"])) > 1e-5 and not (data.get('interpolarFov') is True and .3 <= blend <= duration):
                        errors["saltos"].append(f"take {i+1} ({start:g}s): FOV instantaneo sem corte")
        except (KeyError, TypeError, ValueError, AttributeError):
            errors["duracao"].append(f"take {i+1}: dados inválidos")
    return errors

HEROIS = ('peca', 'mundo', 'ze')
TAMANHOS = ('fora', 'pequeno', 'grande')
TIPOS_CAMERA = ('obra', 'mecanismo', 'falha', 'nome', 'pov', 'topo', 'lista')

def validar_direcao(partitura, ficha=None):
    """Check that direction was decided and is consistent; numbers stay with the producer."""
    errors = {"decisoes": [], "ficha": []}
    takes = partitura if isinstance(partitura, list) else partitura.get('takes') if isinstance(partitura, dict) else None
    if not isinstance(takes, list) or not takes:
        errors['decisoes'].append('partitura sem takes')
        return errors
    for i, take in enumerate(takes, 1):
        if not isinstance(take, dict):
            errors['decisoes'].append(f'take {i}: deve ser um objeto')
            continue
        if take.get('heroi') not in HEROIS:
            errors['decisoes'].append(f'take {i}: heroi ausente ou inválido')
        if take.get('ze_tam') not in TAMANHOS:
            errors['decisoes'].append(f'take {i}: ze_tam ausente ou inválido')
        if take.get('tipo_camera') not in TIPOS_CAMERA:
            errors['decisoes'].append(f'take {i}: tipo_camera ausente ou inválido')
        acao = str(take.get('ze', '')).strip()
        tem_acao = bool(acao) and not re.search('ausente', acao, re.IGNORECASE)
        if take.get('ze_tam') == 'fora' and tem_acao:
            errors['decisoes'].append(f'take {i}: Zé fora de cena com ação na partitura')
        if take.get('ze_tam') in ('pequeno', 'grande') and not str(take.get('motivo_ze', '')).strip():
            errors['decisoes'].append(f'take {i}: Zé em cena sem motivo_ze')
    if ficha is not None and (not ficha.strip() or 'a decidir' in ficha.casefold()):
        errors['ficha'].append('direcao.md com decisões pendentes')
    return errors

class TakesTests(unittest.TestCase):
    def test_fixtures(self):
        folder = Path(__file__).parent / 'fixtures'
        good = json.loads((folder / 'camera-bom.json').read_text(encoding='utf-8'))
        bad = json.loads((folder / 'camera-ruim.json').read_text(encoding='utf-8'))
        self.assertFalse(any(validar(good).values()))
        self.assertTrue(validar(bad)['fontes'])
        self.assertTrue(validar(bad)['alvos'])
        self.assertTrue(validar(bad)['duracao'])

    def test_smooth_position_and_fov_jump(self):
        data = {'keyframes': [
            {'tempo': 0, 'duracao': 1, 'alvo': 'a', 'posicao': [0,0,1], 'fov': 40},
            {'tempo': 1, 'duracao': 1, 'alvo': 'a', 'posicao': [1,0,1], 'fov': 40}]}
        self.assertFalse(validar(data)['saltos'])
        data['keyframes'][1]['fov'] = 45
        self.assertTrue(validar(data)['saltos'])
        data['interpolarFov'] = True
        self.assertFalse(validar(data)['saltos'])
        data.pop('interpolarFov')
        data['keyframes'][1]['corte'] = True
        self.assertFalse(validar(data)['saltos'])

    def test_missing_fields_in_each_take(self):
        self.assertTrue(any(validar({'keyframes':[{'tempo':0,'duracao':1,'alvo':'x'}]}).values()))
        for field in ('posicao','alvo','fov','duracao'):
            key={'tempo':0,'duracao':1,'alvo':'x','posicao':[0,0,1],'fov':40}
            del key[field]
            self.assertTrue(any(validar({'keyframes':[key]}).values()),field)
            first={'tempo':0,'duracao':1,'alvo':'x','posicao':[0,0,1],'fov':40}
            key['tempo']=1
            self.assertTrue(any(validar({'keyframes':[first,key]}).values()),field)

    def test_direction_and_camera_source(self):
        take={'tempo':0,'duracao':1,'alvo':'a','posicao':[0,0,1],'direcao':[0,0,1],'fov':45}
        data={'fontes':['camera.json'],'keyframes':[take]}
        self.assertFalse(any(validar(data).values()))
        take['direcao']=[0,0,0]
        self.assertTrue(validar(data)['duracao'])
        take['direcao']=[0,0,1]; take['fonte']='outra.js'
        self.assertTrue(validar(data)['fontes'])
        take['fonte']='camera.json'
        data['fontes']=['outra.js']
        self.assertTrue(validar(data)['fontes'])
        data['fontes']=['camera.json']
        for code in ('new OrbitControls(camera, canvas)', 'orbit(t)', 'cameraPulse(t)',
                     'pulse(t)', 'blendCamera(t)', 'camera.position.x += 1',
                     'function cameraZeAt(t) {}', "import x from './camera-extra.js'"):
            with self.subTest(code=code):
                self.assertTrue(validar(data,code)['fontes'])
        self.assertFalse(validar(data,'camera.position.copy(quadro.posicao)')['fontes'])

    def test_direcao_decidida_e_coerente(self):
        ok = {'heroi':'peca','ze_tam':'fora','ze':'ausente','tipo_camera':'mecanismo'}
        self.assertFalse(any(validar_direcao({'takes':[ok]}, 'Base: casa').values()))
        grande = {**ok,'heroi':'ze','ze_tam':'grande','ze':'M04 susto','motivo_ze':'sofre a falha'}
        self.assertFalse(any(validar_direcao([grande]).values()))
        ruins = [{**ok,'heroi':''}, {**ok,'ze_tam':'médio'}, {**ok,'tipo_camera':''}, {**ok,'ze':'M02 girar'}, {**grande,'motivo_ze':' '}]
        for take in ruins:
            with self.subTest(take=take):
                self.assertTrue(validar_direcao([take])['decisoes'])
        self.assertTrue(validar_direcao([], None)['decisoes'])
        self.assertTrue(validar_direcao([ok], 'Ritmo: a decidir')['ficha'])

    def test_direcao_nao_impoe_numeros(self):
        longo = {'heroi':'ze','ze_tam':'grande','ze':'M05','motivo_ze':'festa','tipo_camera':'nome','t0':0,'t1':60}
        self.assertFalse(any(validar_direcao([longo] * 50).values()))

    def test_template_real_com_partitura_gerada(self):
        import novo_video
        root = Path(__file__).resolve().parent.parent
        chrome_candidates = sorted((Path.home() / 'AppData/Local/ms-playwright').glob('chromium-*/chrome-win64/chrome.exe'), reverse=True)
        chrome = str(chrome_candidates[0]) if chrome_candidates else shutil.which('chromium') or shutil.which('google-chrome')
        if not chrome:
            self.fail('Chromium é necessário para o teste de integração do template')
        with tempfile.TemporaryDirectory(prefix='hf-template-teste-') as tmp:
            temp=Path(tmp)
            shutil.copytree(root / 'modelo-video', temp / 'modelo-video')
            with mock.patch.object(novo_video, 'ROOT', temp), mock.patch.object(sys, 'argv', ['novo_video.py','integracao','--copy']), contextlib.redirect_stdout(io.StringIO()):
                novo_video.main()
            projeto=temp / 'videos' / '10-integracao'
            shutil.copyfile(root / 'ferramentas/fixtures/template-integracao.html', projeto / 'prova-integracao.html')
            handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(temp))
            server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
            threading.Thread(target=server.serve_forever,daemon=True).start()
            try:
                url=f'http://127.0.0.1:{server.server_port}/videos/10-integracao/prova-integracao.html'
                command=[chrome,'--headless=new','--no-sandbox','--use-angle=swiftshader',
                         '--enable-unsafe-swiftshader','--virtual-time-budget=10000','--dump-dom',url]
                result=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=90)
                self.assertEqual(result.returncode,0,result.stderr[-2000:])
                found=re.search(r'data-test="([^"]+)"',result.stdout)
                self.assertIsNotNone(found, result.stderr[-2000:])
                self.assertEqual(json.loads(html.unescape(found.group(1)))['errors'],[])
            finally:
                server.shutdown()
                server.server_close()

def main():
    try:
        root = Path(sys.argv[1])
        data = json.loads((root / "camera.json").read_text(encoding="utf-8-sig"))
        scene = Path(sys.argv[2]) if len(sys.argv)>2 else root / 'montagem-cena.js'
        if len(sys.argv)>2 and not scene.is_file():
            raise FileNotFoundError(f'Cena não encontrada: {scene}')
        result = validar(data, scene.read_text(encoding='utf-8-sig') if scene.exists() else None)
        score = root / 'partitura.json'
        if score.exists():
            ficha = root / 'direcao.md'
            result |= validar_direcao(json.loads(score.read_text(encoding='utf-8-sig')),
                                      ficha.read_text(encoding='utf-8-sig') if ficha.exists() else '')
    except (IndexError, OSError, ValueError, TypeError) as exc:
        print(f"FALHA: {exc}"); return 1
    for rule, errors in result.items():
        print(f"{'FALHA' if errors else 'PASS'} {rule}: {'; '.join(errors)}")
    return int(any(result.values()))

if __name__ == "__main__":
    sys.exit(main())
