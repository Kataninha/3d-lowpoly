/**
 * ZÉ — mascote oficial do canal Mundo100Manual
 * ------------------------------------------------------------
 * Técnico adulto, boneco articulado em 3D (proporção de ~4 cabeças).
 * Módulo Three.js reutilizável em TODOS os vídeos.
 * Nunca redesenhe o Zé dentro de um vídeo: importe este arquivo.
 *
 * Uso básico:
 *   import { criarZe, luzPadrao } from './personagens/ze/ze.js';
 *   const zePersonagem = criarZe();
 *   cena.add(zePersonagem.raiz);
 *   zePersonagem.pose('acenar').emocao('feliz');
 *   zePersonagem.atualizar(tempo);   // piscada e respiração, sempre pelo tempo do vídeo
 *
 * v4 (referência: fotos do usuário, 2026-11-06):
 *   - Corpo oval cheio, cabeça larga AFUNDADA no corpo (sem pescoço), ombros esféricos
 *   - Camisa AZUL (padrão) e calça jeans; trocar roupa só por pedido: criarZe({ camisa: 0x... })
 *   - Braços finos, mãos de bloco (cor da pele), sapato preto
 *   - Rosto: olhos redondos, sobrancelha grossa, boca pequena e expressiva; capacete amarelo completo
 *   - Low poly (faces chapadas) sem contorno. Mesma API da v3.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ============================================================
// 1. IDENTIDADE (cores e medidas oficiais)
// ============================================================
export const PALETA = Object.freeze({
  pele: 0xe2a77c,         // pêssego queimado; a ref parece clara só pela luz
  nariz: 0xc98560,
  camisa: 0x2f7be0,         // azul: cor padrão da roupa
  calca: 0x4a78b5,          // jeans
  macacao: 0x16858c,
  macacaoEscuro: 0x0f6a70,
  laranja: 0xff7a1a,
  bota: 0x16151f,
  sapato: 0x16151f,
  capacete: 0xf5c518,
  capaceteEscuro: 0xe0a812,
  cabelo: 0x17110d,
  sobrancelha: 0x1f1612,
  barba: 0x3a2a22,
  lente: 0x7ff3ff,
  cinto: 0x4a3426,
  metal: 0xc9d1d9,
  boca: 0xc0352d,          // interior vermelho do sorriso aberto
  labio: 0x6b1d1d,
  lingua: 0xff8f8f,
  contorno: 0x1d1b2a,
  branco: 0xffffff,
});

export const MEDIDAS = Object.freeze({
  coxa: 0.80,
  canela: 0.80,
  alturaQuadril: 1.78,        // pés encostam no chão (y = 0)
  alturaTronco: 1.62,
  pescoco: 0,
  cabeca: [0.88, 0.84, 0.84],
  larguraOmbro: 0.56,
  larguraQuadril: 0.25,
  braco: [0.62, 0.60],
  contorno: 0,
  alturaTotal: 4.22,          // do chão ao topo do cabelo
  alturaRosto: 3.74,          // centro do rosto (para câmera de close)
});

// ============================================================
// 2. MATERIAIS (sombreado suave + contorno fino)
// ============================================================
const cacheMateriais = new Map();
function material(cor, tipo = 'suave') {
  const chave = `${tipo}-${cor}`;
  if (!cacheMateriais.has(chave)) {
    const m = tipo === 'luz'
      ? new THREE.MeshBasicMaterial({ color: cor, side: THREE.DoubleSide })
      : new THREE.MeshStandardMaterial({ color: cor, roughness: 0.78, metalness: 0, flatShading: true });
    cacheMateriais.set(chave, m);
  }
  return cacheMateriais.get(chave);
}

// Contorno por "casca invertida": a peça é desenhada de novo, um pouco maior,
// só pelo lado de dentro e na cor escura. Funciona em qualquer ângulo.
const cacheContornos = new Map();
function materialContorno(espessura) {
  if (!cacheContornos.has(espessura)) {
    cacheContornos.set(espessura, new THREE.ShaderMaterial({
      uniforms: { espessura: { value: espessura }, cor: { value: new THREE.Color(PALETA.contorno) } },
      vertexShader: `
        uniform float espessura;
        void main() {
          vec3 p = position + normal * espessura;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 cor;
        void main() { gl_FragColor = vec4(cor, 1.0); }`,
      side: THREE.BackSide,
    }));
  }
  return cacheContornos.get(espessura);
}

// ============================================================
// 3. FORMAS BÁSICAS
// ============================================================
const caixa = (l, a, p, r = 0.1) =>
  new RoundedBoxGeometry(l, a, p, 2, Math.min(r, l / 2 - 0.001, a / 2 - 0.001, p / 2 - 0.001));
const capsula = (r, c) => new THREE.CapsuleGeometry(r, c, 6, 16);
const cilindro = (r, a, s = 10) => new THREE.CylinderGeometry(r, r, a, s);
const esfera = (r, w = 10, h = 7) => new THREE.SphereGeometry(r, w, h);
const arco = (r, tubo, ang) => new THREE.TorusGeometry(r, tubo, 10, 28, ang);

/** Cria uma peça (com contorno) e a pendura no grupo pai. */
function peca(geo, cor, pai, pos = [0, 0, 0], rot = [0, 0, 0], opcoes = {}) {
  const { luz = false, contorno = MEDIDAS.contorno } = opcoes;
  const grupo = new THREE.Group();
  grupo.add(new THREE.Mesh(geo, material(cor, luz ? 'luz' : 'suave')));
  // v2: sem cascas de contorno, inclusive op??es herdadas da v1.
  grupo.position.set(...pos);
  grupo.rotation.set(...rot);
  pai.add(grupo);
  return grupo;
}
const semContorno = { luz: true, contorno: 0 };

function articulacao(pai, pos = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...pos);
  pai.add(g);
  return g;
}

// ============================================================
// 4. POSES (rotações em radianos de cada articulação)
//    E = lado esquerdo do Zé (direita de quem olha). D = direito.
//    x negativo = leva para a frente · z positivo (E) / negativo (D) = abre para o lado
//    joelho: x positivo dobra a perna para trás
// ============================================================
export const POSES = {
  parado: {},
  bra\u00e7osAbertos: { ombroE: [0, 0, 1.45], ombroD: [0, 0, -1.45], cotoveloE: [0, 0, 0], cotoveloD: [0, 0, 0] },
  acenar: {
    ombroE: [0, 0, 2.45], cotoveloE: [0, 0, 0.6], cabeca: [0, 0, -0.08],
  },
  apontar: {
    ombroD: [-1.45, 0, -0.2], cotoveloD: [-0.05, 0, 0], cabeca: [0, -0.2, 0],
  },
  apontarE: { ombroE: [0, 0, 1.25], cotoveloE: [0, 0, 0] },
  apontarD: { ombroD: [0, 0, -1.25], cotoveloD: [0, 0, 0] },
  explicar: {
    ombroE: [-0.5, 0, 0.4], cotoveloE: [-1.1, 0, 0],
    ombroD: [-0.4, 0, -0.35], cotoveloD: [-1.0, 0, 0], cabeca: [0, 0, 0.05],
  },
  pensar: {
    ombroD: [-0.8, 0, 0.45], cotoveloD: [-2.3, 0, 0],
    ombroE: [-0.4, 0, -0.3], cotoveloE: [-1.5, 0, 0],
    cabeca: [-0.06, 0, 0.12],
  },
  maosNaCabeca: { ombroE: [0, 0, 2.45], cotoveloE: [0, 0, 1.45], ombroD: [0, 0, -2.45], cotoveloD: [0, 0, -1.45] },
  comemorar: {
    ombroE: [0, 0, 2.7], cotoveloE: [0, 0, 0.3],
    ombroD: [0, 0, -2.7], cotoveloD: [0, 0, -0.3],
    cabeca: [-0.15, 0, 0],
  },
  segurar: {
    ombroE: [-1.0, 0, -0.1], cotoveloE: [-0.5, 0, 0],
    ombroD: [-1.0, 0, 0.1], cotoveloD: [-0.5, 0, 0],
  },
  susto: {
    ombroE: [-0.2, 0, 1.3], cotoveloE: [0, 0, 1.35],
    ombroD: [-0.2, 0, -1.3], cotoveloD: [0, 0, -1.35],
    tronco: [-0.06, 0, 0], cabeca: [-0.1, 0, 0],
  },
  cansado: {
    tronco: [0.16, 0, 0], cabeca: [0.22, 0, 0],
    ombroE: [0.12, 0, 0.04], ombroD: [0.12, 0, -0.04], cotoveloE: [0, 0, 0], cotoveloD: [0, 0, 0],
  },
  taparNariz: {
    ombroD: [-1.12, 0, 0.82], cotoveloD: [-2.05, 0, 0],
    ombroE: [-0.25, 0, 0.1], cabeca: [0.05, 0.15, 0], tronco: [-0.04, 0, 0],
  },
  cocarCabeca: {
    ombroE: [0, 0, 2.25], cotoveloE: [0, 0, 1.75], cabeca: [0, 0, 0.12],
  },
  ideia: {
    ombroE: [0, 0, 2.8], cotoveloE: [0, 0, 0.1], cabeca: [-0.12, 0, 0],
  },
  frio: {
    ombroE: [-0.95, 0, -0.35], cotoveloE: [-1.55, 0, 0],
    ombroD: [-0.85, 0, 0.35], cotoveloD: [-1.6, 0, 0],
    tronco: [0.08, 0, 0], cabeca: [0.08, 0, 0],
  },
  andar: {
    pernaE: [-0.42, 0, 0], joelhoE: [0.25, 0, 0],
    pernaD: [0.32, 0, 0], joelhoD: [0.45, 0, 0],
    ombroE: [0.35, 0, 0.1], ombroD: [-0.35, 0, -0.1],
    cotoveloE: [-0.3, 0, 0], cotoveloD: [-0.4, 0, 0],
  },
};

// Base aplicada antes de toda pose (braços levemente abertos e dobrados)
const POSE_BASE = {
  raiz: [0, 0, 0], tronco: [0, 0, 0], cabeca: [0, 0, 0],
  ombroE: [0, 0, 0.12], cotoveloE: [-0.15, 0, 0], pulsoE: [0, 0, 0],
  ombroD: [0, 0, -0.12], cotoveloD: [-0.15, 0, 0], pulsoD: [0, 0, 0],
  pernaE: [0, 0, 0], joelhoE: [0, 0, 0], pernaD: [0, 0, 0], joelhoD: [0, 0, 0],
};

// ============================================================
// 5. EMOÇÕES
// ============================================================
export const EMOCOES = {
  neutro:    { olhos: 'abertos', escalaOlho: 1.0,  sobr: [-0.06, 0.00], semSobr: true, boca: 'aberta', escalaBoca: 1.0 },
  feliz:     { olhos: 'abertos', escalaOlho: 1.0,  sobr: [-0.1, 0.02],  semSobr: true, boca: 'aberta', escalaBoca: 1.12 },
  empolgado: { olhos: 'fechadosFelizes',           sobr: [-0.14, 0.05], semSobr: true, boca: 'aberta',  escalaBoca: 1.0 },
  surpreso:  { olhos: 'abertos', escalaOlho: 1.25, sobr: [-0.04, 0.06], boca: 'o',       escalaBoca: 1.0 },
  triste:    { olhos: 'abertos', escalaOlho: 0.9,  sobr: [-0.36, 0.03], boca: 'triste',  escalaBoca: 0.9 },
  bravo:     { olhos: 'abertos', escalaOlho: 0.85, sobr: [0.4, -0.03],  boca: 'reta',    escalaBoca: 1.0 },
  cansado:   { olhos: 'meio',                      sobr: [-0.22, -0.02], boca: 'reta',   escalaBoca: 0.8 },
  pensativo: { olhos: 'abertos', escalaOlho: 0.95, sobr: [-0.08, 0.0], sobrAssimetrica: 0.06, boca: 'lado', escalaBoca: 1.0 },
  nojo:      { olhos: 'meio',                      sobr: [0.3, -0.03], boca: 'triste',  escalaBoca: 1.1 },
  tonto:     { olhos: 'x',                         sobr: [-0.2, 0.04], boca: 'o',       escalaBoca: 0.9 },
  preocupado:{ olhos: 'abertos', escalaOlho: 1.05, sobr: [-0.3, 0.03],  boca: 'triste',  escalaBoca: 0.8 },
  // ---- Catálogo de expressões (2026-11-06). olhos aceita [esquerdo, direito] para piscadinha. ----
  sorridente:  { olhos: 'abertos', escalaOlho: 1.0,  sobr: [-0.08, 0.02], semSobr: true, boca: 'sorrisao', escalaBoca: 1.0 },
  gargalhada:  { olhos: 'fechadosFelizes',           sobr: [-0.16, 0.06], boca: 'grande',  escalaBoca: 1.0 },
  risoDentes:  { olhos: 'abertos', escalaOlho: 1.0,  sobr: [-0.12, 0.05], boca: 'dentes',  escalaBoca: 1.3 },
  safado:      { olhos: 'meio',                      sobr: [0.12, 0.0], sobrAssimetrica: 0.07, boca: 'lado', escalaBoca: 1.15 },
  piscadinha:  { olhos: ['fechadosFelizes', 'abertos'], escalaOlho: 1.0, sobr: [-0.1, 0.03], boca: 'sorrisao', escalaBoca: 1.0 },
  lingua:      { olhos: 'abertos', escalaOlho: 1.0,  sobr: [-0.12, 0.04], boca: 'lingua',  escalaBoca: 1.0 },
  desconfiado: { olhos: 'meio',                      sobr: [0.18, -0.01], sobrAssimetrica: 0.06, boca: 'reta', escalaBoca: 0.8 },
  espantado:   { olhos: 'abertos', escalaOlho: 1.4,  sobr: [-0.04, 0.09], boca: 'o',       escalaBoca: 1.3 },
  chocado:     { olhos: 'abertos', escalaOlho: 1.5,  sobr: [-0.02, 0.11], boca: 'gritando', escalaBoca: 0.75 },
  gritando:    { olhos: 'abertos', escalaOlho: 0.9,  sobr: [0.3, -0.02],  boca: 'gritando', escalaBoca: 1.1 },
  furioso:     { olhos: 'abertos', escalaOlho: 0.8,  sobr: [0.55, -0.04], boca: 'dentesApertados', escalaBoca: 1.0 },
  medo:        { olhos: 'abertos', escalaOlho: 1.25, sobr: [-0.45, 0.07], boca: 'ondulada', escalaBoca: 1.0 },
  nervoso:     { olhos: 'abertos', escalaOlho: 1.0,  sobr: [-0.25, 0.03], boca: 'ondulada', escalaBoca: 0.8 },
  chorando:    { olhos: 'meio',                      sobr: [-0.45, 0.02], boca: 'triste',  escalaBoca: 1.25 },
  bocejando:   { olhos: 'meio',                      sobr: [-0.15, -0.01], boca: 'gritando', escalaBoca: 0.8 },
  encantado:   { olhos: 'abertos', escalaOlho: 1.2,  sobr: [-0.1, 0.05],  boca: 'sorrisao', escalaBoca: 1.1 },
  convencido:  { olhos: 'meio',                      sobr: [-0.02, 0.07], boca: 'sorrisao', escalaBoca: 1.1 },
  concentrado: { olhos: 'abertos', escalaOlho: 0.85, sobr: [0.2, -0.02],  boca: 'reta',    escalaBoca: 0.6 },
  duvida:      { olhos: 'abertos', escalaOlho: 1.0,  sobr: [-0.1, 0.0], sobrAssimetrica: 0.1, boca: 'lado', escalaBoca: 0.9 },
  aliviado:    { olhos: 'fechadosFelizes',           sobr: [-0.22, 0.03], boca: 'sorriso', escalaBoca: 0.9 },
};


// ============================================================
// 6. CRIAÇÃO DO ZÉ
// ============================================================
export function criarZe({ capacete: capaceteInicial = false, camisa: corCamisa = PALETA.camisa, calca: corCalca = PALETA.calca } = {}) {
  const P = PALETA, M = MEDIDAS;
  const camisa = corCamisa;
  const calca = corCalca;
  const [cL, cA, cP] = M.cabeca;

  // ---------- esqueleto ----------
  const raiz = new THREE.Group();
  raiz.name = 'Zé';
  const quadril = articulacao(raiz, [0, M.alturaQuadril, 0]);
  const tronco = articulacao(quadril);
  const pescoco = articulacao(tronco, [0, M.alturaTronco, 0]);
  const cabeca = articulacao(pescoco, [0, -0.12, -0.02]);   // encaixada no topo do corpo no corpo
  const cabecaVisual = articulacao(cabeca, [0, cA / 2, 0]);
  const ombroE = articulacao(tronco, [M.larguraOmbro + 0.02, M.alturaTronco - 0.24, 0]);
  const ombroD = articulacao(tronco, [-M.larguraOmbro - 0.02, M.alturaTronco - 0.24, 0]);
  const pernaE = articulacao(quadril, [M.larguraQuadril, 0, 0]);
  const pernaD = articulacao(quadril, [-M.larguraQuadril, 0, 0]);

  // ---------- tronco (ovo cheio, camisa) ----------
  // Seção superelíptica; perfil de ovo: fundo oval, maior largura em YM, topo em cúpula.
  // Dimensões reais: nada de escala no grupo, porque atualizar() mexe em corpo.scale.y.
  const corpo = articulacao(tronco);
  const TOPO = 1.62, A = 0.52, B = 0.38, N = 2.4, YM = 0.80;
  const sec = (y) => y <= YM
    ? 0.46 + 0.54 * Math.pow(Math.max(0, 1 - Math.pow((YM - y) / YM, 2.1)), 1 / 2.1)
    : Math.pow(Math.max(0, 1 - Math.pow((y - YM) / (TOPO - YM), 3.4)), 1 / 3.4);   // topo mais reto, cantos arredondados
  const sp = (a, b, ang) => [a * Math.sign(Math.cos(ang)) * Math.abs(Math.cos(ang)) ** (2 / N),
    b * Math.sign(Math.sin(ang)) * Math.abs(Math.sin(ang)) ** (2 / N)];
  function faixa(ys, escala = 1, tampas = false) {
    const g = new THREE.BufferGeometry(), v = [], idx = [], S = 28;
    ys.forEach((y) => { const s = sec(y) * escala; for (let i = 0; i <= S; i++) { const [x, z] = sp(A * s, B * s, 2 * Math.PI * i / S); v.push(x, y, z); } });
    for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < S; i++) {
      const a = j * (S + 1) + i, b = a + S + 1; idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    if (tampas) [0, ys.length - 1].forEach((j) => {
      const c = v.length / 3; v.push(0, ys[j], 0);
      for (let i = 0; i < S; i++) { const a = j * (S + 1) + i; idx.push(...(j === 0 ? [c, a, a + 1] : [c, a + 1, a])); }
    });
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  peca(faixa([0, 0.05, 0.14, 0.27, 0.42, 0.6, YM, 0.98, 1.14, 1.28, 1.4, 1.5, 1.57, TOPO], 1, true), camisa, corpo);
  // Acessórios da v3 ficam como grupos vazios e ocultos (compatibilidade da API).
  const cinto = articulacao(corpo); cinto.visible = false;
  const bolsinha = articulacao(cinto);
  const chaveDeFenda = articulacao(cinto);

  // ---------- pescoço ----------
  // A cabe?a se apoia diretamente no tronco; a junta permanece para compatibilidade.

  // ---------- cabeça (redonda, low poly) ----------
  // Elipsoide facetado. naCabeca(x, y, folga) devolve o ponto da superfície
  // (um pouco para fora) e o giro (ordem YXZ) que deixa a peça "deitada" na curva.
  const semi = [cL / 2, cA / 2, cP / 2];
  function naCabeca(x, y, folga = 0.012) {
    const power = 2.3;
    const z = semi[2] * Math.pow(Math.max(0, 1 - Math.abs(x / semi[0]) ** power - Math.abs(y / semi[1]) ** power), 1 / power);
    const grad = (v, radius) => Math.sign(v) * Math.pow(Math.abs(v / radius), power - 1) / radius;
    const n = new THREE.Vector3(grad(x, semi[0]), grad(y, semi[1]), grad(z, semi[2])).normalize();
    return {
      pos: [x + n.x * folga, y + n.y * folga, z + n.z * folga],
      rot: [-Math.asin(n.y), Math.atan2(n.x, n.z)],
    };
  }
  const deitar = (g, rx, ry) => { g.rotation.set(rx, ry, 0, 'YXZ'); return g; };
  const elipsoide = (escala, ...fatia) => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const pos = g.attributes.position;
    const arredondar = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.8);
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i,
      arredondar(pos.getX(i)) * semi[0] * escala,
      arredondar(pos.getY(i)) * semi[1] * escala,
      arredondar(pos.getZ(i)) * semi[2] * escala);
    g.computeVertexNormals();
    return g;
  };
  peca(elipsoide(1), P.pele, cabecaVisual);
  // Cabelo: capacete de blocos marrons (topo reto, franja reta, laterais e nuca caindo), como na referência.
  const cabelo = articulacao(cabecaVisual);
  cabelo.name = 'cabelo';
  // Cabelo em peça única (corte tigela): superfície da própria cabeça, inflada no topo (volume) e
  // colada na borda; a borda dobra para dentro e forma uma franja grossa e redonda. Sem emendas.
  const cabeloGeo = (() => {
    const AN = 40, AN_TH = 12, TH = 1.47, INC = -0.22, v = [], idx = [];
    const arred = (t) => Math.sign(t) * Math.pow(Math.abs(t), 0.87);
    const [c, sn] = [Math.cos(INC), Math.sin(INC)];
    const ponto = (th, ph, f) => {
      const x = Math.sin(th) * Math.cos(ph), y0 = Math.cos(th), z0 = Math.sin(th) * Math.sin(ph);
      const y = y0 * c - z0 * sn, z = y0 * sn + z0 * c;   // giro em x: borda alta na testa, baixa na nuca
      const q = (t) => Math.sign(t) * Math.pow(Math.abs(t), 0.62);   // cabelo mais quadrado: topo chato, cantos redondos
      v.push(q(x) * semi[0] * f * 1.17, arred(y) * semi[1] * f, q(z) * semi[2] * f);
    };
    const borda = (ph) => TH + 0.17 * Math.cos(2 * ph) + 0.16 * Math.pow(Math.max(0, Math.sin(ph)), 6) * 2.1;   // laterais até a orelha; franja reta na frente
    for (let j = 0; j <= AN_TH + 1; j++) for (let i = 0; i <= AN; i++) {
      const ph = 2 * Math.PI * i / AN, t = Math.min(j, AN_TH) / AN_TH;
      // anéis 0..AN_TH: casca externa (volume no topo, 1,05 na borda); último anel: dobra para dentro da cabeça
      const f = j <= AN_TH ? 1.05 + 0.12 * (1 - t * t * t) : 0.96;
      ponto(borda(ph) * (j <= AN_TH ? t : 1.0), ph, f);
    }
    for (let j = 0; j <= AN_TH; j++) for (let i = 0; i < AN; i++) {
      const a = j * (AN + 1) + i, b = a + AN + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  })();
  peca(cabeloGeo, P.cabelo, cabelo);
  const capacete = articulacao(cabecaVisual);
  capacete.name = 'capacete';
  const casco = peca(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), P.capacete, capacete, [0, 0.37, 0]);
  casco.scale.set(cL * 0.66, cA * 0.56, cP * 0.64);
  // Cabelo preto sob o capacete: calota colada na cabeça, desce até a altura das sobrancelhas (como na referência).
  const cabeloSob = peca(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, 1.38), P.sobrancelha, capacete, [0, 0, 0]);
  cabeloSob.scale.set(cL * 0.58, cA * 0.57, cP * 0.57);
  const abaCapacete = peca(cilindro(1, 0.06, 18), P.capaceteEscuro, capacete, [0, 0.35, 0.10]);   // aba em volta, maior na frente
  abaCapacete.scale.set(cL * 0.66, 1, cP * 0.72);   // aba só sobra na frente (viseira)
    capacete.visible = false;
  // orelhas
  [1, -1].forEach((l) => peca(esfera(0.095, 10, 7), P.pele, cabecaVisual, [l * (cL / 2 + 0.045), -0.03, 0.0]));
  // Grupo vazio mantém a compatibilidade de acessorios.oculos com os projetos existentes.
  const oculos = articulacao(cabecaVisual);
  oculos.name = 'oculos-removidos';
  oculos.visible = false;

  // ---------- rosto ----------
  const zRosto = cP / 2 + 0.006, yOlhos = 0.04, xOlhos = 0.165, ySobr = yOlhos + 0.11;
  const rosto = articulacao(cabecaVisual);
  const olhos = {}, sobrancelhas = {};
  [['E', 1], ['D', -1]].forEach(([nome, lado]) => {
    const pOlho = naCabeca(lado * xOlhos, yOlhos);
    const grupo = deitar(articulacao(rosto, pOlho.pos), pOlho.rot[0], pOlho.rot[1]);
    const aberto = peca(esfera(0.066), P.contorno, grupo, [0, 0, 0], [0, 0, 0], semContorno);
    peca(esfera(0.02), P.branco, aberto, [0.022, 0.03, 0.052], [0, 0, 0], semContorno);
    const fechadoFeliz = peca(arco(0.05, 0.016, Math.PI), P.contorno, grupo, [0, -0.015, 0], [0, 0, 0], semContorno);
    const meio = peca(caixa(0.11, 0.035, 0.02, 0.015), P.contorno, grupo, [0, -0.02, 0], [0, 0, 0], semContorno);
    const x = articulacao(grupo);
    peca(caixa(0.13, 0.03, 0.02, 0.012), P.contorno, x, [0, 0, 0], [0, 0, Math.PI / 4], semContorno);
    peca(caixa(0.13, 0.03, 0.02, 0.012), P.contorno, x, [0, 0, 0], [0, 0, -Math.PI / 4], semContorno);
    olhos[nome] = { grupo, aberto, fechadoFeliz, meio, x };
    const pSobr = naCabeca(lado * xOlhos, ySobr);
    sobrancelhas[nome] = deitar(peca(caixa(0.18, 0.04, 0.03, 0.018), P.sobrancelha, rosto,
      pSobr.pos, [0, 0, 0], semContorno), pSobr.rot[0], pSobr.rot[1]);
  });

  const pNariz = naCabeca(0, -0.07, 0.025);
  peca(esfera(0.07, 10, 6), P.nariz, rosto, pNariz.pos);
  const pBoca = naCabeca(0, -0.215, 0.016);
  const boca = deitar(articulacao(rosto, pBoca.pos), pBoca.rot[0], pBoca.rot[1]);
  const meiaLua = (R, curva) => {
    const f = new THREE.Shape();
    f.moveTo(-R, 0);
    f.absarc(0, 0, R, Math.PI, 2 * Math.PI, false);
    f.quadraticCurveTo(0, -curva * R, -R, 0);
    return new THREE.ShapeGeometry(f, 20);
  };
  const meioDisco = (R) => new THREE.CircleGeometry(R, 28, Math.PI, Math.PI);   // meio disco (sem fatias finas: a meiaLua deixava riscos)
  const plano = (geo, cor, pai, pos = [0, 0, 0.002], esc = [1, 1, 1]) => {
    // polygonOffset por camada (z da peça): evita z-fighting entre planos sobrepostos da boca
    const mt = material(cor, 'luz').clone(), camada = Math.round(pos[2] * 1000) + 1;
    mt.polygonOffset = true; mt.polygonOffsetFactor = -camada; mt.polygonOffsetUnits = -camada;
    const m = new THREE.Mesh(geo, mt); m.position.set(...pos); m.scale.set(...esc); pai.add(m); return m;
  };
  const bocas = {
    sorriso: peca(arco(0.10, 0.032, Math.PI), P.labio, boca, [0, 0.04, 0], [0, 0, Math.PI], semContorno),
    triste: peca(arco(0.095, 0.034, Math.PI), P.labio, boca, [0, -0.03, 0], [0, 0, 0], semContorno),
    o: peca(arco(0.045, 0.026, Math.PI * 2), P.labio, boca, [0, 0, 0], [0, 0, 0], semContorno),
    reta: peca(caixa(0.15, 0.045, 0.024, 0.02), P.labio, boca, [0, 0, 0], [0, 0, 0], semContorno),
    lado: peca(arco(0.065, 0.024, Math.PI * 0.8), P.labio, boca, [0.045, 0.03, 0], [0, 0, Math.PI * 1.1], semContorno),
    aberta: (() => {
      // Sorriso em meia-lua (como na referência): borda escura grossa e vermelho no miolo; topo curvo.
      const g = articulacao(boca, [0, 0.03, 0]);
      const borda = new THREE.Mesh(meiaLua(0.13, 0.85), material(P.labio, 'luz'));
      const fundo = new THREE.Mesh(meiaLua(0.072, 0.8), material(P.boca, 'luz'));
      fundo.position.set(0, -0.036, 0.002);
      g.add(borda, fundo);   // sem língua, como na referência
      return g;
    })(),
    // ---- bocas do catálogo de expressões ----
    sorrisao: peca(arco(0.115, 0.028, Math.PI), P.labio, boca, [0, 0.075, 0], [0, 0, Math.PI], semContorno),   // contorno grosso, sem preenchimento
    grande: (() => {   // boca aberta larga com língua
      const g = articulacao(boca, [0, 0.05, 0]);
      plano(meioDisco(0.15), P.labio, g, [0, 0, 0.002], [1, 0.95, 1]); plano(meioDisco(0.125), P.boca, g, [0, -0.002, 0.004], [1, 0.9, 1]);
      plano(meioDisco(0.075), P.lingua, g, [0, -0.095, 0.006], [1, 0.55, 1]);
      return g;
    })(),
    dentes: (() => {   // sorriso com fileira de dentes
      const g = articulacao(boca, [0, 0.04, 0]);
      plano(meioDisco(0.14), P.labio, g, [0, 0, 0.002], [1, 0.62, 1]); plano(meioDisco(0.118), P.branco, g, [0, -0.002, 0.004], [1, 0.5, 1]);
      plano(new THREE.PlaneGeometry(0.236, 0.012), P.labio, g, [0, -0.034, 0.006]);
      return g;
    })(),
    lingua: (() => {   // sorriso com língua para fora
      const g = articulacao(boca, [0, 0.04, 0]);
      plano(meiaLua(0.07, 0.9), P.lingua, g, [0, -0.07, 0]);
      plano(new THREE.PlaneGeometry(0.008, 0.07), P.labio, g, [0, -0.095, 0.003]);
      const lab = peca(arco(0.12, 0.034, Math.PI), P.labio, g, [0, 0.02, 0.004], [0, 0, Math.PI], semContorno);
      return g;
    })(),
    gritando: (() => {   // boca vertical aberta (grito, bocejo, choque)
      const g = articulacao(boca, [0, -0.03, 0]);
      plano(new THREE.CircleGeometry(0.1, 20), P.labio, g, [0, 0, 0.001], [1, 1.3, 1]);
      plano(new THREE.CircleGeometry(0.075, 20), P.boca, g, [0, -0.005, 0.003], [1, 1.35, 1]);
      return g;
    })(),
    dentesApertados: (() => {   // careta de raiva, dentes cerrados
      const g = articulacao(boca, [0, 0, 0]);
      plano(new THREE.PlaneGeometry(0.27, 0.13), P.labio, g, [0, 0, 0.001]);
      plano(new THREE.PlaneGeometry(0.245, 0.105), P.branco, g, [0, 0, 0.003]);
      plano(new THREE.PlaneGeometry(0.245, 0.014), P.labio, g, [0, 0, 0.004]);
      [-0.08, 0, 0.08].forEach((x) => plano(new THREE.PlaneGeometry(0.012, 0.105), P.labio, g, [x, 0, 0.004]));
      return g;
    })(),
    ondulada: (() => {   // linha tremida (medo, nervoso)
      const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3((t - 0.5) * 0.26, Math.sin(t * Math.PI * 5) * 0.022, 0)); }
      return peca(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.017, 6), P.labio, boca, [0, -0.01, 0.003], [0, 0, 0], semContorno);
    })(),
  };

  // ---------- braços ----------
  function braco(ombro, lado) {
    const [c1, c2] = M.braco;
    const manga = peca(esfera(0.22, 12, 8), camisa, ombro, [0, -0.02, 0]);   // ombro esférico
    manga.scale.set(1, 0.92, 1);
    peca(cilindro(0.13, c1 - 0.10, 10), P.pele, ombro, [0, -(c1 + 0.10) / 2, 0]);
    const cotovelo = articulacao(ombro, [0, -c1, 0]);
    peca(esfera(0.13, 10, 7), P.pele, cotovelo);
    peca(cilindro(0.125, c2, 10), P.pele, cotovelo, [0, -c2 / 2, 0]);
    const pulso = articulacao(cotovelo, [0, -c2, 0]);
    peca(caixa(0.25, 0.25, 0.22, 0.09), P.pele, pulso, [0, -0.12, 0]);
    peca(caixa(0.08, 0.13, 0.08, 0.03), P.pele, pulso, [lado * -0.14, -0.08, 0.07], [0, 0, lado * 0.4]);
    const mao = articulacao(pulso, [0, -0.2, 0.06]);                                  // ponto para segurar objetos
    return { cotovelo, pulso, mao };
  }
  const bE = braco(ombroE, 1), bD = braco(ombroD, -1);

  // ---------- pernas (jeans reto, sapato preto) ----------
  function perna(quadrilLado) {
    peca(caixa(0.44, M.coxa + 0.12, 0.42, 0.19), calca, quadrilLado, [0, -M.coxa / 2 + 0.06, 0]);
    const joelho = articulacao(quadrilLado, [0, -M.coxa, 0]);
    peca(caixa(0.40, M.canela + 0.25, 0.40, 0.17), calca, joelho, [0, -M.canela / 2 + 0.10, 0]);
    const tornozelo = articulacao(joelho, [0, -M.canela, 0]);
    peca(caixa(0.34, 0.20, 0.48, 0.09), P.sapato, tornozelo, [0, -0.07, 0.07]);
    peca(caixa(0.35, 0.05, 0.49, 0.02), P.contorno, tornozelo, [0, -0.15, 0.07], [0, 0, 0], { contorno: 0 });  // sola
    return joelho;
  }
  const joelhoE = perna(pernaE), joelhoD = perna(pernaD);

  // ---------- mapa de articulações ----------
  const juntas = {
    raiz, tronco, cabeca,
    ombroE, cotoveloE: bE.cotovelo, pulsoE: bE.pulso,
    ombroD, cotoveloD: bD.cotovelo, pulsoD: bD.pulso,
    pernaE, joelhoE, pernaD, joelhoD,
  };

  let poseAtual = 'parado';
  let emocaoAtual = 'neutro';
  let fatorTroca = 1;   // "piscada" durante misturarEmocoes

  // ============================================================
  // API
  // ============================================================
  const zePersonagem = {
    nome: 'Zé',
    raiz,
    juntas,
    maos: { E: bE.mao, D: bD.mao },
    acessorios: { chaveDeFenda, oculos, bolsinha, capacete },

    /** Alterna o capacete preso ? cabe?a e oculta o cabelo sob ele. */
    usarCapacete(ativo = true) {
      capacete.visible = Boolean(ativo);
      cabelo.visible = !capacete.visible;
      return zePersonagem;
    },

    /** Aplica uma pose pelo nome (ver POSES). */
    pose(nome) {
      return zePersonagem.misturarPoses(nome, nome, 0);
    },

    /**
     * Mistura duas poses (t de 0 a 1, com suavização).
     * Ex.: zePersonagem.misturarPoses('parado', 'acenar', progresso)
     */
    misturarPoses(de, para, t) {
      const a = POSES[de], b = POSES[para];
      if (!a || !b) throw new Error(`Pose desconhecida: ${!a ? de : para}`);
      const k = suavizar(Math.min(Math.max(t, 0), 1));
      for (const nome of Object.keys(POSE_BASE)) {
        const va = a[nome] ?? POSE_BASE[nome];
        const vb = b[nome] ?? POSE_BASE[nome];
        juntas[nome].rotation.set(
          va[0] + (vb[0] - va[0]) * k,
          va[1] + (vb[1] - va[1]) * k,
          va[2] + (vb[2] - va[2]) * k,
        );
      }
      poseAtual = k < 0.5 ? de : para;
      return zePersonagem;
    },

    /** Point a straight arm at a world-space Vector3 or Object3D. */
    apontarPara(alvo, { lado = 'E', intensidade = 1 } = {}) {
      if (!['E', 'D'].includes(lado)) throw new Error('Lado deve ser E ou D');
      if (!alvo || !(alvo.isVector3 || alvo.isObject3D)) throw new TypeError('Alvo deve ser Vector3 ou Object3D');
      raiz.updateWorldMatrix(true, true);
      const ombro = juntas['ombro' + lado];
      const alvoMundo = alvo.isObject3D ? alvo.getWorldPosition(new THREE.Vector3()) : alvo.clone();
      const direcao = ombro.parent.worldToLocal(alvoMundo).sub(ombro.position);
      if (direcao.lengthSq() < 1e-10) return zePersonagem;
      const destino = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), direcao.normalize());
      const k = Math.max(0, Math.min(1, intensidade));
      ombro.quaternion.slerp(destino, k);
      juntas['cotovelo' + lado].rotation.set(0, 0, 0);
      return zePersonagem;
    },

    /**
     * Leva as articulações da posição ATUAL até a pose (k de 0 a 1, suavizado).
     * Use para entrar/sair de uma pose sem salto, partindo de onde o Zé estiver.
     */
    irParaPose(nome, k) {
      const alvo = POSES[nome];
      if (!alvo) throw new Error(`Pose desconhecida: ${nome}`);
      const s = suavizar(Math.min(Math.max(k, 0), 1));
      for (const n of Object.keys(POSE_BASE)) {
        const v = alvo[n] ?? POSE_BASE[n];
        const r = juntas[n].rotation;
        r.set(r.x + (v[0] - r.x) * s, r.y + (v[1] - r.y) * s, r.z + (v[2] - r.z) * s);
      }
      return zePersonagem;
    },

    /**
     * Troca de emoção FLUIDA (k de 0 a 1): sobrancelhas deslizam e, no meio da troca,
     * olhos e boca fazem uma "piscada" (encolhem e crescem) para a forma nova não pular.
     */
    misturarEmocoes(de, para, k) {
      const a = EMOCOES[de], b = EMOCOES[para];
      if (!a || !b) throw new Error(`Emoção desconhecida: ${!a ? de : para}`);
      const s = suavizar(Math.min(Math.max(k, 0), 1));
      zePersonagem.emocao(s < 0.5 ? de : para);
      const f = 0.2 + 0.8 * Math.abs(1 - 2 * s);   // 1 → 0,2 → 1 (piscada na troca)
      for (const lado of ['E', 'D']) {
        const sinal = lado === 'E' ? 1 : -1;
        const ea = lado === 'E' ? (a.sobrAssimetrica ?? 0) : 0;
        const eb = lado === 'E' ? (b.sobrAssimetrica ?? 0) : 0;
        sobrancelhas[lado].rotation.z = sinal * (a.sobr[0] + (b.sobr[0] - a.sobr[0]) * s);
        sobrancelhas[lado].position.y = ySobr + (a.sobr[1] + ea) + ((b.sobr[1] + eb) - (a.sobr[1] + ea)) * s;
        const o = olhos[lado];
        for (const parte of [o.aberto, o.fechadoFeliz, o.meio, o.x]) parte.scale.y *= f;
      }
      fatorTroca = f;
      const atual = EMOCOES[s < 0.5 ? de : para];
      bocas[atual.boca].scale.setScalar((atual.escalaBoca ?? 1) * f);
      return zePersonagem;
    },

    /** Troca a expressão do rosto (ver EMOCOES). Para trocar no meio de uma cena, prefira misturarEmocoes. */
    emocao(nome) {
      const e = EMOCOES[nome];
      if (!e) throw new Error(`Emoção desconhecida: ${nome}`);
      for (const lado of ['E', 'D']) {
        const o = olhos[lado];
        const modo = Array.isArray(e.olhos) ? e.olhos[lado === 'E' ? 0 : 1] : e.olhos;
        o.aberto.visible = modo === 'abertos';
        o.fechadoFeliz.visible = modo === 'fechadosFelizes';
        o.meio.visible = modo === 'meio';
        o.x.visible = modo === 'x';
        o.aberto.scale.setScalar(e.escalaOlho ?? 1);
        const sinal = lado === 'E' ? 1 : -1;
        const extra = lado === 'E' ? (e.sobrAssimetrica ?? 0) : 0;
        sobrancelhas[lado].visible = !e.semSobr;   // a referência não tem sobrancelha no rosto calmo
        sobrancelhas[lado].rotation.z = sinal * e.sobr[0];
        sobrancelhas[lado].position.y = ySobr + e.sobr[1] + extra;
      }
      for (const [nomeBoca, grupo] of Object.entries(bocas)) grupo.visible = nomeBoca === e.boca;
      bocas[e.boca].scale.setScalar(e.escalaBoca ?? 1);
      emocaoAtual = nome;
      fatorTroca = 1;
      return zePersonagem;
    },

    /**
     * Vida automática, sempre calculada pelo TEMPO DO VÍDEO (nunca Date.now):
     *  - piscada a cada ~3,6 s (só com olhos abertos)
     *  - respiração leve no tronco
     */
    atualizar(tempo, { piscar = true, respirar = true } = {}) {
      const fase = (tempo + 0.7) % 3.6;
      const fechando = piscar && fase < 0.14 && [].concat(EMOCOES[emocaoAtual].olhos).includes('abertos');
      const base = EMOCOES[emocaoAtual].escalaOlho ?? 1;
      for (const lado of ['E', 'D']) olhos[lado].aberto.scale.y = (fechando ? 0.12 : 1) * base * fatorTroca;
      corpo.scale.y = respirar ? 1 + Math.sin(tempo * 2.4) * 0.01 : 1;
      return zePersonagem;
    },

    /** Prende um objeto 3D na mão ('E' ou 'D'). */
    segurar(objeto, lado = 'D') {
      zePersonagem.maos[lado].add(objeto);
      return zePersonagem;
    },

    get poseAtual() { return poseAtual; },
    get emocaoAtual() { return emocaoAtual; },
  };

  zePersonagem.pose('parado').emocao('neutro').usarCapacete(capaceteInicial);
  return zePersonagem;
}

/** Curva de suavização (entra e sai devagar). */
export function suavizar(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Luz padrão do canal: use em toda cena para o Zé ficar sempre igual. */
export function luzPadrao(cena) {
  const ceu = new THREE.HemisphereLight(0xfff6ec, 0x8a93a8, 1.5);
  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.position.set(3, 6, 5);
  const preenchimento = new THREE.DirectionalLight(0xcfe9ff, 0.6);
  preenchimento.position.set(-4, 2, 3);
  cena.add(ceu, sol, preenchimento);
  return { ceu, sol, preenchimento };
}

/** Sombra de contato redonda sob os pés. */
export function sombraDeContato(raio = 0.9) {
  const s = new THREE.Mesh(
    new THREE.CircleGeometry(raio, 40),
    new THREE.MeshBasicMaterial({ color: PALETA.contorno, transparent: true, opacity: 0.16 }),
  );
  s.rotation.x = -Math.PI / 2;
  s.position.y = 0.002;
  s.scale.set(1, 0.7, 1);
  return s;
}
