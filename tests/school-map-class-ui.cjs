const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});try{
 const page=await browser.newPage({viewport:{width:820,height:1180}});await page.setContent('<html><body><main id="tab-dunya"><div id="dmParkurScroll"></div></main></body></html>');
 await page.evaluate(()=>{window.aktifOgrenciAdi='Six';window.yo={dmLearningPurpose:'school',dmSchoolStartGrade:1,altin:679,totalXp:17200};window.path=null;window.dmProgression={status:()=>({startPath:path}),refresh:async()=>{}};window.rows=Array.from({length:8},(_,g)=>Array.from({length:48},(_,i)=>({b:Math.floor(g/2),d:g%2*48+i,no:200000+(g+1)*10000+151+i,label:(g+1)+'. sınıf 1. ünite · '+(i+1)+'/48',done:g===0&&i<25,available:g<6}))).flat();window.dunyaAc=()=>{document.getElementById('dmParkurScroll').innerHTML=dmParkurSahne({steps:rows.slice(20,44),allSteps:rows,current:5});dmParkurMapMount(document.getElementById('dmParkurScroll'));};window.dmSchoolStopOpen=(b,d)=>window.opened={b,d};});
 await page.addScriptTag({content:fs.readFileSync('ingilizce/oyna-v2.js','utf8')});await page.evaluate(()=>dunyaAc());
 assert.match(await page.locator('.bi-progress b').innerText(),/1\. Sınıf/);
 await page.evaluate(()=>{window.path={legacy:true,mode:'open',startGrade:6,maxGrade:8,learningRoute:'open'};document.dispatchEvent(new CustomEvent('dm:progression-status',{detail:{owner:'Six',startPath:path}}));});
 await page.waitForFunction(()=>document.querySelector('.bi-progress b').textContent.startsWith('6. Sınıf'));
 await page.locator('.bi-continue').click();assert.deepEqual(await page.evaluate(()=>opened),{b:2,d:48});
 await page.evaluate(()=>dunyaAc());assert.match(await page.locator('.bi-progress b').innerText(),/6\. Sınıf/);assert.deepEqual(await page.evaluate(()=>[yo.altin,yo.totalXp,yo.dmSchoolStartGrade]),[679,17200,1]);
 console.log('PASS late server class, old viewport, stale saved class, route reopening and actual Continue target');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
