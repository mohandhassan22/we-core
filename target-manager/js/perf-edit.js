/**
 * WE-Core Target Manager - Manager edit of an employee's daily performance (Achieved)
 * Allowed roles: branch_manager, area_manager, admin.
 * Unlike the agent's entry form (which ADDS to the saved day), this form REPLACES the saved values of the chosen day.
 */
(function (global) {
    const ITEMS = [
        ['pt12', 'PT12'], ['super_kix', 'Super Kix'], ['tazbeet', 'New Control Tazbeet'], ['data', 'Data Lines'],
        ['we_gold', 'WE Gold'], ['adsl', 'WE Space ADSL'], ['fixed', 'Fixed Line'], ['we_pay', 'WE Pay Wallet']
    ];
    const EDIT_ROLES = ['branch_manager', 'area_manager', 'admin'];
    const n = (v) => parseFloat(v) || 0;
    const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

    const PerfEdit = {
        canEdit: function (profile) {
            if (!profile) return false;
            return EDIT_ROLES.includes(Permissions.normalizeRole(profile.role));
        },

        /**
         * opts: { empId, empName, period, logs, date?, onSaved? }
         */
        open: function (opts) {
            const { empId, empName, period } = opts;
            const profile = (global.App && global.App.userProfile) || (global.Dashboard && global.Dashboard.state.userProfile);
            if (!this.canEdit(profile)) { Utils.showToast('مفيش عندك صلاحية تعديل الأداء', 'error'); return; }
            if (!period || !period.id) { Utils.showToast('الموظف ده لسه معاه تارجت متحدد — حدد التارجت الأول', 'error'); return; }

            const logs = (opts.logs || []).slice();
            const findLog = (d) => logs.find(l => l.performance_date === d) || null;

            // Default date: requested one, else the latest saved day, else today (clamped inside the period)
            const latest = logs.map(l => l.performance_date).sort().pop();
            let startDate = opts.date || latest || today();
            if (period.start_date && startDate < period.start_date) startDate = period.start_date;
            if (period.end_date && startDate > period.end_date) startDate = period.end_date;

            let ov = document.getElementById('perfEditOverlay');
            if (ov) ov.remove();
            ov = document.createElement('div');
            ov.id = 'perfEditOverlay';
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;';
            ov.innerHTML = `
                <div style="background:var(--bg-card,#fff);color:var(--text-main,#222);max-width:560px;width:100%;border-radius:16px;padding:20px;direction:rtl;max-height:92vh;overflow:auto;">
                    <h3 style="margin:0 0 4px;font-weight:800;"><i class="fa-solid fa-pen-to-square"></i> تعديل أداء ${esc(empName)}</h3>
                    <small style="display:block;margin-bottom:12px;opacity:.75;">الأرقام اللي هتكتبها <b>بتستبدل</b> المسجل في اليوم ده (مش بتتضاف عليه).</small>
                    <div class="form-group">
                        <label class="form-label">تاريخ الأداء</label>
                        <input type="date" class="form-input" id="pe_date" value="${esc(startDate)}"
                            ${period.start_date ? `min="${esc(period.start_date)}"` : ''} ${period.end_date ? `max="${esc(period.end_date)}"` : ''}>
                        <small class="text-muted" id="pe_hint"></small>
                    </div>
                    <div class="items-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
                        ${ITEMS.map(([k, label]) => `<div class="form-group"><label class="form-label">${label}</label><input type="number" min="0" class="form-input" id="pe_${k}" value="0"></div>`).join('')}
                    </div>
                    <div class="form-group">
                        <label class="form-label">ملاحظات</label>
                        <input type="text" class="form-input" id="pe_notes" placeholder="سبب التعديل (اختياري)">
                    </div>
                    <div style="display:flex;gap:10px;margin-top:12px;">
                        <button class="btn btn-primary" id="pe_save"><i class="fa-solid fa-floppy-disk"></i> حفظ التعديل</button>
                        <button class="btn btn-secondary" id="pe_close">إلغاء</button>
                    </div>
                </div>`;
            document.body.appendChild(ov);

            const $ = (id) => document.getElementById(id);
            const loadDate = () => {
                const d = $('pe_date').value;
                const row = findLog(d);
                ITEMS.forEach(([k]) => { $('pe_' + k).value = row ? n(row[k]) : 0; });
                $('pe_notes').value = row && row.notes ? row.notes : '';
                $('pe_hint').textContent = row ? 'المسجل لليوم ده معروض تحت — عدّل عليه' : 'مفيش أداء مسجل لليوم ده — هيتسجل كيوم جديد';
            };
            loadDate();
            $('pe_date').addEventListener('change', loadDate);
            $('pe_close').onclick = () => ov.remove();

            $('pe_save').onclick = async function () {
                const btn = this;
                if (btn.disabled) return;
                const date = $('pe_date').value;
                if (!date) { Utils.showToast('اختار التاريخ', 'error'); return; }
                const values = {};
                ITEMS.forEach(([k]) => { values[k] = Math.max(n($('pe_' + k).value), 0); });
                btn.disabled = true;
                try {
                    const saved = await TargetAPI.saveDailyPerformance(period.id, empId, date, values, $('pe_notes').value.trim());
                    if (saved === null || saved === undefined || saved === false) throw new Error('تعذر حفظ التعديل');
                    Utils.showToast('تم تعديل الأداء', 'success');
                    ov.remove();
                    if (typeof opts.onSaved === 'function') await opts.onSaved();
                } catch (e) {
                    Utils.showToast(e.message || 'تعذر حفظ التعديل', 'error');
                    btn.disabled = false;
                }
            };
        }
    };

    global.PerfEdit = PerfEdit;
})(window);
