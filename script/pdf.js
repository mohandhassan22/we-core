// ========================================
//  WE-Core · pdf.js (النسخة الاحترافية)
// ========================================

const SUPABASE_URL = "https://iygwhapcpdmsasqlfelv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z3doYXBjcGRtc2FzcWxmZWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDk5MDQsImV4cCI6MjA4NjkyNTkwNH0.jqU1fEc9kBkXcCfazH6aTnS2XWWzPv0bbixHZgjtrnQ";
const BUCKET_NAME = "All Form";
const TRANSLATE_API = "https://api.mymemory.translated.net/get";

// 1. القاموس اليدوي الشامل لترجمة المصطلحات التقنية
const customDictionary = {
    "mobile": "موبايل", "sim card": "شريحة", "mnp": "تحويل رقم", "adsl": "إنترنت منزلي",
    "form": "نموذج", "service": "خدمة", "complaint": "شكوى", "customer": "عميل",
    "request": "طلب", "cancel": "إلغاء", "subscription": "اشتراك", "transfer": "نقل",
    "ownership": "ملكية", "sim swap": "استبدال شريحة"
};

// 2. دالة استخراج التوكن من الكوكيز لضمان الأمان
function getAuthToken() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; sb-access-token=`);
    if (parts.length === 2) return parts.pop().split(';').shift().replace(/"/g, '');
    return null;
}

// 3. إدارة الكاش والترجمة
let translationCache = JSON.parse(localStorage.getItem("translationCache")) || {};
function saveCache() { localStorage.setItem("translationCache", JSON.stringify(translationCache)); }

async function translateOne(text) {
    const cleaned = text.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim();
    if (translationCache[cleaned]) return translationCache[cleaned];
    const dictMatch = customDictionary[cleaned.toLowerCase()];
    if (dictMatch) {
        translationCache[cleaned] = dictMatch;
        saveCache();
        return dictMatch;
    }
    try {
        const res = await fetch(`${TRANSLATE_API}?q=${encodeURIComponent(cleaned)}&langpair=en|ar`);
        const data = await res.json();
        const translated = data?.responseData?.translatedText || cleaned;
        translationCache[cleaned] = translated;
        saveCache();
        return translated;
    } catch { return cleaned; }
}

// 4. التعامل مع Supabase Storage
async function listFiles(prefix = "") {
    const token = getAuthToken() || SUPABASE_ANON;
    try {
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET_NAME)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "apikey": SUPABASE_ANON },
            body: JSON.stringify({ prefix: prefix ? prefix + "/" : "", limit: 500 })
        });
        const data = await res.json();
        return data.filter(f => f.name && f.name.toLowerCase().endsWith(".pdf"));
    } catch { return []; }
}

async function listFolders() {
    const token = getAuthToken() || SUPABASE_ANON;
    try {
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET_NAME)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "apikey": SUPABASE_ANON },
            body: JSON.stringify({ prefix: "", limit: 100 })
        });
        const data = await res.json();
        return data.filter(f => f.id === null && !f.name.includes(".")).map(f => f.name);
    } catch { return []; }
}

// 5. عرض الكروت
function renderCards(forms) {
    const container = document.getElementById("formsContainer");
    container.innerHTML = forms.map(form => `
        <div class="form-card" data-category="${form.category}">
            <div class="form-header"><i class="fas fa-file-pdf form-icon"></i><h3>${form.title}</h3></div>
            <p class="form-size">${form.size}</p>
            <a class="download-btn" href="viewpdf.html?path=${encodeURIComponent(form.fullPath)}">
                <i class="fas fa-eye"></i> عرض النموذج
            </a>
        </div>`).join("");
}

async function init() {
    const container = document.getElementById("formsContainer");
    if (container) container.innerHTML = "<div class='loader'>جاري تحميل البيانات...</div>";
    const rawForms = [];
    const folders = await listFolders();
    for (const folder of [...folders, ""]) {
        const files = await listFiles(folder);
        files.forEach(f => rawForms.push({
            filename: f.name,
            fullPath: folder ? `${folder}/${f.name}` : f.name,
            category: (folder || "General"),
            size: f.metadata ? (f.metadata.size / 1024).toFixed(1) + " KB" : ""
        }));
    }
    for (let form of rawForms) { form.title = await translateOne(form.filename); }
    renderCards(rawForms);
}

// 6. الفلترة والبحث
window.filterForms = (cat) => {
    document.querySelectorAll(".form-card").forEach(c => c.style.display = (cat === 'all' || c.dataset.category === cat) ? 'block' : 'none');
};
window.searchForms = () => {
    const term = document.getElementById("searchInput").value.toLowerCase();
    document.querySelectorAll(".form-card").forEach(c => c.style.display = c.querySelector("h3").textContent.toLowerCase().includes(term) ? 'block' : 'none');
};

init();
