'use client'

import React, { useState, useMemo } from 'react'
import {
  formatCurrency,
  calculateSwrAmounts,
  calculateFiTarget,
  NetWorthEntry,
} from '../../lib/calculations'
import { TrackedValue } from './TrackedValue'
import {
  createTrackedCoastInfo,
  createTrackedRetirementIncomeInfo,
} from '../../lib/trackedScenarioValues'
import { ScenarioProjection } from '../../lib/useScenarios'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

export function CoastFiSection({ primaryProjection, latestEntry }: { primaryProjection: ScenarioProjection; latestEntry: NetWorthEntry }) {
  const { currentNetWorth, projections, scenario } = primaryProjection;
  const currentYear = new Date().getFullYear();
  const currentMonthlySpend = projections[0]?.monthlySpend ?? 0;
  const firstRow = projections[0];
  const birthYear = firstRow?.age ? currentYear - firstRow.age : null;
  const currentAge = birthYear ? currentYear - birthYear : null;
  const retirementAge = 65;

  const [showComparison, setShowComparison] = useState(true);

  const effectiveRate = primaryProjection.effectiveRate;

  const trackedCoast = useMemo(() => {
    return createTrackedCoastInfo(
      currentNetWorth.total,
      currentMonthlySpend,
      currentAge,
      retirementAge,
      effectiveRate,
      scenario.inflationRate,
      scenario.swr
    );
  }, [currentNetWorth.total, currentMonthlySpend, currentAge, effectiveRate, scenario]);

  const trackedRetirementIncome = useMemo(() => {
    return createTrackedRetirementIncomeInfo(
      currentNetWorth.total,
      currentAge,
      retirementAge,
      effectiveRate,
      scenario.inflationRate,
      scenario.swr
    );
  }, [currentNetWorth.total, currentAge, retirementAge, effectiveRate, scenario.inflationRate, scenario.swr]);

  const yearsToRetirement = currentAge !== null ? Math.max(0, retirementAge - currentAge) : 30;
  const returnRate = effectiveRate / 100;
  const inflationRate = scenario.inflationRate / 100;
  const coastFiPercent = trackedCoast.coastFiPercent.value;
  const futureNW = trackedCoast.futureNetWorthIfCoast.value;
  const futureFiTarget = trackedCoast.futureFiTarget.value;
  const dollarMultiplier = trackedCoast.dollarMultiplier.value;
  const realAnnualIncome = trackedRetirementIncome.projectedRealAnnualIncome.value;
  const realMonthlyIncome = trackedRetirementIncome.projectedRealMonthlyIncome.value;

  // Build chart data
  const chartData = useMemo(() => {
    const data: { year: number; age: string; coast: number; keepSaving: number | null; fiTarget: number }[] = [];
    for (let i = 0; i <= yearsToRetirement; i++) {
      const coastNW = currentNetWorth.total * Math.pow(1 + returnRate, i);
      const projRow = projections[i];
      const keepSavingNW = projRow ? projRow.netWorth : null;
      // FI target at year i (inflation-adjusted spending / swr)
      const futureSpend = currentMonthlySpend * 12 * Math.pow(1 + inflationRate, i);
      const fiTargetAtYear = futureSpend / (scenario.swr / 100);
      const label = currentAge !== null ? `Age ${currentAge + i}` : `+${i}yr`;
      data.push({
        year: i,
        age: label,
        coast: Math.round(coastNW),
        keepSaving: keepSavingNW !== null ? Math.round(keepSavingNW) : null,
        fiTarget: Math.round(fiTargetAtYear),
      });
    }
    return data;
  }, [currentNetWorth.total, returnRate, inflationRate, yearsToRetirement, projections, currentAge, currentMonthlySpend, scenario.swr]);

  const formatAxisValue = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
    return `$${v}`;
  };

  // Contextual examples
  const monthlySaved100Value = 100 * dollarMultiplier;
  const lumpSum1000Value = 1000 * dollarMultiplier;

  // Spending coverage
  const spendingCoverage = currentMonthlySpend > 0 ? (realMonthlyIncome / currentMonthlySpend) * 100 : 0;

  const pastRetirement = yearsToRetirement <= 0;

  return (
    <div className="mt-8 bg-[#0f1629] rounded-xl p-6 border border-slate-800">
      {/* A. Header */}
      <h2 className="text-lg font-semibold text-slate-300 mb-1">
        What If You Stopped Saving?
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Your money's growth with $0 contributions
      </p>

      {/* B. Hero Stat */}
      <div className="mb-6 bg-slate-800/30 rounded-xl p-5">
        {pastRetirement ? (
          <div>
            <p className="text-slate-400 text-sm mb-2">You're at retirement age — your net worth generates</p>
            <TrackedValue
              value={trackedRetirementIncome.projectedRealAnnualIncome}
              formatter={(v) => `${formatCurrency(v, 0)}/yr`}
              className="text-3xl font-bold font-mono text-emerald-400"
            />
            <p className="text-slate-500 text-xs mt-1">in today's dollars</p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-1">
              <TrackedValue
                value={trackedCoast.futureNetWorthIfCoast}
                className="text-3xl font-bold font-mono text-violet-400"
              />
              <span className="text-slate-400 text-sm">
                {currentAge !== null ? `by age ${retirementAge}` : `in ${yearsToRetirement} years`}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${coastFiPercent >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                    style={{ width: `${Math.min(100, coastFiPercent)}%` }}
                  />
                </div>
              </div>
              <TrackedValue
                value={trackedCoast.coastFiPercent}
                showCurrency={false}
                formatter={(v) => `${v.toFixed(0)}%`}
                className={`text-sm font-mono font-semibold ${coastFiPercent >= 100 ? 'text-emerald-400' : 'text-violet-400'}`}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {coastFiPercent >= 100
                ? 'Coast FI achieved — compounding alone reaches your FI target'
                : `That's ${coastFiPercent.toFixed(0)}% of your FI target from compounding alone`}
            </p>
          </>
        )}
      </div>

      {/* C. Trajectory Chart */}
      {!pastRetirement && chartData.length > 1 && (
        <div className="mb-6">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="age"
                  stroke="#94a3b8"
                  fontSize={11}
                  interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={formatAxisValue}
                  width={60}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                        <p className="text-slate-300 text-xs font-medium mb-1">{label}</p>
                        {payload.map((entry: any) => (
                          <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
                            {entry.name}: {formatCurrency(entry.value, 0)}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="coast"
                  name="Stop Saving"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                {showComparison && (
                  <Area
                    type="monotone"
                    dataKey="keepSaving"
                    name="Keep Saving"
                    stroke="#10b981"
                    fill="transparent"
                    fillOpacity={0}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
                <ReferenceLine
                  y={futureFiTarget}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{ value: 'FI Target', position: 'right', fill: '#f59e0b', fontSize: 10 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center mt-3">
            <button
              onClick={() => setShowComparison(prev => !prev)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showComparison
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-slate-700/50 text-slate-400 hover:text-slate-300'
              }`}
            >
              <div className={`w-3 h-0.5 ${showComparison ? 'bg-emerald-400' : 'bg-slate-500'}`} style={{ borderTop: '2px dashed' }} />
              Compare with Keep Saving
            </button>
          </div>
        </div>
      )}

      {/* D. The Power of Compounding */}
      {!pastRetirement && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3">The Power of Compounding</h3>
          <div className="bg-slate-800/30 rounded-lg p-4 space-y-3">
            <p className="text-sm text-amber-400/90">
              Every $1 today becomes{' '}
              <TrackedValue
                value={trackedCoast.dollarMultiplier}
                showCurrency={false}
                formatter={(v) => `$${v.toFixed(2)}`}
                className="font-mono font-semibold text-amber-400"
              />{' '}
              at retirement
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/20 rounded-lg p-3">
                <p className="text-slate-500 mb-1">$100/mo saved now</p>
                <span className="text-amber-400 font-mono">{formatCurrency(monthlySaved100Value, 0)}/mo at {currentAge !== null ? retirementAge : `+${yearsToRetirement}yr`}</span>
              </div>
              <div className="bg-slate-800/20 rounded-lg p-3">
                <p className="text-slate-500 mb-1">$1,000 saved now</p>
                <span className="text-amber-400 font-mono">{formatCurrency(lumpSum1000Value, 0)} at {currentAge !== null ? retirementAge : `+${yearsToRetirement}yr`}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              <TrackedValue
                value={trackedCoast.yearsToRetirement}
                showCurrency={false}
                formatter={(v) => `${Math.round(v)} years`}
                className="text-slate-500"
              /> of compounding at {scenario.currentRate}% annual return
            </p>
          </div>
        </div>
      )}

      {/* E. Retirement Income (If You Coast) */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">
          {pastRetirement ? 'Current Withdrawal Capacity' : 'Retirement Income (If You Coast)'}
        </h3>
        <div className="bg-slate-800/30 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-slate-500 text-xs mb-1">Annual (today's $)</p>
              <TrackedValue
                value={trackedRetirementIncome.projectedRealAnnualIncome}
                formatter={(v) => formatCurrency(v, 0)}
                className="text-lg font-mono font-semibold text-amber-400"
              />
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">Monthly (today's $)</p>
              <TrackedValue
                value={trackedRetirementIncome.projectedRealMonthlyIncome}
                formatter={(v) => formatCurrency(v, 0)}
                className="text-lg font-mono font-semibold text-amber-400"
              />
            </div>
          </div>
          {currentMonthlySpend > 0 && (
            <div className="pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Spending Coverage</span>
                <span className={`text-xs font-mono font-semibold ${spendingCoverage >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {spendingCoverage.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${spendingCoverage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, spendingCoverage)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {spendingCoverage >= 100
                  ? `Surplus: ${formatCurrency(realMonthlyIncome - currentMonthlySpend, 0)}/mo above current spending`
                  : `Gap: ${formatCurrency(currentMonthlySpend - realMonthlyIncome, 0)}/mo short of current spending`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
