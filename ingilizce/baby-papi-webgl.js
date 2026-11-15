/* Bebek Papi: native WebGL 3D, no CDN or external dependencies. */
(function(){
'use strict';
if(window.DMBabyPapi3D)return;
const VERT='attribute vec3 p;attribute vec3 n;uniform mat4 m;uniform vec3 tint;varying vec3 shade;void main(){vec3 normal=normalize(mat3(m)*n);float l=.58+.42*max(dot(normal,normalize(vec3(-.4,.7,1.))),0.);shade=tint*l;gl_Position=m*vec4(p,1.);}';
/* Simple per-object orthographic transform in vertex shader; no network access. */
const VS='attribute vec3 p;attribute vec3 n;uniform vec3 pos;uniform vec3 rad;uniform float yaw;uniform float roll;uniform float pitch;uniform float aspect;uniform vec3 tint;varying vec3 v;void main(){vec3 q=p*rad;float a=cos(yaw),b=sin(yaw);q=vec3(a*q.x+b*q.y,-b*q.x+a*q.y,q.z);float c=cos(roll),d=sin(roll);q=vec3(c*q.x-d*q.z,q.y,d*q.x+c*q.z);float e=cos(pitch),f=sin(pitch);q=vec3(q.x,e*q.y-f*q.z,f*q.y+e*q.z);q+=pos;float depth=1.+q.y*.12;gl_Position=vec4(q.x/(1.62*aspect*depth),q.z/(1.85*depth)-.13,0.,1.);vec3 normal=normalize(n);v=tint*(.67+.33*max(dot(normal,normalize(vec3(-.4,-.6,.9))),0.));}';
const FS='precision mediump float;varying vec3 v;void main(){gl_FragColor=vec4(v,1.);}';
const parts=[];
function add(id,p,r,c,kind,side){parts.push({id,p,r,c:c.map(v=>v/255),kind:kind||'body',side:side||0});}
const teal=[46,222,217],mint=[144,249,227],purple=[149,62,229],pink=[223,75,240],blue=[33,139,239],orange=[255,171,24];
add('body',[0,0,-.38],[.49,.39,.61],teal);
add('belly',[0,-.36,-.35],[.36,.11,.43],[231,255,246]);
add('head',[0,-.05,.50],[.73,.59,.64],[52,225,222],'head');
add('muzzle',[0,-.53,.35],[.41,.17,.25],mint,'head');
for(const s of [-1,1]){
 add('white'+s,[s*.32,-.53,.63],[.245,.095,.29],[255,255,255],'eye',s);
 add('iris'+s,[s*.32,-.619,.61],[.168,.045,.21],[29,144,241],'eye',s);
 add('pupil'+s,[s*.32,-.657,.60],[.109,.027,.14],[18,39,82],'eye',s);
 add('shine'+s,[s*.275,-.68,.70],[.05,.016,.056],[255,255,255],'eye',s);
 add('cheek'+s,[s*.53,-.46,.31],[.15,.045,.077],[255,173,191],'head',s);
 add('wing'+s,[s*.50,.03,-.33],[.23,.27,.38],blue,'wing',s);
 for(let i=0;i<3;i++)add('wingtip'+s+i,[s*(.57+i*.045),-.17+i*.055,-.48-i*.085],[.125,.13,.20],i%2?purple:blue,'wing',s);
 add('foot'+s,[s*.27,-.22,-1.02],[.17,.21,.11],orange,'foot',s);
 for(let i=0;i<3;i++)add('toe'+s+i,[s*.27+(i-1)*.09,-.37,-1.05],[.052,.115,.06],orange,'foot',s);
}
add('beak',[0,-.69,.36],[.225,.22,.20],[255,203,35],'beak');
add('hook',[0,-.83,.22],[.115,.12,.17],[255,154,16],'beak');
add('mouth',[0,-.818,.17],[.13,.045,.035],[139,48,70],'beak');
for(let i=0;i<5;i++){
 add('crest'+i,[(i-2)*.115,.07,1.11+(i===2?.12:0)],[.105,.21,.33],i%2?purple:pink,'crest');
 add('tail'+i,[(i-2)*.115,.56,-.74],[.105,.47,.13],i%2?purple:blue,'tail');
}
function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function mount(canvas){
 let gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false});
 if(!gl)return null;
 let program=gl.createProgram();gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,VS));gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;gl.useProgram(program);
 const loc={};for(const name of ['pos','rad','yaw','roll','pitch','aspect','tint'])loc[name]=gl.getUniformLocation(program,name);
 const P=gl.getAttribLocation(program,'p'),N=gl.getAttribLocation(program,'n');
 let verts=[],norms=[],indices=[],rows=12,cols=16;
 for(let y=0;y<=rows;y++){let a=Math.PI*y/rows;for(let x=0;x<=cols;x++){let b=2*Math.PI*x/cols;let v=[Math.sin(a)*Math.cos(b),Math.sin(a)*Math.sin(b),Math.cos(a)];verts.push(...v);norms.push(...v);}}
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){let k=y*(cols+1)+x;indices.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
 function buffer(target,arr){let b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,arr,gl.STATIC_DRAW);return b;}
 const pb=buffer(gl.ARRAY_BUFFER,new Float32Array(verts)),nb=buffer(gl.ARRAY_BUFFER,new Float32Array(norms)),ib=buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices));
 gl.enableVertexAttribArray(P);gl.enableVertexAttribArray(N);gl.enable(gl.DEPTH_TEST);
 let running=true,mood='idle',time=0,previous=0,raf=0;
 function draw(ms){
  if(!running)return;let dt=previous?Math.min((ms-previous)/1000,.08):0;previous=ms;time+=dt;
  let w=Math.round(canvas.clientWidth*Math.min(devicePixelRatio||1,1.5)),h=Math.round(canvas.clientHeight*Math.min(devicePixelRatio||1,1.5));
  if(w&&h&&(canvas.width!==w||canvas.height!==h)){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.vertexAttribPointer(P,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.vertexAttribPointer(N,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.uniform1f(loc.aspect,Math.max(.7,w/h));
  const t=time;
  for(const part of parts){
   let [x,y,z]=part.p;let yaw=0,roll=0,pitch=0;
   if(mood==='walk'){if(part.kind==='foot')z+=Math.max(0,Math.sin(t*11*part.side))*.18;else z+=Math.abs(Math.sin(t*11))*.042;if(part.kind==='tail')roll=.12*Math.sin(t*11);if(part.kind==='wing')roll=part.side*.09*Math.sin(t*11);}
   if(mood==='happy'||mood==='celebrate'){if(part.kind!=='foot')z+=Math.abs(Math.sin(t*6))*(mood==='celebrate'?.18:.10);if(part.kind==='wing'){x+=part.side*.12*Math.abs(Math.sin(t*7));roll=part.side*.4*Math.abs(Math.sin(t*7));}if(part.kind==='crest')roll=.08*Math.sin(t*7);}
   if(mood==='sad'){if(['head','eye','beak','crest'].includes(part.kind))z-=.09;if(part.kind==='wing')z-=.13;}
   if(mood==='comfort'){if(part.kind==='head'||part.kind==='eye'||part.kind==='beak')roll=.05*Math.sin(t*3);if(part.kind==='wing')roll=part.side*.11*Math.sin(t*3);}
   if(mood==='talk'&&part.kind==='beak'&&part.id!=='beak')z-=.06*(.5+.5*Math.sin(t*14));
   if(mood==='idle'&&part.kind!=='foot')z+=.02*Math.sin(t*2.5);
   gl.uniform3f(loc.pos,x,y,z);gl.uniform3f(loc.rad,...part.r);gl.uniform3f(loc.tint,...part.c);gl.uniform1f(loc.yaw,yaw);gl.uniform1f(loc.roll,roll);gl.uniform1f(loc.pitch,pitch);
   gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
  }
  raf=requestAnimationFrame(draw);
 }
 raf=requestAnimationFrame(draw);
 return {setMood(m){mood=m||'idle';time=0;},destroy(){running=false;cancelAnimationFrame(raf);const lose=gl.getExtension('WEBGL_lose_context');lose?.loseContext();}};
}
window.DMBabyPapi3D={mount};
})();