/* Profil menüsü rozetleri: yalnız yapılması gereken ya da yeni bir şey varsa kırmızı nokta.
   - Profilim: veli telefonu veya e-postası eksik
   - Ödevlerim: bitmemiş ödev var
   - Seviye Testi: seviye testi hiç çözülmemiş
   - Kelime Tekrarı: tekrar zamanı gelen kelime var
   - Öğretmene Mesaj Gönder: son açılıştan sonra öğretmenden yeni mesaj gelmiş
   - Yardım & Destek: yardım sayfası güncellenmiş ve henüz açılmamış
   Diğer kartlarda rozet gösterilmez. */
(()=>{'use strict';
if(window.dmProfileBadges)return;
const API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
const who=()=>typeof aktifOgrenciAdi!=='undefined'?String(aktifOgrenciAdi||''):'';
const member=()=>{const n=who();return !!n&&n.toLowerCase()!=='teacher'&&!window.dmGuestMode;};
const store={get(k){try{return localStorage.getItem(k)||'';}catch{return '';}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
const key=name=>'dm_profile_seen_'+name+':'+who().toLowerCase();
const cache=new Map();
async function post(body){
 const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,ogrenci:who(),t:store.get('ing_token')})});
 return r.json();
}
async function cached(name,ttl,fn){const k=who()+'|'+name,hit=cache.get(k);if(hit&&Date.now()-hit.at<ttl)return hit.value;let value=null;try{value=await fn();}catch{value=hit?.value??null;}cache.set(k,{at:Date.now(),value});return value;}
const checks={
 profile:()=>cached('profile',300000,async()=>{const d=await post({islem:'kisiselBilgilerim'});if(!d||d.ok===false)return false;return !String(d.telefon||'').trim()||!String(d.email||'').trim();}),
 daily:()=>cached('homework',120000,async()=>{const r=await fetch(API+'?islem=odevlerim&ogrenci='+encodeURIComponent(who())+'&t='+encodeURIComponent(store.get('ing_token'))+'&_='+Date.now());const d=await r.json();return !!(d?.ok&&Array.isArray(d.liste)&&d.liste.some(o=>!o.yapildi));}),
 exam:async()=>{const s=window.dmProgression?.status?.();if(!s)return false;return !(s.studyPlacementLevel||s.startPath?.testLevel);},
 repeat:async()=>{const d=window.dmLearningCompanion?.reviewDue?.();return Number(d)>0;},
 coach:()=>cached('chat',120000,async()=>{const list=await post({islem:'sohbetGetir'});if(!Array.isArray(list))return false;const last=list.filter(m=>m.gonderen==='ogretmen').map(m=>Date.parse(m.tarih)||0).reduce((a,b)=>Math.max(a,b),0);return last>0&&last>(Number(store.get(key('coach')))||0);}),
 help:async()=>{const v=Number(window.DijiPapiGuide?.version)||0;return v>0&&v>(Number(store.get(key('help')))||0);}
};
function dot(button,on){if(!button)return;let d=button.querySelector(':scope>.dm-profile-dot');if(!on){d?.remove();return;}if(!d){d=document.createElement('span');d.className='dm-profile-dot';d.setAttribute('aria-hidden','true');button.append(d);}const label=button.querySelector('b')?.textContent||'';button.setAttribute('aria-label',label+' · yapılacak bir şey var');}
async function paint(){
 const root=document.getElementById('rtProfileBackdrop');if(!root||!member())return;const owner=who();
 await Promise.all(Object.entries(checks).map(async([name,fn])=>{let on=false;try{on=await fn();}catch{}if(owner!==who()||!root.isConnected)return;dot(root.querySelector('[data-profile="'+name+'"]'),!!on);}));
}
// Açılınca "görüldü" sayılan kartlar
document.addEventListener('click',e=>{const b=e.target.closest?.('#rtProfileBackdrop [data-profile]');if(!b||!member())return;const name=b.dataset.profile;
 if(name==='help')store.set(key('help'),String(Number(window.DijiPapiGuide?.version)||0));
 if(name==='coach'){store.set(key('coach'),String(Date.now()));cache.delete(who()+'|chat');}
 if(name==='profile')cache.delete(who()+'|profile');
 if(name==='daily')cache.delete(who()+'|homework');
},true);
if(!document.getElementById('dmProfileDotStyle')){const st=document.createElement('style');st.id='dmProfileDotStyle';st.textContent='#rtProfileBackdrop [data-profile]{position:relative}#rtProfileBackdrop .dm-profile-dot{position:absolute;top:8px;right:8px;width:12px;height:12px;border-radius:50%;background:#e5484d;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.2);pointer-events:none}';document.head.append(st);}
const open=window.dmProfileMenuAc;
if(typeof open==='function')window.dmProfileMenuAc=function(){const r=open.apply(this,arguments);requestAnimationFrame(()=>paint());return r;};
document.addEventListener('dm:login',()=>cache.clear());
window.dmProfileBadges={paint,checks};
})();
