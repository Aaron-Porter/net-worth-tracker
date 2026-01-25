/**
 * Helper module for generating TrackedValues from scenario data
 * 
 * This bridges the gap between the raw scenario calculations and the
 * TrackedValue display component, providing calculation transparency.
 */

import {
  TrackedValue,
  CalculationBuilder,
  calculateFiTargetTracked,
  calculateSwrAmountsTracked,
  calculateGrowthRatesTracked,
  calculateFiProgressTracked,
  calculateLevelBasedSpendingTracked,
} from './calculationTrace';
import type { ScenarioProjection } from './useScenarios';
import type { GrowthRates, RealTimeNetWorth, LevelInfo, ProjectionRow } from './calculations';

// ============================================================================
// TYPES
// ============================================================================

export interface TrackedDashboardValues {
  // Net Worth
  currentNetWorth: TrackedValue;
  baseAmount: TrackedValue;
  appreciation: TrackedValue;
  contributions: TrackedValue;
  
  // Growth Rates
  growthPerSecond: TrackedValue;
  growthPerMinute: TrackedValue;
  growthPerHour: TrackedValue;
  growthPerDay: TrackedValue;
  growthPerYear: TrackedValue;
  
  // SWR
  annualSwr: TrackedValue;
  monthlySwr: TrackedValue;
  weeklySwr: TrackedValue;
  dailySwr: TrackedValue;
  
  // FI Metrics
  fiTarget: TrackedValue;
  fiProgress: TrackedValue;
  
  // Level-based spending
  currentSpending: TrackedValue;
  nextLevelSpending: TrackedValue | null;
}

export interface TrackedProjectionRow {
  year: number;
  age: number | null;
  netWorth: TrackedValue;
  interest: TrackedValue;
  contributed: TrackedValue;
  annualSwr: TrackedValue;
  monthlySwr: TrackedValue;
  monthlySpend: TrackedValue;
  fiTarget: TrackedValue;
  fiProgress: TrackedValue;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate all tracked dashboard values from a scenario projection
 */
export function generateTrackedDashboardValues(
  projection: ScenarioProjection,
  latestEntryTimestamp: number
): TrackedDashboardValues {
  const { scenario, currentNetWorth, growthRates, levelInfo } = projection;
  const netWorth = currentNetWorth.total;
  
  // Current Net Worth components
  const currentNetWorthTracked = new CalculationBuilder('current_net_worth', 'Current Net Worth', 'net_worth')
    .setDescription('Your real-time net worth including base amount and appreciation since last entry')
    .setFormula('Total = Base Amount + Appreciation + Contributions')
    .setUnit('$')
    .addInput('Base Amount', currentNetWorth.baseAmount, '$', 'Net worth at last entry')
    .addInput('Appreciation', currentNetWorth.appreciation, '$', 'Growth since last entry')
    .addInput('Contributions', currentNetWorth.contributions, '$', 'Contributions since last entry')
    .addInput('Annual Return Rate', scenario.currentRate, '%')
    .addStep('Calculate time elapsed since last entry', 'now - entry timestamp', [], 
      (Date.now() - latestEntryTimestamp) / (365.25 * 24 * 60 * 60 * 1000))
    .addStep('Calculate appreciation', 'Base × Rate × Time', [], currentNetWorth.appreciation)
    .addStep('Sum all components', 'Base + Appreciation + Contributions', [], netWorth)
    .build(netWorth);

  const baseAmountTracked = new CalculationBuilder('base_amount', 'Base Amount', 'net_worth')
    .setDescription('Your net worth at the time of your last entry')
    .setFormula('Base Amount = Last recorded net worth')
    .setUnit('$')
    .addInput('Last Entry Amount', currentNetWorth.baseAmount, '$')
    .build(currentNetWorth.baseAmount);

  const appreciationTracked = new CalculationBuilder('appreciation', 'Appreciation', 'net_worth')
    .setDescription('The growth in your net worth from investment returns since your last entry')
    .setFormula('Appreciation = Base Amount × (Annual Rate ÷ ms/year) × Time Elapsed (ms)')
    .setUnit('$')
    .addInput('Base Amount', currentNetWorth.baseAmount, '$')
    .addInput('Annual Return Rate', scenario.currentRate, '%')
    .addInput('Time Elapsed', (Date.now() - latestEntryTimestamp) / (365.25 * 24 * 60 * 60 * 1000), 'years')
    .build(currentNetWorth.appreciation);

  const contributionsTracked = new CalculationBuilder('contributions', 'Contributions', 'net_worth')
    .setDescription('Contributions added since your last entry (pro-rated from yearly contribution)')
    .setFormula('Contributions = (Yearly Contribution × Time Elapsed) + Growth on Contributions')
    .setUnit('$')
    .addInput('Yearly Contribution', scenario.yearlyContribution, '$')
    .build(currentNetWorth.contributions);

  // Growth Rates
  const growthRatesTracked = calculateGrowthRatesTracked(
    netWorth,
    scenario.currentRate,
    0 // Not including contributions in growth rate display
  );

  // SWR Amounts
  const swrAmountsTracked = calculateSwrAmountsTracked(netWorth, scenario.swr);

  // FI Metrics
  const firstProjection = projection.projections[0];
  const monthlySpend = firstProjection?.monthlySpend || levelInfo.unlockedAtNetWorth;
  
  const fiTargetTracked = calculateFiTargetTracked(monthlySpend, scenario.swr);
  const fiProgressTracked = calculateFiProgressTracked(netWorth, fiTargetTracked.value);

  // Level-based spending
  const currentSpendingTracked = calculateLevelBasedSpendingTracked(
    netWorth,
    scenario.baseMonthlyBudget,
    scenario.spendingGrowthRate,
    scenario.inflationRate,
    0
  );

  let nextLevelSpendingTracked: TrackedValue | null = null;
  if (levelInfo.nextLevel) {
    nextLevelSpendingTracked = calculateLevelBasedSpendingTracked(
      levelInfo.nextLevel.threshold,
      scenario.baseMonthlyBudget,
      scenario.spendingGrowthRate,
      scenario.inflationRate,
      0
    );
  }

  return {
    // Net Worth
    currentNetWorth: currentNetWorthTracked,
    baseAmount: baseAmountTracked,
    appreciation: appreciationTracked,
    contributions: contributionsTracked,
    
    // Growth Rates
    growthPerSecond: growthRatesTracked.perSecond,
    growthPerMinute: growthRatesTracked.perMinute,
    growthPerHour: growthRatesTracked.perHour,
    growthPerDay: growthRatesTracked.perDay,
    growthPerYear: growthRatesTracked.perYear,
    
    // SWR
    annualSwr: swrAmountsTracked.annual,
    monthlySwr: swrAmountsTracked.monthly,
    weeklySwr: swrAmountsTracked.weekly,
    dailySwr: swrAmountsTracked.daily,
    
    // FI Metrics
    fiTarget: fiTargetTracked,
    fiProgress: fiProgressTracked,
    
    // Level-based spending
    currentSpending: currentSpendingTracked,
    nextLevelSpending: nextLevelSpendingTracked,
  };
}

/**
 * Generate a tracked value for a single projection row
 */
export function generateTrackedProjectionRow(
  row: ProjectionRow,
  scenario: { currentRate: number; swr: number; yearlyContribution: number },
  startingNetWorth: number
): TrackedProjectionRow {
  const netWorthTracked = new CalculationBuilder('projected_net_worth', `Net Worth (${row.year})`, 'projection')
    .setDescription(`Projected net worth for year ${row.year}`)
    .setFormula('Net Worth = Previous Net Worth × (1 + Rate) + Annual Contribution - Annual Spending')
    .setUnit('$')
    .addInput('Year', row.year)
    .addInput('Years From Entry', row.yearsFromEntry, 'years')
    .addInput('Starting Net Worth', startingNetWorth, '$')
    .addInput('Annual Return Rate', scenario.currentRate, '%')
    .addInput('Yearly Contribution', scenario.yearlyContribution, '$')
    .addInput('Annual Spending', row.annualSpending, '$')
    .build(row.netWorth);

  const interestTracked = new CalculationBuilder('projected_interest', `Interest (${row.year})`, 'projection')
    .setDescription(`Investment returns for year ${row.year}`)
    .setFormula('Interest = Previous Year Net Worth × Return Rate')
    .setUnit('$')
    .addInput('Previous Net Worth', row.netWorth - row.interest - row.contributed + row.annualSpending, '$')
    .addInput('Annual Return Rate', scenario.currentRate, '%')
    .build(row.interest);

  const contributedTracked = new CalculationBuilder('projected_contribution', `Contributed (${row.year})`, 'projection')
    .setDescription(`Contributions for year ${row.year}`)
    .setFormula('Contributed = Annual Contribution Amount')
    .setUnit('$')
    .addInput('Yearly Contribution', scenario.yearlyContribution, '$')
    .build(row.contributed);

  const swrAmounts = calculateSwrAmountsTracked(row.netWorth, scenario.swr);

  const monthlySpendTracked = new CalculationBuilder('monthly_spend', `Monthly Spending (${row.year})`, 'spending')
    .setDescription(`Level-based spending budget for year ${row.year}`)
    .setFormula('Monthly Spend = Inflation-Adjusted Base + Net Worth Portion')
    .setUnit('$')
    .addInput('Projected Net Worth', row.netWorth, '$')
    .addInput('Year', row.year)
    .build(row.monthlySpend);

  const fiTargetTracked = calculateFiTargetTracked(row.monthlySpend, scenario.swr);
  const fiProgressTracked = calculateFiProgressTracked(row.netWorth, fiTargetTracked.value);

  return {
    year: row.year,
    age: row.age,
    netWorth: netWorthTracked,
    interest: interestTracked,
    contributed: contributedTracked,
    annualSwr: swrAmounts.annual,
    monthlySwr: swrAmounts.monthly,
    monthlySpend: monthlySpendTracked,
    fiTarget: fiTargetTracked,
    fiProgress: fiProgressTracked,
  };
}

/**
 * Create a simple tracked value for display purposes
 */
export function createTrackedAmount(
  value: number,
  name: string,
  description: string,
  formula: string,
  inputs: Array<{ name: string; value: number | string; unit?: string }> = [],
  category: 'net_worth' | 'swr' | 'projection' | 'spending' | 'fi_target' | 'growth_rate' | 'tax' | 'milestone' | 'level' = 'projection'
): TrackedValue {
  const builder = new CalculationBuilder(`${category}_${name}`, name, category)
    .setDescription(description)
    .setFormula(formula)
    .setUnit('$');
  
  inputs.forEach(input => {
    builder.addInput(input.name, input.value, input.unit);
  });
  
  return builder.build(value);
}

/**
 * Create a tracked percentage value
 */
export function createTrackedPercent(
  value: number,
  name: string,
  description: string,
  formula: string,
  inputs: Array<{ name: string; value: number | string; unit?: string }> = [],
  category: 'fi_target' | 'tax' | 'projection' = 'projection'
): TrackedValue {
  const builder = new CalculationBuilder(`${category}_${name}`, name, category)
    .setDescription(description)
    .setFormula(formula)
    .setUnit('%');
  
  inputs.forEach(input => {
    builder.addInput(input.name, input.value, input.unit);
  });
  
  return builder.build(value);
}

/**
 * Create a tracked entry value (historical net worth entry)
 */
export function createTrackedEntry(
  amount: number,
  timestamp: number
): TrackedValue {
  const date = new Date(timestamp);
  return new CalculationBuilder('entry_amount', 'Net Worth Entry', 'net_worth')
    .setDescription(`Net worth recorded on ${date.toLocaleDateString()}`)
    .setFormula('Recorded Value')
    .setUnit('$')
    .addInput('Recorded Amount', amount, '$')
    .addInput('Date', date.toLocaleDateString())
    .addInput('Time', date.toLocaleTimeString())
    .build(amount);
}

/**
 * Create a tracked milestone value
 */
export function createTrackedMilestone(
  netWorth: number,
  milestoneName: string,
  targetPercentage: number | null = null
): TrackedValue {
  const builder = new CalculationBuilder('milestone_nw', `${milestoneName} Net Worth`, 'milestone')
    .setDescription(`Net worth at the ${milestoneName} milestone`)
    .setFormula(targetPercentage ? `Net Worth at ${targetPercentage}% FI Progress` : 'Net Worth at Milestone')
    .setUnit('$')
    .addInput('Net Worth', netWorth, '$');
  
  if (targetPercentage !== null) {
    builder.addInput('Target Progress', targetPercentage, '%');
  }
  
  return builder.build(netWorth);
}

/**
 * Create tracked tax calculation values
 */
export function createTrackedTaxValues(taxes: {
  grossIncome: number;
  totalPreTaxContributions: number;
  adjustedGrossIncome: number;
  federalTax: number;
  stateTax: number;
  totalTax: number;
  netIncome: number;
  effectiveTotalRate: number;
}): {
  grossIncome: TrackedValue;
  preTaxContributions: TrackedValue;
  adjustedGrossIncome: TrackedValue;
  federalTax: TrackedValue;
  stateTax: TrackedValue;
  totalTax: TrackedValue;
  netIncome: TrackedValue;
  effectiveRate: TrackedValue;
} {
  return {
    grossIncome: new CalculationBuilder('gross_income', 'Gross Income', 'tax')
      .setDescription('Total income before any deductions or taxes')
      .setFormula('Annual Salary + Other Income')
      .setUnit('$')
      .addInput('Annual Amount', taxes.grossIncome, '$')
      .build(taxes.grossIncome),

    preTaxContributions: new CalculationBuilder('pretax_contrib', 'Pre-Tax Contributions', 'tax')
      .setDescription('Total pre-tax retirement contributions (401k, IRA, HSA, etc.)')
      .setFormula('401k + Traditional IRA + HSA + Other')
      .setUnit('$')
      .addInput('Total Pre-Tax', taxes.totalPreTaxContributions, '$')
      .build(taxes.totalPreTaxContributions),

    adjustedGrossIncome: new CalculationBuilder('agi', 'Adjusted Gross Income', 'tax')
      .setDescription('Gross income minus pre-tax contributions')
      .setFormula('Gross Income - Pre-Tax Contributions')
      .setUnit('$')
      .addInput('Gross Income', taxes.grossIncome, '$')
      .addInput('Pre-Tax Contributions', taxes.totalPreTaxContributions, '$')
      .addStep('Subtract pre-tax', 'Gross - Pre-Tax', [], taxes.adjustedGrossIncome)
      .build(taxes.adjustedGrossIncome),

    federalTax: new CalculationBuilder('federal_tax', 'Federal Income Tax', 'tax')
      .setDescription('Federal income tax calculated using progressive tax brackets')
      .setFormula('Sum of (Taxable Income in Bracket × Bracket Rate)')
      .setUnit('$')
      .addInput('Federal Tax', taxes.federalTax, '$')
      .build(taxes.federalTax),

    stateTax: new CalculationBuilder('state_tax', 'State Income Tax', 'tax')
      .setDescription('State income tax based on your state\'s tax rates')
      .setFormula('State Tax Calculation')
      .setUnit('$')
      .addInput('State Tax', taxes.stateTax, '$')
      .build(taxes.stateTax),

    totalTax: new CalculationBuilder('total_tax', 'Total Tax', 'tax')
      .setDescription('Total taxes including federal, state, and FICA')
      .setFormula('Federal Tax + State Tax + Social Security + Medicare')
      .setUnit('$')
      .addInput('Federal Tax', taxes.federalTax, '$')
      .addInput('State Tax', taxes.stateTax, '$')
      .addStep('Sum all taxes', 'Federal + State + FICA', [], taxes.totalTax)
      .build(taxes.totalTax),

    netIncome: new CalculationBuilder('net_income', 'Net Income', 'tax')
      .setDescription('Take-home pay after all taxes and pre-tax deductions')
      .setFormula('Gross Income - Pre-Tax Contributions - Total Tax')
      .setUnit('$')
      .addInput('Gross Income', taxes.grossIncome, '$')
      .addInput('Pre-Tax Contributions', taxes.totalPreTaxContributions, '$')
      .addInput('Total Tax', taxes.totalTax, '$')
      .addStep('Calculate net', 'Gross - PreTax - Tax', [], taxes.netIncome)
      .build(taxes.netIncome),

    effectiveRate: new CalculationBuilder('effective_rate', 'Effective Tax Rate', 'tax')
      .setDescription('Total taxes as a percentage of gross income')
      .setFormula('(Total Tax ÷ Gross Income) × 100')
      .setUnit('%')
      .addInput('Total Tax', taxes.totalTax, '$')
      .addInput('Gross Income', taxes.grossIncome, '$')
      .addStep('Calculate rate', '(Tax ÷ Gross) × 100', [], taxes.effectiveTotalRate)
      .build(taxes.effectiveTotalRate),
  };
}

/**
 * Create tracked level-based spending values
 */
export function createTrackedLevelValues(
  levelInfo: LevelInfo,
  scenario: { baseMonthlyBudget: number; spendingGrowthRate: number; inflationRate: number }
): {
  netWorth: TrackedValue;
  monthlyBudget: TrackedValue;
  annualBudget: TrackedValue;
  baseBudget: TrackedValue;
  netWorthPortion: TrackedValue;
  amountToNext: TrackedValue;
  nextLevelThreshold: TrackedValue | null;
} {
  // First, create the base budget trace so we can reference it in the monthly budget
  const baseBudgetTrace = new CalculationBuilder('base_budget', 'Base Budget (Inflation-Adjusted)', 'spending')
    .setDescription('Your base monthly budget adjusted for inflation since tracking started')
    .setFormula(`Original Base × (1 + Inflation Rate)^Years`)
    .setUnit('$')
    .addSetting('Original Base Budget', levelInfo.baseBudgetOriginal, 'baseMonthlyBudget', { 
      unit: '$', 
      description: 'Your starting monthly spending floor' 
    })
    .addSetting('Inflation Rate', scenario.inflationRate, 'inflationRate', { 
      unit: '%', 
      description: 'Expected annual inflation rate' 
    })
    .addInputWithSource('Years Elapsed', levelInfo.yearsElapsed, 'calculated', { 
      unit: 'years', 
      description: 'Time since you started tracking' 
    })
    .addStep(
      'Calculate inflation multiplier', 
      `(1 + ${scenario.inflationRate}% / 100)^${levelInfo.yearsElapsed.toFixed(2)}`, 
      [], 
      Math.pow(1 + scenario.inflationRate / 100, levelInfo.yearsElapsed),
      ''
    )
    .addStep(
      'Apply inflation to base', 
      `$${levelInfo.baseBudgetOriginal.toLocaleString()} × ${Math.pow(1 + scenario.inflationRate / 100, levelInfo.yearsElapsed).toFixed(4)}`, 
      [], 
      levelInfo.baseBudgetInflationAdjusted,
      '$'
    )
    .build(levelInfo.baseBudgetInflationAdjusted);

  // Create the net worth portion trace
  const netWorthPortionTrace = new CalculationBuilder('nw_portion', 'Net Worth Spending Portion', 'spending')
    .setDescription('Additional monthly spending unlocked by your net worth')
    .setFormula(`Net Worth × Spending Rate ÷ 12`)
    .setUnit('$')
    .addInputWithSource('Current Net Worth', levelInfo.netWorth, 'calculated', { 
      unit: '$', 
      description: 'Sum of all your assets' 
    })
    .addSetting('Spending Growth Rate', scenario.spendingGrowthRate, 'spendingGrowthRate', { 
      unit: '%', 
      description: 'Percent of net worth added to spending annually' 
    })
    .addStep(
      'Calculate annual portion', 
      `$${levelInfo.netWorth.toLocaleString()} × ${scenario.spendingGrowthRate}% = $${(levelInfo.netWorth * scenario.spendingGrowthRate / 100).toLocaleString()}`, 
      [], 
      levelInfo.netWorth * scenario.spendingGrowthRate / 100,
      '$'
    )
    .addStep(
      'Convert to monthly', 
      `$${(levelInfo.netWorth * scenario.spendingGrowthRate / 100).toLocaleString()} ÷ 12`, 
      [], 
      levelInfo.netWorthPortion,
      '$'
    )
    .build(levelInfo.netWorthPortion);

  return {
    netWorth: new CalculationBuilder('level_net_worth', 'Current Net Worth', 'level')
      .setDescription('Your current total net worth used for level calculations')
      .setFormula('Sum of all assets')
      .setUnit('$')
      .addInputWithSource('Total Net Worth', levelInfo.netWorth, 'calculated', { unit: '$' })
      .build(levelInfo.netWorth),

    monthlyBudget: new CalculationBuilder('monthly_budget', 'Monthly Spending Budget', 'spending')
      .setDescription('Your unlocked monthly spending budget based on your FI level. This is the amount you can safely spend each month based on your settings.')
      .setFormula('Inflation-Adjusted Base + Net Worth Portion')
      .setUnit('$')
      // Add the traced components
      .addTrackedInput('Base Budget (Inflation-Adjusted)', baseBudgetTrace, 'Click to expand how this is calculated')
      .addTrackedInput('Net Worth Portion', netWorthPortionTrace, 'Click to expand how this is calculated')
      // Summary step
      .addStep(
        'Sum the components',
        `$${levelInfo.baseBudgetInflationAdjusted.toLocaleString(undefined, { maximumFractionDigits: 2 })} + $${levelInfo.netWorthPortion.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        [],
        levelInfo.unlockedAtNetWorth,
        '$'
      )
      .build(levelInfo.unlockedAtNetWorth),

    annualBudget: new CalculationBuilder('annual_budget', 'Annual Budget', 'spending')
      .setDescription('Your annual spending budget (monthly × 12)')
      .setFormula('Monthly Budget × 12')
      .setUnit('$')
      .addInputWithSource('Monthly Budget', levelInfo.unlockedAtNetWorth, 'calculated', { 
        unit: '$',
        trace: baseBudgetTrace.trace // Reference to show this is calculated
      })
      .addStep('Multiply by 12', `$${levelInfo.unlockedAtNetWorth.toLocaleString()} × 12`, [], levelInfo.unlockedAtNetWorth * 12, '$')
      .build(levelInfo.unlockedAtNetWorth * 12),

    baseBudget: baseBudgetTrace,

    netWorthPortion: netWorthPortionTrace,

    amountToNext: new CalculationBuilder('amount_to_next', 'Amount to Next Level', 'level')
      .setDescription('Net worth needed to reach the next level')
      .setFormula('Next Level Threshold - Current Net Worth')
      .setUnit('$')
      .addInputWithSource('Next Level Threshold', levelInfo.nextLevel?.threshold || 0, 'constant', { 
        unit: '$',
        description: levelInfo.nextLevel ? `Level ${levelInfo.nextLevel.level}: ${levelInfo.nextLevel.name}` : 'N/A'
      })
      .addInputWithSource('Current Net Worth', levelInfo.netWorth, 'calculated', { unit: '$' })
      .addStep('Calculate difference', `$${(levelInfo.nextLevel?.threshold || 0).toLocaleString()} - $${levelInfo.netWorth.toLocaleString()}`, [], levelInfo.amountToNext, '$')
      .build(levelInfo.amountToNext),

    nextLevelThreshold: levelInfo.nextLevel 
      ? new CalculationBuilder('next_threshold', 'Next Level Threshold', 'level')
          .setDescription(`Net worth required for Level ${levelInfo.nextLevel.level} (${levelInfo.nextLevel.name})`)
          .setFormula('Predefined Level Threshold')
          .setUnit('$')
          .addInputWithSource('Level Number', levelInfo.nextLevel.level, 'constant')
          .addInputWithSource('Level Name', levelInfo.nextLevel.name, 'constant')
          .addInputWithSource('Threshold', levelInfo.nextLevel.threshold, 'constant', { unit: '$' })
          .build(levelInfo.nextLevel.threshold)
      : null,
  };
}

/**
 * Create tracked projection row values
 */
export function createTrackedProjectionValues(
  row: ProjectionRow,
  scenario: { currentRate: number; swr: number; yearlyContribution: number; inflationRate: number }
): {
  netWorth: TrackedValue;
  interest: TrackedValue;
  contributed: TrackedValue;
  annualSwr: TrackedValue;
  monthlySwr: TrackedValue;
  monthlySpend: TrackedValue;
  fiTarget: TrackedValue;
  fiProgress: TrackedValue;
  savings: TrackedValue;
} {
  return {
    netWorth: new CalculationBuilder('proj_nw', `Net Worth (${row.year})`, 'projection')
      .setDescription(`Projected net worth for year ${row.year}`)
      .setFormula('Previous NW × (1 + Rate) + Contributions - Spending')
      .setUnit('$')
      .addInput('Year', row.year)
      .addInput('Return Rate', scenario.currentRate, '%')
      .addInput('Interest Earned', row.interest, '$')
      .addInput('Contributed', row.contributed, '$')
      .build(row.netWorth),

    interest: new CalculationBuilder('proj_interest', `Interest (${row.year})`, 'projection')
      .setDescription(`Investment returns for year ${row.year}`)
      .setFormula('Previous Net Worth × Return Rate')
      .setUnit('$')
      .addInput('Return Rate', scenario.currentRate, '%')
      .build(row.interest),

    contributed: new CalculationBuilder('proj_contrib', `Contributions (${row.year})`, 'projection')
      .setDescription(`Total contributions for year ${row.year}`)
      .setFormula('Yearly Contribution Amount')
      .setUnit('$')
      .addInput('Yearly Contribution', scenario.yearlyContribution, '$')
      .build(row.contributed),

    annualSwr: new CalculationBuilder('proj_swr_annual', `Annual SWR (${row.year})`, 'swr')
      .setDescription(`Safe withdrawal amount for year ${row.year}`)
      .setFormula(`Net Worth × ${scenario.swr}%`)
      .setUnit('$')
      .addInput('Net Worth', row.netWorth, '$')
      .addInput('SWR', scenario.swr, '%')
      .build(row.annualSwr),

    monthlySwr: new CalculationBuilder('proj_swr_monthly', `Monthly SWR (${row.year})`, 'swr')
      .setDescription(`Monthly safe withdrawal amount for year ${row.year}`)
      .setFormula('Annual SWR ÷ 12')
      .setUnit('$')
      .addInput('Annual SWR', row.annualSwr, '$')
      .build(row.monthlySwr),

    monthlySpend: new CalculationBuilder('proj_spend', `Monthly Spending (${row.year})`, 'spending')
      .setDescription(`Level-based spending budget for year ${row.year}`)
      .setFormula('Base (inflation-adjusted) + Net Worth Portion')
      .setUnit('$')
      .addInput('Inflation Rate', scenario.inflationRate, '%')
      .build(row.monthlySpend),

    fiTarget: new CalculationBuilder('proj_fi_target', `FI Target (${row.year})`, 'fi_target')
      .setDescription(`Net worth needed for financial independence in year ${row.year}`)
      .setFormula(`(Monthly Spending × 12) ÷ ${scenario.swr}%`)
      .setUnit('$')
      .addInput('Monthly Spending', row.monthlySpend, '$')
      .addInput('SWR', scenario.swr, '%')
      .build(row.fiTarget),

    fiProgress: new CalculationBuilder('proj_fi_progress', `FI Progress (${row.year})`, 'fi_target')
      .setDescription(`Progress towards FI in year ${row.year}`)
      .setFormula('(Net Worth ÷ FI Target) × 100')
      .setUnit('%')
      .addInput('Net Worth', row.netWorth, '$')
      .addInput('FI Target', row.fiTarget, '$')
      .build(row.fiProgress),

    savings: new CalculationBuilder('proj_savings', `Annual Savings (${row.year})`, 'projection')
      .setDescription(`Net savings for year ${row.year}`)
      .setFormula('Contributions + Interest - Annual Spending')
      .setUnit('$')
      .addInput('Contributions', row.contributed, '$')
      .addInput('Interest', row.interest, '$')
      .addInput('Annual Spending', row.annualSpending, '$')
      .build(row.annualSavings),
  };
}
