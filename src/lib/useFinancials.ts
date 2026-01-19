/**
 * React hook for accessing centralized financial calculations
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  UserSettings,
  NetWorthEntry,
  CalculatedFinancials,
  RealTimeNetWorth,
  GrowthRates,
  LevelInfo,
  ProjectionRow,
  calculateAllFinancials,
  calculateRealTimeNetWorth,
  calculateGrowthRates,
  calculateLevelInfo,
  generateProjections,
  calculateLevelBasedSpending,
  mergeWithDefaults,
  DEFAULT_SETTINGS,
  LEVEL_THRESHOLDS,
  formatCurrency,
  formatDate,
  getTimeSinceEntry,
} from './calculations';

export interface UseFinancialsOptions {
  includeContributions?: boolean;
  applyInflation?: boolean;
  useSpendingLevels?: boolean;
  realTimeUpdateInterval?: number; // ms, default 50
}

export interface UseFinancialsReturn {
  // Loading states
  isLoading: boolean;
  settingsLoaded: boolean;
  
  // Raw data
  settings: UserSettings;
  entries: NetWorthEntry[];
  latestEntry: NetWorthEntry | null;
  
  // Calculated values (updated in real-time)
  currentNetWorth: RealTimeNetWorth;
  growthRates: GrowthRates;
  projections: ProjectionRow[];
  levelInfo: LevelInfo;
  
  // Key milestones
  fiYear: number | null;
  fiAge: number | null;
  crossoverYear: number | null;
  currentFiProgress: number;
  currentMonthlySwr: number;
  currentAnnualSwr: number;
  
  // Settings controls
  includeContributions: boolean;
  setIncludeContributions: (value: boolean) => void;
  applyInflation: boolean;
  setApplyInflation: (value: boolean) => void;
  useSpendingLevels: boolean;
  setUseSpendingLevels: (value: boolean) => void;
  
  // Settings update functions (local state)
  localSettings: {
    rateOfReturn: string;
    swr: string;
    yearlyContribution: string;
    birthDate: string;
    monthlySpend: string;
    inflationRate: string;
    baseMonthlyBudget: string;
    spendingGrowthRate: string;
  };
  updateLocalSetting: (key: keyof UseFinancialsReturn['localSettings'], value: string) => void;
  
  // Utilities
  formatCurrency: typeof formatCurrency;
  formatDate: typeof formatDate;
  getTimeSinceEntry: typeof getTimeSinceEntry;
}

export function useFinancials(options: UseFinancialsOptions = {}): UseFinancialsReturn {
  const {
    includeContributions: defaultIncludeContributions = false,
    applyInflation: defaultApplyInflation = false,
    useSpendingLevels: defaultUseSpendingLevels = false,
    realTimeUpdateInterval = 50,
  } = options;
  
  // Convex data
  const rawSettings = useQuery(api.settings.get);
  const rawEntries = useQuery(api.entries.list) ?? [];
  const saveSettings = useMutation(api.settings.save);
  
  // Local state for form inputs (strings for controlled inputs)
  const [localSettings, setLocalSettings] = useState({
    rateOfReturn: DEFAULT_SETTINGS.currentRate.toString(),
    swr: DEFAULT_SETTINGS.swr.toString(),
    yearlyContribution: DEFAULT_SETTINGS.yearlyContribution.toString(),
    birthDate: DEFAULT_SETTINGS.birthDate,
    monthlySpend: DEFAULT_SETTINGS.monthlySpend.toString(),
    inflationRate: DEFAULT_SETTINGS.inflationRate.toString(),
    baseMonthlyBudget: DEFAULT_SETTINGS.baseMonthlyBudget.toString(),
    spendingGrowthRate: DEFAULT_SETTINGS.spendingGrowthRate.toString(),
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Calculation options
  const [includeContributions, setIncludeContributions] = useState(defaultIncludeContributions);
  const [applyInflation, setApplyInflation] = useState(defaultApplyInflation);
  const [useSpendingLevels, setUseSpendingLevels] = useState(defaultUseSpendingLevels);
  
  // Real-time net worth state
  const [realTimeNetWorth, setRealTimeNetWorth] = useState<RealTimeNetWorth>({
    total: 0,
    baseAmount: 0,
    appreciation: 0,
    contributions: 0,
  });
  
  // Load settings from Convex
  useEffect(() => {
    if (rawSettings === undefined || settingsLoaded) return;
    
    if (rawSettings !== null) {
      setLocalSettings({
        rateOfReturn: rawSettings.currentRate.toString(),
        swr: rawSettings.swr.toString(),
        yearlyContribution: rawSettings.yearlyContribution.toString(),
        birthDate: rawSettings.birthDate,
        monthlySpend: rawSettings.monthlySpend.toString(),
        inflationRate: rawSettings.inflationRate.toString(),
        baseMonthlyBudget: (rawSettings.baseMonthlyBudget ?? DEFAULT_SETTINGS.baseMonthlyBudget).toString(),
        spendingGrowthRate: (rawSettings.spendingGrowthRate ?? DEFAULT_SETTINGS.spendingGrowthRate).toString(),
      });
    }
    setSettingsLoaded(true);
  }, [rawSettings, settingsLoaded]);
  
  // Convert local string settings to UserSettings object
  const settings: UserSettings = useMemo(() => ({
    currentRate: parseFloat(localSettings.rateOfReturn) || DEFAULT_SETTINGS.currentRate,
    swr: parseFloat(localSettings.swr) || DEFAULT_SETTINGS.swr,
    yearlyContribution: parseFloat(localSettings.yearlyContribution) || DEFAULT_SETTINGS.yearlyContribution,
    birthDate: localSettings.birthDate,
    monthlySpend: parseFloat(localSettings.monthlySpend) || DEFAULT_SETTINGS.monthlySpend,
    inflationRate: parseFloat(localSettings.inflationRate) || DEFAULT_SETTINGS.inflationRate,
    baseMonthlyBudget: parseFloat(localSettings.baseMonthlyBudget) || DEFAULT_SETTINGS.baseMonthlyBudget,
    spendingGrowthRate: parseFloat(localSettings.spendingGrowthRate) || DEFAULT_SETTINGS.spendingGrowthRate,
  }), [localSettings]);
  
  // Save settings to Convex (debounced)
  useEffect(() => {
    if (!settingsLoaded) return;
    
    const timeout = setTimeout(() => {
      saveSettings(settings);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [settings, settingsLoaded, saveSettings]);
  
  // Convert raw entries to typed entries
  const entries: NetWorthEntry[] = useMemo(() => 
    rawEntries.map(e => ({
      _id: e._id,
      userId: e.userId,
      amount: e.amount,
      timestamp: e.timestamp,
    })),
    [rawEntries]
  );
  
  const latestEntry = entries[0] || null;
  
  // Real-time net worth updates
  useEffect(() => {
    if (!latestEntry) {
      setRealTimeNetWorth({ total: 0, baseAmount: 0, appreciation: 0, contributions: 0 });
      return;
    }
    
    const update = () => {
      setRealTimeNetWorth(calculateRealTimeNetWorth(latestEntry, settings, includeContributions));
    };
    
    update();
    const interval = setInterval(update, realTimeUpdateInterval);
    return () => clearInterval(interval);
  }, [latestEntry, settings, includeContributions, realTimeUpdateInterval]);
  
  // Calculate growth rates
  const growthRates = useMemo(
    () => calculateGrowthRates(realTimeNetWorth.total, settings, includeContributions),
    [realTimeNetWorth.total, settings, includeContributions]
  );
  
  // Generate projections
  const projections = useMemo(
    () => generateProjections(
      latestEntry,
      realTimeNetWorth.total,
      realTimeNetWorth.appreciation,
      settings,
      applyInflation,
      useSpendingLevels
    ),
    [latestEntry, realTimeNetWorth.total, realTimeNetWorth.appreciation, settings, applyInflation, useSpendingLevels]
  );
  
  // Calculate level info
  const levelInfo = useMemo(
    () => calculateLevelInfo(realTimeNetWorth.total, settings, entries),
    [realTimeNetWorth.total, settings, entries]
  );
  
  // Extract key milestones from projections
  const fiRow = projections.find(p => p.isFiYear);
  const crossoverRow = projections.find(p => p.isCrossover);
  const nowRow = projections.find(p => p.year === 'Now');
  
  // Settings updater
  const updateLocalSetting = useCallback((
    key: keyof typeof localSettings,
    value: string
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  }, []);
  
  return {
    // Loading states
    isLoading: rawSettings === undefined,
    settingsLoaded,
    
    // Raw data
    settings,
    entries,
    latestEntry,
    
    // Calculated values
    currentNetWorth: realTimeNetWorth,
    growthRates,
    projections,
    levelInfo,
    
    // Key milestones
    fiYear: typeof fiRow?.year === 'number' ? fiRow.year : null,
    fiAge: fiRow?.age ?? null,
    crossoverYear: typeof crossoverRow?.year === 'number' ? crossoverRow.year : null,
    currentFiProgress: nowRow?.fiProgress ?? 0,
    currentMonthlySwr: nowRow?.monthlySwr ?? 0,
    currentAnnualSwr: nowRow?.annualSwr ?? 0,
    
    // Settings controls
    includeContributions,
    setIncludeContributions,
    applyInflation,
    setApplyInflation,
    useSpendingLevels,
    setUseSpendingLevels,
    
    // Local settings
    localSettings,
    updateLocalSetting,
    
    // Utilities
    formatCurrency,
    formatDate,
    getTimeSinceEntry,
  };
}

// Re-export types and constants for convenience
export type {
  UserSettings,
  NetWorthEntry,
  CalculatedFinancials,
  RealTimeNetWorth,
  GrowthRates,
  LevelInfo,
  ProjectionRow,
};

export { LEVEL_THRESHOLDS, DEFAULT_SETTINGS, formatCurrency, formatDate, getTimeSinceEntry };
