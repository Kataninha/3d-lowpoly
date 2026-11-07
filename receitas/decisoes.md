# Decisões permanentes (uma linha cada; regras de produção ficam em `receita-unificada.md`)

Formato: data | decisão | quem decidiu.

## Infra e regras gerais
- 2026-10-27 | Workspace oficial = `teste_hyperframes`. Sem APIs pagas: só assinaturas autenticadas (Claude, ChatGPT/Codex, Google/Gemini). ElevenLabs e Google Flow só com aprovação | usuário
- 2026-10-27 | Aprovação do usuário só para publicar, mudança estrutural, apagar/sobrescrever, instalar, custo. O resto é automático | usuário
- 2026-10-27 | Processos em andamento do usuário (`http.server` de `modelo_lowpoly`, extração de quadros) não se tocam | Maestro
- 2026-10-28 | Canal: Mundo100Manual. Personagem: Zé (`ze`); "Kiko" não entra em arquivo novo | usuário
- 2026-10-28 | `BUGS.md` é a memória de bugs: ler antes, registrar ao achar, nunca apagar entrada | usuário
- 2026-10-28 | Estrutura: `biblioteca/` universal (1 pasta por item) + `modelo-video/` + `ferramentas/` + `videos/<NN>-<slug>/`. Promover à biblioteca no 2º uso | usuário
- 2026-10-28 | Textos e ícones só em cores padrão com significado; teal/laranja do tema só na marca | usuário
- 2026-10-28 | Insumos do usuário pedidos junto com o roteiro (`insumos.json`); o pipeline pausa só na etapa que precisa | usuário

## Equipe e agentes
- 2026-11-01 | Papéis fixos, modelo livre: qualquer LLM (Claude, Codex, Gemini) pode assumir um papel e segue os mesmos arquivos; padrão Claude Opus no Maestro e Claude Sonnet no resto; quem fala com o usuário é o Maestro. Substitui "equipe só Claude" e as decisões antigas sobre Codex/Gemini | usuário
- 2026-10-29 | Tarefa curta por terminal (≤ 60–90 min), contexto limpo (`/clear`) antes de cada tarefa nova; tarefa longa piora qualquer modelo | usuário
- 2026-10-30 | O Maestro é o líder e decide o grau de qualidade; só pergunta o que é do usuário (apagar, publicar, custo) | usuário
- 2026-10-30 | Equipe v2 de especialistas (MODELADOR-3D, ANIMADOR, ACABAMENTO, REVISOR-CODIGO, DIRETOR-VISUAL) com ordens de serviço em arquivo, modelo do workspace VIDEO | usuário

## Produção
- 2026-10-29 | Sem trilha sonora (só voz + SFX) | usuário
- 2026-10-29 | Previews a 10 fps; render final a 30 fps | usuário
- 2026-10-29 | Sem contorno preto nos objetos 3D | usuário
- 2026-10-29 | Zé só nos momentos dele, nunca estátua, sem deslizar; tela da peça é só da peça | usuário
- 2026-10-29 | Meta de ritmo não é número fixo; câmera natural vale mais que % parado | usuário
- 2026-10-30 | Vídeos existentes (02, 07…) não são mexidos; as melhorias valem para os próximos | usuário
- 2026-10-30 | Limpeza aprovada: pastas de teste, rodadas do 07, ajudantes; `git init` no workspace | usuário
- 2026-10-30 | Antes de QUALQUER tarefa nova para um agente, o Maestro dá `/clear` e confere; só correções da mesma tarefa dispensam | usuário
- 2026-10-30 | Cenário bem detalhado é prioridade (detalhes chamam atenção); Maestro pode pesquisar referências na web (Pinterest etc.) e dados técnicos do roteiro, registrando em pesquisa.md | usuário
- 2026-10-30 | Nomes difíceis viram palavras simples; o termo técnico entra só depois de "Essa é a …" (ex.: "Essa é a grua… esse é o macaco") | usuário
- 2026-10-30 | Zé v3: corpo e rosto da imagem `biblioteca/personagens/ze/referencias-v3/referencia-usuario.png`, com a roupa do Zé; substitui o visual v2 nos vídeos novos | usuário
- 2026-10-30 | Direção sem mínimo ou máximo fixo: os números de referência são ponto de partida e o Maestro decide por vídeo na ficha de direção, aprovada com o plano visual; identidade do canal e requisitos técnicos não mudam (receita v3.0) | usuário
- 2026-10-30 | Zé é o "você" nos momentos fortes; substitui "≥ 5 momentos" e a coluna Zé obrigatória | usuário
- 2026-10-30 | Nome da peça: texto amarelo sobre a peça (overlay 2D) com a peça piscando; pílula só explica. Substitui a decisão de pílula no nome | usuário
- 2026-10-30 | Nunca usar `[whispers]` nos roteiros | usuário
- 2026-10-31 | Vídeo 09: IMPLEMENTADOR-SONNET faz todos os papéis de implementação; revisão (DIRETOR-VISUAL) por terminal Gemini, só leitura; Maestro continua assistindo o preview a 1 q/s | usuário
- 2026-10-30 | Mão do Zé ao pegar objetos: só a luva do Zé v3, sem modelar dedos | usuário
- 2026-10-31 | Pulso amarelo (destacarPeca) na própria peça quando ela aparece ou é nomeada; câmera com aproximação rápida antes do nome, conforme receita §2 | usuário
- 2026-10-31 | Pulso amarelo na peça é automático na pipeline: campo `destaque` do take (ou `termos` + `alvo`), aplicado por `criarMontagem`; nunca à mão por vídeo | usuário
- 2026-10-31 | Câmera decidida pelo Maestro take a take (quem tem o contexto e a receita); o ANIMADOR transcreve | usuário
- 2026-10-31 | Sem perfis fixos de câmera por tema: o Maestro escolhe o melhor para o tema sem fugir da base da receita | usuário
- 2026-10-31 | Coluna "Câmera" do plano visual concreta (ângulo, plano, movimento, amplitude, alvo), aprovada junto com o plano; sem portão novo | usuário
- 2026-10-31 | Regras de câmera v3.1 valem do vídeo 10 em diante; o 09 fica como está | usuário

- 2026-11-02 | O guia `refs/CAMERA.md` orienta a câmera por intenção. Aprovação explícita do corte P3 antecede render final. Zé v3, legenda curta e voz mais SFX seguem como identidade.
- 2026-11-02 | Limpeza autorizada dos projetos 02, 07, 08 e 09, incluindo MP4 finais. Biblioteca de assets preservada.
- 2026-11-03 | Zé v3 usa cabelo curto rente à cabeça, sem topete, como padrão permanente. | usuário
- 2026-11-03 | Retrocesso Causal entra como recurso opcional quando a volta a um estado anterior ajuda a explicar a consequência. Receita v4.1, §§1.1, 4 e 8. | usuário
- 04/11/2026 (v13 piscina-no-topo): cenario = cobertura-obra reusado + sala do Ze nova embaixo em corte 3D; fundo muda por bloco.
- 04/11/2026 (v13): toda peca monta por unidades, nunca surge pronta (pedido do usuario).
- 04/11/2026 (v13): raio-X do predio e protagonista visual (abertura, aco, parede, final).
- 04/11/2026 (v13): predio moderno de luxo, fachada de vidro, painel smart de carga.
- 04/11/2026 (v13): duracao 138 s aceita por motivo: voz do usuario aprovada em 1,10x; placar item 11 nao penaliza a duracao em si.
- 04/11/2026: abertura (0-10 s) precisa de gag com payoff, camera perto do Ze, movimento desde o quadro 0 e som forte no gatilho; conferir contato do Ze com moveis antes do P3 (P4 do video 13 reprovado por Ze dentro do sofa e comeco sem graca).
- 04/11/2026: revisar a abertura (0-12 s) a 4 q/s e de perto antes do P3; objeto novo tem visibilidade escrita em todos os takes; troca de pose vale para todos os takes que usam a antiga (video 13).
- 05/11/2026 (v14): abertura recria a queda real em 3D (mesmo enquadramento, explosão no chão, legenda "simulação"); sem imagem real no render. Números técnicos citam FAA/EUROCAE, não NTSB.
- 05/11/2026 (v14): câmera do P2 é autoral (reuso das câmeras provadas por mecânica em modelos/plano.js, gerada por modelos/gerar_camera.py), não planCandidates; blocos ficam a 1000 u um do outro na mesma cena.
- 05/11/2026 (v14): Zé de campo usa boné azul-marinho facetado (nunca cúpula redonda, parece capacete); uniformes sem luva laranja; abertura só céu nublado, sem chuva caindo; jato e cenários de todos os blocos carregam detalhe (cenarios.js).
- 06/11/2026: Zé v4 (`ze-v4.js`) copia corpo e rosto das fotos do usuário; camisa AZUL e jeans são o padrão novo; outras roupas só por pedido (`criarZe({camisa, calca})`). v3 congelada; vídeos 10–14 seguem na v3.
- 06/11/2026: profundidade da explicação vale mais que duração; leigo deve entender sem refazer. Receita v4.2 §1.2 (4 respostas por solução, âncora em todo número, sem salto de causa, pré-requisito primeiro, pente de lacunas antes do roteiro). Placar item 2 mais rígido. | usuário
- 06/11/2026: fluxo. Esqueleto, roteiro e plano visual aprovados em um pacote só; voz só com roteiro travado; checklist de prova (início, meio, fim, legibilidade, oclusão, 1 q/s) antes de qualquer prévia chegar ao usuário; após 3 rodadas de P2 sem OK, parar e pedir decisão de direção; P4 só avança com `publicacao.md` e `retrospectiva.md` (trava em `pipeline.py`). | usuário
- 06/11/2026: locomoção do Zé. Andar = só M09 (passos plantados, sola no chão, pé de apoio parado); mudar de lugar sem pernas é proibido (troque fora de quadro). `ferramentas/test_locomocao.py` precisa passar após mexer em moves.js. Ver B61.

- 2026-11-06: `biblioteca/personagens/estilos-cabeca/` (10 estilos de cabelo e cabeça) fica só para NPCs/figurantes. O usuário não aprovou nenhum como protagonista.

- 2026-11-06: PERSONAGEM PRINCIPAL = `criarPersonagem('principal')` em `biblioteca/personagens/estilos-cabeca/estilos.js` (black rente + topete reto na horizontal, na frente). Os outros 10 estilos seguem só para NPCs. Zé v4 original preservado.

- 2026-11-06: catálogo de expressões ampliado para 31 (11 originais preservadas + 20 novas) no v4; ver CATALOGO.md.
- 06/11/2026: §1.2 (profundidade) não autoriza roteiro longo; explicação leiga é curta, uma ideia por frase, estrutura dos roteiros 12/13 (usuário, vídeo 17).
- 06/11/2026: receita v4.3 retira pente de lacunas e explicação longa da v4.2. Roteiro = estilo causa e efeito: causa e efeito, curto, uma ideia por frase, sem `lacunas.md`. | usuário

- 2026-11-06: Zé PADRÃO = `ze-padrao.js` (estilo `principal` sobre o corpo v4). Vídeos novos usam ele; vídeos existentes ficam nas versões antigas.
- 06/11/2026: receita v4.4. Modelo de roteirista do usuário entra no §1.2: demonstrar em vez de informar, sem falha inventada para drama, pergunta-ponte por bloco no esqueleto, pacote A–E (narração, blocos, animação por frase, pergunta-ponte, verificação científica em `pesquisa.md`). Tamanho segue curto. | usuário
