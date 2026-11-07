import * as THREE from 'three';

/**
 * Cozinha v2 para o vídeo 09: 1 u = 0,5 m (a v1 é 1 u = 1 m). Chão em y = 0; tampo do balcão em y = 1,8 (90 cm).
 * Parede ao fundo em z = -1,05; balcão com pia à direita (x -0,35..3,6); zona livre do Zé à esquerda (x < -0,35).
 * Retorna { raiz, balcaoY, objetoPos, ZONA_ZE } — o liquidificador entra em objetoPos.
 */
export const BALCAO_Y = 1.8;
export function criarCozinha2() {
  const raiz = new THREE.Group(); raiz.name = 'cozinha-v2';
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true });
  const box = (nome, x, y, z, m, px, py, pz, pai = raiz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(x, y, z), m); o.name = nome; o.position.set(px, py, pz); pai.add(o); return o; };
  const parede = mat(0xf3e6c4), azulejo = mat(0xfbf7ec), rejunte = mat(0xd9d2bd), madeira = mat(0xc5a582), armario = mat(0xe9e7de), inox = mat(0xaebbc0), escuro = mat(0x30343b);
  const chao1 = mat(0xe3e6e1), chao2 = mat(0xc9d2cf);

  // chão: xadrez de 0,5 u; parede de fundo e faixa de azulejo atrás do balcão
  for (let i = 0; i < 16; i++) for (let j = 0; j < 14; j++) box(`piso${i}-${j}`, 0.5, 0.04, 0.5, (i + j) % 2 ? chao1 : chao2, -3.75 + i * 0.5 + 0.25, -0.02, -1.0 + j * 0.5 + 0.25);
  box('parede', 8, 7, 0.08, parede, 0.25, 3.5, -1.09);
  for (let i = 0; i < 18; i++) for (let j = 0; j < 4; j++) box(`azulejo${i}-${j}`, 0.22, 0.22, 0.02, azulejo, -0.1 + i * 0.25, BALCAO_Y + 0.16 + j * 0.25, -1.04);

  // balcão com 3 portas, tampo de madeira e pia
  const bal = new THREE.Group(); bal.name = 'balcao'; raiz.add(bal);
  box('corpo', 3.95, 1.77, 1.2, armario, 1.625, 0.885, -0.4, bal);
  for (let i = 0; i < 5; i++) { box('porta' + i, 0.7, 1.4, 0.03, armario, 0.0 + i * 0.78 + 0.2, 0.9, 0.215, bal); box('puxador' + i, 0.3, 0.04, 0.04, escuro, 0.0 + i * 0.78 + 0.2, 1.4, 0.245, bal); }
  box('tampo', 4.05, 0.06, 1.3, madeira, 1.625, BALCAO_Y - 0.03, -0.4, bal);
  box('cuba', 0.9, 0.012, 0.65, inox, 2.8, BALCAO_Y + 0.006, -0.4, bal);
  box('torneiraBase', 0.06, 0.4, 0.06, inox, 2.8, BALCAO_Y + 0.2, -0.85, bal);
  box('torneiraBico', 0.06, 0.05, 0.3, inox, 2.8, BALCAO_Y + 0.38, -0.7, bal);

  // fruteira (fundo) e pano de prato
  const fruteira = new THREE.Group(); fruteira.name = 'fruteira'; fruteira.position.set(1.4, BALCAO_Y, -0.6); raiz.add(fruteira);
  const tijela = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.16, 0.14, 10), mat(0x1f9aa6)); tijela.position.y = 0.07; fruteira.add(tijela);
  [[-0.08, 0xf6d64a], [0.08, 0xe0364a], [0, 0xf4a72b]].forEach(([x, c], i) => { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), mat(c)); f.position.set(x, 0.19 + (i === 2 ? 0.07 : 0), i === 2 ? 0 : 0.03); fruteira.add(f); });
  box('pano', 0.3, 0.5, 0.012, mat(0xe0364a), 0.2, 1.3, 0.235, bal);

  // janela na parede, longe da zona do Zé
  box('janelaMoldura', 1.0, 0.9, 0.04, madeira, -1.45, 2.9, -1.02); box('janelaVidro', 0.88, 0.78, 0.03, mat(0xbfe3f2), -1.45, 2.9, -1.0);
  box('janelaBarraV', 0.04, 0.78, 0.02, armario, -1.45, 2.9, -0.98); box('janelaBarraH', 0.88, 0.04, 0.02, armario, -1.45, 2.9, -0.98);

  // sombras de contato (discos) sob o balcão e a fruteira
  const sombra = (r, x, y, z) => { const s = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color: 0x1d1b2a, transparent: true, opacity: 0.16 })); s.rotation.x = -Math.PI / 2; s.position.set(x, y, z); s.scale.set(1, 0.8, 1); raiz.add(s); return s; };
  sombra(0.32, 1.4, BALCAO_Y + 0.002, -0.6);

  return { raiz, balcaoY: BALCAO_Y, objetoPos: new THREE.Vector3(0.5, BALCAO_Y, -0.35), ZONA_ZE: { x0: -3.5, x1: -0.4 } };
}
