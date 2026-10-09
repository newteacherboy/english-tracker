/* Ders Çalış konu sayfası "Vadi Defteri" görünümü: gerçek sayfada konu açılır, süsler kurulur, kilitler değişmez.
   Çalıştırma: CODEX_PRIMARY_RUNTIME_NODE_MODULES=<node_modules> DIJI_CHROMIUM=<chromium> node tests/ders-vadi-ui.cjs */
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const DETAY = {};
let requests = 0;
const due = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', {timeZone:'Europe/Istanbul'});
let assignments = [
  {id:'lesson',tur:'ders',baslik:'Olmak Fiili',veri:{seviye:'A1',kategori:'grammar',konu:'Be'},sonTarih:due,atandi:new Date().toISOString(),yapildi:false,not:'Am, is ve are çalış.'},
  {id:'expired',tur:'ders',baslik:'Geçmiş Ödev',veri:{seviye:'A1',kategori:'grammar',konu:'Be'},sonTarih:'2020-01-01',yapildi:false},
  {id:'nodate',tur:'ders',baslik:'Tarihsiz Ödev',veri:{seviye:'A1',kategori:'grammar',konu:'Be'},yapildi:false},
  {id:'done',tur:'ders',baslik:'Bitmiş Ödev',veri:{seviye:'A1',kategori:'grammar',konu:'Be'},sonTarih:due,yapildi:true}
];
const g = n => new Date(Date.now() - n * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
const ISTAT = { ok: true, bugun: g(0), gunler: { [g(0)]: { o: 3, d: 20, y: 4, m: 1, l: 1, p: 2 }, [g(1)]: { o: 2, d: 12, y: 2, m: 0, l: 0, p: 1 }, [g(40)]: { o: 5, d: 30, y: 10, m: 0, l: 2, p: 0 } }, oyunTur: {} };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.DIJI_CHROMIUM, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: Number(process.env.DV_W || 390), height: Number(process.env.DV_H || 844) } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.route('**/*', async route => {
    const u = new URL(route.request().url()), b = route.request().postDataJSON?.();
    if(u.searchParams.get('islem') === 'odevlerim') { requests++; return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,liste:assignments})}); }
    if (b?.islem === 'benimIstatistik') return route.fulfill({ contentType: 'application/json', body: JSON.stringify(ISTAT) });
    if (u.searchParams.get('islem') === 'dersKonuDetayGetir') return route.fulfill({ contentType: 'application/json', body: JSON.stringify(DETAY) });
    if (b?.islem === 'yayinOzellikleri') return route.fulfill({ contentType: 'application/json', body: '{"flags":{},"admin":false}' });
    if (b?.islem === 'seviyeDurumu') return route.fulfill({ contentType: 'application/json', body: '{"ok":true,"level":7,"feed":true,"lessons":{"A1":true,"A2":false},"chests":{}}' });
    if (u.hostname === 'cdn.jsdelivr.net' && u.pathname.includes('supabase')) return route.fulfill({ contentType: 'application/javascript', body: 'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>({select:async()=>({data:[],error:null})})})};' });
    if (u.hostname === 'full.test') {
      const file = path.join(__dirname, '../ingilizce', u.pathname.replace(/^\/ingilizce\//, '') || 'index.html');
      if (fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
    }
    return route.fulfill({ contentType: 'application/json', body: '[]' });
  });
  await page.goto('https://full.test/ingilizce/', {waitUntil:'load'});
  await page.evaluate(()=>{aktifOgrenciAdi='Fixture';globalDataCache=[{ogrenci:'Fixture',Sinif:'3',Durum:'approved'}];yo=yoVarsayilan();yo.totalXp=720;yo.dmParkurMigration={version:1};yoIsim='Fixture';window.yoHazirMi=()=>true;window.yoSunucuyaGonder=()=>{};window.genelEnerjiKalan=30;yoArayuzKur();document.getElementById('login-container').style.display='none';document.getElementById('panel-alani').style.display='block';});
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    aktifOgrenciAdi='Fixture'; yoIsim='Fixture';
    window.yoHazirMi=()=>true; window.yoSunucuyaGonder=()=>{};
    window.dmGunGorevleri=()=>({liste:[{id:'a',ilerleme:0}],alindi:false});
    window.dmGorevHavuz=[{id:'a',hedef:3,i:'A',ad:'3 soru çöz'}];
    document.getElementById('login-container').style.display='none'; document.getElementById('panel-alani').style.display='block';
    benimDunyamAc('sanaozel');
    const t=document.getElementById('tab-dunyam');
    document.querySelectorAll('body *').forEach(e=>{if(e.contains(t)||t.contains(e)||e.id==='bottomNavMobile'||e.closest('#bottomNavMobile'))return;if(getComputedStyle(e).position==='fixed')e.style.setProperty('display','none','important');});
  });
  await page.locator('#bdOdevler #odoKart .odo-satir').first().waitFor({state:'visible'});
  assert.equal(await page.locator('#odoKart').count(),1);
  assert(await page.evaluate(()=>document.getElementById('bdOdevler').nextElementSibling.id==='bdGorevler'));
  assert.equal(await page.locator('#bdOdevler .odo-satir').count(),4);
  assert((await page.locator('[data-od-bitis]').first().textContent()).includes('kaldı'));
  const before=await page.locator('[data-od-bitis]').first().textContent();
  await page.waitForTimeout(1600);
  assert.notEqual(await page.locator('[data-od-bitis]').first().textContent(),before,'countdown ticks');
  assert.equal(await page.locator('.odo-sayac.gecikti').textContent(),'Teslim süresi doldu');
  assert((await page.locator('#bdOdevler').textContent()).includes('Son tarih belirtilmedi'));
  assert.equal(await page.locator('#bdOdevler .bitti [data-od]').textContent(),'Tekrar');
  const fetched=requests; await page.evaluate(()=>dmOdevKartCiz());
  assert.equal(requests,fetched,'redraw reuses cached homework');
  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});
    assert(await page.evaluate(()=>{const e=document.getElementById('bdOdevler');return e.scrollWidth<=e.clientWidth+1;}));
  }
  await page.locator('#bdOdevler').screenshot({path:'/tmp/diji-homework-card.png'});
  await page.evaluate(()=>{
    window.dersCalisTamEkranAc=()=>{window.__lessonOpened=true};
    dcTumKonularCache=[{konuAdi:'Be'}];
    window.dcSeviyeSec=()=>{};window.dcKategoriSec=()=>{};window.dcKonuAc=n=>window.__openedTopic=n;
  });
  await page.locator('[data-od="lesson"]').click();
  await page.waitForTimeout(650);
  assert.equal(await page.evaluate(()=>window.__openedTopic),'Be');
  assert.equal(await page.evaluate(()=>window.__aktifOdev.id),'lesson');
  assert.equal(await page.evaluate(()=>document.getElementById('tab-dunyam').classList.contains('active')),false);
  assignments=[];
  await page.evaluate(()=>{aktifOgrenciAdi='Other';benimDunyamAc('sanaozel');});
  await page.waitForTimeout(150);
  assert(await page.locator('#odoKart').isHidden(),'other student never sees old homework');
  assert.deepEqual(errors,[]);
  console.log('PASS homework position, countdown, due/expired/no deadline/completed, cached fetch, 320/390px, Start, account change.');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
