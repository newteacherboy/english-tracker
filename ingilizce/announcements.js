/* One authenticated popup inbox for learners and teachers. */
(()=>{'use strict';
const nativeShow=window.duyuruGoster;
if(typeof nativeShow!=='function')return;
const overlay=()=>document.getElementById('duyuruOverlay');
function account(){
 if(window.dmTeacherPortalMode)return window.dmTeacherPortalSession?.teacherToken||'';
 const learner=localStorage.getItem('ing_token');
 if(learner&&localStorage.getItem('ing_oturumAcik')==='true')return learner;
 return sessionStorage.getItem('ing_ogr_token')||'';
}
const ready=()=>!!document.querySelector('#tpTeacherHome.is-visible,#tpDashboard.is-visible')||document.getElementById('panel-alani')?.style.display==='block';
let nextShowAt=0;
let owner='',since=Date.now(),lastPoll=0,loading=false,shown=null,elapsed=0,clock=Date.now(),queue=[],seen=new Set(),receipts=new Set();
async function request(op,t,data={}){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{const r=await fetch(apiURL,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({islem:op,t,...data})});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.mesaj||'Duyuru alınamadı.');return d;}finally{clearTimeout(timeout);}
}
function reset(){owner=account();since=Date.now();nextShowAt=since+3500;lastPoll=0;loading=false;shown=null;elapsed=0;queue=[];seen=new Set();receipts=new Set();const el=overlay();if(el){el.style.display='none';el.classList.remove('dm-papi-held');delete el.dataset.teacherAdminAnnouncement;}}
async function saveReceipts(t){for(const id of [...receipts]){if(t!==account()||t!==owner)return;try{await request('announcementRead',t,{id});if(t===owner)receipts.delete(id);}catch{return;}}}
function present(d,t){
 if(t!==owner||t!==account()||seen.has(d.id)||shown||!ready()||document.hidden||Date.now()<nextShowAt)return;
 if(window.dmPapiNotices?.defer('announcement:'+d.id,()=>present(d,t)))return;
 const el=overlay();if(!el)return;
 // Teacher shell suppresses learner promotions, but allows these real-account notices.
 el.dataset.teacherAdminAnnouncement='true';nativeShow(d);window.dmNoticeSurface?.adopt(el);
 if(el.style.display!=='flex')return;
 shown=d;elapsed=0;clock=Date.now();seen.add(d.id);queue=queue.filter(x=>x.id!==d.id);
}
window.duyuruGoster=d=>{if(d?.id)present(d,owner);};
window.duyuruKapat=()=>{
 if(!shown)return;
 const id=shown.id,t=owner;shown=null;overlay().style.display='none';overlay().classList.remove('dm-papi-held');
 receipts.add(id);void saveReceipts(t);nextShowAt=Date.now()+3000;lastPoll=0;since=Date.now()-500;
};
async function poll(){
 if(owner!==account())reset();
 const t=owner;if(!t||!ready()||document.hidden||loading||Date.now()-since<3500||lastPoll)return;   /* [28 Eki 2026] duyuru kutusu yalnız uygulama açılışında (ve bir duyuru kapatılınca) sorulur */
 loading=true;lastPoll=Date.now();
 try{await saveReceipts(t);const d=await request('announcementInbox',t);if(t!==owner||t!==account())return;queue=(d.liste||[]).filter(x=>!seen.has(x.id));}catch(e){console.warn('[Duyurular]',e.message);}finally{if(t===owner)loading=false;}
}
window.duyuruKontrolEt=poll;
window.dmAnnouncements={check:poll};
setInterval(()=>{
 const now=Date.now(),delta=Math.min(1000,now-clock);clock=now;
 if(owner!==account())reset();
 if(shown){const el=overlay();if(window.dmNoticeSurface?window.dmNoticeSurface.isVisible(el):!document.hidden&&!el?.classList.contains('dm-papi-held')&&el?.style.display==='flex'&&!window.dmPapiNotices?.inActivity()){elapsed+=delta;window.dmNoticeSurface?.progress(el,1-elapsed/10000);if(elapsed>=10000)window.duyuruKapat();}}
 else if(queue.length)present(queue[0],owner);
 void poll();
},500);
document.addEventListener('dm:login',reset);
document.addEventListener('visibilitychange',()=>{clock=Date.now();if(!document.hidden)void poll();});
reset();
})();
