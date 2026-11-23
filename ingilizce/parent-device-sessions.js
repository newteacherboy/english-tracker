/* Parent sessions join the existing device account picker; student tokens are never replaced here. */
(()=>{'use strict';
 const storage=window.dmTeacherDevice?.storage||localStorage;
 const KEY='dm_parent_saved_sessions_v1',ACTIVE='dm_parent_session_v1',API='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';
 function read(){try{return JSON.parse(storage.getItem(KEY)||'[]').filter(x=>x&&typeof x.token==='string'&&x.token.length>10&&typeof x.name==='string').slice(0,5);}catch{return [];}}
 function write(rows){storage.setItem(KEY,JSON.stringify(rows.slice(0,5)));}
 function remember(parent,token=storage.getItem(ACTIVE)){
  if(!parent?.email||!token)return;
  const email=parent.email.toLowerCase();write([{name:parent.name||'Veli hesabım',email,token,role:'veli'},...read().filter(x=>x.email!==email&&x.token!==token)]);
 }
 function list(){const rows=read(),token=storage.getItem(ACTIVE);if(token&&!rows.some(x=>x.token===token))rows.push({name:'Veli hesabım',email:'',token,role:'veli'});return rows;}
 function forget(token){write(read().filter(x=>x.token!==token));if(storage.getItem(ACTIVE)===token)storage.removeItem(ACTIVE);}
 async function request(islem,token,signal){const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({islem,parentToken:token})});const data=await r.json();if(!r.ok||data.ok===false)throw Object.assign(Error(data.mesaj||'Veli oturumu kontrol edilemedi.'),{expired:r.status===401||r.status===403,parent:true});return data;}
 async function activate(entry,{signal}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();
  try{const result=await request('parentMe',entry.token,controller.signal);if(controller.signal.aborted)throw Error('Geçiş iptal edildi.');window.dmSavedSessions?.remember();remember(result.parent,entry.token);storage.setItem(ACTIVE,entry.token);window.dmTeacherDevice?.personal();window.location.assign('veli-paneli.html');}
  catch(e){if(e.expired)forget(entry.token);throw e;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
 async function remove(entry){try{await request('parentLogout',entry.token);}catch(e){if(!e.expired)throw e;}forget(entry.token);}
 window.dmSavedParents={remember,list,forget,activate,remove};
})();
