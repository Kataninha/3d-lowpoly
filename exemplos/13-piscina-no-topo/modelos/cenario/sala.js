// Sala tecnologica do Ze, em corte 3D. 1 u = 0,5 m. Origem = centro do piso (topo do piso em y = 0).
// Interior 19 x 15 u (9,5 x 7,5 m), pe-direito 5,5 u. Frente (+z) aberta no corte.
// API: const sala = criarSala(); sala.updateAt(t, { painel, trinca, vergar, lustre:{t0,amp}, luminaria, robo });
//   painel 0..1 (0 verde ... 1 vermelho) | trinca 0..1 | vergar 0..1 | lustre {t0, amp} | luminaria 0..1 | robo {t0,t1,de:[x,z],para:[x,z]} ou omitido (ronda padrao)
//   sala.embutir(true) esconde piso e paredes (a fachada da torre vira a parede); embutir(true,{comParedes:true}) mantem as paredes.
// ids: sala, sofa, teto-sala, painel-carga, robo-aspirador, tv, luminaria, cabide, lustre, mesa-centro, tigela-pipoca, pipoca-chao, capacete-cabide, ripado, luz-indireta, janela-cidade
import * as THREE from 'three';
import { mat, caixa, cilindro, grupo, sombra, clamp01, fase, suave, hash, COR } from './util.js';

export const SALA = Object.freeze({ W: 19, D: 15, H: 5.5, parede: 0.5, tetoEsp: 0.5, pisoEsp: 0.5 });
const FUNDO = SALA.D / 2, LADO = SALA.W / 2;
const sino = (x, z) => Math.exp(-(x * x / (2 * 3.2 * 3.2) + z * z / (2 * 2.6 * 2.6))); // verga mais no centro do teto
const PROF_VERGA = 0.7;

function criarSofa() {
  const g = grupo('sofa');
  const cinza = 0x6f8196, claro = 0x8a9db3, perna = COR.escuro;
  for (const x of [-2.4, 2.4]) for (const z of [-0.9, 0.9]) cilindro(g, perna, 0.07, 0.25, x, 0.125, z, 8);
  caixa(g, cinza, 5.2, 0.5, 2.2, 0, 0.5, 0);                       // base 0,25..0,75
  caixa(g, claro, 2.4, 0.2, 1.7, -1.2, 0.85, 0.2);                  // almofadas do assento (topo 0,95)
  caixa(g, claro, 2.4, 0.2, 1.7, 1.2, 0.85, 0.2);
  caixa(g, cinza, 5.2, 0.9, 0.5, 0, 1.2, -0.85);                    // encosto (topo 1,65)
  caixa(g, claro, 2.3, 0.6, 0.25, -1.2, 1.35, -0.5);
  caixa(g, claro, 2.3, 0.6, 0.25, 1.2, 1.35, -0.5);
  for (const x of [-2.5, 2.5]) caixa(g, cinza, 0.4, 0.9, 1.8, x, 1.2, 0.2); // bracos (topo 1,65)
  sombra(g, 5.8, 2.8, 0, 0, 0.012);
  g.userData.assentoY = 0.95;
  return g;
}

function criarRobo() {
  const g = grupo('robo-aspirador');
  cilindro(g, 0x23272e, 0.36, 0.14, 0, 0.09, 0, 20);               // corpo 0,02..0,16
  cilindro(g, 0xdfe4ea, 0.3, 0.04, 0, 0.18, 0, 20);                 // tampa
  cilindro(g, COR.ledFrio, 0.33, 0.02, 0, 0.12, 0, 20, { emissive: COR.ledFrio, emissiveIntensity: 0.9 }); // anel LED
  caixa(g, 0x23272e, 0.2, 0.05, 0.1, 0, 0.22, 0.12);                // sensor
  cilindro(g, 0x111418, 0.06, 0.02, 0, 0.01, 0.25, 8);              // rodinha
  sombra(g, 0.9, 0.9, 0, 0, 0.012, 0.18);
  return g;
}

function criarPainel() {
  const g = grupo('painel-carga');
  caixa(g, 0x2a3036, 2.2, 1.6, 0.12, 0, 0, 0.06);                    // moldura
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 1.3), new THREE.MeshBasicMaterial({ map: tex }));
  tela.position.set(0, 0.05, 0.125); tela.name = 'tela'; g.add(tela);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x35d06a }));
  led.position.set(0.9, -0.66, 0.14); led.name = 'led'; g.add(led);
  g.userData.canvas = canvas; g.userData.tex = tex; g.userData.led = led; g.userData.ultimo = -1;
  return g;
}
function desenharPainel(g, nivel) {
  const pct = Math.round(58 + 40 * nivel), cor = nivel < 0.5 ? '#35d06a' : '#ff3b30';
  const chave = pct + cor;
  if (g.userData.ultimo === chave) return;
  g.userData.ultimo = chave;
  const c = g.userData.canvas.getContext('2d');
  c.fillStyle = '#0c1511'; c.fillRect(0, 0, 256, 128);
  c.fillStyle = cor; c.font = 'bold 20px sans-serif'; c.textAlign = 'left'; c.fillText('LAJE', 14, 28);
  c.font = 'bold 62px sans-serif'; c.textAlign = 'center'; c.fillText(pct + '%', 128, 88);
  const n = Math.round(clamp01(pct / 100) * 10);
  for (let i = 0; i < 10; i++) { c.fillStyle = i < n ? cor : '#223329'; c.fillRect(14 + i * 23, 104, 19, 12); }
  g.userData.tex.needsUpdate = true;
  g.userData.led.material.color.set(cor);
}

function criarTeto() {
  const g = grupo('teto-sala');
  const w = SALA.W + 2 * SALA.parede, d = SALA.D + 2 * SALA.parede;
  const geo = new THREE.BoxGeometry(w, SALA.tetoEsp, d, 24, 1, 20);
  const laje = new THREE.Mesh(geo, mat(COR.concreto));
  laje.castShadow = laje.receiveShadow = true; laje.name = 'laje-teto';
  laje.position.y = SALA.H + SALA.tetoEsp / 2; g.add(laje);
  g.userData.orig = geo.attributes.position.array.slice();
  g.userData.laje = laje;
  // trinca: zigue-zague no forro; 9 segmentos que crescem em ordem
  const trinca = grupo('trinca', g), pts = [[-5.5, -0.5], [-4, 0.6], [-2.6, -0.3], [-1.2, 0.9], [0.2, -0.2], [1.6, 0.8], [3, -0.4], [4.4, 0.5], [5.6, -0.2]];
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.16), new THREE.MeshBasicMaterial({ color: 0x20262b }));
    m.userData = { a, b, len }; segs.push(m); trinca.add(m);
  }
  g.userData.segs = segs;
  // lustre (pendente): pivo no forro, filho do teto
  const pivo = grupo('lustre', g); pivo.position.y = SALA.H;
  cilindro(pivo, 0x1d2126, 0.025, 1.2, 0, -0.6, 0, 6);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfff1d2, emissive: 0xffd9a0, emissiveIntensity: 0.9, flatShading: true }));
  lamp.position.y = -1.3; pivo.add(lamp);
  cilindro(pivo, 0x1d2126, 0.45, 0.06, 0, -0.92, 0, 14);
  g.userData.pivo = pivo;
  return g;
}

/** Cidade ao entardecer atras da janela grande: plano nao iluminado com ceu em degrade, sol e predios com janelas acesas. */
function criarPaisagem() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d'), ceu = g.createLinearGradient(0, 0, 0, 512);
  [[0, '#5d7fae'], [0.5, '#e7a98e'], [0.8, '#f7c27c'], [1, '#d99a6c']].forEach(([p, k]) => ceu.addColorStop(p, k));
  g.fillStyle = ceu; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = '#fff0c4'; g.shadowColor = '#ffd08a'; g.shadowBlur = 50; g.beginPath(); g.arc(700, 330, 42, 0, 7); g.fill(); g.shadowBlur = 0;
  for (const [cor, base, alt, luz] of [['#7a6f86', 1.0, 150, 0.2], ['#4e4a63', 0.8, 220, 0.5], ['#2f2e44', 0.6, 300, 0.75]]) {
    g.fillStyle = cor;
    for (let x = -20, k = 0; x < 1024; k++) {
      const w = 50 + hash(k, 1 + base) * 70, h = alt * (0.35 + hash(k, 3 + base)); g.fillRect(x, 512 - h, w, h);
      g.fillStyle = '#ffd48a';
      for (let yy = 512 - h + 12; yy < 500; yy += 18) for (let xx = x + 8; xx < x + w - 8; xx += 14) if (hash(xx, yy) < luz) g.fillRect(xx, yy, 5, 8);
      g.fillStyle = cor; x += w + 6 + hash(k, 9) * 14;
    }
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: tex }));
  m.name = 'paisagem'; return m;
}

export function criarSala() {
  const raiz = grupo('sala');
  const cascaSala = grupo('paredes-sala', raiz);
  const parede = 0xf0ece4, pisoCor = 0xcdb287, vidroJanela = mat(0xbfe6ee, { transparent: true, opacity: 0.18, depthWrite: false });
  const piso = caixa(raiz, pisoCor, SALA.W + 2 * SALA.parede, SALA.pisoEsp, SALA.D + 2 * SALA.parede, 0, -SALA.pisoEsp / 2, 0); piso.name = 'piso-sala';
  // parede do fundo com janela grande (x -6,2..1,8; y 0,9..4,9) para a cidade
  const zF = -FUNDO - SALA.parede / 2, J = { x0: -6.2, x1: 1.8, y0: 0.9, y1: 4.9 }, jx = (J.x0 + J.x1) / 2, jw = J.x1 - J.x0;
  caixa(cascaSala, parede, J.x0 + LADO + SALA.parede, SALA.H, SALA.parede, (-LADO - SALA.parede + J.x0) / 2, SALA.H / 2, zF);
  caixa(cascaSala, parede, LADO + SALA.parede - J.x1, SALA.H, SALA.parede, (J.x1 + LADO + SALA.parede) / 2, SALA.H / 2, zF);
  caixa(cascaSala, parede, jw, J.y0, SALA.parede, jx, J.y0 / 2, zF);
  caixa(cascaSala, parede, jw, SALA.H - J.y1, SALA.parede, jx, (J.y1 + SALA.H) / 2, zF);
  caixa(cascaSala, 0x2b3138, jw + 0.2, 0.14, 0.2, jx, J.y0 + 0.07, zF);
  for (const x of [J.x0, J.x1, jx]) caixa(cascaSala, 0x2b3138, 0.1, J.y1 - J.y0, 0.14, x, (J.y0 + J.y1) / 2, zF);
  caixa(cascaSala, vidroJanela, jw, J.y1 - J.y0, 0.05, jx, (J.y0 + J.y1) / 2, zF);
  const paisagem = criarPaisagem(); paisagem.position.set(jx, 4.2, -FUNDO - 7); cascaSala.add(paisagem);
  caixa(cascaSala, parede, SALA.parede, SALA.H, SALA.D, -LADO - SALA.parede / 2, SALA.H / 2, 0);
  caixa(cascaSala, parede, SALA.parede, SALA.H, SALA.D, LADO + SALA.parede / 2, SALA.H / 2, 0);
  // rodape (volume) para ler a quina
  caixa(cascaSala, 0xd8d2c6, SALA.W, 0.18, 0.08, 0, 0.09, -FUNDO + 0.04);

  const teto = criarTeto(); raiz.add(teto);
  const mob = grupo('mobilia', raiz);

  // tapete (borda escura + miolo claro) e sofa virado para a TV
  for (const [w, d, cor, y] of [[10.4, 7.6, 0x2f4858, 0.008], [9.6, 6.8, 0xd2cabb, 0.011]]) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: cor, flatShading: true }));
    t.rotation.x = -Math.PI / 2; t.position.set(0.6, y, 0.4); t.receiveShadow = true; t.name = 'tapete'; mob.add(t);
  }
  const sofa = criarSofa(); sofa.position.set(3.2, 0, 0.4); sofa.rotation.y = -Math.PI / 2; mob.add(sofa);

  // parede ripada de madeira (feature wall) com TV fina na frente, aparador e soundbar
  const ripado = grupo('ripado', mob);
  caixa(ripado, 0x6e5a45, 0.1, 4.7, 12.4, -LADO + 0.05, 0.8 + 2.35, 0.4);
  for (let k = 0; k < 38; k++) caixa(ripado, k % 2 ? 0xb8864d : 0xa8763f, 0.1, 4.7, 0.2, -LADO + 0.15, 0.8 + 2.35, -5.65 + k * 0.32 + 0.4);
  const tv = grupo('tv', mob);
  caixa(tv, 0x2f2a27, 1.0, 0.8, 6.8, -LADO + 0.55, 0.4, 0.4);
  caixa(tv, 0x8a6a45, 1.02, 0.06, 6.84, -LADO + 0.55, 0.83, 0.4);
  caixa(tv, 0x2a2f36, 0.1, 2.5, 4.6, -LADO + 0.3, 3.0, 0.4);
  caixa(tv, 0x0b2a3d, 0.02, 2.3, 4.4, -LADO + 0.365, 3.0, 0.4, { emissive: 0x1d6f9e, emissiveIntensity: 0.35 });
  const barra = caixa(tv, 0x1b1e22, 0.32, 0.26, 3.8, -LADO + 0.7, 0.86 + 0.13, 0.4); barra.name = 'soundbar';
  caixa(tv, 0x6fe0ff, 0.02, 0.05, 0.4, -LADO + 0.86, 0.86 + 0.13, 0.4, { emissive: 0x6fe0ff, emissiveIntensity: 1 });

  // luminaria smart (de piso), robo, cabide, painel de carga, planta
  const lum = grupo('luminaria', mob); lum.position.set(8.3, 0, 4.2);
  cilindro(lum, 0x2b3138, 0.5, 0.08, 0, 0.04, 0, 16);
  cilindro(lum, 0x2b3138, 0.05, 3.3, 0, 1.73, 0, 8);
  const globo = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfff1d2, emissive: 0xffc46b, emissiveIntensity: 1, flatShading: true }));
  globo.position.y = 3.75; lum.add(globo); lum.userData.globo = globo;
  sombra(lum, 1.3, 1.3, 0, 0);

  const robo = criarRobo(); robo.position.set(-3, 0, 4); mob.add(robo);

  const cab = grupo('cabide', mob); cab.position.set(8.6, 0, -4.8);
  cilindro(cab, 0x2b3138, 0.5, 0.08, 0, 0.04, 0, 14);
  cilindro(cab, 0x2b3138, 0.05, 3.8, 0, 1.94, 0, 8);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + 0.4, h = cilindro(cab, 0x2b3138, 0.035, 0.55, Math.cos(a) * 0.27, 3.7 - (i % 2) * 0.25, Math.sin(a) * 0.27, 6);
    h.rotation.set(Math.sin(a) * Math.PI / 2, 0, -Math.cos(a) * Math.PI / 2);
    const bola = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), mat(COR.aco)); bola.position.set(Math.cos(a) * 0.55, 3.7 - (i % 2) * 0.25, Math.sin(a) * 0.55); cab.add(bola);
  }
  const capacete = grupo('capacete-cabide', cab); capacete.position.set(Math.cos(0.4) * 0.5, 3.76, Math.sin(0.4) * 0.5);
  const domo = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf2c230)); domo.castShadow = true; capacete.add(domo);
  cilindro(capacete, 0xf2c230, 0.46, 0.05, 0, 0.025, 0, 14); caixa(capacete, 0xe8821e, 0.12, 0.3, 0.7, 0, 0.16, 0);
  const colete = grupo('colete-cabide', cab); colete.position.set(Math.cos(Math.PI + 0.4) * 0.5, 3.0, Math.sin(Math.PI + 0.4) * 0.5);
  caixa(colete, 0xf08a1c, 0.7, 1.0, 0.08, 0, 0, 0); for (const y of [-0.2, 0.2]) caixa(colete, 0xf4f4f0, 0.72, 0.1, 0.1, 0, y, 0);
  sombra(cab, 1.3, 1.3, 0, 0);

  const painel = criarPainel(); painel.position.set(6.2, 3.3, -FUNDO); mob.add(painel);
  desenharPainel(painel, 0);

  const planta = grupo('planta', mob); planta.position.set(-7.6, 0, 5.8);
  cilindro(planta, 0xe9e4da, 0.45, 0.8, 0, 0.4, 0, 10);
  const folhas = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), mat(COR.verde)); folhas.position.y = 1.5; folhas.castShadow = true; planta.add(folhas);
  cilindro(planta, 0x6b4a2e, 0.06, 0.6, 0, 0.9, 0, 6);
  sombra(planta, 1.4, 1.4, 0, 0);

  // mesa de centro com tigela de pipoca; pipocas que cairam no chao (easter egg do final)
  const mesa = grupo('mesa-centro', mob); mesa.position.set(-0.7, 0, 0.4);
  caixa(mesa, 0x8a6a45, 1.7, 0.1, 3.4, 0, 0.77, 0); caixa(mesa, 0x2b3138, 1.5, 0.05, 3.2, 0, 0.695, 0);
  for (const x of [-0.7, 0.7]) for (const z of [-1.5, 1.5]) caixa(mesa, 0x2b3138, 0.1, 0.65, 0.1, x, 0.325, z);
  sombra(mesa, 2.4, 4.0, 0, 0);
  const tigela = grupo('tigela-pipoca', mesa); tigela.position.set(0, 0.82, -0.3);
  const cuia = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.3, 14), mat(0xd94141)); cuia.position.y = 0.15; cuia.castShadow = true; tigela.add(cuia);
  for (let k = 0; k < 16; k++) { const r = 0.08 + hash(k, 2) * 0.05, a = hash(k, 3) * 6.28, d = hash(k, 4) * 0.28, p = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(k % 3 ? 0xfff0b0 : 0xf3d98a)); p.position.set(Math.cos(a) * d, 0.34 + hash(k, 5) * 0.12, Math.sin(a) * d); p.castShadow = true; tigela.add(p); }
  const pipocas = grupo('pipoca-chao', mob);
  [[1.4, 1.5], [1.1, 1.8], [0.5, 1.2]].forEach(([x, z], k) => { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), mat(0xfff0b0)); p.position.set(x, 0.1 + 0.013, z); p.castShadow = true; p.name = 'pipoca-' + k; pipocas.add(p); });
  // quadro na parede do fundo, ao lado do painel de carga
  const arte = grupo('arte', mob); arte.position.set(3.55, 3.1, -FUNDO + 0.05);
  caixa(arte, 0x1d2126, 2.2, 3.0, 0.1, 0, 0, 0); caixa(arte, 0xe9e0d0, 1.9, 2.7, 0.04, 0, 0, 0.05);
  caixa(arte, 0x2f8f93, 1.3, 1.3, 0.03, -0.1, 0.5, 0.08); caixa(arte, 0xe8821e, 0.9, 0.9, 0.03, 0.2, -0.6, 0.085); caixa(arte, 0x1d2126, 0.12, 2.0, 0.03, -0.55, -0.3, 0.09);
  // luz indireta no forro (cove) em volta da sala
  const cove = grupo('luz-indireta', mob), led = new THREE.MeshStandardMaterial({ color: 0xffe2b8, emissive: 0xffc98a, emissiveIntensity: 1.3, flatShading: true });
  for (const [w, d, x, z] of [[19, 0.3, 0, -FUNDO + 0.15], [0.3, 15, -LADO + 0.15, 0], [0.3, 15, LADO - 0.15, 0]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), led); m.position.set(x, SALA.H - 0.12, z); cove.add(m); }
  // luz quente de entardecer pela janela + mancha de sol no piso
  const luzJanela = new THREE.DirectionalLight(0xffb070, 1.4); luzJanela.position.set(jx - 6, 7, -FUNDO - 9); luzJanela.target.position.set(jx + 5, 0, 3); raiz.add(luzJanela, luzJanela.target);
  const mancha = new THREE.BufferGeometry(), M = [[J.x0, -FUNDO], [J.x1, -FUNDO], [J.x1 + 5, 0.8], [J.x0 + 5, 0.8]];
  mancha.setAttribute('position', new THREE.Float32BufferAttribute(M.flatMap(([x, z]) => [x, 0.02, z]), 3)); mancha.setIndex([0, 2, 1, 0, 3, 2]); mancha.computeVertexNormals();
  const solMancha = new THREE.Mesh(mancha, new THREE.MeshBasicMaterial({ color: 0xffa24a, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide })); solMancha.name = 'mancha-sol'; cascaSala.add(solMancha);

  const api = {
    group: raiz, piso, teto, sofa, mesa, tigela, tv, painel, robo, luminaria: lum, cabide: cab, planta, casca: cascaSala, mobilia: mob,
    dims: SALA, assentoY: sofa.userData.assentoY,
    ids: { sala: raiz, sofa, 'mesa-centro': mesa, 'tigela-pipoca': tigela, 'capacete-cabide': capacete, 'janela-cidade': paisagem, 'teto-sala': teto, 'painel-carga': painel, 'robo-aspirador': robo },
    /** sim: piso e paredes somem (a torre fornece piso e fachada). comParedes mantem as paredes (corte dentro da torre). */
    embutir(sim = true, { comParedes = false } = {}) { piso.visible = !sim; cascaSala.visible = !sim || comParedes; luzJanela.visible = !sim || comParedes; return api; },
    /** Funcao pura do tempo. p omitido = estado padrao (verde, teto inteiro, robo na ronda). */
    updateAt(t, p = {}) {
      const nivel = clamp01(p.painel ?? 0);
      desenharPainel(painel, nivel);
      const tr = clamp01(p.trinca ?? 0), vg = clamp01(p.vergar ?? 0);
      // verga: desloca vertices do forro (funcao dos vertices originais)
      const pos = teto.userData.laje.geometry.attributes.position, o = teto.userData.orig;
      for (let i = 0; i < pos.count; i++) pos.setY(i, o[i * 3 + 1] - vg * PROF_VERGA * sino(o[i * 3], o[i * 3 + 2]));
      pos.needsUpdate = true; teto.userData.laje.geometry.computeVertexNormals();
      const yAbaixo = (x, z) => SALA.H - 0.03 - vg * PROF_VERGA * sino(x, z);
      const segs = teto.userData.segs, n = segs.length;
      segs.forEach((m, i) => {
        const u = clamp01(tr * n - i), { a, b, len } = m.userData;
        m.visible = u > 0; m.scale.x = Math.max(u, 1e-3);
        const cx = a[0] + (b[0] - a[0]) * u / 2, cz = a[1] + (b[1] - a[1]) * u / 2;
        m.position.set(cx, yAbaixo(cx, cz), cz); m.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      });
      // lustre balanca (amortecido) a partir de t0; acompanha o forro
      const L = p.lustre; let ang = 0;
      if (L && t >= L.t0) ang = (L.amp ?? 0.18) * Math.exp(-(t - L.t0) * 1.4) * Math.sin(16 * (t - L.t0));
      teto.userData.pivo.rotation.z = ang; teto.userData.pivo.position.y = SALA.H - vg * PROF_VERGA * sino(0, 0);
      // luminaria smart
      lum.userData.globo.material.emissiveIntensity = 0.15 + 0.85 * clamp01(p.luminaria ?? 1);
      // robo: ronda padrao (elipse) ou trajeto linear de/para em [t0,t1]
      if (p.robo === false) robo.visible = false;
      else {
        robo.visible = true;
        let x, z, rot;
        if (p.robo && p.robo.de) {
          const u = suave(fase(t, p.robo.t0, p.robo.t1)), [dx, dz] = p.robo.de, [px, pz] = p.robo.para;
          x = dx + (px - dx) * u; z = dz + (pz - dz) * u; rot = Math.atan2(-(pz - dz), px - dx);
        } else { const w = 0.35 * t; x = -2 + 4.5 * Math.cos(w); z = 4.2 + 1.4 * Math.sin(w); rot = Math.atan2(-1.4 * Math.cos(w), -4.5 * Math.sin(w)); }
        robo.position.set(x, 0, z); robo.rotation.y = rot;
      }
    },
  };
  return api;
}
