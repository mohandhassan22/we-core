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
const sections = { users: 'إدارة المستخدمين', create: 'إنشاء مستخدم جديد', org: 'الفروع والمناطق', rules: 'القوانين (NTRA)', actions: 'إجراءات الحساب', online: 'المتصلون الآن', files: 'رفع الملفات', settings: 'الإعدادات' };

// ─── Utility Functions ───
const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsArg = (value) => JSON.stringify(String(value == null ? '' : value)).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/"/g, '&quot;');  // &quot; so the value survives inside onclick="..."

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
  const msgEl = $('successMessage');
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

// نفس كوكي الجلسة اللي auth.js بيستخدمه (الجلسة في localStorage ممكن تكون فاضية أو قديمة)
function cookieToken() {
  const m = document.cookie.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]).replace(/"/g, ''); } catch (_) { return null; }
}

async function getAccessToken() {
  const { data: { session } } = await sb.auth.getSession();
  const token = session?.access_token || cookieToken();
  if (!token) {
    window.location.href = 'login.html';
    return null;
  }
  return token;
}

// ─── Authentication ───
async function checkAuth() {
  try {
    const { data: { user }, error } = await sb.auth.getUser(cookieToken() || undefined);
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
    branch_manager:  { label: 'مدير فرع',      icon: 'ti-briefcase', cls: 'manager' },
    area_manager:    { label: 'مدير منطقة',    icon: 'ti-briefcase', cls: 'manager' },
    supervisor:      { label: 'Supervisor',    icon: 'ti-briefcase', cls: 'manager' },
    agent:           { label: 'Agent',          icon: 'ti-user',      cls: 'user' },
    user:            { label: 'مستخدم',         icon: 'ti-user',      cls: 'user' },
  };
  const r = map[role?.toLowerCase()] || { label: role || 'مستخدم', icon: 'ti-user', cls: 'user' };
  return `<span class="badge ${r.cls}"><i class="ti ${r.icon}" style="font-size:11px"></i> ${escapeHtml(r.label)}</span>`;
}

function getStatusBadge(user) {
  // Supabase: last_sign_in_at null = never logged in, banned_until, etc.
  const lastSeen = user.last_sign_in_at;
  const banned = user.banned_until && new Date(user.banned_until) > new Date();
  if (banned) return `<span class="badge" style="background:rgba(224,82,82,0.16);color:#f47b7b">⊗ محظور</span>`;
  if (!lastSeen) return `<span class="badge" style="background:#120e28;color:#7ba3f4">○ لم يسجل</span>`;
  const daysSince = (Date.now() - new Date(lastSeen)) / 86400000;
  if (daysSince <= 30) return `<span class="badge" style="background:rgba(82,224,151,0.16);color:#7bf4d2">● نشط</span>`;
  return `<span class="badge" style="background:rgba(224,196,82,0.16);color:#f4a97b">◌ غير نشط</span>`;
}

function updateStats(users) {
  const total = users.length;
  const admins = users.filter(u => u.app_metadata?.role === 'admin').length;
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
    const role = user.app_metadata?.role || 'user';
    const username = user.user_metadata?.username || '';
    const displayName = username || user.email.split('@')[0];
    const initials = getInitials(username, user.email);
    const avatarColor = getAvatarColor(user.id || user.email);
    const createdDate = new Date(user.created_at).toLocaleDateString('ar-EG');

    return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="u-avatar" style="background:${avatarColor}">${escapeHtml(initials)}</div>
            <div>
              <div class="u-name">${escapeHtml(displayName)}</div>
              <div class="u-email">${escapeHtml(user.email)}</div>
            </div>
          </div>
        </td>
        <td>${getRoleBadge(role)}</td>
        <td>${getStatusBadge(user)}</td>
        <td>${createdDate}</td>
        <td>
          <div class="acts">
            <button class="act-btn reset" title="إعادة تعيين كلمة المرور" onclick="resetToDefaultPassword(${jsArg(user.id)}, ${jsArg(user.email)})">
              <i class="ti ti-key" style="font-size:13px"></i> إعادة تعيين
            </button>
            <button class="act-btn magic" title="إرسال Magic Link" onclick="sendMagicLink(${jsArg(user.email)})">
              <i class="ti ti-wand" style="font-size:13px"></i> سحر
            </button>
            <button class="act-btn otp" title="إرسال OTP" onclick="sendOTP(${jsArg(user.email)})">
              <i class="ti ti-message" style="font-size:13px"></i> OTP
            </button>
            <button class="act-btn reset" title="تعديل اسم المستخدم" onclick="openRename(${jsArg(user.id)}, ${jsArg(username)}, ${jsArg(user.email)})">
              <i class="ti ti-edit" style="font-size:13px"></i> اليوزر
            </button>
            ${(role === 'agent' || role === 'user') ? `<button class="act-btn reset" title="نقل لفرع آخر" onclick="openMoveBranch(${jsArg(user.id)}, ${jsArg(displayName)})">
              <i class="ti ti-arrows-exchange" style="font-size:13px"></i> نقل فرع
            </button>` : ''}
            <button class="act-btn del" title="حذف المستخدم" onclick="confirmDelete(${jsArg(user.id)}, ${jsArg(user.email)})">
              <i class="ti ti-trash" style="font-size:13px"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── Org (Areas / Branches / Managers) ───
const ORG_FUNCTION_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co/functions/v1/org-admin';
let orgData = { areas: [], branches: [], profiles: [] };

async function callOrg(action, body = {}) {
  const token = await getAccessToken();
  const res = await fetch(ORG_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ action, ...body })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'حدث خطأ في الطلب');
  return data;
}

const optHtml = (items, label, empty) =>
  (items.length ? '' : `<option value="">${empty}</option>`) +
  items.map(i => `<option value="${escapeHtml(i.id)}">${escapeHtml(label(i))}</option>`).join('');

function refreshOrgSelects() {
  const { areas, branches } = orgData;
  const areaName = id => (areas.find(a => a.id === id) || {}).name || '';
  if ($('newBranch')) $('newBranch').innerHTML = optHtml(branches, b => `${b.name} — ${areaName(b.area_id)}${b.code ? ' (' + b.code + ')' : ''}`, 'لا توجد فروع');
  if ($('newArea')) $('newArea').innerHTML = optHtml(areas, a => a.name, 'لا توجد مناطق');
  if ($('orgBranchArea')) $('orgBranchArea').innerHTML = optHtml(areas, a => a.name, 'لا توجد مناطق');
  renderOrgManagers();
}

function renderOrgManagers() {
  const box = $('orgManagers'); if (!box) return;
  const { areas, branches, profiles } = orgData;
  const users = profiles.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.full_name || p.username)} (${escapeHtml(p.username)})</option>`).join('');
  const supUsers = profiles.filter(p => p.role === 'supervisor').map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.full_name || p.username)} (${escapeHtml(p.username)})</option>`).join('');
  const row = (type, item, label) => `<tr>
    <td style="padding:6px">${label}</td>
    <td style="padding:6px"><select class="form-input" data-type="${type}" data-id="${escapeHtml(item.id)}">
      <option value="">— بدون مدير —</option>${users}</select></td></tr>`;
  box.innerHTML = '<table style="width:100%"><tbody>' +
    areas.map(a => row('area', a, `منطقة: ${escapeHtml(a.name)}`)).join('') +
    areas.map(a => `<tr><td style="padding:6px">مشرف منطقة: ${escapeHtml(a.name)}</td><td style="padding:6px"><select class="form-input" data-type="supervisor" data-id="${escapeHtml(a.id)}">
      <option value="">— بدون مشرف —</option>${supUsers}</select></td></tr>`).join('') +
    branches.map(b => row('branch', b, `فرع: ${escapeHtml(b.name)}`)).join('') + '</tbody></table>';
  box.querySelectorAll('select').forEach(sel => {
    const isSup = sel.dataset.type === 'supervisor';
    const item = (sel.dataset.type === 'branch' ? branches : areas).find(x => x.id === sel.dataset.id);
    sel.value = item ? ((isSup ? item.supervisor_id : item.manager_id) || '') : '';
    sel.addEventListener('change', async () => {
      try {
        if (isSup) await callOrg('set_supervisor', { area_id: sel.dataset.id, user_id: sel.value || null });
        else await callOrg('set_manager', { type: sel.dataset.type, id: sel.dataset.id, user_id: sel.value || null });
        showMessage('orgMessage', 'تم تحديث المدير', 'success');
        await loadOrg();
      } catch (err) { showMessage('orgMessage', err.message, 'error'); }
    });
  });
}

async function loadOrg() {
  try {
    const d = await callOrg('get_org');
    orgData = { areas: d.areas, branches: d.branches, profiles: d.profiles };
    refreshOrgSelects();
  } catch (err) { console.error('loadOrg', err); }
}

function updateCreateFormByRole() {
  const role = $('newRole').value;
  $('newBranchWrap').style.display = (role === 'agent' || role === 'branch_manager') ? '' : 'none';
  $('newAreaWrap').style.display = role === 'area_manager' ? '' : 'none';
}
if ($('newRole')) { $('newRole').addEventListener('change', updateCreateFormByRole); updateCreateFormByRole(); }
document.querySelectorAll('.nav-item[data-section="create"], .nav-item[data-section="org"]').forEach(b => b.addEventListener('click', loadOrg));
if ($('orgAddAreaBtn')) $('orgAddAreaBtn').addEventListener('click', async () => {
  try { await callOrg('create_area', { name: $('orgAreaName').value }); $('orgAreaName').value = ''; showMessage('orgMessage', 'تمت إضافة المنطقة', 'success'); loadOrg(); }
  catch (err) { showMessage('orgMessage', err.message, 'error'); }
});
if ($('orgAddBranchBtn')) $('orgAddBranchBtn').addEventListener('click', async () => {
  try {
    await callOrg('create_branch', { name: $('orgBranchName').value, code: $('orgBranchCode').value, area_id: $('orgBranchArea').value });
    $('orgBranchName').value = ''; $('orgBranchCode').value = ''; showMessage('orgMessage', 'تمت إضافة الفرع', 'success'); loadOrg();
  } catch (err) { showMessage('orgMessage', err.message, 'error'); }
});
loadOrg();

// ─── Create User ───
if ($('createUserForm')) $('createUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = $('newEmail').value.trim();
  const username = $('newUsername').value.trim();
  const password = $('newPassword').value;
  const role = $('newRole').value;
  const full_name = $('newFullName').value.trim();
  const branch_id = $('newBranch').value || null;
  const area_id = $('newArea').value || null;

  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...';

  try {
    await callOrg('create_user', { email, username, password, role, full_name, branch_id, area_id });
    showSuccessModal('تم بنجاح!', `تم إنشاء المستخدم ${username} بنجاح`);
    $('createUserForm').reset();
    updateCreateFormByRole();
    loadUsers();
    loadOrg();
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

if ($('confirmDeleteBtn')) $('confirmDeleteBtn').addEventListener('click', async () => {
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
async function resetToDefaultPassword(userId, email) {
  if (!confirm(`إرجاع كلمة مرور ${email} للباسورد الافتراضي؟ هيتطلب منه تغييرها عند أول دخول.`)) return;
  try {
    const r = await callOrg('reset_password_default', { user_id: userId });
    showSuccessModal('تم!', `تم إرجاع كلمة المرور لـ ${r.email || email} إلى الباسورد الافتراضي (${r.default_password}). هيغيّرها عند أول تسجيل دخول.`);
  } catch (error) { showErrorModal(error.message); }
}

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
    if (section === 'online' && window.AdminOnline) window.AdminOnline.start();
    else if (window.AdminOnline) window.AdminOnline.pause();
    if (section === 'files' && window.AdminFiles) window.AdminFiles.open();
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


// ─── Rules (ntra_rules) ───
(function () {
  const BLOCK_META = {
    heading: { icon: 'ti-heading', label: 'عنوان فرعي' },
    text:    { icon: 'ti-align-right', label: 'نص' },
    field:   { icon: 'ti-forms', label: 'خانة / رقم' },
    image:   { icon: 'ti-photo', label: 'صورة' },
    link:    { icon: 'ti-link', label: 'رابط' },
    video:   { icon: 'ti-video', label: 'فيديو' }
  };
  let rules = [], blocks = [], editingId = null;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const msg = (t, ok) => showMessage('ruleMessage', t, ok ? 'success' : 'error');

  async function loadRules() {
    const { data, error } = await sb.from('ntra_rules').select('*').order('rule_type').order('sort_order').order('created_at');
    if (error) return msg(error.message, false);
    rules = data || [];
    $('ruleTypeList').innerHTML = [...new Set(rules.map(r => r.rule_type).filter(Boolean))].map(t => `<option value="${esc(t)}">`).join('');
    $('rulesList').innerHTML = rules.length ? `<table style="width:100%"><thead><tr><th style="text-align:right;padding:6px">#</th><th style="text-align:right;padding:6px">القانون</th><th style="text-align:right;padding:6px">التصنيف</th><th></th></tr></thead><tbody>` +
      rules.map(r => `<tr><td style="padding:6px">${esc(r.rule_number || '—')}</td><td style="padding:6px"><b>${esc(r.title)}</b><div style="color:var(--text-sec);font-size:.85rem">${esc((r.description || '').slice(0, 80))}</div></td><td style="padding:6px">${esc(r.rule_type)}</td>
        <td style="padding:6px;white-space:nowrap"><button class="btn btn-secondary" data-edit="${r.id}"><i class="ti ti-edit"></i></button> <button class="btn btn-secondary" data-del="${r.id}"><i class="ti ti-trash"></i></button></td></tr>`).join('') + '</tbody></table>'
      : '<p style="color:var(--text-sec)">لا توجد قوانين بعد. اضغط "إضافة قانون جديد".</p>';
  }

  function openEditor(rule) {
    editingId = rule ? rule.id : null;
    $('ruleEditorTitle').textContent = rule ? 'تعديل القانون' : 'قانون جديد';
    $('ruleNumber').value = rule ? (rule.rule_number || '') : '';
    $('ruleType').value = rule ? rule.rule_type : '';
    $('ruleTitle').value = rule ? rule.title : '';
    $('ruleDesc').value = rule ? rule.description : '';
    blocks = rule && Array.isArray(rule.details) ? JSON.parse(JSON.stringify(rule.details)) : [];
    renderBlocks();
    $('ruleEditor').style.display = '';
    $('ruleEditor').scrollIntoView({ behavior: 'smooth' });
  }
  const closeEditor = () => { $('ruleEditor').style.display = 'none'; editingId = null; };

  function blockInputs(b, i) {
    const inp = (k, ph, extra = '') => `<input class="form-input" data-i="${i}" data-k="${k}" placeholder="${ph}" value="${esc(b[k])}" ${extra}>`;
    switch (b.type) {
      case 'heading': return inp('value', 'العنوان الفرعي');
      case 'text': return `<textarea class="form-input" rows="3" data-i="${i}" data-k="value" placeholder="النص">${esc(b.value)}</textarea>`;
      case 'field': return `<div class="form-row">${inp('label', 'اسم الخانة (مثال: قيمة الغرامة)')}${inp('value', 'القيمة / الرقم (مثال: 500 جنيه)')}</div>`;
      case 'image': return `${b.url ? `<img src="${esc(b.url)}" style="max-width:160px;max-height:110px;border-radius:8px;display:block;margin-bottom:6px">` : ''}
        <div class="form-row">${inp('url', 'رابط الصورة (أو ارفع ملف)')}<input type="file" accept="image/*" data-up="${i}" class="form-input"></div>${inp('caption', 'تعليق على الصورة (اختياري)')}`;
      case 'link': return `<div class="form-row">${inp('label', 'نص الرابط')}${inp('url', 'https://...')}</div>`;
      case 'video': return `<div class="form-row">${inp('label', 'عنوان الفيديو (اختياري)')}${inp('url', 'رابط الفيديو (YouTube أو ملف mp4)')}</div>`;
    }
    return '';
  }

  function renderBlocks() {
    $('ruleBlocks').innerHTML = blocks.map((b, i) => `<div style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;background:var(--surface)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <b><i class="ti ${BLOCK_META[b.type].icon}"></i> ${BLOCK_META[b.type].label}</b>
        <span><button type="button" class="btn btn-secondary" data-mv="${i}" data-d="-1">↑</button> <button type="button" class="btn btn-secondary" data-mv="${i}" data-d="1">↓</button> <button type="button" class="btn btn-secondary" data-rm="${i}"><i class="ti ti-x"></i></button></span>
      </div>${blockInputs(b, i)}</div>`).join('') || '<p style="color:var(--text-sec)">أضف نص أو خانات أو صور من الأزرار تحت.</p>';
  }

  document.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'ruleNewBtn') return openEditor(null);
    if (t.id === 'ruleCancelBtn') return closeEditor();
    if (t.dataset.add) { blocks.push({ type: t.dataset.add }); return renderBlocks(); }
    if (t.dataset.rm !== undefined) { blocks.splice(+t.dataset.rm, 1); return renderBlocks(); }
    if (t.dataset.mv !== undefined) {
      const i = +t.dataset.mv, j = i + +t.dataset.d;
      if (j >= 0 && j < blocks.length) { [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; renderBlocks(); }
      return;
    }
    if (t.dataset.edit) return openEditor(rules.find(r => r.id === t.dataset.edit));
    if (t.dataset.del) {
      if (!confirm('حذف القانون نهائياً؟')) return;
      const { error } = await sb.from('ntra_rules').delete().eq('id', t.dataset.del);
      if (error) return msg(error.message, false);
      msg('تم حذف القانون', true); loadRules();
    }
    if (t.id === 'ruleSaveBtn') saveRule(t);
  });

  document.addEventListener('input', (e) => {
    const k = e.target.dataset && e.target.dataset.k;
    if (k !== undefined && e.target.dataset.i !== undefined) blocks[+e.target.dataset.i][k] = e.target.value;
  });

  document.addEventListener('change', async (e) => {
    if (e.target.dataset && e.target.dataset.up !== undefined) {
      const file = e.target.files[0]; if (!file) return;
      const i = +e.target.dataset.up;
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `rules/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      msg('جاري رفع الصورة...', true);
      const { error } = await sb.storage.from('items-images').upload(path, file, { contentType: file.type });
      if (error) return msg('تعذر رفع الصورة: ' + error.message, false);
      blocks[i].url = sb.storage.from('items-images').getPublicUrl(path).data.publicUrl;
      msg('تم رفع الصورة', true); renderBlocks();
    }
  });

  async function saveRule(btn) {
    const title = $('ruleTitle').value.trim(), desc = $('ruleDesc').value.trim(), type = $('ruleType').value.trim();
    if (!title || !desc || !type) return msg('اسم القانون والتصنيف والوصف مطلوبين', false);
    const clean = blocks.filter(b => (b.value || b.url || b.label || '').toString().trim());
    const row = {
      rule_number: $('ruleNumber').value.trim() || null, rule_type: type, title, description: desc,
      details: clean,
      image_url: (clean.find(b => b.type === 'image') || {}).url || null,
      reference_link: (clean.find(b => b.type === 'link') || {}).url || null,
      updated_at: new Date().toISOString()
    };
    btn.disabled = true;
    const q = editingId ? sb.from('ntra_rules').update(row).eq('id', editingId)
                        : sb.from('ntra_rules').insert({ ...row, created_by: (currentUser && currentUser.id) || null });
    const { error } = await q;
    btn.disabled = false;
    if (error) return msg(error.message, false);
    msg('تم حفظ القانون', true); closeEditor(); loadRules();
  }

  document.querySelectorAll('.nav-item[data-section="rules"]').forEach(b => b.addEventListener('click', loadRules));
})();


// ─── Rename username ───
let renameTargetId = null;
function openRename(userId, username, email) {
  renameTargetId = userId;
  $('renameUserInfo').textContent = `البريد الإلكتروني: ${email}`;
  $('renameInput').value = username || '';
  $('renameMsg').textContent = ''; $('renameMsg').className = 'form-message';
  showModal('renameModal');
  setTimeout(() => $('renameInput').focus(), 50);
}
if ($('renameSaveBtn')) {
  const save = async () => {
    const btn = $('renameSaveBtn');
    const username = $('renameInput').value.trim();
    if (!username) return showMessage('renameMsg', 'اكتب اسم المستخدم', 'error');
    btn.disabled = true;
    try {
      const r = await callOrg('update_username', { user_id: renameTargetId, username });
      hideModal('renameModal');
      showSuccessModal('تم بنجاح!', `تم تغيير اسم المستخدم إلى ${r.username}`);
      loadUsers();
    } catch (err) {
      showMessage('renameMsg', err.message, 'error');
    } finally { btn.disabled = false; }
  };
  $('renameSaveBtn').addEventListener('click', save);
  $('renameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
}


// ─── Move user to another branch ───
let moveBranchUserId = null;
async function openMoveBranch(userId, name) {
  moveBranchUserId = userId;
  $('moveBranchMsg').textContent = ''; $('moveBranchMsg').className = 'form-message';
  $('moveBranchUserInfo').textContent = `الموظف: ${name}`;
  showModal('moveBranchModal');
  try {
    if (!orgData.branches.length) await loadOrg();
    const areaName = id => (orgData.areas.find(a => a.id === id) || {}).name || '';
    const cur = (orgData.profiles || []).find(p => p.id === userId);
    const curBranch = cur && cur.branch_id;
    const sel = $('moveBranchSelect');
    sel.replaceChildren(...orgData.branches.filter(b => b.id !== curBranch).map(b => {
      const o = document.createElement('option');
      o.value = b.id; o.textContent = `${b.name}${areaName(b.area_id) ? ' — ' + areaName(b.area_id) : ''}`;
      return o;
    }));
    if (curBranch) {
      const b = orgData.branches.find(x => x.id === curBranch);
      if (b) $('moveBranchUserInfo').textContent = `الموظف: ${name} — الفرع الحالي: ${b.name}`;
    }
  } catch (err) { showMessage('moveBranchMsg', err.message, 'error'); }
}
if ($('moveBranchSaveBtn')) {
  $('moveBranchSaveBtn').addEventListener('click', async () => {
    const btn = $('moveBranchSaveBtn');
    const branchId = $('moveBranchSelect').value;
    if (!branchId) return showMessage('moveBranchMsg', 'اختار الفرع الجديد', 'error');
    btn.disabled = true;
    try {
      const token = await getAccessToken();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_move_user_branch`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ p_user_id: moveBranchUserId, p_branch_id: branchId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'تعذر نقل الموظف');
      hideModal('moveBranchModal');
      showSuccessModal('تم بنجاح!', `تم نقل الموظف إلى ${data.branch}`);
      loadOrg();   // refresh cached org data (current branches)
      loadUsers();
    } catch (err) {
      showMessage('moveBranchMsg', err.message, 'error');
    } finally { btn.disabled = false; }
  });
}
