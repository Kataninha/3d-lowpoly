// Solo, estaca + bate-estaca, bloco e fundacao. Ids: terreno, estaca, bloco, fundacao.
// Cada animar<X>(obj, t) e funcao pura de t (segundos desde o inicio da mecanica).
import * as THREE from 'three';
import { crescerPeca } from '../../kit/efeitos/montagem-unidades.js';
import { COR, mat, concretoOpaco, box, cyl, add, grupo, sombra, unidadeBarra, smooth, clamp01, hash, planoZ, matCorte, tampaZ, montar, encaixes } from './base.js';

/* ---------------- terreno: camadas de solo (corte) ---------------- */
// Fatias de 1 u; as de baixo sao a camada firme (escura), as de cima a mole (clara).
// `furos`: bolsoes abertos para a frente onde a estaca desce {x, z, hw}. So atravessam a camada mole.
export function criarTerreno({ w = 10, d = 4, mole = 4, firme = 2, furos = [] } = {}) {
  const g = new THREE.Group(); g.name = 'terreno';
  const camadas = grupo(g, 'camadas');
  const n = mole + firme;
  const fs = [...furos].sort((a, b) => a.x - b.x);
  for (let i = 0; i < n; i++) {
    const ehFirme = i < firme;
    const s = grupo(camadas, ehFirme ? 'camada-firme' : 'camada-mole', 0, -n + i + 0.5, 0);
    const cor = ehFirme ? COR.firmeEscura : COR.moleClara;
    const H = 0.97;
    let x0 = -w / 2;
    const solido = (xa, xb) => { if (xb - xa > 0.001) box(s, cor, xb - xa, H, d, (xa + xb) / 2, 0, 0); };
    for (const f of ehFirme ? [] : fs) {
      solido(x0, f.x - f.hw);
      const zb = f.z - f.hw;                       // fundo do bolsao
      box(s, cor, f.hw * 2, H, zb + d / 2, f.x, 0, (zb - d / 2) / 2);
      x0 = f.x + f.hw;
    }
    solido(x0, w / 2);
  }
  return { group: g, camadas, n, w, d, topoFirme: -firme, furos: fs };
}
export function animarTerreno(obj, t) {
  montar(obj.camadas, t, { t0: 0.3, dur: 1.8, ordem: 'baixo-cima' });
  return { fatias: obj.n };
}
const sfxTerreno = () => encaixes(6, { t0: 0.3, dur: 1.8 });

/* ---------------- estaca + bate-estaca ---------------- */
const PASSOS = [1.7, 1.4, 0.9];          // quanto afunda em cada golpe (soma 4,0 = ate a camada firme)
const IMPACTOS = [0.9, 2.0, 3.1];        // instante de cada golpe (s)
const ELEVA = 2.2;                       // altura que o martelo sobe
export const ESTACA_L = 4.8;             // comprimento da estaca (u); topo final = 0,8 u acima do chao

function criarEstacaPeca(parent, x, z) {
  const e = grupo(parent, 'estaca', x, 0, z);
  cyl(e, COR.concreto, 0.28, ESTACA_L - 0.35, 0, 0.35 + (ESTACA_L - 0.35) / 2, 0, 8);
  const ponta = add(e, new THREE.ConeGeometry(0.28, 0.35, 8), mat(COR.concreto), 0, 0.175, 0);
  ponta.rotation.x = Math.PI;
  return e;
}

export function criarEstaca() {
  const g = new THREE.Group(); g.name = 'estaca-cena';
  const pz = 1.4;
  const terreno = criarTerreno({ w: 10, d: 4, furos: [{ x: 0, z: pz, hw: 0.42 }] });
  g.add(terreno.group);
  const miolo = box(g, COR.moleClara, 0.8, 1, 0.8, 0, -2, pz);   // solo ainda nao deslocado, abaixo da ponta
  miolo.name = 'miolo-solo';
  const estaca = criarEstacaPeca(g, 0, pz);
  // Maquina (atras do bolsao): base amarela, esteiras, mastro.
  const maq = grupo(g, 'bate-estaca', 0, 0, pz - 1.8);
  box(maq, COR.maquina, 2.8, 0.6, 2.2, 0, 0.55, 0);
  box(maq, COR.metalEscuro, 3.0, 0.4, 0.5, 0, 0.2, -0.8); box(maq, COR.metalEscuro, 3.0, 0.4, 0.5, 0, 0.2, 0.8);
  box(maq, COR.maquina, 0.9, 0.9, 0.9, -0.7, 1.3, -0.3);                 // cabine
  box(maq, COR.maquina, 0.3, 8.0, 0.3, 0, 4.3, 1.0);                      // mastro (z local 1,0 = pz-0,8)
  sombra(g, 3.8, 3.2, 0, pz - 1.8);
  // Martelo: desliza pelo mastro; bracket liga ao martelo sobre a estaca.
  const martelo = grupo(g, 'martelo', 0, ESTACA_L, pz);
  cyl(martelo, COR.metal, 0.4, 1.0, 0, 0.5, 0, 10);
  cyl(martelo, COR.metalEscuro, 0.33, 0.25, 0, 0.0, 0, 10);
  box(martelo, COR.metal, 0.22, 0.22, 0.8, 0, 0.6, -0.5);
  box(martelo, COR.metalEscuro, 0.55, 0.9, 0.5, 0, 0.6, -0.8);
  // Poeira: 3 nuvens x 14 cubos (grandes, bem visiveis).
  const poeira = IMPACTOS.map((_, i) => {
    const gp = grupo(g, `poeira-${i}`, 0, 0, pz);
    return Array.from({ length: 14 }, () => box(gp, 0xf1e3c8, 0.3, 0.3, 0.3));
  });
  return { group: g, terreno, miolo, estaca, martelo, maq, poeira, pz };
}

/** Ponta da estaca (y) no instante t: 0 antes do 1o golpe, -4 depois do 3o. */
export function pontaEstaca(t) {
  let y = 0;
  IMPACTOS.forEach((Ti, i) => { y -= PASSOS[i] * smooth((t - Ti) / 0.14); });
  return y;
}
export function animarEstaca(obj, t) {
  animarTerreno(obj.terreno, 99);                              // solo ja montado
  const tip = pontaEstaca(t);
  obj.estaca.position.y = tip;
  obj.miolo.visible = tip > -3.98;
  obj.miolo.scale.y = Math.max(tip + 4, 0.001); obj.miolo.position.y = -4 + (tip + 4) / 2;
  let lift = 0;
  IMPACTOS.forEach((Ti) => {
    const s = t - (Ti - 0.9);
    if (s >= 0 && s < 0.6) lift = ELEVA * smooth(s / 0.6);
    else if (s >= 0.6 && s < 0.65) lift = ELEVA;
    else if (s >= 0.65 && s < 0.9) lift = ELEVA * (1 - ((s - 0.65) / 0.25) ** 2);
  });
  obj.martelo.position.y = tip + ESTACA_L + lift;
  // Tremor curto do solo: toda a cena balanca 0,35 s depois de cada golpe (amplitude decai).
  let tx = 0, ty = 0;
  IMPACTOS.forEach((Ti) => { const s = t - Ti; if (s >= 0 && s < 0.35) { const a = 0.07 * (1 - s / 0.35) ** 2; tx += a * Math.sin(s * 70); ty += a * 0.7 * Math.cos(s * 83); } });
  obj.group.position.set(tx, ty, 0);
  obj.poeira.forEach((nuvem, i) => {
    const u = (t - IMPACTOS[i]) / 1.0;
    nuvem.forEach((c, k) => {
      c.visible = u > 0 && u < 1;
      if (!c.visible) return;
      const a = (k / 14) * Math.PI * 2 + hash(k, i) * 0.6, r = 0.3 + (1.0 + 0.8 * hash(k, i + 3)) * Math.sqrt(u);
      c.position.set(Math.cos(a) * r, 0.15 + 0.9 * Math.sin(Math.PI * Math.min(u * 1.2, 1)) * (0.4 + hash(k, i + 7)), Math.sin(a) * r);
      c.scale.setScalar(Math.max(0.05, 1.5 * (1 - u) ** 0.7 + 0.1));
      c.rotation.y = a; c.rotation.x = u * 2;
    });
  });
  const golpes = IMPACTOS.filter((Ti) => t >= Ti).length;
  return { ponta: +tip.toFixed(3), golpes };
}
export const DUR_ESTACA = 4.4;

/* ---------------- bloco: forma, aco, concreto, forma some, corte ---------------- */
const BW = 3.4, BH = 1.2, BD = 2.0, ZC0 = 1.2, ZCUT = 0.28;
export function criarBloco({ solo = true, cabecas = true, zOff = 0 } = {}) {
  const g = new THREE.Group(); g.name = 'bloco-cena';
  const plano = planoZ(ZC0 + zOff);
  if (solo) box(g, COR.moleClara, 9, 0.4, 6, 0, -0.19, 0);
  if (cabecas) for (const x of [-1.1, 1.1]) cyl(g, COR.concreto, 0.28, 1.2, x, 0.2, 0, 8);
  const forma = grupo(g, 'forma');
  const h = 0.38;
  for (const nivel of [0, 1, 2]) {
    const y = 0.2 + nivel * 0.4;
    for (const sz of [-1, 1]) box(forma, COR.madeira, BW + 0.2, h, 0.08, 0, y, sz * (BD / 2 + 0.04));
    for (const sx of [-1, 1]) box(forma, COR.madeira, 0.08, h, BD, sx * (BW / 2 + 0.04), y, 0);
  }
  const aco = grupo(g, 'aco');
  const us = [];
  for (const z of [-0.8, -0.28, 0.28, 0.8]) us.push(unidadeBarra(aco, [-1.5, 0.22, z], [1.5, 0.22, z], 0.05, COR.aco));
  for (const x of [-1.5, -0.4, 0.4, 1.5]) us.push(unidadeBarra(aco, [x, 0.32, -0.85], [x, 0.32, 0.85], 0.05, COR.aco));
  for (const [x, z] of [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]]) us.push(unidadeBarra(aco, [x, 0.15, z], [x, 2.0, z], 0.05, COR.aco)); // esperas do pilar
  const mAco = matCorte(COR.aco, plano, { dupla: true });
  us.forEach((u) => u.traverse((o) => { if (o.isMesh) o.material = mAco; }));
  const concreto = add(g, new THREE.BoxGeometry(BW, BH, BD), matCorte(COR.concreto, plano), 0, BH / 2, 0); concreto.name = 'concreto';
  const tampa = tampaZ(g, COR.concreto, BW, BH, 0, BH / 2, ZC0); tampa.visible = false;
  return { group: g, forma, aco, concreto, plano, tampa, zOff };
}
export function animarBloco(obj, t) {
  const T = { forma: 0.3, aco: 1.9, conc: 3.3, tira: 5.0, corte: 6.2 };
  montar(obj.forma, t, { t0: T.forma, dur: 1.4, ordem: 'perimetro' });
  montar(obj.aco, t, { t0: T.aco, dur: 1.2, ordem: 'indice' });
  obj.concreto.visible = t > T.conc;
  if (obj.concreto.visible) crescerPeca(obj.concreto, t, { eixo: 'y', t0: T.conc, dur: 1.4 });
  const k = smooth((t - T.tira) / 0.8);
  obj.forma.position.y = 2.4 * k; obj.forma.scale.set(1 + 0.25 * k, 1, 1 + 0.25 * k);
  obj.forma.visible = k < 1 && t > T.forma;
  // corte: plano varre de z = 1,0 (fora) ate z = 0,28; a tampa solida fica no plano e mostra o aco em relevo
  const c = smooth((t - T.corte) / 0.9), zc = ZC0 + (ZCUT - ZC0) * c;
  obj.plano.constant = zc + obj.zOff;
  obj.tampa.visible = c > 0.01 && t > T.conc + 1.4; obj.tampa.position.z = Math.min(zc - 0.06, BD / 2 - 0.005);
  return { fase: t < T.aco ? 'forma' : t < T.conc ? 'aco' : t < T.tira ? 'concreto' : c < 0.01 ? 'pronto' : 'corte', corte: +c.toFixed(2) };
}
export const DUR_BLOCO = 7.6;
const sfxBloco = () => [...encaixes(12, { t0: 0.3, dur: 1.4 }), ...encaixes(12, { t0: 1.9, dur: 1.2 }), 4.7];

/* ---------------- fundacao: estacas + bloco juntos ---------------- */
export function criarFundacao() {
  const g = new THREE.Group(); g.name = 'fundacao-cena';
  const pz = 1.2;
  const terreno = criarTerreno({ w: 10, d: 4.4, furos: [{ x: -1.1, z: pz, hw: 0.55 }, { x: 1.1, z: pz, hw: 0.55 }] });
  g.add(terreno.group);
  const estacas = [-1.1, 1.1].map((x) => { const e = criarEstacaPeca(g, x, pz); e.position.y = -4; return e; });
  const bloco = criarBloco({ solo: false, cabecas: false, zOff: pz });
  bloco.group.position.z = pz; g.add(bloco.group);
  const pulso = grupo(g, 'pulso', 0, 0, pz);
  const pm = () => new THREE.MeshBasicMaterial({ color: COR.amarelo, transparent: true, opacity: 0, depthWrite: false });
  const casca = add(pulso, new THREE.BoxGeometry(BW + 0.1, BH + 0.1, BD + 0.1), pm(), 0, BH / 2, 0);
  const caps = [-1.1, 1.1].map((x) => add(g, new THREE.CylinderGeometry(0.34, 0.34, ESTACA_L + 0.05, 8), pm(), x, -4 + ESTACA_L / 2, pz));
  return { group: g, terreno, estacas, bloco, pulso, pulsoMats: [casca.material, ...caps.map((c) => c.material)] };
}
export function animarFundacao(obj, t) {
  animarTerreno(obj.terreno, 99);
  const b = animarBloco(obj.bloco, t);
  const p = t > 8.0 ? Math.sin(Math.PI * clamp01((t - 8.0) / 1.2)) * 0.45 : 0;   // pulso amarelo em estacas e bloco
  obj.pulsoMats.forEach((m) => { m.opacity = p; });
  return { ...b, pulso: +p.toFixed(2) };
}
export const DUR_FUNDACAO = 9.6;

export const cenas = {
  terreno: { piso: false, criar: criarTerreno, animar: animarTerreno, dur: 2.4, tempos: [0.4, 0.9, 1.4, 1.9, 2.4], cam: { eye: [11, 4.5, 15], target: [0, -2.8, 0], fov: 40 }, size: [540, 960], sfx: sfxTerreno },
  estaca: { piso: false, criar: criarEstaca, animar: animarEstaca, dur: DUR_ESTACA, tempos: [0.0, 0.7, 1.05, 2.2, 4.0], cam: { eye: [4, 3.5, 21], target: [0, 0.9, 0.7], fov: 42 }, size: [540, 960], sfx: () => IMPACTOS },
  bloco: { criar: criarBloco, animar: animarBloco, dur: DUR_BLOCO, tempos: [1.0, 2.4, 4.4, 5.8, 7.3], cam: { eye: [5.5, 3.6, 8.5], target: [0, 0.8, 0], fov: 40 }, size: [540, 960], sfx: sfxBloco },
  fundacao: { piso: false, criar: criarFundacao, animar: animarFundacao, dur: DUR_FUNDACAO, tempos: [0.4, 2.6, 5.0, 7.4, 8.6], cam: { eye: [2.5, 4.2, 15.5], target: [0, -1.4, 0.8], fov: 42 }, size: [540, 960], sfx: sfxBloco },
};
