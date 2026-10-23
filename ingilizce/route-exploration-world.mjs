import * as T from './vendor/three-0.180.0/three.module.min.js';
import {PICKUPS,genderOf,move,nearestGate} from './route-exploration-core.mjs';

// A genuine WebGL scene. All meshes and textures are local; no CDN or tracking.
export function createWorld(container,options){
 const {steps,current,learn,launch,request,hasRewards}=options;
 const root=document.createElement('div');root.className='rx-world';
 root.innerHTML='<div class="rx-top"><div class="rx-title">'+(learn?'Keşif Adası':'Macera Bahçesi')+'<small>Her adım yeni bir keşif</small></div><div class="rx-count">Bonus · <span>0 / 4</span></div></div><div class="rx-status" role="status" aria-live="polite" hidden></div><div class="rx-bottom"><div class="rx-joystick" role="group" aria-label="Yürüme kumandası"><i class="rx-thumb"></i></div><div class="rx-actions"><div class="rx-hint">Parmağınla sürükle, çevreyi keşfet.<br>Bilgisayarda ok tuşları veya WASD.</div><button type="button" class="rx-enter" hidden>Bölüme başla</button><button type="button" class="rx-skip">Doğrudan bölüme geç ›</button></div></div>';
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Üç boyutlu keşif haritası. Parmağınla sürükleyerek veya ok tuşlarıyla yürü.');root.prepend(canvas);
 const scene=new T.Scene();scene.background=new T.Color(learn?'#8ad7df':'#b4e2dc');scene.fog=new T.Fog(learn?'#8ad7df':'#b4e2dc',35,80);
 const camera=new T.OrthographicCamera(-10,10,12,-12,.1,100);camera.position.set(14,21,24);camera.lookAt(0,0,0);
 scene.add(new T.HemisphereLight('#fff7de','#4e8e7d',2.7));
 const sun=new T.DirectionalLight('#fff1c8',3.2);sun.position.set(-10,20,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-20,right:20,top:22,bottom:-22,near:.5,far:60});sun.shadow.bias=-.0008;scene.add(sun);
 const materials=new Map(),geometries=new Map(),textures=new Set();
 const mat=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.85}));return materials.get(color);};
 const geo=(name,args)=>{const key=name+JSON.stringify(args);if(!geometries.has(key))geometries.set(key,new T[name](...args));return geometries.get(key);};
 function mesh(name,args,color,x,y,z,parent=scene){const m=new T.Mesh(geo(name,args),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const ball=(r,color,x,y,z,parent)=>mesh('SphereGeometry',[r,12,8],color,x,y,z,parent);
 const box=(w,h,d,color,x,y,z,parent)=>mesh('BoxGeometry',[w,h,d],color,x,y,z,parent);
 const cylinder=(r1,r2,h,color,x,y,z,parent)=>mesh('CylinderGeometry',[r1,r2,h,16],color,x,y,z,parent);
 const obstacles=[],gates=[],pickups=[];
 function obstacle(x,z,r){obstacles.push({x,z,r});}
 function tree(x,z,scale=1,citrus=false){
  const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);scene.add(g);
  cylinder(.14,.22,1.6,'#937154',0,.8,0,g);
  const greens=citrus?['#519342','#72aa50','#387850']:['#47915e','#6ca663','#337f58'];
  ball(.95,greens[0],0,2.1,0,g);ball(.7,greens[1],-.55,1.9,.2,g);ball(.7,greens[2],.5,1.9,-.05,g);
  if(citrus)for(let j=0;j<6;j++){const a=j*2.4;ball(.14,'#ffba3d',Math.sin(a)*.85,1.9+Math.cos(j)*.4,Math.cos(a)*.7,g);}
  obstacle(x,z,.67*scale);
 }
 function rock(x,z,r=.7){const m=mesh('DodecahedronGeometry',[r,0],learn?'#c1b99c':'#92a597',x,r*.35,z);m.scale.y=.75;obstacle(x,z,r*.65);}
 function flowers(x,z){for(let i=0;i<4;i++){const a=i*2.4;const xx=x+Math.sin(a)*.25,zz=z+Math.cos(a)*.25;cylinder(.018,.018,.3,'#4c8c59',xx,.15,zz);ball(.09,['#fff1be','#f5999e','#b6a1e0','#f4c36b'][i],xx,.35,zz);}}
 // Rounded island foundation and safe walkable surface, with sea/stream outside.
 const sea=box(130,.25,130,learn?'#48b7c9':'#76c3c1',0,-1.1,0);sea.receiveShadow=false;
 function island(w,d,r,depth,color,y){
  const shape=new T.Shape(),x=-w/2,z=-d/2;shape.moveTo(x+r,z);shape.lineTo(x+w-r,z);shape.quadraticCurveTo(x+w,z,x+w,z+r);shape.lineTo(x+w,z+d-r);shape.quadraticCurveTo(x+w,z+d,x+w-r,z+d);shape.lineTo(x+r,z+d);shape.quadraticCurveTo(x,z+d,x,z+d-r);shape.lineTo(x,z+r);shape.quadraticCurveTo(x,z,x+r,z);
  const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.15,bevelSize:.18,bevelSegments:2,steps:1,curveSegments:8});geometries.set('island'+color,geometry);const m=new T.Mesh(geometry,mat(color));m.rotation.x=-Math.PI/2;m.position.y=y;m.castShadow=true;m.receiveShadow=true;scene.add(m);
 }
 island(13.8,22.5,1.4,1.25,learn?'#c6b796':'#a1ac80',-1.45);
 island(13.1,21.8,1.2,.12,learn?'#e5d8af':'#88b56b',-.23);
 // Shoreline highlights and floating lily leaves sit outside the walkable island.
 for(let i=0;i<13;i++){const x=i%2?8.1:-8.7,z=-10+i*1.8;const foam=mesh('TorusGeometry',[.45,.025,5,20],learn?'#aeede3':'#b0ddd1',x,-.91,z);foam.rotation.x=-Math.PI/2;foam.castShadow=false;}

 const pathColor=learn?'#f3e1b6':'#e8d3a3';
 // A wide curving main path, plus traversable side clearings and loops.
 const path=new T.CatmullRomCurve3([new T.Vector3(0,.06,9),new T.Vector3(-1,.06,5),new T.Vector3(1,.06,0),new T.Vector3(-.7,.06,-5),new T.Vector3(.8,.06,-10)]);
 for(let i=0;i<95;i++){const p=path.getPoint(i/94);const tile=cylinder(.9,.9,.045,pathColor,p.x,.085,p.z);tile.castShadow=false;}
 for(const p of PICKUPS){box(3.8,.04,1.35,pathColor,p.x/2,.09,p.z);cylinder(1.15,1.15,.05,pathColor,p.x,.1,p.z);}
 // Landscape clusters leave all four bonus corners reachable.
 for(let i=0;i<8;i++){const z=9-i*2.8;tree(-5.9,z,.7+(i%3)*.12,learn);if(i%2===0)tree(5.9,z-1.1,.82,learn);}
 [[-3.6,8.5],[-3,1.6],[3.1,6.8],[3.5,-3.2],[-2.7,-8.7]].forEach(([x,z],i)=>{tree(x,z,.8+i%2*.2,learn);flowers(x+.85,z+.55);});
 [[-5,7],[4.8,4],[-4,-1.8],[4,-8.7]].forEach(([x,z])=>rock(x,z,.55));
 for(let i=0;i<18;i++){const x=(i%2?1:-1)*(2.1+(i%3)*1.2),z=9-(i*1.19)%19;flowers(x,z);}
 function house(x,z,color){
  box(1.65,1.5,1.5,'#fff0cf',x,.75,z);const roof=mesh('ConeGeometry',[1.4,.9,4],color,x,1.95,z);roof.rotation.y=Math.PI/4;
  box(.42,.85,.04,'#538f97',x,.43,z+.77);box(.36,.4,.04,'#4c7d8c',x-.48,1.03,z+.77);box(.5,.07,.2,'#f7e6b8',x-.48,.78,z+.85);obstacle(x,z,1.0);
 }
 if(learn){house(-3.5,-3.8,'#d77a51');house(3.7,8.5,'#dc9861');house(-3.6,-7,'#bc7356');
  // A small pier, moored boat and rolling turquoise water.
  box(3,.2,2,'#b78e61',8,-.05,5);for(let i=0;i<4;i++)box(.45,.04,2.2,'#d6b580',6.8+i*.65,.08,5);
  const boat=mesh('SphereGeometry',[1,12,8], '#e8c58e',9.5,-.5,7);boat.scale.set(.7,.4,1.5);cylinder(.05,.05,2.7,'#8d7050',9.5,.6,7);
  const sail=mesh('ConeGeometry',[.85,1.8,3],'#fff1cf',9.7,1.2,7);sail.scale.z=.08;
 }else{
  // Waterfall just outside the collision boundary; a decorative bridge crosses it.
  box(2.0,.06,26,'#58bdd0',-8,-.1,0);box(2,2,.1,'#93e1df',-8,-.9,8);
  box(4,.18,1.5,'#b48b58',-7,.1,2.5);for(const z of [1.8,3.2]){box(4,.12,.1,'#8e724b',-7,.75,z);for(let x=-8.5;x<-5;x++)cylinder(.06,.06,.8,'#8e724b',x,.45,z);}
  house(3.7,8.5,'#bf9265');
 }
 // Portal stations represent the real nearby progress entries, never invented lessons.
 const nearby=[current-1,current,current+1].filter(i=>i>=0&&i<steps.length);
 nearby.forEach(index=>{
  const step=steps[index],offset=index-current,z=offset===-1?7.7:offset===0?-2:-8.5,x=offset===0?1:offset===-1?-.3:.3;
  const g=new T.Group();g.position.set(x,0,z);scene.add(g);
  const color=step.done?'#4f9f7a':step.available?'#e7bd68':'#81918c';
  cylinder(1.2,1.3,.22,'#e0c99a',0,.11,0,g);
  for(const side of [-1,1]){box(.35,2,.4,color,side*.85,1.1,0,g);ball(.24,color,side*.85,2.2,0,g);}
  const arch=mesh('TorusGeometry',[.85,.17,8,24,Math.PI],color,0,2.15,0,g);
  const glow=box(1.3,1.9,.08,step.available?'#b0e7c2':'#839e9c',0,1.1,-.04,g);glow.material=mat(step.available?'#b0e7c2':'#839e9c');
  const c=document.createElement('canvas');c.width=384;c.height=128;const cx=c.getContext('2d');cx.fillStyle='#fff4d9';cx.beginPath();cx.roundRect(2,2,380,124,28);cx.fill();cx.fillStyle='#214842';cx.textAlign='center';cx.font='bold 38px sans-serif';cx.fillText((index+1)+'. Bölüm'+(step.done?' ✓':step.available?'':' · Kilitli'),192,78);
  const texture=new T.CanvasTexture(c);textures.add(texture);texture.colorSpace=T.SRGBColorSpace;const sm=new T.SpriteMaterial({map:texture,depthTest:false});const sprite=new T.Sprite(sm);sprite.position.set(0,3,0);sprite.scale.set(3.0,1,1);g.add(sprite);
  gates.push({x,z,index,available:!!step.available,done:!!step.done,group:g});
 });
 // Batch static scenery by geometry/material: hundreds of leaves and flowers
 // become a few draw calls. Player, coins and labels remain independently live.
 scene.updateMatrixWorld(true);const batches=new Map();scene.traverse(o=>{if(o.isMesh){const key=o.geometry.uuid+'|'+o.material.uuid+'|'+o.castShadow+'|'+o.receiveShadow;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);}});
 for(const objects of batches.values())if(objects.length>2){const first=objects[0],batch=new T.InstancedMesh(first.geometry,first.material,objects.length);batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;objects.forEach((o,i)=>batch.setMatrixAt(i,o.matrixWorld));batch.instanceMatrix.needsUpdate=true;objects.forEach(o=>o.removeFromParent());scene.add(batch);}
 const pickupGroup=new T.Group();scene.add(pickupGroup);
 PICKUPS.forEach(p=>{
  const g=new T.Group();g.position.set(p.x,.65,p.z);pickupGroup.add(g);
  if(p.kind==='gold'){const coin=cylinder(.29,.29,.10,'#ffcf58',0,0,0,g);coin.rotation.x=Math.PI/2;const star=mesh('OctahedronGeometry',[.13,0],'#fff0ad',0,0,.08,g);}
  else{box(.65,.42,.45,'#a77a44',0,0,0,g);box(.72,.18,.5,'#e8c16b',0,.28,0,g);const energy=mesh('OctahedronGeometry',[.25,0],'#6ce4eb',0,.75,0,g);energy.scale.set(.7,1.6,.7);}
  const ring=mesh('TorusGeometry',[.49,.035,6,24],p.kind==='gold'?'#fff0a8':'#a7f9ed',0,-.47,0,g);ring.rotation.x=Math.PI/2;
  g.visible=false;pickups.push({...p,group:g,pending:false,claimed:false});
 });
 let player=null,avatarSignature='',legs=[],arms=[];
 function setCharacter(character){
  const gender=genderOf(character),s=character?.s||{},signature=JSON.stringify([gender,s.ten,s.sacRenk,s.sac,s.ust,s.kiyafet]);if(signature===avatarSignature)return;avatarSignature=signature;
  const old=player,position=old?.position.clone()||new T.Vector3(.3,0,4.4),rotation=old?.rotation.y||0;
  if(old)scene.remove(old);player=new T.Group();player.position.copy(position);player.rotation.y=rotation;player.userData.gender=gender;scene.add(player);player.scale.setScalar(1.2);legs=[];arms=[];
  const skin=['#ffe0c7','#f6c9a3','#e3a77b','#c68655','#8d5a3b','#5e3a24'][Number(s.ten)]||'#f6c9a3';
  const hair=/^#[0-9a-f]{6}$/i.test(s.sacRenk||'')?s.sacRenk:'#634335';
  const shirtColor=/^a:[^:]+:(#[0-9a-f]{6}):/i.exec(s.ust||'')?.[1]||({'tisort-mor':'#9968bd','tisort-mavi':'#438bac','tisort-yesil':'#40a875'}[s.kiyafet])||(gender==='k'?'#8c6bb7':gender==='e'?'#4295a8':'#e9af4e');
  if(!gender){ball(.37,'#eac878',0,1.5,0,player);cylinder(.39,.45,.6,'#f4d791',0,1.04,0,player);ball(.16,'#473e36',-.13,1.54,.31,player);ball(.16,'#473e36',.13,1.54,.31,player);}
  else{
   cylinder(.28,.32,.53,shirtColor,0,1.0,0,player);ball(.32,skin,0,1.58,0,player);ball(.33,hair,0,1.74,-.06,player);ball(.1,hair,-.25,1.59,-.06,player);ball(.1,hair,.25,1.59,-.06,player);
   if(gender==='k'){const pony=ball(.22,hair,.29,1.5,-.25,player);pony.scale.y=1.5;ball(.065,'#e5bc5f',.26,1.68,-.18,player);}
   for(const x of [-.105,.105]){ball(.035,'#2d3c3b',x,1.62,.298,player);ball(.012,'#ffffff',x-.008,1.63,.329,player);}
   ball(.035,'#c18169',0,1.48,.30,player);
  }
  for(const x of [-.16,.16]){const limb=new T.Group();limb.position.set(x,.78,0);player.add(limb);cylinder(.1,.085,.5,'#697a7a',0,-.22,0,limb);box(.21,.12,.32,'#f1e5cd',0,-.5,.05,limb);legs.push(limb);}
  for(const x of [-.36,.36]){const limb=new T.Group();limb.position.set(x,1.18,0);player.add(limb);cylinder(.095,.075,.38,shirtColor,0,-.13,0,limb);ball(.085,skin,0,-.35,0,limb);arms.push(limb);}
  box(.39,.43,.2,'#dfac60',0,1.0,-.32,player);box(.27,.18,.08,'#f5d08b',0,.93,-.45,player);
  root.dataset.characterGender=gender||'unset';
 }
 setCharacter(options.character);
 const enter=root.querySelector('.rx-enter'),status=root.querySelector('.rx-status'),count=root.querySelector('.rx-count span'),skip=root.querySelector('.rx-skip'),joystick=root.querySelector('.rx-joystick'),thumb=root.querySelector('.rx-thumb');
 let disposed=false,statusUntil=0,gate=null,claimsReady=false,previewMode=false,raf=0,last=0,time=0,walk=0,pointerId=null,origin=null,axes={x:0,z:0};const keys=new Set(),removers=[],disposeCallbacks=[];
 function listen(el,event,fn,opts){el.addEventListener(event,fn,opts);removers.push(()=>el.removeEventListener(event,fn,opts));}
 function say(text){status.textContent=text;status.hidden=false;statusUntil=performance.now()+3500;}
 function stopInput(){axes={x:0,z:0};pointerId=null;origin=null;keys.clear();thumb.style.transform='';}
 function pointerDown(e){root.querySelector('.rx-hint').hidden=true;if(pointerId!==null)return;e.preventDefault();pointerId=e.pointerId;origin={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});}
 function pointerMove(e){if(e.pointerId!==pointerId||!origin)return;e.preventDefault();const dx=(e.clientX-origin.x)/37,dy=(e.clientY-origin.y)/37,l=Math.max(1,Math.hypot(dx,dy));axes={x:dx/l,z:dy/l};thumb.style.transform='translate('+axes.x*22+'px,'+axes.z*22+'px)';}
 function pointerEnd(e){if(e.pointerId===pointerId)stopInput();}
 for(const target of [canvas,joystick]){listen(target,'pointerdown',pointerDown);listen(target,'pointermove',pointerMove);for(const ev of ['pointerup','pointercancel','lostpointercapture'])listen(target,ev,pointerEnd);}
 const keyMap={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};
 listen(canvas,'keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(keyMap[k]){root.querySelector('.rx-hint').hidden=true;e.preventDefault();keys.add(k);}});
 listen(canvas,'keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));listen(canvas,'blur',stopInput);listen(window,'blur',stopInput);
 listen(enter,'click',()=>{if(gate?.available){stopInput();launch(gate.index);}});listen(skip,'click',()=>{stopInput();launch(current);});skip.disabled=!steps[current]?.available;
 listen(canvas,'webglcontextlost',e=>{e.preventDefault();dispose();});
 function refreshCount(){count.textContent=pickups.filter(p=>p.claimed).length+' / 4';}
 async function initRewards(){
  if(!hasRewards){root.querySelector('.rx-count').hidden=true;return;}
  try{const data=await request('status');if(disposed)return;previewMode=!!data.preview;const claimed=new Set(data.claims||[]);for(const p of pickups){p.claimed=claimed.has(p.id);p.group.visible=!p.claimed;}claimsReady=true;refreshCount();}
  catch{say('Bonuslara bağlanılamadı. Yeniden açtığında tekrar denenecek.');root.querySelector('.rx-count').hidden=true;}
 }
 async function collect(p){
  p.pending=true;p.group.scale.setScalar(.7);
  try{const data=await request('claim',p.id);if(disposed)return;p.claimed=true;p.group.visible=false;refreshCount();say(previewMode?'Deneme bonusu toplandı.':data.duplicate?'Bu bonus daha önce toplandı.':p.kind==='gold'?'+'+(data.gold||0)+' altın topladın!':data.energyAdded?'+'+data.energyAdded+' enerji buldun!':'Enerjin dolu. Bonus köşede seni bekliyor.');if(data.full){p.claimed=false;p.group.visible=true;p.retryAt=Infinity;refreshCount();}}
  catch{if(!disposed){say('Bonus kaydedilemedi. Köşeden uzaklaşıp tekrar dene.');p.retryAt=performance.now()+5000;}}
  finally{p.pending=false;p.group.scale.setScalar(1);}
 }
 let width=1,height=1;
 function resize(){width=container.clientWidth;height=container.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);const extent=width/height>1.3?10:12,aspect=width/height;camera.left=-extent*aspect;camera.right=extent*aspect;camera.top=extent;camera.bottom=-extent;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);container.append(root);resize();observer.observe(container);
 let visible=true;const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;if(!visible)stopInput();});intersection.observe(root);
 function frame(now){
  if(disposed)return;if(!root.isConnected){dispose();return;}
  raf=requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-(last||now))/1000));last=now;
  if(document.hidden||!visible||!root.getClientRects().length){stopInput();return;}
  time+=dt;let dx=axes.x,dz=axes.z;for(const k of keys){dx+=keyMap[k][0];dz+=keyMap[k][1];}
  // Convert screen-relative motion into world coordinates for the oblique camera.
  const next=move(player.position,dx*.86+dz*.51,-dx*.51+dz*.86,dt,obstacles),moving=Math.hypot(next.x-player.position.x,next.z-player.position.z)>.001;
  if(moving){player.rotation.y=Math.atan2(next.x-player.position.x,next.z-player.position.z);walk+=dt*10;}
  player.position.x=next.x;player.position.z=next.z;player.position.y=moving?Math.abs(Math.sin(walk))*.045:0;
  legs.forEach((l,i)=>l.rotation.x=moving?Math.sin(walk+i*Math.PI)*.5:0);arms.forEach((l,i)=>l.rotation.x=moving?Math.sin(walk+i*Math.PI)*-.4:0);
  gate=nearestGate(player.position,gates);enter.hidden=!gate;enter.disabled=!gate?.available;if(gate)enter.textContent=gate.available?(gate.done?'Bölümü tekrar oyna':'Bölüme başla'):'Bu bölüm henüz kilitli';
  for(const p of pickups){if(p.group.visible){p.group.rotation.y+=dt*.8;p.group.position.y=.65+Math.sin(time*2+p.id)*.08;if(claimsReady&&!p.pending&&!p.claimed&&now>(p.retryAt||0)&&Math.hypot(player.position.x-p.x,player.position.z-p.z)<.72)collect(p);}}
  const targetZ=T.MathUtils.clamp(player.position.z*.6,-4.8,4.8),target=new T.Vector3(player.position.x*.18,.2,targetZ);
  camera.position.lerp(new T.Vector3(target.x+12,20,target.z+21),1-Math.exp(-dt*3));camera.lookAt(target);
  renderer.render(scene,camera);if(!status.hidden&&now>statusUntil)status.hidden=true;
 }
 listen(document,'visibilitychange',()=>{stopInput();last=0;});
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();removers.forEach(f=>f());disposeCallbacks.forEach(f=>f());scene.traverse(o=>{if(o.isSprite)o.material.dispose();if(o.isInstancedMesh)o.dispose();});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());renderer.dispose();root.remove();}
 initRewards();raf=requestAnimationFrame(frame);
 return {dispose,setCharacter,onDispose:fn=>disposeCallbacks.push(fn),snapshot:()=>({x:player.position.x,z:player.position.z,gender:player.userData.gender,claims:pickups.filter(p=>p.claimed).map(p=>p.id),objects:renderer.info.memory,drawCalls:renderer.info.render.calls,gate:gate?.index})};
}
