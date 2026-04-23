// الإعدادات الأساسية
const SUPABASE_URL = "https://iygwhapcpdmsasqlfelv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z3doYXBjcGRtc2FzcWxmZWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDk5MDQsImV4cCI6MjA4NjkyNTkwNH0.jqU1fEc9kBkXcCfazH6aTnS2XWWzPv0bbixHZgjtrnQ";
const BUCKET_NAME = "All Form";
const TRANSLATE_API = "https://api.mymemory.translated.net/get";

// دالة جلب التوكن من الكوكيز
function getAuthToken() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; sb-access-token=`);
    if (parts.length === 2) return parts.pop().split(';').shift().replace(/"/g, '');
    return null;
}

// القاموس اليدوي للترجمة
const customDictionary = {
    "mobile": "موبايل",
    "sim card": "شريحة",
    "mnp": "تحويل رقم",
    "landline": "خط أرضي",
    "fixed": "ثابت",
    "ardy": "أرضي",
    "adsl": "إنترنت منزلي",
    "internet": "إنترنت",
    "dsl": "دي إس إل",
    "form": "نموذج",
    "service": "خدمة",
    "complaint": "شكوى",
    "customer": "عميل",
    "request": "طلب",
    "cancel": "إلغاء",
    "subscription": "اشتراك",
    "transfer": "نقل",
    "ownership": "ملكية",
    "cancellation adsl": "إلغاء خدمة الإنترنت المنزلي",
    "cash receipt": "إيصال نقدي",
    "router installment approval": "إقرار تقسيط الراوتر",
    "landline internet fine contract": "عقد غرامة إنترنت أرضي",
    "ntra fore new landlaien": "نموذج تنظيم الاتصالات - أرضي جديد",
    "ntra fore old landlaien": "نموذج تنظيم الاتصالات - أرضي قديم",
    "personal data modification form": "نموذج تعديل بيانات شخصية",
    "request to transfer adsl phone number": "طلب نقل رقم الإنترنت المنزلي",
    "request to transfer adsl service from another provider": "طلب تحويل الإنترنت من مشغل آخر",
    "guide 140": "دليل 140",
    "home personal number service subscription form": "نموذج اشتراك خدمة الرقم الشخصي المنزلي",
    "request for a new landline": "طلب خط أرضي جديد",
    "request for transfer of landline telephone line": "طلب نقل خط تليفون أرضي",
    "request to cancel a landline telephone service": "طلب إلغاء خدمة التليفون الأرضي",
    "request to pay phone bills in installments": "طلب تقسيط فواتير التليفون",
    "request to subscribe to additional mobile packages": "طلب اشتراك باقات موبايل إضافية",
    "request to transfer landline telephone": "طلب نقل تليفون أرضي",
    "requesting added features and services": "طلب خدمات ومميزات إضافية",
    "added a new landline for an existing we gold customer": "إضافة أرضي لعميل وي جولد حالي",
    "approval of temporary suspension of the billing line": "إقرار تعليق مؤقت لخط الفاتورة",
    "cancel mnp": "إلغاء طلب تحويل الرقم",
    "contract for providing promotional call services for individual lines": "عقد خدمات ترويجية للأفراد",
    "declaration of 12 months": "إقرار 12 شهر",
    "diplomatic pledge and declaration": "تعهد وإقرار دبلوماسي",
    "e sim": "شريحة إلكترونية",
    "more than one line form for the customer": "نموذج أكثر من خط للعميل",
    "ownership transfer form": "نموذج نقل ملكية",
    "parental approval": "موافقة ولي الأمر",
    "request to add a new landline for a new we gold customer": "طلب أرضي جديد لعميل وي جولد جديد",
    "request to add an existing landline for a new we gold customer": "إضافة أرضي حالي لعميل وي جولد جديد",
    "request to cancel a prepaid sim card": "إلغاء شريحة كارت مدفوع مقدماً",
    "request to cancel wallet": "طلب إغلاق محفظة إلكترونية",
    "request to cancel we gold line": "طلب إلغاء خط وي جولد",
    "request to transfer ownership of student data sim card": "نقل ملكية شريحة بيانات طلاب",
    "sim swap": "استبدال شريحة"
};


// وظائف الترجمة والتحضير
let translationCache = JSON.parse(localStorage.getItem("translationCache")) || {};
function saveCache() { localStorage.setItem("translationCache", JSON.stringify(translationCache)); }

async function translateOne(text) {
    const cleaned = text.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim();
    if (translationCache[cleaned]) return translationCache[cleaned];
    
    // محاولة الترجمة من القاموس أولاً
    const dictMatch = customDictionary[cleaned.toLowerCase()];
    if (dictMatch) {
        translationCache[cleaned] = dictMatch;
        saveCache();
        return dictMatch;
    }
    
    // الترجمة عبر API لو لم يوجد في القاموس
    try {
        const res = await fetch(`${TRANSLATE_API}?q=${encodeURIComponent(cleaned)}&langpair=en|ar`);
        const data = await res.json();
        const translated = data?.responseData?.translatedText || cleaned;
        translationCache[cleaned] = translated;
        saveCache();
        return translated;
    } catch { return cleaned; }
}

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
    const rawForms = [];
    // جلب المجلدات والملفات
    const folders = ["Adsl", "Fixed", "Mobile"]; // مجلداتك المكتشفة من الصورة
    
    for (const folder of [...folders, ""]) {
        const files = await listFiles(folder);
        files.forEach(f => {
            rawForms.push({
                filename: f.name,
                fullPath: folder ? `${folder}/${f.name}` : f.name,
                category: folder || "General",
                size: f.metadata ? (f.metadata.size / 1024).toFixed(1) + " KB" : ""
            });
        });
    }

    for (let form of rawForms) { form.title = await translateOne(form.filename); }
    renderCards(rawForms);
}

// وظائف البحث والفلترة
window.filterForms = (cat) => {
    document.querySelectorAll(".form-card").forEach(c => c.style.display = (cat === 'all' || c.dataset.category === cat) ? 'block' : 'none');
};
window.searchForms = () => {
    const term = document.getElementById("searchInput").value.toLowerCase();
    document.querySelectorAll(".form-card").forEach(c => c.style.display = c.querySelector("h3").textContent.toLowerCase().includes(term) ? 'block' : 'none');
};

init();
