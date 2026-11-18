const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {milestones,school,learning,mapMarkup}=require('../ingilizce/parkur-badges');
const steps=(count,grade=1)=>Array.from({length:count},(_,i)=>({grade,no:grade*1000+i,id:'chapter-'+i,done:true}));
test('all 132 approved figures have distinct cells in packaged artwork',()=>{
 const catalog=[...school,...learning];
 assert.equal(school.length,76);
 assert.equal(learning.length,56);
 assert.equal(new Set(catalog.map(x=>[x.src,x.row,x.col].join(':'))).size,132);
 for(const art of catalog)assert(fs.existsSync(path.join(__dirname,'../ingilizce',art.src)));
});
test('five completed stops earn the milestone, school classes restart the count, and the art cycles',()=>{
 const first=steps(9),second=steps(5,2);
 first[1].done=false;
 const result=milestones([...first,...second],'school');
 assert.deepEqual([...result.keys()],[4,13]);
 assert.equal(result.get(4).earned,false);
 assert.equal(result.get(4).passed,4);
 assert.equal(result.get(13).earned,true);
 assert.equal(result.get(13).label,'2. Sınıf · 5. Durak');
 assert.equal(result.get(13).art,school[1]);
 const long=milestones(steps(285),'learning');
 assert.equal(long.size,57);
 assert.equal(long.get(284).art,long.get(4).art);
 assert.notEqual(long.get(284).id,long.get(4).id);
 assert.match(mapMarkup(result.get(4),30,false),/4\/5 durak/);
 assert.match(mapMarkup(result.get(13),30,true),/is-earned is-new/);
});
test('map badge buttons describe both states and open a set-specific milestone',()=>{
 const rows=steps(10);
 rows[0].done=false;
 const [locked,earned]=milestones(rows,'school').values();
 const {badgeStatus}=require('../ingilizce/parkur-badges');
 assert.match(mapMarkup(locked,100,false),/<button type="button".*data-badge-index="4".*aria-haspopup="dialog"/);
 assert.equal(badgeStatus(locked),'1–5. durakları tamamlayınca açılır. 4/5 durak tamamlandı.');
 assert.equal(locked.art.set,'İlk Maceralar');
 assert.match(locked.art.cheer,/keşif/);
 assert.match(badgeStatus(earned),/Bu rozeti kazandın!/);
 const data=fs.readFileSync(path.join(__dirname,'../ingilizce',locked.art.src));
 assert.equal(data.toString('ascii',12,16),'VP8X');
 assert.equal(data.readUIntLE(24,3)+1,locked.art.cols*256);
 assert.equal(data.readUIntLE(27,3)+1,locked.art.rows*256);
});

test('three repaired Papi badges use complete standalone art and preserve all other sprite positions',()=>{
 const repaired=[
  [school[6],'bahcivan-papi.png','Bahçıvan Papi'],
  [school[14],'kaptan-papi.png','Kaptan Papi'],
  [learning[1],'gokyuzu-pilotu-papi.png','Gökyüzü Pilotu']
 ];
 for(const [art,file,name] of repaired){
  assert.equal(art.name,name);
  assert.equal(art.src,'parkur-badges/v3/'+file);
  assert.equal(art.cols,1);
  assert.equal(art.rows,1);
  assert.equal(art.cell,512);
  const png=fs.readFileSync(path.join(__dirname,'../ingilizce',art.src));
  assert.equal(png.toString('ascii',1,4),'PNG');
  assert.equal(png.readUInt32BE(16),512);
  assert.equal(png.readUInt32BE(20),512);
 }
 assert.match(mapMarkup({art:school[14],earned:false,passed:0,first:20,label:'7. Sınıf · 25. Durak'},20,false),/background-size:100% 100%/);
 assert.doesNotMatch(mapMarkup({art:school[14],earned:false,passed:0,first:20,label:'7. Sınıf · 25. Durak'},20,false),/NaN/);
 assert.equal(school[5].src,'parkur-badges/v2/school-02.webp');
 assert.equal(learning[0].src,'parkur-badges/v2/papi-01.webp');
});

test('automatic badge celebration is shown once per account and milestone, also after reload',()=>{
 const vm=require('node:vm'), receipts=new Map();
 const source=fs.readFileSync(path.join(__dirname,'../ingilizce/parkur-badges.js'),'utf8');
 const earned=milestones(steps(10),'school');
 function fixture(owner){
  const timers=new Map(),events={},dialogs=[];let serial=0;
  const doc={hidden:false,activeElement:null,querySelector:()=>({}),querySelectorAll:()=>[],
   addEventListener:(name,fn)=>{events[name]=fn;},
   createElement:()=>{const button={focus(){}};return {querySelector:()=>button,remove(){},button};},
   body:{append:el=>dialogs.push(el)}};
  const c={aktifOgrenciAdi:owner,document:doc,localStorage:{getItem:k=>receipts.get(k)||null,setItem:(k,v)=>receipts.set(k,v)},
   setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id)};
  vm.createContext(c);vm.runInContext(source,c);
  return {c,events,dialogs,flush(){const work=[...timers.values()];timers.clear();work.forEach(fn=>fn());}};
 }
 const badge=earned.get(4),next=earned.get(9),a=fixture('Ada');
 a.c.dmRouteBadges.celebrate(badge);a.c.dmRouteBadges.celebrate(badge);a.flush();
 assert.equal(a.dialogs.length,1);assert.match(a.dialogs[0].innerHTML,/Rozet kazandın!/);
 a.dialogs[0].button.onclick();a.events['dm:login']();a.c.dmRouteBadges.celebrate(badge);a.flush();assert.equal(a.dialogs.length,1);
 const reload=fixture('Ada');reload.c.dmRouteBadges.celebrate(badge);reload.flush();assert.equal(reload.dialogs.length,0);
 reload.c.dmRouteBadges.inspect(badge);assert.equal(reload.dialogs.length,1);assert.match(reload.dialogs[0].innerHTML,/Kazanılan rozet/);
 reload.dialogs[0].button.onclick();reload.c.dmRouteBadges.celebrate(next);reload.flush();assert.equal(reload.dialogs.length,2);
 const other=fixture('Ece');other.c.dmRouteBadges.celebrate(badge);other.flush();assert.equal(other.dialogs.length,1);
});
