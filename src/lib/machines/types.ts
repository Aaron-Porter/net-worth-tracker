/**
 * Shared types for XState machines
 */

import { Id } from '../../../convex/_generated/dataModel';
import type {
  UserSettings,
  NetWorthEntry,
  ProjectionRow,
  MonthlyProjectionRow,
  LevelInfo,
  GrowthRates,
  RealTimeNetWorth,
  YearlyProjectedFinancials,
  FilingStatus,
  FiMilestonesInfo,
} from '../calculations';
import { Tab, EntryBreakdown } from '../../app/lib/helpers';

// ============================================================================
// Scenario types (moved from useScenarios.ts)
// ============================================================================

export interface Scenario {
  _id: Id<"scenarios">;
  userId: Id<"users">;
  name: string;
  description?: string;
  color: string;
  isSelected: boolean;
  order?: number;
  currentRate: number;
  swr: number;
  yearlyContribution: number;
  inflationRate: number;
  baseMonthlyBudget: number;
  spendingGrowthRate: number;
  startDate?: number;
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
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  birthDate: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  birthDate: '',
};

// ============================================================================
// Stable projection result (computed once when data changes, not on tick)
// ============================================================================

export interface StableProjectionResult {
  scenario: Scenario;
  projections: ProjectionRow[];
  levelInfo: LevelInfo;
  fiYear: number | null;
  fiAge: number | null;
  crossoverYear: number | null;
  currentMonthlySwr: number;
  dynamicProjections: YearlyProjectedFinancials[] | null;
  hasDynamicIncome: boolean;
  fiMilestones: FiMilestonesInfo;
  monthlyProjections: MonthlyProjectionRow[];
  scenarioSettings: UserSettings;
  effectiveRate: number;
}

// ============================================================================
// ScenarioProjection (stable + real-time, assembled by components)
// ============================================================================

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
  dynamicProjections: YearlyProjectedFinancials[] | null;
  hasDynamicIncome: boolean;
  fiMilestones: FiMilestonesInfo;
  monthlyProjections: MonthlyProjectionRow[];
  effectiveRate: number;
}

// ============================================================================
// Financial Data Machine types
// ============================================================================

export interface FinancialDataContext {
  scenarios: Scenario[];
  selectedScenarios: Scenario[];
  entries: NetWorthEntry[];
  profile: UserProfile;
  stableProjections: StableProjectionResult[];
  isLoading: boolean;
  profileLoaded: boolean;
  // Track which Convex queries have resolved
  scenariosLoaded: boolean;
  entriesLoaded: boolean;
}

export type FinancialDataEvent =
  | { type: 'CONVEX_SCENARIOS_UPDATE'; data: Scenario[] }
  | { type: 'CONVEX_ENTRIES_UPDATE'; data: NetWorthEntry[] }
  | { type: 'CONVEX_PROFILE_UPDATE'; data: { birthDate: string } | null }
  | { type: 'UPDATE_PROFILE'; data: Partial<UserProfile> };

// ============================================================================
// UI Machine types
// ============================================================================

export interface UIContext {
  activeTab: Tab;
  projectionsView: 'table' | 'chart';
  entryBreakdown: EntryBreakdown;
}

export type UIEvent =
  | { type: 'SET_TAB'; tab: Tab }
  | { type: 'SET_PROJECTIONS_VIEW'; view: 'table' | 'chart' }
  | { type: 'UPDATE_ENTRY_BREAKDOWN'; field: keyof EntryBreakdown; value: string }
  | { type: 'SET_ENTRY_BREAKDOWN'; breakdown: EntryBreakdown }
  | { type: 'CLEAR_ENTRY_BREAKDOWN' };

// ============================================================================
// Scenario templates (moved from useScenarios.ts)
// ============================================================================

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
