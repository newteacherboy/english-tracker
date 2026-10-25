'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const base=path.join(__dirname,'../ingilizce');
const js=fs.readFileSync(path.join(base,'cumle-yarisi.js'),'utf8');
const css=fs.readFileSync(path.join(base,'cumle-yarisi.css'),'utf8');
const words=Array.from({length:30},(_,i)=>({ingilizce:'item'+i,turkce:'anlam '+i,sinif:5,unite:i<15?1:2}));
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  for(const [width,height] of [[1440,900],[768,1024],[390,844]]){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   await page.setContent('<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><button id="open">Kapışma</button></body></html>');
   await page.evaluate(w=>{window.masterKelimeHavuzu=w;},words);
   await page.addStyleTag({content:css});
   await page.addScriptTag({content:js});
   await page.locator('#open').evaluate(el=>{el.onclick=()=>window.dmSentenceRace.open();});
   await page.locator('#open').click();
   assert(await page.locator('[data-start]').isEnabled(),'12 question start should be enabled at '+width);
   assert.equal(await page.locator('.dm-sr-hero img').getAttribute('src'),'games-assets/cumle-yarisi-cover.svg');
   const startBounds=await page.locator('[data-start]').boundingBox();
   assert(startBounds&&startBounds.y+startBounds.height<=height+1,'Start button does not fit viewport '+width+'x'+height);
   const setupFits=await page.locator('.dm-sr-setup').evaluate(el=>el.scrollHeight<=el.clientHeight+2);
   assert(setupFits,'Start screen requires full-page scrolling at '+width+'x'+height);
   assert.equal(await page.locator('[data-sound]').isChecked(),true);

   assert.equal(await page.locator('[data-class]').inputValue(),'5');
   await page.locator('[data-duration]').selectOption('15');
   await page.locator('[data-start]').click();
   assert.equal(await page.locator('.dm-sr-track .dm-sr-car').count(),2);
   assert.equal(await page.locator('.dm-sr-side').count(),2);
   assert.equal(await page.locator('.dm-sr-track .dm-sr-car svg').count(),2,'Vector race cars must exist');
   assert.equal(await page.locator('.dm-sr-side-red').count(),1);
   assert.equal(await page.locator('.dm-sr-side-blue').count(),1);
   assert.equal(await page.locator('[data-audio-toggle]').getAttribute('aria-pressed'),'true');

   let [left,right]=await Promise.all([page.locator('[data-side="0"] .dm-sr-question p').innerText(),page.locator('[data-side="1"] .dm-sr-question p').innerText()]);
   assert.notEqual(left,right,'Two panels must show different questions');
   const board=await page.locator('.dm-sr-shell').boundingBox();
   assert(board.x>=-1&&board.x+board.width<=width+1,'Board overflows horizontal viewport '+width);
   const answer=words.find(w=>left.includes('“'+w.turkce+'”'));
   assert(answer,'Question must be from selected class and units');
   const correct=answer.ingilizce;
   const leftButtons=page.locator('[data-side="0"] [data-answer]'),rightButtons=page.locator('[data-side="1"] [data-answer]');
   const correctIndex=await leftButtons.evaluateAll((els,answer)=>els.findIndex(el=>el.textContent===answer),correct);
   assert(correctIndex>=0);await leftButtons.nth(correctIndex).click();
   assert.match(await page.locator('[data-side="0"] [data-feedback]').innerText(),/\+.+puan/);
   assert(Number((await page.locator('[data-side="0"] [data-score]').innerText()).split(' ')[0])>=100);
   assert.equal(await page.locator('[data-car="0"]').evaluate(e=>parseFloat(e.style.left)>0),true);
   const rightPrompt=right;
   const other=words.find(w=>rightPrompt.includes('“'+w.turkce+'”'));
   const correctRight=other.ingilizce;
   const wrongIndex=await rightButtons.evaluateAll((els,answer)=>els.findIndex(el=>el.textContent!==answer),correctRight);
   assert(wrongIndex>=0);await rightButtons.nth(wrongIndex).click();
   assert.match(await page.locator('[data-side="1"] [data-feedback]').innerText(),/−40 puan/);
   assert.equal(await page.locator('[data-side="0"] [data-feedback]').evaluate(el=>el.classList.contains('right')),true);
   assert.equal(await page.locator('[data-side="1"] [data-feedback]').evaluate(el=>el.classList.contains('wrong')),true);
   await page.locator('[data-audio-toggle]').click();
   assert.equal(await page.locator('[data-audio-toggle]').getAttribute('aria-pressed'),'false');

   await page.waitForTimeout(1000);
   assert.match(await page.locator('[data-side="0"] .dm-sr-side-meta').innerText(),/Soru 2\s*\/\s*12/);
   assert.match(await page.locator('[data-side="1"] .dm-sr-side-meta').innerText(),/Soru 2\s*\/\s*12/);
   await page.locator('.dm-sr-game-meta [data-close]').click();
   assert.equal(await page.locator('.dm-sr-overlay').count(),0);
   console.log('PASS sentence race '+width+'x'+height+' two independent decks, clocks, scoring, viewport and close');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});