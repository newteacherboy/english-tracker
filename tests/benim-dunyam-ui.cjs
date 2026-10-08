/* Ders Çalış konu sayfası "Vadi Defteri" görünümü: gerçek sayfada konu açılır, süsler kurulur, kilitler değişmez.
   Çalıştırma: CODEX_PRIMARY_RUNTIME_NODE_MODULES=<node_modules> DIJI_CHROMIUM=<chromium> node tests/ders-vadi-ui.cjs */
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
const DETAY = {};
const g = n => new Date(Date.now() - n * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
const ISTAT = { ok: true, bugun: g(0), gunler: { [g(0)]: { o: 3, d: 20, y: 4, m: 1, l: 1, p: 2 }, [g(1)]: { o: 2, d: 12, y: 2, m: 0, l: 0, p: 1 }, [g(40)]: { o: 5, d: 30, y: 10, m: 0, l: 2, p: 0 } }, oyunTur: {} };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.DIJI_CHROMIUM, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: Number(process.env.DV_W || 390), height: Number(process.env.DV_H || 844) } }), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.dismiss());
  await page.route('**/*', async route => {
    const u = new URL(route.request().url()), b = route.request().postDataJSON?.();
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

  await page.evaluate(() => { yo.altin = 250; yo.dcOdul = ['a', 'b']; localStorage.setItem('ing_girisSerisiSayisi', '4'); });
  /* Alt menüde tek düğme */
  await page.waitForTimeout(800);
  assert.equal(await page.locator('#bottomNavMobile [data-ekran="tab-dunyam"]').count(), 1);
  assert(await page.locator('#bottomNavMobile [data-ekran="tab-sanaozel"]').evaluate(e => getComputedStyle(e).display === 'none'));
  /* Eski giriş yeni ekrana açılır */
  await page.evaluate(() => sanaOzelTamEkranAc());
  await page.waitForTimeout(600);
  assert(await page.locator('#tab-dunyam').evaluate(e => e.classList.contains('active')), 'Sana Özel opens Benim Dünyam');
  assert(await page.locator('#tab-dunyam .bd-sekme[data-bd="sanaozel"]').evaluate(e => e.classList.contains('active')));
  assert(await page.locator('#bdDiger .dc-focus-card').count() === 1, 'old Sana Özel cards moved in');
  assert(await page.locator('#soPanel').count() === 1, 'task panel stays in the DOM');
  /* Çıkış düğmesi: onay sorar, vazgeçilirse çıkış yapılmaz, onaylanırsa cikisYap çağrılır */
  const cikis = await page.evaluate(() => { let n = 0; const eski = window.cikisYap, onay = window.confirm; window.cikisYap = () => { n++; };
    window.confirm = () => false; document.getElementById('bdCikis').click(); const once = n;
    window.confirm = () => true; document.getElementById('bdCikis').click(); window.cikisYap = eski; window.confirm = onay; return [once, n]; });
  assert.deepEqual(cikis, [0, 1], 'logout button asks before calling cikisYap');
  /* Öğretmen paneli düğmesi şifre penceresini Benim Dünyam'ın üstünde açar */
  await page.evaluate(() => { try { sessionStorage.removeItem('ing_ogr_token'); } catch (e) {} document.getElementById('bdOgretmen').click(); });
  const sifre = await page.evaluate(() => { const m = document.getElementById('sifreModal'), r = m.getBoundingClientRect();
    const d = document.getElementById('tab-dunyam');
    return { gorunur: getComputedStyle(m).display !== 'none' && r.height > 0, ustte: !d.classList.contains('active') && getComputedStyle(d).display === 'none' }; });
  await page.screenshot({ path: '/tmp/bd-ogretmen.png' });
  assert.deepEqual(sifre, { gorunur: true, ustte: true }, 'teacher button closes Benim Dünyam and opens the password modal');

  await page.evaluate(() => { document.getElementById('sifreModal').style.display = 'none'; window.benimDunyamAc('sanaozel'); });
  await page.evaluate(() => { const t = document.getElementById('tab-dunyam'); document.querySelectorAll('body *').forEach(e => { if (e.contains(t) || t.contains(e)) return; if (getComputedStyle(e).position === 'fixed') e.style.setProperty('display', 'none', 'important'); }); });
  await page.screenshot({ path: '/tmp/bd-sanaozel.png', fullPage: true });
  /* İstatistik */
  await page.locator('#tab-dunyam .bd-sekme[data-bd="istatistik"]').click();
  await page.waitForTimeout(700);
  const kartlar = await page.locator('#bdIstat .bd-istat b').allTextContents();
  assert.equal(kartlar[0], '5', 'games this week: ' + kartlar);
  assert.equal(await page.locator('#bdIstat .bd-cubuk').count(), 7);
  await page.locator('#bdIstat [data-aralik="tum"]').click();
  assert.equal((await page.locator('#bdIstat .bd-istat b').allTextContents())[0], '10');
  assert.equal(await page.locator('#bdIstat .bd-cubuk').count(), 12);
  await page.locator('#bdIstat [data-aralik="hafta"]').click();
  assert.equal(await page.locator('#bdGelisim #tab-ozet').count(), 1, 'teacher charts moved into statistics');
  await page.screenshot({ path: '/tmp/bd-istatistik.png', fullPage: true });
  /* Rozetler */
  await page.locator('#tab-dunyam .bd-sekme[data-bd="rozetler"]').click();
  await page.waitForTimeout(400);
  const kazanilan = await page.locator('#bdRozet .bd-rozet:not(.kilitli) b').allTextContents();
  for (const ad of ['İlk Adım', 'İlk Zafer', '3 Gün Seri', 'Tam İsabet', 'Seviye 5']) assert(kazanilan.includes(ad), 'earned ' + ad + ' in ' + kazanilan);
  assert.equal(await page.locator('#bdRozet .bd-rozet').count(), 24);
  await page.screenshot({ path: '/tmp/bd-rozetler.png', fullPage: true });
  /* Karakter */
  await page.locator('#tab-dunyam .bd-sekme[data-bd="karakter"]').click();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('#bdKoleksiyon #profilKoleksiyon').count(), 1);
  await page.screenshot({ path: '/tmp/bd-karakter.png', fullPage: true });
  /* Kapanınca her şey eski yerine döner */
  await page.evaluate(() => dersCalisTamEkranAc());
  await page.waitForTimeout(400);
  assert.equal(await page.locator('#tab-sanaozel .dc-focus-card').count(), 1, 'cards returned');
  assert.equal(await page.locator('#tab-profil #profilKoleksiyon').count(), 1, 'collection returned');
  assert.equal(await page.locator('#bdGelisim #tab-ozet').count(), 0, 'charts returned');
  assert(!(await page.locator('#tab-dunyam').evaluate(e => e.classList.contains('active'))));
  /* Profil girişi istatistiğe açılır */
  await page.evaluate(() => profilAc());
  await page.waitForTimeout(400);
  assert(await page.locator('#tab-dunyam .bd-sekme[data-bd="istatistik"]').evaluate(e => e.classList.contains('active')));
  const bad = errors.filter(x => !x.includes('Chart') && !x.includes('pdf'));
  assert.deepEqual(bad, []);
  await browser.close();
  console.log('PASS Benim Dünyam merges Sana Özel and Profil with four tabs and restores moved sections on close');
})().catch(e => { console.error(e); process.exit(1); });
