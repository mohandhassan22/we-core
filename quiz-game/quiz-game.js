/**
 * WE Quiz Game — Interactive Frontend Controller
 * Connects to Supabase Edge Function 'game-ai'
 */

(function () {
  'use strict';

  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.includes('devtunnels.ms') ||
                window.location.hostname.endsWith('.local');
  const SUPABASE_URL = isDev ? (window.location.origin + '/supabase-proxy') : 'https://iygwhapcpdmsasqlfelv.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';

  // State
  let userToken = '';
  let currentUserId = '';
  let userProgress = {
    total_score: 0,
    current_level: 1,
    completed_levels: 0,
    total_correct: 0,
    total_wrong: 0,
    next_threshold: 20,
    prev_threshold: 0,
    progress_pct: 0,
    display_name: 'موظف WE',
  };

  let activeSession = null;
  let isSubmitting = false;
  let isFinishing = false;

  // Timer State
  const TIMER_SECONDS = 15;
  const RING_CIRCUMFERENCE = 2 * Math.PI * 26; // 163.36
  let timerInterval = null;
  let timerRemaining = TIMER_SECONDS;

  // Level Titles metadata
  const LEVEL_TITLES = [
    { level: 1, title: 'مبتدئ WE', desc: 'أساسيات الخدمات والأكواد السريعة' },
    { level: 2, title: 'خبير خدمات WE', desc: 'الإنترنت المنزلي والدعم الفني 111' },
    { level: 3, title: 'أخصائي مبيعات محترف', desc: 'باقات كيكس، وي ميكس ومحفظة WE Pay' },
    { level: 4, title: 'مستشار عملاء أول', desc: 'لوائح تنظيم الاتصالات والتعامل مع الشكاوى' },
    { level: 5, title: 'سفير التميز الرقمي', desc: 'حلول الشركات والألياف الضوئية المتقدمة' },
    { level: 6, title: 'نخبة WE الذهبية', desc: 'تحدي الخبراء الشامل' },
  ];

  // Helper: Get Cookie
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift().replace(/"/g, ''));
    return '';
  }

  // Helper: API caller to game-ai edge function
  async function callGameAi(body) {
    if (!userToken) {
      window.location.replace('../login.html');
      throw new Error('no_session');
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/game-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      window.location.replace('../login.html');
      throw new Error('unauthorized');
    }

    if (!res.ok) {
      const err = new Error(data.message || data.error || 'Server error');
      err.code = data.code || res.status;
      throw err;
    }

    return data;
  }

  // Toast / Notification
  function showToast(message, type = 'error') {
    const notif = document.getElementById('gameNotification');
    if (!notif) return;
    notif.className = `game-notification ${type}`;
    notif.innerHTML = `<i class="fa-solid fa-${type === 'error' ? 'circle-exclamation' : 'circle-check'}"></i> <span>${escapeHtml(message)}</span>`;
    notif.classList.remove('hidden');
    setTimeout(() => {
      notif.classList.add('hidden');
    }, 4500);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  // Calculate Level threshold
  function getLevelThreshold(level) {
    return Math.ceil(20.0 * Math.pow(1.10, Math.max(0, level - 1)));
  }

  // Initialize
  async function init() {
    userToken = getCookie('sb-access-token');
    if (!userToken) {
      // Check localStorage fallback
      try {
        const raw = localStorage.getItem('sb-iygwhapcpdmsasqlfelv-auth-token');
        if (raw) {
          const parsed = JSON.parse(raw);
          userToken = parsed.access_token || '';
        }
      } catch (_) {}
    }

    if (!userToken) {
      window.location.replace('../login.html');
      return;
    }

    // Bind Navigation Tabs
    document.querySelectorAll('.nav-tab').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Bind Modal Actions
    document.getElementById('btnPlayAgain')?.addEventListener('click', () => {
      closeModal();
      if (activeSession) startQuiz(activeSession.level);
    });

    document.getElementById('btnGoLeaderboard')?.addEventListener('click', () => {
      closeModal();
      switchTab('leaderboard');
    });

    document.getElementById('btnBackToLevels')?.addEventListener('click', () => {
      closeModal();
      switchTab('play');
    });

    document.getElementById('lbRefreshBtn')?.addEventListener('click', loadLeaderboard);

    document.getElementById('arenaExitBtn')?.addEventListener('click', () => {
      if (confirm('هل أنت متأكد من إنهاء الجولة والعودة للقائمة؟')) {
        stopTimer();
        switchTab('play');
        loadProgress();
      }
    });

    document.getElementById('arenaNextBtn')?.addEventListener('click', handleNextQuestion);

    // Initial Data Fetch
    await fetchUserProfile();
    await loadProgress();
    renderLevels();
  }

  // Fetch Safe Display Name from profiles
  async function fetchUserProfile() {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) return;
      const u = await res.json();
      currentUserId = u.id;

      // Safe query profiles without exposing sensitive fields
      const pRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(currentUserId)}&select=full_name,username&limit=1`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${userToken}` },
      });
      if (pRes.ok) {
        const rows = await pRes.json();
        if (rows && rows[0]) {
          userProgress.display_name = rows[0].full_name || rows[0].username || 'موظف WE';
        }
      }
    } catch (e) {
      console.warn('Profile fetch note:', e.message);
    }
  }

  // Load User Progress from game-ai
  async function loadProgress() {
    try {
      const p = await callGameAi({ action: 'get_progress' });
      userProgress = { ...userProgress, ...p };
      updateProgressUI();
      renderLevels();
    } catch (err) {
      console.error('Failed to load progress:', err);
      showToast('تعذر تحميل التقدم الحالي. حاول تحديث الصفحة.', 'error');
    }
  }

  // Update UI Elements with User Progress
  function updateProgressUI() {
    const nameEl = document.getElementById('userDisplayName');
    if (nameEl) nameEl.textContent = userProgress.display_name || 'موظف WE';

    const levelChip = document.getElementById('userLevelChip');
    if (levelChip) levelChip.innerHTML = `<i class="fa-solid fa-medal"></i> مستوي ${userProgress.current_level}`;

    const scoreChip = document.getElementById('userScoreChip');
    if (scoreChip) scoreChip.innerHTML = `<i class="fa-solid fa-star"></i> ${userProgress.total_score} نقطة`;

    const heroTitle = document.getElementById('heroLevelTitle');
    const titleMeta = LEVEL_TITLES.find((t) => t.level === userProgress.current_level) || { title: `المستوى ${userProgress.current_level}` };
    if (heroTitle) heroTitle.textContent = `المستوى ${userProgress.current_level}: ${titleMeta.title}`;

    const heroProgressText = document.getElementById('heroProgressText');
    if (heroProgressText) {
      heroProgressText.textContent = `أنت في المستوى ${userProgress.current_level}. اجمع ${userProgress.next_threshold} نقطة لفتح المستوى التالي!`;
    }

    const statScore = document.getElementById('statTotalScore');
    if (statScore) statScore.textContent = userProgress.total_score;

    const statCorrect = document.getElementById('statCorrect');
    if (statCorrect) statCorrect.textContent = userProgress.total_correct;

    const statWrong = document.getElementById('statWrong');
    if (statWrong) statWrong.textContent = userProgress.total_wrong;

    const fill = document.getElementById('progressFill');
    const pText = document.getElementById('progressText');
    const tTarget = document.getElementById('thresholdTarget');

    if (fill) fill.style.width = `${userProgress.progress_pct}%`;
    if (pText) pText.textContent = `التقدم نحو المستوى التالي: ${userProgress.progress_pct}%`;
    if (tTarget) tTarget.textContent = `الهدف: ${userProgress.next_threshold} نقطة`;
  }

  // Dynamic Level count state
  let visibleLevelsLimit = 12;

  // Render Level Selection Cards (Infinite Levels)
  function renderLevels() {
    const grid = document.getElementById('levelsGrid');
    if (!grid) return;

    const currentLvl = userProgress.current_level || 1;
    const maxDisplayLevel = Math.max(visibleLevelsLimit, currentLvl + 5);
    let html = '';

    for (let lvl = 1; lvl <= maxDisplayLevel; lvl++) {
      const isUnlocked = lvl <= userProgress.current_level || lvl <= 3; // First 3 levels open for training + any unlocked level
      const isCompleted = lvl <= userProgress.completed_levels;
      const threshold = getLevelThreshold(lvl);
      const meta = LEVEL_TITLES.find((t) => t.level === lvl) || { 
        title: `المستوى المتقدم ${lvl}`, 
        desc: `تحدي استثنائي من تعليمات وشروط تعاقدات WE بالذكاء الاصطناعي` 
      };

      let statusBadge = '';
      if (isCompleted) {
        statusBadge = '<span class="level-status-pill completed"><i class="fa-solid fa-circle-check"></i> مكتمل</span>';
      } else if (isUnlocked) {
        statusBadge = '<span class="level-status-pill unlocked"><i class="fa-solid fa-play"></i> متاح الآن</span>';
      } else {
        statusBadge = `<span class="level-status-pill locked"><i class="fa-solid fa-lock"></i> (${threshold} نقطة)</span>`;
      }

      html += `
        <div class="level-card ${isUnlocked ? 'active' : 'locked'}">
          <div>
            <div class="level-card-top">
              <div class="level-num-badge">${lvl}</div>
              ${statusBadge}
            </div>
            <h4>${escapeHtml(meta.title)}</h4>
            <p>${escapeHtml(meta.desc)}</p>
            <div class="level-meta">
              <i class="fa-solid fa-flag-checkered"></i>
              <span>النقاط المطلوبة: <strong>${threshold} نقطة</strong></span>
            </div>
          </div>
          <button class="level-btn ${isUnlocked ? 'primary' : ''}" ${isUnlocked ? '' : 'disabled'} data-level="${lvl}">
            <i class="fa-solid fa-${isUnlocked ? 'wand-magic-sparkles' : 'lock'}"></i>
            <span>${isUnlocked ? 'توليد 5 أسئلة بالـ AI' : 'مقفول'}</span>
          </button>
        </div>
      `;
    }

    // Add Infinite Levels Expand Button at bottom
    html += `
      <div style="grid-column: 1 / -1; text-align: center; margin-top: 10px;">
        <button id="btnLoadMoreLevels" class="btn-secondary" style="margin: 0 auto; padding: 12px 24px; font-weight: 800;">
          <i class="fa-solid fa-angles-down"></i> فتح وعرض المزيد من المستويات (+10 مستويات لا نهائية)
        </button>
      </div>
    `;

    grid.innerHTML = html;

    // Attach Click Events to unlocked cards
    grid.querySelectorAll('.level-btn:not(:disabled)').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lvl = parseInt(btn.dataset.level, 10);
        startQuiz(lvl);
      });
    });

    document.getElementById('btnLoadMoreLevels')?.addEventListener('click', () => {
      visibleLevelsLimit += 10;
      renderLevels();
    });
  }

  // Switch App Tabs
  function switchTab(tabId) {
    document.querySelectorAll('.nav-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });

    document.querySelectorAll('.game-view').forEach((v) => v.classList.add('hidden'));

    if (tabId === 'play') {
      document.getElementById('viewPlay')?.classList.remove('hidden');
    } else if (tabId === 'leaderboard') {
      document.getElementById('viewLeaderboard')?.classList.remove('hidden');
      loadLeaderboard();
    } else if (tabId === 'rules') {
      document.getElementById('viewRules')?.classList.remove('hidden');
    }
  }

  // Start Quiz Session
  async function startQuiz(level) {
    showToast('بنجهّز 5 أسئلة ليك بالذكاء الاصطناعي… لحظات من فضلك ⏳', 'success');

    try {
      const data = await callGameAi({ action: 'start_quiz', level });
      if (!data.questions || data.questions.length < 5) {
        throw new Error('لم يتم استلام 5 أسئلة من الخادم');
      }

      activeSession = {
        session_id: data.session_id,
        level: data.level,
        questions: data.questions,
        currentIndex: 0,
        sessionPoints: 0,
        correctCount: 0,
        wrongCount: 0,
        answers: {},
      };

      isSubmitting = false;
      isFinishing = false;

      // Switch to Arena View
      document.querySelectorAll('.game-view').forEach((v) => v.classList.add('hidden'));
      document.getElementById('viewArena')?.classList.remove('hidden');

      renderCurrentQuestion();
    } catch (err) {
      console.error('Start quiz error:', err);
      showToast(err.message || 'تعذر بدء الجلسة. حاول مرة أخرى.', 'error');
    }
  }

  // ========== COUNTDOWN TIMER FUNCTIONS ==========

  function startTimer() {
    stopTimer(); // Clear any existing timer
    timerRemaining = TIMER_SECONDS;
    updateTimerUI(timerRemaining);

    timerInterval = setInterval(() => {
      timerRemaining--;
      updateTimerUI(timerRemaining);

      if (timerRemaining <= 0) {
        stopTimer();
        handleTimerExpired();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerUI(seconds) {
    const timerText = document.getElementById('timerText');
    const timerRing = document.getElementById('timerRingProgress');
    const timerWrap = document.getElementById('timerWrap');
    if (!timerText || !timerRing || !timerWrap) return;

    // Update text
    timerText.textContent = Math.max(0, seconds);

    // Update ring progress (stroke-dashoffset)
    const fraction = seconds / TIMER_SECONDS;
    const offset = RING_CIRCUMFERENCE * (1 - fraction);
    timerRing.style.strokeDashoffset = offset;

    // Update color classes
    timerWrap.classList.remove('warn', 'danger', 'expired');
    if (seconds <= 0) {
      timerWrap.classList.add('expired');
    } else if (seconds <= 5) {
      timerWrap.classList.add('danger');
    } else if (seconds <= 8) {
      timerWrap.classList.add('warn');
    }
  }

  async function handleTimerExpired() {
    if (!activeSession || isSubmitting) return;
    const qIndex = activeSession.currentIndex;
    if (activeSession.answers[qIndex]) return; // Already answered

    isSubmitting = true;
    const currentQ = activeSession.questions[qIndex];

    // Disable all options
    const allButtons = document.querySelectorAll('.option-btn');
    allButtons.forEach((b) => (b.disabled = true));

    try {
      // Submit with empty answer (server will mark as wrong)
      const result = await callGameAi({
        action: 'submit_answer',
        session_id: activeSession.session_id,
        question_id: currentQ.id,
        selected_option: '__TIMEOUT__',
      });

      // Save answer in active session
      activeSession.answers[qIndex] = {
        selected: '⏰ انتهى الوقت',
        is_correct: false,
        points: result.points_awarded || -1,
      };

      activeSession.wrongCount++;
      activeSession.sessionPoints -= 1;

      // Highlight correct option
      allButtons.forEach((b) => {
        if (b.dataset.opt === result.correct_option) {
          b.classList.add('correct');
        }
      });

      // Show Explanation Feedback
      const expBox = document.getElementById('explanationBox');
      const expHeader = document.getElementById('explanationHeader');
      const expTitle = document.getElementById('explanationTitle');
      const expDesc = document.getElementById('explanationText');

      if (expBox && expHeader && expTitle && expDesc) {
        expHeader.className = 'explanation-header danger';
        expHeader.innerHTML = '<i class="fa-solid fa-clock"></i>';
        expTitle.textContent = '⏰ انتهى الوقت! (-1 نقطة)';
        expDesc.textContent = result.explanation || `الإجابة الصحيحة هي: ${result.correct_option}`;
        expBox.classList.remove('hidden');
      }

      // Update Session Points UI
      const sessScore = document.getElementById('arenaSessionPoints');
      if (sessScore) {
        const sign = activeSession.sessionPoints >= 0 ? '+' : '';
        sessScore.textContent = `${sign}${activeSession.sessionPoints}`;
        sessScore.className = activeSession.sessionPoints >= 0 ? 'plus' : 'minus';
      }

      // Update stepper dot
      const stepperDots = document.querySelectorAll('.step-dot');
      if (stepperDots[qIndex]) {
        stepperDots[qIndex].className = 'step-dot done-wrong';
      }

      // Enable Next button
      const nextBtn = document.getElementById('arenaNextBtn');
      if (nextBtn) nextBtn.disabled = false;
    } catch (err) {
      console.error('Timer-expired submit error:', err);
      showToast('حدث خطأ أثناء تسجيل انتهاء الوقت.', 'error');
      allButtons.forEach((b) => (b.disabled = false));
    } finally {
      isSubmitting = false;
    }
  }

  // Render Current Active Question in Arena
  function renderCurrentQuestion() {
    if (!activeSession) return;

    const qIndex = activeSession.currentIndex;
    const q = activeSession.questions[qIndex];
    const totalQ = activeSession.questions.length;

    // Arena Header
    const lvlBadge = document.getElementById('arenaLevelBadge');
    if (lvlBadge) lvlBadge.innerHTML = `<i class="fa-solid fa-gamepad"></i> المستوى ${activeSession.level}`;

    const curQ = document.getElementById('arenaCurrentQ');
    if (curQ) curQ.textContent = qIndex + 1;

    const totQ = document.getElementById('arenaTotalQ');
    if (totQ) totQ.textContent = totalQ;

    const sessScore = document.getElementById('arenaSessionPoints');
    if (sessScore) {
      const sign = activeSession.sessionPoints >= 0 ? '+' : '';
      sessScore.textContent = `${sign}${activeSession.sessionPoints}`;
      sessScore.className = activeSession.sessionPoints >= 0 ? 'plus' : 'minus';
    }

    // Step dots
    const stepper = document.getElementById('qStepper');
    if (stepper) {
      stepper.innerHTML = activeSession.questions
        .map((_, i) => {
          let cls = 'step-dot';
          if (i === qIndex) cls += ' active';
          if (activeSession.answers[i]) {
            cls += activeSession.answers[i].is_correct ? ' done-correct' : ' done-wrong';
          }
          return `<span class="${cls}">${i + 1}</span>`;
        })
        .join('');
    }

    // Question Text
    const qText = document.getElementById('qText');
    if (qText) qText.textContent = q.question_text;

    // Reset Explanation Box
    const expBox = document.getElementById('explanationBox');
    if (expBox) expBox.classList.add('hidden');

    // Options
    const optGrid = document.getElementById('optionsGrid');
    if (!optGrid) return;

    const letters = ['أ', 'ب', 'ج', 'د'];
    optGrid.innerHTML = q.options
      .map(
        (opt, idx) => `
        <button class="option-btn" data-opt="${escapeHtml(opt)}">
          <span class="option-badge">${letters[idx] || idx + 1}</span>
          <span>${escapeHtml(opt)}</span>
        </button>
      `
      )
      .join('');

    // Disable Next button until question is answered
    const nextBtn = document.getElementById('arenaNextBtn');
    if (nextBtn) {
      nextBtn.disabled = true;
      const isLast = qIndex === totalQ - 1;
      nextBtn.innerHTML = isLast
        ? '<span>إنهاء وحفظ النتيجة</span> <i class="fa-solid fa-check"></i>'
        : '<span>السؤال التالي</span> <i class="fa-solid fa-arrow-left"></i>';
    }

    // Attach Option Click Event
    optGrid.querySelectorAll('.option-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleOptionSelect(btn));
    });

    // Start the countdown timer for this question
    startTimer();
  }

  // Handle Option Selection & Submit Answer
  async function handleOptionSelect(buttonEl) {
    if (isSubmitting || !activeSession) return;

    const qIndex = activeSession.currentIndex;
    if (activeSession.answers[qIndex]) return; // Already answered

    isSubmitting = true;
    stopTimer(); // Stop countdown — user answered in time
    const selectedText = buttonEl.dataset.opt;
    const currentQ = activeSession.questions[qIndex];

    // Disable all options immediately to prevent multiple clicks
    const allButtons = document.querySelectorAll('.option-btn');
    allButtons.forEach((b) => (b.disabled = true));

    try {
      // Call edge function to validate answer securely
      const result = await callGameAi({
        action: 'submit_answer',
        session_id: activeSession.session_id,
        question_id: currentQ.id,
        selected_option: selectedText,
      });

      // Save answer in active session
      activeSession.answers[qIndex] = {
        selected: selectedText,
        is_correct: result.is_correct,
        points: result.points_awarded,
      };

      if (result.is_correct) {
        activeSession.correctCount++;
        activeSession.sessionPoints += 2;
        buttonEl.classList.add('correct');
      } else {
        activeSession.wrongCount++;
        activeSession.sessionPoints -= 1;
        buttonEl.classList.add('wrong');

        // Highlight correct option
        allButtons.forEach((b) => {
          if (b.dataset.opt === result.correct_option) {
            b.classList.add('correct');
          }
        });
      }

      // Show Explanation Feedback
      const expBox = document.getElementById('explanationBox');
      const expHeader = document.getElementById('explanationHeader');
      const expTitle = document.getElementById('explanationTitle');
      const expDesc = document.getElementById('explanationText');

      if (expBox && expHeader && expTitle && expDesc) {
        expHeader.className = `explanation-header ${result.is_correct ? 'success' : 'danger'}`;
        expHeader.innerHTML = `<i class="fa-solid fa-${result.is_correct ? 'circle-check' : 'circle-xmark'}"></i>`;
        expTitle.textContent = result.is_correct ? 'إجابة صحيحة! (+2 نقطة)' : 'إجابة خاطئة! (-1 نقطة)';
        expDesc.textContent = result.explanation || `الإجابة الصحيحة هي: ${result.correct_option}`;
        expBox.classList.remove('hidden');
      }

      // Update Session Points UI
      const sessScore = document.getElementById('arenaSessionPoints');
      if (sessScore) {
        const sign = activeSession.sessionPoints >= 0 ? '+' : '';
        sessScore.textContent = `${sign}${activeSession.sessionPoints}`;
        sessScore.className = activeSession.sessionPoints >= 0 ? 'plus' : 'minus';
      }

      // Update stepper dot
      const stepperDots = document.querySelectorAll('.step-dot');
      if (stepperDots[qIndex]) {
        stepperDots[qIndex].className = `step-dot ${result.is_correct ? 'done-correct' : 'done-wrong'}`;
      }

      // Enable Next button
      const nextBtn = document.getElementById('arenaNextBtn');
      if (nextBtn) nextBtn.disabled = false;
    } catch (err) {
      console.error('Answer submission error:', err);
      showToast(err.message || 'حدث خطأ أثناء تصحيح الإجابة.', 'error');
      // Re-enable options in case of network glitch
      allButtons.forEach((b) => (b.disabled = false));
    } finally {
      isSubmitting = false;
    }
  }

  // Handle Next Question or Finish
  async function handleNextQuestion() {
    if (!activeSession) return;

    const totalQ = activeSession.questions.length;
    if (activeSession.currentIndex < totalQ - 1) {
      activeSession.currentIndex++;
      renderCurrentQuestion();
    } else {
      await finishQuizSession();
    }
  }

  // Finish Quiz Session
  async function finishQuizSession() {
    if (isFinishing || !activeSession) return;
    isFinishing = true;
    stopTimer(); // Ensure timer is cleared when finishing

    const nextBtn = document.getElementById('arenaNextBtn');
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.innerHTML = '<div class="game-loader" style="width:18px;height:18px;margin:0"></div> <span>بنحفظ النتيجة...</span>';
    }

    try {
      const prevLevel = userProgress.current_level;
      const res = await callGameAi({
        action: 'finish_quiz',
        session_id: activeSession.session_id,
      });

      // Update userProgress
      userProgress.total_score = res.total_score;
      userProgress.current_level = res.current_level;
      userProgress.completed_levels = res.completed_levels;

      // Check if unlocked new level
      const unlockedNew = res.current_level > prevLevel;

      // Populate Modal
      const modal = document.getElementById('resultsModal');
      const rNet = document.getElementById('rNetPoints');
      const rCor = document.getElementById('rCorrect');
      const rWro = document.getElementById('rWrong');
      const rTot = document.getElementById('rTotalScore');
      const unlockedBanner = document.getElementById('unlockedBanner');

      if (rNet) {
        const sign = res.score_delta >= 0 ? '+' : '';
        rNet.textContent = `${sign}${res.score_delta}`;
      }
      if (rCor) rCor.textContent = res.correct_count;
      if (rWro) rWro.textContent = res.wrong_count;
      if (rTot) rTot.textContent = res.total_score;

      if (unlockedBanner) {
        unlockedBanner.classList.toggle('hidden', !unlockedNew);
      }

      modal?.classList.remove('hidden');

      // Refresh progress & levels in background
      await loadProgress();
    } catch (err) {
      console.error('Finish quiz error:', err);
      showToast(err.message || 'تعذر تسجيل إنهاء الجلسة.', 'error');
    } finally {
      isFinishing = false;
    }
  }

  function closeModal() {
    document.getElementById('resultsModal')?.classList.add('hidden');
  }

  // Load Leaderboard
  async function loadLeaderboard() {
    const tbody = document.getElementById('lbTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4">
          <div class="game-loader"></div>
          <p>جارِ تحميل المتصدرين...</p>
        </td>
      </tr>
    `;

    try {
      const data = await callGameAi({ action: 'get_leaderboard' });
      const rows = data.leaderboard || [];

      if (rows.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4" style="color:var(--cv-text-muted);">
              لا توجد نقاط مسجلة بعد. كن أول من يتصدر لوحة الشرف!
            </td>
          </tr>
        `;
        return;
      }

      let myRankRow = null;
      let html = '';

      rows.forEach((r) => {
        if (r.is_current_user) {
          myRankRow = r;
        }

        let badgeClass = 'rank-badge other';
        if (r.rank === 1) badgeClass = 'rank-badge top-1';
        else if (r.rank === 2) badgeClass = 'rank-badge top-2';
        else if (r.rank === 3) badgeClass = 'rank-badge top-3';

        html += `
          <tr class="${r.is_current_user ? 'current-user-row' : ''}">
            <td><span class="${badgeClass}">${r.rank}</span></td>
            <td><strong>${escapeHtml(r.display_name)}</strong> ${r.is_current_user ? ' (أنت)' : ''}</td>
            <td>المستوى ${r.current_level}</td>
            <td>${r.completed_levels} مستويات</td>
            <td>${r.total_correct} إجابة</td>
            <td><strong>${r.total_score}</strong> نقطة</td>
          </tr>
        `;
      });

      tbody.innerHTML = html;

      // Update sticky banner
      if (myRankRow) {
        const rNum = document.getElementById('myRankNum');
        const rDet = document.getElementById('myRankDetail');
        const rSco = document.getElementById('myRankScore');

        if (rNum) rNum.textContent = `#${myRankRow.rank}`;
        if (rDet) rDet.textContent = `مستواك: ${myRankRow.current_level} · إجابات صحيحة: ${myRankRow.total_correct}`;
        if (rSco) rSco.textContent = `${myRankRow.total_score} نقطة`;
      }
    } catch (err) {
      console.error('Leaderboard error:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4" style="color:var(--cv-danger);">
            تعذر تحميل لوحة المتصدرين. تأكد من اتصالك وحاول مرة أخرى.
          </td>
        </tr>
      `;
    }
  }

  // Run on load
  window.addEventListener('DOMContentLoaded', init);
})();
