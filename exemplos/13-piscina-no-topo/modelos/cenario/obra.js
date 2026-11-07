// Obra e entorno do video 13. Reusa biblioteca/cenarios/cobertura-obra (cidade + elevador de obra) e biblioteca/objetos/grua-torre.
// Escala 1 u = 0,5 m, chao em y = 0 (o cenario original tem o chao em y = -60,25; aqui ele e erguido ate 0).
// Lote livre de 60 x 44 u no centro (x +-30, z +-22); as ruas do reuso sao cortadas em volta dele.
// API: const obra = criarObra(); obra.updateAt(t, { gancho:{carrinho,altura,giro}, elevadorY, terrenoPronto 0..1, luzesCidade 0..1 })
//   canteiro (padrao true) mostra grua e elevador de obra; false = torre pronta
//   elevadorY = altura MUNDO da cabine (0 = chao). ids: terreno, grua, elevador-obra, cidade
// Obra components come from this video's kit/ (biblioteca.lock.json).
import * as THREE from 'three';
import { criarCoberturaObra } from '../../kit/cenarios/cobertura-obra/cobertura-obra.js';
import { criarElevadorObra, animarElevador } from '../../kit/cenarios/cobertura-obra/elevador-obra.js';
import { criarGruaTorre, animarGancho } from '../../kit/objetos/grua-torre/grua-torre.js';
import { mat, caixa, cilindro, grupo, hash, clamp01, sombra, COR } from './util.js';

export const LOTE = Object.freeze({ x: 30, z: 22 });
const CHAO_REUSO = 60.25;        // topo do chao do cobertura-obra = -60,25
const ALTURA_MASTRO_SECOES = 11; // 11 secoes de 7,2 u = ~79 u, acima da laje em 72

function cortarRuas(cidade) {
  const lote = new THREE.Box3(new THREE.Vector3(-LOTE.x, -1, -LOTE.z), new THREE.Vector3(LOTE.x, 500, LOTE.z));
  const remover = [], novas = [];
  for (const c of [...cidade.children]) {
    const b = new THREE.Box3().setFromObject(c), s = b.getSize(new THREE.Vector3());
    if (s.x > 300) continue;                                         // chao
    const rua = s.y < 0.05 && (s.x > 250 || s.z > 250);
    if (rua) {
      remover.push(c);
      if (!b.intersectsBox(lote)) { novas.push(c); remover.pop(); continue; }
      const alongX = s.x > s.z, [a, e] = alongX ? [b.min.x, b.max.x] : [b.min.z, b.max.z], lim = alongX ? LOTE.x : LOTE.z;
      const cruza = alongX ? b.min.z < LOTE.z && b.max.z > -LOTE.z : b.min.x < LOTE.x && b.max.x > -LOTE.x;
      if (!cruza) continue;
      for (const [p0, p1] of [[a, -lim], [lim, e]]) {
        if (p1 - p0 < 1) continue;
        const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? p1 - p0 : s.x, s.y, alongX ? s.z : p1 - p0), c.material);
        const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, cy = (b.min.y + b.max.y) / 2 - cidade.position.y;   // bbox esta em coordenadas do mundo
        m.position.set(alongX ? (p0 + p1) / 2 : cx, cy, alongX ? cz : (p0 + p1) / 2); m.receiveShadow = true; novas.push(m);
      }
    } else if (b.intersectsBox(lote)) remover.push(c);               // predio/telhado/arvores dentro do lote
  }
  for (const c of remover) cidade.remove(c);
  for (const m of novas) if (!m.parent) cidade.add(m);
}

function criarTerreno() {
  const g = grupo('terreno');
  const terraMat = new THREE.MeshStandardMaterial({ color: COR.terraMole, flatShading: true, roughness: 1 });
  const lote = new THREE.Mesh(new THREE.BoxGeometry(LOTE.x * 2, 0.12, LOTE.z * 2), terraMat);
  lote.position.y = 0.06; lote.receiveShadow = true; lote.name = 'lote'; g.add(lote);
  // calcada em volta (aparece com a obra pronta) e gramado
  const calcada = grupo('calcada', g);
  for (const [w, d, x, z] of [[LOTE.x * 2, 3, 0, LOTE.z - 1.5], [LOTE.x * 2, 3, 0, -LOTE.z + 1.5], [3, LOTE.z * 2 - 6, LOTE.x - 1.5, 0], [3, LOTE.z * 2 - 6, -LOTE.x + 1.5, 0]]) caixa(calcada, 0xc9c9c4, w, 0.06, d, x, 0.15, z);
  const arvores = grupo('arvores', g);
  for (let k = 0; k < 7; k++) {
    const x = -24 + k * 8, z = LOTE.z - 1.5, tr = grupo('arvore-' + k, arvores); tr.position.set(x, 0.18, z);
    cilindro(tr, 0x8b5a2b, 0.2, 2.2, 0, 1.1, 0, 6); const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 + (k % 3) * 0.2, 0), mat([0x3fae49, 0x2e9444, 0x58c05a][k % 3])); f.position.y = 3.2; f.castShadow = true; tr.add(f);
  }
  // tapume de obra: faixas laranja/branco em volta do lote
  const tapume = grupo('tapume', g);
  const faixa = (w, d, x, z) => { caixa(tapume, 0xe8821e, w, 0.9, d, x, 0.57, z); caixa(tapume, 0xf4f4f0, w, 0.3, d, x, 1.17, z); };
  faixa(LOTE.x * 2, 0.25, 0, LOTE.z - 0.5); faixa(LOTE.x * 2, 0.25, 0, -LOTE.z + 0.5); faixa(0.25, LOTE.z * 2 - 1, LOTE.x - 0.5, 0); faixa(0.25, LOTE.z * 2 - 1, -LOTE.x + 0.5, 0);
  g.userData = { terraMat, calcada, arvores, tapume };
  return g;
}

export function criarObra() {
  const raiz = grupo('obra');
  // cidade (reuso): ergue o chao a y=0 e libera o lote
  const cob = criarCoberturaObra({ tema: 'entardecer' }).group; cob.name = 'cidade'; cob.userData.id = 'cidade';
  cob.position.y = CHAO_REUSO; cob.updateMatrixWorld(true);
  cortarRuas(cob);
  raiz.add(cob);
  // janelas da cidade que acendem (instanciadas, deterministicas)
  const caixas = cob.children.filter((c) => c.geometry && c.geometry.type === 'BoxGeometry' && c.geometry.parameters.height >= 8 && c.geometry.parameters.height <= 52 && c.geometry.parameters.width <= 15);
  const alvos = [];
  for (const c of caixas) {
    const { width: w, height: h, depth: d } = c.geometry.parameters, linhas = Math.floor((h - 3) / 4), cols = Math.floor((w - 1) / 3);
    for (let r = 0; r < linhas; r++) for (let q = 0; q < cols; q++) alvos.push([c.position.x - w / 2 + 1.5 + q * 3, c.position.y - h / 2 + 3 + r * 4, c.position.z + d / 2 + 0.04]);
  }
  const janelas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1.2, 0.06), new THREE.MeshBasicMaterial({ color: 0xffd48a }), alvos.length);
  janelas.name = 'janelas-cidade'; janelas.frustumCulled = false; cob.add(janelas);
  const mtx = new THREE.Matrix4(), zero = new THREE.Matrix4().makeScale(0, 0, 0); let nivelLuz = -1;
  const acenderCidade = (k) => {
    k = Math.round(clamp01(k) * 50) / 50; if (k === nivelLuz) return; nivelLuz = k;
    alvos.forEach((p, i) => janelas.setMatrixAt(i, hash(i, 7) < k ? mtx.makeTranslation(p[0], p[1] + 0, p[2]) : zero));
    janelas.instanceMatrix.needsUpdate = true;
  };
  acenderCidade(0);

  const terreno = criarTerreno(); raiz.add(terreno);

  // grua: reuso com mastro estendido (secoes clonadas) e travas amarradas na torre
  const grua = criarGruaTorre(); grua.group.name = 'grua'; grua.group.userData.id = 'grua';
  for (let i = 6; i < ALTURA_MASTRO_SECOES; i++) { const s = grua.sections[0].clone(true); s.name = 'secao-' + (i + 1); s.position.y = 0.28 + i * 7.2; grua.group.add(s); }
  grua.top.position.y = 0.28 + ALTURA_MASTRO_SECOES * 7.2;
  grua.tie.visible = false;   // trava do reuso: viga solta apontando para o ar neste cenario (as amarras reais estao abaixo)
  grua.group.position.set(19, 0, -6); grua.group.rotation.y = 0; raiz.add(grua.group);
  const cinza = mat(COR.metal);
  for (const y of [20, 44, 68]) { const bar = caixa(grua.group, cinza, 8.2, 0.3, 0.3, -4.6, y, 0); bar.name = 'amarra-' + y; }  // mastro (x=19) ate a face leste (x=10)
  caixa(grua.group, mat(COR.escuro), 5, 0.6, 5, 0, 0.3, 0);      // sapata de concreto do mastro
  sombra(grua.group, 7, 7, 0, 0, 0.62, 0.15);

  // elevador de obra (reuso) na face oeste, cabine em coordenadas do mundo
  const elev = criarElevadorObra(); elev.group.position.set(0, 0, 0);
  const wrap = grupo('elevador-obra', raiz); wrap.position.set(-12.8, CHAO_REUSO - 0.25, 0); wrap.rotation.y = -Math.PI / 2; wrap.add(elev.group);
  const trilho = mat(0x5b6970);
  for (const x of [-5, 5]) caixa(elev.group, trilho, 0.28, 14, 0.28, x, 10.5 - 0.0 + 0, -1.8);   // extensao dos trilhos ate ~y=76
  const api = {
    group: raiz, cidade: cob, terreno, grua, elevador: elev, elevadorWrap: wrap, LOTE,
    ids: { terreno, grua: grua.group, 'elevador-obra': wrap, cidade: cob },
    updateAt(t, p = {}) {
      const g = p.gancho ?? { carrinho: 20, altura: 6, giro: 0.2 };
      animarGancho(grua, g);
      animarElevador(elev, (p.elevadorY ?? 0) - (CHAO_REUSO - 0.25));
      const k = clamp01(p.terrenoPronto ?? 0), d = terreno.userData;
      d.terraMat.color.set(COR.terraMole).lerp(new THREE.Color(0x6ea85a), k);
      d.calcada.visible = k > 0.5; d.arvores.visible = k > 0.5; d.tapume.visible = k < 0.5;
      const can = p.canteiro ?? true; grua.group.visible = can; wrap.visible = can;   // canteiro (grua + elevador de obra) some com a torre pronta
      acenderCidade(p.luzesCidade ?? 0);
    },
  };
  return api;
}
