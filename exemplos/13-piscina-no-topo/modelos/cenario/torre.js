// Torre moderna de luxo com cobertura-piscina de borda infinita. 1 u = 0,5 m, chao y = 0. Origem = centro da planta no chao.
// Planta 20 x 16 u (10 x 8 m), 12 andares de 6 u (3 m), laje de cobertura em y = 72 (topo 72,5). Frente = +z.
// API:
//   const torre = criarTorre();             // torre.group, torre.andares[i], torre.fachadas[i], torre.cascas, torre.piscina, torre.cobertura
//   torre.encaixarSala(sala)                // sala vira o andar 12 (indice 11): usa o teto-sala como laje da cobertura
//   torre.updateAt(t, { altura, vestir:[{de,ate,t0,dur}], padrao:'cru'|'vestido', led:{ate,k}, piscina:{nivel,led}, elevador:y })
//     altura   0..12 andares erguidos (fracao = andar crescendo em y); >= 12 mostra a cobertura
//     vestir   trecho de andares (de..ate, 0-based, inclusive) coberto de vidro painel por painel (ordem perimetro), um andar por vez
//     padrao   andares fora de qualquer evento: 'vestido' (padrao) ou 'cru'
//     led      andares < ate acesos, k 0..1
//     piscina  nivel 0..1 da agua, led 0..1 da borda
// ids: torre, piscina, andar-N, fachada-N (N 0-based), cobertura, elevador-panoramico
import * as THREE from 'three';
import { montarPorUnidades } from '../../kit/efeitos/montagem-unidades.js';
import { mat, caixa, cilindro, grupo, hash, clamp01, COR } from './util.js';

export const TORRE = Object.freeze({ W: 20, D: 16, H: 6, N: 12, laje: 0.5, yCobertura: 72 });
const { W, D, H, N, laje: LAJE } = TORRE;
const COLX = [-9.6, -3.2, 3.2, 9.6];
export const PISCINA = Object.freeze({ cx: 0, cz: 4, w: 8, d: 5, prof: 2, parede: 0.5 }); // 4 x 2,5 x 1 m = 10 000 L

const vidro = () => mat(COR.vidro, { transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.15, depthWrite: false });
const vidroTrilho = () => mat(0x9fe0dc, { transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false });

const TINTAS = [0xffc46b, 0xffd9a0, 0xffb066, 0xcfe6ff, 0xffe2b8];   // quente, quente claro, ambar, TV azulada, branco quente
const tintaDoAndar = (i) => TINTAS[Math.floor(hash(i, 7) * TINTAS.length)];
/** Silhuetas minimas por andar (deterministico). Retorna as pecas para poder esconde-las no andar da sala. */
function mobiliar(est, i, lampMat) {
  const h = (k) => hash(i, 20 + k), tipo = Math.floor(h(0) * 3), L = [], sx = h(1) > 0.5 ? 1 : -1;
  const pal = [[0x6f8196, 0x8a9db3], [0x8b7a66, 0xb3a089], [0x59656f, 0x7a8791]][Math.floor(h(2) * 3)];
  const add = (cor, w, hh, d, x, y, z) => { const m = caixa(est, cor, w, hh, d, x, LAJE + y, z); L.push(m); return m; };
  if (tipo === 0) {            // sala: sofa, mesa de centro, TV
    add(pal[0], 5.2, 0.6, 2.2, sx * -3.5, 0.3, -3); add(pal[0], 5.2, 0.9, 0.5, sx * -3.5, 0.75, -4.1); add(pal[1], 4.6, 0.2, 1.4, sx * -3.5, 0.7, -2.8);
    add(0x8a6a45, 3, 0.5, 1.6, sx * -3.5, 0.25, 0.4); add(0x2a2f36, 0.15, 1.5, 3.2, sx * 7.6, 2.0, -3); add(0x4a4036, 1, 0.8, 4, sx * 8.3, 0.4, -3);
  } else if (tipo === 1) {     // quarto: cama, cabeceira, criados, armario
    add(pal[1], 4.2, 0.7, 4.6, sx * 4, 0.35, -3); add(pal[0], 4.4, 1.8, 0.3, sx * 4, 0.9, -5.4); add(0xf1ece2, 1.4, 0.25, 0.9, sx * 3, 0.8, -4.6); add(0xf1ece2, 1.4, 0.25, 0.9, sx * 5, 0.8, -4.6);
    for (const dx of [-3, 3]) add(0x6e5a45, 1, 0.8, 1, sx * 4 + dx * 1.0, 0.4, -4.8);
    add(0x8a6a45, 4, 4.2, 1.2, sx * -5, 2.1, -7.0);
  } else {                     // cozinha/jantar: ilha, banquetas, geladeira, mesa
    add(0xdcd8cf, 6, 1.8, 1.8, 0, 0.9, -2); add(0x2a2f36, 6.2, 0.1, 2, 0, 1.85, -2);
    for (const x of [-2, 0, 2]) { const b = cilindro(est, pal[0], 0.35, 1.2, x, LAJE + 0.6, 0.3, 8); L.push(b); }
    add(0xb9c0c6, 1.6, 3.6, 1.6, sx * 8, 1.8, -6.4); add(0x8a6a45, 3.4, 0.9, 1.8, sx * -5, 0.45, 4.4);
  }
  const pole = cilindro(est, 0x2b3138, 0.05, 2.6, -sx * 8.2, LAJE + 1.3, 4.6, 6); L.push(pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), lampMat); bulb.position.set(-sx * 8.2, LAJE + 2.8, 4.6); est.add(bulb); L.push(bulb);
  return L;
}

function criarAndar(i) {
  const andar = grupo('andar-' + i); andar.position.y = i * H;
  const est = grupo('estrutura-' + i, andar), fac = grupo('fachada-' + i); andar.add(fac);
  const luzMat = new THREE.MeshStandardMaterial({ color: 0xfff1d2, emissive: tintaDoAndar(i), emissiveIntensity: 0, flatShading: true });
  // estrutura crua: laje, vigas brancas de borda, pilares
  caixa(est, COR.concreto, W, LAJE, D, 0, LAJE / 2, 0);
  for (const z of [-D / 2, D / 2]) caixa(est, COR.branco, W + 0.6, 0.6, 0.35, 0, 0.3, z);
  for (const x of [-W / 2, W / 2]) caixa(est, COR.branco, 0.35, 0.6, D + 0.6, x, 0.3, 0);
  for (const x of COLX) for (const z of [-D / 2 + 0.4, D / 2 - 0.4]) caixa(est, COR.branco, 0.8, H - LAJE, 0.8, x, LAJE + (H - LAJE) / 2, z);
  const luz = new THREE.Mesh(new THREE.BoxGeometry(W - 3, 0.08, D - 3), luzMat); luz.position.y = H - 0.06; luz.name = 'luz-andar'; est.add(luz);
  // interior habitado: silhuetas minimas de moveis (sala, quarto ou cozinha por andar) e um abajur aceso conforme o andar
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff1d2, emissive: 0xffc46b, emissiveIntensity: 0, flatShading: true });
  const blocos = mobiliar(est, i, lampMat);
  // fachada: paineis de vidro (10 em cada face longa, 8 em cada lateral); a ordem de filhos segue o perimetro
  const gm = vidro();
  const faces = [
    { n: 10, f: (k) => [-W / 2 + 1 + 2 * k, D / 2 - 0.12, 1.94, 0.08, 0], z: 1 },
    { n: 8, f: (k) => [W / 2 - 0.12, D / 2 - 1 - 2 * k, 0.08, 1.94, 0] },
    { n: 10, f: (k) => [W / 2 - 1 - 2 * k, -D / 2 + 0.12, 1.94, 0.08, 0] },
    { n: 8, f: (k) => [-W / 2 + 0.12, -D / 2 + 1 + 2 * k, 0.08, 1.94, 0] },
  ];
  const jardim = i === 5;
  for (const [fi, face] of faces.entries()) {
    for (let k = 0; k < face.n; k++) {
      if (jardim && fi === 0 && k >= 3 && k <= 6) continue;             // trecho vira jardim vertical
      const [x, z, w, d] = face.f(k);
      const p = new THREE.Mesh(new THREE.BoxGeometry(w, 5.2, d), gm);
      p.position.set(x, LAJE + 0.05 + 2.6, z); p.name = 'painel'; fac.add(p);
    }
  }
  // brises: aletas verticais brancas na face frontal em andares alternados
  if (i % 3 === 2) for (let k = 0; k <= 10; k++) caixa(fac, COR.branco, 0.1, 5.2, 0.5, -W / 2 + 2 * k, LAJE + 2.65, D / 2 + 0.2);
  // varanda em balanco + guarda-corpo de vidro (andares 1..10, menos o do jardim)
  if (i >= 1 && i <= 10 && !jardim) {
    const bx = (i % 3 - 1) * 5.6, bw = 5.8, bd = 2.2, bz = D / 2 + bd / 2 - 0.1;
    caixa(est, COR.concreto, bw, 0.4, bd, bx, 0.2, bz);
    const gr = vidroTrilho();
    caixa(fac, gr, bw, 1.8, 0.06, bx, 0.4 + 0.9, D / 2 + bd - 0.15);
    for (const s of [-1, 1]) caixa(fac, gr, 0.06, 1.8, bd - 0.1, bx + s * (bw / 2 - 0.03), 0.4 + 0.9, bz);
    caixa(fac, COR.branco, bw, 0.08, 0.1, bx, 0.4 + 1.84, D / 2 + bd - 0.15);
  }
  // jardim vertical: base + folhas low poly (verdes variados, deterministicos)
  if (jardim) {
    caixa(fac, 0x5a4632, 8, 5.2, 0.3, 0, LAJE + 2.7, D / 2 - 0.2);
    const verdes = [0x3f9a46, 0x55b255, 0x2f7f3f, 0x6bc06b];
    for (let k = 0; k < 70; k++) {
      const r = 0.28 + hash(k, 3) * 0.3, f = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(verdes[k % 4]));
      f.position.set(-3.7 + hash(k, 4) * 7.4, LAJE + 0.4 + hash(k, 5) * 4.6, D / 2 + 0.05 + hash(k, 6) * 0.15);
      f.castShadow = true; f.name = 'folha'; fac.add(f);
    }
    caixa(est, COR.concreto, 8, 0.5, 0.9, 0, 0.25 + 0.0, D / 2 + 0.2);
  }
  return { andar, est, fac, luzMat, lampMat, blocos };
}

function criarPiscina() {
  const P = PISCINA, g = grupo('piscina');
  g.position.set(P.cx, 0.5, P.cz);
  const ow = P.w + 2 * P.parede, od = P.d + 2 * P.parede, y0 = 0, yTopo = P.prof;
  caixa(g, COR.concreto, ow, 0.5, od, 0, y0 - 0.25, 0);                              // fundo (topo em y=0 local)
  const paredes = grupo('paredes-piscina', g);
  caixa(paredes, COR.concreto, ow, yTopo, P.parede, 0, yTopo / 2, -P.d / 2 - P.parede / 2);   // fundo da piscina (lado do predio)
  caixa(paredes, COR.concreto, P.parede, yTopo, P.d, -P.w / 2 - P.parede / 2, yTopo / 2, 0);
  caixa(paredes, COR.concreto, P.parede, yTopo, P.d, P.w / 2 + P.parede / 2, yTopo / 2, 0);
  const hf = yTopo - 0.35;
  caixa(paredes, 0x3e4a55, ow, hf, P.parede, 0, hf / 2, P.d / 2 + P.parede / 2);   // borda infinita: parede da frente 0,35 u mais baixa que a agua
  // calha de captacao na frente
  caixa(g, COR.concretoEscuro, ow, 1.0, 0.9, 0, 0, P.d / 2 + P.parede + 0.45);
  const calha = caixa(g, COR.agua, ow - 0.4, 0.04, 0.5, 0, 0.52, P.d / 2 + P.parede + 0.45, { transparent: true, opacity: 0.8 });
  // agua em volume (escala y por nivel); base fixa em y=0
  const agua = new THREE.Mesh(new THREE.BoxGeometry(P.w, 1, P.d), new THREE.MeshStandardMaterial({ color: COR.agua, flatShading: true, transparent: true, opacity: 0.82, roughness: 0.1, metalness: 0.1, emissive: 0x1b5aa8, emissiveIntensity: 0.25 }));
  agua.name = 'agua'; agua.position.y = 0.5; agua.scale.y = 0.001; g.add(agua);
  // LED da borda: fita emissiva no topo das paredes
  const ledMat = new THREE.MeshBasicMaterial({ color: COR.ledFrio, transparent: true, opacity: 0 });
  const led = grupo('led-piscina', g);
  for (const [w, d, x, z] of [[ow, 0.08, 0, -od / 2 + 0.04], [0.08, od, -ow / 2 + 0.04, 0], [0.08, od, ow / 2 - 0.04, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), ledMat); m.position.set(x, yTopo + 0.03, z); led.add(m);
  }
  const luzAgua = new THREE.Mesh(new THREE.BoxGeometry(P.w - 0.4, 0.04, P.d - 0.4), ledMat); luzAgua.position.y = 0.06; led.add(luzAgua);
  // lamina d'agua que transborda pela parede da frente ate a calha (so com a piscina cheia)
  const lamina = new THREE.Mesh(new THREE.BoxGeometry(P.w, 1.3, 0.05), new THREE.MeshStandardMaterial({ color: 0x8cd0ff, emissive: 0x2a78c8, emissiveIntensity: 0.4, transparent: true, opacity: 0.6, flatShading: true, depthWrite: false }));
  lamina.position.set(0, 1.17, P.d / 2 + P.parede + 0.04); lamina.name = 'lamina-borda'; g.add(lamina);
  const ledFrente = new THREE.Mesh(new THREE.BoxGeometry(ow, 0.07, 0.1), ledMat); ledFrente.position.set(0, hf + 0.04, P.d / 2 + P.parede - 0.05); led.add(ledFrente);
  g.userData = { agua, ledMat, calha, lamina };
  return g;
}

function criarCobertura() {
  const g = grupo('cobertura'); g.position.y = TORRE.yCobertura + LAJE;
  const piscina = criarPiscina(); g.add(piscina);
  // deck de madeira em tabuas, recortado em volta da piscina
  const deck = grupo('deck', g), P = PISCINA, px0 = P.cx - P.w / 2 - P.parede - 0.2, px1 = P.cx + P.w / 2 + P.parede + 0.2, pz0 = P.cz - P.d / 2 - P.parede, pz1 = P.cz + P.d / 2 + P.parede + 0.9;
  for (let k = 0, z = -7.3; z < 7.4; k++, z += 0.95) {
    const cor = k % 2 ? COR.madeira : 0xc4955a, zc = z + 0.45;
    if (zc + 0.45 > pz0 && zc - 0.45 < pz1) {
      caixa(deck, cor, px0 + W / 2 - 0.3, 0.15, 0.9, (px0 - W / 2 + 0.3) / 2, 0.075, zc);
      caixa(deck, cor, W / 2 - 0.3 - px1, 0.15, 0.9, (px1 + W / 2 - 0.3) / 2, 0.075, zc);
    } else caixa(deck, cor, W - 0.6, 0.15, 0.9, 0, 0.075, zc);
  }
  // guarda-corpo de vidro no perimetro (translucido) com corrimao branco
  const casca = grupo('casca-cobertura', g), gr = vidroTrilho();
  for (const z of [-D / 2 + 0.2, D / 2 - 0.2]) { caixa(casca, gr, W - 0.4, 2.2, 0.06, 0, 1.1, z); caixa(casca, COR.branco, W - 0.4, 0.08, 0.12, 0, 2.24, z); }
  for (const x of [-W / 2 + 0.2, W / 2 - 0.2]) { caixa(casca, gr, 0.06, 2.2, D - 0.4, x, 1.1, 0); caixa(casca, COR.branco, 0.12, 0.08, D - 0.4, x, 2.24, 0); }
  // espreguicadeiras (3)
  const lounger = (k) => {
    const l = grupo('espreguicadeira-' + k, g); l.position.set(-7 + (k % 2) * 0, 0.15, 0.3 + k * 2.4);
    for (const [x, z] of [[-0.55, -1.3], [0.55, -1.3], [-0.55, 1.1], [0.55, 1.1]]) cilindro(l, COR.escuro, 0.05, 0.3, x, 0.15, z, 6);
    caixa(l, COR.branco, 1.4, 0.14, 3.0, 0, 0.37, 0);                       // base
    caixa(l, 0xe6eef2, 1.3, 0.1, 2.9, 0, 0.5, 0);                           // colchonete
    const enc = caixa(l, 0xe6eef2, 1.3, 0.1, 1.5, 0, 0.9, -1.55); enc.rotation.x = 0.9;
    enc.position.set(0, 0.95, -1.55);
    return l;
  };
  [0, 1, 2].forEach(lounger);
  // paineis solares inclinados + antena discreta
  const solar = grupo('paineis-solares', g);
  for (let k = 0; k < 6; k++) {
    const p = grupo('painel-solar-' + k, solar); p.position.set(-7.5 + k * 3, 0.15, -6.2);
    const placa = caixa(p, 0x1d3557, 2.6, 0.08, 1.5, 0, 0.55, 0, { roughness: 0.3, metalness: 0.4 }); placa.rotation.x = 0.45; // alta atras
    for (const x of [-1, 1]) { caixa(p, COR.metal, 0.08, 0.8, 0.08, x, 0.4, -0.55); caixa(p, COR.metal, 0.08, 0.4, 0.08, x, 0.2, 0.3); }
  }
  const ant = grupo('antena', g); ant.position.set(8.3, 0, -6.6);
  cilindro(ant, COR.metal, 0.07, 6, 0, 3, 0, 6); const bola = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mat(COR.aco)); bola.position.y = 6.05; ant.add(bola);
  cilindro(ant, COR.metal, 0.25, 0.3, 0, 0.15, 0, 8);
  return { g, piscina, casca };
}

function criarElevadorPanoramico() {
  const g = grupo('elevador-panoramico'); g.position.set(W / 2 + 1.6, 0, -3.5);
  const gl = vidroTrilho();
  caixa(g, gl, 3, TORRE.yCobertura, 0.06, 0, TORRE.yCobertura / 2, 1.5); caixa(g, gl, 3, TORRE.yCobertura, 0.06, 0, TORRE.yCobertura / 2, -1.5);
  caixa(g, gl, 0.06, TORRE.yCobertura, 3, 1.5, TORRE.yCobertura / 2, 0);
  for (const [x, z] of [[-1.5, -1.5], [-1.5, 1.5], [1.5, -1.5], [1.5, 1.5]]) caixa(g, COR.branco, 0.18, TORRE.yCobertura, 0.18, x, TORRE.yCobertura / 2, z);
  const cab = caixa(g, 0xe8ecef, 2, 2.6, 2, 0, 1.3, 0); cab.name = 'cabine-panoramica';
  caixa(cab, 0xffc46b, 1.6, 0.05, 1.6, 0, 1.25, 0, { emissive: 0xffc46b, emissiveIntensity: 0.8 });
  return { g, cab };
}

export function criarTorre() {
  const raiz = grupo('torre');
  const blocosPorAndar = [], lampadas = [], andares = [], fachadas = [], luzes = [], cascas = [];
  for (let i = 0; i < N; i++) {
    const a = criarAndar(i); raiz.add(a.andar); andares.push(a.andar); blocosPorAndar.push(a.blocos); lampadas.push(a.lampMat); fachadas.push(a.fac); luzes.push(a.luzMat); cascas.push(a.fac);
  }
  const cob = criarCobertura(); raiz.add(cob.g); cascas.push(cob.casca);
  const laje12 = caixa(raiz, COR.concreto, W, LAJE, D, 0, TORRE.yCobertura + LAJE / 2, 0); laje12.name = 'laje-cobertura';
  const elev = criarElevadorPanoramico(); raiz.add(elev.g); cascas.push(elev.g);
  const luzDeck = new THREE.PointLight(0x9fe9ff, 0, 30); luzDeck.position.set(0, TORRE.yCobertura + 3.5, PISCINA.cz); raiz.add(luzDeck);
  const api = {
    group: raiz, andares, fachadas, luzes, cascas, cobertura: cob.g, piscina: cob.piscina, laje12, elevador: elev, luzDeck, sala: null,
    dims: TORRE, pisoDoAndar: (i) => i * H + LAJE,
    ids: { torre: raiz, piscina: cob.piscina },
    encaixarSala(sala) {
      sala.group.position.set(0, 11 * H + LAJE, 0); sala.embutir(true);
      raiz.add(sala.group); blocosPorAndar[11].forEach((b) => { b.visible = false; }); laje12.visible = false; api.sala = sala; api.ids.sala = sala.group; return api;
    },
    updateAt(t, p = {}) {
      const alt = p.altura ?? N, padrao = p.padrao ?? 'vestido', ev = p.vestir ?? [];
      andares.forEach((a, i) => {
        const cheio = alt >= i + 1, parcial = alt > i && !cheio;
        a.visible = alt > i; a.scale.set(1, parcial ? Math.max(0.001, alt - i) : 1, 1);
      });
      const vest = padrao !== 'cru' || ev.length > 0;   // guarda-corpo de vidro e elevador panoramico so aparecem vestidos
      cob.g.visible = alt >= N; cob.casca.visible = vest; laje12.visible = alt >= N && !api.sala; elev.g.visible = alt > 0 && vest;
      elev.cab.position.y = 1.3 + (p.elevador ?? 0);
      // vestir painel por painel: cada evento reparte [t0, t0+dur] igualmente entre seus andares
      const por = new Map();
      for (const e of ev) { const n = e.ate - e.de + 1; for (let i = e.de; i <= e.ate; i++) por.set(i, { t0: e.t0 + (i - e.de) * e.dur / n, dur: e.dur / n }); }
      fachadas.forEach((f, i) => {
        const w = por.get(i);
        if (w) { f.visible = true; montarPorUnidades(f, t, { t0: w.t0, dur: w.dur, ordem: 'perimetro' }); }
        else { f.children.forEach((c) => { c.visible = true; c.scale.set(1, 1, 1); }); f.visible = padrao !== 'cru'; }
      });
      // moveis e a sala so existem no andar ja vestido (obra crua = andar vazio)
      const vestido = fachadas.map((f) => f.visible); api.vestido = vestido;
      blocosPorAndar.forEach((bs, i) => { if (!(api.sala && i === 11)) bs.forEach((b) => { b.visible = vestido[i]; }); });
      if (api.sala) api.sala.group.visible = alt >= N && vestido[11];
      // LED por andar
      // luz por andar: habitado = alguns apagados e intensidade variada; senao tudo igual
      const led = p.led ?? { ate: 0, k: 0 };
      luzes.forEach((m, i) => {
        const base = i < led.ate ? 0.7 * clamp01(led.k ?? 1) : 0;
        const on = !led.habitado || i === N - 1 || hash(i, 9) > 0.3, v = led.habitado ? 0.55 + 0.45 * hash(i, 5) : 1;
        m.emissiveIntensity = on ? base * v : 0; lampadas[i].emissiveIntensity = on ? 4 * base * v : 0;
      });
      // piscina
      const ps = p.piscina ?? { nivel: 1, led: 1 }, d = cob.piscina.userData;
      d.agua.scale.y = Math.max(0.001, clamp01(ps.nivel) * (PISCINA.prof - 0.15)); d.agua.position.y = d.agua.scale.y / 2;
      d.lamina.visible = ps.nivel > 0.92;
      d.ledMat.opacity = clamp01(ps.led ?? 0); luzDeck.intensity = 25 * clamp01(ps.led ?? 0);
    },
  };
  return api;
}
