/* WE Target Manager - target-calculator.js
 * ALL business calculations live here. Pages must not re-implement them.
 * Works as a plain <script> (window.TargetCalculator) and in Node (require) for tests.
 *
 * Conventions
 *  - elapsedDays counts target days from the period start up to and INCLUDING today.
 *  - remainingDays = targetDays - elapsedDays (days after today).
 *  - Deficit is computed over the days BEFORE today; surplus never reduces a later day.
 *  - Total Lines = pt12 + super_kix + tazbeet + data. adsl / fixed / we_pay are independent KPIs.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TargetCalculator = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LINE_ITEMS = ['pt12', 'super_kix', 'tazbeet', 'data'];
  var OTHER_ITEMS = ['adsl', 'fixed', 'we_pay'];
  var ALL_ITEMS = LINE_ITEMS.concat(OTHER_ITEMS);

  var STATUS = {
    NOT_STARTED: 'not_started',
    NO_TARGET: 'no_target',
    ACHIEVED: 'achieved',
    ON_TRACK: 'on_track',
    NEEDS_ATTENTION: 'needs_attention',
    BEHIND: 'behind'
  };
  // projection / target ratio thresholds for status (tunable in one place)
  var THRESHOLDS = { onTrack: 1.0, needsAttention: 0.85 };

  var MS_DAY = 86400000;
  var ALIASES = {
    pt12: 'pt12', pt_12: 'pt12',
    super_kix: 'super_kix', superkix: 'super_kix',
    tazbeet: 'tazbeet', new_control_tazbeet: 'tazbeet', new_control: 'tazbeet',
    data: 'data',
    adsl: 'adsl',
    fixed: 'fixed',
    we_pay: 'we_pay', wepay: 'we_pay'
  };

  /* ---------- helpers ---------- */
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function round(v, digits) { var p = Math.pow(10, digits == null ? 1 : digits); return Math.round(num(v) * p) / p; }

  function normalizeItemKey(name) {
    var k = String(name == null ? '' : name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return ALIASES[k] || k;
  }

  // Accepts {pt12: 30, ...} or [{item:'PT12', target_value: 30}, ...] -> {pt12: 30, ...}
  function normalizeTargets(targets) {
    var out = {}, i, key;
    ALL_ITEMS.forEach(function (k) { out[k] = 0; });
    if (Array.isArray(targets)) {
      for (i = 0; i < targets.length; i++) {
        key = normalizeItemKey(targets[i].item);
        if (key in out) out[key] += num(targets[i].target_value != null ? targets[i].target_value : targets[i].target);
      }
    } else if (targets && typeof targets === 'object') {
      Object.keys(targets).forEach(function (k) {
        key = normalizeItemKey(k);
        if (key in out) out[key] += num(targets[k]);
      });
    }
    return out;
  }

  // Sum daily_performance rows per item
  function sumPerformance(rows) {
    var out = {};
    ALL_ITEMS.forEach(function (k) { out[k] = 0; });
    (rows || []).forEach(function (r) { ALL_ITEMS.forEach(function (k) { out[k] += num(r[k]); }); });
    return out;
  }

  function parseDay(d) {
    if (d instanceof Date) return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
    if (!m) throw new Error('Invalid date: ' + d);
    return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  }
  function fmtDay(ms) { return new Date(ms).toISOString().slice(0, 10); }

  /* ---------- core formulas ---------- */
  function sumLines(obj) {
    var o = normalizeTargets(obj), t = 0;
    LINE_ITEMS.forEach(function (k) { t += o[k]; });
    return t;
  }
  function calculateTotalLinesTarget(targets) { return sumLines(targets); }
  function calculateTotalLinesAchieve(achieve) { return sumLines(achieve); }

  function calculateAchievementPercentage(achieve, target) {
    var t = num(target);
    return t > 0 ? (num(achieve) / t) * 100 : 0;
  }
  function calculateItemPercentage(achieve, target) { return calculateAchievementPercentage(achieve, target); }

  function calculateRemaining(target, achieve) { return Math.max(num(target) - num(achieve), 0); }

  function calculateProjection(achieve, elapsedDays, targetDays) {
    var e = num(elapsedDays);
    if (e <= 0) return 0;
    return (num(achieve) / e) * num(targetDays);
  }
  function calculateItemProjection(achieve, elapsedDays, targetDays) { return calculateProjection(achieve, elapsedDays, targetDays); }

  function calculateDailyTarget(target, targetDays) {
    var d = num(targetDays);
    return d > 0 ? num(target) / d : 0;
  }

  // dailyAchieves: achieved Total Lines for each target day BEFORE today, in order.
  // required(day) = base + deficit ; deficit = max(required - achieved, 0)
  function calculateDeficit(dailyAchieves, baseDaily) {
    var deficit = 0, history = [], base = num(baseDaily);
    (dailyAchieves || []).forEach(function (a) {
      var required = base + deficit;
      var achieved = num(a);
      deficit = Math.max(required - achieved, 0);
      history.push({ required: required, achieved: achieved, deficit: deficit });
    });
    return { deficit: deficit, history: history };
  }

  // Base daily + active deficit, never above what is left of the target.
  function calculateTodayRequired(baseDaily, deficit, remaining, opts) {
    var v = Math.min(num(baseDaily) + num(deficit), Math.max(num(remaining), 0));
    return opts && opts.roundUp ? Math.ceil(v - 1e-9) : v;
  }

  function calculateRequiredDaily(remaining, remainingDays) {
    var r = Math.max(num(remaining), 0), d = num(remainingDays);
    return d > 0 ? r / d : r;
  }

  /* ---------- period helpers ---------- */
  // ISO dates of the target days from start up to `until`, skipping offDays, capped at targetDays.
  function listTargetDays(startDate, untilDate, targetDays, offDays) {
    var s = parseDay(startDate), u = parseDay(untilDate), out = [];
    var off = {};
    (offDays || []).forEach(function (d) { off[fmtDay(parseDay(d))] = true; });
    for (var t = s; t <= u && out.length < num(targetDays); t += MS_DAY) {
      var key = fmtDay(t);
      if (!off[key]) out.push(key);
    }
    return out;
  }
  function calculateElapsedDays(startDate, today, targetDays, offDays) {
    return listTargetDays(startDate, today, targetDays, offDays).length;
  }
  function calculateRemainingDays(elapsedDays, targetDays) { return Math.max(num(targetDays) - num(elapsedDays), 0); }

  /* ---------- status (rule based, never AI) ---------- */
  function calculateStatus(target, achieve, projection, elapsedDays) {
    if (num(target) <= 0) return STATUS.NO_TARGET;
    if (num(achieve) >= num(target)) return STATUS.ACHIEVED;
    if (elapsedDays != null && num(elapsedDays) <= 0) return STATUS.NOT_STARTED;
    var ratio = num(projection) / num(target);
    if (ratio >= THRESHOLDS.onTrack) return STATUS.ON_TRACK;
    if (ratio >= THRESHOLDS.needsAttention) return STATUS.NEEDS_ATTENTION;
    return STATUS.BEHIND;
  }

  /* ---------- full summary for one person / one period ---------- */
  // period: {start_date, end_date, target_days}; dailyRows: daily_performance rows; today: 'YYYY-MM-DD'
  function calculateSummary(input) {
    var period = input.period, targetDays = num(period.target_days);
    var targets = normalizeTargets(input.targets);
    var todayStr = fmtDay(parseDay(input.today));
    var endStr = period.end_date ? fmtDay(parseDay(period.end_date)) : todayStr;
    var startStr = fmtDay(parseDay(period.start_date));
    var until = todayStr < endStr ? todayStr : endStr;

    var days = listTargetDays(startStr, until, targetDays, input.offDays);
    var elapsed = days.length;
    var todayInPeriod = elapsed > 0 && days[elapsed - 1] === todayStr;
    var previousDays = todayInPeriod ? days.slice(0, -1) : days;

    var rows = (input.dailyRows || []).filter(function (r) {
      var d = fmtDay(parseDay(r.performance_date));
      return d >= startStr && d <= endStr;
    });
    var achieve = sumPerformance(rows);

    var linesByDate = {};
    rows.forEach(function (r) {
      var d = fmtDay(parseDay(r.performance_date));
      linesByDate[d] = (linesByDate[d] || 0) + sumLines(r);
    });

    var linesTarget = calculateTotalLinesTarget(targets);
    var linesAchieve = calculateTotalLinesAchieve(achieve);
    var baseDaily = calculateDailyTarget(linesTarget, targetDays);
    var deficit = calculateDeficit(previousDays.map(function (d) { return linesByDate[d] || 0; }), baseDaily).deficit;
    var remaining = calculateRemaining(linesTarget, linesAchieve);
    var remainingDays = calculateRemainingDays(elapsed, targetDays);
    var projection = calculateProjection(linesAchieve, elapsed, targetDays);

    var items = {};
    ALL_ITEMS.forEach(function (k) {
      var proj = calculateItemProjection(achieve[k], elapsed, targetDays);
      items[k] = {
        target: targets[k],
        achieve: achieve[k],
        remaining: calculateRemaining(targets[k], achieve[k]),
        percentage: calculateItemPercentage(achieve[k], targets[k]),
        projection: proj,
        status: calculateStatus(targets[k], achieve[k], proj, elapsed)
      };
    });

    return {
      elapsedDays: elapsed,
      remainingDays: remainingDays,
      targetDays: targetDays,
      lines: {
        target: linesTarget,
        achieve: linesAchieve,
        percentage: calculateAchievementPercentage(linesAchieve, linesTarget),
        projection: projection,
        remaining: remaining,
        baseDaily: baseDaily,
        deficit: deficit,
        todayRequired: todayInPeriod ? calculateTodayRequired(baseDaily, deficit, remaining) : 0,
        requiredDaily: calculateRequiredDaily(remaining, remainingDays),
        status: calculateStatus(linesTarget, linesAchieve, projection, elapsed)
      },
      items: items
    };
  }

  /* ---------- manager roll-up (branch / area totals) ---------- */
  // Sums already-computed summaries; percentages and status are recomputed from the totals.
  function aggregateSummaries(summaries) {
    var list = summaries || [];
    var elapsed = list.length ? list[0].elapsedDays : 0;
    var targetDays = list.length ? list[0].targetDays : 0;
    function roll(pick) {
      var t = 0, a = 0, p = 0, r = 0;
      list.forEach(function (s) { var x = pick(s); t += x.target; a += x.achieve; p += x.projection; r += x.remaining; });
      return {
        target: t, achieve: a, projection: p, remaining: r,
        percentage: calculateAchievementPercentage(a, t),
        status: calculateStatus(t, a, p, elapsed)
      };
    }
    var lines = roll(function (s) { return s.lines; });
    var todayRequired = 0;
    list.forEach(function (s) { todayRequired += s.lines.todayRequired; });
    lines.todayRequired = todayRequired;
    lines.requiredDaily = calculateRequiredDaily(lines.remaining, list.length ? list[0].remainingDays : 0);

    var items = {};
    ALL_ITEMS.forEach(function (k) { items[k] = roll(function (s) { return s.items[k]; }); });
    return { employees: list.length, elapsedDays: elapsed, targetDays: targetDays, lines: lines, items: items };
  }

  /* ---------- distribute a branch total across employees ---------- */
  // 100 over 3 employees -> [34, 33, 33] (remainder goes to the first ones, nothing is lost)
  function splitTotalAcross(total, count) {
    var n = Math.floor(num(count)), t = Math.max(Math.floor(num(total)), 0), out = [], i;
    if (n <= 0) return out;
    var base = Math.floor(t / n), rem = t - base * n;
    for (i = 0; i < n; i++) out.push(base + (i < rem ? 1 : 0));
    return out;
  }

  return {
    LINE_ITEMS: LINE_ITEMS, OTHER_ITEMS: OTHER_ITEMS, ALL_ITEMS: ALL_ITEMS,
    STATUS: STATUS, THRESHOLDS: THRESHOLDS,
    normalizeItemKey: normalizeItemKey, normalizeTargets: normalizeTargets, sumPerformance: sumPerformance,
    calculateTotalLinesTarget: calculateTotalLinesTarget,
    calculateTotalLinesAchieve: calculateTotalLinesAchieve,
    calculateAchievementPercentage: calculateAchievementPercentage,
    calculateProjection: calculateProjection,
    calculateRemaining: calculateRemaining,
    calculateDailyTarget: calculateDailyTarget,
    calculateDeficit: calculateDeficit,
    calculateTodayRequired: calculateTodayRequired,
    calculateRequiredDaily: calculateRequiredDaily,
    calculateItemPercentage: calculateItemPercentage,
    calculateItemProjection: calculateItemProjection,
    calculateElapsedDays: calculateElapsedDays,
    calculateRemainingDays: calculateRemainingDays,
    listTargetDays: listTargetDays,
    calculateStatus: calculateStatus,
    calculateSummary: calculateSummary,
    aggregateSummaries: aggregateSummaries,
    splitTotalAcross: splitTotalAcross,
    round: round
  };
});
