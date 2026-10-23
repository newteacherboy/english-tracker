const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const base=path.resolve(__dirname,'../ingilizce'),out=process.env.ROUTE_QA_OUT||'/tmp/route-exploration-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(base,'.'+pathname);if(!file.startsWith(base+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
const executablePath=process.env.FRIENDS_BROWSER_PATH;const browser=await chromium.launch({executablePath,args:['--no-sandbox','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],env:{...process.env,LD_LIBRARY_PATH:executablePath?path.dirname(executablePath):process.env.LD_LIBRARY_PATH||''}});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{for(const [width,height] of [[360,740],[768,1024],[1440,900]]){await page.setViewportSize({width,height});
for(const theme of ['school','learning']){await page.goto(url+'/route-exploration-preview.html?theme='+theme);await page.waitForFunction(()=>window.previewWorld?.snapshot().objects.geometries>0);assert.equal(await page.locator('.rx-world').getAttribute('data-character-gender'),'k');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);
for(const selector of ['.rx-joystick','.rx-skip','.rx-title']){const b=await page.locator(selector).boundingBox();assert(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,'visible '+selector);}
await page.screenshot({path:path.join(out,theme+'-'+width+'.png')});
const before=await page.evaluate(()=>previewWorld.snapshot());await page.locator('.rx-world canvas').focus();await page.keyboard.down('ArrowLeft');await page.waitForTimeout(450);await page.keyboard.up('ArrowLeft');const after=await page.evaluate(()=>previewWorld.snapshot());assert(after.x<before.x-.1,'keyboard walking');
await page.selectOption('#gender','e');assert.equal((await page.evaluate(()=>previewWorld.snapshot())).gender,'e');await page.selectOption('#gender','');assert.equal((await page.evaluate(()=>previewWorld.snapshot())).gender,null);
// Pointer drag on the rendered joystick must move the real 3D character.
const j=await page.locator('.rx-joystick').boundingBox();const pos=await page.evaluate(()=>previewWorld.snapshot());await page.mouse.move(j.x+j.width/2,j.y+j.height/2);await page.mouse.down();await page.mouse.move(j.x+j.width/2+25,j.y+j.height/2);await page.waitForTimeout(450);await page.mouse.up();assert((await page.evaluate(()=>previewWorld.snapshot())).x>pos.x+.1,'pointer walking');const released=await page.evaluate(()=>previewWorld.snapshot());await page.waitForTimeout(200);assert(Math.abs((await page.evaluate(()=>previewWorld.snapshot())).x-released.x)<.02,'stops after release');
await page.locator('.rx-skip').click();assert((await page.locator('#message').textContent()).startsWith('8. bölüm'));
if(width===360&&theme==='school'){
 // Walk to the off-path corner using real key events; never teleport the player.
 await page.locator('.rx-world canvas').focus();const held=new Set();for(let attempt=0;attempt<150;attempt++){
  const p=await page.evaluate(()=>previewWorld.snapshot()),wx=-4.8-p.x,wz=4-p.z;if(Math.hypot(wx,wz)<.5)break;
  const sx=.86*wx-.51*wz,sy=.51*wx+.86*wz,wanted=new Set();
  if(Math.abs(sx)>.12)wanted.add(sx<0?'ArrowLeft':'ArrowRight');if(Math.abs(sy)>.12)wanted.add(sy<0?'ArrowUp':'ArrowDown');
  for(const k of held)if(!wanted.has(k)){await page.keyboard.up(k);held.delete(k);}for(const k of wanted)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}await page.waitForTimeout(80);
 }
 for(const k of held)await page.keyboard.up(k);
 await page.waitForFunction(()=>previewWorld.snapshot().claims.includes(0));
 await page.selectOption('#theme','learning');await page.selectOption('#theme','school');await page.waitForFunction(()=>previewWorld.snapshot().claims.includes(0));
 assert.equal((await page.locator('.rx-count').textContent()).includes('1 / 4'),true,'claimed bonus stays hidden on remount');
}

}
assert.deepEqual(errors,[]);console.log('PASS '+width+'x'+height+' both themes, genders, keyboard and pointer, release, skip, no overflow or JS errors');}
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exit(1)});
