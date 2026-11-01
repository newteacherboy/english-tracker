import * as T from '../../ingilizce/vendor/three-0.180.0/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
export async function loadNature(progress){
 const names=['trees','rocks','bushes','flowers','flower-bushes','grass'],out={},loader=new GLTFLoader();let done=0;
 await Promise.all(names.map(async name=>{const gltf=await loader.loadAsync(globalThis.GARDEN_ASSETS?.[name]||new URL('./assets/'+name+'.glb',import.meta.url).href);gltf.scene.updateMatrixWorld(true);const candidates=gltf.scene.children.flatMap(x=>x.name==='RootNode'?x.children:[x]);out[name]=candidates.map(node=>{
  const g=new T.Group();node.traverse(o=>{if(!o.isMesh)return;const geom=o.geometry.clone().applyMatrix4(o.matrixWorld);const materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>{const c=m.clone();c.roughness=.9;c.metalness=0;c.envMapIntensity=.28;if(name!=='rocks')c.color.multiplyScalar(.79);return c;});const m=new T.Mesh(geom,Array.isArray(o.material)?materials:materials[0]);m.castShadow=true;m.receiveShadow=true;g.add(m);});
  const bounds=new T.Box3().setFromObject(g),center=bounds.getCenter(new T.Vector3());for(const mesh of g.children)mesh.geometry.translate(-center.x,-bounds.min.y,-center.z);g.userData.height=bounds.max.y-bounds.min.y;g.userData.name=node.name;return g;
 }).filter(g=>g.children.length);progress(++done/names.length);
 }));return out;
}
export function makeToolkit(scene){
 const geometries=new Map(),materials=new Map();
 function material(color,options={}){const key=color+JSON.stringify(options);if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.83,...options}));return materials.get(key);}
 function geometry(kind,args){const key=kind+JSON.stringify(args);if(!geometries.has(key))geometries.set(key,new T[kind](...args));return geometries.get(key);}
 function add(geom,mat,x=0,y=0,z=0,parent=scene){const m=new T.Mesh(geom,typeof mat==='string'?material(mat):mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const sphere=(r,color,x,y,z,parent=scene,sx=1,sy=1,sz=1)=>{const m=add(geometry('SphereGeometry',[r,20,12]),color,x,y,z,parent);m.scale.set(sx,sy,sz);return m;};
 function rounded(w,h,d,r,color,x,y,z,parent=scene){const key='rounded'+[w,h,d,r];if(!geometries.has(key))geometries.set(key,new RoundedBoxGeometry(w,h,d,3,r));return add(geometries.get(key),color,x,y,z,parent);}
 function rod(a,b,ra,rb,color,parent=scene){const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av),m=add(geometry('CylinderGeometry',[rb,ra,delta.length(),10,1]),color,0,0,0,parent);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
 function curve(points,r,color,parent=scene,segments=32){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const geom=new T.TubeGeometry(path,segments,r,8,false);geometries.set('curve'+geometries.size,geom);return add(geom,color,0,0,0,parent);}
 function label(text,{width=3,color='#f8e9bc',ink='#5e432c',font=56,background=true}={}){const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');if(background){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(0,0,768,192,70);ctx.fill();}ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+font+'px Georgia';ctx.fillText(text,384,100);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));return m;}
 return {material,geometry,add,sphere,rounded,rod,curve,label,geometries,materials};
}
export function buildExplorer(tool,gender='e'){
 const {sphere,rounded,rod,curve,material}=tool,g=new T.Group(),skin=material('#e8ad7b',{roughness:.68}),hair=material(gender==='k'?'#75452f':'#593b29',{roughness:.92}),cloth=material(gender==='k'?'#ab624f':'#d56b3c',{roughness:.94}),boot=material('#73513c'),cream=material('#eee2c1');
 // Sculpted silhouette: separate neck, sleeves, palms, fitted shorts and boots.
 const torso=rounded(.55,.59,.36,.13,cloth,0,1.12,0,g);torso.rotation.x=.025;
 rounded(.44,.17,.35,.06,'#9f5134',0,.84,0,g);rod([0,1.36,0],[0,1.52,0],.105,.10,skin,g);
 const head=new T.Group();head.position.set(0,1.69,.015);g.add(head);
 sphere(.31,skin,0,0,0,head,.88,1.08,.86);sphere(.08,skin,-.275,-.01,0,head,.5,.8,.5);sphere(.08,skin,.275,-.01,0,head,.5,.8,.5);
 sphere(.29,hair,0,.12,-.07,head,1.02,.76,1.02);
 // Individual curved hair locks retain a readable silhouette at close range.
 for(let j=0;j<10;j++){const a=j/10*Math.PI*2;curve([[Math.sin(a)*.20,.17,Math.cos(a)*.16-.04],[Math.sin(a+.3)*.28,.26,Math.cos(a+.3)*.19-.03],[Math.sin(a+.55)*.28,.08,Math.cos(a+.55)*.22-.04]],.041,hair,head,12);}
 if(gender==='k'){sphere(.18,hair,.2,-.03,-.25,head,1,.9,1.4);sphere(.16,hair,.25,-.23,-.30,head,.85,1.3,1);sphere(.052,'#eab765',.23,.05,-.28,head);}
 for(const x of [-.10,.10]){sphere(.071,cream,x,.015,.23,head,.8,1.1,.5);sphere(.042,'#426250',x,.012,.265,head,.75,1,.32);sphere(.025,'#202b24',x,.013,.278,head,.7,1,.25);sphere(.011,'#fff8df',x-.01,.032,.285,head);curve([[x-.045,.10,.235],[x,.12,.25],[x+.045,.105,.24]],.012,hair,head,8);}
 sphere(.045,skin,0,-.05,.27,head,.7,.8,1);curve([[-.055,-.13,.23],[0,-.145,.25],[.055,-.13,.23]],.009,'#9f6651',head,10);
 const legs=[],arms=[];
 for(const side of [-1,1]){const pivot=new T.Group();pivot.position.set(side*.16,.79,0);g.add(pivot);rounded(.23,.28,.30,.06,'#b79c67',0,-.12,0,pivot);rod([0,-.23,0],[0,-.48,0],.072,.065,skin,pivot);rod([0,-.44,0],[0,-.54,0],.076,.076,cream,pivot);rounded(.22,.18,.37,.07,boot,0,-.62,.065,pivot);rounded(.23,.043,.38,.015,'#e1cba5',0,-.70,.065,pivot);for(let i=0;i<3;i++)rod([-.055,-.535,.14+i*.035],[.055,-.535,.14+i*.035],.007,.007,cream,pivot);legs.push(pivot);
  const arm=new T.Group();arm.position.set(side*.31,1.33,0);g.add(arm);rod([0,0,0],[side*.055,-.22,.01],.095,.08,cloth,arm);rod([side*.055,-.20,.01],[side*.07,-.43,.035],.07,.055,skin,arm);sphere(.07,skin,side*.07,-.45,.05,arm,.9,1.2,.8);sphere(.025,skin,side*.02,-.44,.09,arm);arms.push(arm);
 }
 // Fully modelled backpack, stitched pocket, straps, flap, buckles and owl badge.
 const bag=rounded(.47,.49,.24,.10,'#3d8291',0,1.10,-.27,g);rounded(.34,.20,.09,.035,'#6ba2a2',0,.97,-.415,g);rounded(.48,.15,.25,.06,'#7aada4',0,1.31,-.29,g);
 for(const side of [-1,1]){curve([[side*.16,1.37,-.27],[side*.22,1.43,.02],[side*.25,1.02,.13],[side*.19,.88,-.18]],.025,'#d2b778',g,18);rounded(.044,.08,.02,.007,'#d5ab60',side*.13,1.16,-.42,g);}
 curve([[-.10,1.38,-.29],[-.1,1.48,-.27],[.1,1.48,-.27],[.1,1.38,-.29]],.022,'#ab946a',g,14);
 const badge=sphere(.087,'#e8d7a4',0,1.04,-.47,g,1,.95,.15);for(const x of [-.034,.034])sphere(.026,'#4e5847',x,1.06,-.486,g,1,1,.25);
 function consolidate(target,skip=new Set()){
  target.updateMatrixWorld(true);const inverse=target.matrixWorld.clone().invert(),groups=new Map();target.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;let p=o.parent;while(p&&p!==target){if(skip.has(p))return;p=p.parent;}const key=o.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);});
  for(const objects of groups.values())if(objects.length>1){const pieces=objects.map(o=>{let geo=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));if(geo.index)geo=geo.toNonIndexed();for(const a of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(a))geo.deleteAttribute(a);if(!geo.attributes.uv)geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));geo.clearGroups();return geo;});const geo=mergeGeometries(pieces);if(geo){const mesh=new T.Mesh(geo,objects[0].material);mesh.castShadow=true;mesh.receiveShadow=true;objects.forEach(o=>o.removeFromParent());target.add(mesh);}pieces.forEach(p=>p.dispose());}
 }
 for(const limb of [...legs,...arms])consolidate(limb);consolidate(g,new Set([...legs,...arms]));
 g.userData={legs,arms,gender};g.scale.setScalar(1.12);return g;
}
