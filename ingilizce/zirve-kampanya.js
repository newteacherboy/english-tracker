/* [18 Kas 2026] "Öğretmenimle Zirveye!" — 24 Kasım Öğretmenler Günü kampanyası (20 Kasım – 10 Aralık 2026).
   Kurallar ve puanlar sunucuda (supabase/migrations/20261118030000_ogretmenimle_zirveye_kampanya.sql):
   - Yalnız kampanya tarihlerinde kazanılan XP sayılır, günde en fazla 3.500.
   - Öğrenci sıralaması bireysel (sınıfı olan/olmayan aynı liste); öğretmen sıralaması ≥10 öğrenci, öğrenci başı ortalama.
   - Davet: e-posta doğrulama + ilk 3 durak + bir günde 300 XP. 5 davet = bireysel ödül sıralaması şartı.
   - Önce yalnız yönetici görür; yönetici panelinden herkese açılır. Final ödüllerini yönetici onaylar.
   Sunucu yükü: durum 60 sn önbellekte; sıralama 15 dk'da bir toplu hesaplanır. Maskot: canlı 3D Papi (DMPapi). */
(() => {
'use strict';
if (window.dmZirve) return;
const API = 'https://nxfqlutulxqzqgwewssd.supabase.co/rest/v1/rpc/';
const KEY = 'sb_publishable_K9h4CnyaL8xb8B98o8aaFw_s9cMikuF';
const APP_URL = 'https://app.dijimedu.com/ingilizce/';
const D = document;
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Math.max(0, Math.trunc(Number(n) || 0)).toLocaleString('tr-TR');
const toast = m => (window.yoToast || window.maToast || (x => console.info(x)))(m);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};
const today = () => new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Istanbul'}).format(new Date());
const studentToken = () => store.get('ing_token') || '';
const teacherToken = () => {
  try { const s = JSON.parse(sessionStorage.getItem('dm_tp_session') || 'null'); if (s?.teacherToken) return s.teacherToken; } catch {}
  try { if (window.dmTeacherPortalMode && window.dmTeacherPortalSession?.teacherToken) return window.dmTeacherPortalSession.teacherToken;
    return sessionStorage.getItem('ing_ogr_token') || ''; } catch {}
  return '';
};
const who = () => String(typeof aktifOgrenciAdi === 'undefined' ? '' : aktifOgrenciAdi || store.get('ing_aktifOgrenci') || '');

const I = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  go: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.6l6.8-4M8.6 13.4l6.8 4"/></g></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></g></svg>',
  game: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="14" width="40" height="22" rx="11" fill="#7B45EE"/><rect x="11" y="23" width="10" height="4" rx="2" fill="#fff"/><rect x="14" y="20" width="4" height="10" rx="2" fill="#fff"/><circle cx="32" cy="22" r="3" fill="#FFD23F"/><circle cx="37" cy="27" r="3" fill="#FFD23F"/></svg>',
  board: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="8" width="38" height="26" rx="4" fill="#1F7A5A" stroke="#C98A3C" stroke-width="3"/><circle cx="18" cy="19" r="4" fill="#fff"/><circle cx="30" cy="19" r="4" fill="#fff"/><path d="M11 30c1-5 13-5 14 0M23 30c1-5 13-5 14 0" fill="#fff"/><path d="M16 34l-4 9M32 34l4 9" stroke="#C98A3C" stroke-width="3" stroke-linecap="round"/></svg>',
  cup: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="#FFC52E"/><path d="M18 12H8v4a10 10 0 0 0 10 10M46 12h10v4a10 10 0 0 1-10 10" fill="none" stroke="#FFC52E" stroke-width="4"/><path d="M32 13l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="#FFF3B0"/><rect x="28" y="36" width="8" height="10" fill="#E0A800"/><rect x="18" y="46" width="28" height="8" rx="3" fill="#7A4A12"/></svg>',
  crown: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 22l12 10 12-18 12 18 12-10-5 28H13z" fill="#FFC52E" stroke="#E0A800" stroke-width="2" stroke-linejoin="round"/><path d="M32 30l5 7-5 7-5-7z" fill="#8A4DFF"/><circle cx="8" cy="20" r="4" fill="#FFC52E"/><circle cx="32" cy="12" r="4" fill="#FFC52E"/><circle cx="56" cy="20" r="4" fill="#FFC52E"/></svg>',
  star: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6l7.6 15.4 17 2.5-12.3 12 2.9 16.9L32 44.8 16.8 52.8l2.9-16.9-12.3-12 17-2.5z" fill="#FFC52E" stroke="#E0A800" stroke-width="2" stroke-linejoin="round"/><rect x="20" y="54" width="24" height="6" rx="2" fill="#8C5A2B"/></svg>'
};
const IMG_KIDS = 'friends-assets/friends-kids.webp';
const IMG_GIFT = 'daily-gift-assets/papi-gift-3d.webp';

function papi(mood = 'cosku', cls = '') {
  let svg = '';
  try { svg = window.DMPapi?.html ? window.DMPapi.html(mood, 'Papi') : ''; } catch {}
  if (!svg) svg = '<img src="' + IMG_GIFT + '" alt="" style="width:100%;height:100%;object-fit:contain">';
  return '<span class="zk-papi dm-papi-host ' + cls + '" aria-hidden="true">' + svg + '</span>';
}
function confetti() {
  const colors = ['#FFD23F', '#9A5CFF', '#FF9BB0', '#2DD4BF', '#FFB52E'];
  let h = '<span class="zk-confetti" aria-hidden="true">';
  for (let i = 0; i < 12; i++) h += '<i style="left:' + (5 + i * 8) + '%;top:-10px;background:' + colors[i % 5] + ';animation-delay:' + (i * 0.31).toFixed(2) + 's"></i>';
  return h + '</span>';
}

/* ---------- Sunucu ---------- */
async function rpc(op, args) {
  const r = await fetch(API + op, {method: 'POST', headers: {'Content-Type': 'application/json', apikey: KEY}, body: JSON.stringify(args), signal: AbortSignal.timeout(15000)});
  let d = null; try { d = await r.json(); } catch {}
  if (!r.ok) throw Error('Kampanya bilgisi alınamadı. Bağlantını kontrol et.');
  return d || {};
}
const cache = new Map();
async function status(tok, force = false) {
  if (!tok) return null;
  const hit = cache.get(tok);
  if (!force && hit && Date.now() - hit.at < 60000) return hit.data;
  if (!force && hit?.pending) return hit.pending;
  const pending = rpc('dm_campaign_status', {p_token: tok}).then(d => { cache.set(tok, {at: Date.now(), data: d}); return d; })
    .catch(() => { cache.delete(tok); return null; });
  cache.set(tok, {at: 0, data: hit?.data || null, pending});
  return pending;
}
const isOn = s => !!(s && s.ok && s.visible);

/* ---------- Metinler ---------- */
const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const day = v => { const [y, m, d] = String(v || '').split('-').map(Number); return d ? d + ' ' + MONTHS[m - 1] : ''; };
const range = c => day(c.startsOn) + ' – ' + day(c.endsOn);
function phaseText(c) {
  if (!c) return '';
  if (c.phase === 'soon') return c.daysToStart > 0 ? c.daysToStart + ' gün sonra başlıyor' : 'Yarın başlıyor';
  if (c.phase === 'live') return c.daysLeft <= 1 ? 'Son gün!' : c.daysLeft + ' gün kaldı';
  if (c.phase === 'ended') return 'Sonuçlar ' + day(c.resultsOn);
  return 'Kazananlar belli oldu';
}

/* ---------- Katmanlar ---------- */
let layer = null;
function openLayer(html, onReady, pageClass = '') {
  closeLayer();
  const el = D.createElement('section');
  el.className = 'zk-layer' + (pageClass ? ' ' + pageClass : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = '<div class="zk-wrap">' + html + '</div>';
  D.body.append(el); D.documentElement.classList.add('zk-open'); layer = el;
  try { window.dmViewHistory?.track?.(el, {close: closeLayer}); } catch {}
  el.addEventListener('click', e => { if (e.target.closest('[data-zk-back]')) closeLayer(); });
  onReady?.(el);
  if (el.classList.contains('zk-one-screen')) fitHub(el);
  return el;
}
// Measure the actual safe-area content after layout, not just the nominal screen size.
function fitHub(el) {
  const wrap=el.querySelector('.zk-wrap'); if(!wrap)return;
  let raf=0, disposed=false;
  const fit=()=>{
    raf=0;if(disposed||!el.isConnected)return;
    const css=getComputedStyle(el);
    const available=el.clientHeight-parseFloat(css.paddingTop||0)-parseFloat(css.paddingBottom||0);
    const height=wrap.offsetHeight;
    const scale=available>0&&height>0?Math.min(1,(available-2)/height):1;
    // Preserve readable text and access to controls on unusually short or zoomed layouts.
    const fits=scale>=0.85;
    el.classList.toggle('zk-hub-fitted',fits);
    wrap.style.setProperty('--zk-fit-scale',String(fits?scale:1));
  };
  const schedule=()=>{if(!disposed&&!raf)raf=requestAnimationFrame(fit);};
  const ro=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
  ro?.observe(el);ro?.observe(wrap);
  window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
  D.fonts?.ready?.then(schedule).catch(()=>{});
  el.zkFitDispose=()=>{disposed=true;ro?.disconnect();if(raf)cancelAnimationFrame(raf);window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);};
  schedule();
}
function closeLayer() {
  const el = layer; if (!el) return; layer = null;
  try { window.dmViewHistory?.leave?.(el); } catch {}
  el.zkFitDispose?.();el.remove();
  if (!D.querySelector('.zk-layer,.zk-veil')) D.documentElement.classList.remove('zk-open');
}
function veil(html, sheet = false, onClose, pageClass = '') {
  const v = D.createElement('div');
  v.className = 'zk-veil' + (sheet ? ' sheet' : '') + (pageClass ? ' ' + pageClass : '');
  v.innerHTML = '<div class="zk-pop" role="dialog" aria-modal="true">' + html + '</div>';
  D.body.append(v); D.documentElement.classList.add('zk-open');
  const close = () => { try { window.dmViewHistory?.leave?.(v); } catch {} v.remove(); if (!D.querySelector('.zk-layer,.zk-veil')) D.documentElement.classList.remove('zk-open'); onClose?.(); };
  try { window.dmViewHistory?.track?.(v, {close}); } catch {}
  v.addEventListener('click', e => { if (e.target === v || e.target.closest('[data-zk-close]')) close(); });
  return {el: v, close};
}
function top(s, title) {
  return '<div class="zk-top"><button type="button" class="zk-back" data-zk-back aria-label="Geri">' + I.back + '</button>' +
    '<div class="zk-logo">' + (title || 'Öğretmenimle<span>Zirveye!</span>') + '</div>' +
    '<div class="zk-days">' + esc(phaseText(s.campaign)) + '</div></div>' +
    (s.preview ? '<div class="zk-preview">Önizleme: kampanya şu an yalnız yönetici hesabında görünüyor.</div>' : '');
}

/* ---------- Paylaşım ---------- */
async function share(text, url) {
  try { if (navigator.share) { await navigator.share({title: 'Diji Medu · Öğretmenimle Zirveye!', text, url}); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text + ' ' + url); toast('Bağlantı kopyalandı. İstediğin yere yapıştır!'); }
  catch { prompt('Bu bağlantıyı kopyala:', url); }
}
const inviteUrl = code => APP_URL + '?davet=' + encodeURIComponent(code);
const teacherInviteUrl = code => APP_URL + '?kod=' + encodeURIComponent(code) + '&zirveOgretmen=1';

/* =================== ÖĞRENCİ =================== */
function goalRow(title, count, goal, note, action = '', extra = '') {
  const n = Math.max(0, Number(count)||0), done = n >= goal;
  return '<div class="zk-goal'+(done?' done':'')+'"><div class="zk-goal-top"><b>'+esc(title)+'</b><span class="zk-goal-state">'+(done?'✓ Tamamlandı':fmt(goal-n)+' kaldı')+'</span></div><div class="zk-bar" role="progressbar" aria-valuemin="0" aria-valuemax="'+goal+'" aria-valuenow="'+Math.min(n,goal)+'"><i style="width:'+Math.min(100,n/goal*100)+'%"></i></div><div class="zk-goal-foot"><small>'+fmt(Math.min(n,goal))+' / '+fmt(goal)+' · '+esc(note)+'</small>'+(action?'<button type="button" data-zk="'+action+'">Devam et ›</button>':'')+'</div>'+extra+'</div>';
}
function inlineInvite(code, phase) {
  if (!['soon','live'].includes(phase)) return '';
  const url=code?inviteUrl(code):'';
  return '<div class="zk-inline-invite"><button type="button" class="zk-invite-detail" data-zk="invite" aria-label="Kişisel davet bağlantın: davet şartlarını ve ilerlemeyi aç">Kişisel davet bağlantın <span aria-hidden="true">ⓘ</span></button>'+
    (url?'<div class="zk-inline-url">'+esc(url)+'</div><div class="zk-inline-actions"><button type="button" data-zk="copy-invite">'+I.share+' Linki Kopyala</button><button type="button" data-zk="send-invite">Arkadaşlarına Gönder '+I.go+'</button></div>':'<button type="button" class="zk-btn small" data-zk="retry-invite">Davet bağlantısını oluştur</button>')+
    '</div>';
}
const inviteShareText = 'Diji Medu’da Öğretmenimle Zirveye yarışmasına katılıyorum! Benim bağlantımla gel, birlikte İngilizce öğrenelim.';
function compactGoal(title,count,goal,extra='',detail='') {
  const n=Math.max(0,Number(count)||0),max=Math.max(1,Number(goal)||1),done=n>=max;
  return '<div class="zk-goal zk-compact-goal'+(done?' done':'')+'"><div class="zk-goal-top"><b>'+esc(title)+'</b><span class="zk-goal-state">'+(done?'✓ ':'')+fmt(Math.min(n,max))+' / '+fmt(max)+'</span></div>'+
    '<div class="zk-bar" role="progressbar" aria-label="'+esc(title)+'" aria-valuemin="0" aria-valuemax="'+max+'" aria-valuenow="'+Math.min(n,max)+'"><i style="width:'+Math.min(100,n/max*100)+'%"></i></div>'+
    (detail?'<small class="zk-compact-detail">'+esc(detail)+'</small>':'')+extra+'</div>';
}
function studentGoals(s) {
  const inv=s.invite||{},me=s.me||{},pending=Number(inv.pending)||0;
  return '<section class="zk-card zk-goals"><h3 class="zk-ribbon">GÖREVLERİM</h3>'+
    compactGoal('👥 5 arkadaşını davet et',inv.verified,5,inlineInvite(inv.code,s.campaign.phase),pending?fmt(pending)+' davet doğrulama bekliyor.':'')+
    compactGoal('⚡ Bugünkü XP hedefi',me.today,s.cap||3500)+'</section>';
}
async function openStudentHub() {
  const tok=studentToken();
  const s = await status(tok, true);
  if (!isOn(s) || tok!==studentToken()) { toast('Kampanya şu an açık değil.'); return; }
  layerRole = 'student';
  const me = s.me || {}, inv = s.invite || (s.invite={}), c = s.campaign;
  if (!s.guest && s.role==='student' && !inv.code && ['soon','live'].includes(c.phase)) {
    try { const d=await rpc('dm_campaign_invite_code',{p_token:tok}); if(d.ok && d.code) inv.code=d.code; } catch {}
    if(tok!==studentToken()) return;
  }
  const rankLine = s.guest ? 'Öğretmen alanında yarışmaya katılım sayılmaz.'
    : (inv.verified||0)<5 ? 'Ödül sıralamasına girmek için '+(5-(inv.verified||0))+' doğrulanmış davet kaldı.' 
    : c.phase === 'soon' ? 'Yarışma ' + day(c.startsOn) + ' günü başlıyor. Hazır ol!'
    : me.rank ? (me.rank <= 20 ? 'Ödül bölgesindesin! Yerini koru.' : 'Ödül bölgesine ' + fmt(me.toPrize) + ' XP kaldı. Birkaç oyun yeter!')
    : 'İlk XP\'ni kazan, sıralamaya gir!';
  openLayer(top(s) +
    '<div class="zk-card zk-hero">' + confetti() + papi('cosku') +
      '<div><h2>Öğrenciler için<br><em>3 AY PREMİUM PRO!</em></h2><p>5 doğrulanmış davet + XP ile ilk 20\'ye gir.</p><span class="zk-chip gold">' + esc(range(c)) + '</span></div></div>' +
    '<div class="zk-me"><div class="zk-me-row"><span class="r">' + (me.rank ? me.rank + '.' : '—') + '</span><span class="n">Sen</span><span class="x">' + fmt(me.xp) + ' XP</span></div><small>' + esc(rankLine) + '</small></div>' +
    (!s.guest ? studentGoals(s) : '') +
    '<div class="zk-hub-actions"><button type="button" class="zk-btn gold" data-zk="rank">Canlı Sıralamayı Gör</button>'+
    '<div class="zk-hub-links"><button type="button" class="zk-link" data-zk="teacher">Öğretmenini Davet Et</button>'+
    '<button type="button" class="zk-link" data-zk="rules">Kurallar</button></div></div>',
  el => el.addEventListener('click', e => {
    const b = e.target.closest('[data-zk]'); if (!b) return;
    const k = b.dataset.zk;
    if(tok!==studentToken()) { closeLayer(); return; }
    if (k === 'copy-invite' && inv.code) {
      const url=inviteUrl(inv.code);
      navigator.clipboard?.writeText ? navigator.clipboard.writeText(url).then(()=>toast('Bağlantı kopyalandı!')).catch(()=>prompt('Bağlantını kopyala:',url)) : prompt('Bağlantını kopyala:',url);
    }
    else if (k === 'send-invite' && inv.code) share(inviteShareText,inviteUrl(inv.code));
    else if (k === 'retry-invite') openStudentHub();
    else if (k === 'rank') openRanking('students');
    else if (k === 'invite') openInvite();
    else if (k === 'teacher') shareTeacher();
    else if (k === 'rules') openRules();
  }), 'zk-student-hub zk-one-screen');
  store.set('zk_joined_' + who(), '1');
}

function shareTeacher() {
  share('Öğretmenim, Diji Medu\'da "Öğretmenimle Zirveye!" yarışması başladı! Sınıfınızı kurup en az 10 öğrenciyle katılırsanız ilk 2 öğretmene 1 yıl Premium Pro hediye. Birlikte zirveye çıkalım!', APP_URL);
}

function openRules() {
  const v = veil('<button type="button" class="zk-x" data-zk-close aria-label="Kapat">' + I.close + '</button>' +
    '<h3 class="zk-ribbon">KURALLAR</h3>' +
    '<ol class="zk-steps">' +
    ['Yalnız 20 Kasım – 10 Aralık arasında kazandığın XP sayılır. Herkes sıfırdan başlar.',
     'Günde en fazla 3.500 XP sayılır. Sınıra ulaşınca yarın devam edersin.',
     'Öğrenci sıralaması bireyseldir; sınıfın olsa da olmasa da aynı listede yarışırsın.',
     'İlk 20 ödülüne hak kazanmak için kişisel bağlantınla en az 5 doğrulanmış arkadaş davet et. Bu sırada XP toplamaya devam edebilirsin.',
     'İlk 5 öğrenciye 3 ay Premium Pro, 6–20. öğrencilere 3 ay Pro; ilk 2 öğretmene 1 yıl Premium Pro verilir.',
     'Öğretmenler en az 10 öğrenciyle yarışır; sınıftaki tüm öğrencilerin ortalama XP\'si sayılır.',
     'Davet sayılması için arkadaşın: e-postasını doğrular, ilk 3 durağı bitirir, bir günde 300 XP kazanır.',
     'Hile veya kural dışı hesaplar yarışmadan çıkarılır. Ödüller 11 Aralık\'ta hesaplara tanımlanır.']
      .map((t, i) => '<li><i>' + (i + 1) + '</i><span>' + esc(t) + '</span></li>').join('') + '</ol>' +
    '<button type="button" class="zk-btn" data-zk-close>Anladım</button>', true);
  return v;
}

/* ---------- Sıralama ---------- */
async function openRanking(kind = 'students') {
  const role = layerRole;
  const tok = role === 'teacher' ? teacherToken() : studentToken();
  const s = await status(tok);
  if (!isOn(s)) return;
  const tabs = [['students', 'Öğrenciler'], ['teachers', 'Öğretmenler'], ['invites', 'Davet']];
  const el = openLayer(top(s, '24 Kasım<span>Ligi</span>') +
    '<div class="zk-tabs" role="tablist">' + tabs.map(([k, n]) => '<button type="button" data-tab="' + k + '" aria-pressed="' + (k === kind) + '">' + n + '</button>').join('') + '</div>' +
    '<div data-board><p class="zk-empty">Sıralama yükleniyor…</p></div>');
  const paint = async k => {
    el.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === k)));
    const box = el.querySelector('[data-board]');
    box.innerHTML = '<p class="zk-empty">Sıralama yükleniyor…</p>';
    let d;
    try { d = await rpc('dm_campaign_leaderboard', {p_token: tok, p_kind: k}); } catch (e) { box.innerHTML = '<p class="zk-empty">' + esc(e.message) + '</p>'; return; }
    if (!d.ok) { box.innerHTML = '<p class="zk-empty">' + esc(d.message || 'Sıralama alınamadı.') + '</p>'; return; }
    box.innerHTML = boardHtml(k, d, s);
  };
  el.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) paint(t.dataset.tab); });
  paint(kind);
}
let layerRole = 'student';
function demoRanking(k) {
  const sample = k === 'teachers' ? [['Kaptan Papi', 820], ['Bilge Papi', 540], ['Renkli Papi', 280]] : k === 'invites' ? [['Gezgin Papi', 4], ['Neşeli Papi', 2], ['Meraklı Papi', 1]] : [['Yıldız Papi', 1250], ['Pilot Papi', 790], ['Çalışkan Papi', 460]];
  return '<div class="zk-card"><b>🌟 Papi antrenman rakipleri</b><p class="zk-note">Sanal örnekler · Gerçek sıralamayı ve ödülleri etkilemez.</p><ul class="zk-list">' + sample.map(([name, score]) => '<li><span class="nm">' + esc(name) + '<small>Sanal örnek</small></span><span>' + fmt(score) + (k === 'invites' ? ' davet' : k === 'teachers' ? ' ort. XP' : ' XP') + '</span></li>').join('') + '</ul></div>';
}
function boardHtml(k, d, s) {
  const rows = d.rows || [];
  const val = r => k === 'teachers' ? fmt(r.avg) + ' ort. XP' : k === 'invites' ? fmt(r.count) + ' davet' : fmt(r.xp) + ' XP';
  const sub = r => k === 'teachers' ? fmt(r.students) + ' öğrenci' : '';
  const head = k === 'teachers'
    ? '<div class="zk-card" style="font-size:13.5px;font-weight:800">Sıralama, sınıftaki <b>tüm öğrencilerin ortalama XP\'sine</b> göre. En az 10 öğrencisi olan öğretmenler yarışır. <b>İlk 2 öğretmene 1 yıl Premium Pro!</b></div>'
    : k === 'invites' ? '<div class="zk-card" style="font-size:13.5px;font-weight:800">En çok arkadaş getirenler. Bireysel ödül sıralaması için en az 5 doğrulanmış davet gerekir.</div>'
    : '<h3 class="zk-ribbon">ZİRVE SENİ BEKLİYOR</h3><div class="zk-card">Yalnız en az 5 doğrulanmış daveti olan öğrenciler ödül sıralamasında yer alır.</div>';
  const examples = s.campaign.phase === 'soon' || s.campaign.phase === 'live' ? demoRanking(k) : '';
  if (!rows.length) return head + examples + '<div class="zk-card zk-empty">' + (s.campaign.phase === 'soon' ? 'Yarışma ' + day(s.campaign.startsOn) + ' günü başlıyor. İlk sıra seni bekliyor!' : 'Henüz sıralamada kimse yok. İlk sen ol!') + '</div>';
  const pod = rows.slice(0, 3);
  const podium = '<div class="zk-card"><div class="zk-podium">' + [1, 0, 2].filter(i => pod[i]).map(i => {
    const r = pod[i];
    return '<div class="zk-pod r' + r.rank + '"><span class="av">' + esc(String(r.name || '?').slice(0, 1).toLocaleUpperCase('tr-TR')) + '</span><b>' + esc(r.name) + '</b><span>' + esc(val(r)) + '</span><span class="st">' + r.rank + '</span></div>';
  }).join('') + '</div></div>';
  const prizeCut = k === 'teachers' ? 2 : k === 'students' ? 20 : 0;
  const list = rows.slice(3).map(r => '<li class="' + (r.me ? 'me ' : '') + (r.rank <= prizeCut ? 'prize' : '') + '"><span class="rk">' + r.rank + '.</span><span class="nm">' + esc(r.name) + (sub(r) ? '<small>' + esc(sub(r)) + '</small>' : '') + '</span><span>' + esc(val(r)) + '</span></li>').join('');
  const mine = d.mine && !rows.some(r => r.me)
    ? '<div class="zk-me"><div class="zk-me-row"><span class="r">' + d.mine.rank + '.</span><span class="n">Sen</span><span class="x">' + esc(val(d.mine)) + '</span></div></div>' : '';
  return head + podium + examples + (list ? '<div class="zk-card"><ul class="zk-list">' + list + '</ul></div>' : '') +
    (prizeCut ? '<span class="zk-zone">ÖDÜL BÖLGESİ: 1–' + prizeCut + '. sıra</span>' : '') + mine +
    '<p class="zk-note">Sıralama 15 dakikada bir güncellenir.</p>';
}

/* ---------- Davet ---------- */
async function openInvite() {
  const tok = studentToken();
  const s = await status(tok, true);
  if (!isOn(s)) return;
  if (s.guest) { toast('Davet bağlantısı kişisel öğrenci hesabıyla alınır.'); return; }
  let code = s.invite?.code;
  if (!code) {
    try { const d = await rpc('dm_campaign_invite_code', {p_token: tok}); code = d.code; } catch {}
    cache.delete(tok);
  }
  const inv = s.invite || {}, ver = Math.min(5, inv.verified || 0), wait = Math.min(5 - ver, inv.pending || 0);
  let slots = '';
  for (let i = 1; i <= 5; i++) slots += i <= ver ? '<span class="zk-slot on">' + I.check + '</span>' : i <= ver + wait ? '<span class="zk-slot wait" title="Bekliyor">' + I.clock + '</span>' : '<span class="zk-slot">' + i + '</span>';
  const left = Math.max(0, 5 - ver);
  const el = openLayer(top(s, 'Arkadaşını<span>Getir!</span>') +
    '<div class="zk-card" style="background:linear-gradient(180deg,#E8F8DA,#CFF0C0);display:flex;align-items:center;gap:10px"><img src="' + IMG_KIDS + '" alt="" style="width:92px;height:92px;object-fit:contain;flex:none"><div><b style="font:900 23px/1.05 Nunito,system-ui,sans-serif;display:block">5 ARKADAŞ GETİR,<br><span style="color:#6B2FE0">ZİRVEYE KATIL!</span></b></div></div>' +
    '<div class="zk-card" style="display:flex;flex-direction:column;align-items:center;gap:10px"><div class="zk-count">' + ver + ' <span>/ 5</span></div><div class="zk-slots">' + slots + '</div>' +
      '<span class="zk-zone">' + (ver>=5 ? '✓ Davet görevi tamamlandı!' : 'Sıralamaya katılmak için ' + left + ' arkadaş kaldı!') + '</span>' +
      (wait ? '<small style="color:#9A6A00;font-weight:800">' + wait + ' arkadaşın şartları tamamlamayı bekliyor.</small>' : '') + '</div>' +
    '<div class="zk-card"><b>Davet nasıl sayılır?</b><ol class="zk-steps">' +
      ['Arkadaşın bağlantınla girer (yeni ya da eski hesap)', 'E-postasını doğrular', 'İlk 3 parkur durağını bitirir', 'Bir günde 300 XP kazanır: davet sayıldı!'].map((t, i) => '<li><i>' + (i + 1) + '</i>' + esc(t) + '</li>').join('') + '</ol></div>' +
    (code ? '<div class="zk-code"><div><small>Kişisel davet bağlantın</small><b>' + esc(inviteUrl(code).replace('https://', '')) + '</b></div><button type="button" data-copy>Kopyala</button></div>' : '<p class="zk-empty">Davet bağlantısı alınamadı. Tekrar dene.</p>') +
    '<button type="button" class="zk-btn" data-send ' + (code ? '' : 'disabled') + '>' + I.share + 'Arkadaşlarına Gönder</button>' +
    '<button type="button" class="zk-link" data-champs>Davet Şampiyonlarını gör</button>');
  const text = 'Diji Medu\'da "Öğretmenimle Zirveye!" yarışması başladı! Benim bağlantımla gel, birlikte İngilizce öğrenip zirveye çıkalım. 5 doğrulanmış davetle ödül yarışına katıl; ilk 5\'e Premium Pro, sonraki 15\'e Pro hediye!';
  el.querySelector('[data-send]')?.addEventListener('click', () => share(text, inviteUrl(code)));
  el.querySelector('[data-copy]')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(inviteUrl(code)); toast('Bağlantı kopyalandı!'); } catch { prompt('Bağlantını kopyala:', inviteUrl(code)); } });
  el.querySelector('[data-champs]')?.addEventListener('click', () => openRanking('invites'));
}

/* Davet bağlantısıyla gelen: kodu sakla, oturum açılınca kabul et. */
const teacherInviteKey = 'dm_zk_teacher_invite';
function captureTeacherInvite() {
  try {
    const u = new URL(location.href);
    const code = (u.searchParams.get('kod') || '').trim().toUpperCase();
    if ((u.searchParams.get('zirveOgretmen') === '1'||u.searchParams.get('sinifaKatil')==='1') && /^[A-Z0-9]{1,10}$/.test(code)) {
      sessionStorage.setItem(teacherInviteKey, JSON.stringify({code, at: Date.now(),general:u.searchParams.get('sinifaKatil')==='1'}));
    }
  } catch {}
}
function clearTeacherInvite() {
  try {
    sessionStorage.removeItem(teacherInviteKey);
    const u = new URL(location.href);
    if (u.searchParams.get('zirveOgretmen') === '1'||u.searchParams.get('sinifaKatil')==='1') {
      u.searchParams.delete('sinifaKatil');u.searchParams.delete('zirveOgretmen'); u.searchParams.delete('kod');
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    }
  } catch {}
}
let teacherInviteBusy = false;
async function acceptTeacherInvite() {
  if (teacherInviteBusy || D.hidden || window.dmTeacherPortalMode || teacherToken() || !studentToken() || !who() || store.get('ing_oturumAcik') !== 'true') return;
  if (D.getElementById('panel-alani')?.style.display !== 'block') return;
  let pending;
  try { pending = JSON.parse(sessionStorage.getItem(teacherInviteKey) || 'null'); } catch { return; }
  if (!pending) return;
  if (Date.now() - pending.at > 86400000 || !/^[A-Z0-9]{1,10}$/.test(pending.code)) { clearTeacherInvite(); return; }
  if (blocked()) return;
  const tok = studentToken(), name = who();
  teacherInviteBusy = true;
  try {
    const r = await fetch('https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({islem: 'ogretmenDavetOnizle', ogrenci: name, kod: pending.code, t: tok})
    });
    const d = await r.json();
    if (tok !== studentToken() || name !== who()) return;
    if (d.alreadyLinked || d.otherTeacher) {
      clearTeacherInvite();
      toast(d.alreadyLinked ? 'Bu öğretmene zaten bağlısın.' : 'Zaten bir öğretmene bağlısın. Mevcut öğretmenin değişmedi.');
      return;
    }
    if (!d.ok || !d.ogretmen) { clearTeacherInvite(); toast(d.mesaj || 'Öğretmen daveti doğrulanamadı.'); return; }
    if (!confirm(d.ogretmen + (pending.general?' adlı öğretmenin sınıfına bağlanmak ister misin?':' adlı öğretmenin öğrencisi olmak ve yarışma ekibine katılmak ister misin?')+' Öğretmenin öğrenme ilerlemeni görebilecek.')) { clearTeacherInvite(); return; }
    if (tok !== studentToken() || name !== who()) return;
    const response = await fetch('https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({islem: 'ogretmenKoduBagla', ogrenci: name, kod: pending.code, t: tok})
    });
    const result = await response.json();
    if (tok !== studentToken() || name !== who()) return;
    clearTeacherInvite();
    if (result.ok) { cache.delete(tok); toast(pending.general?'Öğretmenine bağlandın!':'Öğretmenine bağlandın! Yarışma ekibine katıldın.'); }
    else toast(result.mesaj || 'Öğretmene bağlanılamadı.');
  } catch { toast('Davet bağlantısı işlenemedi. İnternet bağlantını kontrol edip tekrar deneyebilirsin.'); }
  finally { teacherInviteBusy = false; }
}
function captureInvite() {
  try {
    const u = new URL(location.href), code = u.searchParams.get('davet');
    if (code && /^[A-Za-z0-9]{4,12}$/.test(code)) {
      store.set('dm_zk_davet', code.toUpperCase());
      u.searchParams.delete('davet'); history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash);
    }
  } catch {}
}
let accepting = false;
async function acceptInvite() {
  const code = store.get('dm_zk_davet'), tok = studentToken();
  if (!code || !tok || accepting || window.dmTeacherPortalMode) return;
  accepting = true;
  try {
    const d = await rpc('dm_campaign_invite_accept', {p_token: tok, p_code: code});
    if (d.ok || d.own || /bulunamadı|sona erdi/.test(d.message || '')) store.del('dm_zk_davet');
    if (d.ok && d.inviter) toast(d.inviter + ' seni "Öğretmenimle Zirveye!" yarışmasına davet etti. Hoş geldin!');
  } catch {} finally { accepting = false; }
}

/* ---------- Açılış duyurusu (öğrenci) ---------- */
function studentPopup(s) {
  const c = s.campaign;
  const v = veil('<button type="button" class="zk-x" data-zk-close aria-label="Kapat">' + I.close + '</button>' +
    '<div class="zk-pop-hero">' + confetti() + papi('cosku') + '<span class="zk-cup">' + I.cup + '</span></div>' +
    '<h3 class="zk-ribbon">ÖĞRETMENİMLE ZİRVEYE!</h3>' +
    '<div style="text-align:center"><span class="zk-chip">' + esc(range(c)) + '</span></div>' +
    '<h2>Hadi zirveye çık! 5 arkadaşını getir, XP topla ve <em>ilk 20\'ye</em> gir!</h2>' +
    '<div class="zk-rows">' +
      '<div class="zk-row v1"><span class="zk-art">' + I.game + '</span>Oyna, XP topla, sıralamada yüksel</div>' +
      '<div class="zk-row v2"><span class="zk-art"><img src="' + IMG_KIDS + '" alt=""></span>5 arkadaşını getir, ödül sıralamasını aç</div>' +
      '<div class="zk-row v3"><span class="zk-art">' + I.board + '</span>Öğretmenini getir, sınıfınla yarış</div></div>' +
    '<div class="zk-goldbar">5 davet + XP ile ilk 5 öğrenciye 3 AY PREMİUM PRO!</div>' +
    '<button type="button" class="zk-btn" data-join>' + (c.phase === 'soon' ? 'Yarışmayı Keşfet' : 'Yarışmaya Katıl') + ' ' + I.go + '</button>' +
    '<button type="button" class="zk-link" data-zk-close>Daha Sonra</button>', false, undefined, 'zk-announcement');
  v.el.querySelector('[data-join]').onclick = () => { v.close(); layerRole = 'student'; openStudentHub(); };
}

/* ---------- Günlük sınır uyarısı ---------- */
function capSheet(s) {
  const v = veil('<span class="zk-grab"></span>' +
    '<div class="zk-pop-hero" style="height:150px">' + papi('alkis') + '</div>' +
    '<h3 class="zk-ribbon">BUGÜNLÜK ZİRVEDESİN!</h3>' +
    '<p style="margin:0;text-align:center;font-weight:800;color:#5B4B9A">Günlük ' + fmt(s.cap) + ' XP sınırını doldurdun. Hepsi sıralamana eklendi. <b style="color:#6B2FE0">Yarın yeniden başla, zirveye bir adım daha yaklaş!</b></p>' +
    '<div><div class="zk-split"><span>Bugünkü XP</span><span>' + fmt(s.cap) + ' / ' + fmt(s.cap) + '</span></div><div class="zk-bar gold"><i style="width:100%"></i></div></div>' +
    '<p class="zk-note">Bugün kazandığın ek XP seviyene eklenir ama yarışmada sayılmaz. Sınır her gece yarısı sıfırlanır.</p>' +
    '<button type="button" class="zk-btn" data-zk-close>Tamam, Yarın Devam!</button>', true);
  return v;
}
let lastCapCheck = 0;
D.addEventListener('dm:reward-result', async e => {
  if (!e.detail?.ok || window.dmTeacherPortalMode) return;
  const tok = studentToken(); if (!tok) return;
  const owner = who(), key = 'zk_cap_' + owner + '_' + today();
  if (store.get(key)) return;
  const known = cache.get(tok)?.data;
  if (known && !isOn(known)) return;
  if (Date.now() - lastCapCheck < 30000 && (known?.me?.today || 0) < 2500) return;
  lastCapCheck = Date.now();
  await new Promise(r => setTimeout(r, 1500));
  const s = await status(tok, true);
  if (!isOn(s) || s.guest || s.campaign.phase !== 'live') return;
  if ((s.me?.today || 0) >= s.cap) { store.set(key, '1'); setTimeout(() => capSheet(s), 1800); }
});

/* ---------- Arkadaşlar sekmesi giriş kartı ---------- */
let parkurBusy = false;
let parkurRetryAt = 0;
async function mountParkurBadge() {
  const root = D.querySelector('#tab-dunya.active .rt-medal-route');
  const row = root?.querySelector('.rt-medal-header > .rt-quick-actions');
  const anchor = row?.querySelector(':scope > .dm-papi-chat-shortcut');
  const tok = studentToken();
  D.querySelectorAll('[data-zk-parkur]').forEach(b => { if (b.parentElement !== row || !tok || b.zkToken !== tok || window.dmTeacherPortalMode) b.remove(); });
  if (!anchor || !tok || window.dmTeacherPortalMode || parkurBusy || Date.now() < parkurRetryAt) return;
  const old = row.querySelector('[data-zk-parkur]');
  if (old && Date.now() - old.zkCheckedAt < 60000) return;
  parkurBusy = true;
  try {
    const s = await status(tok);
    if (tok !== studentToken() || !root.isConnected || !row.isConnected || window.dmTeacherPortalMode) return;
    if (!isOn(s) || s.role !== 'student' || s.guest || !['soon','live'].includes(s.campaign.phase)) { old?.remove(); parkurRetryAt = Date.now()+30000; return; }
    const b = old || D.createElement('button');
    b.type = 'button'; b.className = 'zk-parkur'; b.dataset.zkParkur = '1'; b.zkToken = tok; b.zkCheckedAt = Date.now();
    b.setAttribute('aria-label', '24 Kasım Öğretmenimle Zirveye kampanyasını aç');
    if (!old) { b.innerHTML = '<span class="rt-quick-icon rt-contest-icon" aria-hidden="true"><svg class="rt-quick-trophy" viewBox="0 0 48 48" fill="none"><path d="M13 18H6v4c0 7 6 12 14 12m15-16h7v4c0 7-6 12-14 12" fill="#dfe4eb" stroke="currentColor" stroke-width="2"/><path d="M12 9h24v17c0 7-5 12-12 12s-12-5-12-12z" fill="#e9edf2" stroke="currentColor" stroke-width="2"/><rect x="13" y="7" width="22" height="24" rx="4" fill="#f8fafc" stroke="currentColor" stroke-width="2"/><path d="M13 14h22M18 5v5m12-5v5M24 38v5m-9 1h18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><text x="24" y="24" text-anchor="middle" font-size="11" font-weight="900" fill="currentColor">24</text><text x="24" y="29" text-anchor="middle" font-size="4.5" font-weight="900" fill="currentColor">KASIM</text></svg><i class="rt-quick-spark"></i><i class="rt-quick-spark rt-quick-spark-second"></i></span><span class="rt-quick-label">Yarışma</span>'; b.onclick = () => { layerRole = 'student'; openStudentHub(); }; row.insertBefore(b,anchor); }
  } finally { parkurBusy = false; }
}
function bannerHtml(s) {
  const me = s.me || {};
  const sub = s.campaign.phase === 'soon' ? day(s.campaign.startsOn) + '\'da başlıyor · İlk 20\'ye ödül'
    : me.rank ? 'Sıran: ' + me.rank + ' · ' + fmt(me.xp) + ' XP' : 'İlk 20 öğrenciye Premium Pro';
  return '<button type="button" class="zk-banner" data-zk-banner>' + papi('merhaba') +
    '<span><b>Öğretmenimle Zirveye!</b><small>' + esc(sub) + '</small><span class="zk-chip gold">' + esc(phaseText(s.campaign)) + '</span></span><span class="zk-go">' + I.go + '</span></button>';
}
let bannerBusy = false;
async function mountBanner() {
  const root = D.getElementById('tab-meduakis');
  if (!root || bannerBusy || window.dmTeacherPortalMode && !studentToken()) return;
  const anchor = root.querySelector('.fr-league-board') || root.querySelector('.fr-tiles');
  if (!anchor) return;
  const existing = root.querySelector('[data-zk-banner]');
  if (existing && existing.nextElementSibling === anchor) return;
  bannerBusy = true;
  try {
    const s = await status(studentToken());
    root.querySelector('[data-zk-banner]')?.remove();
    if (!isOn(s) || s.role !== 'student') return;
    const a2 = root.querySelector('.fr-league-board') || root.querySelector('.fr-tiles'); if (!a2) return;
    a2.insertAdjacentHTML('beforebegin', bannerHtml(s));
  } finally { bannerBusy = false; }
}
D.addEventListener('click', e => { if (e.target.closest('[data-zk-banner]')) { layerRole = 'student'; openStudentHub(); } });

/* =================== ÖĞRETMEN =================== */
async function openTeacherHub() {
  const tok = teacherToken();
  const s = await status(tok, true);
  if (!isOn(s) || s.role !== 'teacher' || tok!==teacherToken()) { toast('Kampanya şu an açık değil.'); return; }
  layerRole = 'teacher';
  const t = s.teacher || {}, c = s.campaign;
  const pct = Math.min(100, (t.students || 0) / 20 * 100);
  const rankLine = !t.eligible ? 'Sıralamaya girmek için ' + t.need + ' öğrenci daha ekle!'
    : c.phase === 'soon' ? 'Hazırsın! Yarışma ' + day(c.startsOn) + ' günü başlıyor.'
    : t.rank ? (t.rank <= 2 ? 'Ödül bölgesindesin: ' + t.rank + '. sıra!' : t.rank + '. sıradasın. 2. sıraya ' + fmt(t.toPrize) + ' ort. XP kaldı.') : 'Öğrencilerin XP kazandıkça sıralamaya gireceksin.';
  const el = openLayer(top(s) +
    '<div class="zk-card zk-hero" style="background:linear-gradient(135deg,#DDEFFF,#E9DDFF)">' + confetti() + papi('alkis') +
      '<div><h2>Sınıfın zirveye çıksın!<br><em>1 YIL PREMİUM PRO</em></h2><p>En az 10 öğrenciyle yarış, ilk 2 öğretmen arasına gir.</p><span class="zk-chip gold">' + esc(range(c)) + '</span></div></div>' +
    '<div class="zk-card zk-teacher-stats"><div class="zk-split"><span>Öğrenci sayısı</span><span style="font-size:22px;color:#6B2FE0">' + fmt(t.students) + ' <span style="font-size:15px;color:#8C7BD0">/ 20 hedef</span></span></div>' +
      '<div class="zk-bar" style="position:relative;height:14px"><i style="width:' + pct + '%"></i></div>' +
      '<div class="zk-split" style="margin-top:6px;font-size:12.5px;color:#5B4B9A"><span>0</span><span style="color:#B87900">10 = sıralamaya giriş</span><span>20</span></div>' +
      '<span class="zk-zone" style="display:block;text-align:center;margin-top:6px">' + esc(rankLine) + '</span>' +
      '<div class="zk-stats" style="margin-top:10px"><div><b>' + fmt(t.avg) + '</b><small>Öğrenci başı ort. XP</small></div><div><b>' + (t.rank ? t.rank + '.' : '—') + '</b><small>Sıran</small></div><div><b>' + (t.rank && t.rank > 1 ? fmt(t.toFirst) : '—') + '</b><small>1. sıraya fark</small></div></div></div>' +
    '<section class="zk-card zk-goals"><h3 class="zk-ribbon">GÖREVLERİM</h3>'+compactGoal('👥 En az 10 öğrenciye ulaş',t.students,10)+'<div class="zk-goal"><div class="zk-goal-top"><b>🏆 İlk 2 öğretmen arasına gir</b></div><small>'+esc(!t.eligible?fmt(t.need)+' öğrenci kaldı':t.rank&&t.rank<=2?'✓ Şu an ödül bölgesindesin':t.rank?fmt(t.toPrize)+' ort. XP fark kaldı':'Sıralaman henüz oluşmadı')+'</small></div></section>' +
    '<div class="zk-hub-actions"><button type="button" class="zk-btn" data-add>' + I.plus + 'Öğrenci Ekle</button>' +
    '<button type="button" class="zk-btn gold" data-rank>Öğretmenler Sıralaması</button></div>' +
    '<div class="zk-card zk-teacher-info"><span class="zk-info-crown">' + I.crown + '</span><div><span>Ortalama, sınıftaki <b>tüm öğrencilerinize</b> göre hesaplanır. Öğrencileriniz çalıştıkça puanınız yükselir.</span> <button type="button" class="zk-link" data-rules>Kurallar</button></div></div>',null,'zk-teacher-hub zk-one-screen');
  el.querySelector('[data-add]').onclick = () => { if(tok===teacherToken()) addStudents(t); };
  el.querySelector('[data-rank]').onclick = () => openRanking('teachers');
  el.querySelector('[data-rules]').onclick = openRules;
  store.set('zk_tjoined_' + tok.slice(-12), '1');
}
function addStudents(t) {
  const code = t.code || '';
  const text = 'Sevgili öğrencilerim, Diji Medu\'da "Öğretmenimle Zirveye!" yarışmasına sınıfımızla katılıyoruz! Özel davet bağlantımdan kayıt olun veya mevcut hesabınızla giriş yapıp öğretmen bağlantısını onaylayın. XP toplayın ve birlikte zirveye çıkalım!';
  const v = veil('<button type="button" class="zk-x" data-zk-close aria-label="Kapat">' + I.close + '</button>' +
    '<h3 class="zk-ribbon">ÖĞRENCİ EKLE</h3>' +
    (code ? '<div class="zk-code"><div><small>Öğretmen kodunuz · özel davet bağlantısı</small><b style="font-size:24px;letter-spacing:2px">' + esc(code) + '</b></div><button type="button" data-copy>Linki Kopyala</button></div>' : '') +
    '<ol class="zk-steps"><li><i>1</i>Özel bağlantınızı öğrencilerinize gönderin</li><li><i>2</i>Yeni öğrenciler kayıtla bağlanır; mevcut öğrenciler onay verir</li><li><i>3</i>10 öğrenciye ulaşınca sıralamaya girersiniz</li></ol>' +
    '<button type="button" class="zk-btn" data-send ' + (code ? '' : 'disabled') + '>' + I.share + 'Öğrencilere Gönder</button>' +
    (window.dmTeacherClassesOpen ? '<button type="button" class="zk-btn gold small" data-classes>Sınıflarım\'ı Aç</button>' : '') +
    '<button type="button" class="zk-link" data-zk-close>Kapat</button>');
  v.el.querySelector('[data-send]').onclick = () => { if (code) share(text, teacherInviteUrl(code)); };
  v.el.querySelector('[data-copy]')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(teacherInviteUrl(code)); toast('Özel davet bağlantısı kopyalandı!'); } catch {} });
  v.el.querySelector('[data-classes]')?.addEventListener('click', () => { v.close(); closeLayer(); window.dmTeacherClassesOpen(); });
}
function teacherPopup(s) {
  const v = veil('<button type="button" class="zk-x" data-zk-close aria-label="Kapat">' + I.close + '</button>' +
    '<div class="zk-pop-hero">' + confetti() + papi('alkis') + '<span class="zk-cup">' + I.cup + '</span></div>' +
    '<h3 class="zk-ribbon">ÖĞRETMENLER GÜNÜ SÜRPRİZİ</h3>' +
    '<div style="text-align:center"><span class="zk-chip">' + esc(range(s.campaign)) + '</span></div>' +
    '<h2>Sınıfını kur, öğrencilerinle <em>zirveye çık!</em></h2>' +
    '<div class="zk-rows">' +
      '<div class="zk-row v3"><span class="zk-art">' + I.board + '</span>Sınıfını oluştur, kodunu öğrencilere ver</div>' +
      '<div class="zk-row v2"><span class="zk-art"><img src="' + IMG_KIDS + '" alt=""></span>En az 10 öğrenciyle sıralamaya gir</div>' +
      '<div class="zk-row v1"><span class="zk-art">' + I.game + '</span>Öğrenci başı ortalama XP ile yüksel</div></div>' +
    '<div class="zk-goldbar">İlk 2 öğretmene 1 YIL PREMİUM PRO!</div>' +
    '<button type="button" class="zk-btn" data-join>Sınıfımı Kur ' + I.go + '</button>' +
    '<button type="button" class="zk-link" data-zk-close>Daha Sonra</button>');
  v.el.querySelector('[data-join]').onclick = () => { v.close(); openTeacherHub(); };
}
let teacherBusy = false;
let teacherRetryAt = 0;
function teacherHost() {
  const selectors = ['#tpDashboard.is-visible .tp-real-tools','#tpTeacherHome #dmTeacherDesignV2','#ogretmenMenuModal .dm-v2-content','#tpTeacherHome.is-visible'];
  for (const selector of selectors) {
    const el = D.querySelector(selector);
    if (el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden') return el;
  }
  return null;
}
function teacherShortcutAnchor(content){
  return content.querySelector('[data-teacher-parkur-switch]');
}
function teacherShortcutHost(content){
  return content.closest('#tpDashboard')?.querySelector('.tp-dash-menu') ||
    teacherShortcutAnchor(content)?.parentElement ||
    content.querySelector('.dm-v2-quick') || content;
}
function placeTeacherShortcut(content,target,host){
  const anchor=teacherShortcutAnchor(content);
  if(anchor&&anchor.parentElement===target){
    host.classList.add('zk-teacher-home-shortcut');
    if(host.nextElementSibling!==anchor)target.insertBefore(host,anchor);
  }else{
    host.classList.remove('zk-teacher-home-shortcut');
    if(host.parentElement!==target)target.append(host);
  }
}
async function mountTeacher() {
  const content = teacherHost(), tok = teacherToken();
  const target=content&&teacherShortcutHost(content);
  // Remove the old oversized banner, including nodes left by an older cached script.
  D.querySelectorAll('[data-zk-teacher-host],[data-zk-tcard]').forEach(el=>el.remove());
  D.querySelectorAll('[data-zk-teacher-shortcut]').forEach(el=>{
    if(!tok||el.zkToken!==tok||el.parentElement!==target)el.remove();
  });
  if (!content || !target || !tok || teacherBusy || Date.now() < teacherRetryAt) return;
  teacherBusy = true;
  try {
    const s = await status(tok);
    if (tok !== teacherToken() || content !== teacherHost() || !content.isConnected) return;
    const previous=target.querySelector(':scope > [data-zk-teacher-shortcut]');
    if (!isOn(s) || s.role !== 'teacher') {
      previous?.remove(); teacherRetryAt=Date.now()+(s?60000:5000); return;
    }
    if(!previous){
      const host=D.createElement('div');host.dataset.zkTeacherShortcut='1';host.zkToken=tok;
      const b=D.createElement('button');b.type='button';b.className='zk-teacher-shortcut';
      b.textContent='🏆 24 Kasım Yarışması';b.onclick=()=>{if(tok===teacherToken())openTeacherHub();};host.append(b);
      if(s.admin){const a=D.createElement('button');a.type='button';a.className='zk-teacher-shortcut';a.textContent='Yarışma Yönetimi';a.onclick=openAdmin;host.append(a);}
      placeTeacherShortcut(content,target,host);
    }else placeTeacherShortcut(content,target,previous);
    if(!blocked()&&claimAnnouncement(s,'teacher',tok))teacherPopup(s);
    teacherRetryAt=Date.now()+2000;
  } finally { teacherBusy=false; }
}

/* =================== YÖNETİCİ =================== */
async function openAdmin() {
  const tok = teacherToken();
  const el = openLayer(top({campaign: null, preview: false}, 'Zirve<span>Yönetimi</span>') + '<div data-admin class="zk-admin"><p class="zk-empty">Yükleniyor…</p></div>');
  const box = el.querySelector('[data-admin]');
  const call = async (action, data = {}) => {
    const d = await rpc('dm_campaign_admin', {p_token: tok, p_action: action, p_data: data});
    if (!d.ok) throw Error(d.message || 'İşlem tamamlanamadı.');
    cache.clear(); return d;
  };
  const PRODUCT = {teacher_premium_pro: 'Öğretmen Premium Pro', diji_premium_pro: 'Premium Pro', diji_pro: 'Pro'};
  const render = (d, msg = '') => {
    const c = d.campaign, n = d.counts, p = d.proposal;
    const row = (x, role) => '<li><span class="rk">' + x.rank + '.</span><span class="nm">' + esc(role === 'teacher' ? (x.fullName || x.name) + ' (' + x.username + ')' : x.name) +
      '<small>' + (role === 'teacher' ? fmt(x.students) + ' öğrenci · ' + fmt(x.avg) + ' ort. XP' : fmt(x.xp) + ' XP · ' + fmt(x.invites) + ' davet') + ' → ' + esc(PRODUCT[x.product]) + ' ' + esc(x.duration) + '</small></span>' +
      (c.finalizedAt ? '' : '<button type="button" class="zk-x2" data-ex="' + role + ':' + x.id + '">Çıkar</button>') + '</li>';
    box.innerHTML =
      '<div class="zk-card"><h3>Yayın</h3><label class="zk-switch"><input type="checkbox" data-public ' + (c.public ? 'checked' : '') + '> Herkese açık</label>' +
        '<p class="zk-note" style="text-align:left">Kapalıyken yalnız yönetici hesabı ve aşağıdaki test öğrencileri görür.</p>' +
        '<input type="text" data-preview placeholder="Test öğrencileri (kullanıcı adı, virgülle)" value="' + esc((c.previewUsernames || []).join(', ')) + '">' +
        '<button type="button" class="zk-btn small" data-save style="margin-top:8px">Kaydet</button></div>' +
      '<div class="zk-card"><h3>Durum · ' + esc({soon: 'Başlamadı', live: 'Sürüyor', ended: 'Bitti, onay bekliyor', results: 'Ödüller verildi'}[c.phase] || c.phase) + '</h3><div class="zk-stats">' +
        '<div><b>' + fmt(n.participants) + '</b><small>Yarışan öğrenci</small></div><div><b>' + fmt(n.teachers) + '</b><small>Sıralamada öğretmen</small></div><div><b>' + fmt(n.verifiedInvites) + '/' + fmt(n.invites) + '</b><small>Doğrulanan davet</small></div></div>' +
        '<p class="zk-note">Son hesap: ' + (c.refreshedAt ? new Date(c.refreshedAt).toLocaleString('tr-TR') : '—') + '</p>' +
        '<button type="button" class="zk-btn small gold" data-refresh>Şimdi Yeniden Hesapla</button></div>' +
      '<div class="zk-card"><h3>Final ödül listesi (öneri)</h3><b>Öğretmenler</b><ul class="zk-list">' + (p.teachers.map(x => row(x, 'teacher')).join('') || '<li class="zk-empty">Henüz yok</li>') + '</ul>' +
        '<b>Öğrenciler</b><ul class="zk-list">' + (p.students.map(x => row(x, 'student')).join('') || '<li class="zk-empty">Henüz yok</li>') + '</ul>' +
        (d.excluded.length ? '<b>Çıkarılanlar</b><ul class="zk-list">' + d.excluded.map(x => '<li><span class="nm">' + esc(x.name) + ' <small>' + (x.role === 'teacher' ? 'öğretmen' : 'öğrenci') + '</small></span>' + (c.finalizedAt ? '' : '<button type="button" class="zk-in" data-in="' + x.role + ':' + x.id + '">Geri al</button>') + '</li>').join('') + '</ul>' : '') +
        (c.finalizedAt ? '<p class="zk-zone" style="display:block;text-align:center">Ödüller ' + new Date(c.finalizedAt).toLocaleDateString('tr-TR') + ' tarihinde tanımlandı.</p>'
          : '<button type="button" class="zk-btn" data-final ' + (c.phase === 'ended' ? '' : 'disabled style="opacity:.5"') + '>Ödülleri Onayla ve Tanımla</button><p class="zk-note">Onay, kampanya bittikten sonra (11 Aralık) açılır.</p>') + '</div>' +
      (d.rewards.length ? '<div class="zk-card"><h3>Verilen ödüller</h3><ul class="zk-list">' + d.rewards.map(w => '<li><span class="nm">' + esc(w.name) + '<small>' + (w.kind === 'invite10' ? '10 davet' : w.rank + '. sıra') + ' · ' + esc(PRODUCT[w.product]) + ' ' + esc(w.duration) + '</small></span></li>').join('') + '</ul></div>' : '') +
      '<p class="zk-msg" data-msg role="status">' + esc(msg) + '</p>';
  };
  const run = async (fn, okMsg) => { try { render(await fn(), okMsg); } catch (e) { const m = box.querySelector('[data-msg]'); if (m) { m.textContent = e.message; m.style.color = '#B3261E'; } else box.innerHTML = '<p class="zk-empty">' + esc(e.message) + '</p>'; } };
  box.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-save]')) run(() => call('set', {public: box.querySelector('[data-public]').checked, previewUsernames: box.querySelector('[data-preview]').value.split(',').map(x => x.trim()).filter(Boolean)}), 'Kaydedildi.');
    else if (t.closest('[data-refresh]')) run(() => call('refresh'), 'Sıralama yeniden hesaplandı.');
    else if (t.closest('[data-ex]')) { const [role, id] = t.closest('[data-ex]').dataset.ex.split(':'); if (confirm('Bu hesap yarışmadan çıkarılsın mı? Liste yeniden sıralanır.')) run(() => call('exclude', {role, id}), 'Çıkarıldı.'); }
    else if (t.closest('[data-in]')) { const [role, id] = t.closest('[data-in]').dataset.in.split(':'); run(() => call('include', {role, id}), 'Geri alındı.'); }
    else if (t.closest('[data-final]') && !t.closest('[data-final]').disabled) { if (confirm('Listedeki herkese ödüller şimdi tanımlansın mı? Bu işlem geri alınamaz.')) run(() => call('finalize'), 'Ödüller tanımlandı.'); }
  });
  run(() => call('get'));
}

/* =================== Başlatma =================== */
function blocked() {
  if (D.hidden || D.querySelector('.zk-veil,.zk-layer,#dmBootSplash:not(.dm-ready)')) return true;
  try { if (window.dmPapiIntro?.active?.()) return true; } catch {}
  for (const el of D.querySelectorAll('[aria-modal="true"],.yo-perde,.dm-perde,.cog-perde,.sm-overlay,.dm-member-overlay,.game-modal-overlay,.ld-layer,.dmg-veil'))
    if (el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none') return true;
  return false;
}
const popupSeen = new Set();
// The first two distinct app/login sessions are eligible. Then only one display
// per Istanbul calendar day in the final three days (8–10 December for 2026).
function announcementWindow(c,record,now){
  if(!c||!['soon','live'].includes(c.phase)||!/^\d{4}-\d{2}-\d{2}$/.test(c.endsOn||''))return false;
  const end=Date.parse(c.endsOn+'T00:00:00Z'),current=Date.parse(now+'T00:00:00Z');
  if(!Number.isFinite(end)||!Number.isFinite(current)||current>end)return false;
  const finalThree=current>=end-2*86400000;
  if(finalThree)return record.last!==now;
  return (Number(record.count)||0)<2;
}
function announcementAccount(s,role){
  if(role==='teacher'){
    let name='';try{name=JSON.parse(sessionStorage.getItem('dm_tp_session')||'null')?.name||window.dmTeacherPortalSession?.name||'';}catch{}
    return name||s.teacher?.code||'';
  }
  return who()||store.get('ing_aktifOgrenci')||s.invite?.code||'';
}
function claimAnnouncement(s,role,tok){
  const id=announcementAccount(s,role);if(!id||s.guest)return false;
  const session=role+':'+tok;if(popupSeen.has(session))return false;
  const key='zk_announcement_v2:'+String(s.campaign.key||'ogretmenimle-zirveye-2026')+':'+role+':'+encodeURIComponent(id);
  let record={count:0,last:''};try{record=JSON.parse(store.get(key)||'null')||record;}catch{}
  const now=today();if(!announcementWindow(s.campaign,record,now))return false;
  popupSeen.add(session);
  store.set(key,JSON.stringify({count:Math.min(2,(Number(record.count)||0)+1),last:now}));
  return true;
}
let popupTimer = 0;
function schedulePopup() {
  clearTimeout(popupTimer);
  let tries = 0;
  const tick = async () => {
    const tok = studentToken();
    if (!tok || window.dmTeacherPortalMode || store.get('ing_oturumAcik')!=='true') return;
    const key = 'student:' + tok;
    if (popupSeen.has(key)) return;
    if (blocked()) { if (++tries < 40) popupTimer = setTimeout(tick, 3000); return; }
    const s = await status(tok);
    if (!isOn(s) || s.role !== 'student' || s.campaign.phase === 'results' || s.campaign.phase === 'ended') return;
    if (blocked()) { if (++tries < 40) popupTimer = setTimeout(tick, 3000); return; }
    if (tok !== studentToken() || popupSeen.has(key)) return;
    if(claimAnnouncement(s,'student',tok)) studentPopup(s);
  };
  popupTimer = setTimeout(tick, 6000);
}
function onLogin() { parkurRetryAt = 0; cache.clear(); teacherRetryAt = 0; D.querySelectorAll('[data-zk-teacher-host],[data-zk-teacher-shortcut]').forEach(x => x.remove()); observe(); D.querySelectorAll('[data-zk-banner]').forEach(x => x.remove()); acceptInvite(); schedulePopup(); mountBanner(); }

captureTeacherInvite();
captureInvite();
let queued = false;
const observe = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; mountBanner(); mountTeacher(); mountParkurBadge(); }); };
function start() {
  new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && !n.closest?.('.zk-layer,.zk-veil,[data-zk-banner],[data-zk-tcard]')) { observe(); return; } })
    .observe(D.body, {childList: true, subtree: true});
  D.addEventListener('dm:login', onLogin);
  window.addEventListener('dm:teacher-admin-role-verified', () => { teacherRetryAt = 0; observe(); });
  D.addEventListener('visibilitychange', () => { if (!D.hidden) observe(); });
  setInterval(() => { if (!D.hidden) { mountTeacher(); mountParkurBadge(); acceptTeacherInvite(); } }, 2000);
  acceptInvite(); schedulePopup(); observe();
}
if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();

window.dmZirve = {openStudentHub, openTeacherHub, openRanking, openInvite, openAdmin, status: () => status(studentToken(), true)};
})();
