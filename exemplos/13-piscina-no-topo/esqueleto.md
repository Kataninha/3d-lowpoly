# Esqueleto - piscina-no-topo (aprovado 04/11/2026)
Titulo: Por que a piscina no topo do predio nao despenca?
Roteiro base: roteiro-rascunho.txt (aprovado 04/11). Fontes: pesquisa.md.

## Abertura (retrocesso causal)
Ze no sofa com pipoca; teto estala (SFX), laje racha, agua cai na sala. Consequencia primeiro. Retorno: ◀◀ ao canteiro vazio, antes do predio. Na retomada o publico entende: o peso precisa de um caminho ate o chao.
Mito (bloco proprio): "mais concreto no teto resolve" - so soma peso.

## Ciclos (falha -> solucao -> demonstracao -> nome -> proxima consequencia)
1. Terra mole afunda o predio -> estacas ate camada firme + blocos -> predio assenta -> FUNDACAO -> precisa subir o peso.
2. Concreto quebra ao esticar -> aco por dentro -> viga/pilar aguentam -> CONCRETO ARMADO (vigas ligam pilares) -> falta o piso da piscina.
3. Laje comum so aguenta ~20 cm de agua -> laje reforcada sobre vigas e pilares -> LAJE -> falta encher.
4. Agua empurra para os lados -> paredes e fundo de concreto+aco -> parede segura -> proxima: vazamento.
5. Pequena falha vira chuveiro na sala -> impermeabilizacao, canos vedados, bomba e filtro -> piscina fecha -> IMPERMEABILIZACAO.

## Final
Enche. Peso percorre agua -> fundo -> laje -> vigas -> pilares -> fundacao -> terreno (setas, cor por carga). Nome: CAMINHO DAS CARGAS. "Parabens, voce construiu uma piscina nas alturas" com brilho. Piada em lista (vizinho otimista). Pergunta/comentario: "Voce moraria embaixo de uma piscina?" visivel no fim.

## Cenario
Reuso biblioteca/cenarios/cobertura-obra (obra, grua, elevador, escala 1u=0,5m, tarde clara) + sala do Ze nova (corte 3D, sofa, pipoca, teto com laje espessa). Fundo muda por bloco: sala (abertura) -> canteiro/terreno (1) -> estrutura subindo (2-3) -> cobertura com piscina (4-5, final em corte do predio inteiro). Paleta viva, brinquedo. Zonas livres do Ze: sala (abertura/final), lateral do canteiro. Easter egg: pipoca que cai/treme a cada estalo.
Mudanca por bloco: predio cresce de baixo para cima, camada por camada.

## Objetos necessarios
Sala+sofa+pipoca, estacas, blocos, pilares/vigas com aco visivel (corte), laje, piscina com parede em corte, impermeabilizacao (manta), canos, bomba, filtro, setas de carga. Ver ATIVOS.md/CATALOGO.md antes de criar.

## Montagem (pedido do usuario 04/11: nada surge pronto; tudo monta bonito, unidade por unidade)
Regra: toda peca nasce por partes, na frase que fala dela. Base: `montarPorUnidades` e `crescerPeca` (biblioteca/efeitos/montagem-unidades.js). Ritmo varia: unidade a unidade em velocidade normal quando o olho precisa entender; ▶▶ quando repete. Cada encaixe tem SFX curto e leve assentamento (quique pequeno). Nunca duas pecas montando juntas sem motivo.
- Terreno: camadas de solo surgem de baixo para cima em fatias (cores por camada: mole clara, firme escura).
- Estacas: descem cravando em golpes (3 batidas visiveis, poeira), ate tocar a camada firme.
- Blocos: forma de madeira aparece tabua por tabua, aco entra, concreto sobe e preenche, forma some.
- Pilares: gaiola de aco monta barra por barra (corte mostra o aco); concreto sobe em anel por anel.
- Vigas: crescem de um pilar ao outro (`crescerPeca` eixo x), com aco visivel em corte.
- Laje: grade de aco tecida em linhas, depois concreto espalha em faixas; reforco aparece mais denso que a laje comum (comparacao lado a lado).
- Paredes da piscina: fiada a fiada de baixo para cima, aco junto (`ordem: perimetro`).
- Impermeabilizacao: manta rola faixa por faixa e cobre fundo e paredes; canos entram e recebem anel vedante.
- Bomba e filtro: entram em arco, canos se ligam trecho a trecho.
- Agua: sobe em niveis, superficie com brilho.
- Predio inteiro: andares empilham ▶▶ entre os ciclos, sem pular continuidade.
- Final: setas de carga acendem em sequencia, do topo ao terreno, peca por peca.
Ponto de prova no P2: vitrine de cada montagem isolada antes da animacao.

## Raio-X do predio (pedido do usuario 04/11: bonito, protagonista visual)
Base: `camadaTranslucida` (casca 1 -> 0,25 em 0,4 s) + corte real com `clippingPlanes`; nada de placa plana (receita §3). Paredes com espessura; conteudo em volume.
- Onde entra: (a) abertura, apos o estalo: casca do predio fica translucida e revela a piscina pesando sobre a sala do Ze; (b) ciclo 2: corte mostra a gaiola de aco dentro do pilar/viga; (c) ciclo 4: corte da parede da piscina com aco e agua empurrando (setas laterais crescem com a profundidade); (d) final: predio inteiro em raio-X, camera desce do topo ao terreno seguindo as setas de carga.
- Camadas com cor fixa durante todo o video - concreto cinza claro, aco laranja (tracao), agua azul, manta impermeavel verde, terra marrom (mole clara / firme escura), setas de carga vermelhas virando verdes na fundacao (sustentacao).
- Visual: casca translucida com leve brilho de borda (fresnel suave), pecas internas opacas e saturadas, varredura de luz que passa de cima para baixo ao ligar o raio-X (0,4 s), sombras mantidas.
- Clima: andares de baixo com luzes acesas e moradores/objetos minimos visiveis no corte (easter egg: Ze no sofa sempre visivel em todo raio-X do predio).
- Prova P2: vitrine do predio em raio-X parado, em 3 angulos, antes de animar.

## Predio moderno e tecnologico (pedido do usuario 04/11: so ha piscina em apartamento high-tech)
Predio de luxo contemporaneo, torre residencial com cobertura-piscina (infinity edge). Linguagem: vidro e concreto aparente, varandas em balanco escalonadas, linhas limpas.
- Fachada: panos de vidro azul-esverdeado com reflexo de ceu, vigas brancas horizontais em cada andar, varandas com guarda-corpo de vidro, jardim vertical em um andar, brises metalicos.
- Topo: cobertura com piscina de borda infinita, deck de madeira, espreguicadeiras, paineis solares, antena discreta, luzes de LED na borda da piscina.
- Tecnologia visivel: luzes de andar que acendem por sensor, elevador panoramico de vidro, painel de monitoramento na sala (sensor de carga da laje com numeros verdes; fica vermelho no estalo da abertura e volta verde no final).
- Sala do Ze: apartamento tecnologico (TV fina, luminaria smart, robo aspirador, sofa moderno); a pipoca e o unico item bagunca.
- Entorno: cidade moderna ao fundo, entardecer quente com luzes acendendo; vizinhos so como janelas iluminadas.
- Obra (ciclos 1-3): mesmo predio em construcao, grua e elevador de obra do cobertura-obra; ao fim de cada ciclo a fachada de vidro "veste" o trecho pronto, painel por painel, e liga o LED.
- Raio-X: casca de vidro translucida com brilho de borda; estrutura interna limpa e saturada.
- Cores: respeitar tokens do projeto; azul vidro e branco/cinza concreto como base, madeira quente no deck.
Prova P2: vitrine do predio pronto (fachada, topo, corte) em 3 angulos.
