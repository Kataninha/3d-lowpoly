// Helpers do cenario do video 13. 1 u = 0,5 m, chao em y = 0. Sem Math.random: tudo e funcao pura do tempo.
import * as THREE from 'three';

const cache = new Map();
/** Material flat chapado, compartilhado por cor+extras (uma cor fixa por componente). */
export function mat(color, extra = {}) {
  const key = color + '|' + JSON.stringify(extra);
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra }));
  return cache.get(key);
}
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const suave = (x) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const fase = (t, a, b) => clamp01((t - a) / (b - a));
/** Hash deterministico 0..1 (substitui Math.random). */
export const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

/** Caixa por centro (x,y,z) e tamanho (w,h,d). */
export function caixa(pai, cor, w, h, d, x, y, z, extra) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof cor === 'number' ? mat(cor, extra) : cor);
  m.position.set(x, y, z);
  m.castShadow = !(extra && extra.transparent);
  m.receiveShadow = true;
  pai.add(m);
  return m;
}
export function cilindro(pai, cor, r, h, x, y, z, seg = 12, extra) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat(cor, extra));
  m.position.set(x, y, z);
  m.castShadow = !(extra && extra.transparent);
  m.receiveShadow = true;
  pai.add(m);
  return m;
}
export function grupo(nome, pai) {
  const g = new THREE.Group();
  g.name = nome;
  g.userData.id = nome;
  if (pai) pai.add(g);
  return g;
}
let texSombra = null;
/** Sombra de contato: mancha radial macia sob a peca (sem contorno). */
export function sombra(pai, w, d, x, z, y = 0.012, op = 0.2) {
  if (!texSombra) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    r.addColorStop(0, 'rgba(29,27,42,1)'); r.addColorStop(0.6, 'rgba(29,27,42,0.55)'); r.addColorStop(1, 'rgba(29,27,42,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); texSombra = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, opacity: op * 2.2, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.name = 'sombra-contato';
  pai.add(m);
  return m;
}
export const COR = Object.freeze({
  concreto: 0xd9d9d4, concretoEscuro: 0xa9a9a4, branco: 0xf4f4f0, aco: 0xe8821e, agua: 0x3d8fe0, manta: 0x4caf6a, terraMole: 0xb08d63, terraFirme: 0x6b4a2e,
  vidro: 0x4db6b0, vidroEscuro: 0x2f8f93, madeira: 0xb8864d, verde: 0x4caf50, ledFrio: 0x7fe9ff, ledQuente: 0xffc46b, metal: 0x6f7c86, escuro: 0x2b3138,
});
