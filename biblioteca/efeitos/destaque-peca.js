import * as THREE from 'three';

const destaques=new WeakMap(), rotulos=new WeakMap();
// Events stay registered so any call can rebuild the complete state for a seek.
function registrar(mapa, peca, chave, evento) {
  let eventos=mapa.get(peca);
  if (!eventos) { eventos=new Map(); mapa.set(peca,eventos); }
  eventos.set(chave,evento);
  return [...eventos.values()].sort((a,b)=>a.t0-b.t0 || a.chave.localeCompare(b.chave));
}
const eventosDestaque=new WeakMap(), eventosRotulo=new WeakMap();
const clamp=x=>Math.max(0,Math.min(1,x));
function corValor(cor) {
  if (typeof cor==='string' && cor.startsWith('--')) {
    const value=getComputedStyle(document.documentElement).getPropertyValue(cor).trim();
    if (!value) throw new Error('Token de cor não definido: '+cor);
    return value;
  }
  return cor;
}
function validar(t0,dur) {
  if (!Number.isFinite(t0) || !Number.isFinite(dur) || dur<=0) throw new Error('Janela inválida');
}
function envelope(t,t0,dur) {
  const u=t-t0;
  return u<=0 || u>=dur ? 0 : Math.min(1,u/.1,(dur-u)/.15);
}

// Update on every seek. The piece itself glows: materials are cloned per mesh on first use and restored exactly at k=0.
export function destacarPeca(peca,t,{t0=0,dur=1,pulsos=2,cor='--cor-destaque'}={}) {
  validar(t0,dur);
  if (!Number.isFinite(pulsos) || pulsos<=0) throw new Error('Pulsos inválidos');
  let estados=destaques.get(peca);
  if (!estados) {
    estados=[];
    peca.traverse(o=>{
      // BackSide meshes are the dark outline hulls: they must stay dark.
      if(!o.isMesh || !o.material || o.userData.destaqueAuxiliar) return;
      const lista=(Array.isArray(o.material)?o.material:[o.material]).filter(m=>m.side!==THREE.BackSide);
      if(!lista.length) return;
      const clones=Array.isArray(o.material)?o.material.map(m=>m.side===THREE.BackSide?m:m.clone()):o.material.clone();
      o.material=clones;
      for(const m of (Array.isArray(clones)?clones:[clones])) {
        if(m.side===THREE.BackSide) continue;
        estados.push({m,color:m.color.clone(),emissive:m.emissive?.clone(),intensity:m.emissiveIntensity});
      }
    });
    destaques.set(peca,estados);
  }
  const chave=JSON.stringify([t0,dur,pulsos,cor]);
  const eventos=registrar(eventosDestaque,peca,chave,{chave,t0,dur,pulsos,cor});
  const ativo=eventos.filter(e=>envelope(t,e.t0,e.dur)>0).at(-1);
  const env=ativo ? envelope(t,ativo.t0,ativo.dur) : 0;
  // Each pulse rises from and returns to the piece's own colour.
  const k=ativo ? env*Math.sin(Math.PI*ativo.pulsos*(t-ativo.t0)/ativo.dur)**2 : 0;
  const alvo=k>0 ? new THREE.Color(corValor(ativo.cor)) : null;
  for(const e of estados) {
    e.m.color.copy(e.color);
    if(e.emissive) { e.m.emissive.copy(e.emissive); e.m.emissiveIntensity=e.intensity; }
    if(!alvo) continue;
    if(e.emissive) { e.m.emissive.copy(alvo); e.m.emissiveIntensity=k*.45; e.m.color.lerp(alvo,k); }
    else e.m.color.lerp(alvo,k);
  }
}

// Highlights hung on spoken words: destacar() registers, atualizar(t) runs every frame after the animators.
// destacarPeca clones the materials, so the clones stop following the originals (x-ray, burn): mirror them back.
export function criarDestaques(tempos) {
  const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]/gu,'');
  const registros=new Map();
  function espelhar(r,cores) {
    for(const {o,orig} of r.ms) {
      const atual=Array.isArray(o.material)?o.material:[o.material], base=Array.isArray(orig)?orig:[orig];
      atual.forEach((m,i)=>{
        const original=base[i]; if(m===original) return;
        if(m.transparent!==original.transparent) m.needsUpdate=true;
        m.opacity=original.opacity; m.transparent=original.transparent; m.depthWrite=original.depthWrite;
        if(cores) { m.color.copy(original.color); if(m.emissive) { m.emissive.copy(original.emissive); m.emissiveIntensity=original.emissiveIntensity; } }
      });
    }
  }
  function destacar(pecas,frase,palavra,k=0) {
    const w=tempos.palavras.filter(x=>x.frase===frase && norm(x.palavra)===norm(palavra))[k];
    if(!w) throw new Error(`Palavra ausente: ${frase} ${palavra} #${k}`);
    const ev={t0:w.inicio,dur:Math.min(1.1,Math.max(.7,w.fim-w.inicio))};
    for(const p of [].concat(pecas)) {
      if(!p) throw new Error(`Peça ausente no destaque: ${frase} ${palavra}`);
      let r=registros.get(p);
      if(!r) {
        r={p,ms:[],ev:[],clonado:false};
        p.traverse(o=>{ if(o.isMesh && o.material && !o.userData.destaqueAuxiliar) r.ms.push({o,orig:o.material}); });
        registros.set(p,r);
      }
      r.ev.push(ev);
    }
  }
  function atualizar(t) {
    for(const r of registros.values()) {
      if(r.ev.some(e=>t>e.t0-.05 && t<e.t0+e.dur+.05)) {
        for(const e of r.ev) destacarPeca(r.p,t,{t0:e.t0,dur:e.dur,pulsos:2,cor:'--cor-destaque'});
        r.clonado=true; espelhar(r,false);
      } else if(r.clonado) espelhar(r,true);
    }
  }
  return {destacar,atualizar};
}

// The default face is local +Y. Keep the camera tilt close to the surface.
export function rotuloEmPerspectiva(peca,texto,t,{t0=0,dur=1,camera,cor='--cor-destaque'}={}) {
  validar(t0,dur);
  let labels=rotulos.get(peca);
  if (!labels) {labels=new Map(); rotulos.set(peca,labels)}
  const chaveLabel=JSON.stringify([texto,cor]);
  let label=labels.get(chaveLabel);
  if (!label) {
    peca.updateWorldMatrix(true,true);
    const local=new THREE.Box3();
    const inverse=peca.matrixWorld.clone().invert();
    peca.traverse(o=>{
      if(!o.isMesh || !o.geometry || o.userData.destaqueAuxiliar) return;
      o.geometry.computeBoundingBox();
      if(o.geometry.boundingBox) local.union(o.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)));
    });
    if(local.isEmpty()) throw new Error('Peça sem geometria');
    const size=local.getSize(new THREE.Vector3()), center=local.getCenter(new THREE.Vector3());
    const canvas=document.createElement('canvas'); const ctx=canvas.getContext('2d');
    ctx.font='bold 120px sans-serif';
    canvas.width=Math.ceil(ctx.measureText(texto).width+48); canvas.height=176;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='bold 120px sans-serif';ctx.lineJoin='round';ctx.lineWidth=16;ctx.strokeStyle='#000';ctx.fillStyle=corValor(cor);
    ctx.strokeText(texto,canvas.width/2,canvas.height/2);ctx.fillText(texto,canvas.width/2,canvas.height/2);
    const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace;
    const width=Math.max(size.x*.9,.01), height=width*canvas.height/canvas.width;
    label=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    label.userData.destaqueAuxiliar=true; label.userData.ignorarCamera=true; label.position.set(center.x,local.max.y+.0015,center.z); label.rotation.x=-Math.PI/2;
    label.userData.faceY=local.max.y;
    labels.set(chaveLabel,label);
  }
  const chave=JSON.stringify([t0,dur,texto,cor]);
  const eventos=registrar(eventosRotulo,peca,chave,{chave,t0,dur,chaveLabel,camera});
  const ativo=eventos.filter(e=>envelope(t,e.t0,e.dur)>0).at(-1);
  for (const [nome,item] of labels) {
    const env=ativo && ativo.chaveLabel===nome ? envelope(t,ativo.t0,ativo.dur) : 0;
    item.visible=env>0; item.material.opacity=env;
    if(env>0 && item.parent!==peca) peca.add(item);
    else if(env===0 && item.parent) item.removeFromParent();
  }
  if (!ativo) return label;
  label=labels.get(ativo.chaveLabel); camera=ativo.camera;
  label.rotation.set(-Math.PI/2,0,0);
  if(camera) {
    peca.updateWorldMatrix(true,true); camera.updateWorldMatrix(true,false);
    const normal=new THREE.Vector3(0,1,0).transformDirection(peca.matrixWorld);
    const toward=camera.getWorldPosition(new THREE.Vector3()).sub(label.getWorldPosition(new THREE.Vector3())).normalize();
    const angle=normal.angleTo(toward);
    if(angle>1e-6) {
      const q=new THREE.Quaternion().setFromUnitVectors(normal,toward);
      const tilt=new THREE.Quaternion().slerp(q,Math.min(1,THREE.MathUtils.degToRad(15)/angle));
      const parent=peca.getWorldQuaternion(new THREE.Quaternion());
      label.quaternion.premultiply(parent.clone().invert().multiply(tilt).multiply(parent));
    }
  }
  // Keep every corner above the face even after tilting towards the camera.
  const {width,height}=label.geometry.parameters;
  const xAxis=new THREE.Vector3(1,0,0).applyQuaternion(label.quaternion);
  const yAxis=new THREE.Vector3(0,1,0).applyQuaternion(label.quaternion);
  label.position.y=label.userData.faceY+.0015+(Math.abs(xAxis.y)*width+Math.abs(yAxis.y)*height)/2;
  return label;
}
