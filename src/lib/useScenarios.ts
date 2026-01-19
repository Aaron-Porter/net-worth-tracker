/**
 * React hook for managing scenarios and generating scenario projections
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  UserSettings,
  NetWorthEntry,
  ProjectionRow,
  generateProjections,
  calculateRealTimeNetWorth,
  DEFAULT_SETTINGS,
} from './calculations';

export interface Scenario {
  _id: Id<"scenarios">;
  userId: Id<"users">;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
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
  fiYear: number | null;
  fiAge: number | null;
  crossoverYear: number | null;
}

export interface UseScenariosReturn {
  // Data
  scenarios: Scenario[];
  activeScenarios: Scenario[];
  isLoading: boolean;
  
  // Mutations
  createScenario: (data: CreateScenarioData) => Promise<Id<"scenarios">>;
  updateScenario: (id: Id<"scenarios">, data: UpdateScenarioData) => Promise<void>;
  deleteScenario: (id: Id<"scenarios">) => Promise<void>;
  duplicateScenario: (id: Id<"scenarios">) => Promise<Id<"scenarios">>;
  toggleScenarioActive: (id: Id<"scenarios">) => Promise<void>;
  
  // Projections
  generateScenarioProjections: (
    latestEntry: NetWorthEntry | null,
    currentNetWorth: number,
    currentAppreciation: number,
    birthDate: string
  ) => ScenarioProjection[];
  
  // Helpers
  createScenarioFromSettings: (name: string, settings: UserSettings) => Promise<Id<"scenarios">>;
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
}

interface UpdateScenarioData {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  currentRate?: number;
  swr?: number;
  yearlyContribution?: number;
  inflationRate?: number;
  baseMonthlyBudget?: number;
  spendingGrowthRate?: number;
}

export function useScenarios(): UseScenariosReturn {
  // Convex data
  const rawScenarios = useQuery(api.scenarios.list);
  const createMutation = useMutation(api.scenarios.create);
  const updateMutation = useMutation(api.scenarios.update);
  const deleteMutation = useMutation(api.scenarios.remove);
  const duplicateMutation = useMutation(api.scenarios.duplicate);
  const toggleActiveMutation = useMutation(api.scenarios.toggleActive);
  
  const scenarios: Scenario[] = useMemo(() => {
    if (!rawScenarios) return [];
    return rawScenarios as Scenario[];
  }, [rawScenarios]);
  
  const activeScenarios = useMemo(() => {
    return scenarios.filter(s => s.isActive);
  }, [scenarios]);
  
  const createScenario = useCallback(async (data: CreateScenarioData) => {
    return await createMutation(data);
  }, [createMutation]);
  
  const updateScenario = useCallback(async (id: Id<"scenarios">, data: UpdateScenarioData) => {
    await updateMutation({ id, ...data });
  }, [updateMutation]);
  
  const deleteScenario = useCallback(async (id: Id<"scenarios">) => {
    await deleteMutation({ id });
  }, [deleteMutation]);
  
  const duplicateScenario = useCallback(async (id: Id<"scenarios">) => {
    return await duplicateMutation({ id });
  }, [duplicateMutation]);
  
  const toggleScenarioActive = useCallback(async (id: Id<"scenarios">) => {
    await toggleActiveMutation({ id });
  }, [toggleActiveMutation]);
  
  const createScenarioFromSettings = useCallback(async (name: string, settings: UserSettings) => {
    return await createMutation({
      name,
      currentRate: settings.currentRate,
      swr: settings.swr,
      yearlyContribution: settings.yearlyContribution,
      inflationRate: settings.inflationRate,
      baseMonthlyBudget: settings.baseMonthlyBudget,
      spendingGrowthRate: settings.spendingGrowthRate,
    });
  }, [createMutation]);
  
  // Generate projections for all active scenarios
  const generateScenarioProjections = useCallback((
    latestEntry: NetWorthEntry | null,
    currentNetWorth: number,
    currentAppreciation: number,
    birthDate: string
  ): ScenarioProjection[] => {
    if (!latestEntry) return [];
    
    return activeScenarios.map(scenario => {
      // Create settings object from scenario
      const scenarioSettings: UserSettings = {
        currentRate: scenario.currentRate,
        swr: scenario.swr,
        yearlyContribution: scenario.yearlyContribution,
        birthDate,
        monthlySpend: 0, // Not used in projections (uses level-based spending)
        inflationRate: scenario.inflationRate,
        baseMonthlyBudget: scenario.baseMonthlyBudget,
        spendingGrowthRate: scenario.spendingGrowthRate,
      };
      
      // Generate projections for this scenario
      const projections = generateProjections(
        latestEntry,
        currentNetWorth,
        currentAppreciation,
        scenarioSettings,
        false, // applyInflation - not needed, inflation is built into level-based spending
        true   // useSpendingLevels - always use level-based spending
      );
      
      // Find milestones
      const fiRow = projections.find(p => p.isFiYear);
      const crossoverRow = projections.find(p => p.isCrossover);
      
      return {
        scenario,
        projections,
        fiYear: typeof fiRow?.year === 'number' ? fiRow.year : null,
        fiAge: fiRow?.age ?? null,
        crossoverYear: typeof crossoverRow?.year === 'number' ? crossoverRow.year : null,
      };
    });
  }, [activeScenarios]);
  
  return {
    scenarios,
    activeScenarios,
    isLoading: rawScenarios === undefined,
    createScenario,
    updateScenario,
    deleteScenario,
    duplicateScenario,
    toggleScenarioActive,
    generateScenarioProjections,
    createScenarioFromSettings,
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
  {
    name: 'Coast FI',
    description: 'Stop contributions, let compounding work',
    currentRate: 7,
    swr: 4,
    inflationRate: 3,
    yearlyContribution: 0,
  },
] as const;
