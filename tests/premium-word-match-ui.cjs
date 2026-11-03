const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const raw=[
['hi','merhaba',1,1],['hello','merhaba',1,1],['bye','hoşça kal',1,1],['goodbye','güle güle',1,1],
['good night','iyi geceler',1,1],['thank you','teşekkürler',1,1],['welcome','hoş geldin',1,1],['please','lütfen',1,1],
['red','kırmızı',1,2],['blue','mavi',1,2],['green','yeşil',1,2],['yellow','sarı',1,2],['pink','pembe',1,2],['purple','mor',1,2]
].map(([ingilizce,turkce,sinif,unite])=>({ingilizce,turkce,sinif,unite}));
(async()=>{
 const base=path.resolve(__dirname,'../ingilizce');
 for(const [engine,name,widths] of [[chromium,'Chromium',[360,390,768]],[webkit,'WebKit',[360,390]]]){
 const browser=await engine.launch({headless:true,...(name==='Chromium'?{args:['--no-sandbox']}:{})});
 try{
  for(const width of widths){
   const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:width<600});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://nxfqlutulxqzqgwewssd.supabase.co/**',async route=>{
    const request=route.request(),origin=request.headers()['origin']||'https://games.test';
    const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'content-type,authorization','access-control-allow-methods':'POST,OPTIONS','content-type':'application/json'};
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
    let payload={};try{payload=JSON.parse(request.postData()||'{}');}catch{}
    await route.fulfill({status:200,headers,body:JSON.stringify({ok:true,allowed:true,premium:false,remaining:3,level:payload.action==='complete'?2:1,unlocked:true})});
   });
   await page.route('https://games.test/**',async route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname==='/premium-word-match.css')return route.fulfill({contentType:'text/css',body:fs.readFileSync(path.join(base,'premium-word-match.css'),'utf8')});
    if(pathname==='/premium-word-match.js')return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(base,'premium-word-match.js'),'utf8')});
    const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><script>'
     +'window.aktifOgrenciAdi="demo";window.dmSoundEnabled=false;window.masterKelimeHavuzu='+JSON.stringify(raw)+';'
     +'localStorage.setItem("ing_token","x".repeat(90));'
     +'</script><script src="/premium-word-match.js"></script><script>premiumKelimeEslestirmeAc()</script></body></html>';
    return route.fulfill({contentType:'text/html',body:html});
   });
   await page.goto('https://games.test/index.html');
   await page.locator('.pwm-tile').first().waitFor({timeout:15000});
   assert.equal(await page.locator('.pwm-tile').count(),36,'6x6 board');
   const title=await page.locator('[data-wm-level]').textContent();
   assert(title.includes('Seviye 1')&&title.includes('1. Sınıf 1. Ünite'),title);
   const goals=await page.locator('[data-wm-goals]').textContent();
   assert(!goals.includes('NaN'),goals);
   assert.equal(await page.locator('[data-wm-grade]').count(),0);
   const swap=await page.evaluate(()=>{
     const words=[...document.querySelectorAll('.pwm-tile')].map(b=>b.getAttribute('aria-label'));
     for(let i=0;i<words.length;i++)for(const j of [i+1,i+6]){
       if(j>=36||(j===i+1&&Math.floor(i/6)!==Math.floor(j/6))||words[i]===words[j])continue;
       const copy=words.slice();[copy[i],copy[j]]=[copy[j],copy[i]];
       if(window.dmPremiumWordMatch.matches(copy).length)return [i,j];
     }return null;
   });
   assert(swap,'a playable move must exist');
   const a=await page.locator('.pwm-tile').nth(swap[0]).boundingBox(),b=await page.locator('.pwm-tile').nth(swap[1]).boundingBox();
   assert(a&&b,'tile positions');
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
   await page.mouse.down();
   await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:5});
   await page.mouse.up();
   await page.waitForTimeout(1400);
   const score=Number((await page.locator('[data-wm-score]').textContent()).replace(/[^0-9]/g,''));
   assert(score>=100,'swipe must cause a match and score, got '+score);
   assert(!((await page.locator('[data-wm-goals]').textContent()).includes('NaN')));
   const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,board:document.querySelector('.pwm-board').getBoundingClientRect().width}));
   assert(metrics.overflow<=2,'horizontal overflow: '+JSON.stringify(metrics));
   assert.equal(errors.length,0,'page errors: '+JSON.stringify(errors));
   console.log('PASS premium word match swipe '+name+' '+width+'px',score);
   await page.close();
  }
 }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exit(1);});
