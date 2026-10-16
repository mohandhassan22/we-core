/* WE-Core video player — works on phone & desktop.
 * Videos (and the intro) come from the private Supabase bucket via the `video-url` edge function.
 *
 *   WEPlayer.enhance(videoEl)                 // replaces native controls with the WE player UI
 *   WEPlayer.sign('folder/file.mp4')          // -> signed https url (cached ~50 min)
 *   WEPlayer.open({ path, url, title })       // full-screen modal: intro -> video
 *   <video data-we ...>                       // auto-enhanced when added to the page
 */
(function () {
  'use strict';
  if (window.WEPlayer) return;

  var SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
  var SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
  var VIDEO_ORIGIN = 'https://fupoqueeqwqjtylqwryf.supabase.co';
  var SPEEDS = [1, 1.25, 1.5, 2, 0.75];

  function cookie(n) {
    var p = ('; ' + document.cookie).split('; ' + n + '=');
    return p.length === 2 ? p.pop().split(';').shift().replace(/"/g, '') : null;
  }

  /* ---------- signing ---------- */
  var cache = {};
  function sign(path) {
    var c = cache[path];
    if (c && c.exp > Date.now()) return Promise.resolve(c.url);
    var token = cookie('sb-access-token');
    var headers = { 'Content-Type': 'application/json', apikey: SB_KEY };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(SB_URL + '/functions/v1/video-url', {
      method: 'POST', headers: headers, body: JSON.stringify({ action: 'sign', path: path })
    }).then(function (r) {
      if (!r.ok) throw new Error('sign ' + r.status);
      return r.json();
    }).then(function (d) {
      if (!d || !d.url) throw new Error('no url');
      var u = new URL(d.url);
      if (u.protocol !== 'https:') throw new Error('bad url');
      cache[path] = { url: d.url, exp: Date.now() + 50 * 60 * 1000 };
      return d.url;
    });
  }

  /* ---------- styles ---------- */
  var css = '' +
    '.wep{position:relative;width:100%;background:#000;border-radius:12px;overflow:hidden;direction:ltr;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;font-family:Cairo,Tahoma,sans-serif;color:#fff}' +
    '.wep.wep-fs{border-radius:0}' +
    '.wep video{display:block;width:100%;height:100%;max-height:100%;background:#000;object-fit:contain;aspect-ratio:16/9}' +
    '.wep.wep-fs video{aspect-ratio:auto;height:100vh;height:100dvh}' +
    '.wep-ui{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;background:linear-gradient(to top,rgba(0,0,0,.75),transparent 38%);transition:opacity .25s}' +
    '.wep.idle.playing .wep-ui{opacity:0;cursor:none}' +
    '.wep-big{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:72px;height:72px;border-radius:50%;border:0;background:rgba(123,63,228,.92);color:#fff;font-size:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 24px rgba(123,63,228,.5);transition:opacity .2s,transform .2s}' +
    '.wep.playing .wep-big{opacity:0;pointer-events:none;transform:translate(-50%,-50%) scale(.8)}' +
    '.wep-spin{position:absolute;top:50%;left:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border:4px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:wepspin .8s linear infinite;display:none;pointer-events:none}' +
    '.wep.loading .wep-spin{display:block}' +
    '@keyframes wepspin{to{transform:rotate(360deg)}}' +
    '.wep-bar{display:flex;align-items:center;gap:6px;padding:0 10px 8px}' +
    '.wep-btn{background:none;border:0;color:#fff;min-width:40px;height:40px;font-size:18px;cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 6px;font-family:inherit;font-weight:700}' +
    '.wep-btn:hover{background:rgba(255,255,255,.14)}' +
    '.wep-time{font-size:12.5px;white-space:nowrap;opacity:.95;font-variant-numeric:tabular-nums}' +
    '.wep-sp{flex:1}' +
    '.wep-seek{position:relative;height:28px;margin:0 12px;cursor:pointer;touch-action:none;display:flex;align-items:center}' +
    '.wep-track{position:relative;width:100%;height:5px;background:rgba(255,255,255,.28);border-radius:3px;transition:height .15s}' +
    '.wep-seek:hover .wep-track,.wep-seek.drag .wep-track{height:8px}' +
    '.wep-buf,.wep-fill{position:absolute;left:0;top:0;bottom:0;border-radius:3px}' +
    '.wep-buf{background:rgba(255,255,255,.35)}' +
    '.wep-fill{background:#7b3fe4}' +
    '.wep-knob{position:absolute;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.5);transform:scale(0);transition:transform .15s}' +
    '.wep-seek:hover .wep-knob,.wep-seek.drag .wep-knob,.wep:not(.playing) .wep-knob{transform:scale(1)}' +
    '.wep-vol{width:70px;accent-color:#7b3fe4}' +
    '@media (hover:none),(max-width:640px){.wep-vol{display:none}.wep-big{width:64px;height:64px}.wep-btn{min-width:44px;height:44px}}' +
    '.wep-hint{position:absolute;top:50%;padding:8px 14px;border-radius:999px;background:rgba(0,0,0,.6);font-size:14px;font-weight:700;opacity:0;pointer-events:none;transform:translateY(-50%);transition:opacity .2s}' +
    '.wep-hint.show{opacity:1}.wep-hint.l{left:12%}.wep-hint.r{right:12%}' +
    '.wep-err{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.85);text-align:center;direction:rtl;font-size:14px}' +
    '.wep.error .wep-err{display:flex}' +
    '.wep-err button{background:#7b3fe4;color:#fff;border:0;border-radius:999px;padding:9px 22px;font:700 14px Cairo,Tahoma,sans-serif;cursor:pointer}';
  var st = document.createElement('style');
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  /* ---------- helpers ---------- */
  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = Math.floor(t % 60);
    return (h ? h + ':' + (m < 10 ? '0' : '') + m : m) + ':' + (s < 10 ? '0' : '') + s;
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function btn(label, text) {
    var b = el('button', 'wep-btn', text);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    return b;
  }
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }

  /* ---------- enhance ---------- */
  function enhance(v) {
    if (!v || v.__wep) return v && v.__wep;
    var box = el('div', 'wep');
    box.tabIndex = 0;
    v.parentNode.insertBefore(box, v);
    box.appendChild(v);
    var api = { video: v, box: box };
    v.__wep = api;

    v.controls = false;
    v.removeAttribute('controls');
    v.setAttribute('controlsList', 'nodownload noplaybackrate');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.disablePictureInPicture = true;
    v.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    var ui = el('div', 'wep-ui');
    var big = btn('تشغيل', '▶'); big.className = 'wep-big';
    var spin = el('div', 'wep-spin');
    var hintL = el('div', 'wep-hint l'), hintR = el('div', 'wep-hint r');
    var err = el('div', 'wep-err', '<div>تعذر تشغيل الفيديو</div>');
    var retry = el('button', null, 'إعادة المحاولة'); retry.type = 'button';
    err.appendChild(retry);

    var seek = el('div', 'wep-seek');
    var track = el('div', 'wep-track');
    var buf = el('div', 'wep-buf'), fill = el('div', 'wep-fill'), knob = el('div', 'wep-knob');
    track.appendChild(buf); track.appendChild(fill); track.appendChild(knob); seek.appendChild(track);
    seek.setAttribute('role', 'slider'); seek.setAttribute('aria-label', 'شريط التقدم');

    var bar = el('div', 'wep-bar');
    var bPlay = btn('تشغيل/إيقاف', '▶');
    var bBack = btn('رجوع 10 ثواني', '⟲10');
    var bFwd = btn('تقديم 10 ثواني', '10⟳');
    var time = el('span', 'wep-time', '0:00 / 0:00');
    var sp = el('span', 'wep-sp');
    var bMute = btn('كتم', '🔊');
    var vol = el('input', 'wep-vol'); vol.type = 'range'; vol.min = 0; vol.max = 1; vol.step = 0.05; vol.value = 1;
    var bSpeed = btn('السرعة', '1x');
    var bFs = btn('ملء الشاشة', '⛶');
    [bPlay, bBack, bFwd, time, sp, bMute, vol, bSpeed, bFs].forEach(function (x) { bar.appendChild(x); });

    ui.appendChild(seek); ui.appendChild(bar);
    [ui, big, spin, hintL, hintR, err].forEach(function (x) { box.appendChild(x); });

    function toggle() { if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }
    function skip(d) { if (isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + d)); flash(d); }
    var hintT;
    function flash(d) {
      var h = d < 0 ? hintL : hintR;
      h.textContent = (d < 0 ? '⟲ ' : '') + Math.abs(d) + (d < 0 ? '' : ' ⟳');
      h.classList.add('show'); clearTimeout(hintT);
      hintT = setTimeout(function () { h.classList.remove('show'); }, 600);
    }

    /* controls visibility */
    var idleT;
    function wake() {
      box.classList.remove('idle'); clearTimeout(idleT);
      if (!v.paused) idleT = setTimeout(function () { box.classList.add('idle'); }, 2800);
    }
    ['mousemove', 'touchstart', 'keydown', 'click'].forEach(function (ev) { box.addEventListener(ev, wake, { passive: true }); });

    /* tap: single = toggle (mobile: first tap only reveals controls while playing); double-tap sides = ±10s */
    var lastTap = 0, tapT;
    ui.addEventListener('click', function (e) {
      if (e.target !== ui) return;
      var now = Date.now(), r = box.getBoundingClientRect(), x = e.clientX - r.left;
      if (now - lastTap < 320 && (x < r.width * 0.33 || x > r.width * 0.67)) {
        clearTimeout(tapT); lastTap = 0; skip(x < r.width / 2 ? -10 : 10); return;
      }
      lastTap = now;
      clearTimeout(tapT);
      tapT = setTimeout(function () {
        if (box.classList.contains('idle') && !v.paused) return;
        toggle();
      }, 220);
    });
    big.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    bPlay.addEventListener('click', toggle);
    bBack.addEventListener('click', function () { skip(-10); });
    bFwd.addEventListener('click', function () { skip(10); });
    bMute.addEventListener('click', function () { v.muted = !v.muted; });
    vol.addEventListener('input', function () { v.volume = +vol.value; v.muted = v.volume === 0; });
    bSpeed.addEventListener('click', function () {
      var i = SPEEDS.indexOf(v.playbackRate); v.playbackRate = SPEEDS[(i + 1) % SPEEDS.length];
    });
    function toggleFs() {
      if (fsEl() === box) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      var rq = box.requestFullscreen || box.webkitRequestFullscreen;
      if (rq) { var p = rq.call(box); if (p && p.catch) p.catch(function () {}); }
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();   // iPhone Safari
    }
    bFs.addEventListener('click', toggleFs);
    function onFs() { box.classList.toggle('wep-fs', fsEl() === box); }
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);

    box.addEventListener('keydown', function (e) {
      if (e.target === vol) return;
      var k = e.key;
      if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
      else if (k === 'ArrowRight') { e.preventDefault(); skip(10); }
      else if (k === 'ArrowLeft') { e.preventDefault(); skip(-10); }
      else if (k === 'ArrowUp') { e.preventDefault(); v.volume = Math.min(1, v.volume + 0.1); }
      else if (k === 'ArrowDown') { e.preventDefault(); v.volume = Math.max(0, v.volume - 0.1); }
      else if (k === 'm') v.muted = !v.muted;
      else if (k === 'f') toggleFs();
    });

    /* seeking (pointer events = mouse + touch) */
    var dragging = false;
    function seekTo(e) {
      var r = track.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      if (isFinite(v.duration)) v.currentTime = p * v.duration;
      paint();
    }
    seek.addEventListener('pointerdown', function (e) { dragging = true; seek.classList.add('drag'); try { seek.setPointerCapture(e.pointerId); } catch (_) {} seekTo(e); });
    seek.addEventListener('pointermove', function (e) { if (dragging) seekTo(e); });
    function endDrag() { dragging = false; seek.classList.remove('drag'); }
    seek.addEventListener('pointerup', endDrag);
    seek.addEventListener('pointercancel', endDrag);

    /* state painting */
    function paint() {
      var d = v.duration, t = v.currentTime, p = isFinite(d) && d > 0 ? t / d * 100 : 0;
      fill.style.width = p + '%'; knob.style.left = p + '%';
      time.textContent = fmt(t) + ' / ' + fmt(d);
      seek.setAttribute('aria-valuenow', Math.round(p));
      try {
        if (v.buffered.length) {
          var end = 0;
          for (var i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= t + 0.5) end = Math.max(end, v.buffered.end(i));
          buf.style.width = (isFinite(d) && d > 0 ? end / d * 100 : 0) + '%';
        }
      } catch (_) {}
    }
    function state() {
      box.classList.toggle('playing', !v.paused && !v.ended);
      bPlay.textContent = v.paused ? '▶' : '⏸';
      big.textContent = v.ended ? '↻' : '▶';
      wake();
    }
    ['timeupdate', 'progress', 'loadedmetadata', 'durationchange', 'seeking', 'seeked'].forEach(function (ev) { v.addEventListener(ev, paint); });
    ['play', 'pause', 'ended'].forEach(function (ev) { v.addEventListener(ev, state); });
    ['waiting', 'loadstart', 'seeking'].forEach(function (ev) { v.addEventListener(ev, function () { box.classList.add('loading'); }); });
    ['canplay', 'playing', 'seeked', 'loadeddata'].forEach(function (ev) { v.addEventListener(ev, function () { box.classList.remove('loading'); box.classList.remove('error'); }); });
    v.addEventListener('volumechange', function () { bMute.textContent = v.muted || v.volume === 0 ? '🔇' : '🔊'; if (!v.muted) vol.value = v.volume; });
    v.addEventListener('ratechange', function () { bSpeed.textContent = v.playbackRate + 'x'; });

    /* signed urls expire: on error re-sign once and resume where we were */
    var retried = false;
    function recover() {
      var path = v.dataset.wePath;
      if (!path) { box.classList.add('error'); return Promise.resolve(); }
      var t = v.currentTime, wasPlaying = !v.paused;
      delete cache[path];
      box.classList.remove('error'); box.classList.add('loading');
      return sign(path).then(function (u) {
        v.src = u;
        v.addEventListener('loadedmetadata', function once() {
          v.removeEventListener('loadedmetadata', once);
          if (t) v.currentTime = t;
          if (wasPlaying) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        });
      }).catch(function () { box.classList.remove('loading'); box.classList.add('error'); });
    }
    v.addEventListener('error', function () {
      if (!v.getAttribute('src')) return;
      if (!retried) { retried = true; recover(); } else { box.classList.remove('loading'); box.classList.add('error'); }
    });
    v.addEventListener('playing', function () { retried = false; });
    retry.addEventListener('click', function () { retried = true; recover(); });

    /* load a bucket path into this player */
    api.load = function (path) {
      v.dataset.wePath = path; box.classList.add('loading'); box.classList.remove('error');
      return sign(path).then(function (u) { v.src = u; }).catch(function () { box.classList.remove('loading'); box.classList.add('error'); });
    };
    api.toggle = toggle;
    state(); paint();
    return api;
  }

  /* auto-enhance <video data-we> */
  function scan(root) {
    (root || document).querySelectorAll('video[data-we]:not([data-we-done])').forEach(function (v) {
      v.setAttribute('data-we-done', '1');
      enhance(v);
      var p = v.dataset.bucketPath;
      if (p) v.__wep.load(p);
    });
  }
  new MutationObserver(function () { scan(); }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(); }); else scan();

  /* ---------- modal: intro -> video ---------- */
  function open(opts) {
    opts = opts || {};
    var ov = el('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147482000;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px';
    var head = el('div');
    head.style.cssText = 'width:100%;max-width:1000px;display:flex;justify-content:space-between;align-items:center;color:#fff;font:700 15px Cairo,Tahoma,sans-serif;padding:0 4px 10px;direction:rtl';
    var ttl = el('span'); ttl.textContent = opts.title || '';
    var x = el('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'إغلاق');
    x.style.cssText = 'background:rgba(255,255,255,.14);border:0;color:#fff;width:40px;height:40px;border-radius:50%;font-size:18px;cursor:pointer';
    head.appendChild(ttl); head.appendChild(x);
    var wrap = el('div'); wrap.style.cssText = 'width:100%;max-width:1000px';
    var v = document.createElement('video'); v.preload = 'auto';
    wrap.appendChild(v); ov.appendChild(head); ov.appendChild(wrap);
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.appendChild(ov);
    var api = enhance(v);
    function close() {
      try { v.pause(); v.removeAttribute('src'); v.load(); } catch (_) {}
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prev;
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) { if (e.key === 'Escape' && !fsEl()) close(); }
    document.addEventListener('keydown', onKey, true);
    x.addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });

    // main video loads behind the intro, then plays when the intro ends
    var loaded = opts.path ? api.load(opts.path) : Promise.resolve(v.src = opts.url);
    var intro = window.WEIntro && opts.intro !== false ? WEIntro.play() : Promise.resolve();
    Promise.all([loaded, intro]).then(function () {
      if (!ov.parentNode) return;
      var p = v.play(); if (p && p.catch) p.catch(function () {});
      wrap.focus && api.box.focus();
    });
    return { close: close, video: v };
  }

  window.WEPlayer = { enhance: enhance, sign: sign, open: open, VIDEO_ORIGIN: VIDEO_ORIGIN };
})();
