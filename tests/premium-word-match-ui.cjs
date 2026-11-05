// Premium Kelime Eşleştirme: deneme hakkı penceresi, harita, bölüm kartı, oyun, kazanma ve "Premium yakında" akışı (telefon boyutu).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const base=path.resolve(__dirname,'../ingilizce');
const words=[['book','kitap'],['apple','elma'],['house','ev'],['cat','kedi'],['school','okul'],['dog','köpek'],['water','su'],['tree','ağaç'],['sun','güneş'],['milk','süt']].map(([e,t])=>({ingilizce:e,turkce:t,sinif:5,unite:1}));
(async()=>{
for(const engine of (process.env.PWM_ENGINES||'chromium').split(',')){
 const browser=await pw[engine].launch();const ctx=await browser.newContext({viewport:{width:390,height:664},deviceScaleFactor:1,hasTouch:false});const page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const st={ok:true,premium:false,freeUsed:0,remaining:3,level:1,stars:{},boosters:{karistir:1,degistir:1,satir:1,renk:1},energy:40,energyMax:50,gold:500};const calls=[];
 await page.route('**/functions/v1/premium-games',async r=>{const b=JSON.parse(r.request().postData());calls.push(b.op);let d={...st};
  if(b.op==='start'){if(st.remaining<=0)return r.fulfill({status:400,json:{ok:false,mesaj:'Ücretsiz 3 oyun hakkın bitti.',hata:'hak'}});st.freeUsed++;st.remaining=3-st.freeUsed;st.energy-=5;d={...st,runId:b.runId};}
  if(b.op==='finish'){assert.equal(typeof b.won,'boolean');if(b.won){st.stars[st.level]=3;st.level++;}d={...st,won:b.won,stars:3,xp:b.won?20:10,gold:b.won?5:2};}
  if(b.op==='use'){st.boosters[b.kind]--;d={...st};}
  return r.fulfill({json:d});});
 await page.route('https://pwm.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);if(file)return r.fulfill({path:path.join(base,decodeURIComponent(file))});
  return r.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script>var aktifOgrenciAdi='deneme';var apiURL='https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api';localStorage.setItem('ing_token','x'.repeat(40));window.masterKelimeHavuzu=${JSON.stringify(words)};</script><script src="premium-word-match.js"></script></body></html>`});});
 await page.goto('https://pwm.test/');
 await page.evaluate(()=>window.premiumKelimeEslestirmeAc());
 await page.waitForSelector('.pwm-modal.trial');
 assert.match(await page.textContent('.pwm-modal.trial'),/3 seferlik ücretsiz/);
 await page.click('.pwm-modal.trial .pwm-btn');
 assert.equal(await page.locator('.pwm-lv').count(),20);
 await page.click('[data-play]');await page.waitForSelector('.pwm-modal.level .pwm-words li');
 assert.equal(await page.locator('.pwm-words li').count(),5,'Seviye 1: 5 kelime');
 await page.click('[data-go]');await page.waitForSelector('.pwm-game canvas');await page.waitForTimeout(500);
 const box=await page.locator('.pwm-board canvas').boundingBox();
 assert(box.width>=330,'tahta telefonda geniş olmalı: '+box.width);
 const vp=page.viewportSize();assert(box.y+box.height<=vp.height,'tahta ekrana sığmalı');
 assert.equal(await page.evaluate(()=>window.dmPwm.state().cols),5);
 const drag=async([a,b])=>{const c=box.width/5;await page.mouse.move(box.x+(a[1]+.5)*c,box.y+(a[0]+.5)*c);await page.mouse.down();await page.mouse.move(box.x+(b[1]+.5)*c,box.y+(b[0]+.5)*c,{steps:4});await page.mouse.up();};
 const m0=await page.evaluate(()=>window.dmPwm.state().moves);
 await drag(await page.evaluate(()=>window.dmPwm.hint()));await page.waitForTimeout(1800);
 assert.equal(await page.evaluate(()=>window.dmPwm.state().moves),m0-1,'geçerli hamle 1 hamle harcar');
 assert(Number((await page.textContent('[data-score]')).replace(/\D/g,''))>0,'puan artmalı');
 await page.evaluate(()=>window.dmPwm.state().goals.forEach(g=>g.have=g.need));
 await drag(await page.evaluate(()=>window.dmPwm.hint()));
 await page.waitForSelector('.pwm-modal.result [data-next]',{timeout:25000});
 assert.match(await page.textContent('.pwm-modal.result'),/\+20/);
 assert(calls.includes('finish'));
 await page.click('[data-map]');
 st.remaining=0;st.freeUsed=3;
 await page.click('[data-play]');await page.click('[data-go]');await page.waitForSelector('.pwm-modal.soon');
 assert.match(await page.textContent('.pwm-modal.soon'),/Premium çok yakında/);
 await page.click('.pwm-modal.soon .pwm-btn');assert.equal(await page.locator('#pwmRoot').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS premium word match UI',engine);
 await browser.close();
}
})().catch(e=>{console.error(e);process.exit(1);});
