/**
 * Hook providing Convex mutation actions for scenarios and profile.
 *
 * These are thin wrappers around useMutation that can be used directly
 * in any component. Convex's reactivity automatically updates the queries
 * which flow through the bridge into the XState machine.
 */

'use client'

import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import type { Scenario, UserProfile } from '../machines/types';
import { useFinancialActor, useFinancialSelector } from './useFinancialActor';

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

type UpdateScenarioData = Partial<CreateScenarioData>;

export interface ScenarioActions {
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
  updateProfile: (data: Partial<UserProfile>) => void;
}

export function useScenarioActions(): ScenarioActions {
  const financialActor = useFinancialActor();

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

  // Profile save debounce
  const [pendingProfile, setPendingProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!pendingProfile) return;
    const timeout = setTimeout(() => {
      saveProfileMutation(pendingProfile);
      setPendingProfile(null);
    }, 500);
    return () => clearTimeout(timeout);
  }, [pendingProfile, saveProfileMutation]);

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

  const updateProfile = useCallback((data: Partial<UserProfile>) => {
    // Optimistically update the machine
    financialActor.send({ type: 'UPDATE_PROFILE', data });
    // Debounced save to Convex
    setPendingProfile(prev => {
      const current = prev || { birthDate: '' };
      return { ...current, ...data };
    });
  }, [financialActor]);

  return {
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
    updateProfile,
  };
}
