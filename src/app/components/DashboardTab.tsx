'use client'

import React, { useState, useMemo } from 'react'
import {
  formatCurrency,
  getTimeSinceEntry,
  getEntryAllocation,
} from '../../lib/calculations'
import { TrackedValue } from './TrackedValue'
import { generateTrackedDashboardValues } from '../../lib/trackedScenarioValues'
import { useFinancialSelector } from '../../lib/hooks/useFinancialActor'
import { useRealtimeNetWorth } from '../../lib/hooks/useRealtimeNetWorth'
import type { ScenarioProjection, StableProjectionResult } from '../../lib/machines/types'
import { ThreeFuturesCard } from './ThreeFuturesCard'
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
  const [showGrowthRates, setShowGrowthRates] = useState(false);
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
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-2xl space-y-3 sm:space-y-4">
      {/* Hero Net Worth Card */}
      {latestEntry && primaryProjection && trackedValues ? (
        <div className="bg-[#0f1629] rounded-xl p-4 sm:p-6 border border-slate-800">
          {/* Card Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-2 sm:gap-3">
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
              decimals={0}
              className="text-3xl sm:text-4xl md:text-5xl font-bold font-mono text-white"
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

          {/* Collapsible Growth Rates */}
          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => setShowGrowthRates(prev => !prev)}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors w-full"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showGrowthRates ? 'rotate-90' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span>Growth rates</span>
              {!showGrowthRates && (
                <span className="text-emerald-400 font-mono ml-auto">
                  <TrackedValue
                    value={trackedValues.growthPerDay}
                    className="text-emerald-400 font-mono text-xs"
                  />/day
                </span>
              )}
            </button>

            {showGrowthRates && (
              <div className="mt-3 space-y-3">
                <div className="flex justify-end">
                  <div className="inline-flex rounded-lg bg-slate-800/80 p-0.5">
                    <button
                      onClick={() => setIncludeSavings(false)}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${
                        !includeSavings
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Interest
                    </button>
                    <button
                      onClick={() => setIncludeSavings(true)}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${
                        includeSavings
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      + Savings
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="bg-slate-800/30 rounded-lg p-2">
                    <p className="text-slate-500 text-[10px] mb-0.5">Per Second</p>
                    <TrackedValue
                      value={trackedValues.growthPerSecond}
                      decimals={6}
                      className="text-emerald-400 font-mono text-[11px] sm:text-xs"
                    />
                  </div>
                  <div className="bg-slate-800/30 rounded-lg p-2">
                    <p className="text-slate-500 text-[10px] mb-0.5">Per Minute</p>
                    <TrackedValue
                      value={trackedValues.growthPerMinute}
                      decimals={4}
                      className="text-emerald-400 font-mono text-[11px] sm:text-xs"
                    />
                  </div>
                  <div className="bg-slate-800/30 rounded-lg p-2">
                    <p className="text-slate-500 text-[10px] mb-0.5">Per Hour</p>
                    <TrackedValue
                      value={trackedValues.growthPerHour}
                      className="text-emerald-400 font-mono text-[11px] sm:text-xs"
                    />
                  </div>
                  <div className="bg-slate-800/30 rounded-lg p-2">
                    <p className="text-slate-500 text-[10px] mb-0.5">Per Day</p>
                    <TrackedValue
                      value={trackedValues.growthPerDay}
                      className="text-emerald-400 font-mono text-xs sm:text-sm"
                    />
                  </div>
                  <div className="bg-slate-800/30 rounded-lg p-2 col-span-2 sm:col-span-1">
                    <p className="text-slate-500 text-[10px] mb-0.5">Per Year</p>
                    <TrackedValue
                      value={trackedValues.growthPerYear}
                      className="text-emerald-400 font-mono text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800">
            <p className="text-slate-500 text-xs">
              Updated {getTimeSinceEntry(latestEntry.timestamp)}
            </p>
            <p className="text-xs text-slate-600">Click any value for details</p>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f1629] rounded-xl p-6 sm:p-8 border border-slate-800 text-center">
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

      {/* Three Futures — the eigensolution */}
      {latestEntry && primaryProjection && (
        <ThreeFuturesCard
          primaryProjection={primaryProjection}
          latestEntry={latestEntry}
        />
      )}
    </div>
  )
}
