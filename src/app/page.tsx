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
  FiMilestone,
  FI_MILESTONE_DEFINITIONS,
  calculateRunwayYears,
  calculateDollarMultiplier,
  calculateRunwayAndCoastInfo,
  calculateProjectedRetirementIncome,
} from '../lib/calculations'
import { TrackedValue, SimpleTrackedValue } from './components/TrackedValue'
import { 
  generateTrackedDashboardValues, 
  createTrackedAmount, 
  createTrackedProjectionValues,
  createTrackedRunwayInfo,
  createTrackedCoastInfo,
  createTrackedPercentageMilestone,
  createTrackedRunwayMilestone,
  createTrackedCoastMilestone,
  createTrackedLifestyleMilestone,
  createTrackedCrossoverMilestone,
  createTrackedRetirementIncomeMilestone,
  createTrackedRetirementIncomeInfo,
  TrackedDashboardValues 
} from '../lib/trackedScenarioValues'
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

type Tab = 'dashboard' | 'entries' | 'projections' | 'scenarios'

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
  const [includeSavings, setIncludeSavings] = useState(false);

  // Generate tracked values for calculation transparency
  const trackedValues = useMemo(() => {
    if (!latestEntry || !primaryProjection) return null;
    return generateTrackedDashboardValues(primaryProjection, latestEntry.timestamp, includeSavings);
  }, [latestEntry, primaryProjection, includeSavings]);

  // Compounding multiplier data
  const compoundingInfo = useMemo(() => {
    if (!primaryProjection) return null;
    const { currentNetWorth, projections, scenario } = primaryProjection;
    const currentYear = new Date().getFullYear();
    const firstRow = projections[0];
    const birthYear = firstRow?.age ? currentYear - firstRow.age : null;
    const currentAge = birthYear ? currentYear - birthYear : null;
    const currentMonthlySpend = projections[0]?.monthlySpend ?? 0;
    const retirementAge = 65;

    const runwayAndCoastInfo = calculateRunwayAndCoastInfo(
      currentNetWorth.total,
      currentMonthlySpend,
      birthYear,
      scenario.currentRate,
      scenario.inflationRate,
      scenario.swr
    );

    const trackedCoast = createTrackedCoastInfo(
      currentNetWorth.total,
      currentMonthlySpend,
      currentAge,
      retirementAge,
      scenario.currentRate,
      scenario.inflationRate,
      scenario.swr
    );

    return { runwayAndCoastInfo, trackedCoast };
  }, [primaryProjection]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
        Net Worth Tracker
      </h1>
      <p className="text-slate-400 text-center mb-10">
        Watch your investments grow in real-time
      </p>

      {/* Current Total Display */}
      {latestEntry && primaryProjection && trackedValues ? (
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
            <TrackedValue 
              value={trackedValues.currentNetWorth}
              decimals={6}
              className="text-4xl md:text-5xl font-bold font-mono bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"
            />
          </div>
          <p className="text-xs text-slate-500 text-center mt-1">
            Click any number to see calculation details
          </p>
          <div className="mt-4 flex justify-center gap-8 text-sm">
            <div className="text-center">
              <p className="text-slate-500">Base Amount</p>
              <TrackedValue
                value={trackedValues.baseAmount}
                className="text-slate-300 font-mono"
              />
            </div>
            <div className="text-center">
              <p className="text-slate-500">Appreciation</p>
              <span className="text-emerald-400 font-mono">+<TrackedValue
                value={trackedValues.appreciation}
                decimals={4}
                className="text-emerald-400 font-mono"
              /></span>
            </div>
            {includeSavings && (
              <div className="text-center">
                <p className="text-slate-500">Savings</p>
                <span className="text-violet-400 font-mono">+<TrackedValue
                  value={trackedValues.contributions}
                  decimals={2}
                  className="text-violet-400 font-mono"
                /></span>
              </div>
            )}
          </div>
          <p className="text-slate-500 text-center mt-4 text-xs">
            Last updated {getTimeSinceEntry(latestEntry.timestamp)} at {primaryProjection.scenario.currentRate}% annual return
            {includeSavings && ` + ${formatCurrency(primaryProjection.scenario.yearlyContribution, 0)}/yr savings`}
          </p>

          {/* Toggle + Growth Rates */}
          <div className="border-t border-slate-700 mt-6 pt-6">
            {/* Toggle: Interest Only / Interest + Savings */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex rounded-lg bg-slate-900/70 p-0.5">
                <button
                  onClick={() => setIncludeSavings(false)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    !includeSavings
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Interest Only
                </button>
                <button
                  onClick={() => setIncludeSavings(true)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    includeSavings
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Interest + Savings
                </button>
              </div>
            </div>

            <h3 className="text-sm font-medium text-slate-400 mb-3">
              {includeSavings ? 'Growth Rate (Interest + Savings)' : 'Appreciation Rate'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Per Second</p>
                <TrackedValue
                  value={trackedValues.growthPerSecond}
                  decimals={6}
                  className="text-emerald-400 font-mono"
                />
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Per Minute</p>
                <TrackedValue
                  value={trackedValues.growthPerMinute}
                  decimals={4}
                  className="text-emerald-400 font-mono"
                />
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Per Hour</p>
                <TrackedValue
                  value={trackedValues.growthPerHour}
                  className="text-emerald-400 font-mono"
                />
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Per Day</p>
                <TrackedValue
                  value={trackedValues.growthPerDay}
                  className="text-emerald-400 font-mono"
                />
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 col-span-2 sm:col-span-2">
                <p className="text-slate-500 text-xs">Per Year</p>
                <TrackedValue
                  value={trackedValues.growthPerYear}
                  className="text-emerald-400 font-mono text-lg"
                />
              </div>
            </div>
          </div>
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

      {/* Spending Section — SWR + Monthly Spending Budget */}
      {latestEntry && primaryProjection && trackedValues && (
        <div className="mt-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
          <h2 className="text-lg font-semibold text-slate-300 mb-4">
            Spending
          </h2>

          {/* Safe Withdrawal Rate */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              Safe Withdrawal Rate <span className="text-slate-500">({primaryProjection.scenario.swr}%)</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Annual</p>
                <TrackedValue
                  value={trackedValues.annualSwr}
                  className="text-amber-400 font-mono text-lg"
                />
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs">Monthly</p>
                <TrackedValue
                  value={trackedValues.monthlySwr}
                  className="text-amber-400 font-mono text-lg"
                />
              </div>
            </div>
          </div>

          {/* Monthly Spending Budget */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-slate-400 mb-3">
              Monthly Spending Budget
            </h3>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-500 text-xs">Current Monthly Budget</p>
                <TrackedValue
                  value={trackedValues.currentSpending}
                  className="text-violet-400 font-mono text-2xl font-semibold"
                />
              </div>
              <div className="text-xs space-y-2 pt-3 border-t border-slate-700">
                <div className="flex justify-between text-slate-500">
                  <span>Base budget (inflation-adjusted)</span>
                  <span className="font-mono text-amber-400">{formatCurrency(primaryProjection.levelInfo.baseBudgetInflationAdjusted, 0)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>+ {primaryProjection.scenario.spendingGrowthRate}% of net worth / 12</span>
                  <span className="font-mono text-emerald-400">+{formatCurrency(primaryProjection.levelInfo.netWorthPortion, 0)}</span>
                </div>
              </div>
              <p className="text-slate-600 text-xs mt-3">
                Your spending allowance grows as your net worth increases
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FI Milestones Section */}
      {latestEntry && primaryProjection && (
        <FiMilestonesCard primaryProjection={primaryProjection} compoundingInfo={compoundingInfo} />
      )}
    </div>
  )
}

// ============================================================================
// FI MILESTONES CARD
// ============================================================================

interface FiMilestonesCardProps {
  primaryProjection: ScenarioProjection;
  compoundingInfo?: {
    runwayAndCoastInfo: ReturnType<typeof calculateRunwayAndCoastInfo>;
    trackedCoast: ReturnType<typeof createTrackedCoastInfo>;
  } | null;
}

function FiMilestonesCard({ primaryProjection, compoundingInfo }: FiMilestonesCardProps) {
  const { fiMilestones, currentFiProgress, currentNetWorth, projections, scenario } = primaryProjection;
  const currentYear = new Date().getFullYear();
  const currentFiTarget = projections[0]?.fiTarget ?? 0;
  const currentMonthlySpend = projections[0]?.monthlySpend ?? 0;
  
  // Get birth year from projections if available
  const firstRow = projections[0];
  const birthYear = firstRow?.age ? currentYear - firstRow.age : null;
  const currentAge = birthYear ? currentYear - birthYear : null;
  const retirementAge = 65;
  
  // Calculate runway and coast info for context display
  const runwayAndCoastInfo = useMemo(() => {
    return calculateRunwayAndCoastInfo(
      currentNetWorth.total,
      currentMonthlySpend,
      birthYear,
      scenario.currentRate,
      scenario.inflationRate,
      scenario.swr
    );
  }, [currentNetWorth.total, currentMonthlySpend, birthYear, scenario]);
  
  // Create tracked runway values
  const trackedRunway = useMemo(() => {
    return createTrackedRunwayInfo(currentNetWorth.total, currentMonthlySpend);
  }, [currentNetWorth.total, currentMonthlySpend]);
  
  // Create tracked coast values
  const trackedCoast = useMemo(() => {
    return createTrackedCoastInfo(
      currentNetWorth.total,
      currentMonthlySpend,
      currentAge,
      retirementAge,
      scenario.currentRate,
      scenario.inflationRate,
      scenario.swr
    );
  }, [currentNetWorth.total, currentMonthlySpend, currentAge, scenario]);
  
  // Filter milestones by type for display
  const runwayMilestones = fiMilestones.milestones.filter(m => m.type === 'runway');
  const coastMilestones = fiMilestones.milestones.filter(m => m.type === 'coast');
  const percentageMilestones = fiMilestones.milestones.filter(m => m.type === 'percentage');
  const lifestyleMilestones = fiMilestones.milestones.filter(m => m.type === 'lifestyle');
  const specialMilestones = fiMilestones.milestones.filter(m => m.type === 'special');
  const retirementIncomeMilestones = fiMilestones.milestones.filter(m => m.type === 'retirement_income');
  
  // Calculate tracked retirement income info
  const trackedRetirementIncome = useMemo(() => {
    return createTrackedRetirementIncomeInfo(
      currentNetWorth.total,
      currentAge,
      retirementAge,
      scenario.currentRate,
      scenario.inflationRate,
      scenario.swr
    );
  }, [currentNetWorth.total, currentAge, retirementAge, scenario.currentRate, scenario.inflationRate, scenario.swr]);
  
  return (
    <div className="mt-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
      <h2 className="text-lg font-semibold text-slate-300 mb-2">
        FI Milestones
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Your journey to financial independence
      </p>
      
      {/* Current Progress Overview */}
      <div className="mb-6 bg-slate-900/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-400 text-sm">Current FI Progress</span>
          <SimpleTrackedValue 
            value={currentFiProgress} 
            name="Current FI Progress" 
            description="Percentage of FI target achieved"
            formula="(Current Net Worth ÷ FI Target) × 100"
            inputs={[{ name: 'Net Worth', value: currentNetWorth.total, unit: '$' }, { name: 'FI Target', value: currentFiTarget, unit: '$' }]}
            formatAs="percent"
            decimals={1}
            className="text-emerald-400 font-mono text-lg font-semibold"
          />
        </div>
        
        {/* Progress bar with milestone markers */}
        <div className="relative">
          <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, currentFiProgress)}%` }}
            />
          </div>
          
          {/* Milestone markers */}
          <div className="absolute top-0 left-0 right-0 h-4 flex items-center">
            {[10, 25, 50, 75, 100].map(percent => (
              <div
                key={percent}
                className="absolute h-4 w-0.5 bg-slate-600"
                style={{ left: `${percent}%` }}
                title={`${percent}% FI`}
              />
            ))}
          </div>
        </div>
        
        {/* Milestone labels */}
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
        
        {/* Next milestone info */}
        {fiMilestones.nextMilestone && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm font-medium">
                  Next: {fiMilestones.nextMilestone.shortName}
                </p>
                <p className="text-slate-500 text-xs">
                  {(() => {
                    const m = fiMilestones.nextMilestone!;
                    const monthAbbrev = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const monthStr = m.month ? `${monthAbbrev[m.month - 1]} ` : '';
                    if (m.yearsFromNow === 0) return `${monthStr}${m.year}`;
                    if (m.yearsFromNow === 1) return m.month ? `${monthStr}${m.year}` : 'Next year';
                    return m.month ? `${monthStr}${m.year}` : `In ${m.yearsFromNow} years`;
                  })()}
                  {fiMilestones.nextMilestone.age && ` (age ${fiMilestones.nextMilestone.age})`}
                </p>
              </div>
              <div className="text-right">
                <SimpleTrackedValue
                  value={fiMilestones.amountToNext}
                  name="Amount to Next Milestone"
                  description={`Amount needed to reach ${fiMilestones.nextMilestone.shortName}`}
                  formula={`${fiMilestones.nextMilestone.shortName} Target - Current Net Worth`}
                  inputs={[
                    { name: 'Target Progress', value: fiMilestones.nextMilestone.targetValue, unit: '%' },
                    { name: 'Current Progress', value: Math.round(currentFiProgress * 10) / 10, unit: '%' },
                  ]}
                  className="text-slate-300 font-mono text-sm"
                />
                <p className="text-slate-500 text-xs">to go</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Compounding Multiplier */}
      {compoundingInfo && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3">
            Compounding Multiplier
          </h3>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-sm text-amber-400/80">
              💡 Every $1 you save today = <TrackedValue
                value={compoundingInfo.trackedCoast.dollarMultiplier}
                showCurrency={false}
                formatter={(v) => `$${v.toFixed(2)}`}
                className="font-mono font-semibold text-amber-400"
              /> at retirement
              {compoundingInfo.runwayAndCoastInfo.yearsToRetirement > 0 && (
                <span className="text-slate-500"> (<TrackedValue
                  value={compoundingInfo.trackedCoast.yearsToRetirement}
                  showCurrency={false}
                  formatter={(v) => `${Math.round(v)}`}
                  className="text-slate-500"
                /> years of compounding)</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Runway Milestones - Security */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400">
            Runway Milestones
          </h3>
          <div className="text-right">
            <span className="text-xs text-slate-500">Current: </span>
            {runwayAndCoastInfo.currentRunwayYears >= 100 ? (
              <span className="text-sm font-mono text-emerald-400">∞</span>
            ) : runwayAndCoastInfo.currentRunwayYears >= 1 ? (
              <TrackedValue 
                value={trackedRunway.runwayYears}
                showCurrency={false}
                formatter={(v) => `${v.toFixed(1)} years`}
                className="text-sm font-mono text-emerald-400"
              />
            ) : (
              <TrackedValue 
                value={trackedRunway.runwayMonths}
                showCurrency={false}
                formatter={(v) => `${Math.round(v)} months`}
                className="text-sm font-mono text-emerald-400"
              />
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">How long you could survive without income</p>
        <div className="space-y-2">
          {runwayMilestones.map(milestone => (
            <TrackedMilestoneRow 
              key={milestone.id} 
              milestone={milestone} 
              currentYear={currentYear}
              currentNetWorth={currentNetWorth.total}
              currentMonthlySpend={currentMonthlySpend}
              currentFiTarget={currentFiTarget}
              currentFiProgress={currentFiProgress}
              currentAge={currentAge}
              retirementAge={retirementAge}
              scenario={scenario}
            />
          ))}
        </div>
      </div>
      
      {/* Coast Milestones - Compounding Power */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400">
            Coast Milestones
          </h3>
          <div className="text-right">
            <span className="text-xs text-slate-500">Coast to: </span>
            <TrackedValue 
              value={trackedCoast.coastFiPercent}
              showCurrency={false}
              formatter={(v) => `${v.toFixed(0)}% FI`}
              className="text-sm font-mono text-violet-400"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">If you stopped contributing today (by age {runwayAndCoastInfo.retirementAge})</p>
        <div className="space-y-2">
          {coastMilestones.map(milestone => (
            <TrackedMilestoneRow 
              key={milestone.id} 
              milestone={milestone} 
              currentYear={currentYear}
              currentNetWorth={currentNetWorth.total}
              currentMonthlySpend={currentMonthlySpend}
              currentFiTarget={currentFiTarget}
              currentFiProgress={currentFiProgress}
              currentAge={currentAge}
              retirementAge={retirementAge}
              scenario={scenario}
            />
          ))}
        </div>
      </div>
      
      {/* Retirement Income Milestones - The Key Metric */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400">
            Retirement Income (Today's $)
          </h3>
          <div className="text-right">
            <TrackedValue 
              value={trackedRetirementIncome.projectedRealAnnualIncome}
              showCurrency={true}
              formatter={(v) => `$${Math.round(v).toLocaleString()}/yr`}
              className="text-sm font-mono text-amber-400"
            />
            <span className="text-xs text-slate-500 block">in today's purchasing power</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-2">
          If you stopped saving today, what lifestyle (in today's terms) could you afford at retirement (age {retirementAge})?
        </p>
        <p className="text-xs text-slate-400/80 mb-1">
          Actual withdrawal: <TrackedValue 
            value={trackedRetirementIncome.projectedNominalAnnualIncome}
            showCurrency={true}
            formatter={(v) => `$${Math.round(v).toLocaleString()}/yr`}
            className="font-mono text-slate-400"
          /> (future dollars, same purchasing power)
        </p>
        <p className="text-xs text-amber-400/80 mb-3">
          💡 Prices will be <TrackedValue 
            value={trackedRetirementIncome.inflationMultiplier}
            showCurrency={false}
            formatter={(v) => `${v.toFixed(1)}×`}
            className="font-mono font-semibold text-amber-400"
          /> higher by retirement
        </p>
        <div className="space-y-2">
          {/* Only show upcoming/unachieved milestones, sorted by target value */}
          {retirementIncomeMilestones
            .filter(m => !m.isAchieved)
            .slice(0, 5) // Show next 5 upcoming milestones
            .map(milestone => (
            <TrackedMilestoneRow 
              key={milestone.id} 
              milestone={milestone} 
              currentYear={currentYear}
              currentNetWorth={currentNetWorth.total}
              currentMonthlySpend={currentMonthlySpend}
              currentFiTarget={currentFiTarget}
              currentFiProgress={currentFiProgress}
              currentAge={currentAge}
              retirementAge={retirementAge}
              scenario={scenario}
            />
          ))}
          {/* Show count of achieved milestones */}
          {retirementIncomeMilestones.filter(m => m.isAchieved).length > 0 && (
            <div className="text-xs text-emerald-400 mt-2 pt-2 border-t border-slate-700">
              ✓ {retirementIncomeMilestones.filter(m => m.isAchieved).length} retirement income milestones achieved
            </div>
          )}
        </div>
      </div>
      
      {/* Percentage Milestones */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-400 mb-3">
          Progress Milestones
        </h3>
        <div className="space-y-2">
          {percentageMilestones.map(milestone => (
            <TrackedMilestoneRow 
              key={milestone.id} 
              milestone={milestone} 
              currentYear={currentYear}
              currentNetWorth={currentNetWorth.total}
              currentMonthlySpend={currentMonthlySpend}
              currentFiTarget={currentFiTarget}
              currentFiProgress={currentFiProgress}
              currentAge={currentAge}
              retirementAge={retirementAge}
              scenario={scenario}
            />
          ))}
        </div>
      </div>
      
      {/* Lifestyle Milestones */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-400 mb-3">
          Lifestyle Milestones
        </h3>
        <div className="space-y-2">
          {lifestyleMilestones.map(milestone => (
            <TrackedMilestoneRow 
              key={milestone.id} 
              milestone={milestone} 
              currentYear={currentYear}
              currentNetWorth={currentNetWorth.total}
              currentMonthlySpend={currentMonthlySpend}
              currentFiTarget={currentFiTarget}
              currentFiProgress={currentFiProgress}
              currentAge={currentAge}
              retirementAge={retirementAge}
              scenario={scenario}
            />
          ))}
        </div>
      </div>
      
      {/* Special Milestones */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">
          Special Milestones
        </h3>
        <div className="space-y-2">
          {specialMilestones.map(milestone => (
            <TrackedMilestoneRow 
              key={milestone.id} 
              milestone={milestone} 
              currentYear={currentYear}
              currentNetWorth={currentNetWorth.total}
              currentMonthlySpend={currentMonthlySpend}
              currentFiTarget={currentFiTarget}
              currentFiProgress={currentFiProgress}
              currentAge={currentAge}
              retirementAge={retirementAge}
              scenario={scenario}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface MilestoneRowProps {
  milestone: FiMilestone;
  currentYear: number;
}

interface TrackedMilestoneRowProps extends MilestoneRowProps {
  currentNetWorth: number;
  currentMonthlySpend: number;
  currentFiTarget: number;
  currentFiProgress: number;
  currentAge: number | null;
  retirementAge: number;
  scenario: {
    currentRate: number;
    inflationRate: number;
    swr: number;
  };
}

function TrackedMilestoneRow({ 
  milestone, 
  currentYear,
  currentNetWorth,
  currentMonthlySpend,
  currentFiTarget,
  currentFiProgress,
  currentAge,
  retirementAge,
  scenario,
}: TrackedMilestoneRowProps) {
  const [showDescription, setShowDescription] = React.useState(false);
  
  // Create tracked milestone info based on type
  const trackedInfo = useMemo(() => {
    if (milestone.type === 'percentage') {
      return createTrackedPercentageMilestone(
        milestone.id,
        milestone.shortName,
        milestone.targetValue,
        currentNetWorth,
        currentFiTarget,
        currentFiProgress,
        milestone.netWorthAtMilestone,
        milestone.year,
        currentYear
      );
    } else if (milestone.type === 'runway') {
      const currentRunwayYears = currentMonthlySpend > 0 ? currentNetWorth / (currentMonthlySpend * 12) : 0;
      return createTrackedRunwayMilestone(
        milestone.id,
        milestone.shortName,
        milestone.targetValue,
        currentNetWorth,
        currentMonthlySpend,
        currentRunwayYears,
        milestone.netWorthAtMilestone,
        milestone.year,
        currentYear
      );
    } else if (milestone.type === 'coast') {
      const coastInfo = createTrackedCoastInfo(
        currentNetWorth,
        currentMonthlySpend,
        currentAge,
        retirementAge,
        scenario.currentRate,
        scenario.inflationRate,
        scenario.swr
      );
      return createTrackedCoastMilestone(
        milestone.id,
        milestone.shortName,
        milestone.targetValue,
        currentNetWorth,
        currentMonthlySpend,
        coastInfo.coastFiPercent.value,
        currentAge,
        retirementAge,
        scenario.currentRate,
        scenario.inflationRate,
        scenario.swr,
        milestone.netWorthAtMilestone,
        milestone.year,
        currentYear
      );
    } else if (milestone.type === 'lifestyle') {
      return createTrackedLifestyleMilestone(
        milestone.id,
        milestone.shortName,
        milestone.targetValue,
        currentNetWorth,
        currentMonthlySpend,
        scenario.swr,
        milestone.netWorthAtMilestone,
        milestone.year,
        currentYear
      );
    } else if (milestone.type === 'retirement_income') {
      return createTrackedRetirementIncomeMilestone(
        milestone.id,
        milestone.shortName,
        milestone.targetValue,
        currentNetWorth,
        currentAge,
        retirementAge,
        scenario.currentRate,
        scenario.inflationRate,
        scenario.swr,
        milestone.netWorthAtMilestone,
        milestone.year,
        currentYear
      );
    } else if (milestone.id === 'crossover') {
      // For crossover, we need interest and contributions
      // We'll use simplified values here
      const currentInterest = currentNetWorth * (scenario.currentRate / 100);
      const currentContributions = 0; // Would need actual contribution data
      return createTrackedCrossoverMilestone(
        currentInterest,
        currentContributions,
        milestone.netWorthAtMilestone,
        milestone.year,
        currentYear
      );
    }
    // Default: return null for unsupported types
    return null;
  }, [milestone, currentNetWorth, currentMonthlySpend, currentFiTarget, currentFiProgress, currentAge, retirementAge, scenario, currentYear]);
  
  return (
    <div 
      className={`rounded-lg p-3 transition-colors cursor-pointer ${
        milestone.isAchieved 
          ? 'bg-emerald-900/30 border border-emerald-500/30' 
          : 'bg-slate-900/50 hover:bg-slate-900/70'
      }`}
      onClick={() => setShowDescription(!showDescription)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className={`w-3 h-3 rounded-full ${milestone.isAchieved ? 'bg-emerald-400' : 'bg-slate-600'}`}
            style={!milestone.isAchieved ? { borderColor: milestone.color, borderWidth: 2 } : { backgroundColor: milestone.color }}
          />
          <div>
            <span className={`text-sm font-medium ${milestone.isAchieved ? 'text-emerald-300' : 'text-slate-300'}`}>
              {milestone.shortName}
            </span>
            {milestone.isAchieved && (
              <span className="ml-2 text-xs text-emerald-400">Achieved</span>
            )}
          </div>
        </div>
        
        <div className="text-right">
          {milestone.year ? (
            <>
              {trackedInfo?.yearsToMilestone ? (
                <TrackedValue
                  value={trackedInfo.yearsToMilestone}
                  showCurrency={false}
                  formatter={(v) => {
                    const monthAbbrev = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return milestone.month
                      ? `${monthAbbrev[milestone.month - 1]} ${milestone.year}`
                      : `${milestone.year}`;
                  }}
                  className={`text-sm font-mono ${milestone.isAchieved ? 'text-emerald-400' : 'text-slate-400'}`}
                />
              ) : (
                <span className={`text-sm font-mono ${milestone.isAchieved ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {milestone.month
                    ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][milestone.month - 1]} ${milestone.year}`
                    : milestone.year}
                </span>
              )}
              {milestone.age && (
                <span className="text-xs text-slate-500 ml-2">
                  (age {milestone.age})
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-500">Not projected</span>
          )}
        </div>
      </div>
      
      {showDescription && (
        <div className="mt-2 text-xs text-slate-400 pl-6 space-y-2">
          <p>{milestone.description}</p>

          {/* Coast milestone: current coast % with detailed math in tooltip */}
          {milestone.type === 'coast' && (() => {
            const yearsToRetirement = currentAge !== null
              ? Math.max(0, retirementAge - currentAge)
              : 30;
            const returnRate = scenario.currentRate / 100;
            const inflation = scenario.inflationRate / 100;
            const growthMultiplier = Math.pow(1 + returnRate, yearsToRetirement);
            const inflationMultiplier = Math.pow(1 + inflation, yearsToRetirement);
            const futureNW = currentNetWorth * growthMultiplier;
            const futureMonthlySpend = currentMonthlySpend * inflationMultiplier;
            const futureFiTarget = (futureMonthlySpend * 12) / (scenario.swr / 100);
            const currentCoastPct = futureFiTarget > 0 ? (futureNW / futureFiTarget) * 100 : 0;
            const targetFutureNW = futureFiTarget * (milestone.targetValue / 100);
            const targetCurrentNW = growthMultiplier > 0 ? targetFutureNW / growthMultiplier : targetFutureNW;

            return (
              <div className="bg-slate-800/50 rounded p-2">
                <span className="text-slate-500">Current coast: </span>
                <SimpleTrackedValue
                  value={currentCoastPct}
                  name={`Coast FI % (toward ${milestone.shortName})`}
                  description={`If you stopped contributing today, your investments would grow to ${currentCoastPct.toFixed(1)}% of your FI target by age ${retirementAge}. This milestone requires ${milestone.targetValue}%.`}
                  formula="(Future NW ÷ Future FI Target) × 100"
                  inputs={[
                    { name: 'Current Net Worth', value: currentNetWorth, unit: '$' },
                    { name: 'Current Monthly Spend', value: currentMonthlySpend, unit: '$' },
                    { name: 'Years to Retirement', value: yearsToRetirement, unit: 'years' },
                    { name: 'Annual Return Rate', value: `${scenario.currentRate}%` },
                    { name: 'Inflation Rate', value: `${scenario.inflationRate}%` },
                    { name: 'SWR', value: `${scenario.swr}%` },
                  ]}
                  steps={[
                    {
                      description: `Compound net worth at ${scenario.currentRate}% for ${yearsToRetirement} years`,
                      formula: `${formatCurrency(currentNetWorth, 0)} × (1 + ${returnRate.toFixed(4)})^${yearsToRetirement}`,
                      result: futureNW,
                      unit: '$',
                    },
                    {
                      description: `Inflate spending at ${scenario.inflationRate}% for ${yearsToRetirement} years`,
                      formula: `${formatCurrency(currentMonthlySpend, 0)}/mo × (1 + ${inflation.toFixed(4)})^${yearsToRetirement}`,
                      result: futureMonthlySpend,
                      unit: '$',
                    },
                    {
                      description: 'Future FI target (annual spending ÷ SWR)',
                      formula: `(${formatCurrency(futureMonthlySpend, 0)} × 12) ÷ ${scenario.swr}%`,
                      result: futureFiTarget,
                      unit: '$',
                    },
                    {
                      description: 'Coast FI % (future NW ÷ future FI target)',
                      formula: `(${formatCurrency(futureNW, 0)} ÷ ${formatCurrency(futureFiTarget, 0)}) × 100`,
                      result: currentCoastPct,
                      unit: '%',
                    },
                    {
                      description: `NW needed today to coast to ${milestone.targetValue}%`,
                      formula: `${formatCurrency(futureFiTarget, 0)} × ${milestone.targetValue}% ÷ ${growthMultiplier.toFixed(2)}x`,
                      result: targetCurrentNW,
                      unit: '$',
                    },
                  ]}
                  formatAs="percent"
                  decimals={1}
                  className="text-violet-400"
                />
              </div>
            );
          })()}

          {/* Target value with full calculation trace */}
          {trackedInfo?.targetValue && (
            <div className="bg-slate-800/50 rounded p-2">
              <span className="text-slate-500">Target: </span>
              <TrackedValue
                value={trackedInfo.targetValue}
                className="text-slate-300"
              />
            </div>
          )}

          {/* Amount needed if not achieved */}
          {!milestone.isAchieved && trackedInfo?.amountNeeded && (
            <div className="bg-slate-800/50 rounded p-2">
              <span className="text-slate-500">Amount needed: </span>
              <TrackedValue
                value={trackedInfo.amountNeeded}
                className="text-amber-400"
              />
            </div>
          )}

          {/* Net worth at milestone */}
          {trackedInfo?.netWorthAtMilestone && (
            <div className="bg-slate-800/50 rounded p-2">
              <span className="text-slate-500">Net worth at milestone: </span>
              <TrackedValue
                value={trackedInfo.netWorthAtMilestone}
                className="text-slate-300"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Legacy MilestoneRow for backwards compatibility
function MilestoneRow({ milestone, currentYear }: MilestoneRowProps) {
  const [showDescription, setShowDescription] = React.useState(false);
  
  return (
    <div 
      className={`rounded-lg p-3 transition-colors cursor-pointer ${
        milestone.isAchieved 
          ? 'bg-emerald-900/30 border border-emerald-500/30' 
          : 'bg-slate-900/50 hover:bg-slate-900/70'
      }`}
      onClick={() => setShowDescription(!showDescription)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className={`w-3 h-3 rounded-full ${milestone.isAchieved ? 'bg-emerald-400' : 'bg-slate-600'}`}
            style={!milestone.isAchieved ? { borderColor: milestone.color, borderWidth: 2 } : { backgroundColor: milestone.color }}
          />
          <div>
            <span className={`text-sm font-medium ${milestone.isAchieved ? 'text-emerald-300' : 'text-slate-300'}`}>
              {milestone.shortName}
            </span>
            {milestone.isAchieved && (
              <span className="ml-2 text-xs text-emerald-400">Achieved</span>
            )}
          </div>
        </div>
        
        <div className="text-right">
          {milestone.year ? (
            <>
              <span className={`text-sm font-mono ${milestone.isAchieved ? 'text-emerald-400' : 'text-slate-400'}`}>
                {milestone.year}
              </span>
              {milestone.age && (
                <span className="text-xs text-slate-500 ml-2">
                  (age {milestone.age})
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-500">Not projected</span>
          )}
        </div>
      </div>
      
      {showDescription && (
        <p className="mt-2 text-xs text-slate-400 pl-6">
          {milestone.description}
          {milestone.netWorthAtMilestone && (
            <span className="block mt-1 text-slate-500">
              Net worth at milestone: <SimpleTrackedValue
                value={milestone.netWorthAtMilestone}
                name={`${milestone.shortName} Net Worth`}
                description={`Projected net worth when reaching ${milestone.shortName}`}
                formula="Projected value at milestone achievement"
                inputs={[
                  { name: 'Milestone', value: milestone.shortName },
                  { name: 'Year', value: milestone.year || 'N/A' },
                ]}
                className="text-slate-500"
              />
            </span>
          )}
        </p>
      )}
    </div>
  );
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
                  <SimpleTrackedValue
                    value={entry.amount}
                    name="Net Worth Entry"
                    description={`Net worth recorded on ${formatDate(entry.timestamp)}`}
                    formula="Recorded Value"
                    inputs={[
                      { name: 'Date', value: formatDate(entry.timestamp) },
                      { name: 'Entry #', value: entries.length - index },
                    ]}
                    className="font-mono text-lg text-white"
                  />
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
                      <SimpleTrackedValue
                        value={liveBreakdown.taxes.grossIncome}
                        name="Gross Income"
                        description="Total annual income before any deductions"
                        formula="Annual Salary + Other Income"
                        className="font-mono text-slate-200"
                      />
                    </div>

                    {liveBreakdown.taxes.totalPreTaxContributions > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">− Pre-tax Contributions</span>
                          <span className="font-mono text-emerald-400">−<SimpleTrackedValue
                            value={liveBreakdown.taxes.totalPreTaxContributions}
                            name="Pre-Tax Contributions"
                            description="Total pre-tax retirement contributions reducing taxable income"
                            formula="401k + Traditional IRA + HSA + Other"
                            className="font-mono text-emerald-400"
                          /></span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                          <span className="text-slate-400">Adjusted Gross Income</span>
                          <SimpleTrackedValue
                            value={liveBreakdown.taxes.adjustedGrossIncome}
                            name="Adjusted Gross Income (AGI)"
                            description="Gross income minus pre-tax contributions"
                            formula="Gross Income - Pre-Tax Contributions"
                            inputs={[
                              { name: 'Gross Income', value: liveBreakdown.taxes.grossIncome, unit: '$' },
                              { name: 'Pre-Tax', value: liveBreakdown.taxes.totalPreTaxContributions, unit: '$' },
                            ]}
                            className="font-mono text-slate-200"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                      <span className="text-slate-400">− Total Taxes</span>
                      <span className="font-mono text-red-400">−<SimpleTrackedValue
                        value={liveBreakdown.taxes.totalTax}
                        name="Total Taxes"
                        description="Combined federal, state, and FICA taxes"
                        formula="Federal Tax + State Tax + Social Security + Medicare"
                        inputs={[
                          { name: 'Federal', value: liveBreakdown.taxes.federalTax, unit: '$' },
                          { name: 'State', value: liveBreakdown.taxes.stateTax, unit: '$' },
                          { name: 'FICA', value: liveBreakdown.taxes.fica.totalFicaTax, unit: '$' },
                        ]}
                        className="font-mono text-red-400"
                      /></span>
                    </div>

                    <div className="flex justify-between text-sm text-xs text-slate-500 pl-4">
                      <span>Federal: <SimpleTrackedValue
                        value={liveBreakdown.taxes.federalTax}
                        name="Federal Income Tax"
                        description="Federal income tax calculated using progressive brackets"
                        formula="Sum of (Taxable Income in Bracket × Bracket Rate)"
                        className="text-slate-500"
                      /></span>
                      <span>State: <SimpleTrackedValue
                        value={liveBreakdown.taxes.stateTax}
                        name="State Income Tax"
                        description="State income tax based on your state's rates"
                        formula="State Tax Calculation"
                        className="text-slate-500"
                      /></span>
                      <span>FICA: <SimpleTrackedValue
                        value={liveBreakdown.taxes.fica.totalFicaTax}
                        name="FICA Taxes"
                        description="Social Security and Medicare taxes"
                        formula="Social Security Tax + Medicare Tax"
                        className="text-slate-500"
                      /></span>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                      <div>
                        <span className="text-sm font-medium text-emerald-400">Net Income</span>
                        <p className="text-xs text-slate-500">
                          Effective Tax Rate: <SimpleTrackedValue value={liveBreakdown.taxes.effectiveTotalRate} name="Effective Tax Rate" description="Total taxes as a percentage of gross income" formula="Total Taxes ÷ Gross Income × 100" inputs={[{ name: 'Taxes', value: liveBreakdown.taxes.totalTax, unit: '$' }, { name: 'Gross', value: liveBreakdown.taxes.grossIncome, unit: '$' }]} formatAs="percent" decimals={1} className="text-slate-500" />
                        </p>
                      </div>
                      <SimpleTrackedValue
                        value={liveBreakdown.taxes.netIncome}
                        name="Net Income"
                        description="Take-home pay after all taxes and deductions"
                        formula="Gross Income - Pre-Tax Contributions - Total Taxes"
                        inputs={[
                          { name: 'Gross Income', value: liveBreakdown.taxes.grossIncome, unit: '$' },
                          { name: 'Pre-Tax', value: liveBreakdown.taxes.totalPreTaxContributions, unit: '$' },
                          { name: 'Total Taxes', value: liveBreakdown.taxes.totalTax, unit: '$' },
                        ]}
                        className="text-lg font-mono text-emerald-400"
                      />
                    </div>

                    <div className="border-t border-slate-700 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">− Annual Spending</span>
                        <span className="font-mono text-amber-400">−<SimpleTrackedValue
                          value={liveBreakdown.annualSpending}
                          name="Annual Spending"
                          description="Level-based annual spending budget"
                          formula="Monthly Budget × 12"
                          className="font-mono text-amber-400"
                        /></span>
                      </div>
                      <div className="flex justify-between items-center border-t border-emerald-500/30 pt-2">
                        <div>
                          <span className="text-sm font-medium text-emerald-400">Total Annual Savings</span>
                          <p className="text-xs text-slate-500">
                            <SimpleTrackedValue
                              value={liveBreakdown.monthlySavingsAvailable}
                              name="Monthly Savings"
                              description="Monthly savings available after spending"
                              formula="(Net Income - Annual Spending) ÷ 12"
                              className="text-slate-500"
                            />/month
                          </p>
                        </div>
                        <SimpleTrackedValue
                          value={liveBreakdown.totalAnnualSavings}
                          name="Total Annual Savings"
                          description="Amount saved per year after taxes and spending"
                          formula="Net Income - Annual Spending"
                          inputs={[
                            { name: 'Net Income', value: liveBreakdown.taxes.netIncome, unit: '$' },
                            { name: 'Annual Spending', value: liveBreakdown.annualSpending, unit: '$' },
                          ]}
                          className="text-lg font-mono text-emerald-400"
                        />
                      </div>

                      <p className="text-xs text-center text-slate-500 pt-2">
                        Savings Rate: <SimpleTrackedValue value={liveBreakdown.savingsRateOfGross} name="Savings Rate" description="Percentage of gross income going to savings" formula="Total Annual Savings ÷ Gross Income × 100" formatAs="percent" decimals={1} className="text-emerald-400 font-semibold" /> of gross income
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

  const primaryProjection = scenarioProjections[0];

  // Type for display rows that can be either yearly or monthly
  interface DisplayRow {
    year: number;
    displayYear?: string; // Only for monthly view
    monthIndex?: number;  // Only for monthly view (0-11)
    age: number | null;
    yearsFromEntry: number;
    netWorth: number;
    interest: number;
    contributed: number;
    annualSwr: number;
    monthlySwr: number;
    weeklySwr: number;
    dailySwr: number;
    monthlySpend: number;
    annualSpending: number;
    annualSavings: number;
    fiTarget: number;
    fiProgress: number;
    coastFiYear: number | null;
    coastFiAge: number | null;
    isFiYear: boolean;
    isCrossover: boolean;
    swrCoversSpend: boolean;
    grossIncome?: number;
    totalTax?: number;
    netIncome?: number;
    preTaxContributions?: number;
  }

  // Transform projections based on view mode
  const displayRows = useMemo((): DisplayRow[] => {
    if (viewMode === 'yearly') {
      // Map yearly projections to DisplayRow format
      return primaryProjection.projections.map(row => ({
        year: row.year,
        age: row.age,
        yearsFromEntry: row.yearsFromEntry,
        netWorth: row.netWorth,
        interest: row.interest,
        contributed: row.contributed,
        annualSwr: row.annualSwr,
        monthlySwr: row.monthlySwr,
        weeklySwr: row.weeklySwr,
        dailySwr: row.dailySwr,
        monthlySpend: row.monthlySpend,
        annualSpending: row.annualSpending,
        annualSavings: row.annualSavings,
        fiTarget: row.fiTarget,
        fiProgress: row.fiProgress,
        coastFiYear: row.coastFiYear,
        coastFiAge: row.coastFiAge,
        isFiYear: row.isFiYear,
        isCrossover: row.isCrossover,
        swrCoversSpend: row.swrCoversSpend,
        grossIncome: row.grossIncome,
        totalTax: row.totalTax,
        netIncome: row.netIncome,
        preTaxContributions: row.preTaxContributions,
      }));
    }

    // For monthly view, use the actual monthly projections data
    // This provides accurate month-by-month spending that updates with net worth
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (!primaryProjection.monthlyProjections || primaryProjection.monthlyProjections.length === 0) {
      // Fallback: if no monthly projections, return yearly
      return primaryProjection.projections.map(row => ({
        year: row.year,
        age: row.age,
        yearsFromEntry: row.yearsFromEntry,
        netWorth: row.netWorth,
        interest: row.interest,
        contributed: row.contributed,
        annualSwr: row.annualSwr,
        monthlySwr: row.monthlySwr,
        weeklySwr: row.weeklySwr,
        dailySwr: row.dailySwr,
        monthlySpend: row.monthlySpend,
        annualSpending: row.annualSpending,
        annualSavings: row.annualSavings,
        fiTarget: row.fiTarget,
        fiProgress: row.fiProgress,
        coastFiYear: row.coastFiYear,
        coastFiAge: row.coastFiAge,
        isFiYear: row.isFiYear,
        isCrossover: row.isCrossover,
        swrCoversSpend: row.swrCoversSpend,
        grossIncome: row.grossIncome,
        totalTax: row.totalTax,
        netIncome: row.netIncome,
        preTaxContributions: row.preTaxContributions,
      }));
    }

    // Convert monthly projections to display rows
    return primaryProjection.monthlyProjections.map((month, idx): DisplayRow => {
      // Find the corresponding yearly row for additional data (income, taxes, etc.)
      const yearlyRow = primaryProjection.projections.find(p => p.year === month.year);
      
      // Calculate age for this month
      let age: number | null = null;
      if (birthYear) {
        age = month.year - birthYear + (month.month - 1) / 12;
      }

      return {
        year: month.year,
        displayYear: `${monthNames[month.month - 1]} ${month.year}`,
        monthIndex: month.month - 1,
        age,
        yearsFromEntry: month.yearsFromStart,
        netWorth: month.netWorth,
        interest: month.cumulativeInterest,
        contributed: month.cumulativeContributions,
        annualSwr: month.monthlySwr * 12,
        monthlySwr: month.monthlySwr,
        weeklySwr: month.monthlySwr / 4.33,
        dailySwr: month.monthlySwr / 30,
        monthlySpend: month.monthlySpending,
        annualSpending: month.monthlySpending * 12,
        annualSavings: month.monthlySavings * 12,
        fiTarget: month.fiTarget,
        fiProgress: month.fiProgress,
        coastFiYear: yearlyRow?.coastFiYear ?? null,
        coastFiAge: yearlyRow?.coastFiAge ?? null,
        isFiYear: month.swrCoversSpend && idx > 0 && !primaryProjection.monthlyProjections[idx - 1]?.swrCoversSpend,
        isCrossover: false, // TODO: calculate if needed
        swrCoversSpend: month.swrCoversSpend,
        // Tax data from yearly row
        grossIncome: yearlyRow?.grossIncome,
        totalTax: yearlyRow?.totalTax,
        netIncome: yearlyRow?.netIncome,
        preTaxContributions: yearlyRow?.preTaxContributions,
      };
    });
  }, [viewMode, primaryProjection.projections, primaryProjection.monthlyProjections, birthYear]);

  return (
    <div className="flex-1 overflow-auto space-y-4">
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
                  <th className="text-left text-slate-400 font-medium py-3 px-3 whitespace-nowrap">
                    Milestones
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

                    // Get net worth and FI status
                    let netWorthValue = 0;
                    let isFiYear = false;

                    if (viewMode === 'monthly' && sp.monthlyProjections?.length) {
                      // Find the matching month in this scenario's monthly projections
                      const monthData = sp.monthlyProjections.find(
                        m => m.year === lookupYear && m.month === ((row.monthIndex || 0) + 1)
                      );
                      
                      if (monthData) {
                        netWorthValue = monthData.netWorth;
                        // Mark as FI year if this is the first month where SWR covers spend
                        const prevMonthIndex = sp.monthlyProjections.findIndex(
                          m => m.year === lookupYear && m.month === ((row.monthIndex || 0) + 1)
                        );
                        const prevMonth = prevMonthIndex > 0 ? sp.monthlyProjections[prevMonthIndex - 1] : null;
                        isFiYear = monthData.swrCoversSpend && (!prevMonth || !prevMonth.swrCoversSpend);
                      } else {
                        // Fallback to interpolation
                        const currentYearRow = sp.projections.find(p => p.year === lookupYear);
                        const previousYearRow = sp.projections.find(p => p.year === (lookupYear as number) - 1);
                        const monthFraction = ((row.monthIndex || 0) + 1) / 12;
                        if (currentYearRow) {
                          const startOfYearNetWorth = previousYearRow ? previousYearRow.netWorth : sp.currentNetWorth.total;
                          netWorthValue = startOfYearNetWorth + (currentYearRow.netWorth - startOfYearNetWorth) * monthFraction;
                        }
                        isFiYear = (currentYearRow?.isFiYear ?? false) && (row.monthIndex || 0) === 11;
                      }
                    } else {
                      const scenarioRow = sp.projections.find(p => p.year === lookupYear);
                      netWorthValue = scenarioRow?.netWorth || 0;
                      isFiYear = scenarioRow?.isFiYear || false;
                    }

                    // Calculate other values
                    // For monthly view, use actual monthly projections data (where spending updates each month)
                    // For yearly view, use yearly projections
                    const scenarioRow = sp.projections.find(p => p.year === lookupYear);
                    
                    let spendingDisplayValue = 0;
                    let savingsDisplayValue = 0;
                    let monthlySwr = 0;
                    let swrCoversSpend = false;
                    let swrDisplayValue = 0;
                    let fiProgress = 0;
                    let fiTarget = 0;

                    if (viewMode === 'monthly' && sp.monthlyProjections?.length) {
                      // Find the matching month in this scenario's monthly projections
                      const monthData = sp.monthlyProjections.find(
                        m => m.year === lookupYear && m.month === ((row.monthIndex || 0) + 1)
                      );
                      
                      if (monthData) {
                        // Use actual monthly spending (calculated based on that month's net worth)
                        spendingDisplayValue = monthData.monthlySpending;
                        savingsDisplayValue = monthData.monthlySavings;
                        monthlySwr = monthData.monthlySwr;
                        swrDisplayValue = monthData.monthlySwr;
                        swrCoversSpend = monthData.swrCoversSpend;
                        fiTarget = monthData.fiTarget;
                        fiProgress = monthData.fiProgress;
                      } else {
                        // Fallback to yearly data divided by 12
                        spendingDisplayValue = (scenarioRow?.annualSpending || 0) / 12;
                        savingsDisplayValue = (scenarioRow?.annualSavings || 0) / 12;
                        monthlySwr = scenarioRow?.monthlySwr || 0;
                        swrDisplayValue = monthlySwr;
                        swrCoversSpend = scenarioRow?.swrCoversSpend || false;
                        fiTarget = scenarioRow?.fiTarget || 0;
                        fiProgress = scenarioRow?.fiProgress || 0;
                      }
                    } else {
                      // Yearly view - use yearly projections
                      spendingDisplayValue = scenarioRow?.annualSpending || 0;
                      savingsDisplayValue = scenarioRow?.annualSavings || 0;
                      monthlySwr = scenarioRow?.monthlySwr || 0;
                      swrDisplayValue = monthlySwr * 12; // Show annual SWR
                      swrCoversSpend = scenarioRow?.swrCoversSpend || false;
                      fiTarget = scenarioRow?.fiTarget || 0;
                      fiProgress = scenarioRow?.fiProgress || 0;
                    }

                    const savings = savingsDisplayValue;

                    // Income values (still from yearly, divided by 12 for monthly)
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
                          <SimpleTrackedValue
                            value={netWorthValue}
                            name={`Net Worth (${displayYearValue})`}
                            description={`Projected net worth for ${sp.scenario.name} in ${displayYearValue}`}
                            formula="Previous NW × (1 + Rate) + Contributions - Spending"
                            inputs={[
                              { name: 'Return Rate', value: `${sp.scenario.currentRate}%` },
                              { name: 'Scenario', value: sp.scenario.name },
                            ]}
                            className="font-mono"
                          />
                          {isFiYear && <span className="ml-1 text-xs text-emerald-400">FI</span>}
                        </td>
                        {/* Spending */}
                        <td className="py-2 px-3 text-right font-mono text-rose-400/80">
                          <SimpleTrackedValue
                            value={spendingDisplayValue}
                            name={`Spending (${displayYearValue})`}
                            description={`Level-based spending budget for ${displayYearValue}`}
                            formula={`Base Budget (inflation-adj) + Net Worth × ${sp.scenario.spendingGrowthRate}%`}
                            inputs={[
                              { name: 'Period', value: viewMode === 'monthly' ? 'Monthly' : 'Annual' },
                              { name: 'Base Budget', value: sp.scenario.baseMonthlyBudget, unit: '$' },
                            ]}
                            className="font-mono text-rose-400/80"
                          />
                        </td>
                        {/* Savings */}
                        <td className={`py-2 px-3 text-right font-mono ${
                          savings > 0 ? 'text-emerald-400/80' : 'text-slate-500'
                        }`}>
                          <SimpleTrackedValue
                            value={savingsDisplayValue}
                            name={`Savings (${displayYearValue})`}
                            description={`Net savings after spending for ${displayYearValue}`}
                            formula="Income - Taxes - Spending"
                            inputs={[
                              { name: 'Period', value: viewMode === 'monthly' ? 'Monthly' : 'Annual' },
                            ]}
                            className={`font-mono ${savings > 0 ? 'text-emerald-400/80' : 'text-slate-500'}`}
                          />
                        </td>
                        {/* SWR */}
                        <td className={`py-2 px-3 text-right font-mono ${
                          swrCoversSpend ? 'text-emerald-400' : 'text-amber-400/70'
                        }`}>
                          <SimpleTrackedValue
                            value={swrDisplayValue}
                            name={`SWR (${displayYearValue})`}
                            description={`Safe withdrawal amount for ${displayYearValue} at ${sp.scenario.swr}% SWR`}
                            formula={`Net Worth × ${sp.scenario.swr}%${viewMode === 'monthly' ? ' ÷ 12' : ''}`}
                            inputs={[
                              { name: 'Net Worth', value: netWorthValue, unit: '$' },
                              { name: 'SWR', value: `${sp.scenario.swr}%` },
                            ]}
                            className={`font-mono ${swrCoversSpend ? 'text-emerald-400' : 'text-amber-400/70'}`}
                          />
                        </td>
                        {/* FI Progress */}
                        <td className={`py-2 px-3 text-right font-mono ${
                          fiProgress >= 100 ? 'text-emerald-400 font-semibold' : 'text-violet-400'
                        }`}>
                          <SimpleTrackedValue
                            value={fiProgress}
                            name={`FI Progress (${displayYearValue})`}
                            description={`Progress towards financial independence for ${displayYearValue}`}
                            formula={`(Net Worth ÷ FI Target) × 100`}
                            inputs={[
                              { name: 'Net Worth', value: netWorthValue, unit: '$' },
                              { name: 'FI Target', value: fiTarget, unit: '$' },
                            ]}
                            unit="%"
                            className={`font-mono ${fiProgress >= 100 ? 'text-emerald-400 font-semibold' : 'text-violet-400'}`}
                          />
                        </td>
                        {/* Milestones reached this year */}
                        <td className="py-2 px-3 text-left">
                          {/* In monthly view, only show milestones in January to avoid repetition */}
                          {(viewMode === 'yearly' || row.monthIndex === 0) && (
                            <MilestoneBadges
                              milestones={sp.fiMilestones.milestones.filter(m => m.year === lookupYear && m.year !== null)}
                              maxVisible={3}
                            />
                          )}
                        </td>
                        {/* Income columns (only if any scenario has income data) */}
                        {scenarioProjections.some(sp => sp.hasDynamicIncome) && (
                          <>
                            <td className={`py-2 px-3 text-right font-mono ${
                              hasIncome ? 'text-sky-400/80' : 'text-slate-500'
                            }`}>
                              {hasIncome ? (
                                <SimpleTrackedValue
                                  value={incomeDisplayValue}
                                  name={`Income (${displayYearValue})`}
                                  description={`Gross income for ${displayYearValue}`}
                                  formula={`Base Income × (1 + ${sp.scenario.incomeGrowthRate || 0}%)^years`}
                                  className="font-mono text-sky-400/80"
                                />
                              ) : '-'}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono ${
                              hasTax ? 'text-red-400/80' : 'text-slate-500'
                            }`}>
                              {hasTax ? (
                                <SimpleTrackedValue
                                  value={taxDisplayValue}
                                  name={`Taxes (${displayYearValue})`}
                                  description={`Total taxes (Federal + State + FICA) for ${displayYearValue}`}
                                  formula="Federal Tax + State Tax + FICA"
                                  className="font-mono text-red-400/80"
                                />
                              ) : '-'}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono ${
                              hasNetIncome ? 'text-emerald-400/80' : 'text-slate-500'
                            }`}>
                              {hasNetIncome ? (
                                <SimpleTrackedValue
                                  value={netIncomeDisplayValue}
                                  name={`Net Income (${displayYearValue})`}
                                  description={`Take-home pay after taxes for ${displayYearValue}`}
                                  formula="Gross Income - Pre-Tax Contributions - Total Taxes"
                                  className="font-mono text-emerald-400/80"
                                />
                              ) : '-'}
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

// Component to display milestones with a limit and overflow indicator
function MilestoneBadges({
  milestones,
  maxVisible = 3
}: {
  milestones: FiMilestone[];
  maxVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (milestones.length === 0) return null;

  const visibleMilestones = expanded ? milestones : milestones.slice(0, maxVisible);
  const overflowCount = milestones.length - maxVisible;
  const hasOverflow = overflowCount > 0;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visibleMilestones.map(m => (
        <span
          key={m.id}
          className={`text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
            m.isAchieved ? '' : 'opacity-70'
          }`}
          style={{
            backgroundColor: `${m.color}20`,
            color: m.color,
            border: `1px solid ${m.color}40`
          }}
          title={FI_MILESTONE_DEFINITIONS.find(d => d.id === m.id)?.description || m.shortName}
        >
          {m.shortName}
        </span>
      ))}
      {hasOverflow && !expanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-300 transition-colors border border-slate-600/50"
          title={`Show ${overflowCount} more milestone${overflowCount > 1 ? 's' : ''}`}
        >
          +{overflowCount}
        </button>
      )}
      {expanded && hasOverflow && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-300 transition-colors border border-slate-600/50"
          title="Show less"
        >
          −
        </button>
      )}
    </div>
  );
}

// Custom tooltip for unified chart
function UnifiedChartTooltip({ active, payload, label, timeUnit }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const spendingLabel = timeUnit === 'annual' ? 'Annual Spending' : 'Monthly Spending';
  const savingsLabel = timeUnit === 'annual' ? 'Annual Savings' : 'Monthly Savings';

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
                <SimpleTrackedValue 
                  value={data.data.fiProgress} 
                  name={`Year ${data.data.year} FI Progress`} 
                  description="Percentage of FI target achieved"
                  formula="(Net Worth ÷ FI Target) × 100"
                  formatAs="percent"
                  decimals={1}
                  className="text-emerald-400 font-mono"
                />
              </div>
            )}
            {data.data.netWorth !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Net Worth:</span>
                <SimpleTrackedValue value={data.data.netWorth} name={`Year ${data.data.year} Net Worth`} description="Projected net worth at this point" formula="Prior Year × (1 + Return) + Savings" className="text-sky-400 font-mono" />
              </div>
            )}
            {data.data.spending !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">{spendingLabel}:</span>
                <SimpleTrackedValue value={data.data.spending} name={`Year ${data.data.year} ${spendingLabel}`} description="Projected spending at this point" formula="Base + (Net Worth × Rate)" className="text-amber-400 font-mono" />
              </div>
            )}
            {data.data.savings !== undefined && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">{savingsLabel}:</span>
                <SimpleTrackedValue value={data.data.savings} name={`Year ${data.data.year} ${savingsLabel}`} description="Projected savings at this point" formula="Income - Taxes - Spending" className="text-violet-400 font-mono" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

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
              <div key={metric.key} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
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
            <p className="text-xs text-slate-500">See exactly how your <SimpleTrackedValue value={taxes.totalTax} name="Total Tax Burden" description="Sum of all taxes: Federal + State + FICA" formula="Federal Tax + State Tax + Social Security + Medicare" className="text-slate-500" /> tax burden is calculated</p>
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
              <SimpleTrackedValue value={taxes.grossIncome} name="Gross Income" description="Total income before any deductions" formula="Annual Salary + Other Income" className="text-lg font-mono text-slate-200" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Total Tax</p>
              <SimpleTrackedValue value={taxes.totalTax} name="Total Tax" description="All taxes combined" formula="Federal + State + FICA" inputs={[{ name: 'Federal', value: taxes.federalTax, unit: '$' }, { name: 'State', value: taxes.stateTax, unit: '$' }, { name: 'FICA', value: taxes.fica.totalFicaTax, unit: '$' }]} className="text-lg font-mono text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase mb-1">Net Income</p>
              <SimpleTrackedValue value={taxes.netIncome} name="Net Income" description="Take-home pay after all deductions and taxes" formula="Gross - Pre-Tax - Total Taxes" inputs={[{ name: 'Gross', value: taxes.grossIncome, unit: '$' }, { name: 'Pre-Tax', value: taxes.totalPreTaxContributions, unit: '$' }, { name: 'Taxes', value: taxes.totalTax, unit: '$' }]} className="text-lg font-mono text-emerald-400" />
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
                  <SimpleTrackedValue value={taxes.grossIncome} name="Gross Income" description="Total income before deductions" formula="Annual Salary" className="font-mono text-slate-200" />
                </div>
                {taxes.preTaxContributions.traditional401k > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">− 401(k) Contribution</span>
                    <span className="font-mono text-emerald-400">−<SimpleTrackedValue value={taxes.preTaxContributions.traditional401k} name="401(k) Contribution" description="Pre-tax contribution to 401(k) retirement account" formula="User Input" className="text-emerald-400" /></span>
                  </div>
                )}
                {taxes.preTaxContributions.traditionalIRA > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">− Traditional IRA</span>
                    <span className="font-mono text-emerald-400">−<SimpleTrackedValue value={taxes.preTaxContributions.traditionalIRA} name="Traditional IRA" description="Pre-tax contribution to Traditional IRA" formula="User Input" className="text-emerald-400" /></span>
                  </div>
                )}
                {taxes.preTaxContributions.hsa > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">− HSA Contribution</span>
                    <span className="font-mono text-emerald-400">−<SimpleTrackedValue value={taxes.preTaxContributions.hsa} name="HSA Contribution" description="Pre-tax contribution to Health Savings Account" formula="User Input" className="text-emerald-400" /></span>
                  </div>
                )}
                {taxes.preTaxContributions.other > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">− Other Pre-tax</span>
                    <span className="font-mono text-emerald-400">−<SimpleTrackedValue value={taxes.preTaxContributions.other} name="Other Pre-tax" description="Other pre-tax deductions" formula="User Input" className="text-emerald-400" /></span>
                  </div>
                )}
                <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                  <span className="text-slate-300">Adjusted Gross Income (AGI)</span>
                  <SimpleTrackedValue value={taxes.adjustedGrossIncome} name="Adjusted Gross Income" description="Gross income minus pre-tax deductions" formula="Gross Income - Pre-Tax Contributions" inputs={[{ name: 'Gross', value: taxes.grossIncome, unit: '$' }, { name: 'Pre-Tax', value: taxes.totalPreTaxContributions, unit: '$' }]} className="font-mono text-slate-200" />
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
                  <SimpleTrackedValue 
                    value={taxes.totalPreTaxContributions > 0 ? taxes.adjustedGrossIncome : taxes.grossIncome} 
                    name={taxes.totalPreTaxContributions > 0 ? "Adjusted Gross Income" : "Gross Income"}
                    description={taxes.totalPreTaxContributions > 0 ? "Income after pre-tax deductions" : "Total income before deductions"}
                    formula={taxes.totalPreTaxContributions > 0 ? "Gross Income - Pre-Tax Contributions" : "Annual Salary"}
                    className="font-mono text-slate-200" 
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">− Standard Deduction ({taxes.filingStatus.replace('_', ' ')})</span>
                  <span className="font-mono text-blue-400">−<SimpleTrackedValue value={taxes.federalStandardDeduction} name="Federal Standard Deduction" description={`Standard deduction for ${taxes.filingStatus.replace('_', ' ')} filing status`} formula="IRS Standard Deduction Amount" className="text-blue-400" /></span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                  <span className="text-slate-300">Federal Taxable Income</span>
                  <SimpleTrackedValue value={taxes.federalTaxableIncome} name="Federal Taxable Income" description="Income subject to federal tax after deductions" formula="AGI - Standard Deduction" inputs={[{ name: 'AGI', value: taxes.adjustedGrossIncome, unit: '$' }, { name: 'Std Deduction', value: taxes.federalStandardDeduction, unit: '$' }]} className="font-mono text-slate-200" />
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
                              <SimpleTrackedValue value={bracket.bracketMin} name={`Bracket ${idx + 1} Min`} description={`Lower bound of ${formatPercent(bracket.rate, 0)} tax bracket`} formula="IRS Tax Bracket" decimals={0} className="text-slate-400" /> – {bracket.bracketMax === Infinity ? '∞' : <SimpleTrackedValue value={bracket.bracketMax} name={`Bracket ${idx + 1} Max`} description={`Upper bound of ${formatPercent(bracket.rate, 0)} tax bracket`} formula="IRS Tax Bracket" decimals={0} className="text-slate-400" />}
                            </span>
                            <SimpleTrackedValue value={bracket.taxableInBracket} name={`Taxable in ${formatPercent(bracket.rate, 0)} Bracket`} description={`Amount of income taxed at ${formatPercent(bracket.rate, 0)}`} formula={`min(Income in bracket, Bracket size)`} decimals={0} className="text-slate-300 font-mono" />
                          </div>
                        </div>
                        <div className="w-20 text-right font-mono text-red-400">
                          <SimpleTrackedValue value={bracket.taxFromBracket} name={`Tax from ${formatPercent(bracket.rate, 0)} Bracket`} description={`Tax calculated from income in this bracket`} formula={`${formatCurrency(bracket.taxableInBracket, 0)} × ${formatPercent(bracket.rate, 0)}`} className="text-red-400" />
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
                  <SimpleTrackedValue value={taxes.federalTax} name="Federal Income Tax" description="Total federal income tax from all brackets" formula="Sum of tax from each bracket" inputs={taxes.federalBracketBreakdown.map((b, i) => ({ name: `${formatPercent(b.rate, 0)} bracket`, value: b.taxFromBracket, unit: '$' }))} className="text-lg font-mono text-red-400" />
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
                      <SimpleTrackedValue value={taxes.adjustedGrossIncome} name="AGI for State Tax" description="Adjusted gross income used for state tax calculation" formula="Gross - Pre-Tax Contributions" className="font-mono text-slate-200" />
                    </div>
                    {taxes.stateStandardDeduction > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">− State Standard Deduction</span>
                        <span className="font-mono text-purple-400">−<SimpleTrackedValue value={taxes.stateStandardDeduction} name="State Standard Deduction" description="State-specific standard deduction amount" formula="State Tax Rules" className="text-purple-400" /></span>
                      </div>
                    )}
                    {taxes.statePersonalExemption > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">− Personal Exemption</span>
                        <span className="font-mono text-purple-400">−<SimpleTrackedValue value={taxes.statePersonalExemption} name="Personal Exemption" description="State personal exemption amount" formula="State Tax Rules" className="text-purple-400" /></span>
                      </div>
                    )}
                    <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-medium">
                      <span className="text-slate-300">State Taxable Income</span>
                      <SimpleTrackedValue value={taxes.stateTaxableIncome} name="State Taxable Income" description="Income subject to state tax" formula="AGI - State Deductions - Exemptions" className="font-mono text-slate-200" />
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
                                    <><SimpleTrackedValue value={bracket.bracketMin} name={`State Bracket ${idx+1} Min`} description="Lower bound of state tax bracket" formula="State Tax Rules" decimals={0} className="text-slate-400" /> – {bracket.bracketMax === Infinity ? '∞' : <SimpleTrackedValue value={bracket.bracketMax} name={`State Bracket ${idx+1} Max`} description="Upper bound of state tax bracket" formula="State Tax Rules" decimals={0} className="text-slate-400" />}</>
                                  }
                                </span>
                                <SimpleTrackedValue value={bracket.taxableInBracket} name={`Taxable in ${formatPercent(bracket.rate, 1)} State Bracket`} description="Amount of income taxed at this rate" formula="Income in bracket" decimals={0} className="text-slate-300 font-mono" />
                              </div>
                            </div>
                            <div className="w-20 text-right font-mono text-red-400">
                              <SimpleTrackedValue value={bracket.taxFromBracket} name={`State Tax from ${formatPercent(bracket.rate, 1)} Bracket`} description={`Tax at ${formatPercent(bracket.rate, 1)} rate`} formula={`${formatCurrency(bracket.taxableInBracket, 0)} × ${formatPercent(bracket.rate, 1)}`} className="text-red-400" />
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
                      <SimpleTrackedValue value={taxes.stateTax} name="State Income Tax" description="Total state income tax" formula="Sum of tax from state brackets" className="text-lg font-mono text-red-400" />
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
                      <SimpleTrackedValue value={taxes.fica.socialSecurityWages} name="Social Security Wages" description="Wages subject to Social Security tax (capped at wage base)" formula={`min(Gross Income, SS Wage Cap)`} className="text-slate-200" />
                      {taxes.fica.wagesAboveSsCap > 0 && (
                        <span className="text-slate-500 text-xs ml-1">(capped at <SimpleTrackedValue value={taxes.fica.socialSecurityWageCap} name="SS Wage Cap" description="Social Security wage base limit for the year" formula="IRS Annual Limit" className="text-slate-500" />)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">× {formatPercent(taxes.fica.socialSecurityRate)} rate</span>
                    <SimpleTrackedValue value={taxes.fica.socialSecurityTax} name="Social Security Tax" description="Employee portion of Social Security tax" formula={`SS Wages × ${formatPercent(taxes.fica.socialSecurityRate)}`} inputs={[{ name: 'SS Wages', value: taxes.fica.socialSecurityWages, unit: '$' }, { name: 'Rate', value: `${taxes.fica.socialSecurityRate}%` }]} className="font-mono text-red-400" />
                  </div>
                  {taxes.fica.wagesAboveSsCap > 0 && (
                    <p className="text-xs text-emerald-400">
                      You saved <SimpleTrackedValue value={taxes.fica.wagesAboveSsCap * (taxes.fica.socialSecurityRate / 100)} name="SS Tax Savings" description="Tax saved due to SS wage cap" formula={`Wages Above Cap × SS Rate`} className="text-emerald-400" /> because <SimpleTrackedValue value={taxes.fica.wagesAboveSsCap} name="Wages Above SS Cap" description="Income exceeding the Social Security wage base" formula="Gross - SS Wage Cap" className="text-emerald-400" /> of your income exceeds the SS wage cap
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
                    <SimpleTrackedValue value={taxes.fica.medicareBaseTax} name="Medicare Base Tax" description="Base Medicare tax on all wages" formula={`Gross Income × ${formatPercent(taxes.fica.medicareBaseRate)}`} className="font-mono text-red-400" />
                  </div>
                  {taxes.fica.additionalMedicareTax > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          Wages above <SimpleTrackedValue value={taxes.fica.additionalMedicareThreshold} name="Additional Medicare Threshold" description="Income threshold for additional Medicare tax" formula="IRS Threshold" className="text-slate-400" /> × {formatPercent(taxes.fica.additionalMedicareRate)} additional rate
                        </span>
                        <SimpleTrackedValue value={taxes.fica.additionalMedicareTax} name="Additional Medicare Tax" description="Additional Medicare tax on high earners" formula={`Wages Above Threshold × ${formatPercent(taxes.fica.additionalMedicareRate)}`} className="font-mono text-red-400" />
                      </div>
                      <p className="text-xs text-amber-400">
                        Additional Medicare Tax applies to <SimpleTrackedValue value={taxes.fica.additionalMedicareWages} name="Wages Subject to Additional Medicare" description="Income above the threshold" formula="Gross - Threshold" className="text-amber-400" /> of income above the <SimpleTrackedValue value={taxes.fica.additionalMedicareThreshold} name="Additional Medicare Threshold" description="Income threshold" formula="IRS Rules" className="text-amber-400" /> threshold
                      </p>
                    </>
                  )}
                  <div className="flex justify-between text-sm font-medium border-t border-slate-700 pt-2">
                    <span className="text-slate-300">Total Medicare Tax</span>
                    <SimpleTrackedValue value={taxes.fica.totalMedicareTax} name="Total Medicare Tax" description="Base Medicare + Additional Medicare tax" formula="Base Medicare + Additional Medicare" inputs={[{ name: 'Base', value: taxes.fica.medicareBaseTax, unit: '$' }, { name: 'Additional', value: taxes.fica.additionalMedicareTax, unit: '$' }]} className="font-mono text-red-400" />
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
                  <SimpleTrackedValue value={taxes.fica.totalFicaTax} name="Total FICA Tax" description="Combined Social Security and Medicare taxes" formula="Social Security Tax + Total Medicare Tax" inputs={[{ name: 'SS Tax', value: taxes.fica.socialSecurityTax, unit: '$' }, { name: 'Medicare', value: taxes.fica.totalMedicareTax, unit: '$' }]} className="text-lg font-mono text-red-400" />
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
                <SimpleTrackedValue value={taxes.federalTax} name="Federal Income Tax" description="Total federal income tax" formula="Sum of tax from all federal brackets" className="font-mono text-red-400" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">State Income Tax</span>
                <SimpleTrackedValue value={taxes.stateTax} name="State Income Tax" description="Total state income tax" formula="Sum of tax from state brackets" className="font-mono text-red-400" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Social Security</span>
                <SimpleTrackedValue value={taxes.fica.socialSecurityTax} name="Social Security Tax" description="Employee Social Security tax" formula={`min(Wages, SS Cap) × ${formatPercent(taxes.fica.socialSecurityRate)}`} className="font-mono text-red-400" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Medicare</span>
                <SimpleTrackedValue value={taxes.fica.totalMedicareTax} name="Medicare Tax" description="Base + Additional Medicare tax" formula="Base Medicare + Additional Medicare" className="font-mono text-red-400" />
              </div>
              <div className="border-t border-red-500/30 pt-2 mt-2 flex justify-between font-medium">
                <span className="text-slate-200">Total Tax Burden</span>
                <SimpleTrackedValue value={taxes.totalTax} name="Total Tax Burden" description="All taxes combined" formula="Federal + State + Social Security + Medicare" inputs={[{ name: 'Federal', value: taxes.federalTax, unit: '$' }, { name: 'State', value: taxes.stateTax, unit: '$' }, { name: 'SS', value: taxes.fica.socialSecurityTax, unit: '$' }, { name: 'Medicare', value: taxes.fica.totalMedicareTax, unit: '$' }]} className="text-lg font-mono text-red-400" />
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Effective Total Tax Rate</span>
                <SimpleTrackedValue value={taxes.effectiveTotalRate} name="Effective Total Tax Rate" description="Total taxes as percentage of gross income" formula="Total Taxes ÷ Gross Income × 100" inputs={[{ name: 'Total Taxes', value: taxes.totalTax, unit: '$' }, { name: 'Gross Income', value: taxes.grossIncome, unit: '$' }]} formatAs="percent" decimals={1} className="font-mono text-slate-500" />
              </div>
            </div>
          </div>

          {/* Net Income */}
          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/30">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-emerald-400">Net Income After Taxes</span>
                <p className="text-xs text-slate-500 mt-1">
                  <SimpleTrackedValue value={taxes.monthlyNetIncome} name="Monthly Net Income" description="Monthly take-home pay" formula="Annual Net Income ÷ 12" className="text-slate-500" />/month • <SimpleTrackedValue value={taxes.monthlyNetIncome / 4.33} name="Weekly Net Income" description="Weekly take-home pay" formula="Monthly Net Income ÷ 4.33" className="text-slate-500" />/week
                </p>
              </div>
              <SimpleTrackedValue value={taxes.netIncome} name="Annual Net Income" description="Total take-home pay after all taxes" formula="Gross Income - Pre-Tax Contributions - Total Taxes" inputs={[{ name: 'Gross', value: taxes.grossIncome, unit: '$' }, { name: 'Pre-Tax', value: taxes.totalPreTaxContributions, unit: '$' }, { name: 'Taxes', value: taxes.totalTax, unit: '$' }]} className="text-2xl font-mono text-emerald-400" />
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

interface ScenariosTabProps {
  scenariosHook: ReturnType<typeof useScenarios>;
}

function ScenariosTab({ scenariosHook }: ScenariosTabProps) {
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
            onClick={openNewScenario}
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

