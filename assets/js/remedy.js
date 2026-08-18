/**
 * Remedy Guide — data layer
 *
 * Tickets now live in Supabase (table: public.remedy_tickets) instead of
 * being hard-coded in this file. Nothing is fetched from the database until
 * assets/js/auth.js has confirmed the session token — this script only ever
 * starts loading data in response to the `authSuccess` event it dispatches
 * (or if that event already fired before this script ran).
 */

let DATA = [];

const SB_TABLE = "remedy_tickets";

function setStatus(text, kind) {
  const bar = document.getElementById("status-bar");
  const label = document.getElementById("status-text");
  if (!bar || !label) return;
  bar.classList.remove("ok", "error");
  if (kind) bar.classList.add(kind);
  label.textContent = text;
}

function render(items) {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  grid.innerHTML = "";

  if (items.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";
    card.onclick = () => openPanel(item);
    card.innerHTML = `
      <div class="card-top">
        <div class="card-path">${item.full_path}</div>
        <div class="card-title">${item.title}</div>
        <div class="card-desc">${item.desc || "لا يوجد وصف متاح"}</div>
      </div>
      <div class="card-footer">
        SLA: ${item.sla || "N/A"}
      </div>
    `;
    grid.appendChild(card);
  });
}

function doSearch() {
  const q = document.getElementById("srch").value.toLowerCase();
  const filtered = DATA.filter(
    (item) =>
      (item.title || "").toLowerCase().includes(q) ||
      (item.desc || "").toLowerCase().includes(q) ||
      (item.full_path || "").toLowerCase().includes(q),
  );
  render(filtered);
}

function openPanel(item) {
  document.getElementById("p-title").innerText = item.title;
  document.getElementById("p-path").innerText = item.full_path;
  document.getElementById("p-desc").innerText = item.desc || "لا يوجد وصف متاح";
  document.getElementById("p-action").innerText = item.action || "لا يوجد إجراء محدد";
  document.getElementById("p-sla").innerText = item.sla || "N/A";

  document.getElementById("overlay").classList.add("open");
}

function closePanel() {
  document.getElementById("overlay").classList.remove("open");
}

/**
 * Maps a Supabase row (schema: title, description, full_path, category,
 * sla, action) onto the shape the rest of this file expects (desc).
 */
function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    desc: row.description,
    full_path: row.full_path,
    category: row.category,
    sla: row.sla,
    action: row.action,
  };
}

async function loadTickets() {
  setStatus("جاري تحميل المسارات من قاعدة البيانات...");

  const sb = window._sbClient;
  if (!sb) {
    setStatus("تعذر الاتصال بقاعدة البيانات — الجلسة غير موثقة", "error");
    return;
  }

  try {
    const { data, error } = await sb
      .from(SB_TABLE)
      .select("id, title, description, full_path, category, sla, action")
      .order("category", { ascending: true });

    if (error) throw error;

    DATA = (data || []).map(mapRow);
    render(DATA);

    setStatus(`تم تحميل ${DATA.length} مسار بنجاح`, "ok");
    setTimeout(() => {
      const bar = document.getElementById("status-bar");
      if (bar) bar.style.display = "none";
    }, 2000);
  } catch (err) {
    console.error("Remedy: failed to load tickets from Supabase", err);
    setStatus("حدث خطأ أثناء تحميل البيانات، برجاء إعادة تحميل الصفحة", "error");
  }
}

/**
 * Only start loading data once the auth guard has confirmed the token.
 * auth.js verifies the session against Supabase and, on success, sets
 * window._sbClient / window._sbUser and dispatches `authSuccess`. If that
 * event already fired before this script executed, window._sbClient will
 * already be set and we can load immediately.
 */
function whenAuthed(callback) {
  if (window._sbClient) {
    callback();
    return;
  }
  window.addEventListener("authSuccess", callback, { once: true });
}

whenAuthed(loadTickets);
