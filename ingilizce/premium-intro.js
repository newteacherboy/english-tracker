/* Premium oyunların ortak, sade giriş ekranı.
   Her oyun kendi görsel kartını, rengini ve bilgilerini verir; düzen herkes için aynıdır. */
(() => {
  'use strict';
  if (window.dmPremiumIntro) return;

  const CSS = 'premium-intro.css?v=20261111-1';
  function css() {
    if (document.getElementById('dmpiCss')) return;
    const link = document.createElement('link');
    link.id = 'dmpiCss';
    link.rel = 'stylesheet';
    link.href = CSS;
    document.head.append(link);
  }
  css();

  const ICON = {
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2.5 2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
    flask: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.5 15h9"/></svg>',
    infinity: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.3 5.5-4s3.6-4 5.5-4a4 4 0 0 1 0 8c-1.9 0-3.5-1.3-5.5-4z"/></svg>'
  };

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const withIcon = (node, icon, text) => {
    if (icon && ICON[icon]) node.insertAdjacentHTML('beforeend', ICON[icon]);
    node.append(document.createTextNode(text));
    return node;
  };

  /* Uygulamada paket ekranı açılabiliyorsa onu döndürür (Android/iOS kabuğu). */
  function plans(source = 'premium-oyunlar') {
    const billing = window.dmAndroidBilling;
    if (!billing?.available || typeof billing.open !== 'function') return null;
    return () => billing.open(source);
  }

  /*
    opts = {
      theme: 'papizzle' | 'blocks' | 'flight' | 'candy',
      image, imageAlt, imagePosition, imageFit ('cover'|'contain'),
      title, desc, done (kısa başarı etiketi),
      route: [{label, state:'done'|'current'|'locked', aria}],
      stats: [{value, label, icon}],
      rules: [{value, label, tone:'good'|'bad'|'plain'}],
      note: {text, icon:'lock'|'bolt'},
      after: Node (kartın altında ek içerik),
      actions: [{label, onClick, cost, kind:'primary'|'secondary'|'icon'|'link', icon, aria}]
    }
  */
  function build(opts) {
    const root = el('section', 'dmpi');
    root.dataset.theme = opts.theme || 'papizzle';
    root.setAttribute('aria-label', `${opts.title} giriş ekranı`);
    const scroll = el('div', 'dmpi-scroll');
    root.append(scroll);

    const hero = el('div', 'dmpi-hero');
    if (opts.heroBackground) hero.style.backgroundImage = `url("${opts.heroBackground}")`;
    if (opts.image) {
      const img = el('img');
      img.src = opts.image;
      img.alt = opts.imageAlt || '';
      img.decoding = 'async';
      if (opts.imagePosition) img.style.objectPosition = opts.imagePosition;
      if (opts.imageFit === 'contain') img.classList.add('contain');
      hero.append(img);
    }
    hero.append(withIcon(el('span', 'dmpi-badge'), 'star', 'PREMIUM'));
    scroll.append(hero);

    const head = el('div', 'dmpi-head');
    const titleRow = el('div', 'dmpi-title-row');
    titleRow.append(el('h2', 'dmpi-title', opts.title));
    if (opts.done) titleRow.append(withIcon(el('span', 'dmpi-done'), 'check', opts.done));
    head.append(titleRow);
    if (opts.desc) head.append(el('p', 'dmpi-desc', opts.desc));
    scroll.append(head);

    const card = el('div', 'dmpi-card');
    if (opts.route?.length) {
      const route = el('ol', 'dmpi-route');
      route.setAttribute('aria-label', 'Bölüm rotası');
      for (const stop of opts.route) {
        const li = el('li');
        li.dataset.state = stop.state;
        if (stop.aria) li.setAttribute('aria-label', stop.aria);
        stop.state === 'done' ? withIcon(li, 'check', stop.label) : (li.textContent = stop.label);
        route.append(li);
      }
      card.append(route);
    }
    if (opts.stats?.length) {
      const stats = el('div', 'dmpi-stats');
      for (const stat of opts.stats) {
        const box = el('div', 'dmpi-stat');
        box.append(withIcon(el('b'), stat.icon, String(stat.value)), el('small', '', stat.label));
        stats.append(box);
      }
      card.append(stats);
    }
    if (opts.rules?.length) {
      const rules = el('div', 'dmpi-rules');
      for (const rule of opts.rules) {
        const chip = el('div', 'dmpi-rule');
        chip.dataset.tone = rule.tone || 'plain';
        chip.append(el('b', '', rule.value), el('small', '', rule.label));
        rules.append(chip);
      }
      card.append(rules);
    }
    if (opts.note?.text) {
      const note = el('div', 'dmpi-note');
      note.setAttribute('role', 'status');
      if (ICON[opts.note.icon || 'lock']) note.insertAdjacentHTML('beforeend', ICON[opts.note.icon || 'lock']);
      note.append(el('span', '', opts.note.text));
      card.append(note);
    }
    if (card.childElementCount) scroll.append(card);
    if (opts.after) scroll.append(opts.after);

    const actions = el('div', 'dmpi-actions');
    const buttons = (opts.actions || []).map(action => {
      const kind = action.kind || 'primary';
      const button = el('button', `dmpi-btn ${kind}`);
      button.type = 'button';
      if (kind === 'icon') {
        button.innerHTML = ICON[action.icon] || '';
        button.setAttribute('aria-label', action.aria || action.label);
        button.title = action.label;
      } else {
        button.append(document.createTextNode(action.label));
        if (action.cost) button.append(withIcon(el('span', 'dmpi-cost'), 'bolt', String(action.cost)));
      }
      button.onclick = action.onClick;
      return button;
    });
    // Simge butonu varsa ilk ana butonla aynı satırda durur.
    const icon = buttons.find(b => b.classList.contains('icon'));
    const primary = buttons.find(b => b.classList.contains('primary'));
    for (const button of buttons) {
      if (icon && button === icon) continue;
      if (icon && button === primary) {
        const row = el('div', 'dmpi-action-row');
        row.append(icon, primary);
        actions.append(row);
      } else actions.append(button);
    }
    root.append(actions);
    return root;
  }

  /* Oyun kökünün içine yerleştirir; aynı kökte eski giriş ekranı varsa kaldırır. */
  function mount(host, opts) {
    unmount(host);
    const node = build(opts);
    host.append(node);
    // Klavye/fare kullanan cihazlarda odak ana butona gelir; dokunmatik ekranda halka gösterilmez.
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches)
      requestAnimationFrame(() => (node.querySelector('.dmpi-btn.primary') || node.querySelector('.dmpi-btn'))?.focus({preventScroll: true}));
    return node;
  }
  function unmount(host) {
    host?.querySelectorAll(':scope > .dmpi').forEach(node => node.remove());
  }

  window.dmPremiumIntro = {build, mount, unmount, plans, css};
})();
