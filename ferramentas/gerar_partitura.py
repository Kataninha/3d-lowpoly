"""Build partitura.json and partitura.md from a video's takes.json and its voice timings (or an estimate before the voice)."""
import argparse
import json
from pathlib import Path
import re

PALAVRAS_MIN = 195
PAUSA = .22
CAMPOS = ('plano', 'alvo', 'camera', 'ze', 'heroi', 'ze_tam', 'motivo_ze', 'tipo_camera', 'acao_peca', 'overlay', 'sfx', 'termos')

DIRECAO = ('angulo', 'amplitude', 'leitura', 'justificativa', 'shotType',
           'subjectId', 'relatedIds', 'requiredVisibleIds', 'transicao')


def limpa(palavra):
    return re.sub(r'\W', '', palavra).casefold()


def estimar(pasta):
    frases, palavras, t = [], [], .25
    paragrafos = [p for p in (pasta / 'roteiro.txt').read_text(encoding='utf-8-sig').splitlines() if p.strip()]
    for n, texto in enumerate(paragrafos):
        inicio = t
        for w in (w for w in texto.split() if not w.startswith('[')):
            d = 60 / PALAVRAS_MIN * (.5 + len(w) / 11)
            palavras.append(dict(frase=n, palavra=w, inicio=round(t, 3), fim=round(t + d, 3)))
            t += d
        frases.append(dict(n=n, texto=texto, inicio=round(inicio, 3), fim=round(t, 3)))
        t += PAUSA
    return dict(duracao=round(t + .3, 3), frases=frases, palavras=palavras, metodo='estimado por tamanho da palavra; sem voz')


def achar(dados, frase, palavra):
    for w in dados['palavras']:
        if w['frase'] == frase and limpa(w['palavra']) == limpa(palavra):
            return w['inicio']
    raise ValueError(f'Palavra ausente na frase {frase}: {palavra}')


def destaques(take, dados):
    """[alvo, palavra] per take; default is the take's alvo on each of its termos. Returns [alvo, palavra, frase]."""
    termos = take.get('termos') or []
    pares = take.get('destaque') or ([[take['alvo'], t] for t in ([termos] if isinstance(termos, str) else termos)] if take.get('alvo') else [])
    saida = []
    for alvo, palavra in pares:
        for n in range(take['frase'], take.get('ate_frase', take['frase']) + 1):
            try:
                achar(dados, n, palavra)
            except ValueError:
                continue
            saida.append([alvo, palavra, n])
            break
        else:
            raise ValueError(f"Palavra de destaque ausente nas frases do take: {palavra}")
    return saida


def gerar(pasta, usar_voz=False):
    takes = json.loads((pasta / 'takes.json').read_text(encoding='utf-8-sig'))
    if not takes:
        raise ValueError('takes.json vazio')
    dados = json.loads((pasta / 'voz/tempos.json').read_text(encoding='utf-8-sig')) if usar_voz else estimar(pasta)
    saida = []
    for i, take in enumerate(takes, 1):
        f = dados['frases'][take['frase']]
        fim = dados['frases'][take.get('ate_frase', take['frase'])]
        saida.append({'take': i, 'frase': f"frase {take['frase']}", 't0': f['inicio'], 't1': fim['fim'],
                      **{k: take.get(k, '') for k in CAMPOS},
                      **{k: take[k] for k in DIRECAO if k in take},
                      'prova': [achar(dados, *p) for p in take.get('prova', [])],
                      'destaque': destaques(take, dados)})
    (pasta / 'partitura.json').write_text(json.dumps({'metodo_tempos': dados['metodo'], 'takes': saida}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    linhas = ['# Partitura', '', f"Tempos: {dados['metodo']}. Duração: {dados['duracao']} s.", '',
              '| Take | Tempo | Protagonista | Plano / câmera | Zé | Peça | Texto | SFX | Prova |', '|---|---|---|---|---|---|---|---|---|']
    for t in saida:
        ze = 'fora' if t['ze_tam'] == 'fora' else f"{t['ze_tam']}: {t['ze']} ({t['motivo_ze']})"
        linhas.append(f"| {t['take']} | {t['t0']:.1f}–{t['t1']:.1f} | {t['heroi']} | {t['tipo_camera']}: {t['plano']}; {t['camera']} | {ze} | {t['acao_peca']} | {t['overlay']} | {t['sfx']} | {', '.join(f'{p:.1f}' for p in t['prova'])} |")
    (pasta / 'partitura.md').write_text('\n'.join(linhas) + '\n', encoding='utf-8')
    return saida, dados


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('video', type=Path)
    parser.add_argument('--voz', action='store_true', help='usar voz/tempos.json em vez da estimativa')
    args = parser.parse_args()
    takes, dados = gerar(args.video, args.voz)
    print(f"{len(takes)} takes, {dados['duracao']} s, {len(dados['palavras'])} palavras")


if __name__ == '__main__':
    main()
