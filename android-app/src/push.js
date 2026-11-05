import { createPushPolicy } from './push-policy.js';

// Anlık bildirimler: izin (Papi'nin kibar sorusuyla), cihaz jetonunun sunucuya kaydı, bildirime dokununca ilgili sekme.
const TAB_TO_SCREEN = { parkur: 'tab-dunya', arkadaslar: 'tab-meduakis', oyunlar: 'tab-aktiviteler', derscalis: 'tab-derscalis', magaza: 'tab-magaza', profil: 'tab-profile-menu' };

export function createPush({ plugin, platform = 'android', win, endpoint, isTeacher }) {
  const doc = win.document;
  let policy, owner = '', startedAt = Date.now(), token = '', sentFor = '', open = null, listening = false;
  const student = () => String(win.dmAndroidStudentName?.() || '');
  const signedIn = () => !!win.localStorage.getItem('ing_token') && !!student() && !isTeacher();
  function current() {
    const who = student();
    if (!policy || who !== owner) { owner = who; policy = createPushPolicy({ storage: win.localStorage, owner: who || 'preview', startedAt }); }
    return policy;
  }
  async function send(action) {
    const session = win.localStorage.getItem('ing_token');
    if (!session || !token) return;
    try {
      const r = await win.fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-diji-token': session }, body: JSON.stringify({ action, token, platform }), signal: AbortSignal.timeout(10000) });
      if (r.ok && action === 'register') sentFor = session + '|' + token;
    } catch {}
  }
  async function listen() {
    if (listening) return; listening = true;
    if (platform === 'android') await plugin.createChannel({ id: 'genel', name: 'Diji Medu', description: 'Hatırlatmalar ve duyurular', importance: 3, visibility: 1 }).catch(() => {});
    await plugin.addListener('registration', t => { token = String(t?.value || ''); if (signedIn()) void send('register'); });
    await plugin.addListener('registrationError', () => {});
    // Uygulama açıkken gelen bildirim: Papi'nin küçük duyurusu.
    await plugin.addListener('pushNotificationReceived', n => {
      const text = [n?.title, n?.body].filter(Boolean).join(' · ');
      if (text) win.DijiMeduPapiFeedback?.notice?.(text);
    });
    await plugin.addListener('pushNotificationActionPerformed', a => {
      const screen = TAB_TO_SCREEN[a?.notification?.data?.tab];
      if (!screen) return;
      const go = () => doc.querySelector(`#bottomNavMobile [data-ekran="${screen}"]`)?.click();
      if (doc.readyState === 'complete') setTimeout(go, 800); else win.addEventListener('load', () => setTimeout(go, 1500), { once: true });
    });
  }
  // İzin zaten verildiyse sessizce kaydol (her girişte jeton bu öğrenciye bağlanır).
  async function sync() {
    if (!signedIn()) return;
    try {
      const p = await plugin.checkPermissions();
      if (p.receive !== 'granted') return;
      await listen();
      const session = win.localStorage.getItem('ing_token');
      if (token && sentFor === session + '|' + token) return;
      if (token) await send('register'); else await plugin.register();
    } catch {}
  }
  function style() {
    if (doc.getElementById('dmp-style')) return;
    const s = doc.createElement('style'); s.id = 'dmp-style';
    s.textContent = `.dmp-veil{position:fixed;inset:0;z-index:2147483643;background:rgba(12,52,58,.42);display:flex;align-items:flex-end;justify-content:center}
.dmp-sheet{width:min(100%,520px);background:#fffefa;border:1px solid #b7ece4;border-bottom:0;border-radius:32px 32px 0 0;text-align:center;color:#114952;font:600 15px/1.45 system-ui,sans-serif;padding:22px 20px calc(18px + env(safe-area-inset-bottom,0px));animation:dmpUp .34s cubic-bezier(.2,.7,.25,1)}
.dmp-sheet img{width:84px;height:84px;object-fit:contain}.dmp-sheet h3{margin:6px 0 4px;font-size:20px;color:#0c3f46}.dmp-sheet p{margin:0 0 14px;color:#3e6a70}
.dmp-yes{display:block;width:100%;border:0;border-radius:18px;padding:14px;font:800 16px system-ui;background:#0f8b7d;color:#fff;box-shadow:0 4px 0 #0a6158;margin-bottom:8px}
.dmp-no{display:block;width:100%;border:0;background:none;padding:10px;font:700 15px system-ui;color:#4b7378}
@keyframes dmpUp{from{transform:translateY(100%)}to{transform:none}}@media(prefers-reduced-motion:reduce){.dmp-sheet{animation:none}}`;
    doc.head.append(s);
  }
  function busy() {
    const visible = el => !!el && el.getClientRects().length > 0;
    return doc.hidden || !!open || win.dmAndroidFullscreenBusy || win.dmAndroidAds?.busy || doc.body.classList.contains('dm-play-session')
      || [...doc.querySelectorAll('.dm-session-surface,[role="dialog"],.dmu-veil,.dmb-veil,#genelSonucOverlay.acik')].some(visible);
  }
  async function maybeAsk() {
    if (!signedIn() || busy()) return;
    let p; try { p = await plugin.checkPermissions(); } catch { return; }
    if (p.receive === 'granted') { void sync(); return; }
    const pol = current();
    if (!pol.canAsk(p.receive)) return;
    style();
    const t = doc.createElement('template');
    t.innerHTML = `<div class="dmp-veil" role="dialog" aria-modal="true" aria-label="Bildirimler"><div class="dmp-sheet">
      <img src="papi-welcome-v2.png" alt="" aria-hidden="true"><h3>Papi sana haber versin mi?</h3>
      <p>Serin bozulmak üzereyken, enerjin dolunca ve öğretmeninden yeni bir şey gelince kısa bir bildirim gönderelim.</p>
      <button class="dmp-yes" data-yes>🔔 Evet, haber ver</button><button class="dmp-no" data-no>Şimdi değil</button></div></div>`;
    open = t.content.firstElementChild; doc.body.append(open); pol.asked();
    const close = () => { open?.remove(); open = null; };
    open.querySelector('[data-no]').onclick = () => { pol.answered(false); close(); };
    open.querySelector('[data-yes]').onclick = async () => {
      close();
      try { const r = await plugin.requestPermissions(); pol.answered(r.receive === 'granted'); if (r.receive === 'granted') { await listen(); await plugin.register(); } }
      catch { pol.answered(false); }
    };
  }
  function start() {
    startedAt = Date.now();
    // Bildirime dokunarak açılışta da yönlendirme çalışsın diye dinleyiciler hemen kurulur (izin istemez).
    void plugin.checkPermissions().then(p => { if (p.receive === 'granted') return listen(); }).catch(() => {});
    void sync();
    doc.addEventListener('dm:login', () => setTimeout(sync, 800));
    // Sonuç ekranı kapandıktan biraz sonra (olası geçiş reklamı ve enerji panosundan sonra) sorulur.
    let wasOpen = false;
    setInterval(() => {
      const isOpen = !!doc.querySelector('#genelSonucOverlay.acik');
      if (wasOpen && !isOpen) setTimeout(maybeAsk, 4500);
      wasOpen = isOpen;
    }, 1000);
  }
  return { start, sync, maybeAsk, policy: () => current() };
}
