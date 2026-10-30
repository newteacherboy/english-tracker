import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Haptics } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import { installSpeech } from './speech.js';
import { createTestAds, teacherMode } from './ads.js';

if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
  window.dmAndroidShell = { version: 1, ads: 'test' };
  window.dmAndroidIsTeacher = () => { try { return (typeof yo !== 'undefined' && !!yo) || (typeof siniftaOynananOgrenci !== 'undefined' && !!siniftaOynananOgrenci) || (typeof aktifOgrenciAdi !== 'undefined' && String(aktifOgrenciAdi).toLowerCase() === 'teacher'); } catch { return true; } };
  window.dmNativeServices = { App, Browser, Haptics, Network };
  installSpeech(window, SpeechRecognition, TextToSpeech);
  const ads = createTestAds(AdMob, window, RewardAdPluginEvents);
  window.dmAndroidAds = ads;
  // The portal's API tokens stay in its own WebView. Do not copy browser cookies/tokens.
  document.addEventListener('click', async event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin === location.origin || !['https:', 'http:'].includes(url.protocol)) return;
    event.preventDefault();
    try { await Browser.open({ url: url.href }); }
    catch { window.DijiMeduPapiFeedback?.notice('Bağlantı açılamadı. Yeniden deneyebilirsin.'); }
  });
  void App.addListener('backButton', ({ canGoBack }) => {
    if (window.dmViewHistory?.back?.()) return;
    const visible = el => el && el.getClientRects().length && !el.inert;
    const game = [...document.querySelectorAll('.dm-session-surface')].filter(visible).at(-1);
    const close = game?.querySelector('.dm-session-back,.game-close-btn,[data-close],.dc-exit-btn');
    if (close && !close.disabled) { close.click(); return; }
    if (canGoBack) { history.back(); return; }
    if (confirm('Diji Medu’dan çıkmak istiyor musun?')) void App.exitApp();
  });
  void App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) { window.speechSynthesis?.cancel(); void SpeechRecognition.stop().catch(() => {}); }
  });
  // Offer only an explicitly labeled demo on the energy panel, never an automatic ad.
  document.addEventListener('DOMContentLoaded', () => {
    function attach() {
      const card = document.querySelector('.dm-papi-feedback.is-energy .dm-papi-feedback-card');
      if (!card || card.querySelector('[data-dm-test-ad]') || teacherMode(window)) return;
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.dmTestAd = '';
      button.textContent = '▶ Test reklamını dene · enerji verilmez';
      button.onclick = async () => {
        button.disabled = true;
        try {
          const result = await ads.show();
          button.textContent = result.completed ? '✓ Test tamamlandı · enerji verilmedi' : 'Reklam kapatıldı · enerji verilmedi';
        } catch (error) { button.textContent = error.message || 'Test reklamı yüklenemedi.'; }
        finally { button.disabled = false; }
      };
      card.append(button);
    }
    new MutationObserver(attach).observe(document.body, { subtree: true, childList: true });
    attach();
  }, { once: true });
}
