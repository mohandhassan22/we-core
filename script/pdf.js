// ========================================
//  WE-Core · pdf.js
//  Supabase Storage "ALL FORM" → كروت PDF
// ========================================

const SUPABASE_URL  = "https://dfbzovrwaxrzsskbvmfs.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYnpvdnJ3YXhyenNza2J2bWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjQzNjIsImV4cCI6MjA5MDY0MDM2Mn0.5LDy-m4WHViSOqlasypBn1sohXcTuCS8y2PENCTy60M";
const BUCKET_NAME   = "ALL FORM";

// ─────────────────────────────────────────────
//  الفولدرات داخل الـ bucket وتصنيفها
//  لو ملفاتك كلها في الـ root بدون فولدرات،
//  خلّي FOLDERS = [{ path: "", category: "all" }]
// ─────────────────────────────────────────────
const FOLDERS = [
  { path: "mobile",   category: "mobile"   },
  { path: "landline", category: "landline" },
  { path: "adsl",     category: "Adsl"     },
  { path: "",         category: "all"      },   // ملفات في الـ root
];

// cache الترجمة
const translationCache = {};

// ─── جلب قائمة الملفات من Supabase ───
async function listFiles(prefix) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET_NAME)}`,
    {
      method : "POST",
      headers: {
        "Content-Type" : "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON}`,
        "apikey"       : SUPABASE_ANON,
      },
      body: JSON.stringify({
        prefix : prefix ? prefix + "/" : "",
        limit  : 200,
        offset : 0,
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  // نرجع PDF فقط، نتجاهل الفولدرات (id === null)
  return data.filter(f => f.name && f.name.toLowerCase().endsWith(".pdf"));
}

// ─── رابط عام للملف ───
function publicUrl(prefix, filename) {
  const path = prefix ? `${prefix}/${filename}` : filename;
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET_NAME)}/${path}`;
}

// ─── ترجمة أسماء الملفات بـ Claude AI (دفعة واحدة) ───
async function translateNames(names) {
  const toTranslate = names.filter(n => !translationCache[n]);
  if (!toTranslate.length) return;

  const prompt = `أنت مساعد لترجمة أسماء ملفات PDF لشركة اتصالات مصرية (WE).
القواعد:
- أزل امتداد .pdf
- حوّل الشرطات والشرطات السفلية إلى مسافات
- ترجم إلى عربية واضحة مناسبة لخدمات الاتصالات
- أعد JSON فقط بدون أي نص إضافي بالشكل: {"اسم_الملف.pdf": "الترجمة العربية"}

الأسماء للترجمة:
${toTranslate.map(n => `- ${n}`).join("\n")}`;

  try {
    const res  = await fetch("https://api.anthropic.com/v1/messages", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({
        model     : "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages  : [{ role: "user", content: prompt }],
      }),
    });
    const data  = await res.json();
    const text  = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    Object.assign(translationCache, JSON.parse(clean));
  } catch {
    // fallback: تنظيف الاسم بدون ترجمة
    toTranslate.forEach(n => {
      translationCache[n] = n.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
    });
  }
}

// ─── تنسيق الحجم ───
function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ─── رسم الكروت ───
function renderCards(forms) {
  const container = document.getElementById("formsContainer");
  container.innerHTML = "";

  if (!forms.length) {
    container.innerHTML = `
      <div class="no-results">
        <i class="fas fa-folder-open"></i>
        <p>لا توجد نماذج</p>
      </div>`;
    return;
  }

  forms.forEach(form => {
    const viewerSrc = encodeURIComponent(form.link);
    container.innerHTML += `
      <div class="form-card" data-category="${form.category}">
        <div class="form-header">
          <i class="fas fa-file-pdf form-icon"></i>
          <h3>${form.title}</h3>
        </div>
        ${form.size ? `<p class="form-size"><i class="fas fa-weight-hanging"></i> ${form.size}</p>` : ""}
        <a class="download-btn" href="viewpdf.html?src=${viewerSrc}">
          <i class="fas fa-eye"></i> عرض النموذج
        </a>
      </div>`;
  });
}

// ─── تصفية ───
let currentCategory = "all";
let allForms = [];

function filterForms(category) {
  currentCategory = category;
  document.querySelectorAll(".form-card").forEach(card => {
    const show = category === "all" || card.dataset.category === category;
    card.style.display = show ? "" : "none";
  });
}

// ─── بحث ───
function searchForms() {
  const term = document.getElementById("searchInput").value.toLowerCase().trim();
  let found  = false;

  document.querySelectorAll(".form-card").forEach(card => {
    const title    = card.querySelector("h3").textContent.toLowerCase();
    const catMatch = currentCategory === "all" || card.dataset.category === currentCategory;
    const show     = catMatch && (!term || title.includes(term));
    card.style.display = show ? "" : "none";
    if (show) found = true;
  });

  if (!found && term) {
    document.getElementById("formsContainer").innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <p>لا توجد نتائج لـ "${term}"</p>
      </div>`;
  }
}

// ─── التهيئة ───
async function init() {
  const container = document.getElementById("formsContainer");
  container.innerHTML = `
    <div class="no-results">
      <i class="fas fa-spinner fa-spin"></i>
      <p>جاري تحميل النماذج...</p>
    </div>`;

  // جلب الملفات من كل الفولدرات (بدون تكرار)
  const seen    = new Set();
  const rawForms = [];

  // نجرّب الفولدرات المحددة أولاً
  for (const { path, category } of FOLDERS) {
    const files = await listFiles(path);
    for (const f of files) {
      const key = path + "/" + f.name;
      if (seen.has(key)) continue;
      seen.add(key);
      rawForms.push({
        filename: f.name,
        category: category !== "all" ? category : detectCategory(f.name),
        folder  : path,
        size    : formatSize(f.metadata?.size),
        link    : publicUrl(path, f.name),
      });
    }
  }

  if (!rawForms.length) {
    container.innerHTML = `
      <div class="no-results">
        <i class="fas fa-exclamation-circle"></i>
        <p>لم يتم العثور على ملفات — تأكد من اسم الـ bucket والـ RLS Policy</p>
      </div>`;
    return;
  }

  // ترجمة الأسماء
  await translateNames(rawForms.map(f => f.filename));

  allForms = rawForms.map(f => ({
    ...f,
    title: translationCache[f.filename]
      || f.filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " "),
  }));

  renderCards(allForms);
}

// ─── تخمين التصنيف من اسم الملف لو مش في فولدر ───
function detectCategory(name) {
  const n = name.toLowerCase();
  if (n.includes("mobile") || n.includes("sim") || n.includes("mnp") || n.includes("invoice")) return "mobile";
  if (n.includes("land") || n.includes("fixed") || n.includes("ardy"))  return "landline";
  if (n.includes("adsl") || n.includes("internet") || n.includes("dsl")) return "Adsl";
  return "all";
}

// ─── تشغيل ───
init();
