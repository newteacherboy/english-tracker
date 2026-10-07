const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright');
(async () => {
  const { default: binary } = await import('/tmp/diji-deletion-qa/node_modules/@sparticuz/chromium/build/index.js');
  const browser = await chromium.launch({ executablePath: process.env.DIJI_CHROMIUM || '/tmp/diji-chromium/chromium', args: binary.args, headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let preparations = 0, confirmations = 0, lastAdmin = false;
  await page.route('https://nxfqlutulxqzqgwewssd.supabase.co/**', async route => {
    const body = JSON.parse(route.request().postData() || '{}');
    let status = 200, data;
    if (body.operation === 'prepare') {
      preparations++;
      data = body.password === 'correct'
        ? { ok: true, ticket: 't'.repeat(73), username: 'Synthetic user', role: body.role }
        : { ok: false, message: 'Hesap türü, kullanıcı adı veya şifre hatalı.' };
      if (!data.ok) status = 401;
    } else {
      confirmations++;
      data = lastAdmin ? { ok: false, message: 'Son aktif yönetici hesabı silinemez.' }
        : { ok: true, message: 'İngilizce hesabın ve ona bağlı aktif kayıtlar silindi.' };
      if (!data.ok) status = 409;
    }
    await route.fulfill({ status, headers: { 'Access-Control-Allow-Origin': 'https://app.dijimedu.com' }, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.route('https://app.dijimedu.com/**', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    const file = path.join(__dirname, '../ingilizce', name);
    const contentType = name.endsWith('.js') ? 'application/javascript' : name.endsWith('.css') ? 'text/css' : name.endsWith('.png') ? 'image/png' : 'text/html';
    await route.fulfill({ body: fs.readFileSync(file), contentType });
  });
  await page.goto('https://app.dijimedu.com/ingilizce/hesap-sil.html');
  await page.evaluate(() => {
    localStorage.setItem('aktifOgrenci', 'coaching-account');
    localStorage.setItem('dijimuallim_aktif_ogrenci', 'coaching-profile');
    sessionStorage.setItem('misafirBilgi', 'coaching-contact');
    localStorage.setItem('ing_aktifOgrenci', 'Synthetic user');
    localStorage.setItem('ing_token', 'english-token');
    localStorage.setItem('ing_yo_Synthetic user', 'own-profile');
    localStorage.setItem('ing_yo_Other user', 'other-profile');
    localStorage.setItem('diji_kuyruk_v1_synthetic user', 'pending-writes');
  });
  await page.locator('#username').fill('Synthetic user');
  await page.locator('#password').fill('wrong');
  await page.locator('#verifyButton').click();
  await page.getByText('Hesap türü, kullanıcı adı veya şifre hatalı.').waitFor();
  assert.equal(confirmations, 0);
  await page.locator('#password').fill('correct');
  await page.locator('#verifyButton').click();
  await page.locator('#confirmForm').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#password').inputValue(), '');
  assert.equal(confirmations, 0);
  await page.locator('#cancelButton').click();
  await page.locator('#verifyForm').waitFor({ state: 'visible' });
  assert.equal(confirmations, 0);
  await page.locator('#password').fill('correct');
  await page.locator('#verifyButton').click();
  await page.locator('#confirmForm').waitFor({ state: 'visible' });
  await page.locator('#consent').check();
  await page.locator('#confirmation').fill('WRONG');
  await page.locator('#deleteButton').click();
  await page.getByText('Onay kutusunu işaretle ve HESABIMI SİL yaz.').waitFor();
  assert.equal(confirmations, 0);
  await page.locator('#confirmation').fill('HESABIMI SİL');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '/tmp/diji-account-deletion-mobile.png', fullPage: true });
  await page.locator('#deleteButton').click();
  await page.getByText('İngilizce hesabın ve ona bağlı aktif kayıtlar silindi.').waitFor();
  assert.equal(confirmations, 1);
  const storage = await page.evaluate(() => ({ coaching: localStorage.getItem('aktifOgrenci'), coachProfile: localStorage.getItem('dijimuallim_aktif_ogrenci'), coachContact: sessionStorage.getItem('misafirBilgi'), own: localStorage.getItem('ing_yo_Synthetic user'), other: localStorage.getItem('ing_yo_Other user'), token: localStorage.getItem('ing_token'), pending: localStorage.getItem('diji_kuyruk_v1_synthetic user') }));
  assert.deepEqual(storage, { coaching: 'coaching-account', coachProfile: 'coaching-profile', coachContact: 'coaching-contact', own: null, other: 'other-profile', token: null, pending: null });
  console.log('PASS: mobile layout, password error, two-stage confirmation, cancellation, exact final confirmation and Coaching/other-account storage preservation');
  lastAdmin = true;
  await page.goto('https://app.dijimedu.com/ingilizce/hesap-sil.html?role=teacher');
  assert.equal(await page.locator('#role').inputValue(), 'teacher');
  await page.locator('#username').fill('Synthetic user');
  await page.locator('#password').fill('correct');
  await page.locator('#verifyButton').click();
  await page.locator('#confirmForm').waitFor({ state: 'visible' });
  await page.locator('#consent').check();
  await page.locator('#confirmation').fill('HESABIMI SİL');
  await page.locator('#deleteButton').click();
  await page.getByText('Son aktif yönetici hesabı silinemez.').waitFor();
  assert.equal(await page.locator('#confirmForm').isVisible(), true);
  console.log('PASS: teacher role and last-administrator refusal preserve the confirmation form');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
