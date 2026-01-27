/**
 * Inflation Utilities
 * 
 * This module provides comprehensive inflation handling for the application.
 * 
 * Key Concepts:
 * - NOMINAL: Actual future dollar amounts (what you'll see in your account)
 * - REAL: Today's purchasing power equivalent (what it's worth in today's terms)
 * 
 * The spending model:
 * - baseMonthlyBudget represents the lifestyle in TODAY's dollars
 * - As time passes, more nominal dollars are needed to maintain that lifestyle
 * - The system calculates both views but the economic reality is the same
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Display mode for inflation-adjusted values
 * - 'nominal': Show actual future amounts (inflated)
 * - 'real': Show values in today's purchasing power (deflated to present value)
 */
export type InflationDisplayMode = 'nominal' | 'real';

/**
 * A monetary value with both nominal and real representations
 * This is the core type for all projected monetary values
 */
export interface InflatedValue {
  /** Actual future dollar amount */
  nominal: number;
  /** Value in today's purchasing power */
  real: number;
}

/**
 * Context for inflation calculations
 */
export interface InflationContext {
  /** Annual inflation rate as a percentage (e.g., 3 for 3%) */
  inflationRate: number;
  /** The reference year (typically current year) where nominal = real */
  baseYear: number;
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Calculate the inflation multiplier for a given number of years
 * 
 * @param yearsFromNow - Number of years from the base year
 * @param inflationRate - Annual inflation rate as percentage (e.g., 3 for 3%)
 * @returns The multiplier (e.g., 1.344 for 10 years at 3%)
 */
export function inflationMultiplier(yearsFromNow: number, inflationRate: number): number {
  if (yearsFromNow <= 0) return 1;
  return Math.pow(1 + inflationRate / 100, yearsFromNow);
}

/**
 * Convert a nominal (future) value to real (today's purchasing power)
 * 
 * @param nominal - The future dollar amount
 * @param yearsFromNow - Years from the base year
 * @param inflationRate - Annual inflation rate as percentage
 * @returns The value in today's purchasing power
 * 
 * @example
 * // $1,344 in 10 years at 3% inflation is worth $1,000 in today's dollars
 * nominalToReal(1344, 10, 3) // Returns ~1000
 */
export function nominalToReal(nominal: number, yearsFromNow: number, inflationRate: number): number {
  if (yearsFromNow <= 0) return nominal;
  const multiplier = inflationMultiplier(yearsFromNow, inflationRate);
  return nominal / multiplier;
}

/**
 * Convert a real (today's dollars) value to nominal (future dollars)
 * 
 * @param real - The value in today's purchasing power
 * @param yearsFromNow - Years from the base year
 * @param inflationRate - Annual inflation rate as percentage
 * @returns The future dollar amount needed to maintain purchasing power
 * 
 * @example
 * // $1,000 today needs to be $1,344 in 10 years to maintain purchasing power at 3% inflation
 * realToNominal(1000, 10, 3) // Returns ~1344
 */
export function realToNominal(real: number, yearsFromNow: number, inflationRate: number): number {
  if (yearsFromNow <= 0) return real;
  const multiplier = inflationMultiplier(yearsFromNow, inflationRate);
  return real * multiplier;
}

// ============================================================================
// INFLATED VALUE CREATION
// ============================================================================

/**
 * Create an InflatedValue from a nominal amount
 * Use this when you have the actual future amount and want to derive the real value
 * 
 * @param nominal - The actual future dollar amount
 * @param yearsFromNow - Years from the base year
 * @param inflationRate - Annual inflation rate as percentage
 */
export function createInflatedValueFromNominal(
  nominal: number,
  yearsFromNow: number,
  inflationRate: number
): InflatedValue {
  return {
    nominal,
    real: nominalToReal(nominal, yearsFromNow, inflationRate),
  };
}

/**
 * Create an InflatedValue from a real (today's dollars) amount
 * Use this when you have a target in today's purchasing power and want to know the future nominal amount
 * 
 * @param real - The value in today's purchasing power
 * @param yearsFromNow - Years from the base year
 * @param inflationRate - Annual inflation rate as percentage
 */
export function createInflatedValueFromReal(
  real: number,
  yearsFromNow: number,
  inflationRate: number
): InflatedValue {
  return {
    nominal: realToNominal(real, yearsFromNow, inflationRate),
    real,
  };
}

/**
 * Create an InflatedValue for the current year (year 0)
 * At year 0, nominal and real are always equal
 * 
 * @param value - The current value (same in both nominal and real)
 */
export function createCurrentInflatedValue(value: number): InflatedValue {
  return {
    nominal: value,
    real: value,
  };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get the display value based on the current inflation display mode
 * 
 * @param value - The InflatedValue to display
 * @param mode - Whether to show nominal or real value
 */
export function getDisplayValue(value: InflatedValue, mode: InflationDisplayMode): number {
  return mode === 'nominal' ? value.nominal : value.real;
}

/**
 * Get the appropriate label suffix for the display mode
 * 
 * @param mode - The current display mode
 * @param short - Whether to use short form
 */
export function getDisplayModeSuffix(mode: InflationDisplayMode, short: boolean = false): string {
  if (mode === 'real') {
    return short ? "(today's $)" : "(in today's dollars)";
  }
  return short ? "(future $)" : "(in future dollars)";
}

/**
 * Get a description of what the display mode means
 */
export function getDisplayModeDescription(mode: InflationDisplayMode): string {
  if (mode === 'real') {
    return "Values shown in today's purchasing power. This helps you understand what future amounts are actually worth.";
  }
  return "Values shown as actual future amounts. This is what you'll actually see in your accounts.";
}

// ============================================================================
// ARITHMETIC OPERATIONS ON INFLATED VALUES
// ============================================================================

/**
 * Add two InflatedValues
 */
export function addInflatedValues(a: InflatedValue, b: InflatedValue): InflatedValue {
  return {
    nominal: a.nominal + b.nominal,
    real: a.real + b.real,
  };
}

/**
 * Subtract InflatedValues (a - b)
 */
export function subtractInflatedValues(a: InflatedValue, b: InflatedValue): InflatedValue {
  return {
    nominal: a.nominal - b.nominal,
    real: a.real - b.real,
  };
}

/**
 * Multiply an InflatedValue by a scalar
 */
export function multiplyInflatedValue(value: InflatedValue, scalar: number): InflatedValue {
  return {
    nominal: value.nominal * scalar,
    real: value.real * scalar,
  };
}

/**
 * Divide an InflatedValue by a scalar
 */
export function divideInflatedValue(value: InflatedValue, scalar: number): InflatedValue {
  if (scalar === 0) {
    return { nominal: 0, real: 0 };
  }
  return {
    nominal: value.nominal / scalar,
    real: value.real / scalar,
  };
}

// ============================================================================
// VALIDATION AND UTILITIES
// ============================================================================

/**
 * Check if an InflatedValue is valid (non-negative values)
 */
export function isValidInflatedValue(value: InflatedValue): boolean {
  return (
    typeof value.nominal === 'number' &&
    typeof value.real === 'number' &&
    !isNaN(value.nominal) &&
    !isNaN(value.real) &&
    isFinite(value.nominal) &&
    isFinite(value.real)
  );
}

/**
 * Create a zero InflatedValue
 */
export function zeroInflatedValue(): InflatedValue {
  return { nominal: 0, real: 0 };
}

/**
 * Format an InflatedValue for debugging
 */
export function formatInflatedValueDebug(value: InflatedValue): string {
  return `{ nominal: $${value.nominal.toLocaleString()}, real: $${value.real.toLocaleString()} }`;
}

// ============================================================================
// SPENDING INFLATION HELPERS
// ============================================================================

/**
 * Calculate inflated spending for a future year
 * 
 * The spending model:
 * - baseMonthlyBudget is in TODAY's dollars (the lifestyle to maintain)
 * - To maintain that lifestyle in the future, we need more nominal dollars
 * - The nominal spending = base * inflationMultiplier + netWorthPortion
 * - The real spending should equal the original base + real netWorthPortion
 * 
 * @param baseMonthlyBudget - The base budget in today's dollars
 * @param netWorth - The projected net worth for that year (nominal)
 * @param spendingGrowthRate - Percentage of net worth to add to spending (annual rate)
 * @param yearsFromNow - Years from now
 * @param inflationRate - Annual inflation rate
 */
export function calculateInflatedSpending(
  baseMonthlyBudget: number,
  netWorth: number,
  spendingGrowthRate: number,
  yearsFromNow: number,
  inflationRate: number
): InflatedValue {
  // The inflation multiplier for this year
  const infMultiplier = inflationMultiplier(yearsFromNow, inflationRate);
  
  // Base budget inflated to maintain purchasing power (nominal)
  const inflatedBaseNominal = baseMonthlyBudget * infMultiplier;
  
  // Net worth portion (monthly) - this is already in nominal terms for that year
  // because netWorth is the projected nominal net worth
  const netWorthPortionNominal = (netWorth * (spendingGrowthRate / 100)) / 12;
  
  // Total nominal monthly spending
  const totalNominal = inflatedBaseNominal + netWorthPortionNominal;
  
  // Real spending = nominal / inflation multiplier
  // This should equal: baseMonthlyBudget + (netWorthReal * spendingGrowthRate / 100 / 12)
  const totalReal = totalNominal / infMultiplier;
  
  return {
    nominal: totalNominal,
    real: totalReal,
  };
}

/**
 * Verify that the real spending equals the expected value
 * This is useful for testing that we're not double-inflating
 * 
 * The real spending should be: base + (netWorthReal * rate / 12)
 * where netWorthReal = netWorthNominal / inflationMultiplier
 */
export function verifySpendingCalculation(
  baseMonthlyBudget: number,
  netWorthNominal: number,
  spendingGrowthRate: number,
  yearsFromNow: number,
  inflationRate: number
): { isCorrect: boolean; expected: number; actual: number } {
  const spending = calculateInflatedSpending(
    baseMonthlyBudget,
    netWorthNominal,
    spendingGrowthRate,
    yearsFromNow,
    inflationRate
  );
  
  const infMultiplier = inflationMultiplier(yearsFromNow, inflationRate);
  const netWorthReal = netWorthNominal / infMultiplier;
  const expectedReal = baseMonthlyBudget + (netWorthReal * (spendingGrowthRate / 100)) / 12;
  
  const isCorrect = Math.abs(spending.real - expectedReal) < 0.01; // Allow small floating point errors
  
  return {
    isCorrect,
    expected: expectedReal,
    actual: spending.real,
  };
}
