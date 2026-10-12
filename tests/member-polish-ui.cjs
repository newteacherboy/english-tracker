const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']}),page=await browser.newPage(),root=path.resolve('ingilizce'),html=fs.readFileSync(root+'/index.html','utf8'),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://test.local/**',route=>{const f=path.join(root,new URL(route.request().url()).pathname.slice(1));return fs.existsSync(f)?route.fulfill({path:f}):route.fulfill({body:''});});
 const start=html.indexOf('        let boslukRound=null;'),end=html.indexOf('        async function boslukOyunuBitir(',start),letters=html.slice(start,end);
 const ms=html.indexOf('                let hafizaSeciliAcik ='),me=html.indexOf('                async function hafizaOyunuBitir()',ms),memory=html.slice(ms,me);
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:844});
  await page.route('https://test.local/',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta charset="utf-8"><link rel="stylesheet" href="/papi-wallet.css"><link rel="stylesheet" href="/member-polish.css"></head><body style="margin:0"><div id="panel-alani" style="display:block"><div id="tab-dunya" style="width:100%;box-sizing:border-box"></div></div><div id="boslukOyunEkrani" style="display:block"><button class="btn-giris"></button><div id="boslukSayacInfo"></div><div id="boslukSatirlarContainer"></div></div><div id="hafizaOyunEkrani" style="display:block"><div id="hafizaKartGrid"></div><span id="hafizaHamleInfo"></span><span id="hafizaKalanInfo"></span></div></body></html>'}));
  await page.goto('https://test.local/');
  await page.addScriptTag({content:'var aktifOgrenciAdi="ui-test",yo={altin:1000,totalXp:1234567},boslukAktifKelimeler=["INTERNATIONALLY","BOOK","APPLE","ELEPHANT","SCHOOL","PENCIL","AFTERNOON","CHAIR"].map(en=>({en,tr:en})),OC={dogru(){},yanlis(){}},jk={bakis:false},hafizaKartlar=[{tip:"en",metin:"book",pairId:0,sabit:true,acik:true,eslesti:false},{tip:"en",metin:"apple",pairId:1,sabit:true,acik:true,eslesti:false},{tip:"tr",metin:"elma",pairId:1,sabit:false,acik:true,eslesti:false},{tip:"tr",metin:"kitap",pairId:0,sabit:false,acik:true,eslesti:false}],hafizaHamle=0,hafizaEslesenSayi=0,hafizaYanlisSayisi=0,hafizaKombo=0,hafizaKomboBonus=0;window.genelEnerjiKalan=30;function hafizaSesCal(){}function genelSesEfektiCal(){}function genelKomboGoster(){}function jokerKalkanTuket(){return false}function hafizaOyunuBitir(){window.memoryDone=true}function boslukOyunuBitir(d,w){window.result={d,w,details:window.boslukSonucDetaylari}};window.dmActiveTime={summary:()=>({seconds:12345,stars:20}),panel:()=>window.timeOpened=true};'});
  await page.addScriptTag({content:letters+memory});await page.addScriptTag({url:'https://test.local/papi-wallet.js'});
  await page.evaluate(()=>{boslukBulmacayiCiz();hafizaKartlariCiz();});
  assert.equal(await page.locator('.dm-letter-word').count(),3);assert.equal(await page.locator('#boslukSatirlarContainer input').count(),0);
  assert.equal(await page.evaluate(()=>document.getElementById('boslukSatirlarContainer').scrollWidth<=innerWidth),true,'long words never require horizontal scroll');
  await page.locator('.dm-letter-options').first().locator('button').filter({hasText:'Geri al'}).click();
  const wrong=await page.evaluate(()=>{const slot=document.querySelector('.dm-letter-slots button.selected');const b=[...document.querySelector('.dm-letter-options').children].find(x=>x.textContent.length===1&&x.textContent!==slot.dataset.answer);b.click();return slot.classList.contains('wrong');});assert(wrong);
  await page.locator('.dm-letter-options').first().locator('button').filter({hasText:'Geri al'}).click();assert.equal(await page.locator('.dm-letter-slots .wrong').count(),0);
  for(let batch=0;batch<3;batch++){
   await page.evaluate(()=>{for(const row of document.querySelectorAll('.dm-letter-word')){while(row.querySelector('.dm-letter-slots button:not(:disabled)')){const slot=row.querySelector('.dm-letter-slots button:not(:disabled)');slot.click();[...row.querySelectorAll('.dm-letter-options button')].find(x=>x.textContent===slot.dataset.answer).click();}}});await page.waitForTimeout(720);
  }
  const result=await page.evaluate(()=>window.result);assert.deepEqual([result.d,result.w,result.details.length],[7,1,8]);
  assert.deepEqual(await page.locator('#hafizaKartGrid .hz-kart').allTextContents(),['book','apple','elma','kitap']);await page.evaluate(()=>{hafizaKartTikla(0);hafizaKartTikla(2)});assert.equal(await page.locator('.hz-wrong').count(),2);await page.waitForTimeout(950);await page.evaluate(()=>{hafizaKartTikla(0);hafizaKartTikla(3)});assert.equal(await page.locator('.eslesti').count(),2);
  assert.equal(await page.locator('.dm-unified-wallet').count(),1);const rect=await page.locator('.dm-unified-wallet').evaluate(e=>({w:e.scrollWidth,v:e.clientWidth,children:[...e.children].map(x=>x.getBoundingClientRect().width)}));assert(rect.w<=rect.v,'wallet fits viewport');assert(rect.children.every(x=>x>0));await page.locator('[data-pw="time"]').click();assert(await page.evaluate(()=>window.timeOpened));
  console.log('PASS '+width+'px: 3-word rounds, undo, automatic completion and review, open memory matching, four wallet counters');
 }
 assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
