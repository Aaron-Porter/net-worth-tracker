'use client'

import React from 'react'
import { Id } from '../../../convex/_generated/dataModel'
import { formatCurrency, formatDate, getEntryAllocation } from '../../lib/calculations'
import { SimpleTrackedValue } from './TrackedValue'
import { useFinancialSelector } from '../../lib/hooks/useFinancialActor'
import { EntryBreakdown, BUCKET_LABELS, Tab } from '../lib/helpers'

interface EntriesTabProps {
  entryBreakdown: EntryBreakdown;
  setEntryBreakdown: (value: EntryBreakdown) => void;
  entryTotal: number;
  formatNetWorthInput: (value: string) => string;
  handleAddEntry: () => void;
  handleDeleteEntry: (id: Id<"netWorthEntries">) => void;
  setActiveTab: (tab: Tab) => void;
}

export function EntriesTab({
  entryBreakdown,
  setEntryBreakdown,
  entryTotal,
  formatNetWorthInput,
  handleAddEntry,
  handleDeleteEntry,
}: EntriesTabProps) {
  // Subscribe only to entries — no tick dependency
  const entries = useFinancialSelector(s => s.context.entries);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-center mb-1 text-white">
        Net Worth Entries
      </h1>
      <p className="text-slate-500 text-center text-sm mb-6">
        Track changes to your net worth over time
      </p>

      {/* Add New Entry */}
      <div className="bg-[#0f1629] rounded-xl p-6 border border-slate-800">
        <h2 className="text-lg font-semibold text-slate-300 mb-4">
          {entries.length === 0 ? 'Add Your Net Worth' : 'Add New Entry'}
        </h2>
        <div className="space-y-3">
          {BUCKET_LABELS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {label}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {key === 'debts' ? '-$' : '$'}
                </span>
                <input
                  type="text"
                  value={entryBreakdown[key]}
                  onChange={(e) => setEntryBreakdown({ ...entryBreakdown, [key]: formatNetWorthInput(e.target.value) })}
                  placeholder="0"
                  className="w-full bg-slate-800/30 border border-slate-600 rounded-lg py-2 pl-10 pr-4 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddEntry()}
                />
              </div>
            </div>
          ))}

          <div className="border-t border-slate-600 pt-3 mt-3">
            <div className="flex justify-between items-center text-lg">
              <span className="text-slate-300 font-medium">Total Net Worth</span>
              <span className={`font-mono font-bold ${entryTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(entryTotal)}
              </span>
            </div>
          </div>

          <button
            onClick={handleAddEntry}
            disabled={entryTotal <= 0}
            className="w-full py-4 rounded-lg font-semibold text-lg transition-all bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {entries.length === 0 ? 'Start Tracking' : 'Add Entry'}
          </button>
        </div>
      </div>

      {/* Entry History */}
      {entries.length > 0 && (
        <div className="mt-8 bg-[#0f1629] rounded-xl p-6 border border-slate-800">
          <h2 className="text-lg font-semibold text-slate-300 mb-4">
            Entry History
          </h2>
          <div className="space-y-3">
            {entries.map((entry, index) => {
              const hasBreakdown = entry.cash !== undefined || entry.retirement !== undefined ||
                entry.hsa !== undefined || entry.brokerage !== undefined || entry.debts !== undefined;
              const alloc = hasBreakdown ? getEntryAllocation(entry) : null;

              return (
                <div
                  key={entry._id}
                  className={`p-4 rounded-lg ${
                    index === 0
                      ? 'bg-emerald-900/30 border border-emerald-500/30'
                      : 'bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
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
                  {alloc && (
                    <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                      {alloc.cash > 0 && <span>Cash {formatCurrency(alloc.cash, 0)}</span>}
                      {alloc.retirement > 0 && <span>Ret {formatCurrency(alloc.retirement, 0)}</span>}
                      {alloc.hsa > 0 && <span>HSA {formatCurrency(alloc.hsa, 0)}</span>}
                      {alloc.brokerage > 0 && <span>Brok {formatCurrency(alloc.brokerage, 0)}</span>}
                      {alloc.debts > 0 && <span className="text-red-400">Debt -{formatCurrency(alloc.debts, 0)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  )
}
