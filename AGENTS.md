# Workspace HyperFrames — instruções para agentes

Objetivo: produzir conteúdo para YouTube, TikTok e Instagram (explicativos, Reels, Shorts) do projeto com HyperFrames (HTML + GSAP renderizados em vídeo), Three.js low poly e ffmpeg.
Todo texto — mensagens ao usuário, arquivos, skills, regras, receitas e notas da equipe — é em português. Só os identificadores de código seguem o que já existe.

## Onde ficam as regras (uma fonte para cada; não copie aqui)
- Etapas e portões de produção: `WORKFLOW_MESTRE.md`. Referência de câmera: `refs/CAMERA.md`.
- **Pré-voo editorial.** Antes de redigir, revisar ou conferir esqueleto, roteiro, plano visual, animação ou corte, abra `receitas/receita-unificada.md` e leia as seções aplicáveis. Em roteiros, aplique o §1 e confira, em cada ciclo, o limite visível, a solução, o resultado observável e o nome técnico depois da demonstração. Confira que o resultado leva ao próximo limite antes de pedir aprovação. Considere o Retrocesso Causal (§1.1) no esqueleto. Se for escolhido, leve o retorno aprovado e seu propósito até o plano visual e aplique os §§4 e 8 na produção e na revisão.
- Ordem e comandos do pipeline: skill `pipeline-video` (`.claude/skills/pipeline-video/SKILL.md` para o Claude, `.agents/skills/pipeline-video/SKILL.md` para o Codex e outros agentes; os dois arquivos são idênticos e `ferramentas/test_docs.py` confere).
- Seu próprio papel: `equipe/<papel>.md`.
- Estado vivo: `equipe/painel.md` e `python ferramentas/pipeline.py status`. Decisões permanentes: `receitas/decisoes.md`. Bugs: `BUGS.md` (leia antes de qualquer tarefa; acrescente uma entrada, nunca apague, só mude o status).
- Kit de efeitos: `biblioteca/efeitos/EFEITOS.md`. Catálogo: `CATALOGO.md` e `ATIVOS.md`.

## Equipe
Os papéis são fixos; o modelo por trás de cada papel é escolha do usuário (padrão: Claude Opus como Maestro e Claude Sonnet nos demais). Todo modelo segue as mesmas regras e arquivos.
- Maestro: o líder. Planeja, decide a qualidade, aprova e é o único agente que fala com o usuário.
- MODELADOR-3D, ANIMADOR, ACABAMENTO, REVISOR-CODIGO: implementam, cada um dentro dos arquivos do seu papel.
- DIRETOR-VISUAL: revisão visual somente leitura.
- Um subagente herda a tarefa, os arquivos editáveis e os limites de quem o chamou.

## Método de trabalho (qualquer agente)
- Leia as fontes: `equipe/<papel>.md`, `equipe/painel.md`, `receitas/receita-unificada.md`.
- Estado do vídeo: `python ferramentas/pipeline.py status`, depois `videos/<NN>/estado.json`, `direcao.md`, `takes.json`, `partitura.json`, `registro.md` e `tarefas/`.
- Relate os resultados na sua própria sessão (resumo, caminhos, números medidos).
- Como Maestro, mantenha `equipe/painel.md` e `videos/<NN>/registro.md` em dia.

## Regras duras
- Reuse primeiro: leia `ATIVOS.md`, `CATALOGO.md` e `biblioteca/` antes de criar um ativo, script ou modelo.
- Um agente edita um arquivo por vez; o dono é quem tem a ordem de serviço ativa em `videos/<NN>/tarefas/`. Trabalhe no seu próprio branch git; sem pastas `backup-*` (o git guarda as versões).
- Nunca apague, mova, renomeie nem sobrescreva arquivos existentes do usuário sem a aprovação dele (via Maestro). Escreva a saída nova em pastas novas.
- Nunca interrompa processos em andamento (prévias, http.server, extração de quadros).
- Sem APIs pagas. Só assinaturas autenticadas. ElevenLabs e Google Flow só com aprovação explícita.
- Honestidade visual: nunca descreva imagem ou vídeo que não foi aberto de fato. Informe os caminhos inspecionados ou a limitação exata.
- Arquivos de texto em UTF-8 (B31).

## Autonomia
Permitido sem perguntar: ler qualquer coisa; criar arquivos e pastas novos neste workspace; rodar testes; prévias e renders em baixa resolução; ffmpeg em cópias; atualizar notas.
Pergunte antes ao usuário (via Maestro): publicar ou enviar; apagar, mover ou sobrescrever arquivos existentes; mudanças estruturais em projeto existente; instalar dependências; qualquer coisa com custo. O render final exige aprovação explícita do usuário para o corte P3 revisado.

## Convenções
- Cada vídeo: `videos/<NN>-<slug>/`, criado por `ferramentas/novo_video.py` (com `AGENTS.md`, `roteiro.txt`, `partitura.json`, `registro.md` e `tarefas/` próprios). Nada de um vídeo entra na pasta de outro.
- Biblioteca universal `biblioteca/`: um item por pasta (`personagens/`, `objetos/`, `cenarios/<slug>/`) com arquivo principal, previews e `origem.json`; nomes em minúsculas com hífen, sem acento; registre itens novos em `CATALOGO.md`. Personagem do projeto: Zé (`ze`; vídeos novos importam `ze-padrao.js`). Não use "Kiko" em arquivos novos.
- A direção (presença do Zé, ritmo, cortes, efeitos) é decidida por vídeo em `direcao.md`; números de referência são pontos de partida, nunca metas.
- Use as skills do HyperFrames para as regras de composição; `hyperframes check` sem erros é requisito, nunca aprovação.
- Cores: só os tokens `--cor-*` com significado em textos e ícones; teal e laranja do tema só para a marca.
