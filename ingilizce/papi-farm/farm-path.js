(function(root,factory){let api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FarmPath=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
const minX=-20,maxX=20,minY=-17,maxY=17,step=.28;const w=Math.floor((maxX-minX)/step)+1,h=Math.floor((maxY-minY)/step)+1;
let bboxes=[[6.68,8.43,-17,-3.23],[6.68,8.43,-2.11,17],[-7.78,-7.42,-6.7,6.8],[-7.65,7.0,6.66,6.97],[-5.47,-2.03,2.81,5.75],[1.97,5.20,2.81,5.75],[4.99,6.65,-.72,.93],[-7.15,-5.8,4.72,6.4],[-7.15,-5.8,-1.7,.02],[-7.15,-5.8,-6.2,-4.45],[5.65,6.45,5,6.4],[5.6,6.45,-6.3,-4.8],[-.65,.95,6.3,7.7]];for(let [x,y] of [[-10,10],[-11,-1],[10,10],[-11,-10],[11,-9],[-5,11],[4,12],[-3,-11]])bboxes.push([x-.45,x+.45,y-.45,y+.45]);
for(let y of [-2,-5])for(let x of [-3.85,-.85,2.15])bboxes.push([x-1.37,x+1.37,y-1.29,y+1.29]);
const defaultBoxes=bboxes.map(b=>[...b]);let layout='spring:false';
const clear=(x,y)=>x>=minX&&x<=maxX&&y>=minY&&y<=maxY&&!bboxes.some(b=>x>=b[0]&&x<=b[1]&&y>=b[2]&&y<=b[3]);
const coord=i=>[minX+i%w*step,minY+Math.floor(i/w)*step],id=(x,y)=>y*w+x;
let free=[],ok=new Set();
function rebuild(){free=[];for(let i=0;i<w*h;i++){let p=coord(i);if(clear(...p))free.push(i)}ok=new Set(free)}
function setLayout(region='spring',extension=false){const key=region+':'+!!extension;if(key===layout&&free.length)return;layout=key;
 if(region==='spring'){bboxes=defaultBoxes.map(b=>[...b]);if(extension)for(let x of [10.25,13.25,16.25])bboxes.push([x-1.37,x+1.37,-3.29,-.71])}
 else{bboxes=[[-5.35,-1.65,3.5,6.6]];const y=region==='winter'?-5:-2;for(let x of [-3.5,-.4,2.7])bboxes.push([x-1.37,x+1.37,y-1.29,y+1.29]);if(region==='summer'){bboxes.push([5.75,20,-17,17]);for(let [x,y] of [[-6,6],[-7,-1],[-6,-6],[4.7,5.3],[4.7,-6.2],[-2,10],[-10,-8],[2,-11]])bboxes.push([x-.35,x+.35,y-.35,y+.35])}if(region==='winter'){bboxes.push([2.55,5.05,4.4,6.4]);for(let [x,y] of [[-3.8,1.2],[0,1.8],[3.8,1.2]])bboxes.push([x-.7,x+.7,y-.65,y+.65])}}
 rebuild()}
rebuild();
function near(p){let best=-1,d=Infinity;for(let i of free){let q=coord(i),v=(q[0]-p[0])**2+(q[1]-p[1])**2;if(v<d){d=v;best=i}}return best}
function visible(a,b){let d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(d/.10);for(let j=0;j<=n;j++){let t=n?j/n:0;if(!clear(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))return false}return true}
function route(from,to){let a=near(from),goal=near(to);if(a<0||goal<0)return [];let target=coord(goal);if(clear(...to)&&visible(from,to))return [to];if(visible(from,target))return [target];let open=[a],dist=new Map([[a,0]]),parent=new Map(),seen=new Set(),found=false;const hval=i=>{let q=coord(i);return Math.hypot(q[0]-target[0],q[1]-target[1])};while(open.length){let best=0;for(let j=1;j<open.length;j++)if(dist.get(open[j])+hval(open[j])<dist.get(open[best])+hval(open[best]))best=j;let i=open.splice(best,1)[0];if(seen.has(i))continue;seen.add(i);if(i===goal){found=true;break}let x=i%w,y=Math.floor(i/w);for(let dy of [-1,0,1])for(let dx of [-1,0,1]){if(!dx&&!dy)continue;let X=x+dx,Y=y+dy;if(X<0||X>=w||Y<0||Y>=h)continue;let j=id(X,Y);if(!ok.has(j)||seen.has(j))continue;if(dx&&dy&&(!ok.has(id(X,y))||!ok.has(id(x,Y))))continue;let nd=dist.get(i)+step*Math.hypot(dx,dy);if(nd<(dist.get(j)??Infinity)){dist.set(j,nd);parent.set(j,i);open.push(j)}}}
if(!found)return [coord(a)];let raw=[target],i=goal;while(i!==a){i=parent.get(i);raw.push(coord(i))}raw.reverse();let path=[],last=from,start=0;while(start<raw.length){let far=start;for(let j=start+1;j<raw.length;j++){if(visible(last,raw[j]))far=j;else break}path.push(raw[far]);last=raw[far];start=far+1}if(clear(...to)&&visible(last,to))path.push(to);return path}
return {route,clear,visible,setLayout}
});
