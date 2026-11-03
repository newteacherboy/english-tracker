/* Premium Kelime Eşleştirme · oyun çekirdeği (görüntüden bağımsız, Node'da test edilebilir).
   Tahta: R×C hücre. Parça: {id,t(tür 0..n-1, bomba -1),s(0 yok,1 yatay şerit,2 dikey şerit,3 renk bombası),lock(zincir)}
   Her hamle animasyon adımları döndürür; her adım tahtanın o anki kopyasını taşır. */
(function(root){'use strict';
const SCORE={3:100,4:250,5:500};
const SPECIAL_CELL=60,COMBO_BONUS=500;

function mulberry(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

/* Seviye tasarımı: 100 bölüm, 5 dünya. Sunucu yıldız eşiklerini aynı formülle hesaplar (dm_pwm_star). */
function starScore(level,star){const L=Math.max(1,Math.min(100,level|0)),base=(L<=4?8000:L<=49?6500:5500)+L*20;return Math.floor(base*[0.5,1,1.3][Math.max(1,Math.min(3,star))-1]);}
function levelConfig(level){
 const L=Math.max(1,Math.min(100,level|0)),rng=mulberry(L*7919);
 const types=L<=4?5:L<=49?6:7;
 const moves=Math.max(22,27-Math.floor(L/20));
 const hasIce=L>=6&&(L%4===2||L%4===3||L>=40&&L%2===0),hasLock=!hasIce&&L>=21&&L%5!==0&&L%3===0;
 const goalTypes=L<=2?1:(L<40||hasIce||hasLock)?2:3;
 const per=Math.min(15,9+Math.floor(L/9))+(goalTypes===1?4:0)-(hasIce?2:0)-(hasLock?1:0);
 const goals=[];const pick=[...Array(types).keys()];
 for(let i=0;i<goalTypes;i++){const j=Math.floor(rng()*pick.length);goals.push({type:pick.splice(j,1)[0],need:per});}
 const ice=[],locks=[];const R=7,C=7;
 if(hasIce){
  const pattern=(L>>1)%4;const count=Math.min(8,4+Math.floor(L/20));
  const cells=[];
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){
   const ok=pattern===0?(r>=R-3):pattern===1?(r>=R-2||r>=2&&r<=4&&c>=2&&c<=4):pattern===2?((r+c)%2===0&&r>=2):(Math.abs(r-3)+Math.abs(c-3)<=2);
   if(ok)cells.push([r,c]);
  }
  // Buzlar dağınık değil, kümeli: merkeze yakın hücreler önce.
  cells.sort((a,b)=>(Math.abs(a[0]-4)+Math.abs(a[1]-3))-(Math.abs(b[0]-4)+Math.abs(b[1]-3))+(rng()-.5)*.8);
  ice.push(...cells.slice(0,count));
 }
 if(hasLock){const n=Math.min(6,3+Math.floor(L/25));for(let i=0;i<n;i++){const r=1+Math.floor(rng()*(R-2)),c=Math.floor(rng()*C);if(!locks.some(x=>x[0]===r&&x[1]===c))locks.push([r,c]);}}
 if(ice.length)goals.push({type:'ice',need:ice.length});
 if(locks.length)goals.push({type:'lock',need:locks.length});
 return {level:L,world:Math.ceil(L/20),rows:R,cols:C,types,moves,goals,ice,locks,stars:[1,2,3].map(s=>starScore(L,s))};
}

function create(cfg,seed=Date.now()){
 const st={rows:cfg.rows,cols:cfg.cols,types:cfg.types,rng:mulberry(seed),nextId:1,board:[],ice:[],score:0,moves:cfg.moves,movesUsed:0,
  goals:cfg.goals.map(g=>({...g,have:0})),cfg,combo:0,maxCombo:0,stats:{m3:0,m4:0,m5:0,specials:0}};
 for(let r=0;r<st.rows;r++){st.ice.push(Array(st.cols).fill(0));st.board.push(Array(st.cols).fill(null));}
 for(const [r,c] of cfg.ice||[])st.ice[r][c]=1;
 fillNoMatch(st);
 for(const [r,c] of cfg.locks||[])if(st.board[r][c])st.board[r][c].lock=true;
 ensureMove(st);
 return st;
}
const piece=(st,t,s=0)=>({id:st.nextId++,t,s,lock:false});
function randType(st){return Math.floor(st.rng()*st.types);}
function fillNoMatch(st){
 for(let r=0;r<st.rows;r++)for(let c=0;c<st.cols;c++){
  let t,guard=0;
  do{t=randType(st);guard++;}while(guard<30&&((c>=2&&same(st,r,c-1,t)&&same(st,r,c-2,t))||(r>=2&&same(st,r-1,c,t)&&same(st,r-2,c,t))));
  st.board[r][c]=piece(st,t);
 }
}
function same(st,r,c,t){const p=st.board[r]?.[c];return !!p&&p.s!==3&&p.t===t;}
const snap=st=>st.board.map(row=>row.map(p=>p?{...p}:null));
const iceSnap=st=>st.ice.map(r=>r.slice());

function findGroups(st){
 const {rows:R,cols:C,board:B}=st,runs=[];
 for(let r=0;r<R;r++){let c=0;while(c<C){const p=B[r][c];if(!p||p.s===3){c++;continue;}let e=c+1;while(e<C&&same(st,r,e,p.t))e++;if(e-c>=3)runs.push({dir:'h',cells:[...Array(e-c)].map((_,i)=>[r,c+i]),t:p.t});c=e;}}
 for(let c=0;c<C;c++){let r=0;while(r<R){const p=B[r][c];if(!p||p.s===3){r++;continue;}let e=r+1;while(e<R&&same(st,e,c,p.t))e++;if(e-r>=3)runs.push({dir:'v',cells:[...Array(e-r)].map((_,i)=>[r+i,c]),t:p.t});r=e;}}
 // Kesişen koşuları (L/T) tek grupta birleştir.
 const groups=[];
 for(const run of runs){
  const hit=groups.filter(g=>g.t===run.t&&run.cells.some(([r,c])=>g.keys.has(r*99+c)));
  let g;if(hit.length){g=hit[0];for(const o of hit.slice(1)){o.runs.forEach(x=>g.runs.push(x));o.keys.forEach(k=>g.keys.add(k));groups.splice(groups.indexOf(o),1);}}
  else{g={t:run.t,runs:[],keys:new Set()};groups.push(g);}
  g.runs.push(run);run.cells.forEach(([r,c])=>g.keys.add(r*99+c));
 }
 return groups.map(g=>{const longest=Math.max(...g.runs.map(x=>x.cells.length));const cross=g.runs.some(x=>x.dir==='h')&&g.runs.some(x=>x.dir==='v');
  return {t:g.t,cells:[...g.keys].map(k=>[Math.floor(k/99),k%99]),longest,cross,dir:g.runs.find(x=>x.cells.length===longest).dir,runs:g.runs};});
}

/* Temizleme: özel parçalar zincirleme patlar. Zincirli parça yalnızca zincirini kaybeder. */
function blast(st,start,opts={}){
 const {rows:R,cols:C,board:B}=st,clear=new Map(),queue=[...start],fx=[];
 const add=(r,c,why)=>{if(r<0||c<0||r>=R||c>=C)return;const k=r*99+c;if(clear.has(k))return;const p=B[r][c];if(!p)return;clear.set(k,{r,c,p,why});queue.push([r,c]);};
 for(const [r,c] of start){const k=r*99+c;if(B[r][c]&&!clear.has(k))clear.set(k,{r,c,p:B[r][c],why:'match'});}
 while(queue.length){const [r,c]=queue.shift();const p=B[r][c];if(!p||opts.keep?.has(r*99+c))continue;
  if(p.s===1){fx.push({kind:'row',r,c});for(let x=0;x<C;x++)add(r,x,'row');}
  else if(p.s===2){fx.push({kind:'col',r,c});for(let y=0;y<R;y++)add(y,c,'col');}
  else if(p.s===3){const t=opts.bombType??mostCommon(st);fx.push({kind:'color',r,c,t});for(let y=0;y<R;y++)for(let x=0;x<C;x++)if(B[y][x]&&B[y][x].t===t)add(y,x,'color');}
 }
 return {clear:[...clear.values()],fx};
}
function mostCommon(st){const n=Array(st.types).fill(0);st.board.flat().forEach(p=>{if(p&&p.t>=0)n[p.t]++;});return n.indexOf(Math.max(...n));}

function applyClear(st,clear,created,gain){
 const out=[];
 for(const x of clear){
  const p=st.board[x.r][x.c];if(!p)continue;
  if(created.some(cr=>cr.r===x.r&&cr.c===x.c))continue;
  if(p.lock&&x.why==='match'){p.lock=false;goal(st,'lock',1);out.push({...x,unlocked:true});continue;}
  if(p.lock){p.lock=false;goal(st,'lock',1);}
  if(st.ice[x.r][x.c]>0){st.ice[x.r][x.c]--;goal(st,'ice',1);x.ice=true;}
  if(p.t>=0)goal(st,p.t,1);
  if(x.why!=='match')gain.v+=SPECIAL_CELL;
  st.board[x.r][x.c]=null;out.push(x);
 }
 for(const cr of created){
  const old=st.board[cr.r][cr.c];
  if(st.ice[cr.r][cr.c]>0){st.ice[cr.r][cr.c]--;goal(st,'ice',1);}
  if(old&&old.t>=0)goal(st,old.t,1);
  st.board[cr.r][cr.c]={...piece(st,cr.t,cr.s)};cr.id=st.board[cr.r][cr.c].id;
 }
 return out;
}
function goal(st,type,n){const g=st.goals.find(g=>g.type===type);if(g)g.have=Math.min(g.need,g.have+n);}
const goalsDone=st=>st.goals.every(g=>g.have>=g.need);

function gravity(st){
 const {rows:R,cols:C,board:B}=st,moved=[],spawned=[];
 for(let c=0;c<C;c++){
  let w=R-1;
  for(let r=R-1;r>=0;r--){const p=B[r][c];if(p){if(w!==r){B[w][c]=p;B[r][c]=null;moved.push({id:p.id,from:r,to:w,c});}w--;}}
  for(let r=w,k=1;r>=0;r--,k++){const p=piece(st,randType(st));B[r][c]=p;spawned.push({id:p.id,r,c,drop:w+1});}
 }
 return {moved,spawned};
}

function resolve(st,steps,swapCells=[],firstBlast=null){
 let combo=0;
 while(true){
  let groups=firstBlast?[]:findGroups(st);
  if(!groups.length&&!firstBlast)break;
  combo++;const gain={v:0};const created=[];const starts=[];let matchScore=0;const matched=[];
  if(firstBlast){starts.push(...firstBlast.cells);gain.v+=firstBlast.score||0;}
  for(const g of groups){
   const size=g.cells.length;
   const base=g.longest>=5?SCORE[5]:(g.longest===4||g.cross)?SCORE[4]:SCORE[3];
   matchScore+=base;matched.push({t:g.t,size,cells:g.cells,base});
   if(g.longest>=5)st.stats.m5++;else if(g.longest===4||g.cross)st.stats.m4++;else st.stats.m3++;
   let spot=g.cells.find(([r,c])=>swapCells.some(([a,b])=>a===r&&b===c))||g.runs.find(x=>x.cells.length===g.longest).cells[Math.floor(g.longest/2)];
   if(g.longest>=5)created.push({r:spot[0],c:spot[1],t:-1,s:3});
   else if(g.longest===4||g.cross)created.push({r:spot[0],c:spot[1],t:g.t,s:g.cross?(g.dir==='h'?2:1):(g.dir==='h'?2:1)});
   starts.push(...g.cells);
  }
  // Oluşacak özel parçanın yerindeki eski özel parça önce patlasın diye 'keep' kullanılmaz; yeni parça temizlikten sonra yazılır.
  const b=blast(st,starts,{bombType:firstBlast?.bombType});
  if(b.fx.length)st.stats.specials+=b.fx.length;
  const cleared=applyClear(st,b.clear,created,gain);
  const mult=Math.min(combo,8);
  let total=(matchScore+gain.v)*mult;
  if(combo===5)total+=COMBO_BONUS;
  st.score+=total;st.combo=combo;st.maxCombo=Math.max(st.maxCombo,combo);
  steps.push({kind:'clear',cleared,created:created.map(c=>({...c})),fx:b.fx,matched,gain:total,combo,board:snap(st),ice:iceSnap(st),goals:st.goals.map(g=>({...g})),score:st.score});
  const g=gravity(st);
  steps.push({kind:'fall',...g,board:snap(st),ice:iceSnap(st)});
  firstBlast=null;swapCells=[];
 }
 return combo;
}

function adjacent(a,b){return Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])===1;}
function canSwap(st,a,b){const p=st.board[a[0]]?.[a[1]],q=st.board[b[0]]?.[b[1]];return !!p&&!!q&&!p.lock&&!q.lock&&adjacent(a,b);}
function doSwap(st,a,b){const B=st.board;[B[a[0]][a[1]],B[b[0]][b[1]]]=[B[b[0]][b[1]],B[a[0]][a[1]]];}

/* Özel + özel birleşimleri: bomba+bomba tüm tahta; bomba+şerit = o renkteki tüm şekerler şerit olur; şerit+şerit = artı. */
function specialSwap(st,a,b){
 const p=st.board[a[0]][a[1]],q=st.board[b[0]][b[1]];
 if(p.s===3&&q.s===3){const cells=[];for(let r=0;r<st.rows;r++)for(let c=0;c<st.cols;c++)cells.push([r,c]);p.s=0;q.s=0;p.t=0;q.t=0;return {cells,score:2000,label:'board'};}
 if(p.s===3||q.s===3){const bomb=p.s===3?p:q,other=p.s===3?q:p,bp=p.s===3?a:b;
  const t=other.t;bomb.s=0;bomb.t=t;const cells=[bp];
  for(let r=0;r<st.rows;r++)for(let c=0;c<st.cols;c++){const x=st.board[r][c];if(x&&x.t===t&&x!==bomb){if(other.s===1||other.s===2){x.s=st.rng()<.5?1:2;}cells.push([r,c]);}}
  return {cells,score:other.s?800:300,bombType:t,label:'color'};}
 if(p.s&&q.s&&p.s<3&&q.s<3){p.s=1;q.s=2;return {cells:[a,b],score:300,label:'cross'};}
 return null;
}

function trySwap(st,a,b,{free=false}={}){
 if(!canSwap(st,a,b))return {ok:false,steps:[]};
 doSwap(st,a,b);
 const steps=[{kind:'swap',a,b,board:snap(st),ice:iceSnap(st)}];
 const special=specialSwap(st,b,a);
 if(!special&&!findGroups(st).length){doSwap(st,a,b);steps.push({kind:'swapback',a,b,board:snap(st),ice:iceSnap(st)});return {ok:false,steps};}
 if(!free){st.moves--;st.movesUsed++;}
 resolve(st,steps,[a,b],special);
 after(st,steps);
 return {ok:true,steps};
}
function after(st,steps){if(!goalsDone(st)&&!findMove(st)){shuffle(st);steps.push({kind:'shuffle',board:snap(st),ice:iceSnap(st)});}}

function findMove(st){
 const {rows:R,cols:C,board:B}=st;
 for(let r=0;r<R;r++)for(let c=0;c<C;c++)for(const [dr,dc] of [[0,1],[1,0]]){
  const a=[r,c],b=[r+dr,c+dc];if(b[0]>=R||b[1]>=C||!canSwap(st,a,b))continue;
  if(B[r][c].s===3||B[b[0]][b[1]].s===3)return [a,b];
  if(B[r][c].s&&B[b[0]][b[1]].s)return [a,b];
  doSwap(st,a,b);const ok=findGroups(st).length>0;doSwap(st,a,b);if(ok)return [a,b];
 }
 return null;
}
function shuffle(st){
 for(let tries=0;tries<60;tries++){
  const free=[];for(let r=0;r<st.rows;r++)for(let c=0;c<st.cols;c++)if(st.board[r][c]&&!st.board[r][c].lock)free.push([r,c]);
  const pieces=free.map(([r,c])=>st.board[r][c]);
  for(let i=pieces.length-1;i>0;i--){const j=Math.floor(st.rng()*(i+1));[pieces[i],pieces[j]]=[pieces[j],pieces[i]];}
  free.forEach(([r,c],i)=>st.board[r][c]=pieces[i]);
  if(!findGroups(st).length&&findMove(st))return;
 }
 // Çok nadir: tahtayı baştan diz (özel parçalar korunmaz).
 const locks=[];st.board.forEach((row,r)=>row.forEach((p,c)=>{if(p?.lock)locks.push([r,c]);}));fillNoMatch(st);locks.forEach(([r,c])=>st.board[r][c].lock=true);ensureMove(st);
}
function ensureMove(st){let n=0;while(!findMove(st)&&n++<40){fillNoMatch(st);}}

/* Güçlendiriciler (hamle harcamaz). */
function boosterRow(st,r){const steps=[];const cells=[];for(let c=0;c<st.cols;c++)cells.push([r,c]);resolve(st,steps,[],{cells,score:300});after(st,steps);return steps;}
function boosterColor(st,r,c){const p=st.board[r][c];if(!p)return [];const t=p.t>=0?p.t:mostCommon(st);const cells=[];for(let y=0;y<st.rows;y++)for(let x=0;x<st.cols;x++)if(st.board[y][x]?.t===t||(y===r&&x===c))cells.push([y,x]);const steps=[];resolve(st,steps,[],{cells,score:400,bombType:t});after(st,steps);return steps;}
function boosterShuffle(st){shuffle(st);return [{kind:'shuffle',board:snap(st),ice:iceSnap(st)}];}
function boosterSwap(st,a,b){
 if(!adjacent(a,b)||!st.board[a[0]][a[1]]||!st.board[b[0]][b[1]])return {ok:false,steps:[]};
 const pa=st.board[a[0]][a[1]],pb=st.board[b[0]][b[1]];const la=pa.lock,lb=pb.lock;pa.lock=false;pb.lock=false;
 doSwap(st,a,b);const steps=[{kind:'swap',a,b,board:snap(st),ice:iceSnap(st)}];
 pa.lock=la;pb.lock=lb;
 const special=specialSwap(st,b,a);
 resolve(st,steps,[a,b],special);after(st,steps);return {ok:true,steps};
}

/* Bölüm kazanılınca: kalan her hamle rastgele bir şekeri şeride çevirir, sonra hepsi patlar ("Büyü Yağmuru"). */
function bonus(st){
 const steps=[];const n=Math.min(st.moves,15);const marked=[];
 for(let i=0;i<n;i++){
  const cand=[];st.board.forEach((row,r)=>row.forEach((p,c)=>{if(p&&!p.s&&!p.lock)cand.push([r,c]);}));
  if(!cand.length)break;const [r,c]=cand[Math.floor(st.rng()*cand.length)];st.board[r][c].s=st.rng()<.5?1:2;marked.push([r,c]);
  st.score+=150;st.moves--;
 }
 if(marked.length)steps.push({kind:'magic',cells:marked,board:snap(st),ice:iceSnap(st),score:st.score});
 st.moves=Math.max(0,st.moves);
 // Tahtadaki tüm özel parçalar patlar.
 for(let guard=0;guard<6;guard++){
  const cells=[];st.board.forEach((row,r)=>row.forEach((p,c)=>{if(p&&p.s)cells.push([r,c]);}));
  if(!cells.length)break;resolve(st,steps,[],{cells,score:0});
 }
 return steps;
}
function stars(st){const s=st.cfg.stars;return st.score>=s[2]?3:st.score>=s[1]?2:st.score>=s[0]?1:0;}

const api={mulberry,starScore,levelConfig,create,trySwap,findMove,findGroups,shuffle,boosterRow,boosterColor,boosterShuffle,boosterSwap,bonus,stars,goalsDone,canSwap,adjacent,snap};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.dmPwmCore=api;
})(typeof window!=='undefined'?window:globalThis);
