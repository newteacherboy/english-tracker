// Pakete gömülen yükleyici. Ortak katmanı (reklam, üyelik, bildirim, paylaşma) önce siteden yükler;
// site açılmazsa (çevrimdışı, hata) paketteki kopyayı çalıştırır. İki kopya aynı anda çalışmaz
// (startRuntime window.dmAndroidShell ile korunur).
import { startRuntime } from './runtime.js';

const SHELL_BUILD = 2; // 1 = eski paketler (yalnız gömülü katman), 2 = siteden yükleyen kabuk
if (window === window.top && location.origin === 'https://app.dijimedu.com' && !window.dmShellBuild) {
  window.dmNativeRuntime = true;
  window.dmShellBuild = SHELL_BUILD;
  let local = false;
  const fallback = () => { if (local || window.dmAndroidShell) return; local = true; try { startRuntime('paket'); } catch (e) { console.warn('[DijiMedu] Paket katmanı başlatılamadı', e); } };
  try {
    const platform = window.Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android';
    const s = document.createElement('script');
    s.src = '/ingilizce/native/runtime-' + platform + '.js?v=' + Math.floor(Date.now() / 3600000);
    s.async = true;
    const timer = setTimeout(fallback, 7000);
    s.onload = () => { clearTimeout(timer); if (!window.dmAndroidShell) fallback(); };
    s.onerror = () => { clearTimeout(timer); fallback(); };
    (document.head || document.documentElement).appendChild(s);
  } catch { fallback(); }
}
