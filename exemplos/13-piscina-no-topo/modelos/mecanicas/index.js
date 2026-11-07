// Registro das mecanicas do video 13: CENAS[nome] = {criar, animar, dur, tempos, cam}.
import { cenas as solo } from './solo.js';
import { cenas as estrutura } from './estrutura.js';
import { cenas as piscina } from './piscina.js';
import { cenas as maquinas } from './maquinas.js';
export const CENAS = { ...solo, ...estrutura, ...piscina, ...maquinas };
