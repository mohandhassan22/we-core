/**
 * WE Target Manager - Dashboard renderer (agent | branch | area)
 *
 * All numbers come from the get-dashboard-data Edge Function (authorised server-side) and
 * are computed by TargetCalculator. Nothing here invents data: no data -> an explicit empty state.
 */
(function (global) {
    var ITEM_LABELS = { pt12: 'PT12', super_kix: 'Super Kix', tazbeet: 'New Control Tazbeet', data: 'Data', adsl: 'ADSL', fixed: 'Fixed', we_pay: 'WE Pay' };
    var ITEMS = ['pt12', 'super_kix', 'tazbeet', 'data', 'adsl', 'fixed', 'we_pay'];
    var LINE_ITEMS = ['pt12', 'super_kix', 'tazbeet', 'data'];
    var PAGE_SIZE = 10;
    var esc = function (v) { return Utils.esc(v); };
    var fmt = function (n, d) { return Utils.formatNumber(n, d); };
    var $ = function (id) { return document.getElementById(id); };

    /* =====================================================================
     * Generic data table: search + status filter + sort + pagination + clickable rows
     * ===================================================================== */
    function DataTable(host, cfg) {
        this.host = host; this.cfg = cfg;
        this.q = ''; this.filter = 'all'; this.sortKey = cfg.defaultSort || null; this.dir = 'asc'; this.page = 1;
        this.build();
    }
    DataTable.prototype.build = function () {
        var self = this, cfg = this.cfg;
        var pills = cfg.filters ? '<div class="table-filter-pills">' + cfg.filters.map(function (f) {
            return '<button type="button" class="filter-pill' + (f.id === 'all' ? ' active' : '') + '" data-filter="' + esc(f.id) + '">' + esc(f.label) + '</button>';
        }).join('') + '</div>' : '';
        this.host.innerHTML =
            '<div class="table-toolbar"><h3 class="font-bold">' + esc(cfg.title) + '</h3>'
            + '<div class="table-search-box"><i class="fa-solid fa-search"></i>'
            + '<input type="text" class="form-input" placeholder="' + esc(cfg.searchPlaceholder || 'بحث...') + '" data-role="q"></div></div>'
            + pills
            + '<div class="data-table-container"><table class="data-table"><thead><tr>'
            + cfg.columns.map(function (c) {
                return '<th' + (c.key ? ' data-sort="' + esc(c.key) + '" style="cursor:pointer;"' : '') + '>' + esc(c.label) + (c.key ? ' <i class="fa-solid fa-sort" style="opacity:.4;font-size:.7rem;"></i>' : '') + '</th>';
            }).join('')
            + '</tr></thead><tbody data-role="body"></tbody></table></div>'
            + '<div class="table-pager" data-role="pager"></div>';
        this.body = this.host.querySelector('[data-role="body"]');
        this.pager = this.host.querySelector('[data-role="pager"]');

        this.host.querySelector('[data-role="q"]').addEventListener('input', function (e) { self.q = e.target.value.trim().toLowerCase(); self.page = 1; self.update(); });
        this.host.addEventListener('click', function (e) {
            var pill = e.target.closest('[data-filter]');
            if (pill) {
                self.filter = pill.getAttribute('data-filter'); self.page = 1;
                self.host.querySelectorAll('[data-filter]').forEach(function (p) { p.classList.toggle('active', p === pill); });
                return self.update();
            }
            var th = e.target.closest('th[data-sort]');
            if (th) {
                var k = th.getAttribute('data-sort');
                self.dir = self.sortKey === k && self.dir === 'asc' ? 'desc' : 'asc'; self.sortKey = k; return self.update();
            }
            var pg = e.target.closest('[data-page]');
            if (pg) { self.page = Number(pg.getAttribute('data-page')); return self.update(); }
            var tr = e.target.closest('tr[data-href]');
            if (tr && !e.target.closest('a')) window.location.href = tr.getAttribute('data-href');
        });
    };
    DataTable.prototype.setRows = function (rows) { this.rows = rows; this.update(); };
    DataTable.prototype.update = function () {
        var self = this, cfg = this.cfg, rows = (this.rows || []).slice();
        if (this.q) rows = rows.filter(function (r) { return String(cfg.searchText(r)).toLowerCase().indexOf(self.q) !== -1; });
        if (this.filter !== 'all') rows = rows.filter(function (r) { return cfg.statusOf(r) === self.filter; });
        if (this.sortKey) {
            var col = cfg.columns.find(function (c) { return c.key === self.sortKey; });
            var dir = this.dir === 'asc' ? 1 : -1;
            rows.sort(function (a, b) {
                var x = col.value(a), y = col.value(b);
                if (typeof x === 'string' || typeof y === 'string') return String(x).localeCompare(String(y), 'ar') * dir;
                return ((x || 0) - (y || 0)) * dir;
            });
        }
        var pages = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1);
        if (this.page > pages) this.page = pages;
        var slice = rows.slice((this.page - 1) * PAGE_SIZE, this.page * PAGE_SIZE);
        this.body.innerHTML = slice.length ? slice.map(function (r) {
            return '<tr' + (cfg.href ? ' data-href="' + esc(cfg.href(r)) + '" style="cursor:pointer;"' : '') + '>'
                + cfg.columns.map(function (c) { return '<td>' + c.render(r) + '</td>'; }).join('') + '</tr>';
        }).join('') : '<tr><td colspan="' + cfg.columns.length + '" class="text-center text-muted">لا توجد نتائج مطابقة</td></tr>';
        var html = '';
        if (pages > 1) for (var p = 1; p <= pages; p++) html += '<button type="button" class="filter-pill' + (p === this.page ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
        this.pager.innerHTML = html;
    };

    /* =====================================================================
     * Dashboard
     * ===================================================================== */
    var Dashboard = {
        state: { ctx: null, page: null, month: null, year: null, data: null, tables: {}, targetsInit: false },

        /* ---------- boot ---------- */
        init: async function (ctx, page) {
            var s = this.state;
            s.ctx = ctx; s.page = page;
            var cur = Utils.getCurrentMonthYear();
            var m = /^(\d{4})-(\d{2})$/.exec(Utils.param('m') || '');
            s.year = m ? Number(m[1]) : cur.year;
            s.month = m ? Number(m[2]) : cur.month;
            this.bindStaticEvents();
            await this.load();
        },

        monthParam: function () { return this.state.year + '-' + Utils.pad2(this.state.month); },

        /** Which request this page makes, from the URL + the user's own scope. null => nothing to show */
        resolveRequest: function () {
            var s = this.state, ctx = s.ctx;
            if (s.page === 'agent') {
                var emp = Utils.param('emp');
                if (!emp || emp === ctx.userId) {
                    if (Permissions.isManager(ctx.role)) return { empty: 'manager_no_emp' };
                    return { view: 'me' };
                }
                return { view: 'employee', id: emp };
            }
            if (s.page === 'branch') {
                var b = Utils.param('branch') || (ctx.managedBranches[0] && ctx.managedBranches[0].id) || (ctx.myBranch && ctx.role === 'branch_manager' && ctx.myBranch.id);
                return b ? { view: 'branch', id: b } : { empty: 'no_branch' };
            }
            var a = Utils.param('area') || (ctx.managedAreas[0] && ctx.managedAreas[0].id);
            return a ? { view: 'area', id: a } : { empty: 'no_area' };
        },

        load: async function () {
            var s = this.state, req = this.resolveRequest();
            this.renderHero(null);
            if (req.empty) return this.renderEmptyScope(req.empty);
            this.showBody(true);
            try {
                s.data = await TargetAPI.dashboard({ view: req.view, id: req.id, month: s.month, year: s.year });
            } catch (err) {
                return this.showState('<i class="fa-solid fa-triangle-exclamation" style="font-size:2.2rem;color:var(--status-danger);"></i>'
                    + '<h3>' + esc(err.message) + '</h3><button class="btn btn-primary" onclick="Dashboard.load()"><i class="fa-solid fa-rotate"></i> إعادة المحاولة</button>');
            }
            this.render();
        },

        rerender: function () { if (this.state.data) this.render(); },

        /* ---------- screens ---------- */
        render: function () {
            var s = this.state, d = s.data;
            this.renderHero(d);
            this.renderBreadcrumbs(d);
            var hasData = s.page === 'agent' ? d.hasPeriod : !!d.summary;
            if (!hasData) return this.renderNoTargets(d);
            this.showBody(true);
            if (s.page === 'agent') this.renderAgent(d);
            else if (s.page === 'branch') this.renderBranch(d);
            else this.renderArea(d);
            this.loadAiCoach();
        },

        showBody: function (on) {
            var body = $('pageBody'), st = $('stateHost');
            if (body) body.style.display = on ? '' : 'none';
            if (st) st.style.display = on ? 'none' : '';
        },
        showState: function (html) {
            var st = $('stateHost');
            if (!st) return;
            st.innerHTML = '<div class="empty-state">' + html + '</div>';
            this.showBody(false);
        },

        renderEmptyScope: function (kind) {
            var cfg = Permissions.getRoleConfig(this.state.ctx.role);
            var msg = {
                no_branch: 'لم يتم تعيين فرع لحسابك بعد. تواصل مع مسؤول النظام.',
                no_area: 'لم يتم تعيين منطقة لحسابك بعد. تواصل مع مسؤول النظام.',
                manager_no_emp: 'هذه الصفحة تعرض أداء موظف محدد. اختر موظفًا من لوحة الفرع.'
            }[kind];
            this.showState('<i class="fa-solid fa-circle-info" style="font-size:2.2rem;color:var(--we-purple);"></i><h3>' + esc(msg) + '</h3>'
                + (kind === 'manager_no_emp' ? '<a class="btn btn-primary" href="' + esc(cfg.defaultPage) + '">العودة للوحة</a>' : ''));
        },

        renderNoTargets: function (d) {
            var s = this.state, label = Utils.monthLabel(s.month, s.year), canSet = Permissions.isManager(s.ctx.role);
            var html = '<i class="fa-solid fa-bullseye" style="font-size:2.2rem;color:var(--we-purple);"></i>';
            if (s.page === 'agent') {
                html += '<h3>لا يوجد Target مسجل لشهر ' + esc(label) + '</h3>'
                    + '<p class="text-muted">' + (d.viewer.id === d.scope.id ? 'يقوم مدير الفرع بتحديد الـ Target. سيظهر أداؤك هنا بمجرد تحديده.' : 'لم يتم تحديد Target لهذا الموظف في هذا الشهر.') + '</p>';
                if (canSet && d.scope.branch) html += '<a class="btn btn-primary" href="' + esc(Utils.link('branch-manager.html', { branch: d.scope.branch.id, m: this.monthParam(), targets: 1 })) + '">تحديد الـ Targets من لوحة الفرع</a>';
            } else if (s.page === 'branch') {
                html += '<h3>لم يتم تحديد Targets لموظفي الفرع في ' + esc(label) + '</h3>'
                    + '<button class="btn btn-primary" onclick="Dashboard.openTargetsModal()"><i class="fa-solid fa-pen-to-square"></i> تحديد الـ Targets الآن</button>';
            } else {
                html += '<h3>لم يتم تحديد Targets لأي موظف في المنطقة في ' + esc(label) + '</h3>'
                    + '<p class="text-muted">يقوم مديرو الفروع بتحديدها. يمكنك فتح أي فرع:</p><div class="flex gap-2" style="flex-wrap:wrap;justify-content:center;">'
                    + (d.branches || []).map(function (b) { return '<a class="btn btn-secondary btn-sm" href="' + esc(Utils.link('branch-manager.html', { branch: b.id, m: Dashboard.monthParam() })) + '">' + esc(b.name) + '</a>'; }).join('')
                    + '</div>';
            }
            this.showState(html);
            if (s.page === 'branch') this.maybeAutoOpenTargets(d);
        },

        /* ---------- hero (title + month + selectors + actions) ---------- */
        renderHero: function (d) {
            var s = this.state, ctx = s.ctx;
            var title = $('heroTitle'), sub = $('heroSubtitle'), actions = $('heroActions');
            if (title) {
                var t = { agent: 'لوحة الأداء', branch: 'لوحة أداء الفرع', area: 'لوحة أداء المنطقة' }[s.page];
                if (d && d.scope && d.scope.name) t = (s.page === 'agent' && d.viewer.id === d.scope.id) ? 'لوحة أدائي' : d.scope.name;
                title.textContent = t;
            }
            if (sub) {
                var parts = [Utils.monthLabel(s.month, s.year)];
                if (d && d.scope) {
                    if (s.page === 'agent' && d.scope.branch) parts.push(d.scope.branch.name);
                    if (d.scope.area) parts.push(d.scope.area.name);
                }
                sub.textContent = parts.join(' • ');
            }
            if (!actions) return;

            var months = {}, cur = Utils.getCurrentMonthYear();
            months[cur.year + '-' + cur.month] = { month: cur.month, year: cur.year };
            if (Permissions.isManager(ctx.role)) { var nm = cur.month === 12 ? { month: 1, year: cur.year + 1 } : { month: cur.month + 1, year: cur.year }; months[nm.year + '-' + nm.month] = nm; }
            months[s.year + '-' + s.month] = { month: s.month, year: s.year };
            ((d && d.availableMonths) || []).forEach(function (m) { months[m.year + '-' + m.month] = m; });
            var list = Object.keys(months).map(function (k) { return months[k]; }).sort(function (a, b) { return b.year - a.year || b.month - a.month; });

            var html = '<select class="form-input" id="monthSelect" aria-label="اختر الشهر">'
                + list.map(function (m) { return '<option value="' + m.year + '-' + Utils.pad2(m.month) + '"' + (m.month === s.month && m.year === s.year ? ' selected' : '') + '>' + esc(Utils.monthLabel(m.month, m.year)) + '</option>'; }).join('') + '</select>';

            if (s.page === 'area' && ctx.managedAreas.length > 1) {
                var curArea = (d && d.scope && d.scope.id) || Utils.param('area') || ctx.managedAreas[0].id;
                html += '<select class="form-input" id="areaSelect" aria-label="اختر المنطقة">' + ctx.managedAreas.map(function (a) {
                    return '<option value="' + esc(a.id) + '"' + (a.id === curArea ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select>';
            }
            if (s.page === 'branch') {
                var branchList = ctx.role === 'branch_manager' ? ctx.managedBranches : ctx.branches;
                var curB = (d && d.scope && d.scope.id) || Utils.param('branch');
                if (branchList.length > 1) html += '<select class="form-input" id="branchSelect" aria-label="اختر الفرع">' + branchList.map(function (b) {
                    return '<option value="' + esc(b.id) + '"' + (b.id === curB ? ' selected' : '') + '>' + esc(b.name) + '</option>'; }).join('') + '</select>';
                if (d && d.employees && d.employees.length) html += '<select class="form-input" id="empSelect" aria-label="اختر موظف"><option value="">— اختر موظفًا —</option>'
                    + d.employees.map(function (e) { return '<option value="' + esc(e.id) + '">' + esc(e.name) + '</option>'; }).join('') + '</select>';
                html += '<button class="btn btn-primary" id="openTargetsBtn" type="button"><i class="fa-solid fa-pen-to-square"></i> تحديد الـ Targets</button>';
            }
            if (s.page === 'agent' && d && d.viewer && d.scope && d.viewer.id === d.scope.id && d.hasPeriod) {
                html += '<button class="btn btn-primary" type="button" onclick="Dashboard.openDailyModal()"><i class="fa-solid fa-plus-circle"></i> إضافة أداء اليوم</button>';
            }
            actions.innerHTML = html;
        },

        bindStaticEvents: function () {
            var self = this;
            document.addEventListener('change', function (e) {
                var t = e.target;
                if (!t || !t.id) return;
                if (t.id === 'monthSelect') {
                    var m = /^(\d{4})-(\d{2})$/.exec(t.value);
                    if (m) { self.state.year = Number(m[1]); self.state.month = Number(m[2]); self.syncUrl({ m: t.value }); self.load(); }
                } else if (t.id === 'areaSelect') {
                    self.syncUrl({ area: t.value }); self.load();
                } else if (t.id === 'branchSelect') {
                    self.syncUrl({ branch: t.value }); self.load();
                } else if (t.id === 'empSelect' && t.value) {
                    window.location.href = Utils.link('agent.html', { emp: t.value, m: self.monthParam() });
                }
            });
            document.addEventListener('click', function (e) {
                if (e.target.closest && e.target.closest('#openTargetsBtn')) self.openTargetsModal();
            });
        },

        syncUrl: function (changes) {
            var u = new URL(window.location.href);
            Object.keys(changes).forEach(function (k) { u.searchParams.set(k, changes[k]); });
            u.searchParams.delete('targets');
            window.history.replaceState(null, '', u.toString());
        },

        renderBreadcrumbs: function (d) {
            var host = $('breadcrumbsNav'); if (!host) return;
            var ctx = this.state.ctx, mp = this.monthParam(), s = this.state;
            var home = Permissions.getRoleConfig(ctx.role).defaultPage;
            var crumbs = [{ label: 'الرئيسية', href: home, icon: 'fa-house' }];
            var sc = d.scope || {};
            var canArea = ctx.role === 'area_manager' || ctx.role === 'admin';
            if (s.page !== 'area' && sc.area && canArea) crumbs.push({ label: sc.area.name, href: Utils.link('area-manager.html', { area: sc.area.id, m: mp }) });
            if (s.page === 'agent' && sc.branch && Permissions.isManager(ctx.role)) crumbs.push({ label: sc.branch.name, href: Utils.link('branch-manager.html', { branch: sc.branch.id, m: mp }) });
            crumbs.push({ label: sc.name || '', href: null });
            host.innerHTML = crumbs.map(function (c, i) {
                var last = i === crumbs.length - 1;
                var inner = (c.icon ? '<i class="fa-solid ' + c.icon + '"></i> ' : '') + esc(c.label);
                return (i ? '<span class="breadcrumb-separator"><i class="fa-solid fa-chevron-left"></i></span>' : '')
                    + '<span class="breadcrumb-item' + (last ? ' active' : '') + '">' + (c.href && !last ? '<a href="' + esc(c.href) + '">' + inner + '</a>' : inner) + '</span>';
            }).join('');
        },

        /* ---------- shared blocks ---------- */
        kpi: function (title, value, sub, color, icon, accent) {
            return '<div class="kpi-card"' + (accent ? ' style="border-right:4px solid var(--we-purple);"' : '') + '>'
                + '<div class="kpi-card-header"><span class="kpi-title">' + esc(title) + '</span>'
                + '<div class="kpi-icon-wrap kpi-icon-' + color + '"><i class="fa-solid ' + icon + '"></i></div></div>'
                + '<div class="kpi-value"' + (accent ? ' style="color:var(--we-purple);"' : '') + '>' + value + '</div>'
                + '<div class="kpi-subtext">' + sub + '</div></div>';
        },

        renderKpis: function (summary, who, withToday, extraSub) {
            var L = summary.lines, host = $('kpiGridContainer'); if (!host) return;
            var avg = summary.elapsedDays > 0 ? L.achieve / summary.elapsedDays : 0;
            var cards = [
                this.kpi('Target ' + who + ' (الخطوط)', fmt(L.target), extraSub || 'PT12 + Super Kix + Tazbeet + Data', 'purple', 'fa-bullseye'),
                this.kpi('Achieve ' + who, fmt(L.achieve), Utils.statusBadge(L.status), 'green', 'fa-chart-line'),
                this.kpi('نسبة التحقيق', Utils.formatPercent(L.percentage), 'مضى ' + summary.elapsedDays + ' من ' + summary.targetDays + ' يوم', 'blue', 'fa-percent'),
                this.kpi('Projection (المتوقع)', fmt(L.projection), 'معدل يومي: ' + fmt(avg, 1), 'yellow', 'fa-arrow-trend-up'),
                this.kpi('المتبقي (Remaining)', fmt(L.remaining), 'المطلوب يوميًا: ' + fmt(L.requiredDaily, 1), 'red', 'fa-flag-checkered')
            ];
            if (withToday) cards.push(this.kpi("المطلوب اليوم (Today's Required)", fmt(Math.ceil(L.todayRequired - 1e-9)),
                L.deficit != null ? 'يشمل عجزًا: ' + fmt(L.deficit, 1) + ' خط' : 'مجموع مطلوب الموظفين اليوم', 'red', 'fa-calendar-day', true));
            host.innerHTML = cards.join('');
        },

        renderItems: function (summary) {
            var host = $('itemsGridContainer'); if (!host) return;
            host.innerHTML = ITEMS.map(function (k) {
                var it = summary.items[k], inLines = LINE_ITEMS.indexOf(k) !== -1;
                return '<div class="item-card"><div class="item-card-head"><span class="item-name">' + esc(ITEM_LABELS[k]) + '</span>'
                    + '<span class="item-badge ' + (inLines ? 'status-ontrack' : 'status-warning') + '">' + (inLines ? 'ضمن الأسطر' : 'KPI مستقل') + '</span></div>'
                    + '<div class="flex justify-between items-center text-muted" style="font-size:0.85rem;gap:.5rem;flex-wrap:wrap;">'
                    + '<span>الهدف: ' + fmt(it.target) + '</span><span>المحقق: ' + fmt(it.achieve) + '</span><span>المتبقي: ' + fmt(it.remaining) + '</span></div>'
                    + '<div class="flex justify-between items-center text-muted" style="font-size:0.85rem;margin-top:.25rem;"><span>النسبة: ' + Utils.formatPercent(it.percentage) + '</span><span>المتوقع: ' + fmt(it.projection, 1) + '</span></div>'
                    + '<div class="progress-bar-bg"><div class="progress-bar-fill" style="width:' + Math.min(it.percentage, 100) + '%;"></div></div></div>';
            }).join('');
        },

        renderCommonCharts: function (d) {
            if (typeof ChartEngine === 'undefined' || typeof Chart === 'undefined') return;
            var L = d.summary.lines, sm = d.summary;
            ChartEngine.renderTargetVsAchieve('chartTargetVsAchieve', L.target, L.achieve);
            var base = TargetCalculator.calculateDailyTarget(L.target, sm.targetDays);
            var rows = d.daily || [];
            ChartEngine.renderDailyTrend('chartDailyTrend', rows.map(function (r) { return r.date.slice(5); }), rows.map(function (r) { return r.lines; }), rows.map(function () { return Math.round(base * 10) / 10; }));
            var ach = {}; ITEMS.forEach(function (k) { ach[k] = sm.items[k].achieve; });
            ChartEngine.renderProductBreakdown('chartProductBreakdown', ach);
            ChartEngine.renderComparisonBar('chartProjection', ['إجمالي الخطوط'], [L.target], [Math.round(L.projection * 10) / 10], 'الهدف', 'المتوقع (Projection)');
        },

        /* ---------- agent / employee ---------- */
        renderAgent: function (d) {
            this.renderKpis(d.summary, '', true);
            this.renderItems(d.summary);
            this.renderCommonCharts(d);
            if (typeof ChartEngine !== 'undefined' && typeof Chart !== 'undefined') {
                var names = ITEMS.map(function (k) { return ITEM_LABELS[k]; });
                ChartEngine.renderComparisonBar('chartItems', names, ITEMS.map(function (k) { return d.summary.items[k].target; }), ITEMS.map(function (k) { return d.summary.items[k].achieve; }));
            }
        },

        /* ---------- branch ---------- */
        renderBranch: function (d) {
            var self = this;
            this.renderKpis(d.summary, 'الفرع', true, d.summary.employees + ' موظف لديهم Target');
            this.renderItems(d.summary);
            this.renderCommonCharts(d);

            var mp = this.monthParam();
            var rows = d.employees.map(function (e) {
                var L = e.lines;
                return { id: e.id, name: e.name, has: !!L, target: L ? L.target : 0, achieve: L ? L.achieve : 0, pct: L ? L.percentage : 0,
                    projection: L ? L.projection : 0, remaining: L ? L.remaining : 0, status: L ? L.status : 'no_target' };
            });
            var host = $('employeesTableHost');
            if (host) {
                var t = this.state.tables.emp = new DataTable(host, {
                    title: 'أداء الموظفين (' + rows.length + ')', searchPlaceholder: 'ابحث باسم الموظف...', defaultSort: 'name',
                    filters: [{ id: 'all', label: 'الكل' }, { id: 'on_track', label: 'في المسار' }, { id: 'needs_attention', label: 'يحتاج انتباه' }, { id: 'behind', label: 'متأخر' }, { id: 'achieved', label: 'حقق الهدف' }],
                    searchText: function (r) { return r.name; }, statusOf: function (r) { return r.status; },
                    href: function (r) { return Utils.link('agent.html', { emp: r.id, m: mp }); },
                    columns: [
                        { label: 'الموظف', key: 'name', value: function (r) { return r.name; }, render: function (r) { return '<span class="font-bold">' + esc(r.name) + '</span>'; } },
                        { label: 'الهدف', key: 'target', value: function (r) { return r.target; }, render: function (r) { return r.has ? fmt(r.target) : '—'; } },
                        { label: 'المحقق', key: 'achieve', value: function (r) { return r.achieve; }, render: function (r) { return r.has ? fmt(r.achieve) : '—'; } },
                        { label: 'نسبة الإنجاز', key: 'pct', value: function (r) { return r.pct; }, render: function (r) { return r.has ? Utils.formatPercent(r.pct) : '—'; } },
                        { label: 'المتوقع', key: 'projection', value: function (r) { return r.projection; }, render: function (r) { return r.has ? fmt(r.projection, 1) : '—'; } },
                        { label: 'المتبقي', key: 'remaining', value: function (r) { return r.remaining; }, render: function (r) { return r.has ? fmt(r.remaining) : '—'; } },
                        { label: 'الحالة', value: null, render: function (r) { return Utils.statusBadge(r.status); } },
                        { label: '', render: function () { return '<span class="btn btn-sm btn-secondary"><i class="fa-solid fa-eye"></i> عرض</span>'; } }
                    ]
                });
                t.setRows(rows);
            }
            if (typeof ChartEngine !== 'undefined' && typeof Chart !== 'undefined') {
                var withT = rows.filter(function (r) { return r.has; });
                ChartEngine.renderPercentBar('chartEmployeesPct', withT.map(function (r) { return r.name; }), withT.map(function (r) { return r.pct; }));
            }
            this.maybeAutoOpenTargets(d);
        },

        /* ---------- area ---------- */
        renderArea: function (d) {
            var mp = this.monthParam();
            this.renderKpis(d.summary, 'المنطقة', false, d.summary.employees + ' موظف لديهم Target');
            this.renderItems(d.summary);
            this.renderCommonCharts(d);
            var rows = d.branches.map(function (b) {
                var L = b.lines;
                return { id: b.id, name: b.name, employees: b.employees, has: !!L, target: L ? L.target : 0, achieve: L ? L.achieve : 0, pct: L ? L.percentage : 0,
                    projection: L ? L.projection : 0, remaining: L ? L.remaining : 0, status: L ? L.status : 'no_target' };
            });
            var host = $('branchesTableHost');
            if (host) {
                var t = new DataTable(host, {
                    title: 'أداء الفروع (' + rows.length + ')', searchPlaceholder: 'ابحث باسم الفرع...', defaultSort: 'name',
                    filters: [{ id: 'all', label: 'الكل' }, { id: 'on_track', label: 'في المسار' }, { id: 'needs_attention', label: 'يحتاج انتباه' }, { id: 'behind', label: 'متأخر' }, { id: 'achieved', label: 'حقق الهدف' }],
                    searchText: function (r) { return r.name; }, statusOf: function (r) { return r.status; },
                    href: function (r) { return Utils.link('branch-manager.html', { branch: r.id, m: mp }); },
                    columns: [
                        { label: 'الفرع', key: 'name', value: function (r) { return r.name; }, render: function (r) { return '<span class="font-bold">' + esc(r.name) + '</span>'; } },
                        { label: 'الموظفون', key: 'employees', value: function (r) { return r.employees; }, render: function (r) { return fmt(r.employees); } },
                        { label: 'الهدف', key: 'target', value: function (r) { return r.target; }, render: function (r) { return r.has ? fmt(r.target) : '—'; } },
                        { label: 'المحقق', key: 'achieve', value: function (r) { return r.achieve; }, render: function (r) { return r.has ? fmt(r.achieve) : '—'; } },
                        { label: 'نسبة الإنجاز', key: 'pct', value: function (r) { return r.pct; }, render: function (r) { return r.has ? Utils.formatPercent(r.pct) : '—'; } },
                        { label: 'المتوقع', key: 'projection', value: function (r) { return r.projection; }, render: function (r) { return r.has ? fmt(r.projection, 1) : '—'; } },
                        { label: 'المتبقي', key: 'remaining', value: function (r) { return r.remaining; }, render: function (r) { return r.has ? fmt(r.remaining) : '—'; } },
                        { label: 'الحالة', render: function (r) { return Utils.statusBadge(r.status); } },
                        { label: '', render: function () { return '<span class="btn btn-sm btn-secondary"><i class="fa-solid fa-eye"></i> فتح</span>'; } }
                    ]
                });
                t.setRows(rows);
            }
            if (typeof ChartEngine !== 'undefined' && typeof Chart !== 'undefined') {
                var withT = rows.filter(function (r) { return r.has; });
                var names = withT.map(function (r) { return r.name; });
                ChartEngine.renderPercentBar('chartBranchesPct', names, withT.map(function (r) { return r.pct; }));
                ChartEngine.renderComparisonBar('chartBranchesCompare', names, withT.map(function (r) { return r.target; }), withT.map(function (r) { return r.achieve; }));
            }
        },

        /* ---------- AI coach (rule-based until the Gemini function is deployed) ---------- */
        loadAiCoach: async function () {
            var box = $('aiCoachText'), d = this.state.data;
            if (!box || !d || !d.summary) return;
            box.textContent = 'جاري التحليل...';
            var res = await WEAiCoach.analyze(d.scope.name, d.summary);
            box.innerHTML = res.text.split('\n').map(esc).join('<br>')
                + (res.source === 'rules' ? '<div class="text-muted" style="font-size:.78rem;margin-top:.75rem;">تحليل آلي مبني على قواعد حسابية. تحليل Gemini غير مفعّل بعد.</div>' : '');
        },

        /* ---------- manager: set targets for employees ---------- */
        maybeAutoOpenTargets: function (d) {
            if (this.state.autoOpened || Utils.param('targets') !== '1' || this.state.page !== 'branch') return;
            this.state.autoOpened = true;
            this.openTargetsModal();
        },

        ensureTargetsModal: function () {
            if ($('targetsModal')) return;
            var el = document.createElement('div');
            el.className = 'modal-overlay'; el.id = 'targetsModal';
            el.innerHTML = '<div class="modal-container wide"><div class="modal-header"><h3 class="modal-title" id="targetsModalTitle"></h3>'
                + '<button class="btn-icon" type="button" onclick="Utils.closeModal(\'targetsModal\')"><i class="fa-solid fa-xmark"></i></button></div>'
                + '<div class="modal-body" id="targetsModalBody"></div>'
                + '<div class="modal-footer"><button class="btn btn-secondary" type="button" onclick="Utils.closeModal(\'targetsModal\')">إلغاء</button>'
                + '<button class="btn btn-primary" type="button" id="saveTargetsBtn"><i class="fa-solid fa-floppy-disk"></i> حفظ الـ Targets</button></div></div>';
            document.body.appendChild(el);
            var self = this;
            $('saveTargetsBtn').addEventListener('click', function () { self.saveTargets(); });
        },

        openTargetsModal: async function () {
            var s = this.state, d = s.data;
            if (!d || !d.employees) return Utils.showToast('لم يتم تحميل بيانات الفرع بعد', 'error');
            if (!d.employees.length) return Utils.showToast('لا يوجد موظفون مسجلون في هذا الفرع', 'error');
            this.ensureTargetsModal();
            $('targetsModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> تحديد الـ Targets — ' + esc(d.scope.name) + ' — ' + esc(Utils.monthLabel(s.month, s.year));
            $('targetsModalBody').innerHTML = '<div class="skeleton" style="height:160px;"></div>';
            Utils.openModal('targetsModal');

            var plans;
            try { plans = await TargetAPI.fetchPlans(d.employees.map(function (e) { return e.id; }), s.month, s.year); }
            catch (err) { $('targetsModalBody').innerHTML = '<p class="text-muted">' + esc(err.message) + '</p>'; return; }
            var byUser = {}; plans.forEach(function (p) { byUser[p.user_id] = p; });
            s.plansByUser = byUser;

            var any = plans[0];
            var y = s.year, m = s.month, last = Utils.lastDayOfMonth(y, m), ym = y + '-' + Utils.pad2(m);
            var period = any ? { type: any.period_type, start: any.start_date, end: any.end_date, days: any.target_days } : { type: 'Full Month', start: ym + '-01', end: ym + '-' + Utils.pad2(last), days: 20 };

            var typeOpts = [['Full Month', 'شهر كامل'], ['15 Days', '15 يوم'], ['20 Days', '20 يوم'], ['Custom', 'مخصص']];
            var head = ITEMS.map(function (k) { return '<th>' + esc(ITEM_LABELS[k]) + '</th>'; }).join('');
            var rows = d.employees.map(function (e) {
                var p = byUser[e.id], map = {};
                if (p) (p.targets || []).forEach(function (t) { map[t.item] = t.target_value; });
                return '<tr><td class="font-bold" style="white-space:nowrap;">' + esc(e.name) + '</td>' + ITEMS.map(function (k) {
                    return '<td><input type="number" min="0" step="1" class="form-input tgt-input" style="min-width:76px;" data-uid="' + esc(e.id) + '" data-item="' + k + '" value="' + (map[k] != null ? Number(map[k]) : 0) + '"></td>';
                }).join('') + '</tr>';
            }).join('');

            $('targetsModalBody').innerHTML =
                '<div class="target-period-grid">'
                + '<div class="form-group"><label class="form-label">نوع الفترة</label><select class="form-input" id="tpType">' + typeOpts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === period.type ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>'
                + '<div class="form-group"><label class="form-label">من تاريخ</label><input type="date" class="form-input" id="tpStart" value="' + esc(period.start) + '"></div>'
                + '<div class="form-group"><label class="form-label">إلى تاريخ</label><input type="date" class="form-input" id="tpEnd" value="' + esc(period.end) + '"></div>'
                + '<div class="form-group"><label class="form-label">أيام الـ Target</label><input type="number" min="1" max="31" class="form-input" id="tpDays" value="' + esc(period.days) + '"></div></div>'
                + '<div class="target-split"><div class="font-bold" style="margin-bottom:.5rem;"><i class="fa-solid fa-divide"></i> توزيع إجمالي الفرع بالتساوي على ' + d.employees.length + ' موظف</div>'
                + '<div class="target-split-row">' + ITEMS.map(function (k) { return '<div class="form-group"><label class="form-label">' + esc(ITEM_LABELS[k]) + '</label><input type="number" min="0" step="1" class="form-input" id="split_' + k + '" placeholder="الإجمالي"></div>'; }).join('')
                + '<button type="button" class="btn btn-secondary" id="applySplitBtn">وزّع</button></div></div>'
                + '<div class="data-table-container" style="margin-top:1rem;"><table class="data-table"><thead><tr><th>الموظف</th>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
                + '<p class="text-muted" style="font-size:.8rem;margin-top:.5rem;">ADSL وFixed وWE Pay مؤشرات مستقلة ولا تدخل في إجمالي الخطوط. الحفظ يحدّث الـ Target الحالي للموظف في هذا الشهر.</p>';

            var self = this;
            $('tpType').addEventListener('change', function () {
                var t = this.value, p2 = Utils.pad2;
                if (t === 'Full Month') { $('tpStart').value = ym + '-01'; $('tpEnd').value = ym + '-' + p2(last); }
                else if (t === '15 Days') { $('tpStart').value = ym + '-01'; $('tpEnd').value = ym + '-15'; $('tpDays').value = 15; }
                else if (t === '20 Days') { $('tpStart').value = ym + '-01'; $('tpEnd').value = ym + '-20'; $('tpDays').value = 20; }
            });
            $('applySplitBtn').addEventListener('click', function () {
                var emps = d.employees.map(function (e) { return e.id; });
                ITEMS.forEach(function (k) {
                    var v = $('split_' + k).value;
                    if (v === '') return;
                    var parts = TargetCalculator.splitTotalAcross(Number(v), emps.length);
                    emps.forEach(function (uid, i) {
                        var inp = document.querySelector('.tgt-input[data-uid="' + uid + '"][data-item="' + k + '"]');
                        if (inp) inp.value = parts[i];
                    });
                });
            });
        },

        saveTargets: async function () {
            var s = this.state, d = s.data, btn = $('saveTargetsBtn');
            var start = $('tpStart').value, end = $('tpEnd').value, days = Number($('tpDays').value), type = $('tpType').value;
            var ym = s.year + '-' + Utils.pad2(s.month);
            if (!start || !end || end < start) return Utils.showToast('تواريخ الفترة غير صحيحة', 'error');
            if (start.slice(0, 7) !== ym) return Utils.showToast('تاريخ البداية يجب أن يكون داخل الشهر المختار', 'error');
            if (!(days >= 1 && days <= 31)) return Utils.showToast('أيام الـ Target بين 1 و 31', 'error');

            var plans = [];
            d.employees.forEach(function (e) {
                var items = {}, any = false;
                ITEMS.forEach(function (k) {
                    var inp = document.querySelector('.tgt-input[data-uid="' + e.id + '"][data-item="' + k + '"]');
                    var v = Math.max(Math.round(Number(inp && inp.value) || 0), 0);
                    items[k] = v; if (v > 0) any = true;
                });
                if (any || (s.plansByUser && s.plansByUser[e.id])) plans.push({ userId: e.id, name: e.name, month: s.month, year: s.year, period_type: type, start_date: start, end_date: end, target_days: days, items: items });
            });
            if (!plans.length) return Utils.showToast('أدخل Target لموظف واحد على الأقل', 'error');

            btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
            var res = await TargetAPI.saveTargetPlans(plans);
            btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ الـ Targets';

            if (res.failed.length) {
                var names = res.failed.map(function (f) { var p = plans.find(function (x) { return x.userId === f.userId; }); return (p ? p.name : '') + ' (' + f.message + ')'; });
                Utils.showToast('تم حفظ ' + res.saved + ' وفشل ' + res.failed.length + ': ' + names.join('، '), 'error');
                if (res.saved) await this.load();
                return;
            }
            Utils.showToast('تم حفظ Targets ' + res.saved + ' موظف', 'success');
            Utils.closeModal('targetsModal');
            await this.load();
        },

        /* ---------- employee: record today's performance ---------- */
        openDailyModal: function () {
            var d = this.state.data;
            if (!d || !d.hasPeriod) return Utils.showToast('لا يوجد Target لهذا الشهر', 'error');
            var inp = $('entryDate');
            inp.min = d.period.start_date; inp.max = d.period.end_date;
            var today = Utils.todayCairo();
            inp.value = today < d.period.start_date ? d.period.start_date : (today > d.period.end_date ? d.period.end_date : today);
            this.prefillDaily();
            inp.onchange = function () { Dashboard.prefillDaily(); };
            Utils.openModal('dailyModal');
        },
        prefillDaily: function () {
            var d = this.state.data, date = $('entryDate').value;
            var row = (d.daily || []).find(function (r) { return r.date === date; }) || {};
            ITEMS.forEach(function (k) { var el = $('entry_' + k); if (el) el.value = row[k] != null ? row[k] : 0; });
            var notes = $('entryNotes'); if (notes) notes.value = '';
        },
        saveDaily: async function () {
            var s = this.state, d = s.data, btn = $('saveDailyBtn');
            var date = $('entryDate').value, items = {};
            if (!date) return Utils.showToast('اختر التاريخ', 'error');
            ITEMS.forEach(function (k) { items[k] = $('entry_' + k).value; });
            btn.disabled = true;
            try {
                await TargetAPI.saveDailyPerformance(d.period.id, s.ctx.userId, date, items, $('entryNotes').value);
                Utils.showToast('تم حفظ الأداء', 'success');
                Utils.closeModal('dailyModal');
                await this.load();
            } catch (err) {
                Utils.showToast('لم يتم الحفظ: ' + err.message, 'error');
            } finally { btn.disabled = false; }
        }
    };

    global.Dashboard = Dashboard;
    document.addEventListener('DOMContentLoaded', function () {
        var b = $('saveDailyBtn');
        // the standalone performance page wires its own save handler
        if (b && document.body.getAttribute('data-page') === 'agent') b.addEventListener('click', function () { Dashboard.saveDaily(); });
    });
})(typeof window !== 'undefined' ? window : this);
