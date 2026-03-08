'use client'

import React, { useState, useMemo } from 'react'
import {
  formatCurrency,
  getTimeSinceEntry,
  getEntryAllocation,
} from '../../lib/calculations'
import { TrackedValue, SimpleTrackedValue } from './TrackedValue'
import { generateTrackedDashboardValues } from '../../lib/trackedScenarioValues'
import { useFinancialSelector } from '../../lib/hooks/useFinancialActor'
import { useRealtimeNetWorth } from '../../lib/hooks/useRealtimeNetWorth'
import type { ScenarioProjection, StableProjectionResult } from '../../lib/machines/types'
import { CoastFiSection } from './CoastFiSection'
import { FiMilestonesCard } from './FiMilestonesCard'
import { Tab } from '../lib/helpers'

interface DashboardTabProps {
  setActiveTab: (tab: Tab) => void;
}

// Small icon badge for card headers
function IconBadge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: `${color}18` }}
    >
      {children}
    </div>
  );
}

/** Assemble a full ScenarioProjection from stable data + real-time data */
function assembleProjection(
  stable: StableProjectionResult,
  realtimeData: ReturnType<typeof useRealtimeNetWorth>,
): ScenarioProjection {
  return {
    scenario: stable.scenario,
    projections: stable.projections,
    levelInfo: stable.levelInfo,
    growthRates: realtimeData.growthRates,
    currentNetWorth: realtimeData.currentNetWorth,
    fiYear: stable.fiYear,
    fiAge: stable.fiAge,
    crossoverYear: stable.crossoverYear,
    currentFiProgress: realtimeData.currentFiProgress,
    currentMonthlySwr: stable.currentMonthlySwr,
    dynamicProjections: stable.dynamicProjections,
    hasDynamicIncome: stable.hasDynamicIncome,
    fiMilestones: stable.fiMilestones,
    monthlyProjections: stable.monthlyProjections,
    effectiveRate: stable.effectiveRate,
  };
}

export function DashboardTab({ setActiveTab }: DashboardTabProps) {
  const [includeSavings, setIncludeSavings] = useState(false);

  // Granular selectors — only re-render when these change
  const latestEntry = useFinancialSelector(s => s.context.entries[0] ?? null);
  const entries = useFinancialSelector(s => s.context.entries);
  const primaryStable = useFinancialSelector(s => s.context.stableProjections[0] ?? null);

  // Local real-time ticker — ONLY this component ticks at 50ms
  const realtimeData = useRealtimeNetWorth(
    latestEntry,
    primaryStable?.scenarioSettings ?? null,
    includeSavings,
    true, // always active when dashboard is mounted
  );

  // Assemble full projection for sub-components that need the combined type
  const primaryProjection = useMemo(() => {
    if (!primaryStable) return null;
    return assembleProjection(primaryStable, realtimeData);
  }, [primaryStable, realtimeData]);

  // Generate tracked values for calculation transparency
  const trackedValues = useMemo(() => {
    if (!latestEntry || !primaryProjection) return null;
    return generateTrackedDashboardValues(primaryProjection, latestEntry.timestamp, includeSavings);
  }, [latestEntry, primaryProjection, includeSavings]);

  // Compute % change since previous entry
  const changeInfo = useMemo(() => {
    if (!latestEntry || entries.length < 2) return null;
    const previousEntry = entries[1];
    const change = latestEntry.amount - previousEntry.amount;
    const changePct = previousEntry.amount > 0 ? (change / previousEntry.amount) * 100 : 0;
    return { change, changePct };
  }, [latestEntry, entries]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
      {/* Hero Net Worth Card */}
      {latestEntry && primaryProjection && trackedValues ? (
        <div className="bg-[#0f1629] rounded-xl p-6 border border-slate-800">
          {/* Card Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <IconBadge color="#10b981">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </IconBadge>
              <div>
                <h2 className="text-sm font-medium text-slate-300">Net Worth</h2>
                <p className="text-xs text-slate-500">Real-time estimate</p>
              </div>
            </div>
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
              style={{ backgroundColor: `${primaryProjection.scenario.color}15`, color: primaryProjection.scenario.color }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryProjection.scenario.color }} />
              {primaryProjection.scenario.name}
            </div>
          </div>

          {/* Hero Amount */}
          <div className="mb-1">
            <TrackedValue
              value={trackedValues.currentNetWorth}
              decimals={6}
              className="text-4xl md:text-5xl font-bold font-mono text-white"
            />
          </div>

          {/* Change indicator */}
          {changeInfo && (
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center gap-1 text-sm font-medium ${changeInfo.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  {changeInfo.change >= 0 ? (
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                  )}
                </svg>
                {changeInfo.change >= 0 ? '+' : ''}{changeInfo.changePct.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500">vs last entry</span>
            </div>
          )}

          {/* Breakdown row */}
          <div className="flex gap-6 text-sm mb-4">
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Base</p>
              <TrackedValue
                value={trackedValues.baseAmount}
                className="text-slate-300 font-mono"
              />
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Appreciation</p>
              <span className="text-emerald-400 font-mono">+<TrackedValue
                value={trackedValues.appreciation}
                decimals={4}
                className="text-emerald-400 font-mono"
              /></span>
            </div>
            {includeSavings && (
              <div>
                <p className="text-slate-500 text-xs mb-0.5">Savings</p>
                <span className="text-violet-400 font-mono">+<TrackedValue
                  value={trackedValues.contributions}
                  decimals={2}
                  className="text-violet-400 font-mono"
                /></span>
              </div>
            )}
          </div>

          {/* Portfolio Composition Bar */}
          {latestEntry && (latestEntry.cash !== undefined || latestEntry.retirement !== undefined ||
            latestEntry.hsa !== undefined || latestEntry.brokerage !== undefined || latestEntry.debts !== undefined) && (() => {
            const alloc = getEntryAllocation(latestEntry);
            const totalAssets = alloc.cash + alloc.retirement + alloc.hsa + alloc.brokerage;
            if (totalAssets <= 0) return null;
            const segments = [
              { label: 'Cash', value: alloc.cash, color: '#60a5fa' },
              { label: 'Ret', value: alloc.retirement, color: '#34d399' },
              { label: 'HSA', value: alloc.hsa, color: '#a78bfa' },
              { label: 'Brok', value: alloc.brokerage, color: '#fbbf24' },
            ].filter(s => s.value > 0);
            const debtPct = totalAssets > 0 ? (alloc.debts / totalAssets) * 100 : 0;
            return (
              <div className="mt-1 mb-4">
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                  {segments.map(s => (
                    <div
                      key={s.label}
                      style={{ width: `${(s.value / totalAssets) * 100}%`, backgroundColor: s.color }}
                      className="transition-all"
                      title={`${s.label}: ${formatCurrency(s.value, 0)} (${((s.value / totalAssets) * 100).toFixed(0)}%)`}
                    />
                  ))}
                </div>
                <div className="flex gap-3 mt-2 flex-wrap">
                  {segments.map(s => (
                    <div key={s.label} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label} {((s.value / totalAssets) * 100).toFixed(0)}%
                    </div>
                  ))}
                </div>
                {alloc.debts > 0 && (
                  <p className="text-xs text-red-400 mt-1.5">
                    Debt: {formatCurrency(alloc.debts, 0)} ({debtPct.toFixed(0)}% of assets)
                  </p>
                )}
              </div>
            );
          })()}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <p className="text-slate-500 text-xs">
              Updated {getTimeSinceEntry(latestEntry.timestamp)} &middot; {primaryProjection.scenario.currentRate}% return
              {includeSavings && ` + ${formatCurrency(primaryProjection.scenario.yearlyContribution, 0)}/yr`}
            </p>
            <p className="text-xs text-slate-600">Click any value for details</p>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f1629] rounded-xl p-8 border border-slate-800 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-slate-300 font-medium mb-1">No net worth data yet</p>
          <p className="text-slate-500 text-sm mb-4">Add your first entry to start tracking</p>
          <button
            onClick={() => setActiveTab('entries')}
            className="px-4 py-2 bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors text-sm font-medium"
          >
            Add Entry
          </button>
        </div>
      )}

      {/* Growth Rate Card */}
      {latestEntry && primaryProjection && trackedValues && (
        <div className="bg-[#0f1629] rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <IconBadge color="#10b981">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </IconBadge>
              <h2 className="text-sm font-medium text-slate-300">
                {includeSavings ? 'Growth Rate' : 'Appreciation Rate'}
              </h2>
            </div>
            <div className="inline-flex rounded-lg bg-slate-800/80 p-0.5">
              <button
                onClick={() => setIncludeSavings(false)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  !includeSavings
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Interest
              </button>
              <button
                onClick={() => setIncludeSavings(true)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  includeSavings
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                + Savings
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Per Second</p>
              <TrackedValue
                value={trackedValues.growthPerSecond}
                decimals={6}
                className="text-emerald-400 font-mono text-sm"
              />
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Per Minute</p>
              <TrackedValue
                value={trackedValues.growthPerMinute}
                decimals={4}
                className="text-emerald-400 font-mono text-sm"
              />
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Per Hour</p>
              <TrackedValue
                value={trackedValues.growthPerHour}
                className="text-emerald-400 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Per Day</p>
              <TrackedValue
                value={trackedValues.growthPerDay}
                className="text-emerald-400 font-mono"
              />
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Per Year</p>
              <TrackedValue
                value={trackedValues.growthPerYear}
                className="text-emerald-400 font-mono text-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Spending Card */}
      {latestEntry && primaryProjection && trackedValues && (
        <div className="bg-[#0f1629] rounded-xl p-6 border border-slate-800">
          <div className="flex items-center gap-3 mb-5">
            <IconBadge color="#f59e0b">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </IconBadge>
            <h2 className="text-sm font-medium text-slate-300">Spending</h2>
          </div>

          {/* SWR Row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">SWR Annual ({primaryProjection.scenario.swr}%)</p>
              <TrackedValue
                value={trackedValues.annualSwr}
                className="text-amber-400 font-mono text-lg"
              />
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">SWR Monthly</p>
              <TrackedValue
                value={trackedValues.monthlySwr}
                className="text-amber-400 font-mono text-lg"
              />
            </div>
          </div>

          {/* Monthly Budget */}
          <div className="bg-slate-800/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-400 text-sm">Monthly Budget</p>
              <TrackedValue
                value={trackedValues.currentSpending}
                className="text-white font-mono text-xl font-semibold"
              />
            </div>
            <div className="text-xs space-y-1.5 pt-3 border-t border-slate-700/50">
              <div className="flex justify-between text-slate-500">
                <span>Base (inflation-adjusted)</span>
                <span className="font-mono text-amber-400">{formatCurrency(primaryProjection.levelInfo.baseBudgetInflationAdjusted, 0)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>+ {primaryProjection.scenario.spendingGrowthRate}% NW / 12</span>
                <span className="font-mono text-emerald-400">+{formatCurrency(primaryProjection.levelInfo.netWorthPortion, 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coast FI Section */}
      {latestEntry && primaryProjection && (
        <CoastFiSection primaryProjection={primaryProjection} latestEntry={latestEntry} />
      )}

      {/* FI Milestones Section */}
      {latestEntry && primaryProjection && (
        <FiMilestonesCard primaryProjection={primaryProjection} latestEntry={latestEntry} />
      )}
    </div>
  )
}
