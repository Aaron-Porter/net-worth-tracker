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
  MonthlyProjectionRow,
  LevelInfo,
  generateProjections,
  generateMonthlyProjections,
  calculateRealTimeNetWorth,
  calculateLevelInfo,
  calculateGrowthRates,
  GrowthRates,
  RealTimeNetWorth,
  DEFAULT_SETTINGS,
  generateDynamicProjections,
  YearlyProjectedFinancials,
  FilingStatus,
  FiMilestonesInfo,
  FiMilestone,
  FiMilestoneDefinition,
  FI_MILESTONE_DEFINITIONS,
  calculateFiMilestones,
  calculateFiTarget,
  calculateLevelBasedSpending,
  getEntryAllocation,
  getPerBucketRates,
  getWeightedAverageRate,
} from './calculations';

// Re-export FI milestone types for convenience
export type { FiMilestonesInfo, FiMilestone, FiMilestoneDefinition };
export { FI_MILESTONE_DEFINITIONS };

export interface Scenario {
  _id: Id<"scenarios">;
  userId: Id<"users">;
  name: string;
  description?: string;
  color: string;
  isSelected: boolean;
  order?: number; // Display order (0-based)
  currentRate: number;
  swr: number;
  yearlyContribution: number;
  inflationRate: number;
  baseMonthlyBudget: number;
  spendingGrowthRate: number;
  startDate?: number; // When this scenario started (for inflation calculations)
  // Income & tax fields
  grossIncome?: number;
  incomeGrowthRate?: number;
  filingStatus?: string;
  stateCode?: string;
  preTax401k?: number;
  preTaxIRA?: number;
  preTaxHSA?: number;
  preTaxOther?: number;
  effectiveTaxRate?: number;
  // Per-bucket growth rate overrides
  cashRate?: number;
  retirementRate?: number;
  hsaRate?: number;
  brokerageRate?: number;
  debtRate?: number;
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
  // Dynamic projections (when income data is available)
  dynamicProjections: YearlyProjectedFinancials[] | null;
  hasDynamicIncome: boolean;
  // FI Milestones along the journey
  fiMilestones: FiMilestonesInfo;
  // Monthly projections (spending updates each month based on net worth)
  monthlyProjections: MonthlyProjectionRow[];
  // Weighted average rate across asset buckets (equals currentRate if no breakdown)
  effectiveRate: number;
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
  reorderScenarios: (orderedIds: Id<"scenarios">[]) => Promise<void>;
  moveScenario: (id: Id<"scenarios">, direction: "up" | "down") => Promise<void>;
  
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
  startDate?: number;
  isSelected?: boolean;
  // Income & tax fields
  grossIncome?: number;
  incomeGrowthRate?: number;
  filingStatus?: string;
  stateCode?: string;
  preTax401k?: number;
  preTaxIRA?: number;
  preTaxHSA?: number;
  preTaxOther?: number;
  effectiveTaxRate?: number;
  cashRate?: number;
  retirementRate?: number;
  hsaRate?: number;
  brokerageRate?: number;
  debtRate?: number;
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
  startDate?: number;
  // Income & tax fields
  grossIncome?: number;
  incomeGrowthRate?: number;
  filingStatus?: string;
  stateCode?: string;
  preTax401k?: number;
  preTaxIRA?: number;
  preTaxHSA?: number;
  preTaxOther?: number;
  effectiveTaxRate?: number;
  cashRate?: number;
  retirementRate?: number;
  hsaRate?: number;
  brokerageRate?: number;
  debtRate?: number;
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
  const reorderMutation = useMutation(api.scenarios.reorder);
  const moveScenarioMutation = useMutation(api.scenarios.moveScenario);
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

  // Real-time update mechanism - triggers recalculation every 50ms
  const [realtimeTick, setRealtimeTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeTick(prev => prev + 1);
    }, 50); // Update every 50ms for smooth real-time display

    return () => clearInterval(interval);
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
      cash: e.cash,
      retirement: e.retirement,
      hsa: e.hsa,
      brokerage: e.brokerage,
      debts: e.debts,
    })),
    [rawEntries]
  );
  
  const latestEntry = entries[0] || null;
  
  // Stable projections — only recompute when entry data or scenario settings change,
  // NOT on every real-time tick. Uses the entry's raw amount as starting NW so projections
  // don't double-count appreciation that the real-time counter already shows.
  const stableProjections = useMemo(() => {
    if (!latestEntry || selectedScenarios.length === 0) return [];

    return selectedScenarios.map(scenario => {
      const scenarioSettings: UserSettings = {
        currentRate: scenario.currentRate,
        swr: scenario.swr,
        yearlyContribution: scenario.yearlyContribution,
        birthDate: localProfile.birthDate,
        monthlySpend: 0,
        inflationRate: scenario.inflationRate,
        baseMonthlyBudget: scenario.baseMonthlyBudget,
        spendingGrowthRate: scenario.spendingGrowthRate,
        incomeGrowthRate: scenario.incomeGrowthRate,
        scenarioStartDate: scenario.startDate ?? scenario.createdAt,
        cashRate: scenario.cashRate,
        retirementRate: scenario.retirementRate,
        hsaRate: scenario.hsaRate,
        brokerageRate: scenario.brokerageRate,
        debtRate: scenario.debtRate,
        preTax401k: scenario.preTax401k,
        preTaxIRA: scenario.preTaxIRA,
        preTaxHSA: scenario.preTaxHSA,
      };

      // Use entry amount as the stable starting point for projections
      const entryNetWorth = latestEntry.amount;

      const hasDynamicIncome = !!(scenario.grossIncome && scenario.grossIncome > 0);
      let dynamicProjections: YearlyProjectedFinancials[] | null = null;

      if (hasDynamicIncome && scenario.grossIncome) {
        dynamicProjections = generateDynamicProjections(
          entryNetWorth,
          {
            grossIncome: scenario.grossIncome,
            incomeGrowthRate: scenario.incomeGrowthRate || 0,
            filingStatus: (scenario.filingStatus as FilingStatus) || 'single',
            stateCode: scenario.stateCode || null,
            preTaxContributions: {
              traditional401k: scenario.preTax401k || 0,
              traditionalIRA: scenario.preTaxIRA || 0,
              hsa: scenario.preTaxHSA || 0,
              other: scenario.preTaxOther || 0,
            },
          },
          {
            baseMonthlyBudget: scenario.baseMonthlyBudget,
            spendingGrowthRate: scenario.spendingGrowthRate,
            inflationRate: scenario.inflationRate,
          },
          scenario.currentRate,
          30
        );
      }

      // Compute weighted rate from per-bucket allocation and override currentRate
      const entryAllocation = getEntryAllocation(latestEntry);
      const bucketRates = getPerBucketRates(scenarioSettings);
      const effectiveRate = getWeightedAverageRate(entryAllocation, bucketRates) || scenario.currentRate;
      scenarioSettings.currentRate = effectiveRate;

      const projections = generateProjections(
        latestEntry,
        entryNetWorth,
        0, // No appreciation baked in — projections model full-year growth from entry amount
        scenarioSettings,
        false,
        true,
        dynamicProjections
      );

      const levelInfo = calculateLevelInfo(entryNetWorth, scenarioSettings, entries);

      const fiRow = projections.find(p => p.isFiYear);
      const crossoverRow = projections.find(p => p.isCrossover);
      const firstRow = projections[0];

      const birthYear = localProfile.birthDate
        ? new Date(localProfile.birthDate).getFullYear()
        : null;

      const fiMilestones = calculateFiMilestones(projections, scenarioSettings, birthYear, entryNetWorth);

      const monthlyProjections = generateMonthlyProjections(
        entryNetWorth,
        scenarioSettings,
        120
      );

      return {
        scenario,
        projections,
        levelInfo,
        fiYear: typeof fiRow?.year === 'number' ? fiRow.year : null,
        fiAge: fiRow?.age ?? null,
        crossoverYear: typeof crossoverRow?.year === 'number' ? crossoverRow.year : null,
        currentMonthlySwr: firstRow?.monthlySwr ?? 0,
        dynamicProjections,
        hasDynamicIncome,
        fiMilestones,
        monthlyProjections,
        scenarioSettings,
        effectiveRate,
      };
    });
  }, [latestEntry, selectedScenarios, localProfile, entries]);

  // Real-time layer — overlays currentNetWorth + growthRates + currentFiProgress
  // on top of stable projections, ticking every 50ms for the dashboard counter.
  const scenarioProjections = useMemo((): ScenarioProjection[] => {
    return stableProjections.map(sp => {
      const currentNetWorth = calculateRealTimeNetWorth(latestEntry!, sp.scenarioSettings, false);
      const growthRates = calculateGrowthRates(currentNetWorth.total, sp.scenarioSettings, false);
      const currentSpendForFi = calculateLevelBasedSpending(currentNetWorth.total, sp.scenarioSettings, 0);
      const currentFiTarget = calculateFiTarget(currentSpendForFi, sp.scenarioSettings.swr);
      const currentFiProgress = currentFiTarget > 0 ? (currentNetWorth.total / currentFiTarget) * 100 : 0;

      return {
        scenario: sp.scenario,
        projections: sp.projections,
        levelInfo: sp.levelInfo,
        growthRates,
        currentNetWorth,
        fiYear: sp.fiYear,
        fiAge: sp.fiAge,
        crossoverYear: sp.crossoverYear,
        currentFiProgress,
        currentMonthlySwr: sp.currentMonthlySwr,
        dynamicProjections: sp.dynamicProjections,
        hasDynamicIncome: sp.hasDynamicIncome,
        fiMilestones: sp.fiMilestones,
        monthlyProjections: sp.monthlyProjections,
        effectiveRate: sp.effectiveRate,
      };
    });
  }, [stableProjections, realtimeTick, latestEntry]);
  
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
  
  const reorderScenarios = useCallback(async (orderedIds: Id<"scenarios">[]) => {
    await reorderMutation({ orderedIds });
  }, [reorderMutation]);
  
  const moveScenario = useCallback(async (id: Id<"scenarios">, direction: "up" | "down") => {
    await moveScenarioMutation({ id, direction });
  }, [moveScenarioMutation]);
  
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
    reorderScenarios,
    moveScenario,
    scenarioProjections,
    entries,
    latestEntry,
  };
}

// Predefined scenario templates (investment assumptions only - income is entered in wizard)
export const SCENARIO_TEMPLATES = [
  {
    name: 'Conservative',
    description: 'Lower returns, higher safety margin',
    currentRate: 5,
    swr: 3.5,
    inflationRate: 3,
  },
  {
    name: 'Moderate',
    description: 'Balanced approach with typical assumptions',
    currentRate: 7,
    swr: 4,
    inflationRate: 3,
  },
  {
    name: 'Aggressive',
    description: 'Higher returns, higher withdrawal rate',
    currentRate: 9,
    swr: 4.5,
    inflationRate: 2.5,
  },
  {
    name: 'High Inflation',
    description: 'Accounts for elevated inflation environment',
    currentRate: 7,
    swr: 3.5,
    inflationRate: 5,
  },
] as const;
