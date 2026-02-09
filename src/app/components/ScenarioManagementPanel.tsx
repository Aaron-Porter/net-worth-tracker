'use client'

import React from 'react'
import { SimpleTrackedValue } from './TrackedValue'
import { useScenarios, Scenario } from '../../lib/useScenarios'

export function ScenarioManagementPanel({
  onClose,
  onEditScenario,
  scenariosHook,
}: {
  onClose: () => void;
  onEditScenario: (scenario: Scenario) => void;
  scenariosHook: ReturnType<typeof useScenarios>;
}) {

  const handleCreateNew = () => {
    const newScenario: Partial<Scenario> = {
      name: `Scenario ${scenariosHook.scenarios.length + 1}`,
      yearlyContribution: 0,
      currentRate: 7,
      swr: 4,
      inflationRate: 3,
      baseMonthlyBudget: 3000,
      spendingGrowthRate: 0.5,
    };
    // Open editor with a new scenario template
    onEditScenario(newScenario as Scenario);
  };

  return (
    <div className="mb-4 p-4 bg-[#0f1629] rounded-xl border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-200">Scenarios</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCreateNew}
            className="px-3 py-1.5 text-sm bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors"
          >
            + New Scenario
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {scenariosHook.scenarios.map(scenario => (
          <div
            key={scenario._id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              scenario.isSelected
                ? 'bg-slate-800/30 border-slate-700'
                : 'bg-slate-900/20 border-slate-700/50 opacity-60 hover:opacity-100'
            }`}
          >
            {/* Selection checkbox */}
            <button
              onClick={() => scenariosHook.toggleSelected(scenario._id)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                scenario.isSelected ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-500'
              }`}
            >
              {scenario.isSelected && (
                <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            {/* Color indicator */}
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: scenario.color }} />

            {/* Scenario info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-200 truncate">{scenario.name}</div>
              <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                <span>
                  Return: <span className="text-emerald-400">{scenario.currentRate}%</span>
                </span>
                <span>
                  Inflation: <span className="text-amber-400">{scenario.inflationRate}%</span>
                </span>
                {scenario.grossIncome && (
                  <span>
                    Income: <SimpleTrackedValue value={scenario.grossIncome} name="Gross Income" description="Annual income for this scenario" formula="User Input" className="text-sky-400" />
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Move up/down buttons */}
              {scenariosHook.scenarios.length > 1 && (
                <>
                  <button
                    onClick={() => scenariosHook.moveScenario(scenario._id, "up")}
                    disabled={scenariosHook.scenarios.indexOf(scenario) === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => scenariosHook.moveScenario(scenario._id, "down")}
                    disabled={scenariosHook.scenarios.indexOf(scenario) === scenariosHook.scenarios.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </>
              )}
              <button
                onClick={() => onEditScenario(scenario)}
                className="p-1.5 text-slate-400 hover:text-violet-400 rounded transition-colors"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={() => scenariosHook.duplicateScenario(scenario._id)}
                className="p-1.5 text-slate-400 hover:text-sky-400 rounded transition-colors"
                title="Duplicate"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              {scenariosHook.scenarios.length > 1 && (
                <button
                  onClick={() => {
                    if (confirm(`Delete "${scenario.name}"?`)) {
                      scenariosHook.deleteScenario(scenario._id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
