/**
 * UI Machine
 *
 * Manages UI-only state: active tab, projections view mode, entry form breakdown.
 * Isolates UI state changes from data state changes.
 */

import { setup, assign } from 'xstate';
import type { UIContext, UIEvent } from './types';

export const uiMachine = setup({
  types: {
    context: {} as UIContext,
    events: {} as UIEvent,
  },
}).createMachine({
  id: 'ui',
  initial: 'active',
  context: {
    activeTab: 'dashboard',
    projectionsView: 'table',
    entryBreakdown: {
      cash: '',
      retirement: '',
      hsa: '',
      brokerage: '',
      debts: '',
    },
  },
  states: {
    active: {
      on: {
        SET_TAB: {
          actions: assign({ activeTab: ({ event }) => event.tab }),
        },
        SET_PROJECTIONS_VIEW: {
          actions: assign({ projectionsView: ({ event }) => event.view }),
        },
        UPDATE_ENTRY_BREAKDOWN: {
          actions: assign({
            entryBreakdown: ({ context, event }) => ({
              ...context.entryBreakdown,
              [event.field]: event.value,
            }),
          }),
        },
        SET_ENTRY_BREAKDOWN: {
          actions: assign({ entryBreakdown: ({ event }) => event.breakdown }),
        },
        CLEAR_ENTRY_BREAKDOWN: {
          actions: assign({
            entryBreakdown: () => ({
              cash: '',
              retirement: '',
              hsa: '',
              brokerage: '',
              debts: '',
            }),
          }),
        },
      },
    },
  },
});
