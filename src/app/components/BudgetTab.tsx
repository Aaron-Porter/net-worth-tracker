'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { Card, Button, Input } from '../../components/ui'
import type { Scenario } from '../../lib/machines/types'
import { useFinancialSelector } from '../../lib/hooks/useFinancialActor'
import {
  calculateTaxes,
  FilingStatus,
  PreTaxContributions,
  TaxCalculation,
} from '../../lib/calculations'
import { Tab } from '../lib/helpers'

interface BudgetTabProps {
  setActiveTab: (tab: Tab) => void
}

const CATEGORY_COLORS = [
  '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899',
  '#10b981', '#ef4444', '#84cc16', '#f97316',
]

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function formatCurrencyWithCents(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function BudgetTab({ setActiveTab }: BudgetTabProps) {
  const selectedScenarios = useFinancialSelector(s => s.context.selectedScenarios)
  const categories = useQuery(api.budget.list) ?? []
  const addCategory = useMutation(api.budget.add)
  const updateCategory = useMutation(api.budget.update)
  const removeCategory = useMutation(api.budget.remove)

  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [editingId, setEditingId] = useState<Id<'budgetCategories'> | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')

  const scenario = selectedScenarios[0] ?? null

  // Compute tax breakdown from the selected scenario
  const taxCalc: TaxCalculation | null = useMemo(() => {
    if (!scenario?.grossIncome || scenario.grossIncome <= 0) return null
    const preTax: PreTaxContributions = {
      traditional401k: scenario.preTax401k ?? 0,
      traditionalIRA: scenario.preTaxIRA ?? 0,
      hsa: scenario.preTaxHSA ?? 0,
      other: scenario.preTaxOther ?? 0,
    }
    return calculateTaxes(
      scenario.grossIncome,
      (scenario.filingStatus as FilingStatus) || 'single',
      scenario.stateCode ?? null,
      preTax
    )
  }, [scenario])

  const monthlyTakeHome = taxCalc?.monthlyNetIncome ?? 0
  const annualTakeHome = taxCalc?.netIncome ?? 0

  const totalBudgeted = categories.reduce((sum, c) => sum + c.monthlyAmount, 0)
  const remaining = monthlyTakeHome - totalBudgeted

  const handleAdd = async () => {
    const name = newName.trim()
    const amount = parseFloat(newAmount.replace(/,/g, ''))
    if (!name || isNaN(amount) || amount < 0) return
    await addCategory({ name, monthlyAmount: amount })
    setNewName('')
    setNewAmount('')
  }

  const handleStartEdit = (cat: typeof categories[number]) => {
    setEditingId(cat._id)
    setEditName(cat.name)
    setEditAmount(cat.monthlyAmount.toString())
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    const name = editName.trim()
    const amount = parseFloat(editAmount.replace(/,/g, ''))
    if (!name || isNaN(amount) || amount < 0) return
    await updateCategory({ id: editingId, name, monthlyAmount: amount })
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleRemove = async (id: Id<'budgetCategories'>) => {
    await removeCategory({ id })
    if (editingId === id) setEditingId(null)
  }

  const handleAmountSlider = async (id: Id<'budgetCategories'>, value: number) => {
    await updateCategory({ id, monthlyAmount: value })
  }

  // Max slider value: roughly double the monthly take-home split across categories, min $5000
  const sliderMax = Math.max(5000, Math.round(monthlyTakeHome * 0.8 / 100) * 100)

  // Bar chart data
  const barSegments = useMemo(() => {
    if (monthlyTakeHome <= 0) return []
    return categories.map((c) => ({
      name: c.name,
      color: c.color,
      pct: (c.monthlyAmount / monthlyTakeHome) * 100,
    }))
  }, [categories, monthlyTakeHome])

  const remainingPct = monthlyTakeHome > 0
    ? Math.max(0, (remaining / monthlyTakeHome) * 100)
    : 0

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Budget</h2>
        <p className="text-sm text-slate-400 mt-1">
          Model your monthly spending across customizable categories
        </p>
      </div>

      {/* Monthly Income Card */}
      <Card>
        {!scenario ? (
          <div className="text-center py-4">
            <p className="text-slate-400 mb-3">No scenario selected.</p>
            <Button variant="primary" size="sm" onClick={() => setActiveTab('scenarios')}>
              Set up a scenario
            </Button>
          </div>
        ) : !taxCalc ? (
          <div className="text-center py-4">
            <p className="text-slate-400 mb-3">
              Add your income to <span className="text-white font-medium">{scenario.name}</span> to see your monthly take-home.
            </p>
            <Button variant="primary" size="sm" onClick={() => setActiveTab('scenarios')}>
              Add income info
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Monthly Take-Home</h3>
              <span className="text-xs text-slate-500">from {scenario.name}</span>
            </div>

            <div className="text-3xl font-bold text-emerald-400 mb-4">
              {formatCurrencyWithCents(monthlyTakeHome)}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Gross Monthly</div>
                <div className="text-slate-200">{formatCurrency(taxCalc.monthlyGrossIncome)}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Total Tax</div>
                <div className="text-red-400">{formatCurrency(taxCalc.totalTax / 12)}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Pre-Tax Deductions</div>
                <div className="text-amber-400">{formatCurrency(taxCalc.totalPreTaxContributions / 12)}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-slate-500 text-xs mb-1">Annual Take-Home</div>
                <div className="text-slate-200">{formatCurrency(annualTakeHome)}</div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Allocation Bar */}
      {monthlyTakeHome > 0 && categories.length > 0 && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Allocation</h3>
            <span className={`text-sm font-medium ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(remaining)} left
            </span>
          </div>

          {/* Stacked bar */}
          <div className="h-4 rounded-full overflow-hidden bg-slate-800 flex">
            {barSegments.map((seg, i) => (
              <div
                key={i}
                className="h-full transition-all duration-300"
                style={{
                  width: `${Math.min(seg.pct, 100)}%`,
                  backgroundColor: seg.color,
                  opacity: 0.85,
                }}
                title={`${seg.name}: ${seg.pct.toFixed(1)}%`}
              />
            ))}
            {remainingPct > 0 && (
              <div
                className="h-full bg-slate-700/50 transition-all duration-300"
                style={{ width: `${remainingPct}%` }}
                title={`Unallocated: ${remainingPct.toFixed(1)}%`}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {barSegments.map((seg, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
                <span>{seg.name}</span>
                <span className="text-slate-500">{seg.pct.toFixed(0)}%</span>
              </div>
            ))}
            {remainingPct > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-2.5 h-2.5 rounded-sm bg-slate-700" />
                <span>Unallocated</span>
                <span className="text-slate-500">{remainingPct.toFixed(0)}%</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Budget Categories */}
      <Card>
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Spending Categories
        </h3>

        {categories.length === 0 && (
          <p className="text-slate-500 text-sm mb-4">
            No categories yet. Add your first spending bucket below.
          </p>
        )}

        <div className="space-y-3">
          {categories.map((cat) => {
            const isEditing = editingId === cat._id
            const pctOfIncome = monthlyTakeHome > 0
              ? ((cat.monthlyAmount / monthlyTakeHome) * 100).toFixed(1)
              : '—'

            if (isEditing) {
              return (
                <div key={cat._id} className="bg-slate-800/60 rounded-lg p-3 space-y-3">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Category name"
                    />
                    <input
                      className="w-28 bg-slate-900/50 border border-slate-600 rounded-lg py-1.5 px-3 text-sm text-white text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                      Save
                    </Button>
                  </div>
                </div>
              )
            }

            return (
              <div key={cat._id} className="bg-slate-800/40 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm text-slate-200 flex-1 min-w-0 truncate">{cat.name}</span>
                  <span className="text-sm font-medium text-white tabular-nums">
                    {formatCurrency(cat.monthlyAmount)}
                  </span>
                  {monthlyTakeHome > 0 && (
                    <span className="text-xs text-slate-500 w-12 text-right tabular-nums">
                      {pctOfIncome}%
                    </span>
                  )}
                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemove(cat._id)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    title="Remove"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Slider for quick amount adjustment */}
                <div className="mt-2 px-1">
                  <input
                    type="range"
                    min={0}
                    max={sliderMax}
                    step={50}
                    value={cat.monthlyAmount}
                    onChange={(e) => handleAmountSlider(cat._id, Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${cat.color} 0%, ${cat.color} ${(cat.monthlyAmount / sliderMax) * 100}%, #1e293b ${(cat.monthlyAmount / sliderMax) * 100}%, #1e293b 100%)`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Add new category */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name (e.g. Rent)"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                className="w-28 bg-slate-900/50 border border-slate-600 rounded-lg py-2 pl-7 pr-3 text-sm text-white text-right placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleAdd}
              disabled={!newName.trim() || !newAmount}
            >
              Add
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary */}
      {categories.length > 0 && (
        <Card variant={remaining < 0 ? 'highlighted' : 'default'} className={remaining < 0 ? 'border-red-500/20' : ''}>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Total Budgeted</span>
              <span className="text-lg font-semibold text-white tabular-nums">
                {formatCurrency(totalBudgeted)}
                <span className="text-sm text-slate-500 ml-1">/mo</span>
              </span>
            </div>

            {monthlyTakeHome > 0 && (
              <>
                <div className="border-t border-slate-800" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Monthly Take-Home</span>
                  <span className="text-sm text-slate-300 tabular-nums">
                    {formatCurrency(monthlyTakeHome)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-300">
                    {remaining >= 0 ? 'Remaining' : 'Over Budget'}
                  </span>
                  <span className={`text-lg font-bold tabular-nums ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {remaining >= 0 ? formatCurrency(remaining) : `-${formatCurrency(Math.abs(remaining))}`}
                    <span className="text-sm text-slate-500 ml-1">/mo</span>
                  </span>
                </div>

                <div className="border-t border-slate-800" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Annual Spending</span>
                    <div className="text-slate-200 font-medium">{formatCurrency(totalBudgeted * 12)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Annual Remaining</span>
                    <div className={`font-medium ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {remaining >= 0 ? formatCurrency(remaining * 12) : `-${formatCurrency(Math.abs(remaining) * 12)}`}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
