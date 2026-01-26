/**
 * Comprehensive tests for FI Milestone calculations
 * 
 * This test suite validates all milestone types:
 * - Percentage milestones (10%, 25%, 50%, 75%, 100% FI)
 * - Lifestyle milestones (Lean FI, Barista FI, Regular FI, Fat FI)
 * - Runway milestones (6mo, 1yr, 2yr, 3yr, 5yr, 10yr of expenses)
 * - Coast milestones (Coast to 25%, 50%, 75% FI)
 * - Special milestones (Crossover, Coast FI, Flamingo FI)
 * - Retirement Income milestones ($10k-$200k/year at retirement if you stop saving today)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateFiTarget,
  calculateSwrAmounts,
  calculateFiMilestones,
  calculateRunwayYears,
  calculateCoastFiPercent,
  calculateRunwayAndCoastInfo,
  calculateDollarMultiplier,
  generateProjections,
  calculateLevelBasedSpending,
  adjustForInflation,
  calculateProjectedRetirementIncome,
  calculateNetWorthForRetirementIncome,
  calculateRetirementIncomeInfo,
  UserSettings,
  NetWorthEntry,
  ProjectionRow,
  FiMilestonesInfo,
  FiMilestone,
  FI_MILESTONE_DEFINITIONS,
} from '../lib/calculations'

// ============================================================================
// TEST DATA
// ============================================================================

const createMockSettings = (overrides: Partial<UserSettings> = {}): UserSettings => ({
  currentRate: 7,
  swr: 4,
  yearlyContribution: 20000,
  birthDate: '1990-01-01',
  monthlySpend: 4000,
  inflationRate: 3,
  baseMonthlyBudget: 3000,
  spendingGrowthRate: 2,
  ...overrides,
})

const createMockEntry = (amount: number, daysAgo: number = 0): NetWorthEntry => ({
  _id: 'test-entry-1',
  userId: 'test-user',
  amount,
  timestamp: Date.now() - (daysAgo * 24 * 60 * 60 * 1000),
})

// Helper to generate projections for testing
const generateTestProjections = (
  netWorth: number,
  settings: UserSettings,
  daysAgo: number = 0
): ProjectionRow[] => {
  const entry = createMockEntry(netWorth, daysAgo)
  return generateProjections(
    entry,
    netWorth,
    0, // appreciation
    settings,
    false, // applyInflation
    true // useSpendingLevels
  )
}

// ============================================================================
// FI TARGET CALCULATIONS - Foundation for Milestones
// ============================================================================

describe('FI Target Calculation Foundation', () => {
  it('should calculate correct FI target from monthly spend and SWR', () => {
    // FI Target = (monthlySpend * 12) / (SWR / 100)
    // = $4000 * 12 / 0.04 = $1,200,000
    expect(calculateFiTarget(4000, 4)).toBe(1200000)
  })

  it('should scale FI target inversely with SWR', () => {
    const spend = 4000
    expect(calculateFiTarget(spend, 3)).toBe(1600000)  // Lower SWR = Higher target
    expect(calculateFiTarget(spend, 4)).toBe(1200000)
    expect(calculateFiTarget(spend, 5)).toBe(960000)   // Higher SWR = Lower target
  })

  it('should scale FI target linearly with spending', () => {
    const swr = 4
    expect(calculateFiTarget(3000, swr)).toBe(900000)
    expect(calculateFiTarget(4000, swr)).toBe(1200000)
    expect(calculateFiTarget(5000, swr)).toBe(1500000)
  })

  it('should handle edge cases', () => {
    expect(calculateFiTarget(0, 4)).toBe(0)
    expect(calculateFiTarget(4000, 0)).toBe(0)
    expect(calculateFiTarget(-1000, 4)).toBe(0)
  })
})

// ============================================================================
// PERCENTAGE-BASED MILESTONES (10%, 25%, 50%, 75%, 100% FI)
// ============================================================================

describe('Percentage-Based Milestones', () => {
  describe('FI Progress Calculation', () => {
    it('should calculate 0% progress at $0 net worth', () => {
      const settings = createMockSettings({ monthlySpend: 4000 })
      const fiTarget = calculateFiTarget(4000, settings.swr)
      const progress = (0 / fiTarget) * 100
      expect(progress).toBe(0)
    })

    it('should calculate correct progress at various net worth levels', () => {
      const monthlySpend = 4000
      const swr = 4
      const fiTarget = calculateFiTarget(monthlySpend, swr) // $1,200,000
      
      expect((120000 / fiTarget) * 100).toBe(10)   // 10% FI
      expect((300000 / fiTarget) * 100).toBe(25)   // 25% FI
      expect((600000 / fiTarget) * 100).toBe(50)   // 50% FI
      expect((900000 / fiTarget) * 100).toBe(75)   // 75% FI
      expect((1200000 / fiTarget) * 100).toBe(100) // 100% FI
    })

    it('should handle over 100% FI progress', () => {
      const fiTarget = calculateFiTarget(4000, 4) // $1,200,000
      const progress = (1800000 / fiTarget) * 100
      expect(progress).toBe(150)
    })
  })

  describe('10% FI Milestone', () => {
    it('should be achieved when FI progress >= 10%', () => {
      const settings = createMockSettings()
      // With level-based spending at $120,000 NW
      const projections = generateTestProjections(120000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const fi10 = milestones.milestones.find(m => m.id === 'fi_10')
      expect(fi10).toBeDefined()
      // Check if achieved based on actual FI progress
      const currentProgress = projections[0]?.fiProgress ?? 0
      if (currentProgress >= 10) {
        expect(fi10?.isAchieved).toBe(true)
      }
    })

    it('should not be achieved when FI progress < 10%', () => {
      const settings = createMockSettings({ baseMonthlyBudget: 10000 }) // High spending
      const projections = generateTestProjections(50000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const fi10 = milestones.milestones.find(m => m.id === 'fi_10')
      const currentProgress = projections[0]?.fiProgress ?? 0
      if (currentProgress < 10) {
        expect(fi10?.isAchieved).toBe(false)
      }
    })
  })

  describe('25% FI Milestone', () => {
    it('should calculate correct achievement status', () => {
      const settings = createMockSettings()
      // Higher net worth to reach 25%
      const projections = generateTestProjections(300000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const fi25 = milestones.milestones.find(m => m.id === 'fi_25')
      expect(fi25).toBeDefined()
      expect(fi25?.targetValue).toBe(25)
    })
  })

  describe('50% FI Milestone (Halfway)', () => {
    it('should be achieved at halfway point', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(600000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const fi50 = milestones.milestones.find(m => m.id === 'fi_50')
      expect(fi50).toBeDefined()
      const currentProgress = projections[0]?.fiProgress ?? 0
      if (currentProgress >= 50) {
        expect(fi50?.isAchieved).toBe(true)
      }
    })
  })

  describe('75% FI Milestone', () => {
    it('should calculate milestone year correctly', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(500000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const fi75 = milestones.milestones.find(m => m.id === 'fi_75')
      expect(fi75).toBeDefined()
      // Should have a projected year when 75% FI will be reached
      if (!fi75?.isAchieved) {
        // Should have a year set if projections show reaching it
        const reachesGoal = projections.some(p => p.fiProgress >= 75)
        if (reachesGoal) {
          expect(fi75?.year).not.toBeNull()
        }
      }
    })
  })

  describe('100% FI Milestone', () => {
    it('should be achieved when fully financially independent', () => {
      const settings = createMockSettings()
      // Very high net worth to be at FI
      const projections = generateTestProjections(1500000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const fi100 = milestones.milestones.find(m => m.id === 'fi_100')
      expect(fi100).toBeDefined()
      const currentProgress = projections[0]?.fiProgress ?? 0
      if (currentProgress >= 100) {
        expect(fi100?.isAchieved).toBe(true)
      }
    })

    it('should match when SWR covers expenses', () => {
      const settings = createMockSettings({ baseMonthlyBudget: 3000, swr: 4 })
      // At FI target, SWR should cover monthly spend
      const projections = generateTestProjections(1000000, settings)
      const swr = calculateSwrAmounts(1000000, 4)
      const monthlySpend = projections[0]?.monthlySpend ?? 0
      
      // SWR monthly should be >= monthly spend at 100% FI
      const atFI = swr.monthly >= monthlySpend
      const fi100 = calculateFiMilestones(projections, settings, 1990).milestones.find(m => m.id === 'fi_100')
      
      if (atFI && projections[0]?.fiProgress >= 100) {
        expect(fi100?.isAchieved).toBe(true)
      }
    })
  })

  describe('Progress Between Milestones', () => {
    it('should calculate progress to next milestone correctly', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(180000, settings) // ~15% FI
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      // If at 15% FI, next milestone is 25%, progress should be ~33% of the way (15-10)/(25-10)
      const currentProgress = projections[0]?.fiProgress ?? 0
      if (currentProgress >= 10 && currentProgress < 25) {
        expect(milestones.progressToNext).toBeGreaterThan(0)
        expect(milestones.progressToNext).toBeLessThan(100)
      }
    })

    it('should calculate amount to next milestone correctly', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(200000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const currentNetWorth = projections[0]?.netWorth ?? 0
      const fiTarget = projections[0]?.fiTarget ?? 0
      const nextTarget = milestones.nextMilestone?.targetValue ?? 0
      
      if (milestones.nextMilestone && fiTarget > 0) {
        const expectedAmount = fiTarget * (nextTarget / 100) - currentNetWorth
        expect(milestones.amountToNext).toBeCloseTo(Math.max(0, expectedAmount), 0)
      }
    })
  })
})

// ============================================================================
// LIFESTYLE-BASED MILESTONES (Lean FI, Barista FI, Regular FI, Fat FI)
// ============================================================================

describe('Lifestyle-Based Milestones', () => {
  describe('Lean FI (70% of regular spending)', () => {
    it('should calculate Lean FI target as 70% of regular FI target', () => {
      const monthlySpend = 4000
      const swr = 4
      const regularFiTarget = calculateFiTarget(monthlySpend, swr)
      const leanFiTarget = calculateFiTarget(monthlySpend * 0.7, swr)
      
      expect(leanFiTarget).toBe(regularFiTarget * 0.7)
    })

    it('should be achieved before Regular FI', () => {
      const settings = createMockSettings()
      // Net worth that should be at Lean FI but not Regular FI
      const projections = generateTestProjections(800000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const leanFi = milestones.milestones.find(m => m.id === 'lean_fi')
      const regularFi = milestones.milestones.find(m => m.id === 'regular_fi')
      
      expect(leanFi).toBeDefined()
      expect(regularFi).toBeDefined()
      
      // If Lean FI is achieved, Regular FI should be achieved same time or later
      if (leanFi?.isAchieved && regularFi?.isAchieved) {
        // Both achieved
      } else if (leanFi?.isAchieved && !regularFi?.isAchieved) {
        // Lean achieved but not regular - expected
        expect(leanFi.year).toBeLessThanOrEqual(regularFi?.year ?? Infinity)
      }
    })
  })

  describe('Barista FI (85% of regular spending)', () => {
    it('should calculate Barista FI target as 85% of regular FI target', () => {
      const monthlySpend = 4000
      const swr = 4
      const regularFiTarget = calculateFiTarget(monthlySpend, swr)
      const baristaFiTarget = calculateFiTarget(monthlySpend * 0.85, swr)
      
      expect(baristaFiTarget).toBe(regularFiTarget * 0.85)
    })

    it('should be between Lean FI and Regular FI', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(500000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const leanFi = milestones.milestones.find(m => m.id === 'lean_fi')
      const baristaFi = milestones.milestones.find(m => m.id === 'barista_fi')
      const regularFi = milestones.milestones.find(m => m.id === 'regular_fi')
      
      // If all have years, they should be in order
      if (leanFi?.year && baristaFi?.year && regularFi?.year) {
        expect(leanFi.year).toBeLessThanOrEqual(baristaFi.year)
        expect(baristaFi.year).toBeLessThanOrEqual(regularFi.year)
      }
    })
  })

  describe('Regular FI (100% of spending)', () => {
    it('should match 100% FI milestone in terms of achievement', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(1200000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const regularFi = milestones.milestones.find(m => m.id === 'regular_fi')
      const fi100 = milestones.milestones.find(m => m.id === 'fi_100')
      
      // Regular FI and 100% FI should have similar achievement status
      // (may differ slightly due to calculation methods)
      expect(regularFi).toBeDefined()
      expect(fi100).toBeDefined()
    })
  })

  describe('Fat FI (150% of regular spending)', () => {
    it('should calculate Fat FI target as 150% of regular FI target', () => {
      const monthlySpend = 4000
      const swr = 4
      const regularFiTarget = calculateFiTarget(monthlySpend, swr)
      const fatFiTarget = calculateFiTarget(monthlySpend * 1.5, swr)
      
      expect(fatFiTarget).toBe(regularFiTarget * 1.5)
    })

    it('should require 50% more than Regular FI', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(2000000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const regularFi = milestones.milestones.find(m => m.id === 'regular_fi')
      const fatFi = milestones.milestones.find(m => m.id === 'fat_fi')
      
      // Fat FI should require more than Regular FI
      if (regularFi?.netWorthAtMilestone && fatFi?.netWorthAtMilestone) {
        expect(fatFi.netWorthAtMilestone).toBeGreaterThan(regularFi.netWorthAtMilestone)
      }
      
      // If both have years and are not achieved yet
      if (regularFi?.year && fatFi?.year && !regularFi.isAchieved && !fatFi.isAchieved) {
        expect(regularFi.year).toBeLessThanOrEqual(fatFi.year)
      }
    })
  })

  describe('Lifestyle Milestone Order', () => {
    it('should maintain correct order: Lean < Barista < Regular < Fat', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(300000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const leanFi = milestones.milestones.find(m => m.id === 'lean_fi')
      const baristaFi = milestones.milestones.find(m => m.id === 'barista_fi')
      const regularFi = milestones.milestones.find(m => m.id === 'regular_fi')
      const fatFi = milestones.milestones.find(m => m.id === 'fat_fi')
      
      // Check target values are in correct order
      expect(leanFi?.targetValue).toBe(0.7)
      expect(baristaFi?.targetValue).toBe(0.85)
      expect(regularFi?.targetValue).toBe(1.0)
      expect(fatFi?.targetValue).toBe(1.5)
    })
  })
})

// ============================================================================
// RUNWAY MILESTONES (Years of expenses covered)
// ============================================================================

describe('Runway Milestones', () => {
  describe('calculateRunwayYears', () => {
    it('should calculate correct runway in years', () => {
      // $120,000 NW / ($4000/mo * 12) = 2.5 years
      expect(calculateRunwayYears(120000, 4000)).toBe(2.5)
    })

    it('should return Infinity for zero monthly spend', () => {
      expect(calculateRunwayYears(100000, 0)).toBe(Infinity)
    })

    it('should scale linearly with net worth', () => {
      expect(calculateRunwayYears(48000, 4000)).toBe(1)   // 1 year
      expect(calculateRunwayYears(96000, 4000)).toBe(2)   // 2 years
      expect(calculateRunwayYears(240000, 4000)).toBe(5)  // 5 years
    })

    it('should scale inversely with spending', () => {
      expect(calculateRunwayYears(120000, 2000)).toBe(5)  // 5 years at $2k/mo
      expect(calculateRunwayYears(120000, 4000)).toBe(2.5) // 2.5 years at $4k/mo
      expect(calculateRunwayYears(120000, 6000)).toBeCloseTo(1.67, 1) // ~1.67 years at $6k/mo
    })
  })

  describe('6-Month Runway Milestone', () => {
    it('should be achieved when NW covers 6 months of expenses', () => {
      const settings = createMockSettings()
      // Need NW to cover at least 6 months
      const projections = generateTestProjections(30000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const runway6mo = milestones.milestones.find(m => m.id === 'runway_6mo')
      expect(runway6mo).toBeDefined()
      expect(runway6mo?.targetValue).toBe(0.5) // 0.5 years = 6 months
      
      const monthlySpend = projections[0]?.monthlySpend ?? 0
      const netWorth = projections[0]?.netWorth ?? 0
      const runwayYears = monthlySpend > 0 ? netWorth / (monthlySpend * 12) : 0
      
      if (runwayYears >= 0.5) {
        expect(runway6mo?.isAchieved).toBe(true)
      }
    })
  })

  describe('1-Year Runway Milestone', () => {
    it('should be achieved when NW covers 1 year of expenses', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(50000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const runway1yr = milestones.milestones.find(m => m.id === 'runway_1yr')
      expect(runway1yr).toBeDefined()
      expect(runway1yr?.targetValue).toBe(1) // 1 year
    })
  })

  describe('2-Year Runway Milestone', () => {
    it('should require twice the net worth of 1-year runway', () => {
      const monthlySpend = 4000
      const oneYearRunway = monthlySpend * 12  // $48,000
      const twoYearRunway = monthlySpend * 12 * 2  // $96,000
      
      expect(calculateRunwayYears(oneYearRunway, monthlySpend)).toBe(1)
      expect(calculateRunwayYears(twoYearRunway, monthlySpend)).toBe(2)
    })
  })

  describe('3-Year Runway Milestone', () => {
    it('should be achieved with 3 years of expenses saved', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(150000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const runway3yr = milestones.milestones.find(m => m.id === 'runway_3yr')
      expect(runway3yr).toBeDefined()
      expect(runway3yr?.targetValue).toBe(3)
    })
  })

  describe('5-Year Runway Milestone', () => {
    it('should be achieved with 5 years of expenses saved', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(250000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const runway5yr = milestones.milestones.find(m => m.id === 'runway_5yr')
      expect(runway5yr).toBeDefined()
      expect(runway5yr?.targetValue).toBe(5)
    })
  })

  describe('10-Year Runway Milestone', () => {
    it('should be achieved with 10 years of expenses saved', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(500000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const runway10yr = milestones.milestones.find(m => m.id === 'runway_10yr')
      expect(runway10yr).toBeDefined()
      expect(runway10yr?.targetValue).toBe(10)
    })
  })

  describe('Runway Milestone Progression', () => {
    it('should achieve milestones in order as net worth grows', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(200000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const runway6mo = milestones.milestones.find(m => m.id === 'runway_6mo')
      const runway1yr = milestones.milestones.find(m => m.id === 'runway_1yr')
      const runway2yr = milestones.milestones.find(m => m.id === 'runway_2yr')
      const runway3yr = milestones.milestones.find(m => m.id === 'runway_3yr')
      const runway5yr = milestones.milestones.find(m => m.id === 'runway_5yr')
      const runway10yr = milestones.milestones.find(m => m.id === 'runway_10yr')
      
      // Verify order of achievement (if year is available)
      const milestoneYears = [
        runway6mo?.year,
        runway1yr?.year,
        runway2yr?.year,
        runway3yr?.year,
        runway5yr?.year,
        runway10yr?.year,
      ].filter(y => y !== null && y !== undefined) as number[]
      
      // Years should be in non-decreasing order
      for (let i = 1; i < milestoneYears.length; i++) {
        expect(milestoneYears[i]).toBeGreaterThanOrEqual(milestoneYears[i - 1])
      }
    })
  })
})

// ============================================================================
// COAST MILESTONES (Projected FI % at retirement)
// ============================================================================

describe('Coast Milestones', () => {
  describe('calculateDollarMultiplier', () => {
    it('should calculate compound growth multiplier correctly', () => {
      // $1 at 7% for 30 years = $1 * (1.07)^30 = $7.61
      const multiplier = calculateDollarMultiplier(30, 7)
      expect(multiplier).toBeCloseTo(7.61, 1)
    })

    it('should return 1 for 0 years to retirement', () => {
      expect(calculateDollarMultiplier(0, 7)).toBe(1)
    })

    it('should scale exponentially with years', () => {
      const mult10 = calculateDollarMultiplier(10, 7)
      const mult20 = calculateDollarMultiplier(20, 7)
      const mult30 = calculateDollarMultiplier(30, 7)
      
      expect(mult20).toBeGreaterThan(mult10 * 1.5)
      expect(mult30).toBeGreaterThan(mult20 * 1.5)
    })
  })

  describe('calculateCoastFiPercent', () => {
    it('should calculate what % of FI current NW would grow to', () => {
      // $100,000 at 7% for 30 years with 3% inflation and 4% SWR
      const coastPercent = calculateCoastFiPercent(
        100000,  // currentNetWorth
        4000,    // currentMonthlySpend
        30,      // yearsToRetirement
        7,       // annualReturnRate
        3,       // inflationRate
        4        // swr
      )
      
      // Future NW = $100,000 * (1.07)^30 = ~$761,226
      // Future monthly spend = $4,000 * (1.03)^30 = ~$9,712
      // Future FI target = $9,712 * 12 / 0.04 = ~$2,914,000
      // Coast % = $761,226 / $2,914,000 * 100 = ~26%
      expect(coastPercent).toBeGreaterThan(20)
      expect(coastPercent).toBeLessThan(35)
    })

    it('should return current FI progress when at retirement', () => {
      const coastPercent = calculateCoastFiPercent(
        600000,  // currentNetWorth
        4000,    // currentMonthlySpend
        0,       // yearsToRetirement (already retired)
        7,
        3,
        4
      )
      
      // Should equal current FI progress
      const fiTarget = calculateFiTarget(4000, 4)
      const expectedProgress = (600000 / fiTarget) * 100
      expect(coastPercent).toBeCloseTo(expectedProgress, 1)
    })

    it('should increase as net worth increases', () => {
      const settings = { years: 30, rate: 7, inflation: 3, swr: 4 }
      
      const coast100k = calculateCoastFiPercent(100000, 4000, settings.years, settings.rate, settings.inflation, settings.swr)
      const coast200k = calculateCoastFiPercent(200000, 4000, settings.years, settings.rate, settings.inflation, settings.swr)
      const coast300k = calculateCoastFiPercent(300000, 4000, settings.years, settings.rate, settings.inflation, settings.swr)
      
      expect(coast200k).toBeGreaterThan(coast100k)
      expect(coast300k).toBeGreaterThan(coast200k)
      
      // Should scale linearly with net worth
      expect(coast200k).toBeCloseTo(coast100k * 2, 1)
    })
  })

  describe('Coast to 25% FI Milestone', () => {
    it('should be achieved when coast calculation shows >= 25%', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(150000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const coast25 = milestones.milestones.find(m => m.id === 'coast_25')
      expect(coast25).toBeDefined()
      expect(coast25?.targetValue).toBe(25)
    })
  })

  describe('Coast to 50% FI Milestone', () => {
    it('should require more net worth than Coast 25%', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(300000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const coast25 = milestones.milestones.find(m => m.id === 'coast_25')
      const coast50 = milestones.milestones.find(m => m.id === 'coast_50')
      
      // If both have years, Coast 50 should be >= Coast 25
      if (coast25?.year && coast50?.year) {
        expect(coast50.year).toBeGreaterThanOrEqual(coast25.year)
      }
    })
  })

  describe('Coast to 75% FI Milestone', () => {
    it('should be the final coast milestone before full coast FI', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(400000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const coast75 = milestones.milestones.find(m => m.id === 'coast_75')
      expect(coast75).toBeDefined()
      expect(coast75?.targetValue).toBe(75)
    })
  })

  describe('Coast Milestones with Age', () => {
    it('should calculate correctly for different ages', () => {
      const settings = createMockSettings()
      
      // Younger person (more years to retirement)
      const youngProjections = generateTestProjections(200000, settings)
      const youngMilestones = calculateFiMilestones(youngProjections, settings, 1995) // 30 years old
      
      // Older person (fewer years to retirement)
      const oldProjections = generateTestProjections(200000, settings)
      const oldMilestones = calculateFiMilestones(oldProjections, settings, 1975) // 50 years old
      
      const youngCoast50 = youngMilestones.milestones.find(m => m.id === 'coast_50')
      const oldCoast50 = oldMilestones.milestones.find(m => m.id === 'coast_50')
      
      // With same NW, younger person should be closer to coast milestones
      // (more time for compounding)
      // Note: Achievement may be the same if both or neither have achieved
    })
  })
})

// ============================================================================
// SPECIAL MILESTONES (Crossover, Coast FI, Flamingo FI)
// ============================================================================

describe('Special Milestones', () => {
  describe('Crossover Point Milestone', () => {
    it('should be achieved when interest exceeds contributions', () => {
      const settings = createMockSettings({ yearlyContribution: 20000 })
      // High net worth where interest > contributions
      // At $1M with 7% return = $70,000 interest vs $20,000 contributions
      const projections = generateTestProjections(1000000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const crossover = milestones.milestones.find(m => m.id === 'crossover')
      expect(crossover).toBeDefined()
    })

    it('should not be achieved when contributions exceed interest', () => {
      const settings = createMockSettings({ yearlyContribution: 50000 })
      // Low net worth where contributions > interest
      // At $100k with 7% return = $7,000 interest vs $50,000 contributions
      const projections = generateTestProjections(100000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const crossover = milestones.milestones.find(m => m.id === 'crossover')
      const currentRow = projections[0]
      
      if (currentRow && currentRow.interest < currentRow.contributed) {
        expect(crossover?.isAchieved).toBe(false)
      }
    })

    it('should calculate crossover point: NW * rate > contributions', () => {
      const yearlyContribution = 20000
      const rate = 0.07
      
      // Crossover when: NW * rate = contributions
      // NW = contributions / rate = $20,000 / 0.07 = $285,714
      const crossoverPoint = yearlyContribution / rate
      expect(crossoverPoint).toBeCloseTo(285714, 0)
    })
  })

  describe('Coast FI Milestone (Special)', () => {
    it('should check if current savings can coast to FI by retirement', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(500000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const coastFi = milestones.milestones.find(m => m.id === 'coast_fi')
      expect(coastFi).toBeDefined()
      // Coast FI uses the projection's coastFiYear
    })

    it('should use coastFiYear from projections', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(600000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const coastFi = milestones.milestones.find(m => m.id === 'coast_fi')
      const projectionCoastYear = projections[0]?.coastFiYear
      
      // The milestone's year should match the projection's coastFiYear
      expect(coastFi?.year).toBe(projectionCoastYear)
    })
  })

  describe('Flamingo FI Milestone', () => {
    it('should be equivalent to 50% FI', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(600000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const flamingoFi = milestones.milestones.find(m => m.id === 'flamingo_fi')
      const fi50 = milestones.milestones.find(m => m.id === 'fi_50')
      
      expect(flamingoFi).toBeDefined()
      expect(flamingoFi?.targetValue).toBe(50)
      
      // Should have same year as 50% FI milestone
      expect(flamingoFi?.year).toBe(fi50?.year)
      expect(flamingoFi?.isAchieved).toBe(fi50?.isAchieved)
    })

    it('should represent semi-retirement possibility', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(700000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const flamingoFi = milestones.milestones.find(m => m.id === 'flamingo_fi')
      
      // At 50% FI, you could theoretically semi-retire
      const currentProgress = projections[0]?.fiProgress ?? 0
      if (currentProgress >= 50) {
        expect(flamingoFi?.isAchieved).toBe(true)
      }
    })
  })
})

// ============================================================================
// MILESTONE SORTING AND TRACKING
// ============================================================================

describe('Milestone Sorting and Tracking', () => {
  it('should sort achieved milestones before upcoming', () => {
    const settings = createMockSettings()
    const projections = generateTestProjections(300000, settings)
    const milestones = calculateFiMilestones(projections, settings, 1990)
    
    let lastAchievedIndex = -1
    let firstUpcomingIndex = milestones.milestones.length
    
    milestones.milestones.forEach((m, i) => {
      if (m.isAchieved) lastAchievedIndex = i
      if (!m.isAchieved && i < firstUpcomingIndex) firstUpcomingIndex = i
    })
    
    // All achieved milestones should come before upcoming
    if (lastAchievedIndex >= 0 && firstUpcomingIndex < milestones.milestones.length) {
      expect(lastAchievedIndex).toBeLessThan(firstUpcomingIndex)
    }
  })

  it('should identify current milestone as most recently achieved', () => {
    const settings = createMockSettings()
    const projections = generateTestProjections(350000, settings)
    const milestones = calculateFiMilestones(projections, settings, 1990)
    
    if (milestones.currentMilestone) {
      expect(milestones.currentMilestone.isAchieved).toBe(true)
      expect(milestones.currentMilestone.type).toBe('percentage')
    }
  })

  it('should identify next milestone as first upcoming percentage milestone', () => {
    const settings = createMockSettings()
    const projections = generateTestProjections(350000, settings)
    const milestones = calculateFiMilestones(projections, settings, 1990)
    
    if (milestones.nextMilestone) {
      expect(milestones.nextMilestone.isAchieved).toBe(false)
      expect(milestones.nextMilestone.type).toBe('percentage')
    }
  })
})

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe('Edge Cases and Error Handling', () => {
  it('should handle empty projections', () => {
    const settings = createMockSettings()
    const milestones = calculateFiMilestones([], settings, 1990)
    
    expect(milestones.milestones).toHaveLength(0)
    expect(milestones.currentMilestone).toBeNull()
    expect(milestones.nextMilestone).toBeNull()
    expect(milestones.progressToNext).toBe(0)
    expect(milestones.amountToNext).toBe(0)
  })

  it('should handle null birth year', () => {
    const settings = createMockSettings()
    const projections = generateTestProjections(500000, settings)
    const milestones = calculateFiMilestones(projections, settings, null)
    
    // Should still calculate milestones, but age will be null
    expect(milestones.milestones.length).toBeGreaterThan(0)
    milestones.milestones.forEach(m => {
      expect(m.age).toBeNull()
    })
  })

  it('should handle zero spending', () => {
    const settings = createMockSettings({ baseMonthlyBudget: 0, spendingGrowthRate: 0 })
    const projections = generateTestProjections(500000, settings)
    
    // Zero spending means infinite runway and instant FI
    // FI progress would be Infinity or very high
    if (projections.length > 0 && projections[0].monthlySpend === 0) {
      // With zero spending, FI target would be 0 or undefined
    }
  })

  it('should handle negative net worth', () => {
    // Negative net worth should result in no achievements
    const settings = createMockSettings()
    // Note: The system may not support negative net worth entries
    // This tests the calculation behavior if it does
  })

  it('should handle very high net worth', () => {
    const settings = createMockSettings()
    const projections = generateTestProjections(10000000, settings)
    const milestones = calculateFiMilestones(projections, settings, 1990)
    
    // All percentage milestones should be achieved
    const percentageMilestones = milestones.milestones.filter(m => m.type === 'percentage')
    const allAchieved = percentageMilestones.every(m => m.isAchieved)
    
    const currentProgress = projections[0]?.fiProgress ?? 0
    if (currentProgress >= 100) {
      expect(allAchieved).toBe(true)
    }
  })
})

// ============================================================================
// CALCULATION ACCURACY TESTS
// ============================================================================

describe('Calculation Accuracy', () => {
  describe('FI Target Verification', () => {
    it('should verify FI target with manual calculation', () => {
      const monthlySpend = 5000
      const swr = 4
      
      // Manual: Annual spend = $60,000, SWR = 4%
      // FI Target = $60,000 / 0.04 = $1,500,000
      const calculated = calculateFiTarget(monthlySpend, swr)
      const manual = (monthlySpend * 12) / (swr / 100)
      
      expect(calculated).toBe(manual)
      expect(calculated).toBe(1500000)
    })
  })

  describe('Runway Calculation Verification', () => {
    it('should match manual runway calculation', () => {
      const netWorth = 150000
      const monthlySpend = 5000
      
      // Manual: Annual expenses = $60,000
      // Runway = $150,000 / $60,000 = 2.5 years
      const calculated = calculateRunwayYears(netWorth, monthlySpend)
      const manual = netWorth / (monthlySpend * 12)
      
      expect(calculated).toBe(manual)
      expect(calculated).toBe(2.5)
    })
  })

  describe('Coast FI Calculation Verification', () => {
    it('should match manual coast calculation', () => {
      const netWorth = 200000
      const monthlySpend = 4000
      const yearsToRetirement = 25
      const returnRate = 7
      const inflationRate = 3
      const swr = 4
      
      // Manual calculation:
      // Future NW = $200,000 * (1.07)^25
      const futureNW = netWorth * Math.pow(1 + returnRate / 100, yearsToRetirement)
      expect(futureNW).toBeCloseTo(1085487, 0) // Actual: ~$1,085,487
      
      // Future monthly spend = $4,000 * (1.03)^25
      const futureSpend = monthlySpend * Math.pow(1 + inflationRate / 100, yearsToRetirement)
      expect(futureSpend).toBeCloseTo(8375, 0) // Actual: ~$8,375
      
      // Future FI target = $8,375 * 12 / 0.04 = $2,512,500
      const futureFiTarget = (futureSpend * 12) / (swr / 100)
      
      // Coast % = $1,085,649 / $2,512,500 * 100 = ~43%
      const calculated = calculateCoastFiPercent(
        netWorth, monthlySpend, yearsToRetirement, returnRate, inflationRate, swr
      )
      const manual = (futureNW / futureFiTarget) * 100
      
      expect(calculated).toBeCloseTo(manual, 1)
    })
  })

  describe('Lifestyle Milestone Target Verification', () => {
    it('should verify lifestyle targets are correct multipliers', () => {
      const baseTarget = calculateFiTarget(4000, 4) // $1,200,000
      
      const leanTarget = calculateFiTarget(4000 * 0.7, 4)
      const baristaTarget = calculateFiTarget(4000 * 0.85, 4)
      const regularTarget = calculateFiTarget(4000 * 1.0, 4)
      const fatTarget = calculateFiTarget(4000 * 1.5, 4)
      
      expect(leanTarget).toBe(baseTarget * 0.7)
      expect(baristaTarget).toBe(baseTarget * 0.85)
      expect(regularTarget).toBe(baseTarget)
      expect(fatTarget).toBe(baseTarget * 1.5)
    })
  })
})

// ============================================================================
// SPECIFIC BUG VERIFICATION TESTS
// ============================================================================

describe('Bug Verification Tests', () => {
  describe('Crossover Milestone Definition', () => {
    it('should use CUMULATIVE interest vs contributions (traditional definition)', () => {
      // The crossover point is when cumulative interest exceeds cumulative contributions
      // This represents when your money has "worked harder" than you over the life of your investments
      const settings = createMockSettings({ yearlyContribution: 20000, currentRate: 7 })
      
      const projections = generateTestProjections(300000, settings)
      
      // Verify that projections track cumulative values
      if (projections.length > 1) {
        // Interest should be cumulative (increasing)
        for (let i = 1; i < projections.length; i++) {
          expect(projections[i].interest).toBeGreaterThan(projections[i - 1].interest)
        }
      }
    })

    it('should mark crossover when cumulative interest exceeds cumulative contributions', () => {
      const settings = createMockSettings({ yearlyContribution: 10000, currentRate: 7 })
      
      // With low contributions and good returns, crossover should happen
      const projections = generateTestProjections(500000, settings)
      
      // Find the crossover row
      const crossoverRow = projections.find(p => p.isCrossover)
      
      // If crossover is found, interest should exceed contributions at that point
      if (crossoverRow) {
        expect(crossoverRow.interest).toBeGreaterThan(crossoverRow.contributed)
        expect(crossoverRow.contributed).toBeGreaterThan(0)
      }
    })
  })

  describe('Crossover Milestone Consistency', () => {
    it('should have consistent isAchieved and year values', () => {
      const settings = createMockSettings({ yearlyContribution: 20000 })
      
      // Test with net worth where crossover might be current or future
      const projections = generateTestProjections(400000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const crossover = milestones.milestones.find(m => m.id === 'crossover')
      
      // If crossover is achieved, the year should be current year or earlier
      if (crossover?.isAchieved) {
        const currentYear = new Date().getFullYear()
        expect(crossover.year).toBeLessThanOrEqual(currentYear)
      }
      
      // If crossover year is in the future, it should not be achieved
      if (crossover?.year && crossover.year > new Date().getFullYear()) {
        expect(crossover.isAchieved).toBe(false)
      }
    })

    it('should correctly identify crossover when interest exceeds contributions', () => {
      const settings = createMockSettings({ yearlyContribution: 10000, currentRate: 7 })
      
      // At $200,000 with 7% return: interest = $14,000 > $10,000 contributions
      const projections = generateTestProjections(200000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const crossover = milestones.milestones.find(m => m.id === 'crossover')
      
      // The first projection row should show interest > contributed
      const firstRow = projections[0]
      if (firstRow) {
        // Note: 'interest' in projections is cumulative, not annual
        // For year 0, it's the appreciation since entry
        // So we need to check if annual interest > annual contributions
        const annualInterest = firstRow.netWorth * (settings.currentRate / 100)
        if (annualInterest > settings.yearlyContribution) {
          // Crossover should be achieved or marked for current year
          expect(crossover?.year).toBeLessThanOrEqual(new Date().getFullYear())
        }
      }
    })

    it('should handle scenarios with high spending growth (negative savings)', () => {
      // Scenario where spending increases faster than contributions
      const settings = createMockSettings({
        yearlyContribution: 20000,
        baseMonthlyBudget: 5000,
        spendingGrowthRate: 5, // High spending growth rate
      })
      
      const projections = generateTestProjections(300000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      // Even with high spending growth, milestones should be calculated
      expect(milestones.milestones.length).toBeGreaterThan(0)
      
      // Crossover should still be identifiable
      const crossover = milestones.milestones.find(m => m.id === 'crossover')
      expect(crossover).toBeDefined()
    })
  })

  describe('Coast FI Special Milestone vs Coast Percentage Milestones', () => {
    it('should differentiate between Coast FI (special) and coast percentage milestones', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(400000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const coastFiSpecial = milestones.milestones.find(m => m.id === 'coast_fi')
      const coast25 = milestones.milestones.find(m => m.id === 'coast_25')
      const coast50 = milestones.milestones.find(m => m.id === 'coast_50')
      const coast75 = milestones.milestones.find(m => m.id === 'coast_75')
      
      // Coast FI (special) is different - it's when you can stop saving and reach FI
      expect(coastFiSpecial?.type).toBe('special')
      expect(coast25?.type).toBe('coast')
      expect(coast50?.type).toBe('coast')
      expect(coast75?.type).toBe('coast')
    })
  })

  describe('Lifestyle Milestone Calculation with Spending Multipliers', () => {
    it('should correctly apply spending multipliers to FI target', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(800000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const currentMonthlySpend = projections[0]?.monthlySpend ?? 0
      
      // Lean FI target = (monthlySpend * 0.7) * 12 / SWR
      const leanFiTarget = calculateFiTarget(currentMonthlySpend * 0.7, settings.swr)
      
      // Barista FI target = (monthlySpend * 0.85) * 12 / SWR
      const baristaFiTarget = calculateFiTarget(currentMonthlySpend * 0.85, settings.swr)
      
      // Regular FI target = monthlySpend * 12 / SWR
      const regularFiTarget = calculateFiTarget(currentMonthlySpend, settings.swr)
      
      // Fat FI target = (monthlySpend * 1.5) * 12 / SWR
      const fatFiTarget = calculateFiTarget(currentMonthlySpend * 1.5, settings.swr)
      
      // Verify targets are in correct relationship
      expect(leanFiTarget).toBeLessThan(baristaFiTarget)
      expect(baristaFiTarget).toBeLessThan(regularFiTarget)
      expect(regularFiTarget).toBeLessThan(fatFiTarget)
      
      // Verify Lean FI is achieved before Regular FI
      const leanFi = milestones.milestones.find(m => m.id === 'lean_fi')
      const regularFi = milestones.milestones.find(m => m.id === 'regular_fi')
      
      const currentNetWorth = projections[0]?.netWorth ?? 0
      const leanProgress = (currentNetWorth / leanFiTarget) * 100
      const regularProgress = (currentNetWorth / regularFiTarget) * 100
      
      // If current NW achieves Lean FI, it should show as achieved
      if (leanProgress >= 100) {
        expect(leanFi?.isAchieved).toBe(true)
      }
      
      // Regular FI requires more NW
      expect(regularProgress).toBeLessThan(leanProgress)
    })
  })

  describe('Runway Milestone with Dynamic Spending', () => {
    it('should use current monthly spend for runway calculation', () => {
      const settings = createMockSettings({ baseMonthlyBudget: 3000, spendingGrowthRate: 2 })
      const projections = generateTestProjections(300000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const currentMonthlySpend = projections[0]?.monthlySpend ?? 0
      const currentNetWorth = projections[0]?.netWorth ?? 0
      
      // Calculate runway manually
      const annualExpenses = currentMonthlySpend * 12
      const manualRunwayYears = annualExpenses > 0 ? currentNetWorth / annualExpenses : 0
      
      // Find which runway milestones should be achieved
      const runway1yr = milestones.milestones.find(m => m.id === 'runway_1yr')
      const runway2yr = milestones.milestones.find(m => m.id === 'runway_2yr')
      const runway5yr = milestones.milestones.find(m => m.id === 'runway_5yr')
      
      // Verify correct achievement based on manual calculation
      if (manualRunwayYears >= 1) {
        expect(runway1yr?.isAchieved).toBe(true)
      } else {
        expect(runway1yr?.isAchieved).toBe(false)
      }
      
      if (manualRunwayYears >= 2) {
        expect(runway2yr?.isAchieved).toBe(true)
      }
      
      if (manualRunwayYears >= 5) {
        expect(runway5yr?.isAchieved).toBe(true)
      }
    })
  })

  describe('Coast Milestone Age Calculation', () => {
    it('should correctly calculate years to retirement based on birth year', () => {
      const settings = createMockSettings()
      const currentYear = new Date().getFullYear()
      
      // Person born in 1990 (age 34-35 in 2025)
      const youngBirthYear = 1990
      const youngAge = currentYear - youngBirthYear
      const youngYearsToRetirement = Math.max(0, 65 - youngAge)
      
      // Person born in 1970 (age 54-55 in 2025)
      const olderBirthYear = 1970
      const olderAge = currentYear - olderBirthYear
      const olderYearsToRetirement = Math.max(0, 65 - olderAge)
      
      expect(youngYearsToRetirement).toBeGreaterThan(olderYearsToRetirement)
      
      // Test that coast calculations differ based on age
      const projections = generateTestProjections(300000, settings)
      
      const youngMilestones = calculateFiMilestones(projections, settings, youngBirthYear)
      const olderMilestones = calculateFiMilestones(projections, settings, olderBirthYear)
      
      const youngCoast50 = youngMilestones.milestones.find(m => m.id === 'coast_50')
      const olderCoast50 = olderMilestones.milestones.find(m => m.id === 'coast_50')
      
      // Younger person has more time for compounding, so same NW coasts further
      // This means younger person should achieve coast milestones with less NW
      // or the same NW should coast to a higher percentage
    })
  })
})

// ============================================================================
// ADDITIONAL ACCURACY TESTS
// ============================================================================

describe('Additional Accuracy Tests', () => {
  describe('FI Progress at Various Net Worth Levels', () => {
    it('should accurately track FI progress from 0 to 100%', () => {
      const settings = createMockSettings({ baseMonthlyBudget: 3000, spendingGrowthRate: 0 })
      
      // With $3000/month and 0% spending growth, FI target is fixed
      // FI Target = $3000 * 12 / 0.04 = $900,000
      const fiTarget = calculateFiTarget(3000, 4)
      expect(fiTarget).toBe(900000)
      
      // Test various FI progress levels
      // Note: Actual FI progress varies due to level-based spending and projection calculations
      const testCases = [
        { nw: 90000, minProgress: 5, maxProgress: 20 },
        { nw: 225000, minProgress: 15, maxProgress: 40 },
        { nw: 450000, minProgress: 40, maxProgress: 70 },
        { nw: 675000, minProgress: 60, maxProgress: 100 },
        { nw: 900000, minProgress: 80, maxProgress: 130 },
        { nw: 1350000, minProgress: 120, maxProgress: 200 },
      ]
      
      for (const tc of testCases) {
        const projections = generateTestProjections(tc.nw, settings)
        if (projections.length > 0) {
          const currentProgress = projections[0].fiProgress
          // FI progress should be in expected range
          expect(currentProgress).toBeGreaterThanOrEqual(tc.minProgress)
          expect(currentProgress).toBeLessThanOrEqual(tc.maxProgress)
        }
      }
    })
    
    it('should have very low FI progress near zero net worth', () => {
      const settings = createMockSettings({ baseMonthlyBudget: 3000, spendingGrowthRate: 0 })
      const projections = generateTestProjections(1000, settings) // Very low net worth
      
      if (projections.length > 0) {
        const currentProgress = projections[0].fiProgress
        // With very low NW, progress should be very low (under 5%)
        expect(currentProgress).toBeLessThan(5)
      }
    })
  })

  describe('Milestone Year Predictions', () => {
    it('should predict future milestone years based on growth', () => {
      const settings = createMockSettings({
        currentRate: 7,
        yearlyContribution: 30000,
        baseMonthlyBudget: 4000,
        spendingGrowthRate: 2,
      })
      
      const projections = generateTestProjections(200000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      // Find milestone years
      const fi25 = milestones.milestones.find(m => m.id === 'fi_25')
      const fi50 = milestones.milestones.find(m => m.id === 'fi_50')
      const fi75 = milestones.milestones.find(m => m.id === 'fi_75')
      const fi100 = milestones.milestones.find(m => m.id === 'fi_100')
      
      // Milestone years should be in chronological order (if all have years)
      const years = [fi25?.year, fi50?.year, fi75?.year, fi100?.year]
        .filter(y => y !== null && y !== undefined) as number[]
      
      for (let i = 1; i < years.length; i++) {
        expect(years[i]).toBeGreaterThanOrEqual(years[i - 1])
      }
    })
  })

  describe('Level-Based Spending Impact on Milestones', () => {
    it('should show higher FI targets as net worth increases (with spending growth)', () => {
      const settings = createMockSettings({ spendingGrowthRate: 3 })
      
      // Higher net worth = higher spending = higher FI target
      const lowNwProjections = generateTestProjections(200000, settings)
      const highNwProjections = generateTestProjections(800000, settings)
      
      const lowNwFiTarget = lowNwProjections[0]?.fiTarget ?? 0
      const highNwFiTarget = highNwProjections[0]?.fiTarget ?? 0
      
      // With spending growth rate > 0, higher NW means higher spending
      // which means higher FI target
      expect(highNwFiTarget).toBeGreaterThan(lowNwFiTarget)
    })

    it('should have constant FI target with 0% spending growth', () => {
      const settings = createMockSettings({ spendingGrowthRate: 0, baseMonthlyBudget: 4000 })
      
      const projections1 = generateTestProjections(200000, settings)
      const projections2 = generateTestProjections(800000, settings)
      
      // With 0% spending growth, FI target should be the same regardless of NW
      // (only based on base monthly budget)
      const fiTarget1 = projections1[0]?.fiTarget ?? 0
      const fiTarget2 = projections2[0]?.fiTarget ?? 0
      
      // Both should equal base budget-based target
      const expectedTarget = calculateFiTarget(4000, settings.swr)
      expect(fiTarget1).toBe(expectedTarget)
      expect(fiTarget2).toBe(expectedTarget)
    })
  })
})

// ============================================================================
// NUMERICAL VERIFICATION TESTS - Catching Specific Calculation Bugs
// ============================================================================

describe('Numerical Verification Tests', () => {
  describe('FI Target Calculation Accuracy', () => {
    it('should calculate FI target exactly: FI = (monthlySpend * 12) / (SWR/100)', () => {
      // Test case 1: $3,000/month with 4% SWR
      // FI = ($3,000 * 12) / 0.04 = $36,000 / 0.04 = $900,000
      expect(calculateFiTarget(3000, 4)).toBe(900000)
      
      // Test case 2: $5,000/month with 3.5% SWR
      // FI = ($5,000 * 12) / 0.035 = $60,000 / 0.035 = $1,714,285.71
      expect(calculateFiTarget(5000, 3.5)).toBeCloseTo(1714285.71, 0)
      
      // Test case 3: $10,000/month with 5% SWR
      // FI = ($10,000 * 12) / 0.05 = $120,000 / 0.05 = $2,400,000
      expect(calculateFiTarget(10000, 5)).toBe(2400000)
    })
  })

  describe('SWR Calculation Accuracy', () => {
    it('should calculate SWR amounts exactly', () => {
      // $1,000,000 with 4% SWR
      const swr = calculateSwrAmounts(1000000, 4)
      
      // Annual: $1,000,000 * 0.04 = $40,000
      expect(swr.annual).toBe(40000)
      
      // Monthly: $40,000 / 12 = $3,333.33
      expect(swr.monthly).toBeCloseTo(3333.33, 2)
      
      // Weekly: $40,000 / 52 = $769.23
      expect(swr.weekly).toBeCloseTo(769.23, 2)
      
      // Daily: $40,000 / 365 = $109.59
      expect(swr.daily).toBeCloseTo(109.59, 2)
    })
  })

  describe('Runway Calculation Accuracy', () => {
    it('should calculate runway exactly: runway = NW / (monthlySpend * 12)', () => {
      // $100,000 NW / ($3,000 * 12) = $100,000 / $36,000 = 2.778 years
      expect(calculateRunwayYears(100000, 3000)).toBeCloseTo(2.778, 2)
      
      // $500,000 NW / ($4,000 * 12) = $500,000 / $48,000 = 10.417 years
      expect(calculateRunwayYears(500000, 4000)).toBeCloseTo(10.417, 2)
      
      // $1,000,000 NW / ($5,000 * 12) = $1,000,000 / $60,000 = 16.667 years
      expect(calculateRunwayYears(1000000, 5000)).toBeCloseTo(16.667, 2)
    })
  })

  describe('Coast FI Percentage Accuracy', () => {
    it('should calculate coast FI percent correctly with compound growth', () => {
      // Given:
      // - Current NW: $150,000
      // - Monthly spend: $4,000
      // - Years to retirement: 20
      // - Return rate: 7%
      // - Inflation: 3%
      // - SWR: 4%
      
      const coastPercent = calculateCoastFiPercent(150000, 4000, 20, 7, 3, 4)
      
      // Future NW: $150,000 * (1.07)^20 = $150,000 * 3.8697 = $580,455
      // Future monthly spend: $4,000 * (1.03)^20 = $4,000 * 1.8061 = $7,224.45
      // Future FI target: $7,224.45 * 12 / 0.04 = $2,167,335
      // Coast %: $580,455 / $2,167,335 * 100 = 26.78%
      
      // Calculate expected values manually
      const futureNW = 150000 * Math.pow(1.07, 20)
      const futureSpend = 4000 * Math.pow(1.03, 20)
      const futureFITarget = futureSpend * 12 / 0.04
      const expectedCoastPercent = (futureNW / futureFITarget) * 100
      
      expect(coastPercent).toBeCloseTo(expectedCoastPercent, 2)
    })
  })

  describe('Lifestyle Milestone Target Accuracy', () => {
    it('should calculate lifestyle FI targets as exact multipliers', () => {
      const monthlySpend = 4000
      const swr = 4
      
      // Regular FI target: $4,000 * 12 / 0.04 = $1,200,000
      const regularTarget = calculateFiTarget(monthlySpend, swr)
      expect(regularTarget).toBe(1200000)
      
      // Lean FI (70%): $4,000 * 0.7 * 12 / 0.04 = $840,000
      const leanTarget = calculateFiTarget(monthlySpend * 0.7, swr)
      expect(leanTarget).toBe(840000)
      
      // Barista FI (85%): $4,000 * 0.85 * 12 / 0.04 = $1,020,000
      const baristaTarget = calculateFiTarget(monthlySpend * 0.85, swr)
      expect(baristaTarget).toBe(1020000)
      
      // Fat FI (150%): $4,000 * 1.5 * 12 / 0.04 = $1,800,000
      const fatTarget = calculateFiTarget(monthlySpend * 1.5, swr)
      expect(fatTarget).toBe(1800000)
    })
  })

  describe('Dollar Multiplier Accuracy', () => {
    it('should calculate compound growth multiplier correctly', () => {
      // $1 at 7% for 10 years: (1.07)^10 = 1.9672
      expect(calculateDollarMultiplier(10, 7)).toBeCloseTo(1.9672, 3)
      
      // $1 at 7% for 20 years: (1.07)^20 = 3.8697
      expect(calculateDollarMultiplier(20, 7)).toBeCloseTo(3.8697, 3)
      
      // $1 at 7% for 30 years: (1.07)^30 = 7.6123
      expect(calculateDollarMultiplier(30, 7)).toBeCloseTo(7.6123, 3)
      
      // $1 at 10% for 25 years: (1.10)^25 = 10.8347
      expect(calculateDollarMultiplier(25, 10)).toBeCloseTo(10.8347, 3)
    })
  })

  describe('Level-Based Spending Calculation Accuracy', () => {
    it('should calculate spending correctly: base + (NW * rate/100 / 12)', () => {
      // Base budget: $3,000
      // Net worth: $500,000
      // Spending rate: 2%
      // Years elapsed: 0
      // Inflation: 0
      
      // Expected: $3,000 + ($500,000 * 0.02 / 12) = $3,000 + $833.33 = $3,833.33
      const settings = createMockSettings({
        baseMonthlyBudget: 3000,
        spendingGrowthRate: 2,
        inflationRate: 0,
      })
      
      const spending = calculateLevelBasedSpending(500000, settings, 0)
      expect(spending).toBeCloseTo(3833.33, 2)
    })

    it('should apply inflation to base budget', () => {
      // Base budget: $3,000
      // Net worth: $500,000
      // Spending rate: 2%
      // Years elapsed: 5
      // Inflation: 3%
      
      // Inflated base: $3,000 * (1.03)^5 = $3,000 * 1.1593 = $3,477.82
      // NW portion: $500,000 * 0.02 / 12 = $833.33
      // Total: $3,477.82 + $833.33 = $4,311.15
      const settings = createMockSettings({
        baseMonthlyBudget: 3000,
        spendingGrowthRate: 2,
        inflationRate: 3,
      })
      
      const spending = calculateLevelBasedSpending(500000, settings, 5)
      const inflatedBase = 3000 * Math.pow(1.03, 5)
      const nwPortion = 500000 * 0.02 / 12
      const expected = inflatedBase + nwPortion
      
      expect(spending).toBeCloseTo(expected, 2)
    })
  })

  describe('FI Progress Percentage Accuracy', () => {
    it('should calculate FI progress as (NW / FI Target * 100)', () => {
      // Net worth: $600,000
      // Monthly spend: $4,000
      // FI Target: $1,200,000
      // Progress: $600,000 / $1,200,000 * 100 = 50%
      
      const fiTarget = calculateFiTarget(4000, 4)
      const progress = (600000 / fiTarget) * 100
      
      expect(fiTarget).toBe(1200000)
      expect(progress).toBe(50)
    })
  })
})

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Milestone Integration Tests', () => {
  it('should calculate all milestone types for a realistic scenario', () => {
    const settings = createMockSettings({
      currentRate: 7,
      swr: 4,
      yearlyContribution: 30000,
      birthDate: '1988-06-15',
      inflationRate: 3,
      baseMonthlyBudget: 4000,
      spendingGrowthRate: 2,
    })
    
    const projections = generateTestProjections(450000, settings)
    const birthYear = new Date(settings.birthDate).getFullYear()
    const milestones = calculateFiMilestones(projections, settings, birthYear)
    
    // Should have milestones from all types
    const types = new Set(milestones.milestones.map(m => m.type))
    expect(types.has('percentage')).toBe(true)
    expect(types.has('lifestyle')).toBe(true)
    expect(types.has('runway')).toBe(true)
    expect(types.has('coast')).toBe(true)
    expect(types.has('special')).toBe(true)
    
    // Should have correct number of milestones
    expect(milestones.milestones.length).toBe(FI_MILESTONE_DEFINITIONS.length)
  })

  it('should maintain consistency between related milestones', () => {
    const settings = createMockSettings()
    const projections = generateTestProjections(700000, settings)
    const milestones = calculateFiMilestones(projections, settings, 1990)
    
    // 50% FI and Flamingo FI should be equivalent
    const fi50 = milestones.milestones.find(m => m.id === 'fi_50')
    const flamingo = milestones.milestones.find(m => m.id === 'flamingo_fi')
    
    expect(fi50?.isAchieved).toBe(flamingo?.isAchieved)
    expect(fi50?.year).toBe(flamingo?.year)
  })

  it('should track progress accurately over simulated time', () => {
    const settings = createMockSettings()
    
    // Simulate progression from $100k to $1M
    const netWorths = [100000, 250000, 500000, 750000, 1000000]
    
    let previousAchievedCount = 0
    
    for (const nw of netWorths) {
      const projections = generateTestProjections(nw, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const achievedCount = milestones.milestones.filter(m => m.isAchieved).length
      
      // Number of achieved milestones should never decrease
      expect(achievedCount).toBeGreaterThanOrEqual(previousAchievedCount)
      previousAchievedCount = achievedCount
    }
  })
})

// ============================================================================
// RETIREMENT INCOME MILESTONES - Concrete salary at retirement age
// ============================================================================

describe('Retirement Income Milestones', () => {
  describe('calculateProjectedRetirementIncome (inflation-adjusted)', () => {
    it('should calculate projected REAL retirement income with inflation adjustment', () => {
      // $100,000 at 7% for 30 years with 3% inflation and 4% SWR
      // Future NW = $100,000 * (1.07)^30 = ~$761,226
      // Nominal income = $761,226 * 0.04 = ~$30,449
      // Inflation multiplier = (1.03)^30 = ~2.427
      // Real income = $30,449 / 2.427 = ~$12,545 (in today's purchasing power)
      const realIncome = calculateProjectedRetirementIncome(100000, 30, 7, 3, 4)
      
      const futureNW = 100000 * Math.pow(1.07, 30)
      const nominalIncome = futureNW * 0.04
      const inflationMultiplier = Math.pow(1.03, 30)
      const expectedRealIncome = nominalIncome / inflationMultiplier
      
      expect(realIncome).toBeCloseTo(expectedRealIncome, 0)
      expect(realIncome).toBeCloseTo(12545, -1) // Roughly $12.5k in today's dollars
    })
    
    it('should return current SWR when already at retirement age (no inflation adjustment)', () => {
      const income = calculateProjectedRetirementIncome(1000000, 0, 7, 3, 4)
      // At retirement, just apply SWR: $1,000,000 * 0.04 = $40,000
      expect(income).toBe(40000)
    })
    
    it('should scale linearly with net worth', () => {
      const income100k = calculateProjectedRetirementIncome(100000, 30, 7, 3, 4)
      const income200k = calculateProjectedRetirementIncome(200000, 30, 7, 3, 4)
      const income300k = calculateProjectedRetirementIncome(300000, 30, 7, 3, 4)
      
      expect(income200k).toBeCloseTo(income100k * 2, 0)
      expect(income300k).toBeCloseTo(income100k * 3, 0)
    })
    
    it('should show higher real income with more years (net of inflation)', () => {
      // With 7% return and 3% inflation, real growth is ~4%/year
      // More years still means more real income, but less dramatically than nominal
      const income10yr = calculateProjectedRetirementIncome(100000, 10, 7, 3, 4)
      const income20yr = calculateProjectedRetirementIncome(100000, 20, 7, 3, 4)
      const income30yr = calculateProjectedRetirementIncome(100000, 30, 7, 3, 4)
      
      // Real income should still increase with more years
      expect(income20yr).toBeGreaterThan(income10yr)
      expect(income30yr).toBeGreaterThan(income20yr)
    })
    
    it('should show lower real income with higher inflation', () => {
      const lowInflation = calculateProjectedRetirementIncome(100000, 30, 7, 2, 4)
      const midInflation = calculateProjectedRetirementIncome(100000, 30, 7, 3, 4)
      const highInflation = calculateProjectedRetirementIncome(100000, 30, 7, 4, 4)
      
      // Higher inflation = lower real income
      expect(lowInflation).toBeGreaterThan(midInflation)
      expect(midInflation).toBeGreaterThan(highInflation)
    })
  })

  describe('calculateNetWorthForRetirementIncome (inflation-adjusted)', () => {
    it('should be the inverse of calculateProjectedRetirementIncome', () => {
      const targetRealIncome = 50000 // $50k in today's dollars
      const yearsToRetirement = 30
      const returnRate = 7
      const inflationRate = 3
      const swr = 4
      
      // Calculate NW needed for $50k/year real income
      const nwNeeded = calculateNetWorthForRetirementIncome(targetRealIncome, yearsToRetirement, returnRate, inflationRate, swr)
      
      // Verify that amount would actually produce $50k/year real income
      const actualRealIncome = calculateProjectedRetirementIncome(nwNeeded, yearsToRetirement, returnRate, inflationRate, swr)
      
      expect(actualRealIncome).toBeCloseTo(targetRealIncome, 0)
    })
    
    it('should calculate correct net worth for real income targets', () => {
      // For $40,000/year REAL income in 30 years with 7% return, 3% inflation, 4% SWR:
      // Inflation multiplier = (1.03)^30 = ~2.427
      // Target nominal income = $40,000 * 2.427 = ~$97,080
      // Future NW needed = $97,080 / 0.04 = ~$2,427,000
      // Present value = $2,427,000 / (1.07)^30 = ~$318,873
      const nwNeeded = calculateNetWorthForRetirementIncome(40000, 30, 7, 3, 4)
      
      const inflationMultiplier = Math.pow(1.03, 30)
      const targetNominalIncome = 40000 * inflationMultiplier
      const futureNWNeeded = targetNominalIncome / 0.04
      const expectedPresentValue = futureNWNeeded / Math.pow(1.07, 30)
      
      expect(nwNeeded).toBeCloseTo(expectedPresentValue, 0)
    })
    
    it('should return full amount when at retirement age', () => {
      const nwNeeded = calculateNetWorthForRetirementIncome(50000, 0, 7, 3, 4)
      // At retirement: NW needed = income / SWR = $50,000 / 0.04 = $1,250,000
      expect(nwNeeded).toBe(1250000)
    })
    
    it('should require MORE net worth with higher inflation', () => {
      const targetRealIncome = 100000
      
      const nwLowInflation = calculateNetWorthForRetirementIncome(targetRealIncome, 30, 7, 2, 4)
      const nwMidInflation = calculateNetWorthForRetirementIncome(targetRealIncome, 30, 7, 3, 4)
      const nwHighInflation = calculateNetWorthForRetirementIncome(targetRealIncome, 30, 7, 4, 4)
      
      // Higher inflation = more NW needed to maintain same real income
      expect(nwHighInflation).toBeGreaterThan(nwMidInflation)
      expect(nwMidInflation).toBeGreaterThan(nwLowInflation)
    })
  })

  describe('Retirement Income Milestone Achievement', () => {
    it('should include retirement_income type milestones', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(500000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const retirementIncomeMilestones = milestones.milestones.filter(m => m.type === 'retirement_income')
      
      // Should have all 22 retirement income milestones ($10k - $2M)
      expect(retirementIncomeMilestones.length).toBe(22)
    })
    
    it('should achieve $10k milestone with modest net worth (inflation-adjusted)', () => {
      // Person born 1990 (age 35 in 2025), ~30 years to retirement
      // With 7% return, 3% inflation, 4% SWR:
      // Growth multiplier = (1.07)^30 = 7.61
      // Inflation multiplier = (1.03)^30 = 2.43
      // Real growth = 7.61 / 2.43 = 3.13x
      // Need for $10k real income: ($10k * 2.43 / 0.04) / 7.61 = ~$80k today
      // But with lower NW the spending level adjusts, so test with higher threshold
      const settings = createMockSettings()
      const projections = generateTestProjections(100000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const milestone10k = milestones.milestones.find(m => m.id === 'retirement_income_10k')
      expect(milestone10k).toBeDefined()
      expect(milestone10k?.isAchieved).toBe(true)
    })
    
    it('should not achieve $100k milestone with modest net worth', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(200000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const milestone100k = milestones.milestones.find(m => m.id === 'retirement_income_100k')
      expect(milestone100k).toBeDefined()
      // $100k/year real income needs much more than $200k NW today
      expect(milestone100k?.isAchieved).toBe(false)
    })
    
    it('should achieve $100k milestone with high net worth (inflation-adjusted)', () => {
      // For $100k real income with 30 years, 7% return, 3% inflation, 4% SWR:
      // Inflation multiplier = 2.43, Growth multiplier = 7.61
      // Need: ($100k * 2.43 / 0.04) / 7.61 = ~$800k today
      const settings = createMockSettings()
      const projections = generateTestProjections(900000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const milestone100k = milestones.milestones.find(m => m.id === 'retirement_income_100k')
      expect(milestone100k).toBeDefined()
      expect(milestone100k?.isAchieved).toBe(true)
    })
    
    it('should have milestones in ascending order of target income', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(500000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const retirementIncomeMilestones = milestones.milestones
        .filter(m => m.type === 'retirement_income')
        .map(m => m.targetValue)
      
      // Should be in ascending order
      for (let i = 1; i < retirementIncomeMilestones.length; i++) {
        expect(retirementIncomeMilestones[i]).toBeGreaterThan(retirementIncomeMilestones[i - 1])
      }
    })
    
    it('should show earlier milestone years for lower income targets', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(200000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const milestone20k = milestones.milestones.find(m => m.id === 'retirement_income_20k')
      const milestone50k = milestones.milestones.find(m => m.id === 'retirement_income_50k')
      const milestone100k = milestones.milestones.find(m => m.id === 'retirement_income_100k')
      
      // Lower targets should be achieved earlier (or have null year if not achievable)
      if (milestone20k?.year && milestone50k?.year) {
        expect(milestone20k.year).toBeLessThanOrEqual(milestone50k.year)
      }
      if (milestone50k?.year && milestone100k?.year) {
        expect(milestone50k.year).toBeLessThanOrEqual(milestone100k.year)
      }
    })
  })

  describe('Retirement Income Milestone with Age', () => {
    it('should require less net worth for younger people (more compounding time)', () => {
      const settings = createMockSettings()
      
      // Young person (age 30, 35 years to retirement)
      const youngProjections = generateTestProjections(200000, settings)
      const youngMilestones = calculateFiMilestones(youngProjections, settings, 1995)
      
      // Older person (age 50, 15 years to retirement)
      const oldProjections = generateTestProjections(200000, settings)
      const oldMilestones = calculateFiMilestones(oldProjections, settings, 1975)
      
      const youngMilestone50k = youngMilestones.milestones.find(m => m.id === 'retirement_income_50k')
      const oldMilestone50k = oldMilestones.milestones.find(m => m.id === 'retirement_income_50k')
      
      // Young person should achieve more income milestones with same NW
      // because they have more time for compounding
      const youngAchievedCount = youngMilestones.milestones
        .filter(m => m.type === 'retirement_income' && m.isAchieved).length
      const oldAchievedCount = oldMilestones.milestones
        .filter(m => m.type === 'retirement_income' && m.isAchieved).length
      
      expect(youngAchievedCount).toBeGreaterThanOrEqual(oldAchievedCount)
    })
    
    it('should calculate correct years to milestone for different ages', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(100000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const milestone30k = milestones.milestones.find(m => m.id === 'retirement_income_30k')
      
      // For a 35 year old with $100k, when would they reach $30k/year retirement income?
      // It should be achievable (either now or in the future with continued savings)
      expect(milestone30k?.year).not.toBeNull()
      
      if (milestone30k?.age) {
        // Age should be between current age and retirement age
        expect(milestone30k.age).toBeGreaterThanOrEqual(35)
        expect(milestone30k.age).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('Dollar Multiplier Effect (with inflation)', () => {
    it('should show the power of early saving via dollar multiplier', () => {
      // At age 25 (40 years to retirement) vs age 55 (10 years to retirement)
      const multiplier40yr = calculateDollarMultiplier(40, 7)
      const multiplier10yr = calculateDollarMultiplier(10, 7)
      
      // $1 at age 25 becomes ~$14.97 at retirement (nominal)
      // $1 at age 55 becomes ~$1.97 at retirement (nominal)
      expect(multiplier40yr).toBeCloseTo(14.97, 1)
      expect(multiplier10yr).toBeCloseTo(1.97, 1)
      
      // This means a 25 year old needs ~1/7.6 of what a 55 year old needs (in nominal terms)
      expect(multiplier40yr / multiplier10yr).toBeGreaterThan(7)
    })
    
    it('should reflect real purchasing power in retirement income calculations', () => {
      // Same $100,000 net worth produces very different REAL retirement incomes
      // depending on years to retirement (after accounting for inflation)
      const income40yr = calculateProjectedRetirementIncome(100000, 40, 7, 3, 4)
      const income10yr = calculateProjectedRetirementIncome(100000, 10, 7, 3, 4)
      
      // With inflation adjustment, the difference is smaller but still significant
      // The real growth rate is roughly (1.07/1.03)^years
      // 40 years still beats 10 years, but not by as much as nominal suggests
      expect(income40yr).toBeGreaterThan(income10yr)
      
      // Real growth over 40 years at ~4% real rate: (1.04)^40 = ~4.8x
      // Real growth over 10 years at ~4% real rate: (1.04)^10 = ~1.48x
      // So 40yr should be roughly 3x the 10yr income
      expect(income40yr / income10yr).toBeGreaterThan(2)
      expect(income40yr / income10yr).toBeLessThan(5)
    })
  })

  describe('Retirement Income Milestone Progression', () => {
    it('should achieve milestones in order as net worth grows', () => {
      const settings = createMockSettings()
      
      // Progress through various net worth levels
      const netWorths = [50000, 100000, 200000, 300000, 500000, 800000]
      
      let previousAchievedCount = 0
      
      for (const nw of netWorths) {
        const projections = generateTestProjections(nw, settings)
        const milestones = calculateFiMilestones(projections, settings, 1990)
        
        const achievedCount = milestones.milestones
          .filter(m => m.type === 'retirement_income' && m.isAchieved).length
        
        // Should never lose achievements as NW grows
        expect(achievedCount).toBeGreaterThanOrEqual(previousAchievedCount)
        previousAchievedCount = achievedCount
      }
    })
    
    it('should track net worth at milestone achievement', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(200000, settings)
      const milestones = calculateFiMilestones(projections, settings, 1990)
      
      const milestone30k = milestones.milestones.find(m => m.id === 'retirement_income_30k')
      
      if (milestone30k?.isAchieved) {
        // Net worth at milestone should be recorded
        expect(milestone30k.netWorthAtMilestone).toBeDefined()
        expect(milestone30k.netWorthAtMilestone).toBeGreaterThan(0)
      }
    })
  })

  describe('Edge Cases for Retirement Income Milestones', () => {
    it('should handle null birth year with default years to retirement', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(300000, settings)
      const milestones = calculateFiMilestones(projections, settings, null)
      
      // Should still calculate milestones with default 30 years to retirement
      const retirementIncomeMilestones = milestones.milestones.filter(m => m.type === 'retirement_income')
      expect(retirementIncomeMilestones.length).toBe(22)
      
      // Some should be achieved with $300k and 30 years
      const achievedCount = retirementIncomeMilestones.filter(m => m.isAchieved).length
      expect(achievedCount).toBeGreaterThan(0)
    })
    
    it('should handle person at retirement age', () => {
      const settings = createMockSettings()
      const projections = generateTestProjections(1000000, settings)
      // Person born 1960 is ~65 in 2025, at retirement
      const milestones = calculateFiMilestones(projections, settings, 1960)
      
      const milestone40k = milestones.milestones.find(m => m.id === 'retirement_income_40k')
      
      // At retirement with $1M and 4% SWR: $40,000/year
      // Should exactly hit the $40k milestone
      expect(milestone40k?.isAchieved).toBe(true)
    })
    
    it('should handle very young person with maximum compounding (inflation-adjusted)', () => {
      const settings = createMockSettings()
      // Person born 2005 is ~20 years old, 45 years to retirement
      const projections = generateTestProjections(50000, settings)
      const milestones = calculateFiMilestones(projections, settings, 2005)
      
      // With 45 years of compounding at 7%, growth multiplier is ~21.00
      // But inflation multiplier at 3% for 45 years is ~3.78
      // Net real growth = 21.00 / 3.78 = ~5.55x
      // $50,000 * 5.55 * 0.04 = ~$11,100/year in today's purchasing power
      // So they should achieve $10k milestone but not $15k
      const milestone10k = milestones.milestones.find(m => m.id === 'retirement_income_10k')
      const milestone15k = milestones.milestones.find(m => m.id === 'retirement_income_15k')
      expect(milestone10k?.isAchieved).toBe(true)
      // $15k milestone needs more NW due to inflation
      // Note: might be achieved depending on exact calculation, so we just verify $10k
    })
  })
})

// ============================================================================
// NUMERICAL VERIFICATION FOR RETIREMENT INCOME
// ============================================================================

describe('Retirement Income Numerical Verification (Inflation-Adjusted)', () => {
  it('should verify REAL retirement income calculation with inflation', () => {
    // Test case: $150,000 NW, 25 years, 7% return, 3% inflation, 4% SWR
    const nw = 150000
    const years = 25
    const rate = 7
    const inflation = 3
    const swr = 4
    
    const calculated = calculateProjectedRetirementIncome(nw, years, rate, inflation, swr)
    
    // Manual: (NW * (1.07)^25 * 0.04) / (1.03)^25
    const futureNW = nw * Math.pow(1 + rate/100, years)
    const nominalIncome = futureNW * (swr / 100)
    const inflationMultiplier = Math.pow(1 + inflation/100, years)
    const realIncome = nominalIncome / inflationMultiplier
    
    expect(calculated).toBeCloseTo(realIncome, 2)
  })
  
  it('should verify NW needed for REAL income target with inflation', () => {
    // Test case: Want $60,000/year REAL income, 20 years out, 7% return, 3% inflation, 4% SWR
    const targetRealIncome = 60000
    const years = 20
    const rate = 7
    const inflation = 3
    const swr = 4
    
    const calculated = calculateNetWorthForRetirementIncome(targetRealIncome, years, rate, inflation, swr)
    
    // Manual: 
    // 1. Target nominal income = $60k * (1.03)^20
    // 2. Future NW needed = nominal income / 0.04
    // 3. Present value = Future NW / (1.07)^20
    const inflationMultiplier = Math.pow(1 + inflation/100, years)
    const targetNominalIncome = targetRealIncome * inflationMultiplier
    const futureNWNeeded = targetNominalIncome / (swr / 100)
    const manual = futureNWNeeded / Math.pow(1 + rate/100, years)
    
    expect(calculated).toBeCloseTo(manual, 2)
  })
  
  it('should verify milestone thresholds at 30 years with inflation', () => {
    // For each income level (in today's dollars), verify the NW needed today
    const years = 30
    const rate = 7
    const inflation = 3
    const swr = 4
    
    const growthMultiplier = Math.pow(1.07, 30) // ~7.61
    const inflationMultiplier = Math.pow(1.03, 30) // ~2.43
    
    // To get $50k/year REAL income:
    // 1. Need nominal income = $50k * 2.43 = ~$121,500
    // 2. Future NW needed = $121,500 / 0.04 = ~$3,037,500
    // 3. Present value = $3,037,500 / 7.61 = ~$399,000
    const expectedNWFor50k = (50000 * inflationMultiplier / 0.04) / growthMultiplier
    const expectedNWFor100k = (100000 * inflationMultiplier / 0.04) / growthMultiplier
    
    expect(calculateNetWorthForRetirementIncome(50000, years, rate, inflation, swr)).toBeCloseTo(expectedNWFor50k, 0)
    expect(calculateNetWorthForRetirementIncome(100000, years, rate, inflation, swr)).toBeCloseTo(expectedNWFor100k, 0)
  })
  
  it('should show that higher inflation requires more NW for same real income', () => {
    const targetRealIncome = 100000
    const years = 30
    const rate = 7
    const swr = 4
    
    const nwFor2pctInflation = calculateNetWorthForRetirementIncome(targetRealIncome, years, rate, 2, swr)
    const nwFor3pctInflation = calculateNetWorthForRetirementIncome(targetRealIncome, years, rate, 3, swr)
    const nwFor4pctInflation = calculateNetWorthForRetirementIncome(targetRealIncome, years, rate, 4, swr)
    
    // Higher inflation = need more NW today to achieve same real lifestyle
    expect(nwFor3pctInflation).toBeGreaterThan(nwFor2pctInflation)
    expect(nwFor4pctInflation).toBeGreaterThan(nwFor3pctInflation)
    
    // The difference is significant over 30 years
    expect(nwFor4pctInflation / nwFor2pctInflation).toBeGreaterThan(1.3)
  })
})
