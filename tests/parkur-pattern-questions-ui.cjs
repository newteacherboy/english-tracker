// Kalıp durağı soru ekranları: kalıbı tanıtma, boşluğun gerçek yeri, Papi'nin hatası,
// ve çeldiricilerin hep tam cümle olması (doğru cevap "tek uzun olan" diye bulunamaz).
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const fits=(box,size)=>box&&box.x>=-0.5&&box.y>=-0.5&&box.x+box.width<=size.width+0.5;
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 for(const size of [{width:375,height:667},{width:1024,height:768}]){
  const page=await browser.newPage({viewport:size,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=new URL(route.request().url());
   const file=path.join(process.cwd(),'ingilizce',u.pathname.slice(1));
   if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({path:file});
   return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/parkur-purple.css"><link rel="stylesheet" href="/route-questions.css"><body><div id="bzAlan" class="ds-task"></div></body>'});});
  await page.goto('https://papi.test/');
  await page.addScriptTag({url:'/route-questions.js'});
  await page.evaluate(()=>{
   window.__answers=[];window.__spoken=[];
   window.speechSynthesis={speak(){},cancel(){}};
   window.__pool=[{en:'pencil',tr:'kalem'},{en:'book',tr:'kitap'},{en:'ruler',tr:'cetvel'},{en:'bag',tr:'çanta'}];
   window.__ctx=extra=>({en:w=>w&&w.en||'',tr:w=>w&&w.tr||'',pool:window.__pool,targetPool:window.__pool,
    shuffle:a=>a.slice(),speak:v=>window.__spoken.push(v),
    answer:(good,expected,actual)=>window.__answers.push({good,expected,actual}),
    record:()=>{},feedback:()=>{},current:()=>true,...extra});
   window.__render=(task)=>{const area=document.getElementById('bzAlan');area.innerHTML='';
    const ok=window.DMRouteQuestions.renderTask(task,area,window.__ctx());return ok;};
  });

  const kalip={sablon:'Say ..., please.',sablonTr:'Lütfen ... de.',cumle:'Say hello, please.',
   cumleTr:'Lütfen merhaba de.',not:'Bir sözü söylemesini isterken.',kelime:'hello',kelimeTr:'merhaba'};

  // 1) Kalıbı tanıtma ekranı
  assert.equal(await page.evaluate(k=>window.__render({tip:'patternTeach',k:{en:'hello',tr:'merhaba'},kalip:k}),kalip),true,'patternTeach render edilmeli');
  const kart=page.locator('.rq-pattern-card');await kart.waitFor();
  assert.match(await page.locator('.rq-pattern-shape').innerText(),/Say\s+___\s*,\s*please\./,'boşluk kalıpta işaretli');
  assert.equal(await page.locator('.rq-pattern-shape b').count(),1,'boşluk kalın gösterilir');
  assert.match(await page.locator('.rq-pattern-note').innerText(),/söylemesini isterken/,'kullanım açıklaması görünür');
  assert.match(await page.locator('.rq-pattern-example').innerText(),/Say hello, please\./,'örnek doldurulmuş cümle');
  assert(fits(await kart.boundingBox(),size),'tanıtma kartı ekrana sığar');
  await page.screenshot({path:'/tmp/kalip-tanitma-'+size.width+'.png'});
  await page.locator('.dm-school-start-questions').click();
  assert.deepEqual(await page.evaluate(()=>window.__answers),[{good:true,expected:'Kalıbı öğrendin',actual:true}],'tanıtım onay olarak gönderilir');

  // 2) Boşluk ortadaysa orada gösterilir; "son kelime" varsayımı yanlıştı
  await page.evaluate(()=>{window.__answers=[];});
  await page.evaluate(k=>window.__render({tip:'patternComplete',k:{en:'hello',tr:'merhaba'},kalip:k}),kalip);
  assert.match(await page.locator('.bz-soru').innerText(),/Say\s+___\s*,\s*please\./,'boşluk ortada kalır');
  const secenekler=await page.locator('.bz-secenekler button').allInnerTexts();
  assert.equal(secenekler.length,3);assert.ok(secenekler.includes('hello'),'doğru kelime seçenekte');
  assert.ok(secenekler.every(x=>!x.includes(' ')),'kelime durağı çeldiricileri tek kelime');
  await page.locator('.bz-secenekler button',{hasText:/^hello$/}).click();
  const cevap=(await page.evaluate(()=>window.__answers))[0];
  assert.deepEqual(cevap,{good:true,expected:'hello',actual:'hello'},'sunucunun beklediği cevap kelimenin kendisi');

  // 3) Papi'nin hatası: üç cümle, biri doğru
  await page.evaluate(()=>{window.__answers=[];});
  const bozukKalip={...kalip,cumle:'The book is red.',cumleTr:'Kitap kırmızı.',sablon:'The ... is red.',kelime:'book'};
  await page.evaluate(k=>window.__render({tip:'hata',k:{en:'book',tr:'kitap'},kalip:k}),bozukKalip);
  const hataSecenek=await page.locator('.bz-secenekler button').allInnerTexts();
  assert.equal(hataSecenek.length,3,'üç cümle sunulur');
  assert.ok(hataSecenek.includes('The book is red.'),'doğru cümle aralarında');
  assert.equal(new Set(hataSecenek).size,3,'üç cümle birbirinden farklı');
  assert.ok(hataSecenek.every(x=>x.trim().split(/\s+/).length>2),'hepsi tam cümle');
  await page.locator('.bz-secenekler button',{hasText:'The book is red.'}).click();
  assert.equal((await page.evaluate(()=>window.__answers))[0].good,true,'doğru cümle kabul edilir');

  // 4) Çeldiriciler aynı kalıbın başka doldurulmuşları olur
  await page.evaluate(()=>{window.__answers=[];});
  await page.evaluate(k=>window.__render({tip:'patternTranslate',k:{en:'hello',tr:'merhaba'},kalip:k}),bozukKalip);
  const ceviri=await page.locator('.bz-secenekler button').allInnerTexts();
  assert.ok(ceviri.length>=2,'birden çok seçenek');
  assert.ok(ceviri.every(x=>/is red\.?$/.test(x.trim())),'tümü aynı kalıptan: '+JSON.stringify(ceviri));
  assert.ok(ceviri.includes('The book is red.'));

  await page.evaluate(()=>{window.__answers=[];});
  await page.evaluate(k=>window.__render({tip:'patternListen',k:{en:'book',tr:'kitap'},kalip:k}),bozukKalip);
  const dinle=await page.locator('.bz-secenekler button').allInnerTexts();
  assert.ok(dinle.every(x=>/is red\.?$/.test(x.trim())),'dinleme çeldiricileri de tam cümle');

  // 5) Kelime durağı davranışı değişmemiş olmalı (kalip yok -> havuzdan ifade arar)
  await page.evaluate(()=>{window.__answers=[];});
  const kelimeOk=await page.evaluate(()=>window.__render({tip:'patternComplete',k:{en:'pencil',tr:'kalem'}}));
  assert.equal(kelimeOk,true,'kalıpsız patternComplete eski yoluyla çalışır');
  assert.ok((await page.locator('.bz-soru').innerText()).includes('___'),'eski yolda da boşluk var');

  assert.deepEqual(errors,[],'sayfa hatası yok');
  await page.close();
 }
 await browser.close();console.log('PASS parkur-pattern-questions-ui');
})().catch(e=>{console.error(e);console.log('::error title=parkur-pattern-questions-ui::'+String(e&&e.stack||e).slice(0,900).replace(/%/g,'%25').replace(/\n/g,'%0A'));process.exit(1);});
