const SUPABASE_URL  = "https://iygwhapcpdmsasqlfelv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z3doYXBjcGRtc2FzcWxmZWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDk5MDQsImV4cCI6MjA4NjkyNTkwNH0.jqU1fEc9kBkXcCfazH6aTnS2XWWzPv0bbixHZgjtrnQ";
const BUCKET_NAME   = "All Form";
const TRANSLATE_API = "https://api.mymemory.translated.net/get";

const customDictionary = {
  "mobile":"موبايل","sim card":"شريحة","mnp":"تحويل رقم","adsl":"إنترنت منزلي",
  "form":"نموذج","service":"خدمة","complaint":"شكوى","customer":"عميل",
  "request":"طلب","cancel":"إلغاء","subscription":"اشتراك","transfer":"نقل",
  "ownership":"ملكية","sim swap":"استبدال شريحة"
};

function getAuthToken() {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; sb-access-token=`);
  if (parts.length === 2) return parts.pop().split(";").shift().replace(/"/g,"");
  return null;
}

let translationCache = JSON.parse(localStorage.getItem("translationCache") || "{}");
function saveCache() { localStorage.setItem("translationCache", JSON.stringify(translationCache)); }

async function translateOne(text) {
  const cleaned = text.replace(/\.pdf$/i,"").replace(/[-_]/g," ").trim();
  if (translationCache[cleaned]) return translationCache[cleaned];
  const dictMatch = customDictionary[cleaned.toLowerCase()];
  if (dictMatch) { translationCache[cleaned] = dictMatch; saveCache(); return dictMatch; }
  try {
    const res  = await fetch(`${TRANSLATE_API}?q=${encodeURIComponent(cleaned)}&langpair=en|ar`);
    const data = await res.json();
    const translated = data?.responseData?.translatedText || cleaned;
    translationCache[cleaned] = translated;
    saveCache();
    return translated;
  } catch { return cleaned; }
}

// ✅ الدالة الجديدة - تجيب كل الفايلات دفعة واحدة
async function fetchAllPdfs() {
  const token = getAuthToken() || SUPABASE_ANON;
  const results = [];

  // أولاً: جرب تجيب كل حاجة من الـ root
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
        body: JSON.stringify({ prefix: "", limit: 500 })
      }
    );
    const data = await res.json();
    console.log("Root response:", data);

    if (!Array.isArray(data)) {
      console.error("Supabase error:", data);
      return [];
    }

    // افصل بين الفولدرات والفايلات
    const folders = data.filter(f => f.id === null || !f.name.includes("."));
    const files   = data.filter(f => f.name && f.name.toLowerCase().endsWith(".pdf"));

    // الفايلات اللي في الـ root مباشرة
    files.forEach(f => results.push({
      filename: f.name,
      fullPath: f.name,
      category: "General",
      size: f.metadata ? (f.metadata.size / 1024).toFixed(1) + " KB" : ""
    }));

    // الفولدرات: جيب محتواها
    for (const folder of folders) {
      const folderName = folder.name;
      try {
        const r2 = await fetch(
          `${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET_NAME)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
              "apikey": SUPABASE_ANON
            },
            body: JSON.stringify({ prefix: folderName + "/", limit: 500 })
          }
        );
        const subData = await r2.json();
        console.log(`Folder [${folderName}]:`, subData);

        if (Array.isArray(subData)) {
          subData
            .filter(f => f.name && f.name.toLowerCase().endsWith(".pdf"))
            .forEach(f => results.push({
              filename: f.name,
              fullPath: `${folderName}/${f.name}`,
              category: folderName,
              size: f.metadata ? (f.metadata.size / 1024).toFixed(1) + " KB" : ""
            }));
        }
      } catch (e) {
        console.error(`Error in folder ${folderName}:`, e);
      }
    }
  } catch (e) {
    console.error("fetchAllPdfs error:", e);
  }

  return results;
}

function renderCards(forms) {
  const container = document.getElementById("formsContainer");
  if (!forms.length) {
    container.innerHTML = "لا توجد نماذج متاحة حالياً";
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

async function init() {
  const container = document.getElementById("formsContainer");
  if (container) container.innerHTML = "جاري تحميل البيانات...";

  const rawForms = await fetchAllPdfs();
  console.log("Total PDFs found:", rawForms.length);

  for (const form of rawForms) {
    form.title = await translateOne(form.filename);
  }

  renderCards(rawForms);
}

window.filterForms = (cat) => {
  document.querySelectorAll(".form-card").forEach(c =>
    c.style.display = (cat === "all" || c.dataset.category === cat) ? "block" : "none"
  );
};

window.searchForms = () => {
  const term = document.getElementById("searchInput").value.toLowerCase();
  document.querySelectorAll(".form-card").forEach(c =>
    c.style.display = c.querySelector("h3").textContent.toLowerCase().includes(term) ? "block" : "none"
  );
};

init();
