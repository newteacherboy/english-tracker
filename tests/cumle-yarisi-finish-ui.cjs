'use strict';
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../ingilizce');
const code=fs.readFileSync(path.join(base,'cumle-yarisi.js'),'utf8'),css=fs.readFileSync(path.join(base,'cumle-yarisi.css'),'utf8');
const words=Array.from({length:30},(_,i)=>({ingilizce:'item'+i,turkce:'anlam '+i,sinif:5,unite:i<15?1:2}));
async function choose(page,team,correct){
 const panel=page.locator('[data-side="'+team+'"]'),prompt=await panel.locator('.dm-sr-question p').innerText();
 const w=words.find(x=>prompt.includes('“'+x.turkce+'”'));
 assert(w,'Question must be grounded in selected word bank: '+prompt);
 const options=panel.locator('[data-answer]'),idx=await options.evaluateAll((buttons,{ans,correct})=>buttons.findIndex(b=>correct?b.textContent===ans:b.textContent!==ans),{ans:w.ingilizce,correct});
 assert(idx>=0,'an answer option must exist');
 await options.nth(idx).click();
}
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.route('https://games.test/games-assets/cumle-yarisi-cover.svg',route=>route.fulfill({contentType:'image/svg+xml',body:fs.readFileSync(path.join(base,'games-assets/cumle-yarisi-cover.svg'),'utf8')}));
  await page.setContent('<!doctype html><html lang="tr"><head><base href="https://games.test/"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><button id="open">Oyunu Aç</button></body></html>');
  await page.evaluate(w=>{
    window.masterKelimeHavuzu=w;window.__toneStarts=0;
    window.AudioContext=class {
      constructor(){this.currentTime=0;this.state='running';this.destination={};}
      createOscillator(){return {type:'sine',frequency:{setValueAtTime(){}},connect(){},start(){window.__toneStarts++},stop(){}};}
      createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
      createStereoPanner(){return {pan:{value:0},connect(){}};}
    };
  },words);
  await page.addStyleTag({content:css});await page.addScriptTag({content:code});
  await page.locator('#open').evaluate(b=>b.onclick=()=>window.dmSentenceRace.open());
  await page.locator('#open').click();await page.locator('[data-start]').click();
  for(let i=0;i<12;i++){
    await choose(page,0,true);
    await choose(page,1,false);
    if(i<11)await page.waitForFunction(n=>document.querySelector('[data-side="0"] .dm-sr-side-meta')?.textContent.includes('Soru '+n+' / 12')&&document.querySelector('[data-side="1"] .dm-sr-side-meta')?.textContent.includes('Soru '+n+' / 12'),i+2,{timeout:3000});
  }
  await page.locator('.dm-sr-finishing').waitFor({state:'attached',timeout:3200});
  assert.equal(await page.locator('[data-finish-banner]').isVisible(),true,'show finishing banner before final scoreboard');
  let positions=await page.locator('.dm-sr-track-line').evaluateAll(lines=>lines.map(line=>({track:line.clientWidth,car:line.querySelector('.dm-sr-car').offsetWidth,position:parseFloat(line.querySelector('.dm-sr-car').style.left)})));
  assert(Math.abs(positions[0].position-(positions[0].track-positions[0].car))<=2,'Winning red car must reach the finish line');
  assert(positions[1].position<positions[0].position,'Losing blue car should be visibly behind');
  await page.locator('.dm-sr-final h2').waitFor({timeout:3200});
  assert.match(await page.locator('.dm-sr-final h2').innerText(),/Kırmızı Takım Kazandı/);
  assert((await page.evaluate(()=>window.__toneStarts))>0,'correct and wrong audible feedback must trigger oscillators');
  await page.locator('[data-again]').click();
  assert.equal(await page.locator('[data-start]').isVisible(),true);
  await page.locator('[data-close]').first().click();
  assert.equal(await page.locator('.dm-sr-overlay').count(),0);
  console.log('PASS full 12-round red win: audible feedback, scoreboard, finishing animation, finish line and replay');
  await page.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});