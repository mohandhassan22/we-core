// ========================================
//  WE-Core · pdf.js
//  Supabase Storage "ALL FORM" → كروت PDF
// ========================================

const SUPABASE_URL  = "https://dfbzovrwaxrzsskbvmfs.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYnpvdnJ3YXhyenNza2J2bWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjQzNjIsImV4cCI6MjA5MDY0MDM2Mn0.5LDy-m4WHViSOqlasypBn1sohXcTuCS8y2PENCTy60M";

const BUCKET_NAME = "ALL FORM";

// ─── Google Translate API (أقوى وأدق) ───
// استخدام Google Translate عبر MyMemory Translate API الذي يدعم Google
// قاموس ترجمة يدوي للمصطلحات المتكررة لضمان الدقة
// 1. قاموس الترجمة اليدوي (Manual Dictionary)
const manualTranslations = {
  "mobile": "موبايل",
  "sim": "شريحة",
  "mnp": "تحويل رقم",
  "landline": "خط أرضي",
  "fixed": "ثابت",
  "ardy": "أرضي",
  "adsl": "إنترنت منزلي",
  "internet": "إنترنت",
  "dsl": "دي إس إل",
  "all": "الكل"
};

/**
 * دالة الترجمة: تبحث في القاموس أولاً، ثم تستخدم API خارجي
 * @param {string} text - النص المراد ترجمته
 */
async function translateOne(text) {
  if (!text) return "";
  
  const lowerText = text.toLowerCase().trim();

  // أولاً: التحقق من وجود الكلمة في القاموس اليدوي
  if (manualTranslations[lowerText]) {
    return manualTranslations[lowerText];
  }

  // ثانياً: إذا لم توجد، يتم الاستعلام من MyMemory API
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ar`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error("Network response was not ok");
    
    const data = await response.json();
    return data?.responseData?.translatedText || text; // إرجاع النص الأصلي في حال فشل الترجمة
  } catch (error) {
    console.error("Translation Error:", error);
    return text; // في حال حدوث خطأ في الشبكة، نعيد النص الأصلي
  }
}

// --- أمثلة على الاستخدام ---

// استخدام داخل دالة async
(async () => {
  const res1 = await translateOne("mobile");
  console.log("النتيجة 1 (قاموس):", res1); // مخرجات: موبايل

  const res2 = await translateOne("Smart Phone");
  console.log("النتيجة 2 (API):", res2); // مخرجات: هاتف ذكي
})();// ─── رابط API bucket ───
function bucketApiUrl() {
  return `${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET_NAME)}`;
}

// ─── رابط الملف العام ───
function publicUrl(prefix, filename) {
  const filePath = prefix ? `${prefix}/${filename}` : filename;
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(BUCKET_NAME)}/${filePath}`;
}

// ─── headers ───
const HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${SUPABASE_ANON}`,
  "apikey": SUPABASE_ANON,
};

// ─── حفظ الكاش ───
function saveCache() {
  localStorage.setItem(
    "translationCache",
    JSON.stringify(translationCache)
  );
}

// ─── تنظيف وتحضير النص للترجمة ───
function cleanAndPrepareText(text) {
  if (!text) return "";
  
  let cleaned = text
    .replace(/\.pdf$/i, "")      // إزالة امتداد PDF
    .replace(/[-_]/g, " ")       // تحويل الشرطات إلى مسافات
    .replace(/([a-z])([A-Z])/g, "$1 $2")  // فصل CamelCase
    .replace(/\s+/g, " ")        // تنظيف المسافات
    .trim();
  
  return cleaned;
}

function cleanFilename(name) {
  return cleanAndPrepareText(name);
}

// ─── ترجمة ذكية من القاموس ───
function smartTranslateFromDict(text) {
  if (!text) return "";
  
  const cleanText = cleanAndPrepareText(text).toLowerCase();
  
  // البحث عن تطابق كامل
  if (customDictionary[cleanText]) {
    return customDictionary[cleanText];
  }
  
  // تقسيم والبحث عن كل كلمة
  const words = cleanText.split(/\s+/);
  const translatedWords = words.map(word => {
    const normalized = word.toLowerCase().trim();
    if (!normalized) return "";
    return customDictionary[normalized] || word;
  }).filter(w => w);
  
  return translatedWords.join(" ");
}

// ─── تحسين الترجمات وتصحيحها ───
function improveTranslation(translated) {
  if (!translated) return "";
  
  let result = translated.trim();
  
  // تنظيف المسافات الزائدة
  result = result.replace(/\s+/g, " ");
  
  // إصلاح مشاكل شائعة
  result = result.replace(/ال\s+ال/g, "ال");        // إزالة "ال" المكررة
  result = result.replace(/\s+ال\s+/g, " ال ");   // تصحيح مسافات "ال"
  result = result.replace(/،\s+/g, "، ");         // تصحيح الفواصل
  
  // إزالة الكلمات الحشو المترجمة خطأ
  result = result.replace(/\bthe\b/gi, "");
  result = result.replace(/\ba\b/gi, "");
  result = result.replace(/\band\b/gi, "و");
  result = result.replace(/\bor\b/gi, "أو");
  
  // تنظيف النواتج المتكررة
  result = result.replace(/\s\s+/g, " ").trim();
  
  return result;
}

// ─── معالجة خاصة للترجمات - تحسين الجودة ───
function postProcessTranslation(original, translated) {
  if (!translated) return original;
  
  let result = translated;
  
  // تنضيف المسافات الزائدة
  result = result.replace(/\s+/g, " ").trim();
  
  // تصحيح التشكيل الشائع
  result = result.replace(/ال ال/g, "ال");
  
  // إصلاح الترجمات الناقصة
  const wordsNeedingAl = ["خدمة", "نموذج", "طلب", "استمارة", "شكوى"];
  for (const word of wordsNeedingAl) {
    if (result === word && !result.startsWith("ال")) {
      result = "ال" + result;
      break;
    }
  }
  
  return result;
}

// ─── ترجمة اسم واحد (محسّنة جداً) ───
async function translateOne(text) {
  try {
    if (!text) return "";

    // التحقق من الكاش أولاً
    if (translationCache[text]) {
      return translationCache[text];
    }

    const cleanText = cleanAndPrepareText(text);

    // محاولة الترجمة من القاموس أولاً (الطريقة الأسرع والأدق)
    const dictTranslation = smartTranslateFromDict(cleanText);
    if (dictTranslation && dictTranslation !== cleanText.toLowerCase()) {
      translationCache[text] = dictTranslation;
      saveCache();
      return dictTranslation;
    }

    // استخدام API للترجمة
    const encodedText = encodeURIComponent(cleanText);
    const res = await fetch(
      `${TRANSLATE_API}?q=${encodedText}&langpair=en|ar`
    );

    if (!res.ok) {
      throw new Error(`Translation API failed: ${res.status}`);
    }

    const data = await res.json();
    
    // استخراج الترجمة من استجابة API
    let translated = data?.responseData?.translatedText || cleanText;
    
    // معالجة ما بعد الترجمة
    translated = improveTranslation(translated);
    translated = postProcessTranslation(cleanText, translated);

    // إذا كانت النتيجة النهائية فارغة أو لم تتغير، استخدم القاموس
    if (!translated || translated === cleanText.toLowerCase()) {
      translated = smartTranslateFromDict(cleanText) || cleanText;
    }

    // حفظ في الكاش
    translationCache[text] = translated;
    saveCache();

    console.log(`✅ ترجم: "${cleanText}" → "${translated}"`);
    return translated;

  } catch (error) {
    console.error("Translation error:", error);
    
    // Fallback: استخدام القاموس أو النص الأصلي
    const fallback = smartTranslateFromDict(cleanAndPrepareText(text)) || cleanAndPrepareText(text);
    translationCache[text] = fallback;
    saveCache();
    
    return fallback;
  }
}

// ─── ترجمة جميع الأسماء ───
async function translateNames(names) {
  const uniqueNames = [...new Set(names)];

  const toTranslate = uniqueNames.filter(
    name => !translationCache[name]
  );

  if (!toTranslate.length) return;

  await Promise.all(
    toTranslate.map(async (name) => {
      const translated = await translateOne(name);
      translationCache[name] = translated;
    })
  );

  saveCache();

  console.log("✅ translated:", toTranslate.length);
}

// ─── جلب الملفات من folder ───
async function listFiles(prefix = "") {
  try {
    const res = await fetch(bucketApiUrl(), {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        prefix: prefix ? prefix + "/" : "",
        limit: 200,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();

    return data.filter(
      f => f.name && f.name.toLowerCase().endsWith(".pdf")
    );

  } catch (err) {
    console.error(err);
    return [];
  }
}

// ─── جلب الفولدرات ───
async function listFolders() {
  try {
    const res = await fetch(bucketApiUrl(), {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({
        prefix: "",
        limit: 100,
        offset: 0
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();

    return data
      .filter(f => f.id === null && f.name && !f.name.includes("."))
      .map(f => f.name);

  } catch {
    return [];
  }
}

// ─── التصنيف ───
function detectCategory(folderOrFile) {
  const n = (folderOrFile || "").toLowerCase();

  if (n.includes("mobile") || n.includes("sim") || n.includes("mnp")) {
    return "Mobile";
  }

  if (n.includes("land") || n.includes("fixed")) {
    return "Landline";
  }

  if (n.includes("adsl") || n.includes("internet")) {
    return "Adsl";
  }

  return "all";
}

// ─── الحجم ───
function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) {
    return Math.round(bytes / 1024) + " KB";
  }
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ─── رسم الكروت ───
function renderCards(forms) {
  const container = document.getElementById("formsContainer");
  container.innerHTML = "";

  if (!forms.length) {
    container.innerHTML = `
      <div class="no-results">
        <i class="fas fa-folder-open"></i>
        <p>لا توجد نماذج</p>
      </div>`;
    return;
  }

  forms.forEach(form => {
    const viewerSrc = encodeURIComponent(form.link);

    container.innerHTML += `
      <div class="form-card" data-category="${form.category}">
        <div class="form-header">
          <i class="fas fa-file-pdf form-icon"></i>
          <h3>${form.title}</h3>
        </div>
        ${form.size ? `<p class="form-size">${form.size}</p>` : ""}
        <a class="download-btn" href="viewpdf.html?src=${viewerSrc}">
          <i class="fas fa-eye"></i> عرض النموذج
        </a>
      </div>`;
  });
}

// ─── الفلترة ───
let currentCategory = "all";

function filterForms(category) {
  currentCategory = category;

  document.querySelectorAll(".form-card").forEach(card => {
    card.style.display =
      category === "all" || card.dataset.category === category
        ? ""
        : "none";
  });
}

// ─── البحث ───
function searchForms() {
  const term = document
    .getElementById("searchInput")
    .value
    .toLowerCase()
    .trim();

  let found = false;

  document.querySelectorAll(".form-card").forEach(card => {
    const title = card.querySelector("h3").textContent.toLowerCase();

    const catMatch =
      currentCategory === "all" ||
      card.dataset.category === currentCategory;

    const show = catMatch && (!term || title.includes(term));

    card.style.display = show ? "" : "none";

    if (show) found = true;
  });

  if (!found && term) {
    document.getElementById("formsContainer").innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <p>لا توجد نتائج لـ "${term}"</p>
      </div>`;
  }
}

// ─── التشغيل الرئيسي ───
async function init() {
  const container = document.getElementById("formsContainer");

  container.innerHTML = `
    <div class="no-results">
      <i class="fas fa-spinner fa-spin"></i>
      <p>جاري تحميل النماذج…</p>
    </div>`;

  const rawForms = [];
  const seen = new Set();

  const folders = await listFolders();

  for (const folder of folders) {
    const files = await listFiles(folder);

    for (const f of files) {
      const key = folder + "/" + f.name;

      if (seen.has(key)) continue;

      seen.add(key);

      rawForms.push({
        filename: f.name,
        category: detectCategory(folder),
        folder,
        size: formatSize(f.metadata?.size),
        link: publicUrl(folder, f.name),
      });
    }
  }

  const rootFiles = await listFiles("");

  for (const f of rootFiles) {
    if (seen.has(f.name)) continue;

    seen.add(f.name);

    rawForms.push({
      filename: f.name,
      category: detectCategory(f.name),
      folder: "",
      size: formatSize(f.metadata?.size),
      link: publicUrl("", f.name),
    });
  }

  if (!rawForms.length) {
    container.innerHTML = `
      <div class="no-results">
        <p>لم يتم العثور على ملفات</p>
      </div>`;
    return;
  }

  await translateNames(rawForms.map(f => f.filename));

  const allForms = rawForms.map(f => ({
    ...f,
    title: translationCache[f.filename] || cleanFilename(f.filename)
  }));

  renderCards(allForms);
}

window.filterForms = filterForms;
window.searchForms = searchForms;

init();
