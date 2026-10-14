const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=path.join(__dirname,'../ingilizce');
 const browser=await chromium.launch({args:['--no-sandbox']});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(`<!doctype html><html lang="tr"><head><style>
 .bz-perde{position:fixed;inset:0;z-index:100000040;background:#fff}
 .sa-perde{position:fixed;inset:0;z-index:100000019;background:#1119;display:grid;place-items:center}
 </style></head><body><div class="bz-perde" id="bzPerde"><div class="bz-oyun"></div>
 <div id="bzAlan"><div class="rq-progress"><span>8 / 13</span></div>
 <div class="bz-soru">Bugün Perşembe.</div><div class="bz-geri-bildirim">Doğru!</div>
 <button class="bz-btn mor" id="continue">Devam → · ⚡ −1</button></div></div></body></html>`);
 await page.addStyleTag({content:fs.readFileSync(path.join(base,'route-questions.css'),'utf8')});
 await page.evaluate(()=>{
  window.genelEnerjiKalan=0;window.genelEnerjiMax=30;window.didContinue=0;window.attempts=0;
  document.getElementById('continue').onclick=()=>window.didContinue++;
  window.enerjiPaketiAl=async amount=>{
   if(amount!==5)throw Error('wrong pack');
   window.attempts++;
   if(window.attempts===1)return false;
   window.genelEnerjiKalan=5;return true;
  };
  window.genelEnerjiBittiGoster=()=>{
   const popup=document.createElement('div');popup.className='sa-perde';
   popup.setAttribute('aria-label','Enerji paketleri');
   popup.innerHTML='<button type="button" class="dm-energy-buy" data-amount="5">⚡ 5 enerji — 🪙 100 altın</button>';
   popup.querySelector('button').onclick=()=>popup.remove();
   document.body.append(popup);
  };
 });
 await page.addScriptTag({content:fs.readFileSync(path.join(base,'route-questions.js'),'utf8')});
 await page.evaluate(()=>DMRouteQuestions.mountSchool(document.getElementById('bzPerde'),8,13,0));
 const panel=page.locator('.sa-perde[aria-label="Enerji paketleri"]');
 await panel.waitFor({state:'visible',timeout:3000});
 const stack=await page.evaluate(()=>({
  overlay:+getComputedStyle(document.querySelector('.sa-perde')).zIndex,
  game:+getComputedStyle(document.getElementById('bzPerde')).zIndex
 }));
 assert(stack.overlay>stack.game,'energy shop must be visible above the game');
 assert.match(await page.locator('#continue').innerText(),/Enerji al ve devam et/);
 await panel.getByRole('button',{name:/5 enerji/}).click();
 assert(await panel.isVisible(),'failed purchase must keep the shop open');
 assert.equal(await page.evaluate(()=>didContinue),0);
 await panel.getByRole('button',{name:/5 enerji/}).click();
 await page.waitForFunction(()=>window.didContinue===1);
 assert.equal(await panel.count(),0);
 assert.equal(await page.evaluate(()=>window.genelEnerjiKalan),5);
 assert.deepEqual(errors,[]);
 await browser.close();console.log('PASS energy shop appears above route, failure stays open, success resumes same step');
})().catch(e=>{console.error(e);process.exit(1)});
