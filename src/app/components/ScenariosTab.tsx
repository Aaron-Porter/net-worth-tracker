'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useScenarios, Scenario } from '../../lib/useScenarios'
import { SimpleTrackedValue } from './TrackedValue'
import { ScenarioEditor } from './ScenarioEditor'

interface ScenariosTabProps {
  scenariosHook: ReturnType<typeof useScenarios>;
}

export function ScenariosTab({ scenariosHook }: ScenariosTabProps) {
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  const openNewScenario = () => {
    setEditingScenario({
      name: '',
      currentRate: 7,
      swr: 4,
      inflationRate: 3,
      baseMonthlyBudget: 3000,
      spendingGrowthRate: 2,
      yearlyContribution: 0,
    } as Scenario);
  };

  return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-center mb-1 text-white">
          Scenario Builder
        </h1>
        <p className="text-slate-500 text-center text-sm mb-6">
          Build scenarios step-by-step to understand your financial picture
        </p>

        {/* Personal Info */}
        <div className="bg-[#0f1629] rounded-xl p-6 mb-4 border border-slate-800">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-sky-400 rounded-full"></span>
            Personal Info
          </h3>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-slate-300 mb-2">Birth Date</label>
            <input
              type="date"
              value={scenariosHook.profile.birthDate}
              onChange={(e) => scenariosHook.updateProfile({ birthDate: e.target.value })}
              className="w-full bg-slate-800/30 border border-slate-700 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Create New Scenario CTA */}
        <div className="bg-[#0f1629] rounded-xl p-6 mb-4 border border-violet-500/20 text-center">
          <h3 className="text-xl font-semibold text-slate-200 mb-2">Build a New Scenario</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Answer a few questions about your income, taxes, spending, and investment assumptions to create a personalized financial projection.
          </p>
          <button
            onClick={openNewScenario}
            className="px-6 py-3 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors font-medium"
          >
            Start Building
          </button>
        </div>

        {/* Existing Scenarios */}
        {scenariosHook.scenarios.length > 0 && (
          <div className="bg-[#0f1629] rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Your Scenarios</h3>
            <div className="space-y-2">
              {scenariosHook.scenarios.map(scenario => (
                <div key={scenario._id} className={`flex items-center justify-between p-4 rounded-lg border ${scenario.isSelected ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-900/20 border-slate-700/50 opacity-60'}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => scenariosHook.toggleSelected(scenario._id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center ${scenario.isSelected ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-500'}`}>
                      {scenario.isSelected && <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </button>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: scenario.color }} />
                    <div className="min-w-0">
                      <span className="font-medium text-slate-200">{scenario.name}</span>
                      <div className="flex gap-3 text-xs text-slate-500 mt-1">
                        <span>Saves: <SimpleTrackedValue value={scenario.yearlyContribution} name="Yearly Savings" description="Annual investment contribution" formula="User Input" className="text-sky-400" />/yr</span>
                        {scenario.grossIncome && <span>Income: <SimpleTrackedValue value={scenario.grossIncome} name="Gross Income" description="Annual income for scenario" formula="User Input" className="text-emerald-400" /></span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Move up/down buttons */}
                    {scenariosHook.scenarios.length > 1 && (
                      <>
                        <button onClick={() => scenariosHook.moveScenario(scenario._id, "up")} disabled={scenariosHook.scenarios.indexOf(scenario) === 0} className="p-1.5 text-slate-400 hover:text-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed" title="Move up">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button onClick={() => scenariosHook.moveScenario(scenario._id, "down")} disabled={scenariosHook.scenarios.indexOf(scenario) === scenariosHook.scenarios.length - 1} className="p-1.5 text-slate-400 hover:text-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed" title="Move down">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      </>
                    )}
                    <button onClick={() => setEditingScenario(scenario)} className="p-1.5 text-slate-400 hover:text-violet-400 rounded" title="Edit">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => scenariosHook.duplicateScenario(scenario._id)} className="p-1.5 text-slate-400 hover:text-slate-200 rounded" title="Duplicate">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                    {scenariosHook.scenarios.length > 1 && (
                      <button onClick={() => confirm(`Delete "${scenario.name}"?`) && scenariosHook.deleteScenario(scenario._id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scenario Editor Modal */}
        {editingScenario && typeof document !== 'undefined' && createPortal(
          <ScenarioEditor
            scenario={editingScenario}
            onClose={() => setEditingScenario(null)}
            onSave={async (updates) => {
              await scenariosHook.updateScenario(editingScenario._id, updates);
              setEditingScenario(null);
            }}
            scenariosHook={scenariosHook}
          />,
          document.body
        )}
      </div>
    );
}
