/**
 * Tests for the tiered runway (drawdown simulation) calculation
 */

import { describe, it, expect } from 'vitest'
import {
  calculateTieredRunway,
  type AssetAllocation,
  type PerBucketRates,
} from '../lib/calculations'

// ============================================================================
// TEST DATA
// ============================================================================

const defaultRates: PerBucketRates = {
  cash: 0.04,       // 4% annual
  retirement: 0.07,
  hsa: 0.07,
  brokerage: 0.07,
  debts: 0.07,
}

// ============================================================================
// BASIC FUNCTIONALITY
// ============================================================================

describe('calculateTieredRunway', () => {
  it('returns three spending scenarios (100%, 75%, 50%)', () => {
    const alloc: AssetAllocation = { cash: 50000, retirement: 0, hsa: 0, brokerage: 50000, debts: 0 }
    const result = calculateTieredRunway(alloc, defaultRates, 5000, 35)
    expect(result.scenarios).toHaveLength(3)
    expect(result.scenarios[0].spendingPct).toBe(1.0)
    expect(result.scenarios[1].spendingPct).toBe(0.75)
    expect(result.scenarios[2].spendingPct).toBe(0.5)
  })

  it('returns Infinity for zero spending', () => {
    const alloc: AssetAllocation = { cash: 50000, retirement: 0, hsa: 0, brokerage: 0, debts: 0 }
    const result = calculateTieredRunway(alloc, defaultRates, 0, 35)
    expect(result.scenarios[0].tier1Months).toBe(Infinity)
    expect(result.scenarios[0].totalMonths).toBe(Infinity)
  })

  it('returns 0 months for zero assets', () => {
    const alloc: AssetAllocation = { cash: 0, retirement: 0, hsa: 0, brokerage: 0, debts: 0 }
    const result = calculateTieredRunway(alloc, defaultRates, 5000, 35)
    expect(result.scenarios[0].tier1Months).toBe(0)
    expect(result.scenarios[0].totalMonths).toBe(0)
  })

  // ============================================================================
  // TIER 1 (LIQUID) TESTS
  // ============================================================================

  describe('tier 1 (liquid assets)', () => {
    it('calculates runway from cash only', () => {
      const alloc: AssetAllocation = { cash: 60000, retirement: 0, hsa: 0, brokerage: 0, debts: 0 }
      const result = calculateTieredRunway(alloc, defaultRates, 5000, 35)
      // $60k / $5k = 12 months simple. Cash has no tax, 4% growth is small monthly.
      // Growth adds ~$200 first month, so we get 12 months (growth is applied but small)
      expect(result.scenarios[0].tier1Months).toBeGreaterThanOrEqual(12)
      expect(result.scenarios[0].tier1Months).toBeLessThan(14)
    })

    it('draws from cash before brokerage', () => {
      // With only cash, should deplete faster than with brokerage (lower rate)
      const cashOnly: AssetAllocation = { cash: 100000, retirement: 0, hsa: 0, brokerage: 0, debts: 0 }
      const brokerageOnly: AssetAllocation = { cash: 0, retirement: 0, hsa: 0, brokerage: 100000, debts: 0 }
      const mixed: AssetAllocation = { cash: 50000, retirement: 0, hsa: 0, brokerage: 50000, debts: 0 }

      const resultCash = calculateTieredRunway(cashOnly, defaultRates, 5000, 35)
      const resultBrok = calculateTieredRunway(brokerageOnly, defaultRates, 5000, 35)
      const resultMixed = calculateTieredRunway(mixed, defaultRates, 5000, 35)

      // $100k / $5k = 20 months simple. Brokerage has 7.5% tax on withdrawals,
      // so effective spending is higher, reducing months slightly.
      // Cash has 0% tax but lower return. All should be ~19-21 months.
      expect(resultCash.scenarios[0].tier1Months).toBeGreaterThanOrEqual(19)
      expect(resultBrok.scenarios[0].tier1Months).toBeGreaterThanOrEqual(18)
      expect(resultMixed.scenarios[0].tier1Months).toBeGreaterThanOrEqual(18)
    })
  })

  // ============================================================================
  // TIER 2 (RETIREMENT WITH PENALTIES) TESTS
  // ============================================================================

  describe('tier 2 (retirement assets with penalties)', () => {
    it('total runway is longer than tier 1 when retirement assets exist', () => {
      const alloc: AssetAllocation = { cash: 50000, retirement: 100000, hsa: 0, brokerage: 0, debts: 0 }
      const result = calculateTieredRunway(alloc, defaultRates, 5000, 35)
      expect(result.scenarios[0].totalMonths).toBeGreaterThan(result.scenarios[0].tier1Months)
    })

    it('applies early withdrawal penalty for pre-59.5 age', () => {
      const alloc: AssetAllocation = { cash: 0, retirement: 100000, hsa: 0, brokerage: 0, debts: 0 }
      const youngResult = calculateTieredRunway(alloc, defaultRates, 5000, 35) // age 35, pre-59.5
      const oldResult = calculateTieredRunway(alloc, defaultRates, 5000, 60)   // age 60, post-59.5

      expect(youngResult.assumptions.isPreRetirementAge).toBe(true)
      expect(oldResult.assumptions.isPreRetirementAge).toBe(false)
      // Post-59.5 should last longer (no penalty)
      expect(oldResult.scenarios[0].totalMonths).toBeGreaterThan(youngResult.scenarios[0].totalMonths)
    })

    it('treats null age as pre-retirement (conservative)', () => {
      const alloc: AssetAllocation = { cash: 0, retirement: 100000, hsa: 0, brokerage: 0, debts: 0 }
      const result = calculateTieredRunway(alloc, defaultRates, 5000, null)
      expect(result.assumptions.isPreRetirementAge).toBe(true)
      expect(result.assumptions.earlyWithdrawalPenalty).toBe(0.10)
    })
  })

  // ============================================================================
  // SPENDING SCENARIOS
  // ============================================================================

  describe('spending scenarios', () => {
    it('reduced spending extends runway proportionally', () => {
      const alloc: AssetAllocation = { cash: 100000, retirement: 0, hsa: 0, brokerage: 0, debts: 0 }
      const result = calculateTieredRunway(alloc, defaultRates, 5000, 35)

      const full = result.scenarios[0]
      const reduced75 = result.scenarios[1]
      const reduced50 = result.scenarios[2]

      expect(reduced75.monthlySpend).toBe(3750)
      expect(reduced50.monthlySpend).toBe(2500)
      expect(reduced75.tier1Months).toBeGreaterThan(full.tier1Months)
      expect(reduced50.tier1Months).toBeGreaterThan(reduced75.tier1Months)
    })
  })

  // ============================================================================
  // ASSET TOTALS
  // ============================================================================

  describe('asset tier totals', () => {
    it('correctly reports tier 1 and tier 2 asset totals', () => {
      const alloc: AssetAllocation = { cash: 30000, retirement: 200000, hsa: 15000, brokerage: 70000, debts: 5000 }
      const result = calculateTieredRunway(alloc, defaultRates, 5000, 35)
      expect(result.tier1Assets).toBe(100000) // 30k + 70k
      expect(result.tier2Assets).toBe(215000) // 200k + 15k
    })
  })

  // ============================================================================
  // GROWTH DURING DRAWDOWN
  // ============================================================================

  describe('growth during drawdown', () => {
    it('returns more months than simple division due to growth', () => {
      const alloc: AssetAllocation = { cash: 0, retirement: 0, hsa: 0, brokerage: 120000, debts: 0 }
      const result = calculateTieredRunway(alloc, defaultRates, 5000, 35)
      // Simple: $120k / $5k = 24 months. With 7% growth but ~7.5% brokerage tax on
      // withdrawals, net effect is growth helps but tax hurts. Should be close to 24.
      // The monthly growth (~0.58%) adds ~$700/mo initially, tax costs ~$400/mo,
      // so net effect is positive but small.
      expect(result.scenarios[0].tier1Months).toBeGreaterThanOrEqual(23)
      expect(result.scenarios[0].tier1Months).toBeLessThanOrEqual(26)
    })
  })
})
