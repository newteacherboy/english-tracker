/* Each visit starts in daylight; a manual choice applies across its tabs. */
(function () {
  'use strict';
  if (window.dmDayNightTheme) return;

  const root = document.documentElement;
  const learnerHintKey = 'dm-night-hint-shown';
  const teacherHintKey = 'dm-teacher-night-hint-shown';
  let theme = 'day';
  let lessonOpen = false;
  const currentTheme = () => lessonOpen ? 'day' : theme;
  const seenHints = new Set();
  let hint, anchor, anchorHost;
  try {
    for (const key of [learnerHintKey, teacherHintKey]) {
      if (window.localStorage.getItem(key) === '1') seenHints.add(key);
    }
  } catch {}

  function paintButton(button) {
    const night = currentTheme() === 'night';
    button.setAttribute('aria-pressed', String(night));
    button.disabled = lessonOpen;
    button.title = lessonOpen ? 'Ders konusu gündüz modunda' : night ? 'Gündüz moduna geç' : 'Gece moduna geç';
  }

  function refresh() {
    const activeTheme = currentTheme();
    root.setAttribute('data-dm-theme', activeTheme);
    root.style.colorScheme = activeTheme === 'night' ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = activeTheme === 'night' ? '#132447' : '#e3f3ff';
    document.querySelectorAll('.dm-theme-toggle').forEach(paintButton);
  }

  function closeHint() {
    hint?.remove();
    hint = anchor = anchorHost = null;
  }

  function toggle() {
    if (lessonOpen) return;
    theme = theme === 'day' ? 'night' : 'day';
    closeHint();
    refresh();
  }

  function reset() {
    theme = 'day';
    closeHint();
    refresh();
  }

  function visibleBox(button) {
    const box = button.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    return box.width && box.height && button.contains(document.elementFromPoint(x, y)) ? box : null;
  }

  function positionHint(box) {
    const width = document.documentElement.clientWidth;
    const left = Math.max(8, Math.min(box.right - hint.offsetWidth, width - hint.offsetWidth - 8));
    const above = box.bottom + hint.offsetHeight + 16 > document.documentElement.clientHeight;
    hint.classList.toggle('dm-night-hint-above', above);
    hint.style.left = left + 'px';
    hint.style.top = (above ? box.top - hint.offsetHeight - 11 : box.bottom + 11) + 'px';
    hint.style.setProperty('--hint-arrow', (box.left + box.width / 2 - left) + 'px');
  }

  function destination(button) {
    return button.closest('.dm-unified-wallet')?.parentElement || button.parentElement;
  }

  function updateHint() {
    if (hint) {
      const box = destination(anchor) === anchorHost && visibleBox(anchor);
      if (box) positionHint(box);
      else closeHint();
      return;
    }
    const teacher = !!window.dmTeacherPortalMode;
    const hintKey = teacher ? teacherHintKey : learnerHintKey;
    if (lessonOpen || seenHints.has(hintKey) || theme === 'night' || document.hidden ||
        new Date().getHours() < (teacher ? 21 : 20)) return;
    for (const button of document.querySelectorAll('.dm-theme-toggle')) {
      const box = visibleBox(button);
      if (!box) continue;
      anchor = button;
      anchorHost = destination(button);
      hint = document.createElement('aside');
      hint.className = 'dm-night-hint';
      hint.innerHTML = '<p role="status">Gece modunu açmak ister misin?</p><div><button type="button" data-night-enable>Gece modunu aç</button><button type="button" data-night-dismiss>Şimdi değil</button></div>';
      if (teacher) hint.querySelector('p').textContent = 'Gece moduna geçmek ister misiniz?';
      hint.querySelector('[data-night-enable]').addEventListener('click', () => { button.click(); button.focus(); });
      hint.querySelector('[data-night-dismiss]').addEventListener('click', () => { closeHint(); button.focus(); });
      document.body.append(hint);
      positionHint(box);
      seenHints.add(hintKey);
      try { window.localStorage.setItem(hintKey, '1'); } catch {}
      break;
    }
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

  function watchLessonView() {
    const study = document.getElementById('tab-derscalis');
    const detail = document.getElementById('dcScreenDetail');
    if (!study || !detail) return;

    const sync = () => {
      const open = study.classList.contains('active') && detail.classList.contains('active');
      if (open === lessonOpen) return;
      lessonOpen = open;
      if (open) closeHint();
      refresh();
    };
    const observer = new MutationObserver(sync);
    for (const element of [study, detail]) {
      observer.observe(element, { attributes: true, attributeFilter: ['class'] });
    }
    sync();
  }

  window.dmDayNightTheme = { refresh, themeFor: currentTheme, createButton, updateHint };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchLessonView, { once: true });
  } else {
    watchLessonView();
  }
  window.addEventListener('pageshow', event => event.persisted ? reset() : refresh());
  document.addEventListener('dm:login', event => {
    if (!event?.detail?.teacherParticipantChanged) reset();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && hint) closeHint();
  });
  window.addEventListener('storage', event => {
    if ([learnerHintKey, teacherHintKey].includes(event.key) && event.newValue === '1') seenHints.add(event.key);
  });
  refresh();
})();
