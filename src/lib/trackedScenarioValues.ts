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
  
  const timeElapsedYears = (Date.now() - latestEntryTimestamp) / (365.25 * 24 * 60 * 60 * 1000);
  
  // Base Amount trace
  const baseAmountTracked = new CalculationBuilder('base_amount', 'Base Amount', 'net_worth')
    .setDescription('Your net worth at the time of your last entry')
    .setFormula('Sum of all account balances from last entry')
    .setUnit('$')
    .addInputWithSource('Last Entry Total', currentNetWorth.baseAmount, 'input', {
      unit: '$',
      description: 'Total from your most recent net worth entry'
    })
    .build(currentNetWorth.baseAmount);

  // Appreciation trace
  const appreciationTracked = new CalculationBuilder('appreciation', 'Appreciation', 'net_worth')
    .setDescription('The growth in your net worth from investment returns since your last entry')
    .setFormula('Base Amount × Annual Rate × Time Elapsed')
    .setUnit('$')
    .addInputWithSource('Base Amount', currentNetWorth.baseAmount, 'input', { 
      unit: '$', 
      description: 'Net worth at last entry' 
    })
    .addSetting('Annual Return Rate', scenario.currentRate, 'currentRate', { 
      unit: '%', 
      description: 'Expected annual investment return' 
    })
    .addInputWithSource('Time Elapsed', timeElapsedYears, 'calculated', { 
      unit: 'years', 
      description: 'Time since last entry' 
    })
    .addStep(
      'Convert rate to decimal', 
      `${scenario.currentRate}% ÷ 100 = ${(scenario.currentRate / 100).toFixed(4)}`, 
      [], 
      scenario.currentRate / 100
    )
    .addStep(
      'Calculate appreciation',
      `$${currentNetWorth.baseAmount.toLocaleString()} × ${(scenario.currentRate / 100).toFixed(4)} × ${timeElapsedYears.toFixed(6)} years`,
      [],
      currentNetWorth.appreciation,
      '$'
    )
    .build(currentNetWorth.appreciation);

  // Contributions trace
  const contributionsTracked = new CalculationBuilder('contributions', 'Contributions', 'net_worth')
    .setDescription('Contributions added since your last entry (pro-rated from yearly contribution)')
    .setFormula('(Yearly Contribution × Time Elapsed) + Growth on Contributions')
    .setUnit('$')
    .addSetting('Yearly Contribution', scenario.yearlyContribution, 'yearlyContribution', { 
      unit: '$', 
      description: 'Annual contribution amount' 
    })
    .addInputWithSource('Time Elapsed', timeElapsedYears, 'calculated', { 
      unit: 'years' 
    })
    .addStep(
      'Calculate pro-rated contribution',
      `$${scenario.yearlyContribution.toLocaleString()} × ${timeElapsedYears.toFixed(4)} years`,
      [],
      scenario.yearlyContribution * timeElapsedYears,
      '$'
    )
    .build(currentNetWorth.contributions);

  // Current Net Worth (combines the above)
  const currentNetWorthTracked = new CalculationBuilder('current_net_worth', 'Current Net Worth', 'net_worth')
    .setDescription('Your real-time net worth including base amount and appreciation since last entry')
    .setFormula('Base Amount + Appreciation + Contributions')
    .setUnit('$')
    .addTrackedInput('Base Amount', baseAmountTracked, 'Net worth at last entry')
    .addTrackedInput('Appreciation', appreciationTracked, 'Investment growth since last entry')
    .addTrackedInput('Contributions', contributionsTracked, 'New contributions since last entry')
    .addStep(
      'Sum all components',
      `$${currentNetWorth.baseAmount.toLocaleString()} + $${currentNetWorth.appreciation.toLocaleString(undefined, { maximumFractionDigits: 2 })} + $${currentNetWorth.contributions.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      [],
      netWorth,
      '$'
    )
    .build(netWorth);

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

// ============================================================================
// TRACKED MILESTONE VALUES
// ============================================================================

export interface TrackedRunwayInfo {
  runwayYears: TrackedValue;
  runwayMonths: TrackedValue;
}

export interface TrackedCoastInfo {
  coastFiPercent: TrackedValue;
  dollarMultiplier: TrackedValue;
  yearsToRetirement: TrackedValue;
  futureNetWorthIfCoast: TrackedValue;
  futureFiTarget: TrackedValue;
}

export interface TrackedMilestoneInfo {
  targetValue: TrackedValue;
  netWorthAtMilestone: TrackedValue | null;
  yearsToMilestone: TrackedValue | null;
  amountNeeded: TrackedValue | null;
}

/**
 * Create tracked runway values showing how runway is calculated
 */
export function createTrackedRunwayInfo(
  netWorth: number,
  monthlySpend: number
): TrackedRunwayInfo {
  const annualExpenses = monthlySpend * 12;
  const runwayYears = annualExpenses > 0 ? netWorth / annualExpenses : Infinity;
  const runwayMonths = runwayYears * 12;

  const runwayYearsTracked = new CalculationBuilder('runway_years', 'Runway (Years)', 'milestone')
    .setDescription('How many years your current net worth could cover all expenses without any income. This is your financial security buffer.')
    .setFormula('Net Worth ÷ Annual Expenses')
    .setUnit('years')
    .addInputWithSource('Current Net Worth', netWorth, 'calculated', { 
      unit: '$',
      description: 'Your total net worth including all assets'
    })
    .addInputWithSource('Monthly Spending', monthlySpend, 'calculated', { 
      unit: '$',
      description: 'Your current monthly spending budget'
    })
    .addInputWithSource('Annual Expenses', annualExpenses, 'calculated', { 
      unit: '$',
      description: 'Monthly Spending × 12'
    })
    .addStep(
      'Calculate annual expenses',
      `$${monthlySpend.toLocaleString()} × 12 = $${annualExpenses.toLocaleString()}`,
      [],
      annualExpenses,
      '$'
    )
    .addStep(
      'Calculate runway',
      `$${netWorth.toLocaleString()} ÷ $${annualExpenses.toLocaleString()} = ${runwayYears.toFixed(2)} years`,
      [],
      runwayYears,
      'years'
    )
    .build(runwayYears);

  const runwayMonthsTracked = new CalculationBuilder('runway_months', 'Runway (Months)', 'milestone')
    .setDescription('How many months your current net worth could cover all expenses without any income.')
    .setFormula('Runway Years × 12')
    .setUnit('months')
    .addTrackedInput('Runway (Years)', runwayYearsTracked)
    .addStep(
      'Convert to months',
      `${runwayYears.toFixed(2)} years × 12 = ${runwayMonths.toFixed(1)} months`,
      [],
      runwayMonths,
      'months'
    )
    .build(runwayMonths);

  return {
    runwayYears: runwayYearsTracked,
    runwayMonths: runwayMonthsTracked,
  };
}

/**
 * Create tracked coast FI values showing the compounding math
 */
export function createTrackedCoastInfo(
  currentNetWorth: number,
  currentMonthlySpend: number,
  currentAge: number | null,
  retirementAge: number,
  annualReturnRate: number,
  inflationRate: number,
  swr: number
): TrackedCoastInfo {
  const yearsToRetirement = currentAge !== null 
    ? Math.max(0, retirementAge - currentAge)
    : 30; // Default assumption

  const returnRate = annualReturnRate / 100;
  const inflation = inflationRate / 100;

  // Dollar multiplier - how much $1 today becomes at retirement
  const dollarMultiplier = Math.pow(1 + returnRate, yearsToRetirement);

  // Future net worth if you stopped contributing today
  const futureNetWorthIfCoast = currentNetWorth * dollarMultiplier;

  // Future FI target (spending grows with inflation)
  const futureMonthlySpend = currentMonthlySpend * Math.pow(1 + inflation, yearsToRetirement);
  const futureAnnualSpend = futureMonthlySpend * 12;
  const futureFiTarget = futureAnnualSpend / (swr / 100);

  // Coast FI percentage
  const coastFiPercent = futureFiTarget > 0 ? (futureNetWorthIfCoast / futureFiTarget) * 100 : 0;

  const yearsToRetirementTracked = new CalculationBuilder('years_to_retirement', 'Years to Retirement', 'milestone')
    .setDescription('Number of years until your target retirement age')
    .setFormula('Retirement Age - Current Age')
    .setUnit('years')
    .addInputWithSource('Current Age', currentAge ?? 'Not set', currentAge ? 'calculated' : 'input', { 
      description: currentAge ? 'Calculated from your birth date' : 'Set your birth date in scenario settings'
    })
    .addInputWithSource('Retirement Age', retirementAge, 'constant', { 
      description: 'Standard retirement age assumption'
    })
    .addStep(
      'Calculate years remaining',
      currentAge !== null 
        ? `${retirementAge} - ${currentAge} = ${yearsToRetirement} years`
        : `Using default assumption of ${yearsToRetirement} years`,
      [],
      yearsToRetirement,
      'years'
    )
    .build(yearsToRetirement);

  const dollarMultiplierTracked = new CalculationBuilder('dollar_multiplier', 'Dollar Multiplier', 'milestone')
    .setDescription('How much $1 saved today will be worth at retirement due to compound growth. This shows the power of early saving.')
    .setFormula('(1 + Return Rate)^Years')
    .setUnit('')
    .addSetting('Annual Return Rate', annualReturnRate, 'currentRate', { 
      unit: '%',
      description: 'Expected annual investment return'
    })
    .addTrackedInput('Years to Retirement', yearsToRetirementTracked)
    .addStep(
      'Convert rate to decimal',
      `${annualReturnRate}% ÷ 100 = ${returnRate.toFixed(4)}`,
      [],
      returnRate,
      ''
    )
    .addStep(
      'Calculate multiplier',
      `(1 + ${returnRate.toFixed(4)})^${yearsToRetirement} = ${dollarMultiplier.toFixed(2)}x`,
      [],
      dollarMultiplier,
      'x'
    )
    .build(dollarMultiplier);

  const futureNetWorthTracked = new CalculationBuilder('future_nw_coast', 'Future Net Worth (if Coasting)', 'milestone')
    .setDescription('What your net worth would grow to by retirement if you stopped contributing today and let compound growth do all the work.')
    .setFormula('Current Net Worth × Dollar Multiplier')
    .setUnit('$')
    .addInputWithSource('Current Net Worth', currentNetWorth, 'calculated', { unit: '$' })
    .addTrackedInput('Dollar Multiplier', dollarMultiplierTracked)
    .addStep(
      'Calculate future value',
      `$${currentNetWorth.toLocaleString()} × ${dollarMultiplier.toFixed(2)} = $${futureNetWorthIfCoast.toLocaleString()}`,
      [],
      futureNetWorthIfCoast,
      '$'
    )
    .build(futureNetWorthIfCoast);

  const futureFiTargetTracked = new CalculationBuilder('future_fi_target', 'Future FI Target', 'milestone')
    .setDescription('The FI target at retirement, accounting for inflation increasing your spending needs over time.')
    .setFormula('(Future Monthly Spend × 12) ÷ SWR%')
    .setUnit('$')
    .addInputWithSource('Current Monthly Spend', currentMonthlySpend, 'calculated', { unit: '$' })
    .addSetting('Inflation Rate', inflationRate, 'inflationRate', { 
      unit: '%',
      description: 'Expected annual inflation rate'
    })
    .addTrackedInput('Years to Retirement', yearsToRetirementTracked)
    .addSetting('Safe Withdrawal Rate', swr, 'swr', { 
      unit: '%',
      description: 'Withdrawal rate for FI calculation'
    })
    .addStep(
      'Calculate inflation multiplier',
      `(1 + ${inflationRate}%/100)^${yearsToRetirement} = ${Math.pow(1 + inflation, yearsToRetirement).toFixed(4)}`,
      [],
      Math.pow(1 + inflation, yearsToRetirement),
      ''
    )
    .addStep(
      'Calculate future monthly spend',
      `$${currentMonthlySpend.toLocaleString()} × ${Math.pow(1 + inflation, yearsToRetirement).toFixed(4)} = $${futureMonthlySpend.toLocaleString()}`,
      [],
      futureMonthlySpend,
      '$'
    )
    .addStep(
      'Calculate FI target',
      `($${futureMonthlySpend.toLocaleString()} × 12) ÷ ${swr}% = $${futureFiTarget.toLocaleString()}`,
      [],
      futureFiTarget,
      '$'
    )
    .build(futureFiTarget);

  const coastFiPercentTracked = new CalculationBuilder('coast_fi_percent', 'Coast FI Percentage', 'milestone')
    .setDescription('If you stopped contributing today, this is what percentage of FI you would reach by retirement age through compound growth alone. 100% means you\'ve reached Coast FI.')
    .setFormula('(Future NW if Coasting ÷ Future FI Target) × 100')
    .setUnit('%')
    .addTrackedInput('Future Net Worth (Coasting)', futureNetWorthTracked)
    .addTrackedInput('Future FI Target', futureFiTargetTracked)
    .addStep(
      'Calculate coast percentage',
      `($${futureNetWorthIfCoast.toLocaleString()} ÷ $${futureFiTarget.toLocaleString()}) × 100 = ${coastFiPercent.toFixed(1)}%`,
      [],
      coastFiPercent,
      '%'
    )
    .build(coastFiPercent);

  return {
    coastFiPercent: coastFiPercentTracked,
    dollarMultiplier: dollarMultiplierTracked,
    yearsToRetirement: yearsToRetirementTracked,
    futureNetWorthIfCoast: futureNetWorthTracked,
    futureFiTarget: futureFiTargetTracked,
  };
}

/**
 * Create tracked percentage milestone info
 */
export function createTrackedPercentageMilestone(
  milestoneId: string,
  milestoneName: string,
  targetPercent: number,
  currentNetWorth: number,
  currentFiTarget: number,
  currentFiProgress: number,
  netWorthAtMilestone: number | null,
  year: number | null,
  currentYear: number
): TrackedMilestoneInfo {
  const targetNetWorth = currentFiTarget * (targetPercent / 100);
  const amountNeeded = Math.max(0, targetNetWorth - currentNetWorth);
  const yearsAway = year ? year - currentYear : null;

  const targetValueTracked = new CalculationBuilder(`${milestoneId}_target`, `${milestoneName} Target`, 'milestone')
    .setDescription(`The net worth required to reach ${milestoneName} (${targetPercent}% of your FI target)`)
    .setFormula('FI Target × Target Percentage')
    .setUnit('$')
    .addInputWithSource('FI Target', currentFiTarget, 'calculated', { 
      unit: '$',
      description: 'Your full FI target based on spending and SWR'
    })
    .addInputWithSource('Target Percentage', targetPercent, 'constant', { 
      unit: '%',
      description: `${targetPercent}% milestone`
    })
    .addStep(
      'Calculate target net worth',
      `$${currentFiTarget.toLocaleString()} × ${targetPercent}% = $${targetNetWorth.toLocaleString()}`,
      [],
      targetNetWorth,
      '$'
    )
    .build(targetNetWorth);

  const amountNeededTracked = amountNeeded > 0 ? new CalculationBuilder(`${milestoneId}_amount`, `Amount to ${milestoneName}`, 'milestone')
    .setDescription(`The additional net worth you need to reach ${milestoneName}`)
    .setFormula('Target Net Worth - Current Net Worth')
    .setUnit('$')
    .addTrackedInput(`${milestoneName} Target`, targetValueTracked)
    .addInputWithSource('Current Net Worth', currentNetWorth, 'calculated', { unit: '$' })
    .addStep(
      'Calculate remaining amount',
      `$${targetNetWorth.toLocaleString()} - $${currentNetWorth.toLocaleString()} = $${amountNeeded.toLocaleString()}`,
      [],
      amountNeeded,
      '$'
    )
    .build(amountNeeded) : null;

  const yearsToMilestoneTracked = yearsAway !== null ? new CalculationBuilder(`${milestoneId}_years`, `Years to ${milestoneName}`, 'milestone')
    .setDescription(`Projected years until you reach ${milestoneName}`)
    .setFormula('Milestone Year - Current Year')
    .setUnit('years')
    .addInputWithSource('Milestone Year', year!, 'calculated', { 
      description: 'Projected year of achievement based on your growth trajectory'
    })
    .addInputWithSource('Current Year', currentYear, 'constant')
    .addStep(
      'Calculate years remaining',
      `${year} - ${currentYear} = ${yearsAway} years`,
      [],
      yearsAway,
      'years'
    )
    .build(yearsAway) : null;

  const netWorthAtMilestoneTracked = netWorthAtMilestone !== null ? new CalculationBuilder(`${milestoneId}_nw`, `Net Worth at ${milestoneName}`, 'milestone')
    .setDescription(`Your projected net worth when you reach ${milestoneName}`)
    .setFormula('Projected Net Worth at Milestone Achievement')
    .setUnit('$')
    .addInputWithSource('Net Worth', netWorthAtMilestone, 'calculated', { 
      unit: '$',
      description: 'Based on your current growth trajectory'
    })
    .addTrackedInput(`${milestoneName} Target`, targetValueTracked)
    .build(netWorthAtMilestone) : null;

  return {
    targetValue: targetValueTracked,
    netWorthAtMilestone: netWorthAtMilestoneTracked,
    yearsToMilestone: yearsToMilestoneTracked,
    amountNeeded: amountNeededTracked,
  };
}

/**
 * Create tracked runway milestone info
 */
export function createTrackedRunwayMilestone(
  milestoneId: string,
  milestoneName: string,
  targetYears: number,
  currentNetWorth: number,
  currentMonthlySpend: number,
  currentRunwayYears: number,
  netWorthAtMilestone: number | null,
  year: number | null,
  currentYear: number
): TrackedMilestoneInfo {
  const annualExpenses = currentMonthlySpend * 12;
  const targetNetWorth = annualExpenses * targetYears;
  const amountNeeded = Math.max(0, targetNetWorth - currentNetWorth);
  const yearsAway = year ? year - currentYear : null;

  const targetValueTracked = new CalculationBuilder(`${milestoneId}_target`, `${milestoneName} Target`, 'milestone')
    .setDescription(`The net worth required to have ${targetYears} ${targetYears === 1 ? 'year' : 'years'} of expenses covered. This milestone represents financial security.`)
    .setFormula('Annual Expenses × Target Years')
    .setUnit('$')
    .addInputWithSource('Monthly Spending', currentMonthlySpend, 'calculated', { 
      unit: '$',
      description: 'Your current monthly spending budget'
    })
    .addInputWithSource('Annual Expenses', annualExpenses, 'calculated', { 
      unit: '$',
      description: 'Monthly Spending × 12'
    })
    .addInputWithSource('Target Years', targetYears, 'constant', { 
      unit: 'years',
      description: `${targetYears}-year runway milestone`
    })
    .addStep(
      'Calculate annual expenses',
      `$${currentMonthlySpend.toLocaleString()} × 12 = $${annualExpenses.toLocaleString()}`,
      [],
      annualExpenses,
      '$'
    )
    .addStep(
      'Calculate target net worth',
      `$${annualExpenses.toLocaleString()} × ${targetYears} = $${targetNetWorth.toLocaleString()}`,
      [],
      targetNetWorth,
      '$'
    )
    .build(targetNetWorth);

  const amountNeededTracked = amountNeeded > 0 ? new CalculationBuilder(`${milestoneId}_amount`, `Amount to ${milestoneName}`, 'milestone')
    .setDescription(`The additional net worth you need to achieve ${targetYears}-year runway`)
    .setFormula('Target Net Worth - Current Net Worth')
    .setUnit('$')
    .addTrackedInput(`${milestoneName} Target`, targetValueTracked)
    .addInputWithSource('Current Net Worth', currentNetWorth, 'calculated', { unit: '$' })
    .addInputWithSource('Current Runway', currentRunwayYears, 'calculated', { 
      unit: 'years',
      description: `You currently have ${currentRunwayYears.toFixed(1)} years of runway`
    })
    .addStep(
      'Calculate remaining amount',
      `$${targetNetWorth.toLocaleString()} - $${currentNetWorth.toLocaleString()} = $${amountNeeded.toLocaleString()}`,
      [],
      amountNeeded,
      '$'
    )
    .build(amountNeeded) : null;

  const yearsToMilestoneTracked = yearsAway !== null ? new CalculationBuilder(`${milestoneId}_years`, `Years to ${milestoneName}`, 'milestone')
    .setDescription(`Projected years until you achieve ${targetYears}-year runway`)
    .setFormula('Milestone Year - Current Year')
    .setUnit('years')
    .addInputWithSource('Milestone Year', year!, 'calculated')
    .addInputWithSource('Current Year', currentYear, 'constant')
    .build(yearsAway) : null;

  const netWorthAtMilestoneTracked = netWorthAtMilestone !== null ? new CalculationBuilder(`${milestoneId}_nw`, `Net Worth at ${milestoneName}`, 'milestone')
    .setDescription(`Your projected net worth when you achieve ${targetYears}-year runway`)
    .setFormula('Projected Net Worth at Milestone')
    .setUnit('$')
    .addInputWithSource('Net Worth', netWorthAtMilestone, 'calculated', { unit: '$' })
    .build(netWorthAtMilestone) : null;

  return {
    targetValue: targetValueTracked,
    netWorthAtMilestone: netWorthAtMilestoneTracked,
    yearsToMilestone: yearsToMilestoneTracked,
    amountNeeded: amountNeededTracked,
  };
}

/**
 * Create tracked coast milestone info
 */
export function createTrackedCoastMilestone(
  milestoneId: string,
  milestoneName: string,
  targetCoastPercent: number,
  currentNetWorth: number,
  currentMonthlySpend: number,
  currentCoastPercent: number,
  currentAge: number | null,
  retirementAge: number,
  annualReturnRate: number,
  inflationRate: number,
  swr: number,
  netWorthAtMilestone: number | null,
  year: number | null,
  currentYear: number
): TrackedMilestoneInfo {
  const yearsToRetirement = currentAge !== null 
    ? Math.max(0, retirementAge - currentAge)
    : 30;
  
  const returnRate = annualReturnRate / 100;
  const inflation = inflationRate / 100;
  
  // Calculate what NW is needed NOW to coast to targetCoastPercent
  const futureMultiplier = Math.pow(1 + returnRate, yearsToRetirement);
  const inflationMultiplier = Math.pow(1 + inflation, yearsToRetirement);
  const futureMonthlySpend = currentMonthlySpend * inflationMultiplier;
  const futureFiTarget = (futureMonthlySpend * 12) / (swr / 100);
  const targetFutureNW = futureFiTarget * (targetCoastPercent / 100);
  const targetCurrentNW = futureMultiplier > 0 ? targetFutureNW / futureMultiplier : targetFutureNW;
  const amountNeeded = Math.max(0, targetCurrentNW - currentNetWorth);
  const yearsAway = year ? year - currentYear : null;

  const targetValueTracked = new CalculationBuilder(`${milestoneId}_target`, `${milestoneName} Target`, 'milestone')
    .setDescription(`The net worth you need today so that compound growth alone will take you to ${targetCoastPercent}% FI by retirement age ${retirementAge}.`)
    .setFormula('(Future FI Target × Target%) ÷ Growth Multiplier')
    .setUnit('$')
    .addSetting('Return Rate', annualReturnRate, 'currentRate', { unit: '%' })
    .addSetting('Inflation Rate', inflationRate, 'inflationRate', { unit: '%' })
    .addSetting('SWR', swr, 'swr', { unit: '%' })
    .addInputWithSource('Years to Retirement', yearsToRetirement, 'calculated', { unit: 'years' })
    .addInputWithSource('Target Coast %', targetCoastPercent, 'constant', { unit: '%' })
    .addStep(
      'Calculate growth multiplier',
      `(1 + ${annualReturnRate}%/100)^${yearsToRetirement} = ${futureMultiplier.toFixed(2)}x`,
      [],
      futureMultiplier,
      'x'
    )
    .addStep(
      'Calculate future FI target',
      `$${currentMonthlySpend.toLocaleString()} × ${inflationMultiplier.toFixed(2)} × 12 ÷ ${swr}% = $${futureFiTarget.toLocaleString()}`,
      [],
      futureFiTarget,
      '$'
    )
    .addStep(
      'Calculate target future NW',
      `$${futureFiTarget.toLocaleString()} × ${targetCoastPercent}% = $${targetFutureNW.toLocaleString()}`,
      [],
      targetFutureNW,
      '$'
    )
    .addStep(
      'Calculate required current NW',
      `$${targetFutureNW.toLocaleString()} ÷ ${futureMultiplier.toFixed(2)} = $${targetCurrentNW.toLocaleString()}`,
      [],
      targetCurrentNW,
      '$'
    )
    .build(targetCurrentNW);

  const amountNeededTracked = amountNeeded > 0 ? new CalculationBuilder(`${milestoneId}_amount`, `Amount to ${milestoneName}`, 'milestone')
    .setDescription(`The additional net worth you need to achieve ${milestoneName}`)
    .setFormula('Target Net Worth - Current Net Worth')
    .setUnit('$')
    .addTrackedInput(`${milestoneName} Target`, targetValueTracked)
    .addInputWithSource('Current Net Worth', currentNetWorth, 'calculated', { unit: '$' })
    .addInputWithSource('Current Coast %', currentCoastPercent, 'calculated', { 
      unit: '%',
      description: `You\'re currently at ${currentCoastPercent.toFixed(1)}% coast`
    })
    .addStep(
      'Calculate remaining amount',
      `$${targetCurrentNW.toLocaleString()} - $${currentNetWorth.toLocaleString()} = $${amountNeeded.toLocaleString()}`,
      [],
      amountNeeded,
      '$'
    )
    .build(amountNeeded) : null;

  const yearsToMilestoneTracked = yearsAway !== null ? new CalculationBuilder(`${milestoneId}_years`, `Years to ${milestoneName}`, 'milestone')
    .setDescription(`Projected years until you reach ${milestoneName}`)
    .setFormula('Milestone Year - Current Year')
    .setUnit('years')
    .addInputWithSource('Milestone Year', year!, 'calculated')
    .addInputWithSource('Current Year', currentYear, 'constant')
    .build(yearsAway) : null;

  const netWorthAtMilestoneTracked = netWorthAtMilestone !== null ? new CalculationBuilder(`${milestoneId}_nw`, `Net Worth at ${milestoneName}`, 'milestone')
    .setDescription(`Your projected net worth when you reach ${milestoneName}`)
    .setFormula('Projected Net Worth at Milestone')
    .setUnit('$')
    .addInputWithSource('Net Worth', netWorthAtMilestone, 'calculated', { unit: '$' })
    .build(netWorthAtMilestone) : null;

  return {
    targetValue: targetValueTracked,
    netWorthAtMilestone: netWorthAtMilestoneTracked,
    yearsToMilestone: yearsToMilestoneTracked,
    amountNeeded: amountNeededTracked,
  };
}

/**
 * Create tracked lifestyle milestone info (Lean FI, Regular FI, Fat FI, etc.)
 */
export function createTrackedLifestyleMilestone(
  milestoneId: string,
  milestoneName: string,
  spendingMultiplier: number,
  currentNetWorth: number,
  currentMonthlySpend: number,
  swr: number,
  netWorthAtMilestone: number | null,
  year: number | null,
  currentYear: number
): TrackedMilestoneInfo {
  const adjustedSpend = currentMonthlySpend * spendingMultiplier;
  const targetFiTarget = (adjustedSpend * 12) / (swr / 100);
  const currentProgress = targetFiTarget > 0 ? (currentNetWorth / targetFiTarget) * 100 : 0;
  const amountNeeded = Math.max(0, targetFiTarget - currentNetWorth);
  const yearsAway = year ? year - currentYear : null;

  const multiplierDescription = spendingMultiplier === 1 
    ? 'Your regular spending level'
    : spendingMultiplier < 1 
      ? `${(spendingMultiplier * 100).toFixed(0)}% of your regular spending (lean lifestyle)`
      : `${(spendingMultiplier * 100).toFixed(0)}% of your regular spending (enhanced lifestyle)`;

  const targetValueTracked = new CalculationBuilder(`${milestoneId}_target`, `${milestoneName} Target`, 'milestone')
    .setDescription(`The net worth required for ${milestoneName}. ${multiplierDescription}.`)
    .setFormula('(Adjusted Monthly Spend × 12) ÷ SWR%')
    .setUnit('$')
    .addInputWithSource('Current Monthly Spend', currentMonthlySpend, 'calculated', { unit: '$' })
    .addInputWithSource('Spending Multiplier', spendingMultiplier, 'constant', { 
      description: multiplierDescription
    })
    .addSetting('SWR', swr, 'swr', { unit: '%' })
    .addStep(
      'Calculate adjusted spending',
      `$${currentMonthlySpend.toLocaleString()} × ${spendingMultiplier} = $${adjustedSpend.toLocaleString()}/month`,
      [],
      adjustedSpend,
      '$'
    )
    .addStep(
      'Calculate annual spending',
      `$${adjustedSpend.toLocaleString()} × 12 = $${(adjustedSpend * 12).toLocaleString()}/year`,
      [],
      adjustedSpend * 12,
      '$'
    )
    .addStep(
      'Calculate FI target',
      `$${(adjustedSpend * 12).toLocaleString()} ÷ ${swr}% = $${targetFiTarget.toLocaleString()}`,
      [],
      targetFiTarget,
      '$'
    )
    .build(targetFiTarget);

  const amountNeededTracked = amountNeeded > 0 ? new CalculationBuilder(`${milestoneId}_amount`, `Amount to ${milestoneName}`, 'milestone')
    .setDescription(`The additional net worth you need to achieve ${milestoneName}`)
    .setFormula('Target - Current Net Worth')
    .setUnit('$')
    .addTrackedInput(`${milestoneName} Target`, targetValueTracked)
    .addInputWithSource('Current Net Worth', currentNetWorth, 'calculated', { unit: '$' })
    .addInputWithSource('Current Progress', currentProgress, 'calculated', { 
      unit: '%',
      description: `You\'re ${currentProgress.toFixed(1)}% of the way to ${milestoneName}`
    })
    .addStep(
      'Calculate remaining amount',
      `$${targetFiTarget.toLocaleString()} - $${currentNetWorth.toLocaleString()} = $${amountNeeded.toLocaleString()}`,
      [],
      amountNeeded,
      '$'
    )
    .build(amountNeeded) : null;

  const yearsToMilestoneTracked = yearsAway !== null ? new CalculationBuilder(`${milestoneId}_years`, `Years to ${milestoneName}`, 'milestone')
    .setDescription(`Projected years until you reach ${milestoneName}`)
    .setFormula('Milestone Year - Current Year')
    .setUnit('years')
    .addInputWithSource('Milestone Year', year!, 'calculated')
    .addInputWithSource('Current Year', currentYear, 'constant')
    .build(yearsAway) : null;

  const netWorthAtMilestoneTracked = netWorthAtMilestone !== null ? new CalculationBuilder(`${milestoneId}_nw`, `Net Worth at ${milestoneName}`, 'milestone')
    .setDescription(`Your projected net worth when you reach ${milestoneName}`)
    .setFormula('Projected Net Worth at Milestone')
    .setUnit('$')
    .addInputWithSource('Net Worth', netWorthAtMilestone, 'calculated', { unit: '$' })
    .build(netWorthAtMilestone) : null;

  return {
    targetValue: targetValueTracked,
    netWorthAtMilestone: netWorthAtMilestoneTracked,
    yearsToMilestone: yearsToMilestoneTracked,
    amountNeeded: amountNeededTracked,
  };
}

/**
 * Create tracked crossover milestone info
 */
export function createTrackedCrossoverMilestone(
  currentInterest: number,
  currentContributions: number,
  netWorthAtMilestone: number | null,
  year: number | null,
  currentYear: number
): TrackedMilestoneInfo {
  const isAchieved = currentInterest > currentContributions && currentContributions > 0;
  const yearsAway = year ? year - currentYear : null;

  const targetValueTracked = new CalculationBuilder('crossover_point', 'Crossover Point', 'milestone')
    .setDescription('The crossover point is when your investment earnings exceed your contributions. This means your money is working harder than you are!')
    .setFormula('Investment Earnings > Contributions')
    .setUnit('$')
    .addInputWithSource('Current Investment Earnings', currentInterest, 'calculated', { 
      unit: '$',
      description: 'How much your investments have earned this year'
    })
    .addInputWithSource('Current Contributions', currentContributions, 'calculated', { 
      unit: '$',
      description: 'How much you\'ve contributed this year'
    })
    .addStep(
      'Compare earnings to contributions',
      `$${currentInterest.toLocaleString()} ${isAchieved ? '>' : '<'} $${currentContributions.toLocaleString()}`,
      [],
      isAchieved ? 1 : 0,
      ''
    )
    .build(isAchieved ? currentInterest : 0);

  const yearsToMilestoneTracked = yearsAway !== null ? new CalculationBuilder('crossover_years', 'Years to Crossover', 'milestone')
    .setDescription('Projected years until your investment earnings exceed your contributions')
    .setFormula('Crossover Year - Current Year')
    .setUnit('years')
    .addInputWithSource('Crossover Year', year!, 'calculated')
    .addInputWithSource('Current Year', currentYear, 'constant')
    .build(yearsAway) : null;

  const netWorthAtMilestoneTracked = netWorthAtMilestone !== null ? new CalculationBuilder('crossover_nw', 'Net Worth at Crossover', 'milestone')
    .setDescription('Your projected net worth when you reach the crossover point')
    .setFormula('Projected Net Worth')
    .setUnit('$')
    .addInputWithSource('Net Worth', netWorthAtMilestone, 'calculated', { unit: '$' })
    .build(netWorthAtMilestone) : null;

  return {
    targetValue: targetValueTracked,
    netWorthAtMilestone: netWorthAtMilestoneTracked,
    yearsToMilestone: yearsToMilestoneTracked,
    amountNeeded: null,
  };
}
