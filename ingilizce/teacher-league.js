/* Öğretmen paneli: "🏆 Sınıflar" — sınıf ligi (Tasarım B: lider kartları).
   Tek istek (teacher-classes, action 'league') dönem başına tüm sınıfları getirir; sınıf ve kategori değişimi yeni istek atmaz.
   Dönem verisi 5 dk bellekte tutulur. Free planda sunucu yalnız genel sıralamanın ilk 2 öğrencisini gönderir;
   kalan satırlar burada yalnız bulanık yer tutucu olarak çizilir ve "Kilidi aç" mevcut öğretmen paket ekranını açar. */
(() => {
  'use strict';
  const API = 'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/teacher-classes';
  const TTL = 5 * 60 * 1000;
  const doc = document;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem('dm_tp_session') || 'null')?.teacherToken || sessionStorage.getItem('ing_ogr_token') || ''; } catch { return ''; } };

  const CATS = [
    ['genel', 'Genel'], ['kelime', 'Kelime'], ['dogruluk', 'Doğruluk'], ['sure', 'Süre'],
    ['gelisen', 'Gelişen'], ['ilerleme', 'İlerleme'], ['seri', 'Seri'], ['odev', 'Ödev']
  ];
  const LEADERS = [
    ['kelime', 'Kelime Kralı', 'En çok doğru cevap', 'p'], ['dogruluk', 'Keskin Nişancı', 'En yüksek doğruluk', 't'],
    ['sure', 'Maratoncu', 'En çok çalışma süresi', 'o'], ['gelisen', 'Roket', 'En çok gelişen', 'p'],
    ['ilerleme', 'Kaşif', 'En çok ilerleyen', 't'], ['seri', 'Ateş Serisi', 'En uzun seri', 'o'], ['odev', 'Ödev Ustası', 'Ödev tamamlama', 't']
  ];
  const CHAMP = { week: 'Haftanın şampiyonu', month: 'Ayın şampiyonu', all: 'Tüm zamanların şampiyonu' };
  const PERIODS = [['week', 'Bu hafta'], ['month', 'Bu ay'], ['all', 'Tüm zamanlar']];
  const EMPTY_HINT = { gelisen: 'Geçen döneme göre XP’si artan öğrenci yok.', dogruluk: 'Doğruluk sıralaması için öğrencinin yeterli soru çözmesi gerekir.', odev: 'Bu dönemde verilen ödev yok.' };

  const CSS = `html.dm-teacher-portal .dml-page{z-index:2147483639}
.dml-page .dml-box h2{color:#1D1B3A!important}.dml-page .dml-att h2{color:#7A3A00!important}
.dml-pro{margin-top:12px;background:linear-gradient(150deg,#26215A,#1D1B3A);border-radius:22px;padding:16px;color:#fff;box-shadow:0 8px 22px rgba(29,27,58,.25)}
.dml-pro-top{display:flex;gap:12px;align-items:center}.dml-pro .ic{flex:none;width:44px;height:44px;border-radius:14px;background:#F2A541;display:grid;place-items:center;font-size:22px}
.dml-pro b{display:block;font:900 17px/1.2 Nunito,system-ui,sans-serif;color:#fff}.dml-pro small{display:block;margin-top:2px;color:#D9D3FF;font-weight:700;font-size:13px}
.dml-pro ul{margin:12px 0 14px;padding:0;list-style:none;display:grid;gap:6px}.dml-pro li{font-size:13px;font-weight:800;color:#F1EEFF}.dml-pro li::before{content:'✓';color:#F2A541;margin-right:8px}
.dml-pro button{width:100%;min-height:48px;border:0;border-radius:14px;background:#F2A541;color:#3A1F00;font:900 16px Nunito,system-ui,sans-serif;cursor:pointer;box-shadow:0 3px 0 #C47F1E}
html.dm-teacher-portal .dml-page{padding-bottom:calc(110px + env(safe-area-inset-bottom,0px))}
.dml-start{margin-top:16px;background:#fff;border-radius:22px;padding:24px 18px;text-align:center;box-shadow:0 2px 0 #E4DEFB}
.dml-start>span{display:block;font-size:44px;line-height:1}.dml-start .dml-st{display:block;margin:10px 0 6px;color:#1D1B3A;font:900 20px/1.2 Nunito,system-ui,sans-serif}
.dml-start p{margin:0 auto 16px;max-width:340px;color:#4A4570;font-weight:700}
.dml-start button{min-height:48px;padding:0 22px;border:0;border-radius:14px;background:#0E7C7B;color:#fff;font:900 16px Nunito,system-ui,sans-serif;cursor:pointer;box-shadow:0 3px 0 #0A5F5E}
.dml-page{position:fixed;inset:0;z-index:2147483642;background:#F7F5FF;color:#1D1B3A;overflow:auto;font:600 15px/1.4 Nunito,system-ui,-apple-system,sans-serif;padding-bottom:calc(96px + env(safe-area-inset-bottom,0px));animation:dmlIn .25s ease-out}
.dml-wrap{max-width:640px;margin:0 auto;padding:16px 16px 0}
.dml-top{display:flex;align-items:center;gap:10px}.dml-top h1{flex:1;margin:0;font:900 26px/1.1 Nunito,system-ui,sans-serif}
.dml-ib{width:44px;height:44px;flex:0 0 auto;border:0;border-radius:14px;background:#fff;color:#1D1B3A;font:900 18px system-ui;display:grid;place-items:center;cursor:pointer;box-shadow:0 2px 0 #E4DEFB}
.dml-ib.dark{background:#1D1B3A;color:#fff;box-shadow:none}
.dml-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin-top:12px;padding-bottom:2px}.dml-row::-webkit-scrollbar{display:none}
.dml-chip{flex:0 0 auto;min-height:40px;padding:0 14px;border:1.5px solid #DDD6FB;border-radius:12px;background:#fff;color:#1D1B3A;font:800 13px Nunito,system-ui,sans-serif;cursor:pointer}
.dml-chip[aria-pressed=true]{background:#6B4FD8;border-color:#6B4FD8;color:#fff}
.dml-chip.cat{border-radius:99px;min-height:36px}.dml-chip.cat[aria-pressed=true]{background:#1D1B3A;border-color:#1D1B3A}
.dml-seg{display:flex;background:#EAE5FD;border-radius:12px;padding:4px;margin-top:10px}
.dml-seg button{flex:1;min-height:36px;border:0;border-radius:9px;background:transparent;color:#4A4570;font:700 13px Nunito,system-ui,sans-serif;cursor:pointer}.dml-seg button[aria-pressed=true]{background:#fff;color:#1D1B3A;font-weight:900}
.dml-champ{margin-top:12px;background:#0E7C7B;color:#fff;border-radius:22px;padding:16px;display:flex;gap:14px;align-items:center;border:0;width:100%;text-align:left;font:inherit;cursor:pointer}
.dml-av{flex:0 0 auto;border-radius:50%;display:grid;place-items:center;font-weight:900}
.dml-champ .dml-av{width:66px;height:66px;background:#ffffff33;border:3px solid #F2A541;font-size:22px}
.dml-champ small{display:block;font-size:12px;font-weight:800;opacity:.9}.dml-champ b{display:block;font-size:21px;font-weight:900;line-height:1.15}.dml-champ span.v{font-size:13px;font-weight:700;opacity:.92}
.dml-champ .n{margin-left:auto;font-size:30px;font-weight:900;color:#F2A541}
.dml-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.dml-lc{border:0;text-align:left;background:#fff;border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:3px;font:inherit;color:#1D1B3A;cursor:pointer;box-shadow:0 2px 0 #E4DEFB;min-width:0}
.dml-lc:last-child:nth-child(odd){grid-column:1/-1}
.dml-tag{align-self:flex-start;font-size:11px;font-weight:900;border-radius:99px;padding:2px 8px}.dml-tag.p{color:#4B33AE;background:#EFEAFE}.dml-tag.t{color:#0B5C5B;background:#DDF5F0}.dml-tag.o{color:#7A3A00;background:#FFF1E3}
.dml-lc small{font-size:12px;font-weight:800;color:#4A4570}.dml-lc b{font-size:16px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dml-lc span.v{font-size:13px;font-weight:800;color:#4A4570}
.dml-lc.none b{color:#8A84AE;font-size:14px}
.dml-box{margin-top:12px;background:#fff;border-radius:20px;padding:12px 14px;box-shadow:0 2px 0 #E4DEFB}
.dml-box h2{margin:0 0 8px;font:900 15px Nunito,system-ui,sans-serif;display:flex;justify-content:space-between;align-items:center;gap:8px}.dml-box h2 small{font-size:12px;font-weight:700;color:#4A4570}
.dml-bar{display:flex;align-items:center;gap:8px;margin:7px 0;font-size:13px;font-weight:900}.dml-bar>span:first-child{width:46px}.dml-bar i{flex:1;height:14px;border-radius:9px;background:#EFEBFE;display:flex;overflow:hidden}.dml-bar i u{display:block;background:#6B4FD8;border-radius:9px}.dml-bar>span:last-child{width:48px;text-align:right}
.dml-li{display:flex;align-items:center;gap:10px;min-height:52px;border-top:1px solid #F0EDFB;width:100%;background:none;border-left:0;border-right:0;border-bottom:0;padding:0;font:inherit;color:inherit;text-align:left;cursor:pointer}
.dml-li .rk{width:28px;height:28px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:900;background:#F0EDFB}
.dml-li .rk.g{background:#F2A541;color:#3A1F00}.dml-li .rk.s{background:#C9D5D5}.dml-li .rk.b{background:#E2B48F;color:#4B2A12}
.dml-li .nm{flex:1;min-width:0}.dml-li .nm b{display:block;font-size:14px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dml-li .nm small{font-size:12px;color:#4A4570;font-weight:700}
.dml-li .val{font-size:14px;font-weight:900;text-align:right;white-space:nowrap}
.dml-lock{filter:blur(5px);opacity:.7;pointer-events:none;user-select:none}
.dml-lock .dml-li{cursor:default}.dml-ph{height:10px;border-radius:6px;background:#D9D2F7;display:block}
.dml-empty{color:#6E6894;font-size:13px;padding:10px 0}
.dml-att{margin-top:12px;background:#FFF1E3;border-radius:20px;padding:12px 14px;color:#7A3A00}
.dml-att h2{margin:0;font:900 14px Nunito,system-ui,sans-serif;display:flex;justify-content:space-between;align-items:center;gap:8px}
.dml-att button.lk{width:100%;border:0;background:none;padding:0;display:flex;align-items:center;gap:10px;text-align:left;font:inherit;color:inherit;cursor:pointer}
.dml-att .r{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid #F5D9BC;font-size:13px;font-weight:800}
.dml-cta{position:fixed;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));max-width:616px;margin:0 auto;background:#1D1B3A;border-radius:20px;padding:10px 10px 10px 16px;display:flex;align-items:center;gap:10px;box-shadow:0 10px 30px rgba(29,27,58,.35);color:#fff;z-index:1}
.dml-cta div{flex:1}.dml-cta b{display:block;font-size:14px;font-weight:900}.dml-cta small{font-size:12px;font-weight:700;color:#CFC6F7}
.dml-cta button{min-height:46px;padding:0 18px;border:0;border-radius:14px;background:#F2A541;color:#3A1F00;font:900 15px Nunito,system-ui,sans-serif;cursor:pointer}
.dml-msg{margin:14px 2px;font-size:14px;color:#4A4570}.dml-msg.bad{color:#B3261E}
.dml-note{margin:14px 4px 0;font-size:12px;color:#6E6894}
.dml-veil{position:fixed;inset:0;z-index:2147483643;background:rgba(13,12,40,.5);display:flex;align-items:flex-end;justify-content:center}
.dml-sheet{width:min(100%,560px);background:#fff;border-radius:28px 28px 0 0;padding:12px 18px calc(22px + env(safe-area-inset-bottom,0px));color:#1D1B3A;font:600 15px/1.4 Nunito,system-ui,sans-serif;animation:dmlUp .3s cubic-bezier(.2,.7,.25,1)}
.dml-grip{width:44px;height:5px;border-radius:9px;background:#DDD6FB;margin:0 auto 12px}
.dml-sheet .hd{display:flex;align-items:center;gap:12px}.dml-sheet .hd .dml-av{width:54px;height:54px;background:#EFEAFE;color:#4B33AE;font-size:18px}.dml-sheet .hd b{display:block;font-size:19px;font-weight:900}.dml-sheet .hd small{color:#4A4570;font-weight:700}
.dml-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}.dml-stats div{background:#F7F5FF;border-radius:14px;padding:10px 12px}.dml-stats small{display:block;font-size:12px;color:#4A4570;font-weight:800}.dml-stats b{font-size:17px;font-weight:900}
.dml-close{margin-top:14px;width:100%;min-height:48px;border:0;border-radius:14px;background:#1D1B3A;color:#fff;font:900 15px Nunito,system-ui,sans-serif;cursor:pointer}
.dml-board{position:fixed;inset:0;z-index:2147483644;background:#1D1B3A;color:#fff;display:flex;flex-direction:column;padding:24px;gap:18px;font-family:Nunito,system-ui,sans-serif;overflow:auto}
.dml-board h2{margin:0;font-size:clamp(24px,4vw,44px);font-weight:900;text-align:center}
.dml-pod{display:flex;justify-content:center;align-items:flex-end;gap:2vw;flex:1;min-height:260px}
.dml-pod div{display:flex;flex-direction:column;align-items:center;gap:8px;width:min(26vw,240px)}
.dml-pod b{font-size:clamp(16px,2.4vw,28px);font-weight:900;text-align:center}.dml-pod small{font-size:clamp(13px,1.8vw,20px);color:#CFC6F7;font-weight:800}
.dml-pod i{display:grid;place-items:center;width:100%;border-radius:18px 18px 0 0;font-style:normal;font-size:clamp(28px,5vw,64px);font-weight:900;color:#3A1F00}
.dml-board ol{margin:0 auto;padding:0;list-style:none;width:min(100%,720px);columns:2;column-gap:24px;font-size:clamp(14px,1.8vw,20px);font-weight:800}.dml-board li{padding:6px 0;break-inside:avoid;display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #ffffff22}
@keyframes dmlIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes dmlUp{from{transform:translateY(100%)}to{transform:none}}
@media(prefers-reduced-motion:reduce){.dml-page,.dml-sheet{animation:none}}`;

  const cache = {};
  let page = null, data = null, st = { period: 'week', scope: 'all', cat: 'genel', tab: 'students', search: '', filter: 'all', expanded: false, loading: false, err: '' };

  async function load(period, force) {
    const c = cache[period];
    if (!force && c && Date.now() - c.at < TTL) return c.data;
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', 'x-diji-token': token() }, body: JSON.stringify({ action: 'league', period }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw Error(j.mesaj || 'Sıralama şu an yüklenemedi.');
    cache[period] = { at: Date.now(), data: j };
    return j;
  }

  function plans() {
    if (window.DMSatis?.ogretmenPlanlari) return window.DMSatis.ogretmenPlanlari('ogretmen-siniflar');
    if (window.dmAndroidBilling?.open) return window.dmAndroidBilling.open('ogretmen-siniflar');
    st.err = 'Öğretmen planları çok yakında burada.'; render();
  }

  const stu = id => data?.students?.[id] || { name: 'Öğrenci', ini: '?', cls: '' };
  const av = (r, cls = '') => `<span class="dml-av ${cls}" aria-hidden="true">${esc(r.ini)}</span>`;
  const medal = n => (n === 1 ? 'g' : n === 2 ? 's' : n === 3 ? 'b' : '');

  function rowsHtml(cat, sc) {
    const c = sc.categories[cat] || { rows: [], hidden: 0 };
    if (!c.rows.length) return `<p class="dml-empty">${esc(EMPTY_HINT[cat] || 'Bu dönemde henüz veri yok.')}</p>`;
    const rows = c.rows.map(x => ({ ...x, ...stu(x.id) })).map(r => `<button type="button" class="dml-li" data-student="${esc(r.id)}"><span class="rk ${medal(r.rank)}">${r.rank}</span><span class="nm"><b>${esc(r.name)}</b><small>${esc(r.cls)}</small></span><span class="val">${esc(r.value)}</span></button>`).join('');
    const ph = c.hidden ? `<div class="dml-lock" aria-hidden="true">${Array.from({ length: Math.min(c.hidden, 6) }, (_, i) => `<div class="dml-li"><span class="rk">${c.rows.length + i + 1}</span><span class="nm"><span class="dml-ph" style="width:${110 + (i * 23) % 60}px"></span></span><span class="dml-ph" style="width:44px"></span></div>`).join('')}</div>` : '';
    return rows + ph;
  }

  function leaderCards(sc) {
    return LEADERS.map(([k, badge, sub, tone]) => {
      if (sc.leaders[k]?.locked) return `<button type="button" class="dml-lc" data-unlock><span class="dml-tag ${tone}">${esc(badge)}</span><small>${esc(sub)}</small><b>🔒 Pro ile görünür</b><span class="v">Kilidi aç</span></button>`;
      const l = sc.leaders[k] && { ...sc.leaders[k], ...stu(sc.leaders[k].id) };
      return `<button type="button" class="dml-lc${l ? '' : ' none'}" data-cat="${k}"><span class="dml-tag ${tone}">${esc(badge)}</span><small>${esc(sub)}</small><b>${l ? esc(l.name) : 'Henüz yok'}</b>${l ? `<span class="v">${esc(l.value)}</span>` : ''}</button>`;
    }).join('');
  }


  const CATEGORY_ICONS = { genel:'🏆',kelime:'🎯',dogruluk:'⚡',sure:'⏱️',gelisen:'🚀',ilerleme:'🧭',seri:'🔥',odev:'📚' };
  const LEADER_ICONS = {kelime:'🎯',dogruluk:'⚡',sure:'⏱️',gelisen:'🚀',ilerleme:'🧭',seri:'🔥',odev:'📚'};
  function currentScope() { return data?.scopes?.[st.scope] || data?.scopes?.all; }
  function ranking(sc) {
    const category=sc?.categories?.[st.cat] || {rows:[],hidden:0,total:0};
    const text=st.search.toLocaleLowerCase('tr-TR').trim();
    let rows=category.rows.map(x=>({...x,...stu(x.id)}));
    if(text) rows=rows.filter(x=>(x.name+' '+(x.cls||'')).toLocaleLowerCase('tr-TR').includes(text));
    if(st.filter==='top') rows=rows.filter(x=>Number(x.rank)<=3);
    if(st.filter==='active') rows=rows.filter(x=>Number(x.m?.minutes||0)>0||Number(x.m?.xp||0)>0);
    return {category,rows};
  }
  function studentRows(sc) {
    const {category,rows}=ranking(sc),shown=st.expanded?rows:rows.slice(0,5);
    const items=shown.map(r=>'<button type="button" class="dml-student" data-student="'+esc(r.id)+'"><span class="dml-rank">'+esc(r.rank)+'</span><span class="dml-avatar">'+esc(r.ini||'?')+'</span><span class="dml-student-name"><b>'+esc(r.name)+'</b><small>'+esc(r.cls||'Öğrenci')+'</small></span><span class="dml-student-score">'+esc(r.value)+'</span><span class="dml-next">›</span></button>').join('');
    const empty='<p class="dml-empty">'+esc(st.search?'Aradığın öğrenci bulunamadı.':(EMPTY_HINT[st.cat]||'Bu dönemde henüz sıralama verisi yok.'))+'</p>';
    const more=rows.length>5?'<button type="button" class="dml-seeall" data-expand>'+ (st.expanded?'Daha az göster':'Tümünü gör ('+rows.length+')')+' ⌄</button>':'';
    const locked=category.hidden?'<div class="dml-private"><span>🔒</span> '+esc(category.hidden)+' öğrenci daha · Öğretmen Pro ile görüntülenir <button type="button" data-unlock>Kilidi aç</button></div>':'';
    return '<div class="dml-student-list">'+(items||empty)+more+locked+'</div>';
  }
  function leaderTiles(sc) {
    return LEADERS.map(([k,title,subtitle,tone])=>{
      const locked=sc.leaders[k]?.locked, l=!locked&&sc.leaders[k]?{...sc.leaders[k],...stu(sc.leaders[k].id)}:null;
      return '<button type="button" class="dml-achievement" '+(locked?'data-unlock':'data-cat="'+k+'"')+'><span class="dml-achievement-icon">'+LEADER_ICONS[k]+'</span><span class="dml-tag '+tone+'">'+esc(title)+'</span><small>'+esc(subtitle)+'</small><b>'+ (locked?'🔒 Pro ile görünür':l?esc(l.name):'Henüz yok')+'</b></button>';
    }).join('');
  }
  function render() {
    if(!page)return;
    const d=data,sc=currentScope();
    const classChips=d?[{id:'all',label:'Tüm öğrencilerim'},...d.classes].map(c=>'<button type="button" class="dml-chip" data-scope="'+esc(c.id)+'" aria-pressed="'+(st.scope===c.id)+'">'+esc(c.label)+'</button>').join(''):'';
    const periods=PERIODS.map(([k,t])=>'<button type="button" data-period="'+k+'" aria-pressed="'+(st.period===k)+'">'+t+'</button>').join('');
    const scopeName=st.scope==='all'?'Tüm öğrencilerim':d?.classes?.find(c=>c.id===st.scope)?.label||'Sınıfım';
    const count=sc?.count||0;
    let body='';
    if(st.loading&&!d)body='<p class="dml-msg" role="status">Sınıf verileri yükleniyor…</p>';
    else if(!d)body='<p class="dml-msg bad" role="alert">'+esc(st.err||'Sınıf verileri yüklenemedi.')+'</p><button type="button" class="dml-chip" data-retry>Tekrar dene</button>';
    else if(!d.classes.length&&!count)body='<div class="dml-start"><span>🏫</span><b class="dml-st">Henüz sınıfın yok</b><p>İlk sınıfını oluşturarak öğrenci gelişimini takip etmeye başla.</p><button type="button" data-classes>＋ Sınıf oluştur</button></div>';
    else {
      const metrics=[['kelime','🎯','Kelime Kralı'],['dogruluk','⚡','Keskin Nişancı'],['gelisen','🚀','Roket'],['seri','🔥','Ateş Serisi']];
      const quick=metrics.map(([key,ic,title])=>{const l=sc?.leaders?.[key];return '<button type="button" class="dml-metric" '+(l?.locked?'data-unlock':'data-cat="'+key+'"')+'><span>'+ic+'</span><b>'+title+'</b><small>'+(l?.locked?'🔒 Pro':l?esc(stu(l.id).name):'Henüz yok')+'</small></button>';}).join('');
      const tabs=[['students','👥','Öğrenciler'],['performance','▥','Performans'],['reports','▤','Raporlar']].map(([id,ic,label])=>'<button type="button" data-tab="'+id+'" aria-pressed="'+(st.tab===id)+'">'+ic+' '+label+'</button>').join('');
      const catChips=CATS.map(([k,t])=>'<button type="button" class="dml-chip cat" data-cat="'+k+'" aria-pressed="'+(st.cat===k)+'">'+t+'</button>').join('');
      const att=sc?.attention||{count:0,rows:[]};
      const league=st.scope==='all'&&d.classLeague?.length>1?'<section class="dml-box"><h2>Sınıflar Ligi <small>Ortalama genel puan</small></h2>'+d.classLeague.map(c=>'<div class="dml-bar"><span>'+esc(c.label)+'</span><i><u style="width:'+Math.round(100*c.avg/Math.max(1,...d.classLeague.map(x=>x.avg)))+'%"></u></i><span>'+Number(c.avg).toLocaleString('tr-TR')+'</span></div>').join('')+'</section>':'';
      const attHtml=att.count&&d.unlocked?'<section class="dml-att"><h2>Dikkat isteyenler · '+att.count+' öğrenci</h2>'+att.rows.map(x=>({...x,...stu(x.id)})).map(r=>'<div class="r"><span>'+esc(r.name)+'</span><span>'+esc(r.why)+'</span></div>').join('')+'</section>':'';
      const proHtml=!d.unlocked&&(Math.max(0,count-(sc?.categories?.genel?.rows?.length||0))||att.count)?'<section class="dml-pro"><div class="dml-pro-top"><span class="ic">🔒</span><div><b>Tüm sınıfını gör</b><small>Tam sıralama ve dikkat isteyen öğrenciler · Öğretmen Pro</small></div></div><ul><li>Tüm öğrencilerin tam sıralaması</li><li>Dikkat isteyen öğrenciler ve nedenleri</li></ul><button type="button" data-unlock>Kilidi aç</button></section>':'';
      const students='<div class="dml-searchbar"><label><span>⌕</span><input data-search type="search" placeholder="Öğrenci ara..." aria-label="Öğrenci ara" value="'+esc(st.search)+'"></label><select data-filter aria-label="Öğrenci filtresi"><option value="all" '+(st.filter==='all'?'selected':'')+'>Tümü</option><option value="top" '+(st.filter==='top'?'selected':'')+'>İlk 3</option><option value="active" '+(st.filter==='active'?'selected':'')+'>Aktif</option></select></div><div class="dml-manage-row"><button type="button" data-add-students>＋ Öğrenci Ekle</button><button type="button" data-classes>👥 Sınıfı Yönet</button></div><div class="dml-section-head"><h2>Öğrenci Listesi</h2><span>'+count+' öğrenci</span></div><div class="dml-category-scroll">'+catChips+'</div>'+studentRows(sc);
      const performance='<div class="dml-section-head"><h2>Başarı Rozetleri</h2><span>'+esc(PERIODS.find(p=>p[0]===st.period)[1])+'</span></div><div class="dml-grid">'+leaderTiles(sc)+'</div>'+league+attHtml;
      const reports='<div class="dml-section-head"><h2>Genel sıralaması</h2><span>'+count+' öğrenci</span></div><div class="dml-category-scroll">'+catChips+'</div>'+studentRows(sc)+league+attHtml+'<button type="button" class="dml-report-action" data-class-reports>▥ Ayrıntılı Sınıf Raporları</button>';
      body='<section class="dml-class-banner"><span class="dml-class-icon">🏫</span><div><b>'+esc(scopeName)+'</b><small>Sınıf bilgilerini görüntüle ve yönet.</small></div><span class="dml-class-count">👥 <strong>'+count+'</strong><small>Öğrenci</small></span></section><div class="dml-metrics">'+quick+'</div><div class="dml-tabs" role="group" aria-label="Sınıfım bölümleri">'+tabs+'</div>'+({students,performance,reports}[st.tab]||students)+proHtml+'<p class="dml-note">Sıralama ve başarı verileri seçilen döneme aittir. Lig XP’sine öğretmenin ders içi +/- puanları dahil değildir.</p>';
    }
    page.innerHTML='<div class="dml-wrap"><header class="dml-top"><button type="button" class="dml-ib" data-close aria-label="Geri">‹</button><div class="dml-heading"><h1>Sınıfım</h1><small>Sınıf performansı ve öğrenciler</small></div><button type="button" class="dml-ib" data-refresh aria-label="Yenile">↻</button><button type="button" class="dml-ib dark" data-board aria-label="Tahtaya yansıt">▣</button></header>'+(d?'<div class="dml-row" role="group" aria-label="Sınıf seçimi">'+classChips+'</div><div class="dml-seg" role="group" aria-label="Dönem">'+periods+'</div>':'')+body+'</div>';
  }

  function findStudent(id) { return data?.students?.[id] ? { id, ...data.students[id] } : null; }

  function studentCard(id) {
    const r = findStudent(id); if (!r) return;
    const m = r.m, min = m.minutes >= 60 ? `${Math.floor(m.minutes / 60)} sa ${m.minutes % 60} dk` : `${m.minutes} dk`;
    const v = doc.createElement('div'); v.className = 'dml-veil';
    v.innerHTML = `<div class="dml-sheet" role="dialog" aria-modal="true" aria-label="${esc(r.name)}"><div class="dml-grip"></div><div class="hd">${av(r)}<span><b>${esc(r.name)}</b><small>${esc(r.cls)} · ${esc(PERIODS.find(p => p[0] === st.period)[1])}</small></span></div>
<div class="dml-stats"><div><small>Genel puan</small><b>${m.genel.toLocaleString('tr-TR')}</b></div><div><small>Lig XP</small><b>${m.xp.toLocaleString('tr-TR')}</b></div><div><small>Doğru cevap</small><b>${m.ok.toLocaleString('tr-TR')}</b></div><div><small>Doğruluk</small><b>${m.acc === null ? '—' : '%' + m.acc}</b></div><div><small>Süre</small><b>${min}</b></div><div><small>Durak/konu</small><b>${m.levels}</b></div><div><small>Seri</small><b>${m.streak} gün</b></div><div><small>Ödev</small><b>${m.hwTotal ? m.hwDone + '/' + m.hwTotal : '—'}</b></div></div>
<button type="button" class="dml-close">Kapat</button></div>`;
    v.addEventListener('click', e => { if (e.target === v || e.target.closest('.dml-close')) v.remove(); });
    doc.body.appendChild(v); v.querySelector('.dml-close').focus();
  }

  function board() {
    if (!data) return;
    if (!data.unlocked) return plans();
    const sc = data.scopes[st.scope] || data.scopes.all, c = sc.categories[st.cat], rows = c.rows.map(x => ({ ...x, ...stu(x.id) }));
    const top = [rows[1], rows[0], rows[2]], h = [70, 100, 50], col = ['#C9D5D5', '#F2A541', '#E2B48F'], n = [2, 1, 3];
    const scopeLabel = st.scope === 'all' ? 'Tüm öğrencilerim' : (data.classes.find(x => x.id === st.scope)?.label || '');
    const v = doc.createElement('div'); v.className = 'dml-board'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Tahtaya yansıt');
    v.innerHTML = `<button type="button" class="dml-ib" data-x aria-label="Kapat" style="position:absolute;right:20px;top:20px">✕</button><h2>${esc(scopeLabel)} · ${esc(CATS.find(x => x[0] === st.cat)[1])} · ${esc(PERIODS.find(p => p[0] === st.period)[1])}</h2>
<div class="dml-pod">${top.map((r, i) => r ? `<div><b>${esc(r.name)}</b><small>${esc(r.value)}</small><i style="height:${h[i] * 2.2}px;background:${col[i]}">${n[i]}</i></div>` : '<div></div>').join('')}</div>
${rows.length > 3 ? `<ol>${rows.slice(3, 15).map(r => `<li><span>${r.rank}. ${esc(r.name)}</span><span>${esc(r.value)}</span></li>`).join('')}</ol>` : ''}`;
    v.addEventListener('click', e => { if (e.target.closest('[data-x]')) { v.remove(); if (doc.fullscreenElement) doc.exitFullscreen?.().catch(() => {}); } });
    doc.body.appendChild(v);
    v.requestFullscreen?.().catch(() => {});
  }

  async function fetchPeriod(force) {
    st.loading = true; st.err = ''; if (!data || data.period !== st.period) data = null; render();
    try { data = await load(st.period, force); if (!data.scopes[st.scope]) st.scope = 'all'; }
    catch (e) { st.err = e.message; if (data && data.period !== st.period) data = null; }
    finally { st.loading = false; render(); }
  }

  function onClick(e) {
    const t = e.target.closest('button'); if (!t) return;
    if (t.matches('[data-close]')) return close();
    if (t.matches('[data-unlock]')) return plans();
    if (t.matches('[data-board]')) return board();
    if (t.matches('[data-refresh]')) return fetchPeriod(true);
    if (t.matches('[data-retry]')) return fetchPeriod(true);
    if (t.matches('[data-classes]')) return manageClasses();
    if (t.matches('[data-add-students]')) { if(window.dmTeacherBulkStudentsOpen) return window.dmTeacherBulkStudentsOpen(); return manageClasses(); }
    if (t.matches('[data-class-reports]')) { if(window.dmTeacherReportsOpen) return window.dmTeacherReportsOpen(); st.err='Rapor ekranı yüklenemedi.'; return render(); }
    if (t.dataset.tab) { st.tab=t.dataset.tab; st.expanded=false; return render(); }
    if (t.matches('[data-expand]')) { st.expanded=!st.expanded; return render(); }
    if (t.dataset.period && t.dataset.period !== st.period) { st.period = t.dataset.period; return fetchPeriod(false); }
    if (t.dataset.scope) { st.scope = t.dataset.scope; st.expanded=false; return render(); }
    if (t.dataset.cat) { st.cat = t.dataset.cat; st.expanded=false; if(t.classList.contains('dml-metric')||t.classList.contains('dml-achievement'))st.tab='reports'; return render(); }
    if (t.dataset.student) return studentCard(t.dataset.student);
  }

  // Sınıflarım (teacher-classes.js): sınıf oluşturma formu ve sınıf kodları. Kapanınca sıralama yenilenir.
  function manageClasses() {
    if (!window.dmTeacherClassesOpen) { st.err = 'Sınıflarım yüklenemedi. Sayfayı yenile.'; return render(); }
    window.dmTeacherClassesOpen();
    const watch = new MutationObserver(() => {
      if (doc.querySelector('.dmc-veil')) return;
      watch.disconnect(); for (const k of Object.keys(cache)) delete cache[k]; if (page) fetchPeriod(true);
    });
    setTimeout(() => { if (doc.querySelector('.dmc-veil')) watch.observe(doc.body, { childList: true }); }, 0);
  }

  function onKey(e) { if (e.key === 'Escape' && !doc.querySelector('.dml-veil,.dml-board')) close(); }
  const sync = on => { doc.body.classList.toggle('tp-league-active', on); window.dmTeacherDockSync?.(); };
  function close() { if (!page) return; page.remove(); page = null; doc.removeEventListener('keydown', onKey); sync(false); }

  function open() {
    if (page) return;
    if (!doc.getElementById('dml-css')) { const s = doc.createElement('style'); s.id = 'dml-css'; s.textContent = CSS; doc.head.appendChild(s); }
    page = doc.createElement('div'); page.className = 'dml-page'; page.setAttribute('role', 'dialog'); page.setAttribute('aria-modal', 'true'); page.setAttribute('aria-label', 'Sınıfım');
    page.addEventListener('click', onClick);
    page.addEventListener('input', e => { if(e.target.matches('[data-search]')) { st.search=e.target.value; const cursor=e.target.selectionStart; render(); const field=page.querySelector('[data-search]');field?.focus();try{field?.setSelectionRange(cursor,cursor)}catch{} } });
    page.addEventListener('change', e => { if(e.target.matches('[data-filter]')) { st.filter=e.target.value; st.expanded=false; render(); } });
    doc.addEventListener('keydown', onKey);
    doc.body.appendChild(page); sync(true);
    fetchPeriod(false);
  }

  // The canonical tile is rendered by teacher-portal.js; do not inject duplicates.
  window.dmTeacherLeagueOpen = open;
  window.dmTeacherLeagueClose = close;
})();
