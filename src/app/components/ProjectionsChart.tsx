'use client'

import React, { useState, useMemo } from 'react'
import { formatCurrency } from '../../lib/calculations'
import { SimpleTrackedValue } from './TrackedValue'
import { ScenarioProjection } from '../../lib/useScenarios'
import { UnifiedChartTooltip } from './UnifiedChartTooltip'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

type MetricType = 'fiProgress' | 'netWorth' | 'spending' | 'savings';
type TimeUnit = 'annual' | 'monthly';

interface MetricConfig {
  key: MetricType;
  label: string;
  yAxisId: 'left' | 'right';
  color: string;
  formatter: (value: number) => string;
}

const getMetrics = (timeUnit: TimeUnit): MetricConfig[] => [
  {
    key: 'fiProgress',
    label: 'FI Progress',
    yAxisId: 'right',
    color: '#10b981',
    formatter: (v) => `${v.toFixed(0)}%`
  },
  {
    key: 'netWorth',
    label: 'Net Worth',
    yAxisId: 'left',
    color: '#0ea5e9',
    formatter: (v) => `$${(v/1000000).toFixed(1)}M`
  },
  {
    key: 'spending',
    label: timeUnit === 'annual' ? 'Annual Spending' : 'Monthly Spending',
    yAxisId: 'left',
    color: '#f59e0b',
    formatter: (v) => formatCurrency(v)
  },
  {
    key: 'savings',
    label: timeUnit === 'annual' ? 'Annual Savings' : 'Monthly Savings',
    yAxisId: 'left',
    color: '#8b5cf6',
    formatter: (v) => formatCurrency(v)
  },
];

export function ProjectionsChart({
  scenarioProjections,
  comparisonChartData,
  fiProgressChartData,
  currentYear,
}: {
  scenarioProjections: ScenarioProjection[];
  comparisonChartData: Record<string, number | string>[];
  fiProgressChartData: Record<string, number | string>[];
  currentYear: number;
}) {
  const [brushRange, setBrushRange] = React.useState<{ startIndex: number; endIndex: number } | null>(null);
  const [timeUnit, setTimeUnit] = React.useState<TimeUnit>('annual');

  // Get metrics config based on current time unit
  const metrics = React.useMemo(() => getMetrics(timeUnit), [timeUnit]);

  if (scenarioProjections.length === 0) {
    return <div className="text-slate-400">No projection data available</div>
  }

  // Prepare unified chart data with all metrics for all scenarios
  // Convert spending/savings values based on selected time unit
  const unifiedChartData = React.useMemo(() => {
    const yearMap = new Map<number, any>();

    scenarioProjections.forEach(sp => {
      sp.projections.forEach(proj => {
        if (!yearMap.has(proj.year)) {
          yearMap.set(proj.year, { year: proj.year });
        }
        const yearData = yearMap.get(proj.year);

        // Store all metrics for this scenario at this year
        yearData[`${sp.scenario.name}_fiProgress`] = proj.fiProgress;
        yearData[`${sp.scenario.name}_netWorth`] = proj.netWorth;
        // Convert spending/savings based on time unit
        if (timeUnit === 'annual') {
          yearData[`${sp.scenario.name}_spending`] = proj.monthlySpend * 12; // Monthly to annual
          yearData[`${sp.scenario.name}_savings`] = proj.annualSavings;
        } else {
          yearData[`${sp.scenario.name}_spending`] = proj.monthlySpend;
          yearData[`${sp.scenario.name}_savings`] = proj.annualSavings / 12; // Annual to monthly
        }
        // NW Change breakdown: growth vs contributions
        yearData[`${sp.scenario.name}_growth`] = proj.yearlyInterest;
        yearData[`${sp.scenario.name}_contributions`] = proj.yearlyContributions;
        yearData[`${sp.scenario.name}_nwChange`] = proj.yearlyInterest + proj.yearlyContributions;
        // Embed pre-built traces for chart tooltip drill-down
        if (proj.trackedFiProgress) yearData[`${sp.scenario.name}_trackedFiProgress`] = proj.trackedFiProgress;
        if (proj.trackedNetWorth) yearData[`${sp.scenario.name}_trackedNetWorth`] = proj.trackedNetWorth;
        if (proj.trackedSpending) yearData[`${sp.scenario.name}_trackedSpending`] = proj.trackedSpending;
        if (proj.trackedSavings) yearData[`${sp.scenario.name}_trackedSavings`] = proj.trackedSavings;
      });
    });

    return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
  }, [scenarioProjections, timeUnit]);

  // Filter data based on brush range for display
  const displayData = React.useMemo(() => {
    if (!brushRange) return unifiedChartData;
    return unifiedChartData.slice(brushRange.startIndex, brushRange.endIndex + 1);
  }, [unifiedChartData, brushRange]);

  return (
    <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700 p-6 overflow-auto">
      <div className="space-y-6">
        {/* Header with scenario indicators */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-slate-200">Scenario Projections</h3>
          <div className="flex gap-2">
            {scenarioProjections.map(sp => (
              sp.fiYear && (
                <span
                  key={sp.scenario._id}
                  className="text-sm px-3 py-1 rounded-full"
                  style={{ backgroundColor: `${sp.scenario.color}20`, color: sp.scenario.color }}
                >
                  {sp.scenario.name}: FI in {sp.fiYear - currentYear}y
                </span>
              )
            ))}
          </div>
        </div>

        {/* Time Unit Toggle */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">View:</span>
          <div className="flex rounded-lg overflow-hidden border border-slate-600">
            <button
              onClick={() => setTimeUnit('annual')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                timeUnit === 'annual'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Annual
            </button>
            <button
              onClick={() => setTimeUnit('monthly')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                timeUnit === 'monthly'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Small Multiples - One chart per metric */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {metrics.map(metric => {
            const isPercentage = metric.yAxisId === 'right';

            return (
              <div key={metric.key} className="bg-[#0f1629] rounded-xl p-4 border border-slate-800">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: metric.color }}
                  />
                  <span style={{ color: metric.color }}>{metric.label}</span>
                </h4>
                <div className="w-full h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={displayData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={12}
                        tickFormatter={isPercentage
                          ? (v) => `${v}%`
                          : (v) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}k`
                        }
                        domain={isPercentage ? [0, 'auto'] : ['auto', 'auto']}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          return (
                            <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 shadow-xl">
                              <p className="text-slate-400 text-sm font-medium mb-2">Year {label}</p>
                              <div className="space-y-1">
                                {payload.map((item: any) => (
                                  <div key={item.dataKey} className="flex justify-between gap-4 text-xs">
                                    <span style={{ color: item.stroke }}>{item.name}</span>
                                    <span className="font-mono" style={{ color: item.stroke }}>
                                      {isPercentage
                                        ? `${item.value?.toFixed(1)}%`
                                        : formatCurrency(item.value)
                                      }
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend />

                      {/* FI Progress milestones - horizontal reference lines */}
                      {metric.key === 'fiProgress' && (
                        <>
                          {/* Key percentage milestones */}
                          {[
                            { value: 25, label: '25%', color: '#60a5fa' },
                            { value: 50, label: '50%', color: '#a78bfa' },
                            { value: 75, label: '75%', color: '#f59e0b' },
                            { value: 100, label: 'FI', color: '#10b981' },
                          ].map(milestone => (
                            <ReferenceLine
                              key={milestone.value}
                              y={milestone.value}
                              stroke={milestone.color}
                              strokeDasharray="3 3"
                              strokeOpacity={0.6}
                              label={{
                                value: milestone.label,
                                position: 'right',
                                fill: milestone.color,
                                fontSize: 10,
                                opacity: 0.8
                              }}
                            />
                          ))}
                        </>
                      )}

                      {/* Net Worth milestones - vertical reference lines for primary scenario */}
                      {metric.key === 'netWorth' && scenarioProjections[0] && (
                        <>
                          {/* Show key milestone achievement years */}
                          {scenarioProjections[0].fiMilestones.milestones
                            .filter(m =>
                              m.year !== null &&
                              ['fi_50', 'fi_100', 'lean_fi', 'coast_fi'].includes(m.id)
                            )
                            .map(milestone => (
                              <ReferenceLine
                                key={milestone.id}
                                x={milestone.year!}
                                stroke={milestone.color}
                                strokeDasharray="5 5"
                                strokeOpacity={0.7}
                                label={{
                                  value: milestone.shortName,
                                  position: 'top',
                                  fill: milestone.color,
                                  fontSize: 10
                                }}
                              />
                            ))}
                        </>
                      )}

                      {/* FI Progress chart - vertical milestone year markers */}
                      {metric.key === 'fiProgress' && scenarioProjections[0] && (
                        <>
                          {scenarioProjections[0].fiMilestones.milestones
                            .filter(m =>
                              m.year !== null &&
                              m.type === 'percentage' &&
                              [25, 50, 75, 100].includes(m.targetValue)
                            )
                            .map(milestone => (
                              <ReferenceLine
                                key={`year-${milestone.id}`}
                                x={milestone.year!}
                                stroke={milestone.color}
                                strokeDasharray="2 4"
                                strokeOpacity={0.4}
                              />
                            ))}
                        </>
                      )}

                      {/* Spending & Savings charts - show FI year marker */}
                      {(metric.key === 'spending' || metric.key === 'savings') && scenarioProjections[0]?.fiYear && (
                        <ReferenceLine
                          x={scenarioProjections[0].fiYear}
                          stroke="#10b981"
                          strokeDasharray="5 5"
                          strokeOpacity={0.6}
                          label={{
                            value: 'FI',
                            position: 'top',
                            fill: '#10b981',
                            fontSize: 10
                          }}
                        />
                      )}

                      {/* Render lines for each scenario */}
                      {scenarioProjections.map((sp, scenarioIndex) => {
                        const dataKey = `${sp.scenario.name}_${metric.key}`;
                        return (
                          <Line
                            key={dataKey}
                            type="monotone"
                            dataKey={dataKey}
                            name={sp.scenario.name}
                            stroke={sp.scenario.color}
                            strokeWidth={scenarioIndex === 0 ? 3 : 2}
                            strokeDasharray={scenarioIndex === 0 ? undefined : "5 5"}
                            dot={false}
                            isAnimationActive={false}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contributions vs Growth Stacked Area Chart */}
        <div className="bg-[#0f1629] rounded-xl p-4 border border-slate-800">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-3">
            <span className="text-slate-200">Yearly Net Worth Change</span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-400/80 inline-block" />
              <span className="text-sky-400/80">Growth</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-sm bg-violet-400/80 inline-block" />
              <span className="text-violet-400/80">Contributions</span>
            </span>
          </h4>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(v) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    // Group by scenario
                    const scenarioData = new Map<string, { growth: number; contributions: number; color: string }>();
                    payload.forEach((item: any) => {
                      const match = item.dataKey?.match(/^(.+)_(growth|contributions)$/);
                      if (match) {
                        const [, scenarioName, type] = match;
                        if (!scenarioData.has(scenarioName)) {
                          scenarioData.set(scenarioName, { growth: 0, contributions: 0, color: '' });
                        }
                        const d = scenarioData.get(scenarioName)!;
                        if (type === 'growth') {
                          d.growth = item.value ?? 0;
                          d.color = item.stroke || item.fill || '#94a3b8';
                        } else {
                          d.contributions = item.value ?? 0;
                        }
                      }
                    });
                    return (
                      <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 shadow-xl">
                        <p className="text-slate-400 text-sm font-medium mb-2">Year {label}</p>
                        <div className="space-y-2">
                          {Array.from(scenarioData.entries()).map(([name, d]) => {
                            const total = d.growth + d.contributions;
                            const growthPct = total !== 0 ? ((d.growth / total) * 100).toFixed(0) : '0';
                            return (
                              <div key={name} className="space-y-1">
                                {scenarioData.size > 1 && (
                                  <p className="text-xs font-medium" style={{ color: d.color }}>{name}</p>
                                )}
                                <div className="flex justify-between gap-4 text-xs">
                                  <span className="text-slate-400">Total Change</span>
                                  <span className="font-mono text-slate-200">{formatCurrency(total)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-xs">
                                  <span className="text-sky-400">Growth ({growthPct}%)</span>
                                  <span className="font-mono text-sky-400">{formatCurrency(d.growth)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-xs">
                                  <span className="text-violet-400">Contributions ({100 - Number(growthPct)}%)</span>
                                  <span className="font-mono text-violet-400">{formatCurrency(d.contributions)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
                {/* FI year marker */}
                {scenarioProjections[0]?.fiYear && (
                  <ReferenceLine
                    x={scenarioProjections[0].fiYear}
                    stroke="#10b981"
                    strokeDasharray="5 5"
                    strokeOpacity={0.6}
                    label={{
                      value: 'FI',
                      position: 'top',
                      fill: '#10b981',
                      fontSize: 10
                    }}
                  />
                )}
                {/* Crossover year marker */}
                {scenarioProjections[0]?.crossoverYear && (
                  <ReferenceLine
                    x={scenarioProjections[0].crossoverYear}
                    stroke="#f59e0b"
                    strokeDasharray="5 5"
                    strokeOpacity={0.6}
                    label={{
                      value: 'Crossover',
                      position: 'top',
                      fill: '#f59e0b',
                      fontSize: 10
                    }}
                  />
                )}
                {/* Render stacked areas for each scenario */}
                {scenarioProjections.map((sp) => (
                  <React.Fragment key={sp.scenario._id}>
                    <Area
                      type="monotone"
                      dataKey={`${sp.scenario.name}_growth`}
                      name={`${sp.scenario.name} Growth`}
                      stackId={sp.scenario.name}
                      stroke="#0ea5e9"
                      fill="#0ea5e980"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey={`${sp.scenario.name}_contributions`}
                      name={`${sp.scenario.name} Contributions`}
                      stackId={sp.scenario.name}
                      stroke="#8b5cf6"
                      fill="#8b5cf680"
                      isAnimationActive={false}
                    />
                  </React.Fragment>
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

            {/* Year Range Slider Controls */}
            <div className="flex items-center gap-4 mt-4">
              <span className="text-sm text-slate-400 min-w-[80px]">
                From: {unifiedChartData[brushRange?.startIndex ?? 0]?.year}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(0, (brushRange?.endIndex ?? unifiedChartData.length - 1) - 1)}
                value={brushRange?.startIndex ?? 0}
                onChange={(e) => {
                  const newStart = parseInt(e.target.value);
                  setBrushRange(prev => ({
                    startIndex: newStart,
                    endIndex: prev?.endIndex ?? unifiedChartData.length - 1
                  }));
                }}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <input
                type="range"
                min={(brushRange?.startIndex ?? 0) + 1}
                max={unifiedChartData.length - 1}
                value={brushRange?.endIndex ?? unifiedChartData.length - 1}
                onChange={(e) => {
                  const newEnd = parseInt(e.target.value);
                  setBrushRange(prev => ({
                    startIndex: prev?.startIndex ?? 0,
                    endIndex: newEnd
                  }));
                }}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-sm text-slate-400 min-w-[80px] text-right">
                To: {unifiedChartData[brushRange?.endIndex ?? unifiedChartData.length - 1]?.year}
              </span>
              {brushRange && (brushRange.startIndex !== 0 || brushRange.endIndex !== unifiedChartData.length - 1) && (
                <button
                  onClick={() => setBrushRange(null)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

        {/* FI Timeline Comparison */}
        <div>
          <h3 className="text-lg font-medium text-slate-200 mb-4">Financial Independence Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarioProjections.map(sp => (
              <div
                key={sp.scenario._id}
                className="bg-[#0f1629] rounded-xl p-4 border-l-4"
                style={{ borderLeftColor: sp.scenario.color }}
              >
                <h4 className="font-medium text-slate-200 mb-2">{sp.scenario.name}</h4>
                {sp.fiYear ? (
                  <>
                    <p className="text-3xl font-mono" style={{ color: sp.scenario.color }}>
                      {sp.fiYear - currentYear} years
                    </p>
                    <p className="text-slate-500 text-sm">
                      FI in {sp.fiYear}{sp.fiAge ? ` (age ${sp.fiAge})` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500 text-sm">FI date not reached in projection period</p>
                )}
                <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Return:</span>
                    <span className="text-emerald-400">{sp.scenario.currentRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SWR:</span>
                    <span className="text-amber-400">{sp.scenario.swr}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contribution:</span>
                    <span className="text-sky-400"><SimpleTrackedValue value={sp.scenario.yearlyContribution} name="Yearly Contribution" description="Annual savings contribution" formula="User Input" className="text-sky-400" />/yr</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
