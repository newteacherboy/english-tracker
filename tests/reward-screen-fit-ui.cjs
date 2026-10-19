// Character and badge reward screens fit one screen without scrolling, on small phones up to desktop.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const within=(inner,outer)=>inner&&outer&&inner.y>=outer.y-0.5&&inner.y+inner.height<=outer.y+outer.height+0.5;
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 for(const size of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:1024,height:768}]){
  for(const kind of ['character','badge']){
   const page=await browser.newPage({viewport:size,reducedMotion:'reduce'});
   await page.route('**/*',route=>{const u=new URL(route.request().url());const file=path.join(process.cwd(),'ingilizce',u.pathname.slice(1));if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
    return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/profile-sections.css"><link rel="stylesheet" href="/notice-sharing.css"><body></body>'});});
   await page.goto('https://papi.test/');
   await page.evaluate(()=>{window.aktifOgrenciAdi='Ece';});
   await page.addScriptTag({url:'/notice-sharing.js'});
   if(kind==='character'){
    const opened=await page.evaluate(()=>window.dmSharing.celebrateCharacter({kind:'character',id:'ejder',name:'Ejderhacık',svg:'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#f55"/></svg>'}));
    assert.equal(opened,true);
   }else{
    // Same markup as profile-sections.js badge celebration.
    await page.evaluate(()=>{const el=document.createElement('div');el.className='bd-kutlama';el.id='bdRozetKutlama';
     el.innerHTML='<section class="bd-kutlama-kart" role="dialog" aria-modal="true"><button type="button" class="bd-kutlama-kapat" aria-label="Kutlamayı kapat">×</button><div class="bd-kutlama-isilti" aria-hidden="true">✦ ✧ ✦ ✧</div><p class="bd-kutlama-etiket">YENİ ROZET KAZANDIN</p><h2>Tebrikler, Ece!</h2><div class="bd-kutlama-rozet"><img src="papi-reward-v2.png" alt="rozet"></div><h3>7 Gün Seri</h3><p id="bdRozetAciklama">Başardığın hedef: 7 gün üst üste çalış.</p><div class="bd-kutlama-papi"><img src="papi-reward-v2.png" alt=""><p>Harikasın! Emeğin yeni bir rozetle taçlandı. Maceraya devam!</p></div><small>Rozetin Profil → Başarılarım bölümüne eklendi.</small><button type="button" class="bd-kutlama-devam">Harika! Devam et ✨</button></section>';
     document.body.append(el);window.dmSharing.attachAchievementActions(el.querySelector('section'),{kind:'badge',id:'b7',name:'7 Gün Seri',src:'papi-reward-v2.png',emoji:'🔥'});});
   }
   await page.waitForTimeout(1500); // share image preparation inserts its preview (hidden) and enables buttons
   const card=page.locator('.bd-kutlama-kart');const box=await card.boundingBox();
   assert(box.x>=-0.5&&box.y>=-0.5&&box.x+box.width<=size.width+0.5&&box.y+box.height<=size.height+0.5,kind+' card fits '+size.width+'x'+size.height+' '+JSON.stringify(box));
   const scroll=await card.evaluate(el=>({sh:el.scrollHeight,ch:el.clientHeight}));
   assert(scroll.sh<=scroll.ch+1,kind+' no scrolling at '+size.width+'x'+size.height+' '+JSON.stringify(scroll));
   for(const sel of ['.bd-kutlama-devam','.dm-achievement-actions button:first-child','.dm-achievement-actions button:nth-child(2)','.bd-kutlama-rozet','.bd-kutlama-kart>h3'])
    assert(within(await page.locator(sel).first().boundingBox(),box),kind+' '+sel+' visible inside card at '+size.width);
   assert((await page.locator('.bd-kutlama-rozet').boundingBox()).height>=90,'reward art stays large enough');
   assert.equal(await page.locator('.dm-achievement-preview').isVisible().catch(()=>false),false,'duplicate share preview hidden');
   assert((await page.locator('.bd-kutlama-devam').boundingBox()).height>=44,'tap target');
   await page.screenshot({path:'/tmp/reward-fit-'+kind+'-'+size.width+'x'+size.height+'.png'});
   await page.locator('.bd-kutlama-devam').click();assert.equal(await page.locator('.bd-kutlama').count(),kind==='character'?0:1);
   await page.close();
  }
 }
 await browser.close();console.log('PASS reward-screen-fit-ui');
})().catch(e=>{console.error(e);console.log('::error title=reward-screen-fit-ui::'+String(e&&e.stack||e).slice(0,900).replace(/%/g,'%25').replace(/\n/g,'%0A'));process.exit(1);});
