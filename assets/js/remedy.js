/**
 * Remedy Guide — data layer
 *
 * Tickets live in Supabase (table: public.remedy_tickets) but this page
 * never queries that table directly. Instead it calls the shared Edge
 * Function (the same one auth.js already trusts) with action
 * "get_remedy_tickets". The function re-verifies the session token on the
 * server before touching the database — this script only ever calls it
 * after assets/js/auth.js has confirmed the token client-side, so nothing
 * is requested until the token is known to be valid.
 */

let DATA = [];

// ── Edge Function endpoint ──────────────────────────────────────────
// Same Supabase project as auth.js (SB_URL there). Replace FUNCTION_NAME
// with the actual slug your function is deployed under
// (Supabase Dashboard → Edge Functions).
const SB_URL = "https://iygwhapcpdmsasqlfelv.supabase.co";
const SB_ANON_KEY = "sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP";
const FUNCTION_NAME = "hyper-task"; // 
const EDGE_FUNCTION_URL = `${SB_URL}/functions/v1/${FUNCTION_NAME}`;

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

/** Reads a cookie value by name (mirrors the helper in auth.js). */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

/**
 * Maps an Edge Function row (title, description, full_path, category,
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

  const token = getCookie("sb-access-token");
  if (!token) {
    setStatus("تعذر تحميل البيانات — الجلسة غير موثقة", "error");
    return;
  }

  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SB_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "get_remedy_tickets" }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(payload?.error || `HTTP ${res.status}`);
    }

    DATA = (payload.tickets || []).map(mapRow);
    render(DATA);

    setStatus(`تم تحميل ${DATA.length} مسار بنجاح`, "ok");
    setTimeout(() => {
      const bar = document.getElementById("status-bar");
      if (bar) bar.style.display = "none";
    }, 2000);
  } catch (err) {
    console.error("Remedy: failed to load tickets from Edge Function", err);
    setStatus("حدث خطأ أثناء تحميل البيانات، برجاء إعادة تحميل الصفحة", "error");
  }
}

/**
 * Only start loading data once the auth guard (assets/js/auth.js) has
 * confirmed the token. It verifies the session against Supabase and, on
 * success, dispatches `authSuccess` on window. If that event already
 * fired before this script executed, window._sbClient will already be
 * set and we can load immediately — either way, nothing is requested
 * from the Edge Function before the token is confirmed valid.
 */
function whenAuthed(callback) {
  if (window._sbClient) {
    callback();
    return;
  }
  window.addEventListener("authSuccess", callback, { once: true });
}

whenAuthed(loadTickets);
