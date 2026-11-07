# BUGS — memória de bugs (ler ANTES de trabalhar; preencher ao achar/corrigir um bug)

Formato: `### [ID] título` · Sintoma · Causa · Correção/Evitar · Status (aberto/corrigido) · Data

### [B1] Número duplicado em novo_video.py (`00-00-teste`)
- Sintoma: `novo_video.py 00-teste` criou `videos/00-00-teste`.
- Causa: slug já começava com NN- e o script prefixava outro número.
- Correção: `re.sub(r'^\d+-', '', slug)` em `ferramentas/novo_video.py`. Status: corrigido (2026-10-28).

### [B4] Git com raiz errada
- Sintoma: `git status` mostra todo o perfil `o perfil do usuário` como não rastreado.
- Evitar: `git init` dentro do workspace (precisa aprovação). Status: aberto.

### [B5] Preview serve `kit/*` em outra URL
- Sintoma: `localhost:<porta>/kit/...` devolve o HTML do studio, não o arquivo.
- Fato: junctions funcionam; testar em `/api/projects/<id>/preview/kit/...`. Status: informativo.

### [B6] Acento em nome de arquivo (`zé_personagem.js`)
- Evitar: caminhos/imports sempre sem acento (`ze`). Status: regra.

### [B7] Várias versões de `kiko.js` / "Kiko" nos projetos antigos
- Evitar: só usar `biblioteca/personagens/ze/ze.js`. Projetos antigos intocados até aprovação. Status: aberto.

### [B8] Gemini inventa links e views em pesquisa
- Sintoma: na T2, `pesquisa-tema/gemini.md` citou 3 vídeos do YouTube (kY3w6B6k3vE, 0kF6lX5U2t0, FTmeTVz24nG) que não existem (oEmbed 404/400), com views de milhões.
- Causa: o agente preencheu IDs sem fonte real. O vídeo do Manual do Mundo existe (ETVAo9SNCn0, 1.176.836 views): número certo, ID inventado.
- Evitar: Maestro confere todo link de pesquisa via `https://www.youtube.com/oembed?url=...` antes de decidir; número sem link verificado é descartado. Status: aberto (2026-10-28).

### [B9] `novo_video.py` falha: `modelo-video` não existe
- Sintoma: `FileNotFoundError: ...\teste_hyperframes\modelo-video` ao criar `panela-de-pressao`.
- Causa: a pasta do modelo está como `modelo-video 1` na raiz (renomeada fora do script).
- Evitar: não renomear sem aprovação do usuário. Enquanto isso, `videos/02-panela-de-pressao/` foi criada à mão só com `roteiro.txt`; o modelo será copiado para dentro dela depois. Status: corrigido (2026-10-28): usuário aprovou; pasta renomeada para `modelo-video` e modelo + `kit/` sincronizados em `videos/02-panela-de-pressao/`.

### [B10] Kit da máquina de lavar não foi migrado para a biblioteca
- Sintoma: vídeo 02 (panela) saiu sem efeitos, sem cenário, sem escala, com 1 SFX; Zé do tamanho da panela. Usuário reprovou (2026-10-28).
- Causa: `biblioteca/` e `modelo-video/` ficaram só com Zé, identidade e vendor. Ficaram para trás `efeitos.js`/`EFEITOS.md`, `W(frase, palavra)` (`alinhar.py`, `montar_index.py`, `index.modelo.html`), `sons.py` e a convenção de escala de `cenario.js` (projeto `referencias/maquina-de-lavar`).
- Correção: tarefas WF-A a WF-J (Codex) trouxeram o kit para a biblioteca e o modelo (efeitos, W(), sons, contorno-toon.js, sombra de contato, câmera 3/4, apontar, CTA, conferir.py); receita v1.2 torna o kit obrigatório; Gemini aprovou (WF-K). Status: corrigido (2026-10-28).

### [B12] QC aprovou vídeo abaixo da referência
- Sintoma: Gemini aprovou a 2ª versão do vídeo 02 com "zero bloqueios"; o usuário achou muito ruim.
- Causa: a revisão conferiu só a lista de correções anterior, sem comparar com o vídeo aprovado; `hyperframes check` sem erros foi tratado como pronto; a partitura (P1) foi pulada.
- Correção: receita v1.1 com portões P1–P4 e placar de 10 itens contra a máquina de lavar; nenhum item "abaixo" passa. Status: corrigido na receita (2026-10-28).

### [B10] HyperFrames detecta backups e modelos como composições duplicadas
- Sintoma: `check` informa `multiple_root_compositions` quando `index.v1.html`, `index.modelo.html` ou um HTML gerado ficam na raiz do projeto.
- Causa: o CLI descobre todos os HTMLs da raiz que declaram uma composição.
- Correção: `novo_video.py` não copia esses arquivos de apoio para a raiz; modelo editável fica em `modelos/`. Gerador escreve nessa subpasta por padrão. Status: corrigido (2026-10-28).

### [B13] Contagem da mixagem confundida com SFX no portão P3
- Sintoma: detector estimou 283 onsets nos vídeos da máquina e da panela, incluindo sílabas da voz.
- Causa: análise da faixa mixada usada como contagem de efeitos.
- Correção: `conferir.py --modo P3` exige `--sfx` separado; fora de P3, a contagem da mixagem é marcada como inválida para o portão. Status: corrigido (2026-10-28).

### [B14] Gemini (agy) perde a autenticação no meio da tarefa
- Sintoma: `UNAUTHENTICATED (code 401): Request had invalid authentication credentials` durante a PL-1 (banco de referências), depois de baixar os 8 vídeos e extrair os quadros, antes das fichas.
- Causa: token OAuth do Google do Antigravity CLI expirou ou foi invalidado. Não é erro da tarefa.
- Correção: o usuário refaz o login no `agy`; o Maestro reenvia a tarefa a partir do que já está salvo (catalogo.json, vídeos e quadros não são refeitos). O pipeline trata 401 como trava: pausa e avisa, sem contornar. Status: aberto (2026-10-28), aguardando login.
- Atualização 2026-10-28 (2ª queda): causa real achada nos logs `~/.gemini/antigravity-cli/log/`. O token OAuth dura 1 h; a sessão longa do agy carrega o token uma vez e não o renova no meio da tarefa. As 2 quedas foram 10–30 s depois do vencimento (expiry 17:12:37 → 401 às 17:12:47; expiry 18:12:46 → 401 às 18:13:13). O keyring já tinha token novo (vence 19:08:38) e a sessão voltou a responder sem novo login. Evitar: pedidos ao Gemini em blocos de até ~45 min (uma ficha ou etapa por pedido) e, em caso de 401, o Maestro só reenvia o pedido do ponto salvo. Login novo só se o reenvio também der 401. Status: contornado no pipeline.
- Atualização 2026-10-28 (3ª queda, 19:12:53): o agy renovou o token às 19:12:51 (novo vencimento 20:12:51), mas o pedido em curso, iniciado às 18:16, continuou com o token antigo e caiu 2 s depois. Ou seja: o token é capturado no início de cada pedido e vale até o vencimento da hora (hoje por volta de :12). Regra: um pedido ao Gemini = uma etapa curta que termina antes do próximo vencimento; o vigia automático (`ferramentas/vigia_gemini.py` + rotina) detecta 401 novo no log e manda o Maestro reenviar. Vigia pronto (PL-5, testes OK). Status: contornado.

### [B15] Vídeo novo já nasce com `voz/tempos.json` e o pipeline trava na etapa voz
- Sintoma: no ensaio seco (`videos/06-ensaio-pipeline`), `python ferramentas/alinhar.py <video>` falhou com `FileExistsError: ...\voz\tempos.json`.
- Causa: `modelo-video/voz/` traz `tempos.json` e `eventos.json` de exemplo; `novo_video.py` copia para todo vídeo novo, e `alinhar.py` (corretamente) não sobrescreve.
- Correção: `novo_video.py` mantém `voz/` e exclui da cópia os exemplos `tempos.json` e `eventos.json`; `alinhar.py` gera os tempos antes de `montar_index.py`. Teste com vídeo temporário e suíte de 15 testes OK. Status: corrigido (2026-10-28).

### [B16] Rotina do pipeline repete a etapa que já está em andamento
- Sintoma: no ensaio seco (vídeo 06), o P0 foi delegado ao Gemini às 19:54; `pipeline.py pendente` continua listando o mesmo P0, então a rotina de 10 min dispararia de novo e duplicaria o pedido.
- Causa: `estado.json` só guarda a última etapa concluída; não há marca de "em andamento".
- Correção: `pipeline.py iniciar` registra a próxima etapa e o horário; `pendente` não a redispara e alerta após 90 minutos; `avancar` e `reprovar` removem a marca. Suíte: 18 testes OK. Status: corrigido (2026-10-28).

### [B17] `roteiro.txt` do modelo perdeu o acento ("pe?a")
- Sintoma: `modelo-video/roteiro.txt` (e cópias em `videos/05-teste-kit`, `videos/06-ensaio-pipeline`) tem "Veja a pe?a por dentro."; `alinhar.py` repete o "?".
- Causa: arquivo gravado em ASCII; o "ç" virou "?" antes de chegar ao disco.
- Correção: modelo-video/roteiro.txt regravado em UTF-8 com peça; acentos perdidos também corrigidos em modelo-video/registro.md. Teste de novo_video.py verifica o roteiro gerado em pasta temporária. Cópias em videos/05 e videos/06 preservadas. Status: corrigido (2026-10-28).

### [B18] Vídeo novo já nasce com `som/sfx.wav` e `som/disparos.json` do modelo
- Sintoma: na montagem do ensaio (vídeo 06), `sons.py` não pôde gravar `som/sfx.wav` (já existia, de exemplo); o Codex gerou em `som/montagem/sfx-mix.wav` para não sobrescrever.
- Causa: mesmo caso do B15. `modelo-video/som/` traz saídas de exemplo e `novo_video.py` copia.
- Correção: `novo_video.py` mantém `som/sfx.wav` para o HTML e não copia `som/disparos.json`; `sons.py` substitui saídas existentes somente se forem idênticas, byte a byte, às do modelo. Arquivos diferentes são preservados. Suíte: 23 testes OK. Status: corrigido (2026-10-28).

### [B19] Vitrine P2 do vídeo 07 (panela): chama dentro da panela, recorte falso, sem sombras, enquadramento vazio
- Sintoma (rev1, `videos/07-panela-de-pressao/snapshots/p2/rev1/`): chamas azuis do queimador atravessavam o fundo e apareciam dentro do corte; "janela de segurança" era uma caixa azul colada sobre a tampa; sombra de contato só no Zé (meshes sem castShadow/receiveShadow); plano aberto com ~40% de vazio cinza em cima, Zé cortado na borda e longe do fogão, panela na boca de trás; cabos em caixa reta; vapor em bolas grandes; quase sem espuma.
- Causa: altura das chamas maior que o vão grade–fundo; peças "de enfeite" no lugar da geometria; sombras ligadas só no personagem; câmera sem compor o 9:16.
- Correção (rev2, `snapshots/p2/rev2/ajuste-5/`): chamas abaixo do fundo; recorte real na aba da tampa com o anel azul aparecendo; sombras em fogão, bancada, armários e panela; parede alta completa, Zé ao lado do fogão alcançando a panela na boca dianteira; cabos arredondados; vapor em partículas pequenas em cone; camada de espuma. Evitar: em toda vitrine, conferir interpenetração (chama, líquido, Zé) e sombra em todos os objetos.
- Nota de processo: Gemini aprovou a rev1 afirmando recorte funcional e sombras que não existiam (mesmo padrão do B12); o Codex desmentiu ao auditar o código. Maestro abre os PNG antes de homologar. Status: corrigido (2026-10-28), aguardando parecer do Gemini na rev2.

### [B20] Montagem do vídeo 07: braço do Zé atravessa a panela, anel solto, legenda dupla (feedback do usuário)
- Sintoma (prints do usuário, 29/10): (1) em close na palavra "tampa", o braço do Zé ocupa o quadro e passa por trás/através da panela; (2) no corte, o anel de vedação aparece como arco solto flutuando dentro da panela, separado da tampa; (3) em "ANEL DE VEDAÇÃO", o corpo teal do Zé aparece pelo vão entre tampa e panela (interpenetração), o anel é só um pedaço azul no recorte e a legenda "anel" aparece duplicada/sobreposta (fantasma); (4) no corte, arco branco/azul do anel e as abas/travas pendurados abaixo da tampa, dentro da panela, sem encaixe na borda.
- Causa provável: Zé posicionado sem checar colisão com a panela nos closes; anel modelado como arco parcial no corte; duas camadas de legenda ativas ao mesmo tempo na troca de palavra.
- Correção: ver pedido movimento4b. Evitar: conferir interpenetração Zé × panela × fogão em todo close; anel sempre como aro completo encaixado na tampa (no corte, metade do aro presa à tampa); uma única legenda visível por vez.
- Status: aberto (2026-10-29).

- Atualização movimento4b / passo 1 (29/10): anel de vedação alojado na canaleta e subordinado à tampa; travas na borda e peças sem deslocamento independente. Ver teste `videos/07-panela-de-pressao/conferencia/montagem/movimento4b/passo1/teste-passo1-resultado.json`. Pendentes os problemas de Zé/legenda (passos seguintes); status: parcialmente corrigido.

### [B21] Zé duro e deslizando de lado (feedback do usuário, vídeo 07)
- Sintoma: o Zé anda/desliza de lado sem passos e parece rígido; quase sem expressão.
- Causa provável: posição do Zé interpolada entre marcas sem ciclo de caminhada; poses sem movimento secundário (respiração, cabeça, mãos).
- Correção: Zé não se desloca deslizando (fica no lugar ou troca de lugar fora de quadro); animado com reações e expressões do `EFEITOS.md`, respiração/balanço leve, cabeça acompanhando a panela, mãos mexendo na panela (tampa, cabo, botão). Ele não precisa participar de toda explicação; só aparecer vivo. Status: aberto (2026-10-29).

### [B22] Preview a 10 fps parece travado; panela com peças soltas em vários takes (vídeo 07)
- Sintoma (usuário + folha do Maestro `conferencia/feedback-usuario-29-10/6-maestro-folha-movimento4-a-cada-4s.png`): preview-movimento4.mp4 a 10 fps (referência máquina de lavar e vídeo 02: 30 fps) parece travado. Panela: tampa flutuando acima do corpo com aro duplo (16 s), tampa deslocada/torta no corte (24 s), abas e arco do anel pendurados dentro (4, 20, 56 s), válvula de segurança vermelha solta no ar (72 s), setas vermelhas e "← ↑ →" minúsculos e soltos (28–36, 64 s). Zé virou figurinha recortada fixa no canto superior direito (não é estilo do projeto e continua "duro").
- Causa provável: preview renderizado a 10 fps para economizar tempo; peças da panela com posições animadas independentes (sem hierarquia tampa → anel/abas/pino/válvula); figurinha usada para cumprir "Zé em 9/12".
- Correção: previews de conferência seguem a 10 fps (decisão do usuário, 29/10: mais rápido); só o render final a 30 fps; peças da tampa como filhas da tampa (movem juntas); figurinha removida (decisão do usuário: Zé só aparece vivo em cena). Status: aberto (2026-10-29).

- Atualização movimento4b / passo 1 (29/10): anel, canaleta, travas, pino, válvula, janela e cabo da tampa subordinados à tampa; setas 3D subordinadas ao corpo; chama em cones azuis animados abaixo do fundo. As sobreposições de texto de setas foram retiradas do HTML e do gerador. Previews continuam a 10 fps. Restam figurinha/Zé e outras etapas; status: parcialmente corrigido.

### [B23] Marcas de voz do Eleven v4 aparecem na legenda (`[curious]`, `[nervous]`, `[excited]`, `[sighs]`)
- Sintoma (print do usuário, vídeo 07): a legenda começa com "[curious]" antes de "Duas horas...".
- Causa: `roteiro.txt` guarda as marcas do Eleven v4 e `alinhar.py` as trata como palavras em `tempos.json`; a legenda usa essas palavras.
- Correção: remover tokens `[...]` das palavras de legenda (na geração da legenda/`alinhar.py`, sem mudar o roteiro). Vale para todos os vídeos. Status: aberto (2026-10-29).

### [B24] Botão do fogão com estado errado no início da cena (vídeo 07, passo 2c)
- Sintoma (relato do ENGENHEIRO-CODEX, 29/10 ~14:35): bug transitório de inicialização do botão do fogão — o giro do botão não partia do estado certo no começo da animação (visível só nos primeiros quadros/seek).
- Causa: estado inicial do botão não definido de forma determinística antes da primeira atualização em `montagem-cena.js` (detalhe técnico com o Codex).
- Correção: corrigido pelo Codex no passo 2c (`montagem-cena.js`); `teste-contatos-resultado-rev3.json` PASS (luva→centro do botão 0,020 m em 53,85/60,69 s). Status: corrigido (2026-10-29); confirmar no render do passo 4.

### [B25] Zé sem contato real com objetos e sempre no mesmo enquadramento (vídeo 07, passos 2b–4)
- Sintoma (QC do Maestro 13:08–15:25): luva ~90 px acima do botão (55 s), luva no olho ao reagir ao TREC-TREC (14 s), antebraço cobrindo a boca no gesto "não" (55,9 s), Zé olhando para fora e colado na borda (108 s), 9 de 15 quadros com o mesmo 3/4 médio; nas versões 2b o enquadramento era corrigido afastando o Zé do fogão (ações sumiam).
- Causa: poses sem alvo de contato (IK) e câmera do Zé (`cameraZeAt`) única para todas as janelas; correção de enquadramento feita movendo o personagem.
- Correção: `guiarMao` com alvo em colher/botão/cabo e teste de contato (`teste-contatos`, distância luva↔alvo ≤ 0,02 m); `cameraZeAt` com planos por janela (close de reação, frontal no final); regra "mova a câmera, não o Zé". Passo 4b-ze rev2 (29/10 ~15:45): PASS. Status: corrigido (2026-10-29); confirmar no P3.

### [B26] Vigia Gemini 401 dispara para sessão agy de outro workspace
- Sintoma: em 2026-10-29 o vigia avisou 401 às 18:48:17 (`cli-20261029_175240.log`) e pediu reenvio do ponto salvo da PL-1.
- Causa: `ferramentas/vigia_gemini.py` lê todos os `cli-*.log` de `~/.gemini/antigravity-cli/log/`, que é global. Esse log era de outra sessão agy ("DaVinci", workspace `teste_novo`, vídeo DfCYLMRSl9H), já retomada com "Continuar" às 18:49. A PL-1 está aprovada desde 28/10; nada a reenviar ao DIRETOR-VISUAL-GEMINI.
- Correção proposta: o vigia só considera logs cuja sessão tenha o workspace `teste_hyperframes` (ou o nome DIRETOR-VISUAL-GEMINI) e ignora 401 seguido de retomada no mesmo log. Status: aberto (2026-10-29), aguardando tarefa para ENGENHEIRO-CODEX.

### [B27] Câmera do vídeo 07 com balanço constante
- Sintoma: usuário (29/10): "vídeo muito mexido, ficou estranho".
- Causa: `videos/07-panela-de-pressao/montagem-cena.js` somava aos keyframes uma órbita contínua (período 2,8 s, 27% da distância) e um push de 30% a cada 2,8 s em `cameraAt`; `cameraZeAt` tinha pulse senoidal de 3 s. Foi feito para baixar o % parado e virou balanço sem relação com a fala.
- Correção: órbita, push e pulse removidos; `cameraZeAt` com push-in monotônico de 5%. Backups em `conferencia/montagem/movimento5-camera-calma/`. `camera.json` igual ao anterior; as 44 falhas de `test_camera.py` já existiam (teste desatualizado após pos-p3, mesmo JSON). O Codex registrou por engano uma cópia desta entrada em `videos/07-panela-de-pressao/BUGS.md`. Status: parcial (2026-10-29), falta preview, conferir.py e QC visual.
- Status final: corrigido (2026-10-29; câmera refeita em takes, render v3).

### [B28] Vídeo 07 entregue sem as ações que explicam a panela
- Sintoma: usuário (29/10): "não está explicando nada, a tampa não abre, não tem pino". Auditoria em `videos/07-panela-de-pressao/conferencia/feedback-usuario-29-10/auditoria-explicacao.md`: 10 ações da partitura ausentes, 7 fracas, 1 errada (pílula RECORTE no pino).
- Causa: a montagem simplificou ações da partitura e nenhum portão conferiu ação por ação; P3 olhou câmera, som e placar geral.
- Correção: refazer as ações em `montagem-cena.js`; P3 passa a exigir uma tabela "ação da partitura → quadro que a mostra". Status: aberto (2026-10-29).

- Atualização B28 (2026-10-29): movimento6-explicacao r4 implementa as ações principais e gera 51 PNGs para 16 linhas da auditoria, com mapa-quadros-r4.md. Preview 540x960/10fps, HyperFrames check PASS (0 erros). Parecer visual final pendente; status: parcialmente corrigido.
- Status final: corrigido (2026-10-29; ações refeitas e revisadas quadro a quadro, render v3).

### [B29] Câmera do vídeo 07 "parecendo bugada": saltos instantâneos
- Sintoma: usuário (29/10): "a câmera fica toda hora, parecendo que está bugado" (prints de takes cortados e de metade do quadro cinza).
- Causa: `camera.json` acumulou 76 keyframes de 0,001 s (saltos de 0,2 a 1,9 m) e 119 movimentos rápidos em 117 s, criados nas rodadas passo4 e pos-p3 para bater "% parado ≤ 45%" e "mudança a cada 2–3 s"; mais blends de 0,16 s nas janelas do Zé. Nenhum portão olhava os saltos; o Maestro aceitou números em vez de assistir.
- Correção: câmera refeita do zero pela `videos/07-panela-de-pressao/partitura-takes.md` (26 takes, corte seco só com mudança real de enquadramento, aproximação lenta dentro do take). Teste novo: nenhum segmento < 0,3 s exceto cortes marcados. Status: aberto (2026-10-29).
- Status final: corrigido (2026-10-29; 26 takes, test_takes.py OK, render v3).

### [B30] Zé some 0,15–0,27 s antes do corte (cozinha vazia piscando)
- Sintoma: no render v2 do vídeo 07 (P4 do Maestro), a cozinha aparece sem o Zé em 4,0–4,27 / 15,61–15,78 / 39,45–39,63 / 61,26–61,41 / 88,29–88,46 / 109,55–109,73 s. Parece falha.
- Causa: a janela de visibilidade do Zé termina no fim da fala, mas o take de câmera dele só corta no início da fala seguinte.
- Correção: o Zé fica visível até o corte do take seguinte (início do próximo take em camera.json). Status: aberto (2026-10-29).
- Status final: corrigido (2026-10-29; Zé visível até o corte, render v3, P4 do Maestro).

### [B31] Codex grava trechos em cp1252 em arquivos UTF-8
- Sintoma: `BUGS.md` ficou com bytes inválidos em UTF-8 (ex.: "Atualização B28" gravada em cp1252) e travou leitura em Python.
- Causa: append feito pelo PowerShell do Codex sem `-Encoding utf8` (padrão do Windows PowerShell 5 é ANSI/cp1252).
- Correção: Maestro converteu as linhas cp1252 para UTF-8 (backup no scratchpad). Regra para o Codex: escrever sempre com `-Encoding utf8` ou via Python `encoding='utf-8'`. Status: corrigido no arquivo; regra a reforçar nos pedidos (2026-10-29).

- Atualização B23 (2026-10-30): `montar_index.py:5` já filtra as marcas com `VOICE_MARKER`; legenda 1–2 palavras sem `[...]` virou item do checklist da receita v2.0 e do REVISOR-CODIGO. Status: corrigido.

### [B32] Vídeo 07: FOV da câmera salta sem interpolação (achado pelo novo test_takes)
- Sintoma: o `test_takes.py` generalizado (pipeline v2) acusa 6 saltos de FOV sem corte marcado no vídeo 07: 20,48 s (35→43), 25,94 (43→36), 29,13 (36→43), 46,95 (32→39), 75,34 (35→42), 97,98 s (52→43). O teste original do 07 passava 5/5 porque não testava FOV.
- Causa: `cameraAt` em `montagem-cena.js` interpola a posição em 0,45 s mas aplica o FOV direto.
- Correção: vídeo 07 já entregue e aprovado, não será mexido (decisão do usuário 30/10). Nos vídeos novos o template (`modelo-video/montagem-cena.template.js`) interpola posição, alvo e FOV juntos e o teste novo falha se não. Status: corrigido nos vídeos novos; 07 intocado (2026-10-30).

### [B33] Retro do vídeo 07: ~27 h, ~40 rodadas, 6 cópias de regra em versões diferentes
- Sintoma: câmera ajustada por métrica (~20 rodadas), 7 revisões de mão, ações da partitura sem prova, QC aprovando versões velhas, 10 cópias de `montagem-cena.js` e 3104 arquivos em `conferencia/`.
- Causa: P1 sem ações com tempo de prova, tarefas longas num Codex só, regras duplicadas e contraditórias (receita v1.9 × skill v1.5 × AGENTS).
- Correção: receita v2.0 (partitura de produção com provas, P2 prova a mecânica, Maestro assiste a 1 q/s), equipe de especialistas com ordens de serviço, git no workspace, notas reduzidas a PAINEL + SKILLs, ferramentas `provas.py`/`mapa.py`/`lado_a_lado.py`/`test_takes.py`. Status: corrigido (2026-10-30), a validar no próximo vídeo.

### [B34] Testes do kit v2 aprovam dados vazios ou inválidos (REVISOR-CODIGO R1)
- Sintoma: `test_takes.validar` aceita keyframe sem posição/FOV; `test_contatos.validar` aceita luva dentro da Box3 com `intersecoes: []`; template da montagem muda câmera sem transição e importa `../biblioteca/...` (caminho errado dentro de `videos/NN/`); `moves.js` guarda a posição inicial da raiz num `WeakMap` na primeira chamada.
- Causa: testes confiam no JSON/lista exportada em vez de medir; template escrito sem validar no projeto gerado.
- Correção: ANIMADOR valida schema de todos os takes, rejeita luva dentro da Box3 e transição sem interpolação, usa o caminho do kit, torna a posição-base explícita e prova seek por hash de PNG. Relatório: `tarefas/setup-v2/revisao-codigo-r1.md`. Status: aberto (2026-10-30).

### [B35] Texto com acentos trocados por `?` em moves.js e testes (UTF-8)
- Sintoma: `moves.js:22`, `test_takes.py:15`, `test_contatos.py:7` com `Alcan?a`, `c?mera`, `Evid?ncia`.
- Causa: escrita do Codex perdeu os caracteres (variante de B31).
- Correção: restaurar o texto em UTF-8; REVISOR-CODIGO passa a rodar `rg "[A-Za-z]\?[A-Za-z]"` nos arquivos novos. Status: aberto (2026-10-30).

### [B36] Projeto novo nasce em `roteiro_aprovado` sem aprovação registrada
- Sintoma: `novo_video.py` grava `etapa=roteiro_aprovado`; a voz poderia iniciar só pela presença do arquivo. Também: `provas.py` e `mapa.py` não rodam duas vezes no mesmo projeto (`exist_ok=False`), `conferir.py` imprime pico ≤ -1,5 dBTP (receita: -1) e `mapa.py` fixa HyperFrames 0.8.181 contra 0.8.191 do projeto.
- Correção: etapa inicial `roteiro_pendente` e `avancar roteiro_aprovado` explícito após o usuário aprovar; saídas versionadas; textos e versão alinhados. Dono: ACABAMENTO. Status: aberto (2026-10-30).


- Status final B36 (2026-10-30): corrigido pelo ACABAMENTO (roteiro_pendente, saídas provas-rN/mapa-rN, pico -1 dBTP, versão do HyperFrames lida do package.json); 36 testes OK, commit ee53162. Falta a segunda auditoria do REVISOR-CODIGO.

- Status B34/B35 (2026-10-30): corrigidos pelo ANIMADOR (schema completo, Box3, template com interpolação e import ./kit, base explícita, acentos; seek por hash de PNG igual com o Zé v2). 36 testes OK, commit 701dc5b. Aguardando auditoria R2 do REVISOR-CODIGO.

- Status final B34 (2026-10-30): corrigido; R2 fechada pelo Maestro (M09 com vetores JSON, direção nula e fonte divergente rejeitadas, template testado em Chromium; 38 testes OK, commit 7bfc4f8). Pendente para o 1º vídeo real: teste de hierarquia de peças.

- Atualização Zé v2 (2026-10-30): cinto refeito como anel curvo junto ao barril (elevado 0,10, raio 4% acima do tronco), com fivela, bolsa e ferramenta presas; previews em `referencias-v2/final4/`; hash em `origem.json` atualizado. Cabelo mantido como estava (usuário cancelou o ajuste).

- Atualização Zé v2 (2026-10-30): cabelo refeito para envolver a cabeça (topo, nuca e laterais até a orelha, franja curta, orelha visível); previews em `referencias-v2/final6/`; sha256 `734397733e8d4f9977fc4373c4a9682888e0eb96a21bceeecda5b03b73f05f27` em `origem.json`. Nota: no perfil o cabelo desce até a altura do queixo atrás da orelha (estilo chanel); encurtar só se o usuário pedir.

### [B37] `easing` do `camera.json` é ignorado pela câmera
- Sintoma: `videos/07-panela-de-pressao/camera.json` traz `"easing":"sine.inOut"` em todos os keyframes, mas `calcularCamera` (`modelo-video/montagem-cena.template.js`) usa sempre smoothstep (`u*u*(3-2*u)`) no push e no blend de 0,45 s. Nenhum `.js` lê `easing`; `test_takes.py` só confere a string.
- Correção: ler `easing` do keyframe (no mínimo `sine.inOut`, `power2.out`, `linear`) ou remover o campo do schema; teste que muda o easing e vê a posição mudar. Dono: ANIMADOR. Vídeo 07 não é mexido. Status: aberto (2026-10-30).

### [B38] Palavra-chave amarela da legenda nunca é marcada
- Sintoma: `montar_index.py:23` só aplica `.chave` se `w.get('destaque')`, mas nada preenche `destaque` em `tempos.json` (`alinhar.py` não marca). No 07 há 0 usos de `chave` e `index.html:7` ainda define `.chave{color:#fff}`. A base casa `B0G4yyXqXTs` pinta de amarelo a palavra-termo de cada ciclo.
- Correção: derivar `destaque` dos nomes de peça da partitura (`ze`/`overlay`) ou de uma lista no `roteiro`; teste com 1 nome. Template `modelo-video/index.modelo.html` já traz `.chave{color:var(--cor-destaque)}`. Dono: ACABAMENTO. Vídeo 07 não é mexido. Status: aberto (2026-10-30).

### [B39] `destacarPeca`: contorno amarelo fino demais comparado com a base da casa
- Sintoma: render de teste (`conferencias/visual-destaque/t0.6.png`, caixa 4,2×0,25×4,2 vista a ~45°): o contorno é um fio de ≈1–2 px; na base `B0G4yyXqXTs` (`quadros/chave/t_74.0.png`) o anel da viga tem ≈20 px de espessura, legível no celular. No pico do pulso (t=0,6) ainda parece linha; em t=0,35 quase some.
- Correção: espessura da casca proporcional à peça (≥ 2–3% da maior dimensão) ou emissivo cheio da peça; teste que mede pixels amarelos num quadro. Dono: ANIMADOR. Status: aberto (2026-10-30).

### [B40] `rotuloEmPerspectiva`: texto cortado pela metade
- Sintoma: `conferencias/visual-destaque/t0.35.png` mostra "VIGA DE AMA" e o resto some numa linha horizontal reta; `t0.6.png` igual. Causa provável: canvas da textura menor que o texto (`bold 120px`) ou plano parcialmente dentro da peça (offset menor que a espessura).
- Correção: medir o texto (`measureText`) e dimensionar canvas e plano; offset acima da face; teste que renderiza e confere a largura do texto visível. Dono: ANIMADOR. Status: aberto (2026-10-30).

- Status B39/B40 (2026-10-30): corrigidos pelo ANIMADOR (R4). Maestro abriu `conferencias/visual-destaque/r4-t0.35.png` (contorno em rampa, tom ainda translúcido) e `r4-t0.6.png` (pico: faixa amarela espessa em volta da viga, "VIGA DE AMARRAÇÃO" inteiro). Observação: o rótulo sai maior que a peça de teste (passa da borda da viga); na base da casa ele é menor e fica dentro da peça. Ajustar a escala ao tamanho da peça no 1º vídeo real. 43 testes OK.

- Status final B39/B40 (2026-10-30): rótulo agora dentro da face da peça (`conferencias/visual-destaque/r4-final-t0.6.png` aberto pelo Maestro: texto inteiro, faixa amarela 4%); a observação de escala acima fica resolvida. 43 testes OK.

### [B42] `alinhar.py` erra frases em voz emendada
- Sintoma: após emendar as frases 1, 6 e 8 do vídeo 08, a frase 8 saiu com 4,7 s em vez de 9,2 s.
- Causa: alinhamento por pausas redistribui o texto entre trechos.
- Evitar: em emenda, deslocar os tempos antigos e medir só os trechos novos. Palavras seguem estimadas. Status: aberto (2026-10-30).

### [B43] Mapa de palavras pode ser tomado como exato
- Sintoma: parecer P1 citou "ElevenLabs/whisper" para tempos estimados por pausas.
- Evitar: ler `metodo` em `tempos.json`; prova só vale com quadro aberto. Status: aberto (2026-10-30).

### [B44] Vídeo 08 reprovado pelo usuário: longe da base casa e Zé estranho
- Sintoma: usuário sobre `preview-r3`: "literalmente tudo errado", base ignorada, boneco "nada ver" com o pedido e com a receita.
- Causa (Maestro): QC por lista de defeitos, sem `lado_a_lado.py` contra a base antes do P3. Fim de tarde (recomendação do Maestro) deixou tudo marrom e sem saturação. Muitas locações e cortes em vez de um modelo com câmera contínua. Zé parado em planos vazios.
- Evitar: comparar lado a lado com a base já no P2 e em cada preview. Status: aberto (2026-10-30).

### [B45] Vídeo 08: câmera só cortes estáticos, laje flutuante, destaque em casca
- Sintoma: usuário: "plataforma flutuante no meio do nada", takes travados, câmera sem interação, Zé com pouco a fazer. `camera.json` tinha 26 keyframes todos `corte:true`, posição fixa; `destacarPeca` pintava casca em volta da peça.
- Causa: `montagem-cena.js` usava só o último keyframe sem interpolar; deck da contra-lança (`grua-torre.js`) sem suportes, parecia solto; destaque por casca não lê como "esta peça".
- Corrigido (2026-10-30): câmera com órbita/push/blend por keyframe (8 cortes, 24 keyframes); 3 apoios sob o deck; destaque acende a própria peça. Aberto: Zé com poucas ações, nomes TRAVA/PINO/BASE sem brilho visível no quadro. Status: parcial.

### [B46] Roteiro do vídeo 08 aprovado com contradição e ordem técnica errada
- Sintoma: fala dizia "nenhum guindaste da rua alcança" e depois "um guindaste móvel levanta o braço"; braço e pesos saíam antes de a grua encolher; "Coloque a grua" num vídeo de desmontar; termos variando (mastro/torre, seção/parte, guindaste/grua).
- Causa: portão do roteiro sem conferir a sequência em fonte; pesquisa.md já listava "confirmar a ordem" como pendente e o P0 avançou.
- Evitar: ordem técnica confirmada em fonte antes do esqueleto; teste do leigo no roteiro. Status: corrigido no roteiro v3 (2026-10-30).

### [B47] Rótulo 3D nas peças sai bugado
- Sintoma: usuário sobre "PESOS DE TRÁS": palavras em cima dos objetos bugadas; placa escura tampa a peça.
- Correção: nome vira pílula presa à peça (decisão do usuário). Dono: IMPLEMENTADOR-SONNET. Status: aberto (2026-10-30).

### [B48] `camera.json` do vídeo 08 reprova no test_takes
- Sintoma: 11 saltos de FOV sem corte e "segunda fonte (órbita)"; a cena usa câmera própria em vez de `calcularCamera`.
- Correção: câmera do template, sem `orbita`. Dono: IMPLEMENTADOR-SONNET. Status: aberto (2026-10-30).

- Nota B42/B43 (2026-10-30): `npx hyperframes transcribe voz/voz.wav --language pt --no-runtime-install` usa o Parakeet local e dá tempo real por palavra (vídeo 08: 335 de 335 palavras). Usar no lugar da estimativa por pausas de `alinhar.py`.

- Status B47/B48 (2026-10-30): pílulas presas por `acabamento08Projetar` e câmera do template no vídeo 08; `test_takes` passa e Maestro viu `preview-v3-c1.mp4` a 1 q/s. Corrigidos.

- Status B44/B45/B46 (2026-10-30): vídeo 08 refeito e entregue, com Maestro assistindo a 1 q/s a cada rodada. Corrigidos.

### [B49] Vídeo 08: Zé na frente do que devia ser explicado
- Sintoma: usuário: foco demais no personagem; a grua, o pino e o guindaste ficam atrás do Zé. Na `partitura.json`, 13 de 13 takes têm ação do Zé; nas folhas finais ele aparece em ~90% dos quadros (contagem a olho).
- Causa: receita exigia mínimo ("≥ 5 momentos") e coluna Zé obrigatória, sem dizer quem protagoniza cada take; takes longos prendiam Zé e câmera juntos. Regra de "tela da peça" já existia desde o vídeo 07, sem decisão registrada por take.
- Correção: receita v3.0, ficha de direção, campos `heroi`/`ze_tam`/`motivo_ze`/`tipo_camera`, `test_takes.py`, animatic no P2. Status: corrigido na pipeline (2026-10-30); o vídeo 08 não foi refeito.

### [B50] Vídeo 09: câmera pouco dinâmica e fora da peça falada
- Sintoma: usuário no r1: "câmera pouco dinâmica"; take da torneira não se entende; câmera não mostrava a peça falada.
- Causa: `videos/09-como-funciona-liquidificador/camera.json` com pushes de 3–12% (a casa `B0G4yyXqXTs` usa 15–45%), elevação de 6–9° em ~30 de 36 keyframes (receita pede 30–40°), FOV 40 fixo, alvo genérico `copoCil` em vários takes. A receita pedia 5–10% de aproximação; o plano visual trazia câmera vaga e o ANIMADOR inventou ângulo e amplitude. Nenhum teste conferia elevação.
- Correção: receita v3.1 (§2: amplitudes da casa, câmera vai até a peça falada, campo `leitura`, câmera decidida pelo Maestro); `test_takes.py` confere elevação. Status: corrigido na pipeline (2026-10-31); o vídeo 09 não foi refeito.

## B51 — Camera direction fields were lost in the score
Status: fixed in the current workflow. Preserve intent, angle, amplitude and subject IDs from takes.json. Compare real camera samples against the approved visual plan.

## B52 — A render existed without a matching approved state
Status: guarded for new schema 2 projects. Persist the actual P3 evidence and final user approval. An input change invalidates the previous approval. Export through render_final.py.

### [B53] Caminho da transcrição difere do exemplo do workflow
- Sintoma: o comando de importação falha procurando transcript.json na raiz do vídeo.
- Causa: HyperFrames 0.8.191 gravou voz/transcript.json ao transcrever voz/voz.wav.
- Contorno: passar videos/<video>/voz/transcript.json ao importador. Status: contornado (2026-11-03).

### [B54] Manifesto do kit 10 listava referências v2 ausentes
- Sintoma: a conferência SHA-256 encontrou entradas sem arquivo correspondente em referencias-v2 e referencias-moves/v2.
- Correção: conferir todos os hashes presentes e atualizar somente o manifesto; nenhuma referência foi removida nesta revisão. Status: corrigido (2026-11-03).

### [B55] Render aumentou cerca de 3 LU ao expandir a mixagem mono para estéreo
- Sintoma: mix mono media -14,3 LUFS e prévia HyperFrames 0.8.191 em estéreo media -11,4 LUFS.
- Contorno: preparar estéreo com ganho de 0,70710678 por canal antes de renderizar e medir o AAC. R4 conferido em -14,40 LUFS e -4,10 dBTP. Status: contornado (2026-11-03).

### [B56] `conferir.py` grava a conferência na pasta atual, não na do vídeo
- Sintoma: rodado da raiz, criou `conferencia-animatic-p2-r4-sfx/` na raiz do workspace.
- Contorno: pasta movida para `videos/12-vidro-box/qc/`. Rodar com `--saida` dentro do vídeo. Status: aberto (2026-11-03).

### [B57] Import direto de `biblioteca/` em modelo do vídeo quebra o `hyperframes check`
- Sintoma: vídeo 13, `modelos/cenario/obra.js` importava `../../../../biblioteca/...`; o servidor do HyperFrames só serve a pasta do vídeo, então o check deu 6 erros de runtime (404) e o render falharia.
- Correção: itens adicionados ao `biblioteca.lock.json` (cenarios/cobertura-obra, objetos/grua-torre, objetos/macaco-hidraulico), copiados para `kit/`, `kit.manifest.json` regerado e imports trocados para `../../kit/...`. Regra: modelos do vídeo importam só de `kit/`. Status: corrigido (2026-11-04).

### [B58] Render HyperFrames do vídeo 13 saiu com ~1,6 s de canvas 3D vazio
- Sintoma: `render/preview-r3.mp4` mostra só céu e overlays entre ~123,0 e 124,6 s (take 17). O r2, com a mesma cena, não tem o vazio. Só `overlays.js` mudou entre os dois: falha intermitente do canvas WebGL no render.
- Detecção: o Maestro viu o vazio a 1 q/s. Checagem automática por variância baixa de quadro achou o trecho. Correção: re-render e conferir cada render com detector de quadro vazio antes de entregar. Status: aberto (2026-11-04).

### [B59] `matCorte` do vídeo 13 dividia um só plano de corte entre todas as mecânicas
- Sintoma: o pilar aparecia fechado (aço escondido) e outros cortes seguiam o plano errado. A chave do cache usava `plano.uuid`, mas `THREE.Plane` não tem `uuid`, então todas viravam `undefined`.
- Correção: `videos/13-piscina-no-topo/modelos/mecanicas/base.js` usa um id por plano (WeakMap). Regra: não usar `uuid` de objetos que não são `Object3D`/`Material`. Status: corrigido (2026-11-04).

### [B60] Transcrição Parakeet do vídeo 14 divergiu do roteiro em 10 pontos
- Sintoma: `importar_transcricao.py` recusou `voz/transcript.json` (297 vs 297 palavras, mas tokens diferentes): "Flórida há" virou fló/e/da; "caixa-preta" virou duas palavras; números saíram em dígitos (30, 6, 3.400, 1.000); "avião fez" virou "avi".
- Contorno: `voz/transcript-corrigido.json` (original mantido). Tempos reais preservados; fusões de tokens usam o início do primeiro e o fim do último. Divisões (Flórida/há, avião/fez, três/mil/e/quatrocentas) são proporcionais ao tamanho da palavra dentro do intervalo real, não escutadas. Erro máximo ~0,3 s. Status: contornado, a conferir por escuta (2026-11-05).
- Também: dividir `roteiro.txt` em uma frase por linha muda o hash e derruba o estado do pipeline; refazer os avanços depois. Voz original por parágrafo em `voz/roteiro-paragrafos.txt` e `voz/tempos-v1-paragrafos.json`.

### [B61] Zé flutuava e deslizava ao andar (M09) e em cenas com `raiz.position` à mão
- Sintoma: M09 dava passos minúsculos, pé de apoio patinava (~3× a velocidade da raiz), pés fora do chão (~0,05) e terminava no meio do passo. Causas: comprimento de perna errado (`joelho.length()+.6`), escala da raiz ignorada, sem ancoragem, sola inclinada com a perna. M13 levantava a raiz (`+= .04*b`).
- Correção (2026-11-06): `M09_caminhadaCurta` reescrito com passos plantados (pé de apoio fixo no mundo, IK de dois ossos, sola plana, escala da raiz, nº de passos por distância, começa e termina com pés juntos). M13 balança com joelhos + `ancorar`. Teste: `python ferramentas/test_locomocao.py` (altura da sola, patinação, fim em repouso).
- Pendente: cenas entregues com deslize à mão (vídeo 13 `montagem-cena.js` recua/trav/passo; vídeo 12 `:178-185`) só mudam com aprovação do usuário. Status: corrigido na biblioteca; cenas antigas abertas.
