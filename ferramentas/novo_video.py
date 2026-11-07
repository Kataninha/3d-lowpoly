"""Cria um novo projeto de vídeo numerado a partir do modelo compartilhado."""
import argparse
import json
from pathlib import Path
import re
import shutil
from sincronizar import ROOT, sync
from pipeline import new_state

def ignore_template_files(directory, names):
    # Mantém o modelo editável em modelos/ e omite os backups da raiz.
    if Path(directory).resolve() == (ROOT / 'modelo-video').resolve():
        return {name for name in ('index.v1.html', 'index.gerado.html', 'index.modelo.html', '.hyperframes') if name in names}
    if Path(directory).resolve() == (ROOT / 'modelo-video' / 'voz').resolve():
        return {name for name in ('tempos.json', 'eventos.json') if name in names}
    if Path(directory).resolve() == (ROOT / 'modelo-video' / 'som').resolve():
        return {'disparos.json'} & set(names)
    return set()

FICHA = '''# Ficha de direção - {slug}

Decisões deste vídeo. Os números de referência são pontos de partida; o produtor decide por tema.

- Referência(s) e por quê: a decidir
- Quem protagoniza: a decidir
- Quando e por que o Zé aparece: a decidir
- Figurantes: a decidir
- Ritmo, câmera e cortes: a decidir
- O que muda no mundo e no clima: a decidir
- Figurino: a decidir
- Final e pedido de comentário: a decidir
- Experimento deste vídeo: a decidir
- O que dos números de referência não serve aqui, e o motivo: a decidir
'''

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('slug')
    parser.add_argument('--copy', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', args.slug):
        parser.error('O slug deve ter só letras minúsculas, dígitos e hífens')
    videos = ROOT / 'videos'
    videos.mkdir(exist_ok=True)
    numbers = [int(m.group(1)) for p in videos.iterdir() if (m := re.match(r'^(\d+)-', p.name))]
    number = max(numbers, default=9) + 1
    number = max(10, number)
    slug = re.sub(r'^\d+-', '', args.slug)
    folder = videos / f'{number:02d}-{slug}'
    shutil.copytree(ROOT / 'modelo-video', folder, ignore=ignore_template_files)
    sync(folder, args.copy)
    for directory in ('tarefas', 'previews', 'qc'):
        (folder / directory).mkdir(exist_ok=True)
    score = {'takes': [{'take': 1, 'frase': 'Exemplo — substituir', 't0': 0, 't1': 1,
                       'plano': 'médio 3/4', 'alvo': '', 'camera': '', 'ze': 'ausente',
                       'heroi': 'peca', 'ze_tam': 'fora', 'motivo_ze': '', 'tipo_camera': 'obra',
                       'acao_peca': '', 'overlay': '', 'sfx': '', 'prova': []}]}
    with (folder / 'partitura.json').open('x', encoding='utf-8') as output:
        json.dump(score, output, ensure_ascii=False, indent=2)
        output.write('\n')
    for name, title in (('esqueleto.md', 'Esqueleto'), ('plano-visual.md', 'Plano visual')):
        with (folder / name).open('x', encoding='utf-8') as output:
            output.write(f'# {title} - {slug}\n')
    with (folder / 'direcao.md').open('x', encoding='utf-8') as output:
        output.write(FICHA.format(slug=slug))
    with (folder / 'takes.json').open('x', encoding='utf-8') as output:
        output.write('[]\n')
    state = new_state(folder)
    with (folder / 'estado.json').open('x', encoding='utf-8') as output:
        json.dump(state, output, ensure_ascii=False, indent=2)
        output.write('\n')
    print(folder)

if __name__ == '__main__':
    main()
