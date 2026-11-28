const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RALLY_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[390,844],[768,1024],[1440,900]]){
   const page=await browser.newPage({viewport:{width,height}});
   let branch='pending',state='approved',err=false,statusCalls=0;
   await page.route('https://branch.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body><div class="rt-medal-route">Parkur</div><div id="tab-dunya"><div class="rt-medal-unit"></div></div></body>'}));
   await page.route('https://*.supabase.co/**',async r=>{
    const b=r.request().postDataJSON();let data={ok:true};let status=200;
    if(b.islem==='teacherPortalStatus'){statusCalls++;data=b.t==='normal-student-token'?{ok:true,teacherAccount:false,state:'none'}:{ok:true,teacherAccount:branch!=='other',branchStatus:branch,state,codeReady:true};}
    if(b.islem==='teacherPortalBranchDeclare'){if(err){status=503;data={ok:false,mesaj:'Bağlantı kesildi'};}else{branch=b.choice;data={ok:true,teacherAccount:branch!=='other',branchStatus:branch,state};}}
    if(b.islem==='memberStatus')data={ok:true,emailVerified:true};
    await r.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});
   });
   await page.goto('https://branch.test/');
   await page.evaluate(()=>localStorage.setItem('ing_token','synthetic-personal-token'));
   await page.addScriptTag({content:fs.readFileSync('ingilizce/teacher-portal-boot.js','utf8')});
   await page.addScriptTag({content:fs.readFileSync('ingilizce/teacher-portal.js','utf8')});
   const dialog=page.locator('#dmTeacherBranchDialog');
   await dialog.waitFor({state:'visible',timeout:8000});
   assert.equal(await page.locator('#dmTeacherParkurSwitch').count(),1);
   await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),true);
   await dialog.getByRole('button',{name:'Daha sonra'}).click();assert.equal(await dialog.count(),0);
   await page.locator('#dmTeacherParkurSwitch').click();await dialog.waitFor();
   await dialog.getByRole('button',{name:'Farklı bir branştayım'}).click();
   await dialog.getByRole('button',{name:'Geri dön'}).click();
   await dialog.getByRole('button',{name:'Farklı bir branştayım'}).click();
   err=true;await dialog.getByRole('button',{name:'Kişisel hesabımla devam et'}).click();
   await dialog.getByText('Bağlantı kesildi').waitFor();assert.equal(branch,'pending');
   err=false;await dialog.getByRole('button',{name:'Kişisel hesabımla devam et'}).click();
   await dialog.waitFor({state:'detached'});assert.equal(branch,'other');
   assert.equal(await page.locator('#dmTeacherParkurSwitch').count(),0);
   assert.equal(await page.evaluate(()=>window.dmTeacherSwitch.available()),false);
   assert.equal(await page.evaluate(()=>localStorage.getItem('ing_token')),'synthetic-personal-token');
   assert.equal(statusCalls,1);
   // Another device loads the persisted server declaration, not localStorage.
   await page.reload();await page.evaluate(()=>localStorage.setItem('ing_token','synthetic-personal-token'));
   await page.addScriptTag({content:fs.readFileSync('ingilizce/teacher-portal-boot.js','utf8')});await page.addScriptTag({content:fs.readFileSync('ingilizce/teacher-portal.js','utf8')});
   await page.waitForTimeout(3000);assert.equal(await dialog.count(),0);assert.equal(await page.evaluate(()=>window.dmTeacherSwitch.available()),false);
   // Independent student does not inherit a previous teacher's status.
   await page.evaluate(()=>{localStorage.setItem('ing_token','normal-student-token');document.dispatchEvent(new Event('dm:login'));});
   await page.waitForTimeout(3000);assert.equal(await dialog.count(),0);assert.equal(await page.evaluate(()=>window.dmTeacherSwitch.available()),false);
   // An unconfirmed English teacher keeps both shortcuts after declaring.
   branch='pending';state='pending';await page.evaluate(()=>{localStorage.setItem('ing_token','another-synthetic-teacher-token');document.dispatchEvent(new Event('dm:login'));});
   await dialog.waitFor();await dialog.getByRole('button',{name:'İngilizce öğretmeniyim'}).click();
   await dialog.waitFor({state:'detached'});assert.equal(branch,'english');assert.equal(await page.evaluate(()=>window.dmTeacherSwitch.available()),true);assert.equal(await page.locator('#dmTeacherParkurSwitch').count(),1);
   await page.close();console.log('PASS branch dialog, lossless personal switch, offline and profile availability',width,height);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
