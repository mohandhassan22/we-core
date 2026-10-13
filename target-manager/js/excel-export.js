/**
 * WE-Core Target Manager - Professional Excel Dashboard Exporter
 *
 * يصدّر ملف .xlsx احترافي حسب دور المستخدم:
 *   - Agent           : داش بورد شخصي (دائرة تحقيق + رسم باقات + جدول الباقات) + السجل اليومي
 *   - Branch Manager  : داش بورد الفرع + شيت الموظفين
 *   - Area Manager    : داش بورد المنطقة + شيت الفروع + شيت الموظفين
 *   - Supervisor/Admin: داش بورد عام + شيت المناطق + الفروع + الموظفين
 *
 * Requires (loaded before this file): ExcelJS, Chart.js, TargetCalculator, Utils, Dashboard
 */
(function (global) {
    'use strict';

    /* ------------------------------------------------------------------ *
     * Theme
     * ------------------------------------------------------------------ */
    const COLOR = {
        purple: 'FF4B1C7A', purple2: 'FF7B3FB0', lav: 'FFF6F1FB', lav2: 'FFE9DDF5',
        text: 'FF2B2140', muted: 'FF6B6580', line: 'FFD9D2E3', white: 'FFFFFFFF',
        green: 'FF1E8E5A', amber: 'FFE0A100', red: 'FFD64545', blue: 'FF2F6FD6'
    };
    const HEX = { purple: '#4B1C7A', purple2: '#7B3FB0', green: '#1E8E5A', amber: '#E0A100', red: '#D64545', blue: '#2F6FD6', grey: '#E4DEEC', text: '#2B2140' };
    const FONT = 'Arial';

    const STATUS_STYLE = {
        ACHIEVED: { bg: 'FFD4F1E0', fg: 'FF11693F', hex: HEX.green },
        ON_TRACK: { bg: 'FFD9E8FB', fg: 'FF1F4FA3', hex: HEX.blue },
        NEEDS_ATTENTION: { bg: 'FFFFF0CC', fg: 'FF8A5A00', hex: HEX.amber },
        BEHIND: { bg: 'FFFADBD8', fg: 'FF9B1C1C', hex: HEX.red },
        NO_TARGET: { bg: 'FFEEEEEE', fg: 'FF666666', hex: '#999999' }
    };

    // fraction (0..1+) -> colours
    function pctStyle(p) {
        if (p == null) return null;
        if (p >= 1) return { bg: 'FFD4F1E0', fg: 'FF11693F' };
        if (p >= 0.8) return { bg: 'FFFFF0CC', fg: 'FF8A5A00' };
        return { bg: 'FFFADBD8', fg: 'FF9B1C1C' };
    }
    function pctHex(p) { return p >= 1 ? HEX.green : p >= 0.8 ? HEX.amber : HEX.red; }

    const NF_INT = '#,##0';
    const NF_DEC = '#,##0.0';
    const NF_PCT = '0.0%';

    /* ------------------------------------------------------------------ *
     * Helpers
     * ------------------------------------------------------------------ */
    const TC = () => global.TargetCalculator;
    const ITEMS = () => (global.Dashboard && global.Dashboard.ALL_ITEMS) || [
        ['pt12', 'PT12'], ['super_kix', 'Super Kix'], ['tazbeet', 'Control Tazbeet'], ['data', 'Data Lines'],
        ['we_gold', 'WE Gold'], ['adsl', 'WE Space ADSL'], ['fixed', 'Fixed Line'], ['we_pay', 'WE Pay']
    ];
    const LINE_KEYS = () => TC().TOTAL_LINE_ITEMS;
    const num = v => parseFloat(v) || 0;
    const frac = p => (p == null ? null : p / 100);          // calculator gives 0..999.9 -> excel fraction

    function timeCtx(period) {
        const now = new Date();
        const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const days = parseInt(period && period.target_days, 10) || dim;
        const elapsed = global.Utils.calculateElapsedDays(period && period.start_date, period && period.end_date, days);
        return {
            days, elapsed,
            remainingDays: Math.max(days - elapsed, 1),
            label: now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
        };
    }

    // stats for a target/achieve pair
    function stat(t, a, ctx) {
        const pct = TC().calculateAchievementPercentage(a, t);
        const proj = TC().calculateProjection(a, ctx.elapsed, ctx.days);
        const rem = TC().calculateRemaining(t, a);
        return {
            target: t, achieve: a, pct, proj,
            projPct: TC().calculateAchievementPercentage(proj, t),
            rem,
            reqDaily: TC().calculateRequiredDaily(rem, ctx.remainingDays),
            status: TC().calculateStatus(pct, proj, t)
        };
    }

    // items map {k:{target,achieve}} -> { items:{k:stat}, total:stat(lines) }
    function computeStats(items, ctx) {
        const out = { items: {}, total: null };
        let tt = 0, ta = 0;
        ITEMS().forEach(([k]) => {
            const it = items[k] || { target: 0, achieve: 0 };
            out.items[k] = stat(num(it.target), num(it.achieve), ctx);
            if (LINE_KEYS().includes(k)) { tt += num(it.target); ta += num(it.achieve); }
        });
        out.total = stat(tt, ta, ctx);
        return out;
    }

    function sumItems(rows) {
        const sum = {};
        ITEMS().forEach(([k]) => sum[k] = { target: 0, achieve: 0 });
        rows.forEach(r => ITEMS().forEach(([k]) => {
            const it = (r.items && r.items[k]) || { target: 0, achieve: 0 };
            sum[k].target += num(it.target);
            sum[k].achieve += num(it.achieve);
        }));
        return sum;
    }

    function makeRow(name, extra, items, ctx) {
        return Object.assign({ name, items }, extra || {}, computeStats(items, ctx));
    }

    function rank(rows) {
        return rows.sort((a, b) => (b.total.pct - a.total.pct) || (b.total.achieve - a.total.achieve)
            || String(a.name).localeCompare(String(b.name), 'ar'));
    }

    /* ------------------------------------------------------------------ *
     * Model builders (one per role)
     * ------------------------------------------------------------------ */
    function empRowFrom(e, ctx) {
        return makeRow(e.name, { branch: e.branch }, e.items, ctx);
    }

    function nodeRows(node, ctx) {
        // node (branch) -> employee rows
        return (node.employees || []).map(e => empRowFrom(e, ctx));
    }

    function buildModel() {
        const D = global.Dashboard, st = D.state;
        const role = st.activeRoleView;
        const profile = st.userProfile || {};
        const dateStr = new Date().toISOString().substring(0, 10);

        /* ---------- AGENT ---------- */
        if (role === 'agent') {
            const period = st.targetPeriod;
            const ctx = timeCtx(period);
            const items = {};
            ITEMS().forEach(([k]) => items[k] = { target: 0, achieve: 0 });
            ((period && period.targets) || []).forEach(t => { if (items[t.item]) items[t.item].target = num(t.target_value); });
            const logs = st.dailyLogs || [];
            logs.forEach(l => ITEMS().forEach(([k]) => { items[k].achieve += num(l[k]); }));
            const stats = computeStats(items, ctx);
            return {
                role, ctx, items, stats, filePrefix: 'Agent_Dashboard', dateStr,
                title: 'داش بورد الأداء الشخصي',
                subtitle: `${profile.full_name || 'الموظف'}  |  ${profile.branch || ''}  |  ${profile.area || ''}`,
                scopeLabel: 'الموظف', logs,
                sheets: [], rankChart: null
            };
        }

        /* ---------- BRANCH MANAGER ---------- */
        if (role === 'branch_manager') {
            const periods = (st.teamData && st.teamData.periods) || [];
            const logs = (st.teamData && st.teamData.logs) || [];
            const ctx = timeCtx(periods[0] || null);
            const rows = rank((st.subordinates || []).map(emp => {
                const per = periods.find(p => p.user_id === emp.id);
                return empRowFrom(D.buildEmpRow(emp, per, logs), ctx);
            }));
            const items = sumItems(rows);
            return {
                role, ctx, items, stats: computeStats(items, ctx), filePrefix: 'Branch_Dashboard', dateStr,
                title: 'داش بورد الفرع',
                subtitle: `${profile.branch || 'الفرع'}  |  ${rows.length} موظف`,
                scopeLabel: 'الفرع',
                sheets: [{ kind: 'employees', name: 'الموظفين', rows }],
                rankChart: { title: 'ترتيب الموظفين حسب نسبة التحقيق', rows }
            };
        }

        /* ---------- AREA MANAGER ---------- */
        if (role === 'area_manager') {
            const area = (st.tree || [])[0];
            if (!area) return null;
            const periods = (st.teamData && st.teamData.periods) || [];
            const ctx = timeCtx(periods[0] || null);
            const branchRows = [], empRows = [];
            (area.branches || []).forEach(b => {
                const er = nodeRows(b, ctx);
                empRows.push(...er);
                branchRows.push(makeRow(b.name, { count: er.length }, sumItems(er), ctx));
            });
            rank(branchRows); rank(empRows);
            const items = sumItems(empRows);
            return {
                role, ctx, items, stats: computeStats(items, ctx), filePrefix: 'Area_Dashboard', dateStr,
                title: 'داش بورد المنطقة',
                subtitle: `${area.name || profile.area || 'المنطقة'}  |  ${branchRows.length} فرع  |  ${empRows.length} موظف`,
                scopeLabel: 'المنطقة',
                sheets: [
                    { kind: 'branches', name: 'الفروع', rows: branchRows },
                    { kind: 'employees', name: 'الموظفين', rows: empRows }
                ],
                rankChart: { title: 'ترتيب الفروع حسب نسبة التحقيق', rows: branchRows }
            };
        }

        /* ---------- SUPERVISOR / ADMIN ---------- */
        const tree = st.tree || [];
        if (!tree.length) return null;
        const ctx = timeCtx(null);
        const areaRows = [], branchRows = [], empRows = [];
        tree.forEach(a => {
            const aEmp = [];
            (a.branches || []).forEach(b => {
                const er = nodeRows(b, ctx).map(r => Object.assign(r, { area: a.name }));
                aEmp.push(...er); empRows.push(...er);
                branchRows.push(makeRow(b.name, { area: a.name, count: er.length }, sumItems(er), ctx));
            });
            areaRows.push(makeRow(a.name, { count: aEmp.length, branchesCount: (a.branches || []).length }, sumItems(aEmp), ctx));
        });
        rank(areaRows); rank(branchRows); rank(empRows);
        const items = sumItems(empRows);
        return {
            role, ctx, items, stats: computeStats(items, ctx), filePrefix: 'Supervisor_Dashboard', dateStr,
            title: 'داش بورد الإشراف العام',
            subtitle: `${areaRows.length} منطقة  |  ${branchRows.length} فرع  |  ${empRows.length} موظف`,
            scopeLabel: 'كل المناطق',
            sheets: [
                { kind: 'areas', name: 'المناطق', rows: areaRows },
                { kind: 'branches', name: 'الفروع', rows: branchRows, withArea: true },
                { kind: 'employees', name: 'الموظفين', rows: empRows, withArea: true }
            ],
            rankChart: { title: 'ترتيب المناطق حسب نسبة التحقيق', rows: areaRows }
        };
    }

    /* ------------------------------------------------------------------ *
     * Chart images (Chart.js -> PNG -> embedded in the sheet)
     * ------------------------------------------------------------------ */
    const bgPlugin = {
        id: 'whiteBg',
        beforeDraw(chart) {
            const c = chart.ctx; c.save(); c.globalCompositeOperation = 'destination-over';
            c.fillStyle = '#ffffff'; c.fillRect(0, 0, chart.width, chart.height); c.restore();
        }
    };

    function chartPng(config, w, h) {
        if (typeof global.Chart === 'undefined' || typeof document === 'undefined') return null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            config.plugins = (config.plugins || []).concat([bgPlugin]);
            config.options = Object.assign({ animation: false, responsive: false, devicePixelRatio: 2 }, config.options);
            const chart = new global.Chart(canvas.getContext('2d'), config);
            const url = canvas.toDataURL('image/png');
            try { chart.destroy(); } catch (e) { /* image already captured */ }
            return url.replace(/^data:image\/png;base64,/, '');
        } catch (e) {
            console.warn('chart image failed', e);
            return null;
        }
    }

    function donutPng(stats, label) {
        const p = Math.min(stats.total.pct, 100);
        const col = STATUS_STYLE[stats.total.status.code] ? STATUS_STYLE[stats.total.status.code].hex : HEX.purple;
        const center = {
            id: 'centerText',
            afterDraw(chart) {
                const { ctx, chartArea: a } = chart;
                const cx = (a.left + a.right) / 2, cy = (a.top + a.bottom) / 2;
                ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = col; ctx.font = 'bold 40px Arial';
                ctx.fillText(stats.total.pct.toFixed(1) + '%', cx, cy - 8);
                ctx.fillStyle = '#6B6580'; ctx.font = '14px Arial';
                ctx.fillText('من التارجت', cx, cy + 28);
                ctx.restore();
            }
        };
        return chartPng({
            type: 'doughnut',
            data: { labels: ['المحقق', 'المتبقي'], datasets: [{ data: [p, 100 - p], backgroundColor: [col, HEX.grey], borderWidth: 0 }] },
            options: {
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'نسبة تحقيق ' + label, color: HEX.text, font: { size: 16, weight: 'bold' }, padding: { bottom: 8 } }
                }
            },
            plugins: [center]
        }, 340, 320);
    }

    function packagesPng(stats) {
        const keys = ITEMS().map(i => i[0]);
        const names = ITEMS().map(i => i[1]);
        const ach = keys.map(k => +stats.items[k].pct.toFixed(1));
        const prj = keys.map(k => +stats.items[k].projPct.toFixed(1));
        return chartPng({
            type: 'bar',
            data: {
                labels: names,
                datasets: [
                    { label: 'نسبة التحقيق %', data: ach, backgroundColor: ach.map(v => pctHex(v / 100)), borderRadius: 4 },
                    { label: 'نسبة المتوقع %', data: prj, backgroundColor: 'rgba(123,63,176,0.35)', borderRadius: 4 }
                ]
            },
            options: {
                plugins: {
                    legend: { position: 'bottom', rtl: true },
                    title: { display: true, text: 'التحقيق والمتوقع لكل باقة', color: HEX.text, font: { size: 16, weight: 'bold' } }
                },
                scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' } } }
            }
        }, 800, 320);
    }

    function rankingPng(rc) {
        const rows = rc.rows.slice(0, 15);
        const vals = rows.map(r => +r.total.pct.toFixed(1));
        const h = Math.max(220, 90 + rows.length * 28);
        const png = chartPng({
            type: 'bar',
            data: { labels: rows.map(r => r.name), datasets: [{ label: 'نسبة التحقيق %', data: vals, backgroundColor: vals.map(v => pctHex(v / 100)), borderRadius: 4 }] },
            options: {
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: rc.title, color: HEX.text, font: { size: 16, weight: 'bold' } }
                },
                scales: { x: { beginAtZero: true, ticks: { callback: v => v + '%' } } }
            }
        }, 1140, h);
        return png ? { png, h } : null;
    }

    /* ------------------------------------------------------------------ *
     * Cell styling helpers
     * ------------------------------------------------------------------ */
    const thin = { style: 'thin', color: { argb: COLOR.line } };
    const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

    function fill(argb) { return { type: 'pattern', pattern: 'solid', fgColor: { argb } }; }

    function paint(cell, o) {
        if (o.value !== undefined) cell.value = o.value;
        cell.font = Object.assign({ name: FONT, size: 11, color: { argb: COLOR.text } }, o.font || {});
        if (o.bg) cell.fill = fill(o.bg);
        cell.alignment = Object.assign({ horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' }, o.align || {});
        if (o.border !== false) cell.border = o.border || BORDER;
        if (o.fmt) cell.numFmt = o.fmt;
    }

    function mergePaint(ws, range, o) {
        ws.mergeCells(range);
        const first = range.split(':')[0];
        paint(ws.getCell(first), o);
        if (o.bg || o.border !== false) {
            // make borders visible on every cell of the merged block
            const [a, b] = range.split(':');
            const c1 = ws.getCell(a), c2 = ws.getCell(b);
            for (let r = c1.row; r <= c2.row; r++) {
                for (let c = c1.col; c <= c2.col; c++) {
                    const cell = ws.getRow(r).getCell(c);
                    if (o.bg) cell.fill = fill(o.bg);
                    if (o.border !== false) cell.border = o.border || BORDER;
                }
            }
        }
    }

    function statusCellStyle(code) {
        const s = STATUS_STYLE[code] || STATUS_STYLE.NO_TARGET;
        return { bg: s.bg, font: { bold: true, color: { argb: s.fg } } };
    }

    function pctCell(cell, p, bold) {
        const s = pctStyle(p);
        paint(cell, Object.assign({ value: p, fmt: NF_PCT, font: { bold: !!bold } }, s ? { bg: s.bg, font: { bold: !!bold, color: { argb: s.fg } } } : {}));
    }

    /* ------------------------------------------------------------------ *
     * Dashboard sheet
     * ------------------------------------------------------------------ */
    function sectionBar(ws, row, text) {
        mergePaint(ws, `A${row}:L${row}`, {
            value: text, bg: COLOR.lav2, border: { bottom: { style: 'medium', color: { argb: COLOR.purple } } },
            font: { bold: true, size: 13, color: { argb: COLOR.purple } }, align: { horizontal: 'right', indent: 1 }
        });
        ws.getRow(row).height = 24;
    }

    function writeDashboard(wb, M) {
        const ws = wb.addWorksheet('الداش بورد', {
            views: [{ rightToLeft: true, showGridLines: false }],
            properties: { tabColor: { argb: COLOR.purple } },
            pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }
        });
        for (let i = 1; i <= 12; i++) ws.getColumn(i).width = 14.5;
        const S = M.stats;

        // ---- Title band
        mergePaint(ws, 'A1:L2', { value: M.title, bg: COLOR.purple, border: false, font: { bold: true, size: 22, color: { argb: COLOR.white } } });
        mergePaint(ws, 'A3:L3', {
            value: `${M.subtitle}   •   ${M.ctx.label}   •   اليوم ${M.ctx.elapsed} من ${M.ctx.days}`,
            bg: COLOR.purple2, border: false, font: { size: 11, color: { argb: COLOR.white } }
        });
        ws.getRow(1).height = 24; ws.getRow(2).height = 24; ws.getRow(3).height = 22; ws.getRow(4).height = 8;

        // ---- KPI cards (6 cards x 2 columns)
        const st = S.total.status;
        const cards = [
            { label: 'التارجت الكلي (خطوط)', value: S.total.target, fmt: NF_INT, color: COLOR.purple },
            { label: 'المحقق', value: S.total.achieve, fmt: NF_INT, color: COLOR.purple },
            { label: 'نسبة التحقيق', value: frac(S.total.pct), fmt: NF_PCT, color: (STATUS_STYLE[st.code] || {}).fg || COLOR.purple },
            { label: 'المتوقع (Projection)', value: S.total.proj, fmt: NF_INT, color: COLOR.purple },
            { label: 'نسبة المتوقع', value: frac(S.total.projPct), fmt: NF_PCT, color: pctStyle(frac(S.total.projPct)) ? pctStyle(frac(S.total.projPct)).fg : COLOR.purple },
            { label: 'الحالة', value: st.label, fmt: null, color: (STATUS_STYLE[st.code] || {}).fg || COLOR.purple, small: true }
        ];
        const cols = ['A', 'C', 'E', 'G', 'I', 'K'], cols2 = ['B', 'D', 'F', 'H', 'J', 'L'];
        cards.forEach((c, i) => {
            mergePaint(ws, `${cols[i]}5:${cols2[i]}5`, { value: c.label, bg: COLOR.lav, font: { size: 10, bold: true, color: { argb: COLOR.muted } } });
            mergePaint(ws, `${cols[i]}6:${cols2[i]}7`, {
                value: c.value, bg: COLOR.white, fmt: c.fmt || undefined,
                font: { size: c.small ? 15 : 24, bold: true, color: { argb: c.color } }
            });
            // accent line under each card
            ['A', 'B'].forEach(() => { });
            [cols[i], cols2[i]].forEach(col => {
                ws.getCell(`${col}7`).border = Object.assign({}, BORDER, { bottom: { style: 'thick', color: { argb: COLOR.purple2 } } });
            });
        });
        ws.getRow(5).height = 20; ws.getRow(6).height = 26; ws.getRow(7).height = 26; ws.getRow(8).height = 10;

        // ---- Charts
        sectionBar(ws, 9, 'التحليل البياني');
        let row = 10;
        const donut = donutPng(S, M.scopeLabel);
        const bars = packagesPng(S);
        if (donut) { ws.addImage(wb.addImage({ base64: donut, extension: 'png' }), { tl: { col: 0.1, row: row - 0.9 + 0.2 }, ext: { width: 340, height: 320 } }); }
        if (bars) { ws.addImage(wb.addImage({ base64: bars, extension: 'png' }), { tl: { col: 3.55, row: row - 0.9 + 0.2 }, ext: { width: 800, height: 320 } }); }
        const chartRows = 17;                      // 17 rows * 20px = 340px
        for (let r = row; r < row + chartRows; r++) ws.getRow(r).height = 20;
        row += chartRows;

        if (M.rankChart && M.rankChart.rows.length) {
            const rk = rankingPng(M.rankChart);
            if (rk) {
                ws.addImage(wb.addImage({ base64: rk.png, extension: 'png' }), { tl: { col: 0.1, row: row - 0.9 + 0.2 }, ext: { width: 1140, height: rk.h } });
                const n = Math.ceil(rk.h / 20) + 1;
                for (let r = row; r < row + n; r++) ws.getRow(r).height = 20;
                row += n;
            }
        }

        // ---- Packages table
        sectionBar(ws, row, 'تفصيل الباقات (التارجت / المحقق / نسبة التحقيق / المتوقع)');
        row++;
        const heads = [['A', 'B', 'الباقة'], ['C', 'C', 'التارجت'], ['D', 'D', 'المحقق'], ['E', 'E', 'نسبة التحقيق'],
            ['F', 'F', 'المتوقع'], ['G', 'G', 'نسبة المتوقع'], ['H', 'H', 'المتبقي'], ['I', 'I', 'مطلوب يومياً'], ['J', 'L', 'الحالة']];
        heads.forEach(([a, b, t]) => {
            const rng = a === b ? `${a}${row}` : `${a}${row}:${b}${row}`;
            if (a !== b) ws.mergeCells(rng);
            paint(ws.getCell(`${a}${row}`), { value: t, bg: COLOR.purple, font: { bold: true, color: { argb: COLOR.white } } });
            if (a !== b) for (let c = ws.getCell(`${a}1`).col; c <= ws.getCell(`${b}1`).col; c++) { ws.getRow(row).getCell(c).fill = fill(COLOR.purple); ws.getRow(row).getCell(c).border = BORDER; }
        });
        ws.getRow(row).height = 24;
        const headerRow = row;
        row++;

        const writeStatRow = (r, name, s, opts) => {
            opts = opts || {};
            const bg = opts.bg || (opts.zebra ? COLOR.lav : COLOR.white);
            const bold = !!opts.bold;
            ws.mergeCells(`A${r}:B${r}`);
            paint(ws.getCell(`A${r}`), { value: name, bg, font: { bold }, align: { horizontal: 'right', indent: 1 } });
            ws.getCell(`B${r}`).fill = fill(bg); ws.getCell(`B${r}`).border = BORDER;
            paint(ws.getCell(`C${r}`), { value: s.target, fmt: NF_INT, bg, font: { bold } });
            paint(ws.getCell(`D${r}`), { value: s.achieve, fmt: NF_INT, bg, font: { bold } });
            if (s.target > 0) pctCell(ws.getCell(`E${r}`), frac(s.pct), bold); else paint(ws.getCell(`E${r}`), { value: '-', bg });
            paint(ws.getCell(`F${r}`), { value: s.proj, fmt: NF_INT, bg, font: { bold } });
            if (s.target > 0) pctCell(ws.getCell(`G${r}`), frac(s.projPct), bold); else paint(ws.getCell(`G${r}`), { value: '-', bg });
            paint(ws.getCell(`H${r}`), { value: s.rem, fmt: NF_INT, bg, font: { bold } });
            paint(ws.getCell(`I${r}`), { value: s.reqDaily, fmt: NF_DEC, bg, font: { bold } });
            ws.mergeCells(`J${r}:L${r}`);
            paint(ws.getCell(`J${r}`), Object.assign({ value: s.status.label }, statusCellStyle(s.status.code)));
            ['K', 'L'].forEach(c => { ws.getCell(`${c}${r}`).fill = ws.getCell(`J${r}`).fill; ws.getCell(`${c}${r}`).border = BORDER; });
            ws.getRow(r).height = 22;
        };

        const itemName = Object.fromEntries(ITEMS());
        let z = 0;
        LINE_KEYS().forEach(k => { writeStatRow(row++, itemName[k], S.items[k], { zebra: z++ % 2 === 1 }); });
        writeStatRow(row++, 'إجمالي الخطوط', S.total, { bold: true, bg: COLOR.lav2 });
        mergePaint(ws, `A${row}:L${row}`, { value: 'أهداف مستقلة (غير داخلة في إجمالي الخطوط)', bg: COLOR.lav, font: { bold: true, color: { argb: COLOR.muted }, size: 10 } });
        ws.getRow(row).height = 20; row++;
        ['adsl', 'fixed', 'we_pay'].forEach(k => { writeStatRow(row++, itemName[k], S.items[k], { zebra: z++ % 2 === 1 }); });
        const lastRow = row - 1;

        // data bars on achievement % (visual progress inside the cell)
        try {
            ws.addConditionalFormatting({
                ref: `E${headerRow + 1}:E${lastRow}`,
                rules: [{ type: 'dataBar', priority: 1, cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 1 }], color: { argb: 'FFB9A0DB' }, gradient: true }]
            });
        } catch (e) { /* optional */ }

        row++;
        mergePaint(ws, `A${row}:L${row}`, {
            value: `تم الإنشاء بواسطة WE Target Manager  •  ${new Date().toLocaleString('ar-EG')}`,
            border: false, font: { size: 9, color: { argb: COLOR.muted } }
        });
        return ws;
    }

    /* ------------------------------------------------------------------ *
     * Generic table sheet (employees / branches / areas)
     * ------------------------------------------------------------------ */
    function writeTableSheet(wb, def, M) {
        const ws = wb.addWorksheet(def.name, {
            views: [{ rightToLeft: true, showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 3 }],
            properties: { tabColor: { argb: COLOR.purple2 } },
            pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }
        });

        const lead = [{ h: '#', w: 5, get: (r, i) => i + 1, fmt: null }];
        const nameHead = def.kind === 'employees' ? 'الموظف' : def.kind === 'branches' ? 'الفرع' : 'المنطقة';
        lead.push({ h: nameHead, w: 26, get: r => r.name, align: 'right' });
        if (def.kind === 'employees') lead.push({ h: 'الفرع', w: 20, get: r => r.branch || '' });
        if (def.withArea) lead.push({ h: 'المنطقة', w: 18, get: r => r.area || '' });
        if (def.kind === 'branches') lead.push({ h: 'عدد الموظفين', w: 12, get: r => r.count, fmt: NF_INT });
        if (def.kind === 'areas') {
            lead.push({ h: 'عدد الفروع', w: 11, get: r => r.branchesCount, fmt: NF_INT });
            lead.push({ h: 'عدد الموظفين', w: 12, get: r => r.count, fmt: NF_INT });
        }
        const core = [
            { h: 'التارجت', w: 11, get: r => r.total.target, fmt: NF_INT },
            { h: 'المحقق', w: 11, get: r => r.total.achieve, fmt: NF_INT },
            { h: 'نسبة التحقيق', w: 12, get: r => (r.total.target > 0 ? frac(r.total.pct) : null), pct: true },
            { h: 'المتوقع', w: 11, get: r => r.total.proj, fmt: NF_INT },
            { h: 'نسبة المتوقع', w: 12, get: r => (r.total.target > 0 ? frac(r.total.projPct) : null), pct: true },
            { h: 'المتبقي', w: 11, get: r => r.total.rem, fmt: NF_INT },
            { h: 'الحالة', w: 18, get: r => r.total.status.label, status: true }
        ];
        const leadCount = lead.length, coreCount = core.length;
        const items = ITEMS();
        const totalCols = leadCount + coreCount + items.length * 3;
        const colL = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

        // widths
        let ci = 1;
        [...lead, ...core].forEach(c => { ws.getColumn(ci++).width = c.w; });
        for (let i = 0; i < items.length * 3; i++) ws.getColumn(ci++).width = 10.5;

        // title row
        mergePaint(ws, `A1:${colL(totalCols)}1`, {
            value: `${M.title}  —  ${def.name}  (${def.rows.length})  •  ${M.ctx.label}`,
            bg: COLOR.purple, border: false, font: { bold: true, size: 16, color: { argb: COLOR.white } }
        });
        ws.getRow(1).height = 32;

        // group header row (2) + sub header row (3)
        const g1 = leadCount + coreCount;
        mergePaint(ws, `A2:${colL(leadCount)}2`, { value: 'البيانات الأساسية', bg: COLOR.purple2, font: { bold: true, color: { argb: COLOR.white } } });
        mergePaint(ws, `${colL(leadCount + 1)}2:${colL(g1)}2`, { value: 'إجمالي الخطوط (PT12 + Super Kix + Tazbeet + Data + WE Gold)', bg: COLOR.purple, font: { bold: true, color: { argb: COLOR.white } } });
        items.forEach(([k, name], i) => {
            const a = g1 + i * 3 + 1;
            const independent = !LINE_KEYS().includes(k);
            mergePaint(ws, `${colL(a)}2:${colL(a + 2)}2`, {
                value: name + (independent ? ' *' : ''),
                bg: i % 2 === 0 ? 'FF8E5CC2' : 'FF6A3A9E', font: { bold: true, color: { argb: COLOR.white } }
            });
        });
        ws.getRow(2).height = 24;

        ci = 1;
        [...lead, ...core].forEach(c => {
            paint(ws.getCell(3, ci++), { value: c.h, bg: COLOR.lav2, font: { bold: true, color: { argb: COLOR.purple } } });
        });
        items.forEach(() => ['تارجت', 'محقق', '%'].forEach(t => {
            paint(ws.getCell(3, ci++), { value: t, bg: COLOR.lav2, font: { bold: true, color: { argb: COLOR.purple } } });
        }));
        ws.getRow(3).height = 22;

        // data rows
        let r = 4;
        def.rows.forEach((row, idx) => {
            const bg = idx % 2 === 1 ? COLOR.lav : COLOR.white;
            let c = 1;
            lead.forEach(col => {
                paint(ws.getCell(r, c++), { value: col.get(row, idx), bg, fmt: col.fmt || undefined, align: col.align ? { horizontal: col.align, indent: 1 } : undefined, font: { bold: col.h === nameHead } });
            });
            core.forEach(col => {
                const cell = ws.getCell(r, c++);
                const v = col.get(row);
                if (col.pct) { if (v == null) paint(cell, { value: '-', bg }); else pctCell(cell, v); }
                else if (col.status) paint(cell, Object.assign({ value: v }, statusCellStyle(row.total.status.code)));
                else paint(cell, { value: v, bg, fmt: col.fmt });
            });
            items.forEach(([k]) => {
                const s = row.items[k];
                paint(ws.getCell(r, c++), { value: s.target, bg, fmt: NF_INT });
                paint(ws.getCell(r, c++), { value: s.achieve, bg, fmt: NF_INT });
                const cell = ws.getCell(r, c++);
                if (s.target > 0) pctCell(cell, frac(s.pct)); else paint(cell, { value: '-', bg });
            });
            ws.getRow(r).height = 21;
            r++;
        });

        // totals row
        if (def.rows.length) {
            const T = computeStats(sumItems(def.rows), M.ctx);
            const bg = COLOR.lav2;
            let c = 1;
            lead.forEach((col, i) => {
                let v = '';
                if (i === 1) v = 'الإجمالي';
                if (col.h === 'عدد الموظفين') v = def.rows.reduce((s, x) => s + (x.count || 0), 0);
                if (col.h === 'عدد الفروع') v = def.rows.reduce((s, x) => s + (x.branchesCount || 0), 0);
                paint(ws.getCell(r, c++), { value: v, bg, font: { bold: true }, fmt: typeof v === 'number' ? NF_INT : undefined });
            });
            const tv = [T.total.target, T.total.achieve, frac(T.total.pct), T.total.proj, frac(T.total.projPct), T.total.rem, T.total.status.label];
            core.forEach((col, i) => {
                const cell = ws.getCell(r, c++);
                if (col.pct) pctCell(cell, tv[i], true);
                else if (col.status) paint(cell, Object.assign({ value: tv[i] }, statusCellStyle(T.total.status.code)));
                else paint(cell, { value: tv[i], bg, fmt: col.fmt, font: { bold: true } });
            });
            items.forEach(([k]) => {
                const s = T.items[k];
                paint(ws.getCell(r, c++), { value: s.target, bg, fmt: NF_INT, font: { bold: true } });
                paint(ws.getCell(r, c++), { value: s.achieve, bg, fmt: NF_INT, font: { bold: true } });
                const cell = ws.getCell(r, c++);
                if (s.target > 0) pctCell(cell, frac(s.pct), true); else paint(cell, { value: '-', bg });
            });
            ws.getRow(r).height = 24;
        }

        ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + def.rows.length, column: totalCols } };
        ws.getCell(r + 2, 1).value = '* أهداف مستقلة (ADSL / Fixed / WE Pay) غير داخلة في إجمالي الخطوط';
        ws.getCell(r + 2, 1).font = { name: FONT, size: 9, color: { argb: COLOR.muted } };
        return ws;
    }

    /* ------------------------------------------------------------------ *
     * Daily log sheet (agent)
     * ------------------------------------------------------------------ */
    function writeDailySheet(wb, M) {
        const ws = wb.addWorksheet('السجل اليومي', {
            views: [{ rightToLeft: true, showGridLines: false, state: 'frozen', ySplit: 3 }],
            properties: { tabColor: { argb: COLOR.purple2 } },
            pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }
        });
        const items = ITEMS();
        const heads = ['التاريخ', ...items.map(i => i[1]), 'إجمالي الخطوط', 'التراكمي', 'نسبة التراكمي من التارجت'];
        const total = heads.length;
        ws.getColumn(1).width = 14;
        for (let i = 2; i <= total; i++) ws.getColumn(i).width = 13;
        ws.getColumn(total).width = 20;

        const L = n => String.fromCharCode(64 + n);
        mergePaint(ws, `A1:${L(total)}2`, { value: 'السجل اليومي للأداء', bg: COLOR.purple, border: false, font: { bold: true, size: 16, color: { argb: COLOR.white } } });
        heads.forEach((h, i) => paint(ws.getCell(3, i + 1), { value: h, bg: COLOR.lav2, font: { bold: true, color: { argb: COLOR.purple } } }));
        ws.getRow(3).height = 24;

        const target = M.stats.total.target;
        let cum = 0, r = 4;
        (M.logs || []).forEach((l, idx) => {
            const bg = idx % 2 === 1 ? COLOR.lav : COLOR.white;
            const d = l.performance_date ? new Date(l.performance_date + 'T00:00:00') : null;
            paint(ws.getCell(r, 1), { value: d, fmt: 'dd/mm/yyyy', bg });
            items.forEach(([k], i) => paint(ws.getCell(r, i + 2), { value: num(l[k]), fmt: NF_INT, bg }));
            const lines = LINE_KEYS().reduce((s, k) => s + num(l[k]), 0);
            cum += lines;
            paint(ws.getCell(r, items.length + 2), { value: lines, fmt: NF_INT, bg, font: { bold: true } });
            paint(ws.getCell(r, items.length + 3), { value: cum, fmt: NF_INT, bg });
            const p = target > 0 ? cum / target : null;
            if (p == null) paint(ws.getCell(r, items.length + 4), { value: '-', bg }); else pctCell(ws.getCell(r, items.length + 4), p);
            r++;
        });
        if (r === 4) mergePaint(ws, `A4:${L(total)}4`, { value: 'لا توجد أيام مسجلة بعد', font: { color: { argb: COLOR.muted } } });
        return ws;
    }

    /* ------------------------------------------------------------------ *
     * Public API
     * ------------------------------------------------------------------ */
    function buildWorkbook(M) {
        const ExcelJS = global.ExcelJS;
        const wb = new ExcelJS.Workbook();
        wb.creator = 'WE Target Manager';
        wb.created = new Date();
        wb.views = [{ rightToLeft: true }];
        writeDashboard(wb, M);
        (M.sheets || []).forEach(def => writeTableSheet(wb, def, M));
        if (M.role === 'agent') writeDailySheet(wb, M);
        return wb;
    }

    async function run() {
        const U = global.Utils;
        try {
            if (typeof global.ExcelJS === 'undefined') { U.showToast('مكتبة Excel لم يتم تحميلها، حدّث الصفحة وحاول مرة أخرى', 'error'); return; }
            const M = buildModel();
            if (!M) { U.showToast('لا توجد بيانات للتصدير حالياً، انتظر تحميل اللوحة', 'error'); return; }
            const wb = buildWorkbook(M);
            const buf = await wb.xlsx.writeBuffer();
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${M.filePrefix}_${M.dateStr}.xlsx`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(a.href), 4000);
            U.showToast('تم تصدير الداش بورد بنجاح', 'success');
        } catch (err) {
            console.error('ExcelExport failed:', err);
            U.showToast('تعذر إنشاء الملف: ' + (err.message || ''), 'error');
        }
    }

    global.ExcelExport = { run, buildModel, buildWorkbook };
    if (typeof module !== 'undefined' && module.exports) module.exports = global.ExcelExport;
})(typeof window !== 'undefined' ? window : globalThis);
