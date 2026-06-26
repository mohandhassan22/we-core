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

    const displayName = user.user_metadata?.username || user.email;
    $('userInfo').textContent = displayName;
    $('adminEmail').textContent = user.email;
    $('adminRole').textContent = 'مسؤول';
    $('adminId').textContent = user.id.substring(0, 12) + '...';
    
    // Update header avatar initials
    const headerAvatar = $('headerAvatar');
    if (headerAvatar) {
      const name = user.user_metadata?.username || user.email;
      const parts = name.trim().split(/[\s@]/);
      headerAvatar.textContent = parts.length >= 2 
        ? (parts[0][0] + parts[1][0]).toUpperCase() 
        : parts[0].substring(0, 2).toUpperCase();
    }

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

// ─── Avatar Helpers ───
const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#4f46e5)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ef4444,#dc2626)',
  'linear-gradient(135deg,#3b82f6,#2563eb)',
  'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  'linear-gradient(135deg,#ec4899,#db2777)',
  'linear-gradient(135deg,#14b8a6,#0d9488)',
];

function getAvatarColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name, email) {
  if (name && name !== '-') {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

function getRoleBadge(role) {
  const map = {
    admin:           { label: 'مسؤول',         icon: 'ti-shield',    cls: 'admin' },
    manager:         { label: 'مدير',           icon: 'ti-briefcase', cls: 'manager' },
    'store-manager': { label: 'مدير متجر',      icon: 'ti-briefcase', cls: 'manager' },
    agent:           { label: 'Agent',          icon: 'ti-user',      cls: 'user' },
    user:            { label: 'مستخدم',         icon: 'ti-user',      cls: 'user' },
  };
  const r = map[role?.toLowerCase()] || { label: role || 'مستخدم', icon: 'ti-user', cls: 'user' };
  return `<span class="badge ${r.cls}"><i class="ti ${r.icon}" style="font-size:11px"></i> ${r.label}</span>`;
}

function getStatusBadge(user) {
  // Supabase: last_sign_in_at null = never logged in, banned_until, etc.
  const lastSeen = user.last_sign_in_at;
  const banned = user.banned_until && new Date(user.banned_until) > new Date();
  if (banned) return `<span class="badge" style="background:#fee2e2;color:#991b1b">⊗ محظور</span>`;
  if (!lastSeen) return `<span class="badge" style="background:#f3f4f6;color:#6b7280">○ لم يسجل</span>`;
  const daysSince = (Date.now() - new Date(lastSeen)) / 86400000;
  if (daysSince <= 30) return `<span class="badge" style="background:#d1fae5;color:#065f46">● نشط</span>`;
  return `<span class="badge" style="background:#fef3c7;color:#92400e">◌ غير نشط</span>`;
}

function updateStats(users) {
  const total = users.length;
  const admins = users.filter(u => (u.app_metadata?.role || u.user_metadata?.role) === 'admin').length;
  const active = users.filter(u => {
    if (!u.last_sign_in_at) return false;
    return (Date.now() - new Date(u.last_sign_in_at)) / 86400000 <= 30;
  }).length;
  const newThisMonth = users.filter(u => {
    const d = new Date(u.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Update stat cards (by querying the stat-val elements)
  const statVals = document.querySelectorAll('.stat-val');
  if (statVals[0]) statVals[0].textContent = total;
  if (statVals[1]) statVals[1].textContent = active;
  if (statVals[2]) statVals[2].textContent = admins;
  if (statVals[3]) statVals[3].textContent = newThisMonth;

  // Update sidebar badge
  const navBadge = document.querySelector('.nav-item[data-section="users"] .nav-badge');
  if (navBadge) navBadge.textContent = total;

  // Update trends
  const trends = document.querySelectorAll('.stat-trend');
  if (trends[0]) trends[0].textContent = `↑ +${newThisMonth} هذا الشهر`;
  if (trends[1] && total > 0) trends[1].textContent = `↑ ${Math.round(active / total * 100)}% معدل النشاط`;
}

function displayUsers(users) {
  const tbody = $('usersTableBody');
  if (!tbody) return;

  updateStats(users);

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">لا يوجد مستخدمين</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    const role = user.app_metadata?.role || user.user_metadata?.role || 'user';
    const username = user.user_metadata?.username || '';
    const displayName = username || user.email.split('@')[0];
    const initials = getInitials(username, user.email);
    const avatarColor = getAvatarColor(user.id || user.email);
    const createdDate = new Date(user.created_at).toLocaleDateString('ar-EG');

    return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="u-avatar" style="background:${avatarColor}">${initials}</div>
            <div>
              <div class="u-name">${displayName}</div>
              <div class="u-email">${user.email}</div>
            </div>
          </div>
        </td>
        <td>${getRoleBadge(role)}</td>
        <td>${getStatusBadge(user)}</td>
        <td>${createdDate}</td>
        <td>
          <div class="acts">
            <button class="act-btn reset" title="إعادة تعيين كلمة المرور" onclick="sendPasswordReset('${user.email}')">
              <i class="ti ti-key" style="font-size:13px"></i> إعادة تعيين
            </button>
            <button class="act-btn magic" title="إرسال Magic Link" onclick="sendMagicLink('${user.email}')">
              <i class="ti ti-wand" style="font-size:13px"></i> سحر
            </button>
            <button class="act-btn otp" title="إرسال OTP" onclick="sendOTP('${user.email}')">
              <i class="ti ti-message" style="font-size:13px"></i> OTP
            </button>
            <button class="act-btn del" title="حذف المستخدم" onclick="confirmDelete('${user.id}', '${user.email}')">
              <i class="ti ti-trash" style="font-size:13px"></i>
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
