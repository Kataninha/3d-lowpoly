import * as THREE from 'three';

/**
 * Liquidificador v2. 1 u = 0,5 m; chão do balcão em y = 0; altura ~1,03 u (≈ 52 cm).
 * Flat shading, sem contorno 3D. Hierarquia: raiz > base (pé, carcaça, placa, botões, fio) · motor (> rotor > acopM)
 * · copo (> parede, nervuras, colar, piso, alça, vedação, conjuntoLamina (> acopC, eixo, lâmina)) · tampa · líquido · frutas · fx.
 * Cada animar<Mecânica>(L, t) é função pura do tempo t (segundos): chama reiniciar() e depois aplica o estado.
 * Durações de referência em DURACAO. Sem Math.random / Date.now: o seek funciona em qualquer ordem.
 */
export const LEVEL = 0.80;          // nível do líquido
export const RS = 0.1895;           // raio do copo no nível
export const DURACAO = Object.freeze({ motor: 3, laminaReta: 4, redemoinho: 6, carrossel: 4, nervuras: 6, arremesso: 5, queima: 4, vedacao: 4.5, acoplamento: 6 });

const cl = x => Math.max(0, Math.min(1, x));
const ramp = (t, a, b) => cl((t - a) / (b - a));
const sm = x => x * x * (3 - 2 * x);
const lerp = (a, b, k) => a + (b - a) * k;
const fr = x => x - Math.floor(x);
const h = (i, k) => fr(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);       // hash determinístico
const tri = (x, lo, hi) => { const w = hi - lo, m = (((x - lo) % (2 * w)) + 2 * w) % (2 * w); return lo + (m <= w ? m : 2 * w - m); };
const pol = (r, th) => [r * Math.cos(th), 0, -r * Math.sin(th)];                 // mesmo sentido de rotation.y
const spin = (t, t0, rampa, w) => { const d = t - t0; return d <= 0 ? 0 : d < rampa ? w * d * d / (2 * rampa) : w * (d - rampa / 2); };
const sy = (r, d) => LEVEL - d * (1 - Math.min(1, r / RS));                      // superfície do redemoinho: funil em cone

export function criarLiquidificador2() {
  const raiz = new THREE.Group(); raiz.name = 'liquidificador';
  const L = { raiz, pecas: {}, mats: {} };
  const mat = (cor, extra = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.7, flatShading: true, ...extra });
  const basico = (cor, extra = {}) => new THREE.MeshBasicMaterial({ color: cor, ...extra });
  const add = (nome, geo, m, pai, pos = [0, 0, 0]) => { const o = new THREE.Mesh(geo, m); o.name = nome; o.position.set(...pos); pai.add(o); L.pecas[nome] = o; return o; };
  const grp = (nome, pai, pos = [0, 0, 0]) => { const g = new THREE.Group(); g.name = nome; g.position.set(...pos); pai.add(g); L.pecas[nome] = g; return g; };
  const cyl = (rt, rb, hh, seg = 12, aberto = false) => new THREE.CylinderGeometry(rt, rb, hh, seg, 1, aberto);
  const M = L.mats;
  M.pe = mat(0x303842); M.carcaca = mat(0xdfe6e8); M.placa = mat(0x485760); M.colar = mat(0x485760, { side: THREE.DoubleSide });
  M.piso = mat(0x485760); M.parede = mat(0x9dcbd6, { transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
  M.estator = mat(0x727f87); M.nucleo = mat(0x727f87, { transparent: true }); M.carcacaCorte = mat(0xdfe6e8, { side: THREE.DoubleSide }); M.borda = mat(0x8fa0a7); M.cobre = mat(0xb86b33); M.eixo = mat(0xcfd7da);
  M.denteM = mat(0xe8872b); M.denteC = mat(0x1f9aa6); M.disco = mat(0xcfd7da);
  M.liquido = mat(0xffb3bd, { transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  M.nervura = mat(0xeaf4f7);
  M.lamina = mat(0xf4f8f9, { emissive: 0x3a4448, transparent: true }); M.laminaPonta = mat(0xffffff, { emissive: 0x4a5558, transparent: true });   // transparent + renderOrder: a lâmina desenha por cima do líquido e não some na cor do suco M.rotor = mat(0xb9c4c9);

  // ---------- base ----------
  const base = grp('base', raiz);
  add('pe', cyl(0.235, 0.235, 0.03), M.pe, base, [0, 0.015, 0]);
  add('carcaca', cyl(0.20, 0.23, 0.28), M.carcaca, base, [0, 0.17, 0]);
  const corte = grp('carcacaCorte', base); corte.visible = false;                                // meia carcaça aberta na frente, com borda sólida
  add('carcacaMeia', new THREE.CylinderGeometry(0.20, 0.23, 0.28, 12, 1, true, Math.PI / 2, Math.PI), M.carcacaCorte, corte, [0, 0.17, 0]);
  [1, -1].forEach(sg => { const e = add('carcacaBorda' + (sg > 0 ? 'D' : 'E'), new THREE.BoxGeometry(0.035, 0.28, 0.03), M.borda, corte, [sg * 0.215, 0.17, 0]); e.rotation.z = sg * Math.atan(0.03 / 0.28); });
  add('placa', cyl(0.20, 0.20, 0.02), M.placa, base, [0, 0.32, 0]);
  const botoes = [];
  for (let k = 0; k < 3; k++) {
    const b = add('botao' + k, cyl(0.022, 0.022, 0.02, 10), mat(k === 2 ? 0xe8872b : 0x5b6a70), base, [(k - 1) * 0.07, 0.17, 0.217]);
    b.rotation.x = Math.PI / 2; botoes.push(b);
  }
  const curva = new THREE.CatmullRomCurve3([[0, 0.06, -0.20], [0, 0.03, -0.30], [0.08, 0.012, -0.48], [-0.10, 0.012, -0.68], [0.04, 0.012, -0.88]].map(p => new THREE.Vector3(...p)));
  const fio = add('fio', new THREE.TubeGeometry(curva, 28, 0.012, 6, false), mat(0x222b30), base);
  add('tomada', new THREE.BoxGeometry(0.06, 0.03, 0.09), mat(0x222b30), base, [0.04, 0.015, -0.93]);
  L.curvaFio = curva; L.botoes = botoes;

  // ---------- motor (origem no topo do pé: y = .03) ----------
  const Y0 = 0.03;
  const motor = grp('motor', raiz, [0, Y0, 0]);
  add('pedestal', cyl(0.06, 0.06, 0.05), M.estator, motor, [0, 0.055 - Y0, 0]);
  add('estator', cyl(0.13, 0.13, 0.17), M.nucleo, motor, [0, 0.165 - Y0, 0]);
  for (let i = 0; i < 3; i++) { const b = add('bobina' + i, new THREE.TorusGeometry(0.137, 0.02, 6, 14), M.cobre, motor, [0, 0.165 - Y0 + (i - 1) * 0.055, 0]); b.rotation.x = Math.PI / 2; }   // enrolamento de cobre em anel
  const rotor = grp('rotor', motor, [0, 0.25 - Y0, 0]);
  add('eixoMotor', cyl(0.02, 0.02, 0.10, 8), M.eixo, rotor, [0, 0.05, 0]);
  add('nucleoRotor', cyl(0.06, 0.06, 0.15, 10), M.rotor, rotor, [0, -0.085, 0]);                 // rotor dentro do estator, preso ao eixo
  add('marcaRotor', new THREE.BoxGeometry(0.02, 0.15, 0.012), M.estator, rotor, [0.06, -0.085, 0]);
  add('eixoRotor', cyl(0.02, 0.02, 0.09, 8), M.eixo, rotor, [0, -0.005, 0]);
  const acopM = grp('acopM', rotor);
  add('discoM', cyl(0.075, 0.075, 0.02, 12), M.disco, acopM, [0, 0.10, 0]);
  const dentes = (nome, pai, y, mt, fase) => { for (let k = 0; k < 3; k++) { const a = fase + k * 2 * Math.PI / 3, d = add(nome + k, new THREE.BoxGeometry(0.03, 0.03, 0.035), mt, pai, [Math.cos(a) * 0.055, y, Math.sin(a) * 0.055]); d.rotation.y = -a; } };
  dentes('denteM', acopM, 0.125, M.denteM, 0);

  // ---------- copo ----------
  const copo = grp('copo', raiz);
  add('colar', cyl(0.17, 0.17, 0.12, 12, true), M.colar, copo, [0, 0.39, 0]);
  add('piso', cyl(0.17, 0.17, 0.02), M.piso, copo, [0, 0.46, 0]);
  add('parede', cyl(0.21, 0.15, 0.50, 12, true), M.parede, copo, [0, 0.72, 0]);
  const alca = add('alca', new THREE.TorusGeometry(0.12, 0.02, 6, 10, Math.PI), M.colar, copo, [0.19, 0.72, 0]); alca.rotation.z = -Math.PI / 2;
  L.nervuras = [];
  for (let k = 0; k < 4; k++) {
    const g = grp('nervuraG' + k, copo); g.rotation.y = Math.PI / 4 + k * Math.PI / 2;
    const m = add('nervura' + k, new THREE.BoxGeometry(0.035, 0.42, 0.06), M.nervura, g, [0.1625, 0.72, 0]); m.rotation.z = -Math.atan(0.06 / 0.50);
    L.nervuras.push(m);
  }
  const vedacao = add('vedacao', new THREE.TorusGeometry(0.05, 0.016, 6, 14), mat(0x1d1b2a), copo, [0, 0.482, 0]); vedacao.rotation.x = Math.PI / 2;
  const conj = grp('conjuntoLamina', copo);
  const acopC = grp('acopC', conj);
  add('stem', cyl(0.03, 0.03, 0.04, 8), M.eixo, acopC, [0, 0.43, 0]);
  add('discoC', cyl(0.075, 0.075, 0.02, 12), M.disco, acopC, [0, 0.40, 0]);
  dentes('denteC', acopC, 0.375, M.denteC, Math.PI / 3);
  add('eixoCopo', cyl(0.02, 0.02, 0.05, 8), M.eixo, conj, [0, 0.495, 0]);
  const lamina = grp('lamina', conj, [0, 0.515, 0]);
  add('cubo', cyl(0.035, 0.035, 0.04, 8), M.eixo, lamina, [0, 0, 0]);
  const reta = grp('laminaReta', lamina); add('barra', new THREE.BoxGeometry(0.30, 0.014, 0.055), M.lamina, reta);
  const torta = grp('laminaTorta', lamina);
  for (let k = 0; k < 4; k++) {
    const sg = k % 2 ? -1 : 1, g = grp('braco' + k, torta); g.rotation.y = -k * Math.PI / 2;
    const a = add('lamina' + k, new THREE.BoxGeometry(0.10, 0.014, 0.05), M.lamina, g, [0.065, 0, 0]); a.rotation.z = sg * 0.3;
    const p = grp('pivo' + k, g, [0.065 + 0.05 * Math.cos(0.3), sg * 0.05 * Math.sin(0.3), 0]); p.rotation.z = sg > 0 ? 1.0 : -0.6;   // pontas tortas: duas para cima, duas para baixo
    add('ponta' + k, new THREE.BoxGeometry(0.06, 0.014, 0.045), M.laminaPonta, p, [0.03, 0, 0]);
  }

  lamina.traverse(o => { o.renderOrder = 5; });

  // ---------- tampa ----------
  const tampa = grp('tampa', raiz);
  add('tampaDisco', cyl(0.215, 0.215, 0.025), mat(0x485760), tampa, [0, 0.9825, 0]);
  add('tampaAba', cyl(0.185, 0.185, 0.02), mat(0x485760), tampa, [0, 0.96, 0]);
  const tampinha = grp('tampinha', tampa); add('tampinhaCorpo', cyl(0.07, 0.07, 0.035), mat(0x303842), tampinha, [0, 1.0125, 0]);

  // ---------- líquido (superfície deformável) ----------
  const liquido = grp('liquido', raiz);
  add('liquidoParede', cyl(0.1895, 0.149, 0.33, 12, true), M.liquido, liquido, [0, 0.635, 0]);
  const RINGS = 5, SEG = 12, pos = [], idx = [];
  pos.push(0, LEVEL, 0);
  for (let r = 1; r <= RINGS; r++) for (let s = 0; s < SEG; s++) { const a = s * 2 * Math.PI / SEG; pos.push(Math.cos(a) * RS * r / RINGS, LEVEL, Math.sin(a) * RS * r / RINGS); }
  for (let s = 0; s < SEG; s++) idx.push(0, 1 + s, 1 + (s + 1) % SEG);
  for (let r = 1; r < RINGS; r++) for (let s = 0; s < SEG; s++) { const a = 1 + (r - 1) * SEG + s, b = 1 + (r - 1) * SEG + (s + 1) % SEG, c = a + SEG, d = b + SEG; idx.push(a, c, b, b, c, d); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setIndex(idx);
  const superficie = add('superficie', sg, M.liquido, liquido);
  L.setVortice = d => {
    const p = sg.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, sy(Math.hypot(p.getX(i), p.getZ(i)), d));
    p.needsUpdate = true; sg.computeVertexNormals();
  };

  // ---------- frutas, partículas, setas, fx (escondidos por padrão) ----------
  const frutas = grp('frutas', raiz);
  const banana = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.12, 2, 6), mat(0xf6d64a)); banana.rotation.z = Math.PI / 2;
  const bananaG = grp('bananaG', frutas); bananaG.add(banana);
  const morangos = [0, 1].map(i => { const g = grp('morango' + i, frutas); const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), mat(0xe0364a)); m.scale.y = 1.15; g.add(m); const f = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.025, 5), mat(0x3c9a4a)); f.position.y = 0.055; g.add(f); return g; });
  const pedacos = Array.from({ length: 8 }, (_, i) => add('pedaco' + i, new THREE.DodecahedronGeometry(0.026, 0), mat([0xf6d64a, 0xe0364a, 0xfff1c9, 0xf6d64a][i % 4]), frutas));
  const particulas = Array.from({ length: 24 }, (_, i) => add('particula' + i, new THREE.TetrahedronGeometry(0.014, 0), mat([0xe0364a, 0xf6d64a, 0xfff1c9][i % 3]), frutas));
  const seta = () => { const g = new THREE.Group(); const m = basico(0x2f6bff, { depthTest: false }); const c = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.045, 6), m); c.position.y = 0.025; const s = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.05, 6), m); s.position.y = -0.025; g.add(c, s); g.traverse(o => { o.renderOrder = 10; }); return g; };
  const setas = grp('setas', raiz); const setasLista = Array.from({ length: 16 }, (_, i) => { const s = seta(); s.name = 'seta' + i; setas.add(s); return s; });
  const fx = grp('fx', raiz);
  const gota = add('gota', new THREE.SphereGeometry(0.016, 8, 6), basico(0x5ac8fa), fx);
  const vazamento = Array.from({ length: 4 }, (_, i) => add('vaza' + i, new THREE.SphereGeometry(0.012, 8, 6), basico(0x5ac8fa), fx));
  const fagulhas = Array.from({ length: 10 }, (_, i) => add('fagulha' + i, new THREE.TetrahedronGeometry(0.014, 0), basico(i % 2 ? 0xffd23f : 0xff8a1f), fx));
  const fumacas = Array.from({ length: 6 }, (_, i) => add('fumaca' + i, new THREE.SphereGeometry(0.03, 8, 6), basico(0x8b8f93, { transparent: true, opacity: 0.6, depthWrite: false }), fx));
  const flash = add('flash', new THREE.SphereGeometry(0.04, 8, 6), basico(0xfff3a0, { transparent: true, opacity: 0.8, depthWrite: false }), fx);

  // sombra de contato sob a base (sem contorno)
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ color: 0x1d1b2a, transparent: true, opacity: 0.16 }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.002; sombra.scale.set(1, 0.8, 1); sombra.name = 'sombra'; raiz.add(sombra);

  Object.assign(L, { base, motor, rotor, acopM, copo, acopC, conj, lamina, reta, torta, tampa, liquido, superficie, frutas, banana: bananaG, morangos, pedacos, particulas, setas, setasLista, fx, gota, vazamento, fagulhas, fumacas, flash, vedacao, sombra, fio });
  reiniciar(L);
  return L;
}

/** 0 = opaco; 1 = raio-X (carcaça e colar quase transparentes, copo mais leve). */
export function raioX(L, n, { colar = true } = {}) {
  const set = (m, base, alvo) => { const o = lerp(base, alvo, n); m.transparent = n > 0 || base < 1; m.opacity = o; m.depthWrite = o >= 0.99; m.needsUpdate = true; };
  L.pecas.carcaca.visible = n === 0; L.pecas.carcacaCorte.visible = n > 0; L.botoes.forEach(b => { b.visible = n === 0; });
  set(L.mats.nucleo, 1, 0.3); set(L.mats.parede, 0.5, 0.2); set(L.mats.piso, 1, 0.45);
  set(L.mats.colar, 1, colar ? 0.2 : 1);
  set(L.mats.liquido, 0.6, 0.3);
}

function ocultar(L) {
  for (const o of [...L.pedacos, ...L.particulas, ...L.setasLista, ...L.vazamento, ...L.fagulhas, ...L.fumacas, L.gota, L.flash, L.banana, ...L.morangos]) { o.visible = false; o.scale.setScalar(1); }
}

/** Estado padrão: aparelho completo e parado, sem frutas e sem efeito. */
export function reiniciar(L) {
  raioX(L, 0);
  L.motor.scale.y = 1; L.rotor.rotation.y = 0; L.copo.position.y = 0; L.copo.visible = true; L.copo.rotation.y = 0;
  L.conj.rotation.y = 0; L.conj.position.y = 0; L.vedacao.visible = true; L.vedacao.position.set(0, 0.482, 0);
  L.reta.visible = false; L.torta.visible = true; L.tampa.visible = true; L.tampa.position.y = 0;
  L.liquido.visible = true; L.setVortice(0);
  for (const n of L.nervuras) { n.scale.x = 1; n.position.x = 0.1625; n.visible = true; }
  L.mats.estator.color.setHex(0x727f87); L.mats.nucleo.color.setHex(0x727f87); L.mats.cobre.color.setHex(0xb86b33);
  ocultar(L);
}

const NERV_X = s => 0.18 - 0.0175 * s;         // face da nervura sempre encostada na parede (raio .18 a meia altura)
function girar(L, ang) { L.rotor.rotation.y = ang; L.conj.rotation.y = ang; }
function semTampa(L) { L.tampa.visible = false; }
function fruta(g, p, y, rot = 0) { g.visible = true; g.position.set(p[0], y, p[2]); g.rotation.y = rot; }
function flecha(s, p, dir) { s.visible = true; s.position.set(...p); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); }
function lazo(u, th, d) { const psi = -2 * Math.PI * u, r = 0.08 - 0.07 * Math.cos(psi); let y = 0.66 + 0.12 * Math.sin(psi); y = Math.min(y, sy(r, d) - 0.01); const q = pol(r, th + 5.2 * u); return new THREE.Vector3(q[0], y, q[2]); }   // espiral: desce pelo centro, sobe pela parede
function colocarSetas(L, t, d, th0, em) {
  L.setasLista.forEach((s, k) => {
    const set = k < 8 ? 0 : 1, i = k % 8, u = fr(t * 0.18 + i / 8), th = th0 + set * Math.PI;
    const p = lazo(u, th, d), q = lazo(u + 0.01, th, d);
    flecha(s, [p.x, p.y, p.z], q.sub(p)); s.scale.setScalar(Math.max(0.001, em));
  });
}
function colocarParticulas(L, t, d, thBase, em) {
  L.particulas.forEach((o, i) => {
    o.visible = em > 0.01; o.scale.setScalar(Math.max(0.001, em));
    const u = fr(t * 0.16 + i / 24), th = thBase + h(i, 1) * 6.283;
    o.position.copy(lazo(u, th, d)); o.rotation.set(t * 2 + i, t * 3, 0);
  });
}

/** Motor cresce a partir do pé da base e gira. Carcaça em raio-X. t em 0..3 s. */
export function animarMotor(L, t) {
  reiniciar(L); raioX(L, 0.9); L.copo.visible = false; semTampa(L); L.liquido.visible = false;
  L.motor.scale.y = Math.max(0.02, sm(ramp(t, 0, 0.9)));
  L.rotor.rotation.y = spin(t, 1.1, 0.6, 32);
}

/** Lâmina reta gira; a fruta só boia por cima. t em 0..4 s. */
export function animarLaminaReta(L, t) {
  reiniciar(L); raioX(L, 0.55); semTampa(L); L.reta.visible = true; L.torta.visible = false;
  girar(L, spin(t, 0.5, 0.7, 40)); L.setVortice(0.01);
  fruta(L.banana, [0.07 + 0.01 * Math.sin(0.8 * t), 0, 0.03], LEVEL + 0.012 + 0.006 * Math.sin(2.2 * t), 0.4 + 0.1 * t);
  L.morangos.forEach((g, i) => { const x = i ? 0.02 : -0.08, z = i ? -0.09 : 0.06; fruta(g, [x + 0.008 * Math.sin(0.8 * t + i), 0, z], LEVEL + 0.048 + 0.006 * Math.sin(2.2 * t + i + 1), 0.3 * t); });
}

/** Lâmina torta afunda o líquido (redemoinho) e arrasta a fruta; partículas e setas azuis. t em 0..6 s. */
export function animarRedemoinho(L, t) {
  reiniciar(L); raioX(L, 0.6); semTampa(L);
  girar(L, spin(t, 0.2, 0.8, 40));
  const d = 0.22 * sm(ramp(t, 0.4, 2.2)); L.setVortice(d);
  const wf = spin(t, 0.4, 1.2, 9);
  [L.banana, ...L.morangos].forEach((g, i) => {
    const q = sm(ramp(t, 1.0 + 0.3 * i, 4.5 + 0.3 * i)), r = lerp(0.125 + 0.02 * i, 0.035, q), th = i * 2.1 + wf;
    fruta(g, pol(r, th), sy(r, d) + 0.02 - 0.05 * q, th);
    g.scale.setScalar(Math.max(0.001, 1 - ramp(t, 4.6 + 0.2 * i, 5.4 + 0.2 * i)));
  });
  colocarParticulas(L, t, d, wf, ramp(t, 2.8, 3.6));
  colocarSetas(L, t, d, Math.PI / 2, sm(ramp(t, 1.6, 2.4)));
}

/** Tudo gira junto: a fruta orbita com o líquido e não encosta na lâmina. Câmera de cima. t em 0..4 s. */
export function animarCarrossel(L, t) {
  reiniciar(L); raioX(L, 0.45); semTampa(L);
  const w = spin(t, 0.2, 1.2, 36 * 0.95); girar(L, spin(t, 0.2, 0.8, 36));
  const d = 0.07 * sm(ramp(t, 0, 1)); L.setVortice(d);
  [L.banana, ...L.morangos].forEach((g, i) => { const r = [0.12, 0.145, 0.13][i], th = i * 2.1 + w; fruta(g, pol(r, th), sy(r, d) + 0.02, th); });
  L.setasLista.forEach((s, k) => {
    if (k >= 6) return; const th = k * Math.PI / 3 + w, p = pol(0.155, th);
    flecha(s, [p[0], LEVEL - 0.015, p[2]], new THREE.Vector3(-Math.sin(th), 0, -Math.cos(th)));
  });
}

/** Nervuras nascem na parede e quebram o giro: a fruta é jogada para dentro e para baixo. t em 0..6 s. */
export function animarNervuras(L, t) {
  reiniciar(L); raioX(L, 0.5); semTampa(L);
  const q = sm(ramp(t, 1.6, 3.2)), w = spin(t, 0, 1.0, 14), d = 0.07 + 0.14 * q;
  girar(L, spin(t, 0, 0.6, 36)); L.setVortice(d);
  L.nervuras.forEach((n, k) => { const s = Math.max(0.001, sm(ramp(t, 0.4 + 0.25 * k, 1.2 + 0.25 * k))); n.scale.x = s; n.position.x = NERV_X(s); });
  [L.banana, ...L.morangos].forEach((g, i) => {
    const r = lerp(0.14, 0.055, q) + 0.012 * q * Math.sin(9 * t + i), th = i * 2.1 + w;
    fruta(g, pol(r, th), sy(r, d) + 0.02 - 0.05 * q, th);
  });
  const alfa = q * 1.2;
  L.setasLista.forEach((s, k) => {
    if (k >= 8) return; const th = k * Math.PI / 4 + Math.PI / 8 + w, p = pol(0.15, th);
    const tan = new THREE.Vector3(-Math.sin(th), 0, -Math.cos(th)), rad = new THREE.Vector3(Math.cos(th), 0, -Math.sin(th));
    flecha(s, [p[0], 0.64, p[2]], tan.multiplyScalar(Math.cos(alfa)).addScaledVector(rad, -0.5 * Math.sin(alfa)).add(new THREE.Vector3(0, -0.9 * Math.sin(alfa), 0)));   // bate na nervura: o giro vira queda para dentro
  });
}

/** Fruta bate na lâmina e é arremessada em pedaços contra a parede (câmera lenta). t em 0..5 s. */
export function animarArremesso(L, t) {
  reiniciar(L); raioX(L, 0.5); semTampa(L);
  girar(L, spin(t, 0, 0.5, 46)); L.setVortice(0.2);
  const T = 1.15, th0 = 0.8;
  if (t < T) { fruta(L.banana, pol(0.045, th0), 0.6 - 0.05 * sm(ramp(t, 0, 1.1)), th0); return; }
  const tp = t - T;
  L.pedacos.forEach((p, i) => {
    if (i >= 6) return; p.visible = true;
    const vr = 0.10 + 0.07 * h(i, 1), vy = (h(i, 2) - 0.5) * 0.5, w = 3 + 2 * h(i, 3), a0 = th0 + i * 1.05;
    const r = tri(0.045 + vr * tp * 1.6, 0.03, 0.155), y = tri(0.55 + vy * tp, 0.53, 0.74), q = pol(r, a0 + w * tp);
    p.position.set(q[0], y, q[2]); p.rotation.set(tp * 4 + i, tp * 3, 0);
  });
  if (tp < 0.2) { const q = pol(0.045, th0); L.flash.visible = true; L.flash.position.set(q[0], 0.55, q[2]); L.flash.scale.setScalar(1 + 3 * tp); L.flash.material.opacity = 0.8 * (1 - tp / 0.2); }
}

/** Líquido desce pelo eixo e cai no motor: faísca e fumaça; motor escurece. t em 0..4 s. */
export function animarQueima(L, t) {
  reiniciar(L); raioX(L, 0.9); semTampa(L); L.vedacao.visible = false;
  girar(L, spin(Math.min(t, 2.6), 0, 0.5, 20)); L.setVortice(0.02);
  const pts = [[0.047, 0.475], [0.047, 0.365], [0.02, 0.36], [0.02, 0.255]], p = ramp(t, 0.2, 2.4) * 3, s = Math.min(2, Math.floor(p)), k = p - s;
  if (t >= 0.2 && t < 2.45) { const a = pts[s], b = pts[s + 1], q = pol(lerp(a[0], b[0], k), 1.5); L.gota.visible = true; L.gota.scale.setScalar(1.7); L.gota.position.set(q[0], lerp(a[1], b[1], k), q[2]); }
  const queimado = sm(ramp(t, 2.4, 3.0));
  for (const m of [L.mats.estator, L.mats.nucleo]) m.color.setHex(0x727f87).lerp(new THREE.Color(0x1b1b1b), queimado);
  L.mats.cobre.color.setHex(0xb86b33).lerp(new THREE.Color(0x2a1a10), queimado);
  const ts = t - 2.4;
  if (ts >= 0) {
    L.fagulhas.forEach((f, i) => {
      const e = ramp(ts, 0.35, 0.55); if (e >= 1) return; f.visible = true; f.scale.setScalar(Math.max(0.001, 1 - e));
      const q = pol(0.10 + 0.06 * h(i, 1), i * 0.628); f.position.set(q[0] * ts * 4, 0.265 + (h(i, 2) - 0.2) * ts * 0.5, q[2] * ts * 4); f.rotation.set(ts * 20, ts * 14, 0);
    });
    if (ts < 0.15) { L.flash.visible = true; L.flash.position.set(0, 0.265, 0); L.flash.scale.setScalar(1 + 5 * ts); L.flash.material.opacity = 0.8 * (1 - ts / 0.15); }
  }
  const tf = t - 2.6;
  if (tf >= 0) L.fumacas.forEach((f, i) => {
    const u = tf - i * 0.12; if (u < 0) return; f.visible = true;
    f.position.set(0.04 * Math.sin(i * 2) + u * 0.03 * (i % 2 ? 1 : -1), Math.min(0.30, 0.27 + u * 0.05), 0.04 * Math.cos(i * 2));
    f.scale.setScalar(0.4 + u * 0.9); f.material.opacity = 0.6 * (1 - ramp(u, 0.8, 1.5));
  });
}

/** Lâmina sai, anel de borracha entra no eixo, lâmina volta; o vazamento para. t em 0..4,5 s. */
export function animarVedacao(L, t) {
  reiniciar(L); raioX(L, 0.5); semTampa(L);
  L.conj.position.y = 0.24 * sm(ramp(t, 0.2, 1.0)) * (1 - sm(ramp(t, 3.0, 3.8)));
  L.vedacao.position.set(0.13 * (1 - sm(ramp(t, 1.2, 2.2))), 0.482, 0);
  if (t < 2.2) L.vazamento.forEach((g, j) => { const u = fr(t * 2 + j / 4), q = pol(0.035, j * 1.6); g.visible = true; g.position.set(q[0], 0.45 - 0.115 * u, q[2]); });
}

/** Copo sobe e solta, gira e desce encaixando os dentes; gira junto com o motor; solta de novo. t em 0..6 s.
 *  O copo não tem apoio no movimento vertical: quem o segura é a mão do Zé na alça, entrando pela lateral do quadro (ver vitrine). */
export function animarAcoplamento(L, t) {
  reiniciar(L); raioX(L, 0.6); semTampa(L); L.liquido.visible = false;
  const dy = 0.16 * (sm(ramp(t, 0.2, 0.9)) - sm(ramp(t, 1.6, 2.4)) + sm(ramp(t, 5.0, 5.8)));
  const ang = spin(Math.min(t, 4.6), 3.0, 0.6, 30), delta = (Math.PI / 3) * cl((dy - 0.03) / 0.03);   // dentes alinhados só com dy < 0,03
  L.copo.position.y = dy; L.rotor.rotation.y = ang; L.conj.rotation.y = ang + delta;
}

export const ANIMACOES = { motor: animarMotor, laminaReta: animarLaminaReta, redemoinho: animarRedemoinho, carrossel: animarCarrossel, nervuras: animarNervuras, arremesso: animarArremesso, queima: animarQueima, vedacao: animarVedacao, acoplamento: animarAcoplamento };

/** Pares (de cima, de baixo) que se tocam no estado montado: |min.y(cima) − max.y(baixo)| ≤ tol. `null` = balcão (y da raiz). */
export const CONTATOS = [
  ['pe', null], ['carcaca', 'pe'], ['placa', 'carcaca'], ['colar', 'placa'], ['piso', 'colar'],
  ['pedestal', 'pe'], ['estator', 'pedestal'], ['eixoMotor', 'estator'],
  ['denteC0', 'discoM'], ['discoC', 'denteM0'], ['stem', 'discoC'], ['eixoCopo', 'piso'], ['vedacao', 'piso'], ['cubo', 'vedacao'],
  ['tampaDisco', 'parede'], ['fio', null], ['tomada', null],
];
/** Lista de falhas de apoio (vazia = tudo apoiado). */
export function inspecionarContatos(L, tol = 0.004) {
  L.raiz.updateMatrixWorld(true);
  const box = nome => new THREE.Box3().setFromObject(L.pecas[nome]), chao = L.raiz.getWorldPosition(new THREE.Vector3()).y, falhas = [];
  for (const [cima, baixo] of CONTATOS) {
    const gap = Math.abs(box(cima).min.y - (baixo ? box(baixo).max.y : chao));
    if (gap > tol) falhas.push({ cima, baixo, gap: +gap.toFixed(4) });
  }
  return falhas;
}
/** Toda peça nomeada precisa descer até a raiz (nada solto na cena). */
export function inspecionarHierarquia(L) {
  const falhas = [];
  for (const [nome, o] of Object.entries(L.pecas)) { let p = o; while (p && p !== L.raiz) p = p.parent; if (p !== L.raiz) falhas.push(nome); }
  return falhas;
}
