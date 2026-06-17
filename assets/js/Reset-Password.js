const { createClient } = supabase;
  const _supabase = createClient(
    "https://iygwhapcpdmsasqlfelv.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z3doYXBjcGRtc2FzcWxmZWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDk5MDQsImV4cCI6MjA4NjkyNTkwNH0.jqU1fEc9kBkXcCfazH6aTnS2XWWzPv0bbixHZgjtrnQ"
  );

  /* ─── Session Detection ─── */
  let sessionResolved = false;

  _supabase.auth.onAuthStateChange((event, session) => {
    if (sessionResolved) return;
    sessionResolved = true;

    document.getElementById('session-loader').style.display = 'none';

    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
      document.getElementById('form-body').style.display = 'block';
    } else {
      showMsg('انتهت صلاحية رابط إعادة التعيين أو غير صالح.\nالرجاء طلب رابط جديد من صفحة تسجيل الدخول.', 'error');
    }
  });

  setTimeout(() => {
    if (sessionResolved) return;
    sessionResolved = true;
    document.getElementById('session-loader').style.display = 'none';
    showMsg('لم يتم التعرف على الجلسة.\nتأكد من فتح الرابط مباشرةً من الإيميل.', 'error');
  }, 5000);

  /* ─── Eye Toggle ─── */
  function toggleVis(id, btn) {
    const inp    = document.getElementById(id);
    const hidden = inp.type === 'password';
    inp.type     = hidden ? 'text' : 'password';
    btn.querySelector('svg').style.opacity = hidden ? '.4' : '1';
  }

  /* ─── Password Strength ─── */
  function checkStrength(val) {
    const len   = val.length >= 8;
    const upper = /[A-Z]/.test(val);
    const num   = /[0-9]/.test(val);
    const sym   = /[^A-Za-z0-9]/.test(val);

    setReq('req-len',   len);
    setReq('req-upper', upper);
    setReq('req-num',   num);
    setReq('req-sym',   sym);

    const score  = [len, upper, num, sym].filter(Boolean).length;
    const fill   = document.getElementById('strength-fill');
    const label  = document.getElementById('strength-label');
    const levels = [
      { w: '0%',   bg: 'transparent',  lbl: '' },
      { w: '25%',  bg: '#ef4444',      lbl: 'ضعيفة' },
      { w: '50%',  bg: '#f97316',      lbl: 'مقبولة' },
      { w: '75%',  bg: '#eab308',      lbl: 'جيدة' },
      { w: '100%', bg: '#7c3aed',      lbl: 'قوية جداً ✓' },
    ];
    fill.style.width      = levels[score].w;
    fill.style.background = levels[score].bg;
    label.textContent     = levels[score].lbl;
    label.style.color     = levels[score].bg;
  }

  function setReq(id, met) {
    document.getElementById(id).classList.toggle('met', met);
  }

  /* ─── Confetti ─── */
  function launchConfetti() {
    const wrap   = document.getElementById('confetti-wrap');
    const colors = ['#7c3aed','#a78bfa','#c4b0f8','#5b21b6','#ddd6fe','#ede9fe'];
    wrap.innerHTML = '';
    for (let i = 0; i < 28; i++) {
      const dot = document.createElement('div');
      dot.className = 'conf-dot';
      dot.style.left       = Math.random() * 100 + '%';
      dot.style.top        = Math.random() * 40 + '%';
      dot.style.background = colors[Math.floor(Math.random() * colors.length)];
      dot.style.width      = (Math.random() * 8 + 4) + 'px';
      dot.style.height     = (Math.random() * 8 + 4) + 'px';
      dot.style.animationDelay = (Math.random() * .6) + 's';
      dot.style.animationDuration = (Math.random() * .6 + .8) + 's';
      wrap.appendChild(dot);
      requestAnimationFrame(() => dot.classList.add('animate'));
    }
  }

  /* ─── Reset Password ─── */
  async function resetPassword() {
    const password = document.getElementById('password').value;
    const confirm  = document.getElementById('confirm').value;

    clearMsg();

    if (!password) {
      showMsg('الرجاء إدخال كلمة المرور', 'error'); return;
    }
    if (password.length < 8) {
      showMsg('كلمة المرور قصيرة جداً — يجب أن تكون ٨ أحرف على الأقل', 'error'); return;
    }
    if (password !== confirm) {
      showMsg('كلمتا المرور غير متطابقتين', 'error'); return;
    }

    setLoading(true);

    const { data, error } = await _supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      showMsg('حدث خطأ: ' + error.message, 'error');
    } else {
      // Hide the form, show success overlay
      document.getElementById('form-body').style.display = 'none';
      document.getElementById('message').style.display   = 'none';
      document.getElementById('success-overlay').classList.add('show');
      launchConfetti();
      // Optional redirect after 3s
      // setTimeout(() => { window.location.href = '/index.html'; }, 3000);
    }
  }

  /* ─── Helpers ─── */
  function setLoading(on) {
    document.getElementById('btn-text').style.display = on ? 'none'  : '';
    document.getElementById('spinner').style.display  = on ? 'block' : 'none';
    document.getElementById('submit-btn').disabled    = on;
  }

  function showMsg(text, type) {
    const msg       = document.getElementById('message');
    msg.textContent = text;
    msg.className   = type;
  }

  function clearMsg() {
    const msg         = document.getElementById('message');
    msg.className     = '';
    msg.style.display = 'none';
  }