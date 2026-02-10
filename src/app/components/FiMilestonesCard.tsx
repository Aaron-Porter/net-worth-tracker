'use client'

import React, { useMemo } from 'react'
import {
  formatCurrency,
  calculateRunwayAndCoastInfo,
  NetWorthEntry,
} from '../../lib/calculations'
import { TrackedValue, SimpleTrackedValue } from './TrackedValue'
import { TrackedMilestoneRow } from './TrackedMilestoneRow'
import {
  createTrackedRunwayInfo,
} from '../../lib/trackedScenarioValues'
import { ScenarioProjection } from '../../lib/useScenarios'

interface FiMilestonesCardProps {
  primaryProjection: ScenarioProjection;
  latestEntry: NetWorthEntry;
}

export function FiMilestonesCard({ primaryProjection, latestEntry }: FiMilestonesCardProps) {
  const { fiMilestones, currentFiProgress, currentNetWorth, projections, scenario } = primaryProjection;
  const currentYear = new Date().getFullYear();
  const currentFiTarget = projections[0]?.fiTarget ?? 0;
  const currentMonthlySpend = projections[0]?.monthlySpend ?? 0;
  const currentDailySwr = projections[0]?.dailySwr ?? 0;
  const currentMonthlySwr = projections[0]?.monthlySwr ?? 0;
  const totalContributions = projections[0]?.contributed ?? 0;

  // Get birth year from projections if available
  const firstRow = projections[0];
  const birthYear = firstRow?.age ? currentYear - firstRow.age : null;
  const currentAge = birthYear ? currentYear - birthYear : null;
  const retirementAge = 65;

  const effectiveRate = primaryProjection.effectiveRate;

  // Calculate runway and coast info for context display
  const runwayAndCoastInfo = useMemo(() => {
    return calculateRunwayAndCoastInfo(
      currentNetWorth.total,
      currentMonthlySpend,
      birthYear,
      effectiveRate,
      scenario.inflationRate,
      scenario.swr
    );
  }, [currentNetWorth.total, currentMonthlySpend, birthYear, effectiveRate, scenario]);

  // Create tracked runway values
  const trackedRunway = useMemo(() => {
    return createTrackedRunwayInfo(currentNetWorth.total, currentMonthlySpend);
  }, [currentNetWorth.total, currentMonthlySpend]);

  // Expense coverage percentage
  const expenseCoverage = currentMonthlySpend > 0
    ? (currentMonthlySwr / currentMonthlySpend) * 100
    : 0;

  // Wealth multiplier
  const wealthMultiplier = totalContributions > 0
    ? currentNetWorth.total / totalContributions
    : 0;

  // Filter milestones by type for display
  const runwayMilestones = fiMilestones.milestones.filter(m => m.type === 'runway');
  const percentageMilestones = fiMilestones.milestones.filter(m => m.type === 'percentage');
  const lifestyleMilestones = fiMilestones.milestones.filter(m => m.type === 'lifestyle');
  const specialMilestones = fiMilestones.milestones.filter(m => m.type === 'special');
  const passiveIncomeMilestones = fiMilestones.milestones.filter(m => m.type === 'passive_income');
  const expenseCoverageMilestones = fiMilestones.milestones.filter(m => m.type === 'expense_coverage');
  const wealthMultiplierMilestones = fiMilestones.milestones.filter(m => m.type === 'wealth_multiplier');

  // Common extra props for the new milestone types
  const extraProps = {
    currentDailySwr,
    currentMonthlySwr,
    totalContributions,
  };

  return (
    <div className="mt-8 bg-[#0f1629] rounded-xl p-6 border border-slate-800">
      <h2 className="text-lg font-semibold text-slate-300 mb-2">
        FI Milestones
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Your journey to financial independence
      </p>

      {/* Current Progress Overview */}
      <div className="mb-6 bg-slate-800/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-400 text-sm">Current FI Progress</span>
          <SimpleTrackedValue
            value={currentFiProgress}
            name="Current FI Progress"
            description="Percentage of FI target achieved"
            formula="(Current Net Worth ÷ FI Target) × 100"
            inputs={[{ name: 'Net Worth', value: currentNetWorth.total, unit: '$' }, { name: 'FI Target', value: currentFiTarget, unit: '$' }]}
            formatAs="percent"
            decimals={1}
            className="text-emerald-400 font-mono text-lg font-semibold"
          />
        </div>

        {/* Progress bar with milestone markers */}
        <div className="relative">
          <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, currentFiProgress)}%` }}
            />
          </div>

          {/* Milestone markers */}
          <div className="absolute top-0 left-0 right-0 h-4 flex items-center">
            {[10, 25, 50, 75, 100].map(percent => (
              <div
                key={percent}
                className="absolute h-4 w-0.5 bg-slate-600"
                style={{ left: `${percent}%` }}
                title={`${percent}% FI`}
              />
            ))}
          </div>
        </div>

        {/* Milestone labels */}
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>

        {/* Next milestone info */}
        {fiMilestones.nextMilestone && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm font-medium">
                  Next: {fiMilestones.nextMilestone.shortName}
                </p>
                <p className="text-slate-500 text-xs">
                  {(() => {
                    const m = fiMilestones.nextMilestone!;
                    const monthAbbrev = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const monthStr = m.month ? `${monthAbbrev[m.month - 1]} ` : '';
                    if (m.yearsFromNow === 0) return `${monthStr}${m.year}`;
                    if (m.yearsFromNow === 1) return m.month ? `${monthStr}${m.year}` : 'Next year';
                    return m.month ? `${monthStr}${m.year}` : `In ${m.yearsFromNow} years`;
                  })()}
                  {fiMilestones.nextMilestone.age && ` (age ${fiMilestones.nextMilestone.age})`}
                </p>
              </div>
              <div className="text-right">
                <SimpleTrackedValue
                  value={fiMilestones.amountToNext}
                  name="Amount to Next Milestone"
                  description={`Amount needed to reach ${fiMilestones.nextMilestone.shortName}`}
                  formula={`${fiMilestones.nextMilestone.shortName} Target - Current Net Worth`}
                  inputs={[
                    { name: 'Target Progress', value: fiMilestones.nextMilestone.targetValue, unit: '%' },
                    { name: 'Current Progress', value: Math.round(currentFiProgress * 10) / 10, unit: '%' },
                  ]}
                  className="text-slate-300 font-mono text-sm"
                />
                <p className="text-slate-500 text-xs">to go</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Passive Income Milestones */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400">
            Passive Income
          </h3>
          <div className="text-right">
            <span className="text-xs text-slate-500">Earning: </span>
            <span className="text-sm font-mono text-emerald-400">
              {formatCurrency(currentDailySwr, 2)}/day
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">What your investments earn you every day, no work required</p>
        <div className="space-y-2">
          {passiveIncomeMilestones.map(milestone => (
            <TrackedMilestoneRow
              key={milestone.id}
              milestone={milestone}
              currentYear={currentYear}
              currentNetWorth={currentNetWorth.total}
              currentMonthlySpend={currentMonthlySpend}
              currentFiTarget={currentFiTarget}
              currentFiProgress={currentFiProgress}
              currentAge={currentAge}
              retirementAge={retirementAge}
              effectiveRate={effectiveRate}
              scenario={scenario}
              {...extraProps}
            />
          ))}
        </div>
      </div>

      {/* Expense Coverage Milestones */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400">
            Bills Covered
          </h3>
          <div className="text-right">
            <span className="text-xs text-slate-500">Coverage: </span>
            <span className="text-sm font-mono text-violet-400">
              {expenseCoverage.toFixed(1)}%
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">How much of your lifestyle is paid for by your portfolio</p>
        <div className="space-y-2">
          {expenseCoverageMilestones.map(milestone => (
            <TrackedMilestoneRow
              key={milestone.id}
              milestone={milestone}
              currentYear={currentYear}
              currentNetWorth={currentNetWorth.total}
              currentMonthlySpend={currentMonthlySpend}
              currentFiTarget={currentFiTarget}
              currentFiProgress={currentFiProgress}
              currentAge={currentAge}
              retirementAge={retirementAge}
              effectiveRate={effectiveRate}
              scenario={scenario}
              {...extraProps}
            />
          ))}
        </div>
      </div>

      {/* Wealth Multiplier Milestones */}
      {totalContributions > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-400">
              Compounding Power
            </h3>
            <div className="text-right">
              <span className="text-xs text-slate-500">Multiplier: </span>
              <span className="text-sm font-mono text-amber-400">
                {wealthMultiplier.toFixed(2)}x
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-3">How much your investments have amplified every dollar you saved</p>
          <div className="space-y-2">
            {wealthMultiplierMilestones.map(milestone => (
              <TrackedMilestoneRow
                key={milestone.id}
                milestone={milestone}
                currentYear={currentYear}
                currentNetWorth={currentNetWorth.total}
                currentMonthlySpend={currentMonthlySpend}
                currentFiTarget={currentFiTarget}
                currentFiProgress={currentFiProgress}
                currentAge={currentAge}
                retirementAge={retirementAge}
                effectiveRate={effectiveRate}
                scenario={scenario}
                {...extraProps}
              />
            ))}
          </div>
        </div>
      )}

      {/* Runway Milestones - Security */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400">
            Runway Milestones
          </h3>
          <div className="text-right">
            <span className="text-xs text-slate-500">Current: </span>
            {runwayAndCoastInfo.currentRunwayYears >= 100 ? (
              <span className="text-sm font-mono text-emerald-400">&infin;</span>
            ) : runwayAndCoastInfo.currentRunwayYears >= 1 ? (
              <TrackedValue
                value={trackedRunway.runwayYears}
                showCurrency={false}
                formatter={(v) => `${v.toFixed(1)} years`}
                className="text-sm font-mono text-emerald-400"
              />
            ) : (
              <TrackedValue
                value={trackedRunway.runwayMonths}
                showCurrency={false}
                formatter={(v) => `${Math.round(v)} months`}
                className="text-sm font-mono text-emerald-400"
              />
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">How long you could survive without income</p>
        <div className="space-y-2">
          {runwayMilestones.map(milestone => (
            <TrackedMilestoneRow
              key={milestone.id}
              milestone={milestone}
              currentYear={currentYear}
              currentNetWorth={currentNetWorth.total}
              currentMonthlySpend={currentMonthlySpend}
              currentFiTarget={currentFiTarget}
              currentFiProgress={currentFiProgress}
              currentAge={currentAge}
              retirementAge={retirementAge}
              effectiveRate={effectiveRate}
              scenario={scenario}
              {...extraProps}
            />
          ))}
        </div>
      </div>

      {/* Percentage Milestones */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-400 mb-3">
          Progress Milestones
        </h3>
        <div className="space-y-2">
          {percentageMilestones.map(milestone => (
            <TrackedMilestoneRow
              key={milestone.id}
              milestone={milestone}
              currentYear={currentYear}
              currentNetWorth={currentNetWorth.total}
              currentMonthlySpend={currentMonthlySpend}
              currentFiTarget={currentFiTarget}
              currentFiProgress={currentFiProgress}
              currentAge={currentAge}
              retirementAge={retirementAge}
              effectiveRate={effectiveRate}
              scenario={scenario}
              {...extraProps}
            />
          ))}
        </div>
      </div>

      {/* Lifestyle Milestones */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-400 mb-3">
          Lifestyle Milestones
        </h3>
        <div className="space-y-2">
          {lifestyleMilestones.map(milestone => (
            <TrackedMilestoneRow
              key={milestone.id}
              milestone={milestone}
              currentYear={currentYear}
              currentNetWorth={currentNetWorth.total}
              currentMonthlySpend={currentMonthlySpend}
              currentFiTarget={currentFiTarget}
              currentFiProgress={currentFiProgress}
              currentAge={currentAge}
              retirementAge={retirementAge}
              effectiveRate={effectiveRate}
              scenario={scenario}
              {...extraProps}
            />
          ))}
        </div>
      </div>

      {/* Special Milestones */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">
          Special Milestones
        </h3>
        <div className="space-y-2">
          {specialMilestones.map(milestone => (
            <TrackedMilestoneRow
              key={milestone.id}
              milestone={milestone}
              currentYear={currentYear}
              currentNetWorth={currentNetWorth.total}
              currentMonthlySpend={currentMonthlySpend}
              currentFiTarget={currentFiTarget}
              currentFiProgress={currentFiProgress}
              currentAge={currentAge}
              retirementAge={retirementAge}
              effectiveRate={effectiveRate}
              scenario={scenario}
              {...extraProps}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
