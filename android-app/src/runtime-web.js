// Siteden yüklenen ortak katman (ingilizce/native/runtime-*.js). Yalnız yükleyici kabuklarda (dmShellBuild >= 2) çalışır;
// eski paketler kendi gömülü kopyalarını kullanır.
import { startRuntime } from './runtime.js';
if (window === window.top && location.origin === 'https://app.dijimedu.com' && Number(window.dmShellBuild) >= 2) {
  try { startRuntime('site'); } catch (e) { console.warn('[DijiMedu] Site katmanı başlatılamadı', e); }
}
