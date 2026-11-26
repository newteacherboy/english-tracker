const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
const dir=fs.existsSync('ingilizce/parkur-live-papi.js')?'ingilizce':'.';
const js=fs.readFileSync(path.join(dir,'parkur-live-papi.js'),'utf8'),css=fs.readFileSync(path.join(dir,'parkur-v4.css'),'utf8'),campaign=fs.readFileSync(path.join(dir,'zirve-kampanya.js'),'utf8');
const badge=campaign.slice(campaign.indexOf('let parkurBusy = false;'),campaign.indexOf('function bannerHtml(s)'));
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.DIJI_CHROMIUM?{executablePath:process.env.DIJI_CHROMIUM,args:['--no-sandbox']}:{})});
 try{
 for(const width of [320,375,430,768]){
  const page=await browser.newPage({viewport:{width,height:820}});
  await page.setContent('<html data-dm-theme="day"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="tab-dunya" class="active"><div class="rt-medal-route"><div class="rt-medal-header"><div class="rt-medal-unit">Okul Yolum</div><details class="rt-agenda"><summary><svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14"/></svg>Ajandam</summary><div class="rt-agenda-actions"><button>Plan</button></div></details></div><div class="rt-medal-scroll"><div class="rt-medal-world">Family Life &amp; Home</div></div></div></div></body></html>');
  await page.addStyleTag({content:'body{margin:0}.rt-medal-route{display:flex;flex-direction:column;align-items:center;height:700px}.rt-medal-header,.rt-medal-scroll{width:min(100%,620px)}.rt-medal-header{flex:none}.rt-medal-unit{height:72px}.rt-medal-scroll{flex:1;overflow:auto}.rt-medal-world{min-height:600px}'+css});
  await page.addScriptTag({content:js});await page.locator('.rt-quick-actions .dm-papi-chat-shortcut').waitFor();
  await page.addScriptTag({content:"window.D=document;let layerRole='';window.dmPapiChat={open:()=>window.papiClicked=true};window.phase='live';const studentToken=()=> 'test-classroom-token';const status=async()=>({role:'student',guest:false,campaign:{phase:window.phase}});const isOn=()=>true;const openStudentHub=()=>window.contestClicked=true;"+badge+";window.mountParkurBadge=mountParkurBadge;"});
  await page.evaluate(()=>window.mountParkurBadge());
  const boxes=await page.locator('.rt-quick-actions').evaluate(el=>[...el.children].map(x=>{const b=x.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,cl:x.className}}));
  assert.equal(boxes.length,3);assert(boxes.every(b=>Math.abs(b.y-boxes[0].y)<2&&Math.abs(b.w-boxes[0].w)<2&&b.w>90&&b.h>=44));assert(boxes[0].x<boxes[1].x&&boxes[1].x<boxes[2].x);
  assert.equal(await page.locator('.rt-medal-route > .dm-papi-chat-shortcut,.rt-medal-route > .zk-parkur').count(),0);
  await page.locator('.rt-agenda summary').click();assert(await page.locator('.rt-agenda-actions').isVisible());await page.locator('.rt-agenda summary').click();
  await page.locator('.zk-parkur').click();await page.locator('.dm-papi-chat-shortcut').click();assert(await page.evaluate(()=>window.contestClicked&&window.papiClicked));
  await page.evaluate(()=>{window.phase='ended';document.querySelector('.zk-parkur').zkCheckedAt=0;return window.mountParkurBadge();});assert.equal(await page.locator('.zk-parkur').count(),0);
  const pair=await page.locator('.rt-quick-actions').evaluate(el=>[...el.children].map(x=>x.getBoundingClientRect().width));assert.equal(pair.length,2);assert(Math.abs(pair[0]-pair[1])<2);
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.rt-quick-spark').first().evaluate(x=>getComputedStyle(x).animationName),'none');
  await page.close();console.log('Quick actions OK:',width);
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
