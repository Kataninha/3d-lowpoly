// Corte real com tampa: clippingPlanes por objeto (materiais clonados so nas pecas cortadas) + face solida no plano de corte, com a cor do material.
// API: const corte = criarCorte(capParent);   // capParent = Group na raiz do mundo (transformacao identidade)
//      corte.aplicar(root, plane | null);     // plane com normal alinhada a x ou z; null remove corte e tampas. renderer.localClippingEnabled = true
// Tampas: Box alinhada aos eixos que o plano atravessa vira um retangulo; o forro deformavel (laje-teto) vira uma faixa com o perfil real.
// Limites: formas nao-caixa (esferas, icosaedros, cilindros) e caixas giradas ficam ocas; vidro (transparente) nao ganha tampa.
import * as THREE from 'three';

const eixoDe = (n) => { const a = [n.x, n.y, n.z].findIndex((v) => Math.abs(v) > 0.999); return a; };
const visivel = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
const alinhado = (m) => { const e = m.elements, lin = [[0, 1, 2], [4, 5, 6], [8, 9, 10]]; return lin.every((r) => r.filter((i) => Math.abs(e[i]) > 1e-4).length === 1); };

export function criarCorte(capParent) {
  const clones = new WeakMap(), capMats = new Map(), tampas = [];
  const matTampa = (src) => {
    const k = src.color.getHexString() + '|' + src.emissive.getHexString() + '|' + src.emissiveIntensity;
    if (!capMats.has(k)) capMats.set(k, new THREE.MeshStandardMaterial({ color: src.color, emissive: src.emissive, emissiveIntensity: src.emissiveIntensity, flatShading: true, roughness: 0.9, side: THREE.DoubleSide }));
    return capMats.get(k);
  };
  const sinc = (c, s) => { c.opacity = s.opacity; c.transparent = s.transparent; c.depthWrite = s.depthWrite; if (s.color) c.color.copy(s.color); if (s.emissive) { c.emissive.copy(s.emissive); c.emissiveIntensity = s.emissiveIntensity; } };
  const limpar = () => { while (tampas.length) { const m = tampas.pop(); capParent.remove(m); m.geometry.dispose(); } };
  const tampa = (geo, src) => { const m = new THREE.Mesh(geo, matTampa(src)); m.userData.tampa = true; m.castShadow = false; m.receiveShadow = true; capParent.add(m); tampas.push(m); };

  return {
    aplicar(root, plane) {
      limpar();
      const a = plane ? eixoDe(plane.normal) : -1, pv = plane ? -plane.constant / [plane.normal.x, plane.normal.y, plane.normal.z][a] : 0;
      if (plane && a === 1) throw new Error('corte: use plano com normal em x ou z');
      root.traverse((o) => {
        if (!o.isMesh || o.userData.tampa) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        // restaura quando o corte sai
        if (!plane) { if (o.userData.__cortado && mats.includes(o.userData.__cortado)) o.material = o.userData.__src; return; }
        // clona por (objeto, material de origem): o plano nao vaza para pecas fora do corte
        let mapa = clones.get(o); if (!mapa) clones.set(o, mapa = new Map());
        const novos = mats.map((s) => {
          if (s.userData.__ehClone) return s;
          let c = mapa.get(s);
          if (!c) { c = s.clone(); c.userData.__ehClone = true; c.clippingPlanes = [plane]; c.side = THREE.DoubleSide; mapa.set(s, c); }
          c.clippingPlanes = [plane]; sinc(c, s); return c;
        });
        if (!mats[0].userData.__ehClone) o.userData.__src = o.material;
        o.material = Array.isArray(o.material) ? novos : novos[0]; o.userData.__cortado = novos[0];
        // tampa
        const src = mats[0];
        if (!visivel(o) || src.transparent || !src.isMeshStandardMaterial) return;
        o.updateWorldMatrix(true, false);
        if (o.name === 'laje-teto') return void tampaTeto(o, a, pv, src);
        if (o.geometry.type !== 'BoxGeometry' || !alinhado(o.matrixWorld)) return;
        const b = new THREE.Box3().setFromObject(o), lo = [b.min.x, b.min.y, b.min.z], hi = [b.max.x, b.max.y, b.max.z];
        if (!(lo[a] + 1e-4 < pv && pv < hi[a] - 1e-4)) return;
        const u = a === 0 ? 2 : 0, w = hi[u] - lo[u], h = hi[1] - lo[1];
        const g = new THREE.PlaneGeometry(w, h);
        if (a === 0) g.rotateY(Math.PI / 2);
        g.translate(a === 0 ? pv : (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, a === 0 ? (lo[2] + hi[2]) / 2 : pv);
        tampa(g, src);
      });
      // desfaz o material original quando o corte sai: feito na passada com plane === null (acima)
      function tampaTeto(o, a, pv, src) {
        const pos = o.geometry.attributes.position, v = new THREE.Vector3(), col = new Map(), u = a === 0 ? 2 : 0;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
          if (Math.abs(v.getComponent(a) - pv) > 1e-3) continue;
          const k = v.getComponent(u).toFixed(3), e = col.get(k) ?? { u: v.getComponent(u), lo: 1e9, hi: -1e9 };
          e.lo = Math.min(e.lo, v.y); e.hi = Math.max(e.hi, v.y); col.set(k, e);
        }
        const cs = [...col.values()].sort((p, q) => p.u - q.u);
        if (cs.length < 2) return;
        const P = [], I = [];
        cs.forEach((c, i) => { for (const y of [c.lo, c.hi]) { const p = [0, 0, 0]; p[a] = pv; p[u] = c.u; p[1] = y; P.push(...p); } if (i) { const k = 2 * i; I.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
        tampa(g, src);
      }
    },
  };
}
