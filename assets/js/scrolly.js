/* WE-Core Scrolly — shared scrollytelling engine (no dependencies)
 *
 *   WEScrolly.init({
 *     reveal:   [{ sel: '.video-card', type: 'up', stagger: 70 }, ...],  // auto-tag + animate on entry
 *     parallax: [{ sel: '.hero h2', speed: 0.15 }],                      // translateY by scroll
 *     sticky:   ['.folder-title'],                                       // sticky chapter headers
 *     counters: ['#totalVideos'],                                        // count up when value is set
 *     countOnView: ['.pnum'],                                            // count up formatted numbers on entry
 *     steps:    ['.how-step'],                                           // dim/highlight by viewport center
 *     video:    ['.video-wrap'],                                         // video frame grows in
 *     chapters: { items: '.folder-section', title: '.folder-title span' },// dot rail
 *     progress: true, toTop: true
 *   });
 *
 * Works with content rendered later (MutationObserver). Never touches video playback
 * except pausing a native <video> that has scrolled out of view.
 */
(function () {
  'use strict';
  if (window.WEScrolly) return;

  var HAS_TRANSLATE = !!(window.CSS && CSS.supports && CSS.supports('translate', '0 1px'));
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  function qa(sel, ctx) { try { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); } catch (_) { return []; } }
  function raf(fn) { return (window.requestAnimationFrame || setTimeout)(fn); }

  function init(cfg) {
    cfg = cfg || {};
    if (reduce) { root.classList.add('sc-ready'); return; }   // CSS shows everything under reduced motion
    root.classList.add('sc-ready');

    var rules = [];
    var revealIO, stepIO, videoIO, pauseIO;

    /* ---------- reveal ---------- */
    revealIO = new IntersectionObserver(function (entries) {
      // stagger only the elements that enter the viewport together (not their index in a long list)
      var k = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        revealIO.unobserve(el);
        el.style.setProperty('--sc-d', Math.min(k, 8) * (el.__scStep == null ? 70 : el.__scStep) + 'ms');
        k++;
        el.classList.add('sc-in');
        // after the entrance finishes, hand the element back to the page's own styles (hover etc.)
        setTimeout(function () {
          el.removeAttribute('data-sc'); el.classList.remove('sc-in', 'sc-done');
          el.style.removeProperty('--sc-d');
        }, 1900);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    function tag(el, rule) {
      if (el.__sc) return;
      el.__sc = 1;
      el.__scStep = rule.stagger == null ? 70 : rule.stagger;
      el.setAttribute('data-sc', rule.type || 'up');
      revealIO.observe(el);
    }

    function scanReveal(ctx) {
      (cfg.reveal || []).forEach(function (rule) {
        var els = qa(rule.sel, ctx);
        if (ctx && ctx !== document && ctx.matches && ctx.matches(rule.sel)) els.unshift(ctx);
        els.forEach(function (el) { if (!el.__sc) tag(el, rule); });
      });
    }

    /* ---------- steps (highlight the one near viewport center) ---------- */
    if (cfg.steps && cfg.steps.length) {
      stepIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.target.classList.toggle('sc-active', e.isIntersecting); });
      }, { rootMargin: '-35% 0px -35% 0px', threshold: 0 });
    }
    function scanSteps(ctx) {
      if (!stepIO) return;
      cfg.steps.forEach(function (sel) {
        qa(sel, ctx).forEach(function (el) {
          if (el.__scs) return; el.__scs = 1;
          el.setAttribute('data-sc-step', ''); stepIO.observe(el);
        });
      });
    }

    /* ---------- video frame grows in ---------- */
    if (cfg.video && cfg.video.length) {
      videoIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('sc-in'); videoIO.unobserve(e.target); } });
      }, { threshold: 0.2 });
    }
    function scanVideo(ctx) {
      if (!videoIO) return;
      cfg.video.forEach(function (sel) {
        qa(sel, ctx).forEach(function (el) {
          if (el.__scv) return; el.__scv = 1;
          el.setAttribute('data-sc-video', ''); videoIO.observe(el);
        });
      });
    }

    /* ---------- sticky chapter headers ---------- */
    function scanSticky(ctx) {
      (cfg.sticky || []).forEach(function (sel) {
        qa(sel, ctx).forEach(function (el) { el.classList.add('sc-sticky'); });
      });
    }

    /* ---------- pause native videos that scroll out of view (never auto-plays) ---------- */
    pauseIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (!e.isIntersecting && !v.paused && !v.closest('.we-intro')) { try { v.pause(); } catch (_) {} }
      });
    }, { threshold: 0 });
    function scanVideos(ctx) {
      qa('video', ctx).forEach(function (v) {
        if (v.__scp || v.closest('.we-intro')) return; v.__scp = 1; pauseIO.observe(v);
      });
    }

    /* ---------- counters ---------- */
    function animateCount(el) {
      var target = parseInt(String(el.textContent).replace(/[^\d]/g, ''), 10);
      if (!isFinite(target) || target <= 0 || el.__scc === target) return;
      el.__scc = target;
      var start = null, dur = 900;
      function frame(t) {
        if (start === null) start = t;
        var k = Math.min(1, (t - start) / dur), eased = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(target * eased);
        if (k < 1) raf(frame); else el.textContent = target;
      }
      raf(frame);
    }
    (cfg.counters || []).forEach(function (sel) {
      qa(sel).forEach(function (el) {
        new MutationObserver(function (m, ob) {
          ob.disconnect(); animateCount(el);
          setTimeout(function () { ob.observe(el, { childList: true, characterData: true, subtree: true }); }, 1000);
        }).observe(el, { childList: true, characterData: true, subtree: true });
      });
    });

    /* ---------- count up formatted numbers when they enter the view ---------- */
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; countIO.unobserve(el);
        var original = el.textContent, n = parseInt(original.replace(/[^\d]/g, ''), 10);
        if (!isFinite(n) || n < 10 || !/^[\d,.\s]+$/.test(original)) return;
        var start = null, dur = 1300;
        function frame(t) {
          if (start === null) start = t;
          var k = Math.min(1, (t - start) / dur), eased = 1 - Math.pow(1 - k, 4);
          el.textContent = k < 1 ? Math.round(n * eased).toLocaleString('en-US') : original;
          if (k < 1) raf(frame);
        }
        raf(frame);
      });
    }, { threshold: 0.6 });
    (cfg.countOnView || []).forEach(function (sel) { qa(sel).forEach(function (el) { countIO.observe(el); }); });

    /* ---------- progress bar + back to top ---------- */
    var bar, topBtn;
    if (cfg.progress !== false) {
      var wrap = document.createElement('div'); wrap.className = 'sc-progress'; wrap.setAttribute('aria-hidden', 'true');
      bar = document.createElement('i'); wrap.appendChild(bar); document.body.appendChild(wrap);
    }
    if (cfg.toTop !== false) {
      topBtn = document.createElement('button'); topBtn.type = 'button'; topBtn.className = 'sc-top';
      topBtn.setAttribute('aria-label', 'لأعلى'); topBtn.textContent = '↑';
      topBtn.onclick = function () { window.scrollTo({ top: 0, behavior: 'smooth' }); };
      document.body.appendChild(topBtn);
    }

    /* ---------- chapter rail ---------- */
    var rail = null, railItems = [];
    function buildRail() {
      if (!cfg.chapters) return;
      var items = qa(cfg.chapters.items); // no visibility filter: the page may reveal its container later (auth) with no DOM change
      var sig = items.map(function (el) { return el.__scid || (el.__scid = Math.random()); }).join();
      if (rail && rail.__sig === sig) return;
      if (rail) rail.remove();
      railItems = items;
      if (items.length < 2) { rail = null; return; }
      rail = document.createElement('nav'); rail.className = 'sc-rail'; rail.setAttribute('aria-label', 'الأقسام'); rail.__sig = sig;
      items.forEach(function (el) {
        var t = cfg.chapters.title ? el.querySelector(cfg.chapters.title) : null;
        var b = document.createElement('button'); b.type = 'button';
        var s = document.createElement('span'); s.textContent = t ? t.textContent.trim() : '';
        b.appendChild(s);
        b.setAttribute('aria-label', s.textContent);
        b.onclick = function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
        rail.appendChild(b);
      });
      document.body.appendChild(rail);
    }

    /* ---------- scroll loop (single rAF-throttled handler) ---------- */
    var parallaxEls = [], ticking = false;
    (cfg.parallax || []).forEach(function (r) {
      qa(r.sel).forEach(function (el) { el.setAttribute('data-sc-parallax', r.speed || 0.15); parallaxEls.push({ el: el, speed: r.speed || 0.15, max: r.max || 80 }); });
    });

    function onScroll() {
      var y = window.pageYOffset || root.scrollTop || 0;
      var h = Math.max(1, root.scrollHeight - window.innerHeight);
      if (bar) bar.style.transform = 'scaleX(' + Math.min(1, y / h) + ')';
      if (topBtn) topBtn.classList.toggle('on', y > window.innerHeight * 0.8);
      for (var i = 0; i < parallaxEls.length; i++) {
        var p = parallaxEls[i], shift = Math.max(-p.max, Math.min(p.max, y * p.speed));
        if (HAS_TRANSLATE) p.el.style.translate = '0 ' + shift.toFixed(1) + 'px';
        else p.el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
      }
      // sticky "stuck" state
      qa('.sc-sticky').forEach(function (el) {
        var top = parseFloat(getComputedStyle(el).top) || 0;
        el.classList.toggle('sc-stuck', el.getBoundingClientRect().top <= top + 1 && y > 40);
      });
      // chapter rail
      if (rail) {
        var mid = window.innerHeight * 0.4, cur = -1;
        railItems.forEach(function (el, i) { if (el.getBoundingClientRect().top <= mid) cur = i; });
        rail.classList.toggle('on', y > 120 && cur >= 0);
        Array.prototype.forEach.call(rail.children, function (b, i) { b.classList.toggle('act', i === cur); });
      }
      ticking = false;
    }
    function request() { if (!ticking) { ticking = true; raf(onScroll); } }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });

    /* ---------- scan now + watch for late-rendered content ---------- */
    function scan(ctx) { scanReveal(ctx); scanSteps(ctx); scanVideo(ctx); scanSticky(ctx); scanVideos(ctx); }
    scan(document); buildRail(); request();

    var pending = false;
    new MutationObserver(function () {
      if (pending) return; pending = true;
      raf(function () { pending = false; scan(document); buildRail(); request(); });
    }).observe(document.body, { childList: true, subtree: true });

    // safety net: anything still hidden but already on screen after 3s gets shown
    setTimeout(function () {
      qa('[data-sc]:not(.sc-in),[data-sc-video]:not(.sc-in)').forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('sc-in');
      });
    }, 3000);
  }

  window.WEScrolly = { init: init };
})();
