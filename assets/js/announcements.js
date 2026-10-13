/* WE-Core – Home-page announcements widget
 * Shows active notices from public.announcements right after login.
 * A notice is visible only between starts_at and expires_at (RLS enforces it too).
 */
(function () {
  const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
  const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
  const host = () => document.getElementById('announcementsHost');
  let loaded = false;

  function cookie(name) {
    const p = `; ${document.cookie}`.split(`; ${name}=`);
    return p.length === 2 ? p.pop().split(';').shift() : null;
  }
  const dismissKey = id => 'ann_dismissed_' + id;
  const isDismissed = id => { try { return sessionStorage.getItem(dismissKey(id)) === '1'; } catch (e) { return false; } };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* **bold** -> <strong>, everything else stays plain text (no innerHTML) */
  function richLine(text) {
    const p = el('p', 'ann-line');
    String(text).split(/(\*\*[^*]+\*\*)/g).forEach(part => {
      if (!part) return;
      if (part.startsWith('**') && part.endsWith('**')) p.appendChild(el('strong', 'ann-strong', part.slice(2, -2)));
      else p.appendChild(document.createTextNode(part));
    });
    return p;
  }

  function daysLeft(expires) {
    const ms = new Date(expires).getTime() - Date.now();
    return Math.max(Math.ceil(ms / 86400000), 0);
  }

  function render(a) {
    const card = el('article', 'ann-card');
    card.dataset.id = a.id;

    const head = el('div', 'ann-head');
    const icon = el('div', 'ann-icon');
    const i = el('i', 'fa-solid fa-' + String(a.icon || 'bell').replace(/[^a-z0-9-]/gi, ''));
    icon.appendChild(i);
    const titles = el('div', 'ann-titles');
    titles.appendChild(el('h3', 'ann-title', a.title));
    const meta = el('div', 'ann-meta');
    if (a.source) meta.appendChild(el('span', 'ann-source', a.source));
    const d = daysLeft(a.expires_at);
    meta.appendChild(el('span', 'ann-left', d <= 1 ? 'آخر يوم للعرض' : `يظهر لمدة ${d} أيام أخرى`));
    titles.appendChild(meta);
    const close = el('button', 'ann-close');
    close.type = 'button';
    close.title = 'إخفاء الآن';
    close.setAttribute('aria-label', 'إخفاء التنبيه');
    close.appendChild(el('i', 'fa-solid fa-xmark'));
    close.addEventListener('click', () => {
      try { sessionStorage.setItem(dismissKey(a.id), '1'); } catch (e) {}
      card.classList.add('ann-out');
      setTimeout(() => card.remove(), 250);
    });
    head.append(icon, titles, close);
    card.appendChild(head);

    const body = el('div', 'ann-body');
    String(a.body || '').split('\n').filter(Boolean).forEach(line => body.appendChild(richLine(line)));
    card.appendChild(body);

    const t = a.table_data;
    if (t && Array.isArray(t.headers) && Array.isArray(t.rows)) {
      const wrap = el('div', 'ann-table-wrap');
      const table = el('table', 'ann-table');
      const trh = el('tr');
      t.headers.forEach(h => trh.appendChild(el('th', null, h)));
      table.appendChild(el('thead')).appendChild(trh);
      const tb = el('tbody');
      t.rows.forEach(r => {
        const tr = el('tr');
        r.forEach(c => tr.appendChild(el('td', null, c)));
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      wrap.appendChild(table);
      card.appendChild(wrap);
    }
    return card;
  }

  async function load() {
    if (loaded) return;
    const token = cookie('sb-access-token');
    const h = host();
    if (!token || !h) return;
    loaded = true;
    try {
      const nowIso = new Date().toISOString();
      const url = `${SB_URL}/rest/v1/announcements?select=id,title,body,table_data,icon,source,expires_at` +
        `&is_active=eq.true&starts_at=lte.${encodeURIComponent(nowIso)}&expires_at=gt.${encodeURIComponent(nowIso)}` +
        `&order=created_at.desc&limit=5`;
      const res = await fetch(url, { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      if (!res.ok) { console.warn('WE-Core: announcements', res.status); return; }
      const rows = (await res.json()).filter(a => !isDismissed(a.id));
      h.replaceChildren(...rows.map(render));
    } catch (e) {
      console.warn('WE-Core: announcements failed', e);
    }
  }

  window.addEventListener('authSuccess', load);
  if (window._sbUser) load();
})();
