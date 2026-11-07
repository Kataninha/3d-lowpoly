# REVISOR-CODIGO — P3 — vídeo 13 piscina-no-topo

Data: 04/11/2026. Escopo: `montagem-cena.js`, `overlays.js`, `index.html`, `modelos/cenario/*.js`, `modelos/mecanicas/*.js`, `kit/`. Código do vídeo só lido. Escrito: só `qc/revisor/relatorio.md` (e o rascunho `vazamento.html`, já existente, usado como está).

## Veredito: APROVADO (0 achados que bloqueiam P3; 1 médio e 5 baixos para corrigir antes do render final)

## Testes rodados
| Comando | Resultado |
|---|---|
| `python -m unittest discover -s ferramentas -p "test_*.py"` | `Ran 57 tests ... OK` |
| `python ferramentas/test_takes.py videos/13-piscina-no-topo` | PASS duracao, saltos, fontes, alvos, decisoes, ficha |
| `python videos/13-piscina-no-topo/conferencia/quadro_vazio.py videos/13-piscina-no-topo/render/preview-r4.mp4` | 1383 quadros a 10 q/s; textura mínima 4,69 (limite 1,5); `ZERO trechos suspeitos` |
| `npx hyperframes check --json` (na pasta do vídeo, só leitura) | lint, runtime, layout, motion, contrast, craft, audio: `ok`, 0 erros, 0 avisos |
| Manifesto do kit (sha256 de 141 arquivos vs `kit.manifest.json`) | 0 divergências, 0 extras, 0 faltando |

Efeito colateral do check: gravou `.hyperframes/artifacts/checks/ff28e341-....json` (pasta do próprio CLI, fora de `qc/revisor`).

## Checklist da ordem
1. **Determinismo (`Math.random`/`Date.now`/`performance.now`/`new Date`/`setTimeout`/`requestAnimationFrame`)**: PASS. `grep -nE` em montagem-cena.js, overlays.js, index.html, modelos/**: só 2 comentários (`modelos/cenario/util.js:1,14`, `modelos/mecanicas/base.js:2`). Variação vem de `hash(i, k)` puro.
2. **Seek (mesmo `t` = mesmo quadro)**: PASS com 1 ressalva (M1). Em página headless (WebGL, `readPixels`), hash de quadro:
   - 11 tempos em ordem direta, inversa e com pré-desenho aleatório: 0 diferenças.
   - 46 tempos x predecessores aleatórios: só 114,37 s difere (M1).
   - Varredura a 0,9 s em 3 predecessores (0, 137,9, 70): 0 diferenças. Varredura 113,9-127,2 s a 0,25 s: difere em 113,9-115,9 s (M1).
3. **Imports só de `kit/` e locais; uma instância de three**: PASS. Todos os imports de `modelos/` e `montagem-cena.js` são relativos a `kit/` ou ao vídeo (B57 ok; nenhum `biblioteca/` em `kit/*.js`). Importmap de `index.html:11` mapeia `three` e `/biblioteca/vendor/three.module.js` ao mesmo `./kit/vendor/three.module.js`. Um só `WebGLRenderer` (`montagem-cena.js:38`).
4. **Hierarquia**: PASS com ressalva (B1). Colete é filho do `tronco`; prancheta, balde, régua e chave são filhos das mãos; mecânicas são filhas de `pai` (`mec-<nome>`) com planos de corte deslocados junto (`montagem-cena.js:64-73`). B59 (`uuid` de `Plane`): `grep "\.uuid"` não acha uso; correção por WeakMap em `modelos/mecanicas/base.js` mantida. Testes de contatos (`test_contatos.py`) passam na suíte.
5. **Vazamento por quadro (GPU)**: PASS.
   - `vazamento.html` (16 grupos de tempo, 2 voltas): texturas fixas em 8; geometrias 1591 -> 2884 só na 1ª visita (criação preguiçosa), 2ª volta sem crescer (`geo` final = `geo` antes da volta).
   - Varreduras: 1383 quadros sequenciais a 0,1 s; 2700 quadros em ordem pseudoaleatória; 0 erro GL; programas 42-43 estáveis; geometrias oscilam 3154 <-> 3190 (ver B3) e voltam.
   - `new THREE.*Geometry/Material` em `updateAt`: nenhum no caminho por quadro de `montagem-cena.js` (todos na carga, linhas 98-164, 240-244). Clones de material (`corte.js:38`, destaques `montagem-cena.js:220`) são cacheados por (objeto, material) / material.
6. **UTF-8**: PASS. 39 arquivos do vídeo (js, html, json, md, py) decodificam em UTF-8, sem mojibake. (`Ã` em "FUNDAÇÃO" é falso positivo.) 1 BOM em `kit/efeitos/contorno-toon.js` (B5).
7. **Quadro vazio (B58)**: PASS no r4 (`quadro_vazio.py`). Varredura headless de 1383 quadros: nenhum quadro com desvio-padrão baixo nem erro GL. Ver nota abaixo sobre falso alarme.
8. **Som**: PASS. `som/disparos.json`: 32 eventos / 138,215 s = 13,89/min (limite 14); 0 eventos fora de take; intervalo mínimo 0,49 s. Takes 3 e 13 sem disparo. Margem de 0,11/min: se o ACABAMENTO regerar com +1 evento, estoura (33 -> 14,3/min).
9. **Legenda**: PASS. `tempos.json` sem palavra com `[`/`]`; `W()` em montagem-cena.js e overlays.js lança erro se palavra faltar e o `check` de runtime passou, logo todas existem.

## Achados

### Bloqueia P3
Nenhum.

### Não bloqueia (corrigir antes do render final)

**M1 (médio) — `poteColo` herda posição do seek anterior no take 17 (113,9-116,0 s e 121,0-127,2 s).**
- `montagem-cena.js:737` deixa `poteColo.visible` verdadeiro em `n === 17`. A posição só é escrita em `:738` (take 1), `:378` (take 2), `:386`/`:388` (take 17 dentro de 116-121 e take 19). Em `:352` o take 17 fora de 116-121 faz `esconder(casa); return;` antes de `:386`. Resultado: pote visível, Ze escondido, posição = último valor escrito por outro seek (2,3 / 2,4 / 2,1 em x).
- Evidência: a 114,37 s, predecessor 0 ou 117+ gera hash A; predecessor 5-114,4 gera hash B. Diferença de 77 px em 270x480 (caixa 173,137 a 185,146), ou seja, o pote se desloca ~0,2 u. Snapshot da cena: 13 nós diferem (pote + juntas do Ze escondido).
- Risco: render com vários workers (`render-r4.log` mostra `auto workers`, reduzido a 1 só por calibração) pode divergir do preview e entre execuções. Contradiz o comentário `montagem-cena.js:730` "nada herdado do seek anterior".
- Dono: ANIMADOR. Correção: mover `poteColo.position.set(2.1, SALA_Y + 1.5, 0.4)` para antes do `return` em `:352` (ou escrever a posição por take dentro de `updateAt`, antes dos `if`). Decidir também se o pote deve aparecer sem o Ze (113,9-116 s e 121-127 s); hoje flutua no sofá.

**B1 (baixo) — pote/pipocas fora da hierarquia, com posição absoluta repetida.** `montagem-cena.js:369,378,386,388,738`: o pote "no colo" usa 4 coordenadas distintas (2,3 / 2,4 / 2,1 e `colo` 2,2) em vez de ser filho do Ze/sofá ou ter uma constante. Pipocas seguem arco calculado da mão (aceitável: voam). Dono: ANIMADOR. Correção: uma constante `COLO` e `poteColo` como filho do grupo do sofá.

**B2 (baixo) — tempos fixos duplicados.** `montagem-cena.js:298` (`fimRetro: 36.5`) e `overlays.js:56` (`T_FIM_RETRO = 36.5`); `113.9`, `127.4`, `131.5`, `93.4`, `25.4` etc. em `mundo()`/`atualizarFissura`/`atualizarTake5`. A voz está travada em 1,10x (138,215 s), então é só risco se a voz mudar. Dono: ANIMADOR. Correção: derivar de `partitura.json`/`W()` ou exportar `T` de `montagem-cena.js`.

**B3 (baixo) — churn de geometria por quadro no corte vertical.** `modelos/cenario/corte.js:24-25,52,70`: cada `aplicar()` descarta (`limpar`, `:20`) e recria ~36 `PlaneGeometry`/`BufferGeometry`. Não vaza (contagem volta), mas custa GC/GPU por quadro durante o take 14 (e qualquer corte). Dono: MODELADOR. Correção opcional: reaproveitar as tampas se o plano e as peças não mudarem.

**B4 (baixo) — estado "visible && ..." depende do cenário zerar antes.** `montagem-cena.js:725` (`arvores.visible && n !== 4`) e `:729` (`casca-cobertura`). Hoje correto porque `cen.updateAt` repõe a visibilidade a cada quadro (a varredura de seek não achou diferença nos takes 4 e 15). Frágil se `obra.updateAt`/`torre.updateAt` deixarem de repor. Dono: ANIMADOR. Correção: atribuir `= n !== 4` só se a camada de baixo garantir, ou comentar a dependência.

**B5 (baixo) — resíduos no kit.** BOM UTF-8 em `kit/efeitos/contorno-toon.js` (B31 pede UTF-8; módulo carrega, mas `cp` do kit repete o BOM). Cópias não usadas em `kit/personagens/ze-desmonte/` (`ze-desmonte.js`, `ze-desmonte-v2.js`, `ze-desmonte.pre-wf-h.js`); vídeo só importa `ze-desmonte-v3.js` e `moves.js`. Dono: MAESTRO (lock/manifesto). Correção: remover do kit só com aprovação (regra: não apagar arquivo existente).

## Notas
- Falso alarme meu: em uma sessão headless, depois de duas chamadas de ferramenta interrompidas por timeout durante laços longos, o canvas ficou com desvio-padrão fixo (3,69) e `gl.getError() = 1282`. Reproduzi com página nova: 2700 quadros em ordem aleatória sem erro. Não é vazamento da cena; ainda assim reforça B58: manter o detector de quadro vazio a cada render.
- ACABAMENTO editava `index.html`/som/render em paralelo; não toquei neles. Estado do git para o vídeo no momento: `estado.json`, `index.html`, `registro.md` modificados; `montagem-cena.js`, `overlays.js`, `modelos/**` iguais ao último commit.
- Não verifiquei: legenda palavra a palavra contra o áudio (só existência de palavras); "cada disparo cai num tempo de ação da partitura" além de estar dentro de um take (a coluna `sfx` da partitura é texto livre); render real em 1080 com vários workers.
