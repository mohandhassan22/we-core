// Headless UI tests. Needs jsdom (dev only):  npm i jsdom   then   node --test target-manager/tests/ui-smoke.test.js
// They run the REAL pages + JS against a mocked backend that answers like Supabase / the Edge Function.
let JSDOM;
try { ({ JSDOM } = require('jsdom')); } catch (e) { /* jsdom not installed -> tests are skipped */ }
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const C = require('../js/target-calculator.js');
const U = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const ME = U(1), A1 = U(100), B1 = U(200), E1 = U(11), E2 = U(12);
const XSS = '<img src=x onerror="window.__xss=1">';
const PERIOD = { id: U(900), start_date: '2026-10-01', end_date: '2026-10-31', target_days: 20 };

function summaryFor(lines, today = '2026-10-10') {
  const rows = lines.map((v, i) => ({ performance_date: `2026-10-${String(i + 1).padStart(2, '0')}`, pt12: v, adsl: 1 }));
  return C.calculateSummary({ targets: { pt12: 60, adsl: 10 }, dailyRows: rows, period: PERIOD, today });
}
const empSummary = summaryFor([2, 3, 2, 3, 2, 3, 2, 3, 2, 3]);
const empSummary2 = summaryFor([4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
const lineView = (s) => ({ target: s.lines.target, achieve: s.lines.achieve, percentage: s.lines.percentage, projection: s.lines.projection, remaining: s.lines.remaining, todayRequired: s.lines.todayRequired, status: s.lines.status });

function boot(page, { query = '', role = 'branch_manager', routes = {} } = {}) {
  const html = fs.readFileSync(path.join(ROOT, 'pages', page), 'utf8');
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const srcs = [...html.matchAll(/<script src="\.\.\/js\/([^"]+)"/g)].map((m) => m[1]);
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(body, { url: `https://we-core.icu/target-manager/pages/${page}${query}`, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.document.cookie = 'sb-access-token=test-token';
  w._sbUser = { id: ME };
  w.Chart = class { constructor(ctx, cfg) { this.cfg = cfg; w.__charts = (w.__charts || []).concat([cfg]); } destroy() {} };
  w.Chart.defaults = { font: {}, plugins: { tooltip: {}, legend: { labels: {} } } };
  w.HTMLCanvasElement.prototype.getContext = () => ({});

  const calls = [];
  w.fetch = async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const bodyJson = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ url, method, body: bodyJson, headers: opts.headers });
    const key = Object.keys(routes).find((k) => url.includes(k) && (!k.startsWith('POST ') || true));
    const match = Object.keys(routes).filter((k) => {
      const [m, frag] = k.includes('|') ? k.split('|') : ['GET', k];
      return method === m && url.includes(frag);
    }).sort((a, b) => b.length - a.length)[0];
    let out = match ? routes[match] : { status: 404, body: { message: 'no route ' + method + ' ' + url } };
    if (typeof out === 'function') out = out({ url, method, body: bodyJson });
    const status = out.status || 200;
    const text = out.body === undefined ? '' : JSON.stringify(out.body);
    return { ok: status < 400, status, text: async () => text };
  };

  const base = {
    'GET|/rest/v1/profiles': { body: [{ id: ME, full_name: XSS, username: 'mgr', role: 'Store Manager', branch_id: B1, area_id: null }] },
    'POST|/rest/v1/rpc/app_role': { body: role },
    'POST|/rest/v1/rpc/is_admin': { body: role === 'admin' },
    'GET|/rest/v1/areas': { body: role === 'area_manager' ? [{ id: A1, name: 'منطقة الجيزة', manager_id: ME }] : [] },
    'GET|/rest/v1/branches': { body: [{ id: B1, name: 'الدقي', code: 'DK', area_id: A1, manager_id: role === 'branch_manager' ? ME : null }] }
  };
  Object.assign(routes, Object.assign({}, base, routes));

  const load = (name) => w.eval(fs.readFileSync(path.join(ROOT, 'js', name), 'utf8'));
  srcs.forEach(load);
  inline.forEach((code) => w.eval(code));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const settle = async (ms = 60) => { for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, ms)); };
  return { w, d: w.document, calls, settle };
}

const branchRoute = () => ({
  'POST|/functions/v1/get-dashboard-data': {
    body: {
      viewer: { id: ME, role: 'branch_manager' }, month: 10, year: 2026, today: '2026-10-10', availableMonths: [{ month: 10, year: 2026 }],
      scope: { type: 'branch', id: B1, name: 'الدقي', code: 'DK', area: { id: A1, name: 'منطقة الجيزة' } },
      summary: C.aggregateSummaries([empSummary, empSummary2]),
      employees: [
        { id: E1, name: XSS, hasPeriod: true, lines: lineView(empSummary) },
        { id: E2, name: 'منى', hasPeriod: true, lines: lineView(empSummary2) },
        { id: U(13), name: 'بدون هدف', hasPeriod: false, lines: null }
      ],
      daily: [{ date: '2026-10-01', lines: 6, pt12: 6, super_kix: 0, tazbeet: 0, data: 0, adsl: 2, fixed: 0, we_pay: 0 }]
    }
  }
});

const run = JSDOM ? test : test.skip;

run('branch dashboard renders REAL numbers, escapes names (XSS) and shows every employee', async () => {
  const { w, d, settle } = boot('branch-manager.html', { routes: branchRoute() });
  await settle();
  const kpi = d.getElementById('kpiGridContainer').textContent;
  assert.match(kpi, /120/);                 // 60 + 60 branch target
  assert.match(kpi, /Projection/);
  assert.equal(d.querySelectorAll('#employeesTableHost tbody tr').length, 3);
  assert.equal(d.querySelector('#employeesTableHost img'), null, 'employee name must be escaped');
  assert.equal(w.__xss, undefined);
  assert.equal(d.querySelector('#headerUserName').textContent, XSS); // text, not HTML
  assert.ok(d.querySelector('#employeesTableHost tr[data-href*="agent.html?emp="]'));
  assert.match(d.getElementById('aiCoachText').textContent, /قواعد حسابية/);
  assert.ok((w.__charts || []).length >= 5);
  assert.equal(d.getElementById('sidebarNav').textContent.includes('Supervisor'), false);
});

run('manager sets targets: split + save sends on_conflict upserts for every employee', async () => {
  const routes = branchRoute();
  routes['GET|/rest/v1/target_periods'] = { body: [] };
  routes['POST|/rest/v1/target_periods'] = ({ body }) => ({ body: [{ id: 'p-' + body.user_id }] });
  routes['POST|/rest/v1/targets'] = { status: 201 };
  const { d, calls, settle } = boot('branch-manager.html', { routes });
  await settle();
  d.getElementById('openTargetsBtn').click();
  await settle();
  assert.equal(d.querySelectorAll('.tgt-input').length, 3 * 7);
  d.getElementById('split_pt12').value = '10';
  d.getElementById('applySplitBtn').click();
  const vals = [...d.querySelectorAll('.tgt-input[data-item="pt12"]')].map((i) => Number(i.value));
  assert.equal(vals.reduce((a, b) => a + b, 0), 10);
  d.getElementById('tpDays').value = '22';
  d.getElementById('saveTargetsBtn').click();
  await settle();
  const periodPosts = calls.filter((c) => c.method === 'POST' && c.url.includes('target_periods?on_conflict=user_id,month,year'));
  const targetPosts = calls.filter((c) => c.method === 'POST' && c.url.includes('targets?on_conflict=period_id,item'));
  assert.equal(periodPosts.length, 3);
  assert.equal(targetPosts.length, 3);
  assert.equal(periodPosts[0].body.target_days, 22);
  assert.equal(periodPosts[0].body.month, 10);
  assert.equal(targetPosts[0].body.length, 7);
  assert.deepEqual(targetPosts[0].body.map((r) => r.item), ['pt12', 'super_kix', 'tazbeet', 'data', 'adsl', 'fixed', 'we_pay']);
  assert.match(d.querySelector('.toast').textContent, /تم حفظ/);
  assert.ok(calls.every((c) => c.headers && c.headers.Authorization === 'Bearer test-token'));
});

run('a failed save is REPORTED (no fake success)', async () => {
  const routes = branchRoute();
  routes['GET|/rest/v1/target_periods'] = { body: [] };
  routes['POST|/rest/v1/target_periods'] = ({ body }) => body.user_id === E2 ? { status: 403, body: { code: '42501', message: 'rls' } } : { body: [{ id: 'p-' + body.user_id }] };
  routes['POST|/rest/v1/targets'] = { status: 201 };
  const { d, settle } = boot('branch-manager.html', { routes });
  await settle();
  d.getElementById('openTargetsBtn').click();
  await settle();
  d.getElementById('split_pt12').value = '30';
  d.getElementById('applySplitBtn').click();
  d.getElementById('saveTargetsBtn').click();
  await settle();
  const toast = d.querySelector('.toast.toast-error');
  assert.ok(toast, 'error toast expected');
  assert.match(toast.textContent, /غير مسموح/);
  assert.equal(d.querySelector('.toast.toast-success'), null);
});

run('agent without a period sees an honest empty state, never demo numbers', async () => {
  const routes = {
    'GET|/rest/v1/profiles': { body: [{ id: ME, full_name: 'سارة', username: 's', role: 'agent', branch_id: B1, area_id: null }] },
    'POST|/functions/v1/get-dashboard-data': { body: { viewer: { id: ME, role: 'agent' }, scope: { type: 'employee', id: ME, name: 'سارة', branch: { id: B1, name: 'الدقي' }, area: null }, month: 10, year: 2026, availableMonths: [], hasPeriod: false, period: null, summary: null, daily: [] } }
  };
  const { d, settle } = boot('agent.html', { role: 'agent', routes });
  await settle();
  assert.match(d.getElementById('stateHost').textContent, /لا يوجد Target/);
  assert.equal(d.getElementById('pageBody').style.display, 'none');
  assert.equal(d.getElementById('kpiGridContainer').querySelectorAll('.kpi-card').length, 0);
});

run('agent dashboard shows the 6 KPIs, all 7 items and the daily-entry button', async () => {
  const routes = {
    'GET|/rest/v1/profiles': { body: [{ id: ME, full_name: 'سارة', username: 's', role: 'agent', branch_id: B1, area_id: null }] },
    'POST|/functions/v1/get-dashboard-data': { body: { viewer: { id: ME, role: 'agent' }, scope: { type: 'employee', id: ME, name: 'سارة', branch: { id: B1, name: 'الدقي' }, area: null }, month: 10, year: 2026, today: '2026-10-10', availableMonths: [{ month: 10, year: 2026 }], hasPeriod: true, period: PERIOD, summary: empSummary, daily: [] } }
  };
  const { d, settle } = boot('agent.html', { role: 'agent', routes });
  await settle();
  assert.equal(d.querySelectorAll('#kpiGridContainer .kpi-card').length, 6);
  assert.equal(d.querySelectorAll('#itemsGridContainer .item-card').length, 7);
  assert.match(d.getElementById('kpiGridContainer').textContent, /8/); // today's required (3 + deficit 5)
  assert.ok(d.querySelector('#heroActions button[onclick*="openDailyModal"]'));
});

run('server error shows an error state with retry (no admin/demo fallback)', async () => {
  const { d, settle } = boot('branch-manager.html', { routes: { 'POST|/functions/v1/get-dashboard-data': { status: 500, body: { error: 'internal_error' } } } });
  await settle();
  assert.match(d.getElementById('stateHost').textContent, /تعذر/);
  assert.ok(d.querySelector('#stateHost button'));
  assert.equal(d.getElementById('kpiGridContainer').querySelectorAll('.kpi-card').length, 0);
});

run('area dashboard lists branches with drill-down links', async () => {
  const routes = {
    'POST|/functions/v1/get-dashboard-data': { body: { viewer: { id: ME, role: 'area_manager' }, month: 10, year: 2026, today: '2026-10-10', availableMonths: [], scope: { type: 'area', id: A1, name: 'منطقة الجيزة' }, summary: C.aggregateSummaries([empSummary]),
      branches: [{ id: B1, name: 'الدقي', code: 'DK', employees: 4, withTargets: 1, lines: C.aggregateSummaries([empSummary]).lines }, { id: U(201), name: 'المهندسين', code: 'MH', employees: 2, withTargets: 0, lines: null }], daily: [] } }
  };
  const { d, settle } = boot('area-manager.html', { role: 'area_manager', routes });
  await settle();
  const rows = d.querySelectorAll('#branchesTableHost tbody tr');
  assert.equal(rows.length, 2);
  assert.ok([...rows].some((r) => (r.getAttribute('data-href') || '').includes('branch-manager.html?branch=' + B1)));
  assert.match(d.getElementById('branchesTableHost').textContent, /لا يوجد Target/);
});

run('permissions: supervisor no longer exists; unknown roles fall back to agent (own data)', () => {
  const w = new JSDOM('<body></body>', { url: 'https://we-core.icu/target-manager/pages/agent.html', runScripts: 'outside-only' }).window;
  w.eval(fs.readFileSync(path.join(ROOT, 'js', 'utils.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(ROOT, 'js', 'permissions.js'), 'utf8'));
  const P = w.Permissions;
  assert.equal(P.normalizeRole('supervisor'), 'agent');
  assert.equal(P.normalizeRole('other'), 'agent');
  assert.equal(P.normalizeRole('area_manager'), 'area_manager');
  assert.equal(P.ROLE_CONFIGS.supervisor, undefined);
  assert.equal(P.isManager('agent'), false);
  assert.equal(P.isManager('branch_manager'), true);
  assert.equal(P.ROLE_CONFIGS.agent.allowedPages.includes('branch-manager.html'), false);
  assert.equal(P.ROLE_CONFIGS.branch_manager.allowedPages.includes('area-manager.html'), false);
});

run('no demo/mock/default-admin remnants in shipped JS or pages', () => {
  const files = fs.readdirSync(path.join(ROOT, 'js')).map((f) => path.join(ROOT, 'js', f))
    .concat(fs.readdirSync(path.join(ROOT, 'pages')).map((f) => path.join(ROOT, 'pages', f)), [path.join(ROOT, 'index.html')]);
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(s, /demo-user|default-period|sampleData|Math\.random\(|role:\s*'admin'\s*,\s*\n?\s*branch/, path.basename(f));
    assert.doesNotMatch(s, /supervisor/i, path.basename(f) + ' still mentions supervisor');
  }
});

const agentProfile = { id: ME, full_name: 'سارة', username: 's', role: 'agent', branch_id: B1, area_id: null };
const meDash = (hasPeriod) => ({ body: { viewer: { id: ME, role: 'agent' }, scope: { type: 'employee', id: ME, name: 'سارة', branch: { id: B1, name: 'الدقي' }, area: null }, month: 10, year: 2026, today: '2026-10-10', availableMonths: [], hasPeriod, period: hasPeriod ? PERIOD : null, summary: hasPeriod ? empSummary : null, daily: [] } });

run('performance page: saves against the REAL period id with on_conflict (no default-period)', async () => {
  const routes = {
    'GET|/rest/v1/profiles': { body: [agentProfile] },
    'POST|/functions/v1/get-dashboard-data': meDash(true),
    'GET|/rest/v1/daily_performance': { body: [{ performance_date: '2026-10-05', pt12: 3, super_kix: 1, tazbeet: 0, data: 0, adsl: 2, fixed: 0, we_pay: 0, notes: XSS }] },
    'POST|/rest/v1/daily_performance': { status: 201 }
  };
  const { d, w, calls, settle } = boot('performance.html', { role: 'agent', routes });
  await settle();
  const rows = d.querySelectorAll('#perfBody tr');
  assert.equal(rows.length, 1);
  assert.match(rows[0].textContent, /4/);               // total lines = 3 + 1
  assert.equal(d.querySelector('#perfBody img'), null);   // notes escaped
  d.getElementById('entryDate').value = '2026-10-06';
  d.getElementById('entry_pt12').value = '5';
  d.getElementById('saveDailyBtn').click();
  await settle();
  const post = calls.find((c) => c.method === 'POST' && c.url.includes('daily_performance?on_conflict=period_id,user_id,performance_date'));
  assert.ok(post, 'save request expected');
  assert.equal(post.body.period_id, PERIOD.id);
  assert.equal(post.body.user_id, ME);
  assert.equal(post.body.pt12, 5);
  assert.equal(w.__xss, undefined);
});

run('performance page without a period tells the employee who sets the target', async () => {
  const routes = { 'GET|/rest/v1/profiles': { body: [agentProfile] }, 'POST|/functions/v1/get-dashboard-data': meDash(false) };
  const { d, settle } = boot('performance.html', { role: 'agent', routes });
  await settle();
  assert.match(d.getElementById('stateHost').textContent, /مدير الفرع/);
  assert.equal(d.getElementById('heroActions').querySelector('#addBtn'), null);
});

run('history page (branch manager): real table from the server and a safe CSV export', async () => {
  const { w, d, settle } = boot('history.html', { routes: Object.assign(branchRoute(), {}) });
  let csv = null;
  w.Blob = class { constructor(parts) { csv = parts.join(''); } };
  w.URL.createObjectURL = () => 'blob:x';
  w.URL.revokeObjectURL = () => {};
  // managedBranches comes from the mocked /branches (manager_id = ME)
  await settle();
  assert.equal(d.querySelectorAll('#body1 tr').length, 3);
  assert.equal(d.querySelector('#body1 img'), null);
  d.getElementById('exp1').click();
  assert.ok(csv && csv.startsWith('\uFEFF'));
  d.getElementById('exp2').click();
  assert.match(csv, /PT12/);
});

run('settings page: the user can only PATCH their own name', async () => {
  const routes = {
    'GET|/rest/v1/profiles': { body: [agentProfile] },
    'PATCH|/rest/v1/profiles': { status: 204 }
  };
  const { d, calls, settle } = boot('settings.html', { role: 'agent', routes });
  await settle();
  d.getElementById('setName').value = 'سارة أحمد';
  d.getElementById('saveName').click();
  await settle();
  const patch = calls.find((c) => c.method === 'PATCH');
  assert.ok(patch);
  assert.ok(patch.url.endsWith('profiles?id=eq.' + ME));
  assert.deepEqual(Object.keys(patch.body), ['full_name']);   // never role / email / username
  assert.equal(d.getElementById('setUser').disabled, true);
});

run('CSV export neutralises spreadsheet formulas', () => {
  const w = new JSDOM('<body></body>', { url: 'https://we-core.icu/target-manager/pages/history.html', runScripts: 'outside-only' }).window;
  w.eval(fs.readFileSync(path.join(ROOT, 'js', 'utils.js'), 'utf8'));
  let csv = '';
  w.Blob = class { constructor(p) { csv = p.join(''); } };
  w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
  w.Utils.exportToExcel('t', [['=HYPERLINK("http://evil")', 5, '-3', '@x']], ['a', 'b', 'c', 'd']);
  assert.ok(csv.includes('"\'=HYPERLINK'));
  assert.ok(csv.includes('"5"') && csv.includes('"-3"'));  // real numbers untouched
  assert.ok(csv.includes('"\'@x"'));
});
