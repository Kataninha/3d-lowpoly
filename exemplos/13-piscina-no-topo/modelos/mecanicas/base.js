// Base das mecanicas do video 13 (piscina-no-topo). Escala 1u = 0,5 m, chao em y = 0.
// Tudo e funcao pura do tempo t: nada de Math.random, Date.now ou estado acumulado.
import * as THREE from 'three';
import { montarPorUnidades } from '../../kit/efeitos/montagem-unidades.js';

export const COR = {
  concreto: 0xd3d7dc,   // cinza claro
  aco: 0xff8a14,        // laranja (tracao)
  agua: 0x2f8cf0,       // azul
  manta: 0x2fc05a,      // verde
  moleClara: 0xe9b86e,  // terra mole (clara, areia)
  firmeEscura: 0x4a2711,// terra firme (escura, contraste forte)
  madeira: 0xc8a06a,
  vermelho: 0xe0443e,   // setas de carga (--cor-negativo)
  verde: 0x39b554,      // sustentacao (--cor-positivo)
  amarelo: 0xf2c230,    // pulso/destaque
  maquina: 0xf2b632,
  metal: 0x6b7a86,
  metalEscuro: 0x3a4650,
  cano: 0x9aa5ad,
  areia: 0xe6d3a3,
  poeira: 0xd9ccb3,
  sujeira: 0x4a3b2c,
  pele: 0xf0c9a0,
  vedante: 0x2a8a47,
  fissura: 0x2b2f33,
};

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (x) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const hash = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

const cache = new Map();
/** Material chapado, flatShading, sem contorno. Cacheado por cor+extras (extras sem objetos). */
export function mat(color, extra = {}) {
  const key = `${color}|${JSON.stringify(extra)}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0, ...extra }));
  return cache.get(key);
}
/** Concreto em corte: translucido para o aco aparecer em volume. */
export const concretoT = () => mat(COR.concreto, { transparent: true, opacity: 0.5, depthWrite: false });
export const concretoOpaco = () => mat(COR.concreto);
export const aguaMat = () => mat(COR.agua, { transparent: true, opacity: 0.7, depthWrite: false, roughness: 0.2 });

export function add(parent, geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = !material.transparent;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const box = (parent, cor, w, h, d, x = 0, y = 0, z = 0, extra) =>
  add(parent, new THREE.BoxGeometry(w, h, d), typeof cor === 'object' ? cor : mat(cor, extra), x, y, z);
export const cyl = (parent, cor, r, h, x = 0, y = 0, z = 0, seg = 10, extra) =>
  add(parent, new THREE.CylinderGeometry(r, r, h, seg), typeof cor === 'object' ? cor : mat(cor, extra), x, y, z);
export function grupo(parent, nome, x = 0, y = 0, z = 0) {
  const g = new THREE.Group(); g.name = nome; g.position.set(x, y, z); parent.add(g); return g;
}

/** Sombra de contato (disco achatado) sob a peca. */
export function sombra(parent, w, d, x = 0, z = 0, y = 0.01) {
  const s = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: 0x1b2733, transparent: true, opacity: 0.18, depthWrite: false }));
  s.rotation.x = -Math.PI / 2; s.scale.set(w, d, 1); s.position.set(x, y, z); s.name = 'sombra-contato';
  parent.add(s); return s;
}

/** Seta ao longo de +x, comprimento len (a ponta fica sempre do mesmo tamanho). */
const matSeta = (cor) => mat(cor, { transparent: true, depthTest: false });   // setas sempre por cima da agua translucida
export function criarSeta(cor = COR.vermelho, esp = 0.12) {
  const g = new THREE.Group(); g.name = 'seta';
  const shaft = box(g, matSeta(cor), 1, esp, esp, 0.5, 0, 0);
  const head = add(g, new THREE.ConeGeometry(esp * 1.9, 0.4, 6), matSeta(cor), 0.2, 0, 0);
  head.rotation.z = -Math.PI / 2; shaft.renderOrder = head.renderOrder = 10; shaft.castShadow = head.castShadow = false;
  g.userData = { shaft, head, hl: 0.4 };
  setSeta(g, 0);
  return g;
}
export function setSeta(g, len, cor) {
  const { shaft, head, hl } = g.userData;
  const L = Math.max(len, 0);
  g.visible = L > 0.02;
  const hh = Math.min(hl, L);
  shaft.scale.x = Math.max(L - hh, 0.001); shaft.position.x = (L - hh) / 2;
  head.scale.y = hh / hl; head.position.x = L - hh / 2;
  if (cor !== undefined) { shaft.material = matSeta(cor); head.material = matSeta(cor); }
}

/** Barra de aco entre dois pontos (cilindro fino). */
export function barra(parent, a, b, r = 0.05, cor = COR.aco) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const m = cyl(parent, cor, r, len, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2, 6);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}

/** Cada barra num Group proprio (origem no centro) para montarPorUnidades escalar sem deslocar. */
export function unidadeBarra(parent, a, b, r, cor) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const u = grupo(parent, 'barra', (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  barra(u, [A.x - u.position.x, A.y - u.position.y, A.z - u.position.z], [B.x - u.position.x, B.y - u.position.y, B.z - u.position.z], r, cor);
  return u;
}

/** Piso simples de cena (so para dar chao e sombra). */
export function piso(parent, w = 24, d = 16, cor = 0xe4ebe6, y = -0.02) {
  const m = box(parent, cor, w, 0.04, d, 0, y, 0); m.castShadow = false; m.name = 'piso'; return m;
}

/** Medidas: caixa envolvente (u e m) e checagem de NaN. */
export function medir(obj) {
  const b = new THREE.Box3(); obj.updateWorldMatrix(true, true);
  let nan = false, meshes = 0;
  obj.traverse((o) => { if (o.isMesh) { meshes++; if (o.visible) b.expandByObject(o); const p = o.position; if (![p.x, p.y, p.z].every(Number.isFinite)) nan = true; } });
  const s = b.getSize(new THREE.Vector3());
  return { meshes, nan, w_u: +s.x.toFixed(2), h_u: +s.y.toFixed(2), d_u: +s.z.toFixed(2), w_m: +(s.x / 2).toFixed(2), h_m: +(s.y / 2).toFixed(2), d_m: +(s.z / 2).toFixed(2), minY: +b.min.y.toFixed(3) };
}

/* ---------------- corte real (clippingPlanes + tampa), quique, agua ---------------- */

/** Planos de corte: mantem o lado z <= zc (ou x <= xc). A tampa solida e posta no plano por quem corta. */
export const planoZ = (zc) => new THREE.Plane(new THREE.Vector3(0, 0, -1), zc);
export const planoX = (xc) => new THREE.Plane(new THREE.Vector3(-1, 0, 0), xc);
const cacheCorte = new Map();
const idPlano = new WeakMap(); // THREE.Plane has no uuid; give each plane its own cache key
let proximoIdPlano = 0;
/** Material recortado pelo plano (cacheado por cor+plano). Aco usa dupla-face para o miolo aparecer. */
export function matCorte(cor, plano, { dupla = false, ...extra } = {}) {
  if (!idPlano.has(plano)) idPlano.set(plano, proximoIdPlano++);
  const k = `${cor}|${idPlano.get(plano)}|${dupla}|${JSON.stringify(extra)}`;
  if (!cacheCorte.has(k)) cacheCorte.set(k, new THREE.MeshStandardMaterial({ color: cor, flatShading: true, roughness: 0.85, clippingPlanes: [plano], clipShadows: true, side: dupla ? THREE.DoubleSide : THREE.FrontSide, ...extra }));
  return cacheCorte.get(k);
}
/** Tampa de corte: face solida (concreto) no plano z = zc; w x h, centro em (x, y). */
export function tampaZ(parent, cor, w, h, x, y, zc, nome = 'tampa-corte') {
  const m = box(parent, cor, w, h, 0.01, x, y, zc - 0.005); m.name = nome; m.castShadow = false; return m;
}
export function tampaX(parent, cor, d, h, y, z, xc, nome = 'tampa-corte') {
  const m = box(parent, cor, 0.01, h, d, xc - 0.005, y, z); m.name = nome; m.castShadow = false; return m;
}
/** Barra de aco recortada (cilindro). */
export function barraCorte(parent, plano, a, b, r = 0.05) {
  const m = barra(parent, a, b, r, COR.aco); m.material = matCorte(COR.aco, plano, { dupla: true }); return m;
}

/** Encaixes: instantes em que cada unidade de montarPorUnidades termina de assentar (lista para SFX). */
export function encaixes(n, { t0 = 0, dur }) {
  const span = Math.min(0.12, dur), step = n > 1 ? (dur - span) / (n - 1) : 0;
  return Array.from({ length: n }, (_, i) => +(t0 + i * step + span).toFixed(3));
}
/** montarPorUnidades + quique curto (overshoot 4% em 0,12 s) quando cada unidade assenta. */
export function montar(grupo, t, { t0 = 0, dur, ordem = 'baixo-cima', easing } = {}) {
  let st = grupo.userData._q;
  if (!st) {
    const kids = grupo.children.map((o, index) => ({ o, index, p: o.position.clone() }));
    const c = kids.reduce((v, k) => v.add(k.p), new THREE.Vector3()).multiplyScalar(1 / (kids.length || 1));
    if (ordem === 'baixo-cima') kids.sort((a, b) => a.p.y - b.p.y || a.index - b.index);
    if (ordem === 'perimetro') kids.sort((a, b) => Math.atan2(a.p.z - c.z, a.p.x - c.x) - Math.atan2(b.p.z - c.z, b.p.x - c.x) || a.p.y - b.p.y || a.index - b.index);
    st = grupo.userData._q = { kids };
  }
  montarPorUnidades(grupo, t, { t0, dur, ordem, easing });
  const n = st.kids.length, span = Math.min(0.12, dur), step = n > 1 ? (dur - span) / (n - 1) : 0;
  st.kids.forEach((k, i) => {
    const s = (t - (t0 + i * step + span)) / 0.12;
    if (s > 0 && s < 1) k.o.scale.multiplyScalar(1 + 0.04 * Math.sin(Math.PI * s));
  });
}

/** Agua com brilho (rugosidade baixa, faceta low poly) e leve ondulacao deterministica na superficie. */
export function criarAgua(parent, { w, h, d, x = 0, y = 0, z = 0, cor = COR.agua, plano = null, nx = 12, nz = 8, nome = 'agua' }) {
  const g = grupo(parent, nome, x, y, z);
  const m = new THREE.MeshStandardMaterial({ color: cor, flatShading: true, roughness: 0.05, metalness: 0.5, emissive: 0x0b3a6a, emissiveIntensity: 0.35, transparent: true, opacity: 0.82, depthWrite: false, ...(plano ? { clippingPlanes: [plano] } : {}) });
  const corpo = add(g, new THREE.BoxGeometry(w, h, d, nx, 1, nz), m, 0, h / 2, 0); corpo.castShadow = false; corpo.receiveShadow = false; corpo.frustumCulled = false; corpo.name = 'agua-corpo';
  const base = Float32Array.from(corpo.geometry.attributes.position.array);
  let tampa = null, baseT = null;
  if (plano) { tampa = add(g, new THREE.BoxGeometry(w, h, 0.01, nx, 1, 1), m, 0, h / 2, 0); tampa.castShadow = false; tampa.receiveShadow = false; tampa.name = 'agua-tampa'; tampa.frustumCulled = false; baseT = Float32Array.from(tampa.geometry.attributes.position.array); }
  return { group: g, corpo, tampa, base, baseT, m, w, h, d };
}
export const ondaY = (x, z, t) => 0.03 * Math.sin(x * 2.3 + t * 2.4) * Math.cos(z * 2.0 - t * 1.7);
/** Ondulacao: so os vertices do topo se movem (amplitude 0,03 u). */
export function ondularAgua(a, t) {
  const p = a.corpo.geometry.attributes.position.array, b = a.base, top = a.h / 2 - 1e-4;
  for (let i = 0; i < b.length; i += 3) {
    p[i] = b[i]; p[i + 2] = b[i + 2];
    p[i + 1] = b[i + 1] > top ? b[i + 1] + ondaY(b[i], b[i + 2], t) : b[i + 1];
  }
  a.corpo.geometry.attributes.position.needsUpdate = true;
  if (a.tampa) {
    const q = a.tampa.geometry.attributes.position.array, c = a.baseT;
    for (let i = 0; i < c.length; i += 3) { q[i] = c[i]; q[i + 2] = c[i + 2]; q[i + 1] = c[i + 1] > top ? c[i + 1] + ondaY(c[i], c[i + 2], t) : c[i + 1]; }
    a.tampa.geometry.attributes.position.needsUpdate = true;
  }
}
