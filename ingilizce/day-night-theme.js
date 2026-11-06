/* The selected appearance is shared by every destination on this device. */
(function () {
  'use strict';
  if (window.dmDayNightTheme) return;

  const root = document.documentElement;
  const storageKey = 'dm-color-theme';
  let theme = 'day';
  try {
    if (window.localStorage.getItem(storageKey) === 'night') theme = 'night';
  } catch {}

  function paintButton(button) {
    button.setAttribute('aria-pressed', String(theme === 'night'));
    button.title = theme === 'night' ? 'Gündüz moduna geç' : 'Gece moduna geç';
  }

  function refresh() {
    root.setAttribute('data-dm-theme', theme);
    root.style.colorScheme = theme === 'night' ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'night' ? '#132447' : '#e3f3ff';
    document.querySelectorAll('.dm-theme-toggle').forEach(paintButton);
  }

  function toggle() {
    theme = theme === 'day' ? 'night' : 'day';
    try { window.localStorage.setItem(storageKey, theme); } catch {}
    refresh();
  }

  function createButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dm-theme-toggle';
    button.setAttribute('aria-label', 'Gece modu');
    button.innerHTML = '<svg class="dm-theme-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/></svg><svg class="dm-theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.2A8.7 8.7 0 0 1 8.8 3.5a8.8 8.8 0 1 0 11.7 11.7Z"/></svg>';
    button.addEventListener('click', toggle);
    paintButton(button);
    return button;
  }

  window.dmDayNightTheme = { refresh, themeFor: () => theme, createButton };
  window.addEventListener('pageshow', refresh);
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    theme = event.newValue === 'night' ? 'night' : 'day';
    refresh();
  });
  refresh();
})();
