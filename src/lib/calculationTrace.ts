/**
 * Calculation Tracing System
 *
 * This module provides a way to track calculations with their inputs, formulas,
 * and results. This enables transparency and debugging of financial calculations.
 */

import { TrackedNumber } from './TrackedNumber';

// ============================================================================
// TYPES
// ============================================================================

/** Source of a value - helps users understand where the value came from */
export type ValueSource = 
  | 'setting'      // User-configurable setting (e.g., baseMonthlyBudget, swr)
  | 'calculated'   // Computed from other values
  | 'input'        // User input (e.g., account balances)
  | 'constant'     // Fixed constant (e.g., IRS limits)
  | 'api'          // From external API or database
  | 'derived';     // Derived from other calculated values

export interface CalculationInput {
  name: string;
  value: number | string | boolean;
  unit?: string;
  description?: string;
  /** Where this value comes from */
  source?: ValueSource;
  /** For settings: which scenario setting this maps to */
  settingKey?: string;
  /** For calculated values: the full trace of how it was calculated */
  trace?: TrackedCalculation;
}

export interface CalculationStep {
  description: string;
  formula?: string;
  inputs: CalculationInput[];
  intermediateResult?: number;
  /** Unit for the intermediate result */
  unit?: string;
}

export interface TrackedCalculation {
  id: string;
  name: string;
  description: string;
  category: CalculationCategory;
  formula: string;
  inputs: CalculationInput[];
  steps?: CalculationStep[];
  result: number;
  unit: string;
  timestamp: number;
}

export type CalculationCategory = 
  | 'net_worth'
  | 'growth_rate'
  | 'swr'
  | 'fi_target'
  | 'projection'
  | 'spending'
  | 'tax'
  | 'level'
  | 'milestone';

// TrackedValue wraps a number with its calculation trace
export interface TrackedValue {
  value: number;
  trace: TrackedCalculation;
}

// ============================================================================
// CALCULATION BUILDER
// ============================================================================

/**
 * Builder class for creating tracked calculations
 */
export class CalculationBuilder {
  private id: string;
  private name: string;
  private description: string = '';
  private category: CalculationCategory;
  private formula: string = '';
  private inputs: CalculationInput[] = [];
  private steps: CalculationStep[] = [];
  private unit: string = '';

  constructor(id: string, name: string, category: CalculationCategory) {
    this.id = id;
    this.name = name;
    this.category = category;
  }

  setDescription(description: string): this {
    this.description = description;
    return this;
  }

  setFormula(formula: string): this {
    this.formula = formula;
    return this;
  }

  setUnit(unit: string): this {
    this.unit = unit;
    return this;
  }

  addInput(name: string, value: number | string | boolean, unit?: string, description?: string): this {
    this.inputs.push({ name, value, unit, description });
    return this;
  }

  /** Add an input with source information */
  addInputWithSource(
    name: string, 
    value: number | string | boolean, 
    source: ValueSource,
    options?: { 
      unit?: string; 
      description?: string; 
      settingKey?: string;
      trace?: TrackedCalculation;
    }
  ): this {
    this.inputs.push({ 
      name, 
      value, 
      source,
      unit: options?.unit,
      description: options?.description,
      settingKey: options?.settingKey,
      trace: options?.trace,
    });
    return this;
  }

  /** Add a tracked value as an input (includes its full calculation trace) */
  addTrackedInput(name: string, trackedValue: TrackedValue, description?: string): this {
    this.inputs.push({
      name,
      value: trackedValue.value,
      unit: trackedValue.trace.unit,
      description: description || trackedValue.trace.description,
      source: 'calculated',
      trace: trackedValue.trace,
    });
    return this;
  }

  /** Add a setting value as an input */
  addSetting(name: string, value: number | string | boolean, settingKey: string, options?: { unit?: string; description?: string }): this {
    this.inputs.push({
      name,
      value,
      source: 'setting',
      settingKey,
      unit: options?.unit,
      description: options?.description || `From scenario setting: ${settingKey}`,
    });
    return this;
  }

  addStep(description: string, formula?: string, inputs?: CalculationInput[], intermediateResult?: number, unit?: string): this {
    this.steps.push({
      description,
      formula,
      inputs: inputs || [],
      intermediateResult,
      unit,
    });
    return this;
  }

  build(result: number): TrackedValue {
    return {
      value: result,
      trace: {
        id: this.id,
        name: this.name,
        description: this.description,
        category: this.category,
        formula: this.formula,
        inputs: this.inputs,
        steps: this.steps.length > 0 ? this.steps : undefined,
        result,
        unit: this.unit,
        timestamp: Date.now(),
      },
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a simple tracked value without full calculation details
 */
export function createSimpleTrackedValue(
  value: number,
  name: string,
  description: string,
  category: CalculationCategory,
  unit: string = '$'
): TrackedValue {
  return {
    value,
    trace: {
      id: `${category}_${name}_${Date.now()}`,
      name,
      description,
      category,
      formula: `= ${value}`,
      inputs: [],
      result: value,
      unit,
      timestamp: Date.now(),
    },
  };
}

/**
 * Combine multiple traced calculations into a single result
 */
export function combineTrackedValues(
  values: TrackedValue[],
  operation: 'sum' | 'multiply' | 'subtract' | 'divide',
  name: string,
  category: CalculationCategory,
  description: string = ''
): TrackedValue {
  let result: number;
  let formula: string;
  
  switch (operation) {
    case 'sum':
      result = values.reduce((acc, v) => acc + v.value, 0);
      formula = values.map(v => v.trace.name).join(' + ');
      break;
    case 'multiply':
      result = values.reduce((acc, v) => acc * v.value, 1);
      formula = values.map(v => v.trace.name).join(' × ');
      break;
    case 'subtract':
      result = values[0]?.value ?? 0;
      for (let i = 1; i < values.length; i++) {
        result -= values[i].value;
      }
      formula = values.map(v => v.trace.name).join(' - ');
      break;
    case 'divide':
      result = values[0]?.value ?? 0;
      for (let i = 1; i < values.length; i++) {
        if (values[i].value !== 0) {
          result /= values[i].value;
        }
      }
      formula = values.map(v => v.trace.name).join(' ÷ ');
      break;
  }

  return {
    value: result,
    trace: {
      id: `combined_${name}_${Date.now()}`,
      name,
      description: description || `Combined calculation: ${operation}`,
      category,
      formula,
      inputs: values.map(v => ({
        name: v.trace.name,
        value: v.value,
        unit: v.trace.unit,
      })),
      result,
      unit: values[0]?.trace.unit || '$',
      timestamp: Date.now(),
    },
  };
}

/**
 * Format a calculation trace for display
 */
export function formatTrace(trace: TrackedCalculation): string {
  const lines: string[] = [
    `${trace.name}`,
    `───────────────────`,
    `Formula: ${trace.formula}`,
    '',
    'Inputs:',
  ];

  for (const input of trace.inputs) {
    const valueStr = typeof input.value === 'number' 
      ? formatNumber(input.value, input.unit)
      : String(input.value);
    lines.push(`  ${input.name}: ${valueStr}${input.description ? ` (${input.description})` : ''}`);
  }

  if (trace.steps && trace.steps.length > 0) {
    lines.push('');
    lines.push('Steps:');
    for (let i = 0; i < trace.steps.length; i++) {
      const step = trace.steps[i];
      lines.push(`  ${i + 1}. ${step.description}`);
      if (step.formula) {
        lines.push(`     ${step.formula}`);
      }
      if (step.intermediateResult !== undefined) {
        lines.push(`     = ${formatNumber(step.intermediateResult, trace.unit)}`);
      }
    }
  }

  lines.push('');
  lines.push(`Result: ${formatNumber(trace.result, trace.unit)}`);

  return lines.join('\n');
}

/**
 * Format a number with appropriate unit
 */
export function formatNumber(value: number, unit?: string): string {
  if (unit === '$') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  
  if (unit === '%') {
    return `${value.toFixed(2)}%`;
  }
  
  if (unit === 'years') {
    return `${value.toFixed(1)} years`;
  }
  
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// ============================================================================
// CALCULATION REGISTRY
// ============================================================================

/**
 * Registry for storing and retrieving traced calculations
 * Useful for debugging and validation
 */
class CalculationRegistry {
  private calculations: Map<string, TrackedCalculation> = new Map();
  private maxSize: number = 1000;

  register(trace: TrackedCalculation): void {
    // Implement LRU-like behavior by removing oldest if at capacity
    if (this.calculations.size >= this.maxSize) {
      const oldestKey = this.calculations.keys().next().value;
      if (oldestKey) {
        this.calculations.delete(oldestKey);
      }
    }
    this.calculations.set(trace.id, trace);
  }

  get(id: string): TrackedCalculation | undefined {
    return this.calculations.get(id);
  }

  getByCategory(category: CalculationCategory): TrackedCalculation[] {
    return Array.from(this.calculations.values()).filter(c => c.category === category);
  }

  getRecent(count: number = 10): TrackedCalculation[] {
    return Array.from(this.calculations.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  clear(): void {
    this.calculations.clear();
  }
}

export const calculationRegistry = new CalculationRegistry();

// ============================================================================
// TRACED CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate FI target with full tracing.
 * Delegates to the TrackedNumber version for recursive drill-down.
 */
export function calculateFiTargetTracked(
  monthlySpend: number,
  swr: number,
  monthlySpendSource?: { source: ValueSource; settingKey?: string; trace?: TrackedCalculation }
): TrackedValue {
  // Build a TrackedNumber for the monthly spend input
  let spendTN: TrackedNumber;
  if (monthlySpendSource?.trace) {
    spendTN = TrackedNumber.fromTrackedValue({ value: monthlySpend, trace: monthlySpendSource.trace });
  } else {
    spendTN = TrackedNumber.from(monthlySpend, 'Monthly Spend', { unit: '$', category: 'fi_target', description: 'Your monthly spending (level-based or fixed)' });
  }

  const swrTN = TrackedNumber.setting(swr, 'Safe Withdrawal Rate', 'swr', {
    unit: '%',
    description: 'The percentage you can safely withdraw annually without depleting your portfolio',
    category: 'fi_target',
  });

  const result = calculateFiTargetTN(spendTN, swrTN);
  calculationRegistry.register(result.trace);
  return result.toTrackedValue();
}

/**
 * Calculate SWR amounts with full tracing.
 * Delegates to the TrackedNumber version for recursive drill-down.
 */
export function calculateSwrAmountsTracked(
  netWorth: number,
  swr: number
): {
  annual: TrackedValue;
  monthly: TrackedValue;
  weekly: TrackedValue;
  daily: TrackedValue;
} {
  const nwTN = TrackedNumber.from(netWorth, 'Net Worth', { unit: '$', category: 'swr' });
  const swrTN = TrackedNumber.setting(swr, 'Safe Withdrawal Rate', 'swr', {
    unit: '%',
    description: 'Annual withdrawal rate',
    category: 'swr',
  });

  const result = calculateSwrAmountsTN(nwTN, swrTN);
  return {
    annual: result.annual.toTrackedValue(),
    monthly: result.monthly.toTrackedValue(),
    weekly: result.weekly.toTrackedValue(),
    daily: result.daily.toTrackedValue(),
  };
}

/**
 * Calculate growth rates with full tracing
 */
export function calculateGrowthRatesTracked(
  netWorth: number,
  annualReturnRate: number,
  yearlyContributions: number = 0
): {
  perSecond: TrackedValue;
  perMinute: TrackedValue;
  perHour: TrackedValue;
  perDay: TrackedValue;
  perYear: TrackedValue;
} {
  const yearlyAppreciation = netWorth * (annualReturnRate / 100);
  const yearlyTotal = yearlyAppreciation + yearlyContributions;
  
  const perYear = yearlyTotal;
  const perDay = yearlyTotal / 365.25;
  const perHour = perDay / 24;
  const perMinute = perHour / 60;
  const perSecond = perMinute / 60;

  const baseBuilder = () => new CalculationBuilder('growth', 'Growth Rate', 'growth_rate')
    .addInput('Net Worth', netWorth, '$')
    .addInput('Annual Return Rate', annualReturnRate, '%')
    .addInput('Yearly Contributions', yearlyContributions, '$');

  return {
    perSecond: baseBuilder()
      .setDescription('How much your net worth grows per second')
      .setFormula('Per Second = (Net Worth × Rate + Contributions) ÷ 31,557,600')
      .setUnit('$')
      .build(perSecond),
    perMinute: baseBuilder()
      .setDescription('How much your net worth grows per minute')
      .setFormula('Per Minute = (Net Worth × Rate + Contributions) ÷ 525,960')
      .setUnit('$')
      .build(perMinute),
    perHour: baseBuilder()
      .setDescription('How much your net worth grows per hour')
      .setFormula('Per Hour = (Net Worth × Rate + Contributions) ÷ 8,766')
      .setUnit('$')
      .build(perHour),
    perDay: baseBuilder()
      .setDescription('How much your net worth grows per day')
      .setFormula('Per Day = (Net Worth × Rate + Contributions) ÷ 365.25')
      .setUnit('$')
      .build(perDay),
    perYear: baseBuilder()
      .setDescription('How much your net worth grows per year')
      .setFormula('Per Year = (Net Worth × Rate) + Contributions')
      .setUnit('$')
      .addStep('Calculate appreciation', 'Net Worth × (Rate ÷ 100)', [], yearlyAppreciation)
      .addStep('Add contributions', 'Appreciation + Contributions', [], perYear)
      .build(perYear),
  };
}

/**
 * Calculate real-time net worth with full tracing
 */
export function calculateRealTimeNetWorthTracked(
  baseAmount: number,
  entryTimestamp: number,
  annualReturnRate: number,
  includeContributions: boolean = false,
  yearlyContribution: number = 0
): {
  total: TrackedValue;
  appreciation: TrackedValue;
  contributions: TrackedValue;
} {
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const elapsed = now - entryTimestamp;
  const yearsElapsed = elapsed / MS_PER_YEAR;
  const yearlyRate = annualReturnRate / 100;
  
  // Simple interest approximation for real-time display
  const msRate = yearlyRate / MS_PER_YEAR;
  const appreciation = baseAmount * msRate * elapsed;
  
  let contributions = 0;
  if (includeContributions && yearlyContribution > 0) {
    contributions = yearlyContribution * yearsElapsed;
    contributions += contributions * msRate * (elapsed / 2);
  }
  
  const total = baseAmount + appreciation + contributions;

  const appreciationBuilder = new CalculationBuilder('appreciation', 'Appreciation', 'net_worth')
    .setDescription('Growth from investment returns since last entry')
    .setFormula('Appreciation = Base Amount × Rate per ms × Time Elapsed')
    .setUnit('$')
    .addInput('Base Amount', baseAmount, '$', 'Your net worth at last entry')
    .addInput('Annual Return Rate', annualReturnRate, '%')
    .addInput('Time Elapsed', yearsElapsed, 'years')
    .addStep('Calculate ms rate', 'Annual Rate ÷ ms per year', [], msRate)
    .addStep('Calculate appreciation', 'Base × ms rate × elapsed ms', [], appreciation);

  const contributionsBuilder = new CalculationBuilder('contributions', 'Contributions', 'net_worth')
    .setDescription('Contributions added since last entry')
    .setFormula('Contributions = Yearly Contribution × Years Elapsed (+ growth)')
    .setUnit('$')
    .addInput('Yearly Contribution', yearlyContribution, '$')
    .addInput('Time Elapsed', yearsElapsed, 'years')
    .addInput('Include Contributions', includeContributions);

  const totalBuilder = new CalculationBuilder('total_net_worth', 'Current Net Worth', 'net_worth')
    .setDescription('Your current total net worth including appreciation and contributions')
    .setFormula('Total = Base Amount + Appreciation + Contributions')
    .setUnit('$')
    .addInput('Base Amount', baseAmount, '$')
    .addInput('Appreciation', appreciation, '$')
    .addInput('Contributions', contributions, '$')
    .addStep('Sum all components', 'Base + Appreciation + Contributions', [], total);

  return {
    total: totalBuilder.build(total),
    appreciation: appreciationBuilder.build(appreciation),
    contributions: contributionsBuilder.build(contributions),
  };
}

/**
 * Calculate FI progress with tracing.
 * Delegates to the TrackedNumber version for recursive drill-down.
 */
export function calculateFiProgressTracked(
  netWorth: number,
  fiTarget: number
): TrackedValue {
  const nwTN = TrackedNumber.from(netWorth, 'Net Worth', { unit: '$', category: 'fi_target' });
  const fiTN = TrackedNumber.from(fiTarget, 'FI Target', { unit: '$', category: 'fi_target' });
  return calculateFiProgressTN(nwTN, fiTN).toTrackedValue();
}

/**
 * Calculate level-based spending with tracing
 * Delegates to the TrackedNumber version for recursive drill-down.
 */
export function calculateLevelBasedSpendingTracked(
  netWorth: number,
  baseMonthlyBudget: number,
  spendingGrowthRate: number,
  inflationRate: number,
  yearsFromNow: number = 0
): TrackedValue {
  return calculateLevelBasedSpendingTN(
    TrackedNumber.from(netWorth, 'Net Worth', { unit: '$', category: 'spending' }),
    TrackedNumber.setting(baseMonthlyBudget, 'Base Monthly Budget', 'baseMonthlyBudget', { unit: '$', description: 'Your base spending floor' }),
    TrackedNumber.setting(spendingGrowthRate, 'Spending Growth Rate', 'spendingGrowthRate', { unit: '%', description: 'Additional spending as % of net worth' }),
    TrackedNumber.setting(inflationRate, 'Inflation Rate', 'inflationRate', { unit: '%' }),
    TrackedNumber.from(yearsFromNow, 'Years From Now', { unit: 'years' }),
  ).toTrackedValue();
}

/**
 * Calculate compound growth with tracing
 */
export function calculateCompoundGrowthTracked(
  principal: number,
  yearlyRate: number,
  years: number,
  yearlyContribution: number = 0
): {
  total: TrackedValue;
  interest: TrackedValue;
  contributed: TrackedValue;
} {
  const r = yearlyRate / 100;
  
  // Compound growth on principal
  const compoundedPrincipal = principal * Math.pow(1 + r, years);
  
  // Future value of annual contributions
  let contributionGrowth = 0;
  if (r > 0 && years > 0) {
    contributionGrowth = yearlyContribution * ((Math.pow(1 + r, years) - 1) / r);
  } else {
    contributionGrowth = yearlyContribution * years;
  }
  
  const totalContributed = years * yearlyContribution;
  const total = compoundedPrincipal + contributionGrowth;
  const totalInterest = total - principal - totalContributed;

  const totalBuilder = new CalculationBuilder('compound_total', 'Future Value', 'projection')
    .setDescription('Projected net worth after compound growth')
    .setFormula('FV = Principal × (1 + r)^n + Contribution × ((1 + r)^n - 1) / r')
    .setUnit('$')
    .addInput('Principal', principal, '$', 'Starting amount')
    .addInput('Annual Return Rate', yearlyRate, '%')
    .addInput('Years', years, 'years')
    .addInput('Yearly Contribution', yearlyContribution, '$')
    .addStep('Compound principal', `${principal} × (1 + ${r})^${years}`, [], compoundedPrincipal)
    .addStep('Calculate contribution growth', 'FV of annuity formula', [], contributionGrowth)
    .addStep('Sum components', 'Compounded Principal + Contribution Growth', [], total);

  const interestBuilder = new CalculationBuilder('compound_interest', 'Total Interest', 'projection')
    .setDescription('Total interest earned from compound growth')
    .setFormula('Interest = Total - Principal - Total Contributed')
    .setUnit('$')
    .addInput('Total', total, '$')
    .addInput('Principal', principal, '$')
    .addInput('Total Contributed', totalContributed, '$');

  return {
    total: totalBuilder.build(total),
    interest: interestBuilder.build(totalInterest),
    contributed: new CalculationBuilder('contributions', 'Total Contributed', 'projection')
      .setDescription('Total amount contributed over the period')
      .setFormula('Contributed = Years × Yearly Contribution')
      .setUnit('$')
      .addInput('Years', years, 'years')
      .addInput('Yearly Contribution', yearlyContribution, '$')
      .build(totalContributed),
  };
}

// ============================================================================
// TRACKEDNUMBER-BASED CALCULATION FUNCTIONS
// ============================================================================

/**
 * Level-based spending via TrackedNumber — fully recursive drill-down.
 *
 * Computes: inflatedBase + netWorthPortion
 *   inflatedBase   = baseBudget × (1 + inflation/100) ^ years
 *   netWorthPortion = netWorth × growthRate/100 / 12
 */
export function calculateLevelBasedSpendingTN(
  netWorth: TrackedNumber,
  baseBudget: TrackedNumber,
  growthRate: TrackedNumber,
  inflation: TrackedNumber,
  years: TrackedNumber,
): TrackedNumber {
  // inflatedBase = baseBudget × (1 + inflation/100) ^ years
  const one = TrackedNumber.constant(1, '1');
  const hundred = TrackedNumber.constant(100, '100');
  const inflationDecimal = inflation.divide(hundred, { name: 'Inflation (decimal)', description: 'Inflation rate as a decimal' });
  const inflationFactor = one.add(inflationDecimal, { name: 'Inflation Factor', description: '1 + inflation rate' });
  const inflationMultiplier = inflationFactor.pow(years, { name: 'Inflation Multiplier', description: 'Compounded inflation over projection period' });
  const inflatedBase = baseBudget.multiply(inflationMultiplier, {
    name: 'Inflation-Adjusted Base',
    unit: '$',
    description: 'Base budget adjusted for inflation',
    category: 'spending',
  });

  // netWorthPortion = netWorth × growthRate/100 / 12
  const growthDecimal = growthRate.divide(hundred, { name: 'Growth Rate (decimal)', description: 'Spending growth rate as a decimal' });
  const annualNwPortion = netWorth.multiply(growthDecimal, { name: 'Annual NW Portion', unit: '$', description: 'Additional annual spending from net worth' });
  const twelve = TrackedNumber.constant(12, 'Months per year');
  const netWorthPortion = annualNwPortion.divide(twelve, {
    name: 'Net Worth Portion',
    unit: '$',
    description: 'Additional monthly spending from net worth',
    category: 'spending',
  });

  return inflatedBase.add(netWorthPortion, {
    name: 'Level-Based Spending',
    unit: '$',
    description: 'Monthly spending budget based on your net worth level',
    formula: 'Inflation-Adjusted Base + Net Worth Portion',
    category: 'spending',
  });
}

/**
 * FI target via TrackedNumber — (monthlySpend × 12) / (swr / 100)
 */
export function calculateFiTargetTN(
  monthlySpend: TrackedNumber,
  swr: TrackedNumber,
): TrackedNumber {
  if (monthlySpend.value <= 0 || swr.value <= 0) {
    return TrackedNumber.from(0, 'FI Target', { unit: '$', category: 'fi_target', description: 'Cannot compute — spend or SWR is zero' });
  }

  const twelve = TrackedNumber.constant(12, 'Months per year');
  const annualSpend = monthlySpend.multiply(twelve, {
    name: 'Annual Spending',
    unit: '$',
    description: 'Monthly spend annualized',
    category: 'fi_target',
  });

  const hundred = TrackedNumber.constant(100, '100');
  const swrDecimal = swr.divide(hundred, { name: 'SWR (decimal)', description: 'Safe withdrawal rate as a decimal' });

  return annualSpend.divide(swrDecimal, {
    name: 'FI Target',
    unit: '$',
    description: 'The net worth needed to achieve financial independence',
    formula: '(Monthly Spend × 12) ÷ (SWR ÷ 100)',
    category: 'fi_target',
  });
}

/**
 * SWR amounts via TrackedNumber — netWorth × swr/100, then divides for periods.
 */
export function calculateSwrAmountsTN(
  netWorth: TrackedNumber,
  swr: TrackedNumber,
): { annual: TrackedNumber; monthly: TrackedNumber; weekly: TrackedNumber; daily: TrackedNumber } {
  const hundred = TrackedNumber.constant(100, '100');
  const swrDecimal = swr.divide(hundred, { name: 'SWR (decimal)', description: 'Safe withdrawal rate as a decimal' });

  const annual = netWorth.multiply(swrDecimal, {
    name: 'Annual SWR',
    unit: '$',
    description: 'The amount you can safely withdraw per year',
    formula: 'Net Worth × (SWR ÷ 100)',
    category: 'swr',
  });

  const twelve = TrackedNumber.constant(12, 'Months per year');
  const monthly = annual.divide(twelve, {
    name: 'Monthly SWR',
    unit: '$',
    description: 'Monthly safe withdrawal amount',
    formula: 'Annual SWR ÷ 12',
    category: 'swr',
  });

  const fiftyTwo = TrackedNumber.constant(52, 'Weeks per year');
  const weekly = annual.divide(fiftyTwo, {
    name: 'Weekly SWR',
    unit: '$',
    description: 'Weekly safe withdrawal amount',
    formula: 'Annual SWR ÷ 52',
    category: 'swr',
  });

  const threeSixtyFive = TrackedNumber.constant(365, 'Days per year');
  const daily = annual.divide(threeSixtyFive, {
    name: 'Daily SWR',
    unit: '$',
    description: 'Daily safe withdrawal amount',
    formula: 'Annual SWR ÷ 365',
    category: 'swr',
  });

  return { annual, monthly, weekly, daily };
}

/**
 * FI progress via TrackedNumber — (netWorth / fiTarget) × 100
 */
export function calculateFiProgressTN(
  netWorth: TrackedNumber,
  fiTarget: TrackedNumber,
): TrackedNumber {
  if (fiTarget.value <= 0) {
    return TrackedNumber.from(0, 'FI Progress', { unit: '%', category: 'fi_target', description: 'Cannot compute — FI target is zero' });
  }

  const ratio = netWorth.divide(fiTarget, { name: 'NW / FI Target', description: 'Ratio of net worth to FI target' });
  const hundred = TrackedNumber.constant(100, '100');

  return ratio.multiply(hundred, {
    name: 'FI Progress',
    unit: '%',
    description: 'Your progress towards financial independence as a percentage',
    formula: '(Net Worth ÷ FI Target) × 100',
    category: 'fi_target',
  });
}
