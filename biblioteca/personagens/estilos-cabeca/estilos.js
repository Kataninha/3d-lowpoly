/**
 * ESTILOS DE CABEÇA E CABELO — NPCs (figurantes) sobre o corpo do Zé v4. Não usar como protagonista.
 * Usa o esqueleto, rosto, poses e emoções do v4; troca só o formato da cabeça e o cabelo.
 *
 *   import { criarPersonagem, ESTILOS } from './personagens/estilos-cabeca/estilos.js';
 *   const p = criarPersonagem('topete', { camisa: 0xd94f3d });
 *   cena.add(p.raiz); p.pose('acenar').emocao('feliz');
 */
import * as THREE from 'three';
import { criarZe, MEDIDAS, PALETA } from '../ze/ze-v4.js';

const [SX, SY, SZ] = MEDIDAS.cabeca.map((v) => v / 2);   // semi-eixos da cabeça

const mats = new Map();
const mat = (cor) => {
  if (!mats.has(cor)) mats.set(cor, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }));
  return mats.get(cor);
};
const malha = (geo, cor, pai, pos = [0, 0, 0], rot = [0, 0, 0], esc = [1, 1, 1]) => {
  const m = new THREE.Mesh(geo, mat(cor));
  m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...esc);
  pai.add(m);
  return m;
};
const bola = (detalhe = 1) => new THREE.IcosahedronGeometry(1, detalhe);

// A pele do v4 é uma esfera "quadradinha" (|v|^0.8); o cabelo segue a mesma forma para não afundar.
const quad = (v) => Math.sign(v) * Math.abs(v) ** 0.8;
let deformar = (x, y, z) => [x, y, z];   // deformação da cabeça atual; o cabelo segue a mesma
const naForma = (x, y, z) => deformar(quad(x) * SX, quad(y) * SY, quad(z) * SZ);
/** Calota rente à cabeça: theta = até onde desce; inc < 0 sobe a linha da testa. */
function calota(pai, cor, { theta = 1.25, inc = -0.32, folga = 1.06, inicio = 0 } = {}) {
  const geo = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, inicio, theta).rotateX(inc), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++)
    pos.setXYZ(i, ...naForma(pos.getX(i), pos.getY(i), pos.getZ(i)).map((v) => v * folga));
  geo.computeVertexNormals();
  return malha(geo, cor, pai);
}
/** Ponto na superfície da cabeça (ângulo vertical th a partir do topo, horizontal ph; ph=0 é a frente). */
const naSuperficie = (th, ph, f = 1.05) =>
  naForma(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph)).map((v) => v * f);

// ---------- formatos de cabeça ----------
// escala: no grupo da cabeça (rosto e cabelo acompanham); deformar: só na malha da pele.
const CABECAS = {
  redonda: {},
  larga: { escala: [1.14, 0.92, 1] },
  alta: { escala: [0.9, 1.14, 0.98] },
  quadrada: { deformar: (x, y, z) => [Math.sign(x) * Math.abs(x / SX) ** 0.72 * SX, Math.sign(y) * Math.abs(y / SY) ** 0.8 * SY, z] },
  pera: { deformar: (x, y, z) => { const k = 1 - 0.2 * (y / SY); return [x * k, y, z * (0.5 + 0.5 * k)]; } },
};

// ---------- cabelos ----------
const CABELOS = {
  tigela: null,   // mantém o cabelo original do v4
  careca: () => {},
  coroa: (g, cor) => calota(g, cor, { inicio: 1.05, theta: 0.55, inc: -0.45, folga: 1.04 }),   // careca com cabelo só dos lados
  espetado: (g, cor) => {
    calota(g, cor, { theta: 1.15 });
    for (let i = 0; i < 11; i++) {
      const th = 0.15 + (i % 3) * 0.35, ph = i * 2.4;
      const cone = malha(new THREE.ConeGeometry(0.1, 0.32, 5), cor, g, naSuperficie(th, ph, 1.08));
      cone.lookAt(new THREE.Vector3(...naSuperficie(th, ph, 3)));
      cone.rotateX(Math.PI / 2);
    }
  },
  black: (g, cor) => {
    malha(bola(1), cor, g, [0, 0.2, -0.05], [0, 0, 0], [0.5, 0.36, 0.46]);
    for (let i = 0; i < 14; i++) {
      const th = 0.3 + (i % 4) * 0.28, ph = i * 2.2;
      malha(bola(0), cor, g, [Math.sin(th) * Math.sin(ph) * 0.47, 0.2 + Math.cos(th) * 0.33, -0.05 + Math.sin(th) * Math.cos(ph) * 0.4], [i, i * 2, 0], [0.11, 0.11, 0.11]);
    }
  },
  // black rente + topete reto na frente, na horizontal (centrado, sem cair para o lado)
  principal: (g, cor) => {
    CABELOS.black(g, cor);
    malha(bola(1), cor, g, [0, 0.4, 0.27], [-0.3, 0, 0], [0.42, 0.13, 0.3]);
  },
  topete: (g, cor) => {
    calota(g, cor, { theta: 1.2 });
    malha(bola(1), cor, g, [0, 0.4, 0.2], [-0.5, 0, 0], [0.34, 0.17, 0.27]);
  },
  coque: (g, cor) => {
    calota(g, cor, { theta: 1.3, inc: -0.2 });
    malha(bola(1), cor, g, [0, 0.47, -0.2], [0, 0, 0], [0.17, 0.16, 0.17]);
    malha(new THREE.TorusGeometry(0.11, 0.03, 6, 12), 0xd94f3d, g, [0, 0.38, -0.17], [Math.PI / 2 + 0.5, 0, 0]);
  },
  moicano: (g, cor) => {
    calota(g, 0x2a1d17, { theta: 1.15, folga: 1.03 });
    for (let i = 0; i < 6; i++) {
      const th = -0.75 + i * 0.32;
      const p = naForma(0, Math.cos(th), Math.sin(th)).map((v) => v * 1.13);
      malha(new THREE.BoxGeometry(0.1, 0.24, 0.13), cor, g, p, [th, 0, 0]);
    }
  },
  rabo: (g, cor) => {
    calota(g, cor, { theta: 1.3, inc: -0.25 });
    malha(new THREE.CapsuleGeometry(0.09, 0.32, 3, 8), cor, g, [0, 0.0, -0.52], [0.35, 0, 0]);
    malha(new THREE.TorusGeometry(0.08, 0.025, 6, 10), 0x2f7be0, g, [0, 0.2, -0.46], [Math.PI / 2 + 0.35, 0, 0]);
  },
  lateral: (g, cor) => {
    calota(g, cor, { theta: 1.25, inc: -0.25 });
    malha(bola(1), cor, g, [-0.1, 0.33, 0.3], [-0.3, 0, 0.3], [0.38, 0.12, 0.17]);
  },
  cacheado: (g, cor) => {
    calota(g, cor, { theta: 1.2, folga: 1.02 });
    for (let i = 0; i < 26; i++) {
      const th = 0.1 + (i % 5) * 0.27, ph = i * 2.4;
      malha(bola(0), cor, g, naSuperficie(th, ph, 1.07), [i, i, 0], [0.1, 0.1, 0.1]);
    }
  },
};

/** Os 10 personagens prontos (cabelo + cabeça + cores). */
export const ESTILOS = {
  tigela:   { cabelo: 'tigela',   cabeca: 'redonda',  cor: 0x17110d },
  coroa:    { cabelo: 'coroa',    cabeca: 'alta',     cor: 0x8a8580, pele: 0xd9a77f },
  espetado: { cabelo: 'espetado', cabeca: 'larga',    cor: 0x2a1d17 },
  black:    { cabelo: 'black',    cabeca: 'redonda',  cor: 0x1b1310, pele: 0x8a5a3c },
  principal: { cabelo: 'principal', cabeca: 'redonda', cor: 0x1b1310, sobrancelha: true },   // personagem principal, pele padrão do Zé
  topete:   { cabelo: 'topete',   cabeca: 'quadrada', cor: 0x3a2a22 },
  coque:    { cabelo: 'coque',    cabeca: 'alta',     cor: 0x5a3422 },
  moicano:  { cabelo: 'moicano',  cabeca: 'larga',    cor: 0xb8412a },
  rabo:     { cabelo: 'rabo',     cabeca: 'pera',     cor: 0x231812, pele: 0xb07a55 },
  lateral:  { cabelo: 'lateral',  cabeca: 'redonda',  cor: 0xc99a3c, pele: 0xf0c4a0 },
  cacheado: { cabelo: 'cacheado', cabeca: 'quadrada', cor: 0x2b1a12, pele: 0x9a6643 },
};

/** Cria um personagem pelo nome do estilo (ou {cabelo, cabeca, cor, pele}). Opções iguais ao v4. */
export function criarPersonagem(estilo = 'tigela', opcoes = {}) {
  const e = typeof estilo === 'string' ? ESTILOS[estilo] : estilo;
  if (!e || !(e.cabelo in CABELOS) || !(e.cabeca in CABECAS)) throw new Error(`Estilo desconhecido: ${JSON.stringify(estilo)}`);
  const p = criarZe(opcoes);
  const cabelo = p.raiz.getObjectByName('cabelo');
  const cabecaVisual = cabelo.parent;
  const pele = cabecaVisual.children[0].children[0];   // primeira peça do grupo da cabeça = pele

  const forma = CABECAS[e.cabeca];
  if (forma.escala) cabecaVisual.scale.set(...forma.escala);
  if (forma.deformar) {
    const geo = pele.geometry.clone(), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, ...forma.deformar(pos.getX(i), pos.getY(i), pos.getZ(i)));
    geo.computeVertexNormals();
    pele.geometry = geo;
  }
  // pele nova em tudo que tem a cor de pele do v4 (cabeça, orelhas, braços, mãos)
  if (e.pele) p.raiz.traverse((o) => { if (o.isMesh && o.material.color?.getHex() === PALETA.pele) o.material = mat(e.pele); });
  deformar = forma.deformar ?? ((x, y, z) => [x, y, z]);
  if (CABELOS[e.cabelo]) {
    cabelo.clear();
    CABELOS[e.cabelo](cabelo, e.cor);
  } else if (e.cor) cabelo.traverse((o) => { if (o.isMesh) o.material = mat(e.cor); });
  if (e.sobrancelha) {   // v4 esconde a sobrancelha em neutro/feliz/empolgado; aqui fica sempre visível
    const sobr = [];
    p.raiz.traverse((o) => { if (o.isMesh && o.material.color?.getHex() === PALETA.sobrancelha && o.geometry.type === 'BoxGeometry') sobr.push(o.parent); });
    const mostrar = (f) => (...a) => { const r = f(...a); sobr.forEach((g) => { g.visible = true; }); return r; };
    p.emocao = mostrar(p.emocao);
    if (p.misturarEmocoes) p.misturarEmocoes = mostrar(p.misturarEmocoes);
    if (sobr.length !== 2) throw new Error('sobrancelhas não encontradas: ' + sobr.length);
    p.emocao(p.emocaoAtual);
  }
  return p;
}
