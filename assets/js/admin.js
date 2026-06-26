// ─── Supabase Configuration ───
const SUPABASE_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
const EDGE_FUNCTION_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co/functions/v1/hyper-task';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// ─── Global Variables ───
let currentUser = null;
let deleteTargetUserId = null;
const sections = { users: 'إدارة المستخدمين', create: 'إنشاء مستخدم جديد', actions: 'إجراءات الحساب', settings: 'الإعدادات' };

// ─── Utility Functions ───
const $ = (id) => document.getElementById(id);

const showSection = (sectionName) => {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const targetSection = $(`${sectionName}-section`);
  if (targetSection) targetSection.classList.add('active');
  
  const pageTitle = $('pageTitle');
  if (pageTitle) pageTitle.textContent = sections[sectionName] || sectionName;
};

const showModal = (modalId) => {
  const modal = $(modalId);
  if (modal) modal.classList.add('show');
};

const hideModal = (modalId) => {
  const modal = $(modalId);
  if (modal) modal.classList.remove('show');
};

const showMessage = (elementId, message, type = 'success') => {
  const element = $(elementId);
  if (!element) return;
  element.textContent = message;
  element.className = `form-message show ${type}`;
  setTimeout(() => { element.classList.remove('show'); }, 5000);
};

const showSuccessModal = (title, message) => {
  $('successTitle').textContent = title;
  const msgEl = $('successMessage') || $('successMsg');
  if (msgEl) msgEl.textContent = message;
  showModal('successModal');
};

const showErrorModal = (message) => {
  $('errorMessage').textContent = message;
  showModal('errorModal');
};

// ─── API Functions ───
async function callEdgeFunction(action, body = {}) {
  try {
    const token = await getAccessToken();
    if (!token) throw new Error('غير مصرح - يرجى تسجيل الدخول');

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ action, ...body })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'حدث خطأ في الطلب');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

async function getAccessToken() {
  const { data: { session }, error } = await sb.auth.getSession();
  if (error || !session) {
    window.location.href = 'login.html';
    return null;
  }
  return session.access_token;
}

// ─── Authentication ───
async function checkAuth() {
  try {
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) {
      window.location.href = 'login.html';
      return;
    }

    currentUser = user;
    
    // جلب الرتبة من جدول profiles
    const { data: profile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // الأمان: نعتمد على الـ profile أو الـ app_metadata الصادرة من السيرفر فقط وممنوع اعتماد user_metadata
    const role = profile?.role || user.app_metadata?.role;
    
    if (role !== 'admin') {
      showErrorModal('ليس لديك صلاحيات إدارية');
      setTimeout(() => window.location.href = 'index.html', 2000);
      return;
    }

    $('userInfo').textContent = user.user_metadata?.username || user.email;
    $('adminEmail').textContent = user.email;
    $('adminRole').textContent = 'مسؤول';
    $('adminId').textContent = user.id.substring(0, 12) + '...';

    loadUsers();
  } catch (error) {
    console.error('Auth check failed:', error);
    window.location.href = 'login.html';
  }
}

// ─── Users Management ───
async function loadUsers() {
  try {
    const data = await callEdgeFunction('list_users');
    displayUsers(data.users || []);
  } catch (error) {
    showMessage('usersTableBody', `خطأ: ${error.message}`, 'error');
  }
}

function displayUsers(users) {
  const tbody = $('usersTableBody');
  if (!tbody) return;
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">لا يوجد مستخدمين</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    const role = user.app_metadata?.role || user.user_metadata?.role || 'user';
    const createdDate = new Date(user.created_at).toLocaleDateString('ar-EG');
    const username = user.user_metadata?.username || '-';

    return `
      <tr>
        <td>${user.email}</td>
        <td>${username}</td>
        <td><span class="role-badge ${role}">${role === 'admin' ? 'مسؤول' : 'مستخدم'}</span></td>
        <td>${createdDate}</td>
        <td>
          <div class="action-buttons">
            <button class="action-btn reset" onclick="sendPasswordReset('${user.email}')">
              <i class="fas fa-key"></i> إعادة تعيين
            </button>
            <button class="action-btn magic" onclick="sendMagicLink('${user.email}')">
              <i class="fas fa-magic"></i> سحر
            </button>
            <button class="action-btn otp" onclick="sendOTP('${user.email}')">
              <i class="fas fa-sms"></i> OTP
            </button>
            <button class="action-btn delete" onclick="confirmDelete('${user.id}', '${user.email}')">
              <i class="fas fa-trash"></i> حذف
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── Create User ───
$('createUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = $('newEmail').value.trim();
  const username = $('newUsername').value.trim();
  const password = $('newPassword').value;
  const role = $('newRole').value;

  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...';

  try {
    await callEdgeFunction('create_user', { email, username, password, role });
    showSuccessModal('تم بنجاح!', `تم إنشاء المستخدم ${username} بنجاح`);
    $('createUserForm').reset();
    loadUsers();
  } catch (error) {
    showErrorModal(error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

// ─── Delete User ───
function confirmDelete(userId, email) {
  deleteTargetUserId = userId;
  $('deleteUserInfo').textContent = `البريد الإلكتروني: ${email}`;
  showModal('deleteModal');
}

$('confirmDeleteBtn').addEventListener('click', async () => {
  if (!deleteTargetUserId) return;

  const btn = $('confirmDeleteBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحذف...';

  try {
    await callEdgeFunction('delete_user', { userId: deleteTargetUserId });
    hideModal('deleteModal');
    showSuccessModal('تم بنجاح!', 'تم حذف المستخدم بنجاح');
    loadUsers();
  } catch (error) {
    showErrorModal(error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
    deleteTargetUserId = null;
  }
});

// ─── Account Actions ───
async function sendPasswordReset(email) {
  try {
    await callEdgeFunction('send_password_reset', { email });
    showSuccessModal('تم الإرسال!', `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email}`);
  } catch (error) { showErrorModal(error.message); }
}

async function sendMagicLink(email) {
  try {
    await callEdgeFunction('send_magic_link', { email });
    showSuccessModal('تم الإرسال!', `تم إرسال رابط السحر إلى ${email}`);
  } catch (error) { showErrorModal(error.message); }
}

async function sendOTP(email) {
  try {
    await callEdgeFunction('send_otp', { email });
    showSuccessModal('تم الإرسال!', `تم إرسال رمز التحقق إلى ${email}`);
  } catch (error) { showErrorModal(error.message); }
}

// ─── Action Forms Handlers ───
const handleFormAction = (formId, msgId, actionFn) => {
  const form = $(formId);
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value.trim();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

    try {
      await actionFn(email);
      form.reset();
      showMessage(msgId, 'تم إرسال الرابط/الرمز بنجاح', 'success');
    } catch (error) {
      showMessage(msgId, error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
};

handleFormAction('resetPasswordForm', 'resetMessage', sendPasswordReset);
handleFormAction('magicLinkForm', 'magicMessage', sendMagicLink);
handleFormAction('otpForm', 'otpMessage', sendOTP);

// ─── Navigation & Sidebar ───
const closeSidebar = () => {
  if ($('sidebar')) $('sidebar').classList.remove('open');
  if ($('sidebarOverlay')) $('sidebarOverlay').classList.remove('show');
};

document.querySelectorAll('.nav-btn, .nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn, .nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const section = btn.getAttribute('data-section') || btn.dataset.section;
    showSection(section);
    closeSidebar();
  });
});

const menuBtn = $('menuToggle') || $('menuBtn');
if (menuBtn) {
  menuBtn.addEventListener('click', () => {
    if ($('sidebar')) $('sidebar').classList.toggle('open');
    if ($('sidebarOverlay')) $('sidebarOverlay').classList.toggle('show');
  });
}
if ($('sidebarOverlay')) $('sidebarOverlay').addEventListener('click', closeSidebar);

// ─── Search ───
const searchInput = $('userSearch');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#usersTableBody tr').forEach(r => {
      r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

// ─── Logout ───
if ($('logoutBtn')) {
  $('logoutBtn').addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.href = 'login.html';
  });
}

// ─── Modal Close Triggers ───
['closeDeleteModal', 'cancelDeleteBtn'].forEach(id => { if ($(id)) $(id).addEventListener('click', () => hideModal('deleteModal')); });
if ($('closeSuccessBtn')) $('closeSuccessBtn').addEventListener('click', () => hideModal('successModal'));
if ($('closeErrorBtn')) $('closeErrorBtn').addEventListener('click', () => hideModal('errorModal'));

document.querySelectorAll('.modal, .modal-backdrop').forEach(m => {
  m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('show'); });
});

// ─── Dark Mode ───
const darkToggle = $('darkMode') || $('darkModeToggle');
const darkBtn = $('darkToggleBtn');
const darkIcon = $('darkIcon');

function applyDark(on) {
  document.body.classList.toggle('dark', on);
  document.body.classList.toggle('dark-mode', on);
  if (darkIcon) darkIcon.className = on ? 'ti ti-sun' : 'ti ti-moon';
  if (darkToggle) darkToggle.checked = on;
  try { localStorage.setItem('wc-dark', on); } catch (e) {}
}

if (darkBtn) darkBtn.addEventListener('click', () => applyDark(!document.body.classList.contains('dark')));
if (darkToggle) darkToggle.addEventListener('change', () => applyDark(darkToggle.checked));

try {
  const savedDark = localStorage.getItem('wc-dark') || localStorage.getItem('darkMode');
  if (savedDark === 'true') applyDark(true);
} catch (e) {}

// ─── Initialize ───
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
