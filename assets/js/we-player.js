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
  var SPEEDS = [0.75, 1, 1.25, 1.5, 2];

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
    '.wep{position:relative;width:100%;background:#000;overflow:hidden;direction:ltr;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;font-family:Cairo,Tahoma,sans-serif;color:#fff}' +
    '.wep.wep-fs{height:100vh;height:100dvh}' +
    '.wep-stage{position:relative;width:100%;aspect-ratio:16/9;background:#000;overflow:hidden}' +
    '.wep.wep-fs .wep-stage{flex:1;aspect-ratio:auto;min-height:0}' +
    '.wep-stage video{position:absolute;inset:0;display:block;width:100%;height:100%;background:#000;object-fit:contain}' +
    '.wep-tap{position:absolute;inset:0}' +
    '.wep-big{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity .2s,transform .2s}' +
    '.wep.playing .wep-big{opacity:0;pointer-events:none;transform:translate(-50%,-50%) scale(.8)}' +
    '.wep-spin{position:absolute;top:50%;left:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border:4px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:wepspin .8s linear infinite;display:none;pointer-events:none}' +
    '.wep.loading .wep-spin{display:block}' +
    '@keyframes wepspin{to{transform:rotate(360deg)}}' +
    '.wep-ctl{position:relative;background:#000;padding:0 14px 4px;transition:opacity .25s}' +
    '.wep.wep-fs .wep-ctl{padding-bottom:max(8px,env(safe-area-inset-bottom))}' +
    '.wep.wep-fs.idle.playing .wep-ctl{opacity:0}' +
    '.wep.wep-fs.idle.playing{cursor:none}' +
    '.wep-seek{position:relative;height:26px;cursor:pointer;touch-action:none;display:flex;align-items:center;margin-top:-13px}' +
    '.wep-track{position:relative;width:100%;height:3px;background:rgba(255,255,255,.28);border-radius:2px}' +
    '.wep-buf,.wep-fill{position:absolute;left:0;top:0;bottom:0;border-radius:2px}' +
    '.wep-buf{background:rgba(255,255,255,.35)}' +
    '.wep-fill{background:#fff}' +
    '.wep-knob{position:absolute;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.6)}' +
    '.wep-seek.drag .wep-knob{transform:scale(1.25)}' +
    '.wep-bar{display:flex;align-items:center;gap:2px;height:46px}' +
    '.wep-btn{background:none;border:0;color:#fff;min-width:44px;height:44px;cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 6px;font-family:inherit;font-weight:700;font-size:14px}' +
    '.wep-btn svg{display:block;width:24px;height:24px;fill:currentColor}' +
    '.wep-btn:hover{background:rgba(255,255,255,.14)}' +
    '.wep-time{font-size:13px;white-space:nowrap;margin:0 6px;font-variant-numeric:tabular-nums;font-weight:700}' +
    '.wep-sp{flex:1}' +
    '.wep-q{font-size:14px;font-weight:700;letter-spacing:.3px;padding:0 8px;white-space:nowrap}' +
    '.wep-vol{width:70px;accent-color:#fff}' +
    '@media (hover:none),(max-width:640px){.wep-vol{display:none}}' +
    '.wep-menu{position:absolute;right:10px;bottom:56px;background:rgba(28,30,36,.97);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:6px;display:none;min-width:150px;z-index:5;direction:rtl}' +
    '.wep-menu.open{display:block}' +
    '.wep-menu h6{margin:4px 10px 6px;font:700 12px Cairo,Tahoma,sans-serif;color:rgba(255,255,255,.55)}' +
    '.wep-menu button{display:flex;width:100%;justify-content:space-between;align-items:center;background:none;border:0;color:#fff;font:600 14px Cairo,Tahoma,sans-serif;padding:9px 10px;border-radius:8px;cursor:pointer}' +
    '.wep-menu button:hover{background:rgba(255,255,255,.1)}' +
    '.wep-menu button.on{color:#2ff08a}' +
    '.wep-hint{position:absolute;top:50%;padding:8px 14px;border-radius:999px;background:rgba(0,0,0,.6);font-size:14px;font-weight:700;opacity:0;pointer-events:none;transform:translateY(-50%);transition:opacity .2s}' +
    '.wep-hint.show{opacity:1}.wep-hint.l{left:12%}.wep-hint.r{right:12%}' +
    '.wep-err{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.85);text-align:center;direction:rtl;font-size:14px}' +
    '.wep.error .wep-err{display:flex}' +
    '.wep-err button{background:#fff;color:#000;border:0;border-radius:999px;padding:9px 22px;font:700 14px Cairo,Tahoma,sans-serif;cursor:pointer}';
  var st = document.createElement('style');
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  /* ---------- helpers ---------- */
  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = Math.floor(t % 60);
    return (h ? h + ':' : '') + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
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
  var I = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    vol: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.2l2.5 2.5V12zM19 12c0 1.2-.3 2.4-.9 3.4l1.5 1.5A8.9 8.9 0 0 0 21 12a9 9 0 0 0-7-8.8v2.1a7 7 0 0 1 5 6.7zM4.3 3 3 4.3 7.7 9H3v6h4l5 5v-6.7l4.3 4.3c-.7.5-1.4.9-2.3 1.1v2.1a9 9 0 0 0 3.7-1.8l2 2 1.3-1.3L4.3 3zM12 4 9.9 6.1 12 8.2V4z"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><path d="M19.4 13a7.9 7.9 0 0 0 0-2l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.3 7.3 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6c-.6.2-1.2.6-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L4.6 11a7.9 7.9 0 0 0 0 2l-2.1 1.6a.5.5 0 0 0-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7 1l.4 2.6c0 .2.2.4.5.4h4c.3 0 .5-.2.5-.4l.4-2.6c.6-.2 1.2-.6 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',
    pip: '<svg viewBox="0 0 24 24"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>',
    fs: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>'
  };
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }

  /* ---------- enhance ---------- */
  function enhance(v) {
    if (!v || v.__wep) return v && v.__wep;
    var box = el('div', 'wep');
    box.tabIndex = 0;
    v.parentNode.insertBefore(box, v);
    var stage = el('div', 'wep-stage');
    box.appendChild(stage);
    stage.appendChild(v);
    var api = { video: v, box: box };
    v.__wep = api;

    v.controls = false;
    v.removeAttribute('controls');
    v.setAttribute('controlsList', 'nodownload noplaybackrate');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    var canPip = !!(document.pictureInPictureEnabled && v.requestPictureInPicture);
    v.disablePictureInPicture = !canPip;
    v.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    var tap = el('div', 'wep-tap');
    var big = btn('تشغيل', I.play); big.className = 'wep-big';
    var spin = el('div', 'wep-spin');
    var hintL = el('div', 'wep-hint l'), hintR = el('div', 'wep-hint r');
    var err = el('div', 'wep-err', '<div>تعذر تشغيل الفيديو</div>');
    var retry = el('button', null, 'إعادة المحاولة'); retry.type = 'button';
    err.appendChild(retry);
    [tap, big, spin, hintL, hintR, err].forEach(function (x) { stage.appendChild(x); });

    /* control strip under the picture: progress line + one row of buttons */
    var ctl = el('div', 'wep-ctl');
    var seek = el('div', 'wep-seek');
    var track = el('div', 'wep-track');
    var buf = el('div', 'wep-buf'), fill = el('div', 'wep-fill'), knob = el('div', 'wep-knob');
    track.appendChild(buf); track.appendChild(fill); track.appendChild(knob); seek.appendChild(track);
    seek.setAttribute('role', 'slider'); seek.setAttribute('aria-label', 'شريط التقدم');

    var bar = el('div', 'wep-bar');
    var bPlay = btn('تشغيل/إيقاف', I.pause);
    var bMute = btn('كتم', I.vol);
    var vol = el('input', 'wep-vol'); vol.type = 'range'; vol.min = 0; vol.max = 1; vol.step = 0.05; vol.value = 1;
    var time = el('span', 'wep-time', '00:00 / 00:00');
    var sp = el('span', 'wep-sp');
    var qual = el('span', 'wep-q', '');
    var bSet = btn('الإعدادات', I.gear);
    var bPip = btn('صورة داخل صورة', I.pip);
    var bFs = btn('ملء الشاشة', I.fs);
    [bPlay, bMute, vol, time, sp, qual, bSet].forEach(function (x) { bar.appendChild(x); });
    if (canPip) bar.appendChild(bPip);
    bar.appendChild(bFs);
    ctl.appendChild(seek); ctl.appendChild(bar);

    var menu = el('div', 'wep-menu');
    menu.appendChild(el('h6', null, 'سرعة التشغيل'));
    SPEEDS.forEach(function (r) {
      var b = el('button', null, '<span>' + (r === 1 ? 'عادي' : r + 'x') + '</span><span>✓</span>');
      b.type = 'button'; b.dataset.rate = r;
      b.addEventListener('click', function () { v.playbackRate = r; menu.classList.remove('open'); });
      menu.appendChild(b);
    });
    ctl.appendChild(menu);
    box.appendChild(ctl);

    function toggle() { if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }
    function skip(d) { if (isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + d)); flash(d); }
    var hintT;
    function flash(d) {
      var h = d < 0 ? hintL : hintR;
      h.textContent = (d < 0 ? '⟲ ' : '') + Math.abs(d) + (d < 0 ? '' : ' ⟳');
      h.classList.add('show'); clearTimeout(hintT);
      hintT = setTimeout(function () { h.classList.remove('show'); }, 600);
    }

    /* controls auto-hide (fullscreen only) */
    var idleT;
    function wake() {
      box.classList.remove('idle'); clearTimeout(idleT);
      if (!v.paused) idleT = setTimeout(function () { box.classList.add('idle'); }, 2800);
    }
    ['mousemove', 'touchstart', 'keydown', 'click'].forEach(function (ev) { box.addEventListener(ev, wake, { passive: true }); });

    /* tap on picture = play/pause; double-tap sides = ±10s */
    var lastTap = 0, tapT;
    tap.addEventListener('click', function (e) {
      menu.classList.remove('open');
      var now = Date.now(), r = box.getBoundingClientRect(), x = e.clientX - r.left;
      if (now - lastTap < 320 && (x < r.width * 0.33 || x > r.width * 0.67)) {
        clearTimeout(tapT); lastTap = 0; skip(x < r.width / 2 ? -10 : 10); return;
      }
      lastTap = now;
      clearTimeout(tapT);
      tapT = setTimeout(toggle, 220);
    });
    big.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    bPlay.addEventListener('click', toggle);
    bMute.addEventListener('click', function () { v.muted = !v.muted; });
    vol.addEventListener('input', function () { v.volume = +vol.value; v.muted = v.volume === 0; });
    bSet.addEventListener('click', function (e) { e.stopPropagation(); menu.classList.toggle('open'); });
    bPip.addEventListener('click', function () {
      try {
        if (document.pictureInPictureElement) document.exitPictureInPicture();
        else v.requestPictureInPicture();
      } catch (_) {}
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
      bPlay.innerHTML = v.paused ? I.play : I.pause;
      big.innerHTML = I.play;
      wake();
    }
    function quality() { qual.textContent = v.videoHeight ? v.videoHeight + 'P' : ''; }
    ['timeupdate', 'progress', 'loadedmetadata', 'durationchange', 'seeking', 'seeked'].forEach(function (ev) { v.addEventListener(ev, paint); });
    v.addEventListener('loadedmetadata', quality);
    v.addEventListener('resize', quality);
    ['play', 'pause', 'ended'].forEach(function (ev) { v.addEventListener(ev, state); });
    ['waiting', 'loadstart', 'seeking'].forEach(function (ev) { v.addEventListener(ev, function () { box.classList.add('loading'); }); });
    ['canplay', 'playing', 'seeked', 'loadeddata'].forEach(function (ev) { v.addEventListener(ev, function () { box.classList.remove('loading'); box.classList.remove('error'); }); });
    v.addEventListener('volumechange', function () { bMute.innerHTML = v.muted || v.volume === 0 ? I.mute : I.vol; if (!v.muted) vol.value = v.volume; });
    v.addEventListener('ratechange', function () {
      [].forEach.call(menu.querySelectorAll('button'), function (b) { b.classList.toggle('on', +b.dataset.rate === v.playbackRate); });
    });
    [].forEach.call(menu.querySelectorAll('button'), function (b) { b.classList.toggle('on', +b.dataset.rate === 1); });

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
    api.openSettings = function () { menu.classList.toggle('open'); };
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
