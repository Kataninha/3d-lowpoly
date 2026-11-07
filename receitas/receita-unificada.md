# Receita editorial Mundo100Manual — v4.4

**Versão 4.4 — 06/11/2026.** Acrescenta ao §1.2 o modelo de roteirista do usuário (demonstrar em vez de informar, sem drama inventado, pergunta-ponte por bloco e verificação científica). **Versão 4.3.** Mantém a v4.1 e fixa o roteiro no estilo causa e efeito (§1.2): causa e efeito, curto, uma ideia por frase. A v4.2 (pente de lacunas, explicação longa) foi retirada. A v4.1 incorporou o Retrocesso Causal. Fluxo e portões no mestre. Câmera no estudo atual de Motor, Ponte e Futebol em [refs/CAMERA.md](../refs/CAMERA.md).

Decisões permanentes (uma linha cada): `receitas/decisoes.md`. Placar e retro por vídeo: `receitas/evolucao.md`. Bugs: `BUGS.md` (ler antes de qualquer tarefa).

**Princípio:** o Maestro (Claude) é o produtor e decide o grau de qualidade. **O que explica é o protagonista; cada vídeo decide como contar.** O usuário aprova só três portões antes da produção (esqueleto, roteiro, plano visual com a ficha de direção, §0), solta a voz e aprova o corte P3 antes do render final. Perguntas ao usuário: publicar, apagar/mover, custo, instalar.

**Identidade do canal (nunca muda):** 3D low poly de brinquedo, 9:16, cores vivas; causa e efeito (falha visível, solução, demonstração, nome); a imagem mostra o que a fala explica; mundo coerente que evolui; legenda curta, cores com significado, nome visto e ouvido; abertura forte; final com o resultado e pedido de comentário; nível igual ou acima das bases.

**Requisitos fixos (técnicos e de qualidade):** formato, LUFS e pico (§5), legibilidade e margens, escala coerente, nada atravessando nem flutuando, corte 3D real, determinismo, prova em quadro real.

**Pontos de partida (decididos por vídeo, nunca meta):** nº de ciclos, duração, palavras/min, tamanho de take, cortes, % parado, SFX/min, momentos do Zé e formato do final. Esses números orientam testes e decisões por vídeo. Sair da base exige motivo escrito na ficha de direção.

**Referência visual:** [refs/CAMERA.md](../refs/CAMERA.md). Escolha a gramática por ação e pelo que precisa ser entendido.

**Trava contra dispersão:** a ficha fecha antes da voz; depois dela, ideia nova só entra se resolver falha real de entendimento ou qualidade (o resto vai para a retro); um experimento por vídeo; cada take responde "o que o espectador aprende ou sente aqui?"; no P3 e no P4 o Maestro compara o vídeo com a ficha.

---

## 0. Portões do usuário (antes da voz)
1. **Perguntas** (feitas com a skill `mattpocock-skills:grilling`, uma por vez, recomendação marcada; só o que pesquisa e código não resolvem; portões sim/não seguem com AskUserQuestion; quantas forem necessárias; cenário e roteiro em detalhe, abaixo): tom, duração, nº de ciclos, mito, piada, final/estilo do Zé e **cenário** (ambiente: cozinha, oficina, estúdio…; paleta e iluminação; cenário novo ou de `biblioteca/cenarios/`; fundo fixo ou muda por bloco; onde o Zé fica em cena).
**Pesquisa liberada (autorização permanente do usuário, 30/10/2026):** antes de perguntar, o Maestro pode buscar na internet referências de cenário (fotos no Pinterest e outros sites, só para consulta; nada é copiado para o vídeo) e informações técnicas para melhorar o roteiro. Cada pergunta traz o que foi achado (link/descrição) e a recomendação. Registrar fontes em `videos/<NN>/pesquisa.md`. Sem custo, sem login pago.

**Cenário (o que mais chama atenção; detalhe mínimo conta).** Perguntar, nesta ordem, só o que não estiver resolvido:
1. Ambiente e época/estilo (cozinha de casa simples, oficina, laboratório…); classe social/idade do lugar (nova, gasta, bagunçada).
2. Paleta, iluminação (janela, luz de teto, hora do dia) e clima (limpo, vivido, sujo).
3. Objetos de fundo que contam história (calendário, ímã na geladeira, panos, panelas, ferramentas, plantas, relógio) e o que NÃO pode aparecer.
4. Superfícies e texturas low poly (azulejo, madeira, bancada, rejunte, desgaste) e escala/proporção em relação ao Zé.
5. Pontos de interesse por bloco: onde a câmera pode ir sem mostrar vazio; zonas livres onde o Zé fica sem tampar a peça.
6. Easter eggs / detalhes repetíveis que premiam quem reassiste.
7. Reuso de `biblioteca/cenarios/` ou cenário novo (novo vira item da biblioteca com `origem.json`).
Perguntas de roteiro: ângulo, público, nível técnico, quais mitos, o que a pessoa já sabe, exemplo do dia a dia, o que o vídeo NÃO deve explicar. Perguntas de Zé: em quais momentos ele é necessário, emoção nesses momentos e onde fica sem tampar a peça. Quando o tema pedir: figurantes, clima e mudanças do mundo.

2. **Esqueleto** (`esqueleto.md`, com a ordem técnica confirmada em fonte listada em `pesquisa.md` antes de escrever): abertura, uma linha por ciclo (falha → solução → demonstração → nome; cada falha nasce do efeito da anterior), mito, piada, final, **cenário detalhado (ambiente, paleta/luz, objetos de fundo, texturas, zonas livres do Zé, easter eggs, mudanças por bloco)**, objetos necessários. Aprovar → `esqueleto_aprovado`.
3. **Roteiro** (§1). Aprovar → `roteiro_aprovado`.
4. **Plano visual** (`plano-visual.md`, tabela aprovada gravada no arquivo e mostrada no chat): `Tempo | Fala | Protagonista | Câmera | Zé e motivo | Peça/efeito | SFX | Texto/ícone`. Vem junto de um resumo curto da **ficha de direção** (`direcao.md`): base e por quê, quem protagoniza, quando e por que o Zé aparece, figurantes, ritmo, câmera e cortes, o que muda no mundo e no clima, figurino, final, experimento e o que das bases não serve aqui. Aprovar → `plano_aprovado` (o pipeline recusa ficha com "a decidir").
Depois da prévia P3, peça autorização explícita para render final. O plano aprovado vira a `partitura.json` (P1); mudar ação visível depois exige nova aprovação. Tempos são estimados pelo roteiro e reajustados com `tempos.json` depois da voz.

---

## 1. Roteiro (função fixa, palavras livres)

**Abertura (0–5 s).** Comece a fala antes de 1 s, direto numa situação concreta em segunda pessoa, de preferência com **"Se você…"**. Até 5 s, mostre a falha, o perigo ou a surpresa. Zé vive o problema quando ajuda o espectador a se reconhecer. Mostre a consequência primeiro quando ela suscitar uma pergunta sobre a causa. Pule cumprimentos e guarde o termo técnico para depois da demonstração. O título faz uma pergunta ou contraria o senso comum.

**Ciclo.** O tema determina quantos ciclos são necessários. Em cada um:
1. Mostre uma **falha ou limitação** que o espectador possa ver.
2. Introduza a **solução** física para essa falha.
3. **Demonstre** como ela funciona e mostre o resultado.
4. Diga o **nome técnico** numa frase curta.
5. Mostre a **próxima consequência**. Sempre que a física permitir, o resultado prepara, provoca ou revela o próximo limite. Aumente a gravidade das falhas quando o mecanismo justificar.

Uma peça resolve uma falha; peça que não resolve nada sai. Mito do título ganha bloco próprio no meio.

**Repertório (usar quando servir ao tema):** "Mas…" / "Então você…" / "Esse é…"; falhas em cadeia, quando uma solução cria o problema seguinte; fato curioso depois de um nome; lista final ("coloque X, Y e aquele Z chato") com o último item virando piada (piada nova a cada vídeo).

**Retenção.** Abra perguntas que a imagem possa responder e entregue a resposta assim que ela fizer sentido. Antecipe consequências, alterne tensão e explicação e use demonstrações inesperadas ou humor ligado à ação para recompensar a atenção ao longo do vídeo. Dê tempo para o público entender cada resultado antes do próximo desafio. Corte repetições e trechos que só adiam a resposta.

**Final.** Mostre o sistema completo funcionando no cenário e resolvendo a consequência final. Quando couber, use "Parabéns, você construiu um ___" 5–10 s antes do fim, com brilho. Feche com piada ligada ao tema ou pergunta simples. A ficha define o pedido de comentário, que fica visível nos segundos finais. A pergunta pode cumprir esse papel.

**Linguagem e ritmo.** Use frases curtas e naturais, comparações do dia a dia, verbos de ação visível e termos precisos. Deixe a imagem carregar o que já está claro e use a fala para explicar a causa. Ajuste a referência de 190–210 palavras/min à compreensão da cena; ela é a referência de ritmo. Antes da versão definitiva, confirme em fontes confiáveis cada afirmação técnica importante e registre as fontes em `pesquisa.md`.

**Teste do leigo (antes de entregar o roteiro).** Toda peça tem comparação do dia a dia; cada coisa tem um nome só no vídeo inteiro; nenhuma frase contradiz outra; dá para resumir o mecanismo em até 4 verbos.

**Variação.** A função é fixa, as palavras são livres. Nunca copie frase de referência. Não repita abertura nem fecho em dois vídeos seguidos; não use o mesmo conector de falha em ciclos vizinhos. Antes de entregar, liste a frase inicial de cada ciclo e compare com vídeos anteriores: nenhuma sequência igual com mais de 4 palavras.

**Eleven v4.** Texto único copiável (só falas e marcações `[curious]`, `[excited]`, `[sighs]`; nunca `[whispers]`, poucas e coerentes). Sem SSML `<break>`. Números e siglas por extenso. Nada de câmera, música ou efeito no texto. Marcas `[...]` **nunca** vão para a legenda. Roteiro em `videos/<NN>-<slug>/roteiro.txt`. A voz o usuário gera à mão no ElevenLabs (sem API); o pipeline converte uma cópia para `voz/voz.wav`.

**Insumos.** Ao entregar o roteiro, listar em `insumos.json` o que falta (SFX reais, referência, modelo); o pipeline pausa só na etapa que precisa.

### 1.1 Retrocesso Causal

Mostre uma consequência e volte rapidamente ao estado anterior do mundo. A volta abre espaço para revelar a causa, introduzir uma peça que faltava, corrigir uma decisão, testar uma alternativa ou mostrar o que teria acontecido se a falha fosse evitada.

**Sequência de referência** — problema → consequência → retrocesso → solução → demonstração → próxima consequência. Quando a função for investigar, a retomada começa pela causa. A demonstração continua a história a partir do estado recuperado.

- **Abertura.** Comece pela consequência e volte para descobrir como ela aconteceu.
- **Correção.** Mostre a falha e volte ao instante em que a intervenção pode evitá-la.
- **Comparação.** Volte ao mesmo estado inicial e mostre como uma mudança produz outro resultado.
- **Clímax.** Revisite uma consequência anterior e mostre o que a explicação do mecanismo permite entender agora.

Use cada volta para responder a uma pergunta concreta. Zero retrocessos é uma escolha válida. No esqueleto, indique a consequência, o ponto de retorno e o que o público vai entender na retomada. No plano visual, registre o estado recuperado, a ação que muda ou revela a causa e o resultado observável. Planeje a execução em Peça/efeito, Texto/ícone e SFX, conforme §4. Leve esses detalhes para a partitura e marque tempos de prova da consequência, da retomada e do resultado.


### 1.2 Causa e efeito (estilo causa e efeito)

O tema é explicado só por causa e efeito, em frases curtas.

1. **Cadeia.** Falha → causa em uma frase → solução → efeito visível → nome → o efeito cria a próxima falha. Sem salto: "então", "por isso" e "mas" ligam cada passo.
2. **Uma ideia por frase.** Conectores "Então / Mas / Por isso". Comparação do dia a dia só quando destrava a causa; sem aula, sem número sem necessidade.
3. **Curto.** Modelo: roteiros 12-vidro-box e 13-piscina-no-topo (~270 palavras). Nunca alongue para "explicar mais"; corte repetição.
4. **Sem pente de lacunas, sem `lacunas.md`.** O Teste do leigo basta.
5. **Demonstrar, não informar.** Nenhuma frase é só informativa quando a imagem pode demonstrá-la. Cada mecanismo tem causa, funcionamento e consequência visíveis.
6. **Sem drama inventado.** Nenhuma falha ou risco é criado para dar tensão; toda falha do roteiro existe na física ou no uso real.
7. **Pergunta-ponte.** No esqueleto, cada bloco termina com a pergunta ou curiosidade que o efeito cria e que o bloco seguinte responde.
8. **Entrega do pacote de aprovação (A–E):** A) narração integral (`roteiro.txt`); B) divisão em blocos causais (`esqueleto.md`); C) o que a animação mostra em cada frase (`plano-visual.md`); D) pergunta-ponte de cada bloco (`esqueleto.md`); E) verificação científica, tabela `afirmação | fonte | status` em `pesquisa.md`. O §1.2 continua mandando no tamanho: o modelo não autoriza roteiro longo.


---

## 2. Câmera por takes

Escolha o foco pela fala, pela ação e pelo que o público deve entender. Registre a intenção e os alvos na partitura. Consulte as oito famílias e os critérios do [guia de câmera](../refs/CAMERA.md). O Maestro decide o plano depois de abrir os quadros. Mecanismos repetidos podem usar câmera fixa. Relações exigem as peças ligadas no mesmo plano. Seções podem pedir perfil. Justifique transições e exceções de enquadramento. Durante a nomeação, mantenha a peça e a legenda legíveis.

## 3. Visual

- **Estilo:** 3D low poly de brinquedo, 9:16, formas simples, cores saturadas, `flatShading` visível, luz direcional de sol com sombras nítidas e **sombra de contato** no chão sob o Zé e sob as peças. **Sem contorno preto nos objetos 3D**; textos e legendas mantêm contorno.
- **Escala real:** 1 unidade ≈ 0,5 m, chão em y = 0. Zé ~1,75 m. Objeto pequeno fica sobre o móvel certo. Registrar a razão Zé/objeto na vitrine (panela 25 cm: Zé ≥ 6×). Escala vale também para grãos e miúdos.
- **Cenário** completo do lugar real (parede com textura, piso, móveis) que ganha peças; clima carrega o problema.
- **Corte/raio-X 3D de verdade:** parede com espessura e conteúdo em volume (caldo, grãos, peças soltas). Placa plana colada é proibida; usar `clippingPlanes` ou transparência (carcaça 1 → 0,25 em 0,4 s). Peças conectadas são filhas do pai (`THREE.Group`) e se movem juntas; nada atravessa nem flutua.
- **Uma cor fixa por componente** durante o vídeo todo.
- **Cores com significado** (tokens `--cor-*` em `biblioteca/identidade/tokens.css`): branco legenda; amarelo destaque (nome, medida); verde positivo; vermelho negativo; azul frio/aperto/informação; laranja quente/tração; rosa invisível. Teal/laranja do tema só na marca (tarja, logo, uniforme do Zé).
- **Zé Desmonte** (`biblioteca/personagens/ze-desmonte/`; `ze-desmonte-padrao.js` para vídeos novos; v3 só nos vídeos 10–14). **Tela da peça é só da peça**: o Zé é o "você" nos momentos fortes (abertura, falha, reação, piada, final) e entra grande só com motivo. Quanto ele aparece depende do tema e vai na ficha. Teste do take: "sem o Zé, a frase perde sentido?" Se não, ele sai ou fica pequeno ao fundo, trabalhando. Sem função no take, sai de quadro: nunca estátua, nunca cortado na borda. **Entra em movimento**, de fora do quadro, quando couber. **Figurino contínuo** no vídeo inteiro, salvo troca mostrada. Reações do `EFEITOS.md`. Sem deslizar de lado: troca de lugar fora de quadro.
- **Figurantes, clima e mundo que muda:** só quando o tema pedir, definidos na ficha. O item nasce no vídeo e vai para `biblioteca/` no 2º uso.
- **Regras de ouro do movimento:**
  1. Luva/braço nunca dentro da peça; colher só a concha, cabo com cotovelo para fora.
  2. Onomatopeia presa à peça que faz o som; o Zé só reage olhando.
  3. Margem mínima de 18% da cabeça do Zé à borda no 9:16.
  4. Nenhuma pose muda em 1 quadro: transição 0,25–0,35 s (`misturarPoses`).
  5. Para corrigir enquadramento, **mova a câmera, não o Zé**.
  6. Catálogo de moves reutilizáveis do Zé: M01 segurar, M02 girar botão, M03 pegar cabo, M04 reagir a som, M05 comemorar, M08 idle com respiração, M09 caminhada curta.
- **Direção do Zé:** quando aparecer, faça-o agir na mesma intenção da fala. O olhar antecede o gesto. Preserve mãos, rosto e objeto de contato legíveis. Em takes de peça, retire o Zé se ele competir com a leitura.

---

## 4. Entradas, textos e ícones

**Montagem por camadas:** um único modelo cresce o vídeo todo, cada ciclo acrescenta uma camada na ordem da fala. Peça composta monta em unidades (parede fiada a fiada de baixo para cima; telhado: madeiramento e depois telhas em faixas), em ▶▶ quando for repetição e em velocidade normal quando o Zé assenta; peça fina cresce de uma linha até a espessura final em ≈1,2 s; ingredientes entram como cartão de ícones, um por palavra falada.

**Peça entra** em 0,3–0,45 s (média 8–11 quadros, grande ~14 com leve passada), em arco, ou pela mão do Zé, ou por revelação progressiva; não faça todas iguais. Entra na frase que fala dela. A falha aparece **antes** da peça.

**Textos:**
1. **Legenda** de 1–2 palavras por vez, branca, contorno escuro, sem tarja, um pouco abaixo do centro; a palavra-nome fica amarela.
2. **Nome da peça** (`.apv-nome`, `kit/efeitos/rotulos-peca.js`): texto amarelo grande, traço preto, sobre a peça e inclinado com ela, sem placa. É overlay 2D ancorado; texto 3D e placa escura são proibidos (B47). **A peça ou o objeto inteiro acende** com `destacarPeca` (bases: 2 pulsos de ≈0,5 s); peça já amarela acende em branco. **Automático (usuário, 31/10, aprovado no 09):** toda peça que aparece ou é nomeada pulsa amarelo nela mesma, na palavra que a nomeia; vem do campo `destaque` do take (`[[alvo, palavra]]`) ou, sem ele, de `termos` + `alvo`; o modelo `criarMontagem` aplica sozinho. Momento decidido por take; na base estádio, destaque e nome começam em "Esse é…", ≈0,5 s antes da palavra, e o nome fica ≈1,7 s. Um destaque por vez; nada fica aceso depois do nome. Não contraria "sem contorno 3D": é transitório.
3. **Pílula `• TEXTO`** (fundo branco, borda da cor do ponto, ponto colorido) explica, não nomeia; acompanha a peça na tela. **Cor do ponto = natureza:** vermelho problema/carga, verde benefício, azul água/frio, marrom terra.
4. **Explicação gráfica** só quando ajuda: setas 3D de força (vermelho carga, verde sustentação), termômetro, medida amarela, partículas térmicas.

Entram em 3–5 quadros e somem em ~4. Ícones de edição incluem ▶▶ para passagem de tempo, ⏸ para pausa explicativa, ✔ verde para funcionamento e ❌ vermelho para falha. Cores sempre as padrão.

**Retrocesso Causal (§1.1).** Após a consequência, uma breve pausa pode dar tempo para ler o que aconteceu. Use ◀◀ branco (`--cor-texto`), linhas horizontais rápidas de varredura e quadros anteriores em ordem inversa. A volta deve ser rápida e reconhecível, com 0,4–0,6 s como referência. Se houver áudio, use um SFX curto de retrocesso. Retome a cena com continuidade espacial e restaure posições, ações e estados dos elementos que mudaram. Reserve o ◀◀ para essa volta real.

**Teste sem som:** dá para reconhecer o problema, a peça que entra e o resultado. Todo nome aparece duas vezes (etiqueta e legenda).

---

## 5. Som

- Voz contínua; **sem trilha** a não ser que o usuário peça. Loudness final **-14 LUFS ±0,5**, pico ≤ **-1 dBTP**.
- **SFX só nas ações** (peça entra, encaixa, solta, chia, ferve, falha, clique); quantidade conforme o tema (bases: até ~14 por minuto). Proibido trem de bipes/tics sob a voz. Som contínuo (fervura, chiado) só no trecho do evento, baixo. Gerados por `ferramentas/sons.py`; amostras reais do usuário em `insumos/` têm prioridade.
- Medir o arquivo final: `ffmpeg -i video.mp4 -af ebur128=peak=true -f null -`. Rodar `conferir.py --sfx som/sfx.wav` (faixa só dos efeitos) no P3.

---

## 6. Partitura de produção (P1): o documento que evita retrabalho

Escrita pelo Maestro, gravada em `videos/<NN>/partitura.json` (e `partitura.md` legível). **A montagem só executa o que está nela.** Uma entrada por take:

```json
{ "take": 7, "frase": "…", "t0": 41.2, "t1": 45.8,
  "plano": "médio 3/4", "alvo": "tampa", "camera": "push 6%",
  "ze": "M02 girar botão | ausente",
  "heroi": "peca | mundo | ze", "ze_tam": "fora | pequeno | grande",
  "motivo_ze": "por que ele está aqui (vazio se fora)", "tipo_camera": "obra | mecanismo | falha | nome | pov | topo | lista",
  "acao_peca": "tampa gira 40° e sobe 2 cm",
  "overlay": "pílula • TAMPA em 41.6",
  "sfx": "clique em 42.0",
  "prova": [42.0] }
```

`takes.json` (decisões do Maestro) + `python ferramentas/gerar_partitura.py videos/<NN> [--voz]` geram os dois arquivos. `test_takes.py` reprova só falta de decisão ou contradição, nunca número; `conferir.py` mostra % de Zé e ritmo só como informação. `ze_tam: "fora"` esconde o Zé na cena.

`prova` = tempos (s) em que a ação precisa estar visível num quadro. O P3 só passa se cada prova abrir num PNG real (`ferramentas/provas.py` monta a folha ação → PNG).

---

## 7. Equipe e fluxo (resumo; detalhe em cada nota-skill)

Maestro (Claude Opus) planeja, decide e fala com o usuário. Especialistas (Claude Sonnet): **MODELADOR-3D** (objetos, cenários, Zé, mecânica), **ANIMADOR** (moves, ações, câmera por takes), **ACABAMENTO** (legenda, overlay, som, render), **REVISOR-CODIGO** (determinismo, hierarquia, testes) e **DIRETOR-VISUAL** (Sonnet separado, só leitura, contexto limpo).

**Regras de execução:**
- Ordem de serviço em arquivo `videos/<NN>/tarefas/<agente>-<etapa>.md` (entrada, arquivos editáveis, entregável, teste de pronto, prazo ≤ 90 min).
- Uma tarefa curta por agente, contexto limpo em **toda** tarefa nova, arquivos próprios por agente, em paralelo (floors/branches). Um agente edita um arquivo por vez.
- Sem cópias de pasta por rodada: versionar no git do workspace; guardar só `preview-rN.mp4` e a folha de provas.
- Arquivos de texto sempre em UTF-8. Previews 540×960 a 10 fps; render final 1080×1920 a 30 fps.
- Limite de uso do Claude ou agente fora do ar: avisar o usuário, não contornar.

---

## 8. Portões

Nada avança sem o portão anterior aprovado e registrado na nota `VÍDEO NN`.

| Portão | Quem faz | Aprova se |
|---|---|---|
| **P0 Referências** | Maestro | famílias e técnicas pertinentes do guia de câmera, um experimento e ações do Zé sincronizadas à voz |
| **P1 Partitura** | Maestro escreve, DIRETOR-VISUAL confere contra a receita e a ficha | uma entrada por take completa (§6); `test_takes.py` sem falha; checklist planejado |
| **P2 Vitrine** | MODELADOR | 3 snapshots (geral, close, corte) com escala real e detalhe ≥ referência, **cada mecânica do roteiro animada isolada** (pino, válvula, trava…) **e animatic** (`python ferramentas/mapa.py videos/<NN>`: um quadro por take, com a câmera real). O Maestro confere o animatic contra a ficha antes de animar |
| **P3 Montagem** | ACABAMENTO roda `conferir.py`; REVISOR roda testes; DIRETOR-VISUAL preenche o placar com `lado_a_lado.py`; **Maestro assiste o preview inteiro a 1 q/s** | `hyperframes check` 0 erros; `test_takes` OK; tabela de provas completa; vídeo cumpre a ficha; placar sem item 0 e ≥ 20/24 |
| **P4 Final** | Maestro | LUFS -14 ±0,5, pico ≤ -1 dBTP, 1 q/s do MP4, checklist inteiro, comparação com a ficha e lado a lado com a base escolhida |

**Placar P3 (12 itens, 0–2):** 1 gancho; 2 ciclos e explicação clara (nota 2 se a cadeia causa → efeito fecha em cada ciclo); 3 câmera por takes; 4 retrocesso e ícones; 5 foco, escala e vida do mundo; 6 cenário; 7 corte interno; 8 física desenhada; 9 textos e cores; 10 som; 11 ritmo; 12 final e pedido. Compara por semelhança com a base escolhida na ficha, sem exigir igualdade: tema diferente pede soluções diferentes. Reprovou: volta ao agente dono; 3 reprovações seguidas pausam o pipeline e avisam o usuário.

**Item 4.** Quando houver Retrocesso Causal, abra as provas e assista ao trecho em sequência. Confira a consequência, a volta ao estado anterior e a clareza do que a retomada explica, também sem som. Sem retrocesso, avalie a adequação dos ícones à ação. A ausência de retrocesso ou de ícones pode receber 2 quando a cena se explica sozinha.

**DIRETOR-VISUAL:** uma etapa curta por pedido, sempre com o arquivo e o hash da versão; só opina sobre imagens que de fato abriu e lista os caminhos. O Maestro nunca aceita veredito sem abrir 2–3 quadros-chave.

---

## 9. Checklist obrigatório

- [ ] Projeto criado por `ferramentas/novo_video.py`, usando o kit.
- [ ] Escala real; razão Zé/objeto registrada.
- [ ] Sem contorno nos objetos 3D; sombra de contato; `flatShading`.
- [ ] Câmera elevada em 3/4; cenário completo; corte 3D de verdade.
- [ ] Ficha de direção cumprida; todo take diz quem protagoniza; Zé só com motivo; figurino contínuo; regras de ouro (§3) cumpridas.
- [ ] Câmera por takes: `test_takes.py` OK, sem salto, sem quadro cinza/vazio, nada flutuando.
- [ ] Cada ação da partitura provada num quadro real (tabela ação → PNG).
- [ ] O Maestro assistiu o preview inteiro a 1 q/s antes de mostrar ao usuário e no P4.
- [ ] SFX só nas ações, medido com `--sfx`.
- [ ] Textos e ícones só nas cores padrão; legenda 1–2 palavras; sem marcas `[...]`.
- [ ] Roteiro curto, em cadeia causa → efeito, sem salto (§1.2).
- [ ] Gancho forte, resultado final visível e pedido de comentário. Quando a ficha pedir "Parabéns", conferir a fala e o brilho.
- [ ] LUFS -14 ±0,5; pico ≤ -1 dBTP.

**Referências de qualidade (decisão do usuário, 30/10/2026):** a máquina de lavar **deixa de ser referência**.
- Referência de qualidade visual: [guia de câmera](../refs/CAMERA.md) e o estudo que o fundamenta.

## 10. Retro e evolução

Registre decisões em [decisoes.md](decisoes.md), resultado em [evolucao.md](evolucao.md) e falhas em [BUGS.md](../BUGS.md). Use a prova de cada take e o feedback para melhorar o próximo.

**v4.4:** §1.2 ganha os itens 5–8 do modelo de roteirista do usuário (aprovado pelo usuário em 06/11/2026).

**v4.3:** §1.2 vira Causa e efeito (estilo causa e efeito); teste do leigo volta; pente de lacunas e placar rígido do item 2 retirados.

**v4.1:** critérios de retenção no roteiro e Retrocesso Causal opcional, do esqueleto à conferência no P3.

**v4.0:** estudo Motor, Ponte e Futebol como referência atual. Famílias por intenção, checagem de quadros, câmera fixa quando serve à ação e autorização de render vinculada à revisão.
