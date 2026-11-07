/**
 * CENÁRIO: lavanderia — Mundo100Manual (vídeo da máquina de lavar)
 * Tons apagados (creme, cinza-azulado, azulejo claro) para as peças coloridas aparecerem.
 * Todo objeto tem volume e encosta no chão ou na parede (regra do kit: nada fino nem flutuando).
 * Escala: 1 unidade ≈ 0,5 m. Chão em y = 0. Parede do fundo com a face em z = PAREDE_Z.
 */
import * as THREE from 'three';
import { criarPeca, criarCasca } from '../../efeitos/contorno-toon.js';

export const PAREDE_Z = -2.55;
export const LAYOUT = Object.freeze({
  maquina: [0.9, -1.3],            // x, z (a máquina encosta 1,25 na frente da parede)
  tanque: [-2.7, -2.0],            // tanque de lavar roupa
  zeTanque: [-4.05, -1.9],        // Zé esfregando roupa
  zeMaquina: [-1.05, -0.3],       // Zé ao lado da máquina
});

export const CORES_CENARIO = Object.freeze({
  contorno: 0x1d1b2a,
  piso: 0xe6e0d3, rejuntePiso: 0xc9c1b1,
  azulejo: 0xf3f5f2, rejunte: 0xc9cfcc, pintura: 0xe3e8e4, rodape: 0xb9c0bd,
  concreto: 0xbfb9ae, concretoEscuro: 0xa8a297,
  metal: 0xc9d1d9, balde: 0x8fa3b8, cestoRoupa: 0xc79a6b,
  prateleira: 0xd8c7a6, sabaoA: 0xe9a8a0, sabaoB: 0xa9c7e0, sabaoC: 0xf1e3b0,
  agua: 0x5aa9f0,
  roupas: [0xffffff, 0xf3b0c3, 0xc9b6f0, 0xf7d9a0, 0x9fd8b5],
});

const ESP = 0.012;
const cache = new Map();
function mat(cor, o = {}) {
  const k = `${cor}|${o.transp ? 1 : 0}|${o.opacidade ?? 1}`;
  if (!cache.has(k)) {
    cache.set(k, new THREE.MeshStandardMaterial({
      color: cor, roughness: 0.85, metalness: 0, flatShading: true,
      transparent: !!o.transp, opacity: o.opacidade ?? 1, depthWrite: !o.transp,
    }));
  }
  return cache.get(k);
}
function peca(geo, cor, pai, pos = [0, 0, 0], rot = [0, 0, 0], o = {}) {
  const g = criarPeca(geo, mat(cor, o), { espessura: ESP, contorno: o.contorno !== false });
  g.position.set(...pos); g.rotation.set(...rot);
  pai.add(g);
  return g;
}
const caixa = (l, a, p) => new THREE.BoxGeometry(l, a, p);
const cil = (r, a, s = 10) => new THREE.CylinderGeometry(r, r, a, s);
const bola = (r) => new THREE.IcosahedronGeometry(r, 0);

/** Grade de ladrilhos com rejunte (InstancedMesh). */
function ladrilhos(pai, { nx, ny, tam, cor, origem, plano }) {
  const geo = plano === 'chao' ? caixa(tam * 0.94, 0.03, tam * 0.94) : caixa(tam * 0.94, tam * 0.94, 0.03);
  const im = new THREE.InstancedMesh(geo, mat(cor), nx * ny);
  const m4 = new THREE.Matrix4();
  let i = 0;
  for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++) {
    const p = plano === 'chao'
      ? [origem[0] + (a + 0.5) * tam, origem[1], origem[2] + (b + 0.5) * tam]
      : [origem[0] + (a + 0.5) * tam, origem[1] + (b + 0.5) * tam, origem[2]];
    m4.makeTranslation(...p);
    im.setMatrixAt(i++, m4);
  }
  pai.add(im);
  const shell = criarCasca(geo);
  const outline = new THREE.InstancedMesh(geo, shell.material, nx * ny);
  const shellMatrix = new THREE.Matrix4().compose(shell.position, shell.quaternion, shell.scale);
  const instanceMatrix = new THREE.Matrix4();
  for (let j = 0; j < nx * ny; j++) {
    im.getMatrixAt(j, instanceMatrix);
    outline.setMatrixAt(j, instanceMatrix.multiply(shellMatrix));
  }
  pai.add(outline);
  return im;
}

export function criarLavanderia() {
  const C = CORES_CENARIO;
  const raiz = new THREE.Group();
  raiz.name = 'lavanderia';

  // chão: laje grossa + piso
  peca(caixa(16, 0.4, 13), C.rejuntePiso, raiz, [0, -0.2, 3.5], [0, 0, 0], {});
  ladrilhos(raiz, { nx: 16, ny: 13, tam: 1, cor: C.piso, origem: [-8, 0.0, PAREDE_Z - 0.0], plano: 'chao' });

  // parede do fundo: azulejo até 3,2, pintura em cima, rodapé
  peca(caixa(16, 10, 0.4), C.rejunte, raiz, [0, 5, PAREDE_Z - 0.2], [0, 0, 0], {});
  ladrilhos(raiz, { nx: 32, ny: 7, tam: 0.5, cor: C.azulejo, origem: [-8, 0, PAREDE_Z + 0.015], plano: 'parede' });
  peca(caixa(16, 6.5, 0.06), C.pintura, raiz, [0, 3.5 + 3.25, PAREDE_Z + 0.03], [0, 0, 0], {});
  peca(caixa(16, 0.12, 0.1), C.rodape, raiz, [0, 3.5, PAREDE_Z + 0.06]);

  // sem parede na esquerda: a câmera precisa ver o Zé de frente no tanque

  // ---------------- tanque de lavar roupa ----------------
  const tanque = new THREE.Group();
  tanque.position.set(LAYOUT.tanque[0], 0, LAYOUT.tanque[1]);
  raiz.add(tanque);
  peca(caixa(0.7, 1.55, 0.6), C.concretoEscuro, tanque, [0.15, 0.775, -0.1]);       // coluna
  peca(caixa(1.6, 0.16, 1.1), C.concreto, tanque, [0, 1.63, 0]);                    // fundo
  peca(caixa(1.6, 0.5, 0.12), C.concreto, tanque, [0, 1.96, 0.49]);                 // frente
  peca(caixa(1.6, 0.5, 0.12), C.concreto, tanque, [0, 1.96, -0.49]);                // fundo
  peca(caixa(0.12, 0.5, 1.1), C.concreto, tanque, [-0.74, 1.96, 0]);                // lado esq.
  peca(caixa(0.12, 0.5, 1.1), C.concreto, tanque, [0.74, 1.96, 0]);                 // lado dir.
  peca(caixa(0.1, 0.5, 0.86), C.concreto, tanque, [-0.05, 1.96, 0]);                // divisória
  // esfregador inclinado com ondinhas (metade esquerda)
  const esfregador = new THREE.Group();
  esfregador.position.set(-0.4, 1.95, 0);
  esfregador.rotation.x = -0.35;
  tanque.add(esfregador);
  peca(caixa(0.56, 0.1, 0.8), C.concreto, esfregador);
  for (let i = 0; i < 6; i++) peca(caixa(0.5, 0.06, 0.06), C.concretoEscuro, esfregador, [0, 0.07, -0.3 + i * 0.12]);
  // água na bacia (metade direita)
  const aguaTanque = peca(caixa(0.56, 0.3, 0.84), C.agua, tanque, [0.36, 1.86, 0], [0, 0, 0], { transp: true, opacidade: 0.5 });
  // torneira na parede
  const torneiraT = new THREE.Group();
  torneiraT.position.set(LAYOUT.tanque[0] + 0.36, 2.95, PAREDE_Z + 0.05);
  raiz.add(torneiraT);
  peca(cil(0.05, 0.25, 8), C.metal, torneiraT, [0, 0, 0.12], [Math.PI / 2, 0, 0]);
  peca(cil(0.04, 0.2, 8), C.metal, torneiraT, [0, -0.08, 0.24]);
  peca(caixa(0.22, 0.05, 0.05), C.metal, torneiraT, [0, 0.07, 0.06]);
  // roupa sendo esfregada (o Zé pode segurar este objeto)
  const roupaEsfregada = peca(bola(0.16), C.roupas[1], raiz, [0, 0, 0]);
  roupaEsfregada.scale.set(1.4, 0.5, 1);

  // ---------------- cesto de roupa suja ----------------
  const cestoRoupa = new THREE.Group();
  cestoRoupa.position.set(-5.3, 0, -1.2);
  raiz.add(cestoRoupa);
  peca(new THREE.CylinderGeometry(0.42, 0.34, 0.8, 8), C.cestoRoupa, cestoRoupa, [0, 0.4, 0]);
  for (let i = 0; i < 4; i++) peca(new THREE.TorusGeometry(0.36 + i * 0.02, 0.02, 4, 8), 0xb3875a, cestoRoupa, [0, 0.15 + i * 0.2, 0], [Math.PI / 2, 0, 0], {});
  C.roupas.forEach((cor, i) => {
    const g = peca(bola(0.18), cor, cestoRoupa, [Math.sin(i * 1.3) * 0.18, 0.85 + (i % 2) * 0.08, Math.cos(i * 1.3) * 0.18], [i, i * 0.5, 0]);
    g.scale.set(1.3, 0.55, 1);
  });

  // ---------------- balde ----------------
  const balde = new THREE.Group();
  balde.position.set(-1.0, 0, -2.0);
  raiz.add(balde);
  peca(new THREE.CylinderGeometry(0.32, 0.26, 0.6, 10), C.balde, balde, [0, 0.3, 0]);
  peca(new THREE.TorusGeometry(0.31, 0.025, 4, 10, Math.PI), C.metal, balde, [0, 0.62, 0], [0, 0, 0], {});

  // ---------------- prateleira com sabão ----------------
  const prat = new THREE.Group();
  prat.position.set(-2.4, 4.0, PAREDE_Z + 0.3);
  raiz.add(prat);
  peca(caixa(2.0, 0.14, 0.55), C.prateleira, prat);
  peca(caixa(0.1, 0.4, 0.4), C.prateleira, prat, [-0.8, -0.27, -0.06]);
  peca(caixa(0.1, 0.4, 0.4), C.prateleira, prat, [0.8, -0.27, -0.06]);
  peca(caixa(0.4, 0.55, 0.3), C.sabaoA, prat, [-0.55, 0.345, 0]);
  peca(caixa(0.32, 0.42, 0.26), C.sabaoB, prat, [-0.05, 0.28, 0]);
  peca(cil(0.14, 0.5, 8), C.sabaoC, prat, [0.45, 0.32, 0]);

  // ---------------- cano de esgoto na parede (para a mangueira de saída) ----------------
  peca(cil(0.09, 1.4, 10), 0xd0d5d8, raiz, [LAYOUT.maquina[0] - 0.5, 0.95, PAREDE_Z + 0.12]);
  peca(cil(0.12, 0.12, 10), 0xd0d5d8, raiz, [LAYOUT.maquina[0] - 0.5, 1.68, PAREDE_Z + 0.12]);

  return {
    raiz,
    tanque, roupaEsfregada, aguaTanque, cestoRoupa, balde,
    /** Água do tanque balançando enquanto o Zé esfrega. */
    atualizar(t, { esfregando = 0 } = {}) {
      aguaTanque.position.y = 1.86 + 0.015 * esfregando * Math.sin(t * 9);
      aguaTanque.rotation.z = 0.02 * esfregando * Math.sin(t * 7);
    },
  };
}
