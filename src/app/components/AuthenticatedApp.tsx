'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { useScenarios } from '../../lib/useScenarios'
import { DashboardTab } from './DashboardTab'
import { EntriesTab } from './EntriesTab'
import { ProjectionsTab } from './ProjectionsTab'
import { ScenariosTab } from './ScenariosTab'
import { BudgetTab } from './BudgetTab'
import { Tab, EntryBreakdown } from '../lib/helpers'

const tabs: { id: Tab; label: string; accent: string }[] = [
  { id: 'dashboard', label: 'Dashboard', accent: 'emerald' },
  { id: 'entries', label: 'Entries', accent: 'emerald' },
  { id: 'projections', label: 'Projections', accent: 'emerald' },
  { id: 'scenarios', label: 'Scenarios', accent: 'violet' },
  { id: 'budget', label: 'Budget', accent: 'amber' },
];

export function AuthenticatedApp() {
  const { signOut } = useAuthActions()

  // Use scenarios hook - the primary source of truth
  const scenariosHook = useScenarios()

  // Mutations
  const addEntry = useMutation(api.entries.add)
  const removeEntry = useMutation(api.entries.remove)

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [projectionsView, setProjectionsView] = useState<'table' | 'chart'>('table')
  const [entryBreakdown, setEntryBreakdown] = useState<EntryBreakdown>({
    cash: '', retirement: '', hsa: '', brokerage: '', debts: '',
  });

  // Get the primary scenario (first selected) for dashboard display
  const primaryProjection = scenariosHook.scenarioProjections[0] || null;

  // Create default scenario if user has none
  useEffect(() => {
    if (!scenariosHook.isLoading && !scenariosHook.hasScenarios) {
      scenariosHook.createDefaultScenario();
    }
  }, [scenariosHook.isLoading, scenariosHook.hasScenarios, scenariosHook]);

  const entryTotal = useMemo(() => {
    const cash = parseFloat(entryBreakdown.cash.replace(/,/g, '')) || 0;
    const retirement = parseFloat(entryBreakdown.retirement.replace(/,/g, '')) || 0;
    const hsa = parseFloat(entryBreakdown.hsa.replace(/,/g, '')) || 0;
    const brokerage = parseFloat(entryBreakdown.brokerage.replace(/,/g, '')) || 0;
    const debts = parseFloat(entryBreakdown.debts.replace(/,/g, '')) || 0;
    return cash + retirement + hsa + brokerage - debts;
  }, [entryBreakdown]);

  const handleAddEntry = async () => {
    const cash = parseFloat(entryBreakdown.cash.replace(/,/g, '')) || 0;
    const retirement = parseFloat(entryBreakdown.retirement.replace(/,/g, '')) || 0;
    const hsa = parseFloat(entryBreakdown.hsa.replace(/,/g, '')) || 0;
    const brokerage = parseFloat(entryBreakdown.brokerage.replace(/,/g, '')) || 0;
    const debts = parseFloat(entryBreakdown.debts.replace(/,/g, '')) || 0;
    const amount = cash + retirement + hsa + brokerage - debts;
    if (amount <= 0) return;

    await addEntry({
      amount,
      timestamp: Date.now(),
      cash, retirement, hsa, brokerage, debts,
    });
    setEntryBreakdown({ cash: '', retirement: '', hsa: '', brokerage: '', debts: '' });
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
              const activeColorMap: Record<string, string> = {
                emerald: 'text-emerald-400',
                violet: 'text-violet-400',
                amber: 'text-amber-400',
              };
              const barColorMap: Record<string, string> = {
                emerald: 'bg-emerald-400',
                violet: 'bg-violet-400',
                amber: 'bg-amber-400',
              };
              const colorClass = isActive
                ? (activeColorMap[tab.accent] ?? 'text-emerald-400')
                : 'text-slate-500 hover:text-slate-300';
              const barColor = barColorMap[tab.accent] ?? 'bg-emerald-400';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-3 sm:px-5 sm:py-3.5 text-sm font-medium transition-colors relative whitespace-nowrap ${colorClass}`}
                >
                  {tab.label}
                  {tab.id === 'scenarios' && scenariosHook.scenarios.length > 0 && (
                    <span className="ml-1.5 text-[10px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full">
                      {scenariosHook.selectedScenarios.length}/{scenariosHook.scenarios.length}
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
        <DashboardTab
          latestEntry={scenariosHook.latestEntry}
          entries={scenariosHook.entries}
          primaryProjection={primaryProjection}
          selectedScenarios={scenariosHook.selectedScenarios}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Entries Tab */}
      {activeTab === 'entries' && (
        <EntriesTab
          entries={scenariosHook.entries}
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

      {/* Budget Tab */}
      {activeTab === 'budget' && (
        <BudgetTab
          selectedScenarios={scenariosHook.selectedScenarios}
          setActiveTab={setActiveTab}
        />
      )}
    </main>
  )
}
