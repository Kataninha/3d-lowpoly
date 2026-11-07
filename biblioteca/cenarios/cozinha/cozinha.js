import * as THREE from 'three';
import { criarPeca } from '../../efeitos/contorno-toon.js';

// Kitchen at one unit per metre; floor y=0 and stovetop y=.90.
export function criarCozinha(){
 const raiz=new THREE.Group();raiz.name='cozinha';
 const mat=(c)=>new THREE.MeshStandardMaterial({color:c,roughness:.8,flatShading:true});
 const white=mat(0xe9e7de), grout=mat(0xaaaead), dark=mat(0x30343b), wood=mat(0xc5a582), steel=mat(0xaebbc0);
 const blue=mat(0x146be8), paleBlue=mat(0xc3eaff);
 const box=(x,y,z)=>new THREE.BoxGeometry(x,y,z);
 const add=(g,m,p=raiz,pos=[0,0,0],outline=.004)=>{const o=criarPeca(g,m,{espessura:outline});o.position.set(...pos);p.add(o);return o};
 add(box(5,.06,6),grout,raiz,[0,-.035,1.5]);
 const floorAlt=mat(0xd7dbd7);
 for(let x=0;x<13;x++)for(let z=0;z<16;z++)add(box(.385,.012,.36),((x+z)%2?white:floorAlt),raiz,[-2.4+x*.4,-.001,-1.31+z*.375],.001);
 add(box(5,5,.08),grout,raiz,[0,2.5,-1.43]);
 for(let x=0;x<25;x++)for(let y=0;y<25;y++)add(box(.194,.194,.015),white,raiz,[-2.4+x*.2,.1+y*.2,-1.378],.0007);
 // Solid four-burner range, oven front and individual controls.
 const fogao=new THREE.Group();fogao.position.set(-.45,0,-.85);raiz.add(fogao);
 add(box(.64,.88,.62),white,fogao,[0,.44,0]);add(box(.63,.02,.62),steel,fogao,[0,.89,0]);
 add(box(.49,.40,.018),dark,fogao,[0,.36,.317]);add(box(.40,.25,.012),mat(0x68777a),fogao,[0,.37,.327]);
 add(box(.46,.018,.035),steel,fogao,[0,.61,.335]);
 for(let i=0;i<4;i++){const o=add(new THREE.CylinderGeometry(.023,.023,.018,12),dark,fogao,[-.22+i*.145,.755,.325],.001);o.rotation.x=Math.PI/2;}
 const flames=[];
 for(const x of [-.16,.16])for(const z of [-.15,.15]){
  const burner=add(new THREE.CylinderGeometry(.075,.075,.013,20),dark,fogao,[x,.91,z],.001);
  for(let k=0;k<4;k++){let a=add(box(.18,.009,.009),dark,fogao,[x,.925,z],.0008);a.rotation.y=k*Math.PI/4;}
  if(x<0&&z>0){
   // Gas ports and upright two-tone flames sit below the pot's bottom (Y=.932).
   for(let k=0;k<14;k++){
    const a=k*Math.PI*2/14;
    const px=x+Math.cos(a)*.055,pz=z+Math.sin(a)*.055;
    add(new THREE.CylinderGeometry(.0045,.0045,.002,8),dark,fogao,[px,.918,pz],.0002);
    const f=new THREE.Group();f.name=`chama-queimador-${k}`;
    f.position.set(px,.915,pz);fogao.add(f);
    add(new THREE.ConeGeometry(.006,.014,9),blue,f,[0,.008,0],.0002);
    add(new THREE.ConeGeometry(.003,.006,9),paleBlue,f,[0,.0125,0],.0001);
    flames.push(f);
   }
  }
 }
 const bancada=new THREE.Group();bancada.position.set(.58,0,-1.02);raiz.add(bancada);
 add(box(1.25,.82,.55),white,bancada,[0,.41,0]);add(box(1.30,.07,.60),wood,bancada,[0,.855,0]);
 for(let i=0;i<3;i++){add(box(.39,.62,.015),white,bancada,[-.41+i*.41,.36,.282]);add(box(.12,.015,.025),dark,bancada,[-.41+i*.41,.56,.30]);}
 add(box(.43,.025,.34),dark,bancada,[.22,.902,0]);add(box(.37,.018,.28),steel,bancada,[.22,.91,0]);
 let faucet=add(new THREE.TorusGeometry(.085,.010,5,16,Math.PI),steel,bancada,[.22,1.015,-.18]);faucet.rotation.y=Math.PI/2;
 const arm=new THREE.Group();arm.position.set(.5,1.93,-1.18);raiz.add(arm);
 add(box(1.25,.60,.35),white,arm);for(let i=0;i<3;i++){add(box(.39,.52,.015),white,arm,[-.41+i*.41,0,.18]);add(box(.02,.12,.02),dark,arm,[-.29+i*.41,0,.20]);}
 // Window and sun: both are physical surfaces on the wall.
 add(box(.76,.65,.04),wood,raiz,[-1.26,1.85,-1.32]);add(box(.66,.55,.04),mat(0x9dcde1),raiz,[-1.26,1.85,-1.29]);
 add(box(.035,.55,.02),white,raiz,[-1.26,1.85,-1.26]);add(box(.66,.035,.02),white,raiz,[-1.26,1.85,-1.25]);
 const sol=add(new THREE.CircleGeometry(.095,20),mat(0xffdc77),raiz,[-1.40,1.97,-1.245]);
 // Door at the back right, available for the later dog action.
 add(box(.67,2.05,.04),wood,raiz,[1.54,1.025,-1.32]);add(box(.55,1.89,.03),mat(0xe5d3b7),raiz,[1.54,1.02,-1.285]);
 add(new THREE.SphereGeometry(.018,8,6),ouro(),raiz,[1.35,.94,-1.25]);
 function ouro(){return mat(0xb89c4b)}
 function atualizar(t){flames.forEach((f,i)=>{
  f.scale.y=.82+.17*(.5+.5*Math.sin(t*11+i*1.3));
  f.rotation.z=.09*Math.sin(t*9+i*.8);
  f.rotation.x=.07*Math.sin(t*8+i*1.2);
 });}
 return {raiz,fogao,bancada,flames,atualizar,panelaPos:new THREE.Vector3(-.61,.932,-.70)};
}
