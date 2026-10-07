/* Ders Çalış konu sayfası "Vadi Defteri" görünümü: gerçek sayfada konu açılır, süsler kurulur, kilitler değişmez.
   Çalıştırma: CODEX_PRIMARY_RUNTIME_NODE_MODULES=<node_modules> DIJI_CHROMIUM=<chromium> node tests/ders-vadi-ui.cjs */
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const DETAY = {
  anlatimHTML: '<h3>Alfabe ve Heceleme (Alphabet and Spelling)</h3><p>İngiliz alfabesinde 26 harf bulunur. Kelimelerin yazılışını harf harf okumaya <b>spelling</b> denir.</p><table><tr><td><b>Sesli Harfler (Vowels):</b></td><td>A, E, I, O, U harfleridir.</td></tr><tr><td><b>Sessiz Harfler (Consonants):</b></td><td>Diğer tüm harflerdir.</td></tr></table>',
  kelimeSozlugu: JSON.stringify({ spelling: { tr: 'heceleme' } }),
  ornekler: JSON.stringify([{ en: 'How do you spell your name?', tr: 'Adını nasıl hecelersin?' }, { en: 'M-E-R-T.', tr: 'M-E-R-T.' }, { en: 'Can you spell that, please?', tr: 'Onu heceler misin lütfen?' }]),
  testJSON: JSON.stringify([
    { soru: 'Kaç harf var?', secenekler: ['26', '29', '21'], dogru: 0 },
    { soru: 'Hangisi sesli harf?', secenekler: ['B', 'A', 'K'], dogru: 1 },
    { soru: 'Spelling ne demek?', secenekler: ['Okuma', 'Heceleme', 'Yazma'], dogru: 1 },
    { soru: 'Hangisi sessiz harf?', secenekler: ['E', 'O', 'T'], dogru: 2 }
  ])
};
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
  await page.addInitScript(() => { new MutationObserver(() => { document.querySelector('.kur-perde .kur-x')?.click(); document.querySelectorAll('.kr-perde').forEach(e => e.remove()); }).observe(document, { childList: true, subtree: true }); });
  await page.goto('https://full.test/ingilizce/', { waitUntil: 'load' });
  await page.evaluate(() => {
    aktifOgrenciAdi = 'Fixture'; globalDataCache = [{ ogrenci: 'Fixture', Sinif: '3', Durum: 'approved' }];
    yo = yoVarsayilan(); yo.totalXp = 720; yo.dmParkurMigration = { version: 1 }; yoIsim = 'Fixture';
    window.yoHazirMi = () => true; window.yoSunucuyaGonder = () => {}; window.genelEnerjiKalan = 30; yoArayuzKur();
  });
  await page.waitForTimeout(1200);
  await page.waitForTimeout(2500);
  await page.evaluate(() => { document.getElementById('login-container').style.display = 'none'; document.getElementById('panel-alani').style.display = 'block'; window.__t = []; const ot = window.yoToast; window.yoToast = m => { __t.push(m); }; window.__odevAcilisBitis = Date.now() + 120000; });
  await page.locator('.bn-item[data-ekran="tab-derscalis"]').click();
  await page.waitForTimeout(800);
  await page.waitForTimeout(600);
  if (await page.locator('.ab-perde .ab-basla').count()) await page.locator('.ab-perde .ab-basla').waitFor({ state: 'attached' }); await page.evaluate(() => document.querySelector('.ab-perde .ab-basla')?.click());
  await page.evaluate(() => {
    dcAktifSeviye = 'A1'; dcAktifKategori = 'grammar';
    dcTumKonularCache = [{ seviye: 'A1', kategori: 'grammar', konuAdi: 'Alphabet and spelling', siraNo: 1, durum: '', bilmiyordum: false }];
    window.genelOyunGirisEngelliMi = () => false;
    dcKonuAc('Alphabet and spelling');
  });
    await page.locator('.ab-perde .ab-basla').waitFor({ state: 'attached' }); await page.evaluate(() => document.querySelector('.ab-perde .ab-basla')?.click());
  await page.locator('#dcAnlatimIcerik table').waitFor({ state: 'attached' });
  await page.waitForTimeout(400);
  /* Test sayfasında açılış turu ve harita gibi kaplamalar Ders Çalış'ı örtmesin */
  await page.evaluate(() => {
    const t = document.getElementById('tab-derscalis');
    document.querySelectorAll('body *').forEach(e => { if (e.contains(t) || t.contains(e)) return; const cs = getComputedStyle(e); if (cs.position === 'fixed' && !e.closest('#tab-derscalis')) e.style.setProperty('display', 'none', 'important'); });
    document.querySelectorAll('.tab-content.active,.tab-panel.active').forEach(e => { if (e !== t && !e.contains(t)) e.classList.remove('active'); });
    t.classList.add('active'); t.style.setProperty('display', 'block', 'important');
  });
  await page.waitForTimeout(200);

  assert(await page.evaluate(() => document.body.classList.contains('dc-vadi')), 'theme class on body');
  assert.equal(await page.locator('#dcScreenDetail .dv-vadi').count(), 1, 'one valley header');
  assert.equal(await page.locator('.dv-vadi #dcBilmiyordumBtn').count(), 1, 'Bilmiyordum button sits on the valley');
  assert.equal(await page.locator('#dcTopicHeader .dv-papi-kitap').count(), 1, 'reading Papi on the title card');
  assert.equal(await page.locator('.dv-papi-anlatir').count(), 1, 'Papi speech bubble before the explanation');
  assert(await page.locator('#dcTopicImg').evaluate(e => getComputedStyle(e).display === 'none'), 'generic topic picture hidden');
  assert.equal(await page.locator('#dcTopicHeader').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(255, 255, 255)', 'title card is white even with the old inline gradient');
  assert.equal(await page.locator('#dcTab-anlatim > #kmBaslangic').count(), 1, 'Konu Macerası card moved to the end of the explanation');
  assert.equal(await page.locator('#kmBaslangic .dv-papi-yildiz').count(), 1);
  assert(await page.locator('#dcOkudumBtn').isDisabled(), 'reading timer still locks the button');
  await page.screenshot({ path: '/tmp/ders-vadi-anlatim.png', fullPage: true });

  /* Kilitler değişmedi: örnekler okumadan açılmaz */
  await page.evaluate(() => { window.__toast = []; const t = window.dcToastGoster; window.dcToastGoster = m => { __toast.push(m); }; });
  await page.locator('.dc-tab-btn[data-tab="ornek"]').click();
  assert(await page.locator('#dcTab-anlatim').evaluate(e => e.classList.contains('active')), 'examples stay locked before reading');
  await page.evaluate(() => { dcAnlatimOnaylandiMi = true; });
  await page.locator('.dc-tab-btn[data-tab="ornek"]').click();
  assert(await page.locator('#dcTab-ornek').evaluate(e => e.classList.contains('active')));
  assert.equal(await page.locator('.dc-example-row').count(), 3);
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/ders-vadi-ornek.png', fullPage: true });

  /* Konu yeniden açılınca süsler çoğalmaz */
  await page.evaluate(() => { dcGeriGit(); dcKonuAc('Alphabet and spelling'); });
  await page.locator('.ab-perde .ab-basla').waitFor({ state: 'attached' }); await page.evaluate(() => document.querySelector('.ab-perde .ab-basla')?.click());
  await page.locator('#dcAnlatimIcerik table').waitFor({ state: 'attached' });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.dv-vadi').count(), 1);
  assert.equal(await page.locator('.dv-papi-anlatir').count(), 1);
  assert.equal(await page.locator('#kmBaslangic').count(), 1);
  assert.equal(await page.locator('#kmBaslangic .dv-papi-yildiz').count(), 1);

  const bad = errors.filter(x => !x.includes('Chart') && !x.includes('pdf'));
  assert.deepEqual(bad, []);
  await browser.close();
  console.log('PASS Vadi Defteri topic page decorates the real lesson screen without changing its locks');
})().catch(e => { console.error(e); process.exit(1); });
