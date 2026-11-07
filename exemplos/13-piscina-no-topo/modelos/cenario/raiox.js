// Raio-X da torre: casca de vidro translucida (camadaTranslucida) + brilho de borda + varredura de luz + corte real (clippingPlanes).
// API: const rx = criarRaioX(torre);
//   rx.updateAt(t, { t0, dur, opacidade = .25, varrer = .4 })  -> funcao pura do tempo; fora da janela [t0, t0+dur] tudo volta ao normal
//   rx.cortar(root, plane | null)  -> corte real com tampa solida (ver corte.js); materiais clonados so nas pecas cortadas (renderer.localClippingEnabled = true)
import * as THREE from 'three';
import { camadaTranslucida } from '../../kit/efeitos/montagem-unidades.js';
import { TORRE } from './torre.js';
import { clamp01 } from './util.js';
import { criarCorte } from './corte.js';

export function criarRaioX(torre) {
  const { W, D, H, N, laje, yCobertura } = TORRE;
  const bordaMat = new THREE.MeshBasicMaterial({ color: 0x8ff3ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const bordas = new THREE.Group(); bordas.name = 'bordas-raiox'; torre.group.add(bordas);
  const barra = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bordaMat); m.position.set(x, y, z); bordas.add(m); };
  const e = 0.16;
  for (let i = 0; i <= N; i++) {
    const y = i * H + (i === N ? laje : 0);
    for (const z of [-D / 2, D / 2]) barra(W + e, e, e, 0, y, z);
    for (const x of [-W / 2, W / 2]) barra(e, e, D + e, x, y, 0);
  }
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) barra(e, yCobertura + laje, e, x, (yCobertura + laje) / 2, z);
  const varMat = new THREE.MeshBasicMaterial({ color: 0xb9f7ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const varredura = new THREE.Mesh(new THREE.BoxGeometry(W + 4, 0.3, D + 4), varMat); varredura.name = 'varredura'; varredura.visible = false; torre.group.add(varredura);
  const topo = yCobertura + 6;
  const tampas = new THREE.Group(); tampas.name = 'tampas-corte'; torre.group.add(tampas);
  const corte = criarCorte(tampas);
  return {
    bordas, varredura,
    updateAt(t, { t0, dur, opacidade = 0.25, varrer = 0.4 }) {
      for (const c of torre.cascas) camadaTranslucida(c, t, { t0, dur, opacidade });
      const ativo = t > t0 && t < t0 + dur;
      bordaMat.opacity = ativo ? 0.85 * clamp01(Math.min((t - t0) / 0.3, (t0 + dur - t) / 0.3)) : 0;
      const u = clamp01((t - t0) / varrer);
      varredura.visible = t >= t0 && t <= t0 + varrer;
      varredura.position.y = topo * (1 - u);
      varMat.opacity = 0.55 * Math.sin(Math.PI * u);
    },
    cortar(root, plane) { corte.aplicar(root, plane); },
  };
}
