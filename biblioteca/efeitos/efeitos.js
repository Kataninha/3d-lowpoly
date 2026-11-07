/**
 * EFEITOS — sinais visuais de cartum do Mundo100Manual
 * ------------------------------------------------------------
 * Suor, fedor, barulho, raiva, ideia, dúvida, sono, susto, tontura,
 * lágrima, brilho, frio, força, fumaça.
 *
 * Cada efeito é um grupo 3D de "figurinhas" (sprites) que sempre olham
 * para a câmera, desenhadas no estilo do canal (contorno escuro grosso).
 * Tudo é calculado pelo TEMPO DO VÍDEO: o mesmo t gera sempre o mesmo quadro.
 *
 * Uso rápido:
 *   import { prepararEfeitos, criarEfeito, reagir } from './kit/efeitos/efeitos.js';
 *   await prepararEfeitos();                       // carrega a fonte das onomatopeias
 *   const suor = criarEfeito('suor', { alvo: zeDesmonte.juntas.cabeca, inicio: 2, duracao: 3 });
 *   const fedor = reagir(zeDesmonte, 'fedor', { inicio: 5, duracao: 2.5 });
 *   // dentro de desenhar(t):
 *   suor.atualizar(t);
 *   fedor.atualizar(t);
 */
import * as THREE from 'three';

// ============================================================
// 1. CORES (mesmas da identidade do canal)
// ============================================================
export const CORES_EFEITO = Object.freeze({
  tinta: '#1d1b2a',
  suor: '#9be7ff',
  lagrima: '#6cc8ff',
  fedor: '#8bd14a',
  raiva: '#ff4d5e',
  amarelo: '#ffd23f',
  branco: '#ffffff',
  fumaca: '#e9edf3',
  fumacaEscura: '#9aa3b5',
  frio: '#7fd0ff',
  laranja: '#ff7a1a',
  ciano: '#7ff3ff',
});
const C = CORES_EFEITO;

// ============================================================
// 2. FIGURINHAS DESENHADAS EM CANVAS (com cache)
// ============================================================
const cache = new Map();

function textura(chave, largura, altura, desenhar) {
  if (cache.has(chave)) return cache.get(chave);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  desenhar(ctx, largura, altura);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const item = { tex, aspecto: largura / altura };
  cache.set(chave, item);
  return item;
}

/** Contorna e preenche o caminho atual (contorno escuro do canal). */
function pintar(ctx, cor, contorno = 14) {
  ctx.strokeStyle = C.tinta;
  ctx.lineWidth = contorno;
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.fill();
}

const DESENHOS = {
  gota: (cor) => textura(`gota-${cor}`, 256, 256, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(128, 22);
    ctx.quadraticCurveTo(200, 118, 196, 164);
    ctx.arc(128, 164, 68, 0, Math.PI, false);
    ctx.quadraticCurveTo(56, 118, 128, 22);
    ctx.closePath();
    pintar(ctx, cor, 16);
    ctx.beginPath();
    ctx.ellipse(104, 150, 14, 26, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = C.branco;
    ctx.fill();
  }),

  linhaOndulada: (cor) => textura(`onda-${cor}`, 128, 256, (ctx) => {
    ctx.beginPath();
    for (let y = 236; y >= 20; y -= 4) {
      const x = 64 + Math.sin(y / 26) * 26;
      if (y === 236) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 34; ctx.stroke();
    ctx.strokeStyle = cor; ctx.lineWidth = 18; ctx.stroke();
  }),

  nuvem: (cor) => textura(`nuvem-${cor}`, 256, 256, (ctx) => {
    const bolas = [[90, 158, 58], [158, 150, 66], [128, 100, 60], [196, 176, 40], [62, 182, 38]];
    ctx.beginPath();
    bolas.forEach(([x, y, r]) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); });
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 16; ctx.stroke();
    ctx.fillStyle = cor; ctx.fill();
  }),

  veia: () => textura('veia', 256, 256, (ctx) => {
    ctx.translate(128, 128);
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.rotate((k * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(26, -96);
      ctx.quadraticCurveTo(26, -26, 96, -26);
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 44; ctx.stroke();
      ctx.strokeStyle = C.raiva; ctx.lineWidth = 26; ctx.stroke();
      ctx.restore();
    }
  }),

  lampada: () => textura('lampada', 256, 256, (ctx) => {
    // raios
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(a) * 92, 108 + Math.sin(a) * 92);
      ctx.lineTo(128 + Math.cos(a) * 120, 108 + Math.sin(a) * 120);
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 22; ctx.stroke();
      ctx.strokeStyle = C.amarelo; ctx.lineWidth = 10; ctx.stroke();
    }
    // vidro
    ctx.beginPath(); ctx.arc(128, 108, 66, 0, Math.PI * 2);
    pintar(ctx, C.amarelo, 14);
    ctx.beginPath(); ctx.ellipse(104, 86, 12, 22, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = C.branco; ctx.fill();
    // base
    ctx.beginPath(); ctx.roundRect(98, 170, 60, 52, 10);
    pintar(ctx, '#c9d1d9', 12);
    ctx.beginPath(); ctx.moveTo(102, 188); ctx.lineTo(154, 188); ctx.moveTo(102, 204); ctx.lineTo(154, 204);
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 6; ctx.stroke();
  }),

  estrela: (cor = C.amarelo) => textura(`estrela-${cor}`, 256, 256, (ctx) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 108 : 46;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = 128 + Math.cos(a) * r, y = 132 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    pintar(ctx, cor, 14);
  }),

  brilho: (cor = C.branco) => textura(`brilho-${cor}`, 256, 256, (ctx) => {
    ctx.beginPath();
    const pts = [[128, 14], [242, 128], [128, 242], [14, 128]];
    ctx.moveTo(...pts[0]);
    for (let i = 1; i <= 4; i++) ctx.quadraticCurveTo(128, 128, ...pts[i % 4]);
    ctx.closePath();
    pintar(ctx, cor, 12);
  }),

  choque: () => textura('choque', 512, 512, (ctx) => {
    ctx.translate(256, 256);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.1;
      const r1 = 190 + (i % 2) * 16, r2 = 246;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 14; ctx.stroke();
    }
  }),

  raios: (cor = C.raiva) => textura(`raios-${cor}`, 512, 512, (ctx) => {
    ctx.translate(256, 256);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 70, Math.sin(a) * 70);
      ctx.lineTo(Math.cos(a) * 236, Math.sin(a) * 236);
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 30; ctx.stroke();
      ctx.strokeStyle = cor; ctx.lineWidth = 16; ctx.stroke();
    }
  }),

  vibracao: (cor = C.tinta) => textura(`vibracao-${cor}`, 128, 256, (ctx) => {
    [40, 70, 100].forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(10, 128, r, -0.6, 0.6);
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 18 - i * 2; ctx.stroke();
      if (cor !== C.tinta) { ctx.strokeStyle = cor; ctx.lineWidth = 8 - i; ctx.stroke(); }
    });
  }),

  mosca: () => textura('mosca', 128, 128, (ctx) => {
    ctx.beginPath(); ctx.ellipse(44, 44, 26, 18, -0.6, 0, Math.PI * 2); ctx.ellipse(84, 44, 26, 18, 0.6, 0, Math.PI * 2);
    pintar(ctx, 'rgba(255,255,255,0.9)', 8);
    ctx.beginPath(); ctx.arc(64, 76, 26, 0, Math.PI * 2);
    ctx.fillStyle = C.tinta; ctx.fill();
  }),

  floco: () => textura('floco', 128, 128, (ctx) => {
    ctx.translate(64, 64);
    for (let i = 0; i < 3; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(50, 0);
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 18; ctx.stroke();
      ctx.strokeStyle = C.branco; ctx.lineWidth = 8; ctx.stroke();
    }
  }),

  texto: (txt, cor = C.branco) => {
    const tam = 140;
    const fonte = `900 ${tam}px Poppins, "Arial Black", sans-serif`;
    const medida = document.createElement('canvas').getContext('2d');
    medida.font = fonte;
    const w = Math.ceil(medida.measureText(txt).width + tam * 0.6);
    const h = Math.ceil(tam * 1.5);
    return textura(`texto-${txt}-${cor}`, w, h, (ctx) => {
      ctx.font = fonte;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = tam * 0.24;
      ctx.strokeStyle = C.tinta;
      ctx.strokeText(txt, w / 2, h / 2 + tam * 0.05);
      ctx.fillStyle = cor;
      ctx.fillText(txt, w / 2, h / 2 + tam * 0.05);
    });
  },
};

// ============================================================
// 3. FERRAMENTAS
// ============================================================
function figurinha(item, altura) {
  const mat = new THREE.SpriteMaterial({ map: item.tex, transparent: true, depthTest: false, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.renderOrder = 20;
  s.userData.tam = [altura * item.aspecto, altura];
  s.scale.set(altura * item.aspecto, altura, 1);
  return s;
}
/** Adiciona a figurinha ao grupo e devolve a própria figurinha. */
const poe = (g, s) => (g.add(s), s);
function escalar(s, f, fx = f) { s.scale.set(s.userData.tam[0] * fx, s.userData.tam[1] * f, 1); }
const limitar = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
const ciclo = (u, periodo, fase = 0) => (((u + fase) % periodo) + periodo) % periodo / periodo;
const sino = (p) => Math.sin(Math.PI * limitar(p));
const saltar = (p) => { // 0→1 com "pulo" (back out)
  const c1 = 1.9, c3 = c1 + 1, x = limitar(p) - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
};

/**
 * Faz um objeto tremer (susto, raiva, frio, máquina ligada).
 * Pode chamar todo quadro: ele desfaz o tremor anterior antes de aplicar o novo.
 */
export function tremer(objeto, t, intensidade = 0.03, frequencia = 38) {
  const antes = objeto.userData.tremor ?? [0, 0];
  const dx = Math.sin(t * frequencia * 1.3) * intensidade;
  const dy = Math.cos(t * frequencia * 1.7) * intensidade * 0.6;
  objeto.position.x += dx - antes[0];
  objeto.position.y += dy - antes[1];
  objeto.userData.tremor = [dx, dy];
}
/** Remove o tremor (volta à posição original). */
export function pararTremor(objeto) {
  const antes = objeto.userData.tremor ?? [0, 0];
  objeto.position.x -= antes[0];
  objeto.position.y -= antes[1];
  objeto.userData.tremor = [0, 0];
}

// ============================================================
// 4. CATÁLOGO DE EFEITOS
//    Cada um recebe (grupo, opcoes) e devolve atualizar(u, k):
//    u = segundos desde o início do efeito · k = opacidade geral (entrada/saída)
//    Posições pensadas para o alvo zeDesmonte.juntas.cabeca (centro da cabeça).
// ============================================================
const CATALOGO = {
  /** Gotas de suor escorrendo da testa (cansaço, nervoso, calor). */
  suor(g, o) {
    const pontos = [[0.32, 0.24], [-0.34, 0.16], [0.47, 0.0]];
    const gotas = pontos.map(() => poe(g, figurinha(DESENHOS.gota(C.suor), 0.27 * o.escala)));
    return (u, k) => gotas.forEach((s, i) => {
      const p = ciclo(u, 1.1, i * 0.37);
      s.position.set(pontos[i][0], pontos[i][1] - p * 0.45, 0.5);
      escalar(s, saltar(p / 0.18));
      s.material.opacity = k * (p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3);
    });
  },

  /** Lágrimas descendo dos dois olhos (tristeza). */
  lagrima(g, o) {
    const gotas = [0.17, -0.17].map(() => poe(g, figurinha(DESENHOS.gota(C.lagrima), 0.21 * o.escala)));
    return (u, k) => gotas.forEach((s, i) => {
      const p = ciclo(u, 1.0, i * 0.5);
      s.position.set(i === 0 ? 0.21 : -0.21, -0.08 - p * 0.5, 0.5);
      escalar(s, saltar(p / 0.2));
      s.material.opacity = k * (1 - Math.max(0, p - 0.75) / 0.25);
    });
  },

  /** Linhas verdes onduladas subindo + 2 moscas (fedor, coisa estragada). */
  fedor(g, o) {
    const linhas = [-0.28, 0, 0.28].map(() => poe(g, figurinha(DESENHOS.linhaOndulada(C.fedor), 0.8 * o.escala)));
    const moscas = [0, 1].map(() => poe(g, figurinha(DESENHOS.mosca(), 0.16 * o.escala)));
    return (u, k) => {
      linhas.forEach((s, i) => {
        const p = ciclo(u, 1.8, i * 0.6);
        s.position.set((i - 1) * 0.3 * o.escala + Math.sin(u * 3 + i) * 0.06, p * 1.1 * o.escala, 0);
        s.material.opacity = k * sino(p);
      });
      moscas.forEach((s, i) => {
        const a = u * (5 + i) + i * 2.4;
        s.position.set(Math.cos(a) * 0.45 * o.escala, 0.35 * o.escala + Math.sin(a * 2) * 0.12, Math.sin(a) * 0.3);
        s.material.opacity = k;
      });
    };
  },

  /** Vapor saindo da cabeça (raiva, superaquecimento). */
  vapor(g, o) {
    const nuvens = [0.42, -0.42, 0.15].map(() => poe(g, figurinha(DESENHOS.nuvem(C.fumaca), 0.48 * o.escala)));
    return (u, k) => nuvens.forEach((s, i) => {
      const p = ciclo(u, 0.9, i * 0.3);
      const lado = [1, -1, 0.3][i];
      s.position.set(lado * (0.4 + p * 0.22), 0.5 + p * 0.4, 0);
      escalar(s, 0.55 + p * 0.8);
      s.material.opacity = k * (1 - p * p);
    });
  },

  /** Veia de raiva pulsando na testa. */
  veia(g, o) {
    const s = figurinha(DESENHOS.veia(), 0.36 * o.escala); g.add(s);
    return (u, k) => {
      s.position.set(0.3, 0.3, 0.5);
      escalar(s, saltar(u / 0.2) * (1 + 0.18 * Math.abs(Math.sin(u * 7))));
      s.material.opacity = k;
    };
  },

  /** Lâmpada acendendo acima da cabeça (ideia, descoberta). */
  ideia(g, o) {
    const s = figurinha(DESENHOS.lampada(), 0.75 * o.escala); g.add(s);
    return (u, k) => {
      s.position.set(0, 1.1 + Math.sin(u * 3) * 0.03, 0);
      escalar(s, saltar(u / 0.3));
      s.material.opacity = k;
      s.material.rotation = Math.sin(u * 2.5) * 0.06;
    };
  },

  /** Interrogações aparecendo uma a uma (dúvida, confusão). */
  duvida(g, o) {
    const cfg = [[-0.38, 0.88, 0.34, -0.25], [0, 1.08, 0.48, 0], [0.4, 0.92, 0.36, 0.25]];
    const qs = cfg.map(() => poe(g, figurinha(DESENHOS.texto('?', C.laranja), 1)));
    return (u, k) => qs.forEach((s, i) => {
      const [x, y, h, rot] = cfg[i];
      s.position.set(x, y + Math.sin(u * 4 + i) * 0.03, 0);
      escalar(s, h * o.escala * saltar((u - i * 0.15) / 0.25));
      s.material.rotation = rot;
      s.material.opacity = k * (u >= i * 0.15 ? 1 : 0);
    });
  },

  /** "Z" subindo em diagonal (sono, tédio). */
  sono(g, o) {
    const zs = [0, 1, 2].map(() => poe(g, figurinha(DESENHOS.texto('Z', C.ciano), 1)));
    return (u, k) => zs.forEach((s, i) => {
      const p = ciclo(u, 2.1, i * 0.7);
      s.position.set(0.35 + p * 0.55, 0.55 + p * 0.75, 0);
      escalar(s, (0.18 + p * 0.3) * o.escala);
      s.material.rotation = -0.3 + Math.sin(p * 6) * 0.15;
      s.material.opacity = k * sino(p);
    });
  },

  /** "!" + linhas de choque em volta da cabeça (susto, surpresa). */
  susto(g, o) {
    const exc = figurinha(DESENHOS.texto('!', C.amarelo), 1); g.add(exc);
    const anel = figurinha(DESENHOS.choque(), 2.1 * o.escala); g.add(anel);
    return (u, k) => {
      exc.position.set(0.05 + Math.sin(u * 50) * 0.015, 1.0, 0);
      escalar(exc, 0.58 * o.escala * saltar(u / 0.18));
      exc.material.opacity = k;
      anel.position.set(0, 0.05, 0);
      escalar(anel, 0.9 + Math.min(u, 0.25) * 0.6);
      anel.material.opacity = k * (u < 0.4 ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(u * 9)));
    };
  },

  /** Estrelinhas girando em volta da cabeça (tontura, pancada). */
  tonto(g, o) {
    const est = [0, 1, 2].map(() => poe(g, figurinha(DESENHOS.estrela(), 0.3 * o.escala)));
    return (u, k) => est.forEach((s, i) => {
      const a = u * 3 + (i * Math.PI * 2) / 3;
      s.position.set(Math.cos(a) * 0.55, 0.62 + Math.sin(a) * 0.06, Math.sin(a) * 0.4);
      escalar(s, 0.85 + 0.2 * Math.sin(u * 8 + i));
      s.material.rotation = u * 2;
      s.material.opacity = k;
    });
  },

  /** Brilhos piscando em volta (empolgação, algo novo/limpo). */
  brilho(g, o) {
    const pts = [[-0.62, 0.55], [0.64, 0.35], [-0.5, -0.15], [0.55, 0.8], [0.0, 1.0]];
    const bs = pts.map((_, i) => poe(g, figurinha(DESENHOS.brilho(i % 2 ? C.ciano : C.amarelo), 0.36 * o.escala)));
    return (u, k) => bs.forEach((s, i) => {
      s.position.set(pts[i][0], pts[i][1], 0.1);
      escalar(s, Math.max(0, Math.sin(u * 5 + i * 1.7)));
      s.material.opacity = k;
    });
  },

  /** Marcas de tremor azuis + flocos (frio). Combine com tremer(). */
  frio(g, o) {
    const marcas = [1, -1].map(() => poe(g, figurinha(DESENHOS.vibracao(C.frio), 0.55 * o.escala)));
    const flocos = [0, 1, 2].map(() => poe(g, figurinha(DESENHOS.floco(), 0.22 * o.escala)));
    return (u, k) => {
      marcas.forEach((s, i) => {
        const lado = i === 0 ? 1 : -1;
        s.position.set(lado * 0.68, 0.05, 0);
        escalar(s, 1, lado);
        s.material.opacity = k * (Math.sin(u * 16 + i * 3) > -0.3 ? 1 : 0.2);
      });
      flocos.forEach((s, i) => {
        const p = ciclo(u, 2.4, i * 0.8);
        s.position.set(-0.75 + i * 0.75 + Math.sin(u * 2 + i) * 0.08, 1.2 - p * 1.4, -0.3);
        s.material.rotation = u * 1.5 + i;
        s.material.opacity = k * sino(p);
      });
    };
  },

  /**
   * Onomatopeia tremendo (barulho): opcoes.texto = 'RRR-RRR!', 'BUM!', 'TIC TAC', 'VRUM', 'BZZZ', 'CLICK'...
   * opcoes.cor = cor do texto. Vem com marcas de vibração dos dois lados.
   */
  barulho(g, o) {
    const txt = figurinha(DESENHOS.texto(o.texto ?? 'RRR-RRR!', o.cor ?? C.laranja), 1); g.add(txt);
    const marcas = [1, -1].map(() => poe(g, figurinha(DESENHOS.vibracao(), 0.4 * o.escala)));
    const larg = txt.userData.tam[0] * 0.44 * o.escala;
    return (u, k) => {
      txt.position.set(Math.sin(u * 53) * 0.025, Math.cos(u * 47) * 0.025, 0);
      escalar(txt, 0.44 * o.escala * saltar(u / 0.15) * (1 + 0.06 * Math.abs(Math.sin(u * 14))));
      txt.material.rotation = Math.sin(u * 9) * 0.07;
      txt.material.opacity = k;
      marcas.forEach((s, i) => {
        const lado = i === 0 ? 1 : -1;
        s.position.set(lado * (larg / 2 + 0.12), 0, 0);
        escalar(s, 1, lado);
        s.material.opacity = k * (Math.sin(u * 20 + i * 2) > 0 ? 1 : 0.35);
      });
    };
  },

  /** Raios vermelhos saindo de um ponto (força para todo lado, impacto, explosão). */
  forca(g, o) {
    const s = figurinha(DESENHOS.raios(o.cor ?? C.raiva), 1.4 * o.escala); g.add(s);
    return (u, k) => {
      const p = ciclo(u, 0.6);
      escalar(s, 0.45 + p * 0.75);
      s.material.rotation = 0.13;
      s.material.opacity = k * (1 - p * 0.8);
    };
  },

  /** Fumaça subindo de um ponto (queimado, motor, poeira). opcoes.cor = cinza escuro por padrão. */
  fumaca(g, o) {
    const nuvens = [0, 1, 2, 3].map(() => poe(g, figurinha(DESENHOS.nuvem(o.cor ?? C.fumacaEscura), 0.35 * o.escala)));
    return (u, k) => nuvens.forEach((s, i) => {
      const p = ciclo(u, 1.6, i * 0.4);
      s.position.set(Math.sin(i * 2.1 + u) * 0.12 * o.escala, p * 1.1 * o.escala, 0);
      escalar(s, 0.4 + p * 1.1);
      s.material.opacity = k * (1 - p) * 0.95;
    });
  },
};

export const EFEITOS = Object.keys(CATALOGO);

// Posição padrão de cada efeito em relação ao alvo (centro da cabeça do Zé Desmonte)
const POSICAO_PADRAO = { fedor: [0.95, -0.55, 0.3], barulho: [0, 1.15, 0], forca: [0, 0, 0], fumaca: [0, 0.5, 0] };

/**
 * Cria um efeito preso a um alvo 3D.
 * @param {string} nome   um de EFEITOS
 * @param {object} opcoes alvo (Object3D, obrigatório), posicao [x,y,z], escala,
 *                        inicio (s), duracao (s), texto, cor
 * @returns {{nome, grupo, atualizar(t)}}
 */
export function criarEfeito(nome, opcoes = {}) {
  const fabrica = CATALOGO[nome];
  if (!fabrica) throw new Error(`Efeito desconhecido: ${nome}. Use um de: ${EFEITOS.join(', ')}`);
  const o = { escala: 1, inicio: 0, duracao: Infinity, ...opcoes };
  if (!o.alvo) throw new Error(`criarEfeito('${nome}') precisa de opcoes.alvo`);
  const grupo = new THREE.Group();
  grupo.name = `efeito-${nome}`;
  grupo.position.set(...(o.posicao ?? POSICAO_PADRAO[nome] ?? [0, 0, 0]));
  o.alvo.add(grupo);
  const atualizarInterno = fabrica(grupo, o);
  return {
    nome,
    grupo,
    atualizar(t) {
      const u = t - o.inicio;
      const ativo = u >= 0 && u <= o.duracao;
      grupo.visible = ativo;
      if (!ativo) return;
      const entrada = limitar(u / 0.12);
      const saida = Number.isFinite(o.duracao) ? limitar((o.duracao - u) / 0.2) : 1;
      atualizarInterno(u, Math.min(entrada, saida));
    },
  };
}

// ============================================================
// 5. REAÇÕES PRONTAS (emoção + pose + efeitos + tremor)
// ============================================================
export const REACOES = {
  suando:    { emocao: 'cansado',   pose: 'cansado',     efeitos: ['suor'] },
  nervoso:   { emocao: 'triste',    pose: 'segurar',     efeitos: ['suor'], tremor: 0.012 },
  fedor:     { emocao: 'nojo',      pose: 'taparNariz',  efeitos: ['fedor'] },
  raiva:     { emocao: 'bravo',     pose: 'segurar',     efeitos: ['veia', 'vapor'], tremor: 0.02 },
  ideia:     { emocao: 'feliz',     pose: 'ideia',       efeitos: ['ideia', 'brilho'] },
  duvida:    { emocao: 'pensativo', pose: 'cocarCabeca', efeitos: ['duvida'] },
  sono:      { emocao: 'cansado',   pose: 'cansado',     efeitos: ['sono'] },
  susto:     { emocao: 'surpreso',  pose: 'susto',       efeitos: ['susto'], tremor: 0.03 },
  tonto:     { emocao: 'tonto',     pose: 'parado',      efeitos: ['tonto'] },
  triste:    { emocao: 'triste',    pose: 'cansado',     efeitos: ['lagrima'] },
  empolgado: { emocao: 'empolgado', pose: 'comemorar',   efeitos: ['brilho'] },
  frio:      { emocao: 'triste',    pose: 'frio',        efeitos: ['frio'], tremor: 0.015 },
};

/**
 * Aplica uma reação completa ao Zé Desmonte dentro de uma janela de tempo.
 * Chame atualizar(t) em todo quadro, DEPOIS de definir a pose/posição normal do Zé Desmonte:
 * dentro da janela ela troca emoção e pose (a menos que opcoes.pose === false),
 * mostra os efeitos e aplica o tremor.
 */
export function reagir(zeDesmonte, nome, opcoes = {}) {
  const r = REACOES[nome];
  if (!r) throw new Error(`Reação desconhecida: ${nome}. Use uma de: ${Object.keys(REACOES).join(', ')}`);
  const { inicio = 0, duracao = Infinity, pose = true, escala = 1, transicao = 0.4 } = opcoes;
  // transicao = segundos para entrar/sair (padrão 0,4 s). Nunca use 0: o Zé Desmonte "teleportaria".
  const efeitos = r.efeitos.map((e) => criarEfeito(e, { alvo: zeDesmonte.juntas.cabeca, inicio, duracao, escala }));
  return {
    nome,
    efeitos,
    atualizar(t) {
      const u = t - inicio;
      const ativo = u >= 0 && u <= duracao;
      if (ativo) {
        // entrada e saída FLUIDAS: parte da pose/emoção atual e volta para ela no fim
        const entrada = limitar(u / transicao);
        const saida = Number.isFinite(duracao) ? limitar((duracao - u) / transicao) : 1;
        const k = Math.min(entrada, saida);
        if (pose) zeDesmonte.irParaPose(r.pose, k);
        zeDesmonte.misturarEmocoes(zeDesmonte.emocaoAtual, r.emocao, k);
        if (r.tremor) tremer(zeDesmonte.raiz, t, r.tremor); else pararTremor(zeDesmonte.raiz);
      } else if (r.tremor) {
        pararTremor(zeDesmonte.raiz);
      }
      efeitos.forEach((e) => e.atualizar(t));
    },
  };
}

/**
 * Carrega a fonte Poppins antes de desenhar textos (onomatopeias, ?, Z, !).
 * Use uma vez antes do primeiro quadro.
 */
export async function prepararEfeitos() {
  if (document.fonts) {
    await Promise.all([document.fonts.load('900 140px Poppins'), document.fonts.ready]).catch(() => {});
  }
}
