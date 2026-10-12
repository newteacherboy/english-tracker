/* The approved daytime design stays active at every hour. No timers. */
(function () {
  'use strict';
  if (window.dmDayNightTheme) return;
  function themeFor() { return 'day'; }
  function refresh() {
    const root = document.documentElement;
    root.setAttribute('data-dm-theme', 'day');
    root.style.colorScheme = 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = '#f2fbfa';
  }
  window.dmDayNightTheme = { refresh, themeFor };
  window.addEventListener('pageshow', refresh);
  refresh();
})();
