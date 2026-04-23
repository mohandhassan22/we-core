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
    // 1. طلب قائمة الملفات والمجلدات من المستوى الأول (Root)
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
    console.log("Storage Root Response:", data);

    // تصفية المجلدات (التي ليس لها id أو لا تحتوي على نقطة امتداد)
    const folders = data.filter(item => !item.id && !item.name.includes("."));
    
    // تصفية الملفات الموجودة في الـ Root مباشرة
    const rootFiles = data.filter(item => item.name.toLowerCase().endsWith(".pdf"));
    rootFiles.forEach(f => {
      results.push({
        filename: f.name,
        fullPath: f.name,
        category: "عام",
        size: f.metadata ? (f.metadata.size / 1024).toFixed(1) + " KB" : "Unknown"
      });
    });

    // 2. الدخول لكل مجلد (Adsl, Fixed, Mobile) وجلب ملفاته
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
        console.log(`Contents of [${folder.name}]:`, subData);

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

// عرض الكروت في الصفحة
function renderCards(forms) {
  const container = document.getElementById("formsContainer");
  if (!container) return;

  if (!forms.length) {
    container.innerHTML = `<div class="no-data">لا توجد نماذج متاحة حالياً في Bucket [${BUCKET_NAME}]</div>`;
    return;
  }

  container.innerHTML = forms.map(form => `
    <div class="form-card" data-category="${form.category}">
      <div class="card-icon"><i class="fa-solid fa-file-pdf"></i></div>
      <div class="card-info">
        <h3>${form.title}</h3>
        <span class="file-size">${form.size}</span>
      </div>
      <a href="viewpdf.html?src=${encodeURIComponent(`${SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET_NAME}/${form.fullPath}`)}" class="form-btn">
          عرض النموذج
      </a>
    </div>`).join("");
}

// بدء التشغيل
async function init() {
  const container = document.getElementById("formsContainer");
  if (container) container.innerHTML = `<div class="loading">جاري جلب النماذج من التخزين...</div>`;

  const rawForms = await fetchAllPdfs();
  console.log("Total PDFs detected:", rawForms.length);

  // ترجمة العناوين قبل العرض
  for (const form of rawForms) {
    form.title = await translateOne(form.filename);
  }

  renderCards(rawForms);
}

// الفلترة والبحث (Global Functions)
window.filterForms = (cat) => {
  document.querySelectorAll(".form-card").forEach(c => {
    c.style.display = (cat === "all" || c.dataset.category === cat) ? "block" : "none";
  });
};

window.searchForms = () => {
  const term = document.getElementById("searchInput").value.toLowerCase();
  document.querySelectorAll(".form-card").forEach(c => {
    const title = c.querySelector("h3").textContent.toLowerCase();
    c.style.display = title.includes(term) ? "block" : "none";
  });
};

// تنفيذ الكود
init();
