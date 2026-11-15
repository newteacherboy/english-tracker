(() => {
  "use strict";
  const END = Date.parse("2026-12-11T00:00:00+03:00");
  const endpoint =
    "https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/teacher-campaign-preview";
  const nativeFetch = window.fetch.bind(window),
    PREVIEW = true;
  let cache = null,
    cacheToken = "",
    cacheAt = 0,
    inflight = null,
    shade = null,
    clock = null,
    serverOffset = 0,
    noticeSession = "",
    joinBusy = false,
    priorFocus = null,
    authorizedToken = "",
    previewView = "teacher",
    probeToken = "",
    probeBusy = false;
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function teacherState() {
    try {
      return JSON.parse(sessionStorage.getItem("dm_tp_session") || "null");
    } catch {
      return null;
    }
  }
  function token() {
    return (
      teacherState()?.teacherToken ||
      sessionStorage.getItem("ing_ogr_token") ||
      ""
    );
  }
  function localAdminHint() {
    return (
      sessionStorage.getItem("ing_ogr_yonetici") === "1" ||
      !!window.dmTeacherPortalMode
    );
  }
  async function api(islem, data = {}) {
    if (islem !== "campaignStatus")
      throw Error("Önizlemede gerçek kayıt ve ödül işlemleri kapalı.");
    const t = token();
    if (!t) throw Error("Öğrenci hesabınla giriş yap veya ücretsiz üye ol.");
    const ctl = new AbortController(),
      timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await nativeFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "status", view: previewView, t }),
        signal: ctl.signal,
        cache: "no-store",
      });
      const d = await r.json();
      if (!r.ok || d.ok === false) {
        const e = Error(d.mesaj || "Yarışma bilgileri alınamadı.");
        e.code = d.code;
        throw e;
      }
      return d;
    } finally {
      clearTimeout(timer);
    }
  }
  async function status(force = false) {
    const t = token();
    if (!force && cache && cacheToken === t && Date.now() - cacheAt < 60000)
      return cache;
    if (inflight?.token === t) return inflight.promise;
    const promise = api("campaignStatus")
      .then((d) => {
        if (t === token()) {
          if (d.preview !== true) throw Error("Önizleme doğrulanamadı.");
          authorizedToken = t;
          cache = d;
          cacheToken = t;
          cacheAt = Date.now();
          serverOffset = Date.parse(d.serverNow) - Date.now();
        }
        return d;
      })
      .finally(() => {
        if (inflight?.promise === promise) inflight = null;
      });
    inflight = { token: t, promise };
    return promise;
  }
  function close() {
    clearInterval(clock);
    clock = null;
    shade?.remove();
    shade = null;
    priorFocus?.focus?.({ preventScroll: true });
  }
  function shell() {
    close();
    priorFocus = document.activeElement;
    shade = document.createElement("div");
    shade.className = "zirve-shade";
    shade.innerHTML =
      '<section class="zirve-panel" role="dialog" aria-modal="true" aria-label="Öğretmenimle Zirveye"><button class="zirve-close" type="button" aria-label="Kapat">×</button><div data-content></div></section>';
    const banner = document.createElement("div");
    banner.className = "zirve-preview-banner";
    banner.textContent =
      "YÖNETİCİ ÖNİZLEMESİ · Tüm puanlar ve katılımcılar örnektir. Kampanya diğer hesaplara kapalıdır. Gerçek katılım, hak tüketimi ve ödül dağıtımı yapılmaz.";
    const tools = document.createElement("div");
    tools.className = "zirve-actions zirve-preview-tools";
    tools.innerHTML =
      '<button type="button" data-pv="teacher">Öğretmen ekranı</button><button type="button" data-pv="student">Öğrenci ekranı</button><button type="button" data-pv="notice">Duyuru</button><button type="button" data-pv="results">Örnek sonuçlar</button>';
    const panel = shade.querySelector(".zirve-panel");
    panel.insertBefore(banner, panel.querySelector("[data-content]"));
    panel.insertBefore(tools, panel.querySelector("[data-content]"));
    tools.addEventListener("click", (e) => {
      const action = e.target.closest("[data-pv]")?.dataset.pv;
      if (!action) return;
      cache = null;
      previewView = action === "notice" ? "teacher" : action;
      if (action === "notice") {
        noticeSession = "";
        void announce();
      } else void open();
    });
    document.body.append(shade);
    shade.querySelector(".zirve-close").onclick = close;
    shade.addEventListener("click", (e) => {
      if (e.target === shade) close();
    });
    shade.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
      if (e.key === "Tab") {
        const focus = [
            ...shade.querySelectorAll(
              "button:not(:disabled),input,a[href],summary",
            ),
          ].filter((x) => x.getClientRects().length),
          a = focus[0],
          z = focus.at(-1);
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z?.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a?.focus();
        }
      }
    });
    shade.querySelector(".zirve-close").focus();
    return shade.querySelector("[data-content]");
  }
  function hero() {
    return '<header class="zirve-hero"><small>20 KASIM–10 ARALIK 2026 · ÖĞRETMENLER GÜNÜ</small><h2>🏆 ÖĞRETMENİMLE<br>ZİRVEYE!</h2><p>24 Kasım Öğretmenler Gününe Özel Büyük Yarışma!</p><div class="zirve-art"><span aria-hidden="true">🏆</span><img src="daily-gift-assets/papi-gift-3d.webp" alt="Hediyesiyle 3D Papi"><span aria-hidden="true">🎁</span></div><strong class="zirve-free">KATILIM VE ÜYELİK<br>TAMAMEN ÜCRETSİZ!</strong></header>';
  }
  function announcementVisual() {
    return `
      <section class="zirve-poster" aria-labelledby="zirvePosterTitle">
        <div class="zirve-poster-hero">
          <div class="zirve-poster-brand">✦ Diji-Medu <span>English</span></div>
          <div class="zirve-poster-date">📅 20 KASIM – 10 ARALIK 2026</div>
          <div class="zirve-poster-headline">
            <span class="zirve-poster-cup" aria-hidden="true">🏆</span>
            <h2 id="zirvePosterTitle">ÖĞRETMENİMLE<br><em>ZİRVEYE!</em></h2>
          </div>
          <div class="zirve-poster-subhead">24 Kasım Öğretmenler Günü’ne özel büyük yarışma!</div>
          <div class="zirve-poster-scene" aria-hidden="true">
            <div class="zirve-poster-summit"><span>🏆</span></div>
            <span class="zirve-poster-spark a">✦</span><span class="zirve-poster-spark b">✧</span>
            <span class="zirve-poster-present left">🎁</span>
            <img src="daily-gift-assets/papi-gift-3d.webp" alt="" loading="lazy">
            <span class="zirve-poster-present right">🎁</span>
          </div>
          <p class="zirve-poster-slogan">Öğrencilerini topla, puanları kap,<br>ödülleri birlikte kazan!</p>
        </div>
        <div class="zirve-poster-lower">
          <div class="zirve-poster-steps" aria-label="Yarışmaya katılım adımları">
            <div class="zirve-poster-step"><div class="zirve-poster-step-title"><span>1</span> Davet et</div><span class="zirve-poster-step-emoji" aria-hidden="true">🔗</span><p>Özel bağlantını yeni ve mevcut öğrencilerinle paylaş.</p></div>
            <div class="zirve-poster-step"><div class="zirve-poster-step-title"><span>2</span> Puan topla</div><span class="zirve-poster-step-emoji" aria-hidden="true">🎮</span><p>Parkur, oyunlar ve öğrenme etkinlikleriyle puan kazanın.</p></div>
            <div class="zirve-poster-step"><div class="zirve-poster-step-title"><span>3</span> Zirveye çık</div><span class="zirve-poster-step-emoji" aria-hidden="true">🚩</span><p>İlk 5 öğrencinin puanıyla grubunu zirveye taşı!</p></div>
          </div>
          <strong class="zirve-poster-free">📣 KATILIM VE ÜYELİK TAMAMEN ÜCRETSİZ!</strong>
          <div class="zirve-poster-prizes" aria-label="Yarışma ödülleri">
            <div class="zirve-poster-prize"><span aria-hidden="true">🏆</span><p>Şampiyon öğretmene<strong>3 Ay</strong><b>Premium Pro</b></p></div>
            <div class="zirve-poster-prize"><span aria-hidden="true">🎁</span><p>Şampiyon grubun ilk 5 öğrencisine<strong>1’er Ay</strong><b>Premium Pro</b></p></div>
          </div>
          <p class="zirve-poster-tail">Sınıf düzeyi fark etmez; önemli olan öğretmenin davet bağlantısıyla aynı grupta yarışmak.</p>
        </div>
      </section>`;
  }
  const prizes = () =>
    '<div class="zirve-rewards"><div>🏆<strong>3 ay</strong><small>Şampiyon öğretmene<br>Premium Pro</small></div><div>🎁<strong>1’er ay</strong><small>Şampiyon grubun ilk 5 öğrencisine<br>Premium Pro</small></div></div>';
  const link = () => "https://app.dijimedu.com/ingilizce/?zirve-onizleme=1";
  function shareMarkup(d) {
    return d.teacher && d.invite
      ? '<input class="zirve-link" readonly aria-label="Öğretmeninin kampanya davet bağlantısı" value="' +
          esc(link(d)) +
          '"><div class="zirve-actions"><button type="button" data-copy>🔗 Örnek bağlantıyı kopyala</button><button type="button" data-wa>WhatsApp metnini gör</button></div>'
      : "";
  }
  function wireShare(d, container) {
    if (!d.invite) return;
    container
      .querySelector("[data-copy]")
      ?.addEventListener("click", async () => {
        const input = container.querySelector(".zirve-link");
        try {
          await navigator.clipboard.writeText(link(d));
          window.yoToast?.(
            "Örnek bağlantı kopyalandı; gerçek katılım bağlantısı değildir.",
          );
        } catch {
          input.focus();
          input.select();
          document.execCommand("copy");
        }
      });
    container.querySelector("[data-wa]")?.addEventListener("click", () => {
      let note = container.querySelector(".zirve-preview-share");
      if (!note) {
        note = document.createElement("p");
        note.className = "zirve-preview-share";
        container
          .querySelector("[data-wa]")
          .closest(".zirve-actions")
          .after(note);
      }
      note.textContent =
        "Paylaşım metni önizlemesi:\n🏆 Öğretmenimle Zirveye! Katılım ve üyelik tamamen ücretsiz. Kelime Golü ve Candy Papiş her gün 5’er kez ücretsiz! 20 Kasım–10 Aralık 2026.\n[Burada öğretmenin gerçek kampanya bağlantısı bulunacak.]\n\nÖnizlemede davet gönderilmez.";
    });
  }

  function countdown(d) {
    const paint = () => {
      if (!shade) return;
      const now = Date.now() + serverOffset,
        remaining = Math.max(0, Date.parse(d.endsAt) - now),
        before = now < Date.parse(d.startsAt),
        target = before ? Date.parse(d.startsAt) - now : remaining;
      const el = shade.querySelector("[data-countdown]");
      if (el)
        el.textContent =
          remaining <= 0
            ? "Yarışma tamamlandı · Sonuçlar 11 Aralık 2026"
            : (before ? "Başlamasına: " : "Bitmesine: ") +
              Math.floor(target / 86400000) +
              " gün " +
              (Math.floor(target / 3600000) % 24) +
              " sa " +
              (Math.floor(target / 60000) % 60) +
              " dk";
      if (!remaining) {
        clearInterval(clock);
        if (shade.dataset.announcement === "true") close();
      }
    };
    clearInterval(clock);
    paint();
    if (shade) clock = setInterval(paint, 30000);
  }
  function rules() {
    return (
      '<details class="zirve-rules"><summary>Yarışma kuralları ve KP tablosu</summary><p>20 Kasım 00.00–10 Aralık 23.59, Türkiye saati. Katılım yalnızca öğretmen davet bağlantısıyla gerçekleşir. Her öğrenci bir grupta yarışır; mevcut sınıfı ve öğretmen bağlantısı korunur. Katılımda öğrenci sınırı yoktur.</p><table><thead><tr><th>Başarıyla tamamlanan etkinlik</th><th>KP</th></tr></thead><tbody>' +
      [
        ["Okul Yolum / Öğrenme Yolu durağı", 100],
        ["Günün Planı", 60],
        ["Kelime Golü / Candy Papiş", 40],
        ["Diğer tek kişilik oyunlar", 30],
        ["Konu oyunları", 25],
        ["Diyalog / Hikâye", 40],
        ["Papi ile canlı sohbet", 50],
      ]
        .map(([n, p]) => "<tr><td>" + n + "</td><td>" + p + "</td></tr>")
        .join("") +
      "</tbody></table><p>Parkurda her durak yalnızca ilk tamamlamada puan verir. Katılımdan önce başlayan etkinlikler, yarım bırakılan oyunlar ve yinelenen sonuçlar KP kazandırmaz.</p><p>Günlük KP sınırları: Kelime Golü ve Candy Papiş için ayrı ayrı ilk 5 kampanya oyunu; diğer tek kişilik oyunlarda toplam 3, konu oyunlarında toplam 3, diyalog/hikâyede toplam 3 başarılı tamamlama; Günün Planı ve canlı sohbette 1 tamamlama. Ücretli ek haklar bu sınırları artırmaz. Sohbetin normal erişim kuralları geçerlidir.</p><p>İki özel oyun hakkı her gün 00.00’da yenilenir, devretmez ve normal haklardan ayrıdır. Kampanya oyunları enerji de harcamaz. Teknik başlangıç hatasında aynı oyun yeniden denenir; ikinci hak düşmez.</p><p>Grup puanı ilk 5 öğrencinin KP toplamıdır. Ödül sıralaması için en az 5 öğrencinin KP kazanmış olması gerekir. Eşitlikte aktif öğrenci sayısı, sonra puana erken ulaşma zamanı belirleyicidir.</p><p>Şampiyon öğretmene 3 ay; grubunun ilk 5 öğrencisine 1’er ay Premium Pro. Sonuçlar 11 Aralık’ta yönetici kontrolüne sunulur. Hediyeler yönetici onayıyla verilir, ücretli abonelik başlatmaz.</p></details>"
    );
  }
  async function announce() {
    try {
      const t = token(),
        d = await status();
      if (t !== token() || !d.teacher || !d.active || noticeSession === t)
        return;
      noticeSession = t;
      const body = shell();
      shade.dataset.announcement = "true";
      body.innerHTML =
        announcementVisual() +
        shareMarkup(d) +
        '<div class="zirve-actions"><button type="button" data-board>🏆 Yarışma sıralamasına geç</button></div>' +
        '<span class="zirve-clock" data-countdown></span><p class="zirve-footer">Öğrencilerini Davet Et, Birlikte Zirveye Çık!</p>';
      wireShare(d, body);
      body.querySelector("[data-board]").onclick = () => open();
      countdown(d);
    } catch (e) {
      console.warn("[Yarışma duyurusu]", e.message);
    }
  }
  async function open() {
    const t = token();
    let d;
    try {
      d = await status(true);
    } catch {
      authorizedToken = "";
      cache = null;
      close();
      removeButtons();
      return;
    }
    if (t !== token() || d.preview !== true) return;
    const body = shell();
    render(body, d);
    if (previewView === "results") {
      const results = document.createElement("section");
      results.className = "zirve-preview-result";
      results.innerHTML =
        "<h3>Örnek ödül kontrol ekranı</h3>" +
        (d.rewards || [])
          .map(
            (r) =>
              '<div class="zirve-row"><span>' +
              esc(r.alias) +
              "</span><b>" +
              r.months +
              " ay Premium Pro</b></div>",
          )
          .join("") +
        '<p class="zirve-note">Gerçek kampanyada yönetici onayı sonrası 6 kişiye hediye tanımlanır. Bu önizlemede dağıtım düğmesi ve abonelik işlemi yoktur.</p>';
      body.prepend(results);
    }
  }
  function render(body, d) {
    const stat = (v, n) =>
      '<div class="zirve-stat"><b>' +
      esc(v ?? "—") +
      "</b><span>" +
      n +
      "</span></div>";
    body.innerHTML =
      hero() +
      '<div class="zirve-stats">' +
      (d.teacher
        ? stat(d.participants, "Katılan öğrenci")
        : stat(d.kp, "Kampanya Puanım · KP")) +
      stat(d.groupScore, "İlk 5 öğrencinin toplam KP’si") +
      stat(d.groupRank, "Genel grup sıralaması") +
      (d.teacher
        ? stat(
            (d.board || []).find((x) => x.self)?.active || 0,
            "Aktif öğrenci · En az 5 gerekli",
          )
        : stat(d.studentRank, "Grubumdaki sıram")) +
      "</div>" +
      (d.teacher
        ? shareMarkup(d)
        : !d.joined
          ? '<p class="zirve-note">Yarışmaya katılmak için öğretmeninin özel davet bağlantısını aç. Üyeliğin ve ilerlemen korunur.</p>'
          : '<div class="zirve-stats">' +
            stat(
              d.remaining?.["word-goal"] || 0,
              "Kelime Golü · Kalan kampanya hakkı",
            ) +
            stat(
              d.remaining?.["word-match"] || 0,
              "Candy Papiş · Kalan kampanya hakkı",
            ) +
            '</div><div class="zirve-actions"><button data-goal type="button">⚽ Kelime Golü</button><button data-candy type="button">🍬 Candy Papiş</button></div>') +
      '<span class="zirve-clock" data-countdown></span><section class="zirve-section"><h3>🏅 Grubun ilk 5 öğrencisi</h3>' +
      ((d.top5 || [])
        .map(
          (s, i) =>
            '<div class="zirve-row ' +
            (s.self ? "is-self" : "") +
            '"><span>' +
            ["🥇", "🥈", "🥉", "4.", "5."][i] +
            " " +
            esc(s.alias) +
            (s.self ? " · Sen" : "") +
            "</span><b>" +
            s.kp +
            " KP</b></div>",
        )
        .join("") || '<p class="zirve-note">Henüz katılan öğrenci yok.</p>') +
      '</section><section class="zirve-section"><h3>🏆 Öğretmen grupları sıralaması</h3><p class="zirve-note">En az 5 aktif öğrencisi bulunan gruplar ödül sıralamasına alınır.</p><div class="zirve-board">' +
      ((d.board || [])
        .map(
          (s) =>
            '<div class="zirve-row ' +
            (s.self ? "is-self" : "") +
            '"><span><strong>' +
            s.rank +
            ".</strong> " +
            esc(s.self ? "Bizim grubumuz" : s.label) +
            "<br><small>" +
            s.active +
            " aktif öğrenci" +
            (s.eligible ? "" : " · Ödül sıralaması için 5 gerekli") +
            "</small></span><b>" +
            s.score +
            " KP</b></div>",
        )
        .join("") || '<p class="zirve-note">İlk yarışmacılar bekleniyor.</p>') +
      "</div></section>" +
      prizes() +
      rules() +
      '<div class="zirve-actions"><button data-refresh type="button">Bilgileri yenile</button></div><p class="zirve-status" role="status"></p>' +
      (d.isAdmin
        ? '<div class="zirve-actions"><button data-preview-unused-review type="button">Yönetici: Sonuçları incele</button></div><div data-admin></div>'
        : "");
    wireShare(d, body);
    body.querySelector("[data-refresh]").onclick = open;
    for (const key of ["goal", "candy"])
      body
        .querySelector("[data-" + key + "]")
        ?.addEventListener("click", () => {
          body.querySelector(".zirve-status").textContent =
            "Önizleme: Bu oyunda öğrenciye günde 5 ücretsiz kampanya hakkı gösterilir. Gerçek oyun başlatılmadı; hiçbir hak tüketilmedi.";
          body
            .querySelector(".zirve-status")
            .scrollIntoView({ block: "nearest" });
        });
    countdown(d);
  }
  function removeButtons() {
    document
      .querySelectorAll("[data-zirve-preview-open]")
      .forEach((b) => b.remove());
  }
  function install() {
    if (!authorizedToken || authorizedToken !== token()) {
      if (authorizedToken && authorizedToken !== token()) {
        authorizedToken = "";
        cache = null;
        close();
      }
      removeButtons();
      return;
    }
    for (const selector of [
      "#tpDashboard .tp-dash-main",
      "#tpTeacherHome .tp-home-inner",
      "#ogretmenMenuModal .ogretmen-menu-content",
      "#ogretmenMenuModal .rubric-content",
      "#tab-profile-menu",
    ]) {
      const parent = document.querySelector(selector);
      if (!parent || parent.querySelector("[data-zirve-preview-open]"))
        continue;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "zirve-launch";
      b.dataset.zirvePreviewOpen = "";
      b.textContent = "🏆 24 Kasım Kampanya Önizlemesi";
      b.onclick = () => {
        previewView = "teacher";
        cache = null;
        void open();
      };
      parent.prepend(b);
    }
  }
  async function check() {
    const t = token();
    if (!t || !localAdminHint()) {
      if (authorizedToken && authorizedToken !== t) {
        authorizedToken = "";
        close();
        removeButtons();
      }
      return;
    }
    if (probeBusy || probeToken === t) return;
    probeBusy = true;
    probeToken = t;
    try {
      const d = await status();
      if (t !== token() || d.preview !== true) return;
      install();
      await announce();
    } catch {
      authorizedToken = "";
      removeButtons();
    } finally {
      probeBusy = false;
    }
  }
  let frame = 0;
  const observer = new MutationObserver(() => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      install();
      if (!authorizedToken && localAdminHint()) void check();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const original = window.ogretmenPaneliAc;
  if (typeof original === "function")
    window.ogretmenPaneliAc = function () {
      const r = original.apply(this, arguments);
      void check();
      return r;
    };
  document.addEventListener("dm:login", () => {
    authorizedToken = "";
    probeToken = "";
    cache = null;
    noticeSession = "";
    close();
    removeButtons();
    void check();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      install();
      void check();
    }
  });
  window.addEventListener("pagehide", () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    clearInterval(clock);
  });
  window.dmTeacherCampaignPreview = {
    open: () => {
      previewView = "teacher";
      return open();
    },
  };
  void check();
})();
