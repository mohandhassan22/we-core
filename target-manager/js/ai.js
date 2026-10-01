/**
 * WE-Core Target Manager - WE AI Coach (Gemini Integration & Caching)
 */

(function (global) {
    const WEAiCoach = {
        /**
         * Fetches or generates AI Coach Analysis
         * @param {Object} metrics - TargetCalculator metrics object
         * @param {Object} userProfile - User profile object
         * @param {string} periodId - Current period ID
         * @param {boolean} forceRefresh - If true, bypasses cache
         */
        getAnalysis: async function (metrics, userProfile, periodId, forceRefresh = false) {
            if (!metrics || !userProfile) return 'لا تتوفر بيانات كافية للتحليل.';

            // 1. Check cache if not force refresh
            if (!forceRefresh && periodId) {
                try {
                    const cached = await TargetAPI.fetchAiAnalysisCache(userProfile.id, periodId);
                    if (cached && cached.response) {
                        return cached.response;
                    }
                } catch (cacheErr) {
                    console.warn('Failed to fetch AI cache:', cacheErr);
                }
            }

            // 2. Prepare payload for Edge Function
            const payload = {
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
                remainingDays: metrics.remainingDays,
                status: metrics.status ? metrics.status.label : 'قيد المتابعة',
                itemBreakdown: metrics.items
            };

            try {
                // Try calling target-ai edge function
                const res = await TargetAPI.callEdgeFunction('target-ai', payload);
                const analysisText = res.analysis || res.text || res.message;

                if (analysisText && periodId) {
                    await TargetAPI.saveAiAnalysisCache(userProfile.id, periodId, userProfile.role, payload, analysisText);
                }
                return analysisText || this.generateFallbackAnalysis(payload);
            } catch (err) {
                console.warn('Edge Function AI call failed, generating local smart insight:', err);
                const fallbackText = this.generateFallbackAnalysis(payload);
                return fallbackText;
            }
        },

        /**
         * Rule-based fallback insight engine (used if Edge Function is offline or during offline testing)
         */
        generateFallbackAnalysis: function (data) {
            const pct = data.achievementPct;
            const remaining = data.remaining;
            const requiredDaily = data.requiredDaily;
            const name = data.userName;
            const status = data.status;

            let text = `🎯 **تحليل أداء WE AI Coach لـ ${name}:**\n\n`;

            if (pct >= 100) {
                text += `🎉 ممتاز جداً! لقد حققت الهدف بالكامل بنسبة **${pct}%**.\n`;
                text += `💡 **نصيحة للمبيعات:** أنصحك بالتركيز الآن على المنتجات المكملة (Cross-Selling) مثل WE Pay لتفعيل المحافظ للعملاء الحاليين، وكذلك تحفيز المبيعات لخطوط الفاتورة (Fixed) لتعظيم عمولتك واستحقاقاتك الإضافية.\n`;
            } else if (pct >= 80) {
                text += `📈 أداؤك جيد جداً وأنت على وشك تحقيق الهدف. المتبقي لك هو **${remaining} خطوط** فقط. معدلك اليومي المطلوب للإنهاء هو **${requiredDaily} خطوط/يومياً**.\n`;
                text += `💡 **نصيحة للمبيعات:** حاول توفير خطوط Data مع كل خط موبايل جديد كباقة متكاملة، وهذا سيزيد من أرقامك بشكل مضاعف.\n`;
            } else if (pct >= 50) {
                text += `⚠️ أداؤك حالياً **${pct}%**. يوجد عجز متراكم قدره **${data.deficit} خطوط**.\n`;
                text += `💡 **نصيحة للمبيعات لتعويض العجز:** استهدف عملاء باقات Super Kix و Tazbeet حيث يسهل تسويقها للشباب، واعرض دائماً على عملاء التجديد إمكانية الحصول على خط جديد بعروض مميزة للإنترنت.\n`;
            } else {
                text += `🚨 تنبيه أداء: نسبة الإنجاز الحالية **${pct}%** ومتأخرة عن المستهدف. المطلوب منك اليوم **${data.todayRequired} خطوط** للعودة للمسار الصحيح.\n`;
                text += `💡 **نصيحة للمبيعات:** ركز مجهودك اليوم على منتجات الـ PT12 و Super Kix ذات القيمة العالية، وتواصل مع عملاء الإنترنت المنزلي لترشيح خطوط الموبايل كعرض مكمل.\n`;
            }

            return text;
        }
    };

    global.WEAiCoach = WEAiCoach;
})(typeof window !== 'undefined' ? window : this);
