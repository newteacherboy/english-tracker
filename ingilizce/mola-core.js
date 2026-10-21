/* Pure match-3 rules; also exercised by node:test without a browser. */
(function(root){'use strict';
const W=7,H=9,COLORS=6;
function matches(b){const hit=new Set();for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=y*W+x,c=b[i];if(c<0)continue;
 if(x<W-2&&b[i+1]===c&&b[i+2]===c){let n=x;while(n<W&&b[y*W+n]===c)hit.add(y*W+n++);}
 if(y<H-2&&b[i+W]===c&&b[i+W*2]===c){let n=y;while(n<H&&b[n*W+x]===c)hit.add(n++*W+x);}
}return [...hit];}
function adjacent(a,b){return a>=0&&b>=0&&a<W*H&&b<W*H&&(Math.abs(a-b)===W||Math.floor(a/W)===Math.floor(b/W)&&Math.abs(a-b)===1);}
function swap(b,a,c){[b[a],b[c]]=[b[c],b[a]];}
function legal(b){for(let i=0;i<W*H;i++)for(const j of [i+1,i+W])if(adjacent(i,j)){swap(b,i,j);const ok=matches(b).length>0;swap(b,i,j);if(ok)return [i,j];}return null;}
function board(rand=Math.random){for(let attempt=0;attempt<100;attempt++){const b=[];for(let i=0;i<W*H;i++){const options=Array.from({length:COLORS},(_,c)=>c).filter(c=>!(i%W>=2&&b[i-1]===c&&b[i-2]===c)&&!(i>=W*2&&b[i-W]===c&&b[i-W*2]===c));b.push(options[Math.min(options.length-1,Math.floor(rand()*options.length))]);}if(legal(b))return b;}throw Error('Tahta hazırlanamadı.');}
function collapse(b,hit,rand=Math.random){const removed=new Set(hit),fall=Array(W*H).fill(0);for(let x=0;x<W;x++){const keep=[];for(let y=H-1;y>=0;y--)if(!removed.has(y*W+x))keep.push({c:b[y*W+x],y});for(let y=H-1;y>=0;y--){const old=keep[H-1-y];b[y*W+x]=old?old.c:Math.floor(rand()*COLORS);fall[y*W+x]=old?y-old.y:y+1;}}return fall;}
function matchReward(count,chain=1){const bonus=(count>=9?900:count>=7?600:count>=6?400:count>=5?200:count>=4?80:0)*chain;return {base:count*60*chain,bonus,total:count*60*chain+bonus};}
const api=Object.freeze({matchReward,W,H,COLORS,matches,adjacent,swap,legal,board,collapse});
if(typeof module==='object'&&module.exports)module.exports=api;else root.dmMolaCore=api;
})(typeof window==='undefined'?globalThis:window);
