'use client'

import { useState, useEffect } from 'react'

interface NetWorthEntry {
  id: string
  amount: number
  timestamp: number
  rateOfReturn: number
}

interface StoredData {
  entries: NetWorthEntry[]
  currentRate: number
  swr: number
}

const STORAGE_KEY = 'net-worth-tracker-data'

export default function Home() {
  const [entries, setEntries] = useState<NetWorthEntry[]>([])
  const [rateOfReturn, setRateOfReturn] = useState<string>('7')
  const [swr, setSwr] = useState<string>('4')
  const [newAmount, setNewAmount] = useState<string>('')
  const [currentTotal, setCurrentTotal] = useState<number>(0)
  const [currentAppreciation, setCurrentAppreciation] = useState<number>(0)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load data from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const data: StoredData = JSON.parse(stored)
        setEntries(data.entries)
        setRateOfReturn(data.currentRate.toString())
        if (data.swr !== undefined) setSwr(data.swr.toString())
      } catch (e) {
        console.error('Failed to parse stored data:', e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      const data: StoredData = {
        entries,
        currentRate: parseFloat(rateOfReturn) || 7,
        swr: parseFloat(swr) || 4,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  }, [entries, rateOfReturn, swr, isLoaded])

  const latestEntry = entries[0] || null
  const rateNum = parseFloat(rateOfReturn) || 0

  // Calculate current appreciation in real-time
  useEffect(() => {
    if (!latestEntry) {
      setCurrentTotal(0)
      setCurrentAppreciation(0)
      return
    }

    const calculateAppreciation = () => {
      const now = Date.now()
      const elapsed = now - latestEntry.timestamp
      const yearlyRate = latestEntry.rateOfReturn / 100
      const msRate = yearlyRate / (365.25 * 24 * 60 * 60 * 1000)
      const appreciation = latestEntry.amount * msRate * elapsed
      setCurrentAppreciation(appreciation)
      setCurrentTotal(latestEntry.amount + appreciation)
    }

    calculateAppreciation()
    const interval = setInterval(calculateAppreciation, 50)
    return () => clearInterval(interval)
  }, [latestEntry])

  const addEntry = () => {
    const amount = parseFloat(newAmount.replace(/,/g, ''))
    if (isNaN(amount) || amount <= 0 || rateNum <= 0) return

    const entry: NetWorthEntry = {
      id: Date.now().toString(),
      amount,
      timestamp: Date.now(),
      rateOfReturn: rateNum,
    }

    setEntries([entry, ...entries])
    setNewAmount('')
  }

  const deleteEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id))
  }

  const formatCurrency = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatNetWorthInput = (value: string) => {
    return value.replace(/[^0-9.]/g, '')
  }

  const timeSinceLastEntry = () => {
    if (!latestEntry) return null
    const elapsed = Date.now() - latestEntry.timestamp
    const seconds = Math.floor(elapsed / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h ago`
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`
    return `${seconds}s ago`
  }

  // Stats based on latest entry
  const yearlyAppreciation = latestEntry ? latestEntry.amount * (latestEntry.rateOfReturn / 100) : 0
  const perSecond = yearlyAppreciation / (365.25 * 24 * 60 * 60)
  const perMinute = perSecond * 60
  const perHour = perMinute * 60
  const perDay = yearlyAppreciation / 365.25

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
          Net Worth Tracker
        </h1>
        <p className="text-slate-400 text-center mb-10">
          Watch your investments grow in real-time
        </p>

        {/* Current Total Display */}
        {latestEntry && (
          <div className="mb-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-emerald-500/30">
            <h2 className="text-sm font-medium text-slate-400 text-center mb-1">
              Current Net Worth
            </h2>
            <div className="text-center">
              <span className="text-4xl md:text-5xl font-bold font-mono bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {formatCurrency(currentTotal, 6)}
              </span>
            </div>
            <div className="mt-4 flex justify-center gap-8 text-sm">
              <div className="text-center">
                <p className="text-slate-500">Base Amount</p>
                <p className="text-slate-300 font-mono">{formatCurrency(latestEntry.amount)}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-500">Appreciation</p>
                <p className="text-emerald-400 font-mono">+{formatCurrency(currentAppreciation, 4)}</p>
              </div>
            </div>
            <p className="text-slate-500 text-center mt-4 text-xs">
              Last updated {timeSinceLastEntry()} at {latestEntry.rateOfReturn}% annual return
            </p>
          </div>
        )}

        {/* Add New Entry */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
          <h2 className="text-lg font-semibold text-slate-300 mb-4">
            {entries.length === 0 ? 'Add Your Net Worth' : 'Update Net Worth'}
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
                  onKeyDown={(e) => e.key === 'Enter' && addEntry()}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Expected Annual Rate of Return
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={rateOfReturn}
                  onChange={(e) => setRateOfReturn(e.target.value)}
                  placeholder="7"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 px-4 pr-10 text-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  %
                </span>
              </div>
            </div>

            <button
              onClick={addEntry}
              disabled={!newAmount || parseFloat(newAmount) <= 0 || rateNum <= 0}
              className="w-full py-4 rounded-lg font-semibold text-lg transition-all bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {entries.length === 0 ? 'Start Tracking' : 'Add Entry'}
            </button>
          </div>
        </div>

        {/* Stats Section */}
        {latestEntry && (
          <div className="mt-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
            <h2 className="text-lg font-semibold text-slate-300 mb-4">
              Appreciation Rate
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Per Second</p>
                <p className="text-emerald-400 font-mono text-lg">
                  {formatCurrency(perSecond, 6)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Per Minute</p>
                <p className="text-emerald-400 font-mono text-lg">
                  {formatCurrency(perMinute, 4)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Per Hour</p>
                <p className="text-emerald-400 font-mono text-lg">
                  {formatCurrency(perHour)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Per Day</p>
                <p className="text-emerald-400 font-mono text-lg">
                  {formatCurrency(perDay)}
                </p>
              </div>
              <div className="col-span-2 bg-slate-900/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Per Year</p>
                <p className="text-emerald-400 font-mono text-xl">
                  {formatCurrency(yearlyAppreciation)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Safe Withdrawal Rate */}
        {latestEntry && (
          <div className="mt-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
            <h2 className="text-lg font-semibold text-slate-300 mb-4">
              Safe Withdrawal Rate
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                SWR Percentage
              </label>
              <div className="relative w-32">
                <input
                  type="number"
                  value={swr}
                  onChange={(e) => setSwr(e.target.value)}
                  placeholder="4"
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 pr-8 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  %
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Annual Withdrawal</p>
                <p className="text-amber-400 font-mono text-xl">
                  {formatCurrency(currentTotal * (parseFloat(swr) || 0) / 100)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">Monthly Withdrawal</p>
                <p className="text-amber-400 font-mono text-xl">
                  {formatCurrency(currentTotal * (parseFloat(swr) || 0) / 100 / 12)}
                </p>
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-4">
              Based on current net worth of {formatCurrency(currentTotal)}
            </p>
          </div>
        )}

        {/* 40-Year Projections */}
        {latestEntry && (
          <div className="mt-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
            <h2 className="text-lg font-semibold text-slate-300 mb-4">
              40-Year Projection
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Estimated end-of-year net worth at {latestEntry.rateOfReturn}% annual return (compound growth)
            </p>
            <div className="max-h-96 overflow-y-auto pr-2 space-y-2">
              {Array.from({ length: 41 }, (_, i) => {
                const year = new Date().getFullYear() + i
                const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).getTime()
                const yearsFromEntry = (endOfYear - latestEntry.timestamp) / (365.25 * 24 * 60 * 60 * 1000)
                const projectedValue = latestEntry.amount * Math.pow(1 + latestEntry.rateOfReturn / 100, yearsFromEntry)
                const gain = projectedValue - latestEntry.amount
                const swrNum = parseFloat(swr) || 0
                const annualSwr = projectedValue * swrNum / 100
                const monthlySwr = annualSwr / 12
                return (
                  <div
                    key={year}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg gap-4"
                  >
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-slate-500 text-sm w-12">{year}</span>
                      <span className="text-slate-400 text-xs">+{yearsFromEntry.toFixed(1)}y</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-emerald-400">
                        {formatCurrency(projectedValue)}
                      </p>
                      <p className="text-slate-500 text-xs font-mono">
                        +{formatCurrency(gain)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 border-l border-slate-700 pl-4">
                      <p className="font-mono text-amber-400 text-sm">
                        {formatCurrency(annualSwr)}/yr
                      </p>
                      <p className="text-slate-400 text-xs font-mono">
                        {formatCurrency(monthlySwr)}/mo
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Entry History */}
        {entries.length > 0 && (
          <div className="mt-8 bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-slate-700">
            <h2 className="text-lg font-semibold text-slate-300 mb-4">
              Entry History
            </h2>
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
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
                      {formatDate(entry.timestamp)} · {entry.rateOfReturn}% rate
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {index === 0 && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                    <button
                      onClick={() => deleteEntry(entry.id)}
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
    </main>
  )
}
