require('./_index-source.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('ingilizce/index.html','utf8');
test('Eksik Harf presents one word and completes all words with correct per-word results',()=>{
 const dom=new JSDOM('<div id="boslukOyunEkrani" style="display:block"><button class="btn-giris"></button><div id="boslukSatirlarContainer"></div><div id="boslukSayacInfo"></div></div>',{runScripts:'outside-only'}),w=dom.window,timers=[];w.setTimeout=fn=>{timers.push(fn);return timers.length};
 w.OC={dogru(){},yanlis(){}};w.boslukAktifKelimeler=[{en:'cat',tr:'kedi'},{en:'apple',tr:'elma'},{en:'bread',tr:'ekmek'}];let final;w.boslukOyunuBitir=(correct,wrong)=>final={correct,wrong};w.eval(html.slice(html.indexOf('let boslukRound=null;'),html.indexOf('async function boslukOyunuBitir(',html.indexOf('let boslukRound=null;'))));w.boslukBulmacayiCiz();
 for(const expected of ['CAT','APPLE','BREAD']){const rows=w.document.querySelectorAll('.dm-letter-word');assert.equal(rows.length,1);assert.equal(rows[0].dataset.word,expected);for(const button of rows[0].querySelectorAll('.dm-letter-slots button'))button.dmReveal();while(timers.length)timers.shift()();}
 assert.deepEqual(final,{correct:3,wrong:0});assert.equal(w.boslukSonucDetaylari.length,3);w.close();
});
test('the result Continue action keeps native cleanup and returns teacher play to Games; Replay keeps replay behavior',async()=>{
 const source=html.slice(html.indexOf('function genelSonucKapat(tip)'),html.indexOf('</script>',html.indexOf('function genelSonucKapat(tip)'))),dom=new JSDOM('<div id="genelSonucOverlay" class="acik"></div>',{runScripts:'outside-only'}),w=dom.window;let cleanup=0,games=0,replayed=0;
 w.dmTeacherPortalMode=true;w.dmTeacherPortal={returnToGames:()=>games++};w.gsoAktif={oyunKey:'bosluk',devamFn:()=>cleanup++,tekrarFn:()=>replayed++};w.eval(source);w.genelSonucKapat('devam');await new Promise(r=>setImmediate(r));assert.equal(cleanup,1);assert.equal(games,1);w.gsoAktif={tekrarFn:()=>replayed++};w.genelSonucKapat('tekrar');await new Promise(r=>setImmediate(r));assert.equal(replayed,1);assert.equal(games,1);w.dmTeacherPortalMode=false;w.gsoAktif={devamFn:()=>cleanup++};w.genelSonucKapat('devam');await new Promise(r=>setImmediate(r));assert.equal(games,1);assert.equal(cleanup,2);w.close();
});
test('teacher panel keeps the approved eight and six tools stable across viewport changes and preserves admin tools',()=>{
 const s=fs.readFileSync('ingilizce/teacher-portal.js','utf8'),source=s.slice(s.indexOf('function canonicalDashboardTool(text){'),s.indexOf("window.addEventListener('resize',paginateDashboard)"));
 for(const count of [14,23]){
  const dom=new JSDOM('<div id="tpDashboard"><div class="tp-real-tools">'+Array.from({length:count},(_,i)=>'<button>Tool '+i+'</button>').join('')+'</div><details class="tp-account-settings"></details></div>',{runScripts:'outside-only'}),w=dom.window;
  w.eval(source);w.paginateDashboard();
  const visible=()=>[...w.document.querySelectorAll('.tp-real-tools button')].filter(b=>!b.hidden).map(b=>b.textContent),next=()=>w.document.querySelector('.tp-tools-pager button:last-child'),prev=()=>w.document.querySelector('.tp-tools-pager button:first-child');
  assert.equal(visible().length,8);assert(prev().disabled);next().click();assert.deepEqual(visible(),Array.from({length:6},(_,i)=>'Tool '+(i+8)));
  Object.defineProperty(w,'innerWidth',{value:1440});w.paginateDashboard();assert.equal(visible()[0],'Tool 8','resizing must keep the selected tools page');
  if(count===14)assert(next().disabled);else{next().click();assert.equal(visible()[0],'Tool 14');assert.equal(visible().length,8);next().click();assert.deepEqual(visible(),['Tool 22']);assert(next().disabled);prev().click();prev().click();}
  prev().click();assert.equal(visible()[0],'Tool 0');w.close();
 }
});
test('approved teacher panel renders all tools and routes identity actions to the existing account controls',()=>{
 const s=fs.readFileSync('ingilizce/teacher-portal.js','utf8'),dom=new JSDOM('<button id="cogK1"></button><button id="cogK2"></button>',{runScripts:'outside-only'}),w=dom.window,calls=[];
 const start=s.indexOf(' function canonicalDashboardTool(text){'),end=s.indexOf(' function teacherDashboardHide()',start);
 Object.assign(w,{mode:true,rememberRoute:()=>{},teacherHomeHide:()=>{},teacherDock:()=>{},observeTeacherChildren:()=>{},prepareTeacherTools:async()=>[],showTeacherToolError:()=>{}});
 // Test actual rendered event bindings with isolated destination handlers.
 w.teacherDashboardAction=action=>calls.push(action);w.eval(s.slice(start,end));w.teacherDashboardShow();w.paginateDashboard();
 assert.equal(w.document.querySelectorAll('.tp-real-tools>button').length,14);
 assert.deepEqual([...w.document.querySelectorAll('.tp-real-tools>button:not([hidden]) strong')].map(x=>x.textContent),['Sınıfım','Sınıflarım','Sınıf Raporları','Ödev Ver','Rubrik Paneli','Ders İçi Performans','Sınıfına Duyuru Yap','Öğrenci Sohbetleri']);
 for(const action of ['copyCode','invite','students','games','homework','league','classes','classReports','rubric','performance','announcements','messages'])w.document.querySelector('[data-dash="'+action+'"]').click();
 assert.deepEqual(calls,['copyCode','invite','students','games','homework','league','classes','classReports','rubric','performance','announcements','messages']);
 w.document.querySelector('.tp-tools-pager button:last-child').click();
 for(const b of w.document.querySelectorAll('.tp-real-tools>button:not([hidden])'))b.click();
 assert.deepEqual(calls.slice(-6),['reports','weak','parent','studentDetails','exams','oral']);
 let copied=0,invited=0;w.document.getElementById('cogK1').onclick=()=>copied++;w.document.getElementById('cogK2').onclick=()=>invited++;
 const actions=s.slice(s.indexOf(' function teacherDashboardAction('),s.indexOf(' function teacherHomeShow('));w.eval(actions);w.teacherDashboardAction('copyCode');w.teacherDashboardAction('invite');assert.equal(copied,1);assert.equal(invited,1);w.close();
});
