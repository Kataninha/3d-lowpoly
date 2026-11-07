// Ceu + luz do video 13. hora 0 = manha clara, 1 = entardecer quente. Funcao pura de hora.
// API: const amb = criarAmbiente(scene); amb.updateAt(hora)
import * as THREE from 'three';

const lerp = (a, b, k) => a + (b - a) * k;
export function criarAmbiente(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x7d756e, 1.6), sol = new THREE.DirectionalLight(0xffffff, 2.6);
  sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -60, right: 60, top: 100, bottom: -20, near: 1, far: 400 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.05;
  scene.add(hemi, sol, sol.target);
  const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 256;
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; scene.background = tex;
  const M = [['#6fb2ee', '#b6dcf6', '#e8f4fb'], ['#6f93b8', '#e7b39a', '#f6c48e']], K = { chave: -1 };
  const mix = (a, b, k) => '#' + [1, 3, 5].map((i) => Math.round(lerp(parseInt(a.substr(i, 2), 16), parseInt(b.substr(i, 2), 16), k)).toString(16).padStart(2, '0')).join('');
  return {
    hemi, sol,
    updateAt(hora) {
      const k = Math.max(0, Math.min(1, hora)), q = Math.round(k * 40) / 40;
      if (K.chave !== q) {
        K.chave = q; const c = canvas.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 256);
        [0, 0.55, 1].forEach((p, i) => g.addColorStop(p, mix(M[0][i], M[1][i], q)));
        c.fillStyle = g; c.fillRect(0, 0, 8, 256); tex.needsUpdate = true;
      }
      sol.color.set(mix('#fff6e0', '#ffd7a8', k)); sol.intensity = lerp(2.8, 2.3, k);
      sol.position.set(lerp(30, -60, k), lerp(110, 45, k), lerp(50, 30, k));
      hemi.color.set(mix('#e7f3ff', '#ffeedd', k)); hemi.intensity = lerp(1.7, 1.5, k);
    },
  };
}
