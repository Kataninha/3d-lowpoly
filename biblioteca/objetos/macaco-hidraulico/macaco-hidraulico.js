import * as THREE from '../../vendor/three.module.js';
const metal=new THREE.MeshStandardMaterial({color:0x536e7a,flatShading:true});const dark=new THREE.MeshStandardMaterial({color:0x3a3d42,flatShading:true});const yellow=new THREE.MeshStandardMaterial({color:0xe8b330,flatShading:true});const rod=new THREE.MeshStandardMaterial({color:0xe5e6dc,flatShading:true,metalness:.4,roughness:.35});const inner=new THREE.MeshStandardMaterial({color:0x38aaff,emissive:0x1269af,emissiveIntensity:.8,flatShading:true});
function box(g,d,p,m=metal){const o=new THREE.Mesh(new THREE.BoxGeometry(...d),m);o.position.set(...p);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
function cylinder(g,r,h,p,m){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),m);o.position.set(...p);o.castShadow=true;g.add(o);return o;}
export function criarMacacoHidraulico(){const group=new THREE.Group(),cage=new THREE.Group(),rails=new THREE.Group();group.name='macaco-hidraulico';group.add(cage,rails);// Front frame is hinged: it opens around the left front post.
for(const x of [-2,2])box(cage,[.22,10.2,.22],[x,5.1,-2]);
for(const y of [.1,10.1]){box(cage,[4.2,.22,.22],[0,y,-2]);for(const x of [-2,2])if(y<10||x<0)box(cage,[.22,.22,4.2],[x,y,0]);}
const gate=new THREE.Group();gate.name='porta-jaula';gate.position.set(-2,0,2);cage.add(gate);for(const x of [0,4])box(gate,[.22,10.2,.22],[x,5.1,0]);for(const y of [.1,10.1])box(gate,[4.2,.22,.22],[2,y,0]);
const shells=[],pistons=[];for(const x of [-1.78,1.78]){const shell=cylinder(cage,.32,4.4,[x,2.4,1.78],metal);shell.userData.hydraulic=true;shell.userData.fullGeometry=shell.geometry;shell.userData.cutGeometry=new THREE.CylinderGeometry(.32,.32,4.4,16,1,false,0,Math.PI*1.35);shells.push(shell);const fluid=cylinder(cage,.22,2.8,[x,1.95,1.78],inner);fluid.userData.hydraulic=true;const piston=cylinder(cage,.15,6.4,[x,5.5,1.78],rod);piston.userData.hydraulic=true;pistons.push(piston);const head=cylinder(cage,.21,.18,[x,2.3,1.78],rod);head.userData.hydraulic=true;}// Cantilever rail (x>0) at the piece's base height; beams slide out of the cage, a brace follows the tip.
const trilhos=[-1,1].map(z=>box(rails,[1,.24,.25],[0,2.815,z]));const brace=box(rails,[.2,1,.2],[0,0,0]);
// Work deck on the -x side with rail, and the hand pump: lever pivots on the cage wall.
const deck=new THREE.Group();deck.name='plataforma';group.add(deck);box(deck,[5.4,.2,4.4],[-5.3,-.1,0],dark);for(const z of [-2.1,2.1]){for(const x of [-7.8,-5.3,-2.8])box(deck,[.14,2.1,.14],[x,1,z],yellow);box(deck,[5.2,.12,.12],[-5.3,2.05,z],yellow);}for(const y of [.2,1.1,1.9])box(deck,[.12,.12,4.2],[-7.9,y,0],yellow);
const bomba=new THREE.Group();bomba.name='bomba';group.add(bomba);box(bomba,[.9,2.4,1.3],[-2.55,1.2,0],metal);cylinder(bomba,.28,.5,[-2.75,2.65,0],inner);box(bomba,[.25,.25,.25],[-3.05,2.8,0],dark);
const alavanca=new THREE.Group();alavanca.name='alavanca';alavanca.position.set(-3.05,2.8,0);bomba.add(alavanca);const haste=box(alavanca,[3.2,.16,.16],[-1.6,0,0],dark);const mao=box(alavanca,[.5,.2,.2],[-3.1,0,0],yellow);
return {group,cage,gate,rails,pistons,shells,trilhos,brace,deck,bomba,alavanca};}
export function animarMacaco(m,t){const p=Math.max(0,Math.min(1,t));m.cage.position.y=p;m.pistons.forEach(o=>{o.scale.y=1+p*.3;o.position.y=5.5+p*.55;});}
export function corteMacaco(m,t){const p=Math.max(0,Math.min(1,t/.4));m.cage.children.forEach(o=>{o.visible=true;});m.rails.visible=true;for(const o of m.shells){if(!o.userData.cutMaterial){o.material=o.material.clone();o.userData.cutMaterial=true;}o.geometry=p>0?o.userData.cutGeometry:o.userData.fullGeometry;o.material.transparent=false;o.material.needsUpdate=true;o.material.opacity=1;o.material.depthWrite=true;}}

// Pure progress 0..1; rotation is absolute and seek-safe.
export function animarAberturaJaula(m,t){m.gate.rotation.y=-1.2*Math.max(0,Math.min(1,t));}
// Positions are in the fixed parent coordinates. A three-stage lift/translate/lower path.
export function animarRetiradaMacaco(m,t,inicio,fim){const p=Math.max(0,Math.min(1,t));const q=Math.max(0,Math.min(1,(p-.15)/.65));m.group.position.copy(inicio).lerp(fim,q);m.group.position.y+=Math.sin(Math.PI*q)*3;animarAberturaJaula(m,p<.45?Math.min(1,p/.2):1-Math.max(0,Math.min(1,(p-.45)/.35)));}

// Rail out/in, p in [0,1]: beams reach x=9; brace runs from the cage floor to the beam tip.
export function animarTrilho(m,t){const p=Math.max(0,Math.min(1,t)),len=4.2+6.8*p;m.trilhos.forEach(b=>{b.scale.x=len;b.position.x=-2+len/2;});const a=new THREE.Vector3(2.2,.4,0),b=new THREE.Vector3(-2+len-1,2.7,0),d=b.clone().sub(a);m.brace.position.copy(a).add(b).multiplyScalar(.5);m.brace.scale.set(1,d.length(),1);m.brace.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.brace.visible=p>0;}
// Pump handle: absolute seesaw, ciclos strokes over t in [0,1]. Lever end (hand grip) is `m.alavanca.children[1]`.
export function animarAlavanca(m,t,ciclos=4){m.alavanca.rotation.z=.2*Math.sin(2*Math.PI*ciclos*Math.max(0,Math.min(1,t)));}
