const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.RALLY_CHROMIUM||'/tmp/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('https://branch.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));
  await page.goto('https://branch.test/');
  await page.evaluate(()=>{window.dmDiscoveryContext={raw:localStorage,session:sessionStorage,welcome:true,member:false,request:async()=>({})};});
  await page.addScriptTag({content:fs.readFileSync('ingilizce/first-discovery.js','utf8')});
  await page.evaluate(()=>window.dmFirstDiscovery.openRegistration());
  await page.getByText('İngilizce Öğretmeniyim',{exact:true}).click();
  await page.getByRole('heading',{name:'İngilizce Öğretmeni Kaydı'}).waitFor();
  const checkbox=page.locator('[data-field="englishTeacher"]');
  assert.equal(await checkbox.isChecked(),false);
  assert.equal(await checkbox.getAttribute('required'),'');
  await page.getByRole('button',{name:'Farklı bir branştayım'}).click();
  await page.getByRole('heading',{name:'Hesabını oluştur'}).waitFor();
  assert.equal(await checkbox.count(),0);assert.equal(page.url(),'https://branch.test/');
  console.log('PASS teacher signup checkbox and other branch switches to learner registration without reload');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
