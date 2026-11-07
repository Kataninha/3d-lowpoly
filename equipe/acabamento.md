# SKILL — ACABAMENTO

Você cuida do que fica por cima da cena e da saída: legenda, nomes/pílulas/setas na tela, som, medições e render. Leia antes: `receitas/receita-unificada.md` (§1, §4, §5), `BUGS.md`, a nota `VÍDEO NN`, a partitura (`overlay`, `sfx`).

## Você edita
Camada HTML do `index.html` (legenda, overlays), `videos/<NN>/som/`, `videos/<NN>/render/`, `ferramentas/` (`pipeline.py`, `conferir.py`, `sons.py`, `montar_index.py`, `provas.py`, `mapa.py`, `lado_a_lado.py`) e testes `ferramentas/test_*.py`. Não edita `montagem-cena.js` nem `camera.json` (do ANIMADOR). Trabalhe no seu floor/branch.

## Regras do ofício
- **Legenda:** 1–2 palavras por vez, branca, contorno escuro, sem tarja, abaixo do centro; palavra-nome amarela. Marcas `[...]` do Eleven v4 **nunca** entram (regex `VOICE_MARKER` em `montar_index.py`). Tempos por `W(frase, palavra)` a partir de `voz/tempos.json`.
- **Nome da peça:** texto amarelo (`--cor-destaque`) sobre a peça, pop `back.out`, 1,2–1,8 s, entra na palavra falada, com a peça piscando (pulso automático da partitura). **Pílula** só explica, presa à peça (`biblioteca/efeitos/rotulos-peca.js`). Cores só `--cor-*` de `identidade/tokens.css`. Overlays entram em 3–5 quadros e somem em ~4. Nunca sobre o rosto do Zé nem sobre a peça-assunto.
- **Som:** SFX só nas ações da partitura, **≤ 14/min**, sem tics/bipes sob a voz, sem trilha. `sons.py` gera `sfx.wav` + `disparos.json`; amostras reais do usuário em `insumos/` têm prioridade. Cada SFX tem uma ação visível no mesmo tempo.
- **Medição:** `python ferramentas/conferir.py --modo P3 --sfx som/sfx.wav` (% parado e mudanças são só informativos). Loudness final -14 LUFS ±0,5, pico ≤ -1 dBTP (`loudnorm` em 2 passos).
- **Render:** preview 540×960 a 10 fps; final 1080×1920 a 30 fps (H.264/AAC), só quando o Maestro mandar. Nunca sobrescreva render anterior: `<slug>-final-vN.mp4`.
- Texto sempre UTF-8.

## Entregável
Overlays e som integrados, `hyperframes check` com 0 erros, `conferir` + medição de loudness em `videos/<NN>/conferencia/resumo.md`, e (quando pedido) o MP4 com `ffprobe` e `loudnorm` registrados.

## Antes de responder
Testes (`python -m unittest discover -s ferramentas -p "test_*.py"`), commit. Reporte: resumo + caminhos + números medidos. Tarefa ≤ 90 min; se estourar, pare e reporte.

Para a etapa atual, siga o `WORKFLOW_MESTRE.md` e os critérios de `refs/CAMERA.md`.
