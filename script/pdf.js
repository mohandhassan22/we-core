// ========================================
//  WE-Core · pdf.js
//  Supabase Storage "ALL FORM" → كروت PDF
// ========================================

const SUPABASE_URL  = "https://dfbzovrwaxrzsskbvmfs.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYnpvdnJ3YXhyenNza2J2bWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjQzNjIsImV4cCI6MjA5MDY0MDM2Mn0.5LDy-m4WHViSOqlasypBn1sohXcTuCS8y2PENCTy60M";

// اسم الـ bucket بالظبط — المسافة بتتحول %20 في الـ URL تلقائياً
const BUCKET_NAME = "ALL FORM";

// ─── رابط الـ API مع encode صح ───
function bucketApiUrl() {
  // بنعمل encode للاسم يدوياً عشان نضمن المسافة تبقى %20
  return `${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET_NAME)}`;
}

// ─── رابط الملف العام ───
function publicUrl(prefix, filename) {
  const filePath = prefix ? `${prefix}/${filename}` : filename;
  // المسافة في اسم الـ bucket لازم تبقى %20
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET_NAME)}/${filePath}`;
}

// ─── headers مشتركة ───
const HEADERS = {
  "Content-Type" : "application/json",
  "Authorization": `Bearer ${SUPABASE_ANON}`,
  "apikey"       : SUPABASE_ANON,
};

// ─── جلب الملفات من prefix معين ───
async function listFiles(prefix = "") {
  try {
    const res = await fetch(bucketApiUrl(), {
      method : "POST",
      headers: HEADERS,
      body   : JSON.stringify({
        prefix : prefix ? prefix + "/" : "",
        limit  : 200,
        offset : 0,
        sortBy : { column: "name", order: "asc" },
      }),
    });

    if (!res.ok) {
      console.error(`listFiles(${prefix}) → ${res.status}`, await res.text());
      return [];
    }

    const data = await res.json();
    // نرجع PDF فقط ونتجاهل الفولدرات (اللي id بتاعها null)
    return data.filter(f => f.name && f.name.toLowerCase().endsWith(".pdf"));
  } catch (err) {
    console.error("listFiles error:", err);
    return [];
  }
}

// ─── جلب الفولدرات الموجودة في الـ root ───
async function listFolders() {
  try {
    const res = await fetch(bucketApiUrl(), {
      method : "POST",
      headers: HEADERS,
      body   : JSON.stringify({ prefix: "", limit: 100, offset: 0 }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    // الفولدرات بيكون id بتاعها null وname بدون .pdf
    return data
      .filter(f => f.id === null && f.name && !f.name.includes("."))
      .map(f => f.name);
  } catch {
    return [];
  }
}

// ─── تخمين التصنيف من اسم الفولدر أو الملف ───
function detectCategory(folderOrFile) {
  const n = (folderOrFile || "").toLowerCase();
  if (n.includes("Mobile") || n.includes("sim") || n.includes("mnp"))   return "Mobile";
  if (n.includes("Land")   || n.includes("fixed") || n.includes("ardy")) return "Landline";
  if (n.includes("Adsl")   || n.includes("internet") || n.includes("dsl")) return "Adsl";
  return "all";
}

// ─── cache الترجمة ───
const translationCache = {};

// ─── تنظيف اسم الملف قبل الترجمة ───
function cleanFilename(name) {
  return name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim();
}

// ─── ترجمة اسم واحد عبر MyMemory (مجاني بدون API key) ───
async function translateOne(text) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ar`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error("network");
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (translated && translated !== text) return translated;
  } catch { /* fallback */ }
  return text;
}

// ─── ترجمة كل الأسماء بالتوازي ───
async function translateNames(names) {
  const toTranslate = names.filter(n => !translationCache[n]);
  if (!toTranslate.length) return;

  await Promise.all(
    toTranslate.map(async (name) => {
      const clean      = cleanFilename(name);
      const translated = await translateOne(clean);
      translationCache[name] = translated;
    })
  );

  console.log("✅ Translated:", toTranslate.length, "names via MyMemory");
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
        ${form.size ? `<p class="form-size"><i class="fas fa-hdd"></i> ${form.size}</p>` : ""}
        <a class="download-btn" href="viewpdf.html?src=${viewerSrc}">
          <i class="fas fa-eye"></i> عرض النموذج
        </a>
      </div>`;
  });
}

// ─── تصفية ───
let currentCategory = "all";

function filterForms(category) {
  currentCategory = category;
  document.querySelectorAll(".form-card").forEach(card => {
    card.style.display =
      (category === "all" || card.dataset.category === category) ? "" : "none";
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

// ─── التهيئة الرئيسية ───
async function init() {
  const container = document.getElementById("formsContainer");
  container.innerHTML = `
    <div class="no-results">
      <i class="fas fa-spinner fa-spin"></i>
      <p>جاري تحميل النماذج…</p>
    </div>`;

  const rawForms = [];
  const seen     = new Set();

  // 1. اكتشف الفولدرات الموجودة تلقائياً
  const folders = await listFolders();
  console.log("📁 folders found:", folders);

  if (folders.length > 0) {
    // عندنا فولدرات — نجيب ملفات كل فولدر
    for (const folder of folders) {
      const files = await listFiles(folder);
      for (const f of files) {
        const key = folder + "/" + f.name;
        if (seen.has(key)) continue;
        seen.add(key);
        rawForms.push({
          filename: f.name,
          category: detectCategory(folder),
          folder,
          size    : formatSize(f.metadata?.size),
          link    : publicUrl(folder, f.name),
        });
      }
    }
  }

  // 2. جيب برضو الملفات في الـ root (بدون فولدر)
  const rootFiles = await listFiles("");
  for (const f of rootFiles) {
    if (seen.has(f.name)) continue;
    seen.add(f.name);
    rawForms.push({
      filename: f.name,
      category: detectCategory(f.name),
      folder  : "",
      size    : formatSize(f.metadata?.size),
      link    : publicUrl("", f.name),
    });
  }

  console.log("📄 total files found:", rawForms.length);

  if (!rawForms.length) {
    container.innerHTML = `
      <div class="no-results">
        <i class="fas fa-exclamation-circle"></i>
        <p>لم يتم العثور على ملفات</p>
        <small>تأكد من أن الـ bucket اسمه "ALL FORM" وعنده Public policy</small>
      </div>`;
    return;
  }

  // ترجمة الأسماء بـ Claude AI
  await translateNames(rawForms.map(f => f.filename));

  const allForms = rawForms.map(f => ({
    ...f,
    title: translationCache[f.filename]
      || f.filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " "),
  }));

  renderCards(allForms);
}

// ─── expose للـ HTML ───
window.filterForms = filterForms;
window.searchForms = searchForms;

// ─── تشغيل ───
init();
