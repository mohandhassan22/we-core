/* WE-Core video intro
 * Plays assets/video/we-core-intro.mp4 full-screen before ANY platform video.
 *
 *   await WEIntro.play();                 // overlay intro, resolves when finished/skipped
 *   WEIntro.gateHtml(playerHtml)          // returns a click-to-play poster; on click the
 *                                         // intro plays, then playerHtml replaces the poster
 */
(function () {
  'use strict';
  if (window.WEIntro) return;

  var SRC = '/assets/video/we-core-intro.mp4';
  var POSTER = '/assets/video/we-core-intro-poster.jpg';
  var SKIP_AFTER_MS = 3000;   // "تخطي" button appears after this delay
  var running = null;

  // base path so it also works for pages in sub-folders / non-root hosting
  (function resolveBase() {
    try {
      var s = document.currentScript && document.currentScript.src;
      if (s) {
        var base = s.replace(/assets\/js\/intro\.js.*$/, '');
        SRC = base + 'assets/video/we-core-intro.mp4';
        POSTER = base + 'assets/video/we-core-intro-poster.jpg';
      }
    } catch (_) {}
  })();

  var css = '' +
    '.we-intro{position:fixed;inset:0;z-index:2147483000;background:#000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s}' +
    '.we-intro.on{opacity:1}' +
    '.we-intro video{width:100%;height:100%;object-fit:contain;background:#000}' +
    '.we-intro-skip{position:absolute;bottom:24px;inset-inline-end:24px;background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:9px 22px;font:700 14px/1 Cairo,Tahoma,sans-serif;cursor:pointer;backdrop-filter:blur(6px);display:none}' +
    '.we-intro-skip.show{display:block}' +
    '.we-intro-tap{position:absolute;width:84px;height:84px;border-radius:50%;border:0;background:#7b3fe4;color:#fff;font-size:34px;cursor:pointer;display:none;box-shadow:0 8px 30px rgba(123,63,228,.5)}' +
    '.we-intro-tap.show{display:block}' +
    '.we-gate{position:relative;width:100%;aspect-ratio:16/9;border-radius:12px;overflow:hidden;cursor:pointer;background:#111 center/cover no-repeat;display:flex;align-items:center;justify-content:center;border:0;padding:0}' +
    '.we-gate::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(61,26,110,.55),rgba(0,0,0,.45))}' +
    '.we-gate span{position:relative;width:68px;height:68px;border-radius:50%;background:#7b3fe4;color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 22px rgba(123,63,228,.55);transition:transform .2s}' +
    '.we-gate:hover span{transform:scale(1.1)}';
  var st = document.createElement('style');
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  // warm the HTTP cache so the intro starts instantly
  function preload() {
    try {
      var v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.src = SRC;
    } catch (_) {}
  }
  if (document.readyState === 'complete') setTimeout(preload, 500);
  else window.addEventListener('load', function () { setTimeout(preload, 500); });

  function play() {
    if (running) return running;
    running = new Promise(function (resolve) {
      var done = false;
      var overlay = document.createElement('div');
      overlay.className = 'we-intro';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', 'WE-Core intro');

      var v = document.createElement('video');
      v.src = SRC;
      v.poster = POSTER;
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.preload = 'auto';

      var skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'we-intro-skip';
      skip.textContent = 'تخطي ⏭';

      var tap = document.createElement('button');
      tap.type = 'button';
      tap.className = 'we-intro-tap';
      tap.setAttribute('aria-label', 'تشغيل');
      tap.textContent = '▶';

      overlay.appendChild(v);
      overlay.appendChild(tap);
      overlay.appendChild(skip);

      var prevOverflow = document.body.style.overflow;
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(skipTimer);
        document.removeEventListener('keydown', onKey, true);
        overlay.classList.remove('on');
        setTimeout(function () {
          try { v.pause(); v.removeAttribute('src'); v.load(); } catch (_) {}
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          document.body.style.overflow = prevOverflow;
          running = null;
          resolve();
        }, 250);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); finish(); }
      }

      var skipTimer = setTimeout(function () { skip.classList.add('show'); }, SKIP_AFTER_MS);
      skip.addEventListener('click', finish);
      v.addEventListener('ended', finish);
      v.addEventListener('error', finish);        // never block the real video
      document.addEventListener('keydown', onKey, true);

      tap.addEventListener('click', function () {
        tap.classList.remove('show');
        v.muted = false;
        v.play().catch(finish);
      });

      document.body.style.overflow = 'hidden';
      document.body.appendChild(overlay);
      requestAnimationFrame(function () { overlay.classList.add('on'); });

      // autoplay with sound (a click normally triggered us); fall back to muted, then to tap-to-play
      var p = v.play();
      if (p && p.catch) {
        p.catch(function () {
          v.muted = true;
          var p2 = v.play();
          if (p2 && p2.catch) p2.catch(function () { v.muted = false; tap.classList.add('show'); });
        });
      }

      // safety net: never hang longer than the intro could possibly last
      setTimeout(finish, 20000);
    });
    return running;
  }

  /* click-to-play poster for videos rendered from HTML strings */
  function gateHtml(playerHtml, label) {
    return '<button type="button" class="we-gate" data-we-gate="' + encodeURIComponent(playerHtml) +
      '" style="background-image:url(\'' + POSTER + '\')" aria-label="' + (label || 'تشغيل الفيديو') + '"><span>▶</span></button>';
  }

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-we-gate]');
    if (!el) return;
    var html = decodeURIComponent(el.getAttribute('data-we-gate'));
    play().then(function () {
      if (!el.parentNode) return;
      var tpl = document.createElement('template');
      tpl.innerHTML = html;
      el.replaceWith(tpl.content);
    });
  });

  window.WEIntro = { play: play, gateHtml: gateHtml };
})();
