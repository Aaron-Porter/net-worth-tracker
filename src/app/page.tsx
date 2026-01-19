'use client'

import { useState, useMemo } from 'react'
import { useMutation, useConvexAuth } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { SignIn } from './components/SignIn'
import {
  useFinancials,
  LEVEL_THRESHOLDS,
  formatCurrency,
  formatDate,
  getTimeSinceEntry,
} from '../lib/useFinancials'
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

type Tab = 'dashboard' | 'entries' | 'projections' | 'levels' | 'settings'

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
  
  // Use centralized calculations hook
  const financials = useFinancials()
  
  // Mutations
  const addEntry = useMutation(api.entries.add)
  const removeEntry = useMutation(api.entries.remove)
  
  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [projectionsView, setProjectionsView] = useState<'table' | 'chart'>('table')
  const [newAmount, setNewAmount] = useState<string>('')

  // Destructure commonly used values from financials
  const {
    isLoading,
    settings,
    entries,
    latestEntry,
    currentNetWorth,
    growthRates,
    projections,
    levelInfo,
    fiYear,
    crossoverYear,
    currentFiProgress,
    currentMonthlySwr,
    currentAnnualSwr,
    includeContributions,
    setIncludeContributions,
    applyInflation,
    setApplyInflation,
    useSpendingLevels,
    setUseSpendingLevels,
    localSettings,
    updateLocalSetting,
  } = financials

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

  // Show loading while settings are being fetched
  if (isLoading) {
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
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-4 font-medium transition-colors relative ${
                activeTab === 'settings'
                  ? 'text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Settings
              {activeTab === 'settings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
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
          latestEntry={latestEntry}
          currentNetWorth={currentNetWorth}
          growthRates={growthRates}
          settings={settings}
          includeContributions={includeContributions}
          setIncludeContributions={setIncludeContributions}
          currentMonthlySwr={currentMonthlySwr}
          currentAnnualSwr={currentAnnualSwr}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <EntriesTab
          entries={entries}
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
          latestEntry={latestEntry}
          projections={projections}
          settings={settings}
          localSettings={localSettings}
          applyInflation={applyInflation}
          setApplyInflation={setApplyInflation}
          useSpendingLevels={useSpendingLevels}
          setUseSpendingLevels={setUseSpendingLevels}
          projectionsView={projectionsView}
          setProjectionsView={setProjectionsView}
          fiYear={fiYear}
          crossoverYear={crossoverYear}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Levels Tab */}
      {activeTab === 'levels' && (
        <LevelsTab
          latestEntry={latestEntry}
          levelInfo={levelInfo}
          localSettings={localSettings}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <SettingsTab
          localSettings={localSettings}
          updateLocalSetting={updateLocalSetting}
          levelInfo={levelInfo}
          latestEntry={latestEntry}
          applyInflation={applyInflation}
          setApplyInflation={setApplyInflation}
        />
      )}
    </main>
  )
}

// ============================================================================
// DASHBOARD TAB
// ============================================================================

interface DashboardTabProps {
  latestEntry: ReturnType<typeof useFinancials>['latestEntry'];
  currentNetWorth: ReturnType<typeof useFinancials>['currentNetWorth'];
  growthRates: ReturnType<typeof useFinancials>['growthRates'];
  settings: ReturnType<typeof useFinancials>['settings'];
  includeContributions: boolean;
  setIncludeContributions: (value: boolean) => void;
  currentMonthlySwr: number;
  currentAnnualSwr: number;
  setActiveTab: (tab: Tab) => void;
}

function DashboardTab({
  latestEntry,
  currentNetWorth,
  growthRates,
  settings,
  includeContributions,
  setIncludeContributions,
  currentMonthlySwr,
  currentAnnualSwr,
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
      {latestEntry ? (
        <div className="mb-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-emerald-500/30">
          {/* Toggle for including contributions */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-lg border border-slate-600 overflow-hidden">
              <button
                onClick={() => setIncludeContributions(false)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  !includeContributions
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                Appreciation Only
              </button>
              <button
                onClick={() => setIncludeContributions(true)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  includeContributions
                    ? 'bg-sky-500/20 text-sky-400'
                    : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                + Contributions
              </button>
            </div>
          </div>

          <h2 className="text-sm font-medium text-slate-400 text-center mb-1">
            {includeContributions ? 'Projected Net Worth' : 'Current Net Worth'}
          </h2>
          <div className="text-center">
            <span className="text-4xl md:text-5xl font-bold font-mono bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              {formatCurrency(currentNetWorth.total, 6)}
            </span>
          </div>
          <div className={`mt-4 flex justify-center ${includeContributions ? 'gap-4' : 'gap-8'} text-sm`}>
            <div className="text-center">
              <p className="text-slate-500">Base Amount</p>
              <p className="text-slate-300 font-mono">{formatCurrency(currentNetWorth.baseAmount)}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-500">Appreciation</p>
              <p className="text-emerald-400 font-mono">+{formatCurrency(currentNetWorth.appreciation, 4)}</p>
            </div>
            {includeContributions && (
              <div className="text-center">
                <p className="text-slate-500">Saved</p>
                <p className="text-sky-400 font-mono">+{formatCurrency(currentNetWorth.contributions, 4)}</p>
              </div>
            )}
          </div>
          <p className="text-slate-500 text-center mt-4 text-xs">
            Last updated {getTimeSinceEntry(latestEntry.timestamp)} at {settings.currentRate}% annual return
            {includeContributions && settings.yearlyContribution > 0 && (
              <span> + {formatCurrency(settings.yearlyContribution)}/yr contributions</span>
            )}
          </p>
          {includeContributions && settings.yearlyContribution === 0 && (
            <p className="text-amber-400/70 text-center mt-2 text-xs">
              Set your yearly contribution in Settings to see savings growth
            </p>
          )}
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
      {latestEntry && (
        <div className="mt-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
          <h2 className="text-lg font-semibold text-slate-300 mb-4">
            Metrics
          </h2>
          
          {/* Growth/Appreciation Rates */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              {includeContributions ? 'Growth Rate' : 'Appreciation Rate'}
              {includeContributions && (
                <span className="ml-2 text-xs text-sky-400">(includes contributions)</span>
              )}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Per Second</p>
                <p className={`${includeContributions ? 'text-sky-400' : 'text-emerald-400'} font-mono`}>
                  {formatCurrency(growthRates.perSecond, 6)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Per Minute</p>
                <p className={`${includeContributions ? 'text-sky-400' : 'text-emerald-400'} font-mono`}>
                  {formatCurrency(growthRates.perMinute, 4)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Per Hour</p>
                <p className={`${includeContributions ? 'text-sky-400' : 'text-emerald-400'} font-mono`}>
                  {formatCurrency(growthRates.perHour)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Per Day</p>
                <p className={`${includeContributions ? 'text-sky-400' : 'text-emerald-400'} font-mono`}>
                  {formatCurrency(growthRates.perDay)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 col-span-2 sm:col-span-2">
                <p className="text-slate-500 text-xs">Per Year</p>
                <p className={`${includeContributions ? 'text-sky-400' : 'text-emerald-400'} font-mono text-lg`}>
                  {formatCurrency(growthRates.perYear)}
                </p>
                {includeContributions && settings.yearlyContribution > 0 && (
                  <p className="text-slate-500 text-xs mt-1">
                    {formatCurrency(growthRates.yearlyAppreciation)} appreciation + {formatCurrency(growthRates.yearlyContributions)} saved
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Safe Withdrawal Rate */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              Safe Withdrawal Rate <span className="text-slate-500">({settings.swr}%)</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Annual</p>
                <p className="text-amber-400 font-mono text-lg">
                  {formatCurrency(currentAnnualSwr)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Monthly</p>
                <p className="text-amber-400 font-mono text-lg">
                  {formatCurrency(currentMonthlySwr)}
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
  entries: ReturnType<typeof useFinancials>['entries'];
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
  setActiveTab,
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
  latestEntry: ReturnType<typeof useFinancials>['latestEntry'];
  projections: ReturnType<typeof useFinancials>['projections'];
  settings: ReturnType<typeof useFinancials>['settings'];
  localSettings: ReturnType<typeof useFinancials>['localSettings'];
  applyInflation: boolean;
  setApplyInflation: (value: boolean) => void;
  useSpendingLevels: boolean;
  setUseSpendingLevels: (value: boolean) => void;
  projectionsView: 'table' | 'chart';
  setProjectionsView: (view: 'table' | 'chart') => void;
  fiYear: number | null;
  crossoverYear: number | null;
  setActiveTab: (tab: Tab) => void;
}

function ProjectionsTab({
  latestEntry,
  projections,
  settings,
  localSettings,
  applyInflation,
  setApplyInflation,
  useSpendingLevels,
  setUseSpendingLevels,
  projectionsView,
  setProjectionsView,
  fiYear,
  crossoverYear,
  setActiveTab,
}: ProjectionsTabProps) {
  // Chart data (limited to 25 years for readability)
  const chartData = useMemo(() => {
    return projections
      .filter((d): d is typeof d & { year: number } => typeof d.year === 'number')
      .slice(0, 25)
      .map(d => ({
        year: d.year,
        netWorth: Math.round(d.netWorth),
        fiTarget: Math.round(d.fiTarget),
        interest: Math.round(d.interest),
        contributed: Math.round(d.contributed),
        fiProgress: Math.round(d.fiProgress * 10) / 10,
        initialAmount: Math.round(latestEntry?.amount || 0),
        monthlySpend: Math.round(d.monthlySpend),
        annualSpend: Math.round(d.monthlySpend * 12),
      }))
  }, [projections, latestEntry])

  return (
    <div className="h-[calc(100vh-57px)] flex flex-col p-4">
      {!latestEntry ? (
        <div className="flex-1 flex items-center justify-center">
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
      ) : (
        <>
          {/* Summary Bar */}
          <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>Base: <span className="text-emerald-400 font-mono">{formatCurrency(latestEntry.amount)}</span></span>
              <span>Return: <span className="text-emerald-400 font-mono">{localSettings.rateOfReturn}%</span></span>
              <span>SWR: <span className="text-amber-400 font-mono">{localSettings.swr}%</span></span>
              <span>Contribution: <span className="text-sky-400 font-mono">{formatCurrency(settings.yearlyContribution)}/yr</span></span>
              {useSpendingLevels ? (
                <span>Spending: <span className="text-violet-400 font-mono">Level-based</span></span>
              ) : (
                <span>Spend: <span className="text-violet-400 font-mono">{formatCurrency(settings.monthlySpend)}/mo</span></span>
              )}
              {applyInflation && !useSpendingLevels && <span>Inflation: <span className="text-amber-400 font-mono">{localSettings.inflationRate}%</span></span>}
              {useSpendingLevels && (
                <>
                  <span>Base Budget: <span className="text-amber-400 font-mono">{formatCurrency(parseFloat(localSettings.baseMonthlyBudget) || 0)}</span></span>
                  <span>Spend Rate: <span className="text-emerald-400 font-mono">{localSettings.spendingGrowthRate}%</span></span>
                </>
              )}
            </div>
            <div className="flex-1" />
            <button
              onClick={() => {
                setUseSpendingLevels(!useSpendingLevels);
                // Turn off inflation toggle when using spending levels (inflation is built into levels)
                if (!useSpendingLevels) setApplyInflation(false);
              }}
              className={`text-xs px-2 py-1 rounded ${
                useSpendingLevels
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              {useSpendingLevels ? 'Spending Levels On' : 'Spending Levels Off'}
            </button>
            {!useSpendingLevels && (
              <button
                onClick={() => setApplyInflation(!applyInflation)}
                className={`text-xs px-2 py-1 rounded ${
                  applyInflation
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                {applyInflation ? 'Inflation On' : 'Inflation Off'}
              </button>
            )}
            <button
              onClick={() => setActiveTab('settings')}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Edit Settings
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
              projections={projections}
              birthDate={settings.birthDate}
              monthlySpend={settings.monthlySpend}
              useSpendingLevels={useSpendingLevels}
            />
          ) : (
            <ProjectionsChart
              chartData={chartData}
              monthlySpend={settings.monthlySpend}
              fiYear={fiYear}
              crossoverYear={crossoverYear}
              useSpendingLevels={useSpendingLevels}
            />
          )}
        </>
      )}
    </div>
  )
}

function ProjectionsTable({
  projections,
  birthDate,
  monthlySpend,
  useSpendingLevels,
}: {
  projections: ReturnType<typeof useFinancials>['projections'];
  birthDate: string;
  monthlySpend: number;
  useSpendingLevels: boolean;
}) {
  const currentYear = new Date().getFullYear()
  // Show spending column if using spending levels or if there's a monthly spend set
  const showSpendingColumn = useSpendingLevels || monthlySpend > 0;
  
  return (
    <div className="flex-1 overflow-auto bg-slate-800/30 rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-800 z-10">
          <tr className="border-b border-slate-700">
            <th className="text-left text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Year</th>
            {birthDate && <th className="text-left text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Age</th>}
            <th className="text-left text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Elapsed</th>
            <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Net Worth</th>
            <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Interest</th>
            <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Contributed</th>
            <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Monthly SWR</th>
            {showSpendingColumn && (
              <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                {useSpendingLevels ? 'Level Spend' : 'Spend'}
              </th>
            )}
            {showSpendingColumn && (
              <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">FI %</th>
            )}
            {showSpendingColumn && (
              <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap border-l border-slate-700">
                Coast FI {birthDate ? 'Age' : 'Year'}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {projections.map((row) => {
            const isNow = row.year === 'Now'
            
            return (
              <tr
                key={row.year}
                className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${
                  isNow ? 'border-b-2 border-slate-600 bg-slate-700/30' : ''
                } ${row.isFiYear ? 'bg-emerald-900/30 border-emerald-500/50' : ''
                } ${row.swrCoversSpend && !row.isFiYear && !isNow ? 'bg-emerald-900/10' : ''
                } ${row.isCrossover ? 'bg-sky-900/30 border-sky-500/50' : ''
                } ${isNow && row.swrCoversSpend ? 'bg-emerald-900/30' : ''}`}
              >
                <td className={`py-2 px-3 font-medium ${isNow ? 'text-slate-200 font-semibold' : 'text-slate-300'}`}>
                  {row.year}
                  {row.isFiYear && <span className="ml-2 text-xs text-emerald-400 font-semibold">FI</span>}
                  {isNow && row.swrCoversSpend && <span className="ml-2 text-xs text-emerald-400 font-semibold">FI</span>}
                  {row.isCrossover && <span className="ml-2 text-xs text-sky-400 font-semibold">✨</span>}
                </td>
                {birthDate && <td className={`py-2 px-3 ${isNow ? 'text-slate-300 font-medium' : 'text-slate-400'}`}>{row.age}</td>}
                <td className={`py-2 px-3 ${isNow ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isNow ? '-' : `+${row.yearsFromEntry.toFixed(1)}y`}
                </td>
                <td className={`py-2 px-3 text-right font-mono text-emerald-400 ${isNow ? 'font-semibold' : ''}`}>
                  {formatCurrency(row.netWorth)}
                </td>
                <td className={`py-2 px-3 text-right font-mono ${row.interest > row.contributed ? 'text-emerald-400' : 'text-emerald-400/70'}`}>
                  +{formatCurrency(row.interest)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-sky-400/70">
                  {isNow ? '-' : formatCurrency(row.contributed)}
                </td>
                <td className={`py-2 px-3 text-right font-mono ${row.swrCoversSpend ? 'text-emerald-400' : 'text-amber-400/80'}`}>
                  {formatCurrency(row.monthlySwr)}
                </td>
                {showSpendingColumn && (
                  <td className={`py-2 px-3 text-right font-mono ${useSpendingLevels ? 'text-violet-400' : 'text-slate-400'}`}>
                    {formatCurrency(row.monthlySpend)}
                  </td>
                )}
                {showSpendingColumn && (
                  <td className={`py-2 px-3 text-right font-mono ${row.fiProgress >= 100 ? 'text-emerald-400 font-semibold' : 'text-violet-400'}`}>
                    {row.fiProgress.toFixed(1)}%
                  </td>
                )}
                {showSpendingColumn && (
                  <td className="py-2 px-3 text-right font-mono border-l border-slate-700">
                    {row.coastFiYear ? (
                      <span className={row.swrCoversSpend ? 'text-emerald-400' : 'text-violet-400'}>
                        {row.swrCoversSpend ? (
                          'Now'
                        ) : (
                          <>
                            {row.coastFiYear - (typeof row.year === 'number' ? row.year : currentYear)}y
                            <span className="text-slate-500 text-xs ml-1">
                              ({birthDate ? `age ${row.coastFiAge}` : row.coastFiYear})
                            </span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ProjectionsChart({
  chartData,
  monthlySpend,
  fiYear,
  crossoverYear,
  useSpendingLevels,
}: {
  chartData: Array<{
    year: number;
    netWorth: number;
    fiTarget: number;
    interest: number;
    contributed: number;
    fiProgress: number;
    monthlySpend: number;
    annualSpend: number;
  }>;
  monthlySpend: number;
  fiYear: number | null;
  crossoverYear: number | null;
  useSpendingLevels: boolean;
}) {
  const showSpendingChart = useSpendingLevels || monthlySpend > 0;
  const currentYear = new Date().getFullYear()

  if (chartData.length === 0) {
    return <div className="text-slate-400">No projection data available</div>
  }

  return (
    <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700 p-6 overflow-auto">
      <div className="space-y-8">
        {/* Chart 1: Net Worth Over Time */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-slate-200">Net Worth Over Time</h3>
            {fiYear && (
              <span className="text-sm text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
                FI in {fiYear - currentYear} years ({fiYear})
              </span>
            )}
          </div>
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
                <Line 
                  type="monotone" 
                  dataKey="netWorth" 
                  name="Net Worth"
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={true}
                  isAnimationActive={false}
                  connectNulls
                />
                {showSpendingChart && (
                  <Line 
                    type="monotone" 
                    dataKey="fiTarget" 
                    name="FI Target"
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={true}
                    isAnimationActive={false}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Interest vs Contributions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-slate-200">Interest vs Contributions</h3>
            {crossoverYear && (
              <span className="text-sm text-sky-400 bg-sky-400/10 px-3 py-1 rounded-full">
                Crossover in {crossoverYear - currentYear} years
              </span>
            )}
          </div>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
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

        {/* Chart 3: FI Progress */}
        {showSpendingChart && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-slate-200">FI Progress</h3>
              <span className="text-sm text-violet-400 bg-violet-400/10 px-3 py-1 rounded-full">
                Currently {chartData[0]?.fiProgress.toFixed(0)}% to FI
              </span>
            </div>
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.map(d => ({ ...d, fiProgressCapped: Math.min(d.fiProgress, 150) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#94a3b8" />
                  <YAxis 
                    stroke="#94a3b8"
                    domain={[0, 150]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    formatter={(value) => `${(value as number).toFixed(1)}%`}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  />
                  <ReferenceLine y={100} stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
                  <Line 
                    type="monotone" 
                    dataKey="fiProgressCapped" 
                    name="FI Progress"
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={true}
                    isAnimationActive={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {/* Chart 4: Spending Over Time (only when using spending levels) */}
        {useSpendingLevels && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-slate-200">Level-Based Spending Over Time</h3>
              <span className="text-sm text-violet-400 bg-violet-400/10 px-3 py-1 rounded-full">
                Current: {formatCurrency(chartData[0]?.monthlySpend || 0)}/mo
              </span>
            </div>
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="year" stroke="#94a3b8" />
                  <YAxis 
                    stroke="#94a3b8"
                    tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="monthlySpend" 
                    name="Monthly Budget"
                    stroke="#8b5cf6" 
                    fill="#8b5cf6"
                    fillOpacity={0.3}
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
  latestEntry: ReturnType<typeof useFinancials>['latestEntry'];
  levelInfo: ReturnType<typeof useFinancials>['levelInfo'];
  localSettings: ReturnType<typeof useFinancials>['localSettings'];
  setActiveTab: (tab: Tab) => void;
}

function LevelsTab({
  latestEntry,
  levelInfo,
  localSettings,
  setActiveTab,
}: LevelsTabProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
        Spending Levels
      </h1>
      <p className="text-slate-400 text-center mb-8">
        Unlock higher monthly spending as your net worth grows
      </p>

      {!latestEntry ? (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-4">No net worth data found.</p>
          <button
            onClick={() => setActiveTab('entries')}
            className="text-emerald-400 hover:text-emerald-300 underline"
          >
            Add your first entry
          </button>
        </div>
      ) : (
        <>
          {/* Budget Summary */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-300 font-medium">
                  Budget Formula: <span className="text-amber-400">{formatCurrency(levelInfo.baseBudgetInflationAdjusted)} base</span> + <span className="text-emerald-400">{formatCurrency(levelInfo.netWorthPortion)} from net worth</span> = <span className="text-violet-400 font-mono">{formatCurrency(levelInfo.unlockedAtNetWorth)}/mo</span>
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>Base: <span className="text-amber-400">{formatCurrency(levelInfo.baseBudgetOriginal, 0)}</span></span>
                  <span>Spending Rate: <span className="text-emerald-400">{(levelInfo.spendingRate * 100).toFixed(1)}%</span></span>
                  <span>Inflation: <span className="text-amber-400">{(levelInfo.inflation * 100).toFixed(1)}%</span></span>
                  <span>Return Rate: <span className="text-emerald-400">{localSettings.rateOfReturn}%</span></span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Edit Settings
              </button>
            </div>

            {/* Warning if spending rate >= return rate */}
            {parseFloat(localSettings.spendingGrowthRate) >= parseFloat(localSettings.rateOfReturn) && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">
                  Warning: Your net worth spending rate ({localSettings.spendingGrowthRate}%) is greater than or equal to your return rate ({localSettings.rateOfReturn}%). 
                  You won&apos;t make progress toward FI this way!
                </p>
              </div>
            )}
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
                  <div className="flex justify-between">
                    <span className="text-amber-400">Base (inflation-adjusted):</span>
                    <span className="font-mono text-amber-400">{formatCurrency(levelInfo.baseBudgetInflationAdjusted)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-400">From net worth ({(levelInfo.spendingRate * 100).toFixed(1)}%):</span>
                    <span className="font-mono text-emerald-400">+{formatCurrency(levelInfo.netWorthPortion)}</span>
                  </div>
                </div>
                <p className="text-slate-600 text-xs mt-2">
                  = {formatCurrency(levelInfo.unlockedAtNetWorth * 12)}/year
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <p className="text-slate-500 text-xs mb-1">Your Monthly Spend Setting</p>
                <p className={`text-3xl font-mono ${
                  levelInfo.spendingStatus === 'within_budget' ? 'text-emerald-400' :
                  levelInfo.spendingStatus === 'slightly_over' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {formatCurrency(levelInfo.currentSpend)}
                </p>
                <div className="mt-2">
                  {levelInfo.spendingStatus === 'within_budget' ? (
                    <>
                      <p className="text-sm font-medium text-emerald-400">Within Budget</p>
                      <p className="text-slate-500 text-xs mt-1">
                        {formatCurrency(levelInfo.unlockedAtNetWorth - levelInfo.currentSpend)} buffer remaining
                      </p>
                    </>
                  ) : levelInfo.spendingStatus === 'slightly_over' ? (
                    <>
                      <p className="text-sm font-medium text-amber-400">Slightly Over</p>
                      <p className="text-slate-500 text-xs mt-1">
                        {formatCurrency(levelInfo.currentSpend - levelInfo.unlockedAtNetWorth)} over budget
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-red-400">Over Budget</p>
                      <p className="text-slate-500 text-xs mt-1">
                        {formatCurrency(levelInfo.currentSpend - levelInfo.unlockedAtNetWorth)} over budget
                      </p>
                    </>
                  )}
                </div>
                <p className="text-slate-600 text-xs mt-2">
                  Set in Settings tab
                </p>
              </div>
            </div>

            {/* Next Level Reward Preview */}
            {levelInfo.nextLevel && (
              <div className="mt-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                <p className="text-violet-300 text-sm">
                  <span className="font-medium">Next unlock:</span> Level {levelInfo.nextLevel.level} ({levelInfo.nextLevel.name}) unlocks{' '}
                  <span className="font-mono text-violet-400">{formatCurrency(levelInfo.nextLevel.monthlyBudget)}/mo</span>{' '}
                  (+{formatCurrency(levelInfo.nextLevelSpendingIncrease)}) at {formatCurrency(levelInfo.nextLevel.threshold)} net worth
                </p>
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="bg-slate-800/50 rounded-xl p-6 mb-8 border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">How Levels Work</h3>
            <p className="text-slate-400 text-sm mb-3">
              Your budget has two components: a <span className="text-amber-400">base amount</span> that adjusts for inflation each year, 
              plus a <span className="text-emerald-400">percentage of your current net worth</span>. As your wealth grows, 
              so does your budget - but always at a rate below your returns.
            </p>
            <p className="text-slate-400 text-sm">
              Your net worth spending rate of <span className="text-violet-400">{localSettings.spendingGrowthRate}%</span> is{' '}
              {parseFloat(localSettings.spendingGrowthRate) < parseFloat(localSettings.rateOfReturn) ? (
                <span className="text-emerald-400">{(parseFloat(localSettings.rateOfReturn) - parseFloat(localSettings.spendingGrowthRate)).toFixed(1)}% below</span>
              ) : (
                <span className="text-red-400">{(parseFloat(localSettings.spendingGrowthRate) - parseFloat(localSettings.rateOfReturn)).toFixed(1)}% above</span>
              )}{' '}
              your expected return rate of {localSettings.rateOfReturn}%. This means{' '}
              {parseFloat(localSettings.spendingGrowthRate) < parseFloat(localSettings.rateOfReturn) ? (
                <span className="text-emerald-400">your wealth will continue to compound even as you enjoy lifestyle upgrades.</span>
              ) : (
                <span className="text-red-400">you may not make progress toward FI - consider lowering your spending rate.</span>
              )}
            </p>
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

          {/* Quick Reference Cards */}
          <div className="mt-8">
            <h4 className="text-sm font-medium text-slate-400 mb-3">Quick Reference (at today&apos;s inflation-adjusted base of {formatCurrency(levelInfo.baseBudgetInflationAdjusted, 0)})</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'At $100K', nw: 100000 },
                { label: 'At $500K', nw: 500000 },
                { label: 'At $1M', nw: 1000000 },
                { label: 'At $2M', nw: 2000000 },
              ].map((item) => {
                const value = levelInfo.baseBudgetInflationAdjusted + (item.nw * levelInfo.spendingRate / 12)
                const nwPortion = item.nw * levelInfo.spendingRate / 12
                return (
                  <div key={item.label} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-lg font-mono text-violet-400">{formatCurrency(value, 0)}/mo</p>
                    <p className="text-xs text-slate-600">
                      <span className="text-amber-400/60">{formatCurrency(levelInfo.baseBudgetInflationAdjusted, 0)}</span>
                      {' + '}
                      <span className="text-emerald-400/60">{formatCurrency(nwPortion, 0)}</span>
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// SETTINGS TAB
// ============================================================================

interface SettingsTabProps {
  localSettings: ReturnType<typeof useFinancials>['localSettings'];
  updateLocalSetting: ReturnType<typeof useFinancials>['updateLocalSetting'];
  levelInfo: ReturnType<typeof useFinancials>['levelInfo'];
  latestEntry: ReturnType<typeof useFinancials>['latestEntry'];
  applyInflation: boolean;
  setApplyInflation: (value: boolean) => void;
}

function SettingsTab({
  localSettings,
  updateLocalSetting,
  levelInfo,
  latestEntry,
  applyInflation,
  setApplyInflation,
}: SettingsTabProps) {
  const monthlySpend = parseFloat(localSettings.monthlySpend) || 0
  const swr = parseFloat(localSettings.swr) || 0
  const fiTarget = monthlySpend > 0 && swr > 0 ? (monthlySpend * 12) / (swr / 100) : 0

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-slate-400 to-slate-300 bg-clip-text text-transparent">
        Settings
      </h1>
      <p className="text-slate-400 text-center mb-8">
        Configure your assumptions and preferences
      </p>

      {/* Investment Assumptions */}
      <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
          Investment Assumptions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Expected Rate of Return
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Annual return rate for your investments (e.g., 7% for stock market average)
            </p>
            <div className="relative">
              <input
                type="number"
                value={localSettings.rateOfReturn}
                onChange={(e) => updateLocalSetting('rateOfReturn', e.target.value)}
                placeholder="7"
                min="0"
                max="30"
                step="0.1"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 pr-8 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Inflation Rate
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Expected annual inflation for adjusting future values
            </p>
            <div className="relative">
              <input
                type="number"
                value={localSettings.inflationRate}
                onChange={(e) => updateLocalSetting('inflationRate', e.target.value)}
                placeholder="3"
                min="0"
                max="20"
                step="0.1"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 pr-8 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Safe Withdrawal Rate (SWR)
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Percentage you can safely withdraw annually in retirement (typically 3-4%)
            </p>
            <div className="relative">
              <input
                type="number"
                value={localSettings.swr}
                onChange={(e) => updateLocalSetting('swr', e.target.value)}
                placeholder="4"
                min="0"
                max="10"
                step="0.1"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 pr-8 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Yearly Contribution
            </label>
            <p className="text-xs text-slate-500 mb-2">
              How much you add to investments annually
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={localSettings.yearlyContribution}
                onChange={(e) => updateLocalSetting('yearlyContribution', e.target.value)}
                placeholder="0"
                min="0"
                step="1000"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 pl-7 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Spending & FI Target */}
      <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-violet-400 rounded-full"></span>
          Spending & FI Target
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Monthly Spending
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Your current monthly expenses (used to calculate FI target)
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={localSettings.monthlySpend}
                onChange={(e) => updateLocalSetting('monthlySpend', e.target.value)}
                placeholder="0"
                min="0"
                step="100"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 pl-7 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-end">
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Apply Inflation to Projections
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Increase spending target each year for inflation
              </p>
              <button
                onClick={() => setApplyInflation(!applyInflation)}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  applyInflation
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                }`}
              >
                {applyInflation ? 'Inflation Enabled' : 'Inflation Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* Calculated FI Target */}
        {fiTarget > 0 && (
          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
            <p className="text-sm text-slate-400">
              <span className="text-slate-300 font-medium">Your FI Target:</span>{' '}
              <span className="font-mono text-violet-400">
                {formatCurrency(fiTarget)}
              </span>
              <span className="text-slate-500 ml-2">
                ({formatCurrency(monthlySpend)}/mo × 12 ÷ {localSettings.swr}%)
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Levels System */}
      <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
          Levels System
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Configure how your spending budget grows with your net worth
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Base Monthly Budget
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Floor spending for essentials (in today&apos;s dollars, adjusts for inflation)
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={localSettings.baseMonthlyBudget}
                onChange={(e) => updateLocalSetting('baseMonthlyBudget', e.target.value)}
                placeholder="3000"
                min="0"
                step="100"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 pl-7 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Net Worth Spending Rate
            </label>
            <p className="text-xs text-slate-500 mb-2">
              % of current net worth added to monthly budget (keep below return rate!)
            </p>
            <div className="relative">
              <input
                type="number"
                value={localSettings.spendingGrowthRate}
                onChange={(e) => updateLocalSetting('spendingGrowthRate', e.target.value)}
                placeholder="2"
                min="0"
                max="10"
                step="0.1"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 pr-8 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </div>
        </div>

        {/* Formula Preview */}
        <div className="mt-4 p-4 bg-slate-900/50 rounded-lg space-y-2">
          <p className="text-sm text-slate-300 font-medium">Budget Formula:</p>
          <p className="text-xs text-slate-400">
            Unlocked Budget = <span className="text-amber-400">Base (inflation-adjusted)</span> + <span className="text-emerald-400">(Net Worth × {localSettings.spendingGrowthRate}% ÷ 12)</span>
          </p>
          {latestEntry && (
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-700">
              Current: <span className="text-amber-400">{formatCurrency(levelInfo.baseBudgetInflationAdjusted)}</span> + <span className="text-emerald-400">{formatCurrency(levelInfo.netWorthPortion)}</span> = <span className="text-violet-400 font-mono">{formatCurrency(levelInfo.unlockedAtNetWorth)}/mo</span>
            </p>
          )}
        </div>

        {/* Warning if spending rate >= return rate */}
        {parseFloat(localSettings.spendingGrowthRate) >= parseFloat(localSettings.rateOfReturn) && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">
              Warning: Your spending rate ({localSettings.spendingGrowthRate}%) should be less than your return rate ({localSettings.rateOfReturn}%) to make progress toward FI.
            </p>
          </div>
        )}

        {/* Progress info */}
        {parseFloat(localSettings.spendingGrowthRate) < parseFloat(localSettings.rateOfReturn) && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-xs text-emerald-400">
              <span className="font-medium">On track:</span> With {localSettings.rateOfReturn}% returns and {localSettings.spendingGrowthRate}% spending rate, 
              you keep {(parseFloat(localSettings.rateOfReturn) - parseFloat(localSettings.spendingGrowthRate)).toFixed(1)}% of net worth growth toward FI each year.
            </p>
          </div>
        )}
      </div>

      {/* Personal Info */}
      <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-sky-400 rounded-full"></span>
          Personal Info
        </h3>
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Birth Date
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Used to show your age in projections
          </p>
          <input
            type="date"
            value={localSettings.birthDate}
            onChange={(e) => updateLocalSetting('birthDate', e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Settings Summary */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-6 border border-slate-600">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Current Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs">Return Rate</p>
            <p className="text-emerald-400 font-mono">{localSettings.rateOfReturn}%</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">SWR</p>
            <p className="text-amber-400 font-mono">{localSettings.swr}%</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Inflation</p>
            <p className="text-amber-400 font-mono">{localSettings.inflationRate}%</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Yearly Contribution</p>
            <p className="text-sky-400 font-mono">{formatCurrency(parseFloat(localSettings.yearlyContribution) || 0)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Monthly Spend</p>
            <p className="text-violet-400 font-mono">{formatCurrency(parseFloat(localSettings.monthlySpend) || 0)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Base Budget</p>
            <p className="text-amber-400 font-mono">{formatCurrency(parseFloat(localSettings.baseMonthlyBudget) || 0)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Spending Rate</p>
            <p className="text-emerald-400 font-mono">{localSettings.spendingGrowthRate}%</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Inflation in Projections</p>
            <p className={`font-mono ${applyInflation ? 'text-emerald-400' : 'text-slate-500'}`}>
              {applyInflation ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Settings are saved automatically as you type.
        </p>
      </div>
    </div>
  )
}
