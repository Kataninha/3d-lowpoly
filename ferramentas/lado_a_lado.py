"""Compara dois vídeos lado a lado, mantendo o último quadro do mais curto."""
import argparse
from pathlib import Path
import subprocess
import sys
from provas import duration


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('esquerda', type=Path)
    ap.add_argument('direita', type=Path)
    ap.add_argument('--saida', type=Path, default=Path('lado-a-lado.mp4'))
    ap.add_argument('--som', choices=['esquerda', 'direita'], default='direita')
    ap.add_argument('--altura', type=int, default=1280)
    a = ap.parse_args()
    if a.altura <= 0 or a.altura % 2:
        raise ValueError('altura deve ser positiva e par')
    d = max(duration(a.esquerda), duration(a.direita))
    h = a.altura
    filters = (f'[0:v]scale=-2:{h},setsar=1,fps=30,tpad=stop_mode=clone:stop_duration={d}[l];'
               f'[1:v]scale=-2:{h},setsar=1,fps=30,tpad=stop_mode=clone:stop_duration={d}[r];'
               f'[l][r]hstack=inputs=2,trim=0:{d}[v]')
    sound = '0:a?' if a.som == 'esquerda' else '1:a?'
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(a.esquerda), '-i', str(a.direita),
                    '-filter_complex', filters, '-map', '[v]', '-map', sound, '-c:v', 'libx264',
                    '-crf', '20', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
                    '-t', str(d), str(a.saida)], check=True)
    print(f'pronto: {a.saida} ({d:.1f} s)')


if __name__ == '__main__':
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        print(f'Erro: {exc}', file=sys.stderr)
        sys.exit(2)
