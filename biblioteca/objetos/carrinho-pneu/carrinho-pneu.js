import * as THREE from '../../vendor/three.module.js';
// Small car + bottle jack with pump lever, to explain "a little jack lifts a car". Scale of Ze v3 (4.84 u = 1.75 m):
// car 11.5 u long, tyre 1.8 u across. The jack sits under the rear-left sill (x -3, z +2); Ze pumps from z +8.
const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,flatShading:true,roughness:.8,...o});
const body=M(0xe2453c),cabin=M(0xf1efe8),glass=M(0x7aaab8),tyre=M(0x26282c),hub=M(0xc8ccd0),jackBlue=M(0x2f6fb5),steel=M(0x5a5f66),rod=M(0xe5e6dc,{metalness:.4,roughness:.35});
function box(p,d,o,m){const x=new THREE.Mesh(new THREE.BoxGeometry(...d),m);x.position.set(...o);x.castShadow=x.receiveShadow=true;p.add(x);return x;}
function disc(p,r,h,o,m,axis='z'){const x=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),m);if(axis==='z')x.rotation.x=Math.PI/2;x.position.set(...o);x.castShadow=true;p.add(x);return x;}
function roda(p,x,z){const w=new THREE.Group();w.position.set(x,.9,z);p.add(w);disc(w,.9,.6,[0,0,0],tyre);disc(w,.5,.64,[0,0,0],hub);for(let k=0;k<5;k++){const a=k*Math.PI*2/5;box(w,[.14,.14,.7],[.3*Math.cos(a),.3*Math.sin(a),0],steel);}return w;}
export function criarCarrinhoPneu(){const group=new THREE.Group();group.name='carrinho-pneu';
const carro=new THREE.Group();carro.name='carro';group.add(carro);const carroceria=new THREE.Group();carroceria.name='carroceria';carroceria.position.y=1.7;carro.add(carroceria);
box(carroceria,[11.5,1.6,4.6],[0,.4,0],body);box(carroceria,[6.2,1.6,4.2],[-.6,1.9,0],cabin);box(carroceria,[6.3,1.0,4.3],[-.6,1.9,0],glass);box(carroceria,[1.4,.5,4.7],[5.4,.5,0],steel);box(carroceria,[1.4,.5,4.7],[-5.4,.5,0],steel);for(const z of [-1.6,1.6])box(carroceria,[.2,.5,.8],[5.8,.9,z],M(0xffe9a0,{emissive:0x806000}));
const rodas=[[3.6,-2.4],[3.6,2.4],[-3.6,-2.4],[-3.6,2.4]].map(([x,z])=>roda(carro,x,z));
const pneu=new THREE.Group();pneu.name='pneu-reserva';pneu.position.set(-7.5,.3,4.6);group.add(pneu);disc(pneu,.9,.6,[0,0,0],tyre,'y');disc(pneu,.5,.64,[0,0,0],hub,'y');
const macaquinho=new THREE.Group();macaquinho.name='macaquinho';macaquinho.position.set(-3,0,2);group.add(macaquinho);box(macaquinho,[1.5,.25,1.5],[0,.125,0],steel);const corpo=disc(macaquinho,.5,.9,[0,.7,0],jackBlue,'y');const haste=disc(macaquinho,.24,.6,[0,1.2,0],rod,'y');const sela=disc(macaquinho,.45,.12,[0,1.5,0],steel,'y');
const alavanca=new THREE.Group();alavanca.name='alavanca';alavanca.position.set(0,.8,.55);macaquinho.add(alavanca);box(alavanca,[.14,.14,4.4],[0,0,2.2],steel);box(alavanca,[.22,.22,.7],[0,0,4.15],M(0x1d1b2a));
return {group,carro,carroceria,rodas,pneu,macaquinho,haste,sela,alavanca,pega:alavanca.children[1]};}
const clamp=t=>Math.max(0,Math.min(1,t));
// Absolute pose for t in [0,1]: lever pumps `ciclos` times, ram rises, the rear-left corner of the car lifts up to 1.3 u.
export function animarMacaquinho(m,t,ciclos=5){const p=clamp(t),lift=1.3*p*p*(3-2*p);m.alavanca.rotation.x=-.55+.18*Math.sin(2*Math.PI*ciclos*p+Math.PI/2);m.haste.scale.y=1+lift/.6*.9;m.haste.position.y=1.2+lift/2*.9;m.sela.position.y=1.5+lift*.9;
m.carroceria.position.y=1.7+lift*.6;m.carroceria.rotation.z=-lift/9;m.carroceria.rotation.x=-lift/6.5;m.rodas[3].position.y=.9+lift*.9;}
