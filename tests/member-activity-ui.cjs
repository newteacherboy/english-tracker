const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.fulfill({body:''}));await page.goto('https://fixture.test');
 await page.setContent('<style>.dm-papi-held{visibility:hidden!important}</style><div id="panel-alani" style="display:block"></div>');
 await page.evaluate(()=>{window.aktifOgrenciAdi='Fixture';window.yo={dmLearningPurpose:'school'};window.yoHazirMi=()=>true;window.apiURL='/api';window.fetch=async()=>({ok:true,json:async()=>({ok:true,emailVerified:true,hasPlacement:true})});});
 for(const f of ['papi-flow.js','experience-ui.js'])await page.addScriptTag({content:fs.readFileSync('ingilizce/'+f,'utf8')});
 for(const id of ['dcScreenDetail','meteorGame','wordWheel','papiCards','dmStoryLesson','baOyunEkrani','kpKelimeOyunEkrani','seviyeDisLinkOverlay']){
  await page.evaluate(id=>{const e=document.createElement('div');e.id=id;e.textContent='Activity';document.body.append(e);},id);
  assert(await page.evaluate(()=>dmPapiNotices.inActivity()),id);
  await page.evaluate(()=>dmNudgeSystem.showPreview({id:'test',title:'Test',text:'Test',target:'ders'}));assert.equal(await page.locator('#dmNudge').count(),0,id);
  await page.evaluate(id=>document.getElementById(id).remove(),id);
 }
 await page.evaluate(()=>dmNudgeSystem.showPreview({id:'test',title:'Test',text:'Test',target:'ders'}));assert.equal(await page.locator('.dm-nudge-time').textContent(),'10 sn');await page.locator('.dm-nudge-x').click();
 await page.setContent('<div id="dmStoryLesson"><div id="area"></div><div id="actions"></div></div>');
 await page.evaluate(()=>{window.DMStoryExercises={norm:s=>s.toLowerCase(),speak(){},listen:async()=>({status:'heard',text:'cat'})};window.answers=[];});
 await page.addScriptTag({content:fs.readFileSync('ingilizce/story-v2-ui.js','utf8')});
 await page.evaluate(()=>DMStoryV2UI.render({area:document.getElementById('area'),actions:document.getElementById('actions'),task:{kind:'final',en:'cat',tr:'kedi'},cards:[{en:'cat',tr:'kedi'},{en:'dog',tr:'köpek'}],onSubmit:async a=>{answers.push(a);return {correct:a==='cat'}},onNote(){}}));
 assert.equal(await page.locator('.ds-options button').count(),2);assert.equal(await page.locator('.papi-microphone').count(),0);await page.getByRole('button',{name:'cat',exact:true}).click();assert.deepEqual(await page.evaluate(()=>answers),['cat']);
 // School-route card renderer keeps a missed card until its correct option is chosen.
 await page.setContent('<div id="school"></div>');
 const html=fs.readFileSync('ingilizce/index.html','utf8'),a=html.indexOf('  function sesliFinal(s, alan)'),b=html.indexOf('  /* 🎈 Risk',a);
 await page.evaluate(()=>{window.O={};window.EN=k=>k.en;window.TR=k=>k.tr;window.norm=s=>s.toLowerCase();window.kac=s=>s;window.karistir=x=>x;window.celdirici=()=>['dog'];window.checkpointSave=()=>{};window.ses=()=>{};window.oku=()=>{};window.wrongWords=[];window.dmWrongWords={add:w=>wrongWords.push(w)};window.cevap=()=>{};});
 await page.addScriptTag({content:html.slice(a,b)+';sesliFinal({l:[{en:"cat",tr:"kedi"},{en:"dog",tr:"köpek"}]},document.getElementById("school"));'});
 assert.equal(await page.locator('#school [data-final]').count(),2);await page.locator('#school [data-final="1"]').click();assert.equal(await page.evaluate(()=>O.voiceRemaining),undefined);assert.equal(await page.evaluate(()=>wrongWords.length),1);await page.getByRole('button',{name:'Tekrar dene',exact:true}).click();await page.locator('#school [data-final="0"]').click();assert.deepEqual(await page.evaluate(()=>O.voiceRemaining),[1]);
 // Real placement controller: clicking a choice must retain the question and show feedback.
 await page.setContent('<div id="panel-alani" style="display:block"></div><div id="login-container" style="display:none"></div>');
 await page.evaluate(()=>{window.dmPapiNotices=null;window.homeCalls=0;window.dunyaAc=()=>homeCalls++;window.cikisYap=()=>localStorage.removeItem('ing_token');localStorage.setItem('ing_token','fixture');window.DMPlacementExam={version:'fixture',bank:[{skill:'language',prompt:'Select cat',options:['cat','dog']} ]};window.fetch=async(_u,o)=>({ok:true,json:async()=>JSON.parse(o.body).islem==='placementSave'?{ok:true,result:{level:'A1',correct:1,total:1,bySkill:{language:{correct:1,total:1}}}}:{ok:true,emailVerified:true,hasPlacement:true}});});
 await page.addScriptTag({content:fs.readFileSync('ingilizce/member-experience.js','utf8')});await page.evaluate(()=>seviyeTestAc());await page.locator('[data-start]').click();await page.locator('[data-option="1"]').click();
 assert.equal(await page.locator('[data-option="0"].dm-answer-correct').count(),1);assert.equal(await page.locator('[data-option="1"].dm-answer-wrong').count(),1);assert.equal(await page.locator('[data-writing]').count(),0);
 await page.getByRole('button',{name:'Soruları tamamla'}).click();await page.locator('[data-save]').click();await page.locator('.dm-placement-result').waitFor();assert.equal(await page.locator('[data-result-route]').count(),1);assert.equal(await page.locator('[data-result-study]').count(),1);
 await page.locator('[data-result-route]').click();await page.locator('#dmRouteChoice .dm-member-close').click();assert.equal(await page.evaluate(()=>homeCalls),1,'dismissal restores one home screen');await page.evaluate(()=>cikisYap());await page.waitForFunction(()=>document.getElementById('login-container').style.display==='block');assert(await page.locator('#panel-alani').isHidden());
 // Teacher parent persists when its child closes and can itself be explicitly closed.
 await page.setContent('<div class="rubric-modal" id="ogretmenMenuModal" style="display:none"><div class="rubric-content"><button class="game-close-btn" onclick="this.closest(\'.rubric-modal\').style.display=\'none\'">X</button><button id="openChild" onclick="document.getElementById(\'ogretmenMenuModal\').style.display=\'none\';document.getElementById(\'child\').style.display=\'flex\'">Child</button></div></div><div class="rubric-modal" id="child" style="display:none"><button class="game-close-btn" onclick="this.parentElement.style.display=\'none\'">X</button></div>');
 await page.evaluate(()=>{sessionStorage.setItem('ing_ogr_token','fixture');window.ogretmenPaneliAc=()=>document.getElementById('ogretmenMenuModal').style.display='flex';window.fetch=async()=>({ok:true,json:async()=>({ok:true,total:0})});});
 await page.addScriptTag({content:fs.readFileSync('ingilizce/teacher-workspace.js','utf8')});await page.evaluate(()=>ogretmenPaneliAc());await page.locator('#openChild').click();await page.waitForFunction(()=>document.getElementById('child').classList.contains('dm-teacher-child'));assert.equal(await page.locator('#child').evaluate(e=>e.style.zIndex),'2147483620');await page.locator('#child .game-close-btn').click();assert(await page.locator('#ogretmenMenuModal').isVisible());await page.locator('#ogretmenMenuModal .game-close-btn').click();assert(await page.locator('#ogretmenMenuModal').isHidden());
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS activity suppression, 10-second notice, two-choice final, placement feedback/result and teacher child close');
})().catch(e=>{console.error(e);process.exit(1)});
