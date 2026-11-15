(() => {
  "use strict";
  const START = Date.parse("2026-11-20T00:00:00+03:00"),
    END = Date.parse("2026-12-11T00:00:00+03:00");
  const endpoint =
    typeof apiURL !== "undefined"
      ? apiURL
      : "https://nxfqlutulxqzqgwewssd.supabase.co/functions/v1/diji-api";
  const nativeFetch = window.fetch.bind(window),
    PENDING = "dm_zirve_invite_2026";
  let cache = null,
    cacheToken = "",
    cacheAt = 0,
    inflight = null,
    shade = null,
    clock = null,
    serverOffset = 0,
    noticeSession = "",
    joinBusy = false,
    priorFocus = null;
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
    return window.dmTeacherPortalMode
      ? teacherState()?.teacherToken ||
          sessionStorage.getItem("ing_ogr_token") ||
          ""
      : localStorage.getItem("ing_token") ||
          sessionStorage.getItem("ing_ogr_token") ||
          "";
  }
  function pending() {
    try {
      return localStorage.getItem(PENDING) || "";
    } catch {
      return "";
    }
  }
  function clearPending() {
    try {
      localStorage.removeItem(PENDING);
    } catch {}
  }
  const url = new URL(location.href),
    invite = url.searchParams.get("zirve");
  if (/^[a-f0-9-]{36}$/.test(invite || "")) {
    try {
      localStorage.setItem(PENDING, invite);
    } catch {}
    url.searchParams.delete("zirve");
    history.replaceState(
      history.state,
      "",
      url.pathname + url.search + url.hash,
    );
  }
  async function api(islem, data = {}) {
    const t = token();
    if (!t) throw Error("Öğrenci hesabınla giriş yap veya ücretsiz üye ol.");
    const ctl = new AbortController(),
      timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await nativeFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ islem, ...data, t }),
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
  const prizes = () =>
    '<div class="zirve-rewards"><div>🏆<strong>3 ay</strong><small>Şampiyon öğretmene<br>Premium Pro</small></div><div>🎁<strong>1’er ay</strong><small>Şampiyon grubun ilk 5 öğrencisine<br>Premium Pro</small></div></div>';
  const link = (d) =>
    "https://app.dijimedu.com/ingilizce/?zirve=" + encodeURIComponent(d.invite);
  function shareMarkup(d) {
    return d.teacher && d.invite
      ? '<input class="zirve-link" readonly aria-label="Öğretmeninin kampanya davet bağlantısı" value="' +
          esc(link(d)) +
          '"><div class="zirve-actions"><button type="button" data-copy>🔗 Bağlantıyı kopyala</button><button type="button" data-wa>WhatsApp’ta paylaş</button></div>'
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
          window.yoToast?.("Kampanya davet bağlantın kopyalandı.");
        } catch {
          input.focus();
          input.select();
          document.execCommand("copy");
        }
      });
    container.querySelector("[data-wa]")?.addEventListener("click", () => {
      const text =
        "🏆 Öğretmenimle Zirveye! Öğrencilerini Davet Et, Birlikte Oyna, Zirveye Çık! Katılım ve üyelik tamamen ücretsiz. Kelime Golü ve Candy Papiş her gün 5’er kez ücretsiz! 20 Kasım–10 Aralık 2026. " +
        link(d);
      window.open(
        "https://wa.me/?text=" + encodeURIComponent(text),
        "_blank",
        "noopener,noreferrer",
      );
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
      if (
        t !== token() ||
        !d.teacher ||
        !d.active ||
        noticeSession === t ||
        shade
      )
        return;
      noticeSession = t;
      const body = shell();
      shade.dataset.announcement = "true";
      body.innerHTML =
        hero() +
        shareMarkup(d) +
        '<div class="zirve-actions"><button type="button" data-board>🏆 Yarışma sıralamasına geç</button></div>' +
        '<div class="zirve-copy"><p><b>Sevgili öğretmenimiz,</b></p><p>24 Kasım Öğretmenler Günü’ne özel hazırladığımız yarışmada öğrencilerinizle birlikte zirveye çıkmaya hazır mısınız?</p><p>Size özel davet bağlantısını öğrencilerinizle paylaşın. Yeni veya mevcut öğrencileriniz bağlantınızdan yarışmaya katılsın.</p><p>Öğrencileriniz kampanya boyunca <b>Kelime Golü ve Candy Papiş</b> oyunlarını her gün <b>5’er kez ücretsiz</b> oynasın.</p><p>Üstelik Diji-Medu’daki öğrenme etkinlikleriyle de yarışma puanı kazansın!</p></div>' +
        prizes() +
        '<span class="zirve-clock" data-countdown></span><p class="zirve-footer">Öğrencilerini Davet Et, Birlikte Zirveye Çık!</p>';
      wireShare(d, body);
      body.querySelector("[data-board]").onclick = () => open();
      countdown(d);
    } catch (e) {
      console.warn("[Yarışma duyurusu]", e.message);
    }
  }
  async function open() {
    const body = shell(),
      t = token();
    body.innerHTML =
      hero() +
      '<p class="zirve-status" role="status">Yarışma bilgileri yükleniyor…</p>';
    try {
      const d = await status(true);
      if (!body.isConnected || t !== token()) return;
      render(body, d);
    } catch (e) {
      if (body.isConnected) {
        body.querySelector(".zirve-status").textContent = e.message;
        const retry = document.createElement("button");
        retry.className = "zirve-launch";
        retry.textContent = "Yeniden dene";
        retry.onclick = open;
        body.append(retry);
      }
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
        ? '<div class="zirve-actions"><button data-review type="button">Yönetici: Sonuçları incele</button></div><div data-admin></div>'
        : "");
    wireShare(d, body);
    body.querySelector("[data-refresh]").onclick = open;
    body.querySelector("[data-goal]")?.addEventListener("click", () => {
      close();
      window.dmPremiumSkillGames?.open("word-goal");
    });
    body.querySelector("[data-candy]")?.addEventListener("click", () => {
      close();
      window.dmPwm?.open();
    });
    body
      .querySelector("[data-review]")
      ?.addEventListener("click", async (e) => {
        e.target.disabled = true;
        const box = body.querySelector("[data-admin]");
        try {
          const r = await api("campaignReview");
          box.innerHTML =
            "<h3>Ödül dağıtımı · Yönetici kontrolü</h3>" +
            (r.rewards || [])
              .map(
                (x) =>
                  '<p class="zirve-note">' +
                  esc(x.account_role) +
                  " · " +
                  esc(x.account_id) +
                  " · " +
                  x.months +
                  " ay Premium Pro" +
                  (x.granted_at ? " · Verildi" : "") +
                  "</p>",
              )
              .join("") +
            '<div class="zirve-actions"><button data-approve type="button">Kontrol ettim, 6 ödülü dağıt</button></div>';
          box.querySelector("[data-approve]").disabled =
            (r.rewards || []).length !== 6;
          box.querySelector("[data-approve]").onclick = async (ev) => {
            ev.target.disabled = true;
            try {
              await api("campaignApprove");
              box.textContent = "Ödüller güvenle tanımlandı.";
            } catch (err) {
              box.textContent = err.message;
            }
          };
        } catch (err) {
          box.textContent = err.message;
        } finally {
          e.target.disabled = false;
        }
      });
    countdown(d);
  }
  async function joinPending() {
    if (joinBusy || !pending() || !token() || window.dmTeacherPortalMode)
      return;
    joinBusy = true;
    const t = token();
    try {
      await api("campaignJoin", { code: pending() });
      if (t !== token()) return;
      clearPending();
      cache = null;
      window.yoToast?.("Öğretmenimle Zirveye yarışmasına katıldın!");
      await open();
    } catch (e) {
      if (e.code === "already_joined" || e.code === "invite") {
        clearPending();
        window.yoToast?.(e.message);
      } else if (e.code !== "inactive") window.yoToast?.(e.message);
    } finally {
      joinBusy = false;
    }
  }
  function addButton(parent) {
    if (!parent || parent.querySelector("[data-zirve-open]")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "zirve-launch";
    b.dataset.zirveOpen = "";
    b.innerHTML =
      '🏆 <span>24 Kasım Yarışması</span> <span aria-hidden="true">›</span>';
    b.onclick = open;
    parent.prepend(b);
  }
  function install() {
    if (Date.now() > END + 32 * 86400000) return;
    for (const selector of [
      "#tpDashboard .tp-dash-main",
      "#tpTeacherHome .tp-home-inner",
      "#ogretmenMenuModal .ogretmen-menu-content",
      "#tab-aktiviteler .az-grid2x2",
      "#tab-profile-menu",
    ])
      addButton(document.querySelector(selector));
  }
  let scheduled = false,
    installFrame = 0;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    installFrame = requestAnimationFrame(() => {
      scheduled = false;
      install();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  install();
  document.addEventListener("dm:teacher-enter", () => {
    install();
    void announce();
  });
  document.addEventListener("dm:teacher-exit", () => {
    noticeSession = "";
    cache = null;
    close();
  });
  document.addEventListener("dm:login", () => {
    cache = null;
    cacheToken = "";
    noticeSession = "";
    close();
    void joinPending();
    if (window.dmTeacherPortalMode) void announce();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && pending()) void joinPending();
  });
  window.addEventListener("pagehide", (e) => {
    if (!e.persisted) {
      observer.disconnect();
      cancelAnimationFrame(installFrame);
      clearInterval(clock);
    }
  });
  window.dmTeacherCampaign = { open, announce, joinPending, install };
  void joinPending();
  if (window.dmTeacherPortalMode) void announce();
  if (pending() && !token()) {
    const body = shell();
    body.innerHTML =
      hero() +
      '<p class="zirve-copy">Öğretmeninin daveti hazır! Ücretsiz üye ol veya mevcut hesabınla giriş yap. Girişin tamamlanınca aynı hesabınla yarışmaya otomatik katılacaksın.</p><div class="zirve-actions"><button data-login type="button">Giriş yap / Ücretsiz üye ol</button></div>';
    body.querySelector("[data-login]").onclick = () => {
      close();
      document
        .getElementById("login-container")
        ?.scrollIntoView({ block: "center" });
      document.getElementById("ogrenci")?.focus();
    };
  }
})();
