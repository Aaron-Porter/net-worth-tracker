/**
 * React hook for managing scenarios - the primary entity for financial projections
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  UserSettings,
  NetWorthEntry,
  ProjectionRow,
  LevelInfo,
  generateProjections,
  calculateRealTimeNetWorth,
  calculateLevelInfo,
  calculateGrowthRates,
  GrowthRates,
  RealTimeNetWorth,
  DEFAULT_SETTINGS,
} from './calculations';

export interface Scenario {
  _id: Id<"scenarios">;
  userId: Id<"users">;
  name: string;
  description?: string;
  color: string;
  isSelected: boolean;
  currentRate: number;
  swr: number;
  yearlyContribution: number;
  inflationRate: number;
  baseMonthlyBudget: number;
  spendingGrowthRate: number;
  createdAt: number;
  updatedAt: number;
}

export interface ScenarioProjection {
  scenario: Scenario;
  projections: ProjectionRow[];
  levelInfo: LevelInfo;
  growthRates: GrowthRates;
  currentNetWorth: RealTimeNetWorth;
  fiYear: number | null;
  fiAge: number | null;
  crossoverYear: number | null;
  currentFiProgress: number;
  currentMonthlySwr: number;
}

export interface UserProfile {
  birthDate: string;
}

export interface UseScenariosReturn {
  // Loading states
  isLoading: boolean;
  hasScenarios: boolean;
  
  // Data
  scenarios: Scenario[];
  selectedScenarios: Scenario[];
  
  // User profile (personal info)
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => void;
  
  // Mutations
  createScenario: (data: CreateScenarioData) => Promise<Id<"scenarios">>;
  createDefaultScenario: () => Promise<Id<"scenarios">>;
  updateScenario: (id: Id<"scenarios">, data: UpdateScenarioData) => Promise<void>;
  deleteScenario: (id: Id<"scenarios">) => Promise<void>;
  duplicateScenario: (id: Id<"scenarios">) => Promise<Id<"scenarios">>;
  toggleSelected: (id: Id<"scenarios">) => Promise<void>;
  selectOnly: (id: Id<"scenarios">) => Promise<void>;
  setSelected: (ids: Id<"scenarios">[]) => Promise<void>;
  
  // Projections - generated for all selected scenarios
  scenarioProjections: ScenarioProjection[];
  
  // Net worth entries
  entries: NetWorthEntry[];
  latestEntry: NetWorthEntry | null;
}

interface CreateScenarioData {
  name: string;
  description?: string;
  color?: string;
  currentRate: number;
  swr: number;
  yearlyContribution: number;
  inflationRate: number;
  baseMonthlyBudget: number;
  spendingGrowthRate: number;
  isSelected?: boolean;
}

interface UpdateScenarioData {
  name?: string;
  description?: string;
  color?: string;
  isSelected?: boolean;
  currentRate?: number;
  swr?: number;
  yearlyContribution?: number;
  inflationRate?: number;
  baseMonthlyBudget?: number;
  spendingGrowthRate?: number;
}

const DEFAULT_PROFILE: UserProfile = {
  birthDate: '',
};

export function useScenarios(): UseScenariosReturn {
  // Convex data
  const rawScenarios = useQuery(api.scenarios.list);
  const rawProfile = useQuery(api.settings.getProfile);
  const rawEntries = useQuery(api.entries.list) ?? [];
  
  // Mutations
  const createMutation = useMutation(api.scenarios.create);
  const createDefaultMutation = useMutation(api.scenarios.createDefault);
  const updateMutation = useMutation(api.scenarios.update);
  const deleteMutation = useMutation(api.scenarios.remove);
  const duplicateMutation = useMutation(api.scenarios.duplicate);
  const toggleSelectedMutation = useMutation(api.scenarios.toggleSelected);
  const selectOnlyMutation = useMutation(api.scenarios.selectOnly);
  const setSelectedMutation = useMutation(api.scenarios.setSelected);
  const saveProfileMutation = useMutation(api.settings.saveProfile);
  
  // Local profile state for controlled inputs
  const [localProfile, setLocalProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  // Load profile from Convex
  useEffect(() => {
    if (rawProfile === undefined || profileLoaded) return;
    
    if (rawProfile !== null) {
      setLocalProfile({
        birthDate: rawProfile.birthDate,
      });
    }
    setProfileLoaded(true);
  }, [rawProfile, profileLoaded]);
  
  // Save profile to Convex (debounced)
  useEffect(() => {
    if (!profileLoaded) return;
    
    const timeout = setTimeout(() => {
      saveProfileMutation(localProfile);
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [localProfile, profileLoaded, saveProfileMutation]);
  
  const updateProfile = useCallback((data: Partial<UserProfile>) => {
    setLocalProfile(prev => ({ ...prev, ...data }));
  }, []);
  
  const scenarios: Scenario[] = useMemo(() => {
    if (!rawScenarios) return [];
    return rawScenarios as Scenario[];
  }, [rawScenarios]);
  
  const selectedScenarios = useMemo(() => {
    return scenarios.filter(s => s.isSelected);
  }, [scenarios]);
  
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
  
  // Generate projections for all selected scenarios
  const scenarioProjections = useMemo((): ScenarioProjection[] => {
    if (!latestEntry || selectedScenarios.length === 0) return [];
    
    return selectedScenarios.map(scenario => {
      // Create settings object from scenario
      // monthlySpend is set to 0 as we use level-based spending from baseMonthlyBudget + spendingGrowthRate
      const scenarioSettings: UserSettings = {
        currentRate: scenario.currentRate,
        swr: scenario.swr,
        yearlyContribution: scenario.yearlyContribution,
        birthDate: localProfile.birthDate,
        monthlySpend: 0, // Not used - spending comes from levels system
        inflationRate: scenario.inflationRate,
        baseMonthlyBudget: scenario.baseMonthlyBudget,
        spendingGrowthRate: scenario.spendingGrowthRate,
      };
      
      // Calculate real-time net worth
      const currentNetWorth = calculateRealTimeNetWorth(latestEntry, scenarioSettings, false);
      
      // Calculate growth rates
      const growthRates = calculateGrowthRates(currentNetWorth.total, scenarioSettings, false);
      
      // Generate projections for this scenario
      const projections = generateProjections(
        latestEntry,
        currentNetWorth.total,
        currentNetWorth.appreciation,
        scenarioSettings,
        false, // applyInflation - not needed, inflation is built into level-based spending
        true   // useSpendingLevels - always use level-based spending
      );
      
      // Calculate level info
      const levelInfo = calculateLevelInfo(currentNetWorth.total, scenarioSettings, entries);
      
      // Find milestones
      const fiRow = projections.find(p => p.isFiYear);
      const crossoverRow = projections.find(p => p.isCrossover);
      const nowRow = projections.find(p => p.year === 'Now');
      
      return {
        scenario,
        projections,
        levelInfo,
        growthRates,
        currentNetWorth,
        fiYear: typeof fiRow?.year === 'number' ? fiRow.year : null,
        fiAge: fiRow?.age ?? null,
        crossoverYear: typeof crossoverRow?.year === 'number' ? crossoverRow.year : null,
        currentFiProgress: nowRow?.fiProgress ?? 0,
        currentMonthlySwr: nowRow?.monthlySwr ?? 0,
      };
    });
  }, [latestEntry, selectedScenarios, localProfile, entries]);
  
  const createScenario = useCallback(async (data: CreateScenarioData) => {
    return await createMutation(data);
  }, [createMutation]);
  
  const createDefaultScenario = useCallback(async () => {
    return await createDefaultMutation();
  }, [createDefaultMutation]);
  
  const updateScenario = useCallback(async (id: Id<"scenarios">, data: UpdateScenarioData) => {
    await updateMutation({ id, ...data });
  }, [updateMutation]);
  
  const deleteScenario = useCallback(async (id: Id<"scenarios">) => {
    await deleteMutation({ id });
  }, [deleteMutation]);
  
  const duplicateScenario = useCallback(async (id: Id<"scenarios">) => {
    return await duplicateMutation({ id });
  }, [duplicateMutation]);
  
  const toggleSelected = useCallback(async (id: Id<"scenarios">) => {
    await toggleSelectedMutation({ id });
  }, [toggleSelectedMutation]);
  
  const selectOnly = useCallback(async (id: Id<"scenarios">) => {
    await selectOnlyMutation({ id });
  }, [selectOnlyMutation]);
  
  const setSelected = useCallback(async (ids: Id<"scenarios">[]) => {
    await setSelectedMutation({ ids });
  }, [setSelectedMutation]);
  
  return {
    isLoading: rawScenarios === undefined,
    hasScenarios: scenarios.length > 0,
    scenarios,
    selectedScenarios,
    profile: localProfile,
    updateProfile,
    createScenario,
    createDefaultScenario,
    updateScenario,
    deleteScenario,
    duplicateScenario,
    toggleSelected,
    selectOnly,
    setSelected,
    scenarioProjections,
    entries,
    latestEntry,
  };
}

// Predefined scenario templates
export const SCENARIO_TEMPLATES = [
  {
    name: 'Conservative',
    description: 'Lower returns, higher safety margin',
    currentRate: 5,
    swr: 3.5,
    inflationRate: 3,
    baseMonthlyBudget: 3000,
    spendingGrowthRate: 1.5,
    yearlyContribution: 0,
  },
  {
    name: 'Moderate',
    description: 'Balanced approach with typical assumptions',
    currentRate: 7,
    swr: 4,
    inflationRate: 3,
    baseMonthlyBudget: 3000,
    spendingGrowthRate: 2,
    yearlyContribution: 0,
  },
  {
    name: 'Aggressive',
    description: 'Higher returns, higher withdrawal rate',
    currentRate: 9,
    swr: 4.5,
    inflationRate: 2.5,
    baseMonthlyBudget: 3000,
    spendingGrowthRate: 2.5,
    yearlyContribution: 0,
  },
  {
    name: 'High Inflation',
    description: 'Accounts for elevated inflation environment',
    currentRate: 7,
    swr: 3.5,
    inflationRate: 5,
    baseMonthlyBudget: 3000,
    spendingGrowthRate: 2,
    yearlyContribution: 0,
  },
  {
    name: 'High Saver',
    description: 'Aggressive saving with annual contributions',
    currentRate: 7,
    swr: 4,
    inflationRate: 3,
    baseMonthlyBudget: 2500,
    spendingGrowthRate: 1.5,
    yearlyContribution: 50000,
  },
] as const;
