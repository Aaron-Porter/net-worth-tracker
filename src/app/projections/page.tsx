'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
}

const STORAGE_KEY = 'net-worth-tracker-data'

export default function Projections() {
  const [entries, setEntries] = useState<NetWorthEntry[]>([])
  const [swr, setSwr] = useState<string>('4')
  const [yearlyContribution, setYearlyContribution] = useState<string>('0')
  const [birthDate, setBirthDate] = useState<string>('')
  const [monthlySpend, setMonthlySpend] = useState<string>('0')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load data from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const data: StoredData = JSON.parse(stored)
        setEntries(data.entries)
        if (data.swr !== undefined) setSwr(data.swr.toString())
        if (data.yearlyContribution !== undefined) setYearlyContribution(data.yearlyContribution.toString())
        if (data.birthDate !== undefined) setBirthDate(data.birthDate)
        if (data.monthlySpend !== undefined) setMonthlySpend(data.monthlySpend.toString())
      } catch (e) {
        console.error('Failed to parse stored data:', e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save projection settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const data: StoredData = JSON.parse(stored)
          data.swr = parseFloat(swr) || 4
          data.yearlyContribution = parseFloat(yearlyContribution) || 0
          data.birthDate = birthDate
          data.monthlySpend = parseFloat(monthlySpend) || 0
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch (e) {
          console.error('Failed to save data:', e)
        }
      }
    }
  }, [swr, yearlyContribution, birthDate, monthlySpend, isLoaded])

  const latestEntry = entries[0] || null

  const formatCurrency = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </main>
    )
  }

  if (!latestEntry) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No net worth data found.</p>
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 underline">
            Go back and add an entry
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="h-screen flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors"
            >
              &larr; Back
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Projections
            </h1>
          </div>
          <div className="text-sm text-slate-400">
            Base: {formatCurrency(latestEntry.amount)} at {latestEntry.rateOfReturn}% annual return
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-end gap-4 mb-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
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
                <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Total Gain</th>
                <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Contributed</th>
                <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Annual SWR</th>
                <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Monthly SWR</th>
                <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Weekly SWR</th>
                <th className="text-right text-slate-400 font-medium py-3 px-3 whitespace-nowrap">Daily SWR</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const spend = parseFloat(monthlySpend) || 0
                let fiYearFound = false

                return Array.from({ length: 61 }, (_, i) => {
                  const year = new Date().getFullYear() + i
                  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).getTime()
                  const yearsFromEntry = (endOfYear - latestEntry.timestamp) / (365.25 * 24 * 60 * 60 * 1000)
                  const fullYears = Math.floor(yearsFromEntry)
                  const r = latestEntry.rateOfReturn / 100
                  const contribution = parseFloat(yearlyContribution) || 0

                  // Calculate age at end of year
                  const birthYear = birthDate ? new Date(birthDate).getFullYear() : null
                  const age = birthYear ? year - birthYear : null

                  // Compound growth on initial amount
                  const compoundedInitial = latestEntry.amount * Math.pow(1 + r, yearsFromEntry)

                  // Future value of yearly contributions (annuity)
                  // Contributions made at end of each year, compounded
                  const contributionGrowth = r > 0 && fullYears > 0
                    ? contribution * ((Math.pow(1 + r, fullYears) - 1) / r)
                    : contribution * fullYears

                  const totalContributed = contribution * fullYears
                  const projectedValue = compoundedInitial + contributionGrowth
                  const gain = projectedValue - latestEntry.amount - totalContributed
                  const swrNum = parseFloat(swr) || 0
                  const annualSwr = projectedValue * swrNum / 100
                  const monthlySwr = annualSwr / 12
                  const weeklySwr = annualSwr / 52
                  const dailySwr = annualSwr / 365

                  // Check if SWR covers monthly spend
                  const swrCoversSpend = spend > 0 && monthlySwr >= spend
                  const isFirstFiYear = swrCoversSpend && !fiYearFound
                  if (isFirstFiYear) fiYearFound = true

                  return (
                    <tr
                      key={year}
                      className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${
                        isFirstFiYear ? 'bg-emerald-900/30 border-emerald-500/50' : ''
                      } ${swrCoversSpend && !isFirstFiYear ? 'bg-emerald-900/10' : ''}`}
                    >
                      <td className="py-2 px-3 text-slate-300 font-medium">
                        {year}
                        {isFirstFiYear && <span className="ml-2 text-xs text-emerald-400 font-semibold">FI</span>}
                      </td>
                      {birthDate && <td className="py-2 px-3 text-slate-400">{age}</td>}
                      <td className="py-2 px-3 text-slate-500">+{yearsFromEntry.toFixed(1)}y</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-400">{formatCurrency(projectedValue)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-400/70">+{formatCurrency(gain)}</td>
                      <td className="py-2 px-3 text-right font-mono text-sky-400/70">{formatCurrency(totalContributed)}</td>
                      <td className="py-2 px-3 text-right font-mono text-amber-400">{formatCurrency(annualSwr)}</td>
                      <td className={`py-2 px-3 text-right font-mono ${swrCoversSpend ? 'text-emerald-400' : 'text-amber-400/80'}`}>
                        {formatCurrency(monthlySwr)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-amber-400/60">{formatCurrency(weeklySwr)}</td>
                      <td className="py-2 px-3 text-right font-mono text-amber-400/40">{formatCurrency(dailySwr)}</td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
