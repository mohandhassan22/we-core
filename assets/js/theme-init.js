/* WE-Core theme: light / dark with a floating toggle.
   Light is the default; dark is optional and the choice is remembered. */
(function () {
  var KEY = 'we-theme';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  var CANVAS = { dark: '#0D0A1C', light: '#F6F3FF' };

  function stored() {
    try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null; } catch (e) { return null; }
  }
  function system() { return mq && mq.matches ? 'light' : 'dark'; }
  function current() { return stored() || 'light'; }

  function paintMeta(theme) {
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', CANVAS[theme]);
  }
  function label(theme) {
    var en = /^en/i.test(root.lang || '');
    if (theme === 'light') return en ? 'Switch to dark mode' : 'التبديل إلى الوضع الداكن';
    return en ? 'Switch to light mode' : 'التبديل إلى الوضع الفاتح';
  }
  function syncButton(theme) {
    var b = document.querySelector('.cv-theme');
    if (!b) return;
    var l = label(theme);
    b.setAttribute('aria-label', l);
    b.setAttribute('title', l);
    b.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  }
  function apply(theme, announce) {
    if (root.getAttribute('data-theme') !== theme) root.setAttribute('data-theme', theme);
    paintMeta(theme);
    syncButton(theme);
    if (announce) {
      try { window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } })); } catch (e) {}
    }
  }

  // set before first paint
  apply(current(), false);

  window.addEventListener('storage', function (e) {
    if (e.key === KEY || e.key === null) apply(current(), true);
  });

  function init() {
    paintMeta(current());
    try { if (window.top !== window.self) return; } catch (e) { return; }
    if (document.querySelector('.cv-theme')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cv-theme';
    b.innerHTML =
      '<svg class="cv-ico-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>' +
      '<svg class="cv-ico-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    b.addEventListener('click', function () {
      var next = current() === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(KEY, next); } catch (e) {}
      apply(next, true);
    });
    document.body.appendChild(b);
    syncButton(current());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
