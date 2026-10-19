// Teacher chat opens as a compact bubble fixed to the bottom-right; the page behind stays usable.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 for(const size of [{width:320,height:568},{width:390,height:844},{width:1280,height:800}]){
  const page=await browser.newPage({viewport:size,reducedMotion:'reduce'});
  await page.route('**/*',route=>{const u=new URL(route.request().url());
   if(u.pathname==='/api')return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,mesajlar:[{id:1,gonderen:'teacher',metin:'Merhaba Ece, ödevini gördüm.'}]})});
   const file=path.join(process.cwd(),'ingilizce',u.pathname.slice(1));if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
   return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bottom-nav.css"><link rel="stylesheet" href="/member-experience.css"><body><button id="behind" style="position:fixed;left:10px;top:10px;width:120px;height:44px">Arka</button></body>'});});
  await page.goto('https://papi.test/');
  await page.evaluate(()=>{window.aktifOgrenciAdi='Ece';window.apiURL='https://papi.test/api';window.__behind=0;document.getElementById('behind').onclick=()=>window.__behind++;});
  await page.addScriptTag({url:'/bottom-nav.js'});
  await page.evaluate(()=>window.dmTeacherChatOpen());
  const chat=page.locator('#dmTeacherChat .dm-teacher-chat');await chat.waitFor();
  const b=await chat.boundingBox();
  assert(b.width<=330.5,'compact width '+b.width);assert(b.height<=400.5,'compact height '+b.height);
  assert(b.x+b.width<=size.width+0.5&&b.y>=0&&b.y+b.height<=size.height+0.5,'inside viewport '+JSON.stringify(b));
  assert(size.width-(b.x+b.width)<=24,'anchored to the right edge');assert(size.height-(b.y+b.height)<=120,'anchored to the bottom');
  if(size.width>=900)assert(b.x>size.width/2,'stays in the right half on desktop');
  for(const sel of ['textarea','.dm-chat-form button','[data-chat-close]'])assert(await page.locator('#dmTeacherChat '+sel).isVisible(),sel+' visible');
  // The page behind is still usable while the chat is open.
  await page.locator('#behind').click();assert.equal(await page.evaluate(()=>window.__behind),1);
  assert.equal(await page.locator('#dmTeacherChat').count(),1,'chat stays open when using the page');
  await page.screenshot({path:'/tmp/teacher-chat-'+size.width+'.png'});
  await page.locator('#dmTeacherChat [data-chat-close]').click();assert.equal(await page.locator('#dmTeacherChat').count(),0);
  await page.close();
 }
 await browser.close();console.log('PASS teacher-chat-compact-ui');
})().catch(e=>{console.error(e);console.log('::error title=teacher-chat-compact-ui::'+String(e&&e.stack||e).slice(0,900).replace(/%/g,'%25').replace(/\n/g,'%0A'));process.exit(1);});
