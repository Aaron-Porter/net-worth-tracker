'use client'

import React, { useMemo } from 'react'
import {
  formatCurrency,
  getEntryAllocation,
  getPerBucketRates,
  calculateTieredRunway,
  type NetWorthEntry,
  type AssetAllocation,
  type TieredRunwayResult,
} from '../../lib/calculations'
import {
  createTrackedCoastInfo,
  createTrackedRetirementIncomeInfo,
} from '../../lib/trackedScenarioValues'
import { TrackedValue } from './TrackedValue'
import type { ScenarioProjection } from '../../lib/machines/types'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ThreeFuturesCardProps {
  primaryProjection: ScenarioProjection;
  latestEntry: NetWorthEntry;
}

function formatMonths(months: number): string {
  if (months >= 1200) return '99+ yr'
  if (months >= 24) {
    const years = Math.floor(months / 12)
    const mo = Math.round(months % 12)
    return mo > 0 ? `${years}yr ${mo}mo` : `${years}yr`
  }
  return `${Math.round(months)}mo`
}

export function ThreeFuturesCard({ primaryProjection, latestEntry }: ThreeFuturesCardProps) {
  const { currentNetWorth, projections, scenario } = primaryProjection
  const currentYear = new Date().getFullYear()
  const currentMonthlySpend = projections[0]?.monthlySpend ?? 0

  const firstRow = projections[0]
  const birthYear = firstRow?.age ? currentYear - firstRow.age : null
  const currentAge = birthYear ? currentYear - birthYear : null
  const retirementAge = 65
  const effectiveRate = primaryProjection.effectiveRate

  // ── Drawdown (runway) ──────────────────────────────────────────
  const allocation = useMemo(() => getEntryAllocation(latestEntry), [latestEntry])
  const bucketRates = useMemo(() => {
    return getPerBucketRates({
      currentRate: effectiveRate,
      swr: scenario.swr,
      yearlyContribution: scenario.yearlyContribution,
      inflationRate: scenario.inflationRate,
      baseMonthlyBudget: scenario.baseMonthlyBudget,
      spendingGrowthRate: scenario.spendingGrowthRate,
      birthDate: '',
      monthlySpend: currentMonthlySpend,
      cashRate: scenario.cashRate,
      retirementRate: scenario.retirementRate,
      hsaRate: scenario.hsaRate,
      brokerageRate: scenario.brokerageRate,
      debtRate: scenario.debtRate,
    })
  }, [scenario, effectiveRate, currentMonthlySpend])

  const runway = useMemo(() => {
    // Derive marginal tax rate from scenario if income data exists
    let taxRate = 0.25 // safe default
    if (scenario.effectiveTaxRate) {
      taxRate = scenario.effectiveTaxRate / 100
    }
    return calculateTieredRunway(allocation, bucketRates, currentMonthlySpend, currentAge, taxRate)
  }, [allocation, bucketRates, currentMonthlySpend, currentAge, scenario.effectiveTaxRate])

  // ── Coast (stop saving) ────────────────────────────────────────
  const trackedCoast = useMemo(() => {
    return createTrackedCoastInfo(
      currentNetWorth.total, currentMonthlySpend, currentAge, retirementAge,
      effectiveRate, scenario.inflationRate, scenario.swr,
    )
  }, [currentNetWorth.total, currentMonthlySpend, currentAge, effectiveRate, scenario.inflationRate, scenario.swr])

  const trackedRetirementIncome = useMemo(() => {
    return createTrackedRetirementIncomeInfo(
      currentNetWorth.total, currentAge, retirementAge,
      effectiveRate, scenario.inflationRate, scenario.swr,
    )
  }, [currentNetWorth.total, currentAge, retirementAge, effectiveRate, scenario.inflationRate, scenario.swr])

  // ── Keep Saving (existing projections) ─────────────────────────
  const keepSaving = useMemo(() => {
    const retirementRow = projections.find(p => p.age === retirementAge)
    // Fallback: use the last projection row if no retirement age match
    const targetRow = retirementRow ?? projections[projections.length - 1]
    return {
      fiYear: primaryProjection.fiYear,
      fiAge: primaryProjection.fiAge,
      nwAtRetirement: retirementRow?.netWorth ?? null,
      swrMonthlyAtRetirement: retirementRow?.monthlySwr ?? null,
      targetRow,
    }
  }, [projections, primaryProjection.fiYear, primaryProjection.fiAge, retirementAge])

  // ── Chart data ─────────────────────────────────────────────────
  const yearsToRetirement = currentAge !== null ? Math.max(0, retirementAge - currentAge) : 30
  const chartYears = Math.min(yearsToRetirement, 40)
  const returnRate = effectiveRate / 100

  const chartData = useMemo(() => {
    // Build drawdown trajectory for chart
    const drawdownByYear: number[] = [currentNetWorth.total]
    {
      // Quick yearly approximation for chart (detailed sim is in calculateTieredRunway)
      const allAssets = allocation.cash + allocation.brokerage + allocation.retirement + allocation.hsa
      let remaining = allAssets
      const annualSpend = currentMonthlySpend * 12
      for (let y = 1; y <= chartYears; y++) {
        remaining = remaining * (1 + returnRate) - annualSpend
        drawdownByYear.push(Math.max(0, remaining))
        if (remaining <= 0) break
      }
    }

    const data: Array<{ year: number; label: string; drawdown: number | null; coast: number; saving: number }> = []
    for (let y = 0; y <= chartYears; y++) {
      const label = currentAge !== null ? `${currentAge + y}` : `+${y}`
      const coastNW = currentNetWorth.total * Math.pow(1 + returnRate, y)
      const savingNW = projections[y]?.netWorth ?? coastNW
      const drawdown = y < drawdownByYear.length ? drawdownByYear[y] : null

      data.push({
        year: y,
        label,
        drawdown: drawdown !== null && drawdown > 0 ? Math.round(drawdown) : (y === 0 ? Math.round(currentNetWorth.total) : null),
        coast: Math.round(coastNW),
        saving: Math.round(savingNW),
      })
    }
    return data
  }, [currentNetWorth.total, allocation, currentMonthlySpend, returnRate, chartYears, currentAge, projections])

  const formatAxisValue = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
    return `$${v}`
  }

  const pastRetirement = yearsToRetirement <= 0
  const primary = runway.scenarios[0] // 100% spending

  return (
    <div className="bg-[#0f1629] rounded-xl p-4 sm:p-6 border border-slate-800">
      <h2 className="text-base sm:text-lg font-semibold text-slate-300 mb-1">Three Futures</h2>
      <p className="text-slate-500 text-xs mb-4 sm:mb-6">Same portfolio, three paths forward</p>

      {/* ── Section 1: If You Stopped Earning ── */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
          <h3 className="text-sm font-medium text-slate-300">If you stopped earning</h3>
        </div>
        <div className="bg-slate-800/30 rounded-lg p-3 sm:p-4">
          {/* Primary runway */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3">
            <div>
              <p className="text-slate-500 text-[11px] sm:text-xs mb-1">Liquid runway</p>
              <p className="text-base sm:text-lg font-mono font-semibold text-red-400">
                {formatMonths(primary.tier1Months)}
              </p>
              <p className="text-[10px] text-slate-600">Cash + Brokerage</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] sm:text-xs mb-1">Total runway</p>
              <p className="text-base sm:text-lg font-mono font-semibold text-red-400">
                {formatMonths(primary.totalMonths)}
              </p>
              <p className="text-[10px] text-slate-600">
                {runway.assumptions.isPreRetirementAge
                  ? `Incl. retirement at ${Math.round((1 - runway.assumptions.earlyWithdrawalPenalty - runway.assumptions.estimatedIncomeTaxRate) * 100)}¢/$1`
                  : 'All assets, no penalty'}
              </p>
            </div>
          </div>

          {/* Reduced spending scenarios */}
          {runway.scenarios.length > 1 && (
            <div className="pt-3 border-t border-slate-700/50">
              <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">If you also cut spending</p>
              <div className="space-y-1.5 text-xs">
                {runway.scenarios.slice(1).map((s) => (
                  <div key={s.spendingPct} className="flex items-baseline justify-between gap-2 text-slate-400">
                    <span className="shrink-0">{Math.round(s.spendingPct * 100)}% <span className="hidden sm:inline">({formatCurrency(s.monthlySpend, 0)}/mo)</span></span>
                    <span className="font-mono text-slate-300 text-right">
                      {formatMonths(s.tier1Months)} / {formatMonths(s.totalMonths)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: If You Stopped Saving ── */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
          <h3 className="text-sm font-medium text-slate-300">If you stopped saving</h3>
        </div>
        <div className="bg-slate-800/30 rounded-lg p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-slate-500 text-[11px] sm:text-xs mb-1">
                Portfolio {pastRetirement ? 'now' : `at ${currentAge !== null ? retirementAge : `+${yearsToRetirement}yr`}`}
              </p>
              <TrackedValue
                value={trackedCoast.futureNetWorthIfCoast}
                className="text-base sm:text-lg font-mono font-semibold text-violet-400"
              />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 text-[11px] sm:text-xs mb-1">SWR income (today's $)</p>
              <TrackedValue
                value={trackedRetirementIncome.projectedRealMonthlyIncome}
                formatter={(v) => `${formatCurrency(v, 0)}/mo`}
                className="text-base sm:text-lg font-mono font-semibold text-violet-400"
              />
            </div>
          </div>
          {!pastRetirement && (
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1">
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${trackedCoast.coastFiPercent.value >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                    style={{ width: `${Math.min(100, trackedCoast.coastFiPercent.value)}%` }}
                  />
                </div>
              </div>
              <TrackedValue
                value={trackedCoast.coastFiPercent}
                showCurrency={false}
                formatter={(v) => `${v.toFixed(0)}% FI`}
                className={`text-xs font-mono font-semibold ${trackedCoast.coastFiPercent.value >= 100 ? 'text-emerald-400' : 'text-violet-400'}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: If You Keep Saving ── */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <h3 className="text-sm font-medium text-slate-300">If you keep saving</h3>
        </div>
        <div className="bg-slate-800/30 rounded-lg p-3 sm:p-4">
          {keepSaving.fiYear && (
            <div className="mb-3">
              <p className="text-slate-500 text-[11px] sm:text-xs mb-1">Financial Independence</p>
              <p className="text-base sm:text-lg font-mono font-semibold text-emerald-400">
                {keepSaving.fiAge ? `Age ${keepSaving.fiAge}` : `Year ${keepSaving.fiYear}`}
                <span className="text-xs sm:text-sm text-slate-500 font-normal ml-1.5 sm:ml-2">
                  ({keepSaving.fiYear - currentYear}yr)
                </span>
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {keepSaving.nwAtRetirement !== null && (
              <div className="min-w-0">
                <p className="text-slate-500 text-[11px] sm:text-xs mb-1">NW at {currentAge !== null ? retirementAge : `+${yearsToRetirement}yr`}</p>
                <p className="text-base sm:text-lg font-mono font-semibold text-emerald-400 truncate">
                  {formatCurrency(keepSaving.nwAtRetirement, 0)}
                </p>
              </div>
            )}
            {keepSaving.swrMonthlyAtRetirement !== null && (
              <div className="min-w-0">
                <p className="text-slate-500 text-[11px] sm:text-xs mb-1">SWR income</p>
                <p className="text-base sm:text-lg font-mono font-semibold text-emerald-400 truncate">
                  {formatCurrency(keepSaving.swrMonthlyAtRetirement, 0)}/mo
                </p>
              </div>
            )}
          </div>
          {scenario.yearlyContribution > 0 && (
            <p className="text-[10px] text-slate-500 mt-2">
              At {formatCurrency(scenario.yearlyContribution, 0)}/yr savings &middot; {effectiveRate.toFixed(1)}% return
            </p>
          )}
        </div>
      </div>

      {/* ── Trajectory Chart ── */}
      {!pastRetirement && chartData.length > 1 && (
        <div>
          <div className="h-[140px] sm:h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={10}
                  interval={Math.max(0, Math.floor(chartData.length / 4) - 1)}
                  tick={{ fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={9}
                  tickFormatter={formatAxisValue}
                  width={42}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
                        <p className="text-slate-300 text-xs font-medium mb-1">
                          {currentAge !== null ? `Age ${label}` : `Year +${label}`}
                        </p>
                        {payload.filter((e: any) => e.value != null).map((entry: any) => (
                          <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
                            {entry.name}: {formatCurrency(entry.value, 0)}
                          </p>
                        ))}
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="saving"
                  name="Keep Saving"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.08}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="coast"
                  name="Stop Saving"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.06}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  name="Stop Earning"
                  stroke="#f87171"
                  fill="#f87171"
                  fillOpacity={0.06}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-3 sm:gap-4 mt-2">
            {[
              { color: '#f87171', label: 'Stop Earning' },
              { color: '#8b5cf6', label: 'Stop Saving' },
              { color: '#10b981', label: 'Keep Saving' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1 sm:gap-1.5 text-[10px] text-slate-500">
                <div className="w-2.5 sm:w-3 h-0.5 rounded shrink-0" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
