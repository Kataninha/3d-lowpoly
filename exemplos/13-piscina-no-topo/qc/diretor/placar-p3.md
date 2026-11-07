# Placar P3 — vídeo 13 (Por que a piscina no topo do prédio não despenca?)

Arquivo avaliado: `videos/13-piscina-no-topo/render/preview-r4.mp4`
sha256: `ec4652be0ec0e0cbfa977dacc325742b657cdd138df9b8796b9994ff4eb9e70e` (conferido com sha256sum; arquivo de 16:22 de 04/11).
Formato: 540x960, 10 fps, 138,3 s, H.264 + AAC estéreo.
Método: ffmpeg extraiu 1 quadro/s (138 PNG em `q/`), montados em 9 folhas de 16 quadros (`folha-00..08.png`, número do quadro = segundo+1). Abri as 9 folhas, 5 quadros inteiros e 1 folha de retrocesso a 4 q/s.
Limitação: não ouvi o áudio (só medi: mean -17,2 dB, max -2,6 dB). Item 10 é provisório. Não rodei `lado_a_lado.py` (sem base de referência aberta); comparação feita contra `direcao.md` e `plano-visual.md`.

## Quadros abertos
- Folhas: `qc/diretor/folha-00.png` a `folha-08.png` (quadros 1-138).
- Inteiros: `qc/diretor/q/q012.png`, `q064.png`, `q088.png`, `q099.png`, `q138.png`.
- Retrocesso 34-37 s a 4 q/s: `qc/diretor/retro/retro-34-37.png`.

## Placar

| # | Item | Nota | Motivo e evidência |
|---|---|---|---|
| 1 | Gancho | 2 | Fala em 0 s, estalo no teto em ~3 s (folha-00, q004), raio-X sobe e mostra a piscina com pílula "10 MIL LITROS" (q005-007), sala enche até o sofá (q009-012). Zé reage com a pipoca. |
| 2 | Ciclos e explicação clara | 2 | Fundação, concreto armado, laje, pressão, vazamento/impermeabilização, bomba e caminho: cada ciclo tem limite visível, solução e nome (folhas 02-06). Sem som, as 3 perguntas respondem: peso da piscina vs prédio, peça entra (estaca, aço, laje reforçada, parede armada, manta), resultado = caminho das cargas (q113-128). |
| 3 | Câmera por takes | 1 | q081-q093 (~13 s): vista de topo quase fixa, piscina pequena, sem o corte frontal da ficha ("SEC em corte da piscina, frente; push até o fundo"). Fora isso a câmera varia bem (q017-023, q043-048, q113-128). |
| 4 | Retrocesso e ícones | 2 | Retro legível: torre encolhe de cima para baixo, ◀◀ e varredura, céu vira manhã, terreno vazio, Zé troca bermuda/chinelo por macacão, capacete e prancheta (`retro/retro-34-37.png`, q033-037). Ícones ▶▶, ✔ ❌, pílulas coerentes. Obs.: dura ~3 s, não 0,5 s. |
| 5 | Foco, escala e vida do mundo | 1 | Zé tampa o que a fala explica: pilar em q064 ("aço juntos": corpo cobre o concreto), seta/parede esquerda em q086-088 ("mais forte"). Zé minúsculo em q038-042 (ok para escala, mas a falha "afunda" lê só pelo ❌). Mundo vivo bem: grua, luzes, robô, cidade. |
| 6 | Cenário | 2 | Sala e torre completas e consistentes (q001, q094, q113-130); canteiro e cobertura com escala coerente; céu avança de manhã para entardecer. |
| 7 | Corte interno | 1 | Estacas e camadas em corte real (q043-048, q049-054): bom. Mas pilar armado em q062-064 não mostra o aço dentro do concreto (concreto opaco sobe sobre a gaiola); gaiola laranja dentro da parede e do fundo da piscina quase invisível (só pontos laranja nas pontas, q091-093). A ficha pede corte com aço dentro. |
| 8 | Física desenhada | 2 | Laje verga com a água (q075-077), viga racha (q060), sala enche com boia/gotas (q009-012), estaca cravando com poeira (q044-047), chuveiro/guarda-chuva (q098-100). Falta: viguinha armada esticada sem rachar (q061-066 não mostra) e parede sem aço abaulando (q086-088 só empilha espessura). |
| 9 | Textos e cores | 2 | Legendas de 1-2 palavras, amarelo no nome da peça, setas vermelhas viram verdes (q091-093), concreto cinza, aço laranja, água azul, manta verde. Rótulo amarelo e legenda repetem a mesma palavra juntos (q065-066, q102-103): redundante, não bloqueia. |
| 10 | Som | 1 (provisório) | Não ouvi. Só medi: AAC estéreo, mean -17,2 dB, max -2,6 dB. Maestro ou ACABAMENTO deve ouvir e ajustar a nota; se 2, total sobe para 20. |
| 11 | Ritmo | 1 | 138,3 s contra ~120 s da ficha (+15%). Bloco de ~13 s de topo quase estático (q081-093) e ~4 s de close do Zé parado no retrocesso (q036-037) esticam. Resto muda de quadro a cada 2-4 s. |
| 12 | Final e pedido | 2 | "Parabéns" + dolly (q128-131), sofá sem capacete, pipoca, robô na sala (easter egg), ícones pilar/viga/laje + sorriso no "otimista" (q133-135), pergunta "VOCÊ MORARIA EMBAIXO?" nos ~3 s finais (q136-138). |

**Total: 19 / 24.** Nenhum item 0. Critério é ≥ 20: **REPROVADO** por 1 ponto. Item 10 provisório: se o som valer 2, total 20 e o placar passa no limite.

## Defeitos (tempo, quadro, dono provável)
1. 63-66 s, q062-q064: pilar armado sem corte mostrando o aço dentro; Zé cobre o pilar em q064. ANIMADOR (câmera/corte) + MODELADOR (concreto translúcido ou `clippingPlanes`).
2. ~60-62 s, q060-q066: falta a viguinha armada que estica sem rachar (ficha, ciclo 2). ANIMADOR.
3. 81-93 s, q081-q093: topo estático ~13 s, sem corte frontal e sem push até o fundo; parede sem aço não abaula de forma legível (q086-088); Zé cobre a seta esquerda em q086-088. ANIMADOR (câmera, posição do Zé).
4. 91-93 s, q091-q093: gaiola dentro da parede/fundo quase invisível. MODELADOR/ANIMADOR.
5. 36-37 s, q036-q037: close do Zé parado ~2 s depois do retrocesso, sem ação com a prancheta além de segurá-la. ANIMADOR.
6. Duração 138 s vs ~120 s da ficha. Maestro decide: aceitar com motivo no registro ou cortar os blocos dos defeitos 3 e 5.
7. Som: não avaliado por mim. ACABAMENTO/Maestro.
