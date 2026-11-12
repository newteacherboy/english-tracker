
(function () {
  const $ = id => document.getElementById(id);
  const gor = el => el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
  const yoVar = () => typeof yo !== 'undefined' && yo;
  const aktif = id => $(id) && $(id).classList.contains('active');

  // The account-selected route is changed only from profile settings.

  /* ================= 3) RUBRİK RAPORU → VELİ E-POSTASI ================= */
  async function mailGonder(telefon, metin) {
    let r = await fetch(apiURL, { method: 'POST', body: JSON.stringify({ islem: 'raporMail', telefon, metin }) });
    return r.json();
  }
  function bildir(m, renk) {
    let s = $('rubricMailSonuc');
    let btn = $('rubricKaydetBtn');
    if (!s && btn) { s = document.createElement('div'); s.id = 'rubricMailSonuc'; s.style.cssText = 'font-size:12px;font-weight:800;margin-top:6px;text-align:center'; btn.insertAdjacentElement('afterend', s); }
    if (s) { s.style.color = renk; s.innerText = m; }
  }
  let orgRubrik = window.rubrikVerileriniKaydetVeWhatsappGonder;
  if (typeof orgRubrik === 'function') window.rubrikVerileriniKaydetVeWhatsappGonder = function () {
    let orgOpen = window.open, yakalandi = false;
    window.open = function (url) {
      let u = String(url || '');
      if (/wa\.me|whatsapp/i.test(u)) {
        yakalandi = true;
        let tel = (u.match(/wa\.me\/(\d+)/) || u.match(/phone=(\d+)/) || [])[1] || '';
        let metin = ''; try { metin = new URL(u, location.href).searchParams.get('text') || ''; } catch (e) {}
        bildir('📧 Rapor veliye e-postayla gönderiliyor...', '#7c3aed');
        mailGonder(tel, metin).then(d => {
          if (d && d.ok) bildir(`✅ Rapor ${d.ogrenci} velisine e-postayla gönderildi (${d.email}).`, '#16a34a');
          else { bildir(`⚠️ ${d && d.mesaj ? d.mesaj : 'E-posta gönderilemedi'} · WhatsApp açılıyor.`, '#dc2626'); orgOpen.call(window, url, '_blank'); }
        }).catch(() => { bildir('⚠️ E-posta gönderilemedi · WhatsApp açılıyor.', '#dc2626'); orgOpen.call(window, url, '_blank'); });
        return null;
      }
      return orgOpen.apply(window, arguments);
    };
    let r;
    try { r = orgRubrik.apply(this, arguments); } finally { setTimeout(() => { window.open = orgOpen; }, 15000); }
    return r;
  };
  setInterval(() => { let b = $('rubricKaydetBtn'); if (b && !b.dataset.mail) { b.dataset.mail = '1'; b.innerText = '💾 Kaydet & Uzun Veli Raporunu E-postayla Gönder'; } }, 1500);
})();
