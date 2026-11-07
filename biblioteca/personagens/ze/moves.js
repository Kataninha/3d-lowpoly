import * as THREE from 'three';

const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x*x*(3-2*x); };
// base: {posicao: Vector3, rotacao: Euler}; default is the origin and zero rotation.
// Supply the same explicit base on every call when the character is placed elsewhere.
function lado(mao) {
  if (!['E','D'].includes(mao)) throw new Error('Mão deve ser E ou D');
  return mao;
}
function reset(ze, pose, k, base = {}) {
  ze.misturarPoses('parado', pose, k);
  if (base.posicao) ze.raiz.position.copy(base.posicao); else ze.raiz.position.set(0,0,0);
  if (base.rotacao) ze.raiz.rotation.copy(base.rotacao); else ze.raiz.rotation.set(0,0,0);
  ze.juntas.tronco.position.set(0,0,0);
  ze.juntas.tronco.scale.set(1,1,1);
  ze.emocao('neutro'); ze.atualizar(0, {piscar:false, respirar:false});
}

// Alcança um ponto mundial com IK de dois ossos; só use alvos acessíveis.
// mao E/D; alvoMundo Vector3; t0/t1 transição; raioPeca exige centroPeca.
export function alcancar(ze, mao, alvoMundo, t, {t0=0,t1=t0+.3,ease=smooth,raioPeca=0,centroPeca}={}) {
  lado(mao);
  if (!alvoMundo?.isVector3 || t1 <= t0) throw new Error('Alvo ou janela inválida');
  if (raioPeca && !centroPeca?.isVector3) throw new Error('raioPeca exige centroPeca mundial');
  const ombro=ze.juntas['ombro'+mao], cotovelo=ze.juntas['cotovelo'+mao], pulso=ze.juntas['pulso'+mao];
  // Fixed rest pose makes a direct alcancar() call independent of previous seeks.
  ombro.rotation.set(0,0,mao==='E' ? .12 : -.12);
  cotovelo.rotation.set(-.15,0,0);
  const alvo=alvoMundo.clone();
  if (raioPeca) {
    const radial=alvo.clone().sub(centroPeca);
    if (radial.lengthSq()<1e-12) throw new Error('Alvo coincide com centro da peça');
    if(radial.length()<raioPeca) alvo.copy(centroPeca).add(radial.setLength(raioPeca));
  }
  ze.raiz.updateWorldMatrix(true,true);
  const origem=ombro.getWorldPosition(new THREE.Vector3());
  const dir=alvo.clone().sub(origem), d=dir.length();
  if(d<1e-8) throw new Error('Alvo coincide com ombro');
  dir.normalize();
  const scale=ze.raiz.getWorldScale(new THREE.Vector3()).x;
  const eixo=ze.maos[mao].position.clone().applyQuaternion(pulso.quaternion).add(pulso.position);
  const l1=cotovelo.position.length()*scale, l2=eixo.length()*scale;
  if(d > l1+l2 || d < Math.abs(l1-l2)) throw new Error('Alvo fora do alcance');
  const cos=(d*d+l1*l1-l2*l2)/(2*d*l1);
  // Direção lateral é projetada no plano perpendicular ao alvo.
  const fora=new THREE.Vector3(mao==='E'?1:-1,0,0).transformDirection(ze.raiz.matrixWorld);
  fora.addScaledVector(dir,-fora.dot(dir));
  if(fora.lengthSq()<1e-8) fora.set(0,0,1).addScaledVector(dir,-dir.z);
  fora.normalize();
  const meio=origem.clone().addScaledVector(dir,l1*cos).addScaledVector(fora,l1*Math.sqrt(Math.max(0,1-cos*cos)));
  const q1=new THREE.Quaternion().setFromUnitVectors(cotovelo.position.clone().normalize(),meio.clone().sub(origem).normalize());
  q1.premultiply(ombro.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  const inicio1=ombro.quaternion.clone(), inicio2=cotovelo.quaternion.clone();
  ombro.quaternion.copy(q1); ombro.updateWorldMatrix(true,true);
  const q2=new THREE.Quaternion().setFromUnitVectors(eixo.normalize(),alvo.clone().sub(meio).normalize());
  q2.premultiply(cotovelo.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  const k=ease(clamp((t-t0)/(t1-t0)));
  ombro.quaternion.copy(inicio1).slerp(q1,k); cotovelo.quaternion.copy(inicio2).slerp(q2,k);
  ze.raiz.updateWorldMatrix(true,true);
  return ze.maos[mao].getWorldPosition(new THREE.Vector3());
}

// t0 is the gesture start; the gaze starts antecede seconds earlier.
// Apply after the base pose, on every seek. Targets are in world coordinates.
export function olharPara(ze, alvo, t, {t0=0,t1=t0+.3,ease=smooth,antecede=.25}={}) {
  if (antecede<.2 || t1<=t0 || typeof ease!=='function') throw new Error('Janela de olhar inválida');
  ze.juntas.tronco.rotation.z=0;
  ze.juntas.cabeca.rotation.y=0;
  ze.raiz.updateWorldMatrix(true,true);
  const cabeca=ze.juntas.cabeca;
  const ponto=alvo?.isVector3 ? alvo.clone() : alvo?.isObject3D ? alvo.getWorldPosition(new THREE.Vector3()) : null;
  if (!ponto) throw new Error('Alvo de olhar inválido');
  const local=cabeca.parent.worldToLocal(ponto);
  local.sub(cabeca.position);
  const yaw=THREE.MathUtils.clamp(Math.atan2(local.x,local.z),-Math.PI/3,Math.PI/3);
  const k=clamp(ease(clamp((t-(t0-antecede))/(t1-(t0-antecede)))));
  cabeca.rotation.y=yaw*k;
  ze.juntas.tronco.rotation.z=-Math.sin(yaw)*.06*k;
}

// Natural gesture: 0.12 s anticipation, approach and two-frame overshoot/settle.
function alcanceEstilizado(ze,mao,alvo,t,opts) {
  const {estilo='natural',t0=0,t1=t0+.3,...rest}=opts;
  if (!['natural','seco'].includes(estilo)) throw new Error('Estilo inválido');
  if (estilo==='seco') return alcancar(ze,mao,alvo,t,{...rest,t0,t1});
  const dur=t1-t0;
  if (dur<=0) throw new Error('Janela inválida');
  const recuo=Math.min(.12,dur*.4), retorno=Math.min(2/30,dur*.23);
  const u=t-t0;
  const ease=()=>u<recuo ? 0 : u<dur-retorno ? 1.04*smooth((u-recuo)/(dur-retorno-recuo)) : u<dur ? 1.04-.04*smooth((u-(dur-retorno))/retorno) : 1;
  alcancar(ze,mao,alvo,t,{...rest,t0,t1,ease});
  const pre=u>=0 && u<recuo ? Math.sin(Math.PI*u/recuo)*THREE.MathUtils.degToRad(6) : 0;
  ze.juntas['ombro'+mao].rotation.x+=pre;
  ze.raiz.updateWorldMatrix(true,true);
  return ze.maos[mao].getWorldPosition(new THREE.Vector3());
}

// Mantém a mão sobre um alvo expresso no espaço local da raiz.
// mao E/D, alvoLocal Vector3, t em segundos; opções de alcance são aceitas.
export function M01_segurar(ze,t,{mao='D',alvoLocal,base,...opts}) {
  reset(ze,'segurar',1,base); ze.raiz.updateWorldMatrix(true,true);
  return alcanceEstilizado(ze,mao,ze.raiz.localToWorld(alvoLocal.clone()),t,{t0:0,t1:.3,...opts});
}
// Alcança o botão e gira o pulso depois da aproximação.
// mao E/D, alvo mundial, t0/t1 e opções de proteção da peça.
export function M02_girarBotao(ze,t,{mao='D',alvo,t0=0,t1=t0+1,base,...opts}) {
  reset(ze,'parado',0,base);
  ze.juntas['pulso'+mao].rotation.y=.55*smooth((t-t0-.3)/Math.max(.001,t1-t0-.3));
  return alcanceEstilizado(ze,mao,alvo,t,{t0,t1:Math.min(t1,t0+.3),...opts});
}
// Aproxima a mão e mantém a pega no cabo.
// mao E/D, alvo mundial, t0/t1 e opções de proteção da peça.
export function M03_pegarCabo(ze,t,{mao='D',alvo,t0=0,t1=t0+.3,base,...opts}) {
  reset(ze,'parado',0,base); return alcanceEstilizado(ze,mao,alvo,t,{t0,t1:Math.min(t1,t0+.3),...opts});
}
// Reage sem alvo de contato, com braços defensivos e olhar.
// t0 inicia uma transição de 0,3 s.
export function M04_susto(ze,t,{t0=0,alvo,base}={}) {
  const k=smooth((t-t0)/.3);
  reset(ze,'parado',0,base);
  ze.juntas.tronco.rotation.x=-.14*k;
  ze.juntas.ombroE.rotation.set(-.32*k,0,.12+.55*k);
  ze.juntas.cotoveloE.rotation.set(-.15-.6*k,0,0);
  ze.juntas.cabeca.rotation.y=(alvo?.isVector3 ?
    THREE.MathUtils.clamp(Math.atan2(alvo.x-ze.raiz.position.x,alvo.z-ze.raiz.position.z),-.55,.55) : -.25)*k;
  ze.raiz.updateWorldMatrix(true,true);
  const peito=ze.juntas.tronco.localToWorld(new THREE.Vector3(-.24,.82,.55));
  alcancar(ze,'D',peito,t,{t0,t1:t0+.3});
}
// Comemora com squash, salto, braços em V e aceno.
// t0 inicia a antecipação; após 1,4 s mantém o aceno.
export function M05_comemorar(ze,t,{t0=0,base}={}) {
  const u=Math.max(0,t-t0); reset(ze,'parado',0,base);
  // Lift the arms through the forward plane, then open slightly into a V.
  const k=smooth((u-.15)/.3);
  ze.juntas.ombroE.rotation.set(-2.65*k,0,.12+.36*k);
  ze.juntas.ombroD.rotation.set(-2.65*k,0,-.12-.36*k);
  ze.juntas.cotoveloE.rotation.x=ze.juntas.cotoveloD.rotation.x=-.15-.18*k;
  const squash=u<.25 ? -.12*smooth(u/.25) : u<.5 ? -.12*(1-smooth((u-.25)/.25)) : 0;
  const jump=u>=.4 && u<1.2 ? .18*Math.sin(Math.PI*(u-.4)/.8) : 0;
  ze.raiz.position.y+=jump;
  ze.juntas.tronco.position.y=squash;
  ze.juntas.joelhoE.rotation.x=ze.juntas.joelhoD.rotation.x=Math.max(0,-squash*3);
  ze.juntas.pulsoE.rotation.z=u>1.2 ? .3*Math.sin((u-1.2)*8)*smooth((u-1.2)/.3) : 0;
}
// Vida sutil em repouso, com ciclo de 1,8 s.
// t é o tempo absoluto em segundos.
export function M08_idle(ze,t,{base}={}) {
  reset(ze,'parado',0,base); ze.emocao('neutro'); ze.atualizar(t*2,{respirar:false});
  ze.juntas.tronco.scale.y=1+.01*Math.sin(t*2*Math.PI/1.8);
}
// O tornozelo é o filho mais baixo do joelho (não está em juntas).
function tornozeloDe(joelho) { return joelho.children.reduce((a,b)=>b.position.y<a.position.y?b:a); }
// Caminha entre duas posições com passos plantados: o pé de apoio fica parado no chão e o quadril passa por cima.
// t0/t1 definem a travessia; de e para são Vector3 no espaço do pai. Começa e termina em pé, pés juntos.
export function M09_caminhadaCurta(ze,t,{t0,t1,de,para,base}) {
  if(t1<=t0) throw new Error('Janela inválida');
  reset(ze,'parado',0,base); const u=clamp((t-t0)/(t1-t0));
  const delta=para.clone().sub(de), dist=delta.length();
  ze.raiz.position.copy(de).lerp(para,.5*u+.5*smooth(u));
  if(dist<1e-8) return;
  ze.raiz.rotation.y=Math.atan2(delta.x,delta.z);
  ze.raiz.updateWorldMatrix(true,true);
  // Medidas no espaço local do Zé (a cena pode escalar a raiz).
  const escala=ze.raiz.getWorldScale(new THREE.Vector3()).x;
  const quadrilY=ze.juntas.pernaE.getWorldPosition(new THREE.Vector3()).y;
  const sola=new THREE.Box3().setFromObject(ze.juntas.pernaE).min.y;
  // leg = quadril→tornozelo (comprimento do IK); chao = distância tornozelo→sola.
  const leg=ze.juntas.joelhoE.position.length()+tornozeloDe(ze.juntas.joelhoE).position.length();
  const chao=(quadrilY-sola)/escala-leg;
  const total=dist/escala, m=Math.max(1,Math.round(total/(.7*leg))), n=m+1, sig=total/m;
  const x=total*(.5*u+.5*smooth(u)), dbl=.12*sig;
  const passos=[];
  for(let k=1;k<=n;k++) passos.push({
    lado:k%2 ? 'D' : 'E',
    x0:k===1 ? 0 : k<n ? (k-1.5)*sig+dbl : (n-1.5)*sig,
    x1:k===1 ? .5*sig : k<n ? (k-.5)*sig : (n-1)*sig,
    de:Math.max(0,(k-2)*sig), para:k<n ? k*sig : total});
  // Posição mundial (ao longo da marcha) de cada pé e se está no ar.
  function pe(lado) {
    let pos=0, ar=0;
    for(const p of passos) if(p.lado===lado) {
      if(x>=p.x1) pos=p.para;
      else if(x>p.x0) { ar=(x-p.x0)/(p.x1-p.x0); pos=p.de+(p.para-p.de)*smooth(ar); break; }
      else break;
    }
    return {pos,ar};
  }
  const pes={E:pe('E'),D:pe('D')};
  const fim=Math.min(1,x/(.5*sig),(total-x)/(.5*sig));
  const folga=1-.03*smooth(fim);
  let H=leg+chao;
  for(const lado of ['E','D']) if(!pes[lado].ar) {
    const o=pes[lado].pos-x; H=Math.min(H,chao+folga*Math.sqrt(Math.max(0,leg*leg-o*o)));
  }
  // IK de dois ossos iguais no plano da marcha; joelho dobra para trás, sola sempre plana.
  const ang={};
  for(const lado of ['E','D']) {
    const {pos,ar}=pes[lado], Z=pos-x, Y=H-chao-(ar ? .16*leg*Math.sin(Math.PI*ar) : 0);
    const d=Math.min(Math.hypot(Z,Y),leg*(1-1e-9)), psi=Math.acos(d/leg), linha=Math.atan2(Z,Y);
    const a=-linha-psi, b=2*psi;
    ze.juntas['perna'+lado].rotation.x=a; ze.juntas['joelho'+lado].rotation.x=b;
    tornozeloDe(ze.juntas['joelho'+lado]).rotation.x=-(a+b); ang[lado]=a;
  }
  ze.raiz.position.y+=(H-leg-chao)*escala;
  ze.juntas.ombroE.rotation.x=.8*ang.D; ze.juntas.ombroD.rotation.x=.8*ang.E;
}

// ---- Poses de frase (vídeo 08): funções puras de t, de frente e legíveis em silhueta. ----
// Entrada 0→1 com antecipação de 0,15 s (leve recuo) e overshoot de 5% antes de assentar; depois mantém 1.
function entra(u,d=.3) {
  const a=.15;
  if (u<=0) return 0;
  if (u<a) return -.08*Math.sin(Math.PI*u/a);
  const v=(u-a)/d;
  return v>=1 ? 1 : v<.8 ? 1.05*smooth(v/.8) : 1.05-.05*smooth((v-.8)/.2);
}
// Ajusta a altura da raiz para a sola mais baixa tocar o chão da base (pernas dobradas ou abertas).
function ancorar(ze,base={}) {
  ze.raiz.updateWorldMatrix(true,true);
  const sola=Math.min(new THREE.Box3().setFromObject(ze.juntas.pernaE).min.y,new THREE.Box3().setFromObject(ze.juntas.pernaD).min.y);
  ze.raiz.position.y+=(base.posicao?.y??0)-sola;
}
// Ombro/cotovelo de um lado; oz positivo abre o braço para fora nos dois lados.
function braco(ze,l,ox,oz,cx,cz=0) {
  const f=l==='E'?1:-1;
  ze.juntas['ombro'+l].rotation.set(ox,0,f*oz);
  ze.juntas['cotovelo'+l].rotation.set(cx,0,f*cz);
}
// olharPara zera tronco.z e cabeca.y; aqui o balanço da própria pose é somado de volta.
function olhar(ze,alvo,t,t0) {
  if (!alvo) return;
  const tz=ze.juntas.tronco.rotation.z, cy=ze.juntas.cabeca.rotation.y;
  olharPara(ze,alvo,t,{t0:t0+.12,t1:t0+.42});
  ze.juntas.tronco.rotation.z+=tz; ze.juntas.cabeca.rotation.y+=cy;
}
const ciclo=(u,per,ini=.45)=>Math.sin(Math.max(0,u-ini)*2*Math.PI/per)*smooth((u-ini)/.2);   // oscila só depois da entrada

// Dois golpes de marreta com as duas mãos: antecipação (desce), sobe com overshoot, golpe rápido, recupera.
// t0 inicia a entrada (0,45 s); golpes em t0+0,75 e t0+1,65; depois mãos baixas. olhar: alvo mundial opcional.
export function M10_marretar(ze,t,{t0=0,olhar:alvo,base}={}) {
  reset(ze,'parado',0,base);
  const u=t-t0, e=entra(u), c=(u-.45)/.9, k=Math.floor(c), f=c-k;
  let alto=0;                                // 0 = marreta baixa, 1 = no alto
  if (c>=0&&k<2) alto=f<.55 ? 1.05*smooth(f/.55)-.07*Math.sin(Math.PI*clamp(f/.15)) : f<.7 ? 1-1.1*smooth((f-.55)/.15) : -.1*(1-smooth((f-.7)/.3));
  braco(ze,'E',(-.5-2.1*alto)*e,-.1,-.6-.5*alto); braco(ze,'D',(-.5-2.1*alto)*e,-.1,-.6-.5*alto);
  ze.juntas.tronco.rotation.x=(.12-.22*alto)*e;
  const agacha=.1*(1-alto)*e;
  ze.juntas.pernaE.rotation.x=ze.juntas.pernaD.rotation.x=-agacha*3;
  ze.juntas.joelhoE.rotation.x=ze.juntas.joelhoD.rotation.x=agacha*6;
  ancorar(ze,base); olhar(ze,alvo,t,t0);
}
// Empurra com as duas mãos: recuo de antecipação, inclina, pernas em passo, pulsa levemente.
export function M11_empurrar(ze,t,{t0=0,olhar:alvo,base}={}) {
  reset(ze,'parado',0,base);
  const u=t-t0, e=entra(u), p=ciclo(u,1.05);
  braco(ze,'E',-1.45*e,-.05,-.15); braco(ze,'D',-1.45*e,-.05,-.15);
  ze.juntas.ombroE.rotation.x-=.05*p; ze.juntas.ombroD.rotation.x-=.05*p;
  ze.juntas.tronco.rotation.x=.26*e+.04*p;
  ze.juntas.pernaE.rotation.x=-.4*e; ze.juntas.joelhoE.rotation.x=.55*e;   // perna da frente dobrada
  ze.juntas.pernaD.rotation.x=.5*e;                                           // perna de trás esticada
  ze.juntas.cabeca.rotation.x=-.12*e;
  ancorar(ze,base); olhar(ze,alvo,t,t0);
}
// Sinaliza com os dois braços acima da horizontal, alternando (vem / desce); de frente lê como "Y" oscilando.
export function M12_sinalizar(ze,t,{t0=0,olhar:alvo,base}={}) {
  reset(ze,'parado',0,base);
  const u=t-t0, e=entra(u), s=ciclo(u,1.25);
  ze.juntas.ombroE.rotation.set(0,0,.12+1.83*e+.4*s); ze.juntas.ombroD.rotation.set(0,0,-(.12+1.83*e-.4*s));
  ze.juntas.cotoveloE.rotation.set(-.15,0,.3*e); ze.juntas.cotoveloD.rotation.set(-.15,0,-.3*e);
  ze.juntas.pulsoE.rotation.z=.25*s; ze.juntas.pulsoD.rotation.z=-.25*s;
  ze.juntas.tronco.rotation.z=.04*s;
  olhar(ze,alvo,t,t0);
}
// Carrega algo no ombro D: mão segura por cima, tronco inclinado para o peso, balanço de passo.
export function M13_carregarOmbro(ze,t,{t0=0,olhar:alvo,base}={}) {
  reset(ze,'parado',0,base);
  const u=t-t0, e=entra(u), b=Math.abs(ciclo(u,1.6));
  braco(ze,'D',-.3*e,.12+.75*e,-2.4*e);
  braco(ze,'E',.18*Math.sin(Math.max(0,u)*4)*e,.12+.1*e,-.2);
  ze.juntas.tronco.rotation.z=.1*e; ze.juntas.tronco.rotation.x=.1*e;
  const flex=.06*(1-b)*e;                    // balanço do peso dobrando os joelhos: o pé fica no chão
  ze.juntas.pernaE.rotation.x=ze.juntas.pernaD.rotation.x=-flex; ze.juntas.joelhoE.rotation.x=ze.juntas.joelhoD.rotation.x=2*flex;
  ze.juntas.cabeca.rotation.z=-.08*e;
  ancorar(ze,base); olhar(ze,alvo,t,t0);
}
// Bombeia uma alavanca com as duas mãos: tronco e braços descem juntos, joelhos acompanham, ciclo de 0,8 s.
export function M14_bombear(ze,t,{t0=0,olhar:alvo,base}={}) {
  reset(ze,'parado',0,base);
  const u=t-t0, e=entra(u), p=.5-.5*Math.cos(Math.max(0,u-.45)*2*Math.PI/.8)*smooth((u-.45)/.2); // 0 alto, 1 baixo
  braco(ze,'E',(-1.1+.55*p)*e,-.06,-.5-.3*p); braco(ze,'D',(-1.1+.55*p)*e,-.06,-.5-.3*p);
  ze.juntas.tronco.rotation.x=(.1+.22*p)*e;
  const dobra=(.2+.25*p)*e;
  ze.juntas.pernaE.rotation.x=ze.juntas.pernaD.rotation.x=-dobra; ze.juntas.joelhoE.rotation.x=ze.juntas.joelhoD.rotation.x=dobra*2;
  ze.juntas.cabeca.rotation.x=-.1*e;
  ancorar(ze,base); olhar(ze,alvo,t,t0);
}
// Agacha, pega o capacete com as duas mãos e o ergue acima da cabeça, com overshoot e assentamento.
// 0–0,45 s agacha; a partir de t0+0,75 ergue (0,45 s). O ponto entre as mãos é o capacete.
export function M15_capaceteErguer(ze,t,{t0=0,olhar:alvo,base}={}) {
  reset(ze,'parado',0,base);
  const u=t-t0, ag=entra(u), er=Math.max(0,entra(u-.75)), baixo=ag*(1-.9*clamp(er));
  ze.juntas.pernaE.rotation.x=ze.juntas.pernaD.rotation.x=-.7*baixo; ze.juntas.joelhoE.rotation.x=ze.juntas.joelhoD.rotation.x=1.4*baixo;
  ze.juntas.tronco.rotation.x=.5*baixo;
  const ox=(-.45*(1-er)-2.95*er)*Math.max(ag,er), cx=-.25*(1-er)-.15*er;
  braco(ze,'E',ox,-.04,cx); braco(ze,'D',ox,-.04,cx);
  ze.juntas.cabeca.rotation.x=-.15*er+.05*ag;
  ancorar(ze,base); olhar(ze,alvo,t,t0);
}
// Gangorra: braços abertos, tronco inclina de um lado a outro (ciclo 1,6 s), cabeça compensa, pés afastados.
export function M16_gangorra(ze,t,{t0=0,base}={}) {
  reset(ze,'parado',0,base);
  const u=t-t0, e=entra(u), s=ciclo(u,1.6);
  ze.juntas.ombroE.rotation.set(0,0,.12+(1.33-.35*s)*e); ze.juntas.ombroD.rotation.set(0,0,-(.12+(1.33+.35*s)*e));
  ze.juntas.cotoveloE.rotation.set(0,0,0); ze.juntas.cotoveloD.rotation.set(0,0,0);
  ze.juntas.tronco.rotation.z=.2*s;
  ze.juntas.cabeca.rotation.z=-.1*s;
  ze.juntas.pernaE.rotation.z=.14*e; ze.juntas.pernaD.rotation.z=-.14*e;
  ze.juntas.joelhoE.rotation.x=ze.juntas.joelhoD.rotation.x=.2*e;
  ze.juntas.pernaE.rotation.x=ze.juntas.pernaD.rotation.x=-.1*e;
  ancorar(ze,base);
}
// Mão no peito (aperta o cinto/colete): alcança o peito com IK, cabeça levemente baixa, outro braço aberto.
export function M17_cinto(ze,t,{t0=0,mao='D',olhar:alvo,base}={}) {
  lado(mao); reset(ze,'parado',0,base);
  const u=t-t0, e=entra(u), f=mao==='D'?-1:1, outro=mao==='D'?'E':'D';
  ze.juntas.cabeca.rotation.x=.12*e;
  braco(ze,outro,0,.12+.35*e,-.15);
  ze.raiz.updateWorldMatrix(true,true);
  const peito=ze.juntas.tronco.localToWorld(new THREE.Vector3(f*.12,1.0,.52));
  alcancar(ze,mao,peito,t,{t0:t0+.15,t1:t0+.45});
  olhar(ze,alvo,t,t0);
}
// Vento lateral: segura o capacete com uma mão, tronco e pernas sopradas para o lado, balanço de ciclo 0,5 s.
export function M18_ventania(ze,t,{t0=0,base}={}) {
  reset(ze,'parado',0,base);
  const u=t-t0, e=entra(u), w=ciclo(u,.5);
  ze.juntas.ombroE.rotation.set(0,0,2.45*e); ze.juntas.cotoveloE.rotation.set(0,0,1.45*e);
  braco(ze,'D',.2*e,.12+.7*e+.1*w,-.2);
  ze.juntas.tronco.rotation.z=(.16+.03*w)*e;
  ze.juntas.pernaE.rotation.z=(.3+.12*w)*e; ze.juntas.pernaD.rotation.z=(.3-.1*w)*e;
  ze.juntas.joelhoE.rotation.x=.35*e*(.6+.4*w); ze.juntas.joelhoD.rotation.x=.3*e*(.6-.4*w);
  ze.juntas.cabeca.rotation.z=.1*e; ze.juntas.cabeca.rotation.x=.05*e;
  ancorar(ze,base);
}
// Nega com o dedo: braço D dobrado à frente, pulso balança, cabeça acompanha em ciclo de 0,45 s.
export function M19_negarDedo(ze,t,{t0=0,olhar:alvo,base}={}) {
  reset(ze,'parado',0,base);
  const u=t-t0, e=entra(u), w=ciclo(u,.45);
  braco(ze,'D',-.95*e,.25*e,-1.5*e);
  ze.juntas.pulsoD.rotation.z=.45*w;
  ze.juntas.cabeca.rotation.y=.28*w; ze.juntas.cabeca.rotation.x=-.05*e;
  ze.juntas.tronco.rotation.x=-.05*e;
  olhar(ze,alvo,t,t0);
}

// Measures grip distance and conservative arm/target Box3 overlap at one proof time.
// The bounding box is conservative: an overlap still requires mesh-level review.
export function medirContato(ze, mao, alvo, {take, tempo, nomeAlvo}) {
  lado(mao);
  ze.raiz.updateWorldMatrix(true, true);
  alvo.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(alvo);
  if (box.isEmpty()) throw new Error('Alvo sem geometria');
  const point = node => node.getWorldPosition(new THREE.Vector3());
  const grip = point(ze.maos[mao]);
  const nearest = box.clampPoint(grip, new THREE.Vector3());
  const inside = box.clone().expandByScalar(-1e-6);
  const intersecoes = [];
  if (inside.containsPoint(grip)) intersecoes.push('luva');
  const segments = [
    ['braco', point(ze.juntas['ombro'+mao]), point(ze.juntas['cotovelo'+mao])],
    ['antebraco', point(ze.juntas['cotovelo'+mao]), point(ze.juntas['pulso'+mao])],
  ];
  for (const [name, a, b] of segments) {
    const dir = b.clone().sub(a), len = dir.length();
    if (!len) continue;
    const hit = new THREE.Ray(a, dir.divideScalar(len)).intersectBox(inside, new THREE.Vector3());
    if (hit && hit.distanceTo(a) <= len) intersecoes.push(name);
  }
  return {take, tempo, alvo:nomeAlvo, mao, luva:grip.toArray(),
    box:{min:box.min.toArray(), max:box.max.toArray()}, distancia:grip.distanceTo(nearest),
    intersecoes, metodo:'Box3 conservador; conferir malha e volume dos membros'};
}

// Downloads a JSON file in the browser; the caller evaluates each proof first.
// medicoes is the array returned by medirContato for every proof time.
export function exportarContatos(medicoes) {
  const blob = new Blob([JSON.stringify(medicoes, null, 2)+'\n'], {type:'application/json'});
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href=url; a.download='contatos.json'; a.click();
  return url; // Caller may revoke the URL after the download finishes.
}
