"""Renderiza um vídeo aprovado com a versão fixada do HyperFrames."""
import argparse
from pathlib import Path
import re
import subprocess
import sys

from mapa import hyperframes_version
from pipeline import ROOT, read_state, require_inputs, require_stage


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('name', nargs='?', default='final.mp4')
    args = parser.parse_args()
    video = Path.cwd().resolve()
    if video.parent != (ROOT / 'videos').resolve() or not re.fullmatch(r'[\w-]+\.mp4', args.name):
        parser.error('Rode a partir de videos/<NN>-<slug> com um nome novo de arquivo MP4')
    try:
        state = read_state(video)
        if not state or state.get('etapa') != 'P3' or state.get('schema_version') != 2:
            raise ValueError('Esperado um vídeo schema 2 com P3 aprovado')
        require_inputs(video, 'render')
        require_stage(video, state, 'render')
        output = video / 'render' / args.name
        if output.exists():
            raise FileExistsError(output)
        output.parent.mkdir(exist_ok=True)
        npx = 'npx.cmd' if sys.platform == 'win32' else 'npx'
        subprocess.run([npx, '--offline', '--no-install', f'hyperframes@{hyperframes_version(video)}',
                        'render', '--strict', '--fps', '30', '--quality', 'high',
                        '--output', str(output)], check=True)
        print(output)
    except (OSError, ValueError, TypeError, KeyError, subprocess.CalledProcessError) as exc:
        print(f'Erro: {exc}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
