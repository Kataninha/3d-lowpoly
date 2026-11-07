/**
 * ZÉ DESMONTE — mascote oficial do canal Mundo100Manual
 * ------------------------------------------------------------
 * Técnico adulto, boneco articulado em 3D (proporção de ~4 cabeças).
 * Módulo Three.js reutilizável em TODOS os vídeos.
 * Nunca redesenhe o Zé Desmonte dentro de um vídeo: importe este arquivo.
 *
 * Uso básico:
 *   import { criarZeDesmonte, luzPadrao } from './personagens/ze-desmonte/ze-desmonte.js';
 *   const zeDesmonte = criarZeDesmonte();
 *   cena.add(zeDesmonte.raiz);
 *   zeDesmonte.pose('acenar').emocao('feliz');
 *   zeDesmonte.atualizar(tempo);   // piscada e respiração, sempre pelo tempo do vídeo
 *
 * Identidade (não mudar sem atualizar o LEIA-ME):
 *   - Adulto alto, sem barba, cabeça redonda, ombros largos
 *   - Macacão teal com zíper, bolso laranja e emblema branco
 *   - Luvas laranja; sem óculos; cabelo curto penteado para o lado
 *   - Cinto marrom com fivela laranja, chave de fenda e bolsinha de ferramentas
 *   - Low poly (faces chapadas, poucos polígonos) + contorno fino escuro
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ============================================================
// 1. IDENTIDADE (cores e medidas oficiais)
// ============================================================
export const PALETA = Object.freeze({
  pele: 0xd9a07a,
  macacao: 0x16858c,
  macacaoEscuro: 0x0f6a70,
  laranja: 0xff7a1a,
  bota: 0x2b2d42,
  cabelo: 0x2a1e1a,
  barba: 0x3a2a22,
  lente: 0x7ff3ff,
  cinto: 0x4a3426,
  metal: 0xc9d1d9,
  boca: 0x5a1f22,
  lingua: 0xff8f8f,
  contorno: 0x1d1b2a,
  branco: 0xffffff,
});

export const MEDIDAS = Object.freeze({
  coxa: 0.64,
  canela: 0.6,
  alturaQuadril: 1.4,        // pés encostam no chão (y = 0)
  alturaTronco: 1.2,
  pescoco: 0.1,
  cabeca: [0.92, 0.9, 0.84],
  larguraOmbro: 0.66,
  larguraQuadril: 0.24,
  braco: [0.62, 0.56],
  contorno: 0.014,
  alturaTotal: 3.72,          // do chão ao topo do cabelo
  alturaRosto: 3.15,          // centro do rosto (para câmera de close)
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
  if (contorno > 0) grupo.add(new THREE.Mesh(geo, materialContorno(contorno)));
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
//    E = lado esquerdo do Zé Desmonte (direita de quem olha). D = direito.
//    x negativo = leva para a frente · z positivo (E) / negativo (D) = abre para o lado
//    joelho: x positivo dobra a perna para trás
// ============================================================
export const POSES = {
  parado: {},
  acenar: {
    ombroE: [0, 0, 2.45], cotoveloE: [0, 0, 0.6], cabeca: [0, 0, -0.08],
  },
  apontar: {
    ombroD: [-1.45, 0, -0.2], cotoveloD: [-0.05, 0, 0], cabeca: [0, -0.2, 0],
  },
  explicar: {
    ombroE: [-0.5, 0, 0.4], cotoveloE: [-1.1, 0, 0],
    ombroD: [-0.4, 0, -0.35], cotoveloD: [-1.0, 0, 0], cabeca: [0, 0, 0.05],
  },
  pensar: {
    ombroD: [-0.8, 0, 0.45], cotoveloD: [-2.3, 0, 0],
    ombroE: [-0.4, 0, -0.3], cotoveloE: [-1.5, 0, 0],
    cabeca: [-0.06, 0, 0.12],
  },
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
  neutro:    { olhos: 'abertos', escalaOlho: 1.0,  sobr: [-0.06, 0.00], boca: 'sorriso', escalaBoca: 0.7 },
  feliz:     { olhos: 'abertos', escalaOlho: 1.0,  sobr: [-0.1, 0.02],  boca: 'sorriso', escalaBoca: 1.05 },
  empolgado: { olhos: 'fechadosFelizes',           sobr: [-0.14, 0.05], boca: 'aberta',  escalaBoca: 1.0 },
  surpreso:  { olhos: 'abertos', escalaOlho: 1.25, sobr: [-0.04, 0.06], boca: 'o',       escalaBoca: 1.0 },
  triste:    { olhos: 'abertos', escalaOlho: 0.9,  sobr: [-0.36, 0.03], boca: 'triste',  escalaBoca: 0.9 },
  bravo:     { olhos: 'abertos', escalaOlho: 0.85, sobr: [0.4, -0.03],  boca: 'reta',    escalaBoca: 1.0 },
  cansado:   { olhos: 'meio',                      sobr: [-0.22, -0.02], boca: 'reta',   escalaBoca: 0.8 },
  pensativo: { olhos: 'abertos', escalaOlho: 0.95, sobr: [-0.08, 0.0], sobrAssimetrica: 0.06, boca: 'lado', escalaBoca: 1.0 },
  nojo:      { olhos: 'meio',                      sobr: [0.3, -0.03], boca: 'triste',  escalaBoca: 1.1 },
  tonto:     { olhos: 'x',                         sobr: [-0.2, 0.04], boca: 'o',       escalaBoca: 0.9 },
};

// ============================================================
// 6. CRIAÇÃO DO ZÉ DESMONTE
// ============================================================
export function criarZeDesmonte() {
  const P = PALETA, M = MEDIDAS;
  const [cL, cA, cP] = M.cabeca;

  // ---------- esqueleto ----------
  const raiz = new THREE.Group();
  raiz.name = 'Zé Desmonte';
  const quadril = articulacao(raiz, [0, M.alturaQuadril, 0]);
  const tronco = articulacao(quadril);
  const pescoco = articulacao(tronco, [0, M.alturaTronco, 0]);
  const cabeca = articulacao(pescoco, [0, M.pescoco + cA / 2, 0]);
  const ombroE = articulacao(tronco, [M.larguraOmbro, M.alturaTronco - 0.12, 0]);
  const ombroD = articulacao(tronco, [-M.larguraOmbro, M.alturaTronco - 0.12, 0]);
  const pernaE = articulacao(quadril, [M.larguraQuadril, 0, 0]);
  const pernaD = articulacao(quadril, [-M.larguraQuadril, 0, 0]);

  // ---------- tronco (macacão de técnico) ----------
  const corpo = articulacao(tronco);
  peca(caixa(1.12, 0.76, 0.66, 0.22), P.macacao, corpo, [0, 0.82, 0]);                // peito
  peca(caixa(0.96, 0.6, 0.6, 0.2), P.macacao, corpo, [0, 0.32, 0]);                // cintura
  peca(caixa(0.56, 0.12, 0.36, 0.05), P.macacaoEscuro, corpo, [0, 1.17, 0.02]);       // gola
  peca(caixa(0.05, 0.9, 0.04, 0.02), P.macacaoEscuro, corpo, [0, 0.66, 0.33], [0, 0, 0], { contorno: 0 }); // zíper
  peca(caixa(0.26, 0.22, 0.05, 0.05), P.laranja, corpo, [0.28, 0.92, 0.34]);          // bolso
  peca(cilindro(0.06, 0.04), P.branco, corpo, [0.28, 0.94, 0.375], [Math.PI / 2, 0, 0], { contorno: 0.008 }); // emblema
  peca(caixa(1.0, 0.14, 0.66, 0.06), P.cinto, corpo, [0, 0.06, 0]);                // cinto
  peca(caixa(0.16, 0.12, 0.05, 0.03), P.laranja, corpo, [0, 0.06, 0.34]);            // fivela
  const bolsinha = peca(caixa(0.22, 0.24, 0.16, 0.05), P.cinto, corpo, [0.48, -0.02, 0.24]); // bolsinha
  peca(caixa(0.24, 0.07, 0.18, 0.03), P.laranja, bolsinha, [0, 0.11, 0]);
  const chaveDeFenda = articulacao(corpo, [-0.5, 0.08, 0.26]);                       // marca registrada
  peca(cilindro(0.04, 0.2), P.laranja, chaveDeFenda);
  peca(cilindro(0.014, 0.2, 8), P.metal, chaveDeFenda, [0, -0.19, 0]);

  // ---------- pescoço ----------
  peca(cilindro(0.16, 0.2), P.pele, tronco, [0, M.alturaTronco + 0.04, 0]);

  // ---------- cabeça (redonda, low poly) ----------
  // Elipsoide facetado. naCabeca(x, y, folga) devolve o ponto da superfície
  // (um pouco para fora) e o giro (ordem YXZ) que deixa a peça "deitada" na curva.
  const semi = [cL / 2, cA / 2, cP / 2];
  function naCabeca(x, y, folga = 0.012) {
    const z = semi[2] * Math.sqrt(Math.max(0, 1 - (x / semi[0]) ** 2 - (y / semi[1]) ** 2));
    const n = new THREE.Vector3(x / semi[0] ** 2, y / semi[1] ** 2, z / semi[2] ** 2).normalize();
    return {
      pos: [x + n.x * folga, y + n.y * folga, z + n.z * folga],
      rot: [-Math.asin(n.y), Math.atan2(n.x, n.z)],
    };
  }
  const deitar = (g, rx, ry) => { g.rotation.set(rx, ry, 0, 'YXZ'); return g; };
  const elipsoide = (escala, ...fatia) => {
    const g = new THREE.SphereGeometry(1, 14, 10, ...fatia);
    g.scale(semi[0] * escala, semi[1] * escala, semi[2] * escala);
    return g;
  };
  peca(elipsoide(1), P.pele, cabeca);
  // Uma malha contínua evita tufos soltos e acompanha o crânio até a nuca.
  const cabelo = articulacao(cabeca);
  cabelo.name = 'cabelo';
  const geoCabelo = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, 1.8);
  const pontosCabelo = geoCabelo.attributes.position;
  const uvCabelo = geoCabelo.attributes.uv;
  for (let i = 0; i < pontosCabelo.count; i++) {
    const phi = uvCabelo.getX(i) * Math.PI * 2;
    const frente = Math.max(0, Math.sin(phi));
    const limite = 1.8 - 0.70 * frente + 0.10 * frente * Math.cos(phi);
    const theta = (1 - uvCabelo.getY(i)) * limite;
    const volume = 0.045 * frente * frente * Math.sin(theta) * Math.exp(-(((theta - 0.65) / 0.45) ** 2));
    pontosCabelo.setXYZ(i,
      -Math.cos(phi) * Math.sin(theta) * semi[0] * 1.055,
      Math.cos(theta) * semi[1] * 1.055 + 0.008 + volume,
      Math.sin(phi) * Math.sin(theta) * semi[2] * 1.055 - 0.008);
  }
  pontosCabelo.needsUpdate = true;
  geoCabelo.computeVertexNormals();
  peca(geoCabelo, P.cabelo, cabelo);
  // orelhas
  [1, -1].forEach((l) => peca(caixa(0.08, 0.2, 0.14, 0.04), P.pele, cabeca, [l * (cL / 2 + 0.02), 0.0, 0.0]));
  // Grupo vazio mantém a compatibilidade de acessorios.oculos com os projetos existentes.
  const oculos = articulacao(cabeca);
  oculos.name = 'oculos-removidos';
  oculos.visible = false;

  // ---------- rosto ----------
  const zRosto = cP / 2 + 0.006, yOlhos = 0.0, xOlhos = 0.17;
  const rosto = articulacao(cabeca);
  const olhos = {}, sobrancelhas = {};
  [['E', 1], ['D', -1]].forEach(([nome, lado]) => {
    const pOlho = naCabeca(lado * xOlhos, yOlhos);
    const grupo = deitar(articulacao(rosto, pOlho.pos), pOlho.rot[0], pOlho.rot[1]);
    const aberto = peca(capsula(0.048, 0.075), P.contorno, grupo, [0, 0, 0], [0, 0, 0], semContorno);
    peca(esfera(0.018), P.branco, aberto, [0.016, 0.035, 0.04], [0, 0, 0], semContorno);
    const fechadoFeliz = peca(arco(0.05, 0.016, Math.PI), P.contorno, grupo, [0, -0.015, 0], [0, 0, 0], semContorno);
    const meio = peca(caixa(0.11, 0.035, 0.02, 0.015), P.contorno, grupo, [0, -0.02, 0], [0, 0, 0], semContorno);
    const x = articulacao(grupo);
    peca(caixa(0.13, 0.03, 0.02, 0.012), P.contorno, x, [0, 0, 0], [0, 0, Math.PI / 4], semContorno);
    peca(caixa(0.13, 0.03, 0.02, 0.012), P.contorno, x, [0, 0, 0], [0, 0, -Math.PI / 4], semContorno);
    olhos[nome] = { grupo, aberto, fechadoFeliz, meio, x };
    const pSobr = naCabeca(lado * xOlhos, yOlhos + 0.13);
    sobrancelhas[nome] = deitar(peca(caixa(0.14, 0.04, 0.03, 0.015), P.cabelo, rosto,
      pSobr.pos, [0, 0, 0], semContorno), pSobr.rot[0], pSobr.rot[1]);
  });

  const pBoca = naCabeca(0, -0.17, 0.016);
  const boca = deitar(articulacao(rosto, pBoca.pos), pBoca.rot[0], pBoca.rot[1]);
  const bocas = {
    sorriso: peca(arco(0.08, 0.018, Math.PI), P.contorno, boca, [0, 0.04, 0], [0, 0, Math.PI], semContorno),
    triste: peca(arco(0.065, 0.018, Math.PI), P.contorno, boca, [0, -0.03, 0], [0, 0, 0], semContorno),
    o: peca(arco(0.04, 0.016, Math.PI * 2), P.contorno, boca, [0, 0, 0], [0, 0, 0], semContorno),
    reta: peca(caixa(0.13, 0.03, 0.02, 0.015), P.contorno, boca, [0, 0, 0], [0, 0, 0], semContorno),
    lado: peca(arco(0.06, 0.016, Math.PI * 0.8), P.contorno, boca, [0.045, 0.03, 0], [0, 0, Math.PI * 1.1], semContorno),
    aberta: (() => {
      const g = articulacao(boca, [0, 0.035, 0]);
      const borda = new THREE.Mesh(new THREE.CircleGeometry(0.105, 28, Math.PI, Math.PI), material(P.contorno, 'luz'));
      const fundo = new THREE.Mesh(new THREE.CircleGeometry(0.09, 28, Math.PI, Math.PI), material(P.boca, 'luz'));
      const lingua = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20, 0, Math.PI), material(P.lingua, 'luz'));
      fundo.position.z = 0.002;
      lingua.position.set(0, -0.085, 0.004);
      g.add(borda, fundo, lingua);
      return g;
    })(),
  };

  // ---------- braços ----------
  function braco(ombro, lado) {
    const [c1, c2] = M.braco;
    peca(esfera(0.19), P.macacao, ombro);                                             // ombro arredondado
    peca(caixa(0.28, c1, 0.28, 0.11), P.macacao, ombro, [0, -c1 / 2, 0]);
    const cotovelo = articulacao(ombro, [0, -c1, 0]);
    peca(esfera(0.13), P.macacao, cotovelo);
    peca(caixa(0.26, c2, 0.26, 0.1), P.macacao, cotovelo, [0, -c2 / 2, 0]);
    peca(cilindro(0.155, 0.09), P.laranja, cotovelo, [0, -c2 + 0.02, 0]);             // punho da luva
    const pulso = articulacao(cotovelo, [0, -c2, 0]);
    peca(caixa(0.28, 0.27, 0.21, 0.09), P.laranja, pulso, [0, -0.13, 0]);           // luva
    peca(caixa(0.08, 0.13, 0.08, 0.035), P.laranja, pulso, [lado * -0.15, -0.08, 0.07], [0, 0, lado * 0.4]); // polegar
    const mao = articulacao(pulso, [0, -0.2, 0.06]);                                  // ponto para segurar objetos
    return { cotovelo, pulso, mao };
  }
  const bE = braco(ombroE, 1), bD = braco(ombroD, -1);

  // ---------- pernas ----------
  function perna(quadrilLado) {
    peca(caixa(0.36, M.coxa, 0.38, 0.12), P.macacao, quadrilLado, [0, -M.coxa / 2, 0]);
    const joelho = articulacao(quadrilLado, [0, -M.coxa, 0]);
    peca(esfera(0.165), P.macacao, joelho);
    peca(caixa(0.33, M.canela, 0.35, 0.11), P.macacao, joelho, [0, -M.canela / 2, 0]);
    peca(cilindro(0.19, 0.08), P.macacaoEscuro, joelho, [0, -M.canela + 0.05, 0]);   // barra da calça
    const tornozelo = articulacao(joelho, [0, -M.canela, 0]);
    peca(caixa(0.4, 0.22, 0.58, 0.09), P.bota, tornozelo, [0, -0.06, 0.08]);         // bota
    peca(caixa(0.42, 0.05, 0.6, 0.02), P.contorno, tornozelo, [0, -0.15, 0.08], [0, 0, 0], { contorno: 0 }); // sola
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
  const zeDesmonte = {
    nome: 'Zé Desmonte',
    raiz,
    juntas,
    maos: { E: bE.mao, D: bD.mao },
    acessorios: { chaveDeFenda, oculos, bolsinha },

    /** Aplica uma pose pelo nome (ver POSES). */
    pose(nome) {
      return zeDesmonte.misturarPoses(nome, nome, 0);
    },

    /**
     * Mistura duas poses (t de 0 a 1, com suavização).
     * Ex.: zeDesmonte.misturarPoses('parado', 'acenar', progresso)
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
      return zeDesmonte;
    },

    /**
     * Leva as articulações da posição ATUAL até a pose (k de 0 a 1, suavizado).
     * Use para entrar/sair de uma pose sem salto, partindo de onde o Zé Desmonte estiver.
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
      return zeDesmonte;
    },

    /**
     * Troca de emoção FLUIDA (k de 0 a 1): sobrancelhas deslizam e, no meio da troca,
     * olhos e boca fazem uma "piscada" (encolhem e crescem) para a forma nova não pular.
     */
    misturarEmocoes(de, para, k) {
      const a = EMOCOES[de], b = EMOCOES[para];
      if (!a || !b) throw new Error(`Emoção desconhecida: ${!a ? de : para}`);
      const s = suavizar(Math.min(Math.max(k, 0), 1));
      zeDesmonte.emocao(s < 0.5 ? de : para);
      const f = 0.2 + 0.8 * Math.abs(1 - 2 * s);   // 1 → 0,2 → 1 (piscada na troca)
      for (const lado of ['E', 'D']) {
        const sinal = lado === 'E' ? 1 : -1;
        const ea = lado === 'E' ? (a.sobrAssimetrica ?? 0) : 0;
        const eb = lado === 'E' ? (b.sobrAssimetrica ?? 0) : 0;
        sobrancelhas[lado].rotation.z = sinal * (a.sobr[0] + (b.sobr[0] - a.sobr[0]) * s);
        sobrancelhas[lado].position.y = yOlhos + 0.13 + (a.sobr[1] + ea) + ((b.sobr[1] + eb) - (a.sobr[1] + ea)) * s;
        const o = olhos[lado];
        for (const parte of [o.aberto, o.fechadoFeliz, o.meio, o.x]) parte.scale.y *= f;
      }
      fatorTroca = f;
      const atual = EMOCOES[s < 0.5 ? de : para];
      bocas[atual.boca].scale.setScalar((atual.escalaBoca ?? 1) * f);
      return zeDesmonte;
    },

    /** Troca a expressão do rosto (ver EMOCOES). Para trocar no meio de uma cena, prefira misturarEmocoes. */
    emocao(nome) {
      const e = EMOCOES[nome];
      if (!e) throw new Error(`Emoção desconhecida: ${nome}`);
      for (const lado of ['E', 'D']) {
        const o = olhos[lado];
        o.aberto.visible = e.olhos === 'abertos';
        o.fechadoFeliz.visible = e.olhos === 'fechadosFelizes';
        o.meio.visible = e.olhos === 'meio';
        o.x.visible = e.olhos === 'x';
        o.aberto.scale.setScalar(e.escalaOlho ?? 1);
        const sinal = lado === 'E' ? 1 : -1;
        const extra = lado === 'E' ? (e.sobrAssimetrica ?? 0) : 0;
        sobrancelhas[lado].rotation.z = sinal * e.sobr[0];
        sobrancelhas[lado].position.y = yOlhos + 0.13 + e.sobr[1] + extra;
      }
      for (const [nomeBoca, grupo] of Object.entries(bocas)) grupo.visible = nomeBoca === e.boca;
      bocas[e.boca].scale.setScalar(e.escalaBoca ?? 1);
      emocaoAtual = nome;
      fatorTroca = 1;
      return zeDesmonte;
    },

    /**
     * Vida automática, sempre calculada pelo TEMPO DO VÍDEO (nunca Date.now):
     *  - piscada a cada ~3,6 s (só com olhos abertos)
     *  - respiração leve no tronco
     */
    atualizar(tempo, { piscar = true, respirar = true } = {}) {
      const fase = (tempo + 0.7) % 3.6;
      const fechando = piscar && fase < 0.14 && EMOCOES[emocaoAtual].olhos === 'abertos';
      const base = EMOCOES[emocaoAtual].escalaOlho ?? 1;
      for (const lado of ['E', 'D']) olhos[lado].aberto.scale.y = (fechando ? 0.12 : 1) * base * fatorTroca;
      corpo.scale.y = respirar ? 1 + Math.sin(tempo * 2.4) * 0.01 : 1;
      return zeDesmonte;
    },

    /** Prende um objeto 3D na mão ('E' ou 'D'). */
    segurar(objeto, lado = 'D') {
      zeDesmonte.maos[lado].add(objeto);
      return zeDesmonte;
    },

    get poseAtual() { return poseAtual; },
    get emocaoAtual() { return emocaoAtual; },
  };

  zeDesmonte.pose('parado').emocao('neutro');
  return zeDesmonte;
}

/** Curva de suavização (entra e sai devagar). */
export function suavizar(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Luz padrão do canal: use em toda cena para o Zé Desmonte ficar sempre igual. */
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
