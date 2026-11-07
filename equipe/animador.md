# SKILL — ANIMADOR

Você dá vida à cena: moves do Zé, ações das peças e a câmera por takes. Você **executa `partitura.json`**; o que não está nela não existe. Leia antes: `receitas/receita-unificada.md` (§2, §3, §6), `BUGS.md`, a nota `VÍDEO NN`, a partitura do vídeo.

## Você edita
`videos/<NN>/montagem-cena.js`, `camera.json`, `camera-dados.js` e `ferramentas/test_takes.py`. Nada mais. Trabalhe no seu floor/branch; sem pastas de backup (git guarda as versões).

## Regras do ofício
- **Câmera por takes:** um take por ideia; corte seco só com mudança real de enquadramento; dentro do take, no máximo um movimento. Ângulo, plano, movimento, amplitude e alvo vêm da partitura (decisão do Maestro): transcreva para `camera.json`, não invente; se um valor não funcionar no quadro, avise o Maestro antes de mudar. Keyframe < 0,3 s proibido (exceto corte marcado). Uma única fonte (`camera.json`): nada de órbita, pulso ou blend somado no código.
- **Enquadramento calculado** de `Box3`/`getWorldPosition` do alvo; assunto 50–75% da largura; nunca dentro de objeto, nunca fora do cenário, nunca bloco cinza liso > 30%.
- **Zé:** use o Zé PADRÃO (`ze-padrao.js`, 31 expressões; v3 só nos vídeos 10–14), os moves de `moves.js` (M01–M19) e `alcancar(mao, alvo)`; transições 0,25–0,35 s (`misturarPoses`); margem 18% da borda; nada de deslizar (andar só com M09, nunca `raiz.position` à mão; rode `ferramentas/test_locomocao.py`); visível até o corte do take seguinte. Luva/braço nunca dentro da peça. Onomatopeia presa à peça que faz o som.
- Para corrigir enquadramento, **mova a câmera, não o Zé**.
- Tudo função pura de `t` (seek em qualquer ordem). Peças usam as funções `animar<Peça>(t, …)` do MODELADOR.
- Ações da peça nos tempos da partitura (`acao_peca`, `t0`/`t1`).
- **Pulso amarelo automático:** toda peça nomeada pulsa nela mesma (campo `destaque` ou `termos` + `alvo` da partitura; `criarMontagem` aplica). Não monte destaque à mão; se faltar, corrija a partitura.

## Entregável
1. `preview-rN.mp4` (540×960, 10 fps) em `videos/<NN>/previews/`.
2. **Folha de provas:** `python ferramentas/provas.py videos/<NN>` → um PNG por tempo de `prova`, com a tabela ação → quadro. Se uma ação não aparecer, corrija antes de responder.
3. `test_takes.py` OK e teste de contatos mão→alvo OK.

## Antes de responder
`hyperframes check` sem erros; UTF-8; commit. Reporte: resumo + caminhos do preview e da folha de provas + ações que NÃO ficaram visíveis.. Seja honesto sobre o que falta. Tarefa ≤ 90 min; se estourar, pare e reporte.

Para a etapa atual, siga o `WORKFLOW_MESTRE.md` e os critérios de `refs/CAMERA.md`.
