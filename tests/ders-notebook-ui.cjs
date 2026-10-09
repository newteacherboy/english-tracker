/* Çalışma Defteri menü araması, yeniden çizim ve mobil yerleşim kontrolü. */
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const DETAY = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/ders-konu-ornek.json'), 'utf8'));
const TEST = JSON.parse(DETAY.testJSON);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.DIJI_CHROMIUM, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: Number(process.env.DV_H || 844) } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.route('**/*', async route => {
    const u = new URL(route.request().url()), b = route.request().postDataJSON?.();
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
  await page.evaluate(() => {
    document.getElementById('login-container').style.display='none'; document.getElementById('panel-alani').style.display='block'; dcAktifSeviye='A1'; dcAktifKategori='grammar';
    dcTumKonularCache=['Alphabet and spelling — Alfabe ve Heceleme','Be (am / is / are) — Olmak Fiili','Have got — Sahiplik Bildirme','Pronouns — Zamirler','Possessive adjectives — İyelik Sıfatları','Articles — Belirsiz Tanımlıklar'].map((konuAdi,i)=>({seviye:'A1',kategori:'grammar',konuAdi,siraNo:i+1,durum:i===0?'tamamlandi':''}));
    const t=document.getElementById('tab-derscalis');
    document.querySelectorAll('body *').forEach(e=>{if(e.contains(t)||t.contains(e))return;if(getComputedStyle(e).position==='fixed')e.style.setProperty('display','none','important');});
    t.style.setProperty('display','block','important');t.classList.add('active');
    document.querySelectorAll('.dc-screen').forEach(e=>e.classList.remove('active'));
    document.getElementById('dcScreenTopics').classList.add('active');
    document.getElementById('dcCrumb').textContent='A1 / Dil Bilgisi';
    dcKategoriIcerikCiz('grammar');
  });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#maPatika .ma-tas').count(),6);
  assert.equal(await page.locator('#maPatika .dn-next').count(),1);
  await page.locator('#dcAramaInput').fill('iyelik');
  assert.equal(await page.locator('#maPatika .ma-tas:visible').count(),1);
  await page.locator('#dcAramaInput').fill('HAVE');
  assert.equal(await page.locator('#maPatika .ma-tas:visible').count(),1);
  await page.locator('#dcAramaInput').fill('zxzxzx');
  assert(await page.locator('#dnAramaBos').isVisible());
  await page.locator('#dcAramaInput').fill('');
  assert.equal(await page.locator('#maPatika .ma-tas:visible').count(),6);
  await page.evaluate(()=>dcKategoriIcerikCiz('grammar'));
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.dn-menu-papi').count(),1);
  assert.equal(await page.locator('.dn-doodle').count(),6);
  const name=await page.locator('#maPatika .ma-tas').nth(2).getAttribute('data-arama');
  await page.evaluate(()=>window.dcKonuAc=n=>window.__opened=n);
  await page.locator('#maPatika .ma-tas').nth(2).click();
  assert.equal(await page.evaluate(()=>window.__opened),name);
  for(const width of [390,320,768]){
    await page.setViewportSize({width,height:844});
    assert(await page.evaluate(()=>{const t=document.getElementById('tab-derscalis');return t.scrollWidth<=t.clientWidth+1;}),'no horizontal overflow '+width);
    await page.screenshot({path:'/tmp/ders-notebook-'+width+'.png'});
  }
  console.log('PASS notebook menu: search Turkish/English, empty/reset, redraw, original topic handler, 320/390/768px.');
  console.log('Page errors:',errors);
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
