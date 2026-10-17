const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
// The production entry must load a single guide after member experience.
const entry=fs.readFileSync(path.resolve('ingilizce/index.html'),'utf8');
assert.match(entry,/member-experience\.js[^\n]*[\s\S]*email-guide\.js/);
assert.equal((entry.match(/<script[^>]+src="email-guide\.js/g)||[]).length,1);
assert(!fs.readFileSync(path.resolve('ingilizce/member-experience.js'),'utf8').includes('dm-email-guide-loader'));
(async()=>{
 const browser=await chromium.launch({headless:true});
 const root=path.resolve('ingilizce'),errors=[];
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
 const page=await context.newPage(),requests=[];
 let emailVerified=false;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/api'){
   const b=JSON.parse(route.request().postData()||'{}');requests.push(b.islem);
   const d=b.islem==='memberStatus'?{ok:true,emailVerified,email:'veli@example.test'}:
    b.islem==='memberEmailResend'?{ok:true,mesaj:'Bağlantı yeniden gönderildi.'}:
    b.islem==='kayitOl'?{ok:true,status:'success',token:'fixture-session',ogrenci:'Fixture'}:{ok:true};
   return route.fulfill({status:200,contentType:'application/json; charset=utf-8',body:JSON.stringify(d)});
  }
  const file=path.join(root,u.pathname.replace(/^\//,''));
  if(fs.existsSync(file)&&fs.statSync(file).isFile())
   return route.fulfill({path:file,contentType:file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':undefined});
  return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="tr"><meta charset="utf-8"><body></body></html>'});
 });
 await page.goto('https://guide.test/');
 await page.setContent('<div id="tab-profil"><div class="pr-kap"></div></div><div id="yardimModal"><div class="yardim-topbar"></div></div><div id="panel-alani" style="display:block"></div>');
 await page.evaluate(()=>{
  window.apiURL='/api';window.kisiselBilgilerAc=()=>window.emailEditorOpened=true;
  window.yardimKapat=()=>window.helpClosed=true;
  window.dmMemberBadgeStatus={owner:'Fixture',emailVerified:false,email:'veli@example.test'};
  localStorage.setItem('ing_token','fixture-session');
  localStorage.setItem('ing_oturumAcik','true');
  localStorage.setItem('ing_aktifOgrenci','Fixture');
 });
 await page.addScriptTag({url:'/email-guide.js'});
 await page.waitForFunction(()=>!!window.dmEmailGuide);
 await page.waitForSelector('#dmEmailSecurityCard');
 assert(await page.locator('#dmEmailSecurityCard').getByText('E-posta doğrulama yardımını aç').isVisible());
 await page.locator('#dmEmailSecurityCard').getByText('E-posta doğrulama yardımını aç').click();
 assert(await page.locator('#dmEmailGuide').isVisible());
 await page.getByRole('button',{name:'Gmail',exact:false}).first().click();
 assert.equal(await page.locator('#dmEmailGuide .deg-progress .active').count(),1);
 assert.equal(await page.locator('#dmEmailGuide .deg-count').textContent(),'1');
 assert(await page.locator('#dmEmailGuide .deg-phone').isVisible());
 for(let i=2;i<=5;i++){
  await page.locator('#dmEmailGuide [data-eg-next]').click();
  assert.equal(await page.locator('#dmEmailGuide .deg-count').textContent(),String(i));
 }
 await page.locator('#dmEmailGuide [data-eg-prev]').click();
 assert.equal(await page.locator('#dmEmailGuide .deg-count').textContent(),'4');
 await page.locator('#dmEmailGuide [data-eg-resend]').click();
 await page.waitForFunction(()=>document.querySelector('#dmEmailGuide [data-eg-status]')?.textContent.includes('yeniden gönderildi'));
 assert(requests.includes('memberEmailResend'));
 await page.locator('#dmEmailGuide [data-eg-back]').click();
 await page.locator('#dmEmailGuide [data-eg-provider=outlook]').click();
 assert((await page.locator('#dmEmailGuide .deg-track h2').textContent()).includes('Outlook'));
 await page.locator('#dmEmailGuide [data-eg-back]').click();
 await page.locator('#dmEmailGuide [data-eg-provider=other]').click();
 assert((await page.locator('#dmEmailGuide .deg-track h2').textContent()).includes('Diğer'));
 await page.locator('#dmEmailGuide [data-eg-back]').click();
 await page.locator('#dmEmailGuide [data-eg-change]').click();
 assert(await page.evaluate(()=>window.emailEditorOpened));
 assert.equal(await page.locator('#dmEmailGuide').count(),0);
 await page.locator('#dmEmailGuideHelpEntry').click();
 assert(await page.evaluate(()=>window.helpClosed));
 assert(await page.locator('#dmEmailGuide').isVisible());
 // Accessible close button, close overlay; no keyboard trap after dismissal.
 await page.locator('#dmEmailGuide .deg-close').click();
 assert.equal(await page.locator('#dmEmailGuide').count(),0);
 // Successful first registration is the only path that automatically opens the guide.
 await page.evaluate(()=>fetch('/api',{method:'POST',body:JSON.stringify({islem:'kayitOl'})}));
 await page.waitForSelector('#dmEmailGuide',{timeout:8500});
 assert((await page.locator('#dmEmailGuide [data-eg-status]').textContent()).includes('Kayıt tamamlandı'));
 await page.locator('#dmEmailGuide [data-eg-later]').click();
 // A server-confirmed verification disables the guide and shows verified profile status.
 emailVerified=true;
 await page.evaluate(()=>window.dmEmailGuide.open('help'));
 await page.locator('#dmEmailGuide [data-eg-provider=gmail]').click();
 for(let i=0;i<4;i++)await page.locator('#dmEmailGuide [data-eg-next]').click();
 await page.locator('#dmEmailGuide [data-eg-next]').click();
 await page.waitForFunction(()=>!document.querySelector('#dmEmailGuide'));
 await page.evaluate(()=>{window.dmMemberBadgeStatus={owner:'Fixture',emailVerified:true};window.dmEmailGuide.profileCard();});
 assert((await page.locator('#dmEmailSecurityCard').textContent()).includes('doğrulandı'));
 assert.equal(await page.locator('#dmEmailSecurityCard button').count(),0);
 assert.deepEqual(errors,[]);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
 assert.equal(overflow,false,'390 px main page must not scroll sideways');
 await browser.close();
 console.log('PASS Gmail/Outlook/other illustrated steps, resend, account edit, help, signup prompt, verified state and mobile width');
})().catch(e=>{console.error(e);process.exit(1)});
