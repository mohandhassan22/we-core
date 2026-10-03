/**
 * WE-Core Target Manager - Charts Engine (Chart.js Wrapper)
 */

(function (global) {
    // Shared chart defaults
    const WE_PALETTE = {
        purple: '#5e2750',
        purpleLight: 'rgba(94, 39, 80, 0.25)',
        accent: '#9333ea',
        accentLight: 'rgba(147, 51, 234, 0.25)',
        success: '#10b981',
        successLight: 'rgba(16, 185, 129, 0.25)',
        warning: '#f59e0b',
        warningLight: 'rgba(245, 158, 11, 0.25)',
        danger: '#ef4444',
        dangerLight: 'rgba(239, 68, 68, 0.25)',
        blue: '#3b82f6',
        blueLight: 'rgba(59, 130, 246, 0.25)'
    };

    function setGlobalChartDefaults() {
        if (typeof Chart === 'undefined') return;
        Chart.defaults.font.family = "'Cairo', sans-serif";
        Chart.defaults.font.size = 12;
        Chart.defaults.color = document.body.classList.contains('dark') ? '#cbd5e1' : '#64748b';
        Chart.defaults.plugins.tooltip.rtl = true;
        Chart.defaults.plugins.legend.rtl = true;
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
    }

    const ChartEngine = {
        instances: {},

        destroyChart: function (canvasId) {
            if (this.instances[canvasId]) {
                this.instances[canvasId].destroy();
                delete this.instances[canvasId];
            }
        },

        /**
         * Chart 1: Target vs Achieve Bar Chart
         */
        renderTargetVsAchieve: function (canvasId, targetVal, achieveVal, label = 'الهدف الإجمالي vs المحقق') {
            setGlobalChartDefaults();
            this.destroyChart(canvasId);

            const ctx = document.getElementById(canvasId);
            if (!ctx) return;

            this.instances[canvasId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['الهدف (Target)', 'المحقق (Achieve)'],
                    datasets: [{
                        label: label,
                        data: [targetVal, achieveVal],
                        backgroundColor: [WE_PALETTE.purple, WE_PALETTE.success],
                        borderRadius: 8,
                        barThickness: 36
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        },

        /**
         * Chart 2: Daily Performance Trend Line Chart
         */
        renderDailyTrend: function (canvasId, datesArray, achieveArray, targetLineArray = null) {
            setGlobalChartDefaults();
            this.destroyChart(canvasId);

            const ctx = document.getElementById(canvasId);
            if (!ctx) return;

            const datasets = [{
                label: 'المبيعات اليومية',
                data: achieveArray,
                borderColor: WE_PALETTE.purple,
                backgroundColor: WE_PALETTE.purpleLight,
                fill: true,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 6
            }];

            if (targetLineArray) {
                datasets.push({
                    label: 'الهدف اليومي المطلوب',
                    data: targetLineArray,
                    borderColor: WE_PALETTE.warning,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                });
            }

            this.instances[canvasId] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: datesArray,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        },

        /**
         * Chart 3: Item / Product Breakdown Donut Chart
         */
        renderProductBreakdown: function (canvasId, itemAchievesObject) {
            setGlobalChartDefaults();
            this.destroyChart(canvasId);

            const ctx = document.getElementById(canvasId);
            if (!ctx) return;

            const labelsMap = {
                pt12: 'PT12',
                super_kix: 'Super Kix',
                tazbeet: 'Tazbeet',
                data: 'Data',
                adsl: 'ADSL',
                fixed: 'Fixed',
                we_pay: 'WE Pay'
            };

            const labels = [];
            const dataValues = [];
            const bgColors = [
                WE_PALETTE.purple, WE_PALETTE.accent, WE_PALETTE.blue, WE_PALETTE.success,
                WE_PALETTE.warning, '#ec4899', '#14b8a6'
            ];

            Object.keys(itemAchievesObject || {}).forEach((key, idx) => {
                labels.push(labelsMap[key] || key);
                dataValues.push(parseFloat(itemAchievesObject[key]) || 0);
            });

            this.instances[canvasId] = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataValues,
                        backgroundColor: bgColors,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' }
                    },
                    cutout: '65%'
                }
            });
        },

        /**
         * Chart 4: Multi-bar comparison chart for employees or branches
         */
        renderComparisonBar: function (canvasId, entityNames, targetArray, achieveArray, labelA, labelB) {
            setGlobalChartDefaults();
            this.destroyChart(canvasId);

            const ctx = document.getElementById(canvasId);
            if (!ctx) return;

            this.instances[canvasId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: entityNames,
                    datasets: [
                        {
                            label: labelA || 'الهدف (Target)',
                            data: targetArray,
                            backgroundColor: WE_PALETTE.purpleLight,
                            borderColor: WE_PALETTE.purple,
                            borderWidth: 1.5,
                            borderRadius: 6
                        },
                        {
                            label: labelB || 'المحقق (Achieve)',
                            data: achieveArray,
                            backgroundColor: WE_PALETTE.success,
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        },
        /**
         * Chart 5: achievement percentage per entity (employees / branches)
         */
        renderPercentBar: function (canvasId, entityNames, percentArray) {
            setGlobalChartDefaults();
            this.destroyChart(canvasId);
            const ctx = document.getElementById(canvasId);
            if (!ctx) return;
            this.instances[canvasId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: entityNames,
                    datasets: [{
                        label: 'نسبة التحقيق %',
                        data: percentArray.map(function (v) { return Math.round(v * 10) / 10; }),
                        backgroundColor: percentArray.map(function (v) { return v >= 100 ? WE_PALETTE.success : WE_PALETTE.accent; }),
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { callback: function (v) { return v + '%'; } } } }
                }
            });
        }
    };

    global.ChartEngine = ChartEngine;
})(typeof window !== 'undefined' ? window : this);
