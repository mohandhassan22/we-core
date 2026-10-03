/**
 * WE Target Manager - Utils
 * Every string that reaches innerHTML MUST go through Utils.esc().
 */
(function (global) {
    var MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    var THEME_KEY = 'we-tm-theme'; // preference only; no business data is ever kept in localStorage

    var STATUS_META = {
        achieved:        { cls: 'status-achieved', label: 'تم تحقيق الهدف' },
        on_track:        { cls: 'status-ontrack',  label: 'في المسار الصحيح' },
        needs_attention: { cls: 'status-warning',  label: 'يحتاج انتباه' },
        behind:          { cls: 'status-behind',   label: 'متأخر عن الهدف' },
        not_started:     { cls: 'status-warning',  label: 'لم تبدأ الفترة' },
        no_target:       { cls: 'status-warning',  label: 'لا يوجد Target' }
    };

    var Utils = {
        MONTHS_AR: MONTHS_AR,

        esc: function (v) {
            return String(v == null ? '' : v)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        },

        formatNumber: function (n, decimals) {
            var d = decimals == null ? 0 : decimals;
            var v = Number(n);
            if (!isFinite(v)) return '0';
            return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });
        },
        formatPercent: function (n) {
            var v = Number(n);
            return (isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '0') + '%';
        },
        monthLabel: function (m, y) { return MONTHS_AR[m - 1] + ' ' + y; },

        /** Today in Cairo as YYYY-MM-DD (the business timezone, not the device's) */
        todayCairo: function () {
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
        },
        getCurrentMonthYear: function () {
            var t = this.todayCairo();
            return { month: Number(t.slice(5, 7)), year: Number(t.slice(0, 4)) };
        },
        lastDayOfMonth: function (year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); },
        pad2: function (n) { return String(n).padStart(2, '0'); },

        statusMeta: function (status) { return STATUS_META[status] || STATUS_META.no_target; },
        statusBadge: function (status) {
            var m = this.statusMeta(status);
            return '<span class="badge-status ' + m.cls + '">' + m.label + '</span>';
        },

        param: function (name) { return new URLSearchParams(window.location.search).get(name); },
        /** Build a link that keeps the selected month while drilling down */
        link: function (page, params) {
            var q = new URLSearchParams();
            Object.keys(params || {}).forEach(function (k) { if (params[k] != null && params[k] !== '') q.set(k, params[k]); });
            var s = q.toString();
            return page + (s ? '?' + s : '');
        },

        showToast: function (message, type) {
            var container = document.getElementById('toastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toastContainer';
                container.className = 'toast-container';
                document.body.appendChild(container);
            }
            var t = type || 'info';
            var toast = document.createElement('div');
            toast.className = 'toast toast-' + t;
            var icon = t === 'success' ? 'fa-circle-check' : (t === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info');
            toast.innerHTML = '<i class="fa-solid ' + icon + '"></i> <span>' + this.esc(message) + '</span>';
            container.appendChild(toast);
            setTimeout(function () {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s ease';
                setTimeout(function () { toast.remove(); }, 300);
            }, 4500);
        },

        openModal: function (id) { var el = document.getElementById(id); if (el) el.classList.add('active'); },
        closeModal: function (id) { var el = document.getElementById(id); if (el) el.classList.remove('active'); },

        /** CSV with UTF-8 BOM (opens correctly in Excel with Arabic). Cells starting with = + - @ are neutralised. */
        exportToExcel: function (filename, rows, headers) {
            if (!Array.isArray(rows) || rows.length === 0) {
                this.showToast('لا توجد بيانات للتصدير', 'error');
                return false;
            }
            function cell(v) {
                var s = v == null ? '' : String(v);
                if (/^[=+\-@\t\r]/.test(s) && isNaN(Number(s))) s = "'" + s;
                return '"' + s.replace(/"/g, '""') + '"';
            }
            var csv = '\uFEFF';
            if (headers && headers.length) csv += headers.map(cell).join(',') + '\r\n';
            rows.forEach(function (r) { csv += (Array.isArray(r) ? r : Object.values(r)).map(cell).join(',') + '\r\n'; });
            var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename + '_' + this.todayCairo() + '.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
            this.showToast('تم تصدير الملف', 'success');
            return true;
        },

        /* ---------- theme: light | dark | system ---------- */
        getTheme: function () {
            var t = null;
            try { t = localStorage.getItem(THEME_KEY); } catch (e) { /* storage blocked */ }
            if (t === 'light' || t === 'dark' || t === 'system') return t;
            try { if (localStorage.getItem('wc-dark') === 'true') return 'dark'; } catch (e) { /* ignore */ }
            return 'system';
        },
        applyTheme: function (pref) {
            var p = pref || this.getTheme();
            var dark = p === 'dark' || (p === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.body.classList.toggle('dark', dark);
            var icon = document.getElementById('darkToggleIcon');
            if (icon) icon.className = dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            return dark;
        },
        setTheme: function (pref) {
            try { localStorage.setItem(THEME_KEY, pref); } catch (e) { /* ignore */ }
            this.applyTheme(pref);
            if (global.Dashboard && global.Dashboard.rerender) global.Dashboard.rerender();
        }
    };

    if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        var onChange = function () { if (Utils.getTheme() === 'system') Utils.applyTheme('system'); };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
    }

    global.Utils = Utils;
})(typeof window !== 'undefined' ? window : this);
