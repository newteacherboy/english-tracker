(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FarmCamera=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function limits(width,height,baseScale,renderScale){width=Math.max(1,width);height=Math.max(1,height);const base=Math.max(baseScale,12.4*width/height),safe=Math.max(5,renderScale-.6);return {base,min:Math.max(.58,base*Math.max(1,height/width)/safe),max:2.65,safe}}
function bounded(view,width,height,baseScale,renderScale){const l=limits(width,height,baseScale,renderScale),zoom=clamp(view.zoom,l.min,l.max),xLim=Math.max(0,(l.safe-l.base/zoom)/2),yLim=Math.max(0,(l.safe-l.base/zoom*height/width)/2);return {zoom,x:clamp(view.x,-xLim,xLim),y:clamp(view.y,-yLim,yLim)}}
function drag(view,dx,dy,w,h,b,r){let l=limits(w,h,b,r),unit=l.base/view.zoom/w;return bounded({zoom:view.zoom,x:view.x-dx*unit,y:view.y+dy*unit},w,h,b,r)}
// Preserve the world-space point under one's fingers while changing both the pinch centre and magnification.
function pinch(view,newZoom,from,to,w,h,b,r){let l=limits(w,h,b,r),z=clamp(newZoom,l.min,l.max),old=l.base/view.zoom/w,next=l.base/z/w;
return bounded({zoom:z,x:view.x+(from[0]-w/2)*old-(to[0]-w/2)*next,y:view.y-(from[1]-h/2)*old+(to[1]-h/2)*next},w,h,b,r)}
return {limits,bounded,drag,pinch}
});
