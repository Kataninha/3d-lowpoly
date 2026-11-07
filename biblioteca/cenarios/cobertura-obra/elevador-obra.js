import * as THREE from '../../vendor/three.module.js';
import {animarRetiradaCabecote} from '../../objetos/grua-torre/grua-torre.js';
import {animarRetiradaMacaco,animarAberturaJaula} from '../../objetos/macaco-hidraulico/macaco-hidraulico.js';
const material=c=>new THREE.MeshStandardMaterial({color:c,flatShading:true,roughness:.8});
const metal=material(0x5b6970),yellow=material(0xd7a42d),floor=material(0x6b7070);
function box(g,d,p,m){const o=new THREE.Mesh(new THREE.BoxGeometry(...d),m);o.position.set(...p);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
// Open facade lift: roof loading platform, cage, twin guide rails and rack teeth.
export function criarElevadorObra(){const group=new THREE.Group();group.name='elevador-obra';group.position.set(11.5,0,16.8);for(const x of [-5,5]){box(group,[.28,65,.28],[x,-28.5,-1.8],metal);for(let y=-60;y<4;y+=1.4)box(group,[.8,.12,.15],[x,y,-1.8],metal);}const cab=new THREE.Group();cab.name='cabine';group.add(cab);box(cab,[10,.28,5.4],[0,-.14,0],floor);for(const x of [-4.9,4.9])for(const z of [-2.5,2.5])box(cab,[.18,12,.18],[x,6,z],yellow);for(const y of [3,6,9,12]){box(cab,[10,.15,.15],[0,y,2.5],yellow);for(const x of [-4.9,4.9])box(cab,[.15,.15,5],[x,y,0],yellow);}const trolley=new THREE.Group();trolley.name='carro-da-pilha';box(trolley,[8,.18,3.2],[0,0,0],metal);for(const x of [-3,3])for(const z of [-1.2,1.2]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.16,10),floor);wheel.rotation.x=Math.PI/2;wheel.position.set(x,-.14,z);trolley.add(wheel);}group.add(trolley);return {group,cab,trolley};}
export function animarElevador(e,y){e.cab.position.y=y;}

const phase=(t,a,b)=>Math.max(0,Math.min(1,(t-a)/(b-a)));
// Absolute timeline: trolley + sections travel down; lift returns; two base pieces load and descend.
// Input is normalized [0,1]. Cargo remains visible on the street after offloading.
export function animarTransporte(e,crane,t){const p=Math.max(0,Math.min(1,t));const load=phase(p,.02,.19),down=phase(p,.19,.36),unload=phase(p,.36,.43),up=phase(p,.43,.53),baseLoadA=phase(p,.53,.61),baseLoadB=phase(p,.61,.69),baseDown=phase(p,.69,.88),baseUnload=phase(p,.88,.98);
const firstHeight=-60*down+60*up, liftY=p<.53?firstHeight:-60*baseDown;e.cab.position.y=liftY;
for(let i=0;i<3;i++){const s=crane.sections[5-i];s.rotation.z=-Math.PI/2;s.position.set(6,1.42+2.84*i+.18*load-60*down,7+10.8*load+6*unload);}
e.trolley.position.set(0,.09+.18*load-60*down,-10.8+10.8*load+6*unload);
for(let i=0;i<3;i++){const s=crane.sections[i];s.rotation.z=-Math.PI/2;s.position.set(-22,-58.58+2.84*i,20);}
const bars=crane.base.children;for(let i=0;i<bars.length;i++){const q=i===0?baseLoadA:baseLoadB;bars[i].position.set((7.5+i*2)*q,.14+1.2*Math.sin(Math.PI*q)-60*baseDown,17.8*q+6*baseUnload);}
return {activeBar:p>=.53&&p<.69?(p<.61?bars[0]:bars[1]):null,cabHeight:liftY};}

// Take 9: fixed parents; seek-safe transport of head, open jack, three standing sections,
// three roof-stacked sections, then two separate base bars, across eight lift trips including the small crane.
// crane.group, jack.group and elevator.group must already be attached to the scene.
export function animarRetiradaCompleta(e,crane,jack,mobile,t){
 const z=Math.max(0,Math.min(1,t))*8,trip=Math.min(7,Math.floor(z)),u=trip===7&&z===8?1:z-trip;
 const step=(v,a,b)=>Math.max(0,Math.min(1,(v-a)/(b-a)));
 const down=step(u,.32,.52),unload=step(u,.52,.65),up=step(u,.65,.95);e.cab.position.y=-60*down+60*up;
 crane.group.updateWorldMatrix(true,true);e.group.updateWorldMatrix(true,true);jack.group.parent.updateWorldMatrix(true,false);
 const eWorld=(x,y,z)=>e.group.localToWorld(new THREE.Vector3(x,y,z));
 const cWorld=(x,y,z)=>crane.group.localToWorld(new THREE.Vector3(x,y,z));
 const local=(parent,world)=>parent.worldToLocal(world.clone());
 const barStart=()=>new THREE.Vector3(0,.14,0);
 const state={trip,progress:u,phase:u<.32?'loading':u<.52?'descending':u<.65?'unloading':'returning',hook:null,anchor:null};
 // The last three tower sections are already on the roof at the end of take 8.
 crane.base.position.set(0,0,0);
 crane.sections.forEach(s=>{s.visible=true;s.rotation.z=0;});
 for(let i=0;i<3;i++){const s=crane.sections[5-i];s.rotation.z=-Math.PI/2;s.position.set(6,1.42+2.84*i,7);}
 const item=(obj,idx,start,end,anchor,kind)=>{
   const parent=obj.parent,localStart=local(parent,start),localEnd=local(parent,end);
   const targetY=end.y;const off=8*(idx+1);
   if(trip<idx){obj.position.copy(localStart);return;}
   if(trip===idx&&u<.32){const progress=u/.32;
     if(kind==='head')animarRetiradaCabecote(crane,progress,localStart,localEnd);
     else if(kind==='jack')animarRetiradaMacaco(jack,progress,localStart,localEnd);
     else {const f=step(progress,.15,.8);obj.position.copy(localStart).lerp(localEnd,f);obj.position.y+=3*Math.sin(Math.PI*f);}
     state.hook=obj;state.anchor=anchor;return;
   }
   const drop=trip>idx?1:down, exit=trip>idx?1:unload;
   const at=end.clone();at.y=targetY-60*drop;at.x+=off*exit;at.z+=6*exit;obj.position.copy(local(parent,at));
 };
 const headStart=cWorld(0,21.88,0), headEnd=eWorld(0,0,0);
 item(crane.top,0,headStart,headEnd,[0,.35,0],'head');
 jack.cage.position.y=1;animarAberturaJaula(jack,0);
 item(jack.group,1,cWorld(0,10.68,0),eWorld(-2.5,-1,0),[0,11.2,0],'jack');
 for(let j=0;j<3;j++){const index=2-j,s=crane.sections[index];item(s,2+j,cWorld(0,.28+index*7.2,0),eWorld(0,0,0),[0,7.2,0],'section');}
 // Roof stack stays on trolley through loading and unloading.
 const sf=trip<5?0:trip>5?1:step(u,0,.32),sd=trip<5?0:trip>5?1:down,sout=trip<5?0:trip>5?1:unload;
 for(let i=0;i<3;i++){const s=crane.sections[5-i];s.position.set(6+48*sout,1.42+2.84*i-60*sd,7+10.8*sf+6*sout);}
 e.trolley.position.set(48*sout,.09-60*sd,-10.8+10.8*sf+6*sout);e.trolley.visible=true;
 // Two base bars load separately while the lift is parked.
 for(let i=0;i<crane.base.children.length;i++){const bar=crane.base.children[i],start=cWorld(0,.14,0),end=eWorld(i===0?-1.5:1.5,.14,0),parent=bar.parent;
   if(trip<6){bar.position.copy(local(parent,start));continue;}
   if(trip===6&&u<.32){const f=step(u,i*.16,(i+1)*.16);const at=start.clone().lerp(end,f);at.y+=1.5*Math.sin(Math.PI*f);bar.position.copy(local(parent,at));if(f>0&&f<1){state.hook=bar;state.anchor=[0,.14,0];}}
   else {const at=end.clone();at.y-=60*(trip>6?1:down);at.x+=56*(trip>6?1:unload);at.z+=6*(trip>6?1:unload);bar.position.copy(local(parent,at));}
 }
 const vehicle=mobile.group,vehicleStart=new THREE.Vector3(-16,0,-9),vehicleEnd=eWorld(0,0,0);if(trip<7)vehicle.position.copy(local(vehicle.parent,vehicleStart));else if(u<.32){const f=step(u,0,.32);vehicle.position.copy(local(vehicle.parent,vehicleStart.clone().lerp(vehicleEnd,f)));}else{const at=vehicleEnd.clone();at.y-=60*down;at.x+=64*unload;at.z+=6*unload;vehicle.position.copy(local(vehicle.parent,at));}
 return state;
}
