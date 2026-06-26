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
let currentUserToken = null;
let deleteTargetUserId = null;

// ─── Utility Functions ───
const $ = (id) => document.getElementById(id);
const showSection = (sectionName) => {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  $(`${sectionName}-section`).classList.add('active');
  $('pageTitle').textContent = document.querySelector(`[data-section="${sectionName}"] span`).textContent;
};

const showModal = (modalId) => {
  $(modalId).classList.add('show');
};

const hideModal = (modalId) => {
  $(modalId).classList.remove('show');
};

const showMessage = (elementId, message, type = 'success') => {
  const element = $(elementId);
  element.textContent = message;
  element.className = `form-message show ${type}`;
  setTimeout(() => {
    element.classList.remove('show');
  }, 5000);
};

const showSuccessModal = (title, message) => {
  $('successTitle').textContent = title;
  $('successMessage').textContent = message;
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
    
    // جلب الرتبة من جدول profiles للتأكد
    const { data: profile, error: profileErr } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || user.user_metadata?.role || user.app_metadata?.role;
    
    if (role !== 'admin') {
      showErrorModal('ليس لديك صلاحيات إدارية');
      setTimeout(() => window.location.href = 'index.html', 2000);
      return;
    }

    $('userInfo').textContent = user.user_metadata?.username || user.email;
    $('adminEmail').textContent = user.email;
    $('adminRole').textContent = role === 'admin' ? 'مسؤول' : 'مستخدم';
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
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">لا توجد مستخدمين</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    const role = user.user_metadata?.role || user.app_metadata?.role || 'user';
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

function filterUsers(query) {
  const rows = document.querySelectorAll('#usersTableBody tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
  });
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
    await callEdgeFunction('create_user', {
      email,
      username,
      password,
      role
    });

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
    await callEdgeFunction('delete_user', {
      userId: deleteTargetUserId
    });

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
    await callEdgeFunction('send_password_reset', {
      email: email
    });
    showSuccessModal('تم الإرسال!', `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email}`);
  } catch (error) {
    showErrorModal(error.message);
  }
}

async function sendMagicLink(email) {
  try {
    await callEdgeFunction('send_magic_link', {
      email: email
    });
    showSuccessModal('تم الإرسال!', `تم إرسال رابط السحر إلى ${email}`);
  } catch (error) {
    showErrorModal(error.message);
  }
}

async function sendOTP(email) {
  try {
    await callEdgeFunction('send_otp', {
      email: email
    });
    showSuccessModal('تم الإرسال!', `تم إرسال رمز التحقق إلى ${email}`);
  } catch (error) {
    showErrorModal(error.message);
  }
}

// ─── Form Handlers ───
$('resetPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('resetEmail').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

  try {
    await sendPasswordReset(email);
    $('resetPasswordForm').reset();
    showMessage('resetMessage', 'تم إرسال الرابط بنجاح', 'success');
  } catch (error) {
    showMessage('resetMessage', error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

$('magicLinkForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('magicEmail').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

  try {
    await sendMagicLink(email);
    $('magicLinkForm').reset();
    showMessage('magicMessage', 'تم إرسال الرابط بنجاح', 'success');
  } catch (error) {
    showMessage('magicMessage', error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

$('otpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('otpEmail').value.trim();
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

  try {
    await sendOTP(email);
    $('otpForm').reset();
    showMessage('otpMessage', 'تم إرسال الرمز بنجاح', 'success');
  } catch (error) {
    showMessage('otpMessage', error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

// ─── Navigation ───
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const section = btn.getAttribute('data-section');
    showSection(section);
    if (window.innerWidth <= 768) {
      $('sidebar').classList.remove('open');
    }
  });
});

// ─── Search ───
$('userSearch').addEventListener('input', (e) => {
  filterUsers(e.target.value);
});

// ─── Logout ───
$('logoutBtn').addEventListener('click', async () => {
  await sb.auth.signOut();
  window.location.href = 'login.html';
});

// ─── Modal Controls ───
$('closeDeleteModal').addEventListener('click', () => hideModal('deleteModal'));
$('cancelDeleteBtn').addEventListener('click', () => hideModal('deleteModal'));
$('closeSuccessBtn').addEventListener('click', () => hideModal('successModal'));
$('closeErrorBtn').addEventListener('click', () => hideModal('errorModal'));

// ─── Mobile Menu Toggle ───
$('menuToggle').addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('open');
});

// ─── Dark Mode ───
const darkModeToggle = $('darkMode');
darkModeToggle.addEventListener('change', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
});

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
  darkModeToggle.checked = true;
}

// ─── Initialize ───
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// Close modals when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideModal(modal.id);
    }
  });
});
