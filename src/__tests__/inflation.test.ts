/**
 * Tests for the inflation module
 * 
 * Validates the inflation calculations and conversions between
 * nominal (future dollars) and real (today's purchasing power) values.
 */

import { describe, it, expect } from 'vitest';
import {
  inflationMultiplier,
  nominalToReal,
  realToNominal,
  createInflatedValueFromNominal,
  createInflatedValueFromReal,
  createCurrentInflatedValue,
  getDisplayValue,
  addInflatedValues,
  subtractInflatedValues,
  multiplyInflatedValue,
  divideInflatedValue,
  calculateInflatedSpending,
  verifySpendingCalculation,
  zeroInflatedValue,
  isValidInflatedValue,
} from '../lib/inflation';

// ============================================================================
// INFLATION MULTIPLIER TESTS
// ============================================================================

describe('Inflation Multiplier', () => {
  it('should return 1 for year 0', () => {
    expect(inflationMultiplier(0, 3)).toBe(1);
  });

  it('should return 1 for negative years', () => {
    expect(inflationMultiplier(-5, 3)).toBe(1);
  });

  it('should calculate correct multiplier for 1 year at 3%', () => {
    expect(inflationMultiplier(1, 3)).toBeCloseTo(1.03, 5);
  });

  it('should calculate correct multiplier for 10 years at 3%', () => {
    // (1.03)^10 = 1.3439...
    expect(inflationMultiplier(10, 3)).toBeCloseTo(1.3439, 3);
  });

  it('should handle 0% inflation', () => {
    expect(inflationMultiplier(10, 0)).toBe(1);
  });

  it('should handle high inflation rates', () => {
    // 5% for 20 years = (1.05)^20 = 2.6533...
    expect(inflationMultiplier(20, 5)).toBeCloseTo(2.6533, 3);
  });
});

// ============================================================================
// NOMINAL TO REAL CONVERSION TESTS
// ============================================================================

describe('Nominal to Real Conversion', () => {
  it('should return same value for year 0', () => {
    expect(nominalToReal(1000, 0, 3)).toBe(1000);
  });

  it('should deflate future values correctly', () => {
    // $1,030 in 1 year at 3% inflation is worth $1,000 today
    expect(nominalToReal(1030, 1, 3)).toBeCloseTo(1000, 1);
  });

  it('should deflate values over 10 years', () => {
    // $1,344 in 10 years at 3% inflation is worth ~$1,000 today
    expect(nominalToReal(1344, 10, 3)).toBeCloseTo(1000, 0);
  });

  it('should handle zero value', () => {
    expect(nominalToReal(0, 10, 3)).toBe(0);
  });
});

// ============================================================================
// REAL TO NOMINAL CONVERSION TESTS
// ============================================================================

describe('Real to Nominal Conversion', () => {
  it('should return same value for year 0', () => {
    expect(realToNominal(1000, 0, 3)).toBe(1000);
  });

  it('should inflate values correctly for 1 year', () => {
    // $1,000 today needs to be $1,030 in 1 year to maintain purchasing power at 3%
    expect(realToNominal(1000, 1, 3)).toBeCloseTo(1030, 1);
  });

  it('should inflate values over 10 years', () => {
    // $1,000 today needs to be ~$1,344 in 10 years at 3%
    expect(realToNominal(1000, 10, 3)).toBeCloseTo(1344, 0);
  });

  it('should be inverse of nominalToReal', () => {
    const nominal = 2500;
    const years = 15;
    const rate = 3.5;
    
    const real = nominalToReal(nominal, years, rate);
    const backToNominal = realToNominal(real, years, rate);
    
    expect(backToNominal).toBeCloseTo(nominal, 2);
  });
});

// ============================================================================
// INFLATED VALUE CREATION TESTS
// ============================================================================

describe('Inflated Value Creation', () => {
  describe('createInflatedValueFromNominal', () => {
    it('should create value with both nominal and real', () => {
      const value = createInflatedValueFromNominal(1344, 10, 3);
      
      expect(value.nominal).toBe(1344);
      expect(value.real).toBeCloseTo(1000, 0);
    });

    it('should have equal values for year 0', () => {
      const value = createInflatedValueFromNominal(1000, 0, 3);
      
      expect(value.nominal).toBe(1000);
      expect(value.real).toBe(1000);
    });
  });

  describe('createInflatedValueFromReal', () => {
    it('should create value with both nominal and real', () => {
      const value = createInflatedValueFromReal(1000, 10, 3);
      
      expect(value.real).toBe(1000);
      expect(value.nominal).toBeCloseTo(1344, 0);
    });

    it('should have equal values for year 0', () => {
      const value = createInflatedValueFromReal(1000, 0, 3);
      
      expect(value.nominal).toBe(1000);
      expect(value.real).toBe(1000);
    });
  });

  describe('createCurrentInflatedValue', () => {
    it('should create value with equal nominal and real', () => {
      const value = createCurrentInflatedValue(5000);
      
      expect(value.nominal).toBe(5000);
      expect(value.real).toBe(5000);
    });
  });
});

// ============================================================================
// DISPLAY VALUE TESTS
// ============================================================================

describe('getDisplayValue', () => {
  const testValue = {
    nominal: 2000,
    real: 1500,
  };

  it('should return nominal value in nominal mode', () => {
    expect(getDisplayValue(testValue, 'nominal')).toBe(2000);
  });

  it('should return real value in real mode', () => {
    expect(getDisplayValue(testValue, 'real')).toBe(1500);
  });
});

// ============================================================================
// ARITHMETIC OPERATIONS TESTS
// ============================================================================

describe('Inflated Value Arithmetic', () => {
  const a = { nominal: 1000, real: 800 };
  const b = { nominal: 500, real: 400 };

  describe('addInflatedValues', () => {
    it('should add both components', () => {
      const result = addInflatedValues(a, b);
      expect(result.nominal).toBe(1500);
      expect(result.real).toBe(1200);
    });
  });

  describe('subtractInflatedValues', () => {
    it('should subtract both components', () => {
      const result = subtractInflatedValues(a, b);
      expect(result.nominal).toBe(500);
      expect(result.real).toBe(400);
    });
  });

  describe('multiplyInflatedValue', () => {
    it('should multiply both components', () => {
      const result = multiplyInflatedValue(a, 2);
      expect(result.nominal).toBe(2000);
      expect(result.real).toBe(1600);
    });
  });

  describe('divideInflatedValue', () => {
    it('should divide both components', () => {
      const result = divideInflatedValue(a, 2);
      expect(result.nominal).toBe(500);
      expect(result.real).toBe(400);
    });

    it('should return zero for division by zero', () => {
      const result = divideInflatedValue(a, 0);
      expect(result.nominal).toBe(0);
      expect(result.real).toBe(0);
    });
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('Validation Functions', () => {
  describe('isValidInflatedValue', () => {
    it('should return true for valid values', () => {
      expect(isValidInflatedValue({ nominal: 1000, real: 800 })).toBe(true);
    });

    it('should return true for zero values', () => {
      expect(isValidInflatedValue({ nominal: 0, real: 0 })).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isValidInflatedValue({ nominal: NaN, real: 100 })).toBe(false);
      expect(isValidInflatedValue({ nominal: 100, real: NaN })).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(isValidInflatedValue({ nominal: Infinity, real: 100 })).toBe(false);
    });
  });

  describe('zeroInflatedValue', () => {
    it('should create a zero value', () => {
      const zero = zeroInflatedValue();
      expect(zero.nominal).toBe(0);
      expect(zero.real).toBe(0);
    });
  });
});

// ============================================================================
// SPENDING CALCULATION TESTS
// ============================================================================

describe('Spending Calculations', () => {
  describe('calculateInflatedSpending', () => {
    it('should return equal nominal and real for year 0', () => {
      const spending = calculateInflatedSpending(
        3000,     // baseMonthlyBudget
        500000,   // netWorth
        2,        // spendingGrowthRate (2% of NW annually)
        0,        // yearsFromNow
        3         // inflationRate
      );

      // Year 0: nominal = real
      expect(spending.nominal).toBe(spending.real);
      
      // Base (3000) + NW portion (500000 * 0.02 / 12 = 833.33)
      expect(spending.nominal).toBeCloseTo(3833.33, 0);
    });

    it('should inflate base budget correctly', () => {
      const spending = calculateInflatedSpending(
        3000,     // baseMonthlyBudget
        0,        // netWorth (zero for simplicity)
        0,        // spendingGrowthRate
        10,       // yearsFromNow
        3         // inflationRate
      );

      // Nominal = 3000 * (1.03)^10 = 4031.75
      expect(spending.nominal).toBeCloseTo(4031.75, 0);
      
      // Real should equal original base (no NW portion)
      expect(spending.real).toBeCloseTo(3000, 0);
    });

    it('should include net worth portion correctly', () => {
      const baseMonthlyBudget = 3000;
      const netWorth = 1000000;
      const spendingGrowthRate = 2;
      const yearsFromNow = 10;
      const inflationRate = 3;

      const spending = calculateInflatedSpending(
        baseMonthlyBudget,
        netWorth,
        spendingGrowthRate,
        yearsFromNow,
        inflationRate
      );

      // Calculate expected values
      const inflationMult = Math.pow(1.03, 10);
      const inflatedBase = baseMonthlyBudget * inflationMult;
      const nwPortion = (netWorth * 0.02) / 12;
      const expectedNominal = inflatedBase + nwPortion;
      const expectedReal = expectedNominal / inflationMult;

      expect(spending.nominal).toBeCloseTo(expectedNominal, 0);
      expect(spending.real).toBeCloseTo(expectedReal, 0);
    });
  });

  describe('verifySpendingCalculation', () => {
    it('should verify spending calculation is correct', () => {
      const result = verifySpendingCalculation(
        3000,     // baseMonthlyBudget
        1000000,  // netWorthNominal
        2,        // spendingGrowthRate
        10,       // yearsFromNow
        3         // inflationRate
      );

      expect(result.isCorrect).toBe(true);
    });

    it('should work for year 0', () => {
      const result = verifySpendingCalculation(3000, 500000, 2, 0, 3);
      expect(result.isCorrect).toBe(true);
    });
  });
});

// ============================================================================
// REAL-WORLD SCENARIO TESTS
// ============================================================================

describe('Real-World Scenarios', () => {
  it('should handle a 30-year projection', () => {
    // Someone with $100k today, what is it worth in real terms after 30 years at 3% inflation?
    const futureNominal = 100000 * Math.pow(1.03, 30); // What they'd need to have same purchasing power
    const realValue = nominalToReal(futureNominal, 30, 3);
    
    // If they have exactly the inflated amount, the real value should be $100k
    expect(realValue).toBeCloseTo(100000, 0);
  });

  it('should show spending remains constant in real terms', () => {
    // Start with $3000/month base
    // Over 20 years at 3% inflation
    const year0Spending = calculateInflatedSpending(3000, 0, 0, 0, 3);
    const year10Spending = calculateInflatedSpending(3000, 0, 0, 10, 3);
    const year20Spending = calculateInflatedSpending(3000, 0, 0, 20, 3);

    // Real spending should stay the same (lifestyle maintained)
    expect(year0Spending.real).toBeCloseTo(3000, 0);
    expect(year10Spending.real).toBeCloseTo(3000, 0);
    expect(year20Spending.real).toBeCloseTo(3000, 0);

    // Nominal spending should increase
    expect(year10Spending.nominal).toBeGreaterThan(year0Spending.nominal);
    expect(year20Spending.nominal).toBeGreaterThan(year10Spending.nominal);
  });

  it('should calculate FI progress consistently in both modes', () => {
    // FI progress = netWorth / fiTarget
    // Both inflate by the same factor, so the ratio should be the same
    
    const netWorthNominal = 500000;
    const fiTargetNominal = 1000000;
    const yearsFromNow = 15;
    const inflationRate = 3;

    // Calculate real values
    const netWorthReal = nominalToReal(netWorthNominal, yearsFromNow, inflationRate);
    const fiTargetReal = nominalToReal(fiTargetNominal, yearsFromNow, inflationRate);

    // FI progress should be the same in both
    const nominalProgress = (netWorthNominal / fiTargetNominal) * 100;
    const realProgress = (netWorthReal / fiTargetReal) * 100;

    expect(nominalProgress).toBeCloseTo(realProgress, 5);
    expect(nominalProgress).toBe(50);
    expect(realProgress).toBe(50);
  });

  it('should not double-inflate spending', () => {
    // This test verifies the key requirement: spending should not be double-inflated
    // when both the base budget is inflated AND the result is shown in nominal terms
    
    const baseMonthlyBudget = 3000;
    const inflationRate = 3;
    
    // Year 0: Spending should be exactly $3000 (no inflation)
    const year0 = calculateInflatedSpending(baseMonthlyBudget, 0, 0, 0, inflationRate);
    expect(year0.nominal).toBe(3000);
    expect(year0.real).toBe(3000);
    
    // Year 5: Nominal spending should be 3000 * (1.03)^5 = $3,477.82
    // Real spending should still be $3,000
    const year5 = calculateInflatedSpending(baseMonthlyBudget, 0, 0, 5, inflationRate);
    expect(year5.nominal).toBeCloseTo(3477.82, 0);
    expect(year5.real).toBeCloseTo(3000, 0);
    
    // The verification helper confirms this
    expect(verifySpendingCalculation(baseMonthlyBudget, 0, 0, 5, inflationRate).isCorrect).toBe(true);
  });
});
