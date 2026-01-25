/**
 * Calculation Tracing System
 * 
 * This module provides a way to track calculations with their inputs, formulas,
 * and results. This enables transparency and debugging of financial calculations.
 */

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
 * Calculate FI target with full tracing
 */
export function calculateFiTargetTracked(
  monthlySpend: number,
  swr: number,
  monthlySpendSource?: { source: ValueSource; settingKey?: string; trace?: TrackedCalculation }
): TrackedValue {
  const builder = new CalculationBuilder('fi_target', 'FI Target', 'fi_target')
    .setDescription('The net worth needed to achieve financial independence. This is the amount where your investments can sustain your spending using the safe withdrawal rate.')
    .setFormula('FI Target = (Monthly Spend × 12) ÷ SWR%')
    .setUnit('$');

  // Add monthly spend with appropriate source
  if (monthlySpendSource?.trace) {
    builder.addTrackedInput('Monthly Spend', { value: monthlySpend, trace: monthlySpendSource.trace }, 'Your current monthly spending level');
  } else if (monthlySpendSource?.source) {
    builder.addInputWithSource('Monthly Spend', monthlySpend, monthlySpendSource.source, { 
      unit: '$', 
      settingKey: monthlySpendSource.settingKey,
      description: 'Your monthly spending'
    });
  } else {
    builder.addInputWithSource('Monthly Spend', monthlySpend, 'calculated', { 
      unit: '$', 
      description: 'Your monthly spending (level-based or fixed)' 
    });
  }
  
  builder.addSetting('Safe Withdrawal Rate', swr, 'swr', { 
    unit: '%', 
    description: 'The percentage you can safely withdraw annually without depleting your portfolio' 
  });

  if (monthlySpend <= 0 || swr <= 0) {
    return builder.build(0);
  }

  const annualSpend = monthlySpend * 12;
  const swrDecimal = swr / 100;
  const fiTarget = annualSpend / swrDecimal;

  builder
    .addStep('Calculate annual spending', `$${monthlySpend.toLocaleString()}/mo × 12 months`, [
      { name: 'Monthly Spend', value: monthlySpend, unit: '$' }
    ], annualSpend, '$')
    .addStep('Convert SWR to decimal', `${swr}% ÷ 100 = ${swrDecimal}`, [
      { name: 'SWR', value: swr, unit: '%' }
    ], swrDecimal)
    .addStep('Calculate FI Target', `$${annualSpend.toLocaleString()} ÷ ${swrDecimal} = $${fiTarget.toLocaleString()}`, [
      { name: 'Annual Spend', value: annualSpend, unit: '$' },
      { name: 'SWR decimal', value: swrDecimal }
    ], fiTarget, '$');

  const result = builder.build(fiTarget);
  calculationRegistry.register(result.trace);
  return result;
}

/**
 * Calculate SWR amounts with full tracing
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
  const swrDecimal = swr / 100;
  const annual = netWorth * swrDecimal;
  const monthly = annual / 12;
  const weekly = annual / 52;
  const daily = annual / 365;

  const annualBuilder = new CalculationBuilder('swr_annual', 'Annual SWR', 'swr')
    .setDescription('The amount you can safely withdraw per year based on your net worth and SWR')
    .setFormula('Annual SWR = Net Worth × (SWR ÷ 100)')
    .setUnit('$')
    .addInput('Net Worth', netWorth, '$', 'Your current total net worth')
    .addInput('Safe Withdrawal Rate', swr, '%', 'Annual withdrawal rate')
    .addStep('Convert SWR to decimal', 'SWR ÷ 100', [], swrDecimal)
    .addStep('Calculate annual withdrawal', 'Net Worth × SWR decimal', [], annual);

  const monthlyBuilder = new CalculationBuilder('swr_monthly', 'Monthly SWR', 'swr')
    .setDescription('Monthly safe withdrawal amount')
    .setFormula('Monthly SWR = Annual SWR ÷ 12')
    .setUnit('$')
    .addInput('Annual SWR', annual, '$')
    .addStep('Divide by 12 months', 'Annual SWR ÷ 12', [], monthly);

  const weeklyBuilder = new CalculationBuilder('swr_weekly', 'Weekly SWR', 'swr')
    .setDescription('Weekly safe withdrawal amount')
    .setFormula('Weekly SWR = Annual SWR ÷ 52')
    .setUnit('$')
    .addInput('Annual SWR', annual, '$')
    .addStep('Divide by 52 weeks', 'Annual SWR ÷ 52', [], weekly);

  const dailyBuilder = new CalculationBuilder('swr_daily', 'Daily SWR', 'swr')
    .setDescription('Daily safe withdrawal amount')
    .setFormula('Daily SWR = Annual SWR ÷ 365')
    .setUnit('$')
    .addInput('Annual SWR', annual, '$')
    .addStep('Divide by 365 days', 'Annual SWR ÷ 365', [], daily);

  return {
    annual: annualBuilder.build(annual),
    monthly: monthlyBuilder.build(monthly),
    weekly: weeklyBuilder.build(weekly),
    daily: dailyBuilder.build(daily),
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
 * Calculate FI progress with tracing
 */
export function calculateFiProgressTracked(
  netWorth: number,
  fiTarget: number
): TrackedValue {
  const progress = fiTarget > 0 ? (netWorth / fiTarget) * 100 : 0;

  return new CalculationBuilder('fi_progress', 'FI Progress', 'fi_target')
    .setDescription('Your progress towards financial independence as a percentage')
    .setFormula('FI Progress = (Net Worth ÷ FI Target) × 100')
    .setUnit('%')
    .addInput('Net Worth', netWorth, '$')
    .addInput('FI Target', fiTarget, '$')
    .addStep('Divide net worth by target', 'Net Worth ÷ FI Target', [], netWorth / (fiTarget || 1))
    .addStep('Convert to percentage', '× 100', [], progress)
    .build(progress);
}

/**
 * Calculate level-based spending with tracing
 */
export function calculateLevelBasedSpendingTracked(
  netWorth: number,
  baseMonthlyBudget: number,
  spendingGrowthRate: number,
  inflationRate: number,
  yearsFromNow: number = 0
): TrackedValue {
  // Adjust base for inflation
  const inflatedBase = baseMonthlyBudget * Math.pow(1 + inflationRate / 100, yearsFromNow);
  
  // Add net worth portion (annual rate / 12 for monthly)
  const netWorthPortion = netWorth * (spendingGrowthRate / 100) / 12;
  const totalSpending = inflatedBase + netWorthPortion;

  return new CalculationBuilder('level_spending', 'Level-Based Spending', 'spending')
    .setDescription('Monthly spending budget based on your net worth level')
    .setFormula('Spending = Inflation-Adjusted Base + (Net Worth × Growth Rate ÷ 12)')
    .setUnit('$')
    .addInput('Base Monthly Budget', baseMonthlyBudget, '$', 'Your base spending floor')
    .addInput('Net Worth', netWorth, '$')
    .addInput('Spending Growth Rate', spendingGrowthRate, '%', 'Additional spending as % of net worth')
    .addInput('Inflation Rate', inflationRate, '%')
    .addInput('Years From Now', yearsFromNow, 'years')
    .addStep('Adjust base for inflation', `Base × (1 + ${inflationRate}%)^${yearsFromNow}`, [], inflatedBase)
    .addStep('Calculate net worth portion', `Net Worth × ${spendingGrowthRate}% ÷ 12`, [], netWorthPortion)
    .addStep('Sum components', 'Inflated Base + Net Worth Portion', [], totalSpending)
    .build(totalSpending);
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
