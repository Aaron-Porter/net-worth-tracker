/**
 * Financial Data Machine
 *
 * Manages all financial data: scenarios, entries, profile, and computed projections.
 * Receives data from Convex via events. Only recomputes projections when inputs change.
 */

import { setup, assign } from 'xstate';
import type {
  FinancialDataContext,
  FinancialDataEvent,
  Scenario,
  StableProjectionResult,
  UserProfile,
} from './types';
import type { NetWorthEntry, UserSettings, YearlyProjectedFinancials, FilingStatus } from '../calculations';
import {
  generateProjections,
  generateMonthlyProjections,
  calculateLevelInfo,
  calculateFiMilestones,
  generateDynamicProjections,
  getEntryAllocation,
  getPerBucketRates,
  getWeightedAverageRate,
} from '../calculations';

function computeStableProjections(
  selectedScenarios: Scenario[],
  entries: NetWorthEntry[],
  profile: UserProfile,
): StableProjectionResult[] {
  const latestEntry = entries[0] || null;
  if (!latestEntry || selectedScenarios.length === 0) return [];

  return selectedScenarios.map(scenario => {
    const scenarioSettings: UserSettings = {
      currentRate: scenario.currentRate,
      swr: scenario.swr,
      yearlyContribution: scenario.yearlyContribution,
      birthDate: profile.birthDate,
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

    // Compute weighted rate from per-bucket allocation
    const entryAllocation = getEntryAllocation(latestEntry);
    const bucketRates = getPerBucketRates(scenarioSettings);
    const effectiveRate = getWeightedAverageRate(entryAllocation, bucketRates) || scenario.currentRate;
    scenarioSettings.currentRate = effectiveRate;

    const projections = generateProjections(
      latestEntry,
      entryNetWorth,
      0,
      scenarioSettings,
      false,
      true,
      dynamicProjections
    );

    const levelInfo = calculateLevelInfo(entryNetWorth, scenarioSettings, entries);

    const fiRow = projections.find(p => p.isFiYear);
    const crossoverRow = projections.find(p => p.isCrossover);
    const firstRow = projections[0];

    const birthYear = profile.birthDate
      ? new Date(profile.birthDate).getFullYear()
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
}

export const financialDataMachine = setup({
  types: {
    context: {} as FinancialDataContext,
    events: {} as FinancialDataEvent,
  },
}).createMachine({
  id: 'financialData',
  initial: 'active',
  context: {
    scenarios: [],
    selectedScenarios: [],
    entries: [],
    profile: { birthDate: '' },
    stableProjections: [],
    isLoading: true,
    profileLoaded: false,
    scenariosLoaded: false,
    entriesLoaded: false,
  },
  states: {
    active: {
      on: {
        CONVEX_SCENARIOS_UPDATE: {
          actions: assign(({ context, event }) => {
            const scenarios = event.data as Scenario[];
            const selectedScenarios = scenarios.filter(s => s.isSelected);
            const stableProjections = computeStableProjections(
              selectedScenarios,
              context.entries,
              context.profile,
            );
            return {
              scenarios,
              selectedScenarios,
              stableProjections,
              scenariosLoaded: true,
              isLoading: !context.entriesLoaded,
            };
          }),
        },
        CONVEX_ENTRIES_UPDATE: {
          actions: assign(({ context, event }) => {
            const entries = event.data.map((e: any) => ({
              _id: e._id,
              userId: e.userId,
              amount: e.amount,
              timestamp: e.timestamp,
              cash: e.cash,
              retirement: e.retirement,
              hsa: e.hsa,
              brokerage: e.brokerage,
              debts: e.debts,
            })) as NetWorthEntry[];
            const stableProjections = computeStableProjections(
              context.selectedScenarios,
              entries,
              context.profile,
            );
            return {
              entries,
              stableProjections,
              entriesLoaded: true,
              isLoading: !context.scenariosLoaded,
            };
          }),
        },
        CONVEX_PROFILE_UPDATE: {
          actions: assign(({ context, event }) => {
            if (context.profileLoaded) return {};
            const profile: UserProfile = event.data
              ? { birthDate: event.data.birthDate }
              : { birthDate: '' };
            const stableProjections = computeStableProjections(
              context.selectedScenarios,
              context.entries,
              profile,
            );
            return {
              profile,
              stableProjections,
              profileLoaded: true,
            };
          }),
        },
        UPDATE_PROFILE: {
          actions: assign(({ context, event }) => {
            const profile = { ...context.profile, ...event.data };
            const stableProjections = computeStableProjections(
              context.selectedScenarios,
              context.entries,
              profile,
            );
            return {
              profile,
              stableProjections,
              profileLoaded: true,
            };
          }),
        },
      },
    },
  },
});
