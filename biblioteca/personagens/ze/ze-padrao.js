/**
 * ZÉ — versão PADRÃO (2026-11-06). Use este arquivo nos vídeos novos.
 * Corpo, poses e expressões da v4 + cabelo preto rente com topete reto na frente,
 * sobrancelhas sempre visíveis e as 31 expressões do catálogo.
 *
 *   import { criarZe, luzPadrao } from './personagens/ze/ze-padrao.js';
 *   const ze = criarZe(); ze.pose('acenar').emocao('risoDentes');
 *
 * Mesma API da v4. Para outro visual (NPCs): ../estilos-cabeca/estilos.js.
 */
import { criarPersonagem } from '../estilos-cabeca/estilos.js';
export { PALETA, MEDIDAS, POSES, EMOCOES, suavizar, luzPadrao, sombraDeContato } from './ze-v4.js';

export const criarZe = (opcoes = {}) => criarPersonagem('principal', opcoes);
