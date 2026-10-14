/* WE-Core unified back button */
(function () {
  try { if (window.top !== window.self) return; } catch (e) { return; }
  function init() {
    if (document.querySelector('.cv-back')) return;
    var s = document.currentScript || document.querySelector('script[src*="back-button.js"]');
    var base = location.origin + '/';
    if (s && s.src) base = s.src.split('assets/js/')[0];
    var root = new URL(base).pathname;
    var rel = decodeURIComponent(location.pathname.slice(root.length)).toLowerCase();
    if (rel === '' || rel === 'index.html' || rel === 'login.html') return;
    var fallback = base + 'index.html';
    if (rel.indexOf('target-manager/pages/') === 0) fallback = base + 'target-manager/index.html';
    var en = /^en/i.test(document.documentElement.lang || '');
    var a = document.createElement('a');
    a.className = 'cv-back';
    a.href = fallback;
    a.setAttribute('aria-label', en ? 'Back' : 'رجوع');
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg><span>' + (en ? 'Back' : 'رجوع') + '</span>';
    a.addEventListener('click', function (e) {
      var same = false;
      try {
        var r = new URL(document.referrer);
        same = r.origin === location.origin && !/login\.html$/i.test(r.pathname);
      } catch (_) {}
      if (same && history.length > 1) { e.preventDefault(); history.back(); }
    });
    document.body.appendChild(a);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
