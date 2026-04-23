// إعدادات الربط مع Supabase
const SUPABASE_URL  = "https://iygwhapcpdmsasqlfelv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z3doYXBjcGRtc2FzcWxmZWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDk5MDQsImV4cCI6MjA4NjkyNTkwNH0.jqU1fEc9kBkXcCfazH6aTnS2XWWzPv0bbixHZgjtrnQ";
const BUCKET_NAME   = "All Form";
const TRANSLATE_API = "https://api.mymemory.translated.net/get";

// قاموس مخصص للمصطلحات التقنية لشركة WE
const customDictionary = {
  "mobile": "موبايل", "sim card": "شريحة", "mnp": "تحويل رقم", "adsl": "إنترنت منزلي",
  "form": "نموذج", "service": "خدمة", "complaint": "شكوى", "customer": "عميل",
  "request": "طلب", "cancel": "إلغاء", "subscription": "اشتراك", "transfer": "نقل",
  "ownership": "ملكية", "sim swap": "استبدال شريحة", "fixed": "الخط الأرضي"
};

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

// دالة الترجمة الذكية
async function translateOne(text) {
  const cleaned = text.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim();
  if (translationCache[cleaned.toLowerCase()]) return translationCache[cleaned.toLowerCase()];

  const dictMatch = customDictionary[cleaned.toLowerCase()];
  if (dictMatch) {
    translationCache[cleaned.toLowerCase()] = dictMatch;
    saveCache();
    return dictMatch;
  }

  try {
    const res = await fetch(`${TRANSLATE_API}?q=${encodeURIComponent(cleaned)}&langpair=en|ar`);
    const data = await res.json();
    const translated = data?.responseData?.translatedText || cleaned;
    translationCache[cleaned.toLowerCase()] = translated;
    saveCache();
    return translated;
  } catch { return cleaned; }
}

// الدالة الرئيسية لجلب الملفات من المجلدات
async function fetchAllPdfs() {
  const token = getAuthToken() || SUPABASE_ANON;
  const results = [];

  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET_NAME)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": SUPABASE_ANON
        },
        body: JSON.stringify({ prefix: "", limit: 100 })
      }
    );

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();

    const folders   = data.filter(item => !item.id && !item.name.includes("."));
    const rootFiles = data.filter(item => item.name.toLowerCase().endsWith(".pdf"));

    rootFiles.forEach(f => {
      results.push({
        filename: f.name,
        fullPath: f.name,
        category: "عام",
        size: f.metadata ? (f.metadata.size / 1024).toFixed(1) + " KB" : ""
      });
    });

    for (const folder of folders) {
      try {
        const subRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET_NAME)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
              "apikey": SUPABASE_ANON
            },
            body: JSON.stringify({ prefix: folder.name + "/", limit: 100 })
          }
        );

        const subData = await subRes.json();
        if (Array.isArray(subData)) {
          subData
            .filter(f => f.name.toLowerCase().endsWith(".pdf"))
            .forEach(f => {
              results.push({
                filename: f.name,
                fullPath: `${folder.name}/${f.name}`,
                category: folder.name,
                size: f.metadata ? (f.metadata.size / 1024).toFixed(1) + " KB" : ""
              });
            });
        }
      } catch (err) {
        console.error(`Error fetching folder ${folder.name}:`, err);
      }
    }
  } catch (e) {
    console.error("General Fetch Error:", e);
  }

  return results;
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

  // تحديث عداد الإجمالي لو موجود في الصفحة
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

  // skeleton أثناء التحميل
  if (container) {
    container.innerHTML = `
      ${[1,2,3].map(() => `
        <div class="skel-card">
          <div class="skel-line" style="width:30%;height:42px;border-radius:10px"></div>
          <div class="skel-line" style="width:88%"></div>
          <div class="skel-line" style="width:55%"></div>
          <div class="skel-line" style="width:100%;height:36px;border-radius:9px;margin-top:4px"></div>
        </div>`).join("")}`;
  }

  const rawForms = await fetchAllPdfs();

  // ترجمة العناوين
  for (const form of rawForms) {
    form.title = await translateOne(form.filename);
  }

  renderCards(rawForms);
}

// ── الفلترة والبحث ──
window.filterForms = (cat, btn) => {
  // active state للأزرار
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

  // تحديث عداد النتائج
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
  // استدعي filterForms مع الفلتر الحالي
  const activeBtn = document.querySelector(".filter-btn.active");
  const currentCat = activeBtn?.dataset?.folder || "all";
  window.filterForms(currentCat, activeBtn);
};

// تنفيذ الكود
init();
