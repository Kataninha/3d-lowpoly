// Camada 2D do vídeo 13: legenda, nomes amarelos presos à peça, pílulas, medidas, ícones, retrocesso e pergunta final.
// Tudo é recalculado a partir de t a cada seek; nada acumula estado. Roda depois de montagem-cena.js (usa window.__cena).
const root = document.querySelector('#root');
const el = (cls, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; d.style.cssText = 'display:none;position:absolute;left:0;top:0'; root.appendChild(d); return d; };
const between = (t, a, b) => t >= a && t < b;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pop = (t, a) => clamp((t - a) / 0.12, 0, 1);              // entrada em ~3–4 quadros a 30 q/s
const sai = (t, b) => clamp((b - t) / 0.13, 0, 1);              // saída em ~4 quadros
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Ícones em SVG (não dependem de fonte): contorno escuro por baixo, cor do significado por cima.
const svgIcone = (corpo, cor) => `<svg viewBox="0 0 140 140" width="150" height="150" style="overflow:visible"><g fill="none" stroke="var(--cor-contorno)" stroke-width="40" stroke-linecap="round" stroke-linejoin="round">${corpo}</g><g fill="none" stroke="var(${cor})" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">${corpo}</g></svg>`;
const CERTO = '<path d="M26 74 L56 104 L116 36"/>';
const ERRADO = '<path d="M34 34 L106 106 M106 34 L34 106"/>';
const TRI = (x) => `<path d="M${x} 30 L${x + 34} 70 L${x} 110 Z" fill="var(--cor-texto)"/>`;
const AVANCAR = TRI(22) + TRI(72);
const TRI_E = (x) => `<path d="M${x} 30 L${x - 34} 70 L${x} 110 Z" fill="var(--cor-texto)"/>`;
const RETROCEDER = TRI_E(68) + TRI_E(118);

// Caixa visível de uma peça (ignora filhos ocultos) projetada na tela 1080x1920.
function projetar(obj, cena) {
  if (!obj) return null;
  for (let o = obj; o; o = o.parent) if (!o.visible) return null;
  const { THREE, camera } = cena;
  obj.updateWorldMatrix(true, true); camera.updateMatrixWorld();
  const caixa = new THREE.Box3(), tmp = new THREE.Box3();
  (function rec(o) {
    if (!o.visible) return;
    if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); caixa.union(tmp); }
    o.children.forEach(rec);
  })(obj);
  if (caixa.isEmpty()) return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, frente = 0;
  for (const x of [caixa.min.x, caixa.max.x]) for (const y of [caixa.min.y, caixa.max.y]) for (const z of [caixa.min.z, caixa.max.z]) {
    const p = new THREE.Vector3(x, y, z).project(camera);
    if (p.z > 1) continue;
    frente++;
    const sx = (p.x + 1) / 2 * 1080, sy = (1 - p.y) / 2 * 1920;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  if (!frente) return null;
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, x0, y0, x1, y1 };
}

export async function iniciarOverlays() {
  const cena = window.__cena;
  const lerJson = (f) => fetch(new URL(f, import.meta.url)).then((r) => r.json());
  const tempos = await lerJson('voz/tempos.json');
  const F = (n) => tempos.frases.find((f) => f.n === n);
  const W = (n, palavra, k = 0) => {
    const m = tempos.palavras.filter((p) => p.frase === n && norm(p.palavra) === norm(palavra));
    if (!m[k]) throw new Error(`Palavra ausente: ${n} ${palavra} #${k}`);
    return m[k].inicio;
  };
  const OBJ = cena.OBJ;
  const T_VOLTAR = W(5, 'voltar'), T_FIM_RETRO = 36.5, T_FIM = tempos.duracao;

  // ---------- legenda: 1–2 palavras, sem marcas [..], palavra-nome amarela ----------
  // [frase, palavra, ocorrência]: só nomes de peça/termo técnico falado.
  const CHAVE = [
    [3, 'toneladas'], [7, 'estacas'], [7, 'fundação'], [9, 'concreto', 1], [9, 'armado'], [9, 'vigas'], [10, 'laje', 0], [10, 'reforçada'],
    [14, 'impermeabilização'], [14, 'bomba'], [14, 'filtro'],
    [16, 'água'], [16, 'fundo'], [16, 'laje'], [16, 'vigas'], [16, 'pilares'], [16, 'fundações'], [16, 'terreno'], [16, 'caminho'], [16, 'das'], [16, 'cargas'],
  ];
  const chaves = new Set(CHAVE.map(([f, p, k = 0]) => { const i = tempos.palavras.map((w, j) => [w, j]).filter(([w]) => w.frase === f && norm(w.palavra) === norm(p))[k]; if (!i) throw new Error('chave ausente ' + p); return i[1]; }));
  const blocos = [];
  for (const f of tempos.frases) {
    const tokens = f.texto.replace(/\[[^\]]*\]/g, '').split(/\s+/).filter(Boolean);   // a pontuação vem do texto da frase
    const idx = tempos.palavras.map((w, j) => j).filter((j) => tempos.palavras[j].frase === f.n);
    const ws = idx.map((j, i) => ({ ...tempos.palavras[j], j, pausa: /[.,!?…:]$/.test(tokens[i] || '') }));
    let atual = [];
    ws.forEach((w, i) => {
      atual.push(w);
      if (atual.length === 2 || w.pausa || i === ws.length - 1) { blocos.push(atual); atual = []; }
    });
  }
  const legenda = el('apv-legenda');
  legenda.style.top = '67%'; legenda.style.fontSize = '72px';
  const htmlLegenda = (b) => b.map((w) => {
    const limpa = w.palavra.replace(/\[[^\]]*\]/g, '').replace(/[.,!?…:]+$/, '');
    return chaves.has(w.j) ? `<span class="chave">${limpa}</span>` : limpa;
  }).join(' ');

  // Pílulas grandes para celular: texto 84 px em 1080x1920 (o estilo branco + ponto + borda da cor do significado vem do tokens.css).
  const estilo = document.createElement('style');
  estilo.textContent = '.apv-pilula.grande{font-size:84px;padding:20px 46px;border-width:8px;gap:24px;box-shadow:0 8px 0 var(--cor-contorno)}.apv-pilula.grande::before{width:32px;height:32px}';
  document.head.appendChild(estilo);

  // ---------- itens de tela ----------
  const itens = [];
  const nome = (texto, alvo, t0, t1, o = {}) => itens.push({ tipo: 'nome', node: el('apv-nome', texto), alvo, t0, t1, ...o });
  const pilula = (texto, cor, t0, t1, y) => { const n = el('apv-pilula grande', texto); n.style.setProperty('--cor-pilula', `var(${cor})`); itens.push({ tipo: 'pilula', node: n, t0, t1, y }); };
  const medida = (fn, alvo, t0, t1, o = {}) => itens.push({ tipo: 'medida', node: el('apv-nome', ''), fn, alvo, t0, t1, ...o });
  const icone = (corpo, cor, alvo, t0, t1, o = {}) => itens.push({ tipo: 'icone', node: el('', svgIcone(corpo, cor)), alvo, t0, t1, ...o });
  const avancar = (t0, t1) => itens.push({ tipo: 'fixo', node: el('', svgIcone(AVANCAR, '--cor-texto')), t0, t1, x: 930, y: 190 });

  // 1–2 hook: pílula de volume e perigo no teto
  pilula('10 MIL LITROS', '--cor-frio', W(0, 'PISCINA'), F(0).fim, 300);
  icone(ERRADO, '--cor-negativo', 'teto-sala', W(1, 'preparado'), W(1, 'preparado') + 1.6);
  // 4: balança (blocos de 1 t; instantes de queda = sfx-encaixe da balança sobre JAN [15,93 → 0; 22,47 → 8,0])
  const QUEDAS = [0.8, 1.4, 2, 2.7, 2.92, 3.14, 3.36, 3.58, 3.8, 4.02].map((l) => 15.93 + l * (22.47 - 15.93) / 8.0);
  medida((t) => `${QUEDAS.filter((q) => t >= q).length} t`, 'balanca', QUEDAS[0], 21.9, { tamanho: 110, pulsos: QUEDAS });
  avancar(QUEDAS[3] - 0.1, QUEDAS[9] + 0.5);
  // 5: concreto a mais
  pilula('+ PESO', '--cor-negativo', W(4, 'concreto'), F(4).fim - 0.2, 300);
  icone(ERRADO, '--cor-negativo', 'teto-sala', W(4, 'ainda'), F(4).fim - 0.15);
  // 6: retrocesso (◀◀ + varredura)
  itens.push({ tipo: 'retro', t0: T_VOLTAR, t1: T_FIM_RETRO });
  // 7: prédio torto
  icone(ERRADO, '--cor-negativo', 'terreno-palco', 40.6, F(6).fim);
  // 8: estacas e fundação
  pilula('CAMADA FIRME', '--cor-terra', W(7, 'firme'), W(7, 'firme') + 2.2, 300);
  avancar(44.0, 46.9);
  nome('FUNDAÇÃO', 'fundacao', W(7, 'fundação'), F(7).fim + 0.15);
  icone(CERTO, '--cor-positivo', 'fundacao', W(7, 'fundação') + 0.5, F(7).fim + 0.15);
  // 9: concreto aguenta aperto, quebra no esticar
  pilula('APERTO', '--cor-frio', W(8, 'apertado'), W(8, 'apertado') + 1.3, 300);
  icone(CERTO, '--cor-positivo', 'viguinha', W(8, 'apertado') + 0.25, W(8, 'apertado') + 1.3);
  pilula('ESTICAR', '--cor-negativo', W(8, 'esticado'), F(8).fim + 0.1, 300);
  icone(ERRADO, '--cor-negativo', 'viguinha', W(8, 'esticado') + 0.2, F(8).fim + 0.1);
  // 10: concreto armado
  nome('CONCRETO ARMADO', 'pilar', W(9, 'concreto', 1), W(9, 'concreto', 1) + 1.8, { tamanho: 66 });
  icone(CERTO, '--cor-positivo', 'pilar', W(9, 'armado') + 0.2, W(9, 'armado') + 1.0);
  avancar(67.3, 68.7);
  // 11: laje
  nome('LAJE', 'laje', W(10, 'laje', 0), W(10, 'laje', 0) + 1.5, { tamanho: 110 });
  medida(() => '20 cm', 'laje', W(10, 'vinte'), W(10, 'água') + 0.9, { tamanho: 90 });
  icone(ERRADO, '--cor-negativo', 'laje', W(10, 'água') + 0.15, W(10, 'água') + 1.2);
  icone(CERTO, '--cor-positivo', 'laje-reforcada', W(10, 'reforçada') + 0.35, W(10, 'reforçada') + 1.5);
  // 12–13: pressão na parede
  icone(ERRADO, '--cor-negativo', 'parede-piscina', W(11, 'lados'), W(11, 'lados') + 1.9);
  icone(CERTO, '--cor-positivo', 'parede-armada', W(12, 'trabalhando'), F(12).fim);
  // 14: vazamento
  pilula('VAZAMENTO', '--cor-frio', W(13, 'falha'), F(13).fim - 0.3, 300);
  icone(ERRADO, '--cor-negativo', 'fissura', W(13, 'falha') + 0.2, W(13, 'falha') + 2.0);
  // 15: manta e circulação
  nome('IMPERMEABILIZAÇÃO', 'manta', W(14, 'impermeabilização'), W(14, 'impermeabilização') + 1.7, { tamanho: 58 });
  icone(CERTO, '--cor-positivo', 'manta', W(14, 'impermeabilização') + 0.7, W(14, 'impermeabilização') + 1.8);
  pilula('BOMBA', '--cor-frio', W(14, 'bomba'), W(14, 'bomba') + 1.8, 300);
  pilula('FILTRO', '--cor-frio', W(14, 'filtro'), W(14, 'filtro') + 1.8, 460);
  // 17: caminho das cargas
  nome('CAMINHO<br>DAS CARGAS', 'caminho-carga', W(16, 'caminho'), W(16, 'cargas') + 1.0, { centro: true });
  // 19: lista final, um ícone por palavra (pilar, viga, laje, vizinho); somem antes da pergunta
  const ICO = (corpo) => `<svg viewBox="0 0 200 200" width="250" height="250" style="overflow:visible"><g fill="var(--cor-texto)" stroke="var(--cor-contorno)" stroke-width="10" stroke-linejoin="round" stroke-linecap="round">${corpo}</g></svg>`;
  const ACO = (d) => `<path d="${d}" fill="none" stroke="var(--cor-quente)" stroke-width="9"/>`;
  const ICONES_FINAL = [
    ['pilar', ICO('<rect x="68" y="12" width="64" height="176" rx="8"/>' + ACO('M88 30V170M112 30V170'))],
    ['viga', ICO('<rect x="8" y="66" width="184" height="68" rx="8"/>' + ACO('M24 90H176M24 110H176'))],
    ['laje', ICO('<rect x="10" y="70" width="180" height="38" rx="6"/><rect x="28" y="108" width="30" height="80" rx="4"/><rect x="142" y="108" width="30" height="80" rx="4"/>' + ACO('M24 89H176'))],
    ['vizinho', ICO('<circle cx="100" cy="100" r="74"/><circle cx="74" cy="88" r="9" fill="var(--cor-contorno)" stroke="none"/><circle cx="126" cy="88" r="9" fill="var(--cor-contorno)" stroke="none"/><path d="M66 124Q100 158 134 124" fill="none"/>')],
  ];
  ICONES_FINAL.forEach(([palavra, svg], i) => itens.push({ tipo: 'fixo', node: el('', svg), t0: W(18, palavra), t1: T_FIM - 3.1, x: 540 + (i - 1.5) * 250, y: 360 }));
  // 19: pergunta final nos 3 s finais
  itens.push({ tipo: 'pergunta', node: el('apv-nome', 'VOCÊ MORARIA<br>EMBAIXO?'), t0: T_FIM - 3.0, t1: T_FIM + 1 });

  // pré-processamento: nós de retro
  const retro = itens.find((i) => i.tipo === 'retro');
  retro.node = el('apv-retroceder', '<div class="apv-retroceder-conteudo"><div class="apv-retroceder-icone" style="top:7.5%">' + svgIcone(RETROCEDER, '--cor-texto') + '</div>' +
    Array.from({ length: 7 }, () => '<div class="apv-retroceder-listra"></div>').join('') + '</div>');
  retro.node.style.display = '';
  retro.conteudo = retro.node.firstChild; retro.listras = [...retro.node.querySelectorAll('.apv-retroceder-listra')];
  const perg = itens.find((i) => i.tipo === 'pergunta');
  perg.node.style.cssText += ';display:none;text-align:center;font-size:88px;line-height:1.08';

  const MARGEM = 90;
  function atualizar(t) {
    const b = blocos.find((x, i) => t >= x[0].inicio && t < Math.min(x.at(-1).fim + 0.25, blocos[i + 1]?.[0].inicio ?? Infinity));
    legenda.innerHTML = b ? htmlLegenda(b) : '';
    legenda.style.display = b ? '' : 'none';
    for (const it of itens) {
      const on = between(t, it.t0, it.t1);
      if (it.tipo === 'retro') {
        it.conteudo.style.opacity = on ? 1 : 0;
        if (on) it.listras.forEach((l, i) => { const y = (i * 330 + (t - it.t0) * 2600) % 1920; l.style.cssText = `top:${1920 - y}px;left:${(i * 137) % 400}px;width:${600 + (i * 91) % 300}px`; });
        continue;
      }
      if (!on) { it.node.style.display = 'none'; continue; }
      const k = pop(t, it.t0), esc = (0.6 + 0.4 * k) * (0.9 + 0.1 * sai(t, it.t1));
      it.node.style.opacity = sai(t, it.t1);
      if (it.tipo === 'pilula') {
        it.node.style.display = '';
        it.node.style.transform = `translate(540px, ${it.y}px) translate(-50%, 0) scale(${0.7 + 0.3 * k})`;
      } else if (it.tipo === 'fixo') {
        it.node.style.display = '';
        it.node.style.transform = `translate(${it.x}px, ${it.y}px) translate(-50%, -50%) scale(${esc})`;
      } else if (it.tipo === 'pergunta') {
        it.node.style.display = '';
        it.node.style.transform = `translate(540px, 330px) translate(-50%, -50%) scale(${0.7 + 0.3 * k})`;
      } else {
        const p = projetar(OBJ[it.alvo], cena);
        if (!p) { it.node.style.display = 'none'; continue; }
        it.node.style.display = '';
        let txt = null;
        if (it.tipo === 'medida') {
          txt = it.fn(t); if (it.node.dataset.txt !== txt) { it.node.dataset.txt = txt; it.node.textContent = txt; }
          it.node.style.fontSize = `${it.tamanho}px`; it.node.style.textTransform = 'none';
        } else if (it.tamanho) it.node.style.fontSize = `${it.tamanho}px`;
        const w = it.node.offsetWidth || 700, h = it.node.offsetHeight || 80;
        let x, y;
        if (it.tipo === 'icone') { x = clamp(p.x1 - 20, 120, 960); y = clamp(p.y0 + 30, 300, 1150); }
        else { x = clamp(p.x, w / 2 + MARGEM, 1080 - w / 2 - MARGEM); y = clamp(it.tipo === 'medida' ? p.y0 - 90 : p.y, 300, 1130); }
        let extra = 1;
        if (it.pulsos) { const u = Math.min(...it.pulsos.filter((q) => t >= q).map((q) => t - q), 9); extra = 1 + 0.18 * Math.max(0, 1 - u / 0.18); }
        it.node.style.textAlign = 'center';
        it.node.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${esc * extra})`;
      }
    }
  }
  window.drawOverlays = atualizar;
  window.addEventListener('hf-seek', (e) => atualizar(e.detail.time));
  atualizar(0);
}
