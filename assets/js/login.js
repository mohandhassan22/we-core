
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginBtn = document.getElementById("loginBtn");
const errMsg = document.getElementById("errMsg");

async function doLogin() {
  const username = document.getElementById("uname").value.trim();
  const password = document.getElementById("upass").value;

  errMsg.textContent = "";

  if (!username || !password) {
    errMsg.textContent = "من فضلك ادخل اسم المستخدم وكلمة المرور";
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "جاري تسجيل الدخول...";

  // لو بتسجل بالإيميل مباشرة، وإلا حوّل اليوزرنيم لإيميل حسب نظامك
  const { data, error } = await supabase.auth.signInWithPassword({
    email: username,
    password: password,
  });

  if (error) {
    errMsg.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة";
    loginBtn.disabled = false;
    loginBtn.textContent = "تسجيل الدخول";
    return;
  }

  const user = data.user;

  // حفظ الجلسة محليًا
  localStorage.setItem("we_core_user", JSON.stringify(user));

  await afterLoginSuccess(user);
}

async function afterLoginSuccess(user) {
  const { data: profile, error } = await supabase
    .from("profiles")      // غيّر اسم الجدول لو مختلف عندك
    .select("role")        // أو is_admin لو عندك عمود boolean
    .eq("id", user.id)
    .single();

  loginBtn.disabled = false;
  loginBtn.textContent = "تسجيل الدخول";

  if (error) {
    console.error(error);
    window.location.href = "home.html"; // fallback
    return;
  }

  const isAdmin = profile?.role === "admin"; // عدّل الشرط حسب تسمية الدور عندك

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
    window.location.href = "admin.html"; // غيّر لاسم صفحة الأدمن الفعلي
  };
  document.getElementById("goHomeBtn").onclick = () => {
    window.location.href = "home.html";
  };
}
