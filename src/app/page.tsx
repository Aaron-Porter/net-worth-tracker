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
  yearlyContribution: number
  birthDate: string
  monthlySpend: number
  inflationRate: number
}

const STORAGE_KEY = 'net-worth-tracker-data'

type Tab = 'dashboard' | 'entries' | 'projections'

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [entries, setEntries] = useState<NetWorthEntry[]>([])
  const [rateOfReturn, setRateOfReturn] = useState<string>('7')
  const [swr, setSwr] = useState<string>('4')
  const [yearlyContribution, setYearlyContribution] = useState<string>('0')
  const [birthDate, setBirthDate] = useState<string>('')
  const [monthlySpend, setMonthlySpend] = useState<string>('0')
  const [inflationRate, setInflationRate] = useState<string>('3')
  const [inflationEnabled, setInflationEnabled] = useState<boolean>(false)
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
        if (data.yearlyContribution !== undefined) setYearlyContribution(data.yearlyContribution.toString())
        if (data.birthDate !== undefined) setBirthDate(data.birthDate)
        if (data.monthlySpend !== undefined) setMonthlySpend(data.monthlySpend.toString())
        if (data.inflationRate !== undefined) setInflationRate(data.inflationRate.toString())
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
        yearlyContribution: parseFloat(yearlyContribution) || 0,
        birthDate,
        monthlySpend: parseFloat(monthlySpend) || 0,
        inflationRate: parseFloat(inflationRate) || 3,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  }, [entries, rateOfReturn, swr, yearlyContribution, birthDate, monthlySpend, inflationRate, isLoaded])

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
      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur border-b border-slate-700">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
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
          </div>
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
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
              
              {/* Appreciation Rates */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Appreciation Rate</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-500 text-xs">Per Second</p>
                    <p className="text-emerald-400 font-mono">{formatCurrency(perSecond, 6)}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-500 text-xs">Per Minute</p>
                    <p className="text-emerald-400 font-mono">{formatCurrency(perMinute, 4)}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-500 text-xs">Per Hour</p>
                    <p className="text-emerald-400 font-mono">{formatCurrency(perHour)}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-500 text-xs">Per Day</p>
                    <p className="text-emerald-400 font-mono">{formatCurrency(perDay)}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 col-span-2 sm:col-span-2">
                    <p className="text-slate-500 text-xs">Per Year</p>
                    <p className="text-emerald-400 font-mono text-lg">{formatCurrency(yearlyAppreciation)}</p>
                  </div>
                </div>
              </div>

              {/* Safe Withdrawal Rate */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">
                  Safe Withdrawal Rate <span className="text-slate-500">({swr}%)</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-500 text-xs">Annual</p>
                    <p className="text-amber-400 font-mono text-lg">
                      {formatCurrency(currentTotal * (parseFloat(swr) || 0) / 100)}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-500 text-xs">Monthly</p>
                    <p className="text-amber-400 font-mono text-lg">
                      {formatCurrency(currentTotal * (parseFloat(swr) || 0) / 100 / 12)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Entries Tab */}
      {activeTab === 'entries' && (
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
      )}

      {/* Projections Tab */}
      {activeTab === 'projections' && (
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
              {/* Controls */}
              <div className="flex flex-wrap items-end gap-4 mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-sm text-slate-400">
                  Base: <span className="text-emerald-400 font-mono">{formatCurrency(latestEntry.amount)}</span> at{' '}
                  <span className="text-emerald-400">{latestEntry.rateOfReturn}%</span> annual return
                </div>
                <div className="flex-1" />
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    SWR %
                  </label>
                  <input
                    type="number"
                    value={swr}
                    onChange={(e) => setSwr(e.target.value)}
                    placeholder="4"
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-20 bg-slate-900/50 border border-slate-600 rounded-lg py-1.5 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Yearly Contribution
                  </label>
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={yearlyContribution}
                      onChange={(e) => setYearlyContribution(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1000"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-1.5 px-3 pl-7 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="bg-slate-900/50 border border-slate-600 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Monthly Spend
                  </label>
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={monthlySpend}
                      onChange={(e) => setMonthlySpend(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="100"
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-1.5 px-3 pl-7 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => setInflationEnabled(!inflationEnabled)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      inflationEnabled
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                        : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                    }`}
                  >
                    Inflation {inflationEnabled ? 'ON' : 'OFF'}
                  </button>
                  {inflationEnabled && (
                    <input
                      type="number"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(e.target.value)}
                      placeholder="3"
                      min="0"
                      max="20"
                      step="0.1"
                      className="w-16 bg-slate-900/50 border border-slate-600 rounded-lg py-1.5 px-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  )}
                  {inflationEnabled && <span className="text-slate-500 text-sm">%</span>}
                </div>
              </div>

              {/* Full-screen Table */}
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
                      {(parseFloat(monthlySpend) > 0) && (
                        <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">FI %</th>
                      )}
                      {(parseFloat(monthlySpend) > 0) && (
                        <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap border-l border-slate-700">
                          Coast FI {birthDate ? 'Age' : 'Year'}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const baseSpend = parseFloat(monthlySpend) || 0
                      const swrNum = parseFloat(swr) || 0
                      const r = latestEntry.rateOfReturn / 100
                      const inflation = inflationEnabled ? (parseFloat(inflationRate) || 0) / 100 : 0
                      let fiYearFound = false
                      const currentYear = new Date().getFullYear()

                      // Function to get inflated spend for a given number of years from now
                      const getInflatedSpend = (yearsFromNow: number) => {
                        return baseSpend * Math.pow(1 + inflation, yearsFromNow)
                      }

                      // Function to get FI target for a given spend
                      const getFiTarget = (monthlySpend: number) => {
                        return monthlySpend > 0 && swrNum > 0 ? (monthlySpend * 12) / (swrNum / 100) : 0
                      }

                      // Function to find Coast FI year from a given starting value
                      // With inflation, the target moves, so we need to solve iteratively
                      const findCoastFiYear = (startingValue: number, startYear: number, startYearsFromNow: number): number | null => {
                        if (baseSpend <= 0 || swrNum <= 0 || r <= 0) return null
                        
                        // Check each year until we find when coast growth meets inflated target
                        for (let y = 0; y <= 100; y++) {
                          const futureValue = startingValue * Math.pow(1 + r, y)
                          const futureSpend = getInflatedSpend(startYearsFromNow + y)
                          const futureTarget = getFiTarget(futureSpend)
                          if (futureValue >= futureTarget) {
                            return startYear + y
                          }
                        }
                        return null
                      }

                      // Current row calculations (now = 0 years from now)
                      const currentSpend = baseSpend // No inflation for "now"
                      const currentTargetNetWorth = getFiTarget(currentSpend)
                      const birthYear = birthDate ? new Date(birthDate).getFullYear() : null
                      const currentAge = birthYear ? currentYear - birthYear : null
                      const currentAnnualSwr = currentTotal * swrNum / 100
                      const currentMonthlySwr = currentAnnualSwr / 12
                      const currentSwrCoversSpend = baseSpend > 0 && currentMonthlySwr >= currentSpend
                      const currentCoastFiYear = findCoastFiYear(currentTotal, currentYear, 0)
                      const currentCoastFiAge = currentCoastFiYear && birthYear ? currentCoastFiYear - birthYear : null
                      const currentFiProgress = currentTargetNetWorth > 0 ? (currentTotal / currentTargetNetWorth) * 100 : 0

                      if (currentSwrCoversSpend) fiYearFound = true

                      // Track crossover point (when cumulative interest exceeds cumulative contributions)
                      let crossoverFound = false

                      const rows = []

                      // Add current row
                      rows.push(
                        <tr
                          key="current"
                          className={`border-b-2 border-slate-600 bg-slate-700/30 ${
                            currentSwrCoversSpend ? 'bg-emerald-900/30' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-slate-200 font-semibold">
                            Now
                            {currentSwrCoversSpend && <span className="ml-2 text-xs text-emerald-400 font-semibold">FI</span>}
                          </td>
                          {birthDate && <td className="py-2 px-3 text-slate-300 font-medium">{currentAge}</td>}
                          <td className="py-2 px-3 text-slate-400">-</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-400 font-semibold">{formatCurrency(currentTotal)}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-400/70">+{formatCurrency(currentAppreciation)}</td>
                          <td className="py-2 px-3 text-right font-mono text-sky-400/70">-</td>
                          <td className={`py-2 px-3 text-right font-mono ${currentSwrCoversSpend ? 'text-emerald-400' : 'text-amber-400/80'}`}>
                            {formatCurrency(currentMonthlySwr)}
                          </td>
                          {baseSpend > 0 && (
                            <td className={`py-2 px-3 text-right font-mono ${currentFiProgress >= 100 ? 'text-emerald-400 font-semibold' : 'text-violet-400'}`}>
                              {currentFiProgress.toFixed(1)}%
                            </td>
                          )}
                          {baseSpend > 0 && (
                            <td className="py-2 px-3 text-right font-mono border-l border-slate-700">
                              {currentCoastFiYear ? (
                                <span className={currentSwrCoversSpend ? 'text-emerald-400' : 'text-violet-400'}>
                                  {currentSwrCoversSpend ? (
                                    'Now'
                                  ) : (
                                    <>
                                      {currentCoastFiYear - currentYear}y
                                      <span className="text-slate-500 text-xs ml-1">
                                        ({birthDate ? `age ${currentCoastFiAge}` : currentCoastFiYear})
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

                      // Add projection rows
                      rows.push(...Array.from({ length: 61 }, (_, i) => {
                        const year = new Date().getFullYear() + i
                        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).getTime()
                        const yearsFromEntry = (endOfYear - latestEntry.timestamp) / (365.25 * 24 * 60 * 60 * 1000)
                        const fullYears = Math.floor(yearsFromEntry)
                        const contribution = parseFloat(yearlyContribution) || 0

                        // Calculate age at end of year
                        const birthYear = birthDate ? new Date(birthDate).getFullYear() : null
                        const age = birthYear ? year - birthYear : null

                        // Compound growth on initial amount
                        const compoundedInitial = latestEntry.amount * Math.pow(1 + r, yearsFromEntry)

                        // Pro-rated contribution for the partial first year
                        // e.g., if entry was made in March, 9 months remain = 0.75 of yearly contribution
                        const partialYearFraction = yearsFromEntry - fullYears
                        const partialContribution = partialYearFraction * contribution
                        // This partial contribution compounds for the remaining full years
                        const partialContributionGrowth = partialContribution * Math.pow(1 + r, fullYears)

                        // Future value of yearly contributions (annuity) for full years
                        // Contributions made at end of each full year, compounded
                        const fullYearContributionGrowth = r > 0 && fullYears > 0
                          ? contribution * ((Math.pow(1 + r, fullYears) - 1) / r)
                          : contribution * fullYears

                        const contributionGrowth = partialContributionGrowth + fullYearContributionGrowth
                        const totalContributed = partialContribution + (contribution * fullYears)
                        const projectedValue = compoundedInitial + contributionGrowth
                        
                        // Interest = Total growth - contributions (just the compound interest portion)
                        const totalInterest = projectedValue - latestEntry.amount - totalContributed
                        
                        // Inflated monthly spend for this year
                        const yearSpend = getInflatedSpend(i)
                        const yearTargetNetWorth = getFiTarget(yearSpend)
                        
                        // FI Progress (against potentially inflated target)
                        const fiProgress = yearTargetNetWorth > 0 ? (projectedValue / yearTargetNetWorth) * 100 : 0
                        
                        const annualSwr = projectedValue * swrNum / 100
                        const monthlySwr = annualSwr / 12

                        // Check if SWR covers monthly spend (potentially inflated)
                        const swrCoversSpend = baseSpend > 0 && monthlySwr >= yearSpend
                        const isFirstFiYear = swrCoversSpend && !fiYearFound
                        if (isFirstFiYear) fiYearFound = true

                        // Check for crossover point (interest > contributions)
                        const isInterestCrossover = totalInterest > totalContributed && !crossoverFound && totalContributed > 0
                        if (isInterestCrossover) crossoverFound = true

                        // Calculate Coast FI: if you stopped contributing at this year, when could you retire?
                        const coastFiYear = findCoastFiYear(projectedValue, year, i)
                        const coastFiAge = coastFiYear && birthYear ? coastFiYear - birthYear : null

                        return (
                          <tr
                            key={year}
                            className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${
                              isFirstFiYear ? 'bg-emerald-900/30 border-emerald-500/50' : ''
                            } ${swrCoversSpend && !isFirstFiYear ? 'bg-emerald-900/10' : ''} ${
                              isInterestCrossover ? 'bg-sky-900/30 border-sky-500/50' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-slate-300 font-medium">
                              {year}
                              {isFirstFiYear && <span className="ml-2 text-xs text-emerald-400 font-semibold">FI</span>}
                              {isInterestCrossover && <span className="ml-2 text-xs text-sky-400 font-semibold">✨</span>}
                            </td>
                            {birthDate && <td className="py-2 px-3 text-slate-400">{age}</td>}
                            <td className="py-2 px-3 text-slate-500">+{yearsFromEntry.toFixed(1)}y</td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-400">{formatCurrency(projectedValue)}</td>
                            <td className={`py-2 px-3 text-right font-mono ${totalInterest > totalContributed ? 'text-emerald-400' : 'text-emerald-400/70'}`}>
                              +{formatCurrency(totalInterest)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-sky-400/70">{formatCurrency(totalContributed)}</td>
                            <td className={`py-2 px-3 text-right font-mono ${swrCoversSpend ? 'text-emerald-400' : 'text-amber-400/80'}`}>
                              {formatCurrency(monthlySwr)}
                            </td>
                            {baseSpend > 0 && (
                              <td className={`py-2 px-3 text-right font-mono ${fiProgress >= 100 ? 'text-emerald-400 font-semibold' : 'text-violet-400'}`}>
                                {fiProgress.toFixed(1)}%
                              </td>
                            )}
                            {baseSpend > 0 && (
                              <td className="py-2 px-3 text-right font-mono border-l border-slate-700">
                                {coastFiYear ? (
                                  <span className={swrCoversSpend ? 'text-emerald-400' : 'text-violet-400'}>
                                    {swrCoversSpend ? (
                                      'Now'
                                    ) : (
                                      <>
                                        {coastFiYear - year}y
                                        <span className="text-slate-500 text-xs ml-1">
                                          ({birthDate ? `age ${coastFiAge}` : coastFiYear})
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
                      }))

                      return rows
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  )
}
