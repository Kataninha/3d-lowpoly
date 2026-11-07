import * as THREE from 'three';

const groups=new WeakMap(), pieces=new WeakMap(), materials=new WeakMap();
const clamp=x=>Math.max(0,Math.min(1,x));
function windowOK(t,t0,dur){if(!Number.isFinite(t)||!Number.isFinite(t0)||!Number.isFinite(dur)||dur<=0) throw Error('Tempo ou duração inválidos');}
function register(state,key,event){state.events.set(key,event);return [...state.events.values()].sort((a,b)=>a.t0-b.t0 || a.key.localeCompare(b.key));}
function easeValue(easing,u){if(easing===undefined || easing==='linear') return u;if(typeof easing==='function') return clamp(easing(u));if(easing==='sine.inOut') return (1-Math.cos(Math.PI*u))/2;throw Error('Easing inválido');}

// Each event is registered once; the last started event controls a seek.
export function montarPorUnidades(grupo,t,{t0=0,dur,ordem='baixo-cima',easing}={}) {
  windowOK(t,t0,dur);
  if(!['baixo-cima','perimetro','indice'].includes(ordem)) throw Error('Ordem inválida');
  let state=groups.get(grupo);
  if(!state){state={events:new Map(),children:grupo.children.map((object,index)=>({object,index,position:object.position.clone(),scale:object.scale.clone(),visible:object.visible}))};groups.set(grupo,state)}
  const key=JSON.stringify([t0,dur,ordem,typeof easing==='function'?String(easing):easing]);
  const events=register(state,key,{key,t0,dur,ordem,easing});
  const event=events.filter(e=>t>=e.t0).at(-1) || events[0];
  const children=[...state.children];
  const center=children.reduce((v,c)=>v.add(c.position),new THREE.Vector3()).multiplyScalar(1/(children.length||1));
  if(event.ordem==='baixo-cima') children.sort((a,b)=>a.position.y-b.position.y||a.index-b.index);
  if(event.ordem==='perimetro') children.sort((a,b)=>Math.atan2(a.position.z-center.z,a.position.x-center.x)-Math.atan2(b.position.z-center.z,b.position.x-center.x)||a.position.y-b.position.y||a.index-b.index);
  const span=Math.min(.12,event.dur), step=children.length>1?(event.dur-span)/(children.length-1):0;
  children.forEach((c,i)=>{
    const progress=clamp((t-event.t0-i*step)/span);
    const u=easeValue(event.easing,progress);
    c.object.visible=t>=event.t0+i*step;
    c.object.position.copy(c.position);c.object.scale.copy(c.scale).multiplyScalar(.9+.1*u);
  });
}
function localBounds(object){
  object.updateWorldMatrix(true,true);const inverse=object.matrixWorld.clone().invert(), box=new THREE.Box3();
  object.traverse(o=>{if(o.isMesh && o.geometry){o.geometry.computeBoundingBox();if(o.geometry.boundingBox)box.union(o.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)))} });
  if(box.isEmpty()) throw Error('Peça sem geometria');return box;
}
export function crescerPeca(peca,t,{eixo='y',t0=0,dur=1.2,de=.02}={}) {
  windowOK(t,t0,dur);if(!['x','y','z'].includes(eixo)||!Number.isFinite(de)||de<0||de>1)throw Error('Eixo ou escala inicial inválidos');
  let s=pieces.get(peca);if(!s){s={events:new Map(),position:peca.position.clone(),scale:peca.scale.clone(),bounds:localBounds(peca)};pieces.set(peca,s)}
  const key=JSON.stringify([t0,dur,eixo,de]), events=register(s,key,{key,t0,dur,eixo,de});
  const e=events.filter(v=>t>=v.t0).at(-1)||events[0], u=clamp((t-e.t0)/e.dur), factor=e.de+(1-e.de)*u;
  peca.position.copy(s.position);peca.scale.copy(s.scale);peca.scale[e.eixo]=s.scale[e.eixo]*factor;
  const delta=new THREE.Vector3();delta[e.eixo]=s.bounds.min[e.eixo]*s.scale[e.eixo]*(1-factor);delta.applyQuaternion(peca.quaternion);peca.position.add(delta);
}
export function camadaTranslucida(peca,t,{t0=0,dur=1.6,opacidade=.25}={}) {
  windowOK(t,t0,dur);if(!Number.isFinite(opacidade)||opacidade<0||opacidade>1)throw Error('Opacidade inválida');
  let s=materials.get(peca);if(!s){const meshes=[];peca.traverse(o=>{if(o.isMesh && o.material){const original=o.material;const clones=(Array.isArray(original)?original:[original]).map(m=>m.clone());meshes.push({o,original,clones})}});s={events:new Map(),meshes};materials.set(peca,s)}
  const key=JSON.stringify([t0,dur,opacidade]), events=register(s,key,{key,t0,dur,opacidade});
  const e=events.filter(v=>t>v.t0 && t<v.t0+v.dur).at(-1);
  for(const m of s.meshes){if(!e){m.o.material=m.original;continue}const phase=Math.min(1,(t-e.t0)/.3,(e.t0+e.dur-t)/.3);const factor=1-(1-e.opacidade)*phase;m.clones.forEach((clone,i)=>{const base=Array.isArray(m.original)?m.original[i]:m.original;clone.opacity=base.opacity*factor;clone.transparent=true;clone.depthWrite=false});m.o.material=Array.isArray(m.original)?m.clones:m.clones[0]}
}