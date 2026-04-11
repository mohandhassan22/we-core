// ========================================
//  WE-Core · pdf.js (النسخة النهائية المصححة)
// ========================================

const SUPABASE_URL = "https://dfbzovrwaxrzsskbvmfs.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYnpvdnJ3YXhyenNza2J2bWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjQzNjIsImV4cCI6MjA5MDY0MDM2Mn0.5LDy-m4WHViSOqlasypBn1sohXcTuCS8y2PENCTy60M";
const BUCKET_NAME = "ALL FORM";
const TRANSLATE_API = "https://api.mymemory.translated.net/get";

// 1. القاموس اليدوي - تم إصلاح الفواصل المفقودة هنا
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
    "all": "الكل",
    "form": "نموذج",
    "service": "خدمة",
    "complaint": "شكوى",
    "customer": "عميل",
    "request": "طلب",
    "transfer ownership": "نقل ملكية",
    "cancel": "إلغاء",
    "subscription": "اشتراك",
    "transfer": "نقل"
};

// 2. إدارة الكاش
let translationCache = JSON.parse(localStorage.getItem("translationCache")) || {};

function saveCache() {
    localStorage.setItem("translationCache", JSON.stringify(translationCache));
}

// 3. تنظيف النصوص (إزالة الامتداد والشرطات)
function cleanAndPrepareText(text) {
    if (!text) return "";
    return text
        .replace(/\.pdf$/i, "")
        .replace(/[-_]/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim();
}

// 4. منطق الترجمة الذكي (القاموس أولاً)
function smartTranslateFromDict(text) {
    const cleanText = cleanAndPrepareText(text).toLowerCase();
    
    // محاولة تطابق كامل للمصطلح (مثل: transfer ownership)
    if (customDictionary[cleanText]) return customDictionary[cleanText];

    // ترجمة كلمة بكلمة إذا لم يوجد تطابق كامل
    const words = cleanText.split(/\s+/);
    const translatedWords = words.map(word => customDictionary[word] || word);
    
    return translatedWords.join(" ");
}

// تحسين جودة اللغة العربية (إضافة ال التعريف وتنظيف المسافات)
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
        // إذا نجح القاموس في ترجمة أي كلمة
        if (dictResult !== cleaned.toLowerCase()) {
            const final = postProcessTranslation(dictResult);
            translationCache[text] = final;
            saveCache();
            return final;
        }

        // استخدام API كحل أخير
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
        console.error("Translation fail:", error);
        return cleaned; 
    }
}

// 6. التعامل مع Supabase
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
                limit: 200,
                sortBy: { column: "name", order: "asc" },
            }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.filter(f => f.name && f.name.toLowerCase().endsWith(".pdf"));
    } catch (err) {
        return [];
    }
}

async function listFolders() {
    try {
        const res = await fetch(bucketApiUrl(), {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify({ prefix: "", limit: 100 }),
        });
        const data = await res.json();
        // المجلدات في Supabase تأتي بـ id: null
        return data.filter(f => f.id === null && f.name && !f.name.includes(".")).map(f => f.name);
    } catch { return []; }
}

// 7. التصنيف وتوليد الكروت
function detectCategory(name) {
    const n = (name || "").toLowerCase();
    if (n.includes("mobile") || n.includes("sim")) return "Mobile";
    if (n.includes("land") || n.includes("fixed") || n.includes("ardy")) return "Landline";
    if (n.includes("adsl") || n.includes("internet") || n.includes("dsl")) return "Adsl";
    return "all";
}

function renderCards(forms) {
    const container = document.getElementById("formsContainer");
    if (!container) return;
    
    if (forms.length === 0) {
        container.innerHTML = "<p class='no-results'>لا توجد نماذج متاحة</p>";
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

// 8. التشغيل الرئيسي
async function init() {
    const container = document.getElementById("formsContainer");
    if (container) container.innerHTML = "<div class='loader'>جاري تحميل النماذج...</div>";

    try {
        const rawForms = [];
        const folders = await listFolders();
        
        // جلب الملفات من المجلدات والجذر بالتوازي
        const folderTasks = [...folders, ""].map(async (folder) => {
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

        await Promise.all(folderTasks);

        // ترجمة العناوين
        for (let form of rawForms) {
            form.title = await translateOne(form.filename);
        }

        renderCards(rawForms);

    } catch (error) {
        console.error("Init error:", error);
        if (container) container.innerHTML = "<p>حدث خطأ أثناء تحميل البيانات.</p>";
    }
}

// وظائف البحث والفلترة العالمية
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

// انطلاق الكود
init();
