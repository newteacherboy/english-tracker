/* Öğretmen paneli: "📈 Sınıf Raporları" (çoklu sınıfa bağlı).
   Özet (önceki döneme göre), sınıfın zorlandığı kelimeler, öğrenci tablosu, hiç çalışmayanlar.
   Plan: Free son 7 gün (sunucu zorlar) · Pro 30 gün + PDF · Premium Pro + Excel (CSV). */
(() => {
  'use strict';
  const API = 'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/teacher-classes';
  const doc = document;
  const GAMES = { harfbahcesi: 'Harf Bahçesi', kelime: 'Kelime Laboratuvarı', jeopardy: 'Risk Balonları', bosluk: 'Eksik Harf', hafiza: 'Hafıza Sandığı', yagmur: 'Hız Fırtınası', asmaca: 'Harf Avı', kelimebul: 'Şifre Kırıcı', konusma: 'Kelime Modu', eslestirme: 'Eş Bul', tren: 'Kelime Treni', dikte: 'Kulak Dedektifi', cumle: 'Cümle Ustası', ucus: 'Kelime Uçuşu', rota: 'Cümle Rotası', ralli: 'Kelime Rallisi' };
  const PLAN = { free: 'Free', pro: 'Pro', premium_pro: 'Premium Pro' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem('dm_tp_session') || 'null')?.teacherToken || sessionStorage.getItem('ing_ogr_token') || ''; } catch { return ''; } };
  const native = () => !!window.Capacitor?.isNativePlatform?.();
  const label = c => `${c.classNo}-${c.branch}`;
  const date = v => new Date(v).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

  function ago(v) {
    if (!v) return 'hiç';
    const d = Math.floor((Date.now() - Date.parse(v)) / 86400000);
    return d <= 0 ? 'bugün' : d === 1 ? 'dün' : d < 30 ? `${d} gün önce` : `${Math.floor(d / 30)} ay önce`;
  }

  async function call(body) {
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', 'x-diji-token': token() }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw Error(j.mesaj || 'Rapor şu an yüklenemedi.');
    return j;
  }

  const CSS = `.dmr-veil{position:fixed;inset:0;z-index:2147483643;background:rgba(13,49,55,.45);display:flex;align-items:flex-end;justify-content:center}
.dmr-sheet{width:min(100%,760px);max-height:95vh;overflow:auto;background:#fffefa;border:1px solid #b7ece4;border-bottom:0;border-radius:32px 32px 0 0;color:#114952;font:600 15px/1.45 system-ui,-apple-system,sans-serif;padding-bottom:env(safe-area-inset-bottom,0px);animation:dmrUp .34s cubic-bezier(.2,.7,.25,1)}
.dmr-hero{position:relative;padding:22px 20px 16px;background:radial-gradient(ellipse at 4% 85%,#fffdf2 0 16%,transparent 17%),radial-gradient(ellipse at 100% 95%,#e4fff1 0 20%,transparent 21%),linear-gradient(125deg,#c7f8ee,#87dbf8 60%,#c2f2f0);border-radius:0 0 28px 28px}
.dmr-hero h2{margin:0;font:800 22px/1.2 system-ui}.dmr-hero p{margin:4px 0 0;color:#2d6b74;font:600 13px/1.4 system-ui}
.dmr-x{position:absolute;right:14px;top:12px;width:34px;height:34px;border-radius:50%;border:0;background:#ffffffb0;color:#114952;font:700 18px system-ui;cursor:pointer}
.dmr-chips{display:flex;gap:6px;overflow-x:auto;margin-top:12px;padding-bottom:2px;scrollbar-width:none}
.dmr-chip{flex:none;border:0;border-radius:999px;padding:7px 13px;font:800 13px system-ui;background:#ffffffa8;color:#114952;cursor:pointer}.dmr-chip.on{background:#114952;color:#fff}
.dmr-seg{display:inline-flex;margin-top:10px;background:#ffffff90;border-radius:12px;padding:3px}.dmr-seg button{border:0;background:none;border-radius:9px;padding:6px 12px;font:800 13px system-ui;color:#2d6b74;cursor:pointer}.dmr-seg button.on{background:#fff;color:#114952;box-shadow:0 1px 3px #0001}
.dmr-body{padding:14px 16px 22px}
.dmr-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.dmr-card{border:1.5px solid #dbe9ea;border-radius:16px;background:#fff;padding:10px 12px}.dmr-card small{display:block;color:#5c8c92;font:700 12px system-ui}.dmr-card b{display:block;font:900 22px/1.2 system-ui;margin-top:2px}
.dmr-tr{font:800 11.5px system-ui}.dmr-tr.up{color:#0f7a5c}.dmr-tr.down{color:#b3261e}.dmr-tr.eq{color:#7aa3a8}
.dmr-sec{font:800 14px system-ui;margin:18px 2px 8px;color:#2d6b74;display:flex;justify-content:space-between;align-items:baseline}
.dmr-box{border:1.5px solid #dbe9ea;border-radius:18px;background:#fff;padding:6px 12px}
.dmr-word{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid #f2f6f5;font-size:14px}.dmr-word:last-child{border:0}.dmr-word small{color:#7aa3a8}
.dmr-bar{height:6px;border-radius:4px;background:#eef6f5;margin-top:4px;overflow:hidden}.dmr-bar i{display:block;height:100%;background:#f5ad3d}
.dmr-table{width:100%;border-collapse:collapse;font-size:13.5px}.dmr-table th{font:800 12px system-ui;color:#5c8c92;text-align:right;padding:8px 4px;cursor:pointer;white-space:nowrap;user-select:none}.dmr-table th:first-child,.dmr-table td:first-child{text-align:left}
.dmr-table td{padding:8px 4px;border-top:1px solid #f2f6f5;text-align:right;white-space:nowrap}.dmr-table tr.st{cursor:pointer}.dmr-table tr.st:hover td{background:#f7fbfb}
.dmr-table td.nm{max-width:150px;overflow:hidden;text-overflow:ellipsis}.dmr-table tr.more td{white-space:normal;text-align:left;background:#f7fbfb;color:#2d6b74;font-size:13px}
.dmr-acc{display:inline-block;min-width:38px;border-radius:8px;padding:1px 6px;font-weight:800;text-align:center}.dmr-acc.g{background:#e3f7ee;color:#0f7a5c}.dmr-acc.y{background:#fff4dc;color:#a76016}.dmr-acc.r{background:#fdecea;color:#b3261e}
.dmr-pill{display:inline-block;background:#eef7f5;color:#0f5d55;border-radius:999px;padding:3px 10px;margin:3px 4px 3px 0;font:700 12.5px system-ui}
.dmr-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.dmr-b{border:0;border-radius:14px;padding:11px 16px;font:800 14px system-ui;cursor:pointer;background:#0aa3ab;color:#fff;border-bottom:3px solid #077a80}.dmr-b.lock{background:#eef3f2;color:#7aa3a8;border-color:#dbe5e4}
.dmr-note{color:#7aa3a8;font:600 12.5px/1.45 system-ui;margin:8px 2px 0}.dmr-empty{color:#7aa3a8;font-size:13px;padding:10px 0}
@keyframes dmrUp{from{transform:translateY(100%)}to{transform:none}}
@media(prefers-reduced-motion:reduce){.dmr-sheet{animation:none}}
@media(max-width:560px){.dmr-cards{grid-template-columns:repeat(2,1fr)}.dmr-table .opt{display:none}}
#dmrPrint{display:none}
@media print{body.dmr-printing>*:not(#dmrPrint){display:none!important}body.dmr-printing #dmrPrint{display:block!important;color:#000;font:12px/1.4 system-ui,sans-serif}#dmrPrint h1{font-size:18px;margin:0 0 2px}#dmrPrint table{width:100%;border-collapse:collapse;margin:8px 0 14px}#dmrPrint th,#dmrPrint td{border:1px solid #bbb;padding:4px 6px;text-align:left}#dmrPrint h2{font-size:14px;margin:14px 0 4px}}`;

  let veil = null, classes = [], cur = null, days = 7, data = null, sort = { k: 'games', d: -1 }, openRow = null, msg = '';

  function trend(now, prev, unit = '') {
    if (now === null || now === undefined || prev === null || prev === undefined) return '';
    const d = now - prev;
    if (!prev && !now) return '<span class="dmr-tr eq">—</span>';
    if (d === 0) return '<span class="dmr-tr eq">= aynı</span>';
    return `<span class="dmr-tr ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}${unit}</span>`;
  }
  const accCls = a => a === null || a === undefined ? '' : a >= 80 ? 'g' : a >= 60 ? 'y' : 'r';
  const acc = a => a === null || a === undefined ? '<span style="color:#b9cfd1">—</span>' : `<span class="dmr-acc ${accCls(a)}">%${a}</span>`;

  function sorted() {
    const v = s => sort.k === 'name' ? String(s.username).toLocaleLowerCase('tr') : sort.k === 'last' ? (s.lastLogin ? Date.parse(s.lastLogin) : 0) : (s[sort.k] ?? -1);
    return [...data.students].sort((a, b) => { const x = v(a), y = v(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.d; });
  }

  function head() {
    const free = (data?.plan || 'free') === 'free';
    return `<div class="dmr-hero"><button class="dmr-x" data-close aria-label="Kapat">✕</button><h2>📈 Sınıf Raporları</h2>
<p>${data ? `${esc(label(data.class))}${data.class.name ? ' · ' + esc(data.class.name) : ''} · ${date(data.from)} – ${date(data.to)} · Planın: ${esc(PLAN[data.plan] || 'Free')}` : 'Bir sınıf seç.'}</p>
<div class="dmr-chips" role="tablist">${classes.map(c => `<button class="dmr-chip${c.id === cur ? ' on' : ''}" data-cls="${c.id}" role="tab" aria-selected="${c.id === cur}">${esc(label(c))}</button>`).join('')}</div>
<div class="dmr-seg"><button data-days="7" class="${days === 7 ? 'on' : ''}">Son 7 gün</button><button data-days="30" class="${days === 30 && !free ? 'on' : ''}">${free ? '🔒 ' : ''}Son 30 gün</button></div></div>`;
  }

  function body() {
    if (!data) return `<div class="dmr-body"><div class="dmr-empty">${esc(msg || 'Yükleniyor…')}</div></div>`;
    const s = data.summary, n = data.studentCount;
    const cards = `<div class="dmr-cards">
<div class="dmr-card"><small>Aktif öğrenci</small><b>${s.active}<span style="font-size:15px;color:#7aa3a8">/${n}</span></b>${trend(s.active, s.prevActive)}</div>
<div class="dmr-card"><small>Çalışma süresi</small><b>${s.minutes} dk</b>${trend(s.minutes, s.prevMinutes, ' dk')}</div>
<div class="dmr-card"><small>Doğruluk</small><b>${s.accuracy === null ? '—' : '%' + s.accuracy}</b>${trend(s.accuracy, s.prevAccuracy, ' puan')}</div>
<div class="dmr-card"><small>Oyun · Seviye</small><b>${s.games} · ${s.levels}</b>${trend(s.games, s.prevGames, ' oyun')}</div></div>`;
    const top = `<p class="dmr-note">▲▼ önceki ${data.days} güne göre değişim.</p>` + (data.topGames.length ? `<p class="dmr-note" style="margin-top:2px">En çok oynanan: ${data.topGames.map(g => `${esc(GAMES[g.game] || g.game)} (${g.count})`).join(', ')}</p>` : '');
    const maxW = Math.max(1, ...data.weakWords.map(w => w.students));
    const weak = data.weakWords.length ? data.weakWords.map(w => `<div class="dmr-word"><span style="flex:1"><b>${esc(w.en)}</b> <small>— ${esc(w.tr)}</small><div class="dmr-bar"><i style="width:${w.students / maxW * 100}%"></i></div></span><small>${w.students} öğr. · ${w.wrong} yanlış</small></div>`).join('') : '<div class="dmr-empty">Bu sınıfta henüz kayıtlı zor kelime yok.</div>';
    const arrow = k => sort.k === k ? (sort.d < 0 ? ' ▼' : ' ▲') : '';
    const rows = sorted().map(st => `<tr class="st" data-row="${st.id}"><td class="nm">${esc(st.username)}</td><td>${st.games}</td><td>${st.minutes}</td><td>${acc(st.accuracy)}</td><td class="opt">${st.levels}</td><td class="opt">${ago(st.lastLogin)}</td></tr>${openRow === st.id ? `<tr class="more"><td colspan="6">${st.fullName ? `<b>${esc(st.fullName)}</b> · ` : ''}XP ${st.xp} · ${st.streak} gün seri · son giriş ${ago(st.lastLogin)} · ${st.levels} seviye<br>${st.weak.length ? 'Zorlandığı kelimeler: ' + st.weak.map(w => `<span class="dmr-pill">${esc(w)}</span>`).join('') : 'Kayıtlı zor kelimesi yok.'}</td></tr>` : ''}`).join('');
    const idle = data.students.filter(s => !s.games);
    const plan = data.plan || 'free', canPdf = plan !== 'free', canCsv = plan === 'premium_pro';
    const nat = native();
    return `<div class="dmr-body">${cards}${top}
<div class="dmr-sec"><span>Sınıfın zorlandığı kelimeler</span><small style="color:#7aa3a8;font-weight:600">öğrenilene kadar</small></div><div class="dmr-box">${weak}</div>
<div class="dmr-sec"><span>Öğrenciler (${n})</span><small style="color:#7aa3a8;font-weight:600">Satıra dokun: ayrıntı</small></div>
<div class="dmr-box" style="padding:2px 8px;overflow-x:auto">${n ? `<table class="dmr-table"><thead><tr><th data-sort="name">Öğrenci${arrow('name')}</th><th data-sort="games">Oyun${arrow('games')}</th><th data-sort="minutes">Dk${arrow('minutes')}</th><th data-sort="accuracy">Doğruluk${arrow('accuracy')}</th><th class="opt" data-sort="levels">Seviye${arrow('levels')}</th><th class="opt" data-sort="last">Son giriş${arrow('last')}</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="dmr-empty">Bu sınıfta öğrenci yok. Sınıflarım ekranından kodu paylaş.</div>'}</div>
${idle.length && n ? `<div class="dmr-sec"><span>Bu dönemde hiç oyun oynamayanlar (${idle.length})</span></div><div>${idle.map(s => `<span class="dmr-pill" style="background:#fff4dc;color:#a76016">${esc(s.username)}</span>`).join('')}</div>` : ''}
<div class="dmr-acts"><button class="dmr-b${canPdf && !nat ? '' : ' lock'}" data-pdf>${canPdf ? '' : '🔒 '}🖨️ PDF / Yazdır</button><button class="dmr-b${canCsv && !nat ? '' : ' lock'}" data-csv>${canCsv ? '' : '🔒 '}📊 Excel</button></div>
<p class="dmr-note" data-note>${nat ? 'PDF ve Excel çıktısı web panelinden (app.dijimedu.com) alınır.' : !canPdf ? 'Pro ile son 30 gün ve PDF, Premium Pro ile ek olarak Excel çıktısı.' : !canCsv ? 'Excel çıktısı Premium Pro ile.' : ''} Süre ve doğruluk, oyun sonuçlarından hesaplanır; ders anlatımı ekranında geçen süre dahil değildir.</p></div>`;
  }

  const render = () => { if (veil) veil.querySelector('.dmr-sheet').innerHTML = head() + body(); };

  async function load() {
    if (!cur) return;
    data = null; msg = ''; openRow = null; render();
    try { data = await call({ action: 'report', classId: cur, days }); days = data.days; }
    catch (e) { msg = e.message; }
    render();
  }

  function printReport() {
    const s = data.summary, c = data.class;
    let el = doc.getElementById('dmrPrint'); if (!el) { el = doc.createElement('div'); el.id = 'dmrPrint'; doc.body.appendChild(el); }
    el.innerHTML = `<h1>Diji Medu · ${esc(label(c))} sınıf raporu</h1><div>${c.name ? esc(c.name) + ' · ' : ''}${date(data.from)} – ${date(data.to)} (${data.days} gün)</div>
<h2>Özet</h2><table><tr><th>Aktif öğrenci</th><th>Çalışma süresi</th><th>Doğruluk</th><th>Oyun</th><th>Seviye</th></tr><tr><td>${s.active}/${data.studentCount}</td><td>${s.minutes} dk</td><td>${s.accuracy === null ? '—' : '%' + s.accuracy}</td><td>${s.games}</td><td>${s.levels}</td></tr></table>
<h2>Sınıfın zorlandığı kelimeler</h2><table><tr><th>Kelime</th><th>Anlamı</th><th>Öğrenci</th><th>Yanlış</th></tr>${data.weakWords.map(w => `<tr><td>${esc(w.en)}</td><td>${esc(w.tr)}</td><td>${w.students}</td><td>${w.wrong}</td></tr>`).join('') || '<tr><td colspan="4">—</td></tr>'}</table>
<h2>Öğrenciler</h2><table><tr><th>Öğrenci</th><th>Ad soyad</th><th>Oyun</th><th>Dk</th><th>Doğruluk</th><th>Seviye</th><th>Son giriş</th><th>Zor kelimeler</th></tr>${sorted().map(x => `<tr><td>${esc(x.username)}</td><td>${esc(x.fullName || '')}</td><td>${x.games}</td><td>${x.minutes}</td><td>${x.accuracy === null ? '—' : '%' + x.accuracy}</td><td>${x.levels}</td><td>${ago(x.lastLogin)}</td><td>${esc(x.weak.join(', '))}</td></tr>`).join('')}</table>`;
    const done = () => { el.innerHTML = ''; doc.body.classList.remove('dmr-printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    doc.body.classList.add('dmr-printing');
    window.print();
  }

  function csv() {
    const q = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const L = [['Öğrenci', 'Ad soyad', 'Oyun', 'Dakika', 'Doğruluk %', 'Seviye', 'XP', 'Seri (gün)', 'Son giriş', 'Zor kelimeler']];
    for (const x of sorted()) L.push([x.username, x.fullName || '', x.games, x.minutes, x.accuracy ?? '', x.levels, x.xp, x.streak, x.lastLogin ? new Date(x.lastLogin).toLocaleDateString('tr-TR') : '', x.weak.join(', ')]);
    L.push([], ['Zor kelime', 'Anlamı', 'Öğrenci sayısı', 'Toplam yanlış']);
    for (const w of data.weakWords) L.push([w.en, w.tr, w.students, w.wrong]);
    const blob = new Blob(['﻿' + L.map(r => r.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = doc.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `diji-medu-${label(data.class)}-${data.days}gun-${new Date().toISOString().slice(0, 10)}.csv`;
    doc.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function note(t) { const n = veil?.querySelector('[data-note]'); if (n) { n.textContent = t; n.style.color = '#a76016'; } }

  function onClick(e) {
    if (e.target === veil) return close();
    const t = e.target.closest('button,th[data-sort],tr[data-row]'); if (!t) return;
    if (t.matches('[data-close]')) return close();
    if (t.dataset.cls) { if (t.dataset.cls !== cur) { cur = t.dataset.cls; load(); } return; }
    if (t.dataset.days) {
      const d = +t.dataset.days; if (d === days) return;
      if (d === 30 && (data?.plan || 'free') === 'free') return note('Son 30 günlük rapor Pro ve Premium Pro planlarında. Free planda son 7 gün görünür.');
      days = d; return load();
    }
    if (t.dataset.sort) { const k = t.dataset.sort; sort = { k, d: sort.k === k ? -sort.d : (k === 'name' ? 1 : -1) }; return render(); }
    if (t.dataset.row) { openRow = openRow === t.dataset.row ? null : t.dataset.row; return render(); }
    if (!data) return;
    if (t.matches('[data-pdf],[data-csv]')) {
      if (native()) return note('PDF ve Excel çıktısını web panelinden (app.dijimedu.com) alabilirsin.');
      if (t.matches('[data-pdf]')) return data.plan === 'free' ? note('PDF çıktısı Pro ve Premium Pro planlarında.') : printReport();
      return data.plan === 'premium_pro' ? csv() : note('Excel çıktısı Premium Pro planında.');
    }
  }

  function onKey(e) { if (e.key === 'Escape') close(); }
  function close() { veil?.remove(); veil = null; doc.removeEventListener('keydown', onKey); }

  async function open(classId) {
    if (veil) return;
    if (!doc.getElementById('dmr-css')) { const st = doc.createElement('style'); st.id = 'dmr-css'; st.textContent = CSS; doc.head.appendChild(st); }
    veil = doc.createElement('div'); veil.className = 'dmr-veil';
    veil.innerHTML = '<div class="dmr-sheet" role="dialog" aria-modal="true" aria-label="Sınıf raporları"></div>';
    veil.addEventListener('click', onClick); doc.addEventListener('keydown', onKey); doc.body.appendChild(veil);
    data = null; msg = ''; render();
    try {
      const list = await call({ action: 'list' });
      classes = list.classes || [];
      if (!classes.length) { msg = 'Henüz sınıfın yok. Önce Sınıflarım ekranından bir sınıf oluştur.'; return render(); }
      cur = classes.some(c => c.id === classId) ? classId : (cur && classes.some(c => c.id === cur) ? cur : classes[0].id);
      await load();
    } catch (e) { msg = e.message; render(); }
  }

  function addTile() {
    const tiles = doc.querySelector('#tpDashboard .tp-real-tools');
    if (!tiles || tiles.querySelector('[data-dmr]')) return;
    const b = doc.createElement('button'); b.type = 'button'; b.dataset.dmr = '1';
    b.innerHTML = '<span aria-hidden="true">📈</span><strong>Sınıf Raporları</strong><small>Süre, doğruluk, zor kelimeler</small>';
    b.addEventListener('click', () => open());
    const after = tiles.querySelector('[data-dmc]'); after ? after.after(b) : tiles.prepend(b);
  }
  new MutationObserver(addTile).observe(doc.documentElement, { childList: true, subtree: true });
  window.dmTeacherReportsOpen = open;
})();
