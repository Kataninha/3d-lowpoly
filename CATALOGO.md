# Biblioteca compartilhada

- `biblioteca/personagens/ze/`: personagem canônico, referências e origem.
- `biblioteca/identidade/`: tokens, fontes e ícones.
- `biblioteca/vendor/`: Three.js, RoundedBoxGeometry e GSAP.
- `biblioteca/sons/`: sons existentes.
- `biblioteca/objetos/` e `biblioteca/cenarios/`: espaço para ativos compartilhados.

Ativos úteis em dois ou mais vídeos devem ser promovidos à biblioteca. Cada ativo tem um arquivo canônico; use nomes sem acentos nos caminhos. `biblioteca.lock.json` lista os itens usados; execute `python ferramentas/sincronizar.py videos/<video>` para criar o kit.

- `biblioteca/efeitos/`: efeitos de cartum adaptados da máquina de lavar; origem em `origem.json`.
- `biblioteca/cenarios/lavanderia/`: cenário reutiliz?vel, 1 unidade ≈ 0,5 m; origem em `origem.json`.

- `biblioteca/efeitos/rotulos-peca.js`: nome e pílula presos à peça em 2D (`projetarPeca`, `posicionarRotulos`).
- `biblioteca/efeitos/contorno-toon.js`: helper reutilizável de casca invertida e criação de peças, extraído da convenção da lavanderia.
- `biblioteca/objetos/liquidificador/`: liquidificador low poly de 40 cm com motor, hélice e carcaça recortável; origem em `origem.json`.

- `biblioteca/objetos/panela-de-pressao/`: panela em escala de metros, componentes e corte 3D deterministico.
- `criarPanela({ graos: { quantidade, raio } })` configura os grãos (padrões: 30 e 0,008 m); feijões ovais curvos low-poly com contorno fino (desde v1.8 sem contorno).
- `biblioteca/cenarios/cozinha/`: cozinha e fogao em escala de metros para o video 07.

- `biblioteca/personagens/ze/ze-v2.js`: modelo v2 sem pescoco aparente e com tronco oval; v1 mantida.

- `biblioteca/objetos/grua-torre/`: grua treli?ada modular com se??es, lan?a, contrapesos, trava e pino; mec?nica P2 provis?ria.
- `biblioteca/objetos/macaco-hidraulico/`: jaula hidr?ulica envolvente com pist?es e transpar?ncia.
- `biblioteca/objetos/guindaste-movel/`: guindaste m?vel estilizado com cabo e gancho.
- `biblioteca/cenarios/cobertura-obra/`: cobertura de obra e cidade baixa em escala 1 u = 0,5 m.

- `biblioteca/cenarios/cobertura-obra/elevador-obra.js`: elevador de cremalheira e transporte procedural da pilha e das partes da base.

- `biblioteca/personagens/ze/ze-v3.js`: personagem com silhueta da refer?ncia do usu?rio e uniforme do canal; previews em `referencias-v3/`; API e articula??es v2 preservadas.

- `biblioteca/objetos/carrinho-pneu/`: carrinho com pneu de reserva e macaquinho de garrafa com alavanca (`animarMacaquinho`); escala do Zé v3.
- `biblioteca/objetos/guindaste-movel/`: reescrito como guindaste aranha com lança telescópica; `{fantasma:true}` dá o gigante vermelho translúcido do mito.
- `biblioteca/cenarios/cobertura-obra/`: `criarCoberturaObra({tema:'dia'})` e `criarAmbienteObra(scene,{tema})` (tarde clara).
- `biblioteca/objetos/liquidificador-v2/`: liquidificador hierárquico (1 u = 0,5 m), 9 mecânicas animar<X>(L,t), raio-X e testes de contato; vídeo 09.
- `biblioteca/cenarios/cozinha-v2/`: cozinha em 1 u = 0,5 m com balcão, pia, parede, fruteira e zona livre do Zé à esquerda; vídeo 09.
- `biblioteca/camera/diretor.js`: registro de alvos reais, candidatos e diagnóstico de enquadramento. Referência atual em `refs/CAMERA.md`.
- Revisão do Zé v3 (2026-11-03): cabelo curto rente à cabeça, sem topete por padrão. criarZe({figurino: 'futebol'}) veste camisa, calção, meiões e chuteiras, com mãos descobertas.
- Zé v3 (2026-11-03): criarZe({figurino: 'casa'}) veste camiseta teal, bermuda cinza e chinelo azul, mãos descobertas e sem cinto; vídeo 12.
- Zé v4 (2026-11-06): `biblioteca/personagens/ze/ze-v4.js`; camisa azul + jeans, cabeça afundada no corpo, emoção `preocupado`, capacete amarelo completo. Previews em `referencias-v4/` (`renderizar.py`).
- `biblioteca/personagens/estilos-cabeca/estilos.js` (2026-11-06): PRINCIPAL = `criarPersonagem('principal')` (previews `principal-*.png`); os demais estilos são NPCs. 10 personagens sobre o corpo do Zé v4, cada um com cabelo e formato de cabeça próprios (`criarPersonagem(nome)`, `ESTILOS`): tigela, coroa, espetado, black, topete, coque, moicano, rabo, lateral, cacheado. Folhas: `estilos-tq.png`, `estilos-frente.png`, `estilos-costas.png` (`renderizar.py`).
- Expressões do rosto (2026-11-06), `p.emocao('<nome>')` / `p.misturarEmocoes(de, para, k)` em `biblioteca/personagens/ze/ze-v4.js` (valem para o Zé e para `criarPersonagem(...)`). Folhas: `biblioteca/personagens/estilos-cabeca/emocoes-novas.png` e `emocoes-antigas.png` (`emocoes.html`).
  - Originais (11): neutro, feliz, empolgado, surpreso, triste, bravo, cansado, pensativo, nojo, tonto, preocupado.
  - Novas (20): sorridente, gargalhada, risoDentes, safado, piscadinha, lingua, desconfiado, espantado, chocado, gritando, furioso, medo, nervoso, chorando, bocejando, encantado, convencido, concentrado, duvida, aliviado.
  - Bocas novas: sorrisao (contorno grosso, como a ref), grande, dentes, lingua, gritando, dentesApertados, ondulada. `olhos` aceita `[esq, dir]` (piscadinha).
- Zé PADRÃO (2026-11-06): `biblioteca/personagens/ze/ze-padrao.js` (`criarZe`, mesma API da v4): cabelo preto rente + topete reto na frente, sobrancelhas sempre visíveis, 31 expressões. Vídeos novos importam este arquivo. Preview: `referencias-padrao/padrao.png`.
