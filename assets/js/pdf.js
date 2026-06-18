// ── Supabase Config ──
const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z3doYXBjcGRtc2FzcWxmZWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDk5MDQsImV4cCI6MjA4NjkyNTkwNH0.jqU1fEc9kBkXcCfazH6aTnS2XWWzPv0bbixHZgjtrnQ';

// ── Fetch forms from Supabase ──
async function loadForms() {
    try {
        const res = await fetch(`${SB_URL}/rest/v1/pdf_forms?select=*&order=id.asc`, {
            headers: {
                'apikey': SB_KEY,
                'Authorization': `Bearer ${SB_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        window.renderForms(data);

    } catch (err) {
        console.error('Supabase fetch error:', err);
        window.showFormsError();
    }
}

document.addEventListener('DOMContentLoaded', loadForms);

// ── Filter active state helper ──
let activeFilter = 'all';
function filterForms(cat, btn) {
    activeFilter = cat;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    applyFilters();
}

function searchForms() { applyFilters(); }
document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('searchInput');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); });
});

function applyFilters() {
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const cards = document.querySelectorAll('.form-card');
    let visible = 0;
    cards.forEach(card => {
        const matchCat = activeFilter === 'all' || card.dataset.cat === activeFilter;
        const matchQ   = !q || card.dataset.title.includes(q);
        const show = matchCat && matchQ;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    const fw = document.getElementById('stat-filtered-wrap');
    const fs = document.getElementById('stat-filtered');
    if (q || activeFilter !== 'all') {
        fw.style.display = 'flex'; fs.textContent = visible;
    } else { fw.style.display = 'none'; }
}

// ── Category tag helper ──
function catTag(cat) {
    const map = {
        'Mobile': { cls: 'cat-mobile', icon: 'fa-mobile-screen-button', label: 'المحمول' },
        'Fixed':  { cls: 'cat-fixed',  icon: 'fa-phone',                label: 'الأرضي' },
        'Adsl':   { cls: 'cat-adsl',   icon: 'fa-wifi',                 label: 'إنترنت' },
        'We-Pay': { cls: 'cat-pay',    icon: 'fa-wallet',               label: 'WE Pay' },
    };
    const m = map[cat] || { cls: 'cat-default', icon: 'fa-tag', label: cat || 'عام' };
    return `<span class="cat-tag ${m.cls}"><i class="fa-solid ${m.icon}" style="font-size:10px"></i>${m.label}</span>`;
}

// ── Render card ──
function buildCard(item) {
    const cat   = item.category || item.cat || '';
    const title = item.title || 'بدون عنوان';
    const desc  = item.description || item.desc || '';
    const link  = item.link || item.url || item.file_url || '#';

    const card = document.createElement('div');
    card.className = 'form-card';
    card.dataset.cat   = cat;
    card.dataset.title = title.toLowerCase();

    card.innerHTML = `
        <div class="form-header">
            <div class="form-icon-wrap">
                <i class="fa-solid fa-file-pdf"></i>
            </div>
            <div class="form-meta">
                <h3>${title}</h3>
                ${catTag(cat)}
            </div>
        </div>
        ${desc ? `<p class="form-desc">${desc}</p>` : ''}
        <a href="${link}" target="_blank" rel="noopener" class="download-btn">
            <i class="fa-solid fa-download"></i> تحميل / فتح
        </a>`;
    return card;
}

// ── Render hook ──
window.renderForms = function(data) {
    const container = document.getElementById('formsContainer');
    container.innerHTML = '';
    document.getElementById('stat-total').textContent = data.length;

    if (!data.length) {
        container.innerHTML = '<div class="no-results"><i class="fa-solid fa-folder-open"></i><p>لا توجد نماذج متاحة حالياً.</p></div>';
        return;
    }
    data.forEach(item => container.appendChild(buildCard(item)));
};

window.showFormsError = function() {
    document.getElementById('formsContainer').innerHTML =
        '<div class="no-results"><i class="fa-solid fa-triangle-exclamation"></i><p>حدث خطأ أثناء تحميل البيانات. تحقق من اتصالك وأعد المحاولة.</p></div>';
};
