'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require(process.env.DIJI_JSDOM||'jsdom');
const source=name=>fs.readFileSync('ingilizce/'+name,'utf8');
const flush=()=>new Promise(r=>setImmediate(r));
function fixture(html=''){
 const dom=new JSDOM('<!doctype html><html><body>'+html+'</body></html>',{url:'https://app.test/ingilizce/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.HTMLElement.prototype.getClientRects=function(){for(let p=this;p&&p.nodeType===1;p=p.parentElement)if(p.hidden||w.getComputedStyle(p).display==='none')return [];return [{width:300,height:30}];};w.HTMLElement.prototype.scrollIntoView=()=>{};
 return {dom,w};
}
test('legacy demo stays available through its API while welcome offers direct signup and login',async()=>{
 const {w}=fixture('<div id="login-container"><form id="loginForm"></form></div>');
 w.dmDiscoveryContext={raw:w.localStorage,session:w.sessionStorage,welcome:true,member:false,guest:false,request:async()=>({hazir:false})};
 w.eval(source('first-discovery.js'));await flush();
 assert.equal(w.document.querySelectorAll('.fd-welcome').length,1);assert(!w.document.querySelector('.fd-welcome .fd-back'));
 assert(!w.document.querySelector('[data-action=demo-intro]'));w.dmFirstDiscovery.openDemo();assert.equal(w.dmFirstDiscovery.screen(),'intro');assert.match(w.document.querySelector('h1').textContent,/minik bir test/);w.document.querySelector('[data-action=demo]').click();
 const words=['apple','book','ball','cat','pencil','dog'];
 for(let i=0;i<6;i++){
  assert.equal(w.dmFirstDiscovery.screen(),'question');assert.match(w.document.querySelector('.fd-step').textContent,new RegExp((i+1)+' / 6'));
  assert.equal(w.document.querySelectorAll('.fd-answer img').length,4);assert(w.document.querySelector('[data-action=register]'));assert(!w.document.querySelector('.fd-word-prompt'));assert(!w.document.querySelector('[data-role]'));
  w.document.querySelector('[data-word="'+words[i]+'"]').click();w.document.querySelector('[data-action=question-next]').click();
 }
 assert.equal(w.dmFirstDiscovery.screen(),'mini-result');assert.match(w.document.querySelector('.fd-mini-score').textContent,/6.*6 doğru/);w.document.querySelector('[data-action=register]').click();assert.equal(w.dmFirstDiscovery.screen(),'register');assert.equal(w.document.querySelectorAll('[data-role]').length,3);assert(JSON.parse(w.localStorage.getItem('dm_discovery_summary_v1')).completed);
 w.document.querySelector('[data-action=login]').click();assert(w.document.getElementById('dmDiscovery').hidden);assert(w.document.getElementById('dmDiscoveryGoogleFallback'));
 w.close();
});
test('account picker exposes illustrated Google login and restores password form on close',async()=>{
 const {w}=fixture('<div id="login-container"><form id="loginForm"><input id="ogrenci"><input id="sifre"><button id="girisBtn">Giriş</button><p id="mesaj"></p></form></div>');let google=0;
 w.dmSavedSessions={remember(){},list:()=>[],current:()=>null};w.dmGoogleHesapDegistir=async()=>{google++;return true;};
 w.eval(source('account-switch.js'));w.dmHesapDegistirAc();w.document.getElementById('dmSwitchAdd').click();
 const button=w.document.getElementById('dmSwitchGoogle');assert(button.querySelector('img'));button.click();await flush();assert.equal(google,1);
 w.document.getElementById('dmSwitchClose').click();assert(w.document.getElementById('login-container').contains(w.document.getElementById('loginForm')));assert(!w.document.getElementById('dmSwitchGoogle'));w.close();
});
test('word review distinguishes right/wrong choices, counts progress, and dismisses to profile',async()=>{
 const {w}=fixture('<div id="panel-alani" style="display:block"></div>');let returns=0;
 w.eval("var aktifOgrenciAdi='New',yo={dmLearningPurpose:'school'},apiURL='/api';");w.yoHazirMi=()=>true;w.dmProfileDismiss=()=>returns++;
 w.fetch=async(_u,opt)=>{const b=JSON.parse(opt.body);let d={ok:true,emailVerified:true,hasPlacement:true};if(b.islem==='wordReviewList')d.words=[{id:'1',en:'apple',tr:'elma'},{id:'2',en:'book',tr:'kitap'}];if(b.islem==='wordReviewAnswer')d={ok:true,correct:b.answer===(b.id==='1'?'apple':'book'),answer:b.id==='1'?'apple':'book'};return {ok:true,json:async()=>d};};
 w.eval(source('member-experience.js'));await w.yoZkAc();
 assert(w.document.querySelector('[data-review-time]'));w.document.querySelector('[data-answer="apple"]').click();await flush();assert(w.document.querySelector('[data-answer="apple"]').classList.contains('dm-answer-correct'));
 assert.match(w.document.querySelector('.dm-review-hud').textContent,/1 Doğru/);w.document.querySelector('[data-next]').click();
 w.document.querySelector('[data-answer="apple"]').click();await flush();assert(w.document.querySelector('[data-answer="apple"]').classList.contains('dm-answer-wrong'));assert(w.document.querySelector('[data-answer="book"]').classList.contains('dm-answer-correct'));assert.match(w.document.querySelector('.dm-review-hud').textContent,/1 Yanlış/);
 w.document.querySelector('#dmWordReview .dm-member-close').click();assert.equal(returns,1);assert(!w.document.getElementById('dmWordReview'));w.close();
});
test('weekly parent report is elevated immediately above teacher workspace',async()=>{
 const {w}=fixture('<style>.yo-modal{display:none}.yo-modal.acik{display:flex}</style><div id="ogretmenMenuModal" class="rubric-modal" style="display:none"><div class="rubric-content"></div></div><div id="yoModal" class="yo-modal"><button class="yo-kapat">×</button></div>');
 w.eval("var apiURL='/api';");w.sessionStorage.setItem('ing_ogr_token','teacher');w.fetch=async()=>({ok:true,json:async()=>({ok:true,total:0})});w.ogretmenPaneliAc=()=>w.document.getElementById('ogretmenMenuModal').style.display='flex';
 w.eval(source('teacher-workspace.js'));w.ogretmenPaneliAc();w.document.getElementById('yoModal').classList.add('acik');await flush();
 assert.equal(w.document.getElementById('yoModal').style.getPropertyValue('z-index'),'2147483620');assert(w.document.getElementById('yoModal').classList.contains('dm-teacher-child'));w.close();
});
test('profile word review and placement close buttons both return to profile menu',async()=>{
 const {w}=fixture('<nav id="bottomNavMobile"><button class="bn-item" data-ekran="tab-profile-menu"><span class="bn-icon"></span><span class="bn-label"></span></button></nav><div id="panel-alani" style="display:block"></div>');
 w.eval("var aktifOgrenciAdi='New',yo={dmLearningPurpose:'school'},apiURL='/api';");w.yoHazirMi=()=>true;w.dcTumTamEkranlariKapat=()=>{};w.fetch=async(_u,opt)=>({ok:true,json:async()=>JSON.parse(opt.body).islem==='wordReviewList'?{ok:true,words:[]}:{ok:true}});
 w.eval(source('placement-bank.js'));w.eval(source('bottom-nav.js'));w.eval(source('member-experience.js'));
 for(const key of ['repeat','exam']){w.dmProfileMenuAc();w.document.querySelector('[data-profile="'+key+'"]').click();await flush();const modal=w.document.querySelector('.dm-member-overlay');assert(modal);modal.querySelector('.dm-member-close').click();await new Promise(r=>setTimeout(r,30));assert(w.document.getElementById('rtProfileBackdrop'));w.document.querySelector('#rtProfileBackdrop .rt-close').click();}
 w.close();
});
test('all classroom cards dispatch to working entrypoints including local and online battles',()=>{
 const {w}=fixture('<div id="siniftaOyunModal"><div><button class="siniftaOyunBtn"></button></div></div><select id="siniftaOyunOgrenciSelect"><option selected value="Alice">Alice</option></select>');
 const html=source('index.html');const part=html.slice(html.indexOf('  const SO = ['),html.indexOf('  function rastgele()',html.indexOf('  const SO = [')));
 const normal=html.slice(html.indexOf('                function siniftaOyunuBaslat('),html.indexOf('                function siniftaOyunRozetiGoster()',html.indexOf('                function siniftaOyunuBaslat(')));
 w.eval("var siniftaOynananOgrenci=null;var $=id=>document.getElementById(id);function rastgele(){};function siniftaOyunRozetiGoster(){};");let called=[];
 const fns=['baModuAc','kpModuAc','seviyeHaritasiAc','kelimeYarismasiAc','jpOyunAc','boslukOyunAc','hafizaOyunAc','yagmurOyunAc','asmacaOyunAc','kelimebulOyunAc','esOyunAc','trenOyunAc','dikteAc','cumleAc','okumaStudyosunuAc','pomodoroAc','harfBahcesiAc','dmInviteAc'];for(const fn of fns)w[fn]=()=>called.push(fn);
 for(const fn of ['dmPapiCards','dmMeteor','dmWordWheel'])w[fn]={open:()=>called.push(fn)};
 w.eval(normal+part+'\nsoKur();');const cards=[...w.document.querySelectorAll('[data-so]')];assert.equal(cards.length,22);
 for(const card of cards){card.disabled=false;called=[];card.click();assert.equal(called.length,1,card.dataset.so);assert.equal(w.siniftaOynananOgrenci,'Alice');}
 assert.equal(w.dmClassroomOnlineOwner,'Alice');w.close();
});
test('new accounts do not inherit series badges or pending celebrations from an old browser streak',async()=>{
 const {w}=fixture('<div id="panel-alani" style="display:block"></div>');const intervals=[];
 w.eval("var aktifOgrenciAdi='New',yoIsim='New',yo={totalXp:0,dmParkurMigration:{version:1},dmWorldBadges:{version:1,ids:['seri-3','seri-7']}},apiURL='/api';");
 w.yoHazirMi=()=>true;w.yoKaydet=()=>{};w.setInterval=fn=>{intervals.push(fn);};w.dmMemberBadgeStatus={owner:'New',maxLoginStreak:1,welcomeEarned:false};w.localStorage.setItem('ing_girisSerisiSayisi','77');w.localStorage.setItem('bd_rozet_bekleyen:new','["seri-3","seri-7"]');w.fetch=async()=>({ok:true,json:async()=>({ok:true,gunler:{}})});
 w.eval(source('profile-sections.js'));intervals.forEach(f=>f());await flush();intervals.forEach(f=>f());assert.deepEqual(Array.from(w.yo.dmWorldBadges.ids),[]);assert(!w.document.getElementById('bdRozetKutlama'));
 w.dmMemberBadgeStatus.welcomeEarned=true;intervals.forEach(f=>f());assert(w.yo.dmWorldBadges.ids.includes('hos-geldin'));assert.match(w.document.getElementById('bdRozetKutlama').textContent,/Hoş Geldin/);w.close();
});
