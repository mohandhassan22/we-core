// استخدام window لتجنب خطأ Identifier has already been declared
const SUPABASE_URL = "https://iygwhapcpdmsasqlfelv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z3doYXBjcGRtc2FzcWxmZWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDk5MDQsImV4cCI6MjA4NjkyNTkwNH0.jqU1fEc9kBkXcCfazH6aTnS2XWWzPv0bbixHZgjtrnQ";

// إنشاء العميل فقط إذا لم يكن قد تم إنشاؤه سابقاً
if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const supabase = window.supabaseClient;
// انتظار تحميل الـ DOM للتأكد من وجود العناصر
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const loginForm = document.getElementById("loginForm");
  
  // ربط حدث الضغط أو الضغط على Enter في نموذج الدخول
  if (loginForm) {
    loginForm.addEventListener("submit", doLogin);
  } else if (loginBtn) {
    loginBtn.addEventListener("click", doLogin);
  }
});

async function doLogin(e) {
  if (e) e.preventDefault(); // منع إعادة تحميل الصفحة

  const loginBtn = document.getElementById("loginBtn");
  const errMsg = document.getElementById("errMsg");
  const username = document.getElementById("uname").value.trim();
  const password = document.getElementById("upass").value;

  errMsg.textContent = "";

  if (!username || !password) {
    errMsg.textContent = "من فضلك ادخل اسم المستخدم وكلمة المرور";
    return;
  }

  // إذا لم يكن المدخل إيميل يحتوي على @، تحويله لنطاق البريد المعتمد لديك
  const email = username.includes("@") ? username : `${username}@yourdomain.com`;

  loginBtn.disabled = true;
  loginBtn.textContent = "جاري تسجيل الدخول...";

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      errMsg.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة";
      loginBtn.disabled = false;
      loginBtn.textContent = "تسجيل الدخول";
      return;
    }

    await afterLoginSuccess(data.user);
  } catch (err) {
    console.error("Login Exception:", err);
    errMsg.textContent = "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً";
    loginBtn.disabled = false;
    loginBtn.textContent = "تسجيل الدخول";
  }
}

async function afterLoginSuccess(user) {
  const loginBtn = document.getElementById("loginBtn");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  loginBtn.disabled = false;
  loginBtn.textContent = "تسجيل الدخول";

  if (error || !profile) {
    console.error("Profile fetch error:", error);
    window.location.href = "home.html";
    return;
  }

  const isAdmin = profile.role === "admin";

  if (isAdmin) {
    showAdminChoiceModal();
  } else {
    window.location.href = "home.html";
  }
}

function showAdminChoiceModal() {
  const modal = document.createElement("div");
  modal.className = "admin-choice-overlay";
  modal.innerHTML = `
    <div class="admin-choice-box">
      <h3>مرحباً بيك أدمن 👋</h3>
      <p>تحب تدخل لوحة التحكم ولا الصفحة الرئيسية؟</p>
      <div class="admin-choice-actions">
        <button id="goAdminBtn" class="btn-primary">لوحة تحكم الأدمن</button>
        <button id="goHomeBtn" class="btn-secondary">الصفحة الرئيسية</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("goAdminBtn").onclick = () => {
    window.location.href = "admin.html";
  };
  document.getElementById("goHomeBtn").onclick = () => {
    window.location.href = "home.html";
  };
}
