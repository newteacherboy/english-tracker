'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require(process.env.DIJI_JSDOM||'jsdom');
const code=n=>fs.readFileSync('ingilizce/'+n,'utf8'),flush=()=>new Promise(r=>setImmediate(r));
function fixture(html=''){const dom=new JSDOM('<body>'+html+'</body>',{url:'https://fixture.test',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{width:320,height:40}];};return w;}
function week(){const d=new Date(Date.now()+10800000);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
test('weekly route card distinguishes progress, claimable reward, claimed reward and new week',async(t)=>{
 const w=fixture('<div id="dmParkurScroll"></div>');w.eval("var aktifOgrenciAdi='Ada',yo={lig:{xp:0},altin:0},apiURL='/api';");w.yoKaydet=()=>{};let claims=0,release;
 w.fetch=()=>{claims++;return new Promise(r=>release=()=>r({ok:true,json:async()=>({ok:true,duplicate:false,newlyAwarded:true,awardedGold:50,altin:50,haftaHedef:{h:week(),xp:1000,odul:1}})}));};w.eval(code('oyna-v2.js'));
 const scene=()=>w.dmParkurSahne({steps:[]});w.yo.haftaHedef={h:week(),xp:1000,odul:0};assert.match(scene(),/Her gün|her gün/);assert(!scene().includes('data-rt="claim-goal"'));
 w.yo.lig.xp=1000;assert.match(scene(),/Tebrikler/);const host=w.document.getElementById('dmParkurScroll');host.innerHTML=scene();w.dmParkurMapMount(host);host.querySelector('[data-rt=claim-goal]').click();assert.equal(claims,1);release();await flush();assert.match(host.textContent,/Ödülün alındı/);assert(!host.querySelector('[data-rt=claim-goal]'));assert.equal(w.yo.altin,50);
 w.yo.haftaHedef.h='2000-01-01';assert.match(scene(),/Hedef seç/);assert(!scene().includes('Ödülün alındı'));w.close();
});
test('online duo and Mola Vakti tabs preserve selection and keyboard movement',async(t)=>{
 const w=fixture('<div id="tab-aktiviteler" class="active"><div class="dc-focus-card"><div class="az-grid2x2"><button class="az-gcard" onclick="kelimeYarismasiAc()"><span class="az-gcard-title">Kelime Laboratuvarı</span></button><button id="dmUcusteKart" class="az-gcard"><span class="az-gcard-title">Kelime Uçuşu</span></button><button id="dmRotaKart" class="az-gcard"><span class="az-gcard-title">Cümle Rotası</span></button><button id="meteorActivity" class="az-gcard"><span class="az-gcard-title">Meteor</span></button></div></div></div>');
 w.eval("var aktifOgrenciAdi='Ada',yo={altin:0};");w.dmProgression={allowed:()=>true,level:()=>40};w.dmMeduPro={api:async()=>({liste:[],serverNow:new Date().toISOString()}),games:{ucus:['Kelime Uçuşu'],rota:['Cümle Rotası']}};w.eval(code('activity-ui.js'));await flush();
 t.after(()=>w.close());const tabs=[...w.document.querySelectorAll('[role=tab][data-gg-party]')];assert.equal(tabs.length,4);assert.equal(tabs[3].textContent,"Mola Vakti");assert.match(tabs[1].textContent,/Online Çift Kişilik/);tabs[1].click();assert.equal(tabs[1].getAttribute('aria-selected'),'true');assert.equal(w.document.querySelector('#dmUcusteKart').hidden,false);assert.equal(w.document.querySelector('#meteorActivity').hidden,true);assert.equal(w.document.querySelector('#dmActivityGames').getAttribute('aria-labelledby'),'ggOnlineTab');
 // Run the real level gate while Online is selected at level 10. Only game cards may lock.
 w.yoHazirMi=()=>true;w.DijiProgressRules={migrate:x=>x,progress:()=>({level:10})};w.yoToast=()=>{};w.fetch=async()=>({ok:true,json:async()=>({ok:true})});w.eval(code('progression-catalog.js'));w.eval(code('progression-ui.js'));
 const host=w.document.querySelector('#tab-aktiviteler .dc-focus-card');assert(!host.hasAttribute('data-dm-level-lock'));assert(!host.classList.contains('dm-level-locked'));assert(w.document.getElementById('dmUcusteKart').classList.contains('dm-level-locked'));
 tabs[0].click();assert.equal(tabs[0].getAttribute('aria-selected'),'true');tabs[1].click();tabs[2].click();assert.equal(tabs[2].getAttribute('aria-selected'),'true');
 tabs[1].click();tabs[1].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(tabs[2].getAttribute('aria-selected'),'true');assert.equal(w.document.querySelector('#meteorActivity').hidden,false);w.close();
});
test('saved placement opens animated level, motivational text and a truthful share card',async(t)=>{
 const w=fixture('<div id="panel-alani" style="display:block"></div>');w.eval("var aktifOgrenciAdi='Ada',yo={dmLearningPurpose:'school'},apiURL='/api';");w.yoHazirMi=()=>true;w.yoKaydet=()=>{};let share;
 w.dmSharing={attachAchievementActions:(_card,item)=>{share=item;}};w.DMPlacementExam={version:'test',bank:[]};w.fetch=async()=>({ok:true,json:async()=>({ok:true,result:{level:'B2',correct:38,total:40,bySkill:{reading:{correct:10,total:10}}}})});
 w.eval(code('member-experience.js'));w.seviyeTestAc();w.document.querySelector('[data-start]').click();w.document.querySelector('[data-save]').click();await flush();
 assert.equal(w.document.querySelector('.dm-placement-level').textContent,'B2');assert.match(w.document.querySelector('.dm-placement-result').textContent,/Tebrikler/);assert(w.document.querySelector('.dm-placement-papi'));assert.equal(share.kind,'placement');assert.match(share.svg,/B2/);assert.match(w.document.body.textContent,/resmî seviye belgesi değildir/);w.close();
});
