// ========================================
//  WE-Core · pdf.js (النسخة الشاملة والنهائية)
// ========================================

const SUPABASE_URL = "https://dfbzovrwaxrzsskbvmfs.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYnpvdnJ3YXhyenNza2J2bWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjQzNjIsImV4cCI6MjA5MDY0MDM2Mn0.5LDy-m4WHViSOqlasypBn1sohXcTuCS8y2PENCTy60M";
const BUCKET_NAME = "ALL FORM";
const TRANSLATE_API = "https://api.mymemory.translated.net/get";

// 1. القاموس اليدوي الشامل (بناءً على الملفات المرفوعة) 
const customDictionary = {
    // المصطلحات الأساسية
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

    // أسماء الملفات المترجمة 
    "cancellation adsl": "إلغاء خدمة الإنترنت المنزلي", [cite: 1]
    "cash receipt": "إيصال نقدي", [cite: 2]
    "router installment approval": "إقرار تقسيط الراوتر", [cite: 3]
    "landline internet fine contract": "عقد غرامة إنترنت أرضي", [cite: 4]
    "ntra fore new landlaien": "نموذج تنظيم الاتصالات - أرضي جديد", [cite: 5]
    "ntra fore old landlaien": "نموذج تنظيم الاتصالات - أرضي قديم", [cite: 6]
    "personal data modification form": "نموذج تعديل بيانات شخصية", [cite: 7]
    "request to transfer adsl phone number": "طلب نقل رقم الإنترنت المنزلي", [cite: 8]
    "request to transfer adsl service from another provider": "طلب تحويل الإنترنت من مشغل آخر", [cite: 9]
    "guide 140": "دليل 140", [cite: 10]
    "home personal number service subscription form": "نموذج اشتراك خدمة الرقم الشخصي المنزلي", [cite: 11]
    "request for a new landline": "طلب خط أرضي جديد", [cite: 12]
    "request for transfer of landline telephone line": "طلب نقل خط تليفون أرضي", [cite: 13]
    "request to cancel a landline telephone service": "طلب إلغاء خدمة التليفون الأرضي", [cite: 14]
    "request to pay phone bills in installments": "طلب تقسيط فواتير التليفون", [cite: 15]
    "request to subscribe to additional mobile packages": "طلب اشتراك باقات موبايل إضافية", [cite: 16]
    "request to transfer landline telephone": "طلب نقل تليفون أرضي", [cite: 17]
    "requesting added features and services": "طلب خدمات ومميزات إضافية", [cite: 18]
    "added a new landline for an existing we gold customer": "إضافة أرضي لعميل وي جولد حالي", [cite: 19]
    "approval of temporary suspension of the billing line": "إقرار تعليق مؤقت لخط الفاتورة", [cite: 20]
    "cancel mnp": "إلغاء طلب تحويل الرقم", [cite: 21]
    "contract for providing promotional call services for individual lines": "عقد خدمات ترويجية للأفراد", [cite: 22]
    "declaration of 12 months": "إقرار 12 شهر", [cite: 23]
    "diplomatic pledge and declaration": "تعهد وإقرار دبلوماسي", [cite: 24]
    "e sim": "شريحة إلكترونية", [cite: 25]
    "more than one line form for the customer": "نموذج أكثر من خط للعميل", [cite: 27]
    "ownership transfer form": "نموذج نقل ملكية", [cite: 28]
    "parental approval": "موافقة ولي الأمر", [cite: 29]
    "request to add a new landline for a new we gold customer": "طلب أرضي جديد لعميل وي جولد جديد", [cite: 30]
    "request to add an existing landline for a new we gold customer": "إضافة أرضي حالي لعميل وي جولد جديد", [cite: 31]
    "request to cancel a prepaid sim card": "إلغاء شريحة كارت مدفوع مقدماً", [cite: 32]
    "request to cancel wallet": "طلب إغلاق محفظة إلكترونية", [cite: 33]
    "request to cancel we gold line": "طلب إلغاء خط وي جولد", [cite: 34]
    "request to transfer ownership of student data sim card": "نقل ملكية شريحة بيانات طلاب", [cite: 35]
    "sim swap": "استبدال شريحة" [cite: 36]
};

// 2. إدارة الكاش
let translationCache = JSON.parse(localStorage.getItem("translationCache")) || {};

function saveCache() {
    localStorage.setItem("translationCache", JSON.stringify(translationCache));
}

// 3. تنظيف النصوص
function cleanAndPrepareText(text) {
    if (!text) return "";
    return text
        .replace(/\.pdf$/i, "")
        .replace(/[-_]/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim();
}

// 4. منطق الترجمة
function smartTranslateFromDict(text) {
    const cleanText = cleanAndPrepareText(text).toLowerCase();
    
    // محاولة تطابق كامل للمصطلح أولاً
    if (customDictionary[cleanText]) return customDictionary[cleanText];

    // ترجمة كلمة بكلمة
    const words = cleanText.split(/\s+/);
    const translatedWords = words.map(word => customDictionary[word] || word);
    
    return translatedWords.join(" ");
}

function postProcessTranslation(translated) {
    if (!translated) return "";
    let res = translated.replace(/\s+/g, " ").trim();
    res = res.replace(/ال\s+ال/g, "ال");
    
    const needsAL = ["خدمة", "نموذج", "طلب", "استمارة", "شكوى"];
    if (needsAL.includes(res)) res = "ال" + res;
    
    return res;
}

// 5. دالة الترجمة الرئيسية
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
        if (!res.ok) throw new Error("API Error");
        
        const data = await res.json();
        let translated = data?.responseData?.translatedText || cleaned;
        
        translated = postProcessTranslation(translated);
        translationCache[text] = translated;
        saveCache();
        return translated;

    } catch (error) {
        return cleaned; 
    }
}

// 6. دوال الربط مع Supabase
function bucketApiUrl() {
    return `${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET_NAME)}`;
}

function publicUrl(prefix, filename) {
    const filePath = prefix ? `${prefix}/${filename}` : filename;
    return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET_NAME)}/${filePath}`;
}

const HEADERS = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SUPABASE_ANON}`,
    "apikey": SUPABASE_ANON,
};

async function listFiles(prefix = "") {
    try {
        const res = await fetch(bucketApiUrl(), {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify({
                prefix: prefix ? prefix + "/" : "",
                limit: 500,
                sortBy: { column: "name", order: "asc" },
            }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.filter(f => f.name && f.name.toLowerCase().endsWith(".pdf"));
    } catch (err) { return []; }
}

async function listFolders() {
    try {
        const res = await fetch(bucketApiUrl(), {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify({ prefix: "", limit: 100 }),
        });
        const data = await res.json();
        return data.filter(f => f.id === null && f.name && !f.name.includes(".")).map(f => f.name);
    } catch { return []; }
}

// 7. العرض والفلترة
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
    
    if (forms.length === 0) {
        container.innerHTML = "<p class='no-results'>لا توجد نماذج حالياً</p>";
        return;
    }

    container.innerHTML = forms.map(form => `
        <div class="form-card" data-category="${form.category}">
            <div class="form-header">
                <i class="fas fa-file-pdf form-icon"></i>
                <h3>${form.title}</h3>
            </div>
            <p class="form-size">${form.size || ""}</p>
            <a class="download-btn" href="viewpdf.html?src=${encodeURIComponent(form.link)}">
                <i class="fas fa-eye"></i> عرض النموذج
            </a>
        </div>
    `).join("");
}

// 8. تهيئة التطبيق
async function init() {
    const container = document.getElementById("formsContainer");
    if (container) container.innerHTML = "<div class='loader'>جاري تحميل البيانات...</div>";

    const rawForms = [];
    const folders = await listFolders();
    
    const tasks = [...folders, ""].map(async (folder) => {
        const files = await listFiles(folder);
        files.forEach(f => {
            rawForms.push({
                filename: f.name,
                category: detectCategory(folder || f.name),
                size: f.metadata ? (f.metadata.size / 1024).toFixed(1) + " KB" : "",
                link: publicUrl(folder, f.name)
            });
        });
    });

    await Promise.all(tasks);

    for (let form of rawForms) {
        form.title = await translateOne(form.filename);
    }

    renderCards(rawForms);
}

// دوال التحكم
window.filterForms = (category) => {
    document.querySelectorAll(".form-card").forEach(card => {
        card.style.display = (category === "all" || card.dataset.category === category) ? "block" : "none";
    });
};

window.searchForms = () => {
    const term = document.getElementById("searchInput")?.value.toLowerCase() || "";
    document.querySelectorAll(".form-card").forEach(card => {
        const title = card.querySelector("h3").textContent.toLowerCase();
        card.style.display = title.includes(term) ? "block" : "none";
    });
};

init();
