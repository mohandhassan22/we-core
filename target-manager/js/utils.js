/**
 * WE-Core Target Manager - Utility Helpers & Excel Export
 */

(function (global) {
    const Utils = {
        /**
         * Formats numbers to localized Arabic or English digits
         */
        formatNumber: function (num, decimals = 0) {
            if (num == null || isNaN(num)) return '0';
            return new Intl.NumberFormat('ar-EG', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(num);
        },

        formatPercent: function (num) {
            if (num == null || isNaN(num)) return '0%';
            return `${this.formatNumber(num, 1)}%`;
        },

        /**
         * Returns current year and month { month: 10, year: 2026 }
         */
        getCurrentMonthYear: function () {
            const now = new Date();
            return {
                month: now.getMonth() + 1,
                year: now.getFullYear()
            };
        },

        /**
         * Calculates elapsed target days up to today within a start & end date
         */
        calculateElapsedDays: function (startDateStr, endDateStr, totalTargetDays = 20) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const start = startDateStr ? new Date(startDateStr) : new Date(today.getFullYear(), today.getMonth(), 1);
            const end = endDateStr ? new Date(endDateStr) : new Date(today.getFullYear(), today.getMonth() + 1, 0);

            if (today < start) return 1;
            if (today > end) return totalTargetDays;

            // Simple business/calendar day calculation
            const diffTime = Math.abs(today - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return Math.min(Math.max(diffDays, 1), totalTargetDays);
        },

        /**
         * Toast notification runner
         */
        showToast: function (message, type = 'info') {
            let container = document.getElementById('toastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toastContainer';
                container.className = 'toast-container';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info');
            toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        },

        /**
         * Client-Side Excel / CSV Exporter with BOM for Arabic UTF-8
         */
        exportToExcel: function (filename, rows, headers) {
            if (!Array.isArray(rows) || rows.length === 0) {
                this.showToast('لا توجد بيانات للتصدير', 'error');
                return;
            }

            let csvContent = '\uFEFF'; // UTF-8 BOM
            if (headers && headers.length) {
                csvContent += headers.map(h => `"${h}"`).join(',') + '\r\n';
            }

            rows.forEach(row => {
                const line = (Array.isArray(row) ? row : Object.values(row))
                    .map(val => {
                        let str = val == null ? '' : String(val);
                        return `"${str.replace(/"/g, '""')}"`;
                    })
                    .join(',');
                csvContent += line + '\r\n';
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}_${new Date().toISOString().substring(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showToast('تم تصدير الملف بنجاح', 'success');
        },

        /**
         * Modal Trigger Helpers
         */
        openModal: function (modalId) {
            const el = document.getElementById(modalId);
            if (el) el.classList.add('active');
        },

        closeModal: function (modalId) {
            const el = document.getElementById(modalId);
            if (el) el.classList.remove('active');
        }
    };

    global.Utils = Utils;
})(typeof window !== 'undefined' ? window : this);
