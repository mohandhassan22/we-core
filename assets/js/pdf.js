// إعدادات الربط مع Supabase
const SUPABASE_URL  = "https://iygwhapcpdmsasqlfelv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z3doYXBjcGRtc2FzcWxmZWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDk5MDQsImV4cCI6MjA4NjkyNTkwNH0.jqU1fEc9kBkXcCfazH6aTnS2XWWzPv0bbixHZgjtrnQ";
const BUCKET_NAME   = "All Form";
const TRANSLATE_API = "https://api.mymemory.translated.net/get";
const BATCH_SIZE    = 5; // عدد الملفات في كل دفعة

// القاموس المحدث والمصحح تقنياً لشركة WE
const customDictionary = {
  "mobile": "موبايل",
  "sim card": "شريحة",
  "mnp": "تحويل رقم",
  "adsl": "إنترنت منزلي",
  "form": "نموذج",
  "service": "خدمة",
  "complaint": "شكوى",
  "customer": "عميل",
  "request": "طلب",
  "cancel": "إلغاء",
  "subscription": "اشتراك",
  "transfer": "نقل",
  "ownership": "ملكية",
  "sim swap": "استبدال شريحة",
  "fixed": "الخط الأرضي",
  "cancellation adsl": "إلغاء الإنترنت المنزلي",
  "cash receipt": "إيصال نقدي",
  "router installment approval": "إقرار تقسيط الراوتر",
  "landline internet fine contract": "عقد غرامة الإنترنت الأرضي",
  "ntra_fore-new-landlaien": "الجهاز القومي لتنظيم الاتصالات - أرضي جديد",
  "ntra_fore-old-landlaien": "الجهاز القومي لتنظيم الاتصالات - أرضي قديم",
  "personal data modification form": "نموذج تعديل البيانات الشخصية",
  "request to transfer adsl phone number": "طلب نقل رقم الإنترنت المنزلي",
  "request to transfer adsl service from another provider": "طلب نقل خدمة الإنترنت المنزلي من مشغل آخر",
  "guide 140": "دليل 140",
  "home personal number service subscription form": "نموذج اشتراك خدمة الرقم الشخصي المنزلي",
  "request for a new landline": "طلب خط أرضي جديد",
  "request for transfer of landline telephone line": "طلب تحويل خط تليفون أرضي",
  "request to cancel a landline telephone service": "طلب إلغاء خدمة التليفون الأرضي",
  "request to pay phone bills in installments": "طلب تقسيط فواتير التليفون",
  "request to subscribe to additional mobile packages": "طلب اشتراك في باقات موبايل إضافية",
  "request to transfer landline telephone": "طلب نقل تليفون أرضي",
  "requesting added features and services": "طلب ميزات وخدمات مضافة",
  "added a new landline for an existing we gold customer": "إضافة خط أرضي جديد لعميل وي جولد حالي",
  "approval of temporary suspension of the billing line": "إقرار تعليق مؤقت لخط الفاتورة",
  "cancel mnp": "إلغاء تحويل الرقم",
  "contract for providing promotional call services for individual lines": "عقد تقديم خدمات مكالمات ترويجية لخطوط الأفراد",
  "declaration of 12 months": "إقرار 12 شهر",
  "diplomatic pledge and declaration": "تعهد وإقرار دبلوماسي",
  "e-sim": "شريحة إلكترونية",
  "more than one line form for the customer": "نموذج أكثر من خط للعميل",
  "ownership transfer form": "نموذج نقل الملكية",
  "parental approval": "موافقة ولي الأمر",
  "request to add a new landline for a new we gold customer": "طلب إضافة خط أرضي جديد لعميل وي جولد جديد",
  "request to add an existing landline for a new we gold customer": "طلب إضافة خط أرضي حالي لعميل وي جولد جديد",
  "request to cancel a prepaid sim card": "طلب إلغاء شريحة مسبقة الدفع",
  "request to cancel wallet": "طلب إلغاء المحفظة الإلكترونية",
  "request to cancel we gold line": "طلب إلغاء خط وي جولد",
  "request to transfer ownership of student data sim card": "طلب نقل ملكية شريحة بيانات الطلاب"
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
          const batchResults = [];
          for (const f of pdfFiles) {
            const folderCategory = prefix || "عام";
            const fullPath = prefix ? `${prefix}/${f.name}` : f.name;
            const title = await translateOne(f.name);

            batchResults.push({
              filename: f.name,
              fullPath: fullPath,
              category: folderCategory,
              title: title,
              size: f.metadata ? (f.metadata.size / 1024).toFixed(1) + " KB" : ""
            });
          }

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
