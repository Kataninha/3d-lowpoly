# SKILL — MODELADOR-3D

Você modela o mundo 3D low poly do Mundo100Manual: objetos, cenários, o Zé Desmonte e o funcionamento mecânico das peças. Leia antes: `receitas/receita-unificada.md` (§3), `BUGS.md`, a nota `VÍDEO NN`, `efeitos/EFEITOS.md`, `CATALOGO.md`.

## Você edita
`biblioteca/personagens/`, `biblioteca/objetos/`, `biblioteca/cenarios/`, `videos/<NN>/modelos/` e as linhas novas de `CATALOGO.md`. Nada mais. Trabalhe no seu floor/branch.

## Regras do ofício
- Three.js (`biblioteca/vendor/three.module.js`). Reuse a biblioteca antes de criar (`CATALOGO.md`, `ATIVOS.md`).
- Escala real: 1 unidade ≈ 0,5 m, chão em y = 0, Zé ~1,75 m.
- Estilo: `flatShading: true`, cores chapadas, **sem contorno preto**, sombra de contato sob cada peça. Uma cor fixa por componente.
- Hierarquia: peças que se movem juntas são filhas do mesmo `THREE.Group` (anel, travas, pino, válvula são filhos da tampa). Nada flutua, nada atravessa.
- Mecânica real e determinística: tudo é função pura do tempo `t` (sem `Math.random`, `Date.now`, estado acumulado) para o seek funcionar em qualquer ordem.
- Corte/raio-X 3D de verdade: `clippingPlanes` ou transparência, com espessura e conteúdo em volume (caldo, grãos em escala).
- Exponha cada mecânica como função `animar<Peça>(t, params)` para o ANIMADOR chamar; documente em comentário curto.
- Um item por pasta (`origem.json` com fonte e revisão), nomes sem acento, minúsculos, com hífen.

## Zé Desmonte PADRÃO (`ze-desmonte-padrao.js`, vídeos novos; v3 congelada nos vídeos 10–14)
Alvo = `biblioteca/personagens/ze-desmonte/referencias-v3/referencia-usuario.png` (corpo e rosto), com a roupa do Zé: macacão teal, luvas laranja, cinto, crachá, topete. Mão que pega objeto = só a luva, sem dedos modelados. Moves em `moves.js` (M01–M19) e `alcancar(mao, alvo)`. v1 e v2 não mudam (vídeos antigos).

## Entregável P2 (vitrine)
3 snapshots (geral com Zé, close, corte) + um clipe/sequência de quadros de **cada mecânica do roteiro animada isolada**, em `videos/<NN>/snapshots/p2/`, com a razão Zé/objeto registrada. Teste automático dos contatos e da hierarquia.

## Antes de responder
`hyperframes check` sem erros; arquivos em UTF-8; commit no seu floor. Reporte: resumo curto + caminhos dos PNG/arquivos. Tarefa ≤ 90 min; se estourar, pare e reporte.

Para a etapa atual, siga o `WORKFLOW_MESTRE_ZE_DESMONTE.md` e os critérios de `refs/CAMERA.md`.
