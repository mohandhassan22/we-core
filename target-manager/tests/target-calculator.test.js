/**
 * WE-Core Target Manager - Unit Tests
 * Run using Node.js: node target-manager/tests/target-calculator.test.js
 */

const TargetCalculator = require('../js/target-calculator.js');

function assertEqual(actual, expected, message) {
    if (actual === expected) {
        console.log(`✅ PASS: ${message}`);
    } else {
        console.error(`❌ FAIL: ${message} -> Expected ${expected}, got ${actual}`);
        process.exitCode = 1;
    }
}

console.log('--- RUNNING TARGET CALCULATOR TESTS ---');

// 1. Total Lines Target
const itemTargets = {
    pt12: 15,
    super_kix: 15,
    tazbeet: 15,
    data: 15,
    adsl: 10,  // Should not count
    fixed: 10, // Should not count
    we_pay: 10 // Should not count
};
assertEqual(TargetCalculator.calculateTotalLinesTarget(itemTargets), 60, "Total Lines Target Calculation");

// 2. Total Lines Achieve
const itemAchieves = {
    pt12: 10,
    super_kix: 10,
    tazbeet: 8,
    data: 7,
    adsl: 10,  // Should not count
    fixed: 5,  // Should not count
    we_pay: 5  // Should not count
};
assertEqual(TargetCalculator.calculateTotalLinesAchieve(itemAchieves), 35, "Total Lines Achieve Calculation");

// 3. Achievement Percentage
assertEqual(TargetCalculator.calculateAchievementPercentage(35, 60), 58.3, "Achievement Percentage Calculation (35/60 -> 58.3%)");

// 4. Remaining Target
assertEqual(TargetCalculator.calculateRemaining(60, 35), 25, "Remaining Target Calculation (60 - 35 = 25)");

// 5. Projection: (Achieve / Elapsed) * Target Days -> (25 / 10) * 20 = 50
assertEqual(TargetCalculator.calculateProjection(35, 10, 20), 70, "Projection Calculation (35 / 10 * 20 = 70)");
assertEqual(TargetCalculator.calculateProjection(25, 10, 20), 50, "Projection Calculation (25 / 10 * 20 = 50)");

// 6. Base Daily Target: 60 / 20 = 3
assertEqual(TargetCalculator.calculateDailyTarget(60, 20), 3, "Base Daily Target (60 / 20 = 3)");

// 7. Deficit Calculation:
// Day 1: required = 3, achieve = 2 -> diff = 1
const dailyLogs = [{ required: 3, achieve: 2 }];
assertEqual(TargetCalculator.calculateDeficit(dailyLogs, 3), 1, "Deficit Calculation (Day 1 deficit = 1)");

// 8. Today's Required: Base Daily (3) + Deficit (1) = 4
assertEqual(TargetCalculator.calculateTodayRequired(3, 1, 25), 4, "Today's Required (3 + 1 = 4)");

// 9. Required Daily: Remaining (25) / Remaining Days (10) = 2.5
assertEqual(TargetCalculator.calculateRequiredDaily(25, 10), 2.5, "Required Daily (25 / 10 = 2.5)");

// 10. Status check
const statusNeedsAttention = TargetCalculator.calculateStatus(58.3, 50, 60);
assertEqual(statusNeedsAttention.code, 'NEEDS_ATTENTION', "Status determination (50 projection vs 60 target -> NEEDS_ATTENTION)");

const statusBehind = TargetCalculator.calculateStatus(33.3, 40, 60);
assertEqual(statusBehind.code, 'BEHIND', "Status determination (40 projection vs 60 target -> BEHIND)");

const statusAchieved = TargetCalculator.calculateStatus(100, 60, 60);
assertEqual(statusAchieved.code, 'ACHIEVED', "Status determination (100% achieve -> ACHIEVED)");

// 11. Branch Target Distribution
const branchTotalTargets = {
    pt12: 150,
    super_kix: 150,
    tazbeet: 150,
    data: 150,
    adsl: 50,
    fixed: 50,
    we_pay: 100
};
const distribution = TargetCalculator.calculateEmployeeTargetsFromBranchTotal(branchTotalTargets, 10);
assertEqual(distribution.perEmployeeTarget.pt12, 15, "Branch Target Distribution per employee PT12 (150 / 10 = 15)");
assertEqual(distribution.perEmployeeTotalLines, 60, "Branch Target Distribution per employee Total Lines (600 / 10 = 60)");

console.log('--- ALL CALCULATOR TESTS PASSED ---');
