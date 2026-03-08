'use client'

import React, { useMemo, useEffect, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import {
  ActorProvider,
  useFinancialActor,
  useFinancialSelector,
  useUIActor,
  useUISelector,
} from '../../lib/hooks/useFinancialActor'
import { useConvexBridge } from '../../lib/hooks/useConvexBridge'
import { useScenarioActions } from '../../lib/hooks/useScenarioActions'
import { DashboardTab } from './DashboardTab'
import { EntriesTab } from './EntriesTab'
import { ProjectionsTab } from './ProjectionsTab'
import { ScenariosTab } from './ScenariosTab'
import { Tab } from '../lib/helpers'

const tabs: { id: Tab; label: string; accent: string }[] = [
  { id: 'dashboard', label: 'Dashboard', accent: 'emerald' },
  { id: 'entries', label: 'Entries', accent: 'emerald' },
  { id: 'projections', label: 'Projections', accent: 'emerald' },
  { id: 'scenarios', label: 'Scenarios', accent: 'violet' },
];

function AuthenticatedAppInner() {
  const { signOut } = useAuthActions()
  const financialActor = useFinancialActor()
  const uiActor = useUIActor()

  // Bridge Convex queries → XState machine
  useConvexBridge(financialActor)

  // Granular subscriptions — only re-render when these specific values change
  const isLoading = useFinancialSelector(s => s.context.isLoading)
  const scenarioCount = useFinancialSelector(s => s.context.scenarios.length)
  const selectedCount = useFinancialSelector(s => s.context.selectedScenarios.length)
  const hasScenarios = useFinancialSelector(s => s.context.scenarios.length > 0)

  const activeTab = useUISelector(s => s.context.activeTab)
  const entryBreakdown = useUISelector(s => s.context.entryBreakdown)
  const projectionsView = useUISelector(s => s.context.projectionsView)

  // Scenario actions (mutations)
  const actions = useScenarioActions()

  // Entry mutations
  const addEntry = useMutation(api.entries.add)
  const removeEntry = useMutation(api.entries.remove)

  // Create default scenario if user has none
  useEffect(() => {
    if (!isLoading && !hasScenarios) {
      actions.createDefaultScenario()
    }
  }, [isLoading, hasScenarios, actions])

  const setActiveTab = useCallback((tab: Tab) => {
    uiActor.send({ type: 'SET_TAB', tab })
  }, [uiActor])

  const setProjectionsView = useCallback((view: 'table' | 'chart') => {
    uiActor.send({ type: 'SET_PROJECTIONS_VIEW', view })
  }, [uiActor])

  const setEntryBreakdown = useCallback((breakdown: typeof entryBreakdown) => {
    uiActor.send({ type: 'SET_ENTRY_BREAKDOWN', breakdown })
  }, [uiActor])

  const entryTotal = useMemo(() => {
    const cash = parseFloat(entryBreakdown.cash.replace(/,/g, '')) || 0
    const retirement = parseFloat(entryBreakdown.retirement.replace(/,/g, '')) || 0
    const hsa = parseFloat(entryBreakdown.hsa.replace(/,/g, '')) || 0
    const brokerage = parseFloat(entryBreakdown.brokerage.replace(/,/g, '')) || 0
    const debts = parseFloat(entryBreakdown.debts.replace(/,/g, '')) || 0
    return cash + retirement + hsa + brokerage - debts
  }, [entryBreakdown])

  const handleAddEntry = useCallback(async () => {
    const cash = parseFloat(entryBreakdown.cash.replace(/,/g, '')) || 0
    const retirement = parseFloat(entryBreakdown.retirement.replace(/,/g, '')) || 0
    const hsa = parseFloat(entryBreakdown.hsa.replace(/,/g, '')) || 0
    const brokerage = parseFloat(entryBreakdown.brokerage.replace(/,/g, '')) || 0
    const debts = parseFloat(entryBreakdown.debts.replace(/,/g, '')) || 0
    const amount = cash + retirement + hsa + brokerage - debts
    if (amount <= 0) return

    await addEntry({
      amount,
      timestamp: Date.now(),
      cash, retirement, hsa, brokerage, debts,
    })
    uiActor.send({ type: 'CLEAR_ENTRY_BREAKDOWN' })
  }, [entryBreakdown, addEntry, uiActor])

  const handleDeleteEntry = useCallback(async (id: Id<"netWorthEntries">) => {
    await removeEntry({ id })
  }, [removeEntry])

  const formatNetWorthInput = useCallback((value: string) => {
    return value.replace(/[^0-9.]/g, '')
  }, [])

  // Show loading while data is being fetched
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#060d1f] text-white flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#060d1f] text-white">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-[#060d1f]/90 backdrop-blur-lg border-b border-slate-800/60 overflow-x-auto scrollbar-hide">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex gap-0.5 items-center min-w-0 touch-pan-x">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              const colorClass = tab.accent === 'violet'
                ? (isActive ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300')
                : (isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300');
              const barColor = tab.accent === 'violet' ? 'bg-violet-400' : 'bg-emerald-400';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-3 sm:px-5 sm:py-3.5 text-sm font-medium transition-colors relative whitespace-nowrap ${colorClass}`}
                >
                  {tab.label}
                  {tab.id === 'scenarios' && scenarioCount > 0 && (
                    <span className="ml-1.5 text-[10px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full">
                      {selectedCount}/{scenarioCount}
                    </span>
                  )}
                  {isActive && (
                    <div className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${barColor}`} />
                  )}
                </button>
              );
            })}
            <div className="flex-1" />
            <button
              onClick={() => signOut()}
              className="px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <DashboardTab setActiveTab={setActiveTab} />
      )}

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <EntriesTab
          entryBreakdown={entryBreakdown}
          setEntryBreakdown={setEntryBreakdown}
          entryTotal={entryTotal}
          formatNetWorthInput={formatNetWorthInput}
          handleAddEntry={handleAddEntry}
          handleDeleteEntry={handleDeleteEntry}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Projections Tab */}
      {activeTab === 'projections' && (
        <ProjectionsTab
          projectionsView={projectionsView}
          setProjectionsView={setProjectionsView}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Scenarios Tab */}
      {activeTab === 'scenarios' && (
        <ScenariosTab />
      )}
    </main>
  )
}

export function AuthenticatedApp() {
  return (
    <ActorProvider>
      <AuthenticatedAppInner />
    </ActorProvider>
  )
}
