/* Uygulama (Android/iPhone) için siteden yönetilen davranışlar; yeni sürüm gerektirmez.
   1) Zorunlu / önerilen güncelleme: app-surum.json (min, latest) ile uygulama sürümü karşılaştırılır.
   2) Mağaza puanı: düzenli kullanan öğrenciye, bir sonuç ekranı kapandıktan sonra en fazla 120 günde bir
      Google/Apple'ın kendi puan penceresi istenir (gösterip göstermemeye mağaza karar verir). */
(() => {
  'use strict';
  const W = window, D = document, C = W.Capacitor;
  if (!C?.isNativePlatform?.() || W.dmUygulama) return;
  W.dmUygulama = true;
  const platform = C.getPlatform?.() === 'ios' ? 'ios' : 'android';
  const st = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  const cmp = (a, b) => { const x = String(a).split('.').map(n => parseInt(n, 10) || 0), y = String(b).split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; };
  const plugin = name => { try { return C.isPluginAvailable?.(name) ? (C.Plugins?.[name] || C.registerPlugin?.(name)) : null; } catch { return null; } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  async function appVersion() { try { return (await plugin('App')?.getInfo?.())?.version || ''; } catch { return ''; } }
  function show(cfg, force, version) {
    if (D.getElementById('dmGuncelle')) return;
    const box = D.createElement('div'); box.id = 'dmGuncelle'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:' + (force ? 'center' : 'flex-end') + ';justify-content:center;background:rgba(43,26,92,.5);font-family:Nunito,system-ui,sans-serif';
    box.innerHTML = `<div style="width:min(100%,420px);margin:${force ? '16px' : '0'};padding:22px 20px calc(18px + env(safe-area-inset-bottom,0px));border-radius:${force ? '28px' : '30px 30px 0 0'};background:linear-gradient(180deg,#f5efff,#efe8fd);color:#2c2470;text-align:center;box-shadow:0 20px 50px rgba(40,20,100,.35)">
      <img src="satis-assets/papi-enerji-molasi.webp" alt="" style="width:120px;height:120px;object-fit:contain">
      <h2 style="margin:6px 0 6px;font:900 23px/1.2 system-ui;color:#2b23a6">${force ? 'Güncelleme gerekli' : 'Yeni sürüm hazır'}</h2>
      <p style="margin:0 0 16px;font:600 14px/1.45 system-ui;color:#4b4180">${esc(cfg.mesaj || 'Diji Medu’nun yeni sürümü hazır.')}${version ? `<br><small style="color:#7b6aa8">Sürümün: ${esc(version)}</small>` : ''}</p>
      <a href="${esc(cfg[platform].url)}" data-go style="display:block;padding:15px;border-radius:99px;background:linear-gradient(180deg,#ffe763,#ffbf14);box-shadow:0 5px 0 #f2a10d;color:#3a1f6b;font:900 17px system-ui;text-decoration:none">${platform === 'ios' ? 'App Store’da güncelle' : 'Google Play’de güncelle'}</a>
      ${force ? '' : '<button type="button" data-later style="margin-top:10px;width:100%;border:0;background:none;padding:10px;color:#6d5ea6;font:700 14px system-ui">Daha sonra</button>'}</div>`;
    box.querySelector('[data-later]')?.addEventListener('click', () => { st.set('dm_guncelle_sonra', String(Date.now())); box.remove(); });
    D.body.append(box);
  }
  async function checkUpdate() {
    try {
      const [cfg, version] = await Promise.all([fetch('app-surum.json?v=' + Math.floor(Date.now() / 600000), { cache: 'no-store' }).then(r => r.ok ? r.json() : null), appVersion()]);
      const c = cfg?.[platform]; if (!c || !version) return;
      if (c.min && c.min !== '0' && cmp(version, c.min) < 0) return show(cfg, true, version);
      const later = Number(st.get('dm_guncelle_sonra')) || 0;
      if (c.latest && c.latest !== '0' && cmp(version, c.latest) < 0 && Date.now() - later > 3 * 864e5) show(cfg, false, version);
    } catch {}
  }

  // ---- mağaza puanı
  const teacher = () => { try { return !!W.dmTeacherPortalMode || (typeof aktifOgrenciAdi !== 'undefined' && ['teacher', 'dijimedu_demo'].includes(String(aktifOgrenciAdi).toLowerCase())); } catch { return true; } };
  function countDay() {
    const t = new Date().toISOString().slice(0, 10), last = st.get('dm_kullanim_son');
    if (last !== t) { st.set('dm_kullanim_son', t); st.set('dm_kullanim_gun', String((Number(st.get('dm_kullanim_gun')) || 0) + 1)); }
  }
  async function maybeReview() {
    if (teacher() || !st.get('ing_token') || typeof W.dmRequestReview !== 'function') return;
    if ((Number(st.get('dm_kullanim_gun')) || 0) < 4) return;
    if (Date.now() - (Number(st.get('dm_puan_istendi')) || 0) < 120 * 864e5) return;
    if (D.querySelector('[role="dialog"]:not([hidden]),.dms-veil,.dmp')) return;
    st.set('dm_puan_istendi', String(Date.now()));
    try { await W.dmRequestReview(); } catch {}
  }
  let wasOpen = false;
  setInterval(() => {
    const open = !!D.querySelector('#genelSonucOverlay.acik');
    if (wasOpen && !open) setTimeout(maybeReview, 2500);
    wasOpen = open;
  }, 1000);

  const start = () => { countDay(); checkUpdate(); D.addEventListener('visibilitychange', () => { if (!D.hidden) { countDay(); checkUpdate(); } }); };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
