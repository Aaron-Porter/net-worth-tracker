/**
 * Comprehensive Financial Calculations Test Suite
 *
 * Tests every calculation in the system with exact numerical verification.
 * This is the most critical test file — it validates all numbers and projections
 * that users depend on for financial planning decisions.
 *
 * Coverage:
 * - Per-bucket asset allocation & weighted rates
 * - Runway calculations
 * - Dollar multiplier (compound growth power)
 * - Coast FI percentage
 * - Projected retirement income (real & nominal)
 * - Inverse retirement income (net worth needed)
 * - Retirement income info (comprehensive)
 * - Runway & coast info
 * - Level info system
 * - Coast FI year finder
 * - Projection generation (yearly)
 * - Monthly projection generation
 * - Projections with monthly spending
 * - Master calculation (calculateAllFinancials)
 * - Settings merge
 * - Federal tax brackets (2025)
 * - State tax calculations (no-tax, flat, progressive, CA HSA)
 * - FICA tax (Social Security + Medicare + Additional Medicare)
 * - Complete tax pipeline (calculateTaxes)
 * - Scenario income breakdown
 * - Legacy income breakdown
 * - Year projection with taxes
 * - Dynamic multi-year projections
 * - Formatting utilities
 * - Cross-calculation consistency & mathematical identities
 */

import { describe, it, expect } from 'vitest';
import {
  // Per-bucket allocation
  getEntryAllocation,
  getPerBucketRates,
  getWeightedAverageRate,
  DEFAULT_BUCKET_RATES,

  // Core calculations
  calculateRunwayYears,
  calculateDollarMultiplier,
  calculateCoastFiPercent,
  calculateProjectedRetirementIncome,
  calculateProjectedRetirementIncomeNominal,
  calculateNetWorthForRetirementIncome,
  calculateRetirementIncomeInfo,
  calculateRunwayAndCoastInfo,
  calculateLevelInfo,
  calculateLevelBasedSpending,
  calculateUnlockedSpending,
  findCoastFiYear,
  adjustForInflation,
  calculateFiTarget,
  calculateSwrAmounts,
  calculateFutureValue,
  calculateGrowthRates,
  calculateRealTimeNetWorth,
  calculateAge,

  // Projections
  generateProjections,
  generateMonthlyProjections,
  generateProjectionsWithMonthlySpending,
  calculateAllFinancials,

  // Settings
  mergeWithDefaults,
  DEFAULT_SETTINGS,
  LEVEL_THRESHOLDS,
  CONTRIBUTION_LIMITS,

  // Tax calculations
  calculateFederalTax,
  calculateStateTax,
  calculateFICATax,
  calculateTaxes,
  calculateScenarioIncome,
  calculateIncomeBreakdown,
  STATE_TAX_INFO,

  // Dynamic projections
  calculateYearProjection,
  generateDynamicProjections,

  // Formatting
  formatCurrency,
  formatPercent,
  formatDate,
  getTimeSinceEntry,
  getFiMilestonesSummary,
  calculateFiMilestones,
  FI_MILESTONE_DEFINITIONS,

  // Types
  UserSettings,
  NetWorthEntry,
  AssetAllocation,
  PerBucketRates,
  PreTaxContributions,
  FilingStatus,
  DynamicIncomeParams,
  DynamicSpendingParams,
} from '../lib/calculations';

// ============================================================================
// SHARED TEST FIXTURES
// ============================================================================

const createSettings = (overrides: Partial<UserSettings> = {}): UserSettings => ({
  currentRate: 7,
  swr: 4,
  yearlyContribution: 20000,
  birthDate: '1990-01-01',
  monthlySpend: 4000,
  inflationRate: 3,
  baseMonthlyBudget: 3000,
  spendingGrowthRate: 2,
  ...overrides,
});

const createEntry = (amount: number, daysAgo: number = 0): NetWorthEntry => ({
  _id: 'test-entry',
  userId: 'test-user',
  amount,
  timestamp: Date.now() - daysAgo * 86400000,
});

const createEntryWithBuckets = (
  overrides: Partial<NetWorthEntry> = {}
): NetWorthEntry => ({
  _id: 'test-entry',
  userId: 'test-user',
  amount: 500000,
  timestamp: Date.now(),
  cash: 50000,
  retirement: 200000,
  hsa: 30000,
  brokerage: 250000,
  debts: 30000,
  ...overrides,
});

const zeroPretax: PreTaxContributions = {
  traditional401k: 0,
  traditionalIRA: 0,
  hsa: 0,
  other: 0,
};

const standardPretax: PreTaxContributions = {
  traditional401k: 23500,
  traditionalIRA: 7000,
  hsa: 4300,
  other: 0,
};

// ============================================================================
// 1. PER-BUCKET ASSET ALLOCATION
// ============================================================================

describe('Per-Bucket Asset Allocation', () => {
  describe('getEntryAllocation', () => {
    it('should extract allocation from entry with all buckets', () => {
      const entry = createEntryWithBuckets();
      const alloc = getEntryAllocation(entry);

      expect(alloc.cash).toBe(50000);
      expect(alloc.retirement).toBe(200000);
      expect(alloc.hsa).toBe(30000);
      expect(alloc.brokerage).toBe(250000);
      expect(alloc.debts).toBe(30000);
    });

    it('should default to 100% brokerage for legacy entries without breakdown', () => {
      const entry = createEntry(500000);
      const alloc = getEntryAllocation(entry);

      expect(alloc.cash).toBe(0);
      expect(alloc.retirement).toBe(0);
      expect(alloc.hsa).toBe(0);
      expect(alloc.brokerage).toBe(500000);
      expect(alloc.debts).toBe(0);
    });

    it('should handle partial bucket data (only cash set)', () => {
      const entry: NetWorthEntry = {
        _id: 'x',
        userId: 'u',
        amount: 100000,
        timestamp: Date.now(),
        cash: 100000,
      };
      const alloc = getEntryAllocation(entry);

      expect(alloc.cash).toBe(100000);
      expect(alloc.retirement).toBe(0);
      expect(alloc.hsa).toBe(0);
      expect(alloc.brokerage).toBe(0);
      expect(alloc.debts).toBe(0);
    });

    it('should handle zero values in buckets (treated as present)', () => {
      const entry: NetWorthEntry = {
        _id: 'x',
        userId: 'u',
        amount: 0,
        timestamp: Date.now(),
        cash: 0,
        retirement: 0,
        hsa: 0,
        brokerage: 0,
        debts: 0,
      };
      const alloc = getEntryAllocation(entry);

      expect(alloc.cash).toBe(0);
      expect(alloc.brokerage).toBe(0);
    });
  });

  describe('getPerBucketRates', () => {
    it('should use default cash rate (4%) and debt rate (7%)', () => {
      const settings = createSettings({ currentRate: 10 });
      const rates = getPerBucketRates(settings);

      expect(rates.cash).toBeCloseTo(0.04, 6);
      expect(rates.debts).toBeCloseTo(0.07, 6);
    });

    it('should use currentRate for investment buckets when no overrides', () => {
      const settings = createSettings({ currentRate: 8 });
      const rates = getPerBucketRates(settings);

      expect(rates.retirement).toBeCloseTo(0.08, 6);
      expect(rates.hsa).toBeCloseTo(0.08, 6);
      expect(rates.brokerage).toBeCloseTo(0.08, 6);
    });

    it('should use per-bucket overrides when specified', () => {
      const settings = createSettings({
        currentRate: 7,
        cashRate: 5,
        retirementRate: 9,
        hsaRate: 6,
        brokerageRate: 8,
        debtRate: 5,
      });
      const rates = getPerBucketRates(settings);

      expect(rates.cash).toBeCloseTo(0.05, 6);
      expect(rates.retirement).toBeCloseTo(0.09, 6);
      expect(rates.hsa).toBeCloseTo(0.06, 6);
      expect(rates.brokerage).toBeCloseTo(0.08, 6);
      expect(rates.debts).toBeCloseTo(0.05, 6);
    });
  });

  describe('getWeightedAverageRate', () => {
    it('should calculate correct weighted rate for uniform allocation', () => {
      const alloc: AssetAllocation = {
        cash: 250000,
        retirement: 250000,
        hsa: 250000,
        brokerage: 250000,
        debts: 0,
      };
      const rates: PerBucketRates = {
        cash: 0.04,
        retirement: 0.07,
        hsa: 0.07,
        brokerage: 0.07,
        debts: 0.07,
      };

      // totalNW = 1,000,000
      // weighted = 250k*0.04 + 250k*0.07 + 250k*0.07 + 250k*0.07 = 10k + 17.5k + 17.5k + 17.5k = 62,500
      // rate = (62500 / 1000000) * 100 = 6.25%
      const result = getWeightedAverageRate(alloc, rates);
      expect(result).toBeCloseTo(6.25, 2);
    });

    it('should return 0 for zero or negative net worth', () => {
      const alloc: AssetAllocation = {
        cash: 0,
        retirement: 0,
        hsa: 0,
        brokerage: 100000,
        debts: 100000,
      };
      const rates: PerBucketRates = {
        cash: 0.04,
        retirement: 0.07,
        hsa: 0.07,
        brokerage: 0.07,
        debts: 0.07,
      };

      const result = getWeightedAverageRate(alloc, rates);
      expect(result).toBe(0);
    });

    it('should account for debt reducing returns', () => {
      const alloc: AssetAllocation = {
        cash: 0,
        retirement: 0,
        hsa: 0,
        brokerage: 200000,
        debts: 100000,
      };
      const rates: PerBucketRates = {
        cash: 0.04,
        retirement: 0.07,
        hsa: 0.07,
        brokerage: 0.10,
        debts: 0.07,
      };

      // totalNW = 200k - 100k = 100k
      // weighted = 200k*0.10 - 100k*0.07 = 20k - 7k = 13k
      // rate = (13k / 100k) * 100 = 13%
      const result = getWeightedAverageRate(alloc, rates);
      expect(result).toBeCloseTo(13, 2);
    });

    it('should handle 100% single asset allocation', () => {
      const alloc: AssetAllocation = {
        cash: 1000000,
        retirement: 0,
        hsa: 0,
        brokerage: 0,
        debts: 0,
      };
      const rates: PerBucketRates = {
        cash: 0.04,
        retirement: 0.07,
        hsa: 0.07,
        brokerage: 0.07,
        debts: 0.07,
      };

      const result = getWeightedAverageRate(alloc, rates);
      expect(result).toBeCloseTo(4, 2);
    });
  });
});

// ============================================================================
// 2. RUNWAY CALCULATIONS
// ============================================================================

describe('Runway Calculations', () => {
  describe('calculateRunwayYears', () => {
    it('should calculate correct runway for standard inputs', () => {
      // $500k NW / ($4k * 12) = $500k / $48k = 10.4167 years
      const result = calculateRunwayYears(500000, 4000);
      expect(result).toBeCloseTo(10.4167, 3);
    });

    it('should return Infinity when no spending', () => {
      const result = calculateRunwayYears(500000, 0);
      expect(result).toBe(Infinity);
    });

    it('should return 0 when net worth is 0', () => {
      const result = calculateRunwayYears(0, 4000);
      expect(result).toBe(0);
    });

    it('should scale linearly with net worth', () => {
      const r1 = calculateRunwayYears(250000, 4000);
      const r2 = calculateRunwayYears(500000, 4000);
      expect(r2).toBeCloseTo(r1 * 2, 4);
    });

    it('should scale inversely with spending', () => {
      const r1 = calculateRunwayYears(500000, 2000);
      const r2 = calculateRunwayYears(500000, 4000);
      expect(r1).toBeCloseTo(r2 * 2, 4);
    });

    it('should handle 6-month emergency fund', () => {
      // $24k NW / ($4k * 12) = 0.5 years
      const result = calculateRunwayYears(24000, 4000);
      expect(result).toBeCloseTo(0.5, 4);
    });
  });
});

// ============================================================================
// 3. DOLLAR MULTIPLIER
// ============================================================================

describe('Dollar Multiplier', () => {
  describe('calculateDollarMultiplier', () => {
    it('should return 1 for 0 years', () => {
      expect(calculateDollarMultiplier(0, 7)).toBe(1);
    });

    it('should return 1 for negative years', () => {
      expect(calculateDollarMultiplier(-5, 7)).toBe(1);
    });

    it('should calculate correct multiplier for 10 years at 7%', () => {
      // (1.07)^10 = 1.96715...
      const result = calculateDollarMultiplier(10, 7);
      expect(result).toBeCloseTo(1.96715, 3);
    });

    it('should calculate correct multiplier for 30 years at 7%', () => {
      // (1.07)^30 = 7.6123...
      const result = calculateDollarMultiplier(30, 7);
      expect(result).toBeCloseTo(7.6123, 2);
    });

    it('should obey the Rule of 72 approximately', () => {
      // At 7%, doubling time ≈ 72/7 ≈ 10.3 years
      const at10 = calculateDollarMultiplier(10, 7);
      const at11 = calculateDollarMultiplier(11, 7);
      // Should be slightly below 2 at 10 years and slightly above at 11
      expect(at10).toBeLessThan(2);
      expect(at11).toBeGreaterThan(2);
    });

    it('should handle 0% return rate', () => {
      expect(calculateDollarMultiplier(30, 0)).toBe(1);
    });
  });
});

// ============================================================================
// 4. COAST FI PERCENTAGE
// ============================================================================

describe('Coast FI Percentage', () => {
  describe('calculateCoastFiPercent', () => {
    it('should return current FI progress when at retirement', () => {
      // Already at retirement (0 years to go)
      // NW = $600k, spend = $4k/mo, swr = 4%
      // FI target = $4k * 12 / 0.04 = $1.2M
      // Progress = ($600k / $1.2M) * 100 = 50%
      const result = calculateCoastFiPercent(600000, 4000, 0, 7, 3, 4);
      expect(result).toBeCloseTo(50, 2);
    });

    it('should exceed 100% when growth outpaces inflation', () => {
      // $500k NW, 30 years, 7% return, 3% inflation, 4% SWR
      // Future NW = 500k * (1.07)^30 = 500k * 7.612 = $3,806,127
      // Future spend = $4k * (1.03)^30 = $4k * 2.4273 = $9,709/mo
      // Future FI target = $9,709 * 12 / 0.04 = $2,912,700
      // Coast % = (3,806,127 / 2,912,700) * 100 ≈ 130.7%
      const result = calculateCoastFiPercent(500000, 4000, 30, 7, 3, 4);
      expect(result).toBeGreaterThan(100);
    });

    it('should return 0 for zero SWR', () => {
      const result = calculateCoastFiPercent(500000, 4000, 30, 7, 3, 0);
      expect(result).toBe(0);
    });

    it('should increase with more years to retirement (compounding)', () => {
      const short = calculateCoastFiPercent(500000, 4000, 10, 7, 3, 4);
      const long = calculateCoastFiPercent(500000, 4000, 30, 7, 3, 4);
      expect(long).toBeGreaterThan(short);
    });

    it('should increase with higher return rate', () => {
      const low = calculateCoastFiPercent(500000, 4000, 20, 5, 3, 4);
      const high = calculateCoastFiPercent(500000, 4000, 20, 10, 3, 4);
      expect(high).toBeGreaterThan(low);
    });
  });
});

// ============================================================================
// 5. PROJECTED RETIREMENT INCOME
// ============================================================================

describe('Projected Retirement Income', () => {
  describe('calculateProjectedRetirementIncome (real/inflation-adjusted)', () => {
    it('should return current SWR when already at retirement', () => {
      // 0 years to go: $500k * 0.04 = $20,000
      const result = calculateProjectedRetirementIncome(500000, 0, 7, 3, 4);
      expect(result).toBe(20000);
    });

    it('should calculate real income correctly for 30 years out', () => {
      // $500k NW, 30 years, 7% return, 3% inflation, 4% SWR
      // Future NW = 500k * (1.07)^30
      // Nominal income = FutureNW * 0.04
      // Inflation mult = (1.03)^30
      // Real income = Nominal / Inflation
      const futureNW = 500000 * Math.pow(1.07, 30);
      const nominalIncome = futureNW * 0.04;
      const inflationMult = Math.pow(1.03, 30);
      const expectedReal = nominalIncome / inflationMult;
      const result = calculateProjectedRetirementIncome(500000, 30, 7, 3, 4);
      expect(result).toBeCloseTo(expectedReal, 0);
    });

    it('should return 0 for zero net worth', () => {
      const result = calculateProjectedRetirementIncome(0, 30, 7, 3, 4);
      expect(result).toBe(0);
    });

    it('should scale linearly with net worth', () => {
      const r1 = calculateProjectedRetirementIncome(250000, 20, 7, 3, 4);
      const r2 = calculateProjectedRetirementIncome(500000, 20, 7, 3, 4);
      expect(r2).toBeCloseTo(r1 * 2, 0);
    });
  });

  describe('calculateProjectedRetirementIncomeNominal', () => {
    it('should return current SWR when already at retirement', () => {
      const result = calculateProjectedRetirementIncomeNominal(500000, 0, 7, 4);
      expect(result).toBe(20000);
    });

    it('should be higher than real income (not inflation adjusted)', () => {
      const real = calculateProjectedRetirementIncome(500000, 30, 7, 3, 4);
      const nominal = calculateProjectedRetirementIncomeNominal(500000, 30, 7, 4);
      expect(nominal).toBeGreaterThan(real);
    });

    it('should calculate nominal income correctly', () => {
      // $500k * (1.07)^30 * 0.04
      const futureNW = 500000 * Math.pow(1.07, 30);
      const expected = futureNW * 0.04;
      const result = calculateProjectedRetirementIncomeNominal(500000, 30, 7, 4);
      expect(result).toBeCloseTo(expected, 0);
    });
  });

  describe('calculateNetWorthForRetirementIncome (inverse)', () => {
    it('should invert calculateProjectedRetirementIncome exactly', () => {
      // If $500k produces income X at retirement, then needing income X should require $500k
      const income = calculateProjectedRetirementIncome(500000, 30, 7, 3, 4);
      const nwNeeded = calculateNetWorthForRetirementIncome(income, 30, 7, 3, 4);
      expect(nwNeeded).toBeCloseTo(500000, 0);
    });

    it('should return direct FI number when at retirement', () => {
      // At retirement, need targetIncome / SWR
      const result = calculateNetWorthForRetirementIncome(50000, 0, 7, 3, 4);
      expect(result).toBeCloseTo(50000 / 0.04, 0);
    });

    it('should require less today for same income with more time', () => {
      const nw10 = calculateNetWorthForRetirementIncome(50000, 10, 7, 3, 4);
      const nw30 = calculateNetWorthForRetirementIncome(50000, 30, 7, 3, 4);
      expect(nw30).toBeLessThan(nw10);
    });

    it('should round-trip with various incomes', () => {
      for (const target of [10000, 50000, 100000, 200000]) {
        const nw = calculateNetWorthForRetirementIncome(target, 25, 7, 3, 4);
        const backToIncome = calculateProjectedRetirementIncome(nw, 25, 7, 3, 4);
        expect(backToIncome).toBeCloseTo(target, 0);
      }
    });
  });

  describe('calculateRetirementIncomeInfo', () => {
    it('should calculate comprehensive info with birth year', () => {
      const currentYear = new Date().getFullYear();
      const birthYear = 1990;
      const age = currentYear - birthYear;
      const yearsToRetirement = 65 - age;

      const info = calculateRetirementIncomeInfo(500000, birthYear, 7, 3, 4);

      expect(info.currentNetWorth).toBe(500000);
      expect(info.currentAge).toBe(age);
      expect(info.yearsToRetirement).toBe(yearsToRetirement);
      expect(info.retirementAge).toBe(65);
      expect(info.projectedRealAnnualIncome).toBeGreaterThan(0);
      expect(info.projectedRealMonthlyIncome).toBeCloseTo(
        info.projectedRealAnnualIncome / 12,
        2
      );
      expect(info.projectedNominalAnnualIncome).toBeGreaterThan(
        info.projectedRealAnnualIncome
      );
      expect(info.projectedNominalMonthlyIncome).toBeCloseTo(
        info.projectedNominalAnnualIncome / 12,
        2
      );
      expect(info.dollarMultiplier).toBeGreaterThan(1);
      expect(info.inflationMultiplier).toBeGreaterThan(1);
    });

    it('should default to 30 years when no birth year', () => {
      const info = calculateRetirementIncomeInfo(500000, null, 7, 3, 4);
      expect(info.currentAge).toBeNull();
      expect(info.yearsToRetirement).toBe(30);
    });

    it('should generate income thresholds in ascending order', () => {
      const info = calculateRetirementIncomeInfo(500000, 1990, 7, 3, 4);
      for (let i = 1; i < info.incomeThresholds.length; i++) {
        expect(info.incomeThresholds[i].realAnnualIncome).toBeGreaterThan(
          info.incomeThresholds[i - 1].realAnnualIncome
        );
      }
    });

    it('should mark thresholds as achieved when NW exceeds requirement', () => {
      const info = calculateRetirementIncomeInfo(5000000, 1990, 7, 3, 4);
      const achieved = info.incomeThresholds.filter((t) => t.isAchieved);
      expect(achieved.length).toBeGreaterThan(0);

      // All achieved thresholds should have percentComplete capped at 100
      for (const t of achieved) {
        expect(t.percentComplete).toBe(100);
      }
    });
  });
});

// ============================================================================
// 6. RUNWAY & COAST INFO
// ============================================================================

describe('Runway & Coast Info', () => {
  describe('calculateRunwayAndCoastInfo', () => {
    it('should calculate runway correctly', () => {
      const info = calculateRunwayAndCoastInfo(500000, 4000, 1990, 7, 3, 4);
      expect(info.currentRunwayYears).toBeCloseTo(500000 / 48000, 3);
      expect(info.currentRunwayMonths).toBeCloseTo((500000 / 48000) * 12, 2);
    });

    it('should calculate coast FI correctly', () => {
      const info = calculateRunwayAndCoastInfo(500000, 4000, 1990, 7, 3, 4);
      expect(info.coastFiPercent).toBeGreaterThan(0);
      expect(info.dollarMultiplier).toBeGreaterThan(1);
    });

    it('should handle null birth year (default 30 years)', () => {
      const info = calculateRunwayAndCoastInfo(500000, 4000, null, 7, 3, 4);
      expect(info.currentAge).toBeNull();
      expect(info.yearsToRetirement).toBe(30);
    });

    it('should clamp yearsToRetirement to 0 when past retirement age', () => {
      const birthYear = new Date().getFullYear() - 70; // 70 years old
      const info = calculateRunwayAndCoastInfo(500000, 4000, birthYear, 7, 3, 4);
      expect(info.yearsToRetirement).toBe(0);
    });
  });
});

// ============================================================================
// 7. LEVEL INFO SYSTEM
// ============================================================================

describe('Level Info System', () => {
  describe('calculateLevelInfo', () => {
    const settings = createSettings();
    const entries = [createEntry(500000, 365)];

    it('should find correct level for $500k net worth', () => {
      const info = calculateLevelInfo(500000, settings, entries);
      // $500k should be level 14 "Half Million" (threshold 500000)
      expect(info.currentLevel.level).toBe(14);
      expect(info.currentLevel.name).toBe('Half Million');
    });

    it('should find level 1 for $0', () => {
      const info = calculateLevelInfo(0, settings, entries);
      expect(info.currentLevel.level).toBe(1);
      expect(info.currentLevel.name).toBe('Starter');
    });

    it('should find level 24 for $1M', () => {
      const info = calculateLevelInfo(1000000, settings, entries);
      expect(info.currentLevel.level).toBe(24);
      expect(info.currentLevel.name).toBe('Millionaire');
    });

    it('should find level 50 for $100M+', () => {
      const info = calculateLevelInfo(150000000, settings, entries);
      expect(info.currentLevel.level).toBe(50);
      expect(info.currentLevel.name).toBe('Legacy');
      expect(info.nextLevel).toBeNull();
      expect(info.progressToNext).toBe(100);
    });

    it('should calculate progress to next level correctly', () => {
      // At $525k — between Half Million ($500k) and Expanding ($550k)
      const info = calculateLevelInfo(525000, settings, entries);
      expect(info.currentLevel.level).toBe(14);
      expect(info.nextLevel!.level).toBe(15);
      expect(info.progressToNext).toBeCloseTo(50, 0);
      expect(info.amountToNext).toBeCloseTo(25000, 0);
    });

    it('should calculate unlocked spending correctly', () => {
      const info = calculateLevelInfo(500000, settings, entries);
      // At $500k with 2% spending growth: base + (500k * 0.02 / 12) = base + $833.33
      // base is inflation-adjusted from first entry time
      expect(info.unlockedAtNetWorth).toBeGreaterThan(settings.baseMonthlyBudget);
      expect(info.netWorthPortion).toBeCloseTo(
        500000 * (settings.spendingGrowthRate / 100) / 12,
        0
      );
    });

    it('should determine spending status correctly', () => {
      // Within budget
      const inBudget = calculateLevelInfo(
        500000,
        createSettings({ monthlySpend: 1000 }),
        entries
      );
      expect(inBudget.spendingStatus).toBe('within_budget');

      // Over budget
      const overBudget = calculateLevelInfo(
        50000,
        createSettings({ monthlySpend: 100000 }),
        entries
      );
      expect(overBudget.spendingStatus).toBe('over_budget');
    });

    it('should generate all 50 levels with status', () => {
      const info = calculateLevelInfo(500000, settings, entries);
      expect(info.levelsWithStatus.length).toBe(50);

      // All below current should be unlocked
      const unlocked = info.levelsWithStatus.filter((l) => l.isUnlocked);
      expect(unlocked.length).toBe(info.currentLevelIndex + 1);

      // Exactly one should be current
      const current = info.levelsWithStatus.filter((l) => l.isCurrent);
      expect(current.length).toBe(1);
    });
  });
});

// ============================================================================
// 8. COAST FI YEAR FINDER
// ============================================================================

describe('Coast FI Year Finder', () => {
  describe('findCoastFiYear', () => {
    it('should find coast FI year for healthy portfolio', () => {
      const settings = createSettings({ monthlySpend: 4000 });
      const currentYear = new Date().getFullYear();
      const result = findCoastFiYear(500000, currentYear, 0, settings, false, false);
      expect(result).not.toBeNull();
      expect(result!).toBeGreaterThanOrEqual(currentYear);
    });

    it('should return null when growth rate is 0', () => {
      const settings = createSettings({ currentRate: 0, monthlySpend: 4000 });
      const result = findCoastFiYear(100000, 2024, 0, settings, false, false);
      expect(result).toBeNull();
    });

    it('should return null when SWR is 0', () => {
      const settings = createSettings({ swr: 0, monthlySpend: 4000 });
      const result = findCoastFiYear(100000, 2024, 0, settings, false, false);
      expect(result).toBeNull();
    });

    it('should return current year when already coast FI', () => {
      const settings = createSettings({ monthlySpend: 1000 });
      const currentYear = new Date().getFullYear();
      // $5M with $1k/month spending — should already be coast FI
      const result = findCoastFiYear(5000000, currentYear, 0, settings, false, false);
      expect(result).toBe(currentYear);
    });

    it('should return earlier year for higher starting value', () => {
      const settings = createSettings({ monthlySpend: 4000 });
      const currentYear = new Date().getFullYear();
      const r1 = findCoastFiYear(200000, currentYear, 0, settings, false, false);
      const r2 = findCoastFiYear(800000, currentYear, 0, settings, false, false);
      if (r1 && r2) {
        expect(r2).toBeLessThanOrEqual(r1);
      }
    });
  });
});

// ============================================================================
// 9. PROJECTION GENERATION (YEARLY)
// ============================================================================

describe('Projection Generation', () => {
  describe('generateProjections', () => {
    const settings = createSettings();
    const entry = createEntry(500000, 1);

    it('should generate 61 projection rows', () => {
      const projections = generateProjections(entry, 500000, 0, settings, false, true);
      expect(projections.length).toBe(61);
    });

    it('should start at current year', () => {
      const projections = generateProjections(entry, 500000, 0, settings, false, true);
      expect(projections[0].year).toBe(new Date().getFullYear());
    });

    it('should show growing net worth', () => {
      const projections = generateProjections(entry, 500000, 0, settings, false, true);
      // With 7% growth and $20k contributions, NW should grow
      expect(projections[10].netWorth).toBeGreaterThan(projections[0].netWorth);
      expect(projections[30].netWorth).toBeGreaterThan(projections[10].netWorth);
    });

    it('should calculate correct year-1 values', () => {
      const projections = generateProjections(entry, 500000, 0, settings, false, false);
      const row0 = projections[0];

      // Year 0 interest: $500k * 0.07 = $35k
      expect(row0.interest).toBeCloseTo(35000, -2);

      // SWR amounts at year-end NW
      const endNW = row0.netWorth;
      expect(row0.annualSwr).toBeCloseTo(endNW * 0.04, 0);
      expect(row0.monthlySwr).toBeCloseTo((endNW * 0.04) / 12, 0);
    });

    it('should mark FI year correctly', () => {
      const projections = generateProjections(entry, 500000, 0, settings, false, true);
      const fiYears = projections.filter((p) => p.isFiYear);
      // Should have at most 1 FI year flag
      expect(fiYears.length).toBeLessThanOrEqual(1);
    });

    it('should mark crossover year correctly', () => {
      const projections = generateProjections(entry, 500000, 0, settings, false, true);
      const crossovers = projections.filter((p) => p.isCrossover);
      // Should have at most 1 crossover flag
      expect(crossovers.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array for null entry', () => {
      const projections = generateProjections(null, 0, 0, settings, false, true);
      expect(projections).toEqual([]);
    });

    it('should have consistent cumulative interest tracking', () => {
      const projections = generateProjections(entry, 500000, 0, settings, false, true);
      // Cumulative interest should monotonically increase
      for (let i = 1; i < projections.length; i++) {
        expect(projections[i].interest).toBeGreaterThanOrEqual(
          projections[i - 1].interest
        );
      }
    });

    it('should calculate FI progress consistently with FI target', () => {
      const projections = generateProjections(entry, 500000, 0, settings, false, true);
      for (const row of projections.slice(0, 10)) {
        if (row.fiTarget > 0) {
          const expectedProgress = (row.netWorth / row.fiTarget) * 100;
          expect(row.fiProgress).toBeCloseTo(expectedProgress, 2);
        }
      }
    });

    it('should include age when birth date is provided', () => {
      const projections = generateProjections(entry, 500000, 0, settings, false, true);
      const currentYear = new Date().getFullYear();
      const birthYear = new Date(settings.birthDate).getFullYear();
      expect(projections[0].age).toBe(currentYear - birthYear);
    });

    it('should handle applyInflation mode', () => {
      const projNoInflation = generateProjections(
        entry,
        500000,
        0,
        settings,
        false,
        false
      );
      const projWithInflation = generateProjections(
        entry,
        500000,
        0,
        settings,
        true,
        false
      );

      // With inflation, spending should be higher in future years
      expect(projWithInflation[20].monthlySpend).toBeGreaterThan(
        projNoInflation[20].monthlySpend
      );
    });
  });

  describe('generateMonthlyProjections', () => {
    const settings = createSettings();

    it('should generate correct number of months', () => {
      const result = generateMonthlyProjections(500000, settings, 60);
      expect(result.length).toBe(60);
    });

    it('should track month/year correctly', () => {
      const result = generateMonthlyProjections(500000, settings, 24);
      const now = new Date();
      expect(result[0].month).toBe(now.getMonth() + 1);
      expect(result[0].year).toBe(now.getFullYear());
    });

    it('should compound monthly (not yearly)', () => {
      const zeroSpendSettings = createSettings({
        baseMonthlyBudget: 0,
        spendingGrowthRate: 0,
        yearlyContribution: 0,
      });
      const result = generateMonthlyProjections(100000, zeroSpendSettings, 12);

      // After 12 months of monthly compounding at 7%/12:
      const monthlyRate = 0.07 / 12;
      let expected = 100000;
      for (let i = 0; i < 12; i++) {
        expected += expected * monthlyRate;
      }
      expect(result[11].netWorth).toBeCloseTo(expected, 0);
    });

    it('should track cumulative interest as sum of monthly interest', () => {
      const result = generateMonthlyProjections(500000, settings, 12);
      let sumInterest = 0;
      for (const m of result) {
        sumInterest += m.monthlyInterest;
      }
      expect(result[11].cumulativeInterest).toBeCloseTo(sumInterest, 2);
    });

    it('should support monthlyNetIncome override', () => {
      const result = generateMonthlyProjections(
        100000,
        settings,
        12,
        undefined,
        10000
      );
      // With $10k monthly net income, savings = $10k - spending
      expect(result[0].monthlySavings).toBeCloseTo(
        10000 - result[0].monthlySpending,
        2
      );
    });
  });

  describe('generateProjectionsWithMonthlySpending', () => {
    const settings = createSettings();
    const entry = createEntry(500000, 1);

    it('should generate yearly rows from monthly calculations', () => {
      const result = generateProjectionsWithMonthlySpending(entry, 500000, settings, 10);
      expect(result.length).toBe(10);
    });

    it('should return empty for null entry', () => {
      const result = generateProjectionsWithMonthlySpending(null, 0, settings, 10);
      expect(result).toEqual([]);
    });

    it('should have consistent year numbering', () => {
      const result = generateProjectionsWithMonthlySpending(entry, 500000, settings, 10);
      const currentYear = new Date().getFullYear();
      for (let i = 0; i < result.length; i++) {
        expect(result[i].year).toBe(currentYear + i);
      }
    });

    it('should produce growing net worth', () => {
      const result = generateProjectionsWithMonthlySpending(entry, 500000, settings, 10);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].netWorth).toBeGreaterThan(result[i - 1].netWorth);
      }
    });
  });
});

// ============================================================================
// 10. MASTER CALCULATION
// ============================================================================

describe('Master Calculation', () => {
  describe('calculateAllFinancials', () => {
    const settings = createSettings();
    const entries = [createEntry(500000, 1)];

    it('should return all required fields', () => {
      const result = calculateAllFinancials(settings, entries, false, false, true);

      expect(result.currentNetWorth).toBeDefined();
      expect(result.growthRates).toBeDefined();
      expect(result.projections).toBeDefined();
      expect(result.levelInfo).toBeDefined();
      expect(result.currentFiProgress).toBeDefined();
      expect(result.currentMonthlySwr).toBeDefined();
      expect(result.currentAnnualSwr).toBeDefined();
    });

    it('should compute consistent SWR from net worth', () => {
      const result = calculateAllFinancials(settings, entries, false, false, true);
      const nw = result.currentNetWorth.total;
      expect(result.currentAnnualSwr).toBeCloseTo(nw * 0.04, 0);
      expect(result.currentMonthlySwr).toBeCloseTo((nw * 0.04) / 12, 0);
    });

    it('should generate 61 projection rows', () => {
      const result = calculateAllFinancials(settings, entries, false, false, true);
      expect(result.projections.length).toBe(61);
    });

    it('should handle empty entries', () => {
      const result = calculateAllFinancials(settings, [], false, false, true);
      expect(result.currentNetWorth.total).toBe(0);
      expect(result.projections).toEqual([]);
    });

    it('should find FI year when achievable', () => {
      const richEntries = [createEntry(2000000, 1)];
      const result = calculateAllFinancials(settings, richEntries, false, false, true);
      // With $2M and modest spending, should already be FI or very close
      if (result.fiYear !== null) {
        expect(result.fiYear).toBeGreaterThanOrEqual(new Date().getFullYear());
      }
    });
  });
});

// ============================================================================
// 11. SETTINGS MERGE
// ============================================================================

describe('Settings Merge', () => {
  describe('mergeWithDefaults', () => {
    it('should return defaults for null input', () => {
      expect(mergeWithDefaults(null)).toEqual(DEFAULT_SETTINGS);
    });

    it('should return defaults for undefined input', () => {
      expect(mergeWithDefaults(undefined)).toEqual(DEFAULT_SETTINGS);
    });

    it('should override only specified fields', () => {
      const result = mergeWithDefaults({ currentRate: 10 });
      expect(result.currentRate).toBe(10);
      expect(result.swr).toBe(DEFAULT_SETTINGS.swr);
      expect(result.inflationRate).toBe(DEFAULT_SETTINGS.inflationRate);
    });

    it('should override all fields when all specified', () => {
      const custom: UserSettings = {
        currentRate: 10,
        swr: 3,
        yearlyContribution: 50000,
        birthDate: '1985-06-15',
        monthlySpend: 6000,
        inflationRate: 2,
        baseMonthlyBudget: 5000,
        spendingGrowthRate: 1.5,
      };
      const result = mergeWithDefaults(custom);
      expect(result).toEqual(custom);
    });
  });
});

// ============================================================================
// 12. FEDERAL TAX BRACKETS (2025)
// ============================================================================

describe('Federal Tax Calculations (2025)', () => {
  describe('calculateFederalTax', () => {
    it('should return 0 for $0 taxable income', () => {
      const result = calculateFederalTax(0, 'single');
      expect(result.tax).toBe(0);
      expect(result.breakdown.length).toBe(0);
    });

    it('should return 0 for negative taxable income', () => {
      const result = calculateFederalTax(-10000, 'single');
      expect(result.tax).toBe(0);
    });

    it('should calculate 10% bracket correctly for single', () => {
      // $10,000 taxable income — all in 10% bracket (max 11,925)
      const result = calculateFederalTax(10000, 'single');
      expect(result.tax).toBeCloseTo(1000, 2);
      expect(result.marginalRate).toBe(10);
    });

    it('should calculate across first two brackets for single', () => {
      // $30,000 taxable income (single)
      // First $11,925 at 10% = $1,192.50
      // Next $18,075 ($30k - $11,925) at 12% = $2,169.00
      // Total = $3,361.50
      const result = calculateFederalTax(30000, 'single');
      expect(result.tax).toBeCloseTo(3361.5, 1);
      expect(result.marginalRate).toBe(12);
    });

    it('should calculate correct tax for $100k single', () => {
      // $100,000 taxable (single)
      // 10%: $11,925 => $1,192.50
      // 12%: $48,475 - $11,925 = $36,550 => $4,386.00
      // 22%: $100,000 - $48,475 = $51,525 => $11,335.50
      // Total = $16,914.00
      const result = calculateFederalTax(100000, 'single');
      expect(result.tax).toBeCloseTo(16914, 0);
      expect(result.marginalRate).toBe(22);
    });

    it('should calculate correct tax for $200k married_jointly', () => {
      // $200,000 taxable (married jointly)
      // 10%: $23,850 => $2,385.00
      // 12%: $96,950 - $23,850 = $73,100 => $8,772.00
      // 22%: $200,000 - $96,950 = $103,050 => $22,671.00
      // Total = $33,828.00
      const result = calculateFederalTax(200000, 'married_jointly');
      expect(result.tax).toBeCloseTo(33828, 0);
      expect(result.marginalRate).toBe(22);
    });

    it('should reach 37% bracket for very high income single', () => {
      const result = calculateFederalTax(1000000, 'single');
      expect(result.marginalRate).toBe(37);
      expect(result.tax).toBeGreaterThan(300000); // Effective ~30%+
    });

    it('should have detailed bracket breakdown', () => {
      const result = calculateFederalTax(100000, 'single');
      expect(result.breakdown.length).toBe(3); // 10%, 12%, 22%

      // Sum of breakdown should equal total
      const breakdownTotal = result.breakdown.reduce(
        (s, b) => s + b.taxFromBracket,
        0
      );
      expect(breakdownTotal).toBeCloseTo(result.tax, 2);
    });

    it('should calculate head_of_household brackets', () => {
      // Head of household has wider 10% bracket ($17,000 vs $11,925)
      const single = calculateFederalTax(15000, 'single');
      const hoh = calculateFederalTax(15000, 'head_of_household');
      expect(hoh.tax).toBeLessThan(single.tax); // HoH has wider 10% bracket
    });
  });
});

// ============================================================================
// 13. STATE TAX CALCULATIONS
// ============================================================================

describe('State Tax Calculations', () => {
  describe('calculateStateTax', () => {
    it('should return 0 for no-tax states', () => {
      for (const code of ['TX', 'FL', 'WA', 'NV', 'WY', 'AK', 'SD', 'TN', 'NH']) {
        const result = calculateStateTax(100000, code, 'single');
        expect(result.tax).toBe(0);
        expect(result.type).toBe('none');
      }
    });

    it('should return 0 for null state code', () => {
      const result = calculateStateTax(100000, null, 'single');
      expect(result.tax).toBe(0);
      expect(result.type).toBe('none');
    });

    it('should return 0 for unknown state code', () => {
      const result = calculateStateTax(100000, 'XX', 'single');
      expect(result.tax).toBe(0);
    });

    it('should calculate flat-rate states correctly', () => {
      // Illinois: 4.95% flat rate, no standard deduction
      const result = calculateStateTax(100000, 'IL', 'single');
      expect(result.type).toBe('flat');
      expect(result.marginalRate).toBe(4.95);
      expect(result.tax).toBeCloseTo(100000 * 0.0495, 0);
    });

    it('should apply state standard deduction for progressive states', () => {
      // California: $5,706 standard deduction for single
      const result = calculateStateTax(50000, 'CA', 'single');
      expect(result.type).toBe('progressive');
      expect(result.standardDeduction).toBe(5706);
      expect(result.taxableIncome).toBeCloseTo(50000 - 5706, 0);
    });

    it('should calculate California progressive tax', () => {
      // CA single, AGI = $100,000
      // Taxable = $100,000 - $5,706 = $94,294
      const result = calculateStateTax(100000, 'CA', 'single');
      expect(result.type).toBe('progressive');
      expect(result.tax).toBeGreaterThan(0);
      expect(result.breakdown.length).toBeGreaterThan(0);

      // Sum of breakdown = total
      const breakdownTotal = result.breakdown.reduce(
        (s, b) => s + b.taxFromBracket,
        0
      );
      expect(breakdownTotal).toBeCloseTo(result.tax, 2);
    });

    it('should handle Massachusetts millionaire surtax', () => {
      // MA: 5% flat on ALL income + additional 4% surtax on income over $1M
      const result = calculateStateTax(1500000, 'MA', 'single');
      // Tax = $1.5M * 5% + $500k * 4% = $75k + $20k = $95k
      expect(result.tax).toBeCloseTo(1500000 * 0.05 + 500000 * 0.04, 0);
      expect(result.marginalRate).toBe(9); // 5% + 4%
    });

    it('should handle married_jointly brackets', () => {
      // CA married jointly has wider brackets
      const single = calculateStateTax(100000, 'CA', 'single');
      const married = calculateStateTax(100000, 'CA', 'married_jointly');
      // Married should pay less (wider brackets, higher deduction)
      expect(married.tax).toBeLessThan(single.tax);
    });

    it('should handle zero income', () => {
      const result = calculateStateTax(0, 'CA', 'single');
      expect(result.tax).toBe(0);
    });

    it('should apply personal exemption for states that have it', () => {
      // Connecticut: personal exemption of $15k for single
      const result = calculateStateTax(100000, 'CT', 'single');
      expect(result.personalExemption).toBe(15000);
    });
  });
});

// ============================================================================
// 14. FICA TAX CALCULATIONS
// ============================================================================

describe('FICA Tax Calculations', () => {
  describe('calculateFICATax', () => {
    it('should calculate Social Security correctly below cap', () => {
      // $100k income: SS = $100k * 6.2% = $6,200
      const result = calculateFICATax(100000, 'single');
      expect(result.socialSecurityTax).toBeCloseTo(6200, 2);
      expect(result.socialSecurityWages).toBe(100000);
      expect(result.wagesAboveSsCap).toBe(0);
    });

    it('should cap Social Security at wage base ($176,100 for 2025)', () => {
      const result = calculateFICATax(300000, 'single');
      expect(result.socialSecurityWages).toBe(176100);
      expect(result.socialSecurityTax).toBeCloseTo(176100 * 0.062, 2);
      expect(result.wagesAboveSsCap).toBeCloseTo(123900, 0);
    });

    it('should calculate base Medicare correctly (no cap)', () => {
      const result = calculateFICATax(300000, 'single');
      expect(result.medicareBaseTax).toBeCloseTo(300000 * 0.0145, 2);
    });

    it('should apply additional Medicare tax for single > $200k', () => {
      const result = calculateFICATax(300000, 'single');
      expect(result.additionalMedicareThreshold).toBe(200000);
      expect(result.additionalMedicareWages).toBeCloseTo(100000, 0);
      expect(result.additionalMedicareTax).toBeCloseTo(100000 * 0.009, 2);
    });

    it('should apply additional Medicare at $250k for married_jointly', () => {
      const result = calculateFICATax(300000, 'married_jointly');
      expect(result.additionalMedicareThreshold).toBe(250000);
      expect(result.additionalMedicareWages).toBeCloseTo(50000, 0);
    });

    it('should apply additional Medicare at $125k for married_separately', () => {
      const result = calculateFICATax(200000, 'married_separately');
      expect(result.additionalMedicareThreshold).toBe(125000);
      expect(result.additionalMedicareWages).toBeCloseTo(75000, 0);
    });

    it('should have no additional Medicare below threshold', () => {
      const result = calculateFICATax(100000, 'single');
      expect(result.additionalMedicareTax).toBe(0);
    });

    it('should sum total FICA correctly', () => {
      const result = calculateFICATax(100000, 'single');
      const expected = result.socialSecurityTax + result.totalMedicareTax;
      expect(result.totalFicaTax).toBeCloseTo(expected, 2);
    });

    it('should calculate effective FICA rate', () => {
      const result = calculateFICATax(100000, 'single');
      const expected = (result.totalFicaTax / 100000) * 100;
      expect(result.effectiveFicaRate).toBeCloseTo(expected, 4);
    });

    it('should handle $0 income', () => {
      const result = calculateFICATax(0, 'single');
      expect(result.totalFicaTax).toBe(0);
      expect(result.effectiveFicaRate).toBe(0);
    });

    it('should calculate typical FICA for $75k single', () => {
      // SS: $75k * 6.2% = $4,650
      // Medicare: $75k * 1.45% = $1,087.50
      // No additional Medicare (below $200k)
      // Total: $5,737.50
      const result = calculateFICATax(75000, 'single');
      expect(result.socialSecurityTax).toBeCloseTo(4650, 2);
      expect(result.medicareBaseTax).toBeCloseTo(1087.5, 2);
      expect(result.additionalMedicareTax).toBe(0);
      expect(result.totalFicaTax).toBeCloseTo(5737.5, 2);
    });
  });
});

// ============================================================================
// 15. COMPLETE TAX PIPELINE
// ============================================================================

describe('Complete Tax Pipeline', () => {
  describe('calculateTaxes', () => {
    it('should combine federal + state + FICA correctly', () => {
      const result = calculateTaxes(100000, 'single', 'CA', zeroPretax);

      expect(result.grossIncome).toBe(100000);
      expect(result.totalTax).toBeCloseTo(
        result.federalTax + result.stateTax + result.ficaTax,
        2
      );
      expect(result.netIncome).toBeCloseTo(
        100000 - result.totalTax,
        2
      );
    });

    it('should apply federal standard deduction ($15,000 single 2025)', () => {
      const result = calculateTaxes(100000, 'single', null, zeroPretax);
      expect(result.federalStandardDeduction).toBe(15000);
      expect(result.federalTaxableIncome).toBe(85000);
    });

    it('should apply married jointly standard deduction ($30,000)', () => {
      const result = calculateTaxes(100000, 'married_jointly', null, zeroPretax);
      expect(result.federalStandardDeduction).toBe(30000);
      expect(result.federalTaxableIncome).toBe(70000);
    });

    it('should deduct pre-tax contributions from AGI', () => {
      const withPretax = calculateTaxes(100000, 'single', null, standardPretax);
      const withoutPretax = calculateTaxes(100000, 'single', null, zeroPretax);

      const totalPretax = 23500 + 7000 + 4300;
      expect(withPretax.adjustedGrossIncome).toBe(100000 - totalPretax);
      expect(withPretax.federalTax).toBeLessThan(withoutPretax.federalTax);
    });

    it('should handle California HSA not being state-deductible', () => {
      const pretax: PreTaxContributions = {
        traditional401k: 10000,
        traditionalIRA: 0,
        hsa: 4300,
        other: 0,
      };
      const result = calculateTaxes(100000, 'single', 'CA', pretax);

      // Federal AGI = 100k - 14.3k = 85.7k
      expect(result.adjustedGrossIncome).toBe(100000 - 14300);

      // State AGI should add back HSA for California
      expect(result.stateAdjustedGrossIncome).toBe(100000 - 14300 + 4300);
    });

    it('should not add back HSA for non-CA states', () => {
      const pretax: PreTaxContributions = {
        traditional401k: 10000,
        traditionalIRA: 0,
        hsa: 4300,
        other: 0,
      };
      const result = calculateTaxes(100000, 'single', 'NY', pretax);
      expect(result.stateAdjustedGrossIncome).toBe(result.adjustedGrossIncome);
    });

    it('should calculate effective rates correctly', () => {
      const result = calculateTaxes(200000, 'single', 'CA', zeroPretax);
      expect(result.effectiveTotalRate).toBeCloseTo(
        (result.totalTax / 200000) * 100,
        4
      );
      expect(result.effectiveFederalRate).toBeCloseTo(
        (result.federalTax / 200000) * 100,
        4
      );
      expect(result.effectiveStateRate).toBeCloseTo(
        (result.stateTax / 200000) * 100,
        4
      );
    });

    it('should calculate net income correctly', () => {
      const result = calculateTaxes(150000, 'single', 'TX', standardPretax);
      const totalPretax = 23500 + 7000 + 4300;
      expect(result.netIncome).toBeCloseTo(
        150000 - result.totalTax - totalPretax,
        2
      );
      expect(result.monthlyNetIncome).toBeCloseTo(result.netIncome / 12, 2);
      expect(result.monthlyGrossIncome).toBeCloseTo(150000 / 12, 2);
    });

    it('should handle $0 income', () => {
      const result = calculateTaxes(0, 'single', 'CA', zeroPretax);
      expect(result.totalTax).toBe(0);
      expect(result.netIncome).toBe(0);
      expect(result.effectiveTotalRate).toBe(0);
    });

    it('should compute total income tax as federal + state', () => {
      const result = calculateTaxes(100000, 'single', 'NY', zeroPretax);
      expect(result.totalIncomeTax).toBeCloseTo(
        result.federalTax + result.stateTax,
        2
      );
    });

    it('should verify net income = gross - total tax - pretax contributions', () => {
      for (const income of [50000, 100000, 250000, 500000]) {
        const result = calculateTaxes(income, 'single', 'CA', standardPretax);
        const totalPretax = 23500 + 7000 + 4300;
        expect(result.netIncome).toBeCloseTo(
          income - result.totalTax - totalPretax,
          2
        );
      }
    });
  });
});

// ============================================================================
// 16. SCENARIO INCOME BREAKDOWN
// ============================================================================

describe('Scenario Income Breakdown', () => {
  describe('calculateScenarioIncome', () => {
    it('should calculate savings correctly', () => {
      const result = calculateScenarioIncome(
        150000,
        'single',
        'CA',
        standardPretax,
        4000,
        500000
      );

      const totalPretax = 23500 + 7000 + 4300;
      expect(result.totalPreTaxSavings).toBe(totalPretax);
      expect(result.annualSpending).toBe(48000);
      expect(result.postTaxSavingsAvailable).toBeCloseTo(
        Math.max(0, result.taxes.netIncome - 48000),
        2
      );
      expect(result.totalAnnualSavings).toBeCloseTo(
        totalPretax + result.postTaxSavingsAvailable,
        2
      );
    });

    it('should calculate savings rates correctly', () => {
      const result = calculateScenarioIncome(
        150000,
        'single',
        'TX',
        zeroPretax,
        3000,
        500000
      );

      expect(result.savingsRateOfGross).toBeCloseTo(
        (result.totalAnnualSavings / 150000) * 100,
        4
      );
      expect(result.savingsRateOfNet).toBeCloseTo(
        (result.postTaxSavingsAvailable / result.taxes.netIncome) * 100,
        4
      );
    });

    it('should calculate spending rates correctly', () => {
      const result = calculateScenarioIncome(
        100000,
        'single',
        null,
        zeroPretax,
        3000,
        500000
      );

      expect(result.spendingRateOfGross).toBeCloseTo(
        (36000 / 100000) * 100,
        4
      );
    });

    it('should calculate net worth context', () => {
      const result = calculateScenarioIncome(
        100000,
        'single',
        null,
        zeroPretax,
        4000,
        500000
      );

      expect(result.yearsOfExpenses).toBeCloseTo(500000 / 48000, 3);
      expect(result.netWorthToIncomeRatio).toBeCloseTo(500000 / 100000, 4);
    });

    it('should warn when spending exceeds net income', () => {
      const result = calculateScenarioIncome(
        30000,
        'single',
        'CA',
        zeroPretax,
        5000,
        0
      );

      // $5k * 12 = $60k spending on $30k income
      expect(result.warnings.some((w) => w.includes('spending exceeds'))).toBe(true);
    });

    it('should warn about 401k over-contribution', () => {
      const overPretax: PreTaxContributions = {
        traditional401k: 50000, // Over $23,500 limit
        traditionalIRA: 0,
        hsa: 0,
        other: 0,
      };
      const result = calculateScenarioIncome(
        200000,
        'single',
        null,
        overPretax,
        3000,
        0
      );

      expect(result.warnings.some((w) => w.includes('401k'))).toBe(true);
    });
  });
});

// ============================================================================
// 17. LEGACY INCOME BREAKDOWN
// ============================================================================

describe('Legacy Income Breakdown', () => {
  describe('calculateIncomeBreakdown', () => {
    it('should calculate correctly with 20% effective tax', () => {
      const result = calculateIncomeBreakdown(100000, 20, 3000, 500000);

      expect(result.annualTaxes).toBe(20000);
      expect(result.netIncome).toBe(80000);
      expect(result.monthlyGross).toBeCloseTo(8333.33, 1);
      expect(result.monthlyNet).toBeCloseTo(6666.67, 1);
      expect(result.annualSpending).toBe(36000);
      expect(result.annualSavingsPotential).toBe(44000); // 80k - 36k
      expect(result.savingsRate).toBeCloseTo(44, 0);
      expect(result.yearsOfExpensesInNetWorth).toBeCloseTo(500000 / 36000, 2);
      expect(result.netWorthToIncomeRatio).toBe(5);
    });

    it('should handle $0 gross income', () => {
      const result = calculateIncomeBreakdown(0, 20, 3000, 500000);
      expect(result.savingsRate).toBe(0);
      expect(result.netWorthToIncomeRatio).toBe(0);
    });

    it('should cap savings at 0 when spending exceeds income', () => {
      const result = calculateIncomeBreakdown(30000, 30, 3000, 0);
      // Net = $30k - $9k tax = $21k. Spending = $36k. Savings = max(0, -$15k) = 0
      expect(result.annualSavingsPotential).toBe(0);
    });
  });
});

// ============================================================================
// 18. DYNAMIC PROJECTIONS
// ============================================================================

describe('Dynamic Projections', () => {
  const incomeParams: DynamicIncomeParams = {
    grossIncome: 150000,
    incomeGrowthRate: 3,
    filingStatus: 'single',
    stateCode: 'CA',
    preTaxContributions: standardPretax,
  };

  const spendingParams: DynamicSpendingParams = {
    baseMonthlyBudget: 3000,
    spendingGrowthRate: 2,
    inflationRate: 3,
  };

  describe('calculateYearProjection', () => {
    it('should project year 0 correctly', () => {
      const result = calculateYearProjection(0, 500000, incomeParams, spendingParams, 7);

      expect(result.yearsFromNow).toBe(0);
      expect(result.grossIncome).toBe(150000);
      expect(result.investmentGrowth).toBeCloseTo(500000 * 0.07, 0);
      expect(result.startOfYearNetWorth).toBe(500000);
    });

    it('should grow income over time', () => {
      const y0 = calculateYearProjection(0, 500000, incomeParams, spendingParams, 7);
      const y5 = calculateYearProjection(5, 500000, incomeParams, spendingParams, 7);

      // Income at year 5 = 150k * (1.03)^5
      expect(y5.grossIncome).toBeCloseTo(150000 * Math.pow(1.03, 5), 0);
      expect(y5.grossIncome).toBeGreaterThan(y0.grossIncome);
    });

    it('should calculate end-of-year NW as start + growth + savings', () => {
      const result = calculateYearProjection(0, 500000, incomeParams, spendingParams, 7);
      expect(result.endOfYearNetWorth).toBeCloseTo(
        result.startOfYearNetWorth + result.investmentGrowth + result.totalSavings,
        0
      );
    });

    it('should calculate tax correctly in projections', () => {
      const result = calculateYearProjection(0, 500000, incomeParams, spendingParams, 7);
      expect(result.federalTax).toBeGreaterThan(0);
      expect(result.stateTax).toBeGreaterThan(0);
      expect(result.ficaTax).toBeGreaterThan(0);
      expect(result.totalTax).toBeCloseTo(
        result.federalTax + result.stateTax + result.ficaTax,
        2
      );
    });

    it('should calculate spending with inflation', () => {
      const y0 = calculateYearProjection(0, 500000, incomeParams, spendingParams, 7);
      const y10 = calculateYearProjection(10, 500000, incomeParams, spendingParams, 7);

      expect(y10.baseMonthlyBudget).toBeCloseTo(
        3000 * Math.pow(1.03, 10),
        0
      );
      expect(y10.baseMonthlyBudget).toBeGreaterThan(y0.baseMonthlyBudget);
    });
  });

  describe('generateDynamicProjections', () => {
    it('should generate correct number of years', () => {
      const result = generateDynamicProjections(
        500000,
        incomeParams,
        spendingParams,
        7,
        30
      );
      expect(result.length).toBe(31); // 0 through 30 inclusive
    });

    it('should chain net worth year over year', () => {
      const result = generateDynamicProjections(
        500000,
        incomeParams,
        spendingParams,
        7,
        10
      );

      for (let i = 1; i < result.length; i++) {
        expect(result[i].startOfYearNetWorth).toBeCloseTo(
          result[i - 1].endOfYearNetWorth,
          0
        );
      }
    });

    it('should show growing net worth over time', () => {
      const result = generateDynamicProjections(
        500000,
        incomeParams,
        spendingParams,
        7,
        30
      );

      // Generally net worth should grow with income + investment returns
      expect(result[30].endOfYearNetWorth).toBeGreaterThan(result[0].endOfYearNetWorth);
    });

    it('should start at provided starting net worth', () => {
      const result = generateDynamicProjections(
        750000,
        incomeParams,
        spendingParams,
        7,
        5
      );
      expect(result[0].startOfYearNetWorth).toBe(750000);
    });
  });
});

// ============================================================================
// 19. FORMATTING UTILITIES
// ============================================================================

describe('Formatting Utilities', () => {
  describe('formatDate', () => {
    it('should format a timestamp as a readable date', () => {
      // Jan 15, 2024 at 10:30 AM UTC
      const ts = new Date(2024, 0, 15, 10, 30).getTime();
      const result = formatDate(ts);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });
  });

  describe('getTimeSinceEntry', () => {
    it('should return seconds for recent timestamps', () => {
      const result = getTimeSinceEntry(Date.now() - 30000);
      expect(result).toContain('s ago');
    });

    it('should return minutes for timestamps a few minutes ago', () => {
      const result = getTimeSinceEntry(Date.now() - 5 * 60 * 1000);
      expect(result).toContain('m');
    });

    it('should return hours for timestamps hours ago', () => {
      const result = getTimeSinceEntry(Date.now() - 3 * 60 * 60 * 1000);
      expect(result).toContain('h');
    });

    it('should return days for timestamps days ago', () => {
      const result = getTimeSinceEntry(Date.now() - 5 * 24 * 60 * 60 * 1000);
      expect(result).toContain('d');
    });
  });
});

// ============================================================================
// 20. FI MILESTONES SUMMARY
// ============================================================================

describe('FI Milestones Summary', () => {
  it('should partition milestones into achieved and upcoming', () => {
    const settings = createSettings();
    const entry = createEntry(500000, 1);
    const projections = generateProjections(entry, 500000, 0, settings, false, true);
    const milestones = calculateFiMilestones(projections, settings, 1990);
    const summary = getFiMilestonesSummary(milestones);

    expect(summary.achieved.length + summary.upcoming.length).toBeLessThanOrEqual(
      milestones.milestones.length
    );

    for (const m of summary.achieved) {
      expect(m.isAchieved).toBe(true);
    }
    for (const m of summary.upcoming) {
      expect(m.isAchieved).toBe(false);
    }
  });
});

// ============================================================================
// 21. CROSS-CALCULATION CONSISTENCY & MATHEMATICAL IDENTITIES
// ============================================================================

describe('Cross-Calculation Consistency', () => {
  it('FI identity: at FI target, SWR = annual spending', () => {
    for (const spend of [2000, 4000, 8000, 15000]) {
      for (const swr of [3, 3.5, 4, 5]) {
        const target = calculateFiTarget(spend, swr);
        const swrAmounts = calculateSwrAmounts(target, swr);
        expect(swrAmounts.annual).toBeCloseTo(spend * 12, 2);
        expect(swrAmounts.monthly).toBeCloseTo(spend, 1);
      }
    }
  });

  it('SWR period consistency: annual = 12*monthly = 52*weekly = 365*daily', () => {
    const swr = calculateSwrAmounts(1000000, 4);
    expect(swr.annual).toBeCloseTo(swr.monthly * 12, 2);
    expect(swr.annual).toBeCloseTo(swr.weekly * 52, 2);
    expect(swr.annual).toBeCloseTo(swr.daily * 365, 2);
  });

  it('Growth rates scale: perYear = 365.25*perDay = 8766*perHour', () => {
    const settings = createSettings();
    const rates = calculateGrowthRates(1000000, settings, true);
    expect(rates.perYear).toBeCloseTo(rates.perDay * 365.25, 2);
    expect(rates.perYear).toBeCloseTo(rates.perHour * 365.25 * 24, 1);
    expect(rates.perYear).toBeCloseTo(rates.perMinute * 365.25 * 24 * 60, 0);
    expect(rates.perYear).toBeCloseTo(
      rates.perSecond * 365.25 * 24 * 60 * 60,
      -1
    );
  });

  it('Growth rates decomposition: perYear = appreciation + contributions', () => {
    const settings = createSettings();
    const rates = calculateGrowthRates(1000000, settings, true);
    expect(rates.perYear).toBeCloseTo(
      rates.yearlyAppreciation + rates.yearlyContributions,
      2
    );
  });

  it('Compound growth: FV(0 contributions) = principal * (1+r)^n', () => {
    for (const principal of [100000, 500000, 1000000]) {
      for (const rate of [5, 7, 10]) {
        for (const years of [1, 5, 10, 30]) {
          const result = calculateFutureValue(principal, rate, years, 0);
          const manual = principal * Math.pow(1 + rate / 100, years);
          expect(result.total).toBeCloseTo(manual, 0);
          expect(result.compoundedPrincipal).toBeCloseTo(manual, 0);
        }
      }
    }
  });

  it('Compound growth: interest = total - principal - totalContributed', () => {
    const result = calculateFutureValue(100000, 7, 20, 15000);
    expect(result.totalInterest).toBeCloseTo(
      result.total - 100000 - result.totalContributed,
      0
    );
  });

  it('Inflation identity: adjustForInflation(x, n, r) = x * (1+r/100)^n', () => {
    for (const base of [1000, 5000]) {
      for (const years of [0, 5, 10, 30]) {
        for (const rate of [0, 2, 3, 5]) {
          const result = adjustForInflation(base, years, rate);
          const manual = base * Math.pow(1 + rate / 100, years);
          expect(result).toBeCloseTo(manual, 4);
        }
      }
    }
  });

  it('Level-based spending: base + NW*rate/12', () => {
    const settings = createSettings({
      baseMonthlyBudget: 3000,
      spendingGrowthRate: 2,
      inflationRate: 0,
    });

    for (const nw of [0, 100000, 500000, 1000000]) {
      const result = calculateLevelBasedSpending(nw, settings, 0);
      const manual = 3000 + (nw * 0.02) / 12;
      expect(result).toBeCloseTo(manual, 4);
    }
  });

  it('Runway identity: runway * annualExpenses = netWorth', () => {
    for (const nw of [100000, 500000, 1000000]) {
      for (const spend of [2000, 4000, 8000]) {
        const runway = calculateRunwayYears(nw, spend);
        if (runway !== Infinity) {
          expect(runway * spend * 12).toBeCloseTo(nw, 2);
        }
      }
    }
  });

  it('Dollar multiplier identity: (1+r/100)^n', () => {
    for (const years of [1, 10, 20, 30]) {
      for (const rate of [5, 7, 10]) {
        const result = calculateDollarMultiplier(years, rate);
        const manual = Math.pow(1 + rate / 100, years);
        expect(result).toBeCloseTo(manual, 8);
      }
    }
  });

  it('Retirement income inverse: forward(inverse(x)) = x', () => {
    for (const target of [25000, 50000, 100000, 200000]) {
      for (const years of [10, 20, 30]) {
        const nwNeeded = calculateNetWorthForRetirementIncome(
          target,
          years,
          7,
          3,
          4
        );
        const income = calculateProjectedRetirementIncome(nwNeeded, years, 7, 3, 4);
        expect(income).toBeCloseTo(target, 0);
      }
    }
  });

  it('Nominal retirement income > real retirement income when inflation > 0', () => {
    for (const nw of [200000, 500000, 1000000]) {
      const real = calculateProjectedRetirementIncome(nw, 25, 7, 3, 4);
      const nominal = calculateProjectedRetirementIncomeNominal(nw, 25, 7, 4);
      expect(nominal).toBeGreaterThan(real);
    }
  });

  it('Tax identity: netIncome = gross - totalTax - preTaxContributions', () => {
    for (const income of [50000, 100000, 200000, 500000]) {
      const result = calculateTaxes(income, 'single', 'CA', standardPretax);
      const totalPretax = 23500 + 7000 + 4300;
      expect(result.netIncome).toBeCloseTo(
        income - result.totalTax - totalPretax,
        2
      );
    }
  });

  it('Tax identity: totalTax = federalTax + stateTax + ficaTax', () => {
    for (const income of [50000, 100000, 200000]) {
      const result = calculateTaxes(income, 'single', 'NY', zeroPretax);
      expect(result.totalTax).toBeCloseTo(
        result.federalTax + result.stateTax + result.ficaTax,
        2
      );
    }
  });

  it('Effective rates sum: effective total ≈ fed + state + fica rates', () => {
    const result = calculateTaxes(200000, 'single', 'CA', zeroPretax);
    expect(result.effectiveTotalRate).toBeCloseTo(
      result.effectiveFederalRate + result.effectiveStateRate + result.effectiveFicaRate,
      4
    );
  });

  it('No-tax state should have zero state tax', () => {
    for (const state of ['TX', 'FL', 'WA', 'NV']) {
      const result = calculateTaxes(200000, 'single', state, zeroPretax);
      expect(result.stateTax).toBe(0);
      expect(result.effectiveStateRate).toBe(0);
    }
  });

  it('Projection net worth should be increasing for positive return + contributions', () => {
    const settings = createSettings({
      currentRate: 7,
      yearlyContribution: 20000,
      baseMonthlyBudget: 1000,
      spendingGrowthRate: 0.5,
    });
    const entry = createEntry(500000, 1);
    const projections = generateProjections(entry, 500000, 0, settings, false, true);

    // For the first 20 years at least, net worth should grow
    for (let i = 1; i < 20; i++) {
      expect(projections[i].netWorth).toBeGreaterThan(projections[i - 1].netWorth);
    }
  });

  it('Age calculation consistency across projections', () => {
    const settings = createSettings({ birthDate: '1990-01-01' });
    const entry = createEntry(500000, 1);
    const projections = generateProjections(entry, 500000, 0, settings, false, true);
    const birthYear = 1990;

    for (const row of projections) {
      if (row.age !== null) {
        expect(row.age).toBe(row.year - birthYear);
      }
    }
  });
});

// ============================================================================
// 22. EDGE CASES & BOUNDARY CONDITIONS
// ============================================================================

describe('Edge Cases & Boundary Conditions', () => {
  it('should handle very large net worth ($100M)', () => {
    const settings = createSettings();
    const entry = createEntry(100000000, 1);
    const projections = generateProjections(entry, 100000000, 0, settings, false, true);
    expect(projections[0].netWorth).toBeGreaterThan(100000000);
  });

  it('should handle very small net worth ($1)', () => {
    const settings = createSettings();
    const entry = createEntry(1, 1);
    const projections = generateProjections(entry, 1, 0, settings, false, true);
    expect(projections.length).toBe(61);
    expect(projections[0].netWorth).toBeGreaterThan(0);
  });

  it('should handle 0% return rate projections', () => {
    const settings = createSettings({ currentRate: 0, yearlyContribution: 10000 });
    const entry = createEntry(100000, 1);
    const projections = generateProjections(entry, 100000, 0, settings, false, false);

    // Year 1: 100k + 0 interest + savings
    // Interest should always be 0
    for (const row of projections.slice(0, 5)) {
      expect(row.interest).toBe(0);
    }
  });

  it('should handle very high return rate (20%)', () => {
    const settings = createSettings({ currentRate: 20 });
    const entry = createEntry(100000, 1);
    const projections = generateProjections(entry, 100000, 0, settings, false, true);
    // After 30 years at 20%, should be very large
    expect(projections[30].netWorth).toBeGreaterThan(10000000);
  });

  it('should handle 0% inflation', () => {
    const settings = createSettings({ inflationRate: 0 });
    const result = adjustForInflation(1000, 30, 0);
    expect(result).toBe(1000);
  });

  it('should handle calculateAge with various birth dates', () => {
    expect(calculateAge('2000-06-15', 2025)).toBe(25);
    expect(calculateAge('1950-01-01', 2025)).toBe(75);
    expect(calculateAge('', 2025)).toBeNull();
  });

  it('should handle negative spending in calculateFiTarget', () => {
    expect(calculateFiTarget(-1000, 4)).toBe(0);
  });

  it('should handle Infinity in runway when monthlySpend is 0', () => {
    expect(calculateRunwayYears(500000, 0)).toBe(Infinity);
  });

  it('FICA should handle exact wage cap amount', () => {
    const result = calculateFICATax(176100, 'single');
    expect(result.socialSecurityWages).toBe(176100);
    expect(result.socialSecurityTax).toBeCloseTo(176100 * 0.062, 2);
    expect(result.wagesAboveSsCap).toBe(0);
  });

  it('Federal tax should handle exact bracket boundaries', () => {
    // Exactly at first bracket boundary for single ($11,925)
    const result = calculateFederalTax(11925, 'single');
    expect(result.tax).toBeCloseTo(11925 * 0.10, 2);
    expect(result.marginalRate).toBe(10);
  });

  it('Contribution limits should reflect 2025 values', () => {
    expect(CONTRIBUTION_LIMITS.traditional401k).toBe(23500);
    expect(CONTRIBUTION_LIMITS.traditionalIRA).toBe(7000);
    expect(CONTRIBUTION_LIMITS.hsa_individual).toBe(4300);
    expect(CONTRIBUTION_LIMITS.hsa_family).toBe(8550);
  });

  it('FI milestone definitions should have unique IDs', () => {
    const ids = FI_MILESTONE_DEFINITIONS.map((d) => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('Level thresholds should cover $0 to $100M', () => {
    expect(LEVEL_THRESHOLDS[0].threshold).toBe(0);
    expect(LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].threshold).toBe(100000000);
  });

  it('State tax info should cover all 50 states + DC', () => {
    const states = Object.keys(STATE_TAX_INFO);
    // Should have at least 50 entries (50 states + DC)
    expect(states.length).toBeGreaterThanOrEqual(51);
  });
});
