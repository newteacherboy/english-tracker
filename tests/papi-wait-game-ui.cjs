'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve('ingilizce'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const boot=[...html.matchAll(/<script\b[^>]*>([^]*?)<\/script>/gi)].find(m=>m[1].includes("const splash=document.getElementById('dmBootSplash')"))[1];
const version=html.match(/holiday-splashes\/papi-intro.js\?v=([^"\s]+)/)[1];
const fixture='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="papi-loading.css"><style>body{margin:0}#dmBootSplash{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}.dm-ready{opacity:0}</style><script src="holiday-splashes/papi-intro.js?v='+version+'"></script><script>dmPapiIntro.enable()</script></head><body><div id="dmBootSplash"><p id="dmBootText"></p><button id="dmBootRetry" hidden>Tekrar Dene</button></div><div id="oturumYuklemeOverlay" style="display:none"></div><div id="login-container" style="display:none">Giriş ekranı</div><div id="panel-alani" style="display:none"></div><script>'+boot+'</script></body></html>';
(async()=>{
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/ingilizce/'||url.pathname==='/ingilizce/index.html'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}const file=path.resolve(root,'.'+url.pathname.replace(/^\/ingilizce/,''));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port+'/ingilizce/',browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}),context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const out='/tmp/papi-wait-qa';fs.mkdirSync(out,{recursive:true});
 try{
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(size);await page.goto(base);await page.locator('#dmBootSplash .pi-papi').click();await page.waitForTimeout(180);
   const bounds=await page.locator('#dmBootSplash').evaluate(el=>[...el.querySelectorAll('.pi-runway,.pi-word,.pi-play-hint,.pi-wait-controls button:not([hidden])')].map(x=>{const r=x.getBoundingClientRect();return {name:x.className||x.id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,hit:!x.matches('button')||x.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}}));
   for(const b of bounds)assert(b.x>=0&&b.y>=0&&b.right<=size.width+1&&b.bottom<=size.height+1&&b.hit,JSON.stringify({size,b}));
   await page.screenshot({path:path.join(out,'playing-'+size.width+'x'+size.height+'.png')});
   await page.waitForSelector('.pi-game-over',{timeout:8000});await page.locator('.pi-runway').tap({force:true}).catch(()=>page.locator('.pi-runway').click());assert.equal(await page.locator('.pi-game-over').count(),0);
   await page.evaluate(()=>{document.getElementById('login-container').style.display='block';document.dispatchEvent(new Event('dm:state'));});
   await page.locator('.pi-enter').waitFor({state:'visible',timeout:8000});assert.equal(await page.locator('#dmBootSplash').count(),1);await page.screenshot({path:path.join(out,'ready-'+size.width+'x'+size.height+'.png')});
   await page.locator('.pi-enter').click();await page.waitForSelector('#dmBootSplash',{state:'detached'});assert(await page.locator('#login-container').isVisible());console.log('PASS touch, restart, viewport and application entry',size);
  }
  // Ordinary successful startup remains automatic if the player never starts the game.
  await page.goto(base);await page.evaluate(()=>{document.getElementById('login-container').style.display='block';document.dispatchEvent(new Event('dm:state'));});await page.waitForSelector('#dmBootSplash',{state:'detached',timeout:8000});console.log('PASS normal automatic startup');
  // A real service worker cache supplies the opening and game after the network disappears.
  await page.goto(base);await page.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller);await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#dmBootSplash .pi-papi').click();assert.match(await page.locator('.pi-wait-status').innerText(),/İnternet/);assert(await page.locator('#dmBootRetry').isVisible());await page.screenshot({path:path.join(out,'offline.png')});
  await page.evaluate(()=>{document.getElementById('login-container').style.display='block';document.dispatchEvent(new Event('dm:state'));});await page.waitForTimeout(3600);assert.equal(await page.locator('.pi-enter:visible').count(),0,'offline does not claim application readiness');
  await context.setOffline(false);await page.locator('.pi-enter').waitFor({state:'visible',timeout:8000});await page.locator('.pi-enter').click();await page.waitForSelector('#dmBootSplash',{state:'detached'});assert.deepEqual(errors,[]);console.log('PASS cached offline game and reconnection');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
