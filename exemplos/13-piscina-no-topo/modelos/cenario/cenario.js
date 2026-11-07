// Cenario completo do video 13: torre + sala (embutida no andar 12) + obra/cidade + raio-X + ambiente. Escala 1 u = 0,5 m, chao y = 0.
// API:
//   const cen = criarCenario(scene);                       // adiciona tudo na cena; cen.ids = { torre, sala, sofa, 'teto-sala', 'painel-carga', 'robo-aspirador', piscina, terreno, grua, ... }
//   cen.updateAt(t, p)  p = { hora, torre:{altura,vestir,padrao,led,piscina,elevador}, sala:{painel,trinca,vergar,lustre,luminaria,robo},
//                             obra:{gancho,elevadorY,terrenoPronto,luzesCidade}, raioX:{t0,dur,opacidade,varrer}, corte:{plano}, salaAberta:bool }
//   salaAberta true = corte 3D da sala dentro da torre (fachada do andar 12 some, paredes da sala aparecem).
//   Tudo e funcao pura de (t, p): seek em qualquer ordem. Cenario obra x torre pronta: p.torre.altura (0..12) e p.torre.padrao ('cru'|'vestido').
import { criarTorre, TORRE } from './torre.js';
import { criarSala } from './sala.js';
import { criarObra } from './obra.js';
import { criarRaioX } from './raiox.js';
import { criarAmbiente } from './ambiente.js';

export function criarCenario(scene) {
  const obra = criarObra(), torre = criarTorre(), sala = criarSala();
  torre.encaixarSala(sala);
  scene.add(obra.group, torre.group);
  const ambiente = criarAmbiente(scene), rx = criarRaioX(torre);
  const ids = { ...obra.ids, ...torre.ids, sofa: sala.sofa, 'teto-sala': sala.teto, 'painel-carga': sala.painel, 'robo-aspirador': sala.robo, sala: sala.group, torre: torre.group };
  const cen = {
    scene, obra, torre, sala, raioX: rx, ambiente, ids, TORRE,
    updateAt(t, p = {}) {
      ambiente.updateAt(p.hora ?? 1);
      obra.updateAt(t, p.obra);
      const aberta = !!p.salaAberta;
      sala.embutir(true, { comParedes: aberta });
      torre.updateAt(t, p.torre);
      torre.fachadas[11].visible = torre.fachadas[11].visible && !aberta;
      sala.updateAt(t, p.sala);
      if (p.raioX) rx.updateAt(t, p.raioX); else rx.updateAt(-1e6, { t0: 0, dur: 1 });
      rx.cortar(torre.group, p.corte?.plano ?? null);
    },
  };
  return cen;
}
export { criarTorre, criarSala, criarObra, criarRaioX, criarAmbiente };
