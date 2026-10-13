/** Run: node target-manager/tests/ai.test.js */
const WEAiCoach = require('../js/ai.js');
const TargetCalculator = require('../js/target-calculator.js');

function ok(cond, msg) {
    if (cond) console.log(`✅ PASS: ${msg}`);
    else { console.error(`❌ FAIL: ${msg}`); process.exitCode = 1; }
}
console.log('--- RUNNING AI + STATUS TESTS ---');

const base = { targetLines: 60, achieveLines: 20, elapsedDays: 10, targetDays: 30, deficit: 0,
    itemBreakdown: { pt12: { target: 15, achieve: 12 }, super_kix: { target: 15, achieve: 2 } } };
const h1 = WEAiCoach._dataHash(base);
ok(h1 === WEAiCoach._dataHash(JSON.parse(JSON.stringify(base))), 'hash is stable for identical data');
const changed = JSON.parse(JSON.stringify(base)); changed.itemBreakdown.pt12.achieve = 13;
ok(h1 !== WEAiCoach._dataHash(changed), 'hash changes when new daily numbers are saved (cache invalidation)');

ok(WEAiCoach._isStoredFallback('🎯 **تحليل WE AI Coach (وضع الأوفلاين):** ...'), 'old offline cache rows are detected');
ok(!WEAiCoach._isStoredFallback('تحليل حقيقي من Gemini'), 'real AI rows are kept');

const m = TargetCalculator.calculateMetrics({ pt12: 15, super_kix: 15 }, { pt12: 12, super_kix: 2 }, 30, 10, []);
const txt = WEAiCoach.generateFallbackAnalysis({ userName: 'أحمد', targetLines: m.targetLines, achieveLines: m.achieveLines,
    achievementPct: m.achievementPct, projection: m.projection, remaining: m.remaining, requiredDaily: m.requiredDaily,
    deficit: m.deficit, todayRequired: m.todayRequired, itemBreakdown: m.items });
ok(txt.includes('Super Kix'), 'fallback names the weakest product, not generic advice');
ok(WEAiCoach.generateFallbackAnalysis({ userName: 'x', targetLines: 0 }).includes('لا يوجد تارجت'), 'fallback handles no target');

ok(TargetCalculator.calculateStatus(0, 0, 0).code === 'NO_TARGET', 'zero target is NO_TARGET, not ON_TRACK');
console.log('--- DONE ---');
