/**
 * Comprehensive tests for the centralized calculations module
 * 
 * These tests validate all financial calculations to ensure consistency
 * and correctness across the application.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateFiTarget,
  calculateSwrAmounts,
  calculateGrowthRates,
  calculateRealTimeNetWorth,
  calculateFutureValue,
  calculateLevelBasedSpending,
  calculateUnlockedSpending,
  adjustForInflation,
  calculateAge,
  formatCurrency,
  formatPercent,
  LEVEL_THRESHOLDS,
  DEFAULT_SETTINGS,
  UserSettings,
  NetWorthEntry,
} from '../lib/calculations'

import {
  calculateFiTargetTracked,
  calculateSwrAmountsTracked,
  calculateGrowthRatesTracked,
  calculateRealTimeNetWorthTracked,
  calculateFiProgressTracked,
  calculateLevelBasedSpendingTracked,
  calculateCompoundGrowthTracked,
  CalculationBuilder,
  TrackedValue,
} from '../lib/calculationTrace'

// ============================================================================
// TEST DATA
// ============================================================================

const mockSettings: UserSettings = {
  currentRate: 7,
  swr: 4,
  yearlyContribution: 20000,
  birthDate: '1990-01-01',
  monthlySpend: 4000,
  inflationRate: 3,
  baseMonthlyBudget: 3000,
  spendingGrowthRate: 2,
}

const mockEntry: NetWorthEntry = {
  _id: 'test-entry-1',
  userId: 'test-user',
  amount: 500000,
  timestamp: Date.now() - (365 * 24 * 60 * 60 * 1000), // 1 year ago
}

// ============================================================================
// FI TARGET CALCULATIONS
// ============================================================================

describe('FI Target Calculations', () => {
  describe('calculateFiTarget', () => {
    it('should calculate correct FI target for standard inputs', () => {
      // $4000/month * 12 = $48000/year
      // $48000 / 0.04 = $1,200,000
      const result = calculateFiTarget(4000, 4)
      expect(result).toBe(1200000)
    })

    it('should return 0 for zero monthly spend', () => {
      const result = calculateFiTarget(0, 4)
      expect(result).toBe(0)
    })

    it('should return 0 for zero SWR', () => {
      const result = calculateFiTarget(4000, 0)
      expect(result).toBe(0)
    })

    it('should handle different SWR values correctly', () => {
      // 3% SWR should require higher net worth
      const result3 = calculateFiTarget(4000, 3)
      const result4 = calculateFiTarget(4000, 4)
      const result5 = calculateFiTarget(4000, 5)

      expect(result3).toBeGreaterThan(result4)
      expect(result4).toBeGreaterThan(result5)
      
      // Verify exact calculations
      expect(result3).toBe(1600000) // $48000 / 0.03
      expect(result4).toBe(1200000) // $48000 / 0.04
      expect(result5).toBe(960000)  // $48000 / 0.05
    })

    it('should handle very high spending correctly', () => {
      const result = calculateFiTarget(20000, 4) // $20k/month
      expect(result).toBe(6000000) // $240k/year / 0.04
    })
  })

  describe('calculateFiTargetTracked', () => {
    it('should return correct value with full trace', () => {
      const result = calculateFiTargetTracked(4000, 4)
      
      expect(result.value).toBe(1200000)
      expect(result.trace.name).toBe('FI Target')
      expect(result.trace.category).toBe('fi_target')
      expect(result.trace.inputs.length).toBeGreaterThan(0)
      expect(result.trace.steps).toBeDefined()
      expect(result.trace.steps!.length).toBe(3)
    })

    it('should include all inputs in trace', () => {
      const result = calculateFiTargetTracked(5000, 3.5)
      
      const monthlySpendInput = result.trace.inputs.find(i => i.name === 'Monthly Spend')
      const swrInput = result.trace.inputs.find(i => i.name === 'Safe Withdrawal Rate')
      
      expect(monthlySpendInput?.value).toBe(5000)
      expect(swrInput?.value).toBe(3.5)
    })
  })
})

// ============================================================================
// SWR CALCULATIONS
// ============================================================================

describe('SWR Calculations', () => {
  describe('calculateSwrAmounts', () => {
    it('should calculate correct annual SWR', () => {
      const result = calculateSwrAmounts(1000000, 4)
      expect(result.annual).toBe(40000)
    })

    it('should calculate correct monthly SWR', () => {
      const result = calculateSwrAmounts(1000000, 4)
      expect(result.monthly).toBeCloseTo(3333.33, 1)
    })

    it('should calculate correct weekly SWR', () => {
      const result = calculateSwrAmounts(1000000, 4)
      expect(result.weekly).toBeCloseTo(769.23, 1)
    })

    it('should calculate correct daily SWR', () => {
      const result = calculateSwrAmounts(1000000, 4)
      expect(result.daily).toBeCloseTo(109.59, 1)
    })

    it('should scale proportionally with net worth', () => {
      const result1 = calculateSwrAmounts(500000, 4)
      const result2 = calculateSwrAmounts(1000000, 4)
      
      expect(result2.annual).toBe(result1.annual * 2)
      expect(result2.monthly).toBe(result1.monthly * 2)
    })

    it('should handle zero net worth', () => {
      const result = calculateSwrAmounts(0, 4)
      expect(result.annual).toBe(0)
      expect(result.monthly).toBe(0)
      expect(result.weekly).toBe(0)
      expect(result.daily).toBe(0)
    })
  })

  describe('calculateSwrAmountsTracked', () => {
    it('should return traced values for all periods', () => {
      const result = calculateSwrAmountsTracked(1000000, 4)
      
      expect(result.annual.value).toBe(40000)
      expect(result.annual.trace.name).toBe('Annual SWR')
      
      expect(result.monthly.value).toBeCloseTo(3333.33, 1)
      expect(result.monthly.trace.name).toBe('Monthly SWR')
      
      expect(result.weekly.value).toBeCloseTo(769.23, 1)
      expect(result.daily.value).toBeCloseTo(109.59, 1)
    })
  })
})

// ============================================================================
// GROWTH RATE CALCULATIONS
// ============================================================================

describe('Growth Rate Calculations', () => {
  describe('calculateGrowthRates', () => {
    it('should calculate correct yearly appreciation', () => {
      const result = calculateGrowthRates(1000000, mockSettings, false)
      expect(result.yearlyAppreciation).toBe(70000) // 7% of $1M
    })

    it('should calculate correct per-day rate', () => {
      const result = calculateGrowthRates(1000000, mockSettings, false)
      // $70,000 / 365.25 days
      expect(result.perDay).toBeCloseTo(191.65, 1)
    })

    it('should calculate correct per-hour rate', () => {
      const result = calculateGrowthRates(1000000, mockSettings, false)
      // $70,000 / (365.25 * 24)
      expect(result.perHour).toBeCloseTo(7.99, 1)
    })

    it('should include contributions when enabled', () => {
      const withoutContributions = calculateGrowthRates(1000000, mockSettings, false)
      const withContributions = calculateGrowthRates(1000000, mockSettings, true)
      
      expect(withContributions.perYear).toBe(withoutContributions.perYear + mockSettings.yearlyContribution)
    })

    it('should scale with net worth', () => {
      const result1 = calculateGrowthRates(500000, mockSettings, false)
      const result2 = calculateGrowthRates(1000000, mockSettings, false)
      
      expect(result2.yearlyAppreciation).toBe(result1.yearlyAppreciation * 2)
    })
  })

  describe('calculateGrowthRatesTracked', () => {
    it('should return traced values with correct formulas', () => {
      const result = calculateGrowthRatesTracked(1000000, 7, 20000)
      
      expect(result.perYear.value).toBe(90000) // 70000 appreciation + 20000 contributions
      expect(result.perYear.trace.inputs.some(i => i.name === 'Net Worth')).toBe(true)
      expect(result.perYear.trace.inputs.some(i => i.name === 'Annual Return Rate')).toBe(true)
    })
  })
})

// ============================================================================
// REAL-TIME NET WORTH CALCULATIONS
// ============================================================================

describe('Real-Time Net Worth Calculations', () => {
  describe('calculateRealTimeNetWorth', () => {
    it('should return base amount when entry is recent', () => {
      const recentEntry: NetWorthEntry = {
        ...mockEntry,
        timestamp: Date.now() - 1000, // 1 second ago
      }
      
      const result = calculateRealTimeNetWorth(recentEntry, mockSettings, false)
      
      expect(result.baseAmount).toBe(recentEntry.amount)
      expect(result.total).toBeGreaterThan(result.baseAmount)
      expect(result.appreciation).toBeGreaterThan(0)
    })

    it('should return zeros for null entry', () => {
      const result = calculateRealTimeNetWorth(null, mockSettings, false)
      
      expect(result.total).toBe(0)
      expect(result.baseAmount).toBe(0)
      expect(result.appreciation).toBe(0)
      expect(result.contributions).toBe(0)
    })

    it('should include contributions when enabled', () => {
      const withoutContributions = calculateRealTimeNetWorth(mockEntry, mockSettings, false)
      const withContributions = calculateRealTimeNetWorth(mockEntry, mockSettings, true)
      
      expect(withContributions.contributions).toBeGreaterThan(0)
      expect(withContributions.total).toBeGreaterThan(withoutContributions.total)
    })

    it('should calculate appreciation based on time elapsed', () => {
      const oneYearAgo: NetWorthEntry = {
        ...mockEntry,
        timestamp: Date.now() - (365 * 24 * 60 * 60 * 1000),
      }
      
      const twoYearsAgo: NetWorthEntry = {
        ...mockEntry,
        timestamp: Date.now() - (2 * 365 * 24 * 60 * 60 * 1000),
      }
      
      const result1 = calculateRealTimeNetWorth(oneYearAgo, mockSettings, false)
      const result2 = calculateRealTimeNetWorth(twoYearsAgo, mockSettings, false)
      
      // Two years should have roughly double the appreciation (linear approximation)
      expect(result2.appreciation).toBeGreaterThan(result1.appreciation)
    })
  })

  describe('calculateRealTimeNetWorthTracked', () => {
    it('should return traced values with steps', () => {
      const result = calculateRealTimeNetWorthTracked(
        500000,
        Date.now() - (365 * 24 * 60 * 60 * 1000),
        7,
        false,
        0
      )
      
      expect(result.total.trace.name).toBe('Current Net Worth')
      expect(result.appreciation.trace.name).toBe('Appreciation')
      expect(result.total.trace.steps).toBeDefined()
    })
  })
})

// ============================================================================
// COMPOUND GROWTH CALCULATIONS
// ============================================================================

describe('Compound Growth Calculations', () => {
  describe('calculateFutureValue', () => {
    it('should calculate correct compound growth without contributions', () => {
      // $100,000 at 7% for 10 years
      const result = calculateFutureValue(100000, 7, 10, 0)
      
      // FV = 100000 * (1.07)^10 = $196,715.14
      expect(result.total).toBeCloseTo(196715.14, 0)
    })

    it('should calculate correct compound growth with contributions', () => {
      // $100,000 at 7% for 10 years with $10,000/year contributions
      const result = calculateFutureValue(100000, 7, 10, 10000)
      
      // Principal growth + FV of annuity
      expect(result.total).toBeGreaterThan(196715) // More than just principal growth
      expect(result.totalContributed).toBe(100000) // 10 years * $10,000
    })

    it('should track total interest correctly', () => {
      const result = calculateFutureValue(100000, 7, 10, 10000)
      
      // Total interest = Final value - Initial - Contributions
      const expectedInterest = result.total - 100000 - result.totalContributed
      expect(result.totalInterest).toBeCloseTo(expectedInterest, 0)
    })

    it('should handle zero rate correctly', () => {
      const result = calculateFutureValue(100000, 0, 10, 10000)
      
      expect(result.total).toBe(200000) // Principal + 10 years of contributions
      expect(result.totalInterest).toBe(0)
    })

    it('should handle partial years', () => {
      const fullYear = calculateFutureValue(100000, 7, 1, 0)
      const halfYear = calculateFutureValue(100000, 7, 0.5, 0)
      
      expect(halfYear.total).toBeLessThan(fullYear.total)
      expect(halfYear.total).toBeGreaterThan(100000)
    })
  })

  describe('calculateCompoundGrowthTracked', () => {
    it('should return traced values with all components', () => {
      const result = calculateCompoundGrowthTracked(100000, 7, 10, 10000)
      
      expect(result.total.trace.name).toBe('Future Value')
      expect(result.interest.trace.name).toBe('Total Interest')
      expect(result.contributed.trace.name).toBe('Total Contributed')
      
      expect(result.contributed.value).toBe(100000) // 10 * 10000
    })
  })
})

// ============================================================================
// LEVEL-BASED SPENDING CALCULATIONS
// ============================================================================

describe('Level-Based Spending Calculations', () => {
  describe('calculateLevelBasedSpending', () => {
    it('should calculate base spending at zero net worth', () => {
      const result = calculateLevelBasedSpending(0, mockSettings, 0)
      expect(result).toBe(mockSettings.baseMonthlyBudget)
    })

    it('should increase spending with net worth', () => {
      const atZero = calculateLevelBasedSpending(0, mockSettings, 0)
      const at500k = calculateLevelBasedSpending(500000, mockSettings, 0)
      const at1m = calculateLevelBasedSpending(1000000, mockSettings, 0)
      
      expect(at500k).toBeGreaterThan(atZero)
      expect(at1m).toBeGreaterThan(at500k)
    })

    it('should apply inflation over time', () => {
      const now = calculateLevelBasedSpending(500000, mockSettings, 0)
      const in5Years = calculateLevelBasedSpending(500000, mockSettings, 5)
      const in10Years = calculateLevelBasedSpending(500000, mockSettings, 10)
      
      expect(in5Years).toBeGreaterThan(now)
      expect(in10Years).toBeGreaterThan(in5Years)
    })

    it('should calculate net worth portion correctly', () => {
      // At $1M net worth with 2% spending growth rate
      // Net worth portion = $1,000,000 * 0.02 / 12 = $1,666.67/month
      const result = calculateLevelBasedSpending(1000000, mockSettings, 0)
      
      const expectedNetWorthPortion = 1000000 * (mockSettings.spendingGrowthRate / 100) / 12
      const expectedTotal = mockSettings.baseMonthlyBudget + expectedNetWorthPortion
      
      expect(result).toBeCloseTo(expectedTotal, 2)
    })
  })

  describe('calculateUnlockedSpending', () => {
    it('should match calculateLevelBasedSpending for same inputs', () => {
      const result1 = calculateLevelBasedSpending(500000, mockSettings, 2)
      const result2 = calculateUnlockedSpending(
        500000,
        mockSettings.baseMonthlyBudget,
        mockSettings.spendingGrowthRate,
        2,
        mockSettings.inflationRate
      )
      
      expect(result1).toBeCloseTo(result2, 2)
    })
  })

  describe('calculateLevelBasedSpendingTracked', () => {
    it('should return traced value with all steps', () => {
      const result = calculateLevelBasedSpendingTracked(
        500000,
        3000,
        2,
        3,
        5
      )
      
      expect(result.trace.name).toBe('Level-Based Spending')
      expect(result.trace.category).toBe('spending')
      expect(result.trace.steps).toBeDefined()
      expect(result.trace.steps!.length).toBe(3)
    })
  })
})

// ============================================================================
// INFLATION CALCULATIONS
// ============================================================================

describe('Inflation Calculations', () => {
  describe('adjustForInflation', () => {
    it('should not change value for 0 years', () => {
      const result = adjustForInflation(1000, 0, 3)
      expect(result).toBe(1000)
    })

    it('should increase value for positive years', () => {
      const result = adjustForInflation(1000, 10, 3)
      // $1000 * (1.03)^10 = $1343.92
      expect(result).toBeCloseTo(1343.92, 0)
    })

    it('should handle higher inflation rates', () => {
      const low = adjustForInflation(1000, 10, 2)
      const high = adjustForInflation(1000, 10, 5)
      
      expect(high).toBeGreaterThan(low)
    })

    it('should handle zero inflation', () => {
      const result = adjustForInflation(1000, 10, 0)
      expect(result).toBe(1000)
    })
  })
})

// ============================================================================
// FI PROGRESS CALCULATIONS
// ============================================================================

describe('FI Progress Calculations', () => {
  describe('calculateFiProgressTracked', () => {
    it('should calculate 0% for zero net worth', () => {
      const result = calculateFiProgressTracked(0, 1000000)
      expect(result.value).toBe(0)
    })

    it('should calculate 100% when at FI target', () => {
      const result = calculateFiProgressTracked(1000000, 1000000)
      expect(result.value).toBe(100)
    })

    it('should calculate 50% at halfway', () => {
      const result = calculateFiProgressTracked(500000, 1000000)
      expect(result.value).toBe(50)
    })

    it('should handle exceeding FI target', () => {
      const result = calculateFiProgressTracked(1500000, 1000000)
      expect(result.value).toBe(150)
    })

    it('should handle zero FI target', () => {
      const result = calculateFiProgressTracked(500000, 0)
      expect(result.value).toBe(0)
    })

    it('should return trace with formula', () => {
      const result = calculateFiProgressTracked(750000, 1000000)
      
      expect(result.trace.formula).toContain('FI Progress')
      expect(result.trace.unit).toBe('%')
    })
  })
})

// ============================================================================
// AGE CALCULATIONS
// ============================================================================

describe('Age Calculations', () => {
  describe('calculateAge', () => {
    it('should calculate correct age', () => {
      const result = calculateAge('1990-01-01', 2024)
      expect(result).toBe(34)
    })

    it('should return null for empty birth date', () => {
      const result = calculateAge('', 2024)
      expect(result).toBeNull()
    })

    it('should handle future years', () => {
      const result = calculateAge('1990-01-01', 2050)
      expect(result).toBe(60)
    })
  })
})

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

describe('Formatting Functions', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
    })

    it('should format large numbers with commas', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
    })

    it('should handle custom decimal places', () => {
      expect(formatCurrency(1234.5678, 4)).toBe('$1,234.5678')
      expect(formatCurrency(1234.5678, 0)).toBe('$1,235')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should handle negative numbers', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56')
    })
  })

  describe('formatPercent', () => {
    it('should format percentages correctly', () => {
      // formatPercent takes a value that's already a percentage (e.g., 12.34 for 12.34%)
      expect(formatPercent(12.34)).toBe('12.3%')
    })

    it('should handle custom decimal places', () => {
      expect(formatPercent(12.345, 2)).toBe('12.35%')
    })

    it('should handle whole percentages', () => {
      expect(formatPercent(100, 0)).toBe('100%')
    })
  })
})

// ============================================================================
// LEVEL THRESHOLDS
// ============================================================================

describe('Level Thresholds', () => {
  it('should have unique level numbers', () => {
    const levels = LEVEL_THRESHOLDS.map(l => l.level)
    const uniqueLevels = new Set(levels)
    expect(uniqueLevels.size).toBe(levels.length)
  })

  it('should have increasing thresholds', () => {
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      expect(LEVEL_THRESHOLDS[i].threshold).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1].threshold)
    }
  })

  it('should start at level 1 with 0 threshold', () => {
    expect(LEVEL_THRESHOLDS[0].level).toBe(1)
    expect(LEVEL_THRESHOLDS[0].threshold).toBe(0)
  })

  it('should have 50 levels', () => {
    expect(LEVEL_THRESHOLDS.length).toBe(50)
  })
})

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

describe('Default Settings', () => {
  it('should have reasonable default values', () => {
    expect(DEFAULT_SETTINGS.currentRate).toBeGreaterThan(0)
    expect(DEFAULT_SETTINGS.currentRate).toBeLessThanOrEqual(15)
    
    expect(DEFAULT_SETTINGS.swr).toBeGreaterThan(0)
    expect(DEFAULT_SETTINGS.swr).toBeLessThanOrEqual(10)
    
    expect(DEFAULT_SETTINGS.inflationRate).toBeGreaterThan(0)
    expect(DEFAULT_SETTINGS.inflationRate).toBeLessThanOrEqual(10)
  })

  it('should have all required fields', () => {
    expect(DEFAULT_SETTINGS).toHaveProperty('currentRate')
    expect(DEFAULT_SETTINGS).toHaveProperty('swr')
    expect(DEFAULT_SETTINGS).toHaveProperty('yearlyContribution')
    expect(DEFAULT_SETTINGS).toHaveProperty('birthDate')
    expect(DEFAULT_SETTINGS).toHaveProperty('monthlySpend')
    expect(DEFAULT_SETTINGS).toHaveProperty('inflationRate')
    expect(DEFAULT_SETTINGS).toHaveProperty('baseMonthlyBudget')
    expect(DEFAULT_SETTINGS).toHaveProperty('spendingGrowthRate')
  })
})

// ============================================================================
// CALCULATION BUILDER
// ============================================================================

describe('CalculationBuilder', () => {
  it('should build a complete traced value', () => {
    const result = new CalculationBuilder('test', 'Test Calculation', 'projection')
      .setDescription('A test calculation')
      .setFormula('A + B = C')
      .setUnit('$')
      .addInput('A', 100, '$')
      .addInput('B', 200, '$')
      .addStep('Add values', 'A + B', [], 300)
      .build(300)

    expect(result.value).toBe(300)
    expect(result.trace.name).toBe('Test Calculation')
    expect(result.trace.description).toBe('A test calculation')
    expect(result.trace.formula).toBe('A + B = C')
    expect(result.trace.inputs.length).toBe(2)
    expect(result.trace.steps?.length).toBe(1)
  })

  it('should handle calculations without steps', () => {
    const result = new CalculationBuilder('simple', 'Simple', 'net_worth')
      .addInput('Value', 500)
      .build(500)

    expect(result.trace.steps).toBeUndefined()
  })
})

// ============================================================================
// CONSISTENCY TESTS
// ============================================================================

describe('Calculation Consistency', () => {
  it('should produce consistent FI target across different calculation paths', () => {
    const monthlySpend = 4000
    const swr = 4
    
    // Direct calculation
    const direct = calculateFiTarget(monthlySpend, swr)
    
    // Traced calculation
    const traced = calculateFiTargetTracked(monthlySpend, swr)
    
    // Manual calculation
    const manual = (monthlySpend * 12) / (swr / 100)
    
    expect(direct).toBe(traced.value)
    expect(direct).toBe(manual)
  })

  it('should produce consistent SWR amounts across calculation methods', () => {
    const netWorth = 1000000
    const swr = 4
    
    const direct = calculateSwrAmounts(netWorth, swr)
    const traced = calculateSwrAmountsTracked(netWorth, swr)
    
    expect(direct.annual).toBe(traced.annual.value)
    expect(direct.monthly).toBe(traced.monthly.value)
    expect(direct.weekly).toBe(traced.weekly.value)
    expect(direct.daily).toBe(traced.daily.value)
  })

  it('should verify FI relationship: NetWorth * SWR = AnnualSpend when at FI', () => {
    const monthlySpend = 4000
    const swr = 4
    
    const fiTarget = calculateFiTarget(monthlySpend, swr)
    const swrAmounts = calculateSwrAmounts(fiTarget, swr)
    
    // At FI target, SWR should cover annual spending
    expect(swrAmounts.annual).toBe(monthlySpend * 12)
    expect(swrAmounts.monthly).toBeCloseTo(monthlySpend, 0)
  })

  it('should verify compound growth matches manual calculation', () => {
    const principal = 100000
    const rate = 7
    const years = 10
    
    const result = calculateFutureValue(principal, rate, years, 0)
    
    // Manual compound interest formula
    const manual = principal * Math.pow(1 + rate / 100, years)
    
    expect(result.total).toBeCloseTo(manual, 0)
  })
})
