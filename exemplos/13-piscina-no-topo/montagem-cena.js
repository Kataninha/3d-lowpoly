// Cena integrada do video 13 (piscina no topo), funcao pura de t absoluto (seek em qualquer ordem).
// Cenario (torre + sala + obra + raio-X) e mecanicas (palcos suspensos) ligados aos tempos de partitura.json.
// A camera vem so de camera.json (samples por keyframe); sem camera.json a cena usa uma vista fixa de conferencia.
import * as THREE from 'three';
import { samplePose } from './kit/camera/diretor.js';
import { criarZeDesmonte, MEDIDAS, sombraDeContato } from './kit/personagens/ze-desmonte/ze-desmonte-v3.js';
import * as moves from './kit/personagens/ze-desmonte/moves.js';
import { tremer } from './kit/efeitos/efeitos.js';
import { criarCenario } from './modelos/cenario/cenario.js';
import { CENAS } from './modelos/mecanicas/index.js';
import { criarSeta, setSeta, COR as CM, concretoOpaco, box as mbox, cyl as mcyl, smooth, clamp01, lerp, hash } from './modelos/mecanicas/base.js';

const lerJson = (f) => fetch(new URL(f, import.meta.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const [tempos, partitura, cameraData] = await Promise.all(['voz/tempos.json', 'partitura.json', 'camera.json'].map(lerJson));
if (!tempos || !partitura) throw new Error('voz/tempos.json e partitura.json sao obrigatorios');
const TK = partitura.takes;

// ---------- tempos da voz ----------
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const W = (n, palavra, k = 0) => {
  const m = tempos.palavras.filter((p) => p.frase === n && norm(p.palavra) === norm(palavra));
  if (!m[k]) throw new Error(`Palavra ausente: ${n} ${palavra} #${k}`);
  return m[k].inicio;
};
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const between = (t, a, b) => t >= a && t < b;
const pw = (pontos, t) => {                       // interpolacao linear por tramos; fora, fica no extremo
  if (t <= pontos[0][0]) return pontos[0][1];
  for (let i = 1; i < pontos.length; i++) if (t <= pontos[i][0]) {
    const [a, la] = pontos[i - 1], [b, lb] = pontos[i];
    return la + (lb - la) * (t - a) / (b - a);
  }
  return pontos.at(-1)[1];
};
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- renderer e cena ----------
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(canvas.width, canvas.height, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, canvas.width / canvas.height, 0.1, 1200);
const cen = criarCenario(scene);
const sol = cen.ambiente.sol;
const SALA_Y = cen.sala.group.position.y;          // 66,5: piso da sala dentro da torre
const ROOF_Y = 72.5;                               // topo da laje de cobertura (base da piscina)


// ---------- mecanicas no mundo (lote da torre e topo da torre em obra) ----------
// Solo/estaca/bloco/viguinha/pilar/viga/balanca: no canteiro, na frente da torre. Laje/parede/manta/cano/bomba: no topo da torre em obra.
// Os planos de corte das mecanicas sao locais ao objeto: aqui sao deslocados junto com o grupo (c_mundo = c_local - n . deslocamento).
const ORDEM = ['balanca', 'terreno', 'estaca', 'fundacao', 'viguinha', 'pilar', 'viga', 'laje', 'parede-sem', 'parede-armada', 'manta', 'cano', 'circulacao'];
const TOPO_OBRA = 72.0;                           // topo dos pilares do 12o andar (piso da cobertura = 72,5)
const ORIGEM = { balanca: [4, 0.12, 15], terreno: [0, 6.12, 14], estaca: [0, 6.12, 14], fundacao: [0, 6.12, 14], viguinha: [0, 0.12, 14], pilar: [0, 0.12, 14], viga: [0, 0.12, 14] };
const ESC = { balanca: 0.85 };
const VIS = {                                      // janela em que cada mecanica existe no mundo
  balanca: [15.5, 22.8], terreno: [35.3, 41.9], estaca: [41.7, 47.1], fundacao: [46.9, 53.6], viguinha: [53.3, 66.0], pilar: [59.8, 66.0], viga: [66.0, 68.1],
  laje: [69.0, 79.6], 'parede-sem': [79.3, 88.3], 'parede-armada': [88.1, 92.7], manta: [99.4, 102.8], cano: [102.4, 105.2], circulacao: [104.8, 109.8],
};
const PALCO = {};
for (const nome of ORDEM) {
  const c = CENAS[nome], obj = c.criar(), pai = new THREE.Group();
  pai.name = 'mec-' + nome;
  const o = ORIGEM[nome] ?? (['manta', 'cano', 'circulacao'].includes(nome) ? [0, TOPO_OBRA - (c.pisoTopo ?? 0) + 0.55, 4.0] : [0, TOPO_OBRA - (c.pisoTopo ?? 0), 0]);
  pai.position.set(...o); pai.scale.setScalar(ESC[nome] ?? 1);
  pai.add(obj.group); scene.add(pai);
  const planos = new Map();
  obj.group.traverse((m) => { if (m.isMesh) for (const mt of [].concat(m.material)) for (const pl of mt.clippingPlanes || []) planos.set(pl, pl.constant); });
  PALCO[nome] = { c, obj, g: pai, o: new THREE.Vector3(...o), planos, piso: 0 };
}
// Take 4: a camera olha ao longo de +x; gira a balanca 90 graus para o mostrador (normal local +z) ficar de frente e a plataforma correr na horizontal do quadro.
PALCO.balanca.g.rotation.y = -Math.PI / 2;
// Leitura do aco: barras da parede armada 2,4x mais grossas; tampa de corte do pilar translucida (gaiola visivel dentro do concreto)
PALCO['parede-armada'].obj.group.traverse((m) => { if (m.isMesh && m.geometry.type === 'CylinderGeometry' && m.material.color.getHex() === CM.aco) m.scale.set(2.4, 1, 2.4); });
{ const tp = PALCO.pilar.obj.tampa; tp.material = tp.material.clone(); tp.material.transparent = true; tp.material.opacity = 0.32; tp.material.depthWrite = false; }
// Janela de cada mecanica: pontos [t do video, t local]; amarra a animacao as palavras da voz.
const JAN = {
  balanca: [[15.93, 0], [22.47, 8.0]],
  terreno: [[35.3, 0], [37.5, 2.4]],
  estaca: [[41.82, 0], [47.0, 4.4]],
  fundacao: [[47.0, 0], [53.45, 9.6]],
  viguinha: [[53.45, 0], [59.97, 3.9]],
  pilar: [[59.97, 0], [65.2, 6.8]],
  viga: [[66.0, 0], [68.0, 3.4]],
  laje: [[69.14, 0], [79.46, 7.6]],
  'parede-sem': [[79.46, 0], [88.19, 6.8]],
  'parede-armada': [[88.19, 0], [92.63, 6.8]],
  manta: [[99.54, 0], [102.6, 4.0]],
  cano: [[102.6, 0], [105.0, 4.5]],
  circulacao: [[105.0, 0], [109.64, 10.2]],
};
const pos = (nome, x, y, z) => V3(x, PALCO[nome].o.y + y, z + PALCO[nome].o.z);   // ponto local da mecanica em coordenadas do mundo

// ---------- adereços do cenario ----------
// Setas de carga na torre (take 1 e 6)
const setasTorre = new THREE.Group(); setasTorre.name = 'caminho-carga-torre'; scene.add(setasTorre);
const setaGrande = criarSeta(CM.vermelho, 0.9); setaGrande.rotation.z = -Math.PI / 2; setaGrande.scale.setScalar(1);
setasTorre.add(setaGrande);
const setasPiscina = [-2.6, 0, 2.6].map((x) => { const s = criarSeta(CM.vermelho, 0.35); s.rotation.z = -Math.PI / 2; s.position.set(x, ROOF_Y + 6.2, 4); scene.add(s); return s; });
// agua que invade a sala (take 2) e boia
const aguaSala = new THREE.Mesh(new THREE.BoxGeometry(18.4, 1, 14.4), new THREE.MeshStandardMaterial({ color: 0x3d8fe0, transparent: true, opacity: 0.55, roughness: 0.2, flatShading: true, depthWrite: false }));
aguaSala.name = 'agua-sala'; aguaSala.position.set(0, SALA_Y, 0); scene.add(aguaSala);
const gotasSala = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3d8fe0, flatShading: true })); m.scale.y = 1.7; scene.add(m); return m; });
// pipocas do take 1 e pote no colo (pote com pipocas filhas, que pulam no CREC)
const pipocas = [0].map(() => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: 0xfff0b0, flatShading: true })); scene.add(m); return m; });
const poteColo = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.34, 0.4, 14), new THREE.MeshStandardMaterial({ color: 0xd94141, flatShading: true }));
scene.add(poteColo);
const potePipocas = Array.from({ length: 9 }, (_, k) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11 + 0.04 * hash(k, 2), 0), new THREE.MeshStandardMaterial({ color: k % 3 ? 0xfff0b0 : 0xf3d98a, flatShading: true }));
  const a = hash(k, 3) * 6.28, d = 0.08 + 0.28 * hash(k, 4); m.userData.base = [Math.cos(a) * d, 0.2 + 0.07 * hash(k, 5), Math.sin(a) * d]; poteColo.add(m); return m; });
// objetos novos da abertura (criados na carga; so mudam de posicao por t)
const matAmarelo = new THREE.MeshStandardMaterial({ color: 0xe0b020, flatShading: true });
function criarPatinho(esc) {                          // patinho de borracha low poly; bico para +x
  const g = new THREE.Group(), preto = new THREE.MeshStandardMaterial({ color: 0x1d1b2a, flatShading: true });
  const corpo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), matAmarelo); corpo.scale.set(1.15, 0.8, 0.9); corpo.position.y = 0.25; g.add(corpo);
  const rabo = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 5), matAmarelo); rabo.rotation.z = Math.PI / 2 + 0.5; rabo.position.set(-0.62, 0.45, 0); g.add(rabo);
  const cab = new THREE.Mesh(new THREE.IcosahedronGeometry(0.31, 1), matAmarelo); cab.position.set(0.36, 0.78, 0); g.add(cab);
  const bico = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.24), new THREE.MeshStandardMaterial({ color: 0xff7a1a, flatShading: true })); bico.position.set(0.68, 0.72, 0); g.add(bico);
  for (const z of [-1, 1]) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), preto); o.position.set(0.55, 0.88, z * 0.15); g.add(o); }
  g.scale.setScalar(esc); g.visible = false; scene.add(g); return g;
}
const patinhoPiscina = criarPatinho(1.1), patinhoSala = criarPatinho(0.7);
const boiaZe = new THREE.Group();                       // boia amarela na cintura (filha do tronco do Ze)
{ const b = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.2, 8, 16), matAmarelo); b.rotation.x = Math.PI / 2; b.scale.set(1.1, 0.85, 1); boiaZe.add(b);
  const listra = new THREE.MeshStandardMaterial({ color: 0xe0443e, flatShading: true });
  for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.26), listra); const a = k * Math.PI / 2 + Math.PI / 4; f.position.set(Math.cos(a) * 0.62 * 1.1, 0, Math.sin(a) * 0.62 * 0.85); f.rotation.y = -a; boiaZe.add(f); }
  boiaZe.position.y = 0.45; boiaZe.visible = false; }
const oculosMerg = new THREE.Group();                   // oculos de mergulho (filho da cabeca do Ze)
{ const pr = new THREE.MeshStandardMaterial({ color: 0x1d1b2a, flatShading: true }), lente = new THREE.MeshStandardMaterial({ color: 0x7ff3ff, flatShading: true, transparent: true, opacity: 0.75 });
  for (const x of [-0.19, 0.19]) { const aro = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.045, 6, 10), pr); aro.position.set(x, 0, 0.5); oculosMerg.add(aro);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 10), lente); l.rotation.x = Math.PI / 2; l.position.set(x, 0, 0.5); oculosMerg.add(l); }
  const fita = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.035, 5, 14), pr); fita.rotation.x = Math.PI / 2; fita.scale.set(1, 0.9, 1); fita.position.y = 0.04; oculosMerg.add(fita);
  oculosMerg.position.y = 0.46; oculosMerg.visible = false; }   // origem no centro dos olhos: o pop de escala nasce dentro da cabeca
const bocaGrito = new THREE.Group();                    // boca bem aberta (grito/pegar pipoca), filha da cabeca
{ const borda = new THREE.Mesh(new THREE.CircleGeometry(0.17, 16), new THREE.MeshBasicMaterial({ color: 0x1d1b2a })), fundo = new THREE.Mesh(new THREE.CircleGeometry(0.145, 16), new THREE.MeshBasicMaterial({ color: 0x5a1f22 })),
    lingua = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xff8f8f }));
  fundo.position.z = 0.003; lingua.position.set(0, -0.09, 0.006); bocaGrito.add(borda, fundo, lingua); bocaGrito.position.set(0, 0.22, 0.46); bocaGrito.visible = false; }
const poeira = Array.from({ length: 44 }, (_, i) => {   // lascas de poeira do teto: 30 pela sala, 14 perto da lente do plano B
  const perto = i >= 30, m = new THREE.Mesh(new THREE.TetrahedronGeometry(perto ? 0.1 : 0.06, 0), new THREE.MeshBasicMaterial({ color: 0xe8e2d6, transparent: true, opacity: 0.85 }));
  m.userData = perto ? { t0: 2.91 + 0.4 * hash(i, 1), x: -4.2 + 2.6 * hash(i, 2), z: 2.4 + 2.0 * hash(i, 3), s: 1 }
    : { t0: 2.3 + 1.6 * hash(i, 1), x: -3.5 + 8.5 * hash(i, 2), z: -1.5 + 5.5 * hash(i, 3), s: 0 };
  scene.add(m); return m; });
const RACH = [];                                          // rachadura: ramos em zigue-zague, ramificados a partir do centro do forro
{ const matR = new THREE.MeshBasicMaterial({ color: 0x14181c });
  const ramo = (x, z, ang, passos, d0, larg, prof, sem) => {
    let d = d0;
    for (let k = 0; k < passos; k++) {
      const h = hash(sem + k * 7, 11 + prof), a = ang + (k % 2 ? 1 : -1) * (0.3 + 0.45 * h), L = 0.7 + 0.7 * hash(sem + k * 3, 5 + prof);
      const nx = x + Math.cos(a) * L, nz = z + Math.sin(a) * L, m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, larg), matR);
      m.visible = false; scene.add(m); RACH.push({ m, ax: x, az: z, bx: nx, bz: nz, d0: d, len: L });
      if (prof < 2 && (k === 1 || k === 3)) ramo(nx, nz, a + (hash(sem + k, 9) > 0.5 ? 1 : -1) * (0.7 + 0.5 * hash(sem + k, 2)), 3, d + L, larg * 0.6, prof + 1, sem + 100 * (k + 1));
      x = nx; z = nz; d += L;
    }
  };
  for (let i = 0; i < 7; i++) ramo(0.9, -0.3, i * 2 * Math.PI / 7 + 0.4 * (hash(i, 1) - 0.5), 5, 0, 0.12, 0, 10 * (i + 1)); }
const lascasRach = Array.from({ length: 16 }, (_, i) => { const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.1 + 0.07 * hash(i, 4), 0), new THREE.MeshStandardMaterial({ color: 0xb9b2a6, flatShading: true })); const q = RACH[Math.floor(hash(i, 5) * RACH.length)];
  m.userData = { x: (q.ax + q.bx) / 2, z: (q.az + q.bz) / 2, t0: 2.909 + 0.1 + 0.45 * hash(i, 6) }; scene.add(m); return m; });
const gotaPote = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3d8fe0, flatShading: true })); gotaPote.scale.y = 1.6; scene.add(gotaPote);
const marolaPote = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0x3d8fe0, flatShading: true })); poteColo.add(marolaPote);
const pipocasAgua = Array.from({ length: 10 }, (_, k) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), new THREE.MeshStandardMaterial({ color: k % 3 ? 0xfff0b0 : 0xf3d98a, flatShading: true })); scene.add(m); return m; });
const tremorCam = new THREE.Object3D();                  // dummy: o kit tremer() age nele e a camera soma o deslocamento
// camada de concreto sobre a laje de cobertura (take 5): quatro faixas que crescem
const faixasConcreto = Array.from({ length: 4 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 1.6), concretoOpaco()); m.castShadow = m.receiveShadow = true; m.position.set(0, ROOF_Y + 0.25, -6.4 + i * 1.8); scene.add(m); return m; });
const camadaConcreto = new THREE.Group(); camadaConcreto.name = 'camada-concreto'; faixasConcreto.forEach((m) => camadaConcreto.add(m)); scene.add(camadaConcreto);
// balanca pequena no topo (take 5): segunda instancia do mesmo modelo
const balancaTopo = CENAS.balanca.criar(); balancaTopo.group.scale.setScalar(0.3); balancaTopo.group.position.set(-2.0, ROOF_Y, -3.4);
const balancaTopoPai = new THREE.Group(); balancaTopoPai.add(balancaTopo.group); scene.add(balancaTopoPai);
// forma de madeira sobre a laje do topo (takes 11-13, obra): tabuas alternadas, tira a laje lisa do quadro
const formaTopo = new THREE.Group(); formaTopo.name = 'forma-topo'; scene.add(formaTopo);
for (let k = 0, z = -7.6; z < 7.6; k++, z += 0.95) { const m = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.1, 0.9), new THREE.MeshStandardMaterial({ color: k % 2 ? 0xb8864d : 0xc4955a, flatShading: true })); m.position.set(0, 72.05, z + 0.45); m.receiveShadow = true; formaTopo.add(m); }
// fantasma do predio que afunda (take 7), registro da piscina (take 16)
const fantasma = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.2, 2.2), new THREE.MeshStandardMaterial({ color: 0x8fb7d9, transparent: true, opacity: 0.45, flatShading: true, depthWrite: false }));
PALCO.terreno.g.add(fantasma);
const registro = new THREE.Group(); registro.position.set(-4.0, ROOF_Y + 3.0, 6.75); scene.add(registro);   // sobre a parede frontal da piscina (topo = 74,5)
{ const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.0, 8), new THREE.MeshStandardMaterial({ color: 0x6f7c86, flatShading: true })); haste.position.set(0, 0, 0); registro.add(haste); }
const volante = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 12), new THREE.MeshStandardMaterial({ color: 0xe0443e, flatShading: true }));
volante.position.set(0, 1.05, 0); volante.rotation.x = Math.PI / 2; registro.add(volante);
// caminho das cargas na torre inteira em raio-X (take 17): setas por peca, na frente da fachada
const caminho17 = new THREE.Group(); caminho17.name = 'caminho-carga'; scene.add(caminho17);
const SETAS17 = [  // [peca, x, topo y, comprimento, espessura]
  ['agua', 0, 79.2, 4.4, 0.9], ['fundo', 0, 74.4, 1.9, 0.9], ['laje', 0, 72.4, 1.7, 0.9], ['vigas', -5, 70.4, 2.2, 0.8], ['vigas', 5, 70.4, 2.2, 0.8],
  ['pilares', -9.6, 66, 50, 1.0], ['pilares', 9.6, 66, 50, 1.0], ['pilares', -3.2, 66, 50, 0.8], ['pilares', 3.2, 66, 50, 0.8],
  ['fundacoes', -9.6, 12, 11, 1.0], ['fundacoes', 9.6, 12, 11, 1.0], ['fundacoes', -3.2, 12, 11, 0.8], ['fundacoes', 3.2, 12, 11, 0.8],
  ['terreno', -9.6, 1.4, 1.4, 1.0], ['terreno', 0, 1.4, 1.4, 1.0], ['terreno', 9.6, 1.4, 1.4, 1.0],
].map(([peca, x, y, L, esp]) => { const g = criarSeta(CM.vermelho, esp); g.rotation.z = -Math.PI / 2; g.position.set(x, y, 9.6); caminho17.add(g); return { g, peca, x, y, L, t0: 0 }; });
const T17 = { agua: W(16, 'água'), fundo: W(16, 'fundo'), laje: W(16, 'laje'), vigas: W(16, 'vigas'), pilares: W(16, 'pilares'), fundacoes: W(16, 'fundações'), terreno: W(16, 'terreno') };
SETAS17.forEach((a) => { a.t0 = T17[a.peca]; });
// fissura e gotas no take 14 (corte vertical piscina/sala)
const fissura = new THREE.Group(); fissura.name = 'fissura'; scene.add(fissura);
const FIS_X = -3.3, FIS_Z = 3.4;
const segsFis = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.12), new THREE.MeshStandardMaterial({ color: 0x1d2126, flatShading: true })); fissura.add(m); return m; });
const gotasFis = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3d8fe0, flatShading: true })); scene.add(m); return m; });
const guardaChuva = new THREE.Group(); scene.add(guardaChuva);
{ const mat = new THREE.MeshStandardMaterial({ color: 0xe0443e, flatShading: true, side: THREE.DoubleSide });
  const cupula = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.7, 10, 1, true), mat); cupula.position.y = 1.3; guardaChuva.add(cupula);
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0x2b3138 })); haste.position.y = 0.55; guardaChuva.add(haste); }

// ---------- Ze: duas instancias (casa na sala, oficina na obra) ----------
function criarAtor(figurino) {
  const ze = criarZeDesmonte({ figurino });
  const caixa = new THREE.Box3().setFromObject(ze.raiz);
  ze.raiz.scale.setScalar(3.5 / (caixa.max.y - caixa.min.y));   // 1,75 m = 3,5 u
  scene.add(ze.raiz);
  const sombra = sombraDeContato(0.8); scene.add(sombra);
  return { ze, sombra };
}
const casa = criarAtor('casa'), obra = criarAtor('oficina');
casa.ze.juntas.tronco.add(boiaZe); casa.ze.juntas.cabeca.add(oculosMerg, bocaGrito);
const colete = new THREE.Group();
{ const m = new THREE.MeshStandardMaterial({ color: 0xf08a1c, flatShading: true, side: THREE.DoubleSide });
  const c = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.9, 20, 1, true), m); c.scale.set(0.66, 1, 0.46); colete.add(c);
  for (const y of [-0.12, 0.2]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.09, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xf4f4f0, flatShading: true, side: THREE.DoubleSide })); f.position.y = y; f.scale.set(0.675, 1, 0.468); colete.add(f); }
  colete.position.y = 0.98; obra.ze.juntas.tronco.add(colete); }
const prancheta = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.95, 0.07), new THREE.MeshStandardMaterial({ color: 0xb8864d, flatShading: true }));
obra.ze.maos.E.add(prancheta); prancheta.position.set(0, -0.1, 0.25); prancheta.visible = false;
const balde = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0x6f7c86, flatShading: true }));
obra.ze.maos.D.add(balde); balde.position.set(0, -0.5, 0.2); balde.visible = false;
const guardaChuvaMao = guardaChuva;               // reposicionado por take

// Brilho especular da agua: envMap de ceu (sol + horizonte) so nos materiais de agua; a cor dos materiais nao muda.
const brilhoAgua = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#6fa8e0'); gr.addColorStop(0.48, '#f3f8ff'); gr.addColorStop(0.52, '#c8d8e6'); gr.addColorStop(1, '#2b5f7a');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  const sol = g.createRadialGradient(150, 46, 1, 150, 46, 22); sol.addColorStop(0, '#ffffff'); sol.addColorStop(0.35, 'rgba(255,250,230,0.95)'); sol.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = sol; g.fillRect(0, 0, 256, 128);
  const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
  const mats = new Set();
  const pegar = (o) => o?.traverse?.((m) => { if (m.isMesh && /^agua|^lamina/.test(m.name)) [].concat(m.material).forEach((x) => mats.add(x)); });
  for (const nome of ORDEM) pegar(PALCO[nome].obj.group);
  pegar(cen.torre.piscina); pegar(aguaSala);
  for (const m of mats) { m.envMap = tex; m.envMapIntensity = 0.9; m.needsUpdate = true; }
  return mats.size;
})();

// ---------- destaques (brilho amarelo na propria peca, na palavra da partitura) ----------
const OBJ = {
  ...cen.ids, 'caminho-carga': caminho17, 'caminho-carga-torre': setasTorre,
  balanca: PALCO.balanca.obj.group, 'balanca-topo': balancaTopoPai, 'camada-concreto': camadaConcreto,
  estaca: PALCO.estaca.obj.estaca, fundacao: PALCO.fundacao.obj.group, bloco: PALCO.fundacao.obj.bloco?.group ?? PALCO.fundacao.obj.group,
  viguinha: PALCO.viguinha.obj.simples.group, 'viguinha-armada': PALCO.viguinha.obj.armada.group, pilar: PALCO.pilar.obj.group, viga: PALCO.viga.obj.group,
  laje: PALCO.laje.obj.comum.group, 'laje-reforcada': PALCO.laje.obj.reforcada.group,
  'parede-piscina': PALCO['parede-sem'].obj.group, 'parede-armada': PALCO['parede-armada'].obj.group, agua: PALCO['parede-sem'].obj.agua.group,
  manta: PALCO.manta.obj.group, cano: PALCO.cano.obj.group, bomba: PALCO.circulacao.obj.bomba.group, filtro: PALCO.circulacao.obj.filtroRaiz,
  circulacao: PALCO.circulacao.obj.group, fissura, 'terreno-palco': PALCO.terreno.obj.group, 'terreno-estaca': PALCO.estaca.obj.terreno.group,
  registro, 'terreno-obra': cen.ids.terreno,
};

// Brilho amarelo transitorio na PROPRIA peca (so emissivo + 25% de cor), na palavra que a nomeia. Nao pinta a peca de amarelo solido.
function criarBrilhos(tempos) {
  const regs = [], caches = new Map();
  const norm = (x) => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const amarelo = new THREE.Color(0xf2c230);
  function destacar(pecas, frase, palavra) {
    const w = tempos.palavras.filter((x) => x.frase === frase && norm(x.palavra) === norm(palavra))[0];
    if (!w) throw new Error(`Palavra ausente: ${frase} ${palavra}`);
    const ev = { t0: w.inicio, dur: Math.min(1.1, Math.max(0.7, w.fim - w.inicio)) };
    for (const p of [].concat(pecas)) {
      if (!p) throw new Error(`Peca ausente no destaque: ${frase} ${palavra}`);
      let r = regs.find((x) => x.p === p);
      if (!r) { r = { p, ms: [], ev: [] }; p.traverse((o) => { if (o.isMesh && o.material && !o.userData.destaqueAuxiliar) r.ms.push({ o, orig: o.material }); }); regs.push(r); }
      r.ev.push(ev);
    }
  }
  function atualizar(t) {
    for (const r of regs) {
      let k = 0;
      for (const e of r.ev) { const u = t - e.t0; if (u > 0 && u < e.dur) k = Math.max(k, Math.min(1, u / 0.1, (e.dur - u) / 0.15) * Math.sin(Math.PI * 2 * u / e.dur) ** 2); }
      for (const { o, orig } of r.ms) {
        if (k <= 0) { o.material = orig; continue; }
        const lista = [].concat(orig).map((m) => { let c = caches.get(m); if (!c) { c = m.clone(); caches.set(m, c); } c.copy(m); c.clippingPlanes = m.clippingPlanes; if (c.emissive) { c.emissive.copy(amarelo); c.emissiveIntensity = 0.55 * k; } c.color.lerp(amarelo, 0.25 * k); return c; });
        o.material = Array.isArray(orig) ? lista : lista[0];
      }
    }
  }
  return { destacar, atualizar };
}
const destaques = criarBrilhos(tempos);
// manta: o brilho vai so nas faixas verdes e no rolo (o tanque de concreto nao muda de cor)
const DEST = { ...OBJ, manta: [PALCO.manta.obj.faixas, PALCO.manta.obj.rolo], fundacao: [PALCO.fundacao.obj.bloco.group, ...PALCO.fundacao.obj.estacas] };
for (const take of TK) for (const [chave, palavra, frase] of take.destaque || []) {
  if (!DEST[chave]) throw new Error('Alvo de destaque ausente: ' + chave);
  destaques.destacar(DEST[chave], frase, palavra);
}

// ---------- Ze: ferramentas ----------
const ESCALA_ZE = { casa: casa.ze.raiz.scale.x, obra: obra.ze.raiz.scale.x };
const CAPACETE_POS = casa.ze.acessorios.capacete.position.clone();
const coleteCasa = colete.clone(true); casa.ze.juntas.tronco.add(coleteCasa); coleteCasa.visible = false;
const nuvem = new THREE.Group(); scene.add(nuvem);        // poeira low poly curta (12 lascas pequenas)
for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: 0xf4f4f0, flatShading: true, transparent: true, opacity: 0.6 })); const a = i / 12 * Math.PI * 2; m.userData.dir = [Math.cos(a), 0.15 + 0.85 * ((i * 53) % 12) / 12, Math.sin(a)]; nuvem.add(m); }
const reguaMao = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.04), new THREE.MeshStandardMaterial({ color: 0xf5f5f0, flatShading: true }));
obra.ze.maos.E.add(reguaMao); reguaMao.visible = false;
const chaveMao = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), new THREE.MeshStandardMaterial({ color: 0xe8821e, flatShading: true }));
obra.ze.maos.D.add(chaveMao); chaveMao.position.set(0, -0.35, 0.1); chaveMao.visible = false;
let CT = null;                                      // contato do quadro: { take, mao, ator, alvo }
const J = (ze) => ze.juntas;
const baseDe = (x, y, z, rot) => ({ posicao: V3(x, y, z), rotacao: new THREE.Euler(0, rot, 0) });
function idle(ator, base, t, emocao = 'neutro') {
  moves.M08_idle(ator.ze, t, { base });
  ator.ze.emocao(emocao);
  ator.ze.atualizar(t, { respirar: false });
}
function esconder(ator) { ator.ze.raiz.visible = false; ator.sombra.visible = false; }
function mostrar(ator, chaoY) {
  ator.ze.raiz.visible = true; ator.sombra.visible = true;
  ator.sombra.position.set(ator.ze.raiz.position.x, chaoY + 0.03, ator.ze.raiz.position.z);
}
function safeReach(ze, mao, alvo, t, opts) {        // alvo fora do alcance: aproxima do ombro ate o braco chegar
  ze.raiz.updateWorldMatrix(true, true);
  const ombro = ze.juntas['ombro' + mao].getWorldPosition(new THREE.Vector3());
  for (const f of [1, 1.08, 1.18, 1.3, 0.94, 0.88, 0.82, 0.76, 0.7, 0.62, 0.54, 0.46]) {
    try { return moves.alcancar(ze, mao, ombro.clone().lerp(alvo, f), t, opts); } catch (e) { /* tenta mais perto */ }
  }
  return null;
}
function agachar(ator, k, chaoY) {                  // dobra pernas e assenta a sola no chao (como o ancorar dos moves)
  const j = J(ator.ze);
  j.pernaE.rotation.x = j.pernaD.rotation.x = -0.7 * k; j.joelhoE.rotation.x = j.joelhoD.rotation.x = 1.4 * k; j.tronco.rotation.x = 0.25 * k;
  ator.ze.raiz.updateWorldMatrix(true, true);
  const sola = Math.min(new THREE.Box3().setFromObject(j.pernaE).min.y, new THREE.Box3().setFromObject(j.pernaD).min.y);
  ator.ze.raiz.position.y += chaoY - sola;
}
// Coloca o Ze de frente (rot) para o alvo, com o ombro 'lado' a 'dist' na horizontal; k = agachamento.
function ficar(ator, t, rot, alvo, lado, dist, chaoY, emocao = 'neutro', k = 0) {
  const f = V3(Math.sin(rot), 0, Math.cos(rot));
  const base = baseDe(alvo.x - f.x * dist, chaoY, alvo.z - f.z * dist, rot);
  for (let i = 0; i < 2; i++) {
    idle(ator, base, t, emocao); if (k) agachar(ator, k, chaoY);
    ator.ze.raiz.updateWorldMatrix(true, true);
    const o = ator.ze.juntas['ombro' + lado].getWorldPosition(new THREE.Vector3());
    base.posicao.x += alvo.x - f.x * dist - o.x; base.posicao.z += alvo.z - f.z * dist - o.z;
  }
  idle(ator, base, t, emocao); if (k) agachar(ator, k, chaoY);
  return base;
}
function pegar(ator, mao, alvo, t, t0, dur = 0.4) { CT = { take: null, mao, ator, alvo: alvo.clone() }; return safeReach(ator.ze, mao, alvo, t, { t0, t1: t0 + dur }); }
function cabecaMundo(ze) { ze.raiz.updateWorldMatrix(true, true); return ze.juntas.cabeca.getWorldPosition(new THREE.Vector3()); }
function sentar(ator, k, base, ergue = 0) {
  const j = J(ator.ze), kk = smooth(k);
  j.pernaE.rotation.x = j.pernaD.rotation.x = -1.25 * kk - 0.5 * ergue;
  j.joelhoE.rotation.x = j.joelhoD.rotation.x = 1.25 * kk + 0.5 * ergue;
  ator.ze.raiz.position.y = base.posicao.y - 0.47 * kk;
}

// ---------- estado do mundo (cenario) por t ----------
const T = {
  estalo: W(0, 'estala'), piscina1: W(0, 'PISCINA'), voltar: W(5, 'voltar'), existir: W(5, 'existir'),
  encher: W(15, 'encher'), cargas: W(16, 'cargas'), fimRetro: 36.5, subida0: 68.1, subida1: 68.9, veste1: 69.2,
  e: W(0, 'e'), pipoca: W(0, 'pipoca'), lembra: W(0, 'lembra'), detalhe: W(0, 'detalhe'), tem: W(0, 'TEM'), e2: W(1, 'E'), preparado: W(1, 'preparado'), sala: W(1, 'sala'), funda: W(1, 'funda'),
};
function alturaTorre(t, n) {
  if (t < T.voltar) return 12;
  if (t < T.fimRetro) return 12 * (1 - smooth(ramp(t, T.voltar, T.fimRetro)));
  if (t < T.subida0) return 0;
  const sobe = 11.999 * smooth(ramp(t, T.subida0, T.subida1));
  return (n === 14 || n === 15 || t >= 109.64) && t >= T.subida1 ? 12 : sobe;       // obra sem a cobertura (11,999) ate "pronto"; cobertura completa no corte e no fim
}
function mundo(t, n) {
  const hora = t < T.voltar ? 1 : t < T.fimRetro ? lerp(1, 0.08, smooth(ramp(t, T.voltar, T.fimRetro))) : lerp(0.08, 1, ramp(t, T.fimRetro, 112));
  const alt = alturaTorre(t, n);
  const retro = t >= T.fimRetro;
  const p = {
    hora,
    torre: { altura: alt, padrao: retro ? 'cru' : 'vestido', vestir: t >= T.fimRetro ? [{ de: 0, ate: 7, t0: 68.5, dur: 0.6 }, { de: 8, ate: 11, t0: 108.4, dur: 1.1 }] : [],
      led: { ate: t < T.voltar ? 12 : t < T.fimRetro ? Math.round(12 * (1 - ramp(t, T.voltar, T.fimRetro))) : (t < 69.2 ? 0 : 12), k: 1, habitado: true },
      piscina: { nivel: t < 34.4 ? 1 : (t >= 92.6 && t < 99.5) ? 1 : t < T.encher - 0.4 ? 0 : t < 113 ? ramp(t, T.encher - 0.4, 112.4) : 1, led: t < 34.4 ? 1 : ramp(t, 111.6, 112.8) },
      elevador: t >= T.subida0 && t < 69.2 ? 72 * ramp(t, T.subida0, T.subida1) : 0 },
    sala: { painel: 0, luminaria: 1 },
    obra: { terrenoPronto: t < T.voltar ? 1 : t < T.fimRetro ? 1 - smooth(ramp(t, T.voltar, T.fimRetro)) : t < 92.6 ? 0 : 1, luzesCidade: hora > 0.5 ? 0.7 : 0.15,
      gancho: { carrinho: 24 + 4 * Math.sin(t * 0.7), altura: t >= T.subida0 && t < 69.2 ? 10 + 60 * ramp(t, T.subida0, T.subida1) : 10, giro: 0.4 + 0.2 * Math.sin(t * 0.25) },
      elevadorY: t >= T.subida0 && t < 69.2 ? 72 * ramp(t, T.subida0, T.subida1) : 0 },
    raioX: null, salaAberta: false, corte: null,
  };
  if (n === 1 || n === 2) {
    p.salaAberta = true;
    p.sala = { painel: t < T.estalo ? 0 : (t < T.estalo + 0.7 ? (Math.floor((t - T.estalo) / 0.14) % 2) : 1), luminaria: 1,
      trinca: ramp(t, T.estalo, T.estalo + 0.5), vergar: n === 1 ? 0.18 * ramp(t, T.estalo + 1, 7.27) : 0.18 + 0.67 * smooth(ramp(t, 7.27, 10.8)),
      lustre: t >= T.estalo ? { t0: T.estalo, amp: 0.4 } : undefined, robo: false };
    p.raioX = { t0: T.tem, dur: 12.07 - T.tem - 0.1, opacidade: 0.25, varrer: 0.5 };
  } else if (n === 5) {
    p.salaAberta = true;
    p.sala = { painel: 0.35 + 0.5 * smooth(ramp(t, 25.0, 27.8)), luminaria: 1, vergar: 0.1 + 0.2 * smooth(ramp(t, 25.0, 28)), robo: false };
  } else if (n === 14) {
    p.salaAberta = true; p.corte = { plano: new THREE.Plane(new THREE.Vector3(0, 0, -1), 4.0) };
    p.sala = { painel: 0.2, luminaria: 1, vergar: 0, robo: false };
  } else if (n === 17) {
    p.raioX = { t0: 113.9, dur: 13.2, opacidade: 0.25, varrer: 0.6 };
    p.sala = { painel: smooth(ramp(t, 113.9, 118)) * (1 - smooth(ramp(t, 122, 126))), luminaria: 1, robo: false };
  } else if (n === 18) {
    p.raioX = { t0: 127.4, dur: 2.9, opacidade: 0.8, varrer: 1.4 };
  } else if (n === 19) {
    p.salaAberta = true;
    p.sala = { painel: 0, luminaria: 1, robo: { t0: 131.5, t1: 135.6, de: [-3, 4.4], para: [1.15, 1.7] } };
  }
  return p;
}

// ---------- Ze por take ----------
const SEATED = baseDe(3.0, SALA_Y, 0.4, -Math.PI / 2 + 0.5);
// ---------- abertura (takes 1 e 2): Ze, pote, poeira, agua e camera por cima do camera.json ----------
const S = (y) => SALA_Y + y;                          // y relativo ao piso da sala
const aguaAltura = (t) => 1.75 * smooth(ramp(t, 9.7, 10.95));
const subidaSofa = (t) => 0.3 * smooth(ramp(t, 9.9, 11.4));
const SEATED_A = baseDe(2.5, SALA_Y, 0.4, -Math.PI / 2 + 0.5);   // abertura: quadril mais a frente que o SEATED dos takes 17 e 19
const HEAD = V3(2.95, S(2.5), 0.12), FZ = V3(-0.877, 0, 0.48);   // cabeca do Ze sentado e direcao do olhar
const bump = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
const poteAt = (t) => {                               // pote no colo: pula no CREC, flutua com a agua
  const u = ramp(t, T.estalo, T.estalo + 0.6), pulo = u > 0 && u < 1 ? 1.1 * 4 * u * (1 - u) : 0, boiar = t >= T.sala ? 0.07 * Math.sin(t * 3) : 0;
  const v = smooth(ramp(t, T.sala, T.sala + 0.5));                 // com a agua o pote solta do colo e boia ao lado
  const y = Math.max(S(1.4) + pulo + subidaSofa(t), S(aguaAltura(t)) + 0.2 * v);
  return V3(1.95 - 0.7 * v, y + boiar, 0.4 + 1.5 * v);
};
function zeAbertura(t) {
  const a = casa, z = a.ze, j = J(z), b = SEATED_A;
  const pose = (tt) => {                              // Ze em tt (usado tambem para medir mao e boca de lancamento)
    idle(a, b, tt, 'neutro'); sentar(a, 1, b); z.raiz.position.y += subidaSofa(tt);
    j.tronco.rotation.x = -0.32;                   // recostado no encosto; joelhos passam da borda do assento e os pes ficam no chao
    let emo = 'neutro', abre = 0, segE = true, segD = true;      // segE/segD: mao segura a borda do pote (IK) salvo gesto proprio
    if (tt < T.e) {                                   // joga a pipoca (~0,8 s), pega com a boca em "pipoca", mastiga
      const k = smooth(ramp(tt, 0.3, 0.8)) * (1 - smooth(ramp(tt, 0.85, 1.3)));
      if (k > 0.001) { segD = false; j.ombroD.rotation.set(-0.45 - 1.9 * k, 0, -0.3); j.cotoveloD.rotation.set(-1.25 + 0.9 * k, 0, -0.1); }
      j.cabeca.rotation.x = -0.4 * smooth(ramp(tt, 1.0, 1.5)) * (1 - smooth(ramp(tt, T.pipoca + 0.1, T.pipoca + 0.3)));
      abre = smooth(ramp(tt, 1.2, 1.4)) * (1 - smooth(ramp(tt, T.pipoca + 0.04, T.pipoca + 0.14)));
      emo = tt < T.pipoca ? 'feliz' : (Math.floor((tt - T.pipoca) * 7) % 2 ? 'feliz' : 'neutro');
      j.cabeca.rotation.x += tt >= T.pipoca ? 0.07 * Math.sin((tt - T.pipoca) * 44) : 0;
    } else if (tt < T.estalo) {                       // para de mastigar e olha para cima
      j.cabeca.rotation.x = -0.45 * smooth(ramp(tt, T.e, T.e + 0.35)); emo = 'neutro';
    } else if (tt < T.detalhe) {                      // CREC: grito de susto, bracos sobem, depois congela
      const up = smooth(ramp(tt, T.estalo, T.estalo + 0.08)) * (1 - smooth(ramp(tt, T.estalo + 0.6, T.estalo + 1.0)));
      abre = (1 - smooth(ramp(tt, T.estalo + 0.6, T.estalo + 0.72))) * smooth(ramp(tt, T.estalo, T.estalo + 0.05));
      if (up > 0.001) { segE = segD = false; j.ombroE.rotation.set(-0.45 - 2.2 * up, 0, 0.3 + 0.3 * up); j.cotoveloE.rotation.set(-1.25 + 1.0 * up, 0, 0.35);
        j.ombroD.rotation.set(-0.45 - 2.2 * up, 0, -0.3 - 0.3 * up); j.cotoveloD.rotation.set(-1.25 + 1.0 * up, 0, -0.35); }
      j.cabeca.rotation.x = -0.15 - 0.3 * smooth(ramp(tt, T.lembra + 0.2, T.detalhe)); emo = 'surpreso';
      j.tronco.rotation.x = -0.32 - 0.1 * up;
      z.raiz.position.y += 0.18 * Math.sin(Math.PI * ramp(tt, T.estalo, T.estalo + 0.3));   // pulinho de susto
    } else if (tt < T.e2) {                           // olha devagar para o teto e engole seco; depois TEM UMA PISCINA
      j.cabeca.rotation.x = -0.25 - 0.2 * smooth(ramp(tt, T.detalhe, T.tem));
      const g1 = bump(tt, 4.2, 0.07) + bump(tt, 4.45, 0.07);   // engolir: tronco encolhe e a cabeca volta um pouco
      j.tronco.rotation.x = -0.32 + 0.05 * g1; j.cabeca.rotation.x += 0.12 * g1;
      emo = tt < 4.45 || tt >= T.tem ? 'surpreso' : 'triste';
    } else {                                          // take 2: abraca o pote, teto verga
      const olha = smooth(ramp(tt, T.preparado - 0.3, T.preparado + 0.2)) * (1 - smooth(ramp(tt, T.sala, T.sala + 0.3)));
      const vira = smooth(ramp(tt, T.sala, T.sala + 0.4));
      j.tronco.rotation.x = 0.08 * (1 - vira) - 0.32 * vira; j.cabeca.rotation.x = 0.1 - 0.5 * olha;
      j.tronco.rotation.y = 0.9 * vira; j.cabeca.rotation.y = 0.15 * vira;
      emo = tt < T.sala ? (tt < T.preparado ? 'triste' : 'surpreso') : tt < T.funda ? 'surpreso' : 'cansado';
      if (tt >= T.sala) {                              // de boia e oculos; em "funda" faz joinha sem graca
        segE = false; j.ombroE.rotation.set(-0.3, 0, 0.35); j.cotoveloE.rotation.set(-0.9, 0, 0.2);
        const joi = smooth(ramp(tt, T.funda + 0.1, T.funda + 0.45));
        if (joi > 0.001) { segD = false; j.ombroD.rotation.set(-0.45 - 0.5 * joi, 0, -0.3 - 0.3 * joi); j.cotoveloD.rotation.set(-1.25 - 0.5 * joi, 0, -0.35 * (1 - joi)); j.pulsoD.rotation.set(0, 1.5 * joi, 0); }
      }
    }
    const P = poteAt(tt), esq = V3(0.48, 0, 0.877);               // maos na borda do pote (esq = lado esquerdo do Ze)
    if (segE) safeReach(z, 'E', P.clone().addScaledVector(esq, 0.5).add(V3(0, 0.12, 0)), tt, { t0: -1, t1: -0.5 });
    if (segD) safeReach(z, 'D', P.clone().addScaledVector(esq, -0.5).add(V3(0, 0.12, 0)), tt, { t0: -1, t1: -0.5 });
    z.emocao(emo);
    return { abre };
  };
  // pontos de lancamento: mao no alto (0,8 s) e boca em "pipoca"
  pose(0.8); z.raiz.updateWorldMatrix(true, true);
  const R = z.maos.D.getWorldPosition(new THREE.Vector3());
  pose(T.pipoca); z.raiz.updateWorldMatrix(true, true);
  const Mf = z.juntas.cabeca.localToWorld(V3(0, 0.2, 0.64)), Min = z.juntas.cabeca.localToWorld(V3(0, 0.2, 0.3));   // diante da boca e dentro da boca
  const { abre } = pose(t); z.raiz.updateWorldMatrix(true, true);
  // boca bem aberta (pegar pipoca / grito)
  const gr = t >= T.estalo && t < T.estalo + 0.62;
  bocaGrito.visible = abre > 0.02; bocaGrito.scale.set(gr ? 1.15 : 0.95, (gr ? 1.35 : 1.2) * Math.max(abre, 0.01), 1);
  // pipoca lancada: na mao ate 0,8 s, arco ate a boca, some na boca
  const mao = z.maos.D.getWorldPosition(new THREE.Vector3()), fl = ramp(t, 0.8, T.pipoca - 0.12), en = ramp(t, T.pipoca - 0.12, T.pipoca + 0.04);
  const voo = R.clone().lerp(Mf, smooth(Math.min(1, fl / 0.7))); voo.y = R.y + (Mf.y - R.y) * fl + 2.2 * 4 * fl * (1 - fl);   // desce quase na vertical sobre a boca
  pipocas[0].visible = t >= 0.5 && t < T.pipoca + 0.04;
  pipocas[0].position.copy(t < 0.8 ? mao : t < T.pipoca - 0.12 ? voo : Mf.clone().lerp(Min, en));
  pipocas[0].scale.setScalar(1.3 - 0.75 * en);
  // pote no colo: pula no CREC, flutua com a agua
  const u = ramp(t, T.estalo, T.estalo + 0.6), no = u > 0 && u < 1 ? 1 : 0, pulo = 1.1 * 4 * u * (1 - u) * no;
  poteColo.position.copy(poteAt(t));
  potePipocas.forEach((m, k) => { const q = m.userData.base; m.position.set(q[0], q[1] + no * 0.9 * Math.sin(Math.PI * u) * (0.5 + hash(k, 6)), q[2]); m.rotation.set(u * 6 * hash(k, 7), 0, 0); });
  // gota do teto cai dentro do pote (~4,4 s)
  const gu = ramp(t, 4.0, 4.42);
  gotaPote.visible = gu > 0 && gu < 1; gotaPote.position.set(1.95, S(5.3) - (5.3 - 1.68) * gu * gu, 0.4);
  const mu = ramp(t, 4.42, 5.0); marolaPote.visible = mu > 0 && mu < 1; marolaPote.position.y = 0.2; marolaPote.scale.set(0.3 + 0.9 * mu, 1, 0.3 + 0.9 * mu);
  // boia e oculos (filhos do Ze), com pop curto
  const pb = smooth(ramp(t, T.sala + 0.02, T.sala + 0.18)), po = smooth(ramp(t, T.sala + 0.25, T.sala + 0.4));
  boiaZe.visible = t >= T.e2 && pb > 0; boiaZe.scale.setScalar(Math.max(pb, 1e-3));
  oculosMerg.visible = t >= T.e2 && po > 0; oculosMerg.scale.setScalar(Math.max(po, 1e-3));
}
function atualizarAbertura(t, n) {
  poeira.forEach((m) => { const d = m.userData, dt = t - d.t0, ok = n === 1 && dt > 0 && dt < (d.s ? 0.8 : 1.3);
    m.visible = ok; if (!ok) return;
    m.position.set(d.x, S(d.s ? 4.6 - 6 * dt * dt : 5.4 - 3.5 * dt * dt), d.z); m.rotation.set(dt * 5 + d.x, dt * 3, 0); });
  const pa = patinhoPiscina; pa.visible = n === 1 && t >= 4.9;                    // patinho boiando na piscina sobre a sala
  pa.position.set(1.0, ROOF_Y + 2.35 + 0.05 * Math.sin(t * 3), 3.2); pa.rotation.set(0, -Math.PI / 2 + 0.25 + 0.15 * Math.sin(t * 1.5), 0.08 * Math.sin(t * 2.2));
  const h = aguaAltura(t), ps = patinhoSala; ps.visible = n === 2 && h > 0.15;
  ps.position.set(1.0 + 0.2 * Math.sin(t * 0.9), S(h) + 0.02 + 0.05 * Math.sin(t * 3), 2.4); ps.rotation.set(0, -Math.PI / 2 + 0.2, 0.1 * Math.sin(t * 2));
  pipocasAgua.forEach((m, k) => { m.visible = n === 2 && h > 0.12; m.position.set(-1.5 + 3.4 * hash(k, 1), S(h) + 0.03 + 0.04 * Math.sin(t * 3 + k), -2.0 + 6 * hash(k, 2)); m.rotation.y = k + t; });
}
const L3 = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
const pwv = (pts, t) => [0, 1, 2].map((c) => pw(pts.map(([tt, v]) => [tt, v[c]]), t));
function poseAbertura(t) {                            // camera dos takes 1 e 2: substitui o camera.json so aqui (0 - 12,07 s)
  let position, target, fov = 46, roll = 0;
  if (t < 1.2) { position = pwv([[0, [-1.6, S(2.7), 6.6]], [0.3, [-0.2, S(2.3), 5.0]], [1.2, [0.2, S(2.3), 4.6]]], t); target = [2.7, S(2.1), 0.3]; fov = 48; }
  else if (t < T.e) { position = pwv([[1.2, [0.7, S(3.3), 2.9]], [T.e, [1.0, S(3.1), 2.3]]], t); target = [HEAD.x, S(2.55), HEAD.z]; fov = 34; }
  else if (t < T.estalo) { position = pwv([[T.e, [1.3, S(1.2), 3.4]], [T.estalo, [0.7, S(1.0), 3.9]]], t); target = pwv([[T.e, [2.6, S(2.9), 0.3]], [T.estalo, [0.8, S(4.6), 0.2]]], t); fov = 54; }
  else if (t < T.estalo + 0.55) { const u = smooth(ramp(t, T.estalo, T.estalo + 0.25)); position = [-2.6, S(1.0), 3.9]; target = [0.9, S(4.7), -0.2]; fov = 92 + (62 - 92) * u; }
  else if (t < T.lembra) { position = [HEAD.x + FZ.x * 2.2, HEAD.y - 0.1, HEAD.z + FZ.z * 2.2]; target = [HEAD.x, HEAD.y - 0.05, HEAD.z]; fov = 40 - 4 * ramp(t, T.estalo + 0.55, T.lembra); }
  else if (t < T.tem) {                               // dolly zoom: aproxima e abre o FOV (tamanho do rosto constante)
    const u = smooth(ramp(t, T.lembra, T.lembra + 0.6)), d = 3.6 + (2.3 - 3.6) * u, k = 1.3;
    target = [HEAD.x, HEAD.y - 0.5, HEAD.z]; position = [target[0] + FZ.x * d, target[1] - 0.2, target[2] + FZ.z * d]; fov = 2 * Math.atan(k / d) * 180 / Math.PI;
  } else if (t < 6.4) {                               // grua: sobe da cabeca, atravessa teto e agua e chega ao patinho em "PISCINA"
    const a = smooth(ramp(t, T.tem, T.piscina1)), w = smooth(ramp(t, T.piscina1, 6.4));   // corte seco em TEM direto na piscina com o patinho; aproxima e depois abre
    position = L3(L3([-9.0, 79.0, 11.0], [-6.2, 76.3, 6.5], a), [-1.5, 80.0, 18], w);
    target = L3([1.0, 74.9, 3.2], [0.5, 74.2, 3.5], w); fov = 46 + 2 * w;
  } else if (t < T.e2) { const u = ramp(t, 6.4, T.e2); position = L3([-5.5, 79.7, 52.5], [-4.8, 79.0, 47], u); target = [0, 69.5, 0]; fov = 44; }
  else if (t < T.preparado) { const u = ramp(t, T.e2, T.preparado); position = L3([-2.8, S(2.4), 5.2], [-2.2, S(2.4), 4.6], u); target = [2.7, S(2.7), 0.2]; fov = 44; roll = 0.14; }
  else if (t < T.sala) { const u = ramp(t, T.preparado, T.sala); position = L3([-0.5, S(1.4), 4.8], [0.3, S(1.6), 4.2], u); target = [2.8, S(3.2), 0.2]; fov = 50; roll = -0.12; }
  else if (t < T.funda) { const h = aguaAltura(t); position = [0.9, S(h) + 0.12 + 0.7 * (1 - smooth(ramp(t, T.sala, T.funda))), 9.0]; target = [2.8, S(h) + 1.0 + 0.5 * (1 - smooth(ramp(t, T.sala, T.funda))), 0.2]; fov = 36; roll = 0.05; }
  else { const h = aguaAltura(t), u = ramp(t, T.funda, 12.073); position = [-1.6 + 1.0 * u, S(h) + 0.12, 8.5 - 0.7 * u]; target = [2.8, S(h) + 1.1, 0.2]; fov = 34; roll = -0.07; }
  // tremor de camera do CREC (0,3 s), pelo tremer() do kit de efeitos; o dummy volta a zero a cada quadro (funcao pura de t)
  tremorCam.userData.tremor = [0, 0]; tremorCam.position.set(0, 0, 0);
  const k = t >= T.estalo && t < T.estalo + 0.3 ? 1 - ramp(t, T.estalo, T.estalo + 0.3) : 0;
  if (k > 0) tremer(tremorCam, t, 0.04 + 0.12 * k, 38);
  return { position: [position[0] + tremorCam.position.x, position[1] + tremorCam.position.y, position[2]], target, fov, roll };
}
function zeSala(t, take) {                          // takes 1, 2, 17 (de passagem) e 19: casa sentado no sofa
  esconder(obra);
  const n = take.take;
  if (n === 17 && !(t >= 116.0 && t < 121.0)) { poteColo.position.set(1.95, S(1.4), 0.4); esconder(casa); return; }
  const a = casa, b = SEATED_A, z = a.ze, j = J(z);       // pose sentada correta (quadril na almofada, pes no chao) em todos os takes de sala
  idle(a, b, t, 'neutro'); sentar(a, 1, b); j.tronco.rotation.x = -0.32;
  const potePos = V3(1.95, S(1.4), 0.4), esqZe = V3(0.48, 0, 0.877);
  const segurar = (mao) => safeReach(z, mao, potePos.clone().addScaledVector(esqZe, mao === 'E' ? 0.5 : -0.5).add(V3(0, 0.12, 0)), t, { t0: -1, t1: -0.5 });
  if (n === 1 || n === 2) {
    zeAbertura(t);
  } else if (n === 17) {
    z.emocao('surpreso'); j.cabeca.rotation.x = -0.3 * smooth(ramp(t, 116, 116.6));
    poteColo.position.copy(potePos); segurar('E'); segurar('D');
  } else if (n === 19) {
    poteColo.position.copy(potePos);
    const ok = ramp(t, W(18, 'otimista'), W(18, 'otimista') + 0.5);
    z.emocao(t < 133 ? 'surpreso' : t < 134.7 ? 'neutro' : 'feliz');
    segurar('E');
    const come = Math.sin(t * 5) * 0.5 + 0.5;
    j.ombroD.rotation.set(-1.1 - 0.9 * ok - 0.3 * come * (1 - ok), 0, -0.2 - 0.3 * ok); j.cotoveloD.rotation.set(-1.9 + 0.8 * ok, 0, 0);
    j.cabeca.rotation.x = (t >= 131.3 && t < 132.5) ? -0.4 : -0.25 * (1 - smooth(ramp(t, 134, 135))) * (t > 132 ? 1 : 0);
  }
  mostrar(a, SALA_Y); a.sombra.visible = false;
}
function zeTelhado5(t) {                            // take 5: aparece no telhado, despeja o balde, "ops"
  esconder(casa);
  const a = obra, b = baseDe(-5.7, ROOF_Y, -3.4, 0.45), z = a.ze, j = J(z);
  const aparece = smooth(ramp(t, 24.1, 24.4));
  idle(a, b, t, t < 27.9 ? 'neutro' : 'surpreso');
  z.usarCapacete(true); z.acessorios.capacete.rotation.z = 0.35;
  balde.visible = true;
  const levanta = smooth(ramp(t, 25.0, 25.5)), vira = smooth(ramp(t, 25.6, 26.3)), volta = smooth(ramp(t, 27.0, 27.6)), k = levanta * (1 - volta);
  j.ombroD.rotation.set(-1.45 * k - 0.3 * (1 - k), 0, -0.3 - 0.2 * k); j.cotoveloD.rotation.set(-0.6 * k - 0.15, 0, 0);
  balde.rotation.set(-0.2 * k - 1.6 * vira * (1 - volta), 0, 0);
  if (t >= 27.8) { const u = smooth(ramp(t, 27.8, 28.1)); j.ombroE.rotation.set(0, 0, 2.3 * u); j.cotoveloE.rotation.set(0, 0, 1.6 * u); j.cabeca.rotation.z = 0.12 * u; }
  z.raiz.scale.setScalar(ESCALA_ZE.obra * (0.7 + 0.3 * aparece));
  if (aparece <= 0) esconder(a); else mostrar(a, ROOF_Y);
}
function zeTroca6(t) {                              // take 6: chega, VESTE capacete e colete em ~0,55 s, ajeita o capacete, pega a prancheta e anda para o canteiro
  const base = baseDe(-9.0, 0.12, 13.0, 0.5);
  const ini = 34.7, veste0 = 35.1, veste1 = 35.65;
  if (t < ini) { esconder(casa); esconder(obra); return; }
  if (t < veste1) {                                 // de casa: chega, o capacete desce na cabeca e o colete cresce
    esconder(obra);
    idle(casa, base, t, t > veste0 ? 'feliz' : 'neutro');
    const u = smooth(ramp(t, veste0, veste1));
    if (u > 0) {
      casa.ze.usarCapacete(true); casa.ze.acessorios.capacete.position.copy(CAPACETE_POS).add(V3(0, 2.2 * (1 - u), 0));
      coleteCasa.visible = true; coleteCasa.scale.set(u, 1, u);
      casa.ze.juntas.ombroD.rotation.set(-1.9 * (1 - u) - 0.1, 0, -0.3); casa.ze.juntas.cotoveloD.rotation.set(-0.4, 0, 0);
    }
    casa.ze.raiz.scale.setScalar(ESCALA_ZE.casa * (0.7 + 0.3 * smooth(ramp(t, ini, ini + 0.3))));
    mostrar(casa, 0.12); return;
  }
  esconder(casa);
  const anda0 = 36.2, destino = V3(-8.0, 0.12, 13.3);
  obra.ze.usarCapacete(true); prancheta.visible = true;
  const j = J(obra.ze);
  if (t < anda0) {
    idle(obra, base, t, 'feliz');
    const aj = smooth(ramp(t, 35.75, 35.95)) * (1 - smooth(ramp(t, 36.0, 36.15)));          // mao D ajeita o capacete
    if (aj > 0.001) { const topo = obra.ze.juntas.cabeca.localToWorld(V3(0.15, 1.0, 0.1)); pegar(obra, 'D', topo, t, 35.7, 0.3); CT.take = 6; }
    const u = smooth(ramp(t, 36.0, 36.25));                                                  // pega a prancheta com a mao E
    j.ombroE.rotation.set(-0.9 * u, 0, 0.3); j.cotoveloE.rotation.set(-1.0 * u, 0, 0);
    obra.ze.raiz.position.y = base.posicao.y + 0.15 * Math.sin(Math.PI * ramp(t, veste1, veste1 + 0.35));
  } else {                                          // ja anda para o canteiro, com a prancheta
    moves.M09_caminhadaCurta(obra.ze, t, { t0: anda0, t1: 36.66, de: base.posicao.clone(), para: destino, base });
    j.ombroE.rotation.set(-0.9, 0, 0.3); j.cotoveloE.rotation.set(-1.0, 0, 0); obra.ze.emocao('feliz');
  }
  mostrar(obra, 0.12);
}
function pePiscina(a, aguaY) {                      // sentado na parede: ajusta o quadril da perna D para a ponta do pe tocar a agua
  const j = J(a.ze); let lo = -1.6, hi = -0.15;
  j.joelhoD.rotation.x = 0.05;
  for (let i = 0; i < 16; i++) {
    const m = (lo + hi) / 2; j.pernaD.rotation.x = m; a.ze.raiz.updateWorldMatrix(true, true);
    const y = new THREE.Box3().setFromObject(j.pernaD).min.y;
    if (y > aguaY) lo = m; else hi = m;
  }
  a.ze.raiz.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(j.pernaD).min.y;
}
function atuarMundo(t, take) {
  const n = take.take, a = obra, z = a.ze, j = J(z);
  esconder(casa);
  const emocao = (e) => z.emocao(e);
  z.usarCapacete(true);
  if (n === 7) {                                    // afunda a bota na terra mole e puxa
    const O = PALCO.terreno.o, base = baseDe(O.x - 2.6, O.y, O.z + 1.4, 0.35);
    idle(a, base, t, 'neutro');
    // antes de pisar: o olhar antecede o gesto (solo, depois a mao aponta a terra mole) e o peso balanca de leve
    const solo = V3(O.x + 0.4, O.y, O.z + 1.4);
    j.tronco.rotation.z = 0.04 * Math.sin(t * 2.1) * (1 - smooth(ramp(t, 39.6, 39.8)));
    moves.olharPara(z, solo, t, { t0: 37.3, t1: 37.6 });
    z.apontarPara(V3(O.x + 2.4, O.y + 0.1, O.z + 1.6), { lado: 'D', intensidade: smooth(ramp(t, 38.3, 38.7)) * (1 - smooth(ramp(t, 39.5, 39.8))) });
    const afunda = smooth(ramp(t, 39.8, 40.45)), puxa = smooth(ramp(t, 41.5, 42.0));
    z.raiz.position.y = base.posicao.y - 1.15 * afunda * (1 - 0.85 * puxa) + 0.12 * Math.sin(Math.PI * puxa);
    z.raiz.rotation.z = 0.12 * Math.sin(afunda * 6) * (1 - puxa);
    emocao(afunda > 0.2 ? 'surpreso' : 'neutro');
    if (afunda > 0) { j.ombroE.rotation.set(0, 0, 0.9 * afunda); j.ombroD.rotation.set(0, 0, -0.9 * afunda); } else j.ombroE.rotation.set(0, 0, 0.12);
    fantasma.position.set(2.4, 2.1 - 1.9 * smooth(ramp(t, 39.7, 41.3)), 0.2); fantasma.rotation.z = -0.35 * smooth(ramp(t, 40.3, 41.5));
    z.raiz.updateWorldMatrix(true, true);
    CT = { tipo: 'afundar', soloY: O.y, sola: Math.min(new THREE.Box3().setFromObject(j.pernaE).min.y, new THREE.Box3().setFromObject(j.pernaD).min.y) };
    mostrar(a, O.y);
  } else if (n === 8 && t < 47.0) {                 // sinaliza o bate-estaca e tapa os ouvidos a cada golpe
    const O = PALCO.estaca.o, base = baseDe(O.x - 3.6, O.y, O.z + 1.2, 0.4);
    if (t < 42.45) moves.M12_sinalizar(z, t, { t0: 41.95, base });
    else idle(a, base, t, 'triste');
    if (t >= 42.45 && t < 45.6) {
      z.raiz.updateWorldMatrix(true, true);
      const orelha = (s) => z.juntas.cabeca.localToWorld(V3(0.52 * s, 0.46, 0));
      const oE = orelha(1), oD = orelha(-1);
      pegar(a, 'E', oE, t, 42.45, 0.3); CT.take = 8;
      const qE = [J(z).ombroE.quaternion.clone(), J(z).cotoveloE.quaternion.clone()];
      safeReach(z, 'D', oD, t, { t0: 42.45, t1: 42.75 });
      J(z).ombroE.quaternion.copy(qE[0]); J(z).cotoveloE.quaternion.copy(qE[1]); z.raiz.updateWorldMatrix(true, true);
    }
    mostrar(a, O.y);
  } else if (n === 8) {                             // bloco e fundacao: prancheta, aponta e bate a prancheta, satisfeito
    const O = PALCO.fundacao.o, base = baseDe(O.x - 4.6, O.y, O.z + 1.4, 0.4);
    idle(a, base, t, t > 52.3 ? 'feliz' : 'neutro');
    prancheta.visible = t >= 47.3;
    j.ombroE.rotation.set(-1.0, 0, -0.45); j.cotoveloE.rotation.set(-1.0, 0, 0);
    // o olhar antecede cada gesto: estacas, bloco, pilares, prancheta; a mao D aponta estacas e depois o bloco
    const F = PALCO.fundacao.obj, estaca0 = F.estacas[0].getWorldPosition(new THREE.Vector3()).add(V3(0, 1.4, 0)), bloco0 = F.bloco.group.getWorldPosition(new THREE.Vector3()).add(V3(0, 0.8, 0));
    const seg = [[47.2, estaca0], [48.7, bloco0], [50.3, bloco0.clone().add(V3(0, 2.4, 0))], [51.7, prancheta.getWorldPosition(new THREE.Vector3())]];
    const ativo = seg.filter((q) => t >= q[0]).at(-1);
    if (ativo) moves.olharPara(z, ativo[1], t, { t0: ativo[0], t1: ativo[0] + 0.35 });
    if (t < 52.0) {
      const env = smooth(ramp(t, 47.5, 47.9)) * (1 - smooth(ramp(t, 51.4, 51.9)));
      z.apontarPara(t < 48.7 ? estaca0 : bloco0, { lado: 'D', intensidade: env }); j.tronco.rotation.y = 0.08 * Math.sin(t * 1.7) * env;
    }
    else { z.raiz.updateWorldMatrix(true, true); pegar(a, 'D', prancheta.localToWorld(V3(0, 0.1, 0.05)), t, 52.0, 0.35); CT.take = 8; }
    mostrar(a, O.y);
  } else if (n === 9) {                             // aperta a viguinha, estica e ela racha
    const O = PALCO.viguinha.o, sg = PALCO.viguinha.obj.simples.segs;
    const estica0 = smooth(ramp(t, 57.0, 57.8));
    const segX = (xl) => sg.reduce((m, s2) => (Math.abs(s2.userData.x - 3.8 - xl) < Math.abs(m.userData.x - 3.8 - xl) ? s2 : m)).getWorldPosition(new THREE.Vector3()).add(V3(0, 0.3, 0));
    const base = ficar(a, t, 0, segX(-5.0 + lerp(0.3, 0.55, estica0)), 'E', 0.55, O.y, 'neutro', 0.6);
    const estica = smooth(ramp(t, 57.0, 57.8)), susto = smooth(ramp(t, 58.4, 58.7));
    const seg = (xl) => sg.reduce((m, s) => (Math.abs(s.userData.x - 3.8 - xl) < Math.abs(m.userData.x - 3.8 - xl) ? s : m)).getWorldPosition(new THREE.Vector3()).add(V3(0, 0.3, 0));
    if (susto < 0.5) {
      const xe = -5.0 + lerp(0.3, 0.55, estica), xd = -5.0 - lerp(0.3, 0.55, estica);
      const aE = seg(xe), aD = seg(xd);
      safeReach(z, 'D', aD, t, { t0: 54.4, t1: 54.9 });
      const qD = [J(z).ombroD.quaternion.clone(), J(z).cotoveloD.quaternion.clone()];
      pegar(a, 'E', aE, t, 54.4, 0.5); CT.take = 9;
      J(z).ombroD.quaternion.copy(qD[0]); J(z).cotoveloD.quaternion.copy(qD[1]);
      emocao(estica > 0.5 ? 'cansado' : 'neutro');
    } else { moves.M04_susto(z, t, { t0: 58.4, base }); emocao('surpreso'); }
    mostrar(a, O.y);
  } else if (n === 10) {                            // A: estica a viguinha ARMADA (nao racha); B: encaixa a barra, recua e aponta o pilar, sem cobri-lo
    if (t >= 66.0) { esconder(a); return; }
    if (t < 62.4) {
      const O = PALCO.viguinha.o, sg = PALCO.viguinha.obj.armada.segs;
      const estica = smooth(ramp(t, 61.0, 61.8));
      const segX = (xl) => sg.reduce((m, s2) => (Math.abs(s2.userData.x + 3.8 - xl) < Math.abs(m.userData.x + 3.8 - xl) ? s2 : m)).getWorldPosition(new THREE.Vector3()).add(V3(0, 0.3, 0));
      ficar(a, t, 0, segX(5.0 + lerp(0.3, 0.55, estica)), 'E', 0.55, O.y, t > 61.9 ? 'feliz' : 'neutro', 0.6);
      const aD = segX(5.0 - lerp(0.3, 0.55, estica)), aE = segX(5.0 + lerp(0.3, 0.55, estica));
      safeReach(z, 'D', aD, t, { t0: 59.97, t1: 60.5 });
      const qD = [J(z).ombroD.quaternion.clone(), J(z).cotoveloD.quaternion.clone()];
      pegar(a, 'E', aE, t, 59.97, 0.5); CT.take = 10;
      J(z).ombroD.quaternion.copy(qD[0]); J(z).cotoveloD.quaternion.copy(qD[1]);
      mostrar(a, O.y); return;
    }
    const O = PALCO.pilar.o, bar = V3(O.x + 0.28, O.y + 2.6, O.z + 0.28), passo = smooth(ramp(t, 63.4, 63.9)), sai = ramp(t, 64.8, 65.8);
    const base = ficar(a, t, Math.PI / 2 * 0.9, bar, 'D', 0.9, O.y, 'neutro', 0);
    if (t < 63.4) { pegar(a, 'D', bar, t, 62.0, 0.3); CT.take = 10; }
    else {                                          // recua para a esquerda e aponta o pilar cortado
      z.raiz.position.x -= 1.9 * passo; z.raiz.rotation.y = lerp(Math.PI / 2 * 0.9, Math.PI / 2 * 0.55, passo);
      z.apontarPara(V3(O.x, O.y + 3.2, O.z + 0.4), { lado: 'D', intensidade: smooth(ramp(t, 63.8, 64.2)) });
      if (sai > 0) { z.raiz.position.x -= 4.5 * smooth(sai); }
    }
    mostrar(a, O.y);
  } else if (n === 11) {                            // anda na laje comum com a regua, poe o balde, recua; na reforcada pula e faz joinha
    const O = PALCO.laje.o, lt = pw(JAN.laje, t);
    const d = (X) => 0.5 * smooth((lt - 5.0) / 1.4) * Math.max(0, 1 - (X / 3) ** 2);
    const topo = (xl) => O.y + 2.1 - d(xl + 4.2), xC = (u) => lerp(-6.0, -2.3, u);
    const anda = ramp(t, 70.0, 71.4), recua = smooth(ramp(t, 76.0, 77.0)), trav = ramp(t, 77.4, 78.4);
    let xl = xC(smooth(anda)) - 0.9 * recua, y = topo(xl);
    if (trav > 0) { xl = lerp(xl, 2.7, smooth(trav)); y = lerp(topo(xl), O.y + 2.4, smooth(trav)); }
    const base = baseDe(O.x + xl, y, O.z + 0.3, trav > 0 ? 0.2 : 0.35);
    if (t < 71.4) moves.M09_caminhadaCurta(z, t, { t0: 70.0, t1: 71.4, de: V3(O.x - 6.0, O.y + 2.1, O.z + 0.3), para: V3(O.x - 2.3, O.y + 2.1, O.z + 0.3), base });
    else idle(a, base, t, t > 74.5 && t < 77.3 ? 'surpreso' : 'neutro');
    if (t >= 71.4 && t < 77.4) {                    // regua na mao E: a ponta toca a face da laje
      reguaMao.visible = true;
      j.ombroE.rotation.set(-0.15, 0, 0.45); j.cotoveloE.rotation.set(-0.1, 0, 0); z.raiz.updateWorldMatrix(true, true);
      const mao = z.maos.E.getWorldPosition(new THREE.Vector3()), alvoY = topo(xl - 0.6), h = Math.max(0.2, mao.y - alvoY);
      reguaMao.scale.y = h / ESCALA_ZE.obra; reguaMao.position.set(0, -h / 2 / ESCALA_ZE.obra, 0);
      CT = { take: 11, tipo: 'regua', ponta: V3(mao.x, mao.y - h, mao.z), alvoY };
    }
    if (t >= 73.4 && t < 74.7) { balde.visible = true; const k = smooth(ramp(t, 73.4, 73.8)); j.ombroD.rotation.set(-0.9 * k, 0, -0.3); j.cotoveloD.rotation.set(-0.6 * k, 0, 0); balde.rotation.set(0, 0, 0); }
    if (t >= 78.4) { const hop = (u) => Math.max(0, Math.sin(Math.PI * u)); z.raiz.position.y += 0.5 * (hop(ramp(t, 78.5, 78.9)) + hop(ramp(t, 78.95, 79.3))); emocao('feliz'); if (t >= 79.0) { j.ombroD.rotation.set(-2.2, 0, -0.3); j.cotoveloD.rotation.set(-0.5, 0, 0); } }
    mostrar(a, y);
  } else if (n === 12) {                            // empurra a parede pelo lado de FORA (as setas ficam livres no lado de dentro), depois sai
    const P = PALCO['parede-sem'], O = P.o, fi = P.obj.fiadas['-1'];
    const f2 = fi[2].getWorldPosition(new THREE.Vector3()).add(V3(-0.25, 0, -0.45)), f3 = fi[3].getWorldPosition(new THREE.Vector3()).add(V3(-0.25, 0, 0.45));
    const e = smooth(ramp(t, 84.9, 85.4));
    const base = ficar(a, t, Math.PI / 2, f2, 'E', 0.4, O.y, e > 0.5 ? 'cansado' : 'neutro', 1.0);
    if (t < 87.0) {
      z.juntas.tronco.rotation.x = 0.3 * e;                                // inclina o corpo para a parede (fica mais perto, dentro do quadro)
      pegar(a, 'E', f2, t, 84.9, 0.5); CT.take = 12;
      const qE = [J(z).ombroE.quaternion.clone(), J(z).cotoveloE.quaternion.clone()];
      safeReach(z, 'D', f3, t, { t0: 84.9, t1: 85.4 });
      J(z).ombroE.quaternion.copy(qE[0]); J(z).cotoveloE.quaternion.copy(qE[1]);
    } else moves.M09_caminhadaCurta(z, t, { t0: 87.0, t1: 88.1, de: base.posicao.clone(), para: base.posicao.clone().add(V3(-4, 0, 0)), base: { ...base, rotacao: new THREE.Euler(0, -Math.PI / 2, 0) } });
    mostrar(a, O.y);
  } else if (n === 15) {
    if (t < 102.6) {                                // desenrola a manta com o pe
      const O = PALCO.manta.o, base = baseDe(O.x + 2.0, O.y, O.z - 0.2, -0.5);
      idle(a, base, t, 'neutro');
      const chuta = smooth(ramp(t, 100.6, 101.2)) * (1 - smooth(ramp(t, 101.2, 101.8)));
      j.pernaD.rotation.x = -0.9 * chuta; j.joelhoD.rotation.x = 0.4 * chuta;
      mostrar(a, O.y);
    } else if (t < 105.0) {                         // aperta o anel do cano com a chave
      const P = PALCO.cano, O = P.o, alvo = P.obj.anel.getWorldPosition(new THREE.Vector3());
      ficar(a, t, Math.PI, alvo, 'D', 0.8, O.y, 'neutro', 0.9);
      if (t >= 103.0) chaveMao.visible = true;
      if (t >= 103.2) { pegar(a, 'D', alvo, t, 103.2, 0.4); CT.take = 15; z.juntas.pulsoD.rotation.y = 0.8 * Math.sin(ramp(t, 104.0, 104.9) * 12); }
      mostrar(a, O.y);
    } else {                                        // casa de maquinas: acompanha e sai de quadro na bomba
      const O = PALCO.circulacao.o, sai = smooth(ramp(t, 107.0, 108.6)), base = baseDe(O.x + 2.4, O.y, O.z + 1.5, 0.3);
      if (sai > 0) moves.M09_caminhadaCurta(z, t, { t0: 107.0, t1: 108.6, de: base.posicao.clone(), para: base.posicao.clone().add(V3(5, 0, 0)), base });
      else idle(a, base, t, 'neutro');
      mostrar(a, O.y);
    }
  } else if (n === 16) {                            // abre o registro, senta na parede da piscina e mergulha o dedao
    const wallY = ROOF_Y + 2.0, agua = wallY - 0.15;
    const sent = smooth(ramp(t, 112.0, 112.7)), th = 7 * ramp(t, 110.4, 111.8);
    const ang = -0.8 + 1.6 * (0.5 + 0.5 * Math.sin(th));
    const roda = registro.localToWorld(V3(0, 1.05, 0)).add(V3(0.42 * Math.cos(ang), 0, 0.42 * Math.sin(ang)));
    const base = baseDe(-2.9, wallY, 6.75, lerp(-Math.PI * 0.45, Math.PI, sent));
    idle(a, base, t, t < 112.5 ? 'neutro' : 'feliz');
    if (t < 112.0) { if (t >= 110.2) { pegar(a, 'D', roda, t, 110.2, 0.4); CT.take = 16; } else j.ombroD.rotation.set(0, 0, -0.12); }
    else {
      sentar(a, sent, base); z.raiz.position.y = base.posicao.y - 1.43 * sent;
      if (t < 113.3) { const y = pePiscina(a, agua); CT = { take: 16, tipo: 'dedao', y, agua }; }
      else j.ombroD.rotation.set(-2.2, 0, -0.3);
    }
    mostrar(a, wallY);
  } else esconder(a);
}
function zeCorte14(t) {                             // take 14: gota na cabeca, chuveiro, guarda-chuva na mao
  esconder(obra);
  const a = casa, b = baseDe(FIS_X, SALA_Y, 2.2, 0.0), z = a.ze, j = J(z);
  idle(a, b, t, 'neutro');
  const tg = 96.4, abre = smooth(ramp(t, 98.0, 98.4));
  z.emocao(t >= tg ? 'surpreso' : 'neutro');
  if (t >= tg) { const u = smooth(ramp(t, tg, tg + 0.25)); j.ombroE.rotation.set(0, 0, 2.3 * u); j.cotoveloE.rotation.set(0, 0, 1.5 * u); j.cabeca.rotation.x = -0.2 * u; }
  if (t >= 97.4) {
    const cabo = V3(FIS_X + 0.35, SALA_Y + 2.4 + 0.3 * abre, 2.45);
    pegar(a, 'D', cabo, t, 97.4, 0.4); CT.take = 14;
    guardaChuva.position.set(cabo.x, cabo.y - 0.2, cabo.z);
  }
  mostrar(a, SALA_Y); a.sombra.visible = true;
}

// ---------- atualizacao completa ----------
let modoLuz = '';
function fixarLuz() {
  const foco = V3(0, 30, 0);
  sol.position.add(foco); sol.target.position.copy(foco); sol.target.updateMatrixWorld();
  if (modoLuz !== 'torre') {
    modoLuz = 'torre';
    Object.assign(sol.shadow.camera, { left: -60, right: 60, top: 100, bottom: -20, near: 1, far: 400 });
    sol.shadow.camera.updateProjectionMatrix();
  }
}
function atualizarMecanicas(t) {
  for (const nome of ORDEM) {
    const P = PALCO[nome], [a, b] = VIS[nome];
    P.g.visible = t >= a && t < b;
    if (!P.g.visible) continue;
    for (const [pl, c0] of P.planos) pl.constant = c0;
    P.c.animar(P.obj, pw(JAN[nome], t));
    for (const [pl] of P.planos) pl.constant -= pl.normal.dot(P.o);      // plano local -> mundo
    if (nome === 'pilar') {                                               // corte mais fundo (z 0,05) e mantido ate o fim do take
      const lt = pw(JAN[nome], t), k = smooth((lt - 5.5) / 0.9), zc = lerp(0.5, 0.05, k);
      P.obj.plano.constant = zc + P.o.z; P.obj.tampa.position.z = Math.min(zc - 0.075, 0.395); P.obj.tampa.visible = k > 0.02 && lt > 5.1;
    }
    if (nome === 'parede-sem') {                                          // abaulamento 2,6x mais forte (leitura da camera); setas acompanham a parede
      const lt = pw(JAN[nome], t), B = 1.6 * 0.55 * smooth((lt - 4.8) / 1.3), off = (y) => B * clamp01(y / 2) ** 1.6;
      for (const side of [-1, 1]) P.obj.fiadas[side].forEach((f, k) => { f.position.x += side * off(0.5 * (k + 0.5)); });
      for (const { s, side, y } of P.obj.press) s.position.x += side * off(y);
    }
  }
}
function setasTorreAt(t, take) {
  const t1 = take.take === 1 ? ramp(t, T.piscina1, T.piscina1 + 0.8) : 0;
  setasPiscina.forEach((s) => { setSeta(s, 2.0 * t1, CM.vermelho); s.visible = take.take === 1 && t1 > 0; s.position.y = ROOF_Y + 2.2 + 2.0 * t1; });
  const d = take.take === 6 ? ramp(t, 29.0, 33.4) : 0;
  setasTorre.visible = take.take === 6 && d > 0 && t < T.voltar + 0.4;
  setasTorre.position.set(0, 72 - 70 * smooth(d), 13);
  setSeta(setaGrande, 8, CM.vermelho);
  caminho17.visible = take.take === 17;
  for (const s of SETAS17) {
    const len = s.L * smooth(ramp(t, s.t0, s.t0 + 0.55)), baixo = s.peca === 'fundacoes' || s.peca === 'terreno';
    const cor = !baixo ? CM.vermelho : t < s.t0 + 0.55 ? CM.vermelho : t < s.t0 + 0.9 ? CM.amarelo : CM.verde;
    setSeta(s.g, len, cor); s.g.visible = len > 0.02;
  }
}
function take2Agua(t, take) {
  const n = take.take, h = n === 2 ? aguaAltura(t) : 0;
  aguaSala.visible = n === 2 && h > 0.01;
  aguaSala.scale.y = Math.max(h, 0.001); aguaSala.position.y = SALA_Y + aguaSala.scale.y / 2;
  gotasSala.forEach((m, i) => {                       // gotas caindo do forro (so antes de a agua entrar)
    const ph = (((t - 8.0) / 0.5 + i / 10) % 1 + 1) % 1;
    m.visible = n === 2 && t > 8.0 && t < T.sala + 0.1;
    m.position.set(-0.5 + 3.2 * hash(i, 4), SALA_Y + 5.2 - 4.4 * ph * ph, -0.5 + 2.4 * hash(i, 7));
  });
}
function atualizarTake5(t, take) {
  const n = take.take;
  faixasConcreto.forEach((m, i) => {
    const u = n === 5 ? smooth(ramp(t, 25.4 + 0.5 * i, 26.3 + 0.5 * i)) : 0;
    m.visible = n === 5 && u > 0; m.scale.y = Math.max(u, 0.001); m.position.y = ROOF_Y + 0.25 * m.scale.y;
  });
  balancaTopoPai.visible = n === 5;
  CENAS.balanca.animar(balancaTopo, n === 5 ? 5.0 + 0.55 * (t - 22.47) : 0);
}
function atualizarFissura(t, take) {
  const n = take.take;
  fissura.visible = n === 14;
  segsFis.forEach((m, i) => {
    const u = clamp01(ramp(t, 93.4, 95.4) * segsFis.length - i);
    m.visible = u > 0; m.scale.y = Math.max(u, 0.01);
    m.position.set(FIS_X + (i % 2 ? 0.12 : -0.1), 73.3 - 0.45 * i, FIS_Z);
  });
  gotasFis.forEach((m, i) => {
    const ph = (((t - 96.0) / 0.65 + i / 14) % 1 + 1) % 1, chove = t >= 97.6 ? 1 : 0;
    m.visible = n === 14 && t >= 96.0 && (chove || i < 3);
    m.position.set(FIS_X + (chove ? (hash(i, 3) - 0.5) * 3.0 : 0), 72.0 - 2.6 * ph * ph, FIS_Z - (chove ? hash(i, 5) * 1.8 : 0.1));
  });
}

const estadoDoTake = (t) => TK.findLast((x) => t >= x.t0) || TK[0];

function updateAt(t) {
  const take = estadoDoTake(t), n = take.take;
  CT = null;
  // antes do cenario: o corte vertical (take 14) le a visibilidade para criar as tampas
  cen.torre.piscina.visible = n !== 15;
  cen.torre.cobertura.children.forEach((c) => { if (c.name.startsWith('espreguicadeira')) c.visible = n !== 15; });
  cen.updateAt(t, mundo(t, n));
  atualizarMecanicas(t);
  setasTorreAt(t, take); take2Agua(t, take); atualizarTake5(t, take); atualizarFissura(t, take);
  // a paisagem da janela da sala so aparece nos planos de dentro
  cen.sala.group.getObjectByName('paisagem').visible = n === 2 || n === 19 || n === 17 || (n === 1 && t < 5.2);
  registro.visible = n === 16;
  cen.obra.terreno.userData.arvores.visible = cen.obra.terreno.userData.arvores.visible && n !== 4;   // take 4: arvores do lote fora do quadro da balanca
  formaTopo.visible = n === 11 || n === 12 || n === 13;
  // take 15: a manta, o cano e a bomba ocupam o lugar da piscina; guarda-corpo e espreguicadeiras saem do quadro
  const cob = cen.torre.cobertura;
  cob.getObjectByName('casca-cobertura').visible = cob.getObjectByName('casca-cobertura').visible && n !== 15;
  // estado por quadro: nada herdado do seek anterior
  prancheta.visible = false; balde.visible = false; reguaMao.visible = false; chaveMao.visible = false; colete.visible = n >= 7 || (n === 6 && t >= 35.65);
  coleteCasa.visible = false; coleteCasa.scale.set(1, 1, 1);
  casa.ze.usarCapacete(false); casa.ze.acessorios.capacete.position.copy(CAPACETE_POS);
  obra.ze.usarCapacete(false); obra.ze.acessorios.capacete.rotation.z = 0;
  casa.ze.raiz.scale.setScalar(ESCALA_ZE.casa); obra.ze.raiz.scale.setScalar(ESCALA_ZE.obra);
  pipocas.forEach((m) => { m.visible = false; });
  poteColo.visible = n === 1 || n === 2 || n === 17 || n === 19;
  boiaZe.visible = false; oculosMerg.visible = false; bocaGrito.visible = false; gotaPote.visible = false; marolaPote.visible = false;
  potePipocas.forEach((m) => { m.position.set(...m.userData.base); m.rotation.set(0, 0, 0); });
  casa.ze.juntas.tronco.rotation.y = 0;
  cen.sala.sofa.position.y = n === 2 ? subidaSofa(t) : 0;
  atualizarAbertura(t, n);
  if (n !== 1 && n !== 2) { RACH.forEach((q) => { q.m.visible = false; }); lascasRach.forEach((m) => { m.visible = false; }); }   // a rachadura so existe nos takes 1 e 2
  if (n === 1 || n === 2) {                           // a trinca do sala.js fica escondida; a rachadura propria cresce do centro em 0,5 s (frente de propagacao R)
    cen.sala.teto.userData.segs.forEach((m) => { m.visible = false; });
    const r = ramp(t, T.estalo, T.estalo + 0.5), Rr = 7 * (1 - (1 - r) ** 2), vg = mundo(t, n).sala.vergar;
    RACH.forEach((q) => {
      const u = clamp01((Rr - q.d0) / q.len); q.m.visible = u > 0;
      if (u <= 0) return;
      const cx = q.ax + (q.bx - q.ax) * u / 2, cz = q.az + (q.bz - q.az) * u / 2, sino = Math.exp(-(cx * cx / (2 * 3.2 * 3.2) + cz * cz / (2 * 2.6 * 2.6)));
      q.m.position.set(cx, Math.min(S(5.36), S(5.47 - vg * 0.7 * sino)), cz); q.m.rotation.y = -Math.atan2(q.bz - q.az, q.bx - q.ax); q.m.scale.set(q.len * u, 1, 1);
    });
    lascasRach.forEach((m, i) => { const d = m.userData, dt = t - d.t0, ok = n === 1 && dt > 0 && dt < 1.0;
      m.visible = ok; if (ok) { m.position.set(d.x + 0.3 * (hash(i, 8) - 0.5) * dt, S(5.3) - 4.5 * dt * dt, d.z); m.rotation.set(dt * 6 + i, dt * 4, 0); } });
  }
  guardaChuva.visible = n === 14 && t >= 97.9;
  if (n === 1 || n === 2 || n === 19 || n === 17) zeSala(t, take);
  else if (n === 5) zeTelhado5(t);
  else if (n === 6) zeTroca6(t);
  else if (n === 14) zeCorte14(t);
  else if (n === 7 || n === 8 || n === 9 || n === 10 || n === 11 || n === 12 || n === 15 || n === 16) atuarMundo(t, take);
  else { esconder(casa); esconder(obra); }
  // nuvem da troca de figurino (take 6)
  const nu = n === 6 ? ramp(t, 35.55, 35.85) : 0;
  nuvem.visible = nu > 0 && nu < 1;
  nuvem.position.set(-9.0, 1.6, 13.0);
  nuvem.children.forEach((m, i) => { const d = m.userData.dir, r = 0.5 + 1.0 * nu; m.position.set(d[0] * r, d[1] * r * 1.6, d[2] * r); m.rotation.set(nu * 4 + i, nu * 3, 0); m.scale.setScalar(1 - 0.5 * nu); m.material.opacity = 0.6 * (1 - nu); });
  if (CT) CT.take = CT.take ?? n;
  destaques.atualizar(t);
  return take;
}
// distancia mao -> alvo no quadro t (para o teste de contatos)
function medirContato(t) {
  updateAt(t);
  if (!CT) return null;
  if (CT.tipo === 'afundar') return { take: 7, tipo: 'afundar', afundamento: +(CT.soloY - CT.sola).toFixed(3) };
  if (CT.tipo === 'regua') return { take: 11, tipo: 'regua', distancia: +Math.abs(CT.ponta.y - CT.alvoY).toFixed(3) };
  if (CT.tipo === 'dedao') return { take: 16, tipo: 'dedao', distancia: +Math.abs(CT.y - CT.agua).toFixed(3) };
  CT.ator.ze.raiz.updateWorldMatrix(true, true);
  const mao = CT.ator.ze.maos[CT.mao].getWorldPosition(new THREE.Vector3());
  return { take: CT.take, mao: CT.mao, distancia: +mao.distanceTo(CT.alvo).toFixed(3) };
}

// ---------- camera: unica fonte e camera.json ----------
const keys = cameraData?.keyframes ?? null;
function poseCamera(t) {
  if (!keys) return { position: [26, 38, 90], target: [0, 36, 0], fov: 40 };
  let i = keys.length - 1; while (i > 0 && t < keys[i].tempo) i--;
  return samplePose(keys[i].samples, t);
}
function draw(t) {
  const take = updateAt(t);
  const pose = (take.take === 1 || take.take === 2) ? poseAbertura(t) : poseCamera(t);
  camera.position.set(...pose.position);
  camera.fov = pose.fov; camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0); camera.lookAt(...pose.target);
  if (pose.roll) camera.rotateZ(pose.roll);
  cen.ambiente.updateAt(mundo(t, take.take).hora);     // o ambiente repoe a luz em coordenadas absolutas a cada quadro
  fixarLuz();
  renderer.render(scene, camera);
  return { take: take.take };
}
window.drawScene = draw;
window.updateAt = updateAt;
window.medirContato = medirContato;
window.__cena = { scene, camera, renderer, cen, OBJ, PALCO, JAN, casa, obra, TK, tempos, ORDEM, ROOF_Y, SALA_Y, THREE };
window.addEventListener('hf-seek', (event) => draw(event.detail.time));
draw(0);
export { updateAt, draw, OBJ, PALCO };
