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

                this.state.teamData = await TargetAPI.fetchTeamData(
                    month, 
                    year, 
                    this.state.activeRoleView === 'branch_manager' ? profile.branch : null,
                    ['area_manager', 'supervisor', 'admin'].includes(this.state.activeRoleView) ? profile.area : null
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

            const elapsedDays = Utils.calculateElapsedDays(period?.start_date, period?.end_date, period?.target_days || 20);
            const metrics = TargetCalculator.calculateMetrics(
                itemTargets,
                itemAchieves,
                period?.target_days || 20,
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
                                    ${item.isTotalLine ? 'ضمن الأسطر' : 'KPI مستقل'}
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
            const days = parseInt(period && period.target_days, 10) || 20;
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

                <h3 class="font-bold margin-top" style="margin-bottom:.75rem;">الأهداف المنفصلة (مش داخلة في إجمالي الأسطر)</h3>
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
         * 3. AREA MANAGER DASHBOARD RENDERER
         * ------------------------------------------------------------------ */
        renderAreaManagerView: function () {
            const container = document.getElementById('areaDashboardContainer');
            if (!container) return;
            const esc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;');

            const subs = this.state.subordinates || [];
            const periods = (this.state.teamData && this.state.teamData.periods) ? this.state.teamData.periods : [];
            const logs = (this.state.teamData && this.state.teamData.logs) ? this.state.teamData.logs : [];

            let areaTarget = 0; let areaAchieve = 0; let areaProj = 0;
            const LINE_KEYS = TargetCalculator.TOTAL_LINE_ITEMS;
            const areaSep = {}; this.SEPARATE_ITEMS.forEach(it => areaSep[it.key] = { target: 0, achieve: 0 });
            const branchesMap = {};
            const employeeRows = [];

            (this.state.areaBranches || []).forEach(br => {
                if (br && br.name && !branchesMap[br.name]) {
                    branchesMap[br.name] = { name: br.name, employeesCount: 0, target: 0, achieve: 0, proj: 0 };
                }
            });

            subs.forEach(emp => {
                if (emp.role !== 'agent') return; // Only count agent targets to avoid double counting

                const empPeriod = periods.find(p => p.user_id === emp.id);
                const empTarget = this.sumTargetsOf(empPeriod, LINE_KEYS);   // lines only
                const empLogs = empPeriod ? logs.filter(l => l.period_id === empPeriod.id) : [];
                const empAchieve = this.sumLogsOf(empLogs, LINE_KEYS);
                this.SEPARATE_ITEMS.forEach(it => {
                    areaSep[it.key].target += this.sumTargetsOf(empPeriod, [it.key]);
                    areaSep[it.key].achieve += this.sumLogsOf(empLogs, [it.key]);
                });

                const empProj = this.projectionFor(empPeriod, empAchieve);
                areaTarget += empTarget;
                areaAchieve += empAchieve;
                areaProj += empProj;

                const branchName = emp.branch || 'غير محدد';
                if (!branchesMap[branchName]) {
                    branchesMap[branchName] = { name: branchName, employeesCount: 0, target: 0, achieve: 0, proj: 0 };
                }
                branchesMap[branchName].employeesCount++;
                branchesMap[branchName].target += empTarget;
                branchesMap[branchName].achieve += empAchieve;
                branchesMap[branchName].proj += empProj;

                employeeRows.push({
                    name: emp.full_name, branch: branchName, target: empTarget, achieve: empAchieve, proj: empProj,
                    pct: TargetCalculator.calculateAchievementPercentage(empAchieve, empTarget),
                    projPct: TargetCalculator.calculateAchievementPercentage(empProj, empTarget)
                });
            });

            const branches = Object.values(branchesMap);
            branches.forEach(b => {
                b.pct = TargetCalculator.calculateAchievementPercentage(b.achieve, b.target);
                b.projPct = TargetCalculator.calculateAchievementPercentage(b.proj, b.target);
                b.rem = TargetCalculator.calculateRemaining(b.target, b.achieve);
            });

            const areaPct = TargetCalculator.calculateAchievementPercentage(areaAchieve, areaTarget);
            const areaProjPct = TargetCalculator.calculateAchievementPercentage(areaProj, areaTarget);
            this.rankRows(branches);       // branches: best first
            this.rankRows(employeeRows);   // employees: best first

            container.innerHTML = `
                <div class="kpi-grid">
                    <div class="kpi-card"><span class="kpi-title">هدف المنطقة (الأفراد)</span><div class="kpi-value">${Utils.formatNumber(areaTarget)}</div></div>
                    <div class="kpi-card"><span class="kpi-title">محقق المنطقة</span><div class="kpi-value">${Utils.formatNumber(areaAchieve)}</div></div>
                    <div class="kpi-card"><span class="kpi-title">نسبة إنجاز المنطقة</span><div class="kpi-value">${Utils.formatPercent(areaPct)}</div></div>
                    <div class="kpi-card"><span class="kpi-title">متوقع تحقيق المنطقة</span><div class="kpi-value">${Utils.formatNumber(areaProj)} <small style="font-size:.55em;">(${Utils.formatPercent(areaProjPct)})</small></div></div>
                </div>
                <h3 class="font-bold margin-top" style="margin-bottom:.75rem;">الأهداف المنفصلة (مش داخلة في إجمالي الأسطر)</h3>
                <div class="kpi-grid">${this.separateCardsHTML(areaSep)}</div>
                <div class="table-card-wrapper margin-top" id="branches-section">
                    <div class="table-toolbar"><h3 class="font-bold">أداء الفروع التابعة للمنطقة</h3></div>
                    <table class="data-table">
                        <thead>
                            <tr><th>#</th><th>الفرع</th><th>الموظفين</th><th>الهدف</th><th>المحقق</th><th>النسبة</th><th>المتوقع (رقم / %)</th><th>المتبقي</th></tr>
                        </thead>
                        <tbody>
                            ${branches.map((b, idx) => `
                                <tr>
                                    <td class="font-bold">${idx + 1}</td>
                                    <td class="font-bold">${b.name}</td>
                                    <td>${b.employeesCount}</td>
                                    <td>${b.target}</td>
                                    <td>${b.achieve}</td>
                                    <td>${Utils.formatPercent(b.pct)}</td>
                                    <td>${b.proj} <small>(${Utils.formatPercent(b.projPct)})</small></td>
                                    <td>${b.rem}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <section class="margin-top" id="branches-grid">
                    <h3 class="font-bold" style="margin-bottom:.75rem;">قائمة الفروع (${branches.length})</h3>
                    <div class="items-grid">
                        ${branches.length ? branches.map(b => `
                            <div class="item-card">
                                <div class="item-card-head">
                                    <span class="item-name">${esc(b.name)}</span>
                                    <span class="item-badge ${b.employeesCount ? 'status-ontrack' : 'status-warning'}">${b.employeesCount ? b.employeesCount + ' موظف' : 'بدون موظفين'}</span>
                                </div>
                                <div class="flex justify-between items-center text-muted" style="font-size:0.85rem;">
                                    <span>الهدف: ${b.target}</span>
                                    <span>المحقق: ${b.achieve}</span>
                                    <span>النسبة: ${Utils.formatPercent(b.pct)}</span>
                                </div>
                                <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${Math.min(b.pct || 0, 100)}%;"></div></div>
                            </div>`).join('') : '<p class="text-muted">لا توجد فروع مسجلة لهذه المنطقة.</p>'}
                    </div>
                </section>

                <div class="table-card-wrapper margin-top" id="employees-section">
                    <div class="table-toolbar"><h3 class="font-bold">أداء جميع موظفي (Agents) المنطقة</h3></div>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr><th>#</th><th>الموظف</th><th>الفرع</th><th>الهدف</th><th>المحقق</th><th>النسبة</th><th>المتوقع (رقم / %)</th></tr>
                            </thead>
                            <tbody>
                                ${employeeRows.map((emp, idx) => `
                                    <tr>
                                        <td class="font-bold">${idx + 1}</td>
                                        <td class="font-bold">${emp.name}</td>
                                        <td>${emp.branch}</td>
                                        <td>${emp.target}</td>
                                        <td>${emp.achieve}</td>
                                        <td>${Utils.formatPercent(emp.pct)}</td>
                                        <td>${emp.proj} <small>(${Utils.formatPercent(emp.projPct)})</small></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <section class="ai-coach-card margin-top" id="ai-section">
                    <div class="ai-coach-header">
                        <span class="ai-badge"><i class="fa-solid fa-robot"></i> تحليل المنطقة بالذكاء الاصطناعي</span>
                        <button class="btn btn-sm btn-secondary" id="areaAiRefreshBtn"><i class="fa-solid fa-rotate"></i> تحديث التحليل</button>
                    </div>
                    <div class="ai-content-box" id="areaAiText">جاري تحليل بيانات المنطقة...</div>
                </section>
            `;

            const areaCtx = { areaTarget, areaAchieve, areaPct, branches };
            const refreshBtn = document.getElementById('areaAiRefreshBtn');
            if (refreshBtn) refreshBtn.onclick = () => this.loadAreaAi(areaCtx);
            this.loadAreaAi(areaCtx);

            // Sidebar links use #anchors; content is rendered async, so scroll once it exists
            if (location.hash) {
                const target = document.querySelector(location.hash);
                if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
            }
        },

        loadAreaAi: async function (ctx) {
            const box = document.getElementById('areaAiText');
            if (!box) return;
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

            box.innerHTML = String(text)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
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

        /* ------------------------------------------------------------------
         * 4. SUPERVISOR DASHBOARD RENDERER
         * ------------------------------------------------------------------ */
        renderSupervisorView: async function () {
            const container = document.getElementById('supervisorDashboardContainer');
            if (!container) return;

            const { month, year } = Utils.getCurrentMonthYear();
            const allAreas = (await TargetAPI.fetchAllowedAreas()) || [];
            const sum = (o) => ['pt12', 'super_kix', 'tazbeet', 'data', 'we_gold'].reduce((t, k) => t + (parseFloat(o[k]) || 0), 0);
            const areas = [];
            for (const ar of allAreas) {
                const team = await TargetAPI.fetchTeamData(month, year, null, ar.name);
                let target = 0;
                team.periods.forEach(p => (p.targets || []).forEach(t => {
                    if (['pt12', 'super_kix', 'tazbeet', 'data', 'we_gold'].includes(t.item)) target += parseFloat(t.target_value) || 0;
                }));
                const achieve = team.logs.reduce((t, l) => t + sum(l), 0);
                areas.push({ name: ar.name, target, achieve, pct: target ? (achieve / target) * 100 : 0 });
            }
            if (areas.length === 0) {
                container.innerHTML = '<p class="text-muted">لا توجد مناطق</p>';
                return;
            }

            container.innerHTML = `
                <div class="kpi-grid">
                    ${areas.map(a => `
                        <div class="kpi-card glass-card">
                            <span class="kpi-title">${a.name}</span>
                            <div class="kpi-value">${Utils.formatPercent(a.pct)}</div>
                            <div class="kpi-subtext">الهدف: ${a.target} | المحقق: ${a.achieve}</div>
                            <button class="btn btn-sm btn-primary w-full margin-top" onclick="Dashboard.selectAreaScope('${a.name}')">
                                <i class="fa-solid fa-folder-open"></i> استعراض المنطقة
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
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
