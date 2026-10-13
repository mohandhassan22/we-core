/**
 * WE-Core Target Manager - Core Dashboard Renderer
 * Handles rendering for Agent, Branch Manager, Area Manager, and Supervisor Views
 */

(function (global) {
    const Dashboard = {
        state: {
            userProfile: null,
            targetPeriod: null,
            subordinates: [],
            dailyLogs: [],
            activeRoleView: 'agent',
            selectedArea: null,
            selectedBranch: null,
            selectedEmployee: null,
            tree: [],
            nav: { area: null, branch: null, emp: null },   // drill-down position (area manager / supervisor)
            currentFilter: 'all',
            searchQuery: ''
        },

        init: async function (userProfile) {
            this.state.userProfile = userProfile;
            this.state.activeRoleView = Permissions.normalizeRole(userProfile.role);

            const monthYear = Utils.getCurrentMonthYear();
            await this.loadDashboardData(monthYear.month, monthYear.year);

            // Keep the dashboard in sync with changes made by others (manager target / agent entries)
            const refresh = () => { const my = Utils.getCurrentMonthYear(); this.loadDashboardData(my.month, my.year); };
            document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
            window.addEventListener('focus', refresh);
            setInterval(() => { if (!document.hidden) refresh(); }, 60000);
        },

        loadDashboardData: async function (month, year) {
            const profile = this.state.userProfile;
            if (!profile) return;

            // Fetch active target period
            const period = await TargetAPI.fetchTargetPeriod(month, year, profile.id, profile.branch, profile.area);
            this.state.targetPeriod = period;

            // Fetch daily logs
            if (period) {
                this.state.dailyLogs = await TargetAPI.fetchDailyPerformance(period.id, profile.id);
            }

            // Fetch the area's branches from the branches table (so branches with no agents still show)
            if (this.state.activeRoleView === 'area_manager' && profile.area_id) {
                this.state.areaBranches = await TargetAPI.fetchAllowedBranches(profile.area_id);
            }

            // Fetch subordinates if manager/supervisor
            if (['branch_manager', 'area_manager', 'supervisor', 'admin'].includes(this.state.activeRoleView)) {
                this.state.subordinates = await TargetAPI.fetchSubordinates(
                    this.state.activeRoleView,
                    profile.branch,
                    profile.area,
                    profile.id
                );

                const ownsTeamData = ['supervisor', 'admin'].includes(this.state.activeRoleView);   // supervisor view loads its own per-area data
                this.state.teamData = ownsTeamData ? { periods: [], logs: [] } : await TargetAPI.fetchTeamData(
                    month, 
                    year, 
                    this.state.activeRoleView === 'branch_manager' ? profile.branch : null,
                    ['area_manager'].includes(this.state.activeRoleView) ? profile.area : null
                );
            }

            this.render();
        },

        render: function () {
            const role = this.state.activeRoleView;
            if (role === 'agent') {
                this.renderAgentView();
            } else if (role === 'branch_manager') {
                this.renderBranchManagerView();
            } else if (role === 'area_manager') {
                this.renderAreaManagerView();
            } else if (role === 'supervisor' || role === 'admin') {
                this.renderSupervisorView();
            }
        },

        /* ------------------------------------------------------------------
         * 1. AGENT DASHBOARD RENDERER
         * ------------------------------------------------------------------ */
        renderAgentView: function () {
            const period = this.state.targetPeriod;
            const profile = this.state.userProfile;

            // Convert period targets object
            const itemTargets = {};
            if (period && period.targets) {
                period.targets.forEach(t => itemTargets[t.item] = t.target_value);
            } else {
                // No target period yet: show zeros (no fake numbers)
                ['pt12','super_kix','tazbeet','data','adsl','fixed','we_pay','we_gold'].forEach(k => itemTargets[k] = 0);
            }

            // Calculate item achieves from daily logs
            const itemAchieves = { pt12: 0, super_kix: 0, tazbeet: 0, data: 0, adsl: 0, fixed: 0, we_pay: 0, we_gold: 0 };
            const logs = this.state.dailyLogs || [];

            logs.forEach(log => {
                itemAchieves.pt12 += parseFloat(log.pt12) || 0;
                itemAchieves.super_kix += parseFloat(log.super_kix) || 0;
                itemAchieves.tazbeet += parseFloat(log.tazbeet) || 0;
                itemAchieves.data += parseFloat(log.data) || 0;
                itemAchieves.adsl += parseFloat(log.adsl) || 0;
                itemAchieves.fixed += parseFloat(log.fixed) || 0;
                itemAchieves.we_pay += parseFloat(log.we_pay) || 0;
                itemAchieves.we_gold += parseFloat(log.we_gold) || 0;
            });

            const elapsedDays = Utils.calculateElapsedDays(period?.start_date, period?.end_date, period?.target_days || 30);
            const metrics = TargetCalculator.calculateMetrics(
                itemTargets,
                itemAchieves,
                period?.target_days || 30,
                elapsedDays,
                logs
            );
            
            // Save metrics for AI refresh
            this.state.currentMetrics = metrics;

            // Render KPI Cards
            const kpiContainer = document.getElementById('kpiGridContainer');
            if (kpiContainer) {
                kpiContainer.innerHTML = `
                    <div class="kpi-card">
                        <div class="kpi-card-header">
                            <span class="kpi-title">هدف الخطوط (Target)</span>
                            <div class="kpi-icon-wrap kpi-icon-purple"><i class="fa-solid fa-bullseye"></i></div>
                        </div>
                        <div class="kpi-value">${Utils.formatNumber(metrics.targetLines)}</div>
                        <div class="kpi-subtext">PT12 + Super Kix + Tazbeet + WE Gold + Data</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-card-header">
                            <span class="kpi-title">المحقق الفعلي (Achieve)</span>
                            <div class="kpi-icon-wrap kpi-icon-green"><i class="fa-solid fa-chart-line"></i></div>
                        </div>
                        <div class="kpi-value">${Utils.formatNumber(metrics.achieveLines)}</div>
                        <div class="kpi-subtext"><span class="badge-status ${metrics.status.class}">${metrics.status.label}</span></div>
                        <div class="kpi-progress"><span style="width:${Math.min(Math.max(metrics.achievementPct || 0, 0), 100)}%"></span></div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-card-header">
                            <span class="kpi-title">نسبة التحقيق (%)</span>
                            <div class="kpi-icon-wrap kpi-icon-blue"><i class="fa-solid fa-percent"></i></div>
                        </div>
                        <div class="kpi-value">${Utils.formatPercent(metrics.achievementPct)}</div>
                        <div class="kpi-subtext">المتبقي: ${Utils.formatNumber(metrics.remaining)} خط</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-card-header">
                            <span class="kpi-title">المتوقع بنهاية الشهر (Projection)</span>
                            <div class="kpi-icon-wrap kpi-icon-yellow"><i class="fa-solid fa-arrow-trend-up"></i></div>
                        </div>
                        <div class="kpi-value">${Utils.formatNumber(metrics.projection)}</div>
                        <div class="kpi-subtext">معدل يومي: ${Utils.formatNumber(metrics.achieveLines / metrics.elapsedDays, 1)}</div>
                        <div class="kpi-progress"><span style="width:${metrics.targetLines ? Math.min(Math.max(metrics.projection / metrics.targetLines * 100, 0), 100) : 0}%"></span></div>
                    </div>
                    <div class="kpi-card" style="border-right: 4px solid var(--we-purple);">
                        <div class="kpi-card-header">
                            <span class="kpi-title">المطلوب اليوم (Today's Required)</span>
                            <div class="kpi-icon-wrap kpi-icon-red"><i class="fa-solid fa-calendar-day"></i></div>
                        </div>
                        <div class="kpi-value" style="color:var(--we-purple);">${Utils.formatNumber(metrics.todayRequired)}</div>
                        <div class="kpi-subtext">يشمل العجز الحالي: ${Utils.formatNumber(metrics.deficit)} خط</div>
                    </div>
                `;
            }

            // Render Item Cards
            const itemsContainer = document.getElementById('itemsGridContainer');
            if (itemsContainer) {
                const itemLabels = {
                    pt12: 'PT12', super_kix: 'Super Kix', tazbeet: 'Control Tazbeet',
                    data: 'Data Lines', adsl: 'WE Space ADSL', fixed: 'Fixed Line', we_pay: 'WE Pay', we_gold: 'WE Gold'
                };
                itemsContainer.innerHTML = Object.keys(metrics.items).map(key => {
                    const item = metrics.items[key];
                    return `
                        <div class="item-card">
                            <div class="item-card-head">
                                <span class="item-name">${itemLabels[key] || key}</span>
                                <span class="item-badge ${item.isTotalLine ? 'status-ontrack' : 'status-warning'}">
                                    ${item.isTotalLine ? 'ضمن الخطوط' : 'KPI مستقل'}
                                </span>
                            </div>
                            <div class="flex justify-between items-center text-muted" style="font-size:0.85rem;">
                                <span>الهدف: ${item.target}</span>
                                <span>المحقق: ${item.achieve}</span>
                                <span>النسبة: ${Utils.formatPercent(item.percentage)}</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" style="width: ${Math.min(item.percentage, 100)}%;"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // Render Charts
            if (typeof ChartEngine !== 'undefined') {
                ChartEngine.renderTargetVsAchieve('chartTargetVsAchieve', metrics.targetLines, metrics.achieveLines);
                ChartEngine.renderProductBreakdown('chartProductBreakdown', itemAchieves);
            }

            // Render AI Coach Analysis
            this.loadAiCoach(metrics, profile, period?.id);
        },

        /* ------------------------------------------------------------------
         * 2. BRANCH MANAGER DASHBOARD RENDERER
         * ------------------------------------------------------------------ */
        // Separate (independent) KPIs: each has its own target / achieved / %
        SEPARATE_ITEMS: [
            { key: 'adsl', label: 'الإنترنت (ADSL)' },
            { key: 'fixed', label: 'الأرضي (Fixed)' },
            { key: 'we_pay', label: 'WE Pay' }
        ],
        sumTargetsOf: function (period, keys) {
            return ((period && period.targets) || []).reduce((s, t) => keys.includes(t.item) ? s + (parseFloat(t.target_value) || 0) : s, 0);
        },
        sumLogsOf: function (logs, keys) {
            return (logs || []).reduce((s, l) => s + keys.reduce((a, k) => a + (parseFloat(l[k]) || 0), 0), 0);
        },
        separateCardsHTML: function (sep) {
            return this.SEPARATE_ITEMS.map(it => {
                const t = sep[it.key].target, a = sep[it.key].achieve;
                const pct = TargetCalculator.calculateAchievementPercentage(a, t);
                return `<div class="kpi-card">
                        <span class="kpi-title">${it.label}</span>
                        <div class="kpi-value">${Utils.formatNumber(a)} / ${Utils.formatNumber(t)}</div>
                        <div class="kpi-subtext">النسبة: ${Utils.formatPercent(pct)} | المتبقي: ${Utils.formatNumber(Math.max(t - a, 0))}</div>
                        <div class="kpi-progress"><span style="width:${Math.min(Math.max(pct || 0, 0), 100)}%"></span></div>
                    </div>`;
            }).join('');
        },

        // Projection for one period: daily average so far x target days (elapsed days come from the period dates)
        projectionFor: function (period, achieve) {
            const days = parseInt(period && period.target_days, 10) || 30;
            const elapsed = Utils.calculateElapsedDays(period && period.start_date, period && period.end_date, days);
            return TargetCalculator.calculateProjection(achieve, elapsed, days);
        },

        // Highest achievement % first; ties -> higher achieve, then name
        rankRows: function (rows) {
            return rows.sort((a, b) => (b.pct - a.pct) || (b.achieve - a.achieve) || String(a.name).localeCompare(String(b.name), 'ar'));
        },

        renderBranchManagerView: function () {
            const container = document.getElementById('branchDashboardContainer');
            if (!container) return;

            const subs = this.state.subordinates || [];
            const periods = (this.state.teamData && this.state.teamData.periods) ? this.state.teamData.periods : [];
            const logs = (this.state.teamData && this.state.teamData.logs) ? this.state.teamData.logs : [];

            let totalBranchTarget = 0;
            let totalBranchAchieve = 0;
            let totalBranchProj = 0;
            const employeeRows = [];
            const LINE_KEYS = TargetCalculator.TOTAL_LINE_ITEMS;
            const branchSep = {}; this.SEPARATE_ITEMS.forEach(it => branchSep[it.key] = { target: 0, achieve: 0 });
            const branchItemTotals = {}; ['pt12','super_kix','tazbeet','data','we_gold','adsl','fixed','we_pay'].forEach(k => branchItemTotals[k] = 0);

            subs.forEach((emp) => {
                const empPeriod = periods.find(p => p.user_id === emp.id);
                Object.keys(branchItemTotals).forEach(k => { branchItemTotals[k] += this.sumTargetsOf(empPeriod, [k]); });
                // Total target = PT12 + Super Kix + Tazbeet + WE Gold + Data only
                const empTarget = this.sumTargetsOf(empPeriod, LINE_KEYS);

                // Get emp logs
                const empLogs = empPeriod ? logs.filter(l => l.period_id === empPeriod.id) : [];
                const empAchieve = this.sumLogsOf(empLogs, LINE_KEYS);

                const empSep = {};
                this.SEPARATE_ITEMS.forEach(it => {
                    empSep[it.key] = { target: this.sumTargetsOf(empPeriod, [it.key]), achieve: this.sumLogsOf(empLogs, [it.key]) };
                    branchSep[it.key].target += empSep[it.key].target;
                    branchSep[it.key].achieve += empSep[it.key].achieve;
                });

                totalBranchTarget += empTarget;
                totalBranchAchieve += empAchieve;

                const empPct = TargetCalculator.calculateAchievementPercentage(empAchieve, empTarget);
                const empProj = this.projectionFor(empPeriod, empAchieve);
                const empProjPct = TargetCalculator.calculateAchievementPercentage(empProj, empTarget);
                totalBranchProj += empProj;
                const empRem = TargetCalculator.calculateRemaining(empTarget, empAchieve);
                const empStatus = TargetCalculator.calculateStatus(empPct, empProj, empTarget);

                employeeRows.push({
                    id: emp.id,
                    name: emp.full_name || `موظف`,
                    target: empTarget,
                    achieve: empAchieve,
                    percentage: empPct,
                    projection: empProj,
                    projPct: empProjPct,
                    remaining: empRem,
                    status: empStatus,
                    sep: empSep,
                    btId: empPeriod ? empPeriod.branch_target_id : null,
                    manual: !!(empPeriod && (empPeriod.targets || []).some(t => t.is_manual))
                });
            });

            const btnTxt = document.getElementById('branchTargetBtnText');
            if (btnTxt) btnTxt.textContent = employeeRows.some(e => e.btId) ? 'تعديل توتل تارجت الفرع' : 'تسجيل توتل تارجت الفرع';

            const branchPct = TargetCalculator.calculateAchievementPercentage(totalBranchAchieve, totalBranchTarget);
            const branchProj = totalBranchProj;
            const branchProjPct = TargetCalculator.calculateAchievementPercentage(branchProj, totalBranchTarget);
            employeeRows.forEach(e => { e.pct = e.percentage; });
            this.rankRows(employeeRows);   // dynamic ranking: best performer first
            const branchRem = TargetCalculator.calculateRemaining(totalBranchTarget, totalBranchAchieve);

            container.innerHTML = `
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <span class="kpi-title">هدف الفرع الكلي (PT12 + Super Kix + Tazbeet + WE Gold + Data)</span>
                        <div class="kpi-value">${Utils.formatNumber(totalBranchTarget)}</div>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-title">محقق الفرع الكلي</span>
                        <div class="kpi-value">${Utils.formatNumber(totalBranchAchieve)}</div>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-title">نسبة تحقيق الفرع</span>
                        <div class="kpi-value">${Utils.formatPercent(branchPct)}</div>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-title">متوقع تحقيق الفرع (Projection)</span>
                        <div class="kpi-value">${Utils.formatNumber(branchProj)} <small style="font-size:.55em;">(${Utils.formatPercent(branchProjPct)})</small></div>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-title">المتبقي للفرع</span>
                        <div class="kpi-value">${Utils.formatNumber(branchRem)}</div>
                    </div>
                </div>

                <div class="glass-card margin-top" style="padding:1rem;">
                    <div class="flex justify-between items-center" style="gap:.75rem;flex-wrap:wrap;margin-bottom:.75rem;">
                        <h3 class="font-bold">تارجت الفرع الكامل</h3>
                        <button class="btn btn-primary btn-sm" onclick="openBranchTargetModal()">
                            <i class="fa-solid fa-pen"></i> ${employeeRows.some(e => e.btId) ? 'تعديل تارجت الفرع' : 'تسجيل تارجت الفرع'}
                        </button>
                    </div>
                    <div class="flex" style="gap:.5rem;flex-wrap:wrap;">
                        ${[['pt12','PT12'],['super_kix','Super Kix'],['tazbeet','Tazbeet'],['data','Data'],['we_gold','WE Gold'],['adsl','ADSL'],['fixed','Fixed'],['we_pay','WE Pay']].map(([k, l]) => `<span class="badge-status">${l}: ${Utils.formatNumber(branchItemTotals[k])}</span>`).join('')}
                    </div>
                </div>

                <h3 class="font-bold margin-top" style="margin-bottom:.75rem;">الأهداف المنفصلة (مش داخلة في إجمالي الخطوط)</h3>
                <div class="kpi-grid">${this.separateCardsHTML(branchSep)}</div>

                <div class="table-card-wrapper margin-top">
                    <div class="table-toolbar">
                        <h3 class="font-bold">جدول أداء موظفي الفرع (${subs.length} موظف)</h3>
                        <div class="table-search-box">
                            <i class="fa-solid fa-search"></i>
                            <input type="text" class="form-input" placeholder="ابحث باسم الموظف..." oninput="Dashboard.filterEmployees(this.value)">
                        </div>
                    </div>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>الموظف</th>
                                    <th>الهدف</th>
                                    <th>المحقق</th>
                                    <th>نسبة الإنجاز</th>
                                    <th>المتوقع (رقم / %)</th>
                                    <th>المتبقي</th>
                                    <th>الإنترنت</th>
                                    <th>الأرضي</th>
                                    <th>WE Pay</th>
                                    <th>الحالة</th>
                                    <th>التفاصيل</th>
                                </tr>
                            </thead>
                            <tbody id="branchEmployeesTableBody">
                                ${employeeRows.map((emp, idx) => `
                                    <tr>
                                        <td class="font-bold">${idx + 1}</td>
                                        <td class="font-bold">${emp.name}</td>
                                        <td>${emp.target}${emp.manual ? ' <span class="badge-status" title="تارجت معدّل يدوياً">يدوي</span>' : ''}</td>
                                        <td>${emp.achieve}</td>
                                        <td>${Utils.formatPercent(emp.percentage)}</td>
                                        <td>${emp.projection} <small>(${Utils.formatPercent(emp.projPct)})</small></td>
                                        <td>${emp.remaining}</td>
                                        <td>${emp.sep.adsl.achieve} / ${emp.sep.adsl.target}</td>
                                        <td>${emp.sep.fixed.achieve} / ${emp.sep.fixed.target}</td>
                                        <td>${emp.sep.we_pay.achieve} / ${emp.sep.we_pay.target}</td>
                                        <td><span class="badge-status ${emp.status.class}">${emp.status.label}</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-secondary" onclick="Dashboard.openEmployeeDrilldown('${emp.id}')">
                                                <i class="fa-solid fa-eye"></i> عرض
                                            </button>
                                            ${emp.btId && typeof openEmpTargetModal === 'function' ? `<button class="btn btn-sm btn-primary" onclick="openEmpTargetModal('${emp.id}')"><i class="fa-solid fa-pen"></i> تارجت</button>` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            if (typeof ChartEngine !== 'undefined') {
                const names = employeeRows.map(e => e.name);
                const targets = employeeRows.map(e => e.target);
                const achieves = employeeRows.map(e => e.achieve);
                ChartEngine.renderComparisonBar('chartBranchEmployees', names, targets, achieves);
            }
        },

        /* ------------------------------------------------------------------
         * 3 + 4. AREA MANAGER / SUPERVISOR - drill-down (area > branch > employee)
         * Supervisor : areas -> branches of the chosen area -> employees of the chosen branch -> employee data
         * Area manager: his branches -> employees of the chosen branch -> employee data
         * ------------------------------------------------------------------ */
        ALL_ITEMS: [
            ['pt12', 'PT12'], ['super_kix', 'Super Kix'], ['tazbeet', 'Control Tazbeet'], ['data', 'Data Lines'],
            ['we_gold', 'WE Gold'], ['adsl', 'WE Space ADSL'], ['fixed', 'Fixed Line'], ['we_pay', 'WE Pay']
        ],

        esc: function (v) {
            return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        },

        // One employee: totals (lines only), separate KPIs, every item, and his daily logs
        buildEmpRow: function (emp, period, logs) {
            const LINE_KEYS = TargetCalculator.TOTAL_LINE_ITEMS;
            const empLogs = period ? (logs || []).filter(l => l.period_id === period.id) : [];
            const target = this.sumTargetsOf(period, LINE_KEYS);
            const achieve = this.sumLogsOf(empLogs, LINE_KEYS);
            const proj = this.projectionFor(period, achieve);
            const sep = {}; this.SEPARATE_ITEMS.forEach(it => sep[it.key] = { target: this.sumTargetsOf(period, [it.key]), achieve: this.sumLogsOf(empLogs, [it.key]) });
            const items = {}; this.ALL_ITEMS.forEach(([k]) => items[k] = { target: this.sumTargetsOf(period, [k]), achieve: this.sumLogsOf(empLogs, [k]) });
            const pct = TargetCalculator.calculateAchievementPercentage(achieve, target);
            return {
                id: emp.id, name: emp.full_name || 'موظف', branch: emp.branch || 'غير محدد',
                target, achieve, proj, sep, items, logs: empLogs, pct,
                projPct: TargetCalculator.calculateAchievementPercentage(proj, target),
                rem: TargetCalculator.calculateRemaining(target, achieve),
                status: TargetCalculator.calculateStatus(pct, proj, target)
            };
        },

        finishNode: function (n) {
            n.pct = TargetCalculator.calculateAchievementPercentage(n.achieve, n.target);
            n.projPct = TargetCalculator.calculateAchievementPercentage(n.proj, n.target);
            n.rem = TargetCalculator.calculateRemaining(n.target, n.achieve);
            return n;
        },

        // Branch node = sum of its employees
        makeBranchNode: function (name, employees) {
            const n = { name, employees, employeesCount: employees.length, target: 0, achieve: 0, proj: 0, sep: {} };
            this.SEPARATE_ITEMS.forEach(it => n.sep[it.key] = { target: 0, achieve: 0 });
            employees.forEach(e => {
                n.target += e.target; n.achieve += e.achieve; n.proj += e.proj;
                this.SEPARATE_ITEMS.forEach(it => { n.sep[it.key].target += e.sep[it.key].target; n.sep[it.key].achieve += e.sep[it.key].achieve; });
            });
            return this.finishNode(n);
        },

        // Area node (or the grand total) = sum of its children (branch nodes / area nodes)
        rollup: function (name, children, key) {
            const n = { name, employeesCount: 0, target: 0, achieve: 0, proj: 0, sep: {} };
            n[key || 'branches'] = children;
            this.SEPARATE_ITEMS.forEach(it => n.sep[it.key] = { target: 0, achieve: 0 });
            children.forEach(c => {
                n.employeesCount += c.employeesCount; n.target += c.target; n.achieve += c.achieve; n.proj += c.proj;
                this.SEPARATE_ITEMS.forEach(it => { n.sep[it.key].target += c.sep[it.key].target; n.sep[it.key].achieve += c.sep[it.key].achieve; });
            });
            return this.finishNode(n);
        },

        // Group employee rows per branch; branches with no employees still show (from the branches table)
        buildBranchNodes: function (knownNames, rows) {
            const map = {};
            (knownNames || []).forEach(nm => { if (nm && !map[nm]) map[nm] = []; });
            rows.forEach(r => { (map[r.branch] || (map[r.branch] = [])).push(r); });
            const nodes = Object.keys(map).map(nm => this.makeBranchNode(nm, this.rankRows(map[nm])));
            return this.rankRows(nodes);
        },

        renderAreaManagerView: function () {
            const subs = this.state.subordinates || [];
            const periods = (this.state.teamData && this.state.teamData.periods) || [];
            const logs = (this.state.teamData && this.state.teamData.logs) || [];
            // agents only, so nothing is counted twice
            const rows = subs.filter(e => e.role === 'agent').map(emp => this.buildEmpRow(emp, periods.find(p => p.user_id === emp.id), logs));
            const branches = this.buildBranchNodes((this.state.areaBranches || []).map(b => b && b.name), rows);
            const areaName = (this.state.userProfile && this.state.userProfile.area) || 'المنطقة';
            this.state.tree = [this.rollup(areaName, branches)];
            this.state.nav.area = areaName;   // an area manager always works inside his own area
            this.renderDrill();
        },

        renderSupervisorView: async function () {
            const container = document.getElementById('supervisorDashboardContainer');
            if (!container) return;
            const { month, year } = Utils.getCurrentMonthYear();

            const allAreas = (await TargetAPI.fetchAllowedAreas()) || [];
            if (allAreas.length === 0) {
                container.innerHTML = '<p class="text-muted">لا توجد مناطق مرتبطة بحسابك. تواصل مع الأدمن.</p>';
                return;
            }
            const teams = await Promise.all(allAreas.map(ar => TargetAPI.fetchTeamData(month, year, null, ar.name)));

            const tree = allAreas.map((ar, i) => {
                const team = teams[i] || { periods: [], logs: [] };
                const rows = [];
                (team.periods || []).forEach(per => {
                    const r = per.profiles && per.profiles.role;
                    if (r && r !== 'agent') return;   // agents only
                    rows.push(this.buildEmpRow({ id: per.user_id, full_name: per.profiles && per.profiles.full_name, branch: per.branch }, per, team.logs));
                });
                return this.rollup(ar.name, this.buildBranchNodes((ar.branches || []).map(b => b && b.name), rows));
            });
            this.rankRows(tree);   // areas: best first
            this.state.tree = tree;
            this.renderDrill();
        },

        drillTo: function (type, key) {
            const nav = this.state.nav;
            if (type === 'area') { nav.area = key; nav.branch = null; nav.emp = null; }
            else if (type === 'branch') { nav.branch = key; nav.emp = null; }
            else if (type === 'emp') { nav.emp = key; }
            this.renderDrill();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        drillUp: function (level) {
            const nav = this.state.nav;
            if (level === 'root') { nav.area = null; nav.branch = null; nav.emp = null; }
            else if (level === 'area') { nav.branch = null; nav.emp = null; }
            else if (level === 'branch') { nav.emp = null; }
            this.renderDrill();
        },

        // One renderer for both roles; what is shown depends on how deep the user has drilled
        renderDrill: function () {
            const isArea = this.state.activeRoleView === 'area_manager';
            const container = document.getElementById(isArea ? 'areaDashboardContainer' : 'supervisorDashboardContainer');
            if (!container) return;
            const tree = this.state.tree || [];
            const nav = this.state.nav;
            const esc = (v) => this.esc(v);
            const fmt = (v) => Utils.formatNumber(v);
            const bar = (pct) => `<div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${Math.min(Math.max(pct || 0, 0), 100)}%;"></div></div>`;
            const proj = (o) => `${fmt(o.proj)} <small>(${Utils.formatPercent(o.projPct)})</small>`;

            // Resolve the selection; after a data refresh fall back to the deepest level that still exists
            const area = isArea ? (tree[0] || null) : (tree.find(a => a.name === nav.area) || null);
            const branch = area ? (area.branches.find(b => b.name === nav.branch) || null) : null;
            const emp = branch ? (branch.employees.find(e => String(e.id) === String(nav.emp)) || null) : null;

            // Breadcrumb (every step except the last one is a way back)
            const crumbs = [];
            if (!isArea) crumbs.push({ label: 'كل المناطق', level: 'root', icon: 'fa-layer-group', active: !area });
            if (area) crumbs.push({ label: isArea ? `فروع ${area.name}` : area.name, level: 'area', icon: 'fa-city', active: !branch });
            if (branch) crumbs.push({ label: branch.name, level: 'branch', icon: 'fa-store', active: !emp });
            if (emp) crumbs.push({ label: emp.name, level: 'emp', icon: 'fa-user', active: true });
            const crumbsHTML = `<nav class="drill-crumbs">${crumbs.map((c, i) => `
                ${i ? '<i class="fa-solid fa-chevron-left drill-sep"></i>' : ''}
                ${c.active ? `<span class="drill-crumb active"><i class="fa-solid ${c.icon}"></i> ${esc(c.label)}</span>`
                           : `<button type="button" class="drill-crumb" data-nav="${c.level}"><i class="fa-solid ${c.icon}"></i> ${esc(c.label)}</button>`}`).join('')}</nav>`;

            // What the KPI cards describe
            const scope = emp || branch || area || this.rollup('الإجمالي', tree, 'areas');
            const scopeLabel = emp ? 'الموظف' : branch ? 'الفرع' : area ? (isArea ? 'المنطقة' : 'المنطقة') : 'المناطق';
            const kpiHTML = `
                <div class="kpi-grid">
                    <div class="kpi-card"><span class="kpi-title">هدف ${scopeLabel}</span><div class="kpi-value">${fmt(scope.target)}</div>
                        <div class="kpi-subtext">${emp ? esc(emp.branch) : (scope.employeesCount + ' موظف')}</div></div>
                    <div class="kpi-card"><span class="kpi-title">المحقق</span><div class="kpi-value">${fmt(scope.achieve)}</div></div>
                    <div class="kpi-card"><span class="kpi-title">نسبة الإنجاز</span><div class="kpi-value">${Utils.formatPercent(scope.pct)}</div>${bar(scope.pct)}</div>
                    <div class="kpi-card"><span class="kpi-title">المتوقع تحقيقه (رقم / %)</span><div class="kpi-value">${fmt(scope.proj)} <small style="font-size:.55em;">(${Utils.formatPercent(scope.projPct)})</small></div></div>
                    <div class="kpi-card"><span class="kpi-title">المتبقي</span><div class="kpi-value">${fmt(scope.rem)}</div></div>
                </div>
                <h3 class="font-bold margin-top" style="margin-bottom:.75rem;">الأهداف المنفصلة (مش داخلة في إجمالي الخطوط)</h3>
                <div class="kpi-grid">${this.separateCardsHTML(scope.sep)}</div>`;

            // Table of the next level down
            const groupTable = (title, firstCol, rows, type, withBranches) => `
                <div class="table-card-wrapper margin-top">
                    <div class="table-toolbar"><h3 class="font-bold">${title} (${rows.length})</h3></div>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead><tr><th>#</th><th>${firstCol}</th>${withBranches ? '<th>الفروع</th>' : ''}<th>الموظفين</th><th>الهدف</th><th>المحقق</th><th>النسبة</th><th>المتوقع (رقم / %)</th><th>المتبقي</th><th></th></tr></thead>
                            <tbody>
                                ${rows.length ? rows.map((r, idx) => `
                                    <tr class="drill-row" data-drill="${type}" data-key="${esc(r.name)}">
                                        <td class="font-bold">${idx + 1}</td>
                                        <td class="font-bold">${esc(r.name)}</td>
                                        ${withBranches ? `<td>${r.branches.length}</td>` : ''}
                                        <td>${r.employeesCount}</td>
                                        <td>${fmt(r.target)}</td>
                                        <td>${fmt(r.achieve)}</td>
                                        <td>${Utils.formatPercent(r.pct)}${bar(r.pct)}</td>
                                        <td>${proj(r)}</td>
                                        <td>${fmt(r.rem)}</td>
                                        <td><button type="button" class="btn btn-sm btn-secondary"><i class="fa-solid fa-eye"></i> عرض</button></td>
                                    </tr>`).join('') : `<tr><td colspan="${withBranches ? 10 : 9}" class="text-muted">لا توجد بيانات</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>`;

            const empTable = (rows) => `
                <div class="table-card-wrapper margin-top">
                    <div class="table-toolbar"><h3 class="font-bold">موظفو الفرع (${rows.length})</h3></div>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead><tr><th>#</th><th>الموظف</th><th>الهدف</th><th>المحقق</th><th>النسبة</th><th>المتوقع (رقم / %)</th><th>المتبقي</th><th>الإنترنت</th><th>الأرضي</th><th>WE Pay</th><th>الحالة</th><th></th></tr></thead>
                            <tbody>
                                ${rows.length ? rows.map((r, idx) => `
                                    <tr class="drill-row" data-drill="emp" data-key="${esc(r.id)}">
                                        <td class="font-bold">${idx + 1}</td>
                                        <td class="font-bold">${esc(r.name)}</td>
                                        <td>${fmt(r.target)}</td>
                                        <td>${fmt(r.achieve)}</td>
                                        <td>${Utils.formatPercent(r.pct)}${bar(r.pct)}</td>
                                        <td>${proj(r)}</td>
                                        <td>${fmt(r.rem)}</td>
                                        <td>${fmt(r.sep.adsl.achieve)} / ${fmt(r.sep.adsl.target)}</td>
                                        <td>${fmt(r.sep.fixed.achieve)} / ${fmt(r.sep.fixed.target)}</td>
                                        <td>${fmt(r.sep.we_pay.achieve)} / ${fmt(r.sep.we_pay.target)}</td>
                                        <td><span class="badge-status ${r.status.class}">${r.status.label}</span></td>
                                        <td><button type="button" class="btn btn-sm btn-secondary"><i class="fa-solid fa-eye"></i> بياناته</button></td>
                                    </tr>`).join('') : '<tr><td colspan="12" class="text-muted">لا يوجد موظفون في هذا الفرع</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>`;

            let body;
            if (emp) body = this.employeeDetailHTML(emp, bar);
            else if (branch) body = empTable(branch.employees);
            else if (area) body = groupTable(isArea ? 'فروع المنطقة' : `فروع ${esc(area.name)}`, 'الفرع', area.branches, 'branch', false);
            else body = groupTable('ترتيب المناطق', 'المنطقة', tree, 'area', true);

            // AI analysis stays on the area manager's first screen only (his branches)
            const showAi = isArea && !branch;
            const aiHTML = showAi ? `
                <section class="ai-coach-card margin-top" id="ai-section">
                    <div class="ai-coach-header">
                        <span class="ai-badge"><i class="fa-solid fa-robot"></i> تحليل المنطقة بالذكاء الاصطناعي</span>
                        <button class="btn btn-sm btn-secondary" id="areaAiRefreshBtn"><i class="fa-solid fa-rotate"></i> تحديث التحليل</button>
                    </div>
                    <div class="ai-content-box" id="areaAiText">جاري تحليل بيانات المنطقة...</div>
                </section>` : '';

            container.innerHTML = crumbsHTML + kpiHTML + body + aiHTML;

            container.onclick = (ev) => {
                const go = ev.target.closest('[data-drill]');
                if (go) return this.drillTo(go.dataset.drill, go.dataset.key);
                const back = ev.target.closest('[data-nav]');
                if (back) this.drillUp(back.dataset.nav);
            };

            if (showAi && area) {
                const ctx = { areaTarget: area.target, areaAchieve: area.achieve, areaPct: area.pct, branches: area.branches };
                const refreshBtn = document.getElementById('areaAiRefreshBtn');
                if (refreshBtn) refreshBtn.onclick = () => this.loadAreaAi(ctx, true);
                this.loadAreaAi(ctx);
            }
        },

        // Everything one employee did: totals per item + every daily entry
        employeeDetailHTML: function (emp, bar) {
            const fmt = (v) => Utils.formatNumber(v);
            const LINE_KEYS = TargetCalculator.TOTAL_LINE_ITEMS;
            const sepKeys = this.SEPARATE_ITEMS.map(s => s.key);
            const itemRows = this.ALL_ITEMS.map(([k, label]) => {
                const t = emp.items[k].target, a = emp.items[k].achieve;
                const pct = TargetCalculator.calculateAchievementPercentage(a, t);
                return `<tr>
                    <td class="font-bold">${label}</td>
                    <td><span class="badge-status ${sepKeys.includes(k) ? 'status-warning' : 'status-ontrack'}">${sepKeys.includes(k) ? 'KPI مستقل' : 'ضمن الخطوط'}</span></td>
                    <td>${fmt(t)}</td><td>${fmt(a)}</td><td>${Utils.formatPercent(pct)}</td><td style="min-width:120px;">${bar(pct)}</td>
                </tr>`;
            }).join('');

            const logs = emp.logs.slice().sort((a, b) => String(b.performance_date).localeCompare(String(a.performance_date)));
            const logRows = logs.map(l => `<tr>
                <td class="font-bold">${this.esc(l.performance_date)}</td>
                <td>${fmt(l.pt12)}</td><td>${fmt(l.super_kix)}</td><td>${fmt(l.tazbeet)}</td><td>${fmt(l.data)}</td><td>${fmt(l.we_gold)}</td>
                <td>${fmt(l.adsl)}</td><td>${fmt(l.fixed)}</td><td>${fmt(l.we_pay)}</td>
                <td class="font-bold" style="color:var(--we-purple);">${fmt(this.sumLogsOf([l], LINE_KEYS))}</td>
                <td>${this.esc(l.notes || '—')}</td>
            </tr>`).join('');

            return `
                <div class="table-card-wrapper margin-top">
                    <div class="table-toolbar">
                        <h3 class="font-bold"><i class="fa-solid fa-user"></i> ${this.esc(emp.name)} — ${this.esc(emp.branch)}</h3>
                        <span class="badge-status ${emp.status.class}">${emp.status.label}</span>
                    </div>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead><tr><th>البند</th><th>النوع</th><th>الهدف</th><th>المحقق</th><th>النسبة</th><th></th></tr></thead>
                            <tbody>${itemRows}</tbody>
                        </table>
                    </div>
                </div>
                <div class="table-card-wrapper margin-top">
                    <div class="table-toolbar"><h3 class="font-bold">سجل الإدخالات اليومية (${logs.length})</h3></div>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead><tr><th>التاريخ</th><th>PT12</th><th>Super Kix</th><th>Tazbeet</th><th>Data</th><th>WE Gold</th><th>ADSL</th><th>Fixed</th><th>WE Pay</th><th>إجمالي الخطوط</th><th>ملاحظات</th></tr></thead>
                            <tbody>${logRows || '<tr><td colspan="11" class="text-muted">لم يسجل هذا الموظف أي أداء بعد</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>`;
        },

        loadAreaAi: async function (ctx, force) {
            const box = document.getElementById('areaAiText');
            if (!box) return;

            // Reuse the last analysis while the numbers haven't changed (navigating back shouldn't call the AI again)
            const aiKey = [ctx.areaTarget, ctx.areaAchieve, ctx.branches.length].join('|');
            if (!force && this.state.areaAiKey === aiKey && this.state.areaAiHtml) {
                box.innerHTML = this.state.areaAiHtml;
                return;
            }
            box.innerHTML = '<div class="skeleton" style="height:100px;"></div>';

            const profile = this.state.userProfile || {};
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const elapsedDays = Math.max(now.getDate(), 1);
            const remainingDays = Math.max(daysInMonth - elapsedDays, 1);
            const remaining = TargetCalculator.calculateRemaining(ctx.areaTarget, ctx.areaAchieve);
            const projection = TargetCalculator.calculateProjection(ctx.areaAchieve, elapsedDays, daysInMonth);

            const payload = {
                role: 'area_manager',
                userName: profile.full_name || 'مدير المنطقة',
                area: profile.area || 'المنطقة',
                targetLines: ctx.areaTarget,
                achieveLines: ctx.areaAchieve,
                achievementPct: ctx.areaPct,
                projection, remaining, elapsedDays, remainingDays,
                requiredDaily: TargetCalculator.calculateRequiredDaily(remaining, remainingDays),
                branches: ctx.branches.map(b => ({ name: b.name, employees: b.employeesCount, target: b.target, achieve: b.achieve, pct: b.pct }))
            };

            let text = null;
            try {
                const res = await TargetAPI.callEdgeFunction('target-ai', payload);
                text = res && (res.analysis || res.text || res.message);
            } catch (e) {
                console.warn('Area AI edge function unavailable, using local analysis:', e);
            }
            if (!text) text = this.buildAreaFallback(payload);

            const html = String(text)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
            this.state.areaAiKey = aiKey;
            this.state.areaAiHtml = html;
            const liveBox = document.getElementById('areaAiText');   // the user may have navigated away meanwhile
            if (liveBox) liveBox.innerHTML = html;
        },

        buildAreaFallback: function (d) {
            const withTarget = d.branches.filter(b => b.target > 0).sort((x, y) => y.pct - x.pct);
            const noTarget = d.branches.filter(b => !b.target);
            let t = `🎯 **تحليل ${String(d.area).startsWith('منطقة') ? d.area : 'منطقة ' + d.area}:**\n\n`;
            t += `• إجمالي الهدف **${d.targetLines}** والمحقق **${d.achieveLines}** بنسبة **${d.achievementPct}%**.\n`;
            t += `• المتوقع بنهاية الشهر **${d.projection}** والمتبقي **${d.remaining}** خط، والمطلوب يومياً **${d.requiredDaily}** خط.\n\n`;
            if (withTarget.length) {
                const best = withTarget[0], worst = withTarget[withTarget.length - 1];
                t += `🏆 **أفضل فرع:** ${best.name} (${best.pct}%).\n`;
                if (worst !== best) t += `⚠️ **أحوج فرع للدعم:** ${worst.name} (${worst.pct}%) — يُنصح بمتابعة يومية مع مدير الفرع.\n`;
            }
            if (noTarget.length) {
                t += `\n📋 **${noTarget.length} فرع بدون تارجت أو موظفين مسجلين بعد:** ${noTarget.map(b => b.name).join('، ')}. سجّل مديري الفروع والموظفين وحدد الأهداف ليظهر تحليل أدق.\n`;
            }
            if (!d.targetLines) t += `\nلا توجد أهداف مسجلة للمنطقة هذا الشهر، لذلك التحليل محدود.`;
            return t;
        },

        filterEmployees: function (query) {
            const q = query.toLowerCase().trim();
            const rows = document.querySelectorAll('#branchEmployeesTableBody tr');
            rows.forEach(r => {
                r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        },

        loadAiCoach: async function (metrics, userProfile, periodId, forceRefresh = false) {
            const aiContainer = document.getElementById('aiCoachText');
            if (!aiContainer) return;

            aiContainer.innerHTML = '<div class="skeleton" style="height:100px;"></div>';
            try {
                let analysis = await WEAiCoach.getAnalysis(metrics, userProfile, periodId, forceRefresh);
                if (!analysis) analysis = 'لم نتمكن من توليد التحليل.';
                aiContainer.innerHTML = Utils.formatMarkdown ? Utils.formatMarkdown(analysis) : analysis.toString().replace(/\n/g, '<br>');
            } catch (e) {
                console.error('AI Coach Error:', e);
                aiContainer.innerHTML = 'حدث خطأ أثناء تحميل تحليل الذكاء الاصطناعي.';
            }
        },

        openEmployeeDrilldown: function (empId) {
            Utils.showToast(`فتح التفاصيل للموظف ID: ${empId}`, 'info');
            Utils.openModal('employeeModal');
        },

        selectAreaScope: function (areaName) {
            Utils.showToast(`استعراض المنطقة: ${areaName}`, 'info');
            window.location.href = 'area-manager.html';
        }
    };

    global.Dashboard = Dashboard;
})(typeof window !== 'undefined' ? window : this);
