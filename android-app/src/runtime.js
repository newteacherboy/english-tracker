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
import { REWARDS, goldOfferEligible, isTeacherSession } from './reward-offers.js';

if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
  window.dmAndroidShell = { version: 2, ads: 'test', rewards: REWARDS };
  window.dmAndroidIsTeacher = () => { try { return isTeacherSession({ portal: window.dmTeacherPortalMode === true, classroomPlayer: typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci, name: typeof aktifOgrenciAdi === 'undefined' ? '' : aktifOgrenciAdi }); } catch { return true; } };
  window.dmAndroidGoldBalance = () => { try { return typeof yo !== 'undefined' && yo ? Number(yo.altin) : NaN; } catch { return NaN; } };
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
    const energyClose = document.querySelector('#ybPerde.acik[data-tur="enerji"] .yb-kapat,.dm-papi-feedback.is-energy .dm-papi-feedback-close');
    if (energyClose) { energyClose.click(); return; }
    if (window.dmViewHistory?.back?.()) return;
    const visible = el => el && el.getClientRects().length && !el.inert;
    const game = [...document.querySelectorAll('.dm-session-surface')].filter(visible).at(-1);
    const close = game?.querySelector('.dm-session-back,.game-close-btn,[data-close],.dc-exit-btn');
    if (close && !close.disabled) { close.click(); return; }
    if (canGoBack) { history.back(); return; }
    if (confirm('Diji Medu’dan çıkmak istiyor musun?')) void App.exitApp();
  });
  void App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) window.speechSynthesis?.cancel(); // Do not cancel Android's own recognition permission/dialog activity.
  });
  // Both choices are opt-in. The preview never credits the real student's wallet.
  document.addEventListener('DOMContentLoaded', () => {
    let lastBalance;
    const selector = '#ybPerde.acik[data-tur="enerji"] .yb-en-kart,.dm-papi-feedback.is-energy .dm-papi-feedback-card,#dsEnergy';
    function addButton(card, kind) {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.dmTestAd = kind;
      button.style.cssText = 'display:block;width:100%;min-height:44px;margin-top:10px;padding:10px 12px;border:1px solid #09858c;border-radius:12px;background:#eefafa;color:#07535b;font:700 13px/1.4 system-ui';
      const noun = kind === 'gold' ? 'altın' : 'enerji';
      button.textContent = '▶ ' + REWARDS[kind] + ' ' + noun + ' reklamını dene · ödül verilmez';
      button.onclick = async () => {
        button.disabled = true;
        try {
          const result = await ads.show(kind);
          button.textContent = result.completed ? '✓ ' + noun + ' reklam testi tamamlandı · ödül verilmedi' : 'Reklam kapatıldı · ödül verilmedi';
        } catch (error) { button.textContent = error.message || 'Test reklamı yüklenemedi.'; }
        finally { button.disabled = false; }
      };
      card.append(button);
    }
    function attach() {
      const teacher = teacherMode(window), balance = window.dmAndroidGoldBalance();
      for (const card of document.querySelectorAll(selector)) {
        if (teacher) { card.querySelectorAll('[data-dm-test-ad]').forEach(button => button.remove()); continue; }
        if (!card.getClientRects().length) continue;
        if (!card.querySelector('[data-dm-test-ad="energy"]')) addButton(card, 'energy');
        const requestedPrice = Math.max(100, ...[...card.querySelectorAll('[data-pack][disabled]')].map(button => {
          const amount = Number(button.dataset.pack), capacity = Number(window.genelEnerjiMax || 25), current = Number(window.genelEnerjiKalan || 0);
          return current + amount <= capacity ? ({5:100,10:130,15:180}[amount] || 100) : 100;
        }));
        const gold = card.querySelector('[data-dm-test-ad="gold"]');
        if (goldOfferEligible({ balance, requestedPrice })) { if (!gold) addButton(card, 'gold'); }
        else if (gold) gold.remove();
      }
      lastBalance = balance;
    }
    new MutationObserver(attach).observe(document.body, { subtree: true, childList: true });
    // Wallet values are lexical portal state; re-check when they change even if no panel is repainted.
    setInterval(() => { if (!document.hidden && !Object.is(lastBalance, window.dmAndroidGoldBalance())) attach(); }, 1000);
    document.addEventListener('dm:login', attach);
    attach();
  }, { once: true });
}
