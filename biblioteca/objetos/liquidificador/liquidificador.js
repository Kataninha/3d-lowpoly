import * as THREE from 'three';
import { criarPeca } from 'contorno';

// Scale: one scene unit equals 0.5 m. Height is 0.8 units (40 cm).
export function criarLiquidificador() {
  const raiz = new THREE.Group();
  const carcas = [];
  const mat = (color, extra={}) => new THREE.MeshStandardMaterial({color, roughness:.65, ...extra});
  function part(geometry, material, pos, parent=raiz, shell=false) {
    const p=criarPeca(geometry,material,{espessura:.006}); p.position.set(...pos); parent.add(p);
    if(shell) carcas.push(p); return p;
  }
  part(new THREE.CylinderGeometry(.18,.20,.27,10),mat(0xe8eeed,{transparent:true}),[0,.155,0],raiz,true);
  part(new THREE.CylinderGeometry(.20,.19,.045,10),mat(0x303842),[0,.025,0]);
  part(new THREE.CylinderGeometry(.135,.135,.19,12),mat(0x727f87),[0,.15,0]);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const coil=part(new THREE.SphereGeometry(.035,6,4),mat(0xb86b33),[Math.cos(a)*.12,.15,Math.sin(a)*.12]);coil.scale.y=2.2;}
  part(new THREE.CylinderGeometry(.025,.025,.17,8),mat(0xcfd7da),[0,.31,0]);
  part(new THREE.CylinderGeometry(.19,.145,.43,10,1,true),mat(0x9dcbd6,{transparent:true,opacity:.75,side:THREE.DoubleSide}),[0,.49,0],raiz,true);
  part(new THREE.CylinderGeometry(.19,.19,.045,10),mat(0x485760),[0,.725,0]);
  part(new THREE.CylinderGeometry(.10,.10,.035,10),mat(0x222b30),[0,.765,0]);
  const blade=new THREE.Group(); blade.position.y=.34; raiz.add(blade);
  part(new THREE.CylinderGeometry(.025,.025,.06,8),mat(0xb9c8ca),[0,0,0],blade);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;const p=part(new THREE.BoxGeometry(.16,.018,.035),mat(0xd6e2e3),[Math.cos(a)*.075,0,Math.sin(a)*.075],blade);p.rotation.y=-a;p.rotation.z=.14;}
  const handle=part(new THREE.TorusGeometry(.13,.025,6,12,Math.PI),mat(0x43535c),[.19,.51,0]);handle.rotation.z=-Math.PI/2;
  const button=part(new THREE.SphereGeometry(.035,8,6),mat(0x5b6a70),[0,.15,.186]);button.scale.z=.3;
  function cortar(opacity, plane) {for(const p of carcas){for(const m of [p.userData.malha.material,p.userData.casca.material]){m.transparent=true;m.opacity=opacity;m.depthWrite=opacity>=.99;m.clippingPlanes=plane?[plane]:[];m.needsUpdate=true;}}}
  return {raiz,blade,carcas,cortar};
}
