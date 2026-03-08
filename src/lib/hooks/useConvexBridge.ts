/**
 * Convex Bridge Hook
 *
 * Bridges Convex useQuery reactive data into XState machine events.
 * Convex hooks must live in React; this hook fires events to the
 * financial data machine when query results change.
 */

import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { ActorRefFrom } from 'xstate';
import type { financialDataMachine } from '../machines/financialDataMachine';

type FinancialActor = ActorRefFrom<typeof financialDataMachine>;

export function useConvexBridge(financialActor: FinancialActor) {
  const rawScenarios = useQuery(api.scenarios.list);
  const rawProfile = useQuery(api.settings.getProfile);
  const rawEntries = useQuery(api.entries.list);

  useEffect(() => {
    if (rawScenarios !== undefined) {
      financialActor.send({ type: 'CONVEX_SCENARIOS_UPDATE', data: rawScenarios as any });
    }
  }, [rawScenarios, financialActor]);

  useEffect(() => {
    if (rawEntries !== undefined) {
      financialActor.send({ type: 'CONVEX_ENTRIES_UPDATE', data: rawEntries ?? [] });
    }
  }, [rawEntries, financialActor]);

  useEffect(() => {
    if (rawProfile !== undefined) {
      financialActor.send({ type: 'CONVEX_PROFILE_UPDATE', data: rawProfile });
    }
  }, [rawProfile, financialActor]);
}
