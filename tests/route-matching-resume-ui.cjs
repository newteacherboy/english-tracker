const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const base=path.join(__dirname,'../ingilizce'),html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 const render=html.slice(html.indexOf('  function eslestir(s,alan) {'),html.indexOf('  function duydugunuBul(s,alan) {'));
 const exe=process.env.FRIENDS_BROWSER_PATH,browser=await chromium.launch({executablePath:exe||undefined,args:['--no-sandbox','--no-zygote','--single-process','--use-gl=angle','--use-angle=swiftshader'],env:{...process.env,LD_LIBRARY_PATH:exe?path.dirname(exe):process.env.LD_LIBRARY_PATH||''}}),page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.fulfill({body:''}));await page.goto('https://matching.test/');await page.setContent('<div id="area"></div>');
 await page.addScriptTag({content:fs.readFileSync(path.join(base,'route-questions.js'),'utf8')});
 await page.addScriptTag({content:`const EN=w=>w.en,TR=w=>w.tr,karistir=a=>a.slice().reverse(),isim=()=> 'learner';let saved;const checkpointSave=()=>{saved=JSON.stringify({O,s})},cevap=()=>{},target={en:'apple',tr:'elma'};let O={owner:'learner',tum:[target,...Array.from({length:9},(_,i)=>({en:'word '+i,tr:'kelime '+i}))]},s={k:target};${render};window.draw=()=>eslestir(s,document.getElementById('area'));window.restore=()=>{const state=JSON.parse(saved);O=state.O;s=state.s;draw()};window.next=()=>{O.matchState=null;s={k:target};draw()};`});
 await page.evaluate(()=>draw());const first=await page.locator('#bzMatchEn button').allTextContents(),right=await page.locator('#bzMatchTr button').allTextContents();
 await page.getByRole('button',{name:'apple',exact:true}).click();await page.getByRole('button',{name:'elma',exact:true}).click();await page.evaluate(()=>restore());
 assert.deepEqual(await page.locator('#bzMatchEn button').allTextContents(),first);assert.deepEqual(await page.locator('#bzMatchTr button').allTextContents(),right);assert(await page.getByRole('button',{name:'apple',exact:true}).isDisabled());assert(await page.getByRole('button',{name:'elma',exact:true}).isDisabled());
 await page.evaluate(()=>next());const second=await page.locator('#bzMatchEn button').allTextContents();assert.equal(second[0],'apple');assert(second.slice(1).every(w=>!first.includes(w)));assert.deepEqual(errors,[]);await browser.close();console.log('PASS matched pair and column order survive checkpoint restore; next stop has different supporting words');
})().catch(e=>{console.error(e);process.exit(1)});
