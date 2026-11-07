import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { criarPeca } from '../../efeitos/contorno-toon.js';

// All dimensions are metres. Motion is computed directly from the requested time.
export function criarPanela({ corte = false, seed = 701, graos: opcoesGraos = {} } = {}) {
  const raiz = new THREE.Group(); raiz.name = 'panela-de-pressao';
  const metal = new THREE.MeshStandardMaterial({color:0xb8c2cc, metalness:.55, roughness:.38, flatShading:true, side:THREE.DoubleSide});
  const azul = new THREE.MeshStandardMaterial({color:0x193f8b, roughness:.72});
  const preto = new THREE.MeshStandardMaterial({color:0x25272c, roughness:.75});
  const ouro = new THREE.MeshStandardMaterial({color:0xc7a23b, metalness:.65, roughness:.35});
  const vermelho = new THREE.MeshStandardMaterial({color:0xc93432, roughness:.68});
  const peca = (g,m,parent,pos=[0,0,0],outline=.0012) => {const p=criarPeca(g,m,{espessura:outline});p.position.set(...pos);parent.add(p);return p};
  const caixa=(x,y,z)=>new THREE.BoxGeometry(x,y,z);
  const cyl=(r1,r2,h,n=32,open=false,start=0,len=Math.PI*2)=>new THREE.CylinderGeometry(r1,r2,h,n,1,open,start,len);
  // A 180-degree pot rotation points the handle towards Ze. In section view
  // the remaining wall must face away from the viewer to expose the filling.
  const start=corte?-Math.PI/2:0, len=corte?Math.PI:Math.PI*2;
  const corpo=new THREE.Group();corpo.name='corpo';raiz.add(corpo);
  peca(cyl(.11,.10,.165,32,true,start,len),metal,corpo,[0,.0925,0]);
  peca(cyl(.105,.095,.165,32,true,start,len),metal,corpo,[0,.0925,0],.0005);
  peca(cyl(.10,.10,.012,32,false,start,len),metal,corpo,[0,.006,0]);
  // Rotate the torus geometry into the XZ plane before applying the cut angle.
  // Keeping the gasket at a fixed local Y makes it impossible to drift off the lid.
  // Torus half-arc and cut cylinder both retain local +Z, which becomes the
  // rear wall after the whole pot turns PI about Y. No loose forward rim.
  const ring=(r,t,material,parent,y,arc=len)=>{const g=new THREE.TorusGeometry(r,t,8,64,arc);g.rotateX(Math.PI/2);return peca(g,material,parent,[0,y,0]);};
  ring(.107,.003,metal,corpo,.175);
  if(corte){for(const x of [-1,1]) peca(caixa(.005,.165,.005),metal,corpo,[x*.105,.0925,0]);}
  const abas=new THREE.Group();abas.name='abas';corpo.add(abas);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;const q=peca(caixa(.025,.009,.015),metal,abas,[Math.cos(a)*.112,.174,Math.sin(a)*.112]);q.rotation.y=-a;}
  const tampa=new THREE.Group();tampa.name='tampa';raiz.add(tampa);
  // Extruded perimeter steps inwards at the front: an actual notch in the lid.
  if(!corte){
    const perfil=new THREE.Shape();
    for(let i=0;i<=96;i++){const a=i*Math.PI*2/96;const radius=Math.cos(a)>.98?.094:.108;const x=Math.sin(a)*radius,z=Math.cos(a)*radius;if(i===0)perfil.moveTo(x,z);else perfil.lineTo(x,z);}
    perfil.closePath();const borda=peca(new THREE.ExtrudeGeometry(perfil,{depth:.018,bevelEnabled:false,steps:1}),metal,tampa,[0,.194,0]);borda.rotation.x=Math.PI/2;
  } else peca(cyl(.099,.108,.018,32,false,start,len),metal,tampa,[0,.185,0]);
  // Lid groove with a captive gasket; in section the visible half is still attached.
  const canaleta=ring(.100,.006,metal,tampa,.183);canaleta.name='canaleta-anel';
  const anel=ring(.100,.0038,azul,tampa,.178);anel.name='anel-vedacao';
  const travas=new THREE.Group();travas.name='travas';tampa.add(travas);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;const q=peca(caixa(.023,.005,.014),metal,travas,[Math.cos(a)*.110,.166,Math.sin(a)*.110]);q.rotation.y=-a;}
  const pino=new THREE.Group();pino.name='pino-regulador';pino.position.y=.198;tampa.add(pino);
  peca(cyl(.005,.005,.018,12),metal,pino,[0,.009,0]);
  peca(cyl(.012,.014,.012,12),ouro,pino,[0,.021,0]);
  peca(cyl(.009,.012,.006,12),ouro,pino,[0,.03,0]);
  const valvula=new THREE.Group();valvula.name='valvula-seguranca';valvula.position.set(.057,.197,-.025);tampa.add(valvula);
  peca(cyl(.010,.010,.007,12),vermelho,valvula);peca(cyl(.003,.003,.008,8),metal,valvula,[0,.005,0]);
  const cabos=new THREE.Group();cabos.name='cabos-corpo';corpo.add(cabos);
  peca(new RoundedBoxGeometry(.115,.021,.030,3,.009),preto,cabos,[.162,.158,0]);
  const caboTampa=new THREE.Group();caboTampa.name='cabo-tampa';tampa.add(caboTampa);
  peca(new RoundedBoxGeometry(.102,.015,.025,3,.007),preto,caboTampa,[.158,.187,0]);
  peca(new RoundedBoxGeometry(.050,.018,.029,3,.008),preto,cabos,[-.128,.158,0]);
  const trava=peca(cyl(.003,.003,.017,8),metal,cabos,[.125,.177,0]);trava.name='trava-interna';
  // Gap in the outer lip, with the blue gasket visible as the safety window.
  const janela=new THREE.Group();janela.name='janela-seguranca';tampa.add(janela);
  const liquido=new THREE.Mesh(cyl(.096,.093,.079,32,false,start,len),new THREE.MeshStandardMaterial({color:0xbd7425,transparent:true,opacity:.38,depthWrite:false,roughness:.24,side:THREE.DoubleSide}));liquido.position.y=.052;liquido.visible=corte;raiz.add(liquido);
  let s=seed>>>0;const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
  const quantidadeGraos=opcoesGraos.quantidade??30, raioGrao=opcoesGraos.raio??.008;
  const graos=[];
  for(let i=0;i<quantidadeGraos;i++){
    const geo=new THREE.SphereGeometry(raioGrao,10,7);
    // Taper and bend the bean slightly; its flattened oval silhouette reads at small scale.
    const pos=geo.attributes.position;
    for(let j=0;j<pos.count;j++){
      const x=pos.getX(j),y=pos.getY(j),z=pos.getZ(j);
      pos.setXYZ(j,x*(1-.18*Math.abs(y)),y,z+.12*x*x/raioGrao);
    }
    geo.computeVertexNormals();
    const variation=(rand()-.5)*.20;
    const color=new THREE.Color('#6b2f1f');
    color.offsetHSL(variation*.12,variation*.20,variation*.35);
    const material=new THREE.MeshStandardMaterial({color,roughness:.8,flatShading:true});
    const b=peca(geo,material,raiz,[0,0,0],Math.min(.00015,raioGrao*.025));
    b.scale.set(1,.66,.72);b.visible=corte;
    graos.push({b,phase:rand()*Math.PI*2,angle:rand()*Math.PI*2,offset:rand()});
  }
  const espuma=[];const foamMat=new THREE.MeshStandardMaterial({color:0xffe6b6,roughness:.8});
  for(let i=0;i<90;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*.088;const b=peca(new THREE.IcosahedronGeometry(.0035+rand()*.003,0),foamMat,raiz,[Math.cos(a)*r,.093+rand()*.002,Math.sin(a)*r],.0002);b.visible=corte&&b.position.z<0;espuma.push(b);}
  const vapor=[];const vm=new THREE.MeshBasicMaterial({color:0xf4f5ef,transparent:true,opacity:.25,depthWrite:false});
  for(let i=0;i<60;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.0022,1),vm);m.userData={phase:rand(),angle:rand()*Math.PI*2};raiz.add(m);vapor.push(m);}
  // Thick mesh arrows are attached to the pot body, independent of any camera move.
  const setas=new THREE.Group();setas.name='setas-pressao-3d';corpo.add(setas);
  const pressureLocations=[
    [-.071,.081,-.038,-1,.14,0],
    [ .072,.100,-.035, 1,.08,0],
    [-.063,.140,-.020,-.8,.55,0],
    [ .058,.148,-.020, .65,.76,0],
    [ .002,.149,-.067, 0,1,0],
  ];
  for(const [x,y,z,dx,dy,dz] of pressureLocations){
    // Separate origins beside the exposed walls and below the lid.
    const dir=new THREE.Vector3(dx,dy,dz).normalize();
    const arrow=new THREE.Group();
    arrow.position.set(x,y,z);
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
    peca(cyl(.005,.005,.034,12),vermelho,arrow,[0,.017,0],.001);
    peca(new THREE.ConeGeometry(.012,.023,12),vermelho,arrow,[0,.044,0],.001);
    setas.add(arrow);
  }
  setas.visible=false;
  function atualizar(t){for(const v of graos){const u=(t*.13+v.offset)%1;const y=.018+.068*(.5-.5*Math.cos(u*2*Math.PI));const rad=.012+.070*(.5-.5*Math.cos(u*Math.PI));v.b.position.set(Math.cos(v.angle)*rad,y,-Math.abs(Math.sin(v.angle)*rad));v.b.rotation.set(t+v.phase,t*.7+v.phase,0);}for(const m of vapor){const u=(t*.24+m.userData.phase)%1;const radius=u*.065; m.position.set(Math.cos(m.userData.angle)*radius,.225+u*.23,Math.sin(m.userData.angle)*radius);m.scale.setScalar(.7+u*2);}}
  atualizar(0);return {raiz,corpo,tampa,canaleta,anel,travas,pino,valvula,janela,caboTampa,cabos,trava,setas,liquido,graos,espuma,vapor,atualizar};
}
