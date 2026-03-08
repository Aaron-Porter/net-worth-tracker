/**
 * React Context provider for XState actors.
 *
 * Provides both the financial data machine and UI machine to the component tree.
 * Components use useSelector for granular subscriptions — only re-render when
 * their selected slice of state changes.
 */

'use client'

import React, { createContext, useContext } from 'react';
import { useActorRef, useSelector } from '@xstate/react';
import type { ActorRefFrom, SnapshotFrom } from 'xstate';
import { financialDataMachine } from '../machines/financialDataMachine';
import { uiMachine } from '../machines/uiMachine';

// ============================================================================
// Actor types
// ============================================================================

export type FinancialActor = ActorRefFrom<typeof financialDataMachine>;
export type UIActor = ActorRefFrom<typeof uiMachine>;

// ============================================================================
// Contexts
// ============================================================================

const FinancialActorContext = createContext<FinancialActor | null>(null);
const UIActorContext = createContext<UIActor | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function ActorProvider({ children }: { children: React.ReactNode }) {
  const financialActor = useActorRef(financialDataMachine);
  const uiActor = useActorRef(uiMachine);

  return React.createElement(
    FinancialActorContext.Provider,
    { value: financialActor },
    React.createElement(
      UIActorContext.Provider,
      { value: uiActor },
      children
    )
  );
}

// ============================================================================
// Hooks
// ============================================================================

export function useFinancialActor(): FinancialActor {
  const actor = useContext(FinancialActorContext);
  if (!actor) throw new Error('useFinancialActor must be used within ActorProvider');
  return actor;
}

export function useUIActor(): UIActor {
  const actor = useContext(UIActorContext);
  if (!actor) throw new Error('useUIActor must be used within ActorProvider');
  return actor;
}

/**
 * Select a slice of financial data machine state. Component only re-renders
 * when the selected value changes (referential equality by default).
 */
export function useFinancialSelector<T>(
  selector: (snapshot: SnapshotFrom<typeof financialDataMachine>) => T,
  compare?: (a: T, b: T) => boolean,
): T {
  const actor = useFinancialActor();
  return useSelector(actor, selector, compare);
}

/**
 * Select a slice of UI machine state.
 */
export function useUISelector<T>(
  selector: (snapshot: SnapshotFrom<typeof uiMachine>) => T,
  compare?: (a: T, b: T) => boolean,
): T {
  const actor = useUIActor();
  return useSelector(actor, selector, compare);
}
