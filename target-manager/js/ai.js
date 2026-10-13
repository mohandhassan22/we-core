/**
 * WE-Core Target Manager - WE AI Coach
 * - getAnalysis: one-shot analysis (cached, cache invalidated when the numbers change)
 * - ask / mountChat: let the user ask follow-up questions about their own numbers
 * - generateFallbackAnalysis: honest, data-driven local analysis (clearly labelled) when the AI service is down
 */

(function (global) {
    const ITEM_LABELS = {
        pt12: 'PT12', super_kix: 'Super Kix', tazbeet: 'New Control Tazbeet', data: 'Data',
        we_gold: 'WE Gold', adsl: 'ADSL', fixed: 'Fixed', we_pay: 'WE Pay'
    };
    const ITEM_TIPS = {
        pt12: 'اعرض PT12 على عملاء الباقات الأعلى استهلاكاً وعملاء التجديد.',
        super_kix: 'Super Kix مناسب للشباب والطلبة، ابدأ به مع كل عميل جديد.',
        tazbeet: 'اعرض Tazbeet على عملاء الكنترول القدامى كترقية بميزات أوضح.',
        data: 'اعرض خط Data كإضافة مع كل خط موبايل أو اشتراك إنترنت منزلي.',
        we_gold: 'WE Gold للعملاء أصحاب الاستهلاك المرتفع؛ ركّز على المميزات الإضافية.',
        adsl: 'راجع عملاء الموبايل الذين لا يملكون إنترنت منزلي واعرض عليهم ADSL.',
        fixed: 'اعرض الخط الأرضي مع باقة الإنترنت كحزمة واحدة.',
        we_pay: 'فعّل WE Pay مع كل عميل في نفس الزيارة، فهو أسهل مؤشر للإضافة.'
    };
    const TOTAL_ITEMS = ['pt12', 'super_kix', 'tazbeet', 'data', 'we_gold'];
    const AI_DOWN_NOTE = '⚠️ **تحليل تلقائي مبسّط** — خدمة الذكاء الاصطناعي غير متاحة الآن، وهذا التحليل محسوب من أرقامك مباشرة.\n\n';

    function dataHash(m) {
        // changes whenever the numbers that drive the analysis change
        const items = m.itemBreakdown || m.items || {};
        const parts = [m.targetLines, m.achieveLines, m.elapsedDays, m.targetDays, m.deficit];
        Object.keys(items).sort().forEach(k => parts.push(k + ':' + (items[k].target || 0) + '/' + (items[k].achieve || 0)));
        return parts.join('|');
    }

    function isStoredFallback(text) {
        return typeof text === 'string' && (text.indexOf('وضع الأوفلاين') !== -1 || text.indexOf('تحليل تلقائي مبسّط') !== -1);
    }

    function buildPayload(metrics, userProfile) {
        return {
            role: userProfile.role,
            userName: userProfile.full_name || 'زميلنا',
            branch: userProfile.branch || 'الفرع',
            area: userProfile.area || 'المنطقة',
            targetLines: metrics.targetLines,
            achieveLines: metrics.achieveLines,
            achievementPct: metrics.achievementPct,
            projection: metrics.projection,
            remaining: metrics.remaining,
            todayRequired: metrics.todayRequired,
            requiredDaily: metrics.requiredDaily,
            deficit: metrics.deficit,
            elapsedDays: metrics.elapsedDays,
            targetDays: metrics.targetDays,
            remainingDays: metrics.remainingDays,
            status: metrics.status ? metrics.status.label : 'قيد المتابعة',
            itemBreakdown: metrics.items
        };
    }

    const WEAiCoach = {
        _dataHash: dataHash,
        _isStoredFallback: isStoredFallback,

        getAnalysis: async function (metrics, userProfile, periodId, forceRefresh = false) {
            if (!metrics || !userProfile) return 'لا تتوفر بيانات كافية للتحليل.';
            const payload = buildPayload(metrics, userProfile);
            payload.dataHash = dataHash(payload);

            if (!forceRefresh && periodId) {
                try {
                    const cached = await TargetAPI.fetchAiAnalysisCache(userProfile.id, periodId);
                    const fresh = cached && cached.response && !isStoredFallback(cached.response) &&
                        cached.input_data && cached.input_data.dataHash === payload.dataHash;
                    if (fresh) return cached.response;
                } catch (cacheErr) {
                    console.warn('Failed to fetch AI cache:', cacheErr);
                }
            }

            try {
                const res = await TargetAPI.callEdgeFunction('target-ai', { ...payload, mode: 'analyze' });
                const text = res.analysis || res.text || res.message;
                if (!text || res.source !== 'gemini') throw new Error('AI service did not return a real analysis');
                if (periodId) await TargetAPI.saveAiAnalysisCache(userProfile.id, periodId, userProfile.role, payload, text);
                return text;
            } catch (err) {
                console.warn('AI service unavailable, using local analysis:', err);
                return AI_DOWN_NOTE + this.generateFallbackAnalysis(payload);   // never cached
            }
        },

        /** Ask a follow-up question. history = [{role:'user'|'model', text}] */
        ask: async function (question, metrics, userProfile, history = []) {
            if (!metrics || !userProfile) throw new Error('لا تتوفر بيانات كافية.');
            const q = String(question || '').trim().slice(0, 500);
            if (!q) throw new Error('اكتب سؤالك أولاً.');
            try {
                const res = await TargetAPI.callEdgeFunction('target-ai', {
                    ...buildPayload(metrics, userProfile), mode: 'ask', question: q, history: history.slice(-6)
                });
                if (!res.answer || res.source !== 'gemini') throw new Error('bad response');
                return res.answer;
            } catch (err) {
                console.warn('AI ask failed:', err);
                throw new Error('تعذر الوصول للذكاء الاصطناعي الآن. حاول بعد قليل.');
            }
        },

        /** Local, data-driven analysis (uses the per-item breakdown, not just the overall %) */
        generateFallbackAnalysis: function (data) {
            const pct = Number(data.achievementPct) || 0;
            const items = data.itemBreakdown || {};
            const name = data.userName || 'زميلنا';
            const lag = TOTAL_ITEMS.filter(k => items[k] && items[k].target > 0)
                .map(k => ({ key: k, pct: items[k].percentage, remaining: items[k].remaining }))
                .sort((a, b) => a.pct - b.pct);
            const independentLag = ['adsl', 'fixed', 'we_pay'].filter(k => items[k] && items[k].target > 0 && items[k].percentage < 70)
                .map(k => `${ITEM_LABELS[k]} (${items[k].percentage}%)`);

            let t = `🎯 **تحليل الأداء لـ ${name}:**\n\n`;
            if (!data.targetLines) return t + 'لا يوجد تارجت مسجل لهذه الفترة، سجّل التارجت أولاً ليظهر تحليل.';

            t += `• المحقق **${data.achieveLines}** من **${data.targetLines}** (**${pct}%**)، والمتوقع بنهاية الفترة **${data.projection}**.\n`;
            if (pct >= 100) {
                t += `🎉 حققت الهدف! استمر وركّز على المؤشرات المستقلة (ADSL / Fixed / WE Pay).\n`;
            } else {
                t += `• المتبقي **${data.remaining}** خط، والمطلوب **${data.requiredDaily}** يومياً` +
                    (data.deficit > 0 ? `، وعليك عجز **${data.deficit}** يُعوَّض اليوم (المطلوب اليوم **${data.todayRequired}**).\n` : '.\n');
            }
            if (lag.length && lag[0].remaining > 0) {
                const w = lag[0];
                t += `\n⚠️ **أضعف منتج:** ${ITEM_LABELS[w.key]} (${w.pct}%) — متبقي ${w.remaining}.\n💡 ${ITEM_TIPS[w.key]}\n`;
                const best = lag[lag.length - 1];
                if (best.key !== w.key) t += `✅ **أقوى منتج:** ${ITEM_LABELS[best.key]} (${best.pct}%).\n`;
            }
            if (independentLag.length) t += `\n📌 مؤشرات مستقلة متأخرة: ${independentLag.join('، ')}.\n`;
            return t;
        },

        /** Renders a small Q&A box into #containerId. getContext() -> { metrics, profile } */
        mountChat: function (containerId, getContext) {
            const root = document.getElementById(containerId);
            if (!root || root.dataset.mounted) return;
            root.dataset.mounted = '1';
            root.innerHTML = `
                <div class="ai-chat-log" style="display:flex;flex-direction:column;gap:8px;margin-top:12px;"></div>
                <div style="display:flex;gap:8px;margin-top:12px;">
                    <input type="text" class="form-input" maxlength="500" placeholder="اسأل المدرب: ليه متأخر؟ أركز على إيه النهاردة؟" style="flex:1;">
                    <button class="btn btn-sm btn-primary" type="button"><i class="fa-solid fa-paper-plane"></i></button>
                </div>`;
            const log = root.querySelector('.ai-chat-log');
            const input = root.querySelector('input');
            const btn = root.querySelector('button');
            const history = [];
            const fmt = (s) => (global.Utils && Utils.formatMarkdown) ? Utils.formatMarkdown(s)
                : String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>');
            const bubble = (html, mine) => {
                const d = document.createElement('div');
                d.style.cssText = 'padding:8px 12px;border-radius:10px;max-width:92%;' +
                    (mine ? 'align-self:flex-start;background:rgba(120,80,200,.15);' : 'align-self:flex-end;background:rgba(0,0,0,.06);');
                d.innerHTML = html;
                log.appendChild(d);
                d.scrollIntoView({ block: 'nearest' });
                return d;
            };
            const send = async () => {
                const q = input.value.trim();
                if (!q || btn.disabled) return;
                const ctx = getContext();
                input.value = '';
                bubble(fmt(q), true);
                const wait = bubble('...', false);
                btn.disabled = true;
                try {
                    const a = await WEAiCoach.ask(q, ctx.metrics, ctx.profile, history);
                    history.push({ role: 'user', text: q }, { role: 'model', text: a });
                    wait.innerHTML = fmt(a);
                } catch (e) {
                    wait.textContent = e.message;
                } finally { btn.disabled = false; }
            };
            btn.addEventListener('click', send);
            input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
        }
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = WEAiCoach;
    global.WEAiCoach = WEAiCoach;
})(typeof window !== 'undefined' ? window : this);
