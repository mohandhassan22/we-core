/**
 * Shared daily-achievement save + copyable report message
 */
(function (global) {
    const LABELS = { pt12: 'PT12', super_kix: 'Super Kix', tazbeet: 'Control Tazbeet', data: 'Data Lines', adsl: 'WE Space ADSL', fixed: 'Fixed Line', we_pay: 'WE Pay' };
    const ITEMS = Object.keys(LABELS);
    const LINE_ITEMS = ['pt12', 'super_kix', 'tazbeet', 'data'];
    const n = (v) => parseFloat(v) || 0;

    function buildReport(profile, date, today, logs, period) {
        const targets = {}; (period.targets || []).forEach(t => targets[t.item] = n(t.target_value));
        const totals = {}; ITEMS.forEach(k => totals[k] = logs.reduce((s, l) => s + n(l[k]), 0));
        const sumLines = (o) => LINE_ITEMS.reduce((s, k) => s + n(o[k]), 0);
        const tgtLines = sumLines(targets), achLines = sumLines(totals);
        const pct = tgtLines ? ((achLines / tgtLines) * 100).toFixed(1) : '0.0';
        const L = [];
        L.push(`📊 تقرير أداء يوم ${date}`);
        L.push(`👤 الموظف: ${profile.full_name || profile.username || ''}`);
        if (profile.branch) L.push(`🏪 الفرع: ${profile.branch}`);
        L.push('────────────');
        L.push('✅ إنجاز اليوم:');
        ITEMS.forEach(k => L.push(`• ${LABELS[k]}: ${n(today[k])}`));
        L.push(`إجمالي أسطر اليوم: ${sumLines(today)}`);
        L.push('────────────');
        L.push('📈 الإنجاز التراكمي (من بداية الفترة):');
        ITEMS.forEach(k => L.push(`• ${LABELS[k]}: ${totals[k]} / ${targets[k] || 0}`));
        L.push(`إجمالي الأسطر: ${achLines} من ${tgtLines} (${pct}%)`);
        L.push(`المتبقي: ${Math.max(tgtLines - achLines, 0)} خط`);
        return L.join('\n');
    }

    function showReport(text) {
        let ov = document.getElementById('reportOverlay');
        if (ov) ov.remove();
        ov = document.createElement('div');
        ov.id = 'reportOverlay';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;';
        ov.innerHTML = `<div style="background:var(--bg-card,#fff);color:var(--text-main,#222);max-width:520px;width:100%;border-radius:16px;padding:20px;direction:rtl;max-height:90vh;overflow:auto;">
            <h3 style="margin:0 0 10px;font-weight:800;">📋 تقرير اليوم (جاهز للنسخ)</h3>
            <textarea id="reportText" readonly style="width:100%;min-height:300px;padding:10px;border-radius:10px;border:1px solid #ccc;font-family:inherit;font-size:.95rem;line-height:1.7;resize:vertical;"></textarea>
            <div style="display:flex;gap:10px;margin-top:12px;">
                <button class="btn btn-primary" id="copyReportBtn"><i class="fa-solid fa-copy"></i> نسخ التقرير</button>
                <button class="btn btn-secondary" id="closeReportBtn">إغلاق</button>
            </div></div>`;
        document.body.appendChild(ov);
        const ta = document.getElementById('reportText'); ta.value = text;
        document.getElementById('closeReportBtn').onclick = () => ov.remove();
        document.getElementById('copyReportBtn').onclick = async () => {
            try { await navigator.clipboard.writeText(text); }
            catch (e) { ta.select(); document.execCommand('copy'); }
            Utils.showToast('تم نسخ التقرير', 'success');
        };
    }

    const DailyEntry = {
        save: async function (profile, date, itemsData, notes) {
            if (!profile || !profile.id) throw new Error('تعذر تحديد المستخدم');
            const period = await TargetAPI.fetchPeriodForDate(profile.id, date);
            if (!period) throw new Error('لم يحدد مدير الفرع التارجت لهذه الفترة بعد');
            const saved = await TargetAPI.saveDailyPerformance(period.id, profile.id, date, itemsData, notes || '');
            if (saved === null || saved === undefined || saved === false) throw new Error('تعذر حفظ الأداء');
            const logs = await TargetAPI.fetchDailyPerformance(period.id, profile.id);
            const today = logs.find(l => l.performance_date === date) || itemsData;
            showReport(buildReport(profile, date, today, logs, period));
            return period;
        }
    };
    global.DailyEntry = DailyEntry;
})(window);
