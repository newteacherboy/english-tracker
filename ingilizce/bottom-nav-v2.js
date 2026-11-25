/* Presentation only. bottom-nav.js owns navigation, order and selection. */
(() => {
  'use strict';

  const glyphs = {
    'tab-duel-home': '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 17.5 21 6V3h-3L6.5 14.5M11 19l-6-6M8 16l-4 4M5 21l-2-2" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>',
    'tab-dunya': '<circle cx="4.7" cy="19" r="2.5"/><ellipse cx="9" cy="13.2" rx="2.6" ry="1.65" transform="rotate(-31 9 13.2)"/><ellipse cx="14.7" cy="11" rx="2.6" ry="1.65" transform="rotate(-31 14.7 11)"/><circle cx="19.2" cy="5" r="2.7"/>',
    'tab-aktiviteler': '<path fill-rule="evenodd" d="M7.1 5.5h9.8c2.5 0 4.2 1.3 4.8 3.7l1.1 5.5c.7 3.7-2 5.4-4.5 3.1l-2.1-2H7.8l-2.1 2c-2.5 2.3-5.2.6-4.5-3.1l1.1-5.5C3 6.8 4.6 5.5 7.1 5.5Zm.1 2.3v2H5.3v1.7h1.9v2H9v-2h1.9V9.8H9v-2H7.2Zm9.4.3a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Zm2.4 2.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"/>',
    'tab-meduakis': '<circle cx="12" cy="6.5" r="3.7"/><circle cx="4.5" cy="9" r="2.5"/><circle cx="19.5" cy="9" r="2.5"/><path d="M5.5 20v-1.5a6.5 6.5 0 1 1 13 0V20c0 .6-.5 1-1 1h-11a1 1 0 0 1-1-1ZM1 18a4.6 4.6 0 0 1 5.1-4.6A8 8 0 0 0 4 19H2a1 1 0 0 1-1-1Zm22 0a1 1 0 0 1-1 1h-2a8 8 0 0 0-2.1-5.6A4.6 4.6 0 0 1 23 18Z"/>',
    'tab-rankings': '<rect x="3" y="13.5" width="4.5" height="7" rx="1.2"/><rect x="9.7" y="8.5" width="4.5" height="12" rx="1.2"/><rect x="16.4" y="3" width="4.5" height="17.5" rx="1.2"/>',
    'tab-profile-menu': '<circle cx="12" cy="7" r="4"/><path d="M5 19c0-3.7 3.2-6.3 7-6.3s7 2.6 7 6.3c0 1.1-.8 1.8-1.9 1.8H6.9C5.8 20.8 5 20.1 5 19Z"/>'
  };

  const panelIds = ['tab-dunya', 'tab-aktiviteler', 'tab-meduakis', 'dmDuelHome', 'rtProfileBackdrop'];

  function syncSelection(nav) {
    const profile = document.getElementById('rtProfileBackdrop');
    const duel = document.getElementById('dmDuelHome');
    let target = '';

    if (profile && !profile.hidden) {
      target = 'tab-profile-menu';
    } else if (duel && !duel.hidden) {
      target = 'tab-duel-home';
    } else {
      const screen = document.querySelector('.dc-fullscreen-overlay.active:not([hidden])');
      target = screen?.id || '';
      if (target === 'tab-meduakis' && screen.querySelector('.dm-arena-ranks')) {
        target = 'tab-rankings';
      }
    }

    for (const button of nav.querySelectorAll('.bn-item[data-ekran]')) {
      button.toggleAttribute('data-menu-selected', button.dataset.ekran === target);
    }
  }

  function paint() {
    const nav = document.getElementById('bottomNavMobile');
    if (!nav || window.dmTeacherPortalMode || document.documentElement.classList.contains('dm-teacher-portal')) {
      nav?.classList.remove('dm-nv2-on');
      return;
    }

    for (const button of nav.querySelectorAll('.bn-item[data-ekran]')) {
      const target = button.dataset.ekran;
      const icon = button.querySelector('.bn-icon');
      if (!icon || !Object.hasOwn(glyphs, target)) continue;

      if (!icon.querySelector('.dm-nv2')) {
        icon.insertAdjacentHTML('beforeend', '<span class="dm-nv2" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">' + glyphs[target] + '</svg></span>');
      }
      if (target === 'tab-profile-menu') {
        const plan = String(window.dmAndroidPlan?.plan || window.dmSubscription?.plan || window.dmMembership?.plan || '').toLowerCase();
        const label = 'Profil · ' + (/premium/.test(plan) ? 'Premium Pro' : plan === 'pro' ? 'Pro' : 'Free');
        if (button.dataset.membershipLabel !== label) {
          button.dataset.membershipLabel = label;
          button.setAttribute('aria-label', label);
          button.title = label;
        }
      }
    }
    nav.classList.add('dm-nv2-on');
    syncSelection(nav);
  }

  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      paint();
    });
  }

  const tracked = new WeakSet();
  const panelObserver = new MutationObserver(schedule);

  function watchPanels() {
    for (const id of panelIds) {
      const panel = document.getElementById(id);
      if (!panel || tracked.has(panel)) continue;
      tracked.add(panel);
      panelObserver.observe(panel, { attributes: true, attributeFilter: ['class', 'hidden'] });
      if (id === 'tab-meduakis') {
        panelObserver.observe(panel.querySelector('#maEkran') || panel, { childList: true });
      }
    }
  }

  function start() {
    watchPanels();
    new MutationObserver(records => {
      const panelChanged = records.some(record => [...record.addedNodes, ...record.removedNodes]
        .some(node => panelIds.includes(node.id)));
      if (!panelChanged) return;
      watchPanels();
      schedule();
    }).observe(document.body, { childList: true });

    paint();
    const nav = document.getElementById('bottomNavMobile');
    if (nav) {
      new MutationObserver(records => {
        const navigationChanged = records.some(record =>
          [...record.addedNodes, ...record.removedNodes].some(node =>
            node.nodeType === 1 && !node.classList.contains('dm-nv2')));
        if (navigationChanged) schedule();
      }).observe(nav, { childList: true, subtree: true });
    }
    for (const event of ['dm:login', 'dm:logout', 'dm:avatar-change', 'dm:duel-home-close', 'visibilitychange']) {
      document.addEventListener(event, schedule);
    }
    window.addEventListener('dm:plan', schedule);
    window.addEventListener('pageshow', schedule);
  }

  window.dmBottomNavV2 = { paint };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
