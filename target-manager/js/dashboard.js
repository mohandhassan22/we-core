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
                // Mock defaults if period not created yet
                itemTargets.pt12 = 15; itemTargets.super_kix = 15; itemTargets.tazbeet = 15;
                itemTargets.data = 15; itemTargets.adsl = 5; itemTargets.fixed = 5; itemTargets.we_pay = 10;
            }

            // Calculate item achieves from daily logs
            const itemAchieves = { pt12: 0, super_kix: 0, tazbeet: 0, data: 0, adsl: 0, fixed: 0, we_pay: 0 };
            const logs = (this.state.dailyLogs && this.state.dailyLogs.length > 0) ? this.state.dailyLogs : [
                { pt12: 3, super_kix: 3, tazbeet: 2, data: 2, adsl: 1, fixed: 0, we_pay: 1 },
                { pt12: 2, super_kix: 2, tazbeet: 1, data: 3, adsl: 0, fixed: 1, we_pay: 2 },
                { pt12: 4, super_kix: 3, tazbeet: 3, data: 2, adsl: 1, fixed: 1, we_pay: 1 }
            ];

            logs.forEach(log => {
                itemAchieves.pt12 += parseFloat(log.pt12) || 0;
                itemAchieves.super_kix += parseFloat(log.super_kix) || 0;
                itemAchieves.tazbeet += parseFloat(log.tazbeet) || 0;
                itemAchieves.data += parseFloat(log.data) || 0;
                itemAchieves.adsl += parseFloat(log.adsl) || 0;
                itemAchieves.fixed += parseFloat(log.fixed) || 0;
                itemAchieves.we_pay += parseFloat(log.we_pay) || 0;
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
                        <div class="kpi-subtext">إجمالي مستهدف الأسطر الـ 4</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-card-header">
                            <span class="kpi-title">المحقق الفعلي (Achieve)</span>
                            <div class="kpi-icon-wrap kpi-icon-green"><i class="fa-solid fa-chart-line"></i></div>
                        </div>
                        <div class="kpi-value">${Utils.formatNumber(metrics.achieveLines)}</div>
                        <div class="kpi-subtext"><span class="badge-status ${metrics.status.class}">${metrics.status.label}</span></div>
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
                    data: 'Data Lines', adsl: 'WE Space ADSL', fixed: 'Fixed Line', we_pay: 'WE Pay'
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
        renderBranchManagerView: function () {
            const container = document.getElementById('branchDashboardContainer');
            if (!container) return;

            const subs = this.state.subordinates || [];
            const periods = (this.state.teamData && this.state.teamData.periods) ? this.state.teamData.periods : [];
            const logs = (this.state.teamData && this.state.teamData.logs) ? this.state.teamData.logs : [];

            let totalBranchTarget = 0;
            let totalBranchAchieve = 0;
            const employeeRows = [];

            subs.forEach((emp) => {
                const empPeriod = periods.find(p => p.user_id === emp.id);
                let empTarget = 0;
                
                if (empPeriod && empPeriod.targets) {
                    empTarget = empPeriod.targets.reduce((sum, t) => sum + (parseFloat(t.target_value) || 0), 0);
                }
                
                // Get emp logs
                const empLogs = empPeriod ? logs.filter(l => l.period_id === empPeriod.id) : [];
                let empAchieve = 0;
                empLogs.forEach(log => {
                    empAchieve += (parseFloat(log.pt12)||0) + (parseFloat(log.super_kix)||0) + (parseFloat(log.tazbeet)||0) + (parseFloat(log.data)||0);
                });

                totalBranchTarget += empTarget;
                totalBranchAchieve += empAchieve;

                const empPct = TargetCalculator.calculateAchievementPercentage(empAchieve, empTarget);
                const empProj = TargetCalculator.calculateProjection(empAchieve, empLogs.length, 20); // simplified elapsed
                const empRem = TargetCalculator.calculateRemaining(empTarget, empAchieve);
                const empStatus = TargetCalculator.calculateStatus(empPct, empProj, empTarget);

                employeeRows.push({
                    id: emp.id,
                    name: emp.full_name || `موظف`,
                    target: empTarget,
                    achieve: empAchieve,
                    percentage: empPct,
                    projection: empProj,
                    remaining: empRem,
                    status: empStatus
                });
            });

            const branchPct = TargetCalculator.calculateAchievementPercentage(totalBranchAchieve, totalBranchTarget);
            const branchProj = TargetCalculator.calculateProjection(totalBranchAchieve, 10, 20);
            const branchRem = TargetCalculator.calculateRemaining(totalBranchTarget, totalBranchAchieve);

            container.innerHTML = `
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <span class="kpi-title">هدف الفرع الكلي</span>
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
                        <span class="kpi-title">متوقع الفرع (Projection)</span>
                        <div class="kpi-value">${Utils.formatNumber(branchProj)}</div>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-title">المتبقي للفرع</span>
                        <div class="kpi-value">${Utils.formatNumber(branchRem)}</div>
                    </div>
                </div>

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
                                    <th>الموظف</th>
                                    <th>الهدف</th>
                                    <th>المحقق</th>
                                    <th>نسبة الإنجاز</th>
                                    <th>المتوقع</th>
                                    <th>المتبقي</th>
                                    <th>الحالة</th>
                                    <th>التفاصيل</th>
                                </tr>
                            </thead>
                            <tbody id="branchEmployeesTableBody">
                                ${employeeRows.map(emp => `
                                    <tr>
                                        <td class="font-bold">${emp.name}</td>
                                        <td>${emp.target}</td>
                                        <td>${emp.achieve}</td>
                                        <td>${Utils.formatPercent(emp.percentage)}</td>
                                        <td>${emp.projection}</td>
                                        <td>${emp.remaining}</td>
                                        <td><span class="badge-status ${emp.status.class}">${emp.status.label}</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-secondary" onclick="Dashboard.openEmployeeDrilldown('${emp.id}')">
                                                <i class="fa-solid fa-eye"></i> عرض
                                            </button>
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

            const subs = this.state.subordinates || [];
            const periods = (this.state.teamData && this.state.teamData.periods) ? this.state.teamData.periods : [];
            const logs = (this.state.teamData && this.state.teamData.logs) ? this.state.teamData.logs : [];

            let areaTarget = 0; let areaAchieve = 0;
            const branchesMap = {};
            const employeeRows = [];

            subs.forEach(emp => {
                if (emp.role !== 'agent') return; // Only count agent targets to avoid double counting

                const empPeriod = periods.find(p => p.user_id === emp.id);
                let empTarget = 0;
                if (empPeriod && empPeriod.targets) {
                    empTarget = empPeriod.targets.reduce((sum, t) => sum + (parseFloat(t.target_value) || 0), 0);
                }
                
                const empLogs = empPeriod ? logs.filter(l => l.period_id === empPeriod.id) : [];
                let empAchieve = 0;
                empLogs.forEach(log => {
                    empAchieve += (parseFloat(log.pt12)||0) + (parseFloat(log.super_kix)||0) + (parseFloat(log.tazbeet)||0) + (parseFloat(log.data)||0);
                });

                areaTarget += empTarget;
                areaAchieve += empAchieve;

                const branchName = emp.branch || 'غير محدد';
                if (!branchesMap[branchName]) {
                    branchesMap[branchName] = { name: branchName, employeesCount: 0, target: 0, achieve: 0 };
                }
                branchesMap[branchName].employeesCount++;
                branchesMap[branchName].target += empTarget;
                branchesMap[branchName].achieve += empAchieve;

                employeeRows.push({
                    name: emp.full_name, branch: branchName, target: empTarget, achieve: empAchieve,
                    pct: TargetCalculator.calculateAchievementPercentage(empAchieve, empTarget)
                });
            });

            const branches = Object.values(branchesMap);
            branches.forEach(b => {
                b.pct = TargetCalculator.calculateAchievementPercentage(b.achieve, b.target);
                b.proj = TargetCalculator.calculateProjection(b.achieve, 10, 20);
                b.rem = TargetCalculator.calculateRemaining(b.target, b.achieve);
            });

            const areaPct = TargetCalculator.calculateAchievementPercentage(areaAchieve, areaTarget);

            container.innerHTML = `
                <div class="kpi-grid">
                    <div class="kpi-card"><span class="kpi-title">هدف المنطقة (الأفراد)</span><div class="kpi-value">${Utils.formatNumber(areaTarget)}</div></div>
                    <div class="kpi-card"><span class="kpi-title">محقق المنطقة</span><div class="kpi-value">${Utils.formatNumber(areaAchieve)}</div></div>
                    <div class="kpi-card"><span class="kpi-title">نسبة إنجاز المنطقة</span><div class="kpi-value">${Utils.formatPercent(areaPct)}</div></div>
                </div>
                <div class="table-card-wrapper margin-top">
                    <div class="table-toolbar"><h3 class="font-bold">أداء الفروع التابعة للمنطقة</h3></div>
                    <table class="data-table">
                        <thead>
                            <tr><th>الفرع</th><th>الموظفين</th><th>الهدف</th><th>المحقق</th><th>النسبة</th><th>المتوقع</th><th>المتبقي</th></tr>
                        </thead>
                        <tbody>
                            ${branches.map(b => `
                                <tr>
                                    <td class="font-bold">${b.name}</td>
                                    <td>${b.employeesCount}</td>
                                    <td>${b.target}</td>
                                    <td>${b.achieve}</td>
                                    <td>${Utils.formatPercent(b.pct)}</td>
                                    <td>${b.proj}</td>
                                    <td>${b.rem}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="table-card-wrapper margin-top">
                    <div class="table-toolbar"><h3 class="font-bold">أداء جميع موظفي (Agents) المنطقة</h3></div>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr><th>الموظف</th><th>الفرع</th><th>الهدف</th><th>المحقق</th><th>النسبة</th></tr>
                            </thead>
                            <tbody>
                                ${employeeRows.map(emp => `
                                    <tr>
                                        <td class="font-bold">${emp.name}</td>
                                        <td>${emp.branch}</td>
                                        <td>${emp.target}</td>
                                        <td>${emp.achieve}</td>
                                        <td>${Utils.formatPercent(emp.pct)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        },

        /* ------------------------------------------------------------------
         * 4. SUPERVISOR DASHBOARD RENDERER
         * ------------------------------------------------------------------ */
        renderSupervisorView: function () {
            const container = document.getElementById('supervisorDashboardContainer');
            if (!container) return;

            const areas = [
                { name: 'منطقة القاهرة الكبرى', target: 2700, achieve: 2060, pct: 76.2 },
                { name: 'منطقة الجيزة', target: 2100, achieve: 1750, pct: 83.3 },
                { name: 'منطقة الإسكندرية والقناة', target: 1800, achieve: 1200, pct: 66.6 }
            ];

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
