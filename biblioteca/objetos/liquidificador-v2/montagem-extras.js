import * as THREE from 'three';

/**
 * Extras do liquidificador v2 para a montagem do vídeo 09. Arquivo novo; liquidificador-v2.js não muda.
 * Todos os objetos são criados escondidos; quem liga/desliga é a montagem, sempre como função do tempo.
 *   criarExtrasLiquidificador(L)  eixo fundido (copo preso ao motor), haste-guia do acoplamento, anel de corte,
 *                                  jato de vitamina (24 gotas), brilho (estrelas).
 *   criarTigela()                  tigela de cerâmica com UMA banana inteira (abertura do vídeo).
 *   criarGarfo()                   garfo para a mão do Zé (eixo local -y = sentido da pega para a ponta).
 * 1 u = 0,5 m; alturas relativas ao balcão (y = 0 no tampo).
 */
const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, flatShading: true, ...extra });
const basico = (c, extra = {}) => new THREE.MeshBasicMaterial({ color: c, ...extra });

export function criarExtrasLiquidificador(L) {
  const cyl = (r, y0, y1, m, pai = L.raiz) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 8), m); o.position.y = (y0 + y1) / 2; pai.add(o); return o; };
  const eixo = mat(0xcfd7da);
  const fundido = cyl(0.02, 0.30, 0.46, eixo); fundido.name = 'eixoFundido';           // copo preso: um eixo só
  const inferior = cyl(0.02, 0.30, 0.34, eixo); inferior.name = 'eixoInferior'; inferior.visible = false;   // metade que fica no motor
  const guia = cyl(0.014, 0.36, 0.52, mat(0xa9b6bb)); guia.name = 'hasteGuia'; guia.visible = false;        // guia o copo ao subir e descer
  const anel = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 16), basico(0xffb347)); anel.rotation.x = Math.PI / 2; anel.position.y = 0.38; anel.name = 'anelCorte'; anel.visible = false; L.raiz.add(anel);
  const gotas = Array.from({ length: 24 }, (_, i) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03 + (i % 3) * 0.008, 0), mat(0xf06d8a)); m.visible = false; m.name = 'gotaJato' + i; return m; });
  const estrela = new THREE.Shape(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 0.015 : 0.05, a = i * Math.PI / 4; i ? estrela.lineTo(Math.cos(a) * r, Math.sin(a) * r) : estrela.moveTo(r, 0); }
  const estrelas = Array.from({ length: 5 }, (_, i) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(estrela), basico(i % 2 ? 0xfff6c8 : 0xffffff, { side: THREE.DoubleSide })); m.visible = false; m.name = 'brilho' + i; return m; });
  return { fundido, inferior, guia, anel, gotas, estrelas };
}

export function criarTigela() {
  const g = new THREE.Group(); g.name = 'tigela';
  const m = mat(0x1f9aa6, { side: THREE.DoubleSide });
  const casco = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.17, 0.17, 12, 1, true), m); casco.position.y = 0.0 + 0.085 + 0.01; g.add(casco);
  const fundo = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 12), m); fundo.position.y = 0.01; g.add(fundo);
  // banana comprida atravessada na boca da tigela: as duas pontas pousam na borda (raio da boca 0,30; borda em y = 0,19)
  const banana = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.46, 2, 6), mat(0xf6d64a)); banana.name = 'bananaInteira';
  banana.rotation.z = Math.PI / 2; banana.position.set(0, 0.19 + 0.04, 0); g.add(banana);
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.04, 5), mat(0x7a5a2e)); cabo.position.set(0.31, 0.25, 0); cabo.rotation.z = -0.8; g.add(cabo);
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), basico(0x1d1b2a, { transparent: true, opacity: 0.16 })); sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.002; g.add(sombra);
  g.userData.banana = banana;
  return g;
}

// Garfo na mão do Zé: cabo ao longo de -y (a partir da mão), cabeça com 4 dentes na ponta. Comprimento ~0,62 u locais da mão.
export function criarGarfo() {
  const g = new THREE.Group(); g.name = 'garfo';
  const metal = mat(0xe4eaec, { emissive: 0x333b3e });
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6), metal); cabo.position.y = -0.1; g.add(cabo);
  const ponte = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.04), metal); ponte.position.y = -0.37; g.add(ponte);
  for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.2, 0.03), metal); d.position.set(-0.105 + i * 0.07, -0.495, 0); g.add(d); }
  return g;
}
