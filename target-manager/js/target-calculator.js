/**
 * WE-Core Target Manager - Calculation Engine
 * Section 33 & 74 Target Calculator Specification
 * 
 * Target Line Items:
 * - PT12 (Counts in Total Lines)
 * - Super Kix (Counts in Total Lines)
 * - New Control Tazbeet (Counts in Total Lines)
 * - Data (Counts in Total Lines)
 * - ADSL (Independent KPI - NOT in Total Lines)
 * - Fixed (Independent KPI - NOT in Total Lines)
 * - WE Pay (Independent KPI - NOT in Total Lines)
 */

(function (global) {
    const TOTAL_LINE_ITEMS = ['pt12', 'super_kix', 'tazbeet', 'data'];

    const TargetCalculator = {
        TOTAL_LINE_ITEMS: TOTAL_LINE_ITEMS,

        /**
         * Calculates total target for lines (PT12 + Super Kix + Tazbeet + Data)
         * @param {Object} itemTargets - { pt12: 15, super_kix: 15, tazbeet: 15, data: 15, adsl: 5, fixed: 5, we_pay: 10 }
         * @returns {number}
         */
        calculateTotalLinesTarget: function (itemTargets) {
            if (!itemTargets) return 0;
            return TOTAL_LINE_ITEMS.reduce((sum, key) => {
                const val = parseFloat(itemTargets[key]) || 0;
                return sum + val;
            }, 0);
        },

        /**
         * Calculates total achievement for lines
         * @param {Object} itemAchieves - { pt12: 10, super_kix: 8, tazbeet: 7, data: 10 }
         * @returns {number}
         */
        calculateTotalLinesAchieve: function (itemAchieves) {
            if (!itemAchieves) return 0;
            return TOTAL_LINE_ITEMS.reduce((sum, key) => {
                const val = parseFloat(itemAchieves[key]) || 0;
                return sum + val;
            }, 0);
        },

        /**
         * Safe achievement percentage calculation: (Achieve / Target) * 100
         */
        calculateAchievementPercentage: function (achieve, target) {
            const t = parseFloat(target) || 0;
            const a = parseFloat(achieve) || 0;
            if (t <= 0) return 0;
            const pct = (a / t) * 100;
            return Math.min(Math.max(parseFloat(pct.toFixed(1)), 0), 999.9);
        },

        /**
         * Projection formula: Daily Average * Target Days
         * Daily Average = Achieve / Elapsed Target Days
         */
        calculateProjection: function (achieve, elapsedDays, targetDays) {
            const a = parseFloat(achieve) || 0;
            const e = parseInt(elapsedDays, 10) || 0;
            const t = parseInt(targetDays, 10) || 20;

            if (e <= 0) return a;
            const dailyAvg = a / e;
            return Math.round(dailyAvg * t);
        },

        /**
         * Remaining Target = max(Target - Achieve, 0)
         */
        calculateRemaining: function (target, achieve) {
            const t = parseFloat(target) || 0;
            const a = parseFloat(achieve) || 0;
            return Math.max(t - a, 0);
        },

        /**
         * Base Daily Target = Target / Target Days
         */
        calculateDailyTarget: function (target, targetDays) {
            const t = parseFloat(target) || 0;
            const td = parseInt(targetDays, 10) || 20;
            if (td <= 0) return 0;
            return parseFloat((t / td).toFixed(2));
        },

        /**
         * Deficit calculation: Cumulative shortfall from past days
         * @param {Array} dailyLogs - Array of objects [{ required: 3, achieve: 2 }, ...] up to yesterday
         * @param {number} baseDailyTarget
         */
        calculateDeficit: function (dailyLogs, baseDailyTarget) {
            if (!Array.isArray(dailyLogs) || dailyLogs.length === 0) return 0;
            let deficit = 0;
            dailyLogs.forEach(log => {
                const req = parseFloat(log.required != null ? log.required : baseDailyTarget) || 0;
                const ach = parseFloat(log.achieve) || 0;
                const diff = req - ach;
                deficit += diff;
            });
            return Math.max(deficit, 0);
        },

        /**
         * Today's Required = Base Daily Target + Active Deficit (capped at Remaining)
         */
        calculateTodayRequired: function (baseDailyTarget, deficit, remaining) {
            const base = parseFloat(baseDailyTarget) || 0;
            const def = parseFloat(deficit) || 0;
            const rem = parseFloat(remaining) || 0;
            const req = base + def;
            return Math.min(req, rem);
        },

        /**
         * Required Daily = Remaining / Remaining Days
         */
        calculateRequiredDaily: function (remaining, remainingDays) {
            const rem = parseFloat(remaining) || 0;
            const remDays = parseInt(remainingDays, 10) || 1;
            if (remDays <= 0) return rem;
            return parseFloat((rem / remDays).toFixed(2));
        },

        /**
         * Item level achievement percentage
         */
        calculateItemPercentage: function (itemAchieve, itemTarget) {
            return this.calculateAchievementPercentage(itemAchieve, itemTarget);
        },

        /**
         * Item level projection
         */
        calculateItemProjection: function (itemAchieve, elapsedDays, targetDays) {
            return this.calculateProjection(itemAchieve, elapsedDays, targetDays);
        },

        /**
         * Status Determination
         * Options: 'Target Achieved', 'On Track', 'Needs Attention', 'Behind Target'
         */
        calculateStatus: function (achievementPct, projection, target) {
            const pct = parseFloat(achievementPct) || 0;
            const proj = parseFloat(projection) || 0;
            const tgt = parseFloat(target) || 0;

            if (pct >= 100 || (tgt > 0 && proj >= tgt && pct >= 95)) {
                return { code: 'ACHIEVED', label: 'تم تحقيق الهدف', class: 'status-achieved' };
            }
            if (proj >= tgt) {
                return { code: 'ON_TRACK', label: 'على الطريق الصحيح', class: 'status-ontrack' };
            }
            if (proj >= tgt * 0.8) {
                return { code: 'NEEDS_ATTENTION', label: 'يحتاج انتباه', class: 'status-warning' };
            }
            return { code: 'BEHIND', label: 'متأخر عن الهدف', class: 'status-behind' };
        },

        /**
         * Calculates individual employee target breakdown from Branch Total Target
         * Divides total branch target by number of active employees
         * @param {Object} totalBranchTargets - { pt12: 150, super_kix: 150, tazbeet: 150, data: 150, adsl: 50, fixed: 50, we_pay: 100 }
         * @param {number} employeeCount - Number of employees in branch
         */
        calculateEmployeeTargetsFromBranchTotal: function (totalBranchTargets, employeeCount) {
            const count = Math.max(parseInt(employeeCount, 10) || 1, 1);
            const employeeTarget = {};
            const keys = ['pt12', 'super_kix', 'tazbeet', 'data', 'adsl', 'fixed', 'we_pay'];

            keys.forEach(key => {
                const total = parseFloat(totalBranchTargets ? totalBranchTargets[key] : 0) || 0;
                employeeTarget[key] = Math.round(total / count);
            });

            return {
                perEmployeeTarget: employeeTarget,
                employeeCount: count,
                perEmployeeTotalLines: this.calculateTotalLinesTarget(employeeTarget)
            };
        },

        /**
         * Master summary calculator for a single user/period dataset
         */
        calculateMetrics: function (itemTargets, itemAchieves, targetDays, elapsedDays, dailyLogs) {
            const targetLines = this.calculateTotalLinesTarget(itemTargets);
            const achieveLines = this.calculateTotalLinesAchieve(itemAchieves);
            const achievementPct = this.calculateAchievementPercentage(achieveLines, targetLines);
            const remaining = this.calculateRemaining(targetLines, achieveLines);
            const elapsed = Math.max(parseInt(elapsedDays, 10) || 1, 1);
            const tDays = Math.max(parseInt(targetDays, 10) || 20, 1);
            const remainingDays = Math.max(tDays - elapsed, 1);
            const projection = this.calculateProjection(achieveLines, elapsed, tDays);
            const baseDailyTarget = this.calculateDailyTarget(targetLines, tDays);
            const deficit = this.calculateDeficit(dailyLogs, baseDailyTarget);
            const todayRequired = this.calculateTodayRequired(baseDailyTarget, deficit, remaining);
            const requiredDaily = this.calculateRequiredDaily(remaining, remainingDays);
            const status = this.calculateStatus(achievementPct, projection, targetLines);

            // Item-by-item breakdown
            const items = ['pt12', 'super_kix', 'tazbeet', 'data', 'adsl', 'fixed', 'we_pay'];
            const itemBreakdown = {};
            items.forEach(item => {
                const itemTgt = parseFloat(itemTargets ? itemTargets[item] : 0) || 0;
                const itemAch = parseFloat(itemAchieves ? itemAchieves[item] : 0) || 0;
                itemBreakdown[item] = {
                    target: itemTgt,
                    achieve: itemAch,
                    remaining: this.calculateRemaining(itemTgt, itemAch),
                    percentage: this.calculateItemPercentage(itemAch, itemTgt),
                    projection: this.calculateItemProjection(itemAch, elapsed, tDays),
                    isTotalLine: TOTAL_LINE_ITEMS.includes(item)
                };
            });

            return {
                targetLines,
                achieveLines,
                achievementPct,
                remaining,
                elapsedDays: elapsed,
                targetDays: tDays,
                remainingDays,
                projection,
                baseDailyTarget,
                deficit,
                todayRequired,
                requiredDaily,
                status,
                items: itemBreakdown
            };
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TargetCalculator;
    } else {
        global.TargetCalculator = TargetCalculator;
    }
})(typeof window !== 'undefined' ? window : this);
