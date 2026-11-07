import * as THREE from 'three';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const NOME_MARGEM=70, ANGULO_MAX=12;

// Project a piece to screen pixels. The tilt follows its visible horizontal edge, so names lean with the surface.
export function projetarPeca(peca,camera,largura=1080,altura=1920) {
  peca.updateWorldMatrix(true,true); camera.updateMatrixWorld();
  const box=new THREE.Box3().setFromObject(peca);
  if(box.isEmpty()) throw new Error('Peça sem geometria');
  const c=box.getCenter(new THREE.Vector3());
  const tela=v=>{const p=v.clone().project(camera);return {x:(p.x+1)/2*largura,y:(1-p.y)/2*altura,z:p.z};};
  const centro=tela(c);
  const pontas=[[box.min.x,c.y,c.z,box.max.x,c.y,c.z],[c.x,c.y,box.min.z,c.x,c.y,box.max.z]]
    .map(([a,b,d,e,f,g])=>[tela(new THREE.Vector3(a,b,d)),tela(new THREE.Vector3(e,f,g))])
    .sort((p,q)=>Math.abs(q[1].x-q[0].x)-Math.abs(p[1].x-p[0].x))[0];
  const [e,d]=pontas[0].x<=pontas[1].x?pontas:[pontas[1],pontas[0]];
  const angulo=clamp(THREE.MathUtils.radToDeg(Math.atan2(d.y-e.y,d.x-e.x)),-ANGULO_MAX,ANGULO_MAX);
  return {x:centro.x,y:centro.y,angulo,visivel:Math.abs(centro.z)<=1};
}

// Call after the 3D frame is ready. projetar(nome) answers {x,y,angulo,visivel} or null.
export function posicionarRotulos(projetar,raiz=document,largura=1080) {
  raiz.querySelectorAll('.apv-nome').forEach(nome=>{
    const p=projetar(nome.dataset.ancora);
    nome.style.display=p?.visivel?'':'none'; if(!p?.visivel) return;
    // A clip can still be hidden on its first frame: estimate the width and let CSS centre the text.
    const w=nome.offsetWidth||nome.textContent.length*50;
    const x=clamp(p.x,w/2+NOME_MARGEM,largura-w/2-NOME_MARGEM);
    nome.style.transform=`translate(${x}px,${p.y}px) translate(-50%,-50%) rotate(${p.angulo??0}deg)`;
  });
  raiz.querySelectorAll('.apv-ancorado').forEach(caixa=>{
    const pilula=caixa.querySelector('.apv-pilula'), ponto=caixa.querySelector('.apv-ponto'), haste=caixa.querySelector('.apv-haste');
    const fixo=caixa.dataset.fixo, p=fixo?{x:+fixo.split(',')[0],y:+fixo.split(',')[1],visivel:true}:projetar(caixa.dataset.ancora);
    caixa.style.display=p?.visivel?'':'none'; if(!p?.visivel) return;
    const w=pilula.offsetWidth||pilula.textContent.length*26+90, h=pilula.offsetHeight||64;
    if(fixo) { ponto.style.display=haste.style.display='none'; pilula.style.left=`${p.x-w/2}px`; pilula.style.top=`${p.y-h/2}px`; return; }
    const acima=p.y-130>300, cy=acima?p.y-130:p.y+130, cx=clamp(p.x,w/2+30,largura-w/2-30);
    pilula.style.left=`${cx-w/2}px`; pilula.style.top=`${cy-h/2}px`;
    const y0=acima?cy+h/2:cy-h/2, dx=p.x-cx, dy=p.y-y0;
    haste.style.cssText=`left:${cx}px;top:${y0}px;width:${Math.hypot(dx,dy)}px;transform:rotate(${Math.atan2(dy,dx)}rad)`;
    ponto.style.left=`${p.x-14}px`; ponto.style.top=`${p.y-14}px`;
  });
}
