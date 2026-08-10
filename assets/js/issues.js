(function () {
  const $ = (id) => document.getElementById(id);

  const PAGE_SIZE = 9;
  let allIssues = [];      // كل الداتا الجايه من Supabase
  let filteredIssues = []; // بعد تطبيق البحث/الفلتر
  let visibleCount = PAGE_SIZE;

  // auth.js بيتولى التحقق من التوكن وبيبعت الحدث ده لما ينجح، وبيديلنا window._sbClient جاهز
  window.addEventListener('authSuccess', () => {
    loadIssues();
  });

  async function loadIssues() {
    const sb = window._sbClient;
    if (!sb) return showError('تعذر الاتصال بقاعدة البيانات');

    try {
      const { data, error } = await sb
        .from('system_issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      allIssues = data || [];
      filteredIssues = allIssues;
      buildTypeFilter(allIssues);
      $('loadingState').style.display = 'none';
      renderVisible();
    } catch (e) {
      console.error(e);
      showError(e.message || 'حصل خطأ أثناء تحميل المشاكل');
    }
  }

  function showError(msg) {
    $('loadingState').style.display = 'none';
    $('errorState').style.display = 'block';
    $('errorStateMsg').textContent = msg;
  }

  function buildTypeFilter(issues) {
    const select = $('typeFilter');
    const types = [...new Set(issues.map(i => i.issue_type).filter(Boolean))];
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      select.appendChild(opt);
    });
  }

  // بيرسم بس اللي مفروض يبقى ظاهر حسب visibleCount
  function renderVisible() {
    const grid = $('cardsGrid');
    grid.innerHTML = '';

    if (filteredIssues.length === 0) {
      $('emptyState').style.display = 'block';
      $('loadMoreWrap').style.display = 'none';
      return;
    }
    $('emptyState').style.display = 'none';

    const slice = filteredIssues.slice(0, visibleCount);
    slice.forEach(issue => {
      const card = document.createElement('div');
      card.className = 'issue-card';
      card.innerHTML = `
        <span class="badge"><i class="fa-solid fa-tag"></i> ${escapeHtml(issue.issue_type || 'عام')}</span>
        <h3>${escapeHtml(issue.title)}</h3>
        <p class="desc">${escapeHtml(issue.description || '')}</p>
        <button class="solve-btn"><i class="fa-solid fa-wand-magic-sparkles"></i> عرض الحل</button>
      `;
      card.querySelector('.solve-btn').addEventListener('click', () => openModal(issue));
      grid.appendChild(card);
    });

    // تحديث حالة زرار "تحميل المزيد"
    const remaining = filteredIssues.length - slice.length;
    const wrap = $('loadMoreWrap');
    if (remaining > 0) {
      wrap.style.display = 'flex';
      $('loadMoreText').textContent = `تحميل المزيد (${remaining} متبقية)`;
    } else {
      wrap.style.display = filteredIssues.length > PAGE_SIZE ? 'flex' : 'none';
      $('loadMoreText').textContent = 'تم عرض كل المشاكل';
      $('loadMoreBtn').disabled = true;
    }
    $('resultsCount').textContent = `عرض ${slice.length} من ${filteredIssues.length} مشكلة`;
  }

  $('loadMoreBtn').addEventListener('click', () => {
    visibleCount += PAGE_SIZE;
    $('loadMoreBtn').disabled = false;
    renderVisible();
  });

  function openModal(issue) {
    $('modalType').innerHTML = `<i class="fa-solid fa-tag"></i> ${escapeHtml(issue.issue_type || 'عام')}`;
    $('modalTitle').textContent = issue.title;
    $('modalDescription').textContent = issue.description || '—';
    $('modalSolution').textContent = issue.solution || '—';

    // صورة المشكلة
    const problemWrap = $('modalProblemImageWrap');
    if (issue.problem_image_url) {
      problemWrap.style.display = 'block';
      $('modalProblemImage').src = issue.problem_image_url;
    } else {
      problemWrap.style.display = 'none';
    }

    // صور الحل
    const solWrap = $('modalSolutionImagesWrap');
    const solContainer = $('modalSolutionImages');
    solContainer.innerHTML = '';
    const solImages = Array.isArray(issue.solution_images) ? issue.solution_images : [];
    if (solImages.length > 0) {
      solWrap.style.display = 'block';
      solImages.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'صورة توضيحية للحل';
        img.addEventListener('click', () => openLightbox(url));
        solContainer.appendChild(img);
      });
    } else {
      solWrap.style.display = 'none';
    }

    // اللينك
    const linkWrap = $('modalLinkWrap');
    if (issue.reference_link) {
      linkWrap.style.display = 'block';
      $('modalLink').href = issue.reference_link;
    } else {
      linkWrap.style.display = 'none';
    }

    $('issueModal').classList.add('show');
  }

  function closeModal() {
    $('issueModal').classList.remove('show');
  }

  function openLightbox(src) {
    $('lightboxImg').src = src;
    $('lightbox').classList.add('show');
  }
  function closeLightbox() {
    $('lightbox').classList.remove('show');
  }

  $('modalCloseBtn').addEventListener('click', closeModal);
  $('issueModal').addEventListener('click', (e) => { if (e.target.id === 'issueModal') closeModal(); });
  $('lightbox').addEventListener('click', closeLightbox);
  $('modalProblemImage').addEventListener('click', () => openLightbox($('modalProblemImage').src));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeLightbox(); }
  });

  // بحث + فلترة حسب النوع
  $('searchInput').addEventListener('input', applyFilters);
  $('typeFilter').addEventListener('change', applyFilters);

  function applyFilters() {
    const q = $('searchInput').value.trim().toLowerCase();
    const type = $('typeFilter').value;

    filteredIssues = allIssues.filter(i => {
      const matchesQuery = !q ||
        (i.title || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q);
      const matchesType = !type || i.issue_type === type;
      return matchesQuery && matchesType;
    });

    visibleCount = PAGE_SIZE; // نرجع لأول صفحة كل ما البحث يتغير
    renderVisible();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
})();
