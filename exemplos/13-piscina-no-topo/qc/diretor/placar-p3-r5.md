# Placar P3 r5 — vídeo 13 (Por que a piscina no topo do prédio não despenca?)

Arquivo avaliado: `videos/13-piscina-no-topo/render/preview-r5-1080.mp4` (NÃO o r4).
sha256: `a0dc89d7275243dd145175e0ea1d7e81cfa70864ef439618adedd80507af44ae` (sha256sum conferido).
Formato: 1080x1920, 10 fps, 138,3 s, H.264 + AAC. Mesma duração do r4.
Método: ffmpeg 1 quadro/s a 360 px (138 PNG em `qc/diretor/r5/q/`, q001 = 0 s, tempo = número - 1), 9 folhas de 16 quadros. Mais zooms a 2 q/s e quadros a 540 px nos trechos que reprovaram. Placar r4 (`placar-p3.md`) não foi alterado.
Limitação: **não ouvi o áudio**. Só medi: mean -17,2 dB, max -2,8 dB. Item 10 é provisório.
Não rodei `lado_a_lado.py`: comparo contra `direcao.md`, `plano-visual.md` e `refs/CAMERA.md`.

## Quadros abertos (todos abertos e vistos)
- Folhas 1-138 s: `qc/diretor/r5/folha-01.png` a `folha-09.png`.
- Pilar e viguinha: `r5/zoom/pilar-60-68.png` (2 q/s), `r5/zoom/viguinha-52-60.png` (2 q/s), `r5/zoom/pilar-4up.png` (t 63,0 / 64,0 / 64,5 / 65,5 s, 540 px).
- Parede e piscina: `r5/zoom/parede-80-88.png`, `r5/zoom/parede-88-96.png` (2 q/s), `r5/zoom/par-4up.png` (recortes de 1080 px em t 83,5 / 87,5 / 90,5 / 92,0 s).
- Retrocesso e trecho 36-37 s: `r5/retro/retro-32-40.png` (2 q/s).
Também gerados e não usados: `r5/zoom/pilar-t63.0.png`, `pilar-t64.0.png`, `pilar-t64.5.png`, `pilar-t65.5.png`, `par-83.5.png`, `par-87.5.png`, `par-90.5.png`, `par-92.0.png`.

## Itens que reprovaram no r4: reavaliação
- **Aço do pilar visível: RESOLVIDO.** t 62,5-64,0: gaiola laranja sobe, concreto sobe em anéis opacos e esconde a gaiola. t 64,5-66+: concreto vira casca translúcida e a gaiola aparece inteira dentro (`pilar-4up.png`, 3º e 4º quadros), com ✔ e rótulo CONCRETO ARMADO. Os pontos laranja no topo seguem visíveis. Obs.: a gaiola fica escondida ~1 s (63,5-64,3) antes do corte; aceitável como "concreto cobre, depois o corte mostra".
- **Viguinha armada: RESOLVIDO.** t 60-62 (`pilar-60-68.png`, quadros 1-5): "o aço vai por dentro", viga com linha laranja embaixo, bloco em cima, viga curva e não racha. Contrasta com a viga sem aço que racha em t 57-58 (`viguinha-52-60.png`). A linha laranja é fina, mas lê.
- **Zé não cobre pilar/setas: RESOLVIDO.** t 63,0: Zé segura a gaiola com a mão e cobre só a base do pilar (ação de encaixar; o corpo do pilar e o aço ficam livres). t 64,0 e 64,5: Zé à esquerda, braço apontando, pilar livre. Parede (t 83-86): Zé à esquerda, fora das setas; ele sai de quadro em t ~86,5. Setas esquerda e direita visíveis o tempo todo (`par-4up.png`).
- **Parede sem aço abaula: RESOLVIDO.** t 84,5-88: fiadas se inclinam para fora nos dois lados, setas vermelhas dobram, ❌ (`par-4up.png` 2º quadro). Lê sem som.
- **Gaiola na parede e no fundo: MELHOROU, ainda fina.** t 90,5 e 92,0: contornos laranja (hexágonos nos estribos) na parede e no fundo, mais setas verdes de resistência. Legível a 1080 px; nas folhas a 360 px quase não se vê.
- **Piscina grande no corte de parede: RESOLVIDO.** Piscina ocupa ~80% da largura, parede e fundo em corte, perfil. Falta o push da ficha (ver item 3).
- **36-37 s: RESOLVIDO.** t 34,5-36,5 close do Zé com ação: acena, veste colete e capacete, pega prancheta, anda de perfil (`retro-32-40.png`, quadros 6-9). Fim do "close parado".

## Placar

| # | Item | Nota | Motivo e evidência |
|---|---|---|---|
| 1 | Gancho | 2 | Fala em 0 s, estalo ~3 s, raio-X sobe e mostra a piscina com pílula "10 MIL LITROS", sala enche até o sofá com boia (folha-01, q001-q016). |
| 2 | Ciclos e explicação clara | 2 | Fundação, concreto armado, laje, pressão, vazamento, bomba, caminho: limite visível, solução, nome (folhas 03-08). Sem som: problema = peso da piscina sobre o prédio; peça = estaca, aço, laje reforçada, parede armada, manta; resultado = setas vermelhas descendo até a fundação (folha-08). |
| 3 | Câmera por takes | 2 | O bloco de 80-93 s agora é corte frontal de perfil, piscina grande, e muda a cada 1-2 s (enche, setas, abaula, refaz, gaiola). `refs/CAMERA.md` aceita plano fixo para mecanismo repetido. Falta o push de 10% até o fundo da ficha; não bloqueia. Resto varia bem (raio-X, dolly, DET, SEC, REL). |
| 4 | Retrocesso e ícones | 2 | ◀◀ e varredura, torre encolhe, céu volta à manhã, terreno vazio, Zé troca figurino e pega prancheta (`retro-32-40.png`). Ícones ▶▶, ✔, ❌, pílulas coerentes. |
| 5 | Foco, escala e vida do mundo | 2 | Defeitos do r4 corrigidos: pilar e setas livres (ver acima). Restam Zé pequeno e quase parado ~4 s em t 36,5-40 s (terreno sobe em volta; "afunda" lê pelo ❌) e a mão do Zé sobre o rótulo em t 64,5. Mundo vivo: grua, luzes, robô, cidade. |
| 6 | Cenário | 2 | Sala, torre, canteiro e cobertura consistentes; céu avança de manhã para entardecer (folhas 01, 03, 07, 08). |
| 7 | Corte interno | 2 | Pilar: casca translúcida mostra a gaiola (`pilar-4up.png`). Estacas e camadas em corte real (folha-03/04). Parede e fundo com gaiola (`par-4up.png`). Ressalva: gaiola da parede é contorno fino; engrossar o traço melhoraria a leitura em tela de celular. |
| 8 | Física desenhada | 2 | Viga sem aço racha; viga armada curva sem rachar; laje verga com a água; parede sem aço abaula; sala enche; estaca cravando com poeira; chuveiro/guarda-chuva (folhas 04-07). |
| 9 | Textos e cores | 2 | Legendas de 1-2 palavras, nome em amarelo, concreto cinza, aço laranja, água azul, manta verde, setas vermelhas viram verdes. Redundância não bloqueante: rótulo amarelo e legenda repetem a palavra (CONCRETO ARMADO t 64-66; IMPERMEABILIZAÇÃO t ~102). |
| 10 | Som | 1 (provisório) | **Não ouvi.** Só medi: AAC, mean -17,2 dB, max -2,8 dB. Maestro/ACABAMENTO deve ouvir e ajustar; se 2, total sobe para 23. |
| 11 | Ritmo | 1 | 138,3 s contra ~120 s da ficha (+15%), igual ao r4. Sem blocos estáticos longos agora; o resto muda a cada 2-4 s. Maestro decide: aceitar com motivo no registro (a ficha já cita 200 pal/min e 5 ciclos) ou cortar. |
| 12 | Final e pedido | 2 | "Parabéns" + dolly, sofá sem capacete, pipoca, robô na sala, ícones pilar/viga/laje + sorriso no "otimista", "VOCÊ MORARIA EMBAIXO?" nos ~3 s finais (folha-09). |

**Total: 22 / 24.** Nenhum item 0, ≥ 20: **APROVADO** (com o item 10 em 1 provisório; com som 2 vira 23).

## Itens < 2 e ação sugerida
- Item 10 (som, provisório): ACABAMENTO/Maestro ouvir o r5 (estalo, golpes, clique por barra, rachadura, água, "Parabéns") e confirmar nota. Sem som não fecho.
- Item 11 (ritmo): Maestro registra aceite de 138 s com o motivo da ficha, ou corta. Não depende do Diretor.

## Pontos opcionais (não bloqueiam)
1. Engrossar o contorno laranja da gaiola na parede e no fundo (t 90-93) para ler em celular. MODELADOR.
2. Zé pequeno e parado em t 36,5-40: dar um idle mais legível ou aproximar a câmera; o afundar da bota ainda lê só pelo ❌. ANIMADOR.
3. Rótulo amarelo + legenda repetidos em t 64-66 e ~102. ACABAMENTO.
4. Push de 10% até o fundo no corte da piscina (ficha). ANIMADOR.
