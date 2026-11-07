import * as THREE from 'three';

// Same inverted-hull geometry convention used by the laundry reference.
export const COR_CONTORNO = 0x1d1b2a;
export function criarCasca(geometry, { espessura = 0.012, opacidade = 1 } = {}) {
  geometry.computeBoundingBox();
  const size = new THREE.Vector3(), center = new THREE.Vector3();
  geometry.boundingBox.getSize(size); geometry.boundingBox.getCenter(center);
  const factor = v => (v + 2 * espessura) / Math.max(v, 1e-3);
  const material = new THREE.MeshBasicMaterial({ color: COR_CONTORNO, side: THREE.BackSide, transparent: opacidade < 1, opacity: opacidade, depthWrite: opacidade === 1 });
  const shell = new THREE.Mesh(geometry, material);
  shell.scale.set(factor(size.x), factor(size.y), factor(size.z));
  shell.position.set(center.x * (1-shell.scale.x), center.y * (1-shell.scale.y), center.z * (1-shell.scale.z));
  return shell;
}
export function criarPeca(geometry, material, { espessura = 0.012, contorno = true } = {}) {
  const group = new THREE.Group();
  const malha = new THREE.Mesh(geometry, material);
  group.add(malha);
  const casca = contorno ? criarCasca(geometry, { espessura }) : null;
  if (casca) group.add(casca);
  group.userData.malha = malha;
  group.userData.casca = casca;
  return group;
}
