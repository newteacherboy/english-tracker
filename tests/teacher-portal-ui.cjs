const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=path.resolve('.'),server=http.createServer((req,res)=>{let file=path.resolve(base,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){res.writeHead(404).end();return;}const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.RALLY_CHROMIUM||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const [width,height] of [[390,844],[768,1024],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let loginCalls=0;
  await context.route('https://**/*',async route=>{const req=route.request(),u=new URL(req.url());if(!u.hostname.includes('supabase.co'))return route.abort();const b=JSON.parse(req.postData()||'{}'),actor=(b.t||u.searchParams.get('t'))==='alice-secret'?'Alice':'Önizleme · Öğretmen Denemesi a1b2c3d4',op=b.islem||u.searchParams.get('islem')||'';let d={ok:true};
   if(u.pathname.endsWith('/settings'))d={external:{google:false}};
   else if(op==='teacherPortalLogin'){assert.equal(b.code,'123456');loginCalls++;d={ok:true,token:'teacher-secret',name:'TeacherOne'};}
   else if(op==='teacherPortalParticipant'){assert.equal(b.t,'teacher-secret');d=b.preview?{ok:true,token:'preview-secret',name:'Önizleme · Öğretmen Denemesi a1b2c3d4',preview:true}:{ok:true,token:'alice-secret',name:'Alice',preview:false};}
   else if(op==='oturumBilgisi')d={ok:true,rol:'ogrenci',ogrenci:actor,expiresAt:'2099-01-01'};
   else if(op==='memberStatus')d={ok:true,emailVerified:true,hasPlacement:true};
   else if(op==='iletisimDurumu')d={ok:true,uyari:false,eksik:false};
   else if(op==='ogretmenBilgim')d={ok:true,kullanici:'TeacherOne',yonetici:false};
   else if(op==='teacherPortalStudents')d={ok:true,items:[{id:'alice',username:'Alice',class_no:2}]};
   else if(op==='seviyeDurumu')d={ok:true,level:40,yo:{totalXp:0,altin:0},studyAccess:{A1:true,A2:true,B1:true,B2:true},startPath:{maxGrade:8,maxCefr:'B2'},units:[],done:[]};
   else if(op==='ekVeriGetir')d={deger:JSON.stringify({totalXp:0,altin:0,dmLearningPurpose:'independent'})};
   else if(op==='enerjiDurumuGetir')d={enerjiKalan:30,enerjiMax:30};
   else if(op==='ekonomi')d={ok:true,ekonomi:{altin:0,enerji:30}};
   else if(!op)d=[{ogrenci:actor,Sinif:1,emailDogrulandi:true,puan:0}];
   else if(/Getir$/.test(op)||op==='dersKonulariGetir')d=[];
   else if(op==='companionSummary')d={ok:true,day:'2026-10-24',review:{due:0,total:0},dialogueIds:[]};
   return route.fulfill({json:d});});
  await page.addInitScript(()=>{window.__tpTestGame=()=>{document.documentElement.dataset.tpReplayed='yes';};});
  await page.goto(origin+'/ingilizce/',{waitUntil:'domcontentloaded'});
  const teacher=page.getByRole('button',{name:'Öğretmen Girişi',exact:true});await teacher.waitFor({state:'visible',timeout:20000});
  const box=await teacher.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=height,'teacher entry fits viewport');
  await page.getByRole('button',{name:'Öğrenci Girişi',exact:true}).waitFor();
  await page.screenshot({path:'/tmp/teacher-welcome-'+width+'.png'});await teacher.click();
  await page.locator('.tp-close').click();await teacher.waitFor({state:'visible'});
  await teacher.click();await page.keyboard.press('Escape');await teacher.waitFor({state:'visible'});await teacher.click();
  const dialog=page.locator('.tp-card');await dialog.getByLabel('Öğretmen giriş kodun').fill('123');await dialog.getByRole('button',{name:'Giriş Yap',exact:true}).click();assert.equal(loginCalls,0,'incomplete code cannot submit');
  await dialog.getByRole('button',{name:'Kodumu Unuttum'}).click();await page.getByLabel('Kayıtlı e-posta adresin').waitFor();await page.locator('.tp-close').click();await teacher.waitFor({state:'visible'});
  await page.evaluate(()=>{localStorage.setItem('ing_token','personal-secret');localStorage.setItem('ing_aktifOgrenci','PersonalOwner');localStorage.setItem('personal-wallet','unchanged');});
  await page.evaluate(()=>window.dmTeacherPortal.openLogin());await page.getByLabel('Öğretmen giriş kodun').fill('123456');await page.getByRole('button',{name:'Giriş Yap',exact:true}).click();await page.waitForURL('**/?ogretmen=1');
  await page.waitForFunction(()=>window.dmTeacherPortalMode===true);assert.equal(await page.evaluate(()=>localStorage.getItem('ing_token')),'preview-secret');
  const check=await context.newPage();await check.goto(origin+'/ingilizce/ogretmen-kod-yenile.html#token=x');assert.equal(await check.evaluate(()=>localStorage.getItem('ing_token')),'personal-secret');assert.equal(await check.evaluate(()=>localStorage.getItem('personal-wallet')),'unchanged');await check.close();
  await page.waitForFunction(()=>document.querySelectorAll('#bottomNavMobile .bn-item').length===4,{timeout:20000});
  const labels=await page.locator('#bottomNavMobile .bn-label').allTextContents();assert.deepEqual(labels,['Oyunlar','Ders Çalış','Profilim','Öğretmen Paneli']);
  await page.evaluate(()=>window.dmTeacherPortal.openProfile());await page.getByRole('button',{name:'Giriş Kodumu Değiştir',exact:true}).waitFor();assert.equal(await page.locator('[data-tp-manage]').count(),0,'ordinary teacher cannot see approvals');
  await page.screenshot({path:'/tmp/teacher-profile-'+width+'.png'});await page.locator('.tp-close').click();
  await page.evaluate(()=>{window.kelimeYarismasiAc();});await page.getByRole('heading',{name:'Bu oyunu kim oynayacak?'}).waitFor();await page.locator('.tp-close').click();
  await page.evaluate(()=>{window.dmTeacherPortal.beforeGame('__tpTestGame');});await page.getByLabel('Bağlı öğrencin').selectOption('alice');await page.getByRole('button',{name:'Bu öğrenciyle devam et'}).click();
  await page.waitForFunction(()=>document.documentElement.dataset.tpReplayed==='yes');assert.equal(await page.evaluate(()=>localStorage.getItem('ing_token')),'alice-secret');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('ing_ogr_token')),'teacher-secret');
  await page.evaluate(()=>window.dmTeacherPortal.openProfile());await page.getByRole('button',{name:'Kişisel Hesabıma Dön',exact:true}).click();await page.waitForURL(origin+'/ingilizce/');
  assert.equal(await page.evaluate(()=>localStorage.getItem('ing_token')),'personal-secret');assert.equal(await page.evaluate(()=>sessionStorage.getItem('dm_tp_session')),null);
  assert.equal(errors.filter(x=>/teacher-portal|beforeGame|dmTeacherPortal/.test(x)).length,0,errors.join('\n'));
  await context.close();console.log('PASS viewport '+width+'×'+height+' entry, numeric validation, reset, isolated session, 4 tabs, teacher profile');
 }}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exit(1)});
