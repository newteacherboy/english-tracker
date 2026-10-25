const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(teacher=false){let now=100000,interval;const calls=[],listeners={},classes=new Set(),el={style:{display:'none'},dataset:{},classList:{contains:x=>classes.has(x),remove:x=>classes.delete(x)}};const local=new Map([['ing_token','student-token'],['ing_oturumAcik','true']]);
 const c={console,Date:class extends Date{static now(){return now}},AbortController,setTimeout:()=>1,clearTimeout(){},setInterval:f=>interval=f,apiURL:'https://example.test/api',localStorage:{getItem:k=>local.get(k)},sessionStorage:{getItem:()=>null},document:{hidden:false,getElementById:id=>id==='duyuruOverlay'?el:{style:{display:'block'}},querySelector:()=>teacher?{}:null,addEventListener:(n,f)=>listeners[n]=f},duyuruGoster:d=>{el.style.display='flex';calls.push({show:d.id})},dmTeacherPortalMode:teacher,dmTeacherPortalSession:{teacherToken:'teacher-token'},dmPapiNotices:{defer:()=>false,inActivity:()=>false},fetch:async(_url,opt)=>{const b=JSON.parse(opt.body);calls.push(b);return {ok:true,json:async()=>b.islem==='announcementInbox'?{ok:true,liste:[{id:'first',baslik:'Test'}]}:{ok:true}}}};c.window=c;vm.runInNewContext(fs.readFileSync('ingilizce/announcements.js','utf8'),c);return {c,el,calls,local,classes,async tick(ms=500){now+=ms;interval();await new Promise(r=>setImmediate(r));}};}
test('teacher popup uses teacher token, starts after 3.5 seconds and acknowledges its own account',async()=>{
 const f=fixture(true);await f.tick(3000);assert.equal(f.calls.length,0);await f.tick(500);await f.tick();
 assert.equal(f.calls[0].t,'teacher-token');assert.equal(f.el.dataset.teacherAdminAnnouncement,'true');assert.equal(f.el.style.display,'flex');
 f.c.duyuruKapat();await f.tick();assert.equal(f.calls.find(x=>x.islem==='announcementRead').t,'teacher-token');
});
test('an unread popup is queued through activity and hidden time never consumes its ten seconds',async()=>{
 const f=fixture();let blocked=true;f.c.dmPapiNotices.defer=()=>blocked;await f.tick(3500);await f.tick();assert.equal(f.el.style.display,'none');assert(!f.calls.some(x=>x.islem==='announcementRead'));
 blocked=false;await f.tick();assert.equal(f.el.style.display,'flex');f.c.document.hidden=true;for(let i=0;i<25;i++)await f.tick();assert.equal(f.el.style.display,'flex');
 f.c.document.hidden=false;for(let i=0;i<20;i++)await f.tick();assert.equal(f.el.style.display,'none');assert(f.calls.some(x=>x.islem==='announcementRead'));
});
test('account switch discards prior popup and cannot acknowledge for the next learner',async()=>{
 const f=fixture();await f.tick(3500);await f.tick();f.local.set('ing_token','next-token');await f.tick();assert.equal(f.el.style.display,'none');f.c.duyuruKapat();assert(!f.calls.some(x=>x.islem==='announcementRead'));await f.tick(3500);await f.tick();assert(f.calls.some(x=>x.islem==='announcementInbox'&&x.t==='next-token'));
});
