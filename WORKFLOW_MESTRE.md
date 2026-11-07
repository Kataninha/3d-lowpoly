# Workflow de produção

Atualizado em 2026-11-07. Comece aqui. A receita editorial fica em [receitas/receita-unificada.md](receitas/receita-unificada.md). [refs/CAMERA.md](refs/CAMERA.md) traduz o estudo de câmera em decisões. [equipe/painel.md](equipe/painel.md) registra o trabalho em andamento.

## Entrada e produção

| Etapa | Dono | Entradas, saída e evidência |
|---|---|---|
| Tema e esqueleto | Maestro | Pesquise as afirmações e a sequência técnica em `pesquisa.md`. Reuse ativos do `CATALOGO.md`. Crie o projeto com `python ferramentas/novo_video.py <slug>`. Peça aprovação do `esqueleto.md`. |
| Roteiro | Maestro | Aplique o §1 da receita. Escreva `roteiro.txt`, registre as fontes e liste os insumos necessários em `insumos.json`. Peça aprovação do roteiro. |
| Plano visual | Maestro | Preencha `plano-visual.md` e `direcao.md` com cenário, foco, família de câmera, movimento, ação, overlays, SFX e quando o Zé serve à explicação. Peça aprovação. |
| Voz | Maestro | O usuário coloca um único WAV ou MP3 de origem em `voz/`. Rode `preparar-voz`, transcreva com o HyperFrames fixado e importe os tempos por palavra. Resolva palavras divergentes contra a gravação antes de seguir. |
| P0 | Maestro | Escolha os princípios aplicáveis em `refs/CAMERA.md`. Defina um experimento e planeje o que o público deve entender em cada frase. |
| P1 | Maestro e DIRETOR-VISUAL | Escreva o `takes.json` com índices de frase, IDs de alvo estáveis, relações obrigatórias, `shotType`, `leitura`, dicas de tempo e palavras de prova. Gere a `partitura.json` e confira a intenção de câmera e as ações contra o plano aprovado. |
| P2 | MODELADOR-3D e DIRETOR-VISUAL | Construa e teste os mecanismos isolados. Registre os objetos Three.js reais, avalie variantes de câmera e monte as poses escolhidas em `camera.json`. Abra os snapshots e assista ao animatic antes de aceitar. |
| Montagem | ANIMADOR, ACABAMENTO, REVISOR-CODIGO | Renderize a partir do tempo absoluto. Integre cena, overlays gráficos, legendas e som. Rode o check do HyperFrames, os testes de take e a verificação de seek. |
| P3 | Maestro e DIRETOR-VISUAL | Abra as provas de ação, inspecione a prévia a um quadro por segundo e assista e escute o rascunho inteiro. Registre o relatório de QA e suas entradas exatas. |
| Aprovação final e render | Usuário, ACABAMENTO | Registre a aprovação explícita da prévia P3 e só então rode o comando de render protegido. |
| P4 e entrega | Maestro | Abra o MP4 final. Confira imagem, áudio, duração, 1080 × 1920 e 30 fps. Registre evidência real, entregue o MP4 com o texto de plataforma abaixo e atualize a retrospectiva. Publicar exige autorização separada. |

Em toda entrega final, prepare automaticamente e salve na pasta do vídeo um pacote de postagem em português, `publicacao.md`, e inclua-o na mensagem de entrega junto com o link do MP4. Adapte-o ao corte exportado. Para o YouTube, inclua título, descrição, hashtags, tags separadas por vírgula, formato, categoria sugerida, público e texto de capa. Para Instagram e TikTok, inclua gancho/título, legenda, hashtags, formato e texto de capa de cada plataforma. Sugira visibilidade e opções de interação quando couber e sinalize ajustes que dependem de patrocínio, público ou conta reais. Confira os requisitos atuais das plataformas quando necessário. Não envie nem publique sem autorização explícita.

Para o Retrocesso Causal, use o §1.1 da receita no esqueleto, no plano visual e na partitura. Aplique o §4 na montagem e o §8 ao revisar a prévia P3.

Regras de fluxo:
- Pacote de aprovação: apresente esqueleto, roteiro (curto, causa e efeito) e plano visual juntos para uma única resposta. Registre as três aprovações dessa resposta. Uma parte rejeitada volta sozinha.
- Voz: peça a gravação só depois de o roteiro estar travado. Qualquer mudança de roteiro depois da gravação exige um novo take.
- Checklist de prévia: antes de qualquer prévia chegar ao usuário, o Maestro abre os quadros de início, meio e fim de cada take, confere legibilidade, oclusão e enquadramento e assiste à prévia inteira a 1 quadro/s. Registre a conferência no `registro.md`.
- Limite de rodadas no P2: depois de 3 rodadas da mesma prévia sem aprovação, pare e peça ao usuário uma decisão de direção antes da rodada 4.
- Portão do P4: `avancar <video> P4` exige `publicacao.md` e `retrospectiva.md` não vazios na pasta do vídeo.

Registre cada aprovação antes de avançar a etapa correspondente. Avance em ordem com `python ferramentas/pipeline.py avancar <video> <etapa>`. Use `status`, `pendente`, `iniciar <video>` e `insumos <video>` para coordenar. O Maestro mantém o painel e o `registro.md` em dia. Insumos obrigatórios do usuário param a etapa que depende deles. Três reprovações no P3 pausam a produção para revisão.

## Voz e tempo

Rode o primeiro e o terceiro comandos da raiz do repositório e o segundo da pasta do vídeo. `<video>` é o nome da pasta. Revise a saída real da transcrição antes de importar.

```powershell
python ferramentas/pipeline.py preparar-voz <video>
npx --offline --no-install hyperframes@0.8.191 transcribe voz/voz.wav --engine parakeet --language pt --no-runtime-install
python ferramentas/importar_transcricao.py videos/<video> videos/<video>/transcript.json
python ferramentas/gerar_partitura.py videos/<video> --voz
```

O importador exige tempos por palavra em ordem e correspondência exata com o roteiro, depois de normalizar maiúsculas e pontuação. Ele liga `voz/tempos.json` ao WAV e ao roteiro por SHA-256. Corrija erros de transcrição contra o áudio real. Tempos estimados servem só para quadros rascunho. Para outra gravação de voz, guarde o artefato anterior em um caminho versionado e gere de novo as saídas afetadas.

## Câmera e prova visual

Para cada take, escolha uma família narrativa e escreva o que precisa ficar legível. `biblioteca/camera/diretor.js` registra objetos Three.js com IDs estáveis e calcula candidatas a partir dos limites animados deles. Use `sceneRegistry` e `planCandidates` contra o `updateAt(t)` determinístico da cena. Salve o registro e os diagnósticos em `qc/`. Revise duas ou três candidatas onde o enquadramento for ambíguo. Chame `selectedCamera(takes, candidates, selection)` com os IDs aprovados. Salve o resultado em `camera.json` e use o modelo de montagem compartilhado para aplicá-los.

Capture início, meio e fim em takes estáticos e cinco amostras igualmente espaçadas em takes com movimento. Abra as imagens para decidir se a ação, a relação, o rótulo e a transição se leem. Amostre dentro do fim do take. Estimativas de limites e de raio ajudam nessa revisão. Revise explicitamente oclusão real, colisões e legibilidade contra `refs/CAMERA.md`. `ferramentas/mapa.py` faz o animatic de meio de take e `ferramentas/provas.py` captura os tempos de prova da partitura.

Uma prévia técnica é permitida durante a produção. Prove o seek repetido usando a ordem de quadros 90, 10, 50, 10 e compare os snapshots da prévia com a exportação técnica.

## Revisão, exportação e reprodução

Projetos novos carregam o schema 2 em `estado.json`. A criação do projeto copia os ativos para `kit/` e escreve `kit.manifest.json` com SHA-256 reais. Entradas que mudam depois da revisão voltam o estado atrás e invalidam as aprovações velhas. Salve relatórios novos em caminhos de saída versionados.

Antes do P2 ou do P3, obtenha os `hashes` atuais com `python ferramentas/pipeline.py verificar <video>`. Registre a revisão em um arquivo JSON dentro de `qc/` com `resultado: "aprovado"`, `revisor`, `relatorio` (caminho relativo), `arquivos_abertos` (MP4 da prévia e imagens de prova abertos) e `inputs_sha256`. Rode `avancar <video> P2 --evidencia qc/p2.json` ou `avancar <video> P3 --evidencia qc/p3.json`. Um revisor precisa inspecionar esses arquivos de verdade.

Depois da aprovação explícita do usuário para o corte revisado:

```powershell
python ferramentas/pipeline.py aprovar-render <video> --usuario <nome> --evidencia qc/autorizacao.md
# Da pasta do vídeo, com um nome novo de arquivo de saída:
npm run render -- final.mp4
```

O wrapper de exportação confere os hashes e a aprovação do P3 antes de iniciar a CLI fixada. Registre a exportação e avance para o P4 depois de abrir a saída e conferir imagem e áudio. Meça loudness e pico com o FFmpeg. Reprodutibilidade significa que este projeto reconstrói a saída aprovada a partir de entradas versionadas, configurações e kit.

## Organização do workspace

- `refs/` guarda as regras de câmera.
- `biblioteca/` guarda os ativos reutilizáveis e suas origens.
- `modelo-video/` é o único modelo de produção. `videos/` guarda as produções atuais. `exemplos/` guarda projetos de referência somente leitura.
- `equipe/` define os papéis. Use o mesmo roteiro de trabalho no Codex e no Claude. Leia o `BUGS.md` e use suas lições antes de produzir.

Use as assinaturas e ferramentas que já existem. Pergunte antes de instalar qualquer coisa, gerar custo ou enviar conteúdo a um serviço externo. Preserve prévias e renders em andamento.
