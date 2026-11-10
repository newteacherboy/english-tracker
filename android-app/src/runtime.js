import adConfig from '../admob.config.json';
import { createRewardClient } from './reward-client.js';
const production=typeof DM_PRODUCTION_ADS!=='undefined' && DM_PRODUCTION_ADS;
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Haptics } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { PushNotifications } from '@capacitor/push-notifications';
import { AdMob, RewardAdPluginEvents, InterstitialAdPluginEvents, BannerAdPluginEvents } from '@capacitor-community/admob';
import { installSpeech } from './speech.js';
import { createTestAds, teacherMode } from './ads.js';
import { createPlacements } from './ad-placements.js';
import { createAdRemote } from './ad-remote.js';
import { REWARDS, goldOfferEligible, isTeacherSession } from './reward-offers.js';
import { createBilling } from './billing.js';
import { createUpsell } from './upsell.js';
import { createPush } from './push.js';

// Aynı katman iki platformda çalışır. iOS'ta yalnız DmBilling eklentisini taşıyan 1.1+ paketlerde açılır
// (1.0 kabuğu bu dosyayı hiç yüklemez). Genel adlar (dmAndroid*) web kodu değişmesin diye korunur.
const platform = Capacitor.getPlatform();
const ios = platform === 'ios';
// Kabuk (1.3+/1.1+) bu dosyayı önce siteden (ingilizce/native/runtime-*.js) yükler; açılmazsa paketteki kopyayı çalıştırır.
// Böylece reklam kimlikleri, reklam/abonelik kuralları ve bu katmandaki düzeltmeler yeni sürüm gerektirmez.
export function startRuntime(source = 'paket') {
if (!(Capacitor.isNativePlatform() && (platform === 'android' || (ios && Capacitor.isPluginAvailable('DmBilling'))) && !window.dmAndroidShell)) return false;
{
  const units = ios ? adConfig.ios.units : adConfig.units;
  const live = production && (!ios || adConfig.ios.productionEnabled === true);
  window.dmAndroidShell = { version: 7, platform, source, shellBuild: Number(window.dmShellBuild) || 0, ads: live?'production':'test', rewards: REWARDS };
  installExtras();
  window.dmAndroidIsTeacher = () => { try { return isTeacherSession({ portal: !!window.dmTeacherPortalMode, classroomPlayer: typeof siniftaOynananOgrenci !== 'undefined' && siniftaOynananOgrenci, name: typeof aktifOgrenciAdi === 'undefined' ? '' : aktifOgrenciAdi }); } catch { return true; } };
  window.dmAndroidStudentName = () => { try { return typeof aktifOgrenciAdi === 'undefined' ? '' : String(aktifOgrenciAdi || ''); } catch { return ''; } };
  window.dmAndroidGoldBalance = () => { try { return typeof yo !== 'undefined' && yo ? Number(yo.altin) : NaN; } catch { return NaN; } };
  // iOS'ta titreşim, ağ ve konuşma web tarafındaki native-app.js ile çalışır.
  if (!ios) { window.dmNativeServices = { App, Browser, Haptics, Network }; installSpeech(window, SpeechRecognition, TextToSpeech); }
  const ads = createTestAds(AdMob, window, RewardAdPluginEvents,{production:live,units,testUnits:ios?adConfig.ios.testUnits:null,rewardClient:createRewardClient(window,adConfig.ssvCallbackUrl.replace(/\/ssv$/, ''))});
  window.dmAndroidAds = ads;
  const adRemote = createAdRemote({ win: window, endpoint: adConfig.ssvCallbackUrl.replace(/\/ssv$/, '') });
  window.dmAndroidAdSettings = adRemote;
  const placements = createPlacements({admob:AdMob,ads,win:window,interstitialEvents:InterstitialAdPluginEvents,bannerEvents:BannerAdPluginEvents,remote:adRemote});
  window.dmAndroidPlacements = placements;
  const billing = createBilling({ plugin: registerPlugin('DmBilling'), store: ios ? 'apple' : 'google', win: window, endpoint: adConfig.ssvCallbackUrl.replace(/\/ad-rewards\/ssv$/, '/billing') });
  window.dmAndroidBilling = billing;
  window.dmAndroidOpenPlans = source => billing.open(source);
  const upsell = createUpsell({ win: window, billing, isTeacher: () => teacherMode(window), watch: kind => window.dmAndroidWatchReward(kind) });
  window.dmAndroidUpsell = upsell;
  const push = createPush({ plugin: PushNotifications, platform, win: window, endpoint: adConfig.ssvCallbackUrl.replace(/\/ad-rewards\/ssv$/, '/push'), isTeacher: () => teacherMode(window) });
  window.dmAndroidPush = push;
  // The portal's API tokens stay in its own WebView. Do not copy browser cookies/tokens.
  if (!ios) document.addEventListener('click', async event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin === location.origin || !['https:', 'http:'].includes(url.protocol)) return;
    event.preventDefault();
    try { await Browser.open({ url: url.href }); }
    catch { window.DijiMeduPapiFeedback?.notice('Bağlantı açılamadı. Yeniden deneyebilirsin.'); }
  });
  // Both choices are opt-in. The preview never credits the real student's wallet.
  // iOS'ta bu dosya sayfa yüklendikten sonra da gelebilir.
  const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn();
  ready(() => {
    if (!ios) void App.addListener('backButton', ({ canGoBack }) => {
      if (billing.isOpen()) { billing.close(); return; }
      if (document.querySelector('.dmu-veil')) { upsell.close(); return; }
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
      placements.setActive(isActive);
      if (isActive) { void adRemote.refresh(); void push.sync(); }
      if (!isActive) window.speechSynthesis?.cancel(); // Do not cancel Android's own recognition permission/dialog activity.
    });
    placements.start();
    upsell.start();
    push.start();
    // Reklam ayarları: açılışta, girişte ve 15 dakikada bir sunucudan.
    void adRemote.refresh(true);
    document.addEventListener('dm:login', () => void adRemote.refresh(true));
    setInterval(() => { if (!document.hidden) void adRemote.refresh(); }, 60000);
    // Plan sunucudan okunur; cihazdaki abonelik varsa sessizce yeniden doğrulanır.
    const syncPlan = () => billing.refresh().then(() => billing.restore()).then(n => n && attach()).catch(() => {});
    document.addEventListener('dm:login', () => setTimeout(syncPlan, 500));
    syncPlan();
    window.addEventListener('dm:plan', () => attach());
    let lastBalance;
    const selector = '#ybPerde.acik[data-tur="enerji"] .yb-en-kart,.dm-papi-feedback.is-energy .dm-papi-feedback-card,#dsEnergy,.ds-offer,.ds-joker,.ds-pack';
    // Ödüllü video: göster, sunucu doğrulamasını bekle, cüzdanı ve üst göstergeyi güncelle.
    async function watchReward(kind) {
      const noun = kind === 'gold' ? 'altın' : 'enerji';
      const result = await ads.show(kind);
      if (result.test) return { ok: result.completed, message: result.completed ? 'Test videosu tamamlandı (ödül verilmez).' : 'Video kapatıldı, ödül verilmedi.' };
      if (!result.claimed) return { ok: false, message: result.pending ? 'Ödül doğrulanıyor, birazdan hesabına geçecek.' : 'Video kapatıldı, ödül verilmedi.' };
      if (typeof headerEnerjiGoster === 'function') headerEnerjiGoster(result.energy, Number(window.dmAndroidPlan?.limits?.energyMax || 25));
      if (typeof yo !== 'undefined' && yo) { yo.altin = result.gold; yo.guncelleme = Date.now(); try { localStorage.setItem('ing_yo_' + window.dmAndroidStudentName(), JSON.stringify(yo)); } catch {} }
      if (typeof yoArayuzTazele === 'function') yoArayuzTazele();
      return { ok: true, message: '+' + result.added + ' ' + noun + ' hesabına eklendi!' };
    }
    window.dmAndroidWatchReward = watchReward;
    function rewardButton(kind, compact) {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.dmTestAd = kind;
      button.className = compact ? 'dmu-mini' : 'dmu-video';
      const label = kind === 'gold' ? '▶ Video izle, +100 altın' : '▶ Video izle, 7 enerji al';
      button.textContent = live ? label : label + ' (test)';
      button.onclick = async () => {
        button.disabled = true;
        try { const r = await watchReward(kind); button.textContent = r.ok ? '✓ ' + r.message : r.message; }
        catch (error) { button.textContent = error.message || 'Video açılamadı.'; }
        finally { button.disabled = false; }
      };
      return button;
    }
    function addButton(card, kind) {
      if (!placements.rewardEnabled()) return;
      upsell.ensureStyle();
      const button = rewardButton(kind, card.matches('.ds-offer,.ds-joker,.ds-pack'));
      if (kind === 'energy' && card.id === 'dsEnergy') {
        button.onclick = () => window.DijiMeduPapiFeedback?.energy?.();
      }
      const premium = kind === 'energy' && card.matches('.dm-papi-feedback-card') ? card.querySelector('.dm-energy-premium') : null;
      if (premium) card.insertBefore(button, premium);
      else card.append(button);
    }
    function addPlanOffer(card) {
      upsell.ensureStyle();
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.dmPlanOffer = '1'; button.className = 'dmu-pro';
      button.textContent = '👑 Premium ol, sınırsız enerjin olsun';
      button.onclick = () => billing.open('enerji');
      card.append(button);
    }
    function attach() {
      const teacher = teacherMode(window), balance = window.dmAndroidGoldBalance();
      for (const card of document.querySelectorAll(selector)) {
        if (teacher || !placements.rewardEnabled()) { card.querySelectorAll('[data-dm-test-ad]').forEach(button => button.remove()); if (teacher) continue; }
        if (!card.getClientRects().length) continue;
        const purchaseCard = card.matches('.ds-offer,.ds-joker,.ds-pack');
        const unlimited = window.dmAndroidPlan?.limits?.unlimitedEnergy === true, energyAd = card.querySelector('[data-dm-test-ad="energy"]');
        if (!purchaseCard && !unlimited && !energyAd) addButton(card, 'energy');
        else if (unlimited && energyAd) energyAd.remove();
        const plan = window.dmAndroidPlan?.plan || 'free', offer = card.querySelector('[data-dm-plan-offer]');
        if (!purchaseCard && plan === 'free' && !offer) addPlanOffer(card);
        else if (plan !== 'free' && offer) offer.remove();
        let requestedPrice = Math.max(230, ...[...card.querySelectorAll('[data-pack][disabled]')].map(button => {
          const amount = Number(button.dataset.pack), capacity = Number(window.genelEnerjiMax || 25), current = Number(window.genelEnerjiKalan || 0);
          return current + amount <= capacity ? ({5:230,10:300,15:460}[amount] || 230) : 230;
        }));
        if(purchaseCard) requestedPrice=Number((card.querySelector('.ds-price')?.textContent||'').replace(/\D/g,''));
        const shortage = !purchaseCard || (/Altın eksik/i.test(card.querySelector('.ds-buy')?.textContent||'') && requestedPrice>balance);
        const gold = card.querySelector('[data-dm-test-ad="gold"]');
        if (shortage && goldOfferEligible({ balance, requestedPrice })) { if (!gold) addButton(card, 'gold'); }
        else if (gold) gold.remove();
      }
      lastBalance = balance;
    }
    new MutationObserver(attach).observe(document.body, { subtree: true, childList: true });
    // Wallet values are lexical portal state; re-check when they change even if no panel is repainted.
    setInterval(() => { if (!document.hidden && !Object.is(lastBalance, window.dmAndroidGoldBalance())) attach(); }, 1000);
    document.addEventListener('dm:login', attach);
    window.addEventListener('dm:ad-settings', attach);
    attach();
  });
}
return true;
}

// Paylaşma, mağaza puanı ve bağlantıdan açılma. Yalnız eklentisi olan kabuklarda çalışır.
function installExtras() {
  const has = name => { try { return Capacitor.isPluginAvailable(name); } catch { return false; } };
  // Android WebView'da navigator.share yok: yerel paylaşım penceresine bağlanır.
  if (has('Share') && typeof navigator.share !== 'function') {
    const Share = registerPlugin('Share');
    try {
      navigator.share = async (data = {}) => {
        const r = await Share.share({ title: data.title || '', text: data.text || '', url: data.url || undefined, dialogTitle: 'Paylaş' });
        return r;
      };
      navigator.canShare = () => true;
    } catch {}
  }
  window.dmNativeShare = has('Share') ? (data => registerPlugin('Share').share(data)) : null;
  // Mağaza puan penceresi (Google/Apple ne zaman gösterileceğine kendileri karar verir).
  window.dmRequestReview = async () => {
    if (!has('DmBilling')) return { shown: false };
    try { const p = registerPlugin('DmBilling'); return typeof p.requestReview === 'function' ? await p.requestReview() : { shown: false }; }
    catch { return { shown: false }; }
  };
  // E-posta vb. bağlantılar: app.dijimedu.com/ingilizce/... uygulamada açılır.
  const open = raw => {
    try {
      const u = new URL(raw);
      if (u.hostname !== 'app.dijimedu.com' || !u.pathname.startsWith('/ingilizce')) return;
      if (u.href === location.href) return;
      location.href = u.href;
    } catch {}
  };
  void App.addListener('appUrlOpen', e => open(e?.url));
  App.getLaunchUrl?.().then(r => {
    const url = r?.url; if (!url) return;
    let done = ''; try { done = sessionStorage.getItem('dm_launch_url') || ''; } catch {}
    if (done === url) return;
    try { sessionStorage.setItem('dm_launch_url', url); } catch {}
    open(url);
  }).catch(() => {});
}
