// Pure movement rules shared by the renderer and deterministic checks.
export const PICKUPS = Object.freeze([
 {id:0,x:-4.8,z:4,kind:'gold',amount:2},
 {id:1,x:4.8,z:0.5,kind:'gold',amount:2},
 {id:2,x:-4.7,z:-5,kind:'gold',amount:2},
 {id:3,x:4.8,z:-6,kind:'energy',amount:1}
]);
export function genderOf(character){return ['k','e'].includes(character?.cins)?character.cins:null;}
export function canStand(x,z,obstacles=[]){
 return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<6.4&&z>-10&&z<10&&
 Math.hypot(Math.max(0,Math.abs(x)-5.6),Math.max(0,Math.abs(z)-9.2))<.8&&
 !obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.28);
}
export function move(position,dx,dz,dt,obstacles=[]){
 const length=Math.hypot(dx,dz);if(!length)return {...position};
 const distance=Math.min(.05,Math.max(0,dt))*3.8/Math.max(1,length);
 let {x,z}=position;const nx=x+dx*distance,nz=z+dz*distance;
 if(canStand(nx,z,obstacles))x=nx;if(canStand(x,nz,obstacles))z=nz;
 return {x,z};
}
export function nearestGate(position,gates){return gates.find(g=>Math.hypot(position.x-g.x,position.z-g.z)<1.65)||null;}
