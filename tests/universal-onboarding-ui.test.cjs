'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const read=name=>fs.readFileSync('ingilizce/'+name,'utf8'),flush=()=>new Promise(r=>setImmediate(r));
test('opening controls stay interactive until the welcome screen takes focus',async()=>{
 const dom=new JSDOM('<div id="dmBootSplash"><button>Devam Et</button></div><main></main>',{url:'https://app.test/ingilizce/',runScripts:'outside-only'});
 const {window:w}=dom,{document:d}=w;
 try{
  w.dmDiscoveryContext={raw:w.localStorage,session:w.sessionStorage,welcome:true};
  w.eval(read('first-discovery.js'));
  await flush();
  const splash=d.getElementById('dmBootSplash'),welcome=d.getElementById('dmDiscovery');
  assert(!splash.inert);
  assert(welcome.inert);
  assert(d.querySelector('main').inert);
  const proceed=splash.querySelector('button');
  proceed.focus();
  assert.equal(d.activeElement,proceed);
  proceed.addEventListener('click',()=>{splash.remove();d.dispatchEvent(new w.Event('dm:boot-ready'));});
  proceed.click();
  assert(!welcome.inert);
  assert.equal(d.activeElement,welcome.querySelector('h1'));
  assert.equal(welcome.querySelector('[data-action="begin"]').textContent,'Üye Ol');
 }finally{w.close();}
});
test('welcome separates registration and sign-in by role',async()=>{
 const f=await fixture(),{w}=f,d=w.document,navigated=[];
 w.dmDiscoveryContext.navigate=url=>navigated.push(url);
 try{
  f.click('back');
  const labels=()=>[...d.querySelectorAll('.fd-choice')].map(button=>button.textContent.trim());
  assert.deepEqual([...d.querySelectorAll('.fd-actions button')].map(button=>button.textContent.trim()),['Üye Ol','Hesabım Var']);
  f.click('login-roles');
  assert.deepEqual(labels(),['Öğrenci Girişi','Veli Girişi','Öğretmen Girişi']);
  f.click('parent-login');assert.equal(navigated.at(-1),'veli-paneli.html');
  f.click('back');f.click('begin');
  assert.deepEqual(labels(),['Öğrenciyim','Öğretmenim','Veliyim','Kendim için']);
  d.querySelector('[data-role="parent"]').click();assert.equal(navigated.at(-1),'veli-paneli.html?kayit=1');
  d.querySelector('[data-role="school"]').click();
  assert(d.querySelector('[data-field="ageBand"]'));
  assert(!d.querySelector('[data-field="parentAccount"]'));
  assert.equal(f.requests.length,0);
 }finally{w.close();}
});

async function fixture(options={}){const dom=new JSDOM('<div id="login-container"><form id="loginForm"></form></div>',{url:'https://app.test/ingilizce/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,requests=[];w.HTMLElement.prototype.scrollIntoView=()=>{};w.dmDiscoveryContext={raw:w.localStorage,session:w.sessionStorage,welcome:true,member:false,guest:false,request:async b=>{requests.push(b);return b.islem==='kayitOl'?{status:'success',token:'session',ogrenci:b.ogrenciAdi,...(options.teacherCode?{teacherAccount:true,teacherCode:options.teacherCode}:{})}:{ok:true}}};w.eval(read('first-discovery.js'));await flush();w.dmFirstDiscovery.showHome();const field=(key,value)=>{const n=w.document.querySelector('[data-field="'+key+'"]');assert(n,key);n.value=value;n.dispatchEvent(new w.Event('input',{bubbles:true}));n.dispatchEvent(new w.Event('change',{bubbles:true}));};const click=a=>{const b=w.document.querySelector('[data-action="'+a+'"]');assert(b,a);b.click();};return {w,requests,field,click};}
// Compact role-specific signup coverage lives in compact-registration.test.cjs.
function member(){const dom=new JSDOM('<div id="panel-alani" style="display:block"></div>',{url:'https://app.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,requests=[];w.eval("var aktifOgrenciAdi='Deniz',yo={},apiURL='/api';");w.localStorage.setItem('ing_token','token');w.yoHazirMi=()=>true;w.fetch=async(_u,o)=>{const b=JSON.parse(o.body);requests.push(b);let d={ok:true,emailVerified:true,hasPlacement:true};if(b.islem==='startPlacementSave')d={ok:true,result:{...w.DMStartPlacementBank.evaluate(b.records)}};return {ok:true,json:async()=>d}};for(const f of ['placement-bank.js','member-experience.js','start-placement-bank.js','start-placement.js'])w.eval(read(f));return {w,requests};}
test('skip before and during the starting test performs no save and returns directly',async()=>{const {w,requests}=member();try{w.seviyeTestAc();assert(w.document.querySelector('[data-skip]'));w.document.querySelector('[data-skip]').click();assert(!w.document.getElementById('dmStartPlacement'));w.seviyeTestAc();w.document.querySelector('[data-start]').click();w.document.querySelector('[data-answer]').click();w.document.querySelector('[data-skip]').click();assert(!w.document.getElementById('dmStartPlacement'));assert(!requests.some(b=>b.islem==='startPlacementSave'));}finally{w.close();}});
test('unsupported listening can be skipped without displaying a transcript or producing a listening score',async()=>{const {w,requests}=member();try{w.seviyeTestAc();w.document.querySelector('[data-start]').click();for(let i=0;i<24;i++){const q=w.document.querySelector('[data-unknown]');if(w.document.querySelector('[data-audio-unavailable]')&&!w.document.querySelector('[data-audio-unavailable]').hidden)w.document.querySelector('[data-audio-unavailable]').click();else q.click();w.document.querySelector('[data-next]').click();}w.document.querySelector('[data-save]').click();await flush();assert.equal(requests.filter(b=>b.islem==='startPlacementSave').length,1);assert.match(w.document.querySelector('#dmStartPlacement').textContent,/Dinleme tamamlanamadı/);assert.equal(w.yo.dmStartingPoint,undefined);assert.equal(w.yo.dmLearnerProfile,undefined);}finally{w.close();}});
test('profile hides school information for independent learners, keeps Save above fields, and saves private preferences',async()=>{const dom=new JSDOM('<body></body>',{url:'https://app.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,requests=[];let profile={ok:true,kullaniciAdi:'Deniz',telefon:'',email:'deniz@example.test',sinif:'',sube:'',okul:'',learnerProfile:{version:1,purpose:'independent',ageBand:'adult',goal:'daily',educationStage:'',startChoice:'new',knownLevel:'A1'}};w.fetch=async(_u,o)=>{const b=JSON.parse(o.body);requests.push(b);if(b.islem==='kisiselBilgiGuncelle')profile={...profile,learnerProfile:b.learnerProfile};return {ok:true,json:async()=>profile}};try{w.eval(read('kisisel-bilgiler.js'));await w.kisiselBilgilerAc();assert(w.document.getElementById('kbEducation').hidden);assert(w.document.querySelector('.kb-ustbar #kbKaydet'));w.document.getElementById('kbGoal').value='travel';w.document.getElementById('kbKaydet').click();await flush();assert.equal(requests.at(-1).learnerProfile.goal,'travel');assert.equal(requests.at(-1).sinif,undefined);assert.equal(w.dmLearnerProfile.goal,'travel');}finally{w.close();}});

test('answers show correct and wrong colors, sound once, and back/forward review keeps the original answers',async()=>{const {w,requests}=member();try{const tones=[];w.dmAnswerFeedback=ok=>tones.push(ok);w.seviyeTestAc();w.document.querySelector('[data-start]').click();const options=[...w.document.querySelectorAll('[data-answer]')].map(b=>b.textContent);assert(w.document.querySelector('[data-next]').disabled);w.document.querySelector('[data-answer="1"]').click();assert(w.document.querySelector('[data-answer="1"]').classList.contains('sp-wrong'));assert(w.document.querySelector('[data-answer="0"]').classList.contains('sp-correct'));assert.match(w.document.querySelector('[role=status]').textContent,/Doğru cevap:/);assert.equal(w.document.querySelectorAll('[data-answer]:disabled').length,4);w.document.querySelector('[data-next]').click();w.document.querySelector('[data-answer="0"]').click();assert.deepEqual(tones,[false,true]);w.document.querySelector('[data-prev]').click();assert.deepEqual([...w.document.querySelectorAll('[data-answer]')].map(b=>b.textContent.replace(/^[✓✕] /,'')),options);w.document.querySelector('[data-answer="0"]').click();w.document.querySelector('[data-next]').click();assert.deepEqual(tones,[false,true]);assert(w.document.querySelector('[data-answer="0"]').classList.contains('sp-correct'));assert(!requests.some(b=>b.islem==='startPlacementSave'));}finally{w.close();}});
test('recorded listening waits for audio end, supports replay, and releases playback on navigation',async()=>{const {w}=member();try{let clip,paused=0;w.Audio=class{constructor(src){this.src=src;clip=this;}play(){return Promise.resolve();}pause(){paused++;}removeAttribute(){}load(){}};w.seviyeTestAc();w.document.querySelector('[data-start]').click();for(let i=0;i<12;i++){w.document.querySelector('[data-unknown]').click();w.document.querySelector('[data-next]').click();}w.document.querySelector('[data-answer="0"]').click();assert.match(w.document.querySelector('[role=status]').textContent,/Önce kaydı/);w.document.querySelector('[data-listen]').click();assert.match(clip.src,/start-placement-audio\/A1.*\.mp3$/);clip.onended();w.document.querySelector('[data-answer="0"]').click();assert(w.document.querySelector('[data-answer="0"]').classList.contains('sp-correct'));assert(paused>0);w.document.querySelector('[data-prev]').click();w.document.querySelector('[data-next]').click();w.document.querySelector('[data-listen]').click();w.document.querySelector('[data-skip]').click();assert(paused>1);}finally{w.close();}});
test('new independent registration goes directly to A1; placement stays in Profile',async()=>{const f=await fixture(),{w}=f;try{w.document.querySelector('[data-role="independent"]').click();f.field('ageBand','adult');f.field('username','deniz_123');f.field('email','deniz@example.test');w.document.querySelector('#fdPassword').value='Secure-example-123!';w.document.querySelector('[data-field="consent"]').checked=true;f.click('submit');await flush();f.click('success');assert(!w.document.querySelector('[data-action="placement"]'));assert.match(w.document.querySelector('.fd-actions').textContent,/Öğrenme Yolum/);}finally{w.close();}});

test('first Study visit invites once, deferral explains Profile > Seviye Testi and another account is independent',async()=>{const {w,requests}=member();try{const asked=new Set();w.fetch=async(_u,o)=>{const b=JSON.parse(o.body);requests.push(b);const key=w.aktifOgrenciAdi,show=b.islem==='studyPlacementInvite'&&!asked.has(key);if(b.islem==='studyPlacementInvite')asked.add(key);return {ok:true,json:async()=>({ok:true,show})};};const root=w.document.createElement('section');root.id='tab-derscalis';w.document.body.append(root);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));root.className='active';await flush();await flush();assert(w.document.querySelector('[data-study-test]'));w.document.querySelector('[data-study-later]').click();assert.match(w.document.getElementById('dmStudyPlacementInvite').textContent,/Profil/);assert.match(w.document.getElementById('dmStudyPlacementInvite').textContent,/Seviye Testi/);w.document.querySelector('[data-guide-done]').click();root.className='';root.className='active';await flush();assert(!w.document.getElementById('dmStudyPlacementInvite'));assert.equal(requests.filter(b=>b.islem==='studyPlacementInvite').length,1);w.aktifOgrenciAdi='Another';w.localStorage.setItem('ing_token','other-token');w.document.dispatchEvent(new w.Event('dm:login'));await flush();assert(w.document.getElementById('dmStudyPlacementInvite'));w.document.querySelector('[data-study-test]').click();assert(w.document.getElementById('dmStartPlacement'));assert(!w.document.getElementById('dmStudyPlacementInvite'));}finally{w.close();}});

test('teacher collects school details once and confirms the registration code before email verification',async()=>{
 const f=await fixture({teacherCode:'482619'}),{w}=f;
 try{
  w.eval(read('teacher-school-locations.js'));
  w.document.querySelector('[data-role="teacher"]').click();
  assert(!w.document.querySelector('[data-field="ageBand"]'),'teacher must not see student age selection');
  for(const [key,value] of Object.entries({first:'Ayşe',last:'Yılmaz',username:'ayse_83'}))f.field(key,value);
  assert.equal(w.document.querySelector('[data-field="schoolCity"]').tagName,'SELECT');
  f.field('schoolCity','Amasya');
  assert([...w.document.querySelector('[data-field="schoolDistrict"]').options].some(o=>o.value==='Merkez'));
  f.field('schoolDistrict','Merkez');
  f.field('school','Örnek Ortaokulu');
  f.field('phone','05551234567');f.field('email','ayse@example.test');
  w.document.querySelector('#fdPassword').value='Secure-example-123!';
  w.document.querySelector('[data-field="consent"]').checked=true;
  f.click('submit');await flush();
  const body=f.requests.find(x=>x.islem==='kayitOl');
  assert(body&&body.requestTeacherAccess);
  assert.equal(body.okulIl,'Amasya');assert.equal(body.okulIlce,'Merkez');assert.equal(body.okul,'Örnek Ortaokulu');
  assert.equal(w.dmFirstDiscovery.screen(),'teacher-code');
  assert.match(w.document.querySelector('#dmDiscovery').textContent,/482619/);
  assert(w.document.querySelector('[data-action="teacher-code-next"]'));
  f.click('teacher-code-next');
  assert.equal(w.dmFirstDiscovery.screen(),'verification');
  assert(!w.document.querySelector('[data-field="schoolCity"]'),'no second school form');
 }finally{w.close();}
});
