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
import { ScenarioProjection } from './useScenarios';
import { GrowthRates, RealTimeNetWorth, LevelInfo, ProjectionRow } from './calculations';

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
  category: 'net_worth' | 'swr' | 'projection' | 'spending' | 'fi_target' | 'growth_rate' = 'projection'
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
