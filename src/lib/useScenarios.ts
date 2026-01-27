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
  ProjectionRowInflated,
  MonthlyProjectionRow,
  LevelInfo,
  generateProjections,
  generateMonthlyProjections,
  convertToInflatedProjections,
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
  InflatedValue,
  InflationDisplayMode,
  getDisplayValue,
} from './calculations';

// Re-export inflation types
export type { InflatedValue, InflationDisplayMode, ProjectionRowInflated };
export { getDisplayValue };

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
  createdAt: number;
  updatedAt: number;
}

export interface ScenarioProjection {
  scenario: Scenario;
  projections: ProjectionRow[];
  /** Projections with both nominal and real values for inflation toggle */
  projectionsInflated: ProjectionRowInflated[];
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
  /** The inflation rate used for this scenario */
  inflationRate: number;
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
        incomeGrowthRate: scenario.incomeGrowthRate,
      };
      
      // Calculate real-time net worth
      const currentNetWorth = calculateRealTimeNetWorth(latestEntry, scenarioSettings, false);
      
      // Calculate growth rates
      const growthRates = calculateGrowthRates(currentNetWorth.total, scenarioSettings, false);

      // Generate dynamic projections first if income data is available
      // These will be used to provide tax-aware savings calculations
      const hasDynamicIncome = !!(scenario.grossIncome && scenario.grossIncome > 0);
      let dynamicProjections: YearlyProjectedFinancials[] | null = null;

      if (hasDynamicIncome && scenario.grossIncome) {
        dynamicProjections = generateDynamicProjections(
          currentNetWorth.total,
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
          30 // 30 years of projections
        );
      }

      // Generate projections for this scenario
      // Pass dynamic projections to use tax-aware savings when available
      const projections = generateProjections(
        latestEntry,
        currentNetWorth.total,
        currentNetWorth.appreciation,
        scenarioSettings,
        false, // applyInflation - not needed, inflation is built into level-based spending
        true,  // useSpendingLevels - always use level-based spending
        dynamicProjections // Use tax-aware savings from dynamic projections when available
      );

      // Calculate level info
      const levelInfo = calculateLevelInfo(currentNetWorth.total, scenarioSettings, entries);

      // Find milestones
      const fiRow = projections.find(p => p.isFiYear);
      const crossoverRow = projections.find(p => p.isCrossover);
      const firstRow = projections[0]; // First projection row (current year)

      // Calculate birth year for age calculations
      const birthYear = localProfile.birthDate 
        ? new Date(localProfile.birthDate).getFullYear() 
        : null;

      // Calculate FI milestones along the journey
      const fiMilestones = calculateFiMilestones(projections, scenarioSettings, birthYear);

      // Generate monthly projections for more granular spending tracking
      // Spending updates each month based on net worth (not just yearly)
      const monthlyProjections = generateMonthlyProjections(
        currentNetWorth.total,
        scenarioSettings,
        120 // 10 years of monthly data
      );

      // Convert projections to inflated format for dual-display
      const projectionsInflated = convertToInflatedProjections(
        projections,
        scenario.inflationRate
      );

      return {
        scenario,
        projections,
        projectionsInflated,
        levelInfo,
        growthRates,
        currentNetWorth,
        fiYear: typeof fiRow?.year === 'number' ? fiRow.year : null,
        fiAge: fiRow?.age ?? null,
        crossoverYear: typeof crossoverRow?.year === 'number' ? crossoverRow.year : null,
        currentFiProgress: firstRow?.fiProgress ?? 0,
        currentMonthlySwr: firstRow?.monthlySwr ?? 0,
        dynamicProjections,
        hasDynamicIncome,
        fiMilestones,
        monthlyProjections,
        inflationRate: scenario.inflationRate,
      };
    });
  }, [latestEntry, selectedScenarios, localProfile, entries, realtimeTick]);
  
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
