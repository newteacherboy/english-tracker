/* Ders Çalış konu sayfası "Vadi Defteri" görünümü: gerçek sayfada konu açılır, süsler kurulur, kilitler değişmez.
   Çalıştırma: CODEX_PRIMARY_RUNTIME_NODE_MODULES=<node_modules> DIJI_CHROMIUM=<chromium> node tests/ders-vadi-ui.cjs */
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
  await page.locator('#dcAnlatimIcerik h3').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(400);
  /* Test sayfasında açılış turu ve harita gibi kaplamalar Ders Çalış'ı örtmesin */
  await page.evaluate(() => {
    const t = document.getElementById('tab-derscalis');
    document.querySelectorAll('body *').forEach(e => { if (e.contains(t) || t.contains(e)) return; const cs = getComputedStyle(e); if (cs.position === 'fixed' && !e.closest('#tab-derscalis')) e.style.setProperty('display', 'none', 'important'); });
    document.querySelectorAll('.tab-content.active,.tab-panel.active').forEach(e => { if (e !== t && !e.contains(t)) e.classList.remove('active'); });
    t.classList.add('active'); t.style.setProperty('display', 'block', 'important');
  });
  await page.waitForTimeout(200);

  /* Testi aç */
  await page.evaluate(() => { dcAnlatimOnaylandiMi = true; for (let i = 0; i < 20; i++) dcOrnekDinlenenSet.add(i); });
  await page.locator('.dc-tab-btn[data-tab="test"]').click();
  await page.locator('#dcTestIcerik .dt-q').first().waitFor();
  assert.equal(await page.locator('#dcTestIcerik .dt-q').count(), 10);
  for (const tip of ['secim', 'bosluk', 'siralama', 'dogruyanlis']) assert(await page.locator(`#dcTestIcerik .dt-q[data-tip="${tip}"]`).count() > 0, 'renders ' + tip);

  async function dogruCevapla(qi) {
    const q = TEST[qi], kart = page.locator(`#dcTestIcerik .dt-q[data-q="${qi}"]`);
    if (q.tip === 'siralama') { for (const p of q.parcalar) await kart.locator('.dt-kelime:not([hidden])', { hasText: new RegExp('^' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first().click(); return; }
    const metin = q.tip === 'dogruyanlis' ? (q.dogru ? 'Doğru' : 'Yanlış') : q.secenekler[q.dogru];
    await kart.locator('button[data-s]', { hasText: new RegExp('^' + metin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first().click();
  }
  /* Bir yanlış cevap testi baştan başlatır ve açıklamayı gösterir */
  const ilk = TEST[0], yanlis = ilk.secenekler.find((s, i) => i !== ilk.dogru);
  await page.locator('#dcTestIcerik .dt-q[data-q="0"] button[data-s]', { hasText: new RegExp('^' + yanlis + '$') }).click();
  assert(await page.locator('#dtAciklama0').isVisible(), 'explanation shown after a wrong answer');
  assert((await page.locator('#dtAciklama0').textContent()).includes('Doğrusu'));
  await page.waitForTimeout(2300);
  assert.equal(await page.evaluate(() => dcQuizCevaplari.filter(x => x !== -1).length), 0, 'test restarted');

  /* Şıklar karışık: doğru cevap metne göre bulunur, sıraya göre değil */
  for (let qi = 0; qi < TEST.length; qi++) await dogruCevapla(qi);
  assert.equal(await page.evaluate(() => dcQuizDogruSayisi), 10, 'all ten answered correctly');
  assert.equal(await page.locator('#dcTestIcerik .dt-cevap.dogru').count(), TEST.filter(q => q.tip === 'siralama').length);
  await page.screenshot({ path: '/tmp/ders-test-ui.png', fullPage: true });

  /* Eski biçim sorular hâlâ çoktan seçmeli olarak çalışır */
  await page.evaluate(() => dcTestCiz([{ soru: 'Eski soru?', secenekler: ['a', 'b', 'c'], dogru: 2 }], '#000'));
  assert.equal(await page.locator('#dcTestIcerik .dt-q[data-tip="secim"] button[data-s]').count(), 3);
  await page.locator('#dcTestIcerik button[data-s]', { hasText: /^c$/ }).click();
  assert.equal(await page.evaluate(() => dcQuizDogruSayisi), 1);

  const bad = errors.filter(x => !x.includes('Chart') && !x.includes('pdf'));
  assert.deepEqual(bad, []);
  await browser.close();
  console.log('PASS lesson test renders choice, fill-in, sentence-building and true/false questions with shuffled options');
})().catch(e => { console.error(e); process.exit(1); });
