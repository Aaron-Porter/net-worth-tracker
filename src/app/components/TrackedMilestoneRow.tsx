'use client'

import React, { useState, useMemo } from 'react'
import { FiMilestone, formatCurrency } from '../../lib/calculations'
import { TrackedValue, SimpleTrackedValue } from './TrackedValue'
import {
  createTrackedPercentageMilestone,
  createTrackedRunwayMilestone,
  createTrackedCoastMilestone,
  createTrackedLifestyleMilestone,
  createTrackedCrossoverMilestone,
  createTrackedRetirementIncomeMilestone,
  createTrackedCoastInfo,
} from '../../lib/trackedScenarioValues'

interface TrackedMilestoneRowProps {
  milestone: FiMilestone;
  currentYear: number;
  currentNetWorth: number;
  currentMonthlySpend: number;
  currentFiTarget: number;
  currentFiProgress: number;
  currentAge: number | null;
  retirementAge: number;
  effectiveRate: number;
  scenario: {
    currentRate: number;
    inflationRate: number;
    swr: number;
  };
}

export function TrackedMilestoneRow({
  milestone,
  currentYear,
  currentNetWorth,
  currentMonthlySpend,
  currentFiTarget,
  currentFiProgress,
  currentAge,
  retirementAge,
  effectiveRate,
  scenario,
}: TrackedMilestoneRowProps) {
  const [showDescription, setShowDescription] = useState(false);

  // Create tracked milestone info based on type
  const trackedInfo = useMemo(() => {
    if (milestone.type === 'percentage') {
      return createTrackedPercentageMilestone(
        milestone.id,
        milestone.shortName,
        milestone.targetValue,
        currentNetWorth,
        currentFiTarget,
        currentFiProgress,
        milestone.netWorthAtMilestone,
        milestone.year,
        currentYear
      );
    } else if (milestone.type === 'runway') {
      const currentRunwayYears = currentMonthlySpend > 0 ? currentNetWorth / (currentMonthlySpend * 12) : 0;
      return createTrackedRunwayMilestone(
        milestone.id,
        milestone.shortName,
        milestone.targetValue,
        currentNetWorth,
        currentMonthlySpend,
        currentRunwayYears,
        milestone.netWorthAtMilestone,
        milestone.year,
        currentYear
      );
    } else if (milestone.type === 'coast') {
      const coastInfo = createTrackedCoastInfo(
        currentNetWorth,
        currentMonthlySpend,
        currentAge,
        retirementAge,
        effectiveRate,
        scenario.inflationRate,
        scenario.swr
      );
      return createTrackedCoastMilestone(
        milestone.id,
        milestone.shortName,
        milestone.targetValue,
        currentNetWorth,
        currentMonthlySpend,
        coastInfo.coastFiPercent.value,
        currentAge,
        retirementAge,
        effectiveRate,
        scenario.inflationRate,
        scenario.swr,
        milestone.netWorthAtMilestone,
        milestone.year,
        currentYear
      );
    } else if (milestone.type === 'lifestyle') {
      return createTrackedLifestyleMilestone(
        milestone.id,
        milestone.shortName,
        milestone.targetValue,
        currentNetWorth,
        currentMonthlySpend,
        scenario.swr,
        milestone.netWorthAtMilestone,
        milestone.year,
        currentYear
      );
    } else if (milestone.type === 'retirement_income') {
      return createTrackedRetirementIncomeMilestone(
        milestone.id,
        milestone.shortName,
        milestone.targetValue,
        currentNetWorth,
        currentAge,
        retirementAge,
        effectiveRate,
        scenario.inflationRate,
        scenario.swr,
        milestone.netWorthAtMilestone,
        milestone.year,
        currentYear
      );
    } else if (milestone.id === 'crossover') {
      const currentInterest = currentNetWorth * (effectiveRate / 100);
      const currentContributions = 0;
      return createTrackedCrossoverMilestone(
        currentInterest,
        currentContributions,
        milestone.netWorthAtMilestone,
        milestone.year,
        currentYear
      );
    }
    return null;
  }, [milestone, currentNetWorth, currentMonthlySpend, currentFiTarget, currentFiProgress, currentAge, retirementAge, effectiveRate, scenario, currentYear]);

  return (
    <div
      className={`rounded-lg p-3 transition-colors cursor-pointer ${
        milestone.isAchieved
          ? 'bg-emerald-900/30 border border-emerald-500/30'
          : 'bg-slate-800/30 hover:bg-slate-800/50'
      }`}
      onClick={() => setShowDescription(!showDescription)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${milestone.isAchieved ? 'bg-emerald-400' : 'bg-slate-600'}`}
            style={!milestone.isAchieved ? { borderColor: milestone.color, borderWidth: 2 } : { backgroundColor: milestone.color }}
          />
          <div>
            <span className={`text-sm font-medium ${milestone.isAchieved ? 'text-emerald-300' : 'text-slate-300'}`}>
              {milestone.shortName}
            </span>
            {milestone.isAchieved && (
              <span className="ml-2 text-xs text-emerald-400">Achieved</span>
            )}
          </div>
        </div>

        <div className="text-right">
          {milestone.year ? (
            <>
              {trackedInfo?.yearsToMilestone ? (
                <TrackedValue
                  value={trackedInfo.yearsToMilestone}
                  showCurrency={false}
                  formatter={(v) => {
                    const monthAbbrev = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return milestone.month
                      ? `${monthAbbrev[milestone.month - 1]} ${milestone.year}`
                      : `${milestone.year}`;
                  }}
                  className={`text-sm font-mono ${milestone.isAchieved ? 'text-emerald-400' : 'text-slate-400'}`}
                />
              ) : (
                <span className={`text-sm font-mono ${milestone.isAchieved ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {milestone.month
                    ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][milestone.month - 1]} ${milestone.year}`
                    : milestone.year}
                </span>
              )}
              {milestone.age && (
                <span className="text-xs text-slate-500 ml-2">
                  (age {milestone.age})
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-500">Not projected</span>
          )}
        </div>
      </div>

      {showDescription && (
        <div className="mt-2 text-xs text-slate-400 pl-6 space-y-2">
          <p>{milestone.description}</p>

          {/* Coast milestone: current coast % with detailed math in tooltip */}
          {milestone.type === 'coast' && (() => {
            const yearsToRetirement = currentAge !== null
              ? Math.max(0, retirementAge - currentAge)
              : 30;
            const returnRate = effectiveRate / 100;
            const inflation = scenario.inflationRate / 100;
            const growthMultiplier = Math.pow(1 + returnRate, yearsToRetirement);
            const inflationMultiplier = Math.pow(1 + inflation, yearsToRetirement);
            const futureNW = currentNetWorth * growthMultiplier;
            const futureMonthlySpend = currentMonthlySpend * inflationMultiplier;
            const futureFiTarget = (futureMonthlySpend * 12) / (scenario.swr / 100);
            const currentCoastPct = futureFiTarget > 0 ? (futureNW / futureFiTarget) * 100 : 0;
            const targetFutureNW = futureFiTarget * (milestone.targetValue / 100);
            const targetCurrentNW = growthMultiplier > 0 ? targetFutureNW / growthMultiplier : targetFutureNW;

            return (
              <div className="bg-slate-800/20 rounded p-2">
                <span className="text-slate-500">Current coast: </span>
                <SimpleTrackedValue
                  value={currentCoastPct}
                  name={`Coast FI % (toward ${milestone.shortName})`}
                  description={`If you stopped contributing today, your investments would grow to ${currentCoastPct.toFixed(1)}% of your FI target by age ${retirementAge}. This milestone requires ${milestone.targetValue}%.`}
                  formula="(Future NW ÷ Future FI Target) × 100"
                  inputs={[
                    { name: 'Current Net Worth', value: currentNetWorth, unit: '$' },
                    { name: 'Current Monthly Spend', value: currentMonthlySpend, unit: '$' },
                    { name: 'Years to Retirement', value: yearsToRetirement, unit: 'years' },
                    { name: 'Weighted Return Rate', value: `${effectiveRate.toFixed(1)}%` },
                    { name: 'Inflation Rate', value: `${scenario.inflationRate}%` },
                    { name: 'SWR', value: `${scenario.swr}%` },
                  ]}
                  steps={[
                    {
                      description: `Compound net worth at ${effectiveRate.toFixed(1)}% for ${yearsToRetirement} years`,
                      formula: `${formatCurrency(currentNetWorth, 0)} × (1 + ${returnRate.toFixed(4)})^${yearsToRetirement}`,
                      result: futureNW,
                      unit: '$',
                    },
                    {
                      description: `Inflate spending at ${scenario.inflationRate}% for ${yearsToRetirement} years`,
                      formula: `${formatCurrency(currentMonthlySpend, 0)}/mo × (1 + ${inflation.toFixed(4)})^${yearsToRetirement}`,
                      result: futureMonthlySpend,
                      unit: '$',
                    },
                    {
                      description: 'Future FI target (annual spending ÷ SWR)',
                      formula: `(${formatCurrency(futureMonthlySpend, 0)} × 12) ÷ ${scenario.swr}%`,
                      result: futureFiTarget,
                      unit: '$',
                    },
                    {
                      description: 'Coast FI % (future NW ÷ future FI target)',
                      formula: `(${formatCurrency(futureNW, 0)} ÷ ${formatCurrency(futureFiTarget, 0)}) × 100`,
                      result: currentCoastPct,
                      unit: '%',
                    },
                    {
                      description: `NW needed today to coast to ${milestone.targetValue}%`,
                      formula: `${formatCurrency(futureFiTarget, 0)} × ${milestone.targetValue}% ÷ ${growthMultiplier.toFixed(2)}x`,
                      result: targetCurrentNW,
                      unit: '$',
                    },
                  ]}
                  formatAs="percent"
                  decimals={1}
                  className="text-violet-400"
                />
              </div>
            );
          })()}

          {/* Target value with full calculation trace */}
          {trackedInfo?.targetValue && (
            <div className="bg-slate-800/20 rounded p-2">
              <span className="text-slate-500">Target: </span>
              <TrackedValue
                value={trackedInfo.targetValue}
                className="text-slate-300"
              />
            </div>
          )}

          {/* Amount needed if not achieved */}
          {!milestone.isAchieved && trackedInfo?.amountNeeded && (
            <div className="bg-slate-800/20 rounded p-2">
              <span className="text-slate-500">Amount needed: </span>
              <TrackedValue
                value={trackedInfo.amountNeeded}
                className="text-amber-400"
              />
            </div>
          )}

          {/* Net worth at milestone */}
          {trackedInfo?.netWorthAtMilestone && (
            <div className="bg-slate-800/20 rounded p-2">
              <span className="text-slate-500">Net worth at milestone: </span>
              <TrackedValue
                value={trackedInfo.netWorthAtMilestone}
                className="text-slate-300"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
