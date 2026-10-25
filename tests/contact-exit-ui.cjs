'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const options={headless:true};if(process.env.DIJI_CHROMIUM){options.executablePath=process.env.DIJI_CHROMIUM;if(process.env.DIJI_CHROMIUM_PACKAGE){const {default:binary}=await import(process.env.DIJI_CHROMIUM_PACKAGE);options.args=binary.args;}}
 const browser=await chromium.launch(options),out='/tmp/contact-exit-screens';fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
 for(const [width,height]of [[360,640],[390,844],[768,1024],[390,420]])for(const fail of [false,true]){
  await page.setViewportSize({width,height});await page.unrouteAll();let revoked=0;
  await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.hostname.includes('supabase.co')){const b=JSON.parse(req.postData()||'{}');if(b.islem==='cikis'){revoked++;return route.fulfill({json:{ok:true}});}if(b.islem==='kisiselBilgilerim')return route.fulfill({json:fail?{ok:false,mesaj:'Bağlantı kurulamadı.'}:{ok:true,kullaniciAdi:'Ada',email:'',telefon:'',sinif:5,learnerProfile:{purpose:'school',educationStage:'middle',ageBand:'under13',goal:'school'}}});return route.fulfill({json:{ok:true}});}
   return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="tr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui}button,input{font:inherit}</style></head><body><button id="outside">Parkur</button></body></html>'});});
  await page.goto('https://contact.test/ingilizce/');await page.evaluate(()=>{localStorage.setItem('ing_token','ada-token');localStorage.setItem('ing_aktifOgrenci','Ada');localStorage.setItem('other-account','preserved');});
  for(const file of ['kisisel-bilgiler.js','contact-policy.js'])await page.addScriptTag({path:'ingilizce/'+file});
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('dm:contact-block',{detail:{ok:true,eksik:true,donuk:true}})));
  const exit=page.locator(fail?'.kb-bas .kb-cikis':'.kb-actions .kb-cikis');await exit.waitFor();
  const buttons=fail?exit:page.locator('.kb-actions button');for(const b of await buttons.all()){const box=await b.boundingBox();assert(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,JSON.stringify({width,height,box}));assert(box.height>=44);}
  await page.screenshot({path:path.join(out,`contact-${width}-${height}-${fail?'error':'loaded'}.png`)});
  await exit.click();await page.waitForURL('**/?baslangic=1');assert.equal(await page.evaluate(()=>localStorage.getItem('ing_token')),null);assert.equal(await page.evaluate(()=>localStorage.getItem('other-account')),'preserved');assert.equal(revoked,1);
  console.log('PASS visible Save/Logout and real exit',width,height,fail?'load failure':'loaded');
 }
 const watchdog=setTimeout(()=>process.exit(0),3000);await browser.close();clearTimeout(watchdog);
})().catch(e=>{console.error(e);process.exit(1)});
