/* One theme attribute, one boundary timer. No DOM rebuilding or observers. */
(function () {
  'use strict';
  if (window.dmDayNightTheme) return;
  const root = document.documentElement;
  let timer;
  function themeFor(date) {
    const hour = date.getHours();
    return hour >= 7 && hour < 19 ? 'day' : 'night';
  }
  function refresh() {
    clearTimeout(timer);
    const now = new Date();
    const theme = themeFor(now);
    root.setAttribute('data-dm-theme', theme);
    root.style.colorScheme = theme === 'night' ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'night' ? '#063543' : '#f2fbfa';
    if (document.hidden) return;
    const boundary = new Date(now);
    boundary.setHours(now.getHours() < 7 ? 7 : now.getHours() < 19 ? 19 : 31, 0, 0, 0);
    timer = setTimeout(refresh, Math.max(1000, boundary.getTime() - now.getTime() + 50));
  }
  window.dmDayNightTheme = { refresh, themeFor };
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  window.addEventListener('pagehide', function () { clearTimeout(timer); });
  refresh();
})();
