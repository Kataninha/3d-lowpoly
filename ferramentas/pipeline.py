"""Track video production stages and prepare user-provided voice recordings.

Schema 2 binds progress and render approval to SHA-256 inputs. Legacy states are
not migrated implicitly. `verificar VIDEO --etapa montagem` exports current
hashes for review evidence. `avancar VIDEO P2|P3 --evidencia qc/review.json`
requires: resultado="aprovado", revisor, relatorio (relative nonempty file),
arquivos_abertos (relative paths including a PNG/JPEG and MP4 actually reviewed),
and inputs_sha256 (the exact hashes from verificar). The reviewer supplies these
facts; the CLI verifies provenance, not visual quality or a person's identity.
`aprovar-render VIDEO --usuario NAME --evidencia qc/user-approval.md` records an
existing explicit user authorization after P3. --forcar never bypasses these gates.
"""
import argparse
from datetime import datetime, timedelta, timezone
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from camera_contract import validate_intent, validate_selected_camera
from importar_transcricao import validate_timings
from sincronizar import file_manifest, sha256

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_VERSION = 2
STAGES = ('esqueleto_pendente', 'esqueleto_aprovado', 'roteiro_pendente', 'roteiro_aprovado', 'plano_pendente', 'plano_aprovado', 'voz', 'P0', 'P1', 'P2', 'montagem', 'P3', 'render', 'P4', 'entregue', 'retro')
ACTIONS = {
    'esqueleto_aprovado': 'aguardar aprovacao do esqueleto',
    'roteiro_aprovado': 'aguardar aprovacao do roteiro',
    'plano_aprovado': 'aguardar aprovacao do plano visual',
    'voz': 'preparar a narracao', 'P0': 'executar P0', 'P1': 'executar P1',
    'P2': 'executar P2', 'montagem': 'montar o video', 'P3': 'executar P3',
    'render': 'renderizar o video', 'P4': 'executar P4',
    'entregue': 'entregar o video', 'retro': 'fazer a retrospectiva',
}
GATES = ('esqueleto_pendente', 'esqueleto_aprovado', 'roteiro_pendente', 'roteiro_aprovado', 'plano_pendente')
MEDIA_EXTENSIONS = {'.mp3', '.wav', '.ogg', '.opus', '.m4a', '.aac', '.flac', '.aiff', '.aif',
                    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.svg',
                    '.glb', '.gltf', '.obj', '.fbx', '.stl', '.blend', '.dae', '.usdz', '.3ds', '.ply'}

# Earliest completed stage that remains valid after each input changes.
RESET_STAGE = {'esqueleto.md': 'esqueleto_pendente', 'roteiro.txt': 'roteiro_pendente',
               'plano-visual.md': 'plano_pendente', 'direcao.md': 'plano_pendente',
               'voz/voz.wav': 'plano_aprovado', 'voz/tempos.json': 'voz',
               'takes.json': 'P0', 'partitura.json': 'P0', 'camera.json': 'P1',
               'biblioteca.lock.json': 'P1', 'kit.manifest.json': 'P1'}
RENDER_EXTENSIONS = MEDIA_EXTENSIONS | {'.js', '.mjs', '.html', '.css', '.json', '.woff', '.woff2', '.ttf'}
EXCLUDED_DIRS = {'qc', 'previews', 'render', 'conferencia', 'tarefas', 'node_modules',
                 'modelos', '.git', '__pycache__'}


def input_hashes(video):
    paths = set(RESET_STAGE)
    for directory, folders, files in os.walk(video, followlinks=False):
        folders[:] = [name for name in folders if name not in EXCLUDED_DIRS and not name.startswith('.')]
        for name in files:
            path = Path(directory) / name
            if path.suffix.lower() in RENDER_EXTENSIONS and name != 'estado.json':
                paths.add(path.relative_to(video).as_posix())
    return {name: sha256(video / name) if (video / name).is_file() else None for name in sorted(paths)}


def new_state(video):
    return {'schema_version': SCHEMA_VERSION, 'etapa': 'esqueleto_pendente',
            'velocidade_voz': 1.0, 'reprovacoes_p3': 0, 'historico': [],
            'hashes': input_hashes(video), 'evidencias': {}, 'aprovacao_render': None}


def save_state(video, state):
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=video,
                                     prefix='.estado-', suffix='.tmp', delete=False) as output:
        json.dump(state, output, ensure_ascii=False, indent=2, allow_nan=False)
        output.write('\n')
        temporary = Path(output.name)
    try:
        os.replace(temporary, video / 'estado.json')
    finally:
        temporary.unlink(missing_ok=True)


def versioned(state):
    version = state.get('schema_version')
    if version is not None and (type(version) is not int or version != SCHEMA_VERSION):
        raise ValueError(f'Unsupported state schema: {version}')
    return version == SCHEMA_VERSION


def rollback_for(name):
    return RESET_STAGE.get(name, 'P1' if name.startswith('kit/') else 'montagem')


def refresh_state(video, state):
    if not versioned(state):
        return state
    if state.get('etapa') not in STAGES or not isinstance(state.get('hashes'), dict):
        raise ValueError('Invalid versioned state')
    current = input_hashes(video)
    changed = sorted(name for name in current.keys() | state['hashes'].keys()
                     if current.get(name) != state['hashes'].get(name))
    if changed:
        cutoff = min((rollback_for(name) for name in changed), key=STAGES.index)
        previous = state['etapa']
        if STAGES.index(previous) > STAGES.index(cutoff):
            state['etapa'] = cutoff
        state.pop('em_andamento', None)
        state['aprovacao_render'] = None
        state['evidencias'] = {stage: record for stage, record in state.get('evidencias', {}).items()
                               if stage in STAGES and STAGES.index(stage) <= STAGES.index(cutoff)}
        state['hashes'] = current
        state.setdefault('historico', []).append({'etapa': 'invalidado', 'de': previous,
            'para': state['etapa'], 'arquivos': changed, 'data': datetime.now(timezone.utc).isoformat()})
        save_state(video, state)
    return state


def local_file(video, name):
    if not isinstance(name, str) or not name.strip():
        raise ValueError('Evidence requires a relative file path')
    relative = Path(name)
    path = video / relative
    if relative.is_absolute() or '..' in relative.parts or not path.resolve().is_relative_to(video.resolve()):
        raise ValueError(f'File outside project: {name}')
    if not path.is_file() or not path.stat().st_size:
        raise ValueError(f'Missing or empty file: {name}')
    return path


def require_text(video, name):
    text = local_file(video, name).read_text(encoding='utf-8-sig')
    content = '\n'.join(line for line in text.splitlines() if not line.lstrip().startswith('#')).strip()
    if not content or any(term in content.casefold() for term in ('a decidir', 'exemplo — substituir', 'todo:', 'tbd')):
        raise ValueError(f'{name}: pending content')


def review_record(video, state, evidence):
    source = local_file(video, evidence)
    data = json.loads(source.read_text(encoding='utf-8-sig'))
    if not isinstance(data, dict) or data.get('resultado') != 'aprovado' \
            or not isinstance(data.get('revisor'), str) or not data['revisor'].strip():
        raise ValueError('Review requires resultado=aprovado and revisor')
    if data.get('inputs_sha256') != state['hashes']:
        raise ValueError('Review hashes differ from current inputs; review again')
    opened = data.get('arquivos_abertos')
    if not isinstance(opened, list) or not opened or not all(isinstance(p, str) for p in opened):
        raise ValueError('Review requires arquivos_abertos')
    extensions = {Path(p).suffix.lower() for p in opened}
    if '.mp4' not in extensions or not extensions.intersection({'.png', '.jpg', '.jpeg', '.webp'}):
        raise ValueError('Review requires opened video and image proofs')
    paths = [evidence, data.get('relatorio'), *opened]
    files = {name: sha256(local_file(video, name)) for name in paths}
    return {**data, 'arquivos_sha256': files, 'data': datetime.now(timezone.utc).isoformat()}


def require_review(video, state, stage):
    record = state.get('evidencias', {}).get(stage)
    if not isinstance(record, dict) or record.get('resultado') != 'aprovado' or not record.get('arquivos_sha256'):
        raise ValueError(f'{stage} requires recorded proof review (--evidencia)')
    old = record.get('inputs_sha256', {})
    names = old.keys() | state['hashes'].keys()
    if stage == 'P2':
        names = {name for name in names if STAGES.index(rollback_for(name)) < STAGES.index('P2')}
    if any(old.get(name) != state['hashes'].get(name) for name in names):
        raise ValueError(f'{stage}: stale proof review')
    for name, digest in record['arquivos_sha256'].items():
        if sha256(local_file(video, name)) != digest:
            raise ValueError(f'{stage}: proof changed: {name}')


def require_render_approval(video, state):
    approval = state.get('aprovacao_render')
    if not isinstance(approval, dict) or not approval.get('usuario') or not approval.get('data') \
            or approval.get('inputs_sha256') != state['hashes']:
        raise ValueError('Final render requires explicit user approval: aprovar-render')
    if sha256(local_file(video, approval.get('evidencia'))) != approval.get('evidencia_sha256'):
        raise ValueError('User approval evidence changed')


def require_stage(video, state, stage, approval=True):
    if not versioned(state):
        return
    rank = STAGES.index(stage)
    for gate, files in (('esqueleto_aprovado', ('esqueleto.md',)),
                        ('roteiro_aprovado', ('roteiro.txt',)),
                        ('plano_aprovado', ('plano-visual.md', 'direcao.md'))):
        if rank >= STAGES.index(gate):
            for name in files:
                require_text(video, name)
    if rank >= STAGES.index('voz'):
        local_file(video, 'voz/voz.wav')
    if rank >= STAGES.index('P0'):
        validate_timings(video)
    if rank >= STAGES.index('P1'):
        takes = json.loads(local_file(video, 'takes.json').read_text(encoding='utf-8-sig'))
        score = json.loads(local_file(video, 'partitura.json').read_text(encoding='utf-8-sig'))
        if not isinstance(takes, list) or not takes or not isinstance(score, dict) or not score.get('takes'):
            raise ValueError('takes.json and partitura.json require nonempty takes')
        for take in score['takes']:
            validate_intent(take)
            proofs = take.get('prova')
            if not isinstance(proofs, list) or not proofs or not all(
                    type(t) in (int, float) and math.isfinite(t) and take['t0'] <= t < take['t1'] for t in proofs):
                raise ValueError('Each take requires real proof times inside its interval')
    if rank >= STAGES.index('P2'):
        camera = json.loads(local_file(video, 'camera.json').read_text(encoding='utf-8-sig'))
        validate_selected_camera(camera, score['takes'])
        require_review(video, state, 'P2')
    if rank >= STAGES.index('montagem'):
        for name in ('index.html', 'montagem-cena.js'):
            local_file(video, name)
        manifest = json.loads(local_file(video, 'kit.manifest.json').read_text(encoding='utf-8-sig'))
        if manifest.get('schema_version') != 1 or not manifest.get('files') \
                or manifest['files'] != file_manifest(video / 'kit'):
            raise ValueError('Kit differs from its SHA-256 file manifest')
    if rank >= STAGES.index('P3'):
        require_review(video, state, 'P3')
    if rank >= STAGES.index('render') and approval:
        require_render_approval(video, state)


def read_state(video):
    path = video / 'estado.json'
    if not path.is_file():
        return None
    state = json.loads(path.read_text(encoding='utf-8-sig'))
    if not isinstance(state, dict):
        raise ValueError('estado.json must be an object')
    return refresh_state(video, state)


def videos_in(root):
    return sorted((p for p in root.iterdir() if p.is_dir()), key=lambda p: p.name) if root.is_dir() else []


def video_path(root, name):
    if Path(name).name != name or name in ('.', '..'):
        raise ValueError('Informe o nome da pasta do video')
    video = root / name
    if not video.is_dir():
        raise ValueError(f'Video inexistente: {name}')
    return video


def input_audio(video):
    directory = video / 'voz'
    if not directory.is_dir():
        return []
    return sorted(p for p in directory.iterdir() if p.is_file() and p.suffix.lower() in ('.mp3', '.wav') and p.name.lower() != 'voz.wav')


def read_inputs(video):
    path = video / 'insumos.json'
    if not path.exists():
        return []
    items = json.loads(path.read_text(encoding='utf-8-sig'))
    if not isinstance(items, list):
        raise ValueError('insumos.json deve conter uma lista')
    for item in items:
        if item['etapa_limite'] not in STAGES:
            raise ValueError(f"Etapa limite invalida: {item['etapa_limite']}")
        relative = Path(item['arquivo'])
        if relative.is_absolute() or '..' in relative.parts or len(relative.parts) < 2 or relative.parts[0] != 'insumos':
            raise ValueError(f"Caminho de insumo invalido: {item['arquivo']}")
    return items


def input_delivered(video, item):
    if item.get('dispensado') is True:
        return True
    path = video / item['arquivo']
    if path.is_file():
        return True
    if not path.parent.is_dir():
        return False
    return any(p.is_file() and p.stem == path.stem and p.suffix.lower() in MEDIA_EXTENSIONS
               for p in path.parent.iterdir())


def blocking_inputs(video, stage):
    if stage is None:
        return []
    return [item for item in read_inputs(video) if item.get('obrigatorio') is True
            and STAGES.index(stage) >= STAGES.index(item['etapa_limite'])
            and not input_delivered(video, item)]


def require_inputs(video, stage):
    missing = blocking_inputs(video, stage)
    if missing:
        raise ValueError('aguardando usuário: ' + ', '.join(item['id'] for item in missing))


def next_stage_for(video, state):
    stage = state['etapa']
    if state.get('reprovacoes_p3', 0) >= 3:
        return None
    if stage in GATES:
        return None
    if stage == 'plano_aprovado':
        return 'voz' if input_audio(video) else None
    if stage in STAGES and stage != 'retro':
        return STAGES[STAGES.index(stage) + 1]
    return None


def pending(root):
    found = False
    for video in videos_in(root):
        state = read_state(video)
        if state is None:
            continue
        next_stage = next_stage_for(video, state)
        missing = blocking_inputs(video, next_stage)
        if missing:
            print(f"{video.name}: aguardando usuário: {', '.join(item['id'] for item in missing)}")
            continue
        active = state.get('em_andamento')
        if active:
            since = datetime.fromisoformat(active['desde']).astimezone()
            if datetime.now(timezone.utc) - since > timedelta(minutes=90):
                print(f"{video.name}: {active['etapa']} em andamento desde {since.strftime('%H:%M')}")
                found = True
            continue
        if state.get('reprovacoes_p3', 0) >= 3:
            print(f'{video.name}: pausado (3 ou mais reprovacoes no P3)')
            continue
        if next_stage:
            if next_stage == 'render':
                try:
                    require_stage(video, state, next_stage)
                except ValueError as exc:
                    print(f'{video.name}: bloqueado: {exc}')
                    continue
            print(f'{video.name}: {next_stage} - {ACTIONS[next_stage]}')
            found = True
    return 0 if found else 1


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--videos', type=Path, default=ROOT / 'videos', help='Pasta dos videos')
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('status')
    sub.add_parser('pendente')
    inputs = sub.add_parser('insumos')
    inputs.add_argument('video')
    waive = sub.add_parser('dispensar')
    waive.add_argument('video')
    waive.add_argument('id')
    start = sub.add_parser('iniciar')
    start.add_argument('video')
    advance = sub.add_parser('avancar')
    advance.add_argument('video')
    advance.add_argument('etapa', choices=STAGES)
    advance.add_argument('--forcar', action='store_true')
    advance.add_argument('--evidencia', help='P2/P3 review JSON, relative to the video folder')
    verify = sub.add_parser('verificar', help='Check current inputs and gates; export hashes as JSON')
    verify.add_argument('video')
    verify.add_argument('--etapa', choices=STAGES)
    approve = sub.add_parser('aprovar-render', help='Record an existing explicit user authorization after P3')
    approve.add_argument('video')
    approve.add_argument('--usuario', required=True)
    approve.add_argument('--evidencia', required=True, help='File with the user authorization, relative to video')
    reject = sub.add_parser('reprovar')
    reject.add_argument('video')
    voice = sub.add_parser('preparar-voz')
    voice.add_argument('video')
    args = parser.parse_args(argv)
    try:
        if args.command == 'status':
            for video in videos_in(args.videos):
                state = read_state(video)
                stage = state['etapa'] if state is not None else 'sem_estado'
                active = state.get('em_andamento') if state is not None else None
                detail = f"; {active['etapa']} em andamento desde {active['desde']}" if active else ''
                missing = blocking_inputs(video, next_stage_for(video, state)) if state is not None else []
                if missing:
                    detail += f' (aguardando {len(missing)} insumos)'
                print(f'{video.name}: {stage}{detail}')
        elif args.command == 'pendente':
            return pending(args.videos)
        else:
            video = video_path(args.videos, args.video)
            if args.command == 'insumos':
                for item in read_inputs(video):
                    status = 'entregue' if input_delivered(video, item) else 'faltando'
                    print(f"{item['id']}: {status} - {item['descricao']} ({item['arquivo']})")
                return 0
            if args.command == 'dispensar':
                items = read_inputs(video)
                matches = [item for item in items if item['id'] == args.id]
                if len(matches) != 1:
                    raise ValueError(f'Insumo inexistente ou duplicado: {args.id}')
                matches[0]['dispensado'] = True
                (video / 'insumos.json').write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                print(f'{video.name}: {args.id} dispensado')
                return 0
            state = read_state(video)
            if state is None:
                raise ValueError('Video sem estado.json')
            if args.command == 'verificar':
                errors = []
                stage = args.etapa or state['etapa']
                try:
                    require_inputs(video, stage)
                    require_stage(video, state, stage)
                except (OSError, ValueError, TypeError, KeyError, subprocess.CalledProcessError) as exc:
                    errors.append(str(exc))
                print(json.dumps({'schema_version': state.get('schema_version'), 'etapa': state['etapa'],
                                  'verificando': stage, 'hashes': state.get('hashes', {}), 'erros': errors},
                                 ensure_ascii=False, indent=2))
                return 2 if errors else 0
            if args.command == 'aprovar-render':
                if not versioned(state) or state['etapa'] != 'P3':
                    raise ValueError('aprovar-render requires a versioned project at P3')
                require_inputs(video, 'render')
                require_stage(video, state, 'render', approval=False)
                if not args.usuario.strip():
                    raise ValueError('User name cannot be empty')
                source = local_file(video, args.evidencia)
                if not source.read_text(encoding='utf-8-sig').strip():
                    raise ValueError('Empty user approval evidence')
                state['aprovacao_render'] = {'usuario': args.usuario.strip(), 'evidencia': args.evidencia,
                    'evidencia_sha256': sha256(source), 'inputs_sha256': state['hashes'],
                    'data': datetime.now(timezone.utc).isoformat()}
                state.setdefault('historico', []).append({'etapa': 'render_autorizado', **state['aprovacao_render']})
                save_state(video, state)
                print(f'{video.name}: autorizacao do usuario registrada para os inputs atuais')
            elif args.command == 'iniciar':
                if state.get('em_andamento'):
                    raise ValueError('Video ja tem etapa em andamento')
                stage = next_stage_for(video, state)
                if not stage:
                    raise ValueError('Video nao tem proxima etapa disponivel')
                require_inputs(video, stage)
                require_stage(video, state, stage if stage == 'render' else state['etapa'])
                state['em_andamento'] = {'etapa': stage, 'desde': datetime.now(timezone.utc).isoformat()}
                save_state(video, state)
                print(f'{video.name}: {stage} em andamento')
            elif args.command in ('avancar', 'reprovar'):
                if args.command == 'reprovar':
                    if state['etapa'] != 'montagem':
                        raise ValueError('Reprovacao P3 exige etapa montagem')
                    state['etapa'] = 'P2'
                    state['reprovacoes_p3'] = state.get('reprovacoes_p3', 0) + 1
                    if versioned(state):
                        state['aprovacao_render'] = None
                        state.get('evidencias', {}).pop('P3', None)
                    history_stage = 'P3_reprovado'
                else:
                    require_inputs(video, args.etapa)
                    ficha = video / 'direcao.md'
                    if args.etapa == 'plano_aprovado' and ficha.exists() and 'a decidir' in ficha.read_text(encoding='utf-8-sig').casefold():
                        raise ValueError('direcao.md com decisoes pendentes')
                    previous = state['etapa']
                    if previous not in STAGES and not args.forcar:
                        raise ValueError(f'Etapa atual invalida: {previous}; use --forcar para corrigir')
                    if previous in STAGES and STAGES.index(args.etapa) not in (STAGES.index(previous), STAGES.index(previous) + 1) and not args.forcar:
                        raise ValueError(f'Transicao invalida de {previous} para {args.etapa}; use --forcar para excecao')
                    if args.evidencia:
                        if not versioned(state) or args.etapa not in ('P2', 'P3'):
                            raise ValueError('--evidencia is only valid for versioned P2/P3 reviews')
                        state.setdefault('evidencias', {})[args.etapa] = review_record(video, state, args.evidencia)
                    require_stage(video, state, args.etapa)
                    if args.etapa == 'P4':
                        # User decision 2026-11-06: delivery records cannot be left for later.
                        for name in ('publicacao.md', 'retrospectiva.md'):
                            require_text(video, name)
                    state['etapa'] = args.etapa
                    history_stage = args.etapa
                    if args.etapa == 'P3':
                        state['reprovacoes_p3'] = 0
                state.pop('em_andamento', None)
                entry = {'etapa': history_stage, 'data': datetime.now(timezone.utc).isoformat()}
                if args.command == 'avancar' and args.forcar:
                    entry.update({'forcado': True, 'de': previous})
                state.setdefault('historico', []).append(entry)
                save_state(video, state)
                print(f"{video.name}: {state['etapa']}")
            else:
                if state['etapa'] in GATES:
                    raise ValueError('Aguardando aprovacao do esqueleto, roteiro e plano visual')
                require_stage(video, state, 'plano_aprovado')
                output = video / 'voz' / 'voz.wav'
                if output.exists():
                    raise ValueError(f'Arquivo ja existe: {output}')
                sources = input_audio(video)
                if len(sources) != 1:
                    raise ValueError('Coloque exatamente um arquivo MP3 ou WAV de origem em voz/')
                speed = float(state.get('velocidade_voz', 1.0))
                if not math.isfinite(speed) or speed <= 0:
                    raise ValueError('velocidade_voz deve ser positiva')
                command = ['ffmpeg', '-nostdin', '-n', '-i', str(sources[0])]
                if speed != 1.0:
                    command += ['-filter:a', f'atempo={speed}']
                command += [str(output)]
                subprocess.run(command, check=True)
                refresh_state(video, state)
                print(output)
        return 0
    except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError, subprocess.CalledProcessError) as exc:
        print(f'Erro: {exc}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    sys.exit(main())
