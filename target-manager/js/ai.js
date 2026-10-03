/**
 * WE Target Manager - AI Coach
 *
 * Gemini must be called from a Supabase Edge Function (the API key never reaches the browser).
 * That function is not deployed yet, so AI_FUNCTION is null and this module produces a
 * RULE-BASED analysis from the real, already-authorised numbers. The UI says so explicitly.
 * When the function exists, set AI_FUNCTION to its name and send the same payload.
 */
(function (global) {
    var AI_FUNCTION = null;
    var LABELS = { pt12: 'PT12', super_kix: 'Super Kix', tazbeet: 'Tazbeet', data: 'Data', adsl: 'ADSL', fixed: 'Fixed', we_pay: 'WE Pay' };

    function f(n) { return Utils.formatNumber(n, 1); }

    var WEAiCoach = {
        isConnected: function () { return !!AI_FUNCTION; },

        /** summary = server/calculator summary { lines, items, elapsedDays, remainingDays, targetDays } */
        analyze: async function (scopeLabel, summary) {
            if (!summary || !summary.lines || !summary.lines.target) {
                return { text: 'لا توجد بيانات كافية للتحليل بعد. سيظهر التحليل بمجرد تحديد الـ Target وتسجيل الأداء.', source: 'none' };
            }
            if (AI_FUNCTION) {
                try {
                    var res = await TargetAPI.callFunction(AI_FUNCTION, { scope: scopeLabel, summary: summary });
                    if (res && res.analysis) return { text: res.analysis, source: 'gemini' };
                } catch (e) { console.warn('AI function failed, using rule-based analysis', e); }
            }
            return { text: this.ruleBased(scopeLabel, summary), source: 'rules' };
        },

        ruleBased: function (scope, s) {
            var L = s.lines, out = [];
            out.push('📊 ' + scope + ': حقق ' + f(L.achieve) + ' من ' + f(L.target) + ' خط (' + Utils.formatPercent(L.percentage) + ') بعد ' + s.elapsedDays + ' من ' + s.targetDays + ' يوم.');

            var meta = Utils.statusMeta(L.status).label;
            out.push('🎯 المتوقع بنهاية الفترة ' + f(L.projection) + ' خط، والحالة: ' + meta + '.');

            if (L.status === 'achieved') {
                out.push('✅ تم تحقيق الهدف بالكامل. استمر في الأداء لرفع الفائض.');
            } else if (s.remainingDays > 0) {
                out.push('📈 المتبقي ' + f(L.remaining) + ' خط على ' + s.remainingDays + ' يوم، أي حوالي ' + f(L.requiredDaily) + ' خط يوميًا.');
            }
            if (L.todayRequired > 0 && L.deficit > 0) {
                out.push('⚠️ يوجد عجز متراكم ' + f(L.deficit) + ' خط، فالمطلوب اليوم ' + f(L.todayRequired) + ' خط.');
            }

            var weakest = null;
            Object.keys(s.items).forEach(function (k) {
                var it = s.items[k];
                if (it.target > 0 && it.status !== 'achieved' && (!weakest || it.percentage < s.items[weakest].percentage)) weakest = k;
            });
            if (weakest) out.push('🔎 أضعف منتج حاليًا: ' + LABELS[weakest] + ' (' + Utils.formatPercent(s.items[weakest].percentage) + ' من هدفه). ركّز عليه.');

            return out.join('\n');
        }
    };

    global.WEAiCoach = WEAiCoach;
})(typeof window !== 'undefined' ? window : this);
