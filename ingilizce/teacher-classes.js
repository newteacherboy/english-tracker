/* Öğretmen paneli: "🏫 Sınıflarım" — çoklu sınıf.
   Her sınıfın kendi katılım kodu var; öğrenci kayıtta bu kodu "Öğretmen kodu" alanına yazınca öğretmene ve şubeye bağlanır.
   Sınır plana göre: Free 1, Pro 5, Premium Pro sınırsız (yalnız yeni sınıf açarken; mevcut sınıflar kilitlenmez).
   Yetki ve sınır sunucuda denetlenir (teacher-classes). */
(() => {
  'use strict';
  const API = 'https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/teacher-classes';
  const doc = document;
  const PLAN = { free: 'Free', pro: 'Pro', premium_pro: 'Premium Pro' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const token = () => { try { return JSON.parse(sessionStorage.getItem('dm_tp_session') || 'null')?.teacherToken || sessionStorage.getItem('ing_ogr_token') || ''; } catch { return ''; } };
  const label = c => `${c.classNo}-${c.branch}`;

  async function call(body) {
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', 'x-diji-token': token() }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { const e = Error(j.mesaj || 'İşlem tamamlanamadı.'); e.limit = j.limit; throw e; }
    return j;
  }

  const CSS = `.dmc-veil{position:fixed;inset:0;z-index:2147483000;background:rgba(13,49,55,.45);display:flex;align-items:flex-end;justify-content:center}
.dmc-sheet{width:min(100%,640px);max-height:94vh;overflow:auto;background:#fffefa;border:1px solid #b7ece4;border-bottom:0;border-radius:32px 32px 0 0;color:#114952;font:600 15px/1.45 system-ui,-apple-system,sans-serif;padding-bottom:env(safe-area-inset-bottom,0px);animation:dmcUp .34s cubic-bezier(.2,.7,.25,1)}
.dmc-hero{position:relative;padding:22px 20px 18px;background:radial-gradient(ellipse at 4% 85%,#fffdf2 0 16%,transparent 17%),radial-gradient(ellipse at 100% 95%,#e4fff1 0 20%,transparent 21%),linear-gradient(125deg,#c7f8ee,#87dbf8 60%,#c2f2f0);border-radius:0 0 28px 28px}
.dmc-hero h2{margin:0;font:800 22px/1.2 system-ui}.dmc-hero p{margin:4px 0 0;color:#2d6b74;font:600 13px/1.4 system-ui}
.dmc-x{position:absolute;right:14px;top:12px;width:34px;height:34px;border-radius:50%;border:0;background:#ffffffb0;color:#114952;font:700 18px system-ui;cursor:pointer}
.dmc-quota{margin-top:10px;display:flex;align-items:center;gap:10px;font:800 13px system-ui}.dmc-bar{flex:1;height:8px;border-radius:6px;background:#ffffff90;overflow:hidden}.dmc-bar i{display:block;height:100%;background:#0aa3ab}
.dmc-body{padding:14px 16px 20px}
.dmc-card{border:1.5px solid #dbe9ea;border-radius:18px;background:#fff;padding:12px 14px;margin-bottom:10px}
.dmc-head{display:flex;align-items:center;gap:12px}.dmc-badge{min-width:56px;height:56px;border-radius:16px;background:#e3f8f6;color:#0b7f86;display:grid;place-items:center;font:900 19px system-ui;padding:0 6px}
.dmc-meta{flex:1;min-width:0}.dmc-meta b{display:block;font:800 16px system-ui}.dmc-meta small{color:#5c8c92;font-weight:600}
.dmc-code{display:inline-flex;align-items:center;gap:6px;margin-top:6px;background:#f3f6ff;border:1px dashed #9db0f2;border-radius:10px;padding:4px 10px;font:800 15px ui-monospace,monospace;letter-spacing:2px;color:#3b5bdb;cursor:pointer}
.dmc-acts{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.dmc-b{border:0;border-radius:12px;padding:7px 10px;font:800 12.5px system-ui;cursor:pointer;background:#eef7f5;color:#0f5d55}.dmc-b.red{background:#fdecea;color:#b3261e}.dmc-b.main{background:#0aa3ab;color:#fff;border-bottom:3px solid #077a80}
.dmc-list{list-style:none;margin:10px 0 0;padding:0;border-top:1px solid #eef3f2}.dmc-list li{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid #f2f6f5;font-size:14px}
.dmc-list select,.dmc-form select,.dmc-form input{border:1.5px solid #cfe3e1;border-radius:10px;padding:7px 8px;font:600 14px system-ui;background:#fff;color:#114952;min-width:0}
.dmc-form{display:grid;grid-template-columns:90px 90px 1fr;gap:8px;margin-top:8px}.dmc-form .dmc-b{grid-column:1/-1;min-height:46px;font-size:15px}
.dmc-sec{font:800 14px system-ui;margin:16px 2px 8px;color:#2d6b74}
.dmc-msg{min-height:20px;margin:6px 2px;font:700 13px system-ui}.dmc-msg.bad{color:#b3261e}.dmc-msg.good{color:#0f7a5c}
.dmc-limit{border:1.5px solid #f5ad3d;background:#fff8ec;border-radius:16px;padding:12px 14px;margin-top:10px}
.dmc-help{color:#5c8c92;font:600 12.5px/1.45 system-ui;margin:12px 2px 0}
.dmc-empty{color:#7aa3a8;font-size:13px;padding:6px 0}
@keyframes dmcUp{from{transform:translateY(100%)}to{transform:none}}
@media(prefers-reduced-motion:reduce){.dmc-sheet{animation:none}}
@media(max-width:420px){.dmc-form{grid-template-columns:1fr 1fr}.dmc-form input[data-name]{grid-column:1/-1}}`;

  let state = null, veil = null, openId = null;

  function quota(d) {
    const lim = d.limit, used = d.used || 0;
    return `<div class="dmc-quota"><span>Planın: ${esc(PLAN[d.plan] || 'Free')}</span><span class="dmc-bar"><i style="width:${lim ? Math.min(100, used / lim * 100) : 100}%"></i></span><span>${used} / ${lim ?? '∞'} sınıf</span></div>`;
  }

  function moveSelect(student, currentId) {
    const opts = state.classes.filter(c => c.id !== currentId).map(c => `<option value="${c.id}">${esc(label(c))}</option>`).join('');
    return opts ? `<select data-move="${student.id}" aria-label="${esc(student.username)} öğrencisini taşı"><option value="">Taşı…</option>${opts}</select>` : '';
  }

  function render(msg = '', bad = false) {
    const d = state;
    const classes = d.classes.map(c => `<div class="dmc-card" data-class="${c.id}">
 <div class="dmc-head"><span class="dmc-badge">${esc(label(c))}</span><span class="dmc-meta"><b>${esc(c.name || label(c) + ' sınıfı')}</b><small>${c.students.length} öğrenci</small><br>
 <span class="dmc-code" data-copy="${esc(c.code)}" title="Kopyala">${esc(c.code)} <span aria-hidden="true">📋</span></span></span></div>
 <div class="dmc-acts"><button class="dmc-b" data-toggle="${c.id}">${openId === c.id ? 'Öğrencileri gizle' : 'Öğrenciler'}</button><button class="dmc-b" data-rename="${c.id}">Adlandır</button><button class="dmc-b" data-newcode="${c.id}">Yeni kod</button><button class="dmc-b red" data-archive="${c.id}">Arşivle</button></div>
 ${openId === c.id ? `<ul class="dmc-list">${c.students.length ? c.students.map(s => `<li><span>${esc(s.username)}${s.fullName ? ` <small style="color:#7aa3a8">· ${esc(s.fullName)}</small>` : ''}</span>${moveSelect(s, c.id)}</li>`).join('') : '<li class="dmc-empty">Bu sınıfta henüz öğrenci yok. Kodu öğrencilerinle paylaş.</li>'}</ul>` : ''}
</div>`).join('') || '<p class="dmc-empty">Henüz sınıfın yok. Aşağıdan ilk sınıfını oluştur.</p>';
    const un = d.unassigned || [];
    const unassigned = un.length ? `<div class="dmc-sec">Sınıfı tanımlanmamış öğrenciler (${un.length})</div><div class="dmc-card"><ul class="dmc-list" style="border:0;margin:0">${un.map(s => `<li><span>${esc(s.username)} <small style="color:#7aa3a8">· ${s.classNo ? esc(s.classNo + '. sınıf' + (s.branch ? ' / ' + s.branch : '')) : 'sınıf yok'}</small></span>${moveSelect(s, null)}</li>`).join('')}</ul></div>` : '';
    const full = d.limit !== null && d.limit !== undefined && d.used >= d.limit;
    const grades = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}"${i + 1 === 5 ? ' selected' : ''}>${i + 1}. sınıf</option>`).join('');
    veil.querySelector('.dmc-sheet').innerHTML = `<div class="dmc-hero"><button class="dmc-x" data-close aria-label="Kapat">✕</button><h2>🏫 Sınıflarım</h2><p>Her sınıfın kendi kodu var. Öğrenci kayıtta kodu yazınca doğrudan o sınıfa katılır.</p>${quota(d)}</div>
<div class="dmc-body"><div class="dmc-msg ${bad ? 'bad' : 'good'}" role="status">${esc(msg)}</div>${classes}
<div class="dmc-sec">Yeni sınıf</div><div class="dmc-card">${full ? limitCard(d.limit) : `<div class="dmc-form"><select data-grade aria-label="Sınıf">${grades}</select><input data-branch maxlength="10" placeholder="Şube (A)" aria-label="Şube"><input data-name maxlength="40" placeholder="Ad (isteğe bağlı)" aria-label="Sınıf adı"><button class="dmc-b main" data-create>Sınıfı oluştur</button></div>`}</div>
${unassigned}
<p class="dmc-help">İpucu: Kodu tahtaya yazabilir ya da veli grubunda paylaşabilirsin. Öğrenci sınıfını seçerken koddaki sınıfla aynı numarayı seçmeli. Kod sızdıysa "Yeni kod" ile eskisini geçersiz kıl, kayıtlı öğrenciler etkilenmez.</p></div>`;
  }

  function limitCard(lim) {
    const android = !!window.dmAndroidBilling?.available;
    return `<div class="dmc-limit"><b>Sınıf sınırına ulaştın (${lim} sınıf)</b><p style="margin:4px 0 8px;color:#8a5a12;font-size:13px">Pro ile 5, Premium Pro ile sınırsız sınıf açabilirsin. Mevcut sınıfların ve öğrencilerin olduğu gibi kalır.</p>${android ? '<button class="dmc-b main" data-plans>Planları gör</button>' : '<small style="color:#8a5a12">Öğretmen planları çok yakında web ve Android\'de.</small>'}</div>`;
  }

  async function act(body, okMsg, btn) {
    if (btn) btn.disabled = true;
    try { const r = await call(body); state = r; render(typeof okMsg === 'function' ? okMsg(r) : okMsg); }
    catch (e) { if (e.limit) { state = { ...state, limit: e.limit, used: Math.max(state.used, e.limit) }; } render(e.message, true); }
    finally { if (btn) btn.disabled = false; }
  }

  function twoTap(b, text) {
    if (b.dataset.armed) return true;
    const old = b.textContent; b.dataset.armed = '1'; b.textContent = text;
    setTimeout(() => { if (b.isConnected && b.dataset.armed) { delete b.dataset.armed; b.textContent = old; } }, 4000);
    return false;
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    const t = doc.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; doc.body.appendChild(t); t.select();
    let ok = false; try { ok = doc.execCommand('copy'); } catch {} t.remove(); return ok;
  }

  async function onClick(e) {
    const t = e.target.closest('button,[data-copy]'); if (!t && e.target !== veil) return;
    if (e.target === veil || t.matches('[data-close]')) return close();
    if (t.dataset.copy) return render((await copy(t.dataset.copy)) ? `${t.dataset.copy} kopyalandı. Öğrencilerinle paylaşabilirsin.` : `Kod: ${t.dataset.copy}`);
    if (t.dataset.toggle) { openId = openId === t.dataset.toggle ? null : t.dataset.toggle; return render(); }
    if (t.matches('[data-plans]')) { close(); return window.dmAndroidBilling?.open?.('ogretmen-siniflar'); }
    if (t.dataset.newcode) { if (!twoTap(t, 'Eski kod geçersiz olur. Tekrar dokun')) return; return act({ action: 'update', classId: t.dataset.newcode, newCode: true }, r => `Yeni kod: ${r.result?.code}`, t); }
    if (t.dataset.archive) { if (!twoTap(t, 'Emin misin? Tekrar dokun')) return; if (openId === t.dataset.archive) openId = null; return act({ action: 'update', classId: t.dataset.archive, archive: true }, 'Sınıf arşivlendi. Öğrencileri "sınıfı tanımlanmamış" listesinde.', t); }
    if (t.dataset.rename) {
      const card = t.closest('.dmc-card'), c = state.classes.find(x => x.id === t.dataset.rename);
      if (card.querySelector('[data-rename-input]')) return;
      const row = doc.createElement('div'); row.className = 'dmc-acts';
      row.innerHTML = `<input data-rename-input maxlength="40" value="${esc(c?.name || '')}" placeholder="${esc(label(c))} sınıfı" style="flex:1;border:1.5px solid #cfe3e1;border-radius:10px;padding:7px 8px;font:600 14px system-ui"><button class="dmc-b main" data-save-name="${c.id}">Kaydet</button>`;
      card.appendChild(row); row.querySelector('input').focus(); return;
    }
    if (t.dataset.saveName) return act({ action: 'update', classId: t.dataset.saveName, name: t.parentElement.querySelector('input').value }, 'Sınıf adı kaydedildi.', t);
    if (t.matches('[data-create]')) {
      const s = veil.querySelector('.dmc-form'), branch = s.querySelector('[data-branch]').value.trim();
      if (!branch) return render('Şube yaz (örneğin A).', true);
      return act({ action: 'create', classNo: +s.querySelector('[data-grade]').value, branch, name: s.querySelector('[data-name]').value }, r => `Sınıf oluşturuldu. Kodu: ${r.result?.code}`, t);
    }
  }

  function onChange(e) {
    const sel = e.target.closest('select[data-move]'); if (!sel || !sel.value) return;
    const c = state.classes.find(x => x.id === sel.value);
    const s = [...state.classes.flatMap(x => x.students), ...(state.unassigned || [])].find(x => x.id === sel.dataset.move);
    const from = s?.classNo ?? state.classes.find(x => x.students.some(y => y.id === s?.id))?.classNo;
    const note = from && c && Number(from) !== Number(c.classNo) ? ` Sınıf numarası ${from} → ${c.classNo} oldu; çalışma durağı yeni sınıfa göre ilerler.` : '';
    sel.disabled = true;
    act({ action: 'move', studentId: sel.dataset.move, classId: sel.value }, `${s?.username || 'Öğrenci'} → ${c ? label(c) : 'sınıf'} taşındı.${note}`);
  }

  function onKey(e) { if (e.key === 'Escape') close(); }
  function close() { veil?.remove(); veil = null; doc.removeEventListener('keydown', onKey); }

  async function open() {
    if (veil) return;
    if (!doc.getElementById('dmc-css')) { const st = doc.createElement('style'); st.id = 'dmc-css'; st.textContent = CSS; doc.head.appendChild(st); }
    veil = doc.createElement('div'); veil.className = 'dmc-veil';
    veil.innerHTML = '<div class="dmc-sheet" role="dialog" aria-modal="true" aria-label="Sınıflarım"><div class="dmc-hero"><button class="dmc-x" data-close aria-label="Kapat">✕</button><h2>🏫 Sınıflarım</h2><p>Yükleniyor…</p></div></div>';
    veil.addEventListener('click', onClick); veil.addEventListener('change', onChange); doc.addEventListener('keydown', onKey);
    doc.body.appendChild(veil);
    try { state = await call({ action: 'list' }); openId = null; render(); }
    catch (e) { if (veil) veil.querySelector('.dmc-hero p').textContent = e.message; }
  }

  function addTile() {
    const tiles = doc.querySelector('#tpDashboard .tp-real-tools');
    if (!tiles || tiles.querySelector('[data-dmc]')) return;
    const b = doc.createElement('button'); b.type = 'button'; b.dataset.dmc = '1';
    b.innerHTML = '<span aria-hidden="true">🏫</span><strong>Sınıflarım</strong><small>Sınıf kodları ve öğrenci taşıma</small>';
    b.addEventListener('click', open);
    tiles.prepend(b);
  }
  new MutationObserver(addTile).observe(doc.documentElement, { childList: true, subtree: true });
  window.dmTeacherClassesOpen = open;
})();
