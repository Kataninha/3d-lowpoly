import * as THREE from 'three';

/**
 * Extras da cozinha v2 (vídeo 09). Arquivo novo; cozinha-v2.js não muda. 1 u = 0,5 m.
 * Tudo é função pura do tempo/progresso (seek em qualquer ordem). Sem Math.random.
 *   criarGeladeira()           geladeira ao fundo, à esquerda, com ímã e bilhete.
 *   criarTomada(x, y)          placa de tomada na parede (z = -1,05).
 *   criarMancha()              mancha de vitamina na parede; .set(p) 0..1 (cresce em ~0,4 s de p).
 *   criarFioParaTomada(base)   cabo do aparelho até a tomada; .set(p) 0..1 desenha ao longo do cabo.
 *   criarAgua()                fio de água da torneira até o aparelho na pia; .set(p, t).
 */
const cl = x => Math.max(0, Math.min(1, x));
const sm = x => x * x * (3 - 2 * x);
const ramp = (t, a, b) => cl((t - a) / (b - a));
const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true, ...extra });
const h = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

export const PAREDE_Z = -1.05;           // face da parede lisa (acima dos azulejos)
export const SIA = { x: 2.8, y: 1.812, z: -0.2 };   // ponto do aparelho na pia (centro da cuba)

export function criarGeladeira() {
  const g = new THREE.Group(); g.name = 'geladeira'; g.position.set(-2.55, 0, -0.6);
  const box = (x, y, z, m, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(x, y, z), m); o.position.set(px, py, pz); g.add(o); return o; };
  const corpo = mat(0xeef2f3), porta = mat(0xf7f9f9), cinza = mat(0x30343b);
  box(0.9, 3.4, 0.8, corpo, 0, 1.7, 0);
  box(0.86, 1.05, 0.03, porta, 0, 2.85, 0.415);           // porta do congelador
  box(0.86, 2.2, 0.03, porta, 0, 1.15, 0.415);            // porta da geladeira
  box(0.04, 0.5, 0.05, cinza, 0.36, 2.55, 0.455); box(0.04, 0.9, 0.05, cinza, 0.36, 1.5, 0.455);   // puxadores
  box(0.86, 0.02, 0.04, cinza, 0, 2.31, 0.43);            // fresta entre as portas
  box(0.12, 0.12, 0.03, mat(0xe0364a), -0.18, 2.95, 0.445);   // ímã vermelho
  box(0.1, 0.1, 0.03, mat(0x1f9aa6), 0.05, 2.7, 0.445);       // ímã verde
  box(0.26, 0.32, 0.01, mat(0xfff6c8), -0.05, 2.9, 0.436);    // bilhete preso
  box(0.9, 0.04, 0.8, cinza, 0, 0.02, 0);                 // rodapé
  return g;
}

export function criarTomada(x = 1.15, y = 1.97) {
  const g = new THREE.Group(); g.name = 'tomada'; g.position.set(x, y, PAREDE_Z + 0.012);
  const placa = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.024), mat(0xf4f1e4)); g.add(placa);
  for (const dx of [-0.02, 0.02]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.034, 0.004), mat(0x30343b)); p.position.set(dx, 0, 0.013); g.add(p); }
  return g;
}

export function criarMancha(x = 0.55, y = 3.3) {
  const g = new THREE.Group(); g.name = 'mancha'; g.position.set(x, y, PAREDE_Z + 0.006);
  const rosa = mat(0xe8728a, { side: THREE.DoubleSide }), claro = mat(0xf7a3b4, { side: THREE.DoubleSide });
  const parts = [];
  const disco = (r, px, py, atraso, m) => { const d = new THREE.Mesh(new THREE.CircleGeometry(1, 9), m); d.scale.set(r, r * 0.9, 1); d.position.set(px, py, parts.length * 0.0004); g.add(d); parts.push({ o: d, r, atraso, tipo: 'disco' }); };
  disco(0.34, 0, 0, 0, rosa); disco(0.2, 0, 0.02, 0.02, claro);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + h(i, 1) * 0.5, d = 0.4 + h(i, 2) * 0.15; disco(0.05 + h(i, 3) * 0.05, Math.cos(a) * d, Math.sin(a) * d, 0.05 + h(i, 4) * 0.1, rosa); }
  for (let i = 0; i < 4; i++) {                              // escorridos
    const gx = -0.22 + i * 0.15 + h(i, 5) * 0.05, comp = 0.35 + h(i, 6) * 0.45;
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.002), rosa); d.position.set(gx, -0.2, 0.001); g.add(d);
    parts.push({ o: d, comp, atraso: 0.35 + i * 0.06, tipo: 'gota', gx });
  }
  g.visible = false;
  g.userData.set = p => {
    g.visible = p > 0;
    for (const q of parts) {
      const k = sm(ramp(p, q.atraso, q.atraso + 0.4));
      if (q.tipo === 'disco') q.o.scale.set(q.r * k + 1e-4, q.r * 0.9 * k + 1e-4, 1);
      else { const c = q.comp * k + 1e-4; q.o.scale.set(1, c, 1); q.o.position.set(q.gx, -0.2 - c / 2 + 0.2, 0.001); }
    }
  };
  return g;
}

// Cabo do aparelho até a tomada: sai da base, anda no balcão e sobe a parede. `base` = Vector3 do pé do aparelho.
export function criarFioParaTomada(base, tomadaX = 1.15, tomadaY = 1.97) {
  const BY = base.y;
  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(base.x, BY + 0.06, base.z - 0.2), new THREE.Vector3(base.x + 0.06, BY + 0.016, base.z - 0.32),
    new THREE.Vector3(base.x + 0.3, BY + 0.014, base.z - 0.55), new THREE.Vector3(tomadaX - 0.05, BY + 0.014, PAREDE_Z + 0.2),
    new THREE.Vector3(tomadaX, BY + 0.05, PAREDE_Z + 0.06), new THREE.Vector3(tomadaX, tomadaY - 0.06, PAREDE_Z + 0.04),
  ]);
  const geo = new THREE.TubeGeometry(curva, 48, 0.012, 6, false), g = new THREE.Group(); g.name = 'fio';
  g.add(new THREE.Mesh(geo, mat(0x222b30)));
  const plug = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.04), mat(0x222b30)); plug.position.set(tomadaX, tomadaY - 0.01, PAREDE_Z + 0.04); g.add(plug);
  const total = geo.index.count;
  g.userData.set = p => { geo.setDrawRange(0, Math.floor(total * cl(p) / 3) * 3); plug.visible = p >= 0.98; g.visible = p > 0; };
  g.userData.curva = curva;
  return g;
}

// Fio de água: bico da torneira (2,8; 2,16; -0,55) até a parte de trás do aparelho na pia. p = progresso do jato, t = tempo para as gotas.
export function criarAgua() {
  const g = new THREE.Group(); g.name = 'agua';
  const m = new THREE.MeshBasicMaterial({ color: 0x5ac8fa, transparent: true, opacity: 0.85 });
  const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(SIA.x, 2.16, -0.55), new THREE.Vector3(SIA.x, 2.1, -0.47), new THREE.Vector3(SIA.x, 2.0, -0.43), new THREE.Vector3(SIA.x, 1.97, -0.415)]);
  const geo = new THREE.TubeGeometry(curva, 12, 0.022, 6, false), total = geo.index.count;
  g.add(new THREE.Mesh(geo, m));
  const gotas = Array.from({ length: 8 }, () => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), m); g.add(s); return s; });
  g.userData.set = (p, t) => {
    g.visible = p > 0; geo.setDrawRange(0, Math.floor(total * cl(p) / 3) * 3);
    gotas.forEach((s, i) => {                                // respingos que escorrem da lateral do aparelho até a cuba
      const u = (t * 1.6 + i / gotas.length) % 1, on = p >= 1;
      s.visible = on; s.position.set(SIA.x + (h(i, 1) - 0.5) * 0.12, 1.97 - u * 0.15, -0.4 - u * 0.04);
    });
  };
  return g;
}
