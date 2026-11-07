// Integrador de cena: dados JSON carregados pelo chamador, antes da renderização.
// Alvos, resetarPecas e animadores são fornecidos pelo projeto de cada vídeo.
import * as THREE from 'three';
import { samplePose } from './kit/camera/diretor.js';
import * as moves from './kit/personagens/ze/moves.js';
import { criarDestaques } from './kit/efeitos/destaque-peca.js';

// Scene events hang on spoken words, so a new voice take needs no rewrite.
export function criarRelogio(tempos) {
  const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]/gu,'');
  const F=n=>{const f=tempos.frases.find(x=>x.n===n);if(!f)throw Error('Frase ausente: '+n);return f.inicio;};
  const W=(n,palavra,k=0)=>{const m=tempos.palavras.filter(x=>x.frase===n&&norm(x.palavra)===norm(palavra));if(!m[k])throw Error(`Palavra ausente: ${n} ${palavra} #${k}`);return m[k].inicio;};
  return {F,W};
}

// Arrays in move parameters represent 3D vectors, including nested parameters.
export function converterParametros(value, path='parametros') {
  if (Array.isArray(value)) {
    if (value.length!==3 || !value.every(n=>typeof n==='number' && Number.isFinite(n)))
      throw new TypeError(`${path}: vetor deve conter três números finitos`);
    return new THREE.Vector3(...value);
  }
  if (value && typeof value==='object' && !value.isVector3) {
    return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,converterParametros(v,`${path}.${k}`)]));
  }
  return value;
}

// Camera data is the single source; non-cut changes blend over 0.45 seconds.
export function calcularCamera(camera, keys, alvos, t) {
  function easing(u, nome) {
    u=Math.max(0,Math.min(1,u));
    if (nome === undefined) return u*u*(3-2*u); // Preserve existing projects without an explicit easing.
    if (nome==='linear') return u;
    if (nome==='sine.inOut') return (1-Math.cos(Math.PI*u))/2;
    if (nome==='power2.out') return 1-Math.pow(1-u,3);
    throw new Error('Easing de câmera desconhecido: '+nome);
  }
  let index=keys.length-1;
  while(index>=0 && t<keys[index].tempo) index--;
  if(index<0) throw new Error('Tempo anterior ao primeiro take de câmera');
  function quadro(k,tempo) {
    if (k.samples?.length) {
      const pose = samplePose(k.samples, tempo);
      return {posicao: new THREE.Vector3(...pose.position), alvo: new THREE.Vector3(...pose.target), fov: pose.fov};
    }
    const objeto=alvos[k.alvo];
    if(!objeto) throw new Error('Alvo de câmera ausente: '+k.alvo);
    objeto.updateWorldMatrix(true,true);
    const box=new THREE.Box3();
    function incluir(o) {
      if (o.userData.ignorarCamera) return;
      if (o.geometry) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        if (o.geometry.boundingBox) box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
      }
      for (const filho of o.children) incluir(filho);
    }
    incluir(objeto);
    if(box.isEmpty()) throw new Error('Alvo de câmera sem geometria');
    const alvo=box.getCenter(new THREE.Vector3()), size=box.getSize(new THREE.Vector3());
    const fov=k.fov, largura=Math.max(size.x,size.y*camera.aspect,size.z,.01);
    const distancia=largura/(2*Math.tan(THREE.MathUtils.degToRad(fov/2))*camera.aspect*.62);
    const direcao=new THREE.Vector3(...(k.direcao || k.posicao)).normalize();
    const u=Math.max(0,Math.min(1,(tempo-k.tempo)/k.duracao));
    const push=(k.push || 0)*easing(u,k.easing);
    return {posicao:alvo.clone().addScaledVector(direcao,distancia*(1-push)),alvo,fov};
  }
  const atual=keys[index], destino=quadro(atual,t);
  if(index>0 && !atual.corte && t<atual.tempo+.45) {
    const anterior=keys[index-1], origem=quadro(anterior,anterior.tempo+anterior.duracao);
    const u=Math.max(0,Math.min(1,(t-atual.tempo)/.45)), k=easing(u,atual.easing);
    destino.posicao.lerpVectors(origem.posicao,destino.posicao,k);
    destino.alvo.lerpVectors(origem.alvo,destino.alvo,k);
    destino.fov=THREE.MathUtils.lerp(origem.fov,destino.fov,k);
  }
  return destino;
}

// Scores without ze_tam (old projects) keep Zé visible.
// With `tempos` (voz/tempos.json), take.destaque ([alvo, palavra, frase] from gerar_partitura) lights the piece on the word.
export function criarMontagem({ze, camera, cameraData, partitura, alvos, animadores, resetarPecas, tempos}) {
  const takes = Array.isArray(partitura) ? partitura : partitura.takes;
  if (!takes?.length || !cameraData?.keyframes?.length || typeof resetarPecas !== 'function')
    throw new Error('Partitura, câmera e resetarPecas são obrigatórios');
  const destaques = tempos ? criarDestaques(tempos) : null;
  for (const take of takes) for (const [chave, palavra, frase] of take.destaque || []) {
    if (!destaques) throw new Error('Destaque exige tempos');
    if (!alvos[chave]) throw new Error('Alvo de destaque ausente: '+chave);
    destaques.destacar(alvos[chave], frase, palavra);
  }
  // Capture project placement explicitly once; moves never infer their own base.
  const base={posicao:ze.raiz.position.clone(),rotacao:ze.raiz.rotation.clone()};
  return function atualizar(t) {
    resetarPecas();
    for (const take of takes) {
      const animar = animadores[take.acao_peca];
      if (take.acao_peca && !animar) throw new Error('Animador ausente: '+take.acao_peca);
      if (animar) animar(t, take);
    }
    const take = takes.find(x => t >= x.t0 && t < x.t1);
    ze.raiz.visible = take?.ze_tam !== 'fora';
    moves.M08_idle(ze,t,{base});
    if (take?.ze && !/ausente/i.test(take.ze)) {
      const id = take.ze.match(/^M\d+/)?.[0];
      const nome = id && Object.keys(moves).find(x => x.startsWith(id+'_')); 
      if (!nome) throw new Error('Move desconhecido: '+take.ze);
      const parametros=converterParametros(take.parametros || {});
      const objeto = alvos[take.alvo];
      const alvo = parametros.alvo ?? objeto?.getWorldPosition(new THREE.Vector3());
      const alvoLocal = parametros.alvoLocal ?? (alvo && ze.raiz.worldToLocal(alvo.clone()));
      moves[nome](ze,t,{...parametros, alvo, alvoLocal, base, t0:take.t0, t1:take.t1});
    }
    // An explicit gaze in the score starts before its gesture, after the base move.
    const olhar=takes.reduce((escolhido,x) => {
      if (!x.olhar) return escolhido;
      const inicio=x.t0-(x.olhar.antecede ?? .25);
      if (t<inicio || t>=x.t1) return escolhido;
      const inicioEscolhido=escolhido && escolhido.t0-(escolhido.olhar.antecede ?? .25);
      return !escolhido || inicio>inicioEscolhido ? x : escolhido;
    },null);
    if (olhar) {
      const alvo=olhar.olhar.alvo ? alvos[olhar.olhar.alvo] : alvos[olhar.alvo];
      if (!alvo) throw new Error('Alvo de olhar ausente');
      moves.olharPara(ze,alvo,t,{t0:olhar.t0,t1:olhar.olhar.t1 ?? olhar.t0+.3,antecede:olhar.olhar.antecede ?? .25});
    }
    destaques?.atualizar(t);
    const quadro=calcularCamera(camera,cameraData.keyframes,alvos,t);
    camera.position.copy(quadro.posicao);
    camera.fov=quadro.fov; camera.updateProjectionMatrix(); camera.lookAt(quadro.alvo);
  };
}
