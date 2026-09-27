// إعدادات الربط مع Supabase
const SUPABASE_URL  = "https://iygwhapcpdmsasqlfelv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z3doYXBjcGRtc2FzcWxmZWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDk5MDQsImV4cCI6MjA4NjkyNTkwNH0.jqU1fEc9kBkXcCfazH6aTnS2XWWzPv0bbixHZgjtrnQ";
const BUCKET_NAME   = "All Form";
const TRANSLATE_API = `${SUPABASE_URL}/functions/v1/translate-gemini`;
const BATCH_SIZE    = 5; // عدد الملفات في كل دفعة

// جلب التوكن من الكوكيز
function getAuthToken() {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; sb-access-token=`);
  if (parts.length === 2) return parts.pop().split(";").shift().replace(/"/g, "");
  return null;
}

// نظام التخزين المؤقت للترجمة لتسريع الأداء
let translationCache = JSON.parse(localStorage.getItem("translationCache") || "{}");
function saveCache() { localStorage.setItem("translationCache", JSON.stringify(translationCache)); }

// تحكم بمعدل الطلبات لتفادي خطأ 429 (تم رفع الفترة إلى 16 ثانية للأمان)
let lastGeminiCall = 0;
const MIN_GAP_MS = 16000; 
async function throttleGemini() {
  const wait = MIN_GAP_MS - (Date.now() - lastGeminiCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastGeminiCall = Date.now();
}

// دالة الترجمة الذكية مع نظام إعادة المحاولة (Retry) عند حدوث خطأ 429 أو 502
async function translateBatch(rawNames, retries = 3) {
  const cleanedList = rawNames.map(n => n.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim());
  const result = {};
  const toFetch = [];

  cleanedList.forEach(c => {
    const key = c.toLowerCase();
    if (translationCache[key]) result[c] = translationCache[key];
    else toFetch.push(c);
  });

  if (toFetch.length === 0) return result;

  for (let attempt = 1; attempt <= retries; attempt++) {
    await throttleGemini();

    try {
      const res = await fetch(TRANSLATE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON}`,
          "apikey": SUPABASE_ANON
        },
        body: JSON.stringify({ texts: toFetch })
      });

      // إذا حدث خطأ 429 (ضغط طلبات)، انتظر وأعد المحاولة
      if (res.status === 429 && attempt < retries) {
        console.warn(`Rate limited (429). Retrying attempt ${attempt + 1} after 20 seconds...`);
        await new Promise(r => setTimeout(r, 20000));
        continue;
      }

      const data = await res.json();
      if (!res.ok || !Array.isArray(data?.translations)) {
        console.warn("Batch translation failed:", data);
        if (attempt === retries) {
          toFetch.forEach(c => { result[c] = c; });
          return result;
        }
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }

      toFetch.forEach((c, i) => {
        const t = data.translations[i] || c;
        translationCache[c.toLowerCase()] = t;
        result[c] = t;
      });
      saveCache();
      return result;

    } catch (e) {
      console.warn(`Batch translation error (Attempt ${attempt}):`, e);
      if (attempt === retries) {
        toFetch.forEach(c => { result[c] = c; });
        return result;
      }
      await new Promise(r => setTimeout(r, 5000)); // انتظار قصير قبل إعادة المحاولة
    }
  }

  toFetch.forEach(c => { result[c] = c; });
  return result;
}

// دالة مساعدة لجلب قائمة العناصر بحد أقصى وإزاحة (Pagination)
async function fetchStorageList(prefix = "", limit = 100, offset = 0) {
  const token = getAuthToken() || SUPABASE_ANON;
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET_NAME)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_ANON
      },
      body: JSON.stringify({ prefix, limit, offset })
    }
  );
  if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
  return await res.json();
}

// مصفوفة عامة لحفظ كافة الملفات المحملة
let allLoadedForms = [];

// الدالة الرئيسية لجلب الملفات على دفعات (5 ملفات لكل دفعة)
async function fetchPdfsInBatches(onBatchLoaded) {
  try {
    // 1. جلب قائمة المجلدات بالكامل أولاً
    const initialList = await fetchStorageList("", 100, 0);
    const folderNames = initialList
      .filter(item => !item.id && !item.name.includes("."))
      .map(f => f.name);

    // إضافة الجذر "" كأول مجلد
    const prefixes = ["", ...folderNames];

    // 2. المرور على المجلدات وجلب الملفات بـ Batch Size = 5
    for (const prefix of prefixes) {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const items = await fetchStorageList(prefix ? prefix + "/" : "", BATCH_SIZE, offset);

        if (!Array.isArray(items) || items.length === 0) {
          hasMore = false;
          break;
        }

        // تصفية ملفات PDF فقط
        const pdfFiles = items.filter(item => item.name.toLowerCase().endsWith(".pdf"));

        if (pdfFiles.length > 0) {
          // ترجمة كل أسماء الدفعة بطلب واحد مع آلية المعالجة الآمنة
          const titleMap = await translateBatch(pdfFiles.map(f => f.name));
          const batchResults = pdfFiles.map(f => {
            const folderCategory = prefix || "عام";
            const fullPath = prefix ? `${prefix}/${f.name}` : f.name;
            const cleaned = f.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim();
            return {
              filename: f.name,
              fullPath: fullPath,
              category: folderCategory,
              title: titleMap[cleaned] || cleaned,
              size: f.metadata ? (f.metadata.size / 1024).toFixed(1) + " KB" : ""
            };
          });

          // تمرير الدفعة المكتملة لواجهة المستخدم مباشرة
          onBatchLoaded(batchResults);
        }

        // إذا كان عدد العناصر المجلوبة أقل من الـ Batch Size فهذا يعني نهاية العناصر في هذا المجلد
        if (items.length < BATCH_SIZE) {
          hasMore = false;
        } else {
          offset += BATCH_SIZE;
        }
      }
    }
  } catch (e) {
    console.error("Batch Fetch Error:", e);
  }
}

// ── مساعد: تحديد tag الفئة ──
function catTag(cat) {
  const map = {
    "Mobile": { cls: "cat-mobile", icon: "fa-mobile-screen-button", label: "المحمول" },
    "Fixed":  { cls: "cat-fixed",  icon: "fa-phone",                label: "الأرضي"  },
    "Adsl":   { cls: "cat-adsl",   icon: "fa-wifi",                 label: "إنترنت"  },
    "عام":    { cls: "cat-default", icon: "fa-tag",                 label: "عام"     },
  };
  const m = map[cat] || { cls: "cat-default", icon: "fa-tag", label: cat || "عام" };
  return `<span class="cat-tag ${m.cls}">
    <i class="fa-solid ${m.icon}" style="font-size:10px"></i>${m.label}
  </span>`;
}

// ── عرض الكروت بالتصميم الجديد ──
function renderCards(forms) {
  const container = document.getElementById("formsContainer");
  if (!container) return;

  const statTotal = document.getElementById("stat-total");
  if (statTotal) statTotal.textContent = forms.length;

  if (!forms.length) {
    container.innerHTML = `
      <div class="no-results">
        <i class="fa-solid fa-folder-open"></i>
        <p>لا توجد نماذج متاحة حالياً في هذا القسم.</p>
      </div>`;
    return;
  }

  const viewUrl = form =>
    `viewpdf.html?src=${encodeURIComponent(
      `${SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET_NAME}/${form.fullPath}`
    )}`;

  container.innerHTML = forms.map(form => `
    <div class="form-card" data-category="${form.category}" data-title="${(form.title || '').toLowerCase()}">
      <div class="form-header">
        <div class="form-icon-wrap">
          <i class="fa-solid fa-file-pdf"></i>
        </div>
        <div class="form-meta">
          <h3>${form.title || form.filename}</h3>
          ${catTag(form.category)}
        </div>
      </div>
      ${form.size ? `<p class="form-desc"><i class="fa-solid fa-hard-drive" style="font-size:11px;margin-left:4px;color:var(--text3)"></i>${form.size}</p>` : ""}
      <a href="${viewUrl(form)}" class="download-btn">
        <i class="fa-solid fa-eye"></i> عرض النموذج
      </a>
    </div>`).join("");
}

// ── بدء التشغيل ──
async function init() {
  const container = document.getElementById("formsContainer");
  allLoadedForms = [];

  // Skeleton أثناء التحميل المبدئي
  if (container) {
    container.innerHTML = `
      ${[1, 2, 3].map(() => `
        <div class="skel-card">
          <div class="skel-line" style="width:30%;height:42px;border-radius:10px"></div>
          <div class="skel-line" style="width:88%"></div>
          <div class="skel-line" style="width:55%"></div>
          <div class="skel-line" style="width:100%;height:36px;border-radius:9px;margin-top:4px"></div>
        </div>`).join("")}`;
  }

  // البدء في جلب الملفات دفعات (5 بـ 5)
  await fetchPdfsInBatches((newBatch) => {
    // إضافة العناصر الجديدة للمصفوفة العامة
    allLoadedForms.push(...newBatch);

    // إعادة تطبيق البحث والفلترة الحاليين لإظهار العناصر الجديدة فوراً
    const activeBtn = document.querySelector(".filter-btn.active");
    const currentCat = activeBtn?.dataset?.folder || "all";
    
    renderCards(allLoadedForms);
    window.filterForms(currentCat, activeBtn);
  });
}

// ── الفلترة والبحث ──
window.filterForms = (cat, btn) => {
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const q = (document.getElementById("searchInput")?.value || "").toLowerCase();
  let visible = 0;

  document.querySelectorAll(".form-card").forEach(c => {
    const matchCat = cat === "all" || c.dataset.category === cat;
    const matchQ   = !q || (c.dataset.title || "").includes(q);
    const show = matchCat && matchQ;
    c.style.display = show ? "" : "none";
    if (show) visible++;
  });

  const fw = document.getElementById("stat-filtered-wrap");
  const fs = document.getElementById("stat-filtered");
  if (fw && fs) {
    if (cat !== "all" || q) {
      fw.style.display = "flex";
      fs.textContent = visible;
    } else {
      fw.style.display = "none";
    }
  }
};

window.searchForms = () => {
  const activeBtn = document.querySelector(".filter-btn.active");
  const currentCat = activeBtn?.dataset?.folder || "all";
  window.filterForms(currentCat, activeBtn);
};

// تنفيذ الكود
init();
```[cite: 1]
