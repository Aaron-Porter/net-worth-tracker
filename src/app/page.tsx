'use client'

import { useState, useMemo, useEffect } from 'react'
import { useMutation, useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { SignIn } from './components/SignIn'
import { useScenarios, Scenario, ScenarioProjection, SCENARIO_TEMPLATES } from '../lib/useScenarios'
import { formatCurrency, formatDate, getTimeSinceEntry, LEVEL_THRESHOLDS } from '../lib/calculations'
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
      <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur border-b border-slate-700 overflow-x-hidden">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 items-center min-w-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-4 font-medium transition-colors relative ${
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
              className={`px-6 py-4 font-medium transition-colors relative ${
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
              className={`px-6 py-4 font-medium transition-colors relative ${
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
              className={`px-6 py-4 font-medium transition-colors relative ${
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
              className={`px-6 py-4 font-medium transition-colors relative ${
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
        />
      )}

      {/* Levels Tab */}
      {activeTab === 'levels' && (
        <LevelsTab
          latestEntry={scenariosHook.latestEntry}
          primaryProjection={primaryProjection}
          profile={scenariosHook.profile}
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
// PROJECTIONS TAB
// ============================================================================

interface ProjectionsTabProps {
  latestEntry: ReturnType<typeof useScenarios>['latestEntry'];
  scenarioProjections: ScenarioProjection[];
  profile: ReturnType<typeof useScenarios>['profile'];
  projectionsView: 'table' | 'chart';
  setProjectionsView: (view: 'table' | 'chart') => void;
  setActiveTab: (tab: Tab) => void;
}

function ProjectionsTab({
  latestEntry,
  scenarioProjections,
  profile,
  projectionsView,
  setProjectionsView,
  setActiveTab,
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

  if (!latestEntry) {
    return (
      <div className="h-[calc(100vh-57px)] flex items-center justify-center">
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
      <div className="h-[calc(100vh-57px)] flex items-center justify-center">
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
    <div className="h-[calc(100vh-57px)] flex flex-col p-4">
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
          onClick={() => setActiveTab('scenarios')}
          className="text-xs text-slate-400 hover:text-slate-200 underline"
        >
          Edit Scenarios
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
  
  return (
    <div className="flex-1 overflow-auto bg-slate-800/30 rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-800 z-10">
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
  )
}

function ProjectionsChart({
  scenarioProjections,
  comparisonChartData,
  currentYear,
}: {
  scenarioProjections: ScenarioProjection[];
  comparisonChartData: Record<string, number | string>[];
  currentYear: number;
}) {
  if (comparisonChartData.length === 0) {
    return <div className="text-slate-400">No projection data available</div>
  }

  return (
    <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700 p-6 overflow-auto">
      <div className="space-y-8">
        {/* Net Worth Comparison Chart */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-slate-200">Net Worth Projections</h3>
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
          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#94a3b8" />
                <YAxis 
                  stroke="#94a3b8"
                  tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value as number)}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                />
                <Legend />
                {scenarioProjections.map((sp, index) => (
                  <Line 
                    key={sp.scenario._id}
                    type="monotone" 
                    dataKey={sp.scenario.name}
                    name={sp.scenario.name}
                    stroke={sp.scenario.color}
                    strokeWidth={index === 0 ? 3 : 2}
                    strokeDasharray={index === 0 ? undefined : "5 5"}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

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

        {/* Interest vs Contributions - Primary Scenario */}
        {scenarioProjections[0] && (
          <div>
            <h3 className="text-lg font-medium text-slate-200 mb-3">
              Interest vs Contributions ({scenarioProjections[0].scenario.name})
            </h3>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scenarioProjections[0].projections
                  .filter((d): d is typeof d & { year: number } => typeof d.year === 'number')
                  .slice(0, 25)
                  .map(d => ({
                    year: d.year,
                    contributed: Math.round(d.contributed),
                    interest: Math.round(d.interest),
                  }))
                }>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#94a3b8" />
                  <YAxis 
                    stroke="#94a3b8"
                    tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`}
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="contributed" 
                    name="Contributions"
                    stackId="1"
                    stroke="#0ea5e9" 
                    fill="#0ea5e9"
                    isAnimationActive={false}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="interest" 
                    name="Interest Earned"
                    stackId="1"
                    stroke="#10b981" 
                    fill="#10b981"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
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
  profile: ReturnType<typeof useScenarios>['profile'];
  setActiveTab: (tab: Tab) => void;
}

function LevelsTab({
  latestEntry,
  primaryProjection,
  profile,
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
            <p className="text-slate-600 text-xs mt-2">
              = {formatCurrency(levelInfo.unlockedAtNetWorth * 12)}/year
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4">
            <p className="text-slate-500 text-xs mb-1">Your Actual Monthly Spend</p>
            <p className={`text-3xl font-mono ${
              levelInfo.spendingStatus === 'within_budget' ? 'text-emerald-400' :
              levelInfo.spendingStatus === 'slightly_over' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {formatCurrency(profile.monthlySpend)}
            </p>
            <p className="text-slate-600 text-xs mt-2">
              {levelInfo.spendingStatus === 'within_budget' 
                ? `${formatCurrency(levelInfo.unlockedAtNetWorth - profile.monthlySpend)} buffer`
                : `${formatCurrency(profile.monthlySpend - levelInfo.unlockedAtNetWorth)} over budget`
              }
            </p>
          </div>
        </div>
      </div>

      {/* All Levels Table */}
      <h3 className="text-xl font-semibold text-slate-200 mb-4">All Levels</h3>
      <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden max-h-[500px] overflow-y-auto">
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
// SCENARIOS TAB
// ============================================================================

interface ScenariosTabProps {
  scenariosHook: ReturnType<typeof useScenarios>;
}

function ScenariosTab({
  scenariosHook,
}: ScenariosTabProps) {
  const [showCreateScenario, setShowCreateScenario] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [scenarioForm, setScenarioForm] = useState({
    name: '',
    description: '',
    currentRate: '7',
    swr: '4',
    yearlyContribution: '0',
    inflationRate: '3',
    baseMonthlyBudget: '3000',
    spendingGrowthRate: '2',
  });

  const resetScenarioForm = () => {
    setScenarioForm({
      name: '',
      description: '',
      currentRate: '7',
      swr: '4',
      yearlyContribution: '0',
      inflationRate: '3',
      baseMonthlyBudget: '3000',
      spendingGrowthRate: '2',
    });
  };

  const handleCreateScenario = async () => {
    if (!scenarioForm.name.trim()) return;
    
    await scenariosHook.createScenario({
      name: scenarioForm.name.trim(),
      description: scenarioForm.description.trim() || undefined,
      currentRate: parseFloat(scenarioForm.currentRate) || 7,
      swr: parseFloat(scenarioForm.swr) || 4,
      yearlyContribution: parseFloat(scenarioForm.yearlyContribution) || 0,
      inflationRate: parseFloat(scenarioForm.inflationRate) || 3,
      baseMonthlyBudget: parseFloat(scenarioForm.baseMonthlyBudget) || 3000,
      spendingGrowthRate: parseFloat(scenarioForm.spendingGrowthRate) || 2,
    });
    
    resetScenarioForm();
    setShowCreateScenario(false);
  };

  const handleUpdateScenario = async () => {
    if (!editingScenario || !scenarioForm.name.trim()) return;
    
    await scenariosHook.updateScenario(editingScenario._id, {
      name: scenarioForm.name.trim(),
      description: scenarioForm.description.trim() || undefined,
      currentRate: parseFloat(scenarioForm.currentRate) || 7,
      swr: parseFloat(scenarioForm.swr) || 4,
      yearlyContribution: parseFloat(scenarioForm.yearlyContribution) || 0,
      inflationRate: parseFloat(scenarioForm.inflationRate) || 3,
      baseMonthlyBudget: parseFloat(scenarioForm.baseMonthlyBudget) || 3000,
      spendingGrowthRate: parseFloat(scenarioForm.spendingGrowthRate) || 2,
    });
    
    setEditingScenario(null);
    resetScenarioForm();
  };

  const startEditingScenario = (scenario: Scenario) => {
    setScenarioForm({
      name: scenario.name,
      description: scenario.description || '',
      currentRate: scenario.currentRate.toString(),
      swr: scenario.swr.toString(),
      yearlyContribution: scenario.yearlyContribution.toString(),
      inflationRate: scenario.inflationRate.toString(),
      baseMonthlyBudget: scenario.baseMonthlyBudget.toString(),
      spendingGrowthRate: scenario.spendingGrowthRate.toString(),
    });
    setEditingScenario(scenario);
    setShowCreateScenario(false);
  };

  const applyTemplate = (template: typeof SCENARIO_TEMPLATES[number]) => {
    setScenarioForm({
      name: template.name,
      description: template.description,
      currentRate: template.currentRate.toString(),
      swr: template.swr.toString(),
      inflationRate: template.inflationRate.toString(),
      yearlyContribution: template.yearlyContribution.toString(),
      baseMonthlyBudget: template.baseMonthlyBudget.toString(),
      spendingGrowthRate: template.spendingGrowthRate.toString(),
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
        Scenarios
      </h1>
      <p className="text-slate-400 text-center mb-8">
        Create and compare different financial assumptions
      </p>

      {/* Personal Info Section */}
      <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-sky-400 rounded-full"></span>
          Personal Info
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Birth Date
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Used to show your age in projections
            </p>
            <input
              type="date"
              value={scenariosHook.profile.birthDate}
              onChange={(e) => scenariosHook.updateProfile({ birthDate: e.target.value })}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Actual Monthly Spending
            </label>
            <p className="text-xs text-slate-500 mb-2">
              For tracking against your budget in Levels
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={scenariosHook.profile.monthlySpend}
                onChange={(e) => scenariosHook.updateProfile({ monthlySpend: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                min="0"
                step="100"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 pl-7 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scenarios Section */}
      <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-violet-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 bg-violet-400 rounded-full"></span>
            Your Scenarios
          </h3>
          <button
            onClick={() => {
              resetScenarioForm();
              setEditingScenario(null);
              setShowCreateScenario(!showCreateScenario);
            }}
            className="px-3 py-1.5 text-sm bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors"
          >
            {showCreateScenario ? 'Cancel' : '+ New Scenario'}
          </button>
        </div>
        
        <p className="text-sm text-slate-400 mb-4">
          Each scenario represents a different set of financial assumptions. Select one or more to compare in Projections.
        </p>

        {/* Create/Edit Scenario Form */}
        {(showCreateScenario || editingScenario) && (
          <div className="bg-slate-900/50 rounded-xl p-4 mb-4 border border-violet-500/20">
            <h4 className="text-sm font-medium text-violet-400 mb-3">
              {editingScenario ? `Edit: ${editingScenario.name}` : 'Create New Scenario'}
            </h4>
            
            {/* Templates (only for new scenarios) */}
            {!editingScenario && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">Quick start from template:</p>
                <div className="flex flex-wrap gap-2">
                  {SCENARIO_TEMPLATES.map(template => (
                    <button
                      key={template.name}
                      onClick={() => applyTemplate(template)}
                      className="px-2 py-1 text-xs bg-slate-700/50 text-slate-300 rounded hover:bg-slate-700 transition-colors"
                      title={template.description}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Scenario Name *
                </label>
                <input
                  type="text"
                  value={scenarioForm.name}
                  onChange={(e) => setScenarioForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Conservative Plan"
                  className="w-full bg-slate-800/50 border border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={scenarioForm.description}
                  onChange={(e) => setScenarioForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description..."
                  className="w-full bg-slate-800/50 border border-slate-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Return Rate %</label>
                <input
                  type="number"
                  value={scenarioForm.currentRate}
                  onChange={(e) => setScenarioForm(prev => ({ ...prev, currentRate: e.target.value }))}
                  placeholder="7"
                  step="0.1"
                  className="w-full bg-slate-800/50 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">SWR %</label>
                <input
                  type="number"
                  value={scenarioForm.swr}
                  onChange={(e) => setScenarioForm(prev => ({ ...prev, swr: e.target.value }))}
                  placeholder="4"
                  step="0.1"
                  className="w-full bg-slate-800/50 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Inflation %</label>
                <input
                  type="number"
                  value={scenarioForm.inflationRate}
                  onChange={(e) => setScenarioForm(prev => ({ ...prev, inflationRate: e.target.value }))}
                  placeholder="3"
                  step="0.1"
                  className="w-full bg-slate-800/50 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Yearly Contribution</label>
                <input
                  type="number"
                  value={scenarioForm.yearlyContribution}
                  onChange={(e) => setScenarioForm(prev => ({ ...prev, yearlyContribution: e.target.value }))}
                  placeholder="0"
                  step="1000"
                  className="w-full bg-slate-800/50 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Base Budget</label>
                <input
                  type="number"
                  value={scenarioForm.baseMonthlyBudget}
                  onChange={(e) => setScenarioForm(prev => ({ ...prev, baseMonthlyBudget: e.target.value }))}
                  placeholder="3000"
                  step="100"
                  className="w-full bg-slate-800/50 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Spending Rate %</label>
                <input
                  type="number"
                  value={scenarioForm.spendingGrowthRate}
                  onChange={(e) => setScenarioForm(prev => ({ ...prev, spendingGrowthRate: e.target.value }))}
                  placeholder="2"
                  step="0.1"
                  className="w-full bg-slate-800/50 border border-slate-600 rounded-lg py-2 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              {editingScenario ? (
                <>
                  <button
                    onClick={handleUpdateScenario}
                    disabled={!scenarioForm.name.trim()}
                    className="px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditingScenario(null);
                      resetScenarioForm();
                    }}
                    className="px-4 py-2 bg-slate-700/50 text-slate-400 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCreateScenario}
                  disabled={!scenarioForm.name.trim()}
                  className="px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Scenario
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scenarios List */}
        {scenariosHook.scenarios.length > 0 ? (
          <div className="space-y-2">
            {scenariosHook.scenarios.map(scenario => (
              <div
                key={scenario._id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  scenario.isSelected
                    ? 'bg-slate-900/50 border-slate-600'
                    : 'bg-slate-900/20 border-slate-700/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => scenariosHook.toggleSelected(scenario._id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      scenario.isSelected
                        ? 'border-emerald-400 bg-emerald-400/20'
                        : 'border-slate-500 hover:border-slate-400'
                    }`}
                  >
                    {scenario.isSelected && (
                      <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: scenario.color }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200 truncate">{scenario.name}</span>
                    </div>
                    {scenario.description && (
                      <p className="text-xs text-slate-500 truncate">{scenario.description}</p>
                    )}
                    <div className="flex gap-3 text-xs text-slate-500 mt-1">
                      <span>Return: <span className="text-emerald-400">{scenario.currentRate}%</span></span>
                      <span>SWR: <span className="text-amber-400">{scenario.swr}%</span></span>
                      <span>Contribution: <span className="text-sky-400">{formatCurrency(scenario.yearlyContribution)}/yr</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => scenariosHook.selectOnly(scenario._id)}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                    title="Select only this scenario"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => startEditingScenario(scenario)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => scenariosHook.duplicateScenario(scenario._id)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                    title="Duplicate"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  {scenariosHook.scenarios.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete scenario "${scenario.name}"?`)) {
                          scenariosHook.deleteScenario(scenario._id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500">
            <p className="mb-2">No scenarios created yet.</p>
            <p className="text-xs">Creating your first scenario...</p>
          </div>
        )}

        {/* Selection hint */}
        {scenariosHook.scenarios.length > 1 && (
          <p className="text-xs text-slate-500 mt-4 text-center">
            Tip: Select multiple scenarios to compare them side-by-side in Projections
          </p>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 mb-3">Understanding Scenario Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-emerald-400 font-medium">Return Rate</p>
            <p className="text-slate-400">Expected annual investment return (e.g., 7% for stock market average)</p>
          </div>
          <div>
            <p className="text-amber-400 font-medium">Safe Withdrawal Rate (SWR)</p>
            <p className="text-slate-400">Percentage you can safely withdraw annually in retirement (typically 3-4%)</p>
          </div>
          <div>
            <p className="text-sky-400 font-medium">Yearly Contribution</p>
            <p className="text-slate-400">How much you add to investments each year</p>
          </div>
          <div>
            <p className="text-amber-400 font-medium">Inflation Rate</p>
            <p className="text-slate-400">Expected annual inflation for adjusting future values</p>
          </div>
          <div>
            <p className="text-violet-400 font-medium">Base Budget</p>
            <p className="text-slate-400">Floor monthly spending regardless of net worth (adjusts for inflation)</p>
          </div>
          <div>
            <p className="text-violet-400 font-medium">Spending Rate</p>
            <p className="text-slate-400">Percentage of net worth added to monthly budget (keep below return rate!)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
