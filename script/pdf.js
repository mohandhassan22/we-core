// ========================================
//  WE-Core · pdf.js (النسخة المصححة برمجياً)
// ========================================

const SUPABASE_URL = "https://dfbzovrwaxrzsskbvmfs.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYnpvdnJ3YXhyenNza2J2bWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjQzNjIsImV4cCI6MjA5MDY0MDM2Mn0.5LDy-m4WHViSOqlasypBn1sohXcTuCS8y2PENCTy60M";
const BUCKET_NAME = "ALL FORM";
const TRANSLATE_API = "https://api.mymemory.translated.net/get";

// 1. القاموس اليدوي الشامل - تم تنظيفه من مراجع الـ [cite] التي تسبب الخطأ
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

// باقي الكود (إدارة الكاش، الترجمة، Supabase، والتشغيل) بنفس المنطق السابق
let translationCache = JSON.parse(localStorage.getItem("translationCache")) || {};
function saveCache() { localStorage.setItem("translationCache", JSON.stringify(translationCache)); }
function cleanAndPrepareText(text) { if (!text) return ""; return text.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim(); }

function smartTranslateFromDict(text) {
    const cleanText = cleanAndPrepareText(text).toLowerCase();
    if (customDictionary[cleanText]) return customDictionary[cleanText];
    const words = cleanText.split(/\s+/);
    return words.map(word => customDictionary[word] || word).join(" ");
}

function postProcessTranslation(translated) {
    if (!translated) return "";
    let res = translated.replace(/\s+/g, " ").trim();
    res = res.replace(/ال\s+ال/g, "ال");
    const needsAL = ["خدمة", "نموذج", "طلب", "استمارة", "شكوى"];
    if (needsAL.includes(res)) res = "ال" + res;
    return res;
}

async function translateOne(text) {
    if (!text) return "";
    if (translationCache[text]) return translationCache[text];
    const cleaned = cleanAndPrepareText(text);
    try {
        const dictResult = smartTranslateFromDict(cleaned);
        if (dictResult !== cleaned.toLowerCase()) {
            const final = postProcessTranslation(dictResult);
            translationCache[text] = final;
            saveCache();
            return final;
        }
        const url = `${TRANSLATE_API}?q=${encodeURIComponent(cleaned)}&langpair=en|ar`;
        const res = await fetch(url);
        const data = await res.json();
        let translated = postProcessTranslation(data?.responseData?.translatedText || cleaned);
        translationCache[text] = translated;
        saveCache();
        return translated;
    } catch (e) { return cleaned; }
}

function bucketApiUrl() { return `${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET_NAME)}`; }
function publicUrl(p, f) { return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET_NAME)}/${p ? p + "/" : ""}${f}`; }
const HEADERS = { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_ANON}`, "apikey": SUPABASE_ANON };

async function listFiles(prefix = "") {
    try {
        const res = await fetch(bucketApiUrl(), { method: "POST", headers: HEADERS, body: JSON.stringify({ prefix: prefix ? prefix + "/" : "", limit: 500 }) });
        const data = await res.json();
        return data.filter(f => f.name && f.name.toLowerCase().endsWith(".pdf"));
    } catch (err) { return []; }
}

async function listFolders() {
    try {
        const res = await fetch(bucketApiUrl(), { method: "POST", headers: HEADERS, body: JSON.stringify({ prefix: "", limit: 100 }) });
        const data = await res.json();
        return data.filter(f => f.id === null && !f.name.includes(".")).map(f => f.name);
    } catch { return []; }
}

function detectCategory(name) {
    const n = (name || "").toLowerCase();
    if (n.includes("mobile") || n.includes("sim") || n.includes("mnp")) return "Mobile";
    if (n.includes("land") || n.includes("fixed") || n.includes("ardy")) return "Landline";
    if (n.includes("adsl") || n.includes("internet") || n.includes("dsl")) return "Adsl";
    return "all";
}

function renderCards(forms) {
    const container = document.getElementById("formsContainer");
    if (!container) return;
    container.innerHTML = forms.map(form => `
        <div class="form-card" data-category="${form.category}">
            <div class="form-header"><i class="fas fa-file-pdf form-icon"></i><h3>${form.title}</h3></div>
            <p class="form-size">${form.size || ""}</p>
            <a class="download-btn" href="viewpdf.html?src=${encodeURIComponent(form.link)}"><i class="fas fa-eye"></i> عرض النموذج</a>
        </div>`).join("");
}

async function init() {
    const container = document.getElementById("formsContainer");
    if (container) container.innerHTML = "<div class='loader'>جاري تحميل البيانات...</div>";
    const rawForms = [];
    const folders = await listFolders();
    const tasks = [...folders, ""].map(async (folder) => {
        const files = await listFiles(folder);
        files.forEach(f => rawForms.push({ filename: f.name, category: detectCategory(folder || f.name), size: f.metadata ? (f.metadata.size / 1024).toFixed(1) + " KB" : "", link: publicUrl(folder, f.name) }));
    });
    await Promise.all(tasks);
    for (let form of rawForms) { form.title = await translateOne(form.filename); }
    renderCards(rawForms);
}

window.filterForms = (category) => { document.querySelectorAll(".form-card").forEach(c => c.style.display = (category === "all" || c.dataset.category === category) ? "block" : "none"); };
window.searchForms = () => {
    const term = document.getElementById("searchInput")?.value.toLowerCase() || "";
    document.querySelectorAll(".form-card").forEach(c => c.style.display = c.querySelector("h3").textContent.toLowerCase().includes(term) ? "block" : "none");
};

init();
