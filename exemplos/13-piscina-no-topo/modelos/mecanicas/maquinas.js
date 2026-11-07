// Bomba, filtro, canos (circulacao), balanca com blocos de 1 t e caminho das cargas.
// Ids: bomba, filtro, cano (trechos), balanca, caminho-carga. animar<X>(obj, t) e funcao pura de t.
import * as THREE from 'three';
import { crescerPeca, camadaTranslucida } from '../../kit/efeitos/montagem-unidades.js';
import { COR, mat, concretoOpaco, box, cyl, add, grupo, sombra, criarSeta, setSeta, smooth, clamp01, hash, planoZ, matCorte, tampaZ, montar, encaixes, criarAgua, ondularAgua } from './base.js';

const bez = (S, C, H, e) => S.map((s, i) => (1 - e) ** 2 * s + 2 * (1 - e) * e * C[i] + e * e * H[i]);   // arco de entrada
const AZUL_MAQ = 0x4f6f8f;

/* ---------------- circulacao: bomba + filtro + canos ---------------- */
const BOMBA_HOME = [0.2, 0, 0], FILTRO_HOME = [4.6, 0, 0];
const PIPE_MAT = () => mat(COR.cano);   // opaco; raio-X so via camadaTranslucida
const SUCCAO = [[-5.4, 0.9, 0], [-0.3, 0.9, 0], [-0.3, 3.3, 0], [4.6, 3.3, 0], [4.6, 2.75, 0]];     // sobe sujo ate o filtro
const RETORNO = [[6.0, 0.6, 0], [7.0, 0.6, 0], [7.0, 1.5, 0], [7.0, 1.5, -1.0], [-5.4, 1.5, -1.0]];  // volta limpo para a piscina
const TRECHOS = [
  [[-5.4, 0.9, 0], [-1.35, 0.9, 0]], [[-0.3, 2.05, 0], [-0.3, 3.3, 0]], [[-0.3, 3.3, 0], [4.6, 3.3, 0]], [[4.6, 3.3, 0], [4.6, 2.75, 0]],
  [[6.0, 0.6, 0], [7.0, 0.6, 0]], [[7.0, 0.6, 0], [7.0, 1.5, 0]], [[7.0, 1.5, 0], [7.0, 1.5, -1.0]], [[7.0, 1.5, -1.0], [-5.4, 1.5, -1.0]],
];
const compr = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(...p.map((v, k) => v - pts[i][k])), 0);
const naPoli = (pts, s) => {
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(...pts[i].map((v, k) => v - pts[i - 1][k]));
    if (s <= d || i === pts.length - 1) { const f = Math.min(s / d, 1); return pts[i - 1].map((v, k) => v + (pts[i][k] - v) * f); }
    s -= d;
  }
};
const L_SUC = compr(SUCCAO), L_RET = compr(RETORNO), V = 4.0, FALL = 1.2, T_RUN = 4.6;

function trecho(parent, a, b) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), mid = A.clone().add(B).multiplyScalar(0.5);
  const g = grupo(parent, 'trecho-cano', mid.x, mid.y, mid.z);
  const c = cyl(g, PIPE_MAT(), 0.16, A.distanceTo(B), 0, 0, 0, 10);
  c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); c.castShadow = false;
  const j = add(g, new THREE.SphereGeometry(0.2, 8, 6), mat(COR.cano), B.x - mid.x, B.y - mid.y, B.z - mid.z);
  return g;
}

export function criarBomba() {
  const g = grupo(new THREE.Group(), 'bomba', ...BOMBA_HOME);
  box(g, COR.metalEscuro, 2.8, 0.2, 1.4, 0, 0.1, 0);
  const motor = cyl(g, AZUL_MAQ, 0.5, 1.5, 0.9, 0.9, 0, 12); motor.rotation.z = Math.PI / 2;
  for (const dx of [0.5, 0.9, 1.3]) { const a = cyl(g, COR.metalEscuro, 0.53, 0.06, dx, 0.9, 0, 12); a.rotation.z = Math.PI / 2; }    // aletas
  const carc = cyl(g, mat(COR.metal), 0.68, 0.8, -0.5, 0.9, 0, 14); carc.rotation.x = Math.PI / 2; carc.castShadow = false; carc.name = 'carcaca';
  const rotor = grupo(g, 'rotor', -0.5, 0.9, 0.05);
  const disco = cyl(rotor, COR.maquina, 0.4, 0.1, 0, 0, 0, 12); disco.rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, b = box(rotor, COR.maquina, 0.5, 0.09, 0.3, Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.0); b.rotation.z = a; }
  const e = cyl(g, COR.cano, 0.2, 0.7, -1.2, 0.9, 0, 10); e.rotation.z = Math.PI / 2;
  cyl(g, COR.cano, 0.2, 0.5, -0.5, 1.8, 0, 10);
  const raiz = g.parent; raiz.name = 'bomba-raiz'; const sb = sombra(raiz, 3.2, 1.8, BOMBA_HOME[0], 0);
  return { group: raiz, bomba: g, rotor, sb, carcaca: carc };
}
function rotorAngulo(t) { const tau = Math.max(0, t - T_RUN); return 14 * (tau < 0.6 ? tau * tau / (2 * 0.6) : tau - 0.3); }
export function animarBomba(b, t) {
  b.rotor.rotation.z = -rotorAngulo(t);
  return { rotor_rad: +rotorAngulo(t).toFixed(2) };
}

function criarFiltroPeca() {
  const g = grupo(new THREE.Group(), 'filtro', ...FILTRO_HOME);
  cyl(g, COR.metalEscuro, 1.0, 0.3, 0, 0.15, 0, 14);
  const casca = cyl(g, mat(0xcfe9f2), 0.9, 2.4, 0, 1.5, 0, 14); casca.castShadow = false; casca.name = 'casca';
  cyl(g, COR.areia, 0.86, 1.2, 0, 0.9, 0, 14).name = 'areia';
  cyl(g, COR.metalEscuro, 0.5, 0.25, 0, 2.82, 0, 10);
  box(g, AZUL_MAQ, 0.9, 0.12, 0.2, 0, 3.05, 0);
  const e = cyl(g, COR.cano, 0.2, 0.6, 0.9, 0.6, 0, 10); e.rotation.z = Math.PI / 2;
  const sed = cyl(g, COR.sujeira, 0.84, 1, 0, 1.5, 0, 14); sed.name = 'sedimento';
  return { g, sed, casca };
}

/** Circuito completo: bomba e filtro entram em arco, canos se ligam, particulas sujas entram no filtro, agua volta limpa. */
export function criarCirculacao() {
  const g = new THREE.Group(); g.name = 'circulacao-cena';
  box(g, concretoOpaco(), 11.6, 0.5, 4, 1.8, -0.25, 0);                                  // laje da casa de maquinas
  // piscina em corte (so o necessario para receber os canos)
  box(g, concretoOpaco(), 4.5, 0.5, 3, -7.15, -0.25, 0);
  box(g, concretoOpaco(), 0.5, 2.0, 3, -9.65, 1.0, 0); box(g, concretoOpaco(), 0.5, 2.0, 3, -4.65, 1.0, 0);
  const agua = criarAgua(g, { w: 4.0, h: 1.6, d: 2.9, x: -7.15, y: 0, cor: 0x7f9fb0, nx: 10, nz: 6 }); const aguaM = agua.m;
  sombra(g, 12.4, 5, 1.8, 0, -0.49);
  const b = criarBomba(); g.add(b.group);
  const f = criarFiltroPeca(); const filtroRaiz = f.g.parent; g.add(filtroRaiz); f.sb = sombra(filtroRaiz, 2.4, 2.4, FILTRO_HOME[0], 0);
  const canos = grupo(g, 'canos'); TRECHOS.forEach(([a, c]) => trecho(canos, a, c));
  const sujas = Array.from({ length: 9 }, (_, i) => box(g, COR.sujeira, 0.14, 0.14, 0.14));
  const limpas = Array.from({ length: 10 }, () => add(g, new THREE.SphereGeometry(0.1, 7, 5), mat(COR.agua), 0, 0, 0));
  return { group: g, bomba: b, filtro: f, filtroRaiz, canos, sujas, limpas, aguaM, agua };
}
const COR_TURVA = new THREE.Color(0x7f9fb0), COR_LIMPA = new THREE.Color(COR.agua);
export function animarCirculacao(o, t) {
  const arcoB = smooth((t - 0.3) / 1.0), arcoF = smooth((t - 1.4) / 1.0);
  o.bomba.bomba.position.set(...bez([BOMBA_HOME[0] - 5, 6, 0], [BOMBA_HOME[0] - 1, 7, 0], BOMBA_HOME, arcoB)); o.bomba.bomba.visible = t > 0.3;
  o.filtro.g.position.set(...bez([FILTRO_HOME[0] + 5, 6, 0], [FILTRO_HOME[0] + 1, 7, 0], FILTRO_HOME, arcoF)); o.filtro.g.visible = t > 1.4;
  o.bomba.sb.visible = arcoB > 0.98; o.filtro.sb.visible = arcoF > 0.98;
  montar(o.canos, t, { t0: 2.7, dur: 1.8, ordem: 'indice' });
  animarBomba(o.bomba, t);
  ondularAgua(o.agua, t);
  for (const peca of [o.canos, o.bomba.carcaca, o.filtro.casca]) camadaTranslucida(peca, t, { t0: 4.4, dur: 99, opacidade: 0.3 });   // raio-X dos tubos e do filtro
  const run = t - T_RUN;
  const LC = L_SUC + FALL;
  const nS = o.sujas.length, nL = o.limpas.length;
  o.sujas.forEach((m, i) => {                                   // sujeira: entra no tubo, sobe, cai no filtro
    const e = run * V - (i * LC) / nS;
    m.visible = e >= 0;
    const s = (((e / LC) % 1) + 1) % 1 * LC;
    if (s <= L_SUC) m.position.set(...naPoli(SUCCAO, s));
    else m.position.set(4.6 + (hash(i) - 0.5) * 0.9, 2.75 - (s - L_SUC), (hash(i, 2) - 0.5) * 0.9);
  });
  const atraso = L_SUC / V;
  o.limpas.forEach((m, i) => {                                  // agua limpa sai do filtro e volta para a piscina
    const e = (run - atraso) * V - (i * L_RET) / nL;
    m.visible = e >= 0;
    m.position.set(...naPoli(RETORNO, ((e % L_RET) + L_RET) % L_RET));
  });
  const h = 0.02 + 0.12 * clamp01((run - atraso) / 5);          // sedimento acumula sobre a areia
  const sed = o.filtro.sed; sed.scale.y = h; sed.position.y = 1.5 + h / 2; sed.visible = run > atraso;
  const clean = smooth((run - atraso - 0.5) / 4);
  o.aguaM.color.lerpColors(COR_TURVA, COR_LIMPA, clean);
  return { agua_limpa: +clean.toFixed(2), sedimento: +h.toFixed(3), rotor_rad: +rotorAngulo(t).toFixed(1) };
}
export const DUR_CIRCULACAO = 11.0;
const sfxCirc = () => [1.3, 2.4, ...encaixes(8, { t0: 2.7, dur: 1.8 }), 4.6];

/* ---------------- balanca com blocos de 1 t ---------------- */
const PLAT_TOPO = 0.8, TF = 0.4;
const COLS = [-3, -1.5, 0, 1.5, 3];
const AZUL_BLOCO = () => mat(COR.agua, { roughness: 0.25 });
const EVENTOS = [];                                                   // {t0, w, tipo, x, z}
for (let i = 0; i < 10; i++) EVENTOS.push({ t0: i < 3 ? 0.4 + 0.6 * i : 2.3 + (i - 3) * 0.22, w: 1, tipo: 'agua', x: COLS[i % 5], z: i < 5 ? -0.8 : 0.8, y: PLAT_TOPO + 0.65 });
[-3, 0, 3].forEach((x, i) => EVENTOS.push({ t0: 4.4 + 0.45 * i, w: 3, tipo: 'concreto', x, z: -0.8, y: PLAT_TOPO + 1.3 + 0.7 }));
[-1.5, 0, 1.5, 3].forEach((x, i) => EVENTOS.push({ t0: 6.0 + 0.3 * i, w: 0.5, tipo: 'gente', x, z: 0.8, y: PLAT_TOPO + 1.3 }));
const W_TOTAL = EVENTOS.reduce((s, e) => s + e.w, 0);
const CORES_GENTE = [0xe0443e, 0xf2c230, 0x3fb560, 0x8e5bd0];

export function criarBalanca() {
  const g = new THREE.Group(); g.name = 'balanca-cena';
  box(g, COR.metalEscuro, 11, 0.5, 6, 0, 0.25, 0); sombra(g, 12.5, 7.5, 0, 0);
  const plat = grupo(g, 'plataforma', 0, 0, 0);
  box(plat, COR.metal, 10, 0.3, 5.4, 0, PLAT_TOPO - 0.15, 0);
  box(g, COR.metalEscuro, 0.7, 3.4, 0.7, 0, 1.7, -3.6);
  const mostrador = grupo(g, 'mostrador', 0, 5.0, -3.2);
  const disco = cyl(mostrador, COR.metalEscuro, 2.1, 0.3, 0, 0, 0, 28); disco.rotation.x = Math.PI / 2;
  const face = add(mostrador, new THREE.CircleGeometry(1.9, 28), new THREE.MeshBasicMaterial({ color: 0xf6f3ea }), 0, 0, 0.16);
  const arco = (ini, len, cor) => add(mostrador, new THREE.RingGeometry(1.25, 1.75, 14, 1, ini, len), new THREE.MeshBasicMaterial({ color: cor, side: THREE.DoubleSide }), 0, 0, 0.17);
  arco(Math.PI / 2, Math.PI / 2, COR.verde); arco(0.2 * Math.PI, 0.3 * Math.PI, COR.amarelo); arco(0, 0.2 * Math.PI, COR.vermelho);
  const agulha = grupo(mostrador, 'ponteiro', 0, 0, 0.25);
  box(agulha, COR.fissura, 1.7, 0.14, 0.08, 0.85, 0, 0); cyl(agulha, COR.fissura, 0.16, 0.12, 0, 0, 0.02, 10).rotation.x = Math.PI / 2;
  const itens = EVENTOS.map((e, i) => {
    let obj;
    if (e.tipo === 'agua') obj = box(g, AZUL_BLOCO(), 1.3, 1.3, 1.3);
    else if (e.tipo === 'concreto') obj = box(g, COR.concreto, 1.4, 1.4, 1.4);
    else {
      obj = grupo(g, 'pessoa'); box(obj, CORES_GENTE[i % 4], 0.4, 0.6, 0.28, 0, 0.3, 0); add(obj, new THREE.SphereGeometry(0.19, 8, 6), mat(COR.pele), 0, 0.78, 0);
      obj.scale.setScalar(1.3);
    }
    obj.position.set(e.x, e.y, e.z); obj.visible = false;
    return { obj, e };
  });
  return { group: g, plat, agulha, itens };
}
export function animarBalanca(o, t) {
  let w = 0;
  for (const { e } of o.itens) w += e.w * smooth((t - (e.t0 + TF)) / 0.18);
  const f = clamp01(w / W_TOTAL * 0.97);
  const fim = Math.max(...EVENTOS.map((e) => e.t0)) + TF;
  const wob = t > fim ? 0.03 * Math.sin((t - fim) * 22) * Math.exp(-(t - fim) * 3.5) : 0;
  o.agulha.rotation.z = Math.PI * (1 - f) + wob;
  const sink = -0.22 * f;
  o.plat.position.y = sink;
  for (const { obj, e } of o.itens) {
    const u = (t - e.t0) / TF;
    obj.visible = u >= 0;
    if (!obj.visible) continue;
    const queda = u < 1 ? 7 * (1 - u * u) : 0, s = Math.max(0, t - e.t0 - TF);
    obj.position.y = e.y + sink + queda;
    const sq = s > 0 ? 0.14 * Math.exp(-s * 9) * Math.cos(s * 30) : 0;
    obj.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
    if (e.tipo === 'gente') obj.scale.multiplyScalar(1.3);
  }
  const n = o.itens.filter((i) => i.obj.visible).length;
  return { carga_t: +(f * W_TOTAL / 0.97).toFixed(1), ponteiro: +f.toFixed(2), blocos: n };
}
export const DUR_BALANCA = 8.0;

/* ---------------- caminho das cargas: setas vermelhas -> verdes ---------------- */
const SETAS = [  // [x, topo y, comprimento, peca, indice de aparicao]
  [0, 7.95, 0.95, 'agua'], [0, 6.55, 0.55, 'fundo'], [0, 6.05, 0.5, 'laje'], [0, 5.45, 0.5, 'vigas'],
  [-2.2, 4.7, 1.5, 'pilares'], [2.2, 4.7, 1.5, 'pilares'], [-2.2, 0.7, 1.3, 'fundacoes'], [2.2, 0.7, 1.3, 'fundacoes'],
  [-2.2, -2.0, 1.1, 'terreno'], [0, -2.0, 1.1, 'terreno'], [2.2, -2.0, 1.1, 'terreno'],
];
const T_SETA = { agua: 0.6, fundo: 1.4, laje: 2.1, vigas: 2.8, pilares: 3.5, fundacoes: 4.4, terreno: 5.2 };
export function criarCaminhoCarga() {
  const g = new THREE.Group(); g.name = 'caminho-carga-cena';
  const plano = planoZ(0);   // corte frontal no terreno e nas estacas: mostra as estacas dentro do solo
  const solo = (y, h, cor) => { box(g, matCorte(cor, plano), 9, h, 3, 0, y, 0); tampaZ(g, cor, 9, h, 0, y, 0); };
  solo(-0.75, 1.5, COR.moleClara); solo(-2.25, 1.5, COR.firmeEscura);
  sombra(g, 10, 4, 0, 0, -2.99);
  for (const sx of [-1, 1]) {
    cyl(g, matCorte(COR.concreto, plano), 0.26, 3.6, sx * 2.2, -1.2, 0, 8);
    tampaZ(g, COR.concreto, 0.52, 3.6, sx * 2.2, -1.2, 0.012);
    box(g, COR.concreto, 2.4, 0.8, 1.6, sx * 2.2, 0.4, 0);
    box(g, COR.concreto, 0.8, 4.0, 0.8, sx * 2.2, 2.8, 0);
  }
  box(g, COR.concreto, 5.6, 0.6, 0.8, 0, 5.1, 0); box(g, COR.concreto, 6.6, 0.6, 3.2, 0, 5.7, 0); box(g, COR.concreto, 6.6, 0.5, 3.2, 0, 6.25, 0);
  for (const sx of [-1, 1]) box(g, COR.concreto, 0.5, 1.6, 3.2, sx * 3.05, 7.3, 0);
  const agua = criarAgua(g, { w: 5.6, h: 1.5, d: 3.0, x: 0, y: 6.5, nx: 10, nz: 6 });
  const setas = SETAS.map(([x, y, L, peca]) => { const s = criarSeta(COR.vermelho, 0.18); s.rotation.z = -Math.PI / 2; s.position.set(x, y, 1.9); g.add(s); return { s, x, y, L, peca, t0: T_SETA[peca] }; });
  const pulso = add(g, new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: COR.amarelo, transparent: true, opacity: 0.85 }), 0, 8, 1.9);
  return { group: g, setas, pulso, agua };
}
export function animarCaminhoCarga(o, t) {
  ondularAgua(o.agua, t);
  let n = 0;
  for (const a of o.setas) {
    const len = a.L * smooth((t - a.t0) / 0.5);
    const baixo = a.peca === 'fundacoes' || a.peca === 'terreno';
    const cor = !baixo ? COR.vermelho : t < a.t0 + 0.5 ? COR.vermelho : t < a.t0 + 0.8 ? COR.amarelo : COR.verde;
    setSeta(a.s, len, cor); if (len > 0.02) n++;
  }
  const p = smooth((t - 6.6) / 1.6);
  o.pulso.visible = p > 0.001 && p < 0.999; o.pulso.position.y = 8.2 - 11 * p;
  return { setas: n };
}
export const DUR_CAMINHO = 8.6;

export const cenas = {
  circulacao: { sfx: sfxCirc, pisoTopo: -0.5, criar: criarCirculacao, animar: animarCirculacao, dur: DUR_CIRCULACAO, tempos: [0.7, 1.9, 3.6, 6.0, 10.5], cam: { eye: [-1, 4.2, 14.5], target: [-1.3, 1.5, 0], fov: 45 }, size: [1100, 640] },
  bomba: { size: [540, 960], sfx: sfxCirc, pisoTopo: -0.5, criar: criarCirculacao, animar: animarCirculacao, dur: DUR_CIRCULACAO, tempos: [0.6, 0.95, 1.5, 4.2, 7.0], cam: { eye: [2.5, 5, 11], target: [-1, 2.8, 0], fov: 50 } },
  filtro: { size: [540, 960], sfx: sfxCirc, pisoTopo: -0.5, criar: criarCirculacao, animar: animarCirculacao, dur: DUR_CIRCULACAO, tempos: [1.8, 2.4, 5.5, 8.0, 10.8], cam: { eye: [8.6, 5, 12], target: [5.0, 2.4, 0], fov: 50 } },
  balanca: { sfx: () => EVENTOS.map((e) => +(e.t0 + TF).toFixed(2)), criar: criarBalanca, animar: animarBalanca, dur: DUR_BALANCA, tempos: [0.9, 1.7, 3.0, 5.2, 7.6], cam: { eye: [0, 7.5, 17.5], target: [0, 2.6, 0], fov: 42 } },
  'caminho-carga': { pisoTopo: -3, criar: criarCaminhoCarga, animar: animarCaminhoCarga, dur: DUR_CAMINHO, tempos: [1.1, 2.6, 4.2, 5.9, 7.4], cam: { eye: [9, 5, 24], target: [0, 2.5, 0], fov: 44 }, size: [540, 960], sfx: () => Object.values(T_SETA).map((v) => +(v + 0.5).toFixed(2)) },
};
