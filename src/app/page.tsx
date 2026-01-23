'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { SignIn } from './components/SignIn'
import { useScenarios, Scenario, ScenarioProjection, SCENARIO_TEMPLATES } from '../lib/useScenarios'
import {
  formatCurrency,
  formatDate,
  getTimeSinceEntry,
  LEVEL_THRESHOLDS,
  formatPercent,
  calculateScenarioIncome,
  STATE_TAX_RATES,
  STATE_TAX_INFO,
  CONTRIBUTION_LIMITS,
  FilingStatus,
  ScenarioIncomeBreakdown,
  TaxCalculation,
  BracketBreakdown,
  calculateSwrAmounts,
  calculateFiTarget,
  calculateLevelBasedSpending,
} from '../lib/calculations'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  Brush,
} from 'recharts'

type Tab = 'dashboard' | 'entries' | 'projections' | 'levels' | 'scenarios'

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <SignIn />
  }

  return <AuthenticatedApp />
}

function AuthenticatedApp() {
  const { signOut } = useAuthActions()
  
  // Use scenarios hook - the primary source of truth
  const scenariosHook = useScenarios()
  
  // Mutations
  const addEntry = useMutation(api.entries.add)
  const removeEntry = useMutation(api.entries.remove)
  
  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [projectionsView, setProjectionsView] = useState<'table' | 'chart'>('table')
  const [newAmount, setNewAmount] = useState<string>('')

  // Get the primary scenario (first selected) for dashboard display
  const primaryProjection = scenariosHook.scenarioProjections[0] || null;

  // Create default scenario if user has none
  useEffect(() => {
    if (!scenariosHook.isLoading && !scenariosHook.hasScenarios) {
      scenariosHook.createDefaultScenario();
    }
  }, [scenariosHook.isLoading, scenariosHook.hasScenarios, scenariosHook]);

  const handleAddEntry = async () => {
    const amount = parseFloat(newAmount.replace(/,/g, ''))
    if (isNaN(amount) || amount <= 0) return

    await addEntry({
      amount,
      timestamp: Date.now(),
    })
    setNewAmount('')
  }

  const handleDeleteEntry = async (id: Id<"netWorthEntries">) => {
    await removeEntry({ id })
  }

  const formatNetWorthInput = (value: string) => {
    return value.replace(/[^0-9.]/g, '')
  }

  // Show loading while data is being fetched
  if (scenariosHook.isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur border-b border-slate-700 overflow-x-auto scrollbar-hide">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex gap-1 items-center min-w-0 touch-pan-x">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-3 sm:px-6 sm:py-4 font-medium transition-colors relative whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dashboard
              {activeTab === 'dashboard' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('entries')}
              className={`px-3 py-3 sm:px-6 sm:py-4 font-medium transition-colors relative whitespace-nowrap ${
                activeTab === 'entries'
                  ? 'text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entries
              {activeTab === 'entries' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('projections')}
              className={`px-3 py-3 sm:px-6 sm:py-4 font-medium transition-colors relative whitespace-nowrap ${
                activeTab === 'projections'
                  ? 'text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Projections
              {activeTab === 'projections' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('levels')}
              className={`px-3 py-3 sm:px-6 sm:py-4 font-medium transition-colors relative whitespace-nowrap ${
                activeTab === 'levels'
                  ? 'text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Levels
              {activeTab === 'levels' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`px-3 py-3 sm:px-6 sm:py-4 font-medium transition-colors relative whitespace-nowrap ${
                activeTab === 'scenarios'
                  ? 'text-violet-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Scenarios
              {scenariosHook.scenarios.length > 0 && (
                <span className="ml-1 text-xs bg-violet-500/30 px-1.5 py-0.5 rounded-full">
                  {scenariosHook.selectedScenarios.length}/{scenariosHook.scenarios.length}
                </span>
              )}
              {activeTab === 'scenarios' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400" />
              )}
            </button>
            <div className="flex-1" />
            <button
              onClick={() => signOut()}
              className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors shrink-0"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <DashboardTab
          latestEntry={scenariosHook.latestEntry}
          primaryProjection={primaryProjection}
          selectedScenarios={scenariosHook.selectedScenarios}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <EntriesTab
          entries={scenariosHook.entries}
          newAmount={newAmount}
          setNewAmount={setNewAmount}
          formatNetWorthInput={formatNetWorthInput}
          handleAddEntry={handleAddEntry}
          handleDeleteEntry={handleDeleteEntry}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Projections Tab */}
      {activeTab === 'projections' && (
        <ProjectionsTab
          latestEntry={scenariosHook.latestEntry}
          scenarioProjections={scenariosHook.scenarioProjections}
          profile={scenariosHook.profile}
          projectionsView={projectionsView}
          setProjectionsView={setProjectionsView}
          setActiveTab={setActiveTab}
          scenariosHook={scenariosHook}
        />
      )}

      {/* Levels Tab */}
      {activeTab === 'levels' && (
        <LevelsTab
          latestEntry={scenariosHook.latestEntry}
          primaryProjection={primaryProjection}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Scenarios Tab */}
      {activeTab === 'scenarios' && (
        <ScenariosTab
          scenariosHook={scenariosHook}
        />
      )}
    </main>
  )
}

// ============================================================================
// DASHBOARD TAB
// ============================================================================

interface DashboardTabProps {
  latestEntry: ReturnType<typeof useScenarios>['latestEntry'];
  primaryProjection: ScenarioProjection | null;
  selectedScenarios: Scenario[];
  setActiveTab: (tab: Tab) => void;
}

function DashboardTab({
  latestEntry,
  primaryProjection,
  selectedScenarios,
  setActiveTab,
}: DashboardTabProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
        Net Worth Tracker
      </h1>
      <p className="text-slate-400 text-center mb-10">
        Watch your investments grow in real-time
      </p>

      {/* Current Total Display */}
      {latestEntry && primaryProjection ? (
        <div className="mb-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-emerald-500/30">
          {/* Scenario indicator */}
          <div className="flex justify-center mb-4">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
              style={{ backgroundColor: `${primaryProjection.scenario.color}20`, color: primaryProjection.scenario.color }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryProjection.scenario.color }} />
              {primaryProjection.scenario.name}
              {selectedScenarios.length > 1 && (
                <span className="text-slate-400">+{selectedScenarios.length - 1} more</span>
              )}
            </div>
          </div>

          <h2 className="text-sm font-medium text-slate-400 text-center mb-1">
            Current Net Worth
          </h2>
          <div className="text-center">
            <span className="text-4xl md:text-5xl font-bold font-mono bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              {formatCurrency(primaryProjection.currentNetWorth.total, 6)}
            </span>
          </div>
          <div className="mt-4 flex justify-center gap-8 text-sm">
            <div className="text-center">
              <p className="text-slate-500">Base Amount</p>
              <p className="text-slate-300 font-mono">{formatCurrency(primaryProjection.currentNetWorth.baseAmount)}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-500">Appreciation</p>
              <p className="text-emerald-400 font-mono">+{formatCurrency(primaryProjection.currentNetWorth.appreciation, 4)}</p>
            </div>
          </div>
          <p className="text-slate-500 text-center mt-4 text-xs">
            Last updated {getTimeSinceEntry(latestEntry.timestamp)} at {primaryProjection.scenario.currentRate}% annual return
          </p>
        </div>
      ) : (
        <div className="mb-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700 text-center">
          <p className="text-slate-400 mb-4">No net worth data yet.</p>
          <button
            onClick={() => setActiveTab('entries')}
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            Add your first entry
          </button>
        </div>
      )}

      {/* Metrics Section */}
      {latestEntry && primaryProjection && (
        <div className="mt-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
          <h2 className="text-lg font-semibold text-slate-300 mb-4">
            Metrics
          </h2>
          
          {/* Growth/Appreciation Rates */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              Appreciation Rate
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Per Second</p>
                <p className="text-emerald-400 font-mono">
                  {formatCurrency(primaryProjection.growthRates.perSecond, 6)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Per Minute</p>
                <p className="text-emerald-400 font-mono">
                  {formatCurrency(primaryProjection.growthRates.perMinute, 4)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Per Hour</p>
                <p className="text-emerald-400 font-mono">
                  {formatCurrency(primaryProjection.growthRates.perHour)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Per Day</p>
                <p className="text-emerald-400 font-mono">
                  {formatCurrency(primaryProjection.growthRates.perDay)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 col-span-2 sm:col-span-2">
                <p className="text-slate-500 text-xs">Per Year</p>
                <p className="text-emerald-400 font-mono text-lg">
                  {formatCurrency(primaryProjection.growthRates.perYear)}
                </p>
              </div>
            </div>
          </div>

          {/* Safe Withdrawal Rate */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              Safe Withdrawal Rate <span className="text-slate-500">({primaryProjection.scenario.swr}%)</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Annual</p>
                <p className="text-amber-400 font-mono text-lg">
                  {formatCurrency(primaryProjection.currentNetWorth.total * (primaryProjection.scenario.swr / 100))}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Monthly</p>
                <p className="text-amber-400 font-mono text-lg">
                  {formatCurrency(primaryProjection.currentMonthlySwr)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ENTRIES TAB
// ============================================================================

interface EntriesTabProps {
  entries: ReturnType<typeof useScenarios>['entries'];
  newAmount: string;
  setNewAmount: (value: string) => void;
  formatNetWorthInput: (value: string) => string;
  handleAddEntry: () => void;
  handleDeleteEntry: (id: Id<"netWorthEntries">) => void;
  setActiveTab: (tab: Tab) => void;
}

function EntriesTab({
  entries,
  newAmount,
  setNewAmount,
  formatNetWorthInput,
  handleAddEntry,
  handleDeleteEntry,
}: EntriesTabProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
        Net Worth Entries
      </h1>
      <p className="text-slate-400 text-center mb-10">
        Track changes to your net worth over time
      </p>

      {/* Add New Entry */}
      <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
        <h2 className="text-lg font-semibold text-slate-300 mb-4">
          {entries.length === 0 ? 'Add Your Net Worth' : 'Add New Entry'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Current Net Worth
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                $
              </span>
              <input
                type="text"
                value={newAmount}
                onChange={(e) => setNewAmount(formatNetWorthInput(e.target.value))}
                placeholder="100,000"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 pl-8 pr-4 text-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleAddEntry()}
              />
            </div>
          </div>

          <button
            onClick={handleAddEntry}
            disabled={!newAmount || parseFloat(newAmount) <= 0}
            className="w-full py-4 rounded-lg font-semibold text-lg transition-all bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {entries.length === 0 ? 'Start Tracking' : 'Add Entry'}
          </button>
        </div>
      </div>

      {/* Entry History */}
      {entries.length > 0 && (
        <div className="mt-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
          <h2 className="text-lg font-semibold text-slate-300 mb-4">
            Entry History
          </h2>
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry._id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0
                    ? 'bg-emerald-900/30 border border-emerald-500/30'
                    : 'bg-slate-900/50'
                }`}
              >
                <div>
                  <p className="font-mono text-lg text-white">
                    {formatCurrency(entry.amount)}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {formatDate(entry.timestamp)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {index === 0 && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteEntry(entry._id as Id<"netWorthEntries">)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    title="Delete entry"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SCENARIO MANAGEMENT COMPONENTS
// ============================================================================

function ScenarioManagementPanel({
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
    <div className="mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
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
                ? 'bg-slate-900/50 border-slate-600'
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
                    Income: <span className="text-sky-400">{formatCurrency(scenario.grossIncome)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
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

function ScenarioEditor({
  scenario,
  onClose,
  onSave,
  scenariosHook,
}: {
  scenario: Scenario;
  onClose: () => void;
  onSave: (updates: Partial<Scenario>) => Promise<void>;
  scenariosHook: ReturnType<typeof useScenarios>;
}) {
  const isNewScenario = !scenario._id;

  const [form, setForm] = useState({
    name: scenario.name,
    grossIncome: scenario.grossIncome?.toString() || '',
    incomeGrowthRate: scenario.incomeGrowthRate?.toString() || '3',
    filingStatus: scenario.filingStatus || 'single',
    stateCode: scenario.stateCode || '',
    preTax401k: scenario.preTax401k?.toString() || '',
    preTaxIRA: scenario.preTaxIRA?.toString() || '',
    preTaxHSA: scenario.preTaxHSA?.toString() || '',
    preTaxOther: scenario.preTaxOther?.toString() || '',
    baseMonthlyBudget: scenario.baseMonthlyBudget?.toString() || '3000',
    spendingGrowthRate: scenario.spendingGrowthRate?.toString() || '0.5',
    currentRate: scenario.currentRate?.toString() || '7',
    swr: scenario.swr?.toString() || '4',
    inflationRate: scenario.inflationRate?.toString() || '3',
  });

  const [saving, setSaving] = useState(false);

  // Get current net worth for spending calculations
  const currentNetWorth = scenariosHook.scenarioProjections[0]?.currentNetWorth.total || 0;

  // Calculate live income breakdown when income is entered
  const liveBreakdown = useMemo((): ScenarioIncomeBreakdown | null => {
    const gross = parseFloat(form.grossIncome) || 0;
    if (gross <= 0) return null;

    const baseBudget = parseFloat(form.baseMonthlyBudget) || 3000;
    const spendingRate = parseFloat(form.spendingGrowthRate) || 0;
    const netWorthPortion = currentNetWorth * (spendingRate / 100) / 12;
    const totalSpending = baseBudget + netWorthPortion;

    return calculateScenarioIncome(
      gross,
      form.filingStatus as FilingStatus,
      form.stateCode || null,
      {
        traditional401k: parseFloat(form.preTax401k) || 0,
        traditionalIRA: parseFloat(form.preTaxIRA) || 0,
        hsa: parseFloat(form.preTaxHSA) || 0,
        other: parseFloat(form.preTaxOther) || 0,
      },
      totalSpending,
      currentNetWorth
    );
  }, [form, currentNetWorth]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        name: form.name || 'New Scenario',
        currentRate: parseFloat(form.currentRate) || 7,
        swr: parseFloat(form.swr) || 4,
        inflationRate: parseFloat(form.inflationRate) || 3,
        baseMonthlyBudget: parseFloat(form.baseMonthlyBudget) || 3000,
        spendingGrowthRate: parseFloat(form.spendingGrowthRate) || 0.5,
      };

      // Optional income fields
      const grossIncome = parseFloat(form.grossIncome);
      if (grossIncome > 0 && liveBreakdown) {
        updates.grossIncome = grossIncome;
        updates.incomeGrowthRate = parseFloat(form.incomeGrowthRate) || 3;
        updates.filingStatus = form.filingStatus as FilingStatus;
        updates.stateCode = form.stateCode || undefined;
        updates.preTax401k = parseFloat(form.preTax401k) || 0;
        updates.preTaxIRA = parseFloat(form.preTaxIRA) || 0;
        updates.preTaxHSA = parseFloat(form.preTaxHSA) || 0;
        updates.preTaxOther = parseFloat(form.preTaxOther) || 0;
        // Calculate yearly contribution from breakdown
        updates.yearlyContribution = liveBreakdown.totalAnnualSavings;
        updates.effectiveTaxRate = liveBreakdown.taxes.effectiveTotalRate;
      } else {
        // No income data - savings must be specified manually in a different way
        // For now, default to 0
        updates.yearlyContribution = 0;
      }

      if (isNewScenario) {
        await scenariosHook.createScenario(updates);
      } else {
        await onSave(updates);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (template: typeof SCENARIO_TEMPLATES[number]) => {
    setForm(prev => ({
      ...prev,
      currentRate: template.currentRate.toString(),
      swr: template.swr.toString(),
      inflationRate: template.inflationRate.toString(),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-slate-200">
            {isNewScenario ? 'Create New Scenario' : `Edit: ${scenario.name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Basic Info</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Scenario Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g., Conservative Plan"
                />
              </div>
            </div>
          </section>

          {/* Investment Assumptions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-200">Investment Assumptions</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => applyTemplate(SCENARIO_TEMPLATES[0])}
                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                >
                  Conservative
                </button>
                <button
                  onClick={() => applyTemplate(SCENARIO_TEMPLATES[1])}
                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                >
                  Moderate
                </button>
                <button
                  onClick={() => applyTemplate(SCENARIO_TEMPLATES[2])}
                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                >
                  Aggressive
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Return Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.currentRate}
                  onChange={(e) => setForm({ ...form, currentRate: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">SWR (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.swr}
                  onChange={(e) => setForm({ ...form, swr: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Inflation (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.inflationRate}
                  onChange={(e) => setForm({ ...form, inflationRate: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </section>

          {/* Spending Assumptions */}
          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Spending Assumptions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Base Monthly Budget ($)</label>
                <input
                  type="number"
                  value={form.baseMonthlyBudget}
                  onChange={(e) => setForm({ ...form, baseMonthlyBudget: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Spending Growth Rate (% of NW)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.spendingGrowthRate}
                  onChange={(e) => setForm({ ...form, spendingGrowthRate: e.target.value })}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </section>

          {/* Income & Taxes (Optional) */}
          <section className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Income & Taxes (Optional)</h3>
            <p className="text-sm text-slate-400 mb-4">
              Add income details for more accurate projections and tax calculations
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Gross Income ($)</label>
                  <input
                    type="number"
                    value={form.grossIncome}
                    onChange={(e) => setForm({ ...form, grossIncome: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Annual gross income"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Income Growth (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.incomeGrowthRate}
                    onChange={(e) => setForm({ ...form, incomeGrowthRate: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {form.grossIncome && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Filing Status</label>
                      <select
                        value={form.filingStatus}
                        onChange={(e) => setForm({ ...form, filingStatus: e.target.value })}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="single">Single</option>
                        <option value="married_jointly">Married Filing Jointly</option>
                        <option value="married_separately">Married Filing Separately</option>
                        <option value="head_of_household">Head of Household</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">State</label>
                      <select
                        value={form.stateCode}
                        onChange={(e) => setForm({ ...form, stateCode: e.target.value })}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="">Select State</option>
                        {Object.keys(STATE_TAX_INFO)
                          .sort()
                          .map((code) => (
                            <option key={code} value={code}>
                              {code} - {STATE_TAX_INFO[code].name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Pre-Tax Retirement Contributions</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">401k/403b ($)</label>
                        <input
                          type="number"
                          value={form.preTax401k}
                          onChange={(e) => setForm({ ...form, preTax401k: e.target.value })}
                          className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Traditional IRA ($)</label>
                        <input
                          type="number"
                          value={form.preTaxIRA}
                          onChange={(e) => setForm({ ...form, preTaxIRA: e.target.value })}
                          className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">HSA ($)</label>
                        <input
                          type="number"
                          value={form.preTaxHSA}
                          onChange={(e) => setForm({ ...form, preTaxHSA: e.target.value })}
                          className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Other Pre-Tax ($)</label>
                        <input
                          type="number"
                          value={form.preTaxOther}
                          onChange={(e) => setForm({ ...form, preTaxOther: e.target.value })}
                          className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Income Breakdown Display */}
              {liveBreakdown && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-200">Income Breakdown</h4>

                  {/* High-level Summary */}
                  <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Gross Income</span>
                      <span className="font-mono text-slate-200">{formatCurrency(liveBreakdown.taxes.grossIncome)}</span>
                    </div>

                    {liveBreakdown.taxes.totalPreTaxContributions > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">− Pre-tax Contributions</span>
                          <span className="font-mono text-emerald-400">−{formatCurrency(liveBreakdown.taxes.totalPreTaxContributions)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                          <span className="text-slate-400">Adjusted Gross Income</span>
                          <span className="font-mono text-slate-200">{formatCurrency(liveBreakdown.taxes.adjustedGrossIncome)}</span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                      <span className="text-slate-400">− Total Taxes</span>
                      <span className="font-mono text-red-400">−{formatCurrency(liveBreakdown.taxes.totalTax)}</span>
                    </div>

                    <div className="flex justify-between text-sm text-xs text-slate-500 pl-4">
                      <span>Federal: {formatCurrency(liveBreakdown.taxes.federalTax)}</span>
                      <span>State: {formatCurrency(liveBreakdown.taxes.stateTax)}</span>
                      <span>FICA: {formatCurrency(liveBreakdown.taxes.fica.totalFicaTax)}</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                      <div>
                        <span className="text-sm font-medium text-emerald-400">Net Income</span>
                        <p className="text-xs text-slate-500">
                          Effective Tax Rate: {formatPercent(liveBreakdown.taxes.effectiveTotalRate)}
                        </p>
                      </div>
                      <span className="text-lg font-mono text-emerald-400">{formatCurrency(liveBreakdown.taxes.netIncome)}</span>
                    </div>

                    <div className="border-t border-slate-700 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">− Annual Spending</span>
                        <span className="font-mono text-amber-400">−{formatCurrency(liveBreakdown.annualSpending)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-emerald-500/30 pt-2">
                        <div>
                          <span className="text-sm font-medium text-emerald-400">Total Annual Savings</span>
                          <p className="text-xs text-slate-500">
                            {formatCurrency(liveBreakdown.monthlySavingsAvailable)}/month
                          </p>
                        </div>
                        <span className="text-lg font-mono text-emerald-400">{formatCurrency(liveBreakdown.totalAnnualSavings)}</span>
                      </div>

                      <p className="text-xs text-center text-slate-500 pt-2">
                        Savings Rate: <span className="text-emerald-400 font-semibold">{formatPercent(liveBreakdown.savingsRateOfGross)}</span> of gross income
                      </p>
                    </div>
                  </div>

                  {/* Detailed Tax Calculation */}
                  <TaxCalculationDetails taxes={liveBreakdown.taxes} />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : isNewScenario ? 'Create Scenario' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROJECTIONS TAB
// ============================================================================

interface ProjectionsTabProps {
  latestEntry: ReturnType<typeof useScenarios>['latestEntry'];
  scenarioProjections: ScenarioProjection[];
  profile: ReturnType<typeof useScenarios>['profile'];
  projectionsView: 'table' | 'chart';
  setProjectionsView: (view: 'table' | 'chart') => void;
  setActiveTab: (tab: Tab) => void;
  scenariosHook: ReturnType<typeof useScenarios>;
}

function ProjectionsTab({
  latestEntry,
  scenarioProjections,
  profile,
  projectionsView,
  setProjectionsView,
  setActiveTab,
  scenariosHook,
}: ProjectionsTabProps) {
  const currentYear = new Date().getFullYear();
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

  const [showScenarioPanel, setShowScenarioPanel] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  return (
    <div className="flex flex-col p-4">
      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
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
        <div className="flex rounded-lg border border-slate-600 overflow-hidden">
          <button
            onClick={() => setProjectionsView('table')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              projectionsView === 'table'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setProjectionsView('chart')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              projectionsView === 'chart'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'
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
          scenariosHook={scenariosHook}
        />
      )}

      {/* Scenario Editor */}
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

      {/* Projections Content */}
      {projectionsView === 'table' ? (
        <ProjectionsTable
          scenarioProjections={scenarioProjections}
          birthDate={profile.birthDate}
        />
      ) : (
        <ProjectionsChart
          scenarioProjections={scenarioProjections}
          comparisonChartData={comparisonChartData}
          fiProgressChartData={fiProgressChartData}
          currentYear={currentYear}
        />
      )}
    </div>
  );
}

function ProjectionsTable({
  scenarioProjections,
  birthDate,
}: {
  scenarioProjections: ScenarioProjection[];
  birthDate: string;
}) {
  const currentYear = new Date().getFullYear();
  const birthYear = birthDate ? new Date(birthDate).getFullYear() : null;
  const [showYearlyDetail, setShowYearlyDetail] = useState(true);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('yearly');
  
  // Find the best and worst scenarios for various metrics
  const getBestWorst = (getValue: (sp: ScenarioProjection) => number | null, lowerIsBetter = false) => {
    const values = scenarioProjections.map(sp => ({ id: sp.scenario._id, value: getValue(sp) })).filter(v => v.value !== null);
    if (values.length === 0) return { best: null, worst: null };
    const sorted = [...values].sort((a, b) => (a.value! - b.value!) * (lowerIsBetter ? 1 : -1));
    return { best: sorted[0]?.id, worst: sorted[sorted.length - 1]?.id };
  };

  const fiYearComparison = getBestWorst(sp => sp.fiYear, true);
  
  // Metric type definition
  interface ComparisonMetric {
    label: string;
    getValue: (sp: ScenarioProjection) => string;
    getNumericValue: (sp: ScenarioProjection) => number | null;
    lowerIsBetter: boolean;
    format: 'year' | 'years' | 'age' | 'currency' | 'percent' | 'number';
    isInput?: boolean;
  }

  // Comparison metrics
  const comparisonRows: { category: string; metrics: ComparisonMetric[] }[] = [
    { 
      category: 'Key Milestones',
      metrics: [
        {
          label: 'Financial Independence Year',
          getValue: (sp: ScenarioProjection) => sp.fiYear ? sp.fiYear.toString() : 'Not reached',
          getNumericValue: (sp: ScenarioProjection) => sp.fiYear,
          lowerIsBetter: true,
          format: 'year',
        },
        {
          label: 'Years to FI',
          getValue: (sp: ScenarioProjection) => sp.fiYear ? `${sp.fiYear - currentYear} years` : '-',
          getNumericValue: (sp: ScenarioProjection) => sp.fiYear ? sp.fiYear - currentYear : null,
          lowerIsBetter: true,
          format: 'years',
        },
        {
          label: 'FI Age',
          getValue: (sp: ScenarioProjection) => sp.fiAge ? `Age ${sp.fiAge}` : '-',
          getNumericValue: (sp: ScenarioProjection) => sp.fiAge,
          lowerIsBetter: true,
          format: 'age',
        },
        {
          label: 'Crossover Year',
          getValue: (sp: ScenarioProjection) => sp.crossoverYear ? sp.crossoverYear.toString() : '-',
          getNumericValue: (sp: ScenarioProjection) => sp.crossoverYear,
          lowerIsBetter: true,
          format: 'year',
        },
      ]
    },
    {
      category: 'Net Worth Projections',
      metrics: [
        {
          label: 'Current',
          getValue: (sp: ScenarioProjection) => formatCurrency(sp.currentNetWorth.total),
          getNumericValue: (sp: ScenarioProjection) => sp.currentNetWorth.total,
          lowerIsBetter: false,
          format: 'currency',
        },
        ...[5, 10, 15, 20, 25, 30].map(years => ({
          label: `In ${years} Years (${currentYear + years})`,
          getValue: (sp: ScenarioProjection) => {
            const row = sp.projections.find(p => p.year === currentYear + years);
            return row ? formatCurrency(row.netWorth) : '-';
          },
          getNumericValue: (sp: ScenarioProjection) => {
            const row = sp.projections.find(p => p.year === currentYear + years);
            return row?.netWorth ?? null;
          },
          lowerIsBetter: false,
          format: 'currency' as const,
        })),
      ]
    },
    {
      category: 'Monthly Safe Withdrawal',
      metrics: [
        {
          label: 'Current',
          getValue: (sp: ScenarioProjection) => formatCurrency(sp.currentMonthlySwr),
          getNumericValue: (sp: ScenarioProjection) => sp.currentMonthlySwr,
          lowerIsBetter: false,
          format: 'currency',
        },
        ...[10, 20, 30].map(years => ({
          label: `In ${years} Years`,
          getValue: (sp: ScenarioProjection) => {
            const row = sp.projections.find(p => p.year === currentYear + years);
            return row ? formatCurrency(row.monthlySwr) : '-';
          },
          getNumericValue: (sp: ScenarioProjection) => {
            const row = sp.projections.find(p => p.year === currentYear + years);
            return row?.monthlySwr ?? null;
          },
          lowerIsBetter: false,
          format: 'currency' as const,
        })),
      ]
    },
    {
      category: 'FI Progress',
      metrics: [
        {
          label: 'Current Progress',
          getValue: (sp: ScenarioProjection) => `${sp.currentFiProgress.toFixed(1)}%`,
          getNumericValue: (sp: ScenarioProjection) => sp.currentFiProgress,
          lowerIsBetter: false,
          format: 'percent',
        },
        ...[5, 10, 15].map(years => ({
          label: `In ${years} Years`,
          getValue: (sp: ScenarioProjection) => {
            const row = sp.projections.find(p => p.year === currentYear + years);
            return row ? `${row.fiProgress.toFixed(1)}%` : '-';
          },
          getNumericValue: (sp: ScenarioProjection) => {
            const row = sp.projections.find(p => p.year === currentYear + years);
            return row?.fiProgress ?? null;
          },
          lowerIsBetter: false,
          format: 'percent' as const,
        })),
      ]
    },
    // Only show income projections if at least one scenario has income data
    ...(scenarioProjections.some(sp => sp.hasDynamicIncome) ? [{
      category: 'Annual Income Projections',
      metrics: [
        {
          label: 'Current',
          getValue: (sp: ScenarioProjection) => {
            const row = sp.dynamicProjections?.find(d => d.yearsFromNow === 0);
            return row ? formatCurrency(row.grossIncome) : '-';
          },
          getNumericValue: (sp: ScenarioProjection) => {
            const row = sp.dynamicProjections?.find(d => d.yearsFromNow === 0);
            return row?.grossIncome ?? null;
          },
          lowerIsBetter: false,
          format: 'currency' as const,
        },
        ...[5, 10, 15, 20, 25, 30].map(years => ({
          label: `In ${years} Years (${currentYear + years})`,
          getValue: (sp: ScenarioProjection) => {
            const row = sp.dynamicProjections?.find(d => d.yearsFromNow === years);
            return row ? formatCurrency(row.grossIncome) : '-';
          },
          getNumericValue: (sp: ScenarioProjection) => {
            const row = sp.dynamicProjections?.find(d => d.yearsFromNow === years);
            return row?.grossIncome ?? null;
          },
          lowerIsBetter: false,
          format: 'currency' as const,
        })),
      ]
    }] : []),
    {
      category: 'Scenario Settings',
      metrics: [
        {
          label: 'Return Rate',
          getValue: (sp: ScenarioProjection) => `${sp.scenario.currentRate}%`,
          getNumericValue: (sp: ScenarioProjection) => sp.scenario.currentRate,
          lowerIsBetter: false,
          format: 'percent',
          isInput: true,
        },
        {
          label: 'Safe Withdrawal Rate',
          getValue: (sp: ScenarioProjection) => `${sp.scenario.swr}%`,
          getNumericValue: (sp: ScenarioProjection) => sp.scenario.swr,
          lowerIsBetter: false,
          format: 'percent',
          isInput: true,
        },
        {
          label: 'Yearly Contribution',
          getValue: (sp: ScenarioProjection) => formatCurrency(sp.scenario.yearlyContribution),
          getNumericValue: (sp: ScenarioProjection) => sp.scenario.yearlyContribution,
          lowerIsBetter: false,
          format: 'currency',
          isInput: true,
        },
        {
          label: 'Inflation Rate',
          getValue: (sp: ScenarioProjection) => `${sp.scenario.inflationRate}%`,
          getNumericValue: (sp: ScenarioProjection) => sp.scenario.inflationRate,
          lowerIsBetter: true,
          format: 'percent',
          isInput: true,
        },
        {
          label: 'Base Monthly Budget',
          getValue: (sp: ScenarioProjection) => formatCurrency(sp.scenario.baseMonthlyBudget),
          getNumericValue: (sp: ScenarioProjection) => sp.scenario.baseMonthlyBudget,
          lowerIsBetter: false,
          format: 'currency',
          isInput: true,
        },
        {
          label: 'Spending Growth Rate',
          getValue: (sp: ScenarioProjection) => `${sp.scenario.spendingGrowthRate}%`,
          getNumericValue: (sp: ScenarioProjection) => sp.scenario.spendingGrowthRate,
          lowerIsBetter: true,
          format: 'percent',
          isInput: true,
        },
      ]
    },
  ];
  
  const primaryProjection = scenarioProjections[0];

  // Transform projections based on view mode
  const displayRows = useMemo(() => {
    if (viewMode === 'yearly') {
      return primaryProjection.projections;
    }

    // For monthly view, expand each year into 12 months
    const monthlyRows: any[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Create settings object for spending calculations
    const settings = {
      currentRate: primaryProjection.scenario.currentRate,
      swr: primaryProjection.scenario.swr,
      yearlyContribution: primaryProjection.scenario.yearlyContribution,
      birthDate: birthDate,
      monthlySpend: 0, // Not used - spending comes from levels system
      inflationRate: primaryProjection.scenario.inflationRate,
      baseMonthlyBudget: primaryProjection.scenario.baseMonthlyBudget,
      spendingGrowthRate: primaryProjection.scenario.spendingGrowthRate,
      incomeGrowthRate: primaryProjection.scenario.incomeGrowthRate,
    };

    // Calculate base spending (at year 0) for savings calculation
    const baseMonthlySpend = calculateLevelBasedSpending(
      primaryProjection.currentNetWorth.total,
      settings,
      0
    );
    const baseAnnualSpend = baseMonthlySpend * 12;

    for (let i = 0; i < primaryProjection.projections.length; i++) {
      const currentRow = primaryProjection.projections[i];
      const previousRow = i > 0 ? primaryProjection.projections[i - 1] : null;

      // Calculate yearly contribution with income growth for this year
      const incomeGrowthRate = primaryProjection.scenario.incomeGrowthRate || 0;
      const growthMultiplier = Math.pow(1 + incomeGrowthRate / 100, i);
      const yearlyContributionGrown = primaryProjection.scenario.yearlyContribution * growthMultiplier;

      // Generate 12 months for this year
      for (let month = 0; month < 12; month++) {
        // monthFraction represents progress through the year (0 = start, 1 = end)
        // For end-of-month values: Jan = 1/12, Feb = 2/12, ..., Dec = 12/12
        const monthFraction = (month + 1) / 12;
        const year = currentRow.year as number;

        // Interpolate from start of year to end of year
        // For first year, start = current net worth; for others, start = previous year's end
        const startOfYearNetWorth = i === 0 ? primaryProjection.currentNetWorth.total : previousRow!.netWorth;
        const startOfYearFiProgress = i === 0 ? 0 : previousRow!.fiProgress;

        const interpolate = (startValue: number, endValue: number) => {
          return startValue + (endValue - startValue) * monthFraction;
        };

        // Calculate interpolated age
        let interpolatedAge = currentRow.age;
        if (interpolatedAge !== null && birthYear !== null) {
          interpolatedAge = year - birthYear + monthFraction;
        }

        // Calculate interpolated net worth for this month
        const monthNetWorth = interpolate(startOfYearNetWorth, currentRow.netWorth);

        // Calculate years from now for this month (for inflation adjustment)
        const yearsFromNow = i + monthFraction;

        // Calculate monthly spending based on interpolated net worth
        const monthlySpend = calculateLevelBasedSpending(
          monthNetWorth,
          settings,
          yearsFromNow
        );
        const annualSpending = monthlySpend * 12;

        // Calculate savings: yearly contribution (with growth) minus spending increase from base
        const spendingIncrease = annualSpending - baseAnnualSpend;
        const annualSavings = yearlyContributionGrown - spendingIncrease;

        // Calculate SWR amounts based on interpolated net worth
        const monthSwrAmounts = calculateSwrAmounts(monthNetWorth, primaryProjection.scenario.swr);

        // Calculate FI target and progress based on monthly spend
        const monthFiTarget = calculateFiTarget(monthlySpend, primaryProjection.scenario.swr);
        const monthFiProgress = monthFiTarget > 0 ? (monthNetWorth / monthFiTarget) * 100 : 0;

        // Check if SWR covers spend for this month
        const monthSwrCoversSpend = monthlySpend > 0 && monthSwrAmounts.monthly >= monthlySpend;

        monthlyRows.push({
          year: year,
          displayYear: `${monthNames[month]} ${year}`,
          monthIndex: month,
          age: interpolatedAge,
          yearsFromEntry: i === 0 ? monthFraction : (i + monthFraction),
          netWorth: monthNetWorth,
          interest: currentRow.interest * monthFraction,
          contributed: currentRow.contributed * monthFraction,
          annualSwr: monthSwrAmounts.annual,
          monthlySwr: monthSwrAmounts.monthly,
          weeklySwr: monthSwrAmounts.weekly,
          dailySwr: monthSwrAmounts.daily,
          monthlySpend: monthlySpend,
          annualSpending: annualSpending,
          annualSavings: annualSavings,
          fiTarget: monthFiTarget,
          fiProgress: monthFiProgress,
          coastFiYear: currentRow.coastFiYear,
          coastFiAge: currentRow.coastFiAge,
          isFiYear: currentRow.isFiYear && month === 11, // Mark last month (December) of FI year
          isCrossover: currentRow.isCrossover && month === 11,
          swrCoversSpend: monthSwrCoversSpend,
          grossIncome: currentRow.grossIncome,
          totalTax: currentRow.totalTax,
          netIncome: currentRow.netIncome,
          preTaxContributions: currentRow.preTaxContributions,
        });
      }
    }

    return monthlyRows;
  }, [viewMode, primaryProjection.projections, primaryProjection.currentNetWorth.total, primaryProjection.scenario, birthDate, birthYear]);

  return (
    <div className="flex-1 overflow-auto space-y-4">
      {/* Summary Comparison Table */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Scenario Comparison Summary</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-800">
            <tr className="border-b border-slate-700">
              <th className="text-left text-slate-400 font-medium py-3 px-4 whitespace-nowrap w-64">Metric</th>
              {scenarioProjections.map(sp => (
                <th 
                  key={sp.scenario._id} 
                  className="text-right font-medium py-3 px-4 whitespace-nowrap min-w-[140px]"
                >
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sp.scenario.color }} />
                    <span style={{ color: sp.scenario.color }}>{sp.scenario.name}</span>
                  </div>
                </th>
              ))}
              {scenarioProjections.length > 1 && (
                <th className="text-right text-slate-400 font-medium py-3 px-4 whitespace-nowrap min-w-[120px]">
                  Difference
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((category, catIdx) => (
              <>
                {/* Category Header */}
                <tr key={`cat-${catIdx}`} className="bg-slate-900/50">
                  <td 
                    colSpan={scenarioProjections.length + (scenarioProjections.length > 1 ? 2 : 1)} 
                    className="py-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    {category.category}
                  </td>
                </tr>
                {/* Metrics */}
                {category.metrics.map((metric, metricIdx) => {
                  const values = scenarioProjections.map(sp => metric.getNumericValue(sp));
                  const validValues = values.filter((v): v is number => v !== null);
                  const best = validValues.length > 0 ? (metric.lowerIsBetter ? Math.min(...validValues) : Math.max(...validValues)) : null;
                  const worst = validValues.length > 0 ? (metric.lowerIsBetter ? Math.max(...validValues) : Math.min(...validValues)) : null;
                  
                  // Calculate difference between first and second scenario
                  const diff = scenarioProjections.length > 1 && values[0] !== null && values[1] !== null
                    ? values[0] - values[1]
                    : null;
                  
                  return (
                    <tr 
                      key={`${catIdx}-${metricIdx}`}
                      className={`border-b border-slate-700/30 hover:bg-slate-700/20 ${
                        metric.isInput ? 'bg-slate-800/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-slate-300">
                        {metric.label}
                        {metric.isInput && <span className="ml-2 text-xs text-slate-500">(input)</span>}
                      </td>
                      {scenarioProjections.map((sp, spIdx) => {
                        const numValue = metric.getNumericValue(sp);
                        const isBest = numValue !== null && numValue === best && validValues.length > 1 && !metric.isInput;
                        const isWorst = numValue !== null && numValue === worst && validValues.length > 1 && best !== worst && !metric.isInput;
                        
                        return (
                          <td 
                            key={sp.scenario._id}
                            className={`py-2.5 px-4 text-right font-mono ${
                              isBest ? 'text-emerald-400 font-semibold' : 
                              isWorst ? 'text-red-400/70' : 
                              'text-slate-300'
                            }`}
                          >
                            <span className="flex items-center justify-end gap-2">
                              {metric.getValue(sp)}
                              {isBest && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Best</span>}
                            </span>
                          </td>
                        );
                      })}
                      {scenarioProjections.length > 1 && (
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                          {diff !== null && !metric.isInput ? (
                            <span className={diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400/70' : ''}>
                              {metric.format === 'currency' && (diff > 0 ? '+' : '')}{
                                metric.format === 'currency' ? formatCurrency(diff) :
                                metric.format === 'percent' ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` :
                                metric.format === 'years' ? `${diff > 0 ? '+' : ''}${diff}y` :
                                `${diff > 0 ? '+' : ''}${diff}`
                              }
                            </span>
                          ) : '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Year-by-Year Detail Table */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-semibold text-slate-300">Year-by-Year Breakdown</h3>
            {/* Monthly/Yearly Toggle */}
            <div className="flex items-center bg-slate-700/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === 'monthly'
                    ? 'bg-slate-600 text-slate-100'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewMode('yearly')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === 'yearly'
                    ? 'bg-slate-600 text-slate-100'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowYearlyDetail(!showYearlyDetail)}
            className="hover:bg-slate-700/20 p-1 rounded transition-colors"
          >
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform ${showYearlyDetail ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {showYearlyDetail && (
          <div className="overflow-x-auto scrollbar-hide touch-pan-x">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-800 z-10">
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    {viewMode === 'monthly' ? 'Month' : 'Year'}
                  </th>
                  {birthDate && <th className="text-left text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Age</th>}
                  <th className="text-left text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    Scenario
                  </th>
                  <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    Net Worth
                  </th>
                  <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    Spending/{viewMode === 'monthly' ? 'mo' : 'yr'}
                  </th>
                  <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    Savings/{viewMode === 'monthly' ? 'mo' : 'yr'}
                  </th>
                  <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    SWR/{viewMode === 'monthly' ? 'mo' : 'yr'}
                  </th>
                  <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    FI %
                  </th>
                  {scenarioProjections.some(sp => sp.hasDynamicIncome) && (
                    <>
                      <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                        Income/{viewMode === 'monthly' ? 'mo' : 'yr'}
                      </th>
                      <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                        Taxes/{viewMode === 'monthly' ? 'mo' : 'yr'}
                      </th>
                      <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                        Net Income/{viewMode === 'monthly' ? 'mo' : 'yr'}
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, rowIndex) => {
                  const displayYearValue = row.displayYear || row.year;
                  const lookupYear = row.year;

                  // Check if any scenario hits FI this year
                  const scenarioFiStatus = scenarioProjections.map(sp => {
                    const scenarioRow = sp.projections.find(p => p.year === lookupYear);
                    return {
                      scenario: sp,
                      isFiYear: scenarioRow?.isFiYear || false,
                      swrCoversSpend: scenarioRow?.swrCoversSpend || false,
                    };
                  });
                  const anyFiYear = scenarioFiStatus.some(s => s.isFiYear);

                  // Generate unique key
                  const rowKey = `${lookupYear}-${row.monthIndex || 0}`;

                  // Return sub-rows for each scenario
                  return scenarioProjections.map((sp, scenarioIndex) => {
                    const isFirstScenario = scenarioIndex === 0;
                    const isLastScenario = scenarioIndex === scenarioProjections.length - 1;

                    // For monthly view, we need to interpolate from start to end of year
                    let netWorthValue = 0;
                    let isFiYear = false;

                    if (viewMode === 'monthly') {
                      const currentYearRow = sp.projections.find(p => p.year === lookupYear);
                      const previousYearRow = sp.projections.find(p => p.year === (lookupYear as number) - 1);

                      // monthFraction for end-of-month: Jan=1/12, Feb=2/12, ..., Dec=12/12
                      const monthFraction = ((row.monthIndex || 0) + 1) / 12;

                      if (currentYearRow) {
                        // For first year, start from current net worth; otherwise from previous year's end
                        const startOfYearNetWorth = previousYearRow ? previousYearRow.netWorth : sp.currentNetWorth.total;
                        netWorthValue = startOfYearNetWorth + (currentYearRow.netWorth - startOfYearNetWorth) * monthFraction;
                      }

                      isFiYear = (currentYearRow?.isFiYear ?? false) && (row.monthIndex || 0) === 11;
                    } else {
                      const scenarioRow = sp.projections.find(p => p.year === lookupYear);
                      netWorthValue = scenarioRow?.netWorth || 0;
                      isFiYear = scenarioRow?.isFiYear || false;
                    }

                    // Calculate other values
                    const scenarioRow = sp.projections.find(p => p.year === lookupYear);
                    const spendingValue = scenarioRow?.annualSpending || 0;
                    const spendingDisplayValue = viewMode === 'monthly' ? spendingValue / 12 : spendingValue;

                    const savings = scenarioRow?.annualSavings || 0;
                    const savingsDisplayValue = viewMode === 'monthly' ? savings / 12 : savings;

                    // SWR calculation
                    let monthlySwr = 0;
                    let swrCoversSpend = false;
                    let swrDisplayValue = 0;

                    if (viewMode === 'monthly') {
                      const currentYearRow = sp.projections.find(p => p.year === lookupYear);
                      const previousYearRow = sp.projections.find(p => p.year === (lookupYear as number) - 1);

                      if (currentYearRow) {
                        // Calculate interpolated net worth for this month
                        const monthFraction = ((row.monthIndex || 0) + 1) / 12;
                        const startOfYearNetWorth = previousYearRow ? previousYearRow.netWorth : sp.currentNetWorth.total;
                        const monthNetWorth = startOfYearNetWorth + (currentYearRow.netWorth - startOfYearNetWorth) * monthFraction;

                        // Calculate SWR based on interpolated net worth
                        const swrAmounts = calculateSwrAmounts(monthNetWorth, sp.scenario.swr);
                        monthlySwr = swrAmounts.monthly;
                        swrCoversSpend = currentYearRow.monthlySpend > 0 && monthlySwr >= currentYearRow.monthlySpend;
                        swrDisplayValue = monthlySwr;
                      }
                    } else {
                      monthlySwr = scenarioRow?.monthlySwr || 0;
                      swrCoversSpend = scenarioRow?.swrCoversSpend || false;
                      swrDisplayValue = monthlySwr * 12;
                    }

                    // FI Progress calculation
                    let fiProgress = 0;
                    if (viewMode === 'monthly') {
                      const currentYearRow = sp.projections.find(p => p.year === lookupYear);
                      const previousYearRow = sp.projections.find(p => p.year === (lookupYear as number) - 1);

                      if (currentYearRow) {
                        // Calculate interpolated net worth for this month
                        const monthFraction = ((row.monthIndex || 0) + 1) / 12;
                        const startOfYearNetWorth = previousYearRow ? previousYearRow.netWorth : sp.currentNetWorth.total;
                        const monthNetWorth = startOfYearNetWorth + (currentYearRow.netWorth - startOfYearNetWorth) * monthFraction;

                        // Calculate FI target and progress based on interpolated net worth
                        const fiTarget = calculateFiTarget(currentYearRow.monthlySpend, sp.scenario.swr);
                        fiProgress = fiTarget > 0 ? (monthNetWorth / fiTarget) * 100 : 0;
                      }
                    } else {
                      fiProgress = scenarioRow?.fiProgress || 0;
                    }

                    // Income values
                    const income = scenarioRow?.grossIncome || 0;
                    const hasIncome = sp.hasDynamicIncome && income > 0;
                    const incomeDisplayValue = viewMode === 'monthly' ? income / 12 : income;

                    const totalTax = scenarioRow?.totalTax || 0;
                    const hasTax = sp.hasDynamicIncome && totalTax > 0;
                    const taxDisplayValue = viewMode === 'monthly' ? totalTax / 12 : totalTax;

                    const netIncome = scenarioRow?.netIncome || 0;
                    const hasNetIncome = sp.hasDynamicIncome && netIncome > 0;
                    const netIncomeDisplayValue = viewMode === 'monthly' ? netIncome / 12 : netIncome;

                    return (
                      <tr
                        key={`${rowKey}-${sp.scenario._id}`}
                        className={`hover:bg-slate-700/30 ${
                          isLastScenario ? 'border-b border-slate-700/50' : 'border-b border-slate-700/20'
                        } ${
                          anyFiYear && isFirstScenario ? 'bg-emerald-900/20' : ''
                        }`}
                        style={{
                          backgroundColor: isFirstScenario && anyFiYear ? undefined : `${sp.scenario.color}08`,
                          borderLeftWidth: '3px',
                          borderLeftColor: sp.scenario.color,
                        }}
                      >
                        {/* Year/Month - only show in first scenario row */}
                        {isFirstScenario && (
                          <td
                            className="py-2 px-3 font-medium text-slate-300 align-top"
                            rowSpan={scenarioProjections.length}
                          >
                            {displayYearValue}
                          </td>
                        )}
                        {/* Age - only show in first scenario row */}
                        {isFirstScenario && birthDate && (
                          <td
                            className="py-2 px-3 text-slate-400 align-top"
                            rowSpan={scenarioProjections.length}
                          >
                            {row.age !== null && typeof row.age === 'number' ? Math.floor(row.age) : row.age}
                          </td>
                        )}
                        {/* Scenario name with color */}
                        <td className="py-2 px-3 text-sm font-medium" style={{ color: sp.scenario.color }}>
                          {sp.scenario.name}
                        </td>
                        {/* Net Worth */}
                        <td className="py-2 px-3 text-right font-mono" style={{ color: sp.scenario.color }}>
                          {formatCurrency(netWorthValue)}
                          {isFiYear && <span className="ml-1 text-xs text-emerald-400">FI</span>}
                        </td>
                        {/* Spending */}
                        <td className="py-2 px-3 text-right font-mono text-rose-400/80">
                          {formatCurrency(spendingDisplayValue)}
                        </td>
                        {/* Savings */}
                        <td className={`py-2 px-3 text-right font-mono ${
                          savings > 0 ? 'text-emerald-400/80' : 'text-slate-500'
                        }`}>
                          {formatCurrency(savingsDisplayValue)}
                        </td>
                        {/* SWR */}
                        <td className={`py-2 px-3 text-right font-mono ${
                          swrCoversSpend ? 'text-emerald-400' : 'text-amber-400/70'
                        }`}>
                          {formatCurrency(swrDisplayValue)}
                        </td>
                        {/* FI Progress */}
                        <td className={`py-2 px-3 text-right font-mono ${
                          fiProgress >= 100 ? 'text-emerald-400 font-semibold' : 'text-violet-400'
                        }`}>
                          {fiProgress.toFixed(1)}%
                        </td>
                        {/* Income columns (only if any scenario has income data) */}
                        {scenarioProjections.some(sp => sp.hasDynamicIncome) && (
                          <>
                            <td className={`py-2 px-3 text-right font-mono ${
                              hasIncome ? 'text-sky-400/80' : 'text-slate-500'
                            }`}>
                              {hasIncome ? formatCurrency(incomeDisplayValue) : '-'}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono ${
                              hasTax ? 'text-red-400/80' : 'text-slate-500'
                            }`}>
                              {hasTax ? formatCurrency(taxDisplayValue) : '-'}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono ${
                              hasNetIncome ? 'text-emerald-400/80' : 'text-slate-500'
                            }`}>
                              {hasNetIncome ? formatCurrency(netIncomeDisplayValue) : '-'}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Custom tooltip for unified chart
function UnifiedChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  // Group payload by scenario
  const scenarioData: Record<string, any> = {};
  payload.forEach((item: any) => {
    const [scenarioName, metricType] = item.dataKey.split('_');
    if (!scenarioData[scenarioName]) {
      scenarioData[scenarioName] = {
        color: item.stroke,
        data: {}
      };
    }
    scenarioData[scenarioName].data[metricType] = item.value;
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
                <span className="text-emerald-400 font-mono">{data.data.fiProgress.toFixed(1)}%</span>
              </div>
            )}
            {data.data.netWorth !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Net Worth:</span>
                <span className="text-sky-400 font-mono">{formatCurrency(data.data.netWorth)}</span>
              </div>
            )}
            {data.data.spending !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Monthly Spending:</span>
                <span className="text-amber-400 font-mono">{formatCurrency(data.data.spending)}</span>
              </div>
            )}
            {data.data.savings !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Annual Savings:</span>
                <span className="text-violet-400 font-mono">{formatCurrency(data.data.savings)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

type MetricType = 'fiProgress' | 'netWorth' | 'spending' | 'savings';

interface MetricConfig {
  key: MetricType;
  label: string;
  yAxisId: 'left' | 'right';
  color: string;
  formatter: (value: number) => string;
}

const METRICS: MetricConfig[] = [
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
    label: 'Monthly Spending',
    yAxisId: 'left',
    color: '#f59e0b',
    formatter: (v) => formatCurrency(v)
  },
  {
    key: 'savings',
    label: 'Annual Savings',
    yAxisId: 'left',
    color: '#8b5cf6',
    formatter: (v) => formatCurrency(v)
  },
];

function ProjectionsChart({
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
  const [selectedMetrics, setSelectedMetrics] = React.useState<Set<MetricType>>(new Set(['fiProgress']));
  const [zoomDomain, setZoomDomain] = React.useState<[number, number] | null>(null);

  if (scenarioProjections.length === 0) {
    return <div className="text-slate-400">No projection data available</div>
  }

  // Prepare unified chart data with all metrics for all scenarios
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
        yearData[`${sp.scenario.name}_spending`] = proj.monthlySpend;
        yearData[`${sp.scenario.name}_savings`] = proj.annualSavings;
      });
    });

    return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
  }, [scenarioProjections]);

  const toggleMetric = (metric: MetricType) => {
    const newMetrics = new Set(selectedMetrics);
    if (newMetrics.has(metric)) {
      newMetrics.delete(metric);
    } else {
      newMetrics.add(metric);
    }
    setSelectedMetrics(newMetrics);
  };

  // Determine which Y-axes to show based on selected metrics
  const showLeftAxis = Array.from(selectedMetrics).some(m =>
    METRICS.find(metric => metric.key === m)?.yAxisId === 'left'
  );
  const showRightAxis = Array.from(selectedMetrics).some(m =>
    METRICS.find(metric => metric.key === m)?.yAxisId === 'right'
  );

  // Filter data based on zoom
  const displayData = zoomDomain
    ? unifiedChartData.filter(d => d.year >= zoomDomain[0] && d.year <= zoomDomain[1])
    : unifiedChartData;

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

        {/* Metric Toggles */}
        <div className="flex flex-wrap gap-3">
          {METRICS.map(metric => (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedMetrics.has(metric.key)
                  ? 'bg-slate-700 text-white border-2'
                  : 'bg-slate-800/50 text-slate-400 border-2 border-transparent hover:border-slate-600'
              }`}
              style={selectedMetrics.has(metric.key) ? { borderColor: metric.color, color: metric.color } : {}}
            >
              {metric.label}
            </button>
          ))}
        </div>

        {selectedMetrics.size === 0 ? (
          <div className="text-center py-12 text-slate-400">
            Select at least one metric to display
          </div>
        ) : (
          <>
            {/* Main Unified Chart */}
            <div className="w-full h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#94a3b8" />

                  {showLeftAxis && (
                    <YAxis
                      yAxisId="left"
                      stroke="#94a3b8"
                      tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`}
                    />
                  )}

                  {showRightAxis && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#94a3b8"
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 'auto']}
                    />
                  )}

                  <Tooltip content={<UnifiedChartTooltip />} />
                  <Legend />

                  {/* Add reference line for 100% FI if FI Progress is selected */}
                  {selectedMetrics.has('fiProgress') && (
                    <ReferenceLine
                      yAxisId="right"
                      y={100}
                      stroke="#10b981"
                      strokeDasharray="3 3"
                      label={{ value: '100% FI', position: 'right', fill: '#10b981' }}
                    />
                  )}

                  {/* Render lines for each selected metric for each scenario */}
                  {scenarioProjections.map((sp, scenarioIndex) => (
                    Array.from(selectedMetrics).map(metricKey => {
                      const metric = METRICS.find(m => m.key === metricKey)!;
                      const dataKey = `${sp.scenario.name}_${metricKey}`;

                      return (
                        <Line
                          key={dataKey}
                          type="monotone"
                          dataKey={dataKey}
                          name={`${sp.scenario.name} - ${metric.label}`}
                          stroke={sp.scenario.color}
                          strokeWidth={scenarioIndex === 0 ? 3 : 2}
                          strokeDasharray={scenarioIndex === 0 ? undefined : "5 5"}
                          dot={false}
                          yAxisId={metric.yAxisId}
                          isAnimationActive={false}
                        />
                      );
                    })
                  ))}

                  {/* Brush for zooming */}
                  <Brush
                    dataKey="year"
                    height={30}
                    stroke="#475569"
                    fill="#1e293b"
                    onChange={(domain: any) => {
                      if (domain?.startIndex !== undefined && domain?.endIndex !== undefined) {
                        const start = displayData[domain.startIndex]?.year;
                        const end = displayData[domain.endIndex]?.year;
                        if (start && end) {
                          setZoomDomain([start, end]);
                        }
                      }
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Zoom Reset Button */}
            {zoomDomain && (
              <div className="flex justify-center">
                <button
                  onClick={() => setZoomDomain(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Reset Zoom
                </button>
              </div>
            )}
          </>
        )}

        {/* FI Timeline Comparison */}
        <div>
          <h3 className="text-lg font-medium text-slate-200 mb-4">Financial Independence Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarioProjections.map(sp => (
              <div
                key={sp.scenario._id}
                className="bg-slate-900/50 rounded-xl p-4 border-l-4"
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
                    <span className="text-sky-400">{formatCurrency(sp.scenario.yearlyContribution)}/yr</span>
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

// ============================================================================
// LEVELS TAB
// ============================================================================

interface LevelsTabProps {
  latestEntry: ReturnType<typeof useScenarios>['latestEntry'];
  primaryProjection: ScenarioProjection | null;
  setActiveTab: (tab: Tab) => void;
}

function LevelsTab({
  latestEntry,
  primaryProjection,
  setActiveTab,
}: LevelsTabProps) {
  if (!latestEntry || !primaryProjection) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
          Spending Levels
        </h1>
        <p className="text-slate-400 text-center mb-8">
          Unlock higher monthly spending as your net worth grows
        </p>
        <div className="text-center py-12">
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

  const { levelInfo, scenario } = primaryProjection;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
        Spending Levels
      </h1>
      <p className="text-slate-400 text-center mb-8">
        Unlock higher monthly spending as your net worth grows
      </p>

      {/* Budget Summary */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: scenario.color }} />
              <span className="text-sm text-slate-300 font-medium">{scenario.name}</span>
            </div>
            <p className="text-sm text-slate-300">
              Budget Formula: <span className="text-amber-400">{formatCurrency(levelInfo.baseBudgetInflationAdjusted)} base</span> + <span className="text-emerald-400">{formatCurrency(levelInfo.netWorthPortion)} from net worth</span> = <span className="text-violet-400 font-mono">{formatCurrency(levelInfo.unlockedAtNetWorth)}/mo</span>
            </p>
          </div>
          <button
            onClick={() => setActiveTab('scenarios')}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            Edit Scenario
          </button>
        </div>
      </div>

      {/* Current Level Hero Card */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur rounded-2xl p-8 shadow-xl border border-violet-500/30 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-400 text-sm mb-1">Current Level</p>
            <h2 className="text-3xl font-bold text-white">
              Level {levelInfo.currentLevel.level}: {levelInfo.currentLevel.name}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm mb-1">Net Worth</p>
            <p className="text-2xl font-mono text-emerald-400">{formatCurrency(levelInfo.netWorth)}</p>
          </div>
        </div>

        {/* Progress to Next Level */}
        {levelInfo.nextLevel ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Progress to Level {levelInfo.nextLevel.level}: {levelInfo.nextLevel.name}</span>
              <span className="text-slate-300 text-sm font-mono">
                {formatCurrency(levelInfo.amountToNext)} to go
              </span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${levelInfo.progressToNext}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>{formatCurrency(levelInfo.currentLevel.threshold)}</span>
              <span className="text-violet-400">{levelInfo.progressToNext.toFixed(1)}%</span>
              <span>{formatCurrency(levelInfo.nextLevel.threshold)}</span>
            </div>
          </div>
        ) : (
          <div className="mb-6 text-center py-4">
            <span className="text-2xl">🎉</span>
            <p className="text-violet-400 font-medium mt-2">Maximum Level Achieved!</p>
          </div>
        )}

        {/* Unlocked Spending Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-xl p-4">
            <p className="text-slate-500 text-xs mb-1">Your Unlocked Monthly Budget</p>
            <p className="text-3xl font-mono text-violet-400">{formatCurrency(levelInfo.unlockedAtNetWorth)}</p>
            <div className="mt-2 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Base (inflation-adjusted):</span>
                <span className="font-mono text-amber-400">{formatCurrency(levelInfo.baseBudgetInflationAdjusted)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>From net worth ({(levelInfo.spendingRate * 100).toFixed(1)}%):</span>
                <span className="font-mono text-emerald-400">+{formatCurrency(levelInfo.netWorthPortion)}</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4">
            <p className="text-slate-500 text-xs mb-1">Annual Budget</p>
            <p className="text-3xl font-mono text-violet-400">{formatCurrency(levelInfo.unlockedAtNetWorth * 12)}</p>
            <p className="text-slate-600 text-xs mt-2">
              Based on {scenario.name} scenario settings
            </p>
          </div>
        </div>
      </div>

      {/* All Levels Table */}
      <h3 className="text-xl font-semibold text-slate-200 mb-4">All Levels</h3>
      <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden max-h-[70vh] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="w-full text-sm">
          <thead className="bg-slate-800 sticky top-0 z-10">
            <tr className="border-b border-slate-700">
              <th className="text-left text-slate-400 font-medium py-3 px-4">Level</th>
              <th className="text-right text-slate-400 font-medium py-3 px-4">Net Worth Required</th>
              <th className="text-right text-slate-400 font-medium py-3 px-4">Monthly Budget</th>
              <th className="text-right text-slate-400 font-medium py-3 px-4">Annual Budget</th>
            </tr>
          </thead>
          <tbody>
            {levelInfo.levelsWithStatus.map((level) => (
              <tr 
                key={level.level}
                className={`border-b border-slate-700/50 ${
                  level.isCurrent ? 'bg-violet-500/10' : level.isUnlocked ? 'bg-emerald-500/5' : ''
                } ${level.isNext ? 'bg-violet-500/5' : ''}`}
              >
                <td className="py-2 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      level.isCurrent
                        ? 'bg-violet-500/30 text-violet-300'
                        : level.isUnlocked
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : level.isNext
                            ? 'bg-violet-500/10 text-violet-400'
                            : 'bg-slate-700/50 text-slate-500'
                    }`}>
                      {level.level}
                    </span>
                    <span className={`font-medium ${level.isUnlocked ? 'text-slate-200' : 'text-slate-500'}`}>
                      {level.name}
                    </span>
                    {level.isCurrent && <span className="text-xs text-violet-400">← Current</span>}
                    {level.isNext && <span className="text-xs text-violet-400/70">← Next</span>}
                  </div>
                </td>
                <td className="py-2 px-4 text-right font-mono text-slate-400">
                  {level.threshold === 0 ? '-' : formatCurrency(level.threshold, 0)}
                </td>
                <td className={`py-2 px-4 text-right font-mono ${
                  level.isCurrent ? 'text-violet-400 font-semibold' : level.isUnlocked ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {formatCurrency(level.monthlyBudget, 0)}
                </td>
                <td className={`py-2 px-4 text-right font-mono ${
                  level.isCurrent ? 'text-violet-400/80' : level.isUnlocked ? 'text-emerald-400/80' : 'text-slate-600'
                }`}>
                  {formatCurrency(level.monthlyBudget * 12, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// TAX CALCULATION DETAILS COMPONENT
// Shows the full breakdown of how taxes are calculated
// ============================================================================

interface TaxCalculationDetailsProps {
  taxes: TaxCalculation;
  isExpanded?: boolean;
  onToggle?: () => void;
}

function TaxCalculationDetails({ taxes, isExpanded = false, onToggle }: TaxCalculationDetailsProps) {
  const [expanded, setExpanded] = useState(isExpanded);
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
    onToggle?.();
  };

  const stateName = taxes.stateCode ? STATE_TAX_INFO[taxes.stateCode]?.name || taxes.stateCode : null;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-red-500/30 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={toggleExpanded}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold text-slate-200">Tax Calculation Details</h4>
            <p className="text-xs text-slate-500">See exactly how your {formatCurrency(taxes.totalTax)} tax burden is calculated</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-700 p-4 space-y-6">
          {/* Summary Overview */}
          <div className="grid grid-cols-3 gap-4 text-center pb-4 border-b border-slate-700">
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Gross Income</p>
              <p className="text-lg font-mono text-slate-200">{formatCurrency(taxes.grossIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Total Tax</p>
              <p className="text-lg font-mono text-red-400">{formatCurrency(taxes.totalTax)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Net Income</p>
              <p className="text-lg font-mono text-emerald-400">{formatCurrency(taxes.netIncome)}</p>
            </div>
          </div>

          {/* Step 1: Pre-tax Deductions */}
          {taxes.totalPreTaxContributions > 0 && (
            <div>
              <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Pre-tax Deductions
              </h5>
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Gross Income</span>
                  <span className="font-mono text-slate-200">{formatCurrency(taxes.grossIncome)}</span>
                </div>
                {taxes.preTaxContributions.traditional401k > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">− 401(k) Contribution</span>
                    <span className="font-mono text-emerald-400">−{formatCurrency(taxes.preTaxContributions.traditional401k)}</span>
                  </div>
                )}
                {taxes.preTaxContributions.traditionalIRA > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">− Traditional IRA</span>
                    <span className="font-mono text-emerald-400">−{formatCurrency(taxes.preTaxContributions.traditionalIRA)}</span>
                  </div>
                )}
                {taxes.preTaxContributions.hsa > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">− HSA Contribution</span>
                    <span className="font-mono text-emerald-400">−{formatCurrency(taxes.preTaxContributions.hsa)}</span>
                  </div>
                )}
                {taxes.preTaxContributions.other > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">− Other Pre-tax</span>
                    <span className="font-mono text-emerald-400">−{formatCurrency(taxes.preTaxContributions.other)}</span>
                  </div>
                )}
                <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                  <span className="text-slate-300">Adjusted Gross Income (AGI)</span>
                  <span className="font-mono text-slate-200">{formatCurrency(taxes.adjustedGrossIncome)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Federal Tax */}
          <div>
            <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">
                {taxes.totalPreTaxContributions > 0 ? '2' : '1'}
              </span>
              Federal Income Tax
            </h5>
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
              {/* Standard Deduction */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    {taxes.totalPreTaxContributions > 0 ? 'Adjusted Gross Income' : 'Gross Income'}
                  </span>
                  <span className="font-mono text-slate-200">
                    {formatCurrency(taxes.totalPreTaxContributions > 0 ? taxes.adjustedGrossIncome : taxes.grossIncome)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">− Standard Deduction ({taxes.filingStatus.replace('_', ' ')})</span>
                  <span className="font-mono text-blue-400">−{formatCurrency(taxes.federalStandardDeduction)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                  <span className="text-slate-300">Federal Taxable Income</span>
                  <span className="font-mono text-slate-200">{formatCurrency(taxes.federalTaxableIncome)}</span>
                </div>
              </div>

              {/* Bracket Breakdown */}
              {taxes.federalBracketBreakdown.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 uppercase mb-2">Federal Tax Brackets</p>
                  <div className="space-y-1">
                    {taxes.federalBracketBreakdown.map((bracket, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="w-16 text-slate-500">
                          {formatPercent(bracket.rate, 0)} rate
                        </div>
                        <div className="flex-1 h-5 bg-slate-800 rounded relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-blue-500/30 rounded"
                            style={{
                              width: `${Math.min(100, (bracket.taxableInBracket / taxes.federalTaxableIncome) * 100)}%`
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-between px-2">
                            <span className="text-slate-400">
                              {formatCurrency(bracket.bracketMin, 0)} – {bracket.bracketMax === Infinity ? '∞' : formatCurrency(bracket.bracketMax, 0)}
                            </span>
                            <span className="text-slate-300 font-mono">{formatCurrency(bracket.taxableInBracket, 0)}</span>
                          </div>
                        </div>
                        <div className="w-20 text-right font-mono text-red-400">
                          {formatCurrency(bracket.taxFromBracket)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Federal Tax Total */}
              <div className="border-t border-slate-700 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-slate-300">Federal Tax</span>
                    <span className="text-xs text-slate-500 ml-2">
                      (Marginal: {formatPercent(taxes.marginalFederalRate)} • Effective: {formatPercent(taxes.effectiveFederalRate)})
                    </span>
                  </div>
                  <span className="text-lg font-mono text-red-400">{formatCurrency(taxes.federalTax)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: State Tax */}
          <div>
            <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">
                {taxes.totalPreTaxContributions > 0 ? '3' : '2'}
              </span>
              State Income Tax {stateName && <span className="text-slate-500 font-normal">({stateName})</span>}
            </h5>
            <div className="bg-slate-900/50 rounded-lg p-4">
              {taxes.stateTaxType === 'none' ? (
                <div className="text-center py-4">
                  <p className="text-emerald-400 font-medium">No State Income Tax</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stateName || 'Your state'} does not have a state income tax
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* State Deductions */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Adjusted Gross Income</span>
                      <span className="font-mono text-slate-200">{formatCurrency(taxes.adjustedGrossIncome)}</span>
                    </div>
                    {taxes.stateStandardDeduction > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">− State Standard Deduction</span>
                        <span className="font-mono text-purple-400">−{formatCurrency(taxes.stateStandardDeduction)}</span>
                      </div>
                    )}
                    {taxes.statePersonalExemption > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">− Personal Exemption</span>
                        <span className="font-mono text-purple-400">−{formatCurrency(taxes.statePersonalExemption)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                      <span className="text-slate-300">State Taxable Income</span>
                      <span className="font-mono text-slate-200">{formatCurrency(taxes.stateTaxableIncome)}</span>
                    </div>
                  </div>

                  {/* State Bracket Breakdown */}
                  {taxes.stateBracketBreakdown.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-slate-500 uppercase mb-2">
                        {taxes.stateTaxType === 'flat' ? 'Flat Rate' : 'State Tax Brackets'}
                      </p>
                      <div className="space-y-1">
                        {taxes.stateBracketBreakdown.map((bracket, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <div className="w-16 text-slate-500">
                              {formatPercent(bracket.rate, 1)} rate
                            </div>
                            <div className="flex-1 h-5 bg-slate-800 rounded relative overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 bg-purple-500/30 rounded"
                                style={{
                                  width: `${Math.min(100, taxes.stateTaxableIncome > 0 ? (bracket.taxableInBracket / taxes.stateTaxableIncome) * 100 : 0)}%`
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-between px-2">
                                <span className="text-slate-400">
                                  {taxes.stateTaxType === 'flat' ? 'All income' : 
                                    `${formatCurrency(bracket.bracketMin, 0)} – ${bracket.bracketMax === Infinity ? '∞' : formatCurrency(bracket.bracketMax, 0)}`
                                  }
                                </span>
                                <span className="text-slate-300 font-mono">{formatCurrency(bracket.taxableInBracket, 0)}</span>
                              </div>
                            </div>
                            <div className="w-20 text-right font-mono text-red-400">
                              {formatCurrency(bracket.taxFromBracket)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* State Tax Total */}
                  <div className="border-t border-slate-700 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium text-slate-300">State Tax</span>
                        <span className="text-xs text-slate-500 ml-2">
                          (Marginal: {formatPercent(taxes.marginalStateRate)} • Effective: {formatPercent(taxes.effectiveStateRate)})
                        </span>
                      </div>
                      <span className="text-lg font-mono text-red-400">{formatCurrency(taxes.stateTax)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 4: FICA Taxes */}
          <div>
            <h5 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-xs font-bold">
                {taxes.totalPreTaxContributions > 0 ? '4' : '3'}
              </span>
              FICA Taxes (Social Security + Medicare)
            </h5>
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-4">
              {/* Social Security */}
              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">Social Security ({formatPercent(taxes.fica.socialSecurityRate)})</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Wages Subject to SS</span>
                    <span className="font-mono text-slate-200">
                      {formatCurrency(taxes.fica.socialSecurityWages)}
                      {taxes.fica.wagesAboveSsCap > 0 && (
                        <span className="text-slate-500 text-xs ml-1">(capped at {formatCurrency(taxes.fica.socialSecurityWageCap)})</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">× {formatPercent(taxes.fica.socialSecurityRate)} rate</span>
                    <span className="font-mono text-red-400">{formatCurrency(taxes.fica.socialSecurityTax)}</span>
                  </div>
                  {taxes.fica.wagesAboveSsCap > 0 && (
                    <p className="text-xs text-emerald-400">
                      You saved {formatCurrency(taxes.fica.wagesAboveSsCap * (taxes.fica.socialSecurityRate / 100))} because {formatCurrency(taxes.fica.wagesAboveSsCap)} of your income exceeds the SS wage cap
                    </p>
                  )}
                </div>
              </div>

              {/* Medicare */}
              <div className="border-t border-slate-700 pt-4">
                <p className="text-xs text-slate-500 uppercase mb-2">Medicare</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">All Wages × {formatPercent(taxes.fica.medicareBaseRate)} base rate</span>
                    <span className="font-mono text-red-400">{formatCurrency(taxes.fica.medicareBaseTax)}</span>
                  </div>
                  {taxes.fica.additionalMedicareTax > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          Wages above {formatCurrency(taxes.fica.additionalMedicareThreshold)} × {formatPercent(taxes.fica.additionalMedicareRate)} additional rate
                        </span>
                        <span className="font-mono text-red-400">{formatCurrency(taxes.fica.additionalMedicareTax)}</span>
                      </div>
                      <p className="text-xs text-amber-400">
                        Additional Medicare Tax applies to {formatCurrency(taxes.fica.additionalMedicareWages)} of income above the {formatCurrency(taxes.fica.additionalMedicareThreshold)} threshold
                      </p>
                    </>
                  )}
                  <div className="flex justify-between text-sm font-medium border-t border-slate-700 pt-2">
                    <span className="text-slate-300">Total Medicare Tax</span>
                    <span className="font-mono text-red-400">{formatCurrency(taxes.fica.totalMedicareTax)}</span>
                  </div>
                </div>
              </div>

              {/* FICA Total */}
              <div className="border-t border-slate-700 pt-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-slate-300">Total FICA</span>
                    <span className="text-xs text-slate-500 ml-2">
                      (Effective: {formatPercent(taxes.fica.effectiveFicaRate)})
                    </span>
                  </div>
                  <span className="text-lg font-mono text-red-400">{formatCurrency(taxes.fica.totalFicaTax)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Final Summary */}
          <div className="bg-gradient-to-br from-red-500/10 to-amber-500/10 rounded-lg p-4 border border-red-500/30">
            <h5 className="text-sm font-medium text-slate-200 mb-3">Tax Summary</h5>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Federal Income Tax</span>
                <span className="font-mono text-red-400">{formatCurrency(taxes.federalTax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">State Income Tax</span>
                <span className="font-mono text-red-400">{formatCurrency(taxes.stateTax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Social Security</span>
                <span className="font-mono text-red-400">{formatCurrency(taxes.fica.socialSecurityTax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Medicare</span>
                <span className="font-mono text-red-400">{formatCurrency(taxes.fica.totalMedicareTax)}</span>
              </div>
              <div className="border-t border-red-500/30 pt-2 mt-2 flex justify-between font-medium">
                <span className="text-slate-200">Total Tax Burden</span>
                <span className="text-lg font-mono text-red-400">{formatCurrency(taxes.totalTax)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Effective Total Tax Rate</span>
                <span className="font-mono">{formatPercent(taxes.effectiveTotalRate)}</span>
              </div>
            </div>
          </div>

          {/* Net Income */}
          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/30">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-emerald-400">Net Income After Taxes</span>
                <p className="text-xs text-slate-500 mt-1">
                  {formatCurrency(taxes.monthlyNetIncome)}/month • {formatCurrency(taxes.monthlyNetIncome / 4.33)}/week
                </p>
              </div>
              <span className="text-2xl font-mono text-emerald-400">{formatCurrency(taxes.netIncome)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SCENARIOS TAB - Step-by-Step Scenario Builder
// ============================================================================

type WizardStep = 'list' | 'income' | 'filing' | 'pretax' | 'spending' | 'investments' | 'summary';

interface ScenarioWizardState {
  name: string;
  grossIncome: string;
  incomeGrowthRate: string;
  filingStatus: FilingStatus;
  stateCode: string;
  preTax401k: string;
  preTaxIRA: string;
  preTaxHSA: string;
  preTaxOther: string;
  baseMonthlyBudget: string;
  spendingGrowthRate: string;
  currentRate: string;
  swr: string;
  inflationRate: string;
}

const DEFAULT_WIZARD_STATE: ScenarioWizardState = {
  name: '',
  grossIncome: '',
  incomeGrowthRate: '3',
  filingStatus: 'single',
  stateCode: '',
  preTax401k: '',
  preTaxIRA: '',
  preTaxHSA: '',
  preTaxOther: '',
  baseMonthlyBudget: '3000',
  spendingGrowthRate: '2',
  currentRate: '7',
  swr: '4',
  inflationRate: '3',
};

interface ScenariosTabProps {
  scenariosHook: ReturnType<typeof useScenarios>;
}

function ScenariosTab({ scenariosHook }: ScenariosTabProps) {
  const [wizardStep, setWizardStep] = useState<WizardStep>('list');
  const [wizardState, setWizardState] = useState<ScenarioWizardState>(DEFAULT_WIZARD_STATE);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [quickEditScenario, setQuickEditScenario] = useState<Scenario | null>(null);

  // Get current net worth for context
  const currentNetWorth = scenariosHook.scenarioProjections[0]?.currentNetWorth.total || 0;

  // Calculate income breakdown in real-time as user fills wizard
  // Uses total unlocked spending (base + net worth portion)
  const incomeBreakdown = useMemo((): ScenarioIncomeBreakdown | null => {
    const gross = parseFloat(wizardState.grossIncome) || 0;
    if (gross <= 0) return null;
    
    const baseBudget = parseFloat(wizardState.baseMonthlyBudget) || 3000;
    const spendingRate = parseFloat(wizardState.spendingGrowthRate) || 0;
    const netWorthPortion = currentNetWorth * (spendingRate / 100) / 12;
    const totalUnlockedSpending = baseBudget + netWorthPortion;
    
    return calculateScenarioIncome(
      gross,
      wizardState.filingStatus,
      wizardState.stateCode || null,
      {
        traditional401k: parseFloat(wizardState.preTax401k) || 0,
        traditionalIRA: parseFloat(wizardState.preTaxIRA) || 0,
        hsa: parseFloat(wizardState.preTaxHSA) || 0,
        other: parseFloat(wizardState.preTaxOther) || 0,
      },
      totalUnlockedSpending,
      currentNetWorth
    );
  }, [wizardState, currentNetWorth]);

  const resetWizard = () => {
    setWizardState(DEFAULT_WIZARD_STATE);
    setWizardStep('list');
    setEditingScenarioId(null);
  };

  const startNewScenario = () => {
    setWizardState(DEFAULT_WIZARD_STATE);
    setEditingScenarioId(null);
    setWizardStep('income');
  };

  const startEditingScenario = (scenario: Scenario) => {
    setWizardState({
      name: scenario.name,
      grossIncome: scenario.grossIncome?.toString() || '',
      incomeGrowthRate: scenario.incomeGrowthRate?.toString() || '3',
      filingStatus: (scenario.filingStatus as FilingStatus) || 'single',
      stateCode: scenario.stateCode || '',
      preTax401k: scenario.preTax401k?.toString() || '',
      preTaxIRA: scenario.preTaxIRA?.toString() || '',
      preTaxHSA: scenario.preTaxHSA?.toString() || '',
      preTaxOther: scenario.preTaxOther?.toString() || '',
      baseMonthlyBudget: scenario.baseMonthlyBudget.toString(),
      spendingGrowthRate: scenario.spendingGrowthRate.toString(),
      currentRate: scenario.currentRate.toString(),
      swr: scenario.swr.toString(),
      inflationRate: scenario.inflationRate.toString(),
    });
    setEditingScenarioId(scenario._id);
    setWizardStep('income');
  };

  const handleSaveScenario = async () => {
    // Calculate total yearly contribution from pre-tax + post-tax savings
    // This is the INITIAL contribution - projections will recalculate dynamically
    const totalPreTax = (parseFloat(wizardState.preTax401k) || 0) +
                        (parseFloat(wizardState.preTaxIRA) || 0) +
                        (parseFloat(wizardState.preTaxHSA) || 0) +
                        (parseFloat(wizardState.preTaxOther) || 0);
    const postTaxSavings = incomeBreakdown?.postTaxSavingsAvailable || 0;
    const totalYearlySavings = totalPreTax + postTaxSavings;

    const scenarioData = {
      name: wizardState.name.trim() || `Scenario ${new Date().toLocaleDateString()}`,
      currentRate: parseFloat(wizardState.currentRate) || 7,
      swr: parseFloat(wizardState.swr) || 4,
      yearlyContribution: Math.max(0, totalYearlySavings),
      inflationRate: parseFloat(wizardState.inflationRate) || 3,
      baseMonthlyBudget: parseFloat(wizardState.baseMonthlyBudget) || 3000,
      spendingGrowthRate: parseFloat(wizardState.spendingGrowthRate) || 2,
      grossIncome: parseFloat(wizardState.grossIncome) || undefined,
      incomeGrowthRate: parseFloat(wizardState.incomeGrowthRate) || undefined,
      filingStatus: wizardState.filingStatus,
      stateCode: wizardState.stateCode || undefined,
      preTax401k: parseFloat(wizardState.preTax401k) || undefined,
      preTaxIRA: parseFloat(wizardState.preTaxIRA) || undefined,
      preTaxHSA: parseFloat(wizardState.preTaxHSA) || undefined,
      preTaxOther: parseFloat(wizardState.preTaxOther) || undefined,
      effectiveTaxRate: incomeBreakdown?.taxes.effectiveTotalRate,
    };

    if (editingScenarioId) {
      await scenariosHook.updateScenario(editingScenarioId as any, scenarioData);
    } else {
      await scenariosHook.createScenario(scenarioData);
    }
    
    resetWizard();
  };

  const applyInvestmentTemplate = (template: typeof SCENARIO_TEMPLATES[number]) => {
    setWizardState(prev => ({
      ...prev,
      currentRate: template.currentRate.toString(),
      swr: template.swr.toString(),
      inflationRate: template.inflationRate.toString(),
    }));
  };

  // Wizard step navigation
  const STEPS: WizardStep[] = ['income', 'filing', 'pretax', 'spending', 'investments', 'summary'];
  const currentStepIndex = STEPS.indexOf(wizardStep);
  const canGoNext = currentStepIndex < STEPS.length - 1;
  const canGoBack = currentStepIndex > 0;
  const goNext = () => canGoNext && setWizardStep(STEPS[currentStepIndex + 1]);
  const goBack = () => canGoBack && setWizardStep(STEPS[currentStepIndex - 1]);

  // Show scenario list if not in wizard
  if (wizardStep === 'list') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
          Scenario Builder
        </h1>
        <p className="text-slate-400 text-center mb-8">
          Build scenarios step-by-step to understand your financial picture
        </p>

        {/* Personal Info */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
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
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Create New Scenario CTA */}
        <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl p-8 mb-6 border border-violet-500/30 text-center">
          <h3 className="text-xl font-semibold text-slate-200 mb-2">Build a New Scenario</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Answer a few questions about your income, taxes, spending, and investment assumptions to create a personalized financial projection.
          </p>
          <button
            onClick={startNewScenario}
            className="px-6 py-3 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors font-medium"
          >
            Start Building
          </button>
        </div>

        {/* Existing Scenarios */}
        {scenariosHook.scenarios.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Your Scenarios</h3>
            <div className="space-y-2">
              {scenariosHook.scenarios.map(scenario => (
                <div key={scenario._id} className={`flex items-center justify-between p-4 rounded-lg border ${scenario.isSelected ? 'bg-slate-900/50 border-slate-600' : 'bg-slate-900/20 border-slate-700/50 opacity-60'}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => scenariosHook.toggleSelected(scenario._id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center ${scenario.isSelected ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-500'}`}>
                      {scenario.isSelected && <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </button>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: scenario.color }} />
                    <div className="min-w-0">
                      <span className="font-medium text-slate-200">{scenario.name}</span>
                      <div className="flex gap-3 text-xs text-slate-500 mt-1">
                        <span>Saves: <span className="text-sky-400">{formatCurrency(scenario.yearlyContribution)}/yr</span></span>
                        {scenario.grossIncome && <span>Income: <span className="text-emerald-400">{formatCurrency(scenario.grossIncome)}</span></span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQuickEditScenario(scenario)} className="p-1.5 text-slate-400 hover:text-emerald-400 rounded" title="Quick Edit">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    </button>
                    <button onClick={() => startEditingScenario(scenario)} className="p-1.5 text-slate-400 hover:text-violet-400 rounded" title="Full Wizard">
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

        {/* Quick Edit Panel */}
        {quickEditScenario && typeof document !== 'undefined' && createPortal(
          <QuickEditPanel
            scenario={quickEditScenario}
            onClose={() => setQuickEditScenario(null)}
            onSave={async (updates) => {
              await scenariosHook.updateScenario(quickEditScenario._id, updates);
              setQuickEditScenario(null);
            }}
            currentNetWorth={currentNetWorth}
          />,
          document.body
        )}
      </div>
    );
  }

  // Quick Edit Panel Component
  function QuickEditPanel({ 
    scenario, 
    onClose, 
    onSave,
    currentNetWorth 
  }: { 
    scenario: Scenario; 
    onClose: () => void; 
    onSave: (updates: any) => Promise<void>;
    currentNetWorth: number;
  }) {
    const [form, setForm] = useState({
      name: scenario.name,
      grossIncome: scenario.grossIncome?.toString() || '',
      incomeGrowthRate: scenario.incomeGrowthRate?.toString() || '3',
      filingStatus: scenario.filingStatus || 'single',
      stateCode: scenario.stateCode || '',
      preTax401k: scenario.preTax401k?.toString() || '',
      preTaxIRA: scenario.preTaxIRA?.toString() || '',
      preTaxHSA: scenario.preTaxHSA?.toString() || '',
      baseMonthlyBudget: scenario.baseMonthlyBudget.toString(),
      spendingGrowthRate: scenario.spendingGrowthRate.toString(),
      currentRate: scenario.currentRate.toString(),
      swr: scenario.swr.toString(),
      inflationRate: scenario.inflationRate.toString(),
    });
    const [saving, setSaving] = useState(false);

    // Calculate live income breakdown
    const liveBreakdown = useMemo(() => {
      const gross = parseFloat(form.grossIncome) || 0;
      if (gross <= 0) return null;
      
      const baseBudget = parseFloat(form.baseMonthlyBudget) || 3000;
      const spendingRate = parseFloat(form.spendingGrowthRate) || 0;
      const netWorthPortion = currentNetWorth * (spendingRate / 100) / 12;
      const totalSpending = baseBudget + netWorthPortion;
      
      return calculateScenarioIncome(
        gross,
        form.filingStatus as FilingStatus,
        form.stateCode || null,
        {
          traditional401k: parseFloat(form.preTax401k) || 0,
          traditionalIRA: parseFloat(form.preTaxIRA) || 0,
          hsa: parseFloat(form.preTaxHSA) || 0,
          other: 0,
        },
        totalSpending,
        currentNetWorth
      );
    }, [form, currentNetWorth]);

    const handleSave = async () => {
      setSaving(true);
      try {
        const totalPreTax = (parseFloat(form.preTax401k) || 0) +
                            (parseFloat(form.preTaxIRA) || 0) +
                            (parseFloat(form.preTaxHSA) || 0);
        const postTaxSavings = liveBreakdown?.postTaxSavingsAvailable || 0;
        
        await onSave({
          name: form.name,
          grossIncome: parseFloat(form.grossIncome) || undefined,
          incomeGrowthRate: parseFloat(form.incomeGrowthRate) || undefined,
          filingStatus: form.filingStatus,
          stateCode: form.stateCode || undefined,
          preTax401k: parseFloat(form.preTax401k) || undefined,
          preTaxIRA: parseFloat(form.preTaxIRA) || undefined,
          preTaxHSA: parseFloat(form.preTaxHSA) || undefined,
          baseMonthlyBudget: parseFloat(form.baseMonthlyBudget) || 3000,
          spendingGrowthRate: parseFloat(form.spendingGrowthRate) || 0,
          currentRate: parseFloat(form.currentRate) || 7,
          swr: parseFloat(form.swr) || 4,
          inflationRate: parseFloat(form.inflationRate) || 3,
          yearlyContribution: totalPreTax + postTaxSavings,
          effectiveTaxRate: liveBreakdown?.taxes.effectiveTotalRate,
        });
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[9999] pointer-events-auto">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="absolute inset-y-0 right-0 w-full sm:w-[600px] md:w-[700px] bg-slate-800 shadow-2xl overflow-y-auto">
          {/* Header */}
          <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: scenario.color }} />
              <h2 className="text-xl font-semibold text-slate-200">Quick Edit: {scenario.name}</h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Scenario Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Scenario Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            {/* Income Section */}
            <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-emerald-400 mb-4 uppercase tracking-wide">Income & Taxes</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Gross Income</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input type="number" value={form.grossIncome} onChange={(e) => setForm(f => ({ ...f, grossIncome: e.target.value }))} placeholder="100000" className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Income Growth %</label>
                  <input type="number" value={form.incomeGrowthRate} onChange={(e) => setForm(f => ({ ...f, incomeGrowthRate: e.target.value }))} placeholder="3" step="0.5" className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Filing Status</label>
                  <select value={form.filingStatus} onChange={(e) => setForm(f => ({ ...f, filingStatus: e.target.value }))} className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="single">Single</option>
                    <option value="married_jointly">Married Jointly</option>
                    <option value="married_separately">Married Separately</option>
                    <option value="head_of_household">Head of Household</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">State</label>
                  <select value={form.stateCode} onChange={(e) => setForm(f => ({ ...f, stateCode: e.target.value }))} className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">No state tax</option>
                    {Object.entries(STATE_TAX_RATES).map(([code, info]) => (
                      <option key={code} value={code}>{code} - {info.rate}%</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pre-tax Savings Section */}
            <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-violet-400 mb-4 uppercase tracking-wide">Pre-tax Savings</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">401(k)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input type="number" value={form.preTax401k} onChange={(e) => setForm(f => ({ ...f, preTax401k: e.target.value }))} placeholder="0" className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Traditional IRA</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input type="number" value={form.preTaxIRA} onChange={(e) => setForm(f => ({ ...f, preTaxIRA: e.target.value }))} placeholder="0" className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">HSA</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input type="number" value={form.preTaxHSA} onChange={(e) => setForm(f => ({ ...f, preTaxHSA: e.target.value }))} placeholder="0" className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Spending Section */}
            <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-amber-400 mb-4 uppercase tracking-wide">Spending</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Base Monthly Budget</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input type="number" value={form.baseMonthlyBudget} onChange={(e) => setForm(f => ({ ...f, baseMonthlyBudget: e.target.value }))} placeholder="3000" className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Spending Growth Rate %</label>
                  <input type="number" value={form.spendingGrowthRate} onChange={(e) => setForm(f => ({ ...f, spendingGrowthRate: e.target.value }))} placeholder="2" step="0.5" className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
            </div>

            {/* Investment Section */}
            <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-sky-400 mb-4 uppercase tracking-wide">Investment Assumptions</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Expected Return %</label>
                  <input type="number" value={form.currentRate} onChange={(e) => setForm(f => ({ ...f, currentRate: e.target.value }))} placeholder="7" step="0.5" className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Safe Withdrawal %</label>
                  <input type="number" value={form.swr} onChange={(e) => setForm(f => ({ ...f, swr: e.target.value }))} placeholder="4" step="0.5" className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Inflation %</label>
                  <input type="number" value={form.inflationRate} onChange={(e) => setForm(f => ({ ...f, inflationRate: e.target.value }))} placeholder="3" step="0.5" className="w-full bg-slate-800 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
            </div>

            {/* Live Summary */}
            {liveBreakdown && (
              <div className="bg-gradient-to-br from-emerald-500/10 to-sky-500/10 rounded-xl p-4 border border-emerald-500/30">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Live Calculation</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-500">Net Income</p>
                    <p className="text-lg font-mono text-emerald-400">{formatCurrency(liveBreakdown.taxes.netIncome)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tax Rate</p>
                    <p className="text-lg font-mono text-red-400">{formatPercent(liveBreakdown.taxes.effectiveTotalRate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Annual Spending</p>
                    <p className="text-lg font-mono text-amber-400">{formatCurrency(liveBreakdown.annualSpending)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Savings</p>
                    <p className="text-lg font-mono text-sky-400">{formatCurrency(liveBreakdown.totalAnnualSavings)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-800 border-t border-slate-700 p-4 flex justify-between">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 font-medium">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wizard Header Component
  const WizardHeader = ({ title, subtitle, step }: { title: string; subtitle: string; step: number }) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={resetWizard} className="text-slate-400 hover:text-slate-200 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          Cancel
        </button>
        <div className="text-sm text-slate-500">Step {step} of 6</div>
      </div>
      <div className="flex gap-1 mb-6">
        {[1,2,3,4,5,6].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-violet-500' : 'bg-slate-700'}`} />
        ))}
      </div>
      <h2 className="text-2xl font-bold text-slate-200 mb-2">{title}</h2>
      <p className="text-slate-400">{subtitle}</p>
    </div>
  );

  // Navigation buttons
  const WizardNav = ({ canContinue = true }: { canContinue?: boolean }) => (
    <div className="flex justify-between mt-8">
      <button onClick={goBack} disabled={!canGoBack} className="px-4 py-2 text-slate-400 hover:text-slate-200 disabled:opacity-30">
        Back
      </button>
      <button onClick={goNext} disabled={!canContinue || !canGoNext} className="px-6 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50">
        Continue
      </button>
    </div>
  );

  // Wizard container
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* STEP 1: Income */}
      {wizardStep === 'income' && (
        <>
          <WizardHeader title="What's your gross annual income?" subtitle="Enter your total income before any taxes or deductions." step={1} />
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-2">Annual Gross Income</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
                <input type="number" value={wizardState.grossIncome} onChange={(e) => setWizardState(s => ({ ...s, grossIncome: e.target.value }))} placeholder="100000" className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-4 pl-10 pr-4 text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              {wizardState.grossIncome && (
                <p className="mt-3 text-slate-400">That's <span className="text-emerald-400 font-mono">{formatCurrency(parseFloat(wizardState.grossIncome) / 12)}</span> per month before taxes.</p>
              )}
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-2">Expected Annual Income Growth (%)</label>
              <p className="text-xs text-slate-500 mb-3">How much do you expect your income to increase each year? (raises, promotions, etc.)</p>
              <div className="flex gap-4 items-center">
                <input type="number" value={wizardState.incomeGrowthRate} onChange={(e) => setWizardState(s => ({ ...s, incomeGrowthRate: e.target.value }))} placeholder="3" step="0.5" min="0" max="20" className="w-32 bg-slate-900/50 border border-slate-600 rounded-lg py-3 px-4 text-xl font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <span className="text-slate-400">% per year</span>
              </div>
              <div className="mt-3 flex gap-2">
                {[0, 2, 3, 5, 7].map(rate => (
                  <button key={rate} onClick={() => setWizardState(s => ({ ...s, incomeGrowthRate: rate.toString() }))} className={`px-3 py-1 text-sm rounded-lg ${parseFloat(wizardState.incomeGrowthRate) === rate ? 'bg-violet-500 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}>
                    {rate}%
                  </button>
                ))}
              </div>
              {wizardState.grossIncome && parseFloat(wizardState.incomeGrowthRate) > 0 && (
                <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <p className="text-sm text-emerald-400">
                    In 10 years, your income would grow to approximately <strong>{formatCurrency(parseFloat(wizardState.grossIncome) * Math.pow(1 + parseFloat(wizardState.incomeGrowthRate) / 100, 10))}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
          <WizardNav canContinue={!!wizardState.grossIncome} />
        </>
      )}

      {/* STEP 2: Filing Status & State */}
      {wizardStep === 'filing' && (
        <>
          <WizardHeader title="How do you file your taxes?" subtitle="This helps us calculate your federal and state tax burden." step={2} />
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-3">Filing Status</label>
              <div className="grid grid-cols-2 gap-3">
                {(['single', 'married_jointly', 'married_separately', 'head_of_household'] as FilingStatus[]).map(status => (
                  <button key={status} onClick={() => setWizardState(s => ({ ...s, filingStatus: status }))} className={`p-4 rounded-lg border text-left ${wizardState.filingStatus === status ? 'border-violet-500 bg-violet-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
                    <span className="font-medium text-slate-200">{status === 'single' ? 'Single' : status === 'married_jointly' ? 'Married Filing Jointly' : status === 'married_separately' ? 'Married Filing Separately' : 'Head of Household'}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-2">State (for state income tax)</label>
              <select value={wizardState.stateCode} onChange={(e) => setWizardState(s => ({ ...s, stateCode: e.target.value }))} className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">No state income tax / Skip</option>
                {Object.entries(STATE_TAX_RATES).map(([code, info]) => (
                  <option key={code} value={code}>{info.name} ({info.rate}%)</option>
                ))}
              </select>
            </div>
          </div>
          <WizardNav />
        </>
      )}

      {/* STEP 3: Pre-tax Savings */}
      {wizardStep === 'pretax' && (
        <>
          <WizardHeader title="Pre-tax retirement contributions" subtitle="These reduce your taxable income and grow tax-deferred." step={3} />
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">401(k) / 403(b) Contribution</label>
                <span className="text-xs text-slate-500">Limit: {formatCurrency(CONTRIBUTION_LIMITS.traditional401k)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input type="number" value={wizardState.preTax401k} onChange={(e) => setWizardState(s => ({ ...s, preTax401k: e.target.value }))} placeholder="0" className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 pl-10 pr-4 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">Traditional IRA</label>
                <span className="text-xs text-slate-500">Limit: {formatCurrency(CONTRIBUTION_LIMITS.traditionalIRA)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input type="number" value={wizardState.preTaxIRA} onChange={(e) => setWizardState(s => ({ ...s, preTaxIRA: e.target.value }))} placeholder="0" className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 pl-10 pr-4 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">HSA (Health Savings Account)</label>
                <span className="text-xs text-slate-500">Limit: {formatCurrency(CONTRIBUTION_LIMITS.hsa_individual)}-{formatCurrency(CONTRIBUTION_LIMITS.hsa_family)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input type="number" value={wizardState.preTaxHSA} onChange={(e) => setWizardState(s => ({ ...s, preTaxHSA: e.target.value }))} placeholder="0" className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 pl-10 pr-4 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            {incomeBreakdown && (
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
                <p className="text-sm text-emerald-400">Pre-tax savings reduce your taxable income by <strong>{formatCurrency(incomeBreakdown.totalPreTaxSavings)}</strong>, saving you approximately <strong>{formatCurrency(incomeBreakdown.totalPreTaxSavings * (incomeBreakdown.taxes.marginalFederalRate / 100))}</strong> in taxes.</p>
              </div>
            )}
          </div>
          <WizardNav />
        </>
      )}

      {/* STEP 4: Spending */}
      {wizardStep === 'spending' && (() => {
        const baseBudget = parseFloat(wizardState.baseMonthlyBudget) || 0;
        const spendingRate = parseFloat(wizardState.spendingGrowthRate) || 0;
        const netWorthPortion = currentNetWorth * (spendingRate / 100) / 12;
        const totalUnlockedSpending = baseBudget + netWorthPortion;
        
        return (
          <>
            <WizardHeader title="How much do you spend?" subtitle="Set your base budget and how it grows with your net worth." step={4} />
            
            {/* Variable Spending Explanation */}
            <div className="bg-violet-500/10 rounded-xl p-4 border border-violet-500/30 mb-6">
              <h4 className="text-sm font-medium text-violet-400 mb-2">Variable Spending System</h4>
              <p className="text-sm text-slate-400">Your monthly budget has two parts:</p>
              <div className="mt-2 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                  <span><strong>Base Budget</strong> — Your floor spending (adjusts with inflation)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 mt-1">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                  <span><strong>Net Worth Portion</strong> — Extra spending unlocked as wealth grows</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Base Budget */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Base Budget</label>
                <p className="text-xs text-slate-500 mb-3">Your minimum monthly spending regardless of net worth</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
                  <input type="number" value={wizardState.baseMonthlyBudget} onChange={(e) => setWizardState(s => ({ ...s, baseMonthlyBudget: e.target.value }))} placeholder="3000" className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-4 pl-10 pr-4 text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <p className="mt-2 text-sm text-slate-500">Annual base: {formatCurrency(baseBudget * 12)}</p>
              </div>

              {/* Spending Growth Rate */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">Spending Growth Rate (%)</label>
                <p className="text-xs text-slate-500 mb-3">Percentage of net worth added to your monthly budget annually</p>
                <div className="flex gap-4 items-center">
                  <input type="number" value={wizardState.spendingGrowthRate} onChange={(e) => setWizardState(s => ({ ...s, spendingGrowthRate: e.target.value }))} placeholder="2" step="0.5" min="0" max="10" className="w-32 bg-slate-900/50 border border-slate-600 rounded-lg py-3 px-4 text-xl font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  <span className="text-slate-400">% of net worth / year</span>
                </div>
                <div className="mt-3 flex gap-2">
                  {[0, 1, 2, 3, 4].map(rate => (
                    <button key={rate} onClick={() => setWizardState(s => ({ ...s, spendingGrowthRate: rate.toString() }))} className={`px-3 py-1 text-sm rounded-lg ${parseFloat(wizardState.spendingGrowthRate) === rate ? 'bg-violet-500 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}>
                      {rate}%
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {spendingRate === 0 ? 'Fixed spending — budget stays constant regardless of net worth' :
                   spendingRate <= 2 ? 'Conservative — modest lifestyle inflation as wealth grows' :
                   spendingRate <= 3 ? 'Moderate — balanced approach to enjoying wealth growth' :
                   'Aggressive — significant lifestyle increase with net worth (ensure this is below your return rate!)'}
                </p>
              </div>

              {/* Current Unlocked Spending Preview */}
              {currentNetWorth > 0 && (
                <div className="bg-gradient-to-br from-emerald-500/10 to-violet-500/10 rounded-xl p-6 border border-emerald-500/30">
                  <h4 className="text-sm font-medium text-slate-300 mb-4">Your Current Unlocked Spending</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        Base Budget
                      </span>
                      <span className="font-mono text-amber-400">{formatCurrency(baseBudget)}/mo</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Net Worth Portion
                        <span className="text-xs text-slate-500">({spendingRate}% × {formatCurrency(currentNetWorth)} ÷ 12)</span>
                      </span>
                      <span className="font-mono text-emerald-400">+{formatCurrency(netWorthPortion)}/mo</span>
                    </div>
                    <div className="border-t border-slate-600 pt-3 flex justify-between items-center">
                      <span className="text-slate-200 font-medium">Total Monthly Budget</span>
                      <span className="text-2xl font-mono text-violet-400">{formatCurrency(totalUnlockedSpending)}</span>
                    </div>
                    <p className="text-xs text-slate-500 pt-2">
                      Annual spending: {formatCurrency(totalUnlockedSpending * 12)} • This grows automatically as your net worth increases
                    </p>
                  </div>
                </div>
              )}

              {/* Money Flow (using actual unlocked spending) */}
              {incomeBreakdown && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h4 className="text-sm font-medium text-slate-300 mb-4">Your Money Flow</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-slate-400">Gross Income</span><span className="font-mono text-slate-200">{formatCurrency(incomeBreakdown.taxes.grossIncome)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">- Pre-tax Savings</span><span className="font-mono text-emerald-400">-{formatCurrency(incomeBreakdown.totalPreTaxSavings)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">- Total Taxes</span><span className="font-mono text-red-400">-{formatCurrency(incomeBreakdown.taxes.totalTax)}</span></div>
                    <div className="border-t border-slate-600 pt-2 flex justify-between"><span className="text-slate-300">Net Income</span><span className="font-mono text-emerald-400">{formatCurrency(incomeBreakdown.taxes.netIncome)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">- Annual Spending</span><span className="font-mono text-amber-400">-{formatCurrency(totalUnlockedSpending * 12)}</span></div>
                    <div className="border-t border-slate-600 pt-2 flex justify-between font-medium">
                      <span className="text-slate-200">Post-tax Savings Available</span>
                      <span className={`font-mono ${incomeBreakdown.taxes.netIncome - totalUnlockedSpending * 12 >= 0 ? 'text-sky-400' : 'text-red-400'}`}>
                        {formatCurrency(Math.max(0, incomeBreakdown.taxes.netIncome - totalUnlockedSpending * 12))}
                      </span>
                    </div>
                  </div>
                  {incomeBreakdown.taxes.netIncome - totalUnlockedSpending * 12 < 0 && (
                    <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                      <p className="text-sm text-red-400">Your current spending exceeds your net income. Consider reducing your base budget or spending growth rate.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tax Calculation Details */}
              {incomeBreakdown && (
                <TaxCalculationDetails taxes={incomeBreakdown.taxes} />
              )}
            </div>
            <WizardNav />
          </>
        );
      })()}

      {/* STEP 5: Investment Assumptions */}
      {wizardStep === 'investments' && (
        <>
          <WizardHeader title="Investment assumptions" subtitle="How do you expect your investments to perform?" step={5} />
          <div className="mb-4">
            <p className="text-sm text-slate-500 mb-2">Quick presets:</p>
            <div className="flex gap-2">
              {SCENARIO_TEMPLATES.map(t => (
                <button key={t.name} onClick={() => applyInvestmentTemplate(t)} className="px-3 py-1.5 text-sm bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700">{t.name}</button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-2">Expected Annual Return (%)</label>
              <input type="number" value={wizardState.currentRate} onChange={(e) => setWizardState(s => ({ ...s, currentRate: e.target.value }))} placeholder="7" step="0.5" className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 px-4 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <p className="mt-2 text-xs text-slate-500">Historical S&P 500 average: ~7% after inflation</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-2">Safe Withdrawal Rate (%)</label>
              <input type="number" value={wizardState.swr} onChange={(e) => setWizardState(s => ({ ...s, swr: e.target.value }))} placeholder="4" step="0.5" className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 px-4 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <p className="mt-2 text-xs text-slate-500">Traditional: 4% (Trinity Study), Conservative: 3-3.5%</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <label className="block text-sm font-medium text-slate-300 mb-2">Expected Inflation Rate (%)</label>
              <input type="number" value={wizardState.inflationRate} onChange={(e) => setWizardState(s => ({ ...s, inflationRate: e.target.value }))} placeholder="3" step="0.5" className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 px-4 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <WizardNav />
        </>
      )}

      {/* STEP 6: Summary */}
      {wizardStep === 'summary' && incomeBreakdown && (() => {
        const baseBudget = parseFloat(wizardState.baseMonthlyBudget) || 0;
        const spendingRate = parseFloat(wizardState.spendingGrowthRate) || 0;
        const netWorthPortion = currentNetWorth * (spendingRate / 100) / 12;
        const totalUnlockedSpending = baseBudget + netWorthPortion;
        
        return (
          <>
            <WizardHeader title="Your Scenario Summary" subtitle="Review your numbers and save your scenario." step={6} />
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Scenario Name</label>
              <input type="text" value={wizardState.name} onChange={(e) => setWizardState(s => ({ ...s, name: e.target.value }))} placeholder="My Financial Plan" className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            
            {/* Income Allocation Visual */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-emerald-500/30 mb-4">
              <h4 className="text-lg font-semibold text-slate-200 mb-4">Income Allocation</h4>
              <div className="h-8 bg-slate-700 rounded-full overflow-hidden flex mb-3">
                <div className="h-full bg-emerald-500 flex items-center justify-center text-xs text-white" style={{ width: `${incomeBreakdown.allocationPreTaxSavings}%` }} title="Pre-tax Savings">{incomeBreakdown.allocationPreTaxSavings >= 8 && 'Pre-tax'}</div>
                <div className="h-full bg-red-500 flex items-center justify-center text-xs text-white" style={{ width: `${incomeBreakdown.allocationTaxes}%` }} title="Taxes">{incomeBreakdown.allocationTaxes >= 8 && 'Taxes'}</div>
                <div className="h-full bg-amber-500 flex items-center justify-center text-xs text-white" style={{ width: `${incomeBreakdown.allocationSpending}%` }} title="Spending">{incomeBreakdown.allocationSpending >= 8 && 'Spending'}</div>
                <div className="h-full bg-sky-500 flex items-center justify-center text-xs text-white" style={{ width: `${incomeBreakdown.allocationPostTaxSavings}%` }} title="Post-tax Savings">{incomeBreakdown.allocationPostTaxSavings >= 8 && 'Savings'}</div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span><span className="text-slate-400">Pre-tax: {formatPercent(incomeBreakdown.allocationPreTaxSavings)}</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span><span className="text-slate-400">Taxes: {formatPercent(incomeBreakdown.allocationTaxes)}</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full"></span><span className="text-slate-400">Spending: {formatPercent(incomeBreakdown.allocationSpending)}</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-sky-500 rounded-full"></span><span className="text-slate-400">Post-tax: {formatPercent(incomeBreakdown.allocationPostTaxSavings)}</span></div>
              </div>
            </div>

            {/* Variable Spending Summary */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-violet-500/30 mb-4">
              <h4 className="text-lg font-semibold text-slate-200 mb-4">Variable Spending</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Base Budget</p>
                  <p className="text-xl font-mono text-amber-400">{formatCurrency(baseBudget)}/mo</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Growth Rate</p>
                  <p className="text-xl font-mono text-violet-400">{spendingRate}%</p>
                  <p className="text-xs text-slate-500">of net worth/yr</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Current Total</p>
                  <p className="text-xl font-mono text-emerald-400">{formatCurrency(totalUnlockedSpending)}/mo</p>
                </div>
              </div>
              {spendingRate > 0 && (
                <p className="text-xs text-slate-500 mt-4 text-center">
                  As your net worth grows, your monthly budget will increase. At {formatCurrency(1000000)} net worth, your budget would be {formatCurrency(baseBudget + (1000000 * spendingRate / 100 / 12))}/mo.
                </p>
              )}
            </div>

            {/* Key Numbers */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-500 uppercase">Total Annual Savings (Year 1)</p>
                <p className="text-2xl font-mono text-sky-400">{formatCurrency(incomeBreakdown.totalAnnualSavings)}</p>
                <p className="text-xs text-slate-500 mt-1">{formatPercent(incomeBreakdown.savingsRateOfGross)} of gross income</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-500 uppercase">Effective Tax Rate</p>
                <p className="text-2xl font-mono text-red-400">{formatPercent(incomeBreakdown.taxes.effectiveTotalRate)}</p>
                <p className="text-xs text-slate-500 mt-1">{formatCurrency(incomeBreakdown.taxes.totalTax)} total taxes</p>
              </div>
            </div>

            {/* Tax Calculation Details - Expandable */}
            <div className="mb-4">
              <TaxCalculationDetails taxes={incomeBreakdown.taxes} />
            </div>

            {/* Dynamic Projections Preview */}
            {(() => {
              const incomeGrowth = parseFloat(wizardState.incomeGrowthRate) || 0;
              const returnRate = parseFloat(wizardState.currentRate) || 7;
              const inflation = parseFloat(wizardState.inflationRate) || 3;
              const gross = parseFloat(wizardState.grossIncome) || 0;
              
              // Simple projections for years 1, 5, 10, 20
              const projectYear = (years: number) => {
                const projectedGross = gross * Math.pow(1 + incomeGrowth / 100, years);
                const inflationMult = Math.pow(1 + inflation / 100, years);
                const projectedBaseBudget = baseBudget * inflationMult;
                
                // Estimate net worth growth (compound growth)
                const estimatedNetWorth = currentNetWorth * Math.pow(1 + returnRate / 100, years) + 
                  incomeBreakdown.totalAnnualSavings * ((Math.pow(1 + returnRate / 100, years) - 1) / (returnRate / 100));
                
                const projectedNetWorthPortion = estimatedNetWorth * (spendingRate / 100) / 12;
                const projectedTotalSpending = (projectedBaseBudget + projectedNetWorthPortion) * 12;
                
                // Rough tax estimate (simplified)
                const estimatedTaxRate = incomeBreakdown.taxes.effectiveTotalRate + (incomeGrowth * years * 0.1); // Tax rate creep
                const projectedTax = projectedGross * Math.min(estimatedTaxRate, 45) / 100;
                const projectedNet = projectedGross - projectedTax - incomeBreakdown.totalPreTaxSavings * inflationMult;
                const projectedSavings = Math.max(0, projectedNet - projectedTotalSpending) + incomeBreakdown.totalPreTaxSavings * inflationMult;
                
                return {
                  income: projectedGross,
                  spending: projectedTotalSpending,
                  savings: projectedSavings,
                  netWorth: estimatedNetWorth,
                };
              };
              
              const years = [0, 5, 10, 20];
              const projections = years.map(y => ({ year: y, ...projectYear(y) }));
              
              // Check if savings decreases over time
              const savingsDecreasing = projections[3].savings < projections[0].savings;
              
              return (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-sky-500/30 mb-4">
                  <h4 className="text-lg font-semibold text-slate-200 mb-2">How Your Finances Evolve</h4>
                  <p className="text-xs text-slate-500 mb-4">
                    Your savings will change over time as income grows ({incomeGrowth}%/yr) and spending increases with net worth ({spendingRate}%/yr).
                  </p>
                  
                  <div className="overflow-x-auto scrollbar-hide touch-pan-x">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-500 text-xs uppercase">
                          <th className="text-left py-2">Year</th>
                          <th className="text-right py-2">Income</th>
                          <th className="text-right py-2">Spending</th>
                          <th className="text-right py-2">Savings</th>
                          <th className="text-right py-2">Net Worth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projections.map(p => (
                          <tr key={p.year} className="border-t border-slate-700">
                            <td className="py-2 text-slate-300">{p.year === 0 ? 'Now' : `Year ${p.year}`}</td>
                            <td className="py-2 text-right font-mono text-emerald-400">{formatCurrency(p.income)}</td>
                            <td className="py-2 text-right font-mono text-amber-400">{formatCurrency(p.spending)}</td>
                            <td className={`py-2 text-right font-mono ${p.savings > 0 ? 'text-sky-400' : 'text-red-400'}`}>{formatCurrency(p.savings)}</td>
                            <td className="py-2 text-right font-mono text-violet-400">{formatCurrency(p.netWorth)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {savingsDecreasing && spendingRate > 0 && (
                    <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      <p className="text-sm text-amber-400">
                        <strong>Note:</strong> Your spending rate ({spendingRate}%) may cause savings to decrease over time as your net worth grows. This is by design if you want to enjoy your wealth, but consider if this aligns with your long-term goals.
                      </p>
                    </div>
                  )}
                  
                  {incomeGrowth === 0 && spendingRate > 0 && (
                    <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      <p className="text-sm text-amber-400">
                        <strong>Note:</strong> With no income growth but variable spending, your savings rate will decrease over time. Consider adding expected raises or promotions.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Warnings/Suggestions */}
            {(incomeBreakdown.warnings.length > 0 || incomeBreakdown.suggestions.length > 0) && (
              <div className="space-y-2 mb-4">
                {incomeBreakdown.warnings.map((w, i) => (
                  <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{w}</div>
                ))}
                {incomeBreakdown.suggestions.map((s, i) => (
                  <div key={i} className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-3 text-sm text-sky-400">{s}</div>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button onClick={goBack} className="px-4 py-2 text-slate-400 hover:text-slate-200">Back</button>
              <button onClick={handleSaveScenario} className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium">
                {editingScenarioId ? 'Save Changes' : 'Create Scenario'}
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}
