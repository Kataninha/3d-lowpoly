// Pilar, viguinha (racha vs armada), viga e laje (verga vs reforcada). Ids: pilar, viguinha, viga, laje.
// Corte real: concreto OPACO recortado por clippingPlanes + tampa solida no plano; o aco aparece em relevo na tampa.
import * as THREE from 'three';
import { crescerPeca } from '../../kit/efeitos/montagem-unidades.js';
import { COR, mat, box, cyl, add, grupo, sombra, barra, unidadeBarra, smooth, clamp01, planoZ, matCorte, tampaZ, barraCorte, montar, encaixes, criarAgua, ondaY } from './base.js';

/** Estribo (laco quadrado de aco) como Group centrado em y; todas as barras usam o material recortado `mAco`. */
function estribo(parent, y, w, d, mAco, r = 0.03) {
  const g = grupo(parent, 'estribo', 0, y, 0);
  const hx = w / 2, hz = d / 2;
  const b = (a, c) => { barra(g, a, c, r).material = mAco; };
  for (const sz of [-1, 1]) b([-hx, 0, sz * hz], [hx, 0, sz * hz]);
  for (const sx of [-1, 1]) b([sx * hx, 0, -hz], [sx * hx, 0, hz]);
  return g;
}

/* ---------------- pilar: gaiola barra a barra, concreto anel a anel, corte ---------------- */
const PW = 0.8, ANEIS = 8, ANEL_H = 0.7, PY0 = 0.4, ZP0 = 0.5, ZP = 0.28;
export function criarPilar() {
  const g = new THREE.Group(); g.name = 'pilar-cena';
  box(g, COR.concreto, 2.4, PY0, 2.4, 0, PY0 / 2, 0); sombra(g, 3.4, 3.4);
  const plano = planoZ(ZP0), mAco = matCorte(COR.aco, plano, { dupla: true }), mC = matCorte(COR.concreto, plano);
  const gaiola = grupo(g, 'gaiola'), estribos = grupo(g, 'estribos'), aneis = grupo(g, 'aneis');
  const topo = PY0 + ANEIS * ANEL_H + 0.3;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const u = unidadeBarra(gaiola, [sx * 0.28, PY0, sz * 0.28], [sx * 0.28, topo, sz * 0.28], 0.06, COR.aco); u.traverse((o) => { if (o.isMesh) o.material = mAco; }); }
  for (let i = 0; i < ANEIS; i++) estribo(estribos, PY0 + 0.35 + i * ANEL_H, 0.56, 0.56, mAco);
  for (let i = 0; i < ANEIS; i++) { const a = add(aneis, new THREE.BoxGeometry(PW, ANEL_H - 0.02, PW), mC, 0, PY0 + ANEL_H / 2 + i * ANEL_H, 0); a.name = 'anel'; }
  const tampa = tampaZ(g, COR.concreto, PW, ANEIS * ANEL_H, 0, PY0 + ANEIS * ANEL_H / 2, ZP0); tampa.visible = false;
  return { group: g, gaiola, estribos, aneis, plano, tampa };
}
export function animarPilar(obj, t) {
  montar(obj.gaiola, t, { t0: 0.3, dur: 1.2, ordem: 'indice' });
  montar(obj.estribos, t, { t0: 1.6, dur: 1.5, ordem: 'baixo-cima' });
  montar(obj.aneis, t, { t0: 3.3, dur: 1.8, ordem: 'baixo-cima' });
  const k = smooth((t - 5.5) / 0.9), zc = ZP0 + (ZP - ZP0) * k;   // plano varre ate o eixo das barras da frente
  obj.plano.constant = zc;
  obj.tampa.visible = k > 0.02 && t > 5.1; obj.tampa.position.z = Math.min(zc - 0.075, PW / 2 - 0.005);
  return { corte: +k.toFixed(2), aneisVisiveis: obj.aneis.children.filter((c) => c.visible).length };
}
export const DUR_PILAR = 6.8;
const sfxPilar = () => [...encaixes(4, { t0: 0.3, dur: 1.2 }), ...encaixes(8, { t0: 1.6, dur: 1.5 }), ...encaixes(8, { t0: 3.3, dur: 1.8 })];

/* ---------------- viguinha: concreto simples racha, armado nao (ambas em corte) ---------------- */
const VL = 5, VN = 12, VH = 0.5, VY = 1.0, ZV = 0.12;
const SEG = VL / VN;
const PLV = planoZ(ZV);
function criarViguinhaUma(parent, x, armada) {
  const g = grupo(parent, armada ? 'viguinha-armada' : 'viguinha-simples', x, 0, 0);
  for (const sx of [-1, 1]) { box(g, COR.concreto, 0.7, VY, 0.9, sx * (VL / 2 - 0.1), VY / 2, 0); sombra(g, 1.1, 1.3, sx * (VL / 2 - 0.1), 0); }
  const mC = matCorte(COR.concreto, PLV), mA = matCorte(COR.aco, PLV, { dupla: true });
  const segs = Array.from({ length: VN }, (_, i) => {
    const s = grupo(g, 'seg', 0, 0, 0); s.userData.x = -VL / 2 + SEG * (i + 0.5);
    add(s, new THREE.BoxGeometry(SEG + 0.01, VH, VH), mC);
    tampaZ(s, COR.concreto, SEG + 0.01, VH, 0, 0, ZV - 0.06);
    if (armada) for (const z of [-0.12, 0.12]) barra(s, [-SEG / 2 - 0.005, -0.15, z], [SEG / 2 + 0.005, -0.15, z], 0.05).material = mA;
    return s;
  });
  const peso = box(g, COR.metal, 1.2, 0.8, 1.0, 0, 6, 0); peso.name = 'peso';
  const trinca = box(g, COR.fissura, 0.05, VH, 0.03, 0, VY + VH / 2, ZV + 0.012); trinca.visible = false; trinca.name = 'trinca';
  return { group: g, segs, peso, trinca, armada };
}
export function criarViguinha() {
  const g = new THREE.Group(); g.name = 'viguinha-cena';
  const simples = criarViguinhaUma(g, -3.8, false), armada = criarViguinhaUma(g, 3.8, true);
  return { group: g, simples, armada };
}
const TC = 2.5;                                   // instante da rachadura (s)
function animarViguinhaUma(v, t) {
  const carga = smooth((t - 1.2) / 1.2);
  const D = v.armada ? 0.09 : 0.1;
  const th = v.armada ? 0 : 0.3 * clamp01((t - TC) / 0.7) ** 2;
  const sag = (x) => -D * carga * (1 - (x / (VL / 2)) ** 2);
  const slope = (x) => 2 * D * carga * x / (VL / 2) ** 2;
  v.segs.forEach((s) => {
    const x = s.userData.x;
    let px = x, py = VY + VH / 2 + sag(x), rz = Math.atan(slope(x));
    if (th > 0) {                                 // rotacao rigida de cada metade em torno do seu apoio
      const sg = x < 0 ? -1 : 1, pvx = sg * VL / 2, pvy = VY, a = -sg * th;
      const dx = px - pvx, dy = py - pvy;
      px = pvx + dx * Math.cos(a) - dy * Math.sin(a); py = pvy + dx * Math.sin(a) + dy * Math.cos(a); rz += a;
    }
    s.position.set(px, py, 0); s.rotation.z = rz;
  });
  const topoCentro = VY + VH + sag(0) - (VL / 2) * Math.sin(th);
  const queda = 1 - clamp01(t / 1.2) ** 2;          // peso desce acelerando ate tocar a viga (t = 1,2)
  v.peso.position.y = topoCentro + 0.4 + 4.6 * queda;
  const c = v.armada ? 0 : clamp01((t - (TC - 0.6)) / 0.6);
  v.trinca.visible = c > 0 && th < 0.02;
  v.trinca.scale.y = Math.max(c, 0.001); v.trinca.position.y = VY + (VH * c) / 2;
  return { sag: +(-sag(0) * carga).toFixed(3), theta: +th.toFixed(3), trinca: +c.toFixed(2) };
}
export function animarViguinha(obj, t) {
  const a = animarViguinhaUma(obj.simples, t), b = animarViguinhaUma(obj.armada, t);
  return { simples: a, armada: b };
}
export const DUR_VIGUINHA = 3.8;

/* ---------------- viga: cresce de um pilar ao outro, com aco em corte ---------------- */
const ZVG = 0.2;
export function criarViga() {
  const g = new THREE.Group(); g.name = 'viga-cena';
  for (const sx of [-1, 1]) { box(g, COR.concreto, 0.8, 3.2, 0.8, sx * 3.2, 1.6, 0); box(g, COR.concreto, 1.6, 0.3, 1.6, sx * 3.2, 0.15, 0); sombra(g, 2.4, 2.4, sx * 3.2, 0); }
  const plano = planoZ(ZVG);
  const viga = grupo(g, 'viga', 0, 2.7, 0);
  add(viga, new THREE.BoxGeometry(5.6, 1.0, 0.6), matCorte(COR.concreto, plano));
  tampaZ(viga, COR.concreto, 5.6, 1.0, 0, 0, ZVG - 0.07);
  for (const y of [-0.32, 0.32]) for (const z of [-0.2, 0.2]) barraCorte(viga, plano, [-2.75, y, z], [2.75, y, z], 0.06);
  for (let i = 0; i < 9; i++) {
    const x = -2.5 + i * 0.625, mA = matCorte(COR.aco, plano, { dupla: true });
    for (const [a, b] of [[[x, -0.4, -0.2], [x, 0.4, -0.2]], [[x, -0.4, 0.2], [x, 0.4, 0.2]], [[x, -0.4, -0.2], [x, -0.4, 0.2]], [[x, 0.4, -0.2], [x, 0.4, 0.2]]]) barra(viga, a, b, 0.03).material = mA;
  }
  return { group: g, viga, plano };
}
export function animarViga(obj, t) {
  obj.viga.visible = t > 0.4;
  if (obj.viga.visible) crescerPeca(obj.viga, t, { eixo: 'x', t0: 0.4, dur: 2.2 });
  return { cresce: +clamp01((t - 0.4) / 2.2).toFixed(2) };
}
export const DUR_VIGA = 3.4;

/* ---------------- laje: comum (verga) vs reforcada (nao verga), em corte ---------------- */
const LX = 6, LZ = 4;
const campo = (X, Z) => Math.max(0, 1 - (X / (LX / 2)) ** 2) * Math.max(0, 1 - (Z / (LZ / 2)) ** 2);

/** Registra mesh deformavel: guarda posicoes-base e o deslocamento da sua unidade (Group) na laje. */
function deformavel(lista, mesh, off, extra = {}) {
  mesh.frustumCulled = false;
  lista.push({ mesh, base: Float32Array.from(mesh.geometry.attributes.position.array), off: off.clone(), ...extra });
}
function deformar(lista, d, t) {
  for (const { mesh, base, off, topo } of lista) {
    const p = mesh.geometry.attributes.position.array;
    for (let i = 0; i < base.length; i += 3) {
      const X = off.x + base[i], Z = off.z + base[i + 2];
      p[i] = base[i]; p[i + 2] = base[i + 2];
      p[i + 1] = base[i + 1] - d * campo(X, Z) + (topo !== undefined && base[i + 1] > topo ? ondaY(base[i], base[i + 2], t) : 0);
    }
    mesh.geometry.attributes.position.needsUpdate = true;
  }
}
function criarLajeUma(parent, x, reforcada) {
  const nome = reforcada ? 'laje-reforcada' : 'laje-comum';
  const g = grupo(parent, nome, x, 0, 0);
  const e = reforcada ? 0.6 : 0.3, y0 = 1.8, yc = y0 + e / 2, lista = [];
  const plano = planoZ(2.1);
  const mC = matCorte(COR.concreto, plano), mA = matCorte(COR.aco, plano, { dupla: true });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { box(g, COR.concreto, 0.5, y0, 0.5, sx * 2.85, y0 / 2, sz * 1.85); sombra(g, 1.0, 1.0, sx * 2.85, sz * 1.85); }
  if (reforcada) for (const sz of [-1, 1]) box(g, COR.concreto, LX - 0.2, 0.5, 0.5, 0, y0 - 0.25, sz * 1.85);
  const grade = grupo(g, 'grade'), faixas = grupo(g, 'faixas');
  const fio = (a, y, along) => {                      // barra deformavel (caixa segmentada) em Group centrado
    const len = along === 'x' ? LX - 0.3 : LZ - 0.3;
    const u = grupo(grade, 'barra', along === 'x' ? 0 : a, yc + y, along === 'x' ? a : 0);
    const m = add(u, along === 'x' ? new THREE.BoxGeometry(len, 0.08, 0.08, 14, 1, 1) : new THREE.BoxGeometry(0.08, 0.08, len, 1, 1, 10), mA, 0, 0, 0);
    deformavel(lista, m, new THREE.Vector3(u.position.x, 0, u.position.z));
  };
  const nx = reforcada ? 9 : 5, nz = reforcada ? 13 : 7;
  const camadas = reforcada ? [-0.18, 0.18] : [-0.06];
  for (const y of camadas) {
    for (let i = 0; i < nx; i++) fio(-1.7 + (3.4 * i) / (nx - 1), y, 'x');
    for (let i = 0; i < nz; i++) fio(-2.7 + (5.4 * i) / (nz - 1), y + (reforcada ? 0.0 : 0.1), 'z');
  }
  const NF = 6, fz = LZ / NF;
  for (let i = 0; i < NF; i++) {
    const u = grupo(faixas, 'faixa', 0, yc, -LZ / 2 + fz * (i + 0.5));
    const m = add(u, new THREE.BoxGeometry(LX, e, fz - 0.01, 16, 1, 1), mC, 0, 0, 0);
    deformavel(lista, m, new THREE.Vector3(0, 0, u.position.z));
  }
  const tampa = add(g, new THREE.BoxGeometry(LX, e, 0.01, 16, 1, 1), mat(COR.concreto), 0, yc, 2.1); tampa.castShadow = false; tampa.visible = false;
  deformavel(lista, tampa, new THREE.Vector3(0, 0, 0));
  const aguaG = criarAgua(g, { w: LX - 0.5, h: 0.4, d: LZ - 0.5, x: 0, y: yc + e / 2, z: 0, plano, nx: 14, nz: 10 });
  deformavel(lista, aguaG.corpo, new THREE.Vector3(0, 0, 0), { topo: 0.2 - 1e-4 });
  deformavel(lista, aguaG.tampa, new THREE.Vector3(0, 0, 0), { topo: 0.2 - 1e-4 });
  aguaG.group.visible = false;
  // regua de 20 cm (0,4 u) ao lado da laje
  const regua = grupo(g, 'regua', -LX / 2 - 0.45, yc + e / 2, 0);
  box(regua, 0xf5f5f0, 0.1, 0.5, 0.1, 0, 0.25, 0);
  for (let i = 1; i <= 4; i++) box(regua, COR.fissura, 0.2, 0.02, 0.04, 0, i * 0.1, 0.06);
  const verdes = grupo(g, 'linhas-verdes');
  if (reforcada) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = grupo(verdes, 'linha', sx * 2.45, y0, sz * 1.85); box(l, COR.verde, 0.12, y0, 0.12, 0, -y0 / 2, 0);
  }
  return { group: g, grade, faixas, agua: aguaG, tampa, plano, lista, e, y0, reforcada, verdes, regua, yc };
}
export function criarLaje() {
  const g = new THREE.Group(); g.name = 'laje-cena';
  return { group: g, comum: criarLajeUma(g, -4.2, false), reforcada: criarLajeUma(g, 4.2, true) };
}
function animarLajeUma(l, t) {
  montar(l.grade, t, { t0: 0.3, dur: 1.3, ordem: 'indice' });
  montar(l.faixas, t, { t0: 1.8, dur: 0.9, ordem: 'indice' });
  const k = smooth((t - 3.0) / 0.8), zc = 2.1 * (1 - k);          // corte frontal varre ate o eixo da laje
  l.plano.constant = zc; l.tampa.visible = k > 0.02 && t > 2.7; l.tampa.position.z = Math.min(zc - 0.055, LZ / 2 - 0.005);
  l.agua.group.visible = t > 4.0;
  if (l.agua.group.visible) crescerPeca(l.agua.group, t, { eixo: 'y', t0: 4.0, dur: 0.8 });
  l.agua.tampa.position.z = zc - 0.012;
  const Dmax = l.reforcada ? 0.04 : 0.5;
  const d = Dmax * smooth((t - 5.0) / 1.4);
  deformar(l.lista, d, t);
  const kv = smooth((t - 6.6) / 0.6);
  l.verdes.children.forEach((c) => { c.scale.y = Math.max(kv, 0.001); c.visible = kv > 0.01; });
  return { flecha: +d.toFixed(3), flecha_cm: +(d * 50).toFixed(1) };
}
export function animarLaje(obj, t) {
  return { comum: animarLajeUma(obj.comum, t), reforcada: animarLajeUma(obj.reforcada, t) };
}
export const DUR_LAJE = 7.6;
const sfxLaje = () => [...new Set([...encaixes(12, { t0: 0.3, dur: 1.3 }), ...encaixes(44, { t0: 0.3, dur: 1.3 }), ...encaixes(6, { t0: 1.8, dur: 0.9 })])].sort((a, b) => a - b);

export const cenas = {
  pilar: { criar: criarPilar, animar: animarPilar, dur: DUR_PILAR, tempos: [0.9, 2.3, 4.0, 5.2, 6.8], cam: { eye: [4, 3.5, 13.5], target: [0, 3.1, 0], fov: 42 }, size: [540, 960], sfx: sfxPilar },
  viguinha: { criar: criarViguinha, animar: animarViguinha, dur: DUR_VIGUINHA, tempos: [0.5, 1.5, 2.4, 3.0, 3.8], cam: { eye: [0, 3.5, 16], target: [0, 1.4, 0], fov: 40 }, sfx: () => [1.2, 2.5] },
  viga: { criar: criarViga, animar: animarViga, dur: DUR_VIGA, tempos: [0.7, 1.3, 1.9, 2.6, 3.4], cam: { eye: [3, 4.5, 20], target: [0, 2.3, 0], fov: 42 }, size: [540, 960], sfx: () => [2.6] },
  laje: { criar: criarLaje, animar: animarLaje, dur: DUR_LAJE, tempos: [1.0, 2.3, 3.6, 5.0, 7.2], cam: { eye: [0, 5.5, 17], target: [0, 1.7, 0], fov: 42 }, sfx: sfxLaje },
};
