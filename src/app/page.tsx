'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useConvexAuth } from 'convex/react'
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { SignIn } from './components/SignIn'
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

type Tab = 'dashboard' | 'entries' | 'projections'

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  
  // Debug logging
  useEffect(() => {
    console.log("Auth state:", { isAuthenticated, isLoading })
  }, [isAuthenticated, isLoading])

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

  // Convex data
  const settings = useQuery(api.settings.get)
  const entries = useQuery(api.entries.list) ?? []
  const saveSettings = useMutation(api.settings.save)
  const addEntry = useMutation(api.entries.add)
  const removeEntry = useMutation(api.entries.remove)

  // Local state for form inputs
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [rateOfReturn, setRateOfReturn] = useState<string>('7')
  const [swr, setSwr] = useState<string>('4')
  const [yearlyContribution, setYearlyContribution] = useState<string>('0')
  const [birthDate, setBirthDate] = useState<string>('')
  const [monthlySpend, setMonthlySpend] = useState<string>('0')
  const [inflationRate, setInflationRate] = useState<string>('3')
  const [inflationEnabled, setInflationEnabled] = useState<boolean>(false)
  const [projectionsView, setProjectionsView] = useState<'table' | 'chart'>('table')
  const [newAmount, setNewAmount] = useState<string>('')
  const [currentTotal, setCurrentTotal] = useState<number>(0)
  const [currentAppreciation, setCurrentAppreciation] = useState<number>(0)
  const [currentContributions, setCurrentContributions] = useState<number>(0)
  const [includeContributions, setIncludeContributions] = useState<boolean>(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Load settings when they come in from Convex
  useEffect(() => {
    if (settings && !settingsLoaded) {
      setRateOfReturn(settings.currentRate.toString())
      setSwr(settings.swr.toString())
      setYearlyContribution(settings.yearlyContribution.toString())
      setBirthDate(settings.birthDate)
      setMonthlySpend(settings.monthlySpend.toString())
      setInflationRate(settings.inflationRate.toString())
      setSettingsLoaded(true)
    }
  }, [settings, settingsLoaded])

  // Save settings to Convex when they change (debounced)
  useEffect(() => {
    if (!settingsLoaded) return

    const timeout = setTimeout(() => {
      saveSettings({
        currentRate: parseFloat(rateOfReturn) || 7,
        swr: parseFloat(swr) || 4,
        yearlyContribution: parseFloat(yearlyContribution) || 0,
        birthDate,
        monthlySpend: parseFloat(monthlySpend) || 0,
        inflationRate: parseFloat(inflationRate) || 3,
      })
    }, 500)

    return () => clearTimeout(timeout)
  }, [rateOfReturn, swr, yearlyContribution, birthDate, monthlySpend, inflationRate, settingsLoaded, saveSettings])

  const latestEntry = entries[0] || null
  const rateNum = parseFloat(rateOfReturn) || 0

  // Calculate current appreciation in real-time (optionally with contributions)
  useEffect(() => {
    if (!latestEntry) {
      setCurrentTotal(0)
      setCurrentAppreciation(0)
      setCurrentContributions(0)
      return
    }

    const calculateAppreciation = () => {
      const now = Date.now()
      const elapsed = now - latestEntry.timestamp
      const yearlyRate = rateNum / 100
      const msRate = yearlyRate / (365.25 * 24 * 60 * 60 * 1000)
      const appreciation = latestEntry.amount * msRate * elapsed
      setCurrentAppreciation(appreciation)

      if (includeContributions) {
        const yearlyContrib = parseFloat(yearlyContribution) || 0
        const yearsElapsed = elapsed / (365.25 * 24 * 60 * 60 * 1000)
        // Contributions made continuously, with compound growth
        // For small time periods, use linear approximation: contributions + appreciation on contributions
        const contributions = yearlyContrib * yearsElapsed
        const contributionAppreciation = contributions * msRate * (elapsed / 2) // Average appreciation on contributions
        setCurrentContributions(contributions + contributionAppreciation)
        setCurrentTotal(latestEntry.amount + appreciation + contributions + contributionAppreciation)
      } else {
        setCurrentContributions(0)
        setCurrentTotal(latestEntry.amount + appreciation)
      }
    }

    calculateAppreciation()
    const interval = setInterval(calculateAppreciation, 50)
    return () => clearInterval(interval)
  }, [latestEntry, rateNum, includeContributions, yearlyContribution])

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

  // Stats based on latest entry (optionally with contributions)
  const yearlyContrib = parseFloat(yearlyContribution) || 0
  const yearlyAppreciation = latestEntry ? currentTotal * (rateNum / 100) : 0
  const yearlyGrowth = includeContributions ? yearlyAppreciation + yearlyContrib : yearlyAppreciation
  const perSecond = yearlyGrowth / (365.25 * 24 * 60 * 60)
  const perMinute = perSecond * 60
  const perHour = perMinute * 60
  const perDay = yearlyGrowth / 365.25

  // Projection data for both table and chart views
  const projectionData = useMemo(() => {
    if (!latestEntry) return []

    const baseSpend = parseFloat(monthlySpend) || 0
    const swrNum = parseFloat(swr) || 0
    const r = rateNum / 100
    const inflation = inflationEnabled ? (parseFloat(inflationRate) || 0) / 100 : 0
    const currentYear = new Date().getFullYear()
    const contribution = parseFloat(yearlyContribution) || 0
    const birthYear = birthDate ? new Date(birthDate).getFullYear() : null

    const getInflatedSpend = (yearsFromNow: number) => baseSpend * Math.pow(1 + inflation, yearsFromNow)
    const getFiTarget = (monthlySpend: number) => monthlySpend > 0 && swrNum > 0 ? (monthlySpend * 12) / (swrNum / 100) : 0

    const findCoastFiYear = (startingValue: number, startYear: number, startYearsFromNow: number): number | null => {
      if (baseSpend <= 0 || swrNum <= 0 || r <= 0) return null
      for (let y = 0; y <= 100; y++) {
        const futureValue = startingValue * Math.pow(1 + r, y)
        const futureSpend = getInflatedSpend(startYearsFromNow + y)
        const futureTarget = getFiTarget(futureSpend)
        if (futureValue >= futureTarget) return startYear + y
      }
      return null
    }

    let fiYearFound = false
    let crossoverFound = false

    // Current row
    const currentSpend = baseSpend
    const currentTargetNetWorth = getFiTarget(currentSpend)
    const currentAnnualSwr = currentTotal * swrNum / 100
    const currentMonthlySwr = currentAnnualSwr / 12
    const currentSwrCoversSpend = baseSpend > 0 && currentMonthlySwr >= currentSpend
    const currentCoastFiYear = findCoastFiYear(currentTotal, currentYear, 0)
    const currentFiProgress = currentTargetNetWorth > 0 ? (currentTotal / currentTargetNetWorth) * 100 : 0

    if (currentSwrCoversSpend) fiYearFound = true

    const data: Array<{
      year: number | string
      age: number | null
      yearsFromEntry: number
      netWorth: number
      interest: number
      contributed: number
      monthlySwr: number
      monthlySpend: number
      fiProgress: number
      coastFiYear: number | null
      coastFiAge: number | null
      isFiYear: boolean
      isCrossover: boolean
      swrCoversSpend: boolean
      fiTarget: number
    }> = []

    // Add "Now" row
    data.push({
      year: 'Now',
      age: birthYear ? currentYear - birthYear : null,
      yearsFromEntry: 0,
      netWorth: currentTotal,
      interest: currentAppreciation,
      contributed: 0,
      monthlySwr: currentMonthlySwr,
      monthlySpend: currentSpend,
      fiProgress: currentFiProgress,
      coastFiYear: currentCoastFiYear,
      coastFiAge: currentCoastFiYear && birthYear ? currentCoastFiYear - birthYear : null,
      isFiYear: false,
      isCrossover: false,
      swrCoversSpend: currentSwrCoversSpend,
      fiTarget: currentTargetNetWorth,
    })

    // Add projection rows
    for (let i = 0; i < 61; i++) {
      const year = currentYear + i
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).getTime()
      const yearsFromEntry = (endOfYear - latestEntry.timestamp) / (365.25 * 24 * 60 * 60 * 1000)
      const fullYears = Math.floor(yearsFromEntry)
      const age = birthYear ? year - birthYear : null

      const compoundedInitial = latestEntry.amount * Math.pow(1 + r, yearsFromEntry)
      const partialYearFraction = yearsFromEntry - fullYears
      const partialContribution = partialYearFraction * contribution
      const partialContributionGrowth = partialContribution * Math.pow(1 + r, fullYears)
      const fullYearContributionGrowth = r > 0 && fullYears > 0
        ? contribution * ((Math.pow(1 + r, fullYears) - 1) / r)
        : contribution * fullYears

      const contributionGrowth = partialContributionGrowth + fullYearContributionGrowth
      const totalContributed = partialContribution + (contribution * fullYears)
      const projectedValue = compoundedInitial + contributionGrowth
      const totalInterest = projectedValue - latestEntry.amount - totalContributed

      const yearSpend = getInflatedSpend(i)
      const yearTargetNetWorth = getFiTarget(yearSpend)
      const fiProgress = yearTargetNetWorth > 0 ? (projectedValue / yearTargetNetWorth) * 100 : 0

      const annualSwr = projectedValue * swrNum / 100
      const monthlySwr = annualSwr / 12
      const swrCoversSpend = baseSpend > 0 && monthlySwr >= yearSpend
      const isFiYear = swrCoversSpend && !fiYearFound
      if (isFiYear) fiYearFound = true

      const isCrossover = totalInterest > totalContributed && !crossoverFound && totalContributed > 0
      if (isCrossover) crossoverFound = true

      const coastFiYear = findCoastFiYear(projectedValue, year, i)

      data.push({
        year,
        age,
        yearsFromEntry,
        netWorth: projectedValue,
        interest: totalInterest,
        contributed: totalContributed,
        monthlySwr,
        monthlySpend: yearSpend,
        fiProgress,
        coastFiYear,
        coastFiAge: coastFiYear && birthYear ? coastFiYear - birthYear : null,
        isFiYear,
        isCrossover,
        swrCoversSpend,
        fiTarget: yearTargetNetWorth,
      })
    }

    return data
  }, [latestEntry, monthlySpend, swr, inflationEnabled, inflationRate, yearlyContribution, birthDate, currentTotal, currentAppreciation, rateNum])

  // Find key milestones for chart
  const fiYear = projectionData.find(d => d.isFiYear)?.year
  const crossoverYear = projectionData.find(d => d.isCrossover)?.year

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur border-b border-slate-700">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 items-center">
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
            <div className="flex-1" />
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Sign Out
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
                  {formatCurrency(currentTotal, 6)}
                </span>
              </div>
              <div className={`mt-4 flex justify-center ${includeContributions ? 'gap-4' : 'gap-8'} text-sm`}>
                <div className="text-center">
                  <p className="text-slate-500">Base Amount</p>
                  <p className="text-slate-300 font-mono">{formatCurrency(latestEntry.amount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500">Appreciation</p>
                  <p className="text-emerald-400 font-mono">+{formatCurrency(currentAppreciation, 4)}</p>
                </div>
                {includeContributions && (
                  <div className="text-center">
                    <p className="text-slate-500">Saved</p>
                    <p className="text-sky-400 font-mono">+{formatCurrency(currentContributions, 4)}</p>
                  </div>
                )}
              </div>
              <p className="text-slate-500 text-center mt-4 text-xs">
                Last updated {timeSinceLastEntry()} at {rateNum}% annual return
                {includeContributions && yearlyContrib > 0 && (
                  <span> + {formatCurrency(yearlyContrib)}/yr contributions</span>
                )}
              </p>
              {includeContributions && yearlyContrib === 0 && (
                <p className="text-amber-400/70 text-center mt-2 text-xs">
                  Set your yearly contribution in the Projections tab to see savings growth
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
                    <p className={`${includeContributions ? 'text-sky-400' : 'text-emerald-400'} font-mono`}>{formatCurrency(perSecond, 6)}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-500 text-xs">Per Minute</p>
                    <p className={`${includeContributions ? 'text-sky-400' : 'text-emerald-400'} font-mono`}>{formatCurrency(perMinute, 4)}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-500 text-xs">Per Hour</p>
                    <p className={`${includeContributions ? 'text-sky-400' : 'text-emerald-400'} font-mono`}>{formatCurrency(perHour)}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-500 text-xs">Per Day</p>
                    <p className={`${includeContributions ? 'text-sky-400' : 'text-emerald-400'} font-mono`}>{formatCurrency(perDay)}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 col-span-2 sm:col-span-2">
                    <p className="text-slate-500 text-xs">Per Year</p>
                    <p className={`${includeContributions ? 'text-sky-400' : 'text-emerald-400'} font-mono text-lg`}>{formatCurrency(yearlyGrowth)}</p>
                    {includeContributions && yearlyContrib > 0 && (
                      <p className="text-slate-500 text-xs mt-1">
                        {formatCurrency(yearlyAppreciation)} appreciation + {formatCurrency(yearlyContrib)} saved
                      </p>
                    )}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAddEntry()}
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
                        onClick={() => handleDeleteEntry(entry._id)}
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
                  <span className="text-emerald-400">{rateNum}%</span> annual return
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
                <div className="flex items-end">
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
              </div>

              {/* Projections Content */}
              {projectionsView === 'table' ? (
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
                      {projectionData.map((row) => {
                        const baseSpend = parseFloat(monthlySpend) || 0
                        const currentYear = new Date().getFullYear()
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
                            {baseSpend > 0 && (
                              <td className={`py-2 px-3 text-right font-mono ${row.fiProgress >= 100 ? 'text-emerald-400 font-semibold' : 'text-violet-400'}`}>
                                {row.fiProgress.toFixed(1)}%
                              </td>
                            )}
                            {baseSpend > 0 && (
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
              ) : (
                <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700 p-6 overflow-auto">
                  {(() => {
                    // Limit chart data to 25 years for readability
                    const chartData = projectionData
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
                      }))
                    
                    const baseSpend = parseFloat(monthlySpend) || 0
                    
                    if (chartData.length === 0) {
                      return <div className="text-slate-400">No projection data available</div>
                    }
                    
                    return (
                      <div className="space-y-8">
                        {/* Chart 1: Race to FI - Net Worth vs Target */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-medium text-slate-200">Net Worth Over Time</h3>
                            {fiYear && typeof fiYear === 'number' && (
                              <span className="text-sm text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
                                🎯 FI in {fiYear - new Date().getFullYear()} years ({fiYear})
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
                                {baseSpend > 0 && (
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

                        {/* Chart 2: Wealth Composition */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-medium text-slate-200">Interest vs Contributions</h3>
                            {crossoverYear && typeof crossoverYear === 'number' && (
                              <span className="text-sm text-sky-400 bg-sky-400/10 px-3 py-1 rounded-full">
                                ✨ Crossover in {crossoverYear - new Date().getFullYear()} years
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
                        {baseSpend > 0 && (
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
                      </div>
                    )
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  )
}
