'use client'

import React from 'react'
import { formatCurrency } from '../../lib/calculations'
import { TrackedValue, SimpleTrackedValue } from '../../components/TrackedValue'

export function UnifiedChartTooltip({ active, payload, label, timeUnit }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const spendingLabel = timeUnit === 'annual' ? 'Annual Spending' : 'Monthly Spending';
  const savingsLabel = timeUnit === 'annual' ? 'Annual Savings' : 'Monthly Savings';

  const dataPoint = payload[0]?.payload || {};

  const scenarioData: Record<string, any> = {};
  payload.forEach((item: any) => {
    const [scenarioName, metricType] = item.dataKey.split('_');
    if (!scenarioData[scenarioName]) {
      scenarioData[scenarioName] = { color: item.stroke, data: {} };
    }
    scenarioData[scenarioName].data[metricType] = item.value;
  });

  Object.keys(scenarioData).forEach(scenarioName => {
    scenarioData[scenarioName].data.trackedFiProgress = dataPoint[`${scenarioName}_trackedFiProgress`];
    scenarioData[scenarioName].data.trackedNetWorth = dataPoint[`${scenarioName}_trackedNetWorth`];
    scenarioData[scenarioName].data.trackedSpending = dataPoint[`${scenarioName}_trackedSpending`];
    scenarioData[scenarioName].data.trackedSavings = dataPoint[`${scenarioName}_trackedSavings`];
  });

  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 shadow-xl">
      <p className="text-slate-400 text-sm font-medium mb-2">Year {label}</p>
      {Object.entries(scenarioData).map(([scenarioName, data]: [string, any]) => (
        <div key={scenarioName} className="mb-3 last:mb-0 pb-2 last:pb-0 border-b border-slate-700 last:border-0">
          <p className="text-sm font-medium mb-1" style={{ color: data.color }}>
            {scenarioName}
          </p>
          <div className="space-y-1 text-xs">
            {data.data.fiProgress !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">FI Progress:</span>
                {data.data.trackedFiProgress ? (
                  <TrackedValue value={data.data.trackedFiProgress} formatter={(v: number) => `${v.toFixed(1)}%`} showCurrency={false} className="text-emerald-400 font-mono" />
                ) : (
                  <SimpleTrackedValue value={data.data.fiProgress} name={`Year ${label} FI Progress`} description="Percentage of FI target achieved" formula="(Net Worth ÷ FI Target) × 100" formatAs="percent" decimals={1} className="text-emerald-400 font-mono" />
                )}
              </div>
            )}
            {data.data.netWorth !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Net Worth:</span>
                {data.data.trackedNetWorth ? (
                  <TrackedValue value={data.data.trackedNetWorth} className="text-sky-400 font-mono" />
                ) : (
                  <SimpleTrackedValue value={data.data.netWorth} name={`Year ${label} Net Worth`} description="Projected net worth at this point" formula="Prior Year × (1 + Return) + Savings" className="text-sky-400 font-mono" />
                )}
              </div>
            )}
            {data.data.spending !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">{spendingLabel}:</span>
                {data.data.trackedSpending ? (
                  <TrackedValue value={data.data.trackedSpending} className="text-amber-400 font-mono" />
                ) : (
                  <SimpleTrackedValue value={data.data.spending} name={`Year ${label} ${spendingLabel}`} description="Projected spending at this point" formula="Base + (Net Worth × Rate)" className="text-amber-400 font-mono" />
                )}
              </div>
            )}
            {data.data.savings !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">{savingsLabel}:</span>
                {data.data.trackedSavings ? (
                  <TrackedValue value={data.data.trackedSavings} className="text-violet-400 font-mono" />
                ) : (
                  <SimpleTrackedValue value={data.data.savings} name={`Year ${label} ${savingsLabel}`} description="Projected savings at this point" formula="Income - Taxes - Spending" className="text-violet-400 font-mono" />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
