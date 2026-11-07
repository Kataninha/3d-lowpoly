import * as THREE from '../../vendor/three.module.js';
// Spider crane (guindaste aranha) in the scene units of the video (Ze = 4.84 u): body 12 u, 4 outriggers, 3-section boom.
// {fantasma:true} is the myth variant: giant, translucent red, no shadows.
export function criarGuindasteMovel({fantasma=false}={}){const group=new THREE.Group();group.name=fantasma?'guindaste-fantasma':'guindaste-movel';
const mat=c=>new THREE.MeshStandardMaterial(fantasma?{color:0xe53935,flatShading:true,transparent:true,opacity:.35,depthWrite:false}:{color:c,flatShading:true});const yellow=mat(0xe0a526),dark=mat(0x40454b),glass=mat(0x7d9ea6),orange=mat(0xd9531e);
function box(d,p,m,parent=group){const o=new THREE.Mesh(new THREE.BoxGeometry(...d),m);o.position.set(...p);o.castShadow=o.receiveShadow=!fantasma;parent.add(o);return o;}
for(const z of [-2.5,2.5]){box([11,1.5,1.8],[0,.75,z],dark);for(const x of [-5.2,5.2]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,1.8,10),dark);w.rotation.x=Math.PI/2;w.position.set(x,.75,z);w.castShadow=!fantasma;group.add(w);}}
box([9,1.2,3.4],[0,2.1,0],yellow);box([2.6,1.5,2.8],[-3.9,3.45,0],dark);box([2.4,1.7,2.6],[2.6,3.55,0],yellow);box([1.6,1,2.2],[3.2,3.7,0],glass);
const turret=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.9,1,12),orange);turret.position.set(-.6,3,0);turret.castShadow=!fantasma;group.add(turret);
const pivo=new THREE.Vector3(.5,4.4,0);
// outriggers: diagonal beam from each body corner to a pad on the ground
for(const sx of [-1,1])for(const sz of [-1,1]){const a=new THREE.Vector3(sx*4,1.8,sz*1.7),b=new THREE.Vector3(sx*6.8,.35,sz*5.6),d=b.clone().sub(a);const leg=box([.5,d.length(),.5],a.clone().add(b).multiplyScalar(.5).toArray(),yellow);leg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());const pad=new THREE.Mesh(new THREE.CylinderGeometry(.8,.9,.3,10),dark);pad.position.copy(b);pad.castShadow=!fantasma;group.add(pad);}
// telescopic boom: unit-length group scaled by between(); three nested segments
const boom=new THREE.Group();boom.name='lanca';[[-.5,.34,1.0],[-.16,.34,.75],[.18,.32,.55]].forEach(([y,h,w],i)=>box([w,h,w],[0,y+h/2,0],i%2?yellow:orange,boom));group.add(boom);
const cable=box([.1,1,.1],[0,0,0],dark);const hook=new THREE.Mesh(new THREE.TorusGeometry(.3,.09,6,12,Math.PI*1.5),dark);group.add(hook);
return {group,boom,cable,hook,pivo};}
function between(mesh,a,b){const d=new THREE.Vector3().subVectors(b,a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(1,d.length(),1);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}
// Target in world coordinates. Boom tip stands 4 u straight above the target; cable and hook hang vertically to it.
export function prenderCarga(m,target){m.cable.visible=true;m.hook.visible=true;m.group.updateWorldMatrix(true,false);const local=m.group.worldToLocal(target.clone());const tip=local.clone().add(new THREE.Vector3(0,4,0));between(m.boom,m.pivo,tip);between(m.cable,tip,local);m.hook.position.copy(local);m.hook.rotation.set(0,0,0);m.group.updateWorldMatrix(true,true);m.target=target.clone();}

// Parked pose: boom retracted, lying back over the body.
export function recolherGuindaste(m){const a=m.pivo,b=new THREE.Vector3(-8,5.6,0);between(m.boom,a,b);m.cable.visible=false;m.hook.visible=false;}
