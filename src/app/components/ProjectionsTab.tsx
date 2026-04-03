'use client'

import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useFinancialSelector } from '../../lib/hooks/useFinancialActor'
import { useScenarioActions } from '../../lib/hooks/useScenarioActions'
import type { Scenario, StableProjectionResult, ScenarioProjection } from '../../lib/machines/types'
import { ProjectionsTable } from './ProjectionsTable'
import { ProjectionsChart } from './ProjectionsChart'
import { ScenarioManagementPanel } from './ScenarioManagementPanel'
import { ScenarioEditor } from './ScenarioEditor'
import { MilestoneProgressCard } from './MilestoneProgressCard'
import { FiMilestonesCard } from './FiMilestonesCard'
import { Tab } from '../lib/helpers'

interface ProjectionsTabProps {
  projectionsView: 'table' | 'chart';
  setProjectionsView: (view: 'table' | 'chart') => void;
  setActiveTab: (tab: Tab) => void;
}

/** Convert StableProjectionResult[] to ScenarioProjection[] (no real-time data needed) */
function stableToScenarioProjections(stables: StableProjectionResult[]): ScenarioProjection[] {
  return stables.map(sp => ({
    scenario: sp.scenario,
    projections: sp.projections,
    levelInfo: sp.levelInfo,
    growthRates: { perSecond: 0, perMinute: 0, perHour: 0, perDay: 0, perYear: 0, yearlyAppreciation: 0, yearlyContributions: 0 },
    currentNetWorth: { total: sp.projections[0]?.netWorth ?? 0, appreciation: 0, contributions: 0, baseAmount: 0 },
    fiYear: sp.fiYear,
    fiAge: sp.fiAge,
    crossoverYear: sp.crossoverYear,
    currentFiProgress: 0,
    currentMonthlySwr: sp.currentMonthlySwr,
    dynamicProjections: sp.dynamicProjections,
    hasDynamicIncome: sp.hasDynamicIncome,
    fiMilestones: sp.fiMilestones,
    monthlyProjections: sp.monthlyProjections,
    effectiveRate: sp.effectiveRate,
  }));
}

export function ProjectionsTab({
  projectionsView,
  setProjectionsView,
  setActiveTab,
}: ProjectionsTabProps) {
  const currentYear = new Date().getFullYear();

  // Granular selectors — no real-time dependency
  const latestEntry = useFinancialSelector(s => s.context.entries[0] ?? null);
  const stableProjections = useFinancialSelector(s => s.context.stableProjections);
  const profile = useFinancialSelector(s => s.context.profile);
  const scenarios = useFinancialSelector(s => s.context.scenarios);
  const actions = useScenarioActions();

  const scenarioProjections = useMemo(
    () => stableToScenarioProjections(stableProjections),
    [stableProjections]
  );

  const primaryProjection = scenarioProjections[0] || null;

  // Prepare comparison chart data (limited to 30 years)
  const comparisonChartData = useMemo(() => {
    if (!primaryProjection) return [];

    const years = primaryProjection.projections
      .filter((d): d is typeof d & { year: number } => typeof d.year === 'number')
      .slice(0, 30)
      .map(d => d.year);

    return years.map(year => {
      const dataPoint: Record<string, number | string> = { year };

      scenarioProjections.forEach(sp => {
        const row = sp.projections.find(p => p.year === year);
        dataPoint[sp.scenario.name] = Math.round(row?.netWorth || 0);
      });

      return dataPoint;
    });
  }, [primaryProjection, scenarioProjections]);

  // Prepare FI progress comparison chart data (limited to 30 years)
  const fiProgressChartData = useMemo(() => {
    if (!primaryProjection) return [];

    const years = primaryProjection.projections
      .filter((d): d is typeof d & { year: number } => typeof d.year === 'number')
      .slice(0, 30)
      .map(d => d.year);

    return years.map(year => {
      const dataPoint: Record<string, number | string> = { year };

      scenarioProjections.forEach(sp => {
        const row = sp.projections.find(p => p.year === year);
        dataPoint[sp.scenario.name] = Number((row?.fiProgress || 0).toFixed(1));
      });

      return dataPoint;
    });
  }, [primaryProjection, scenarioProjections]);

  const [showScenarioPanel, setShowScenarioPanel] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  if (!latestEntry) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No net worth data found.</p>
          <button
            onClick={() => setActiveTab('entries')}
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            Add your first entry
          </button>
        </div>
      </div>
    );
  }

  if (scenarioProjections.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-violet-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">No Scenarios Selected</h3>
          <p className="text-slate-400 text-sm mb-4">
            Select at least one scenario to view projections.
          </p>
          <button
            onClick={() => setActiveTab('scenarios')}
            className="px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors"
          >
            Manage Scenarios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4">
      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-[#0f1629] rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {scenarioProjections.map(sp => (
            <div
              key={sp.scenario._id}
              className="flex items-center gap-2 px-2 py-1 rounded-full text-xs"
              style={{ backgroundColor: `${sp.scenario.color}20`, color: sp.scenario.color }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sp.scenario.color }} />
              {sp.scenario.name}
              {sp.fiYear && (
                <span className="text-slate-400">FI: {sp.fiYear}</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowScenarioPanel(!showScenarioPanel)}
          className="px-3 py-1.5 text-sm font-medium bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 rounded-lg transition-colors"
        >
          {showScenarioPanel ? 'Hide' : 'Manage'} Scenarios
        </button>
        <div className="flex rounded-lg border border-slate-700 overflow-hidden">
          <button
            onClick={() => setProjectionsView('table')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              projectionsView === 'table'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setProjectionsView('chart')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              projectionsView === 'chart'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            Chart
          </button>
        </div>
      </div>

      {/* Scenario Management Panel */}
      {showScenarioPanel && (
        <ScenarioManagementPanel
          onClose={() => setShowScenarioPanel(false)}
          onEditScenario={(scenario) => setEditingScenario(scenario)}
          scenarios={scenarios}
          actions={actions}
        />
      )}

      {/* Scenario Editor */}
      {editingScenario && typeof document !== 'undefined' && createPortal(
        <ScenarioEditor
          scenario={editingScenario}
          onClose={() => setEditingScenario(null)}
          onSave={async (updates) => {
            await actions.updateScenario(editingScenario._id, updates);
            setEditingScenario(null);
          }}
          scenarios={scenarios}
          stableProjections={stableProjections}
          actions={actions}
        />,
        document.body
      )}

      {/* Projections Content */}
      {projectionsView === 'table' ? (
        <ProjectionsTable
          scenarioProjections={scenarioProjections}
          birthDate={profile.birthDate}
          latestEntry={latestEntry}
        />
      ) : (
        <ProjectionsChart
          scenarioProjections={scenarioProjections}
          comparisonChartData={comparisonChartData}
          fiProgressChartData={fiProgressChartData}
          currentYear={currentYear}
        />
      )}

      {/* Milestones */}
      {primaryProjection && (
        <div className="mt-4 max-w-2xl mx-auto space-y-4">
          <MilestoneProgressCard primaryProjection={primaryProjection} />
          {latestEntry && (
            <FiMilestonesCard primaryProjection={primaryProjection} latestEntry={latestEntry} />
          )}
        </div>
      )}
    </div>
  );
}
