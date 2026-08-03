const SUPABASE_URL = "https://iygwhapcpdmsasqlfelv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z3doYXBjcGRtc2FzcWxmZWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDk5MDQsImV4cCI6MjA4NjkyNTkwNH0.jqU1fEc9kBkXcCfazH6aTnS2XWWzPv0bbixHZgjtrnQ";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginBtn = document.getElementById("loginBtn");
const errMsg = document.getElementById("errMsg");

async function doLogin() {
  const input = document.getElementById("uname").value.trim();
  const password = document.getElementById("upass").value;

  errMsg.textContent = "";

  if (!input || !password) {
    errMsg.textContent = "من فضلك ادخل اسم المستخدم وكلمة المرور";
    return;
  }

  // تحويل اسم المستخدم إلى إيميل إذا لم يكن يحتوي على @
  const email = input.includes("@") ? input : `${input}@yourdomain.com`;

  loginBtn.disabled = true;
  loginBtn.textContent = "جاري تسجيل الدخول...";

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      errMsg.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة";
      return;
    }

    // النجاح - الانتقال للخطوة التالية
    await afterLoginSuccess(data.user);

  } catch (err) {
    console.error("Login Error:", err);
    errMsg.textContent = "حدث خطأ أثناء الاتصال بالفحوصات، حاول مجدداً";
  } finally {
    // إرجاع الزر لحالته الأصلية في حال عدم الانتقال لصفحة أخرى
    loginBtn.disabled = false;
    loginBtn.textContent = "تسجيل الدخول";
  }
}

async function afterLoginSuccess(user) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    console.error("Profile Fetch Error:", error);
    window.location.href = "home.html"; // fallback
    return;
  }

  if (profile.role === "admin") {
    showAdminChoiceModal();
  } else {
    window.location.href = "home.html";
  }
}

function showAdminChoiceModal() {
  // إزالة أي نافذة سابقة إن وجدت
  const existingModal = document.querySelector(".admin-choice-overlay");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.className = "admin-choice-overlay";
  modal.innerHTML = `
    <div class="admin-choice-box">
      <h3>مرحباً بك يا أدمن 👋</h3>
      <p>هل ترغب في الانتقال لوحة التحكم أم الصفحة الرئيسية؟</p>
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
