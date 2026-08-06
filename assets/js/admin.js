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
const sections = { users: 'إدارة المستخدمين', create: 'إنشاء مستخدم جديد', actions: 'إجراءات الحساب', tables: 'إدارة الجداول', settings: 'الإعدادات', train: 'تدريب الذكاء الاصطناعي' };

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
if ($('createUserForm')) $('createUserForm').addEventListener('submit', async (e) => {
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
    if (section === 'tables') {
      showTablesListView();
      if (!tablesLoaded) loadTables();
    }
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

// ═══════════════════════════════════════════════════════════════
// ─── Tables Management (إدارة كل جداول قاعدة البيانات) ─────────
// ═══════════════════════════════════════════════════════════════

let allTables = [];
let tablesLoaded = false;
let currentTable = null;
let currentTableColumns = [];
let currentPage = 1;
const TABLE_PAGE_SIZE = 25;
let currentRowSearch = '';
let editingRowPkValue = null;
let deleteRowTarget = { pkCol: null, pkValue: null, label: '' };

const TABLE_ICONS = ['ti-table', 'ti-database', 'ti-list', 'ti-folder', 'ti-file-text', 'ti-tags'];
function tableIconFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TABLE_ICONS[Math.abs(hash) % TABLE_ICONS.length];
}

function getPkColumn(columns) {
  const pk = (columns || []).find(c => c.is_primary_key);
  return pk ? pk.column_name : null;
}

function isNumericType(dataType) {
  return ['integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision', 'decimal'].includes(dataType);
}
function isBooleanType(dataType) { return dataType === 'boolean'; }
function isDateType(dataType) { return dataType === 'date'; }
function isTimestampType(dataType) { return dataType && dataType.startsWith('timestamp'); }

// ─── Tables List View ───
function showTablesListView() {
  $('tablesListView').style.display = '';
  $('tableDataView').style.display = 'none';
}
function showTableDataView() {
  $('tablesListView').style.display = 'none';
  $('tableDataView').style.display = '';
}

async function loadTables() {
  try {
    const data = await callEdgeFunction('list_tables');
    allTables = data.tables || [];
    tablesLoaded = true;
    renderTablesGrid(allTables);
  } catch (error) {
    $('tablesGrid').innerHTML = `<div style="text-align:center;padding:40px;color:var(--danger);grid-column:1/-1">خطأ: ${error.message}</div>`;
  }
}

function renderTablesGrid(tables) {
  const grid = $('tablesGrid');
  if (!grid) return;
  if (!tables.length) {
    grid.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af;grid-column:1/-1">لا توجد جداول</div>`;
    return;
  }
  grid.innerHTML = tables.map(t => `
    <div class="table-card" onclick="openTable('${t.table_name}')">
      <div class="table-card-ico"><i class="ti ${tableIconFor(t.table_name)}"></i></div>
      <div class="table-card-info">
        <div class="table-card-name">${t.table_name}</div>
        <div class="table-card-cols">${(t.columns || []).length} عمود</div>
      </div>
      <i class="ti ti-chevron-left table-card-arrow"></i>
    </div>
  `).join('');
}

if ($('tablesSearch')) {
  $('tablesSearch').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    renderTablesGrid(allTables.filter(t => t.table_name.toLowerCase().includes(q)));
  });
}
if ($('refreshTablesBtn')) $('refreshTablesBtn').addEventListener('click', loadTables);

// ─── Single Table Data View ───
async function openTable(tableName) {
  currentTable = tableName;
  currentPage = 1;
  currentRowSearch = '';
  if ($('tableRowSearch')) $('tableRowSearch').value = '';
  $('tableDataTitle').textContent = tableName;
  showTableDataView();
  await loadTableData();
}

if ($('backToTablesBtn')) $('backToTablesBtn').addEventListener('click', showTablesListView);

async function loadTableData() {
  const tbody = $('dynamicTableBody');
  tbody.innerHTML = `<tr><td style="text-align:center;padding:40px;color:#9ca3af"><i class="ti ti-loader" style="font-size:20px;animation:spin 1s linear infinite"></i><br>جاري تحميل البيانات...</td></tr>`;
  try {
    const data = await callEdgeFunction('get_table_data', {
      table: currentTable,
      page: currentPage,
      pageSize: TABLE_PAGE_SIZE,
      search: currentRowSearch,
    });
    currentTableColumns = data.columns || [];
    renderTableHead(currentTableColumns);
    renderTableRows(data.rows || [], currentTableColumns);
    updatePager(data.total || 0, data.page || 1, data.pageSize || TABLE_PAGE_SIZE);
  } catch (error) {
    tbody.innerHTML = `<tr><td style="text-align:center;padding:30px;color:var(--danger)">خطأ: ${error.message}</td></tr>`;
  }
}

function renderTableHead(columns) {
  const thead = $('dynamicTableHead');
  thead.innerHTML = `<tr>${columns.map(c => `<th>${c.column_name}${c.is_primary_key ? ' <i class="ti ti-key" style="font-size:11px;opacity:.6"></i>' : ''}</th>`).join('')}<th>الإجراءات</th></tr>`;
}

function formatCellValue(value, column) {
  if (value === null || value === undefined) return '<span style="color:#c4c9d4">NULL</span>';
  if (isBooleanType(column.data_type)) {
    return value ? '<span class="badge" style="background:#d1fae5;color:#065f46">✓ صح</span>' : '<span class="badge" style="background:#fee2e2;color:#991b1b">✗ خطأ</span>';
  }
  let str = String(value);
  if (typeof value === 'object') str = JSON.stringify(value);
  if (str.length > 60) return `<span title="${str.replace(/"/g, '&quot;')}">${str.substring(0, 60)}…</span>`;
  return str;
}

function renderTableRows(rows, columns) {
  const tbody = $('dynamicTableBody');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${columns.length + 1}" style="text-align:center;padding:40px;color:#9ca3af">لا توجد بيانات</td></tr>`;
    return;
  }
  const pkCol = getPkColumn(columns);
  tbody.innerHTML = rows.map((row, idx) => `
    <tr>
      ${columns.map(c => `<td>${formatCellValue(row[c.column_name], c)}</td>`).join('')}
      <td>
        <div class="acts">
          <button class="act-btn magic" onclick='openEditRowModal(${JSON.stringify(row).replace(/'/g, "&#39;")})'>
            <i class="ti ti-edit" style="font-size:13px"></i> تعديل
          </button>
          <button class="act-btn del" onclick='confirmDeleteRow(${JSON.stringify(pkCol ? row[pkCol] : null)}, ${JSON.stringify((pkCol ? row[pkCol] : '') + '')})'>
            <i class="ti ti-trash" style="font-size:13px"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function updatePager(total, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  $('tableRowCount').textContent = `${total} صف`;
  $('tablePageInfo').textContent = `صفحة ${page} من ${totalPages}`;
  $('currentPageBtn').textContent = page;
  $('prevPageBtn').disabled = page <= 1;
  $('nextPageBtn').disabled = page >= totalPages;
}

if ($('prevPageBtn')) $('prevPageBtn').addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; loadTableData(); }
});
if ($('nextPageBtn')) $('nextPageBtn').addEventListener('click', () => {
  currentPage++; loadTableData();
});

let rowSearchTimeout = null;
if ($('tableRowSearch')) $('tableRowSearch').addEventListener('input', (e) => {
  clearTimeout(rowSearchTimeout);
  rowSearchTimeout = setTimeout(() => {
    currentRowSearch = e.target.value.trim();
    currentPage = 1;
    loadTableData();
  }, 400);
});

// ─── Dynamic Add/Edit Row Form ───
function inputForColumn(column, value) {
  const name = column.column_name;
  const readonly = column.is_primary_key ? 'readonly' : '';
  const disabledStyle = column.is_primary_key ? 'style="background:var(--bg);color:var(--text-muted)"' : '';

  if (isBooleanType(column.data_type)) {
    const checked = value === true ? 'checked' : '';
    return `
      <div class="form-group">
        <label>${name}</label>
        <label class="toggle-wrap">
          <div class="toggle">
            <input type="checkbox" data-col="${name}" data-type="boolean" ${checked}>
            <div class="toggle-track"></div>
            <div class="toggle-thumb"></div>
          </div>
        </label>
      </div>`;
  }
  if (isNumericType(column.data_type)) {
    return `
      <div class="form-group">
        <label>${name}${column.is_foreign_key ? ` <span style="color:var(--text-muted);font-size:.75rem">(مرتبط بـ ${column.foreign_table})</span>` : ''}</label>
        <input type="number" step="any" class="form-input" data-col="${name}" data-type="number" value="${value ?? ''}" ${readonly} ${disabledStyle}>
      </div>`;
  }
  if (isDateType(column.data_type)) {
    const v = value ? String(value).substring(0, 10) : '';
    return `
      <div class="form-group">
        <label>${name}</label>
        <input type="date" class="form-input" data-col="${name}" data-type="date" value="${v}" ${readonly} ${disabledStyle}>
      </div>`;
  }
  if (isTimestampType(column.data_type)) {
    const v = value ? String(value).substring(0, 16) : '';
    return `
      <div class="form-group">
        <label>${name}</label>
        <input type="datetime-local" class="form-input" data-col="${name}" data-type="timestamp" value="${v}" ${readonly} ${disabledStyle}>
      </div>`;
  }
  // نص افتراضي
  const strVal = value === null || value === undefined ? '' : (typeof value === 'object' ? JSON.stringify(value) : value);
  return `
    <div class="form-group">
      <label>${name}${column.is_foreign_key ? ` <span style="color:var(--text-muted);font-size:.75rem">(مرتبط بـ ${column.foreign_table})</span>` : ''}</label>
      <input type="text" class="form-input" data-col="${name}" data-type="text" value="${String(strVal).replace(/"/g, '&quot;')}" ${readonly} ${disabledStyle}>
    </div>`;
}

function buildRowForm(columns, rowData) {
  const container = $('rowFormFields');
  container.innerHTML = columns.map(col => inputForColumn(col, rowData ? rowData[col.column_name] : null)).join('');
}

function openAddRowModal() {
  editingRowPkValue = null;
  $('rowModalTitle').textContent = `إضافة صف جديد - ${currentTable}`;
  // نخفي عمود الـ primary key عند الإضافة لو مفيهوش قيمة افتراضية مطلوبة (عادة auto-increment)
  const columns = currentTableColumns.filter(c => !c.is_primary_key || c.column_default);
  buildRowForm(columns.length ? columns : currentTableColumns, null);
  showModal('rowModal');
}

function openEditRowModal(rowData) {
  const pkCol = getPkColumn(currentTableColumns);
  editingRowPkValue = pkCol ? rowData[pkCol] : null;
  $('rowModalTitle').textContent = `تعديل صف - ${currentTable}`;
  buildRowForm(currentTableColumns, rowData);
  showModal('rowModal');
}
window.openEditRowModal = openEditRowModal;
window.openTable = openTable;

if ($('addRowBtn')) $('addRowBtn').addEventListener('click', openAddRowModal);

function collectRowFormValues() {
  const inputs = document.querySelectorAll('#rowFormFields [data-col]');
  const result = {};
  inputs.forEach(input => {
    const col = input.dataset.col;
    const type = input.dataset.type;
    if (input.hasAttribute('readonly') && editingRowPkValue !== null) return; // متجاهلين الـ pk عند التعديل
    if (type === 'boolean') {
      result[col] = input.checked;
    } else if (type === 'number') {
      result[col] = input.value === '' ? null : Number(input.value);
    } else if (type === 'date') {
      result[col] = input.value || null;
    } else if (type === 'timestamp') {
      result[col] = input.value ? new Date(input.value).toISOString() : null;
    } else {
      result[col] = input.value === '' ? null : input.value;
    }
  });
  return result;
}

if ($('rowSaveBtn')) $('rowSaveBtn').addEventListener('click', async () => {
  const btn = $('rowSaveBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

  try {
    const rowValues = collectRowFormValues();
    if (editingRowPkValue !== null) {
      await callEdgeFunction('update_row', { table: currentTable, id: editingRowPkValue, row: rowValues });
    } else {
      await callEdgeFunction('insert_row', { table: currentTable, row: rowValues });
    }
    hideModal('rowModal');
    showMessage('rowFormMessage', 'تم الحفظ بنجاح', 'success');
    loadTableData();
  } catch (error) {
    showMessage('rowFormMessage', error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

// ─── Delete Row ───
function confirmDeleteRow(pkValue, label) {
  const pkCol = getPkColumn(currentTableColumns);
  deleteRowTarget = { pkCol, pkValue, label };
  $('deleteRowInfo').textContent = `${pkCol}: ${label}`;
  showModal('deleteRowModal');
}
window.confirmDeleteRow = confirmDeleteRow;

if ($('confirmDeleteRowBtn')) $('confirmDeleteRowBtn').addEventListener('click', async () => {
  if (deleteRowTarget.pkValue === null || deleteRowTarget.pkValue === undefined) {
    showErrorModal('لا يمكن حذف هذا الصف: الجدول ليس له Primary Key محدد');
    hideModal('deleteRowModal');
    return;
  }
  const btn = $('confirmDeleteRowBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحذف...';

  try {
    await callEdgeFunction('delete_row', { table: currentTable, id: deleteRowTarget.pkValue });
    hideModal('deleteRowModal');
    showSuccessModal('تم بنجاح!', 'تم حذف الصف بنجاح');
    loadTableData();
  } catch (error) {
    showErrorModal(error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

// ─── Training AI Panel ───
(function () {
  const SUPABASE_PROJECT_REF = SUPABASE_URL.split('.')[0].replace('https://', '');
  const TRAIN_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/admin-train`;

  const gate = document.getElementById("kt-gate");
  const content = document.getElementById("kt-content");
  const gateMsg = document.getElementById("kt-gate-msg");

  // بيجيب توكن الأدمن من نفس نظام تسجيل الدخول بتاع موقعك
  function getUserToken() {
    try {
      const key = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.access_token || parsed?.currentSession?.access_token || null;
    } catch (e) {
      return null;
    }
  }

  function showMsg(el, text, ok) {
    el.textContent = text;
    el.className = "kt-msg " + (ok ? "ok" : "err");
  }

  async function callTrain(action, payload, btn) {
    if (btn) btn.disabled = true;
    const token = getUserToken() || (await getAccessToken());
    try {
      const res = await fetch(TRAIN_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (token || "") },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (btn) btn.disabled = false;
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: data.error, forbidden: true };
      }
      if (data.error) return { ok: false, error: data.error };
      return { ok: true, data };
    } catch (e) {
      if (btn) btn.disabled = false;
      return { ok: false, error: String(e) };
    }
  }

  async function init() {
    const result = await callTrain("list_chunks", {});
    if (!result.ok && result.forbidden) {
      gate.style.display = "block";
      content.style.display = "none";
      showMsg(gateMsg, result.error || "الحساب ده مش عنده صلاحية أدمن", false);
      return;
    }
    gate.style.display = "none";
    content.style.display = "block";
    loadChunks();
  }

  window.initTrainPanel = init;

  // ---------- نص ----------
  document.getElementById("kt-train-text-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("kt-train-text-btn");
    const label = document.getElementById("kt-text-label").value.trim();
    const text = document.getElementById("kt-text-content").value.trim();
    const msg = document.getElementById("kt-text-msg");
    if (!text) return showMsg(msg, "اكتب نص الأول", false);
    const r = await callTrain("train_text", { text, label }, btn);
    if (r.ok) {
      showMsg(msg, `تم! تمت إضافة ${r.data.chunks_added || 1} قطعة معرفة.`, true);
      document.getElementById("kt-text-content").value = "";
      loadChunks();
    } else showMsg(msg, r.error, false);
  });

  // ---------- رابط ----------
  document.getElementById("kt-train-url-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("kt-train-url-btn");
    const url = document.getElementById("kt-url-input").value.trim();
    const msg = document.getElementById("kt-url-msg");
    if (!url) return showMsg(msg, "حط رابط الأول", false);
    showMsg(msg, "بيقرا الصفحة...", true);
    const r = await callTrain("train_website", { url, label: url }, btn);
    if (r.ok) {
      showMsg(msg, `تم! تمت إضافة ${r.data.chunks_added || 1} قطعة معرفة من الصفحة.`, true);
      loadChunks();
    } else showMsg(msg, r.error, false);
  });

  // ---------- ملف ----------
  document.getElementById("kt-train-file-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("kt-train-file-btn");
    const fileInput = document.getElementById("kt-file-input");
    const msg = document.getElementById("kt-file-msg");
    const file = fileInput.files[0];
    if (!file) return showMsg(msg, "اختار ملف الأول", false);
    showMsg(msg, "بيرفع ويحلل الملف...", true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];
      const r = await callTrain(
        "train_file",
        { file_base64: base64, file_name: file.name, mime_type: file.type },
        btn
      );
      if (r.ok) {
        showMsg(msg, `تم! تمت إضافة ${r.data.chunks_added || 1} قطعة معرفة من الملف.`, true);
        fileInput.value = "";
        loadChunks();
      } else showMsg(msg, r.error, false);
    };
    reader.readAsDataURL(file);
  });

  // ---------- صورة ----------
  document.getElementById("kt-train-image-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("kt-train-image-btn");
    const fileInput = document.getElementById("kt-image-input");
    const msg = document.getElementById("kt-image-msg");
    const file = fileInput.files[0];
    if (!file) return showMsg(msg, "اختار صورة الأول", false);
    showMsg(msg, "بيحلل الصورة...", true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];
      const r = await callTrain(
        "train_image",
        { image_base64: base64, mime_type: file.type, label: file.name },
        btn
      );
      if (r.ok) {
        showMsg(msg, `تم! الوصف اللي فهمه: "${r.data.description?.slice(0, 80) || 'تم الحفظ'}..."`, true);
        fileInput.value = "";
        loadChunks();
      } else showMsg(msg, r.error, false);
    };
    reader.readAsDataURL(file);
  });

  // ---------- جدول ----------
  document.getElementById("kt-train-table-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("kt-train-table-btn");
    const tableName = document.getElementById("kt-table-name").value.trim();
    const columns = document.getElementById("kt-table-columns").value.trim().split(",").map((c) => c.trim()).filter(Boolean);
    const msg = document.getElementById("kt-table-msg");
    if (!tableName || columns.length === 0) return showMsg(msg, "حط اسم الجدول والأعمدة", false);
    const r = await callTrain("train_table", { table_name: tableName, columns, label: tableName }, btn);
    if (r.ok) {
      showMsg(msg, `تم! تمت إضافة ${r.data.chunks_added || 1} صف من الجدول.`, true);
      loadChunks();
    } else showMsg(msg, r.error, false);
  });

  // ---------- عرض/حذف ----------
  async function loadChunks() {
    const r = await callTrain("list_chunks", {});
    const tbody = document.querySelector("#kt-chunks-table tbody");
    tbody.innerHTML = "";
    if (!r.ok) return;
    if (!r.data.chunks || r.data.chunks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">لا توجد مواد تدريب حتى الآن</td></tr>';
      return;
    }
    r.data.chunks.forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="kt-tag">${c.source_type || 'نص'}</span><br><small>${c.source_label || ""}</small></td>
        <td>${c.content.slice(0, 90)}...</td>
        <td>${new Date(c.created_at).toLocaleDateString("ar-EG")}</td>
        <td><button class="kt-del" data-id="${c.id}">حذف</button></td>
      `;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll(".kt-del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("هل أنت متأكد من حذف هذه القطعة؟")) {
          await callTrain("delete_chunk", { id: Number(btn.dataset.id) });
          loadChunks();
        }
      });
    });
  }
  document.getElementById("kt-refresh-btn")?.addEventListener("click", loadChunks);
})();

// ─── Initialize ───
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  // Initialize training panel when train section is shown
  const trainBtn = document.querySelector('[data-section="train"]');
  if (trainBtn) {
    trainBtn.addEventListener('click', () => {
      setTimeout(() => window.initTrainPanel && window.initTrainPanel(), 100);
    });
  }
});
