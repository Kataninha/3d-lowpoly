// Parede da piscina (sem aco / armada, cenas proprias), fissura, manta e cano com anel vedante.
// Ids: parede-piscina, fissura, manta, cano. Cada animar<X>(obj, t) e funcao pura de t.
// Corte real: concreto opaco recortado por clippingPlanes + tampa solida no plano (aco em relevo).
import * as THREE from 'three';
import { crescerPeca } from '../../kit/efeitos/montagem-unidades.js';
import { COR, mat, concretoOpaco, box, cyl, add, grupo, sombra, barra, criarSeta, setSeta, smooth, clamp01, planoZ, planoX, matCorte, tampaZ, tampaX, barraCorte, montar, encaixes, criarAgua, ondularAgua } from './base.js';

/* ---------------- parede-piscina: fiada a fiada, setas de pressao; sem aco abaula, armada nao ---------------- */
const NF = 4, FH = 0.5, WT = 0.5, WH = NF * FH, PD = 3, NIVEL = 1.8;
const ALTURAS = [0.3, 0.7, 1.1, 1.5];

function criarCorte(armada) {
  const g = new THREE.Group(); g.name = armada ? 'parede-armada' : 'parede-sem-aco';
  const plano = planoZ(0), mC = matCorte(COR.concreto, plano);
  const fundo = add(g, new THREE.BoxGeometry(7, 0.5, PD), mC, 0, -0.25, 0);
  tampaZ(fundo, COR.concreto, 7, 0.5, 0, 0, -0.08);
  sombra(g, 8.6, 4.4, 0, 0, -0.49);
  if (armada) {
    barraCorte(g, plano, [-3.3, -0.2, 0], [3.3, -0.2, 0], 0.06);
    for (const bx of [-2.4, -0.8, 0.8, 2.4]) barraCorte(g, plano, [bx, -0.3, -1.35], [bx, -0.3, 1.35], 0.06);
  }
  const fiadas = { '-1': [], '1': [] };
  for (const side of [-1, 1]) for (let k = 0; k < NF; k++) {
    const f = grupo(g, 'fiada', side * (3 + WT / 2), FH * (k + 0.5), 0);
    const bloco = add(f, new THREE.BoxGeometry(WT, FH - 0.02, PD), mC);
    tampaZ(bloco, COR.concreto, WT, FH - 0.02, 0, 0, -0.08);
    if (armada) {
      barraCorte(f, plano, [side * 0.12, -FH / 2, 0], [side * 0.12, FH / 2, 0], 0.07);
      barraCorte(f, plano, [-side * 0.1, 0, -1.35], [-side * 0.1, 0, 1.35], 0.07);
    }
    fiadas[side].push(f);
  }
  const agua = criarAgua(g, { w: 6, h: NIVEL, d: PD - 0.1, plano, nx: 12, nz: 8 });
  agua.tampa.position.z = -0.012; agua.group.visible = false;
  const press = [], resist = [];
  for (const side of [-1, 1]) for (const y of ALTURAS) {
    const s = criarSeta(COR.vermelho, 0.2); s.rotation.y = side < 0 ? Math.PI : 0; g.add(s); press.push({ s, side, y });
  }
  if (armada) for (const side of [-1, 1]) for (const y of ALTURAS) {
    const s = criarSeta(COR.verde, 0.2); s.rotation.y = side < 0 ? 0 : Math.PI; g.add(s); resist.push({ s, side, y });
  }
  return { group: g, fundo, fiadas, agua, press, resist, armada };
}
const criarParede = (armada) => () => criarCorte(armada);
const nivelAgua = (t) => NIVEL * (0.02 + 0.98 * clamp01((t - 2.4) / 1.2));
export function animarParedePiscina(c, t) {
  for (const side of [-1, 1]) c.fiadas[side].forEach((f, k) => montar(f, t, { t0: 0.3 + 0.45 * k, dur: 0.45, ordem: 'perimetro' }));
  c.agua.group.visible = t > 2.4;
  if (c.agua.group.visible) crescerPeca(c.agua.group, t, { eixo: 'y', t0: 2.4, dur: 1.2 });
  ondularAgua(c.agua, t);
  const lvl = nivelAgua(t), entra = smooth((t - 2.6) / 0.5);
  const B = (c.armada ? 0.015 : 0.55) * smooth((t - 4.8) / 1.3);          // abaulamento da parede
  const off = (y) => B * clamp01(y / WH) ** 1.6;
  for (const side of [-1, 1]) c.fiadas[side].forEach((f, k) => { f.position.x = side * (3 + WT / 2 + off(FH * (k + 0.5))); });
  for (const { s, side, y } of c.press) {
    const depth = Math.max(0, lvl - y), len = depth > 0.04 ? (0.3 + 1.0 * depth) * entra : 0;
    setSeta(s, len); s.position.set(side * (3 + off(y)) - side * len, y, 0.02);
  }
  const verde = smooth((t - 5.0) / 0.6);
  for (const { s, side, y } of c.resist) {
    const len = (0.3 + 1.0 * (NIVEL - y)) * verde;
    setSeta(s, len); s.position.set(side * (3 + WT + off(y)) + side * len, y, 0.02);
  }
  return { nivel: +lvl.toFixed(2), abaulamento: +B.toFixed(3) };
}
export const DUR_PAREDE = 6.8;
const sfxParede = () => [...encaixes(NF, { t0: 0.3, dur: 0.45 * NF }).map((_, i) => +(0.3 + 0.45 * i + 0.45).toFixed(3)), 3.6, 6.1];

/* ---------------- fissura no canto do fundo + gotas ---------------- */
const FLOOR_Y = -3.6;
export function criarFissura() {
  const g = new THREE.Group(); g.name = 'fissura-cena';
  box(g, COR.concreto, 7, 0.5, 3, 0, -0.25, 0);                     // laje/fundo da piscina em corte
  box(g, COR.concreto, 0.5, 2.0, 3, -3.25, 1.0, 0);                 // parede esquerda
  const agua = criarAgua(g, { w: 6, h: 1.6, d: 2.9, x: 0.25, y: 0, nx: 12, nz: 6 });
  box(g, COR.concreto, 9, 0.2, 5, 0, FLOOR_Y - 0.1, 0); sombra(g, 9, 5, 0, 0, FLOOR_Y + 0.01);
  const pts = [[0, 0], [0.12, -0.1], [-0.05, -0.2], [0.1, -0.3], [-0.04, -0.4], [0.06, -0.5]];
  const topo = [], perfil = [];
  for (let i = 0; i < 8; i++) topo.push(box(g, COR.fissura, 0.07, 0.02, 0.4, -2.8 + (i % 2 ? 0.05 : -0.03), 0.012, -1.4 + i * 0.4));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const s = box(g, COR.fissura, 0.08, Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.02, 0.04, -2.8 + (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 1.52);
    s.rotation.z = Math.atan2(-(b[0] - a[0]), b[1] - a[1]); perfil.push(s);
  }
  const gotas = [0, 1, 2].map(() => add(g, new THREE.SphereGeometry(1, 8, 6), mat(COR.agua), -2.8, -0.5, 1.0));
  const respingos = [0, 1, 2].map(() => { const m = add(g, new THREE.CylinderGeometry(1, 1, 0.03, 14), mat(COR.agua), -2.8, FLOOR_Y + 0.02, 1.0); m.castShadow = false; return m; });
  const poca = add(g, new THREE.CylinderGeometry(1, 1, 0.03, 20), mat(COR.agua), -2.8, FLOOR_Y + 0.015, 1.0); poca.castShadow = false;
  return { group: g, agua, topo, perfil, gotas, respingos, poca };
}
const T_GOTA = 2.0, PERIODO = 0.9;
export function animarFissura(obj, t) {
  ondularAgua(obj.agua, t);
  const p = clamp01((t - 0.3) / 1.5), total = obj.topo.length + obj.perfil.length;
  const n = Math.round(p * total);
  obj.topo.forEach((s, i) => { s.visible = i < n; });
  obj.perfil.forEach((s, i) => { s.visible = obj.topo.length + i < n; });
  obj.gotas.forEach((m, j) => {
    const ph = (((t - T_GOTA) / PERIODO + j / 3) % 1 + 1) % 1;
    m.visible = t >= T_GOTA;
    let y, r;
    if (ph < 0.4) { y = -0.5 * (ph / 0.4); r = 0.06; }                       // atravessa a espessura pela fissura
    else if (ph < 0.6) { y = -0.5; r = 0.06 + 0.05 * ((ph - 0.4) / 0.2); }   // pende e engorda
    else { const v = (ph - 0.6) / 0.4; y = -0.5 - (FLOOR_Y * -1 - 0.5) * v * v; r = 0.11; }
    m.position.y = y; m.scale.set(r, r * (ph >= 0.6 ? 1.3 : 1), r);
    const rs = obj.respingos[j]; const s = ph < 0.18 && t > T_GOTA + 0.6 ? ph / 0.18 : 0;
    rs.visible = s > 0; rs.scale.set(0.05 + 0.4 * s, 1, 0.05 + 0.4 * s);
  });
  const area = clamp01((t - T_GOTA - 0.6) / 4);
  obj.poca.visible = area > 0; obj.poca.scale.set(0.1 + 0.8 * area, 1, 0.1 + 0.8 * area);
  return { segmentos: n, de: total };
}
export const DUR_FISSURA = 5.0;
const sfxFissura = () => [0.3 + 1.5, T_GOTA + 0.4 * PERIODO + 0.6 * PERIODO, T_GOTA + 0.9 + 0.54];   // fissura abre; primeiras gotas batem no piso

/* ---------------- manta: rola faixa por faixa, cobre fundo e paredes ---------------- */
const MN = 6, M_T0 = 0.6, M_DUR = 2.6;
export function criarManta() {
  const g = new THREE.Group(); g.name = 'manta-cena';
  box(g, concretoOpaco(), 7, 0.5, 3, 0, -0.25, 0);
  for (const sx of [-1, 1]) box(g, concretoOpaco(), 0.5, 2.0, 3, sx * 3.25, 1.0, 0);
  sombra(g, 8.4, 4.2, 0, 0, -0.49);
  const trinca = box(g, COR.fissura, 0.07, 0.01, 2.6, -2.85, 0.005, 0);   // a fissura do fundo, antes da manta
  const faixas = grupo(g, 'faixas');
  for (let i = 0; i < MN; i++) {
    const f = grupo(faixas, 'faixa', 0, 0, 1.25 - 0.5 * i);
    box(f, COR.manta, 6.0, 0.05, 0.49, 0, 0.035, 0);
    for (const sx of [-1, 1]) box(f, COR.manta, 0.05, 2.0, 0.49, sx * 2.975, 1.0, 0);
  }
  const rolo = cyl(g, COR.manta, 1, 6.0, 0, 0.4, 1.5, 12); rolo.rotation.z = Math.PI / 2; rolo.name = 'rolo';
  return { group: g, faixas, rolo, trinca };
}
export function animarManta(obj, t) {
  montar(obj.faixas, t, { t0: M_T0, dur: M_DUR, ordem: 'indice' });
  const step = (M_DUR - 0.12) / (MN - 1), u = (t - M_T0) / step;
  const zr = 1.5 - 0.5 * (Math.min(Math.max(u, -1), MN - 1) + 1);
  const R = 0.05 + 0.4 * clamp01(1 - Math.max(u, 0) / (MN - 1));
  obj.rolo.visible = t > M_T0 - step && u < MN - 1 + 0.2;
  obj.rolo.scale.set(R, 1, R); obj.rolo.position.set(0, R + 0.01, zr);
  obj.rolo.rotation.x = -zr * 2.2 / Math.max(R, 0.05);
  return { faixas: obj.faixas.children.filter((c) => c.visible).length, rolo: +R.toFixed(2) };
}
export const DUR_MANTA = 4.0;
const sfxManta = () => encaixes(MN, { t0: M_T0, dur: M_DUR });

/* ---------------- cano: corte pelo eixo; manta ao redor, anel vedante apertado ---------------- */
export function criarCano() {
  const g = new THREE.Group(); g.name = 'cano-cena';
  const plano = planoX(0);
  add(g, new THREE.BoxGeometry(3, 3, 0.6), matCorte(COR.concreto, plano), 0, 1.5, 0);
  tampaX(g, COR.concreto, 0.6, 3, 1.5, 0, 0);
  sombra(g, 4, 3, 0, 0);
  const tubo = grupo(g, 'cano', 0, 1.5, 0.1);
  const t3 = cyl(tubo, matCorte(COR.cano, plano, { dupla: true }), 0.25, 3.4, 0, 0, 0, 14); t3.rotation.x = Math.PI / 2;
  tampaX(tubo, COR.cano, 3.4, 0.5, 0, 0, 0);
  const manta = grupo(g, 'manta-parede');
  const L = 0.07, z = 0.33, mM = matCorte(COR.manta, plano);
  for (const [w, h, x, y] of [[3, 1.1, 0, 2.45], [3, 1.1, 0, 0.55], [1.1, 0.8, -0.95, 1.5], [1.1, 0.8, 0.95, 1.5]]) box(manta, mM, w, h, L, x, y, z);
  const anel = grupo(g, 'anel-vedante', 0, 1.5, 2.4);
  const sh = new THREE.Shape(); sh.absarc(0, 0, 0.56, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.27, 0, Math.PI * 2, true); sh.holes.push(hole);
  add(anel, new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false, curveSegments: 12 }), matCorte(COR.vedante, plano, { dupla: true }), 0, 0, -0.06);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(anel, matCorte(COR.metalEscuro, plano), 0.1, 0.1, 0.1, Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.1); }
  return { group: g, tubo, manta, anel };
}
export function animarCano(obj, t) {
  const e = smooth((t - 0.3) / 1.0);
  obj.tubo.position.z = 0.1 - 2.5 * (1 - e);
  montar(obj.manta, t, { t0: 1.5, dur: 0.7, ordem: 'indice' });
  obj.anel.visible = t > 2.2;
  const d = smooth((t - 2.4) / 0.8), ap = smooth((t - 3.3) / 0.8);
  obj.anel.position.z = 2.4 - d * 2.0 - ap * 0.02;
  obj.anel.rotation.z = -ap * 2.4;
  return { z: +obj.anel.position.z.toFixed(2), aperto: +ap.toFixed(2) };
}
export const DUR_CANO = 4.5;
const sfxCano = () => [1.3, ...encaixes(4, { t0: 1.5, dur: 0.7 }), 3.2, 4.1];

export const cenas = {
  'parede-sem': { pisoTopo: -0.5, criar: criarParede(false), animar: animarParedePiscina, dur: DUR_PAREDE, tempos: [0.9, 2.1, 3.3, 4.7, 6.6], cam: { eye: [0, 7.5, 24], target: [0, 0.9, 0], fov: 40 }, size: [540, 960], sfx: sfxParede },
  'parede-armada': { pisoTopo: -0.5, criar: criarParede(true), animar: animarParedePiscina, dur: DUR_PAREDE, tempos: [0.9, 2.1, 3.3, 4.7, 6.6], cam: { eye: [0, 7.5, 24], target: [0, 0.9, 0], fov: 40 }, size: [540, 960], sfx: sfxParede },
  fissura: { piso: false, criar: criarFissura, animar: animarFissura, dur: DUR_FISSURA, tempos: [0.5, 1.2, 2.2, 3.2, 4.8], cam: { eye: [-1.5, -1.2, 14], target: [-2.0, -1.6, 0.4], fov: 50 }, size: [540, 960], sfx: sfxFissura },
  manta: { pisoTopo: -0.5, criar: criarManta, animar: animarManta, dur: DUR_MANTA, tempos: [0.4, 1.3, 2.0, 2.8, 3.8], cam: { eye: [4, 7, 14], target: [0, 0.5, 0], fov: 45 }, size: [540, 960], sfx: sfxManta },
  cano: { criar: criarCano, animar: animarCano, dur: DUR_CANO, tempos: [0.6, 1.8, 2.8, 3.6, 4.4], cam: { eye: [5.5, 2.8, 4.8], target: [0, 1.5, 0.3], fov: 42 }, size: [540, 960], sfx: sfxCano },
};
