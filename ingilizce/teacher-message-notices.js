/* Teacher-code sessions use the teacher token, never the selected pupil token. */
(()=>{'use strict';
 let busy=false,lastToken='',lastCheck=0;
 const endpoint='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
 function token(){if(window.dmTeacherPortalMode){try{return JSON.parse(sessionStorage.getItem('dm_tp_session')||'null')?.teacherToken||'';}catch{return '';}}return sessionStorage.getItem('ing_ogr_token')||'';}
 function show(d,key){
  const shade=document.createElement('div');shade.id='dmTeacherMessageNotice';shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');shade.setAttribute('aria-labelledby','dmTeacherMessageTitle');
  shade.style.cssText='position:fixed;inset:0;z-index:2147482000;background:#10244999;display:flex;align-items:center;justify-content:center;padding:18px';
  const card=document.createElement('section');card.style.cssText='width:min(440px,100%);max-height:85dvh;overflow:auto;background:white;color:#17334d;border-radius:24px;padding:24px;box-sizing:border-box;overflow-wrap:anywhere';
  const title=document.createElement('h2');title.id='dmTeacherMessageTitle';title.textContent='💬 Öğrencilerinden mesaj var';
  const list=document.createElement('p');list.style.whiteSpace='pre-line';list.textContent=d.messageSenders.slice(0,8).map(x=>x.student+' · '+x.count+' okunmamış mesaj').join('\n')+(d.messageSenders.length>8?'\nve '+(d.messageSenders.length-8)+' öğrenci daha…':'');
  const before=document.activeElement,close=()=>{shade.remove();before?.focus?.();};
  const open=document.createElement('button');open.type='button';open.textContent='Mesajları Aç';open.style.cssText='display:block;width:100%;padding:14px;border:0;border-radius:14px;background:#176cd6;color:white;font-weight:800;font-size:16px';
  open.onclick=()=>{close();if(window.dmTeacherPortalMode)window.dmTeacherPortal?.openMessages?.();else window.ogretmenMenuSohbetAc?.();};
  const later=document.createElement('button');later.type='button';later.textContent='Daha sonra';later.style.cssText='display:block;width:100%;padding:12px;margin-top:8px;border:0;background:transparent;color:#36516b;font-size:15px';later.onclick=close;
  card.append(title,list,open,later);shade.append(card);shade.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){e.preventDefault();(document.activeElement===open?later:open).focus();}});document.body.append(shade);sessionStorage.setItem(key,JSON.stringify(d.messageSenders));open.focus();
 }
 async function check(){
  const t=token();if(!t||busy||document.hidden||window.dmPapiNotices?.inActivity?.()||document.getElementById('dmTeacherMessageNotice'))return;
  if(t===lastToken&&Date.now()-lastCheck<110000)return;lastToken=t;lastCheck=Date.now();busy=true;
  try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({islem:'teacherNotificationSummary',t}),signal:AbortSignal.timeout(10000)});if(!r.ok)return;const d=await r.json();if(t!==token()||!d.ok||!d.messageSenders?.length)return;
   const key='dm_teacher_message_notice:'+d.teacherId;if(sessionStorage.getItem(key)!==JSON.stringify(d.messageSenders))show(d,key);
  }catch{}finally{busy=false;}
 }
 document.addEventListener('dm:login',check);document.addEventListener('visibilitychange',check);setTimeout(check,2500);setInterval(check,120000);
})();
