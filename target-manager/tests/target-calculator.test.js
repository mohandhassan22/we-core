// Run:  node --test target-manager/tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/target-calculator.js');

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('Total Lines = PT12 + Super Kix + Tazbeet + Data (ADSL/Fixed/WE Pay excluded)', () => {
  const t = { pt12: 30, super_kix: 15, tazbeet: 10, data: 5, adsl: 99, fixed: 99, we_pay: 99 };
  assert.equal(C.calculateTotalLinesTarget(t), 60);
  assert.equal(C.calculateTotalLinesAchieve({ pt12: 20, super_kix: 8, tazbeet: 5, data: 2, adsl: 50 }), 35);
});

test('targets accept DB rows and Arabic-site item spellings', () => {
  const rows = [
    { item: 'PT12', target_value: 30 }, { item: 'Super Kix', target_value: 15 },
    { item: 'New Control Tazbeet', target_value: 10 }, { item: 'Data', target_value: 5 },
    { item: 'WE Pay', target_value: 7 }
  ];
  const n = C.normalizeTargets(rows);
  assert.equal(n.tazbeet, 10);
  assert.equal(n.we_pay, 7);
  assert.equal(C.calculateTotalLinesTarget(rows), 60);
});

test('Achievement % (35 / 60 = 58.3%) and zero-target safety', () => {
  assert.equal(C.round(C.calculateAchievementPercentage(35, 60), 1), 58.3);
  assert.equal(C.calculateAchievementPercentage(10, 0), 0);
  assert.equal(C.calculateItemPercentage(5, 0), 0);
});

test('Projection: target 60, 20 days, elapsed 10, achieve 25 -> 50', () => {
  assert.equal(C.calculateProjection(25, 10, 20), 50);
  assert.equal(C.calculateProjection(25, 0, 20), 0);
  assert.equal(C.calculateItemProjection(5, 10, 20), 10);
});

test('Remaining never negative', () => {
  assert.equal(C.calculateRemaining(60, 35), 25);
  assert.equal(C.calculateRemaining(60, 80), 0);
});

test('Base daily target: 60 / 20 = 3', () => {
  assert.equal(C.calculateDailyTarget(60, 20), 3);
  assert.equal(C.calculateDailyTarget(60, 0), 0);
});

test('Deficit carry-over: 3 -> 2 achieved -> next day 4 -> 4 achieved -> back to 3', () => {
  const d1 = C.calculateDeficit([2], 3);
  assert.equal(d1.deficit, 1);
  assert.equal(C.calculateTodayRequired(3, d1.deficit, 50), 4);

  const d2 = C.calculateDeficit([2, 4], 3);
  assert.equal(d2.deficit, 0);
  assert.equal(C.calculateTodayRequired(3, d2.deficit, 50), 3);
  assert.equal(d2.history[1].required, 4);
});

test('Surplus never creates negative deficit or reduces later days', () => {
  assert.equal(C.calculateDeficit([2, 6], 3).deficit, 0);
  assert.equal(C.calculateDeficit([9, 0], 3).deficit, 3);
});

test("Today's Required is capped by Remaining", () => {
  assert.equal(C.calculateTodayRequired(3, 5, 4), 4);
  assert.equal(C.calculateTodayRequired(3, 0, 0), 0);
  assert.equal(C.calculateTodayRequired(2.5, 0, 50, { roundUp: true }), 3);
});

test('Required Daily = Remaining / Remaining Days', () => {
  assert.equal(C.calculateRequiredDaily(25, 10), 2.5);
  assert.equal(C.calculateRequiredDaily(25, 0), 25);
  assert.equal(C.calculateRequiredDaily(-5, 3), 0);
});

test('Elapsed days: counts from start, skips off days, caps at target days', () => {
  assert.equal(C.calculateElapsedDays('2026-10-01', '2026-10-10', 20), 10);
  assert.equal(C.calculateElapsedDays('2026-10-01', '2026-10-10', 20, ['2026-10-02', '2026-10-09']), 8);
  assert.equal(C.calculateElapsedDays('2026-10-01', '2026-12-31', 20), 20);
  assert.equal(C.calculateElapsedDays('2026-10-05', '2026-10-01', 20), 0);
  assert.equal(C.calculateRemainingDays(8, 20), 12);
});

test('Status is rule based', () => {
  const S = C.STATUS;
  assert.equal(C.calculateStatus(60, 60, 60, 20), S.ACHIEVED);
  assert.equal(C.calculateStatus(60, 30, 62, 10), S.ON_TRACK);
  assert.equal(C.calculateStatus(60, 30, 53, 10), S.NEEDS_ATTENTION);
  assert.equal(C.calculateStatus(60, 20, 40, 10), S.BEHIND);
  assert.equal(C.calculateStatus(0, 0, 0, 5), S.NO_TARGET);
  assert.equal(C.calculateStatus(60, 0, 0, 0), S.NOT_STARTED);
});

function buildRows(values, startDay = 1) {
  return values.map((v, i) => ({
    performance_date: `2026-10-${String(startDay + i).padStart(2, '0')}`,
    pt12: v, super_kix: 0, tazbeet: 0, data: 0, adsl: 1, fixed: 0, we_pay: 0
  }));
}

test('Full summary (agent): day 10 of 20, 25 lines', () => {
  const s = C.calculateSummary({
    targets: { pt12: 30, super_kix: 15, tazbeet: 10, data: 5, adsl: 10, fixed: 4, we_pay: 6 },
    dailyRows: buildRows([2, 3, 2, 3, 2, 3, 2, 3, 2, 3]),
    period: { start_date: '2026-10-01', end_date: '2026-10-20', target_days: 20 },
    today: '2026-10-10'
  });
  assert.equal(s.elapsedDays, 10);
  assert.equal(s.remainingDays, 10);
  assert.equal(s.lines.target, 60);
  assert.equal(s.lines.achieve, 25);
  assert.equal(s.lines.projection, 50);
  assert.equal(s.lines.remaining, 35);
  assert.equal(s.lines.baseDaily, 3);
  // deficit over days 1..9 (required grows by the unmet amount each day)
  assert.equal(s.lines.deficit, 5);
  assert.equal(s.lines.todayRequired, 8);
  near(s.lines.requiredDaily, 3.5);
  assert.equal(s.lines.status, C.STATUS.BEHIND);
  // independent KPIs not part of Total Lines
  assert.equal(s.items.adsl.achieve, 10);
  assert.equal(s.items.adsl.target, 10);
  assert.equal(s.items.adsl.status, C.STATUS.ACHIEVED);
  assert.equal(s.items.pt12.achieve, 25);
});

test('Summary: missing day counts as zero, rows outside the period are ignored', () => {
  const rows = buildRows([3, 3]).concat([
    { performance_date: '2026-09-30', pt12: 99 },
    { performance_date: '2026-10-25', pt12: 99 }
  ]);
  const s = C.calculateSummary({
    targets: { pt12: 60 }, dailyRows: rows,
    period: { start_date: '2026-10-01', end_date: '2026-10-20', target_days: 20 },
    today: '2026-10-04'
  });
  assert.equal(s.lines.achieve, 6);
  assert.equal(s.elapsedDays, 4);
  // days 1-2: 3 each (deficit 0); day 3 missing: deficit 3; today (day 4) = 3 + 3
  assert.equal(s.lines.deficit, 3);
  assert.equal(s.lines.todayRequired, 6);
});

test('Summary: period finished or not started', () => {
  const finished = C.calculateSummary({
    targets: { pt12: 20 }, dailyRows: buildRows([1, 1]),
    period: { start_date: '2026-10-01', end_date: '2026-10-05', target_days: 5 },
    today: '2026-11-01'
  });
  assert.equal(finished.elapsedDays, 5);
  assert.equal(finished.lines.todayRequired, 0);

  const notStarted = C.calculateSummary({
    targets: { pt12: 20 }, dailyRows: [],
    period: { start_date: '2026-10-10', end_date: '2026-10-20', target_days: 10 },
    today: '2026-10-03'
  });
  assert.equal(notStarted.elapsedDays, 0);
  assert.equal(notStarted.lines.projection, 0);
  assert.equal(notStarted.lines.status, C.STATUS.NOT_STARTED);
});

test('Branch / area roll-up recomputes % and status from totals', () => {
  const period = { start_date: '2026-10-01', end_date: '2026-10-20', target_days: 20 };
  const a = C.calculateSummary({ targets: { pt12: 60 }, dailyRows: buildRows([4, 4, 4, 4, 4, 4, 4, 4, 4, 4]), period, today: '2026-10-10' });
  const b = C.calculateSummary({ targets: { pt12: 40 }, dailyRows: buildRows([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]), period, today: '2026-10-10' });
  const agg = C.aggregateSummaries([a, b]);
  assert.equal(agg.employees, 2);
  assert.equal(agg.lines.target, 100);
  assert.equal(agg.lines.achieve, 50);
  assert.equal(agg.lines.percentage, 50);
  assert.equal(agg.lines.projection, a.lines.projection + b.lines.projection);
  assert.equal(agg.lines.remaining, 50);
  assert.equal(agg.lines.todayRequired, a.lines.todayRequired + b.lines.todayRequired);
});

test('Distributing a branch total never loses or adds lines', () => {
  assert.deepEqual(C.splitTotalAcross(100, 3), [34, 33, 33]);
  assert.deepEqual(C.splitTotalAcross(10, 5), [2, 2, 2, 2, 2]);
  assert.deepEqual(C.splitTotalAcross(2, 4), [1, 1, 0, 0]);
  assert.deepEqual(C.splitTotalAcross(50, 0), []);
  assert.equal(C.splitTotalAcross(97, 7).reduce((a, b) => a + b, 0), 97);
});
