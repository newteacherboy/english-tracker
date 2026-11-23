const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const read=name=>fs.readFileSync('ingilizce/'+name,'utf8'),flush=()=>new Promise(r=>setTimeout(r,50));
test('previous parent sessions join the existing account list without overwriting the personal token',async()=>{
 const dom=new JSDOM('',{url:'https://app.test/ingilizce/',runScripts:'outside-only'}),w=dom.window;try{
 w.localStorage.setItem('ing_token','personal-token');w.localStorage.setItem('ing_aktifOgrenci','Öğrenci');w.apiURL='/api';w.fetch=async()=>({ok:true,json:async()=>({ok:true})});
 w.eval(read('parent-device-sessions.js'));w.dmSavedParents.remember({name:'Veli',email:'veli@example.invalid'},'parent-session-token');w.eval(read('saved-sessions.js'));
 assert(w.dmSavedSessions.list().some(s=>s.role==='veli'&&s.name==='Veli'));assert.equal(w.localStorage.getItem('ing_token'),'personal-token');
 await w.dmSavedSessions.remove(w.dmSavedSessions.list().find(s=>s.role==='veli'));assert(!w.dmSavedParents.list().length);assert.equal(w.localStorage.getItem('ing_token'),'personal-token');
 }finally{w.close();}
});
test('legacy parent sessions appear once; expired removal forgets only that parent session',async()=>{
 const dom=new JSDOM('',{url:'https://app.test/ingilizce/',runScripts:'outside-only'}),w=dom.window;try{
 w.localStorage.setItem('dm_parent_session_v1','legacy-parent-session');w.localStorage.setItem('ing_token','keep-student');w.fetch=async()=>({status:401,ok:false,json:async()=>({ok:false})});w.eval(read('parent-device-sessions.js'));
 assert.equal(w.dmSavedParents.list().length,1);await w.dmSavedParents.remove(w.dmSavedParents.list()[0]);assert.equal(w.localStorage.getItem('dm_parent_session_v1'),null);assert.equal(w.localStorage.getItem('ing_token'),'keep-student');
 }finally{w.close();}
});
test('profile strips sit above Account and Support; teacher strip requires an approved linked teacher',async()=>{
 const dom=new JSDOM('<div id="rtProfileBackdrop"><button class="rt-close">X</button><button class="au-account-entry">Hesap ve Destek</button></div>',{url:'https://app.test/ingilizce/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;try{
 w.localStorage.setItem('ing_token','personal');let teacher=false;w.dmTeacherSwitch={available:()=>teacher,open(){}};w.eval(read('parent-student-bridge.js'));await flush();
 assert(w.document.querySelector('[data-role-strip="parent"]'));assert(!w.document.querySelector('[data-role-strip="teacher"]'));teacher=true;w.document.dispatchEvent(new w.Event('dm:teacher-switch-ready'));await flush();
 const strips=w.document.querySelector('.dm-profile-role-strips');assert.equal(strips.nextElementSibling.className,'au-account-entry');assert.equal(strips.children[0].dataset.roleStrip,'teacher');assert.equal(strips.children[1].dataset.roleStrip,'parent');w.dmParentBridge.destroy();
 }finally{w.close();}
});
test('parent child registration opens even with a personal session and cancel safely returns to parent',async()=>{
 const dom=new JSDOM('<div id="login-container"><form id="loginForm"></form></div>',{url:'https://app.test/ingilizce/?kayit=1&veliCocuk=1',runScripts:'outside-only'}),w=dom.window;try{
 let target='';w.HTMLElement.prototype.scrollIntoView=()=>{};w.localStorage.setItem('ing_token','keep-student');w.localStorage.setItem('dm_parent_session_v1','parent-token');w.sessionStorage.setItem('dm_parent_child_signup',JSON.stringify({email:'p@example.invalid',at:Date.now()}));
 w.dmDiscoveryContext={raw:w.localStorage,session:w.sessionStorage,member:true,welcome:false,guest:false,navigate:url=>target=url,request:async()=>({})};w.eval(read('first-discovery.js'));await flush();
 assert.equal(w.dmFirstDiscovery.screen(),'register');w.document.querySelector('[data-action="parent-cancel"]').click();assert.equal(target,'veli-paneli.html');assert.equal(w.localStorage.getItem('ing_token'),'keep-student');assert.equal(w.localStorage.getItem('dm_parent_session_v1'),'parent-token');
 }finally{w.close();}
});
test('welcome renders the actual intro mascot and taps change its existing mood',async()=>{
 const dom=new JSDOM('<div id="login-container"><form id="loginForm"></form></div>',{url:'https://app.test/ingilizce/',runScripts:'outside-only'}),w=dom.window;try{
 const moods=[];w.HTMLElement.prototype.scrollIntoView=()=>{};w.dmPapiSplash={characterMarkup:()=>'<svg class="dm-papi-character-svg"><path/></svg>'};w.DMPapi={react:(_el,m)=>moods.push(m)};w.dmDiscoveryContext={raw:w.localStorage,session:w.sessionStorage,member:false,welcome:true,guest:false,request:async()=>({})};w.eval(read('first-discovery.js'));await flush();
 const papi=w.document.querySelector('[data-action="papi-react"]');assert(papi.querySelector('svg.dmp'));papi.click();papi.click();assert.deepEqual(moods,['sevinc','saskin']);assert.equal(papi.querySelector('[role="status"]').textContent,'Vay canına!');
 }finally{w.close();}
});
