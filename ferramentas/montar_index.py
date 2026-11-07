"""Build a composition from a video directory and a word timing JSON."""
import argparse, html, json, re, unicodedata
from pathlib import Path

VOICE_MARKER = re.compile(r'\[[^\[\]\r\n]+\]')

def caption_text(raw: str) -> str:
    """Remove voice directions while preserving audio timing metadata."""
    return VOICE_MARKER.sub('', raw).strip()

def normalizar_termo(texto: str) -> str:
    """Ignore accents, case and outer punctuation; preserve inner separators.

    Compound terms match a single caption token exactly: hyphens and spaces
    are distinct, and separate caption tokens are not joined automatically.
    """
    decomposed = unicodedata.normalize('NFD', texto.casefold())
    normalized = ''.join(c for c in decomposed if unicodedata.category(c) != 'Mn')
    start, end = 0, len(normalized)
    while start < end and not normalized[start].isalnum():
        start += 1
    while end > start and not normalized[end - 1].isalnum():
        end -= 1
    return normalized[start:end]


def marcar_termos(data, partitura):
    """Mark matching words only within the take's half-open time interval."""
    takes = partitura if isinstance(partitura, list) else partitura.get('takes', [])
    for take in takes:
        termos = {normalizar_termo(t) for t in take.get('termos', []) if normalizar_termo(t)}
        if not termos:
            continue
        inicio, fim = float(take['t0']), float(take['t1'])
        for palavra in data['palavras']:
            if inicio <= float(palavra['inicio']) < fim and normalizar_termo(caption_text(palavra['palavra'])) in termos:
                palavra['destaque'] = True


ICONES_CARTAO = {
    'cimento': '<path d="M23 12h34l5 14-3 43H21l-3-43z"/><path d="M23 18h34M24 54h32"/>',
    'areia': '<path d="M9 65 34 26l8 12 5-7 24 34z"/><path d="M31 52h1m15-7h1m9 12h1"/>',
    'agua': '<path d="M40 8C34 19 20 36 20 48a20 20 0 0 0 40 0C60 36 46 19 40 8z"/><path d="M28 48c0 6 3 10 8 12"/>',
    'generico': '<circle cx="40" cy="40" r="27"/><path d="M40 25v30M25 40h30"/>',
}


def gerar_cartoes(data, partitura):
    """Build cards from unique spoken words within each take."""
    takes = partitura if isinstance(partitura, list) else partitura.get('takes', [])
    cartoes = []
    for indice, take in enumerate(takes):
        ingredientes = take.get('cartao', [])
        if not ingredientes:
            continue
        palavras = []
        for ingrediente in ingredientes:
            termo = normalizar_termo(ingrediente['palavra'])
            encontrados = [w for w in data['palavras'] if float(take['t0']) <= float(w['inicio']) < float(take['t1']) and normalizar_termo(caption_text(w['palavra'])) == termo]
            if not termo or len(encontrados) != 1:
                raise ValueError(f"Palavra do cartão ausente ou ambígua no take {indice}: {ingrediente['palavra']}")
            palavras.append(encontrados[0])
        inicios = [float(w['inicio']) for w in palavras]
        if any(b <= a for a, b in zip(inicios, inicios[1:])):
            raise ValueError(f'Ordem das palavras do cartão inválida no take {indice}')
        fim_fala = float(palavras[-1]['fim'])
        fim = min(fim_fala + 4 / 30, float(data['duracao']))
        if fim_fala <= inicios[-1] or fim <= fim_fala:
            raise ValueError(f'Duração insuficiente para o cartão no take {indice}')
        itens = []
        for n, (ingrediente, inicio) in enumerate(zip(ingredientes, inicios)):
            icone = ingrediente['icone'].casefold()
            if icone not in ICONES_CARTAO:
                raise ValueError(f'Ícone desconhecido: {icone}')
            mais = '<span class="apv-cartao-mais" aria-hidden="true">+</span>' if n else ''
            itens.append(f'<div id="cartao-{indice}-item-{n}" class="clip apv-cartao-entrada" data-start="{inicio:.3f}" data-duration="{fim-inicio:.3f}" data-track-index="8"><div class="apv-cartao-entrada-conteudo">{mais}<div class="apv-cartao-item"><span class="apv-cartao-rotulo">{html.escape(ingrediente["rotulo"])}</span><svg class="apv-cartao-icone apv-cartao-icone--{icone}" viewBox="0 0 80 80" aria-hidden="true">{ICONES_CARTAO[icone]}</svg></div></div></div>')
        cartoes.append(f'<div id="cartao-{indice}" class="clip apv-cartao-clip" data-start="{inicios[0]:.3f}" data-duration="{fim-inicios[0]:.3f}" data-fim-fala="{fim_fala:.3f}" data-track-index="7"><div class="apv-cartao">{"".join(itens)}</div></div>')
    return '\n'.join(cartoes)


def main():
    p = argparse.ArgumentParser(); p.add_argument('video', type=Path); p.add_argument('--saida', default='modelos/index.gerado.html'); p.add_argument('--tempos', default='voz/tempos.json'); a=p.parse_args()
    video=a.video.resolve(); data=json.loads((video/a.tempos).read_text(encoding='utf-8-sig'))
    score_path=video/'partitura.json'
    partitura = json.loads(score_path.read_text(encoding='utf-8-sig')) if score_path.exists() else {}
    marcar_termos(data, partitura)
    template_path=video/'modelos/index.modelo.html'
    if not template_path.exists(): template_path=video/'index.modelo.html'
    template=template_path.read_text(encoding='utf-8-sig')
    captions=[]
    for i,w in enumerate(data['palavras']):
        start=float(w['inicio']); end=float(w['fim'])
        if end <= start: raise ValueError('Duração inválida para legenda')
        visible_word=caption_text(w['palavra'])
        if not visible_word: continue
        cls=' chave' if w.get('destaque') else ''
        captions.append(f'<div id="palavra-{i}" class="apv-legenda clip{cls}" data-start="{start:.3f}" data-duration="{end-start:.3f}" data-track-index="5">{html.escape(visible_word)}</div>')
    safe=json.dumps(data,ensure_ascii=False).replace('</','<\\/')
    cartoes = gerar_cartoes(data, partitura)
    overlays = '\n'.join(([cartoes] if cartoes else []) + captions)
    result=template.replace('__TEMPOS__',safe).replace('__DURACAO__',f'{float(data["duracao"]):.3f}').replace('<!--__LEGENDAS__-->',overlays)
    output=video/a.saida
    with output.open('x',encoding='utf-8') as f: f.write(result)
    print(output)
if __name__=='__main__': main()
