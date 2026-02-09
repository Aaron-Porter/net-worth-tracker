'use client'

import React, { useState, useMemo } from 'react'
import {
  formatCurrency,
  calculateSwrAmounts,
  calculateFiTarget,
} from '../../lib/calculations'
import type { TrackedValue as TrackedValueType } from '../../lib/calculationTrace'
import { TrackedNumber } from '../../lib/TrackedNumber'
import { TrackedValue, SimpleTrackedValue } from './TrackedValue'
import { MilestoneBadges } from './MilestoneBadges'
import { useScenarios, ScenarioProjection } from '../../lib/useScenarios'

export function ProjectionsTable({
  scenarioProjections,
  birthDate,
  latestEntry,
}: {
  scenarioProjections: ScenarioProjection[];
  birthDate: string;
  latestEntry: ReturnType<typeof useScenarios>['latestEntry'];
}) {
  const currentYear = new Date().getFullYear();
  const birthYear = birthDate ? new Date(birthDate).getFullYear() : null;
  const [showYearlyDetail, setShowYearlyDetail] = useState(true);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('yearly');
  const [coastTargetAge, setCoastTargetAge] = useState(65);

  const primaryProjection = scenarioProjections[0];

  // Type for display rows that can be either yearly or monthly
  interface DisplayRow {
    isNow?: boolean;      // Real-time "current" row
    year: number;
    displayYear?: string; // Only for monthly view (or 'Now' for current row)
    monthIndex?: number;  // Only for monthly view (0-11)
    age: number | null;
    yearsFromEntry: number;
    netWorth: number;
    interest: number;
    contributed: number;
    annualSwr: number;
    monthlySwr: number;
    weeklySwr: number;
    dailySwr: number;
    monthlySpend: number;
    annualSpending: number;
    annualSavings: number;
    fiTarget: number;
    fiProgress: number;
    coastFiYear: number | null;
    coastFiAge: number | null;
    isFiYear: boolean;
    isCrossover: boolean;
    swrCoversSpend: boolean;
    grossIncome?: number;
    totalTax?: number;
    netIncome?: number;
    preTaxContributions?: number;
  }

  // Fractional current age for precise coast number calculation on the "Now" row
  const fractionalCurrentAge = birthDate
    ? (Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    : null;

  // "Now" row — real-time snapshot prepended to every view
  const nowRow: DisplayRow = {
    isNow: true,
    year: currentYear,
    displayYear: 'Now',
    age: fractionalCurrentAge,
    yearsFromEntry: 0,
    netWorth: 0, // Overridden in render loop with sp.currentNetWorth.total
    interest: 0,
    contributed: 0,
    annualSwr: 0,
    monthlySwr: 0,
    weeklySwr: 0,
    dailySwr: 0,
    monthlySpend: 0,
    annualSpending: 0,
    annualSavings: 0,
    fiTarget: 0,
    fiProgress: 0,
    coastFiYear: null,
    coastFiAge: null,
    isFiYear: false,
    isCrossover: false,
    swrCoversSpend: false,
  };

  // Transform projections based on view mode
  const displayRows = useMemo((): DisplayRow[] => {
    if (viewMode === 'yearly') {
      // Map yearly projections to DisplayRow format
      return primaryProjection.projections.map(row => ({
        year: row.year,
        age: row.age,
        yearsFromEntry: row.yearsFromEntry,
        netWorth: row.netWorth,
        interest: row.interest,
        contributed: row.contributed,
        annualSwr: row.annualSwr,
        monthlySwr: row.monthlySwr,
        weeklySwr: row.weeklySwr,
        dailySwr: row.dailySwr,
        monthlySpend: row.monthlySpend,
        annualSpending: row.annualSpending,
        annualSavings: row.annualSavings,
        fiTarget: row.fiTarget,
        fiProgress: row.fiProgress,
        coastFiYear: row.coastFiYear,
        coastFiAge: row.coastFiAge,
        isFiYear: row.isFiYear,
        isCrossover: row.isCrossover,
        swrCoversSpend: row.swrCoversSpend,
        grossIncome: row.grossIncome,
        totalTax: row.totalTax,
        netIncome: row.netIncome,
        preTaxContributions: row.preTaxContributions,
      }));
    }

    // For monthly view, use the actual monthly projections data
    // This provides accurate month-by-month spending that updates with net worth
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (!primaryProjection.monthlyProjections || primaryProjection.monthlyProjections.length === 0) {
      // Fallback: if no monthly projections, return yearly
      return primaryProjection.projections.map(row => ({
        year: row.year,
        age: row.age,
        yearsFromEntry: row.yearsFromEntry,
        netWorth: row.netWorth,
        interest: row.interest,
        contributed: row.contributed,
        annualSwr: row.annualSwr,
        monthlySwr: row.monthlySwr,
        weeklySwr: row.weeklySwr,
        dailySwr: row.dailySwr,
        monthlySpend: row.monthlySpend,
        annualSpending: row.annualSpending,
        annualSavings: row.annualSavings,
        fiTarget: row.fiTarget,
        fiProgress: row.fiProgress,
        coastFiYear: row.coastFiYear,
        coastFiAge: row.coastFiAge,
        isFiYear: row.isFiYear,
        isCrossover: row.isCrossover,
        swrCoversSpend: row.swrCoversSpend,
        grossIncome: row.grossIncome,
        totalTax: row.totalTax,
        netIncome: row.netIncome,
        preTaxContributions: row.preTaxContributions,
      }));
    }

    // Convert monthly projections to display rows
    return primaryProjection.monthlyProjections.map((month, idx): DisplayRow => {
      // Find the corresponding yearly row for additional data (income, taxes, etc.)
      const yearlyRow = primaryProjection.projections.find(p => p.year === month.year);

      // Calculate age for this month
      let age: number | null = null;
      if (birthYear) {
        age = month.year - birthYear + (month.month - 1) / 12;
      }

      return {
        year: month.year,
        displayYear: `${monthNames[month.month - 1]} ${month.year}`,
        monthIndex: month.month - 1,
        age,
        yearsFromEntry: month.yearsFromStart,
        netWorth: month.netWorth,
        interest: month.cumulativeInterest,
        contributed: month.cumulativeContributions,
        annualSwr: month.monthlySwr * 12,
        monthlySwr: month.monthlySwr,
        weeklySwr: month.monthlySwr / 4.33,
        dailySwr: month.monthlySwr / 30,
        monthlySpend: month.monthlySpending,
        annualSpending: month.monthlySpending * 12,
        annualSavings: month.monthlySavings * 12,
        fiTarget: month.fiTarget,
        fiProgress: month.fiProgress,
        coastFiYear: yearlyRow?.coastFiYear ?? null,
        coastFiAge: yearlyRow?.coastFiAge ?? null,
        isFiYear: month.swrCoversSpend && idx > 0 && !primaryProjection.monthlyProjections[idx - 1]?.swrCoversSpend,
        isCrossover: false, // TODO: calculate if needed
        swrCoversSpend: month.swrCoversSpend,
        // Tax data from yearly row
        grossIncome: yearlyRow?.grossIncome,
        totalTax: yearlyRow?.totalTax,
        netIncome: yearlyRow?.netIncome,
        preTaxContributions: yearlyRow?.preTaxContributions,
      };
    });
  }, [viewMode, primaryProjection.projections, primaryProjection.monthlyProjections, birthYear]);

  return (
    <div className="flex-1 overflow-auto space-y-4">
      {/* Year-by-Year Detail Table */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-semibold text-slate-300">Year-by-Year Breakdown</h3>
            {/* Monthly/Yearly Toggle */}
            <div className="flex items-center bg-slate-700/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === 'monthly'
                    ? 'bg-slate-600 text-slate-100'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewMode('yearly')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === 'yearly'
                    ? 'bg-slate-600 text-slate-100'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Yearly
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Coast to</span>
              <input
                type="range"
                min={40}
                max={90}
                value={coastTargetAge}
                onChange={(e) => setCoastTargetAge(Number(e.target.value))}
                className="w-20 h-1 accent-cyan-500"
              />
              <span className="text-cyan-400 font-medium w-6">{coastTargetAge}</span>
            </div>
          </div>
          <button
            onClick={() => setShowYearlyDetail(!showYearlyDetail)}
            className="hover:bg-slate-700/20 p-1 rounded transition-colors"
          >
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform ${showYearlyDetail ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {showYearlyDetail && (
          <div className="overflow-x-auto scrollbar-hide touch-pan-x">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-800 z-10">
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    {viewMode === 'monthly' ? 'Month' : 'Year'}
                  </th>
                  {birthDate && <th className="text-left text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Age</th>}
                  <th className="text-left text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    Scenario
                  </th>
                  <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    Net Worth
                  </th>
                  <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    Spending/{viewMode === 'monthly' ? 'mo' : 'yr'}
                  </th>
                  <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    Savings/{viewMode === 'monthly' ? 'mo' : 'yr'}
                  </th>
                  <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    SWR/{viewMode === 'monthly' ? 'mo' : 'yr'}
                  </th>
                  <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    FI %
                  </th>
                  <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    Coast
                  </th>
                  <th className="text-left text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    Milestones
                  </th>
                  {scenarioProjections.some(sp => sp.hasDynamicIncome) && (
                    <>
                      <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                        Income/{viewMode === 'monthly' ? 'mo' : 'yr'}
                      </th>
                      <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                        Taxes/{viewMode === 'monthly' ? 'mo' : 'yr'}
                      </th>
                      <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                        Net Income/{viewMode === 'monthly' ? 'mo' : 'yr'}
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {[nowRow, ...displayRows].map((row, rowIndex) => {
                  const displayYearValue = row.displayYear || row.year;
                  const lookupYear = row.year;

                  // Check if any scenario hits FI this year
                  const scenarioFiStatus = row.isNow ? [] : scenarioProjections.map(sp => {
                    const scenarioRow = sp.projections.find(p => p.year === lookupYear);
                    return {
                      scenario: sp,
                      isFiYear: scenarioRow?.isFiYear || false,
                      swrCoversSpend: scenarioRow?.swrCoversSpend || false,
                    };
                  });
                  const anyFiYear = scenarioFiStatus.some(s => s.isFiYear);

                  // Generate unique key
                  const rowKey = row.isNow ? 'now' : `${lookupYear}-${row.monthIndex || 0}`;

                  // Return sub-rows for each scenario (Now row: single row using primary scenario)
                  const scenariosForRow = row.isNow ? [scenarioProjections[0]] : scenarioProjections;
                  return scenariosForRow.map((sp, scenarioIndex) => {
                    const isFirstScenario = row.isNow || scenarioIndex === 0;
                    const isLastScenario = row.isNow || scenarioIndex === scenarioProjections.length - 1;

                    // Use weighted rate from projection for coast column
                    const coastRateForScenario = sp.effectiveRate;

                    // Get net worth and FI status
                    let netWorthValue = 0;
                    let isFiYear = false;

                    if (row.isNow) {
                      // "Now" row — use real-time net worth
                      netWorthValue = sp.currentNetWorth.total;
                    } else if (viewMode === 'monthly' && sp.monthlyProjections?.length) {
                      // Find the matching month in this scenario's monthly projections
                      const monthData = sp.monthlyProjections.find(
                        m => m.year === lookupYear && m.month === ((row.monthIndex || 0) + 1)
                      );

                      if (monthData) {
                        netWorthValue = monthData.netWorth;
                        // Mark as FI year if this is the first month where SWR covers spend
                        const prevMonthIndex = sp.monthlyProjections.findIndex(
                          m => m.year === lookupYear && m.month === ((row.monthIndex || 0) + 1)
                        );
                        const prevMonth = prevMonthIndex > 0 ? sp.monthlyProjections[prevMonthIndex - 1] : null;
                        isFiYear = monthData.swrCoversSpend && (!prevMonth || !prevMonth.swrCoversSpend);
                      } else {
                        // Fallback to interpolation
                        const currentYearRow = sp.projections.find(p => p.year === lookupYear);
                        const previousYearRow = sp.projections.find(p => p.year === (lookupYear as number) - 1);
                        const monthFraction = ((row.monthIndex || 0) + 1) / 12;
                        if (currentYearRow) {
                          const startOfYearNetWorth = previousYearRow ? previousYearRow.netWorth : sp.currentNetWorth.total;
                          netWorthValue = startOfYearNetWorth + (currentYearRow.netWorth - startOfYearNetWorth) * monthFraction;
                        }
                        isFiYear = (currentYearRow?.isFiYear ?? false) && (row.monthIndex || 0) === 11;
                      }
                    } else {
                      const scenarioRow = sp.projections.find(p => p.year === lookupYear);
                      netWorthValue = scenarioRow?.netWorth || 0;
                      isFiYear = scenarioRow?.isFiYear || false;
                    }

                    // Calculate other values
                    // For monthly view, use actual monthly projections data (where spending updates each month)
                    // For yearly view, use yearly projections
                    const scenarioRow = sp.projections.find(p => p.year === lookupYear);

                    let spendingDisplayValue = 0;
                    let savingsDisplayValue = 0;
                    let monthlySwr = 0;
                    let swrCoversSpend = false;
                    let swrDisplayValue = 0;
                    let fiProgress = 0;
                    let fiTarget = 0;

                    // Track which data source has pre-built traces
                    type TrackedFields = { trackedSpending?: TrackedValueType; trackedSavings?: TrackedValueType; trackedNetWorth?: TrackedValueType; trackedMonthlySwr?: TrackedValueType; trackedFiTarget?: TrackedValueType; trackedFiProgress?: TrackedValueType; trackedIncome?: TrackedValueType; trackedTax?: TrackedValueType; trackedNetIncome?: TrackedValueType };
                    let trackedSource: TrackedFields | undefined;

                    if (row.isNow) {
                      // "Now" row — derive values from real-time NW, use first projection row traces
                      const nowSwr = calculateSwrAmounts(netWorthValue, sp.scenario.swr);
                      const nowMonthlySpend = scenarioRow?.monthlySpend ?? 0;
                      spendingDisplayValue = viewMode === 'monthly' ? nowMonthlySpend : nowMonthlySpend * 12;
                      savingsDisplayValue = viewMode === 'monthly' ? (scenarioRow?.annualSavings || 0) / 12 : (scenarioRow?.annualSavings || 0);
                      monthlySwr = nowSwr.monthly;
                      swrDisplayValue = viewMode === 'monthly' ? nowSwr.monthly : nowSwr.annual;
                      swrCoversSpend = nowMonthlySpend > 0 && nowSwr.monthly >= nowMonthlySpend;
                      fiTarget = calculateFiTarget(nowMonthlySpend, sp.scenario.swr);
                      fiProgress = fiTarget > 0 ? (netWorthValue / fiTarget) * 100 : 0;
                      // Use first projection row traces for spending/savings/SWR, but exclude
                      // NW and FI progress traces since those are computed from real-time NW
                      trackedSource = scenarioRow ? {
                        ...scenarioRow,
                        trackedNetWorth: undefined,
                        trackedFiProgress: undefined,
                      } : undefined;
                    } else if (viewMode === 'monthly' && sp.monthlyProjections?.length) {
                      // Find the matching month in this scenario's monthly projections
                      const monthData = sp.monthlyProjections.find(
                        m => m.year === lookupYear && m.month === ((row.monthIndex || 0) + 1)
                      );

                      if (monthData) {
                        // Use actual monthly spending (calculated based on that month's net worth)
                        spendingDisplayValue = monthData.monthlySpending;
                        savingsDisplayValue = monthData.monthlySavings;
                        monthlySwr = monthData.monthlySwr;
                        swrDisplayValue = monthData.monthlySwr;
                        swrCoversSpend = monthData.swrCoversSpend;
                        fiTarget = monthData.fiTarget;
                        fiProgress = monthData.fiProgress;
                        trackedSource = monthData;
                      } else {
                        // Fallback to yearly data divided by 12
                        spendingDisplayValue = (scenarioRow?.annualSpending || 0) / 12;
                        savingsDisplayValue = (scenarioRow?.annualSavings || 0) / 12;
                        monthlySwr = scenarioRow?.monthlySwr || 0;
                        swrDisplayValue = monthlySwr;
                        swrCoversSpend = scenarioRow?.swrCoversSpend || false;
                        fiTarget = scenarioRow?.fiTarget || 0;
                        fiProgress = scenarioRow?.fiProgress || 0;
                      }
                    } else {
                      // Yearly view - use yearly projections
                      spendingDisplayValue = scenarioRow?.annualSpending || 0;
                      savingsDisplayValue = scenarioRow?.annualSavings || 0;
                      monthlySwr = scenarioRow?.monthlySwr || 0;
                      swrDisplayValue = monthlySwr * 12; // Show annual SWR
                      swrCoversSpend = scenarioRow?.swrCoversSpend || false;
                      fiTarget = scenarioRow?.fiTarget || 0;
                      fiProgress = scenarioRow?.fiProgress || 0;
                      trackedSource = scenarioRow;
                    }

                    const savings = savingsDisplayValue;

                    // Income values (still from yearly, divided by 12 for monthly)
                    const income = scenarioRow?.grossIncome || 0;
                    const hasIncome = sp.hasDynamicIncome && income > 0;
                    const incomeDisplayValue = viewMode === 'monthly' ? income / 12 : income;

                    const totalTax = scenarioRow?.totalTax || 0;
                    const hasTax = sp.hasDynamicIncome && totalTax > 0;
                    const taxDisplayValue = viewMode === 'monthly' ? totalTax / 12 : totalTax;

                    const netIncome = scenarioRow?.netIncome || 0;
                    const hasNetIncome = sp.hasDynamicIncome && netIncome > 0;
                    const netIncomeDisplayValue = viewMode === 'monthly' ? netIncome / 12 : netIncome;

                    // Build monthly income/tax/net income traces by dividing annual traces by 12
                    const monthsDivisor = TrackedNumber.constant(12, 'Months per year');
                    const trackedIncomeForDisplay = scenarioRow?.trackedIncome
                      ? (viewMode === 'monthly'
                        ? TrackedNumber.fromTrackedValue(scenarioRow.trackedIncome)
                            .divide(monthsDivisor, { name: 'Monthly Income', unit: '$', category: 'projection', description: 'Annual gross income divided by 12', formula: 'Annual Income ÷ 12' })
                            .toTrackedValue()
                        : scenarioRow.trackedIncome)
                      : undefined;
                    const trackedTaxForDisplay = scenarioRow?.trackedTax
                      ? (viewMode === 'monthly'
                        ? TrackedNumber.fromTrackedValue(scenarioRow.trackedTax)
                            .divide(monthsDivisor, { name: 'Monthly Taxes', unit: '$', category: 'tax', description: 'Annual taxes divided by 12', formula: 'Annual Taxes ÷ 12' })
                            .toTrackedValue()
                        : scenarioRow.trackedTax)
                      : undefined;
                    const trackedNetIncomeForDisplay = scenarioRow?.trackedNetIncome
                      ? (viewMode === 'monthly'
                        ? TrackedNumber.fromTrackedValue(scenarioRow.trackedNetIncome)
                            .divide(monthsDivisor, { name: 'Monthly Net Income', unit: '$', category: 'projection', description: 'Annual net income divided by 12', formula: 'Annual Net Income ÷ 12' })
                            .toTrackedValue()
                        : scenarioRow.trackedNetIncome)
                      : undefined;

                    return (
                      <tr
                        key={`${rowKey}-${sp.scenario._id}`}
                        className={`hover:bg-slate-700/30 ${
                          row.isNow
                            ? (isLastScenario ? 'border-b-2 border-cyan-500/30' : 'border-b border-slate-700/20')
                            : (isLastScenario ? 'border-b border-slate-700/50' : 'border-b border-slate-700/20')
                        } ${
                          row.isNow ? 'bg-cyan-900/10' : (anyFiYear && isFirstScenario ? 'bg-emerald-900/20' : '')
                        }`}
                        style={{
                          backgroundColor: row.isNow ? undefined : (isFirstScenario && anyFiYear ? undefined : `${sp.scenario.color}08`),
                          borderLeftWidth: '3px',
                          borderLeftColor: sp.scenario.color,
                        }}
                      >
                        {/* Year/Month - only show in first scenario row */}
                        {isFirstScenario && (
                          <td
                            className={`py-2 px-3 font-medium align-top ${row.isNow ? 'text-cyan-400' : 'text-slate-300'}`}
                            rowSpan={row.isNow ? 1 : scenarioProjections.length}
                          >
                            {displayYearValue}
                          </td>
                        )}
                        {/* Age - only show in first scenario row */}
                        {isFirstScenario && birthDate && (
                          <td
                            className={`py-2 px-3 align-top ${row.isNow ? 'text-cyan-400/70' : 'text-slate-400'}`}
                            rowSpan={row.isNow ? 1 : scenarioProjections.length}
                          >
                            {row.age !== null && typeof row.age === 'number' ? Math.floor(row.age) : row.age}
                          </td>
                        )}
                        {/* Scenario name with color */}
                        <td className={`py-2 px-3 text-sm font-medium ${row.isNow ? 'text-cyan-400/60' : ''}`} style={row.isNow ? undefined : { color: sp.scenario.color }}>
                          {row.isNow ? 'Current' : sp.scenario.name}
                        </td>
                        {/* Net Worth */}
                        <td className="py-2 px-3 text-right font-mono" style={{ color: sp.scenario.color }}>
                          {trackedSource?.trackedNetWorth ? (
                            <TrackedValue value={trackedSource.trackedNetWorth} className="font-mono" />
                          ) : (
                            <SimpleTrackedValue
                              value={netWorthValue}
                              name={`Net Worth (${displayYearValue})`}
                              description={`Projected net worth for ${sp.scenario.name} in ${displayYearValue}`}
                              formula="Previous NW + Weighted Interest + Savings"
                              inputs={[
                                { name: 'Weighted Return Rate', value: `${coastRateForScenario.toFixed(1)}%` },
                                { name: 'Scenario', value: sp.scenario.name },
                              ]}
                              className="font-mono"
                            />
                          )}
                          {isFiYear && <span className="ml-1 text-xs text-emerald-400">FI</span>}
                        </td>
                        {/* Spending */}
                        <td className="py-2 px-3 text-right font-mono text-rose-400/80">
                          {trackedSource?.trackedSpending ? (
                            <TrackedValue value={trackedSource.trackedSpending} className="font-mono text-rose-400/80" />
                          ) : (
                            <SimpleTrackedValue
                              value={spendingDisplayValue}
                              name={`Spending (${displayYearValue})`}
                              description={`Level-based spending budget for ${displayYearValue}`}
                              formula={`Base Budget (inflation-adj) + Net Worth × ${sp.scenario.spendingGrowthRate}%`}
                              inputs={[
                                { name: 'Period', value: viewMode === 'monthly' ? 'Monthly' : 'Annual' },
                                { name: 'Base Budget', value: sp.scenario.baseMonthlyBudget, unit: '$' },
                              ]}
                              className="font-mono text-rose-400/80"
                            />
                          )}
                        </td>
                        {/* Savings */}
                        <td className={`py-2 px-3 text-right font-mono ${
                          savings > 0 ? 'text-emerald-400/80' : 'text-slate-500'
                        }`}>
                          {trackedSource?.trackedSavings ? (
                            <TrackedValue value={trackedSource.trackedSavings} className={`font-mono ${savings > 0 ? 'text-emerald-400/80' : 'text-slate-500'}`} />
                          ) : (
                            <SimpleTrackedValue
                              value={savingsDisplayValue}
                              name={`Savings (${displayYearValue})`}
                              description={`Net savings after spending for ${displayYearValue}`}
                              formula="Income - Taxes - Spending"
                              inputs={[
                                { name: 'Period', value: viewMode === 'monthly' ? 'Monthly' : 'Annual' },
                              ]}
                              className={`font-mono ${savings > 0 ? 'text-emerald-400/80' : 'text-slate-500'}`}
                            />
                          )}
                        </td>
                        {/* SWR */}
                        <td className={`py-2 px-3 text-right font-mono ${
                          swrCoversSpend ? 'text-emerald-400' : 'text-amber-400/70'
                        }`}>
                          {trackedSource?.trackedMonthlySwr ? (
                            <TrackedValue value={trackedSource.trackedMonthlySwr} className={`font-mono ${swrCoversSpend ? 'text-emerald-400' : 'text-amber-400/70'}`} />
                          ) : (
                            <SimpleTrackedValue
                              value={swrDisplayValue}
                              name={`SWR (${displayYearValue})`}
                              description={`Safe withdrawal amount for ${displayYearValue} at ${sp.scenario.swr}% SWR`}
                              formula={`Net Worth × ${sp.scenario.swr}%${viewMode === 'monthly' ? ' ÷ 12' : ''}`}
                              inputs={[
                                { name: 'Net Worth', value: netWorthValue, unit: '$' },
                                { name: 'SWR', value: `${sp.scenario.swr}%` },
                              ]}
                              className={`font-mono ${swrCoversSpend ? 'text-emerald-400' : 'text-amber-400/70'}`}
                            />
                          )}
                        </td>
                        {/* FI Progress */}
                        <td className={`py-2 px-3 text-right font-mono ${
                          fiProgress >= 100 ? 'text-emerald-400 font-semibold' : 'text-violet-400'
                        }`}>
                          {trackedSource?.trackedFiProgress ? (
                            <TrackedValue
                              value={trackedSource.trackedFiProgress}
                              formatter={(v: number) => `${v.toFixed(2)}%`}
                              showCurrency={false}
                              className={`font-mono ${fiProgress >= 100 ? 'text-emerald-400 font-semibold' : 'text-violet-400'}`}
                            />
                          ) : (
                            <SimpleTrackedValue
                              value={fiProgress}
                              name={`FI Progress (${displayYearValue})`}
                              description={`Progress towards financial independence for ${displayYearValue}`}
                              formula={`(Net Worth ÷ FI Target) × 100`}
                              inputs={[
                                { name: 'Net Worth', value: netWorthValue, unit: '$' },
                                { name: 'FI Target', value: fiTarget, unit: '$' },
                              ]}
                              unit="%"
                              className={`font-mono ${fiProgress >= 100 ? 'text-emerald-400 font-semibold' : 'text-violet-400'}`}
                            />
                          )}
                        </td>
                        {/* Coast Number */}
                        {(() => {
                          const rowAge = row.age !== null && typeof row.age === 'number' ? row.age : null;
                          const yearsToTarget = rowAge !== null
                            ? Math.max(0, coastTargetAge - rowAge)
                            : Math.max(0, coastTargetAge - 25 - (row.yearsFromEntry || 0));

                          const coastRate = coastRateForScenario / 100;
                          const coastMultiplier = yearsToTarget > 0 ? Math.pow(1 + coastRate, yearsToTarget) : 1;

                          const nwForCoast = TrackedNumber.from(netWorthValue, 'Net Worth', { unit: '$', category: 'projection' });
                          const yearsToTargetTN = TrackedNumber.from(yearsToTarget, 'Years to Target', {
                            unit: 'years',
                            description: `Years until age ${coastTargetAge}`,
                            category: 'projection',
                          });
                          const coastRateTN = TrackedNumber.setting(coastRateForScenario, 'Weighted Return Rate', 'currentRate', { unit: '%' });
                          const coastRateDecTN = coastRateTN.divide(TrackedNumber.constant(100, '100'), { name: 'Rate (decimal)' });
                          const coastMultTN = TrackedNumber.constant(1, '1')
                            .add(coastRateDecTN, { name: '1 + Rate' })
                            .pow(yearsToTargetTN, {
                              name: 'Growth Multiplier',
                              description: `${yearsToTarget.toFixed(1)} years of compounding at ${coastRateForScenario.toFixed(1)}%`,
                            });
                          const coastTN = nwForCoast.multiply(coastMultTN, {
                            name: 'Coast Number',
                            unit: '$',
                            category: 'projection',
                            description: `Net worth at age ${coastTargetAge} if you stop contributing`,
                            formula: `Net Worth × (1 + ${coastRateForScenario.toFixed(1)}%)^Years to Target`,
                          });

                          // Derive SWR and inflation-adjusted values for the tooltip steps
                          const coastVal = coastTN.value;
                          const swrPct = sp.scenario.swr;
                          const inflPct = sp.scenario.inflationRate;
                          const swrAnnual = coastVal * (swrPct / 100);
                          const swrMonthly = swrAnnual / 12;
                          const inflMultiplier = yearsToTarget > 0 ? Math.pow(1 + inflPct / 100, yearsToTarget) : 1;
                          const coastReal = coastVal / inflMultiplier;
                          const swrAnnualReal = swrAnnual / inflMultiplier;
                          const swrMonthlyReal = swrMonthly / inflMultiplier;

                          const coastTrace = coastTN.toTrackedValue();
                          const coastWithSteps: TrackedValueType = {
                            ...coastTrace,
                            trace: {
                              ...coastTrace.trace,
                              steps: [
                                {
                                  description: `SWR at ${swrPct}% (annual)`,
                                  formula: `${formatCurrency(coastVal, 0)} × ${swrPct}%`,
                                  intermediateResult: swrAnnual,
                                  unit: '$',
                                  inputs: [],
                                },
                                {
                                  description: `SWR at ${swrPct}% (monthly)`,
                                  formula: `${formatCurrency(swrAnnual, 0)} ÷ 12`,
                                  intermediateResult: swrMonthly,
                                  unit: '$',
                                  inputs: [],
                                },
                                {
                                  description: `Inflation-adjusted value (${inflPct}% over ${yearsToTarget.toFixed(1)} yrs)`,
                                  formula: `${formatCurrency(coastVal, 0)} ÷ (1 + ${inflPct}%)^${yearsToTarget.toFixed(1)}`,
                                  intermediateResult: coastReal,
                                  unit: '$',
                                  inputs: [],
                                },
                                {
                                  description: `Real SWR (annual, today's dollars)`,
                                  formula: `${formatCurrency(swrAnnual, 0)} ÷ ${inflMultiplier.toFixed(2)}`,
                                  intermediateResult: swrAnnualReal,
                                  unit: '$',
                                  inputs: [],
                                },
                                {
                                  description: `Real SWR (monthly, today's dollars)`,
                                  formula: `${formatCurrency(swrMonthly, 0)} ÷ ${inflMultiplier.toFixed(2)}`,
                                  intermediateResult: swrMonthlyReal,
                                  unit: '$',
                                  inputs: [],
                                },
                              ],
                            },
                          };

                          return (
                            <td className="py-2 px-3 text-right font-mono text-cyan-400/80">
                              <TrackedValue
                                value={coastWithSteps}
                                className="font-mono text-cyan-400/80"
                              />
                            </td>
                          );
                        })()}
                        {/* Milestones */}
                        <td className="py-2 px-3 text-left">
                          {row.isNow ? (
                            // "Now" row: show milestones already achieved
                            <MilestoneBadges
                              milestones={sp.fiMilestones.milestones.filter(m => m.isAchieved)}
                              maxVisible={3}
                            />
                          ) : (
                            // Projection rows: show milestones for this year, excluding already-achieved ones
                            (viewMode === 'yearly' || row.monthIndex === 0) && (
                              <MilestoneBadges
                                milestones={sp.fiMilestones.milestones.filter(m => m.year === lookupYear && m.year !== null && !m.isAchieved)}
                                maxVisible={3}
                              />
                            )
                          )}
                        </td>
                        {/* Income columns (only if any scenario has income data) */}
                        {scenarioProjections.some(sp => sp.hasDynamicIncome) && (
                          <>
                            <td className={`py-2 px-3 text-right font-mono ${
                              hasIncome ? 'text-sky-400/80' : 'text-slate-500'
                            }`}>
                              {hasIncome ? (
                                trackedIncomeForDisplay ? (
                                  <TrackedValue value={trackedIncomeForDisplay} className="font-mono text-sky-400/80" />
                                ) : (
                                  <SimpleTrackedValue
                                    value={incomeDisplayValue}
                                    name={`Income (${displayYearValue})`}
                                    description={`Gross income for ${displayYearValue}`}
                                    formula={`Base Income × (1 + ${sp.scenario.incomeGrowthRate || 0}%)^years`}
                                    inputs={[
                                      { name: 'Base Income', value: sp.scenario.grossIncome || 0, unit: '$' },
                                      { name: 'Growth Rate', value: `${sp.scenario.incomeGrowthRate || 0}%` },
                                      { name: 'Period', value: viewMode === 'monthly' ? 'Monthly (÷12)' : 'Annual' },
                                    ]}
                                    className="font-mono text-sky-400/80"
                                  />
                                )
                              ) : '-'}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono ${
                              hasTax ? 'text-red-400/80' : 'text-slate-500'
                            }`}>
                              {hasTax ? (
                                trackedTaxForDisplay ? (
                                  <TrackedValue value={trackedTaxForDisplay} className="font-mono text-red-400/80" />
                                ) : (
                                  <SimpleTrackedValue
                                    value={taxDisplayValue}
                                    name={`Taxes (${displayYearValue})`}
                                    description={`Total taxes (Federal + State + FICA) for ${displayYearValue}`}
                                    formula="Federal Tax + State Tax + FICA"
                                    inputs={[
                                      { name: 'Gross Income', value: scenarioRow?.grossIncome || 0, unit: '$' },
                                      { name: 'Total Annual Tax', value: scenarioRow?.totalTax || 0, unit: '$' },
                                      { name: 'Period', value: viewMode === 'monthly' ? 'Monthly (÷12)' : 'Annual' },
                                    ]}
                                    className="font-mono text-red-400/80"
                                  />
                                )
                              ) : '-'}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono ${
                              hasNetIncome ? 'text-emerald-400/80' : 'text-slate-500'
                            }`}>
                              {hasNetIncome ? (
                                trackedNetIncomeForDisplay ? (
                                  <TrackedValue value={trackedNetIncomeForDisplay} className="font-mono text-emerald-400/80" />
                                ) : (
                                  <SimpleTrackedValue
                                    value={netIncomeDisplayValue}
                                    name={`Net Income (${displayYearValue})`}
                                    description={`Take-home pay after taxes for ${displayYearValue}`}
                                    formula="Gross Income - Pre-Tax Contributions - Total Taxes"
                                    inputs={[
                                      { name: 'Gross Income', value: scenarioRow?.grossIncome || 0, unit: '$' },
                                      { name: 'Total Taxes', value: scenarioRow?.totalTax || 0, unit: '$' },
                                      { name: 'Pre-Tax Contributions', value: scenarioRow?.preTaxContributions || 0, unit: '$' },
                                      { name: 'Period', value: viewMode === 'monthly' ? 'Monthly (÷12)' : 'Annual' },
                                    ]}
                                    className="font-mono text-emerald-400/80"
                                  />
                                )
                              ) : '-'}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
