// Premium Kelime Eşleştirme çekirdeği: seviye tasarımı, eşleşme kuralları ve sunucu yıldız eşiği uyumu.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const core=require('../ingilizce/premium-word-match-core.js');
const moves=st=>{const out=[];for(let r=0;r<st.rows;r++)for(let c=0;c<st.cols;c++)for(const [dr,dc] of [[0,1],[1,0]]){const a=[r,c],b=[r+dr,c+dc];if(b[0]<st.rows&&b[1]<st.cols&&core.canSwap(st,a,b))out.push([a,b]);}return out;};

test('100 bölümün hepsi geçerli ve oynanabilir başlar',()=>{
 for(let L=1;L<=100;L++){const cfg=core.levelConfig(L);
  assert(cfg.types>=5&&cfg.types<=7);assert(cfg.moves>=22&&cfg.moves<=27);assert(cfg.goals.length>=1&&cfg.goals.length<=3);
  assert(!(cfg.ice.length&&cfg.locks.length),'buz ve zincir aynı bölümde olmamalı: '+L);
  const st=core.create(cfg,L*13);
  assert.equal(core.findGroups(st).length,0,'başlangıçta hazır eşleşme olmamalı: '+L);
  assert(core.findMove(st),'en az bir hamle olmalı: '+L);
 }
});

test('eşleşmeyen hamle geri alınır ve hamle düşmez',()=>{
 const st=core.create(core.levelConfig(5),99);const before=st.moves;
 let bad=null;for(const [a,b] of moves(st)){const c=structuredClone({...st,rng:null});c.rng=Math.random;c.cfg=st.cfg;if(!core.trySwap(c,a,b).ok){bad=[a,b];break;}}
 assert(bad);const snap=JSON.stringify(st.board);const r=core.trySwap(st,...bad);
 assert.equal(r.ok,false);assert.equal(st.moves,before);assert.equal(JSON.stringify(st.board),snap);
});

test('oynanan bölümler tutarlı kalır: tahta dolu, puan artar, hedefler aşılmaz',()=>{
 for(const L of [1,12,33,51,77,100]){const st=core.create(core.levelConfig(L),L);let last=0;
  for(let i=0;i<40&&st.moves>0&&!core.goalsDone(st);i++){const m=core.findMove(st);assert(m);core.trySwap(st,m[0],m[1]);
   assert(st.board.flat().every(Boolean),'boş hücre kalmamalı');assert(st.score>=last);last=st.score;
   st.goals.forEach(g=>assert(g.have<=g.need));}
  if(core.goalsDone(st)){const s=st.score;core.bonus(st);assert(st.score>=s);assert(st.board.flat().every(Boolean));}
 }
});

test('4 ve 5 eşleşme özel şeker üretir, güçlendiriciler hamle harcamaz',()=>{
 const st=core.create(core.levelConfig(1),7);const B=st.board;
 for(let r=0;r<7;r++)for(let c=0;c<7;c++){B[r][c].t=(r*3+c*2)%5;B[r][c].s=0;}
 [0,1,3].forEach(c=>B[6][c].t=4);B[5][2].t=4;B[6][2].t=1;B[6][4].t=1;B[6][5].t=2;
 assert(core.findGroups(st).length===0);
 const r=core.trySwap(st,[5,2],[6,2]);assert(r.ok);
 assert(r.steps.find(s=>s.kind==='clear').created.some(c=>c.s===1||c.s===2),'4 eşleşme şeritli şeker vermeli');
 const m=st.moves;core.boosterRow(st,3);core.boosterColor(st,2,2);core.boosterShuffle(st);assert.equal(st.moves,m);
});

test('yıldız eşikleri sunucu fonksiyonuyla aynı',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261103193000_premium_word_match_v2.sql'),'utf8');
 assert.match(sql,/when least\(100,greatest\(1,level_no\)\)<=4 then 8000 when least\(100,greatest\(1,level_no\)\)<=49 then 6500 else 5500 end\)\s*\+ least\(100,greatest\(1,level_no\)\)\*20\) \* \(array\[0\.5,1\.0,1\.3\]\)/);
 const sqlStar=(L,s)=>Math.floor(((L<=4?8000:L<=49?6500:5500)+L*20)*[0.5,1.0,1.3][s-1]);
 for(let L=1;L<=100;L++)for(let s=1;s<=3;s++)assert.equal(core.starScore(L,s),sqlStar(L,s));
 assert.match(sql,/x:=round\(172\*mult\); g:=round\(35\*mult\)/,'3 yıldız ödülü 172 XP + 35 altın');
});
