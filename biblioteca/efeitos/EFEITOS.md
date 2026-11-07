# Efeitos e reações do Zé — como transmitir tudo VISUALMENTE

Nos vídeos de referência, nenhuma sensação fica só na narração. Cansaço vira suor, cheiro ruim vira linhas verdes, barulho vira texto tremendo e descoberta vira lâmpada.
Este guia explica como fazer isso no Mundo100Manual usando `kit/efeitos/efeitos.js`.

Referências visuais:
- `referencias/folha_05_reacoes.png`: todas as reações paradas.
- `videos/00-exemplo-reacoes/zePersonagem-reacoes.mp4`: todas as reações animadas (19,6 s).
- `videos/00-exemplo-reacoes/index.html`: código de exemplo para copiar.

---

## 0. REGRA OBRIGATÓRIA: tudo fluido, sem cortes

Nos vídeos de referência nada "pula": o boneco muda de pose deslizando, o rosto muda com uma piscada, a câmera viaja de uma cena para a outra e os objetos crescem ou deslizam para entrar.
**Nenhuma ação pode acontecer em um único quadro.**

| O que muda | Como fazer (sempre) | Duração mínima |
| --- | --- | --- |
| Pose do Zé | `zePersonagem.misturarPoses('de', 'para', (t - inicio) / dur)` ou `zePersonagem.irParaPose('para', k)` | 0,3 a 0,5 s |
| Emoção do Zé | `zePersonagem.misturarEmocoes('de', 'para', (t - inicio) / dur)`: sobrancelhas deslizam e olhos e boca piscam na troca | 0,25 a 0,35 s |
| Reação (`reagir`) | Já é fluida: entra e sai em `transicao` (padrão 0,4 s). Nunca use `transicao: 0` | automática |
| Efeitos (suor, fedor…) | Já entram e saem com fade e "pulo" | automática |
| Objeto aparecendo | Cresce (escala 0 → 1 com `suavizar`) ou desliza para o lugar; nunca `visible = true` de uma vez | 0,3 s |
| Objeto sumindo | Encolhe, desliza para fora ou fica transparente | 0,3 s |
| Cor (gelado → quente) | Interpolação de cor no tempo (`lerp`), nunca troca direta | 0,8 s ou mais |
| Câmera | Sempre em movimento suave (`suavizar` no começo e no fim). Para mudar de cena: **viajar** até o próximo ponto ou **mergulhar** dentro do objeto (zoom até ele encher a tela e então trocar o cenário por trás) | 0,5 a 1 s |
| Raio-X | Transparência sobe aos poucos (opacidade 1 → 0,25) | 0,4 s |
| Textos de tela | Entram com GSAP (`back.out`, `power3.out`), nunca aparecem secos | 0,2 a 0,3 s |

**Proibido:**
- chamar `zePersonagem.pose('outra')` ou `zePersonagem.emocao('outra')` diferente da do quadro anterior sem mistura;
- trocar `visible` de objeto grande no meio da cena;
- teleportar a câmera. Corte seco só é permitido no CTA final, e mesmo assim os cartões entram animados.

**Modelo de troca de pose + emoção no roteiro:**

```js
// de 2,0 s a 2,4 s o Zé sai de "explicar/feliz" para "apontar/surpreso"
const k = (t - 2.0) / 0.4;
if (t < 2.0)      zePersonagem.pose("explicar").emocao("feliz");
else if (t < 2.4) zePersonagem.misturarPoses("explicar", "apontar", k).misturarEmocoes("feliz", "surpreso", k);
else              zePersonagem.pose("apontar").emocao("surpreso");
```

**Modelo de câmera viajando (sem corte):**

```js
import { suavizar } from "./kit/personagens/ze/ze.js";
const k = suavizar(Math.min(Math.max((t - 6.0) / 0.8, 0), 1));   // 0,8 s de viagem
camera.position.lerpVectors(posA, posB, k);
alvo.lerpVectors(alvoA, alvoB, k);
camera.lookAt(alvo);
```

**Modelo de "mergulho" para outra cena (ex.: entrar na comida e ver as moléculas):**
1. A câmera avança até o objeto encher a tela (0,5 s).
2. No quadro em que só se vê a superfície do objeto, as moléculas já estão posicionadas atrás e a câmera passa por dentro.
3. A câmera recua um pouco revelando o mundo de dentro (0,5 s).

O espectador sente uma viagem contínua, não um corte.

---

## 1. A regra principal

> **Toda sensação, cheiro, som, temperatura ou ideia que a narração cita precisa aparecer na tela ao mesmo tempo.**

| A narração diz… | Na tela aparece… |
| --- | --- |
| "cansa", "difícil", "esforço" | `reagir('suando')`: gotas de suor + rosto cansado + corpo curvado |
| "fica com medo", "e se der errado?" | `reagir('nervoso')`: suor + tremor leve |
| "estraga", "apodrece", "fedor" | `reagir('fedor')`: linhas verdes + moscas + Zé tapando o nariz |
| "esquenta demais", "trava", "não funciona" | `reagir('raiva')`: veia pulsando + vapor saindo da cabeça + tremor |
| "então…", "a solução é…" | `reagir('ideia')`: lâmpada acendendo + brilhos + braço para cima |
| "como assim?", "por quê?" | `reagir('duvida')`: três "?" aparecendo + coçar a cabeça |
| "demora", "horas e horas" | `reagir('sono')`: "Z" subindo + olhos meio fechados |
| "explode", "de repente", "BUM" | `reagir('susto')`: "!" + linhas de choque + braços abertos + tremor |
| "bate", "gira demais" | `reagir('tonto')`: estrelinhas girando + olhos em X |
| "quebrou", "perdeu" | `reagir('triste')`: lágrimas escorrendo |
| "funcionou!", "parabéns" | `reagir('empolgado')`: brilhos + comemorar |
| "gelado", "frio" | `reagir('frio')`: marcas azuis de tremor + flocos + se abraçando |
| qualquer som (motor, alarme, clique) | `criarEfeito('barulho', { texto: 'RRR-RRR!' })` |
| queima, motor, poeira | `criarEfeito('fumaca', { alvo: objeto })` |
| força, impacto, explosão, pressão | `criarEfeito('forca', { alvo: objeto })`: raios vermelhos |

---

## 2. Como usar no vídeo (passo a passo)

### Passo 1: importar e preparar a fonte

```js
import { criarZe } from "./kit/personagens/ze/ze.js";
import { prepararEfeitos, reagir, criarEfeito, tremer, pararTremor } from "./kit/efeitos/efeitos.js";

const pronto = prepararEfeitos();   // carrega a fonte Poppins usada em "?", "Z", "!" e onomatopeias
let desenhar = null;
// O HyperFrames espera a fonte antes de desenhar cada quadro:
window.addEventListener("hf-seek", (e) => e.detail.waitUntil(pronto.then(() => desenhar(e.detail.time))));
await pronto;
```

**Importante:** crie os efeitos de texto (`duvida`, `sono`, `susto`, `barulho`) só **depois** do `await pronto`. Senão o texto sai com a fonte errada.

### Passo 2: criar as reações com o horário de cada uma

Crie tudo **uma vez**, fora do `desenhar`:

```js
const zePersonagem = criarZe();
cena.add(zePersonagem.raiz);

const cansaco = reagir(zePersonagem, "suando", { inicio: 2.5, duracao: 2.0 });  // de 2,5 s a 4,5 s
const nojo    = reagir(zePersonagem, "fedor",  { inicio: 6.0, duracao: 1.8 });
const motorOn = criarEfeito("barulho", { alvo: motor, texto: "RRR-RRR!", inicio: 9.0, duracao: 1.5 });
```

### Passo 3: atualizar em todo quadro, DEPOIS da pose normal

```js
desenhar = (t) => {
  zePersonagem.pose("parado").emocao("neutro");   // 1) pose e emoção normais do roteiro
  cansaco.atualizar(t);                   // 2) reações: dentro da janela, trocam pose, emoção, efeitos e tremor
  nojo.atualizar(t);
  motorOn.atualizar(t);
  zePersonagem.atualizar(t);                      // 3) piscada e respiração
  renderer.render(cena, camera);
};
```

A ordem importa. Se a reação vier antes da pose normal, a pose normal apaga a reação.

---

## 3. Opções

### `reagir(zePersonagem, nome, opcoes)`

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `inicio` | 0 | Segundo em que a reação começa |
| `duracao` | infinito | Quanto tempo dura (entra com fade de 0,12 s e sai com 0,2 s) |
| `pose` | `true` | `false` mantém a pose atual do Zé (por exemplo, suar enquanto pedala) |
| `transicao` | 0,4 | Segundos para entrar e sair da reação, partindo da pose e emoção atuais |
| `escala` | 1 | Tamanho dos efeitos (1,3 = 30% maior) |

### `criarEfeito(nome, opcoes)`

| Opção | O que faz |
| --- | --- |
| `alvo` | **Obrigatório.** Onde o efeito fica preso: `zePersonagem.juntas.cabeca`, um objeto da cena, uma peça do motor… |
| `posicao` | `[x, y, z]` em relação ao alvo (cada efeito já tem um padrão para a cabeça do Zé) |
| `inicio`, `duracao`, `escala` | Iguais aos da reação |
| `texto` | Só em `barulho`: a onomatopeia |
| `cor` | Em `barulho`, `forca` e `fumaca`: troca a cor |

**Efeitos disponíveis:** `suor`, `lagrima`, `fedor`, `vapor`, `veia`, `ideia`, `duvida`, `sono`, `susto`, `tonto`, `brilho`, `frio`, `barulho`, `forca`, `fumaca`.

### `tremer(objeto, t, intensidade, frequencia)`

Faz qualquer objeto tremer: o Zé com medo, uma máquina ligada ou uma panela fervendo.
Chame em todo quadro durante o tremor e `pararTremor(objeto)` quando acabar.
Intensidades: leve `0.01`, médio `0.02`, forte `0.04`.

---

## 4. Onomatopeias (barulho) — lista do canal

| Som | Texto | Cor sugerida |
| --- | --- | --- |
| Motor ligando ou girando | `RRR-RRR!` | laranja (padrão) |
| Explosão | `BUM!` | `CORES_EFEITO.raiva` |
| Relógio, tempo passando | `TIC TAC` | `CORES_EFEITO.branco` |
| Carro passando | `VRUUM!` | laranja |
| Elétrico, zumbido | `BZZZ` | `CORES_EFEITO.ciano` |
| Botão, interruptor | `CLICK!` | branco |
| Ar ou vapor escapando | `PSSSS` | branco |
| Água pingando | `PLIC` | `CORES_EFEITO.suor` |
| Alarme | `BIP BIP!` | raiva |
| Batida, pancada | `PÁ!` | amarelo |
| Algo quebrando | `CRACK!` | branco |

Regras: a onomatopeia sempre **perto da fonte do som** (no motor, não no Zé), dura de 0,8 a 1,5 s e entra junto com o efeito sonoro de verdade, se houver.

```js
criarEfeito("barulho", { alvo: motor, posicao: [0, 0.8, 0], texto: "BUM!", cor: CORES_EFEITO.raiva, inicio: 4, duracao: 1 });
```

---

## 5. Boas práticas (o que deixa igual aos vídeos de referência)

1. **Exagerar.** Efeito pequeno não é percebido no celular. Use `escala` de 1,2 a 1,5 em planos abertos.
2. **Um sentimento por vez.** No máximo uma reação ativa no Zé. Efeitos em objetos (fumaça, barulho) podem acontecer junto.
3. **Duração:** reação de 1,2 a 2,5 s. Menos que 0,8 s ninguém vê; mais que 3 s cansa.
4. **Sincronia:** a reação começa **na palavra** da narração (o tempo vem da transcrição da voz).
5. **Câmera:** durante uma reação, aproxime o rosto (close de 0,5 a 1 s), como a referência faz no "rosto triste".
6. **Emoção combina com o efeito:** suor com rosto alegre confunde. Use as reações prontas ou siga a tabela da seção 1.
7. **Fedor e fumaça saem do objeto,** não do Zé. Para fedor de uma comida: `criarEfeito('fedor', { alvo: comida })` e, no Zé, `reagir(zePersonagem, 'fedor')` (que tapa o nariz).
8. **Não cobrir o rosto:** efeitos de cima (`ideia`, `duvida`, `susto`, `barulho`) ficam acima da cabeça. Se a câmera estiver muito perto, eles podem sair do quadro: afaste a câmera ou use `posicao` mais baixa.
9. **Texto da tela e efeito juntos:** se a palavra-chave da legenda for "FEDOR", o efeito de fedor aparece na mesma hora.

---

## 6. Criar um efeito novo

1. Abra `kit/efeitos/efeitos.js`.
2. Em `DESENHOS`, crie a figurinha em canvas, no estilo do canal: contorno `C.tinta` grosso por baixo e cor por cima (use a função `pintar`).
3. Em `CATALOGO`, crie a função `meuEfeito(g, o)`. Ela adiciona figurinhas com `poe(g, figurinha(...))` e devolve `(u, k) => { ... }`, que posiciona, escala e muda a opacidade **só a partir de `u`** (segundos desde o início). Nada de `Math.random()` ou `Date.now()`.
4. Opcional: adicione uma reação em `REACOES` (emoção + pose + lista de efeitos + tremor).
5. Inclua o nome em `REACOES` dentro de `ferramentas/gerar_referencias.py` e rode `python ferramentas/gerar_referencias.py` para atualizar a folha 05.
6. Teste com `npx hyperframes snapshot` em 3 momentos do efeito (começo, meio e fim).

---

## 7. Poses e emoções novas no Zé (usadas pelas reações)

- **Poses:** `taparNariz`, `cocarCabeca`, `ideia`, `frio`.
- **Emoções:** `nojo` (olhos semicerrados e sobrancelhas franzidas), `tonto` (olhos em X).

Também podem ser usadas sozinhas: `zePersonagem.pose('cocarCabeca').emocao('tonto')`.

---

## 8. Checklist de efeitos antes do render

- [ ] Nenhuma pose, emoção, objeto, cor ou câmera muda em um único quadro (tudo misturado em 0,25 s ou mais).
- [ ] Toda sensação, som ou cheiro citado na narração tem um efeito visual.
- [ ] O efeito começa na palavra certa (confira com a transcrição).
- [ ] Nenhum efeito cobre o rosto do Zé nem sai do quadro.
- [ ] Onomatopeias ficam perto da fonte do som.
- [ ] No máximo uma reação ativa no Zé por vez.
- [ ] `prepararEfeitos()` foi aguardado antes de criar efeitos de texto.
- [ ] Snapshot conferido no começo, meio e fim de cada efeito.

## Contorno toon universal

Peça nova sai **sem contorno preto** (receita: sem contorno 3D; só textos têm traço). `criarPeca` segue em uso por cenários antigos: em peça nova, use `contorno: false`.

`kit/efeitos/contorno-toon.js` exporta `criarPeca(geometria, material)` e `criarCasca(geometria)`. Ambos usam casca invertida #1d1b2a; `criarPeca` disponibiliza `userData.malha` e `userData.casca` para transparência. O cenário de lavanderia usa o mesmo helper. Para poses, `ze.apontarPara(alvo, { lado: 'E', intensidade: 1 })` recebe um `THREE.Vector3` em coordenadas de mundo ou um `Object3D`. Reaplique uma pose-base a cada quadro antes de chamar o método para obter busca determinística.

## Nome e explicação sobre a peça

Padrão desde a receita v3.0. `kit/efeitos/rotulos-peca.js` mantém os textos presos à peça em 2D, sem plano 3D (B47).

```html
<div class="clip" data-start="15.3" data-duration="1.7" data-track-index="3"><div class="apv-nome" data-ancora="vala">Vala</div></div>
<div class="clip" data-start="10.1" data-duration="1.5" data-track-index="3"><div class="apv-ancorado" data-ancora="vala" style="--cor-pilula:var(--cor-positivo)"><i class="apv-haste"></i><i class="apv-ponto"></i><div class="apv-pilula apv-pilula--ok">Sem buraco</div></div></div>
```

```js
const rotulos={vala};
posicionarRotulos(nome=>rotulos[nome]?projetarPeca(rotulos[nome],camera):null); // depois do render, em todo quadro
destacarPeca(vala, t, {t0: W(3,'essa'), dur: 1.1, pulsos: 2});
```

`destacarPeca` aceita um grupo e acende o objeto inteiro; cada pulso nasce e volta à cor original. Em peça já amarela, use `cor: '#ffffff'`: amarelo sobre amarelo não aparece. `projetarPeca` devolve posição e inclinação de até 12°. `data-fixo="x,y"` no lugar de `data-ancora` fixa uma pílula na tela. Tempo e aparência ficam na timeline de `index.modelo.html`.

Ponto de partida da base estádio: destaque e nome começam em "Essa é…", antes da palavra. O produtor pode decidir outro momento.

## Destaque temporário e rótulo em perspectiva (rótulo obsoleto)

`rotuloEmPerspectiva` segue no kit só para vídeos antigos (B47); use `.apv-nome` nos novos.

Importe `destacarPeca` e `rotuloEmPerspectiva` de `kit/efeitos/destaque-peca.js` e chame ambos em **todo quadro**, inclusive fora da janela. Exemplo:

```js
destacarPeca(peca, t, {t0: 12, dur: 1, pulsos: 2});
rotuloEmPerspectiva(peca, 'VIGA', t, {t0: 12, dur: 1, camera});
```

O padrão `--cor-destaque` é resolvido no CSS da composição; `cor` também aceita uma cor hexadecimal do Three.js. O destaque faz a própria peça acender em amarelo com 2 pulsos (`pulsos`), não é contorno: no 1º uso cada malha ganha um clone do material (não vaza cor para malhas que compartilham material), `emissive` + `color` vão para a cor e voltam EXATAMENTE aos valores originais fora da janela; materiais sem `emissive` (MeshBasic) só têm o `color` misturado. Malhas `BackSide` (contorno escuro) são ignoradas e continuam escuras. O rótulo usa a face local superior (+Y); a câmera opcional inclina o plano em até 15°, e o plano é elevado para manter todos os seus cantos acima da face. O canvas é dimensionado pelo texto medido. Para outra face, organize a peça num grupo com o eixo +Y orientado para a face desejada. A janela é determinada por `t0` e `dur`; fora dela os elementos auxiliares são removidos da cena e guardados para reutilização. Instancie a peça antes de chamar e não use esse efeito em geometria dinâmica que muda após a primeira chamada.

Cada chamada registra a janela na peça; após registradas, qualquer chamada recalcula todas as janelas para o tempo informado, inclusive em seeks reversos. Para seeks diretos, chame todos os eventos no primeiro quadro. Se janelas se sobrepõem, prevalece a de início mais recente (desempate determinístico). Não altere a programação de janelas durante a reprodução. Cascas e rótulos usam `userData.ignorarCamera` e devem ser excluídos do cálculo de enquadramento.

Na partitura, habilite olhar antecipado com `olhar: { alvo: "nome-do-alvo", antecede: 0.25 }` no take do gesto; `alvo` é opcional quando o take já define seu alvo.

## Pulso amarelo automático (`criarDestaques`)

A peça acende em amarelo na palavra falada, sem código por vídeo. Em `takes.json`, `destaque: [["alvo", "palavra"], ...]` (alvo = chave de `alvos`); sem `destaque`, cada item de `termos` acende o `alvo` do take. `gerar_partitura.py` acha a palavra nas frases do take (erro se faltar) e grava `[alvo, palavra, frase]`. `criarMontagem({..., tempos})` registra tudo e chama `atualizar(t)` depois dos animadores; sem `tempos` não há destaque, e alvo ausente é erro. Janela: início da palavra, 0,7–1,1 s, 2 pulsos, `--cor-destaque`. Uso manual: `criarDestaques(tempos)` devolve `{destacar(pecas, frase, palavra, k=0), atualizar(t)}`. Take com `termos` mas sem `alvo` não acende nada.

## Montagem por unidades, crescimento e raio-X

Importe `montarPorUnidades`, `crescerPeca` e `camadaTranslucida` de `montagem-unidades.js` e chame cada evento em cada seek, inclusive fora de sua janela. Os eventos ficam registrados por objeto; o evento iniciado mais recentemente prevalece. Cadastre todos os eventos antes de depender de seek arbitrário.

- `montarPorUnidades(grupo, t, {t0, dur, ordem, easing})`: filhos em ordem `baixo-cima` (padrão), `perimetro` (ângulo e altura) ou `indice`; escala de 90% à pose original em até 0,12 s, distribuída na duração. Easing aceita `linear`, `sine.inOut` ou função de 0 a 1. Preserve os filhos e suas poses enquanto o efeito estiver em uso; a pose inicial é capturada na primeira chamada.
- `crescerPeca(peca, t, {eixo: 'y', t0, dur: 1.2, de: 0.02})`: escala a partir da face mínima local, preservando posição e escala originais ao terminar. Aceita `x`, `y`, `z`; calcula a geometria da peça e seus descendentes na primeira chamada.
- `camadaTranslucida(peca, t, {t0, dur: 1.6, opacidade: 0.25})`: usa clones dos materiais durante o intervalo, com transições de 0,3 s (encurtadas em janelas menores), e restaura a referência original fora dele. A opacidade multiplica a opacidade original; materiais compartilhados não são alterados.

Teste: `python ferramentas/test_montagem.py` (Chromium/Playwright instalado; grava PNGs novos em `conferencias/visual-montagem/`, sem sobrescrever).
