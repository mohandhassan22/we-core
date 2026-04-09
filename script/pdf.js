// ========================================
//  WE-Core · pdf.js
//  Supabase Storage "ALL FORM" → كروت PDF
// ========================================

const SUPABASE_URL  = "https://dfbzovrwaxrzsskbvmfs.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmYnpvdnJ3YXhyenNza2J2bWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjQzNjIsImV4cCI6MjA5MDY0MDM2Mn0.5LDy-m4WHViSOqlasypBn1sohXcTuCS8y2PENCTy60M";

const BUCKET_NAME = "ALL FORM";

// ─── Google Translate API (أقوى وأدق) ───
// استخدام Google Translate عبر MyMemory Translate API الذي يدعم Google
const TRANSLATE_API = "https://api.mymemory.translated.net/get";

// ─── قاموس الترجمة الخاص (للمصطلحات التقنية والشائعة الخاصة) ───
const customDictionary = {
  // الخدمات الرئيسية
  "mobile": "خدمة الهاتف المحمول",
  "landline": "الخدمة الأرضية",
  "adsl": "خدمة الإنترنت",
  "sim": "شريحة الهاتف",
  "mnp": "نقل الرقم",
  "postpaid": "باقات مفوترة",
  "prepaid": "باقات مسبقة الدفع",
  "roaming": "التجوال الدولي",
  "data": "حزم البيانات",
  "voice": "خدمة الصوت",
  "sms": "الرسائل النصية",
  "home_broadband": "خدمة الإنترنت المنزلي",
  "iptv": "خدمة التلفاز الرقمي",
  "vod": "الفيديو عند الطلب",
  "complaint": "شكوى العميل",
  "inquiry": "استفسار",
  "application_form": "نموذج الاشتراك",
  "termination": "إلغاء الخدمة",
  "suspension": "إيقاف الخدمة",
  "upgrade": "ترقية الخدمة",
  "downgrade": "تخفيض الخدمة",
  "reactivation": "إعادة تفعيل",
  "new_customer": "عميل جديد",
  "existing_customer": "عميل حالي"
};

// ─── cache الترجمة ───
const translationCache = JSON.parse(
  localStorage.getItem("translationCache") || "{}"
);

// ─── رابط API bucket ───
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

// ─── تنظيف اسم الملف ───
function cleanFilename(name) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── تقسيم النص إلى كلمات وترجمة ذكية ───
function smartTranslate(text) {
  if (!text) return "";
  
  const cleanText = cleanFilename(text).toLowerCase();
  const words = cleanText.split(/\s+/);
  
  // ترجمة كل كلمة من القاموس أو الاحتفاظ بها
  const translatedWords = words.map(word => {
    const normalized = word.toLowerCase().trim();
    return customDictionary[normalized] || word;
  });
  
  return translatedWords.join(" ");
}

// ─── معالجة خاصة للترجمات - تحسين الجودة ───
function postProcessTranslation(original, translated) {
  if (!translated) return original;
  
  let result = translated;
  
  // تنضيف المسافات الزائدة
  result = result.replace(/\s+/g, " ").trim();
  
  // تصحيح التشكيل الشائع
  result = result.replace(/ال ال/g, "ال");
  
  // إضافة "ال" التعريف حيث يلزم
  if (result && !result.startsWith("ال")) {
    // للكلمات المفردة التي تحتاج تعريف
    const wordsNeedingAl = ["خدمة", "نموذج", "طلب", "استمارة", "شكوى"];
    for (const word of wordsNeedingAl) {
      if (result === word || result.endsWith(" " + word)) {
        result = result.replace(word, "ال" + word);
        break;
      }
    }
  }
  
  return result;
}

// ─── ترجمة اسم واحد (محسّنة) ───
async function translateOne(text) {
  try {
    const cleanText = cleanFilename(text);

    // التحقق من الكاش أولاً
    if (translationCache[text]) {
      return translationCache[text];
    }

    // محاولة الترجمة الذكية من القاموس أولاً
    const smartTranslated = smartTranslate(cleanText);
    
    // إذا وجدنا ترجمة في القاموس، استخدمها مباشرة
    if (smartTranslated !== cleanText.toLowerCase()) {
      translationCache[text] = smartTranslated;
      saveCache();
      return smartTranslated;
    }

    // استخدام Google Translate API (MyMemory)
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
    translated = postProcessTranslation(cleanText, translated);

    // حفظ في الكاش
    translationCache[text] = translated;
    saveCache();

    console.log(`✅ ترجم: "${cleanText}" → "${translated}"`);
    return translated;

  } catch (error) {
    console.error("Translation error:", error);
    
    // Fallback: استخدام الترجمة الذكية من القاموس
    const fallback = smartTranslate(cleanFilename(text));
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
