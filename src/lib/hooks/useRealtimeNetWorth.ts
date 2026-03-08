/**
 * Self-contained real-time ticker hook for the dashboard.
 *
 * This hook runs a 50ms interval internally to compute real-time net worth,
 * growth rates, and FI progress. It is ONLY used inside DashboardTab,
 * isolating the tick-driven re-renders from the rest of the app.
 */

import { useState, useEffect, useMemo } from 'react';
import type { UserSettings, NetWorthEntry, GrowthRates, RealTimeNetWorth } from '../calculations';
import {
  calculateRealTimeNetWorth,
  calculateGrowthRates,
  calculateLevelBasedSpending,
  calculateFiTarget,
} from '../calculations';

const EMPTY_NW: RealTimeNetWorth = {
  total: 0,
  appreciation: 0,
  contributions: 0,
  baseAmount: 0,
};

const EMPTY_RATES: GrowthRates = {
  perSecond: 0,
  perMinute: 0,
  perHour: 0,
  perDay: 0,
  perYear: 0,
  yearlyAppreciation: 0,
  yearlyContributions: 0,
};

export interface RealtimeData {
  currentNetWorth: RealTimeNetWorth;
  growthRates: GrowthRates;
  currentFiProgress: number;
}

export function useRealtimeNetWorth(
  latestEntry: NetWorthEntry | null,
  settings: UserSettings | null,
  includeSavings: boolean = false,
  isActive: boolean = true,
  intervalMs: number = 50,
): RealtimeData {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!latestEntry || !settings || !isActive) return;
    const id = setInterval(() => setTick(t => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [latestEntry, settings, isActive, intervalMs]);

  return useMemo(() => {
    if (!latestEntry || !settings) {
      return { currentNetWorth: EMPTY_NW, growthRates: EMPTY_RATES, currentFiProgress: 0 };
    }
    const currentNetWorth = calculateRealTimeNetWorth(latestEntry, settings, includeSavings);
    const growthRates = calculateGrowthRates(currentNetWorth.total, settings, includeSavings);
    const currentSpend = calculateLevelBasedSpending(currentNetWorth.total, settings, 0);
    const fiTarget = calculateFiTarget(currentSpend, settings.swr);
    const currentFiProgress = fiTarget > 0 ? (currentNetWorth.total / fiTarget) * 100 : 0;
    return { currentNetWorth, growthRates, currentFiProgress };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, latestEntry, settings, includeSavings]);
}
