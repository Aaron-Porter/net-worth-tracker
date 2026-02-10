'use client'

import React, { useMemo } from 'react'
import {
  FiMilestone,
  FiMilestonesInfo,
  formatCurrency,
} from '../../lib/calculations'
import { SimpleTrackedValue } from './TrackedValue'
import { ScenarioProjection } from '../../lib/useScenarios'

interface MilestoneProgressCardProps {
  primaryProjection: ScenarioProjection;
}

const MONTH_ABBREV = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMilestoneTypeLabel(type: string): string {
  switch (type) {
    case 'percentage': return 'FI Progress';
    case 'lifestyle': return 'Lifestyle';
    case 'runway': return 'Runway';
    case 'coast': return 'Coast FI';
    case 'net_worth': return 'Net Worth';
    case 'retirement_income': return 'Retirement';
    case 'special': return 'Special';
    default: return '';
  }
}

function getMilestoneTypeColor(type: string): string {
  switch (type) {
    case 'percentage': return '#10b981';
    case 'lifestyle': return '#14b8a6';
    case 'runway': return '#60a5fa';
    case 'coast': return '#a78bfa';
    case 'net_worth': return '#f59e0b';
    case 'retirement_income': return '#ec4899';
    case 'special': return '#8b5cf6';
    default: return '#94a3b8';
  }
}

/**
 * Find the absolute next milestone across all types (the soonest one to be achieved)
 */
function findNextMilestoneAcrossTypes(milestones: FiMilestone[]): FiMilestone | null {
  const upcoming = milestones.filter(m => !m.isAchieved && m.year !== null);
  if (upcoming.length === 0) return null;

  // Sort by year (and month within year) to find the soonest
  upcoming.sort((a, b) => {
    const yearDiff = (a.year ?? Infinity) - (b.year ?? Infinity);
    if (yearDiff !== 0) return yearDiff;
    return (a.month ?? 7) - (b.month ?? 7);
  });

  return upcoming[0];
}

/**
 * Calculate the progress within the current milestone segment.
 * For the next milestone, figure out what % of the way we are from the previously
 * achieved milestone of the same type to the next one.
 */
function calculateSegmentProgress(
  nextMilestone: FiMilestone,
  milestones: FiMilestone[],
  currentNetWorth: number,
  currentFiProgress: number,
  currentMonthlySpend: number,
  swr: number,
): number {
  const sameType = milestones.filter(m => m.type === nextMilestone.type);
  const idx = sameType.findIndex(m => m.id === nextMilestone.id);
  const prevMilestone = idx > 0 ? sameType[idx - 1] : null;

  if (nextMilestone.type === 'percentage') {
    const prevTarget = prevMilestone?.targetValue ?? 0;
    const range = nextMilestone.targetValue - prevTarget;
    if (range <= 0) return 0;
    return Math.max(0, Math.min(100, ((currentFiProgress - prevTarget) / range) * 100));
  }

  if (nextMilestone.type === 'net_worth') {
    const prevTarget = prevMilestone?.isAchieved ? (prevMilestone.targetValue) : 0;
    const range = nextMilestone.targetValue - prevTarget;
    if (range <= 0) return 0;
    return Math.max(0, Math.min(100, ((currentNetWorth - prevTarget) / range) * 100));
  }

  if (nextMilestone.type === 'runway') {
    const annualExpenses = currentMonthlySpend * 12;
    const currentRunway = annualExpenses > 0 ? currentNetWorth / annualExpenses : 0;
    const prevTarget = prevMilestone?.targetValue ?? 0;
    const range = nextMilestone.targetValue - prevTarget;
    if (range <= 0) return 0;
    return Math.max(0, Math.min(100, ((currentRunway - prevTarget) / range) * 100));
  }

  if (nextMilestone.type === 'lifestyle') {
    const targetFi = (currentMonthlySpend * nextMilestone.targetValue * 12) / (swr / 100);
    if (targetFi <= 0) return 0;
    return Math.max(0, Math.min(100, (currentNetWorth / targetFi) * 100));
  }

  // For other types, use a simple net worth approach
  if (nextMilestone.netWorthAtMilestone && nextMilestone.netWorthAtMilestone > 0) {
    return Math.max(0, Math.min(100, (currentNetWorth / nextMilestone.netWorthAtMilestone) * 100));
  }

  return 0;
}

/**
 * Estimate projected date from milestone data
 */
function formatProjectedDate(milestone: FiMilestone): string {
  if (!milestone.year) return 'Not yet projected';
  const monthStr = milestone.month ? `${MONTH_ABBREV[milestone.month - 1]} ` : '';
  return `${monthStr}${milestone.year}`;
}

/**
 * Calculate amount needed to reach the next milestone
 */
function calculateAmountToMilestone(
  milestone: FiMilestone,
  currentNetWorth: number,
  currentMonthlySpend: number,
  currentFiTarget: number,
  swr: number,
): number {
  if (milestone.type === 'percentage') {
    const targetNW = currentFiTarget * (milestone.targetValue / 100);
    return Math.max(0, targetNW - currentNetWorth);
  }
  if (milestone.type === 'net_worth') {
    return Math.max(0, milestone.targetValue - currentNetWorth);
  }
  if (milestone.type === 'runway') {
    const targetNW = currentMonthlySpend * 12 * milestone.targetValue;
    return Math.max(0, targetNW - currentNetWorth);
  }
  if (milestone.type === 'lifestyle') {
    const targetNW = (currentMonthlySpend * milestone.targetValue * 12) / (swr / 100);
    return Math.max(0, targetNW - currentNetWorth);
  }
  if (milestone.netWorthAtMilestone) {
    return Math.max(0, milestone.netWorthAtMilestone - currentNetWorth);
  }
  return 0;
}

/**
 * Get recently achieved milestones (achieved, sorted by how recently)
 */
function getRecentlyAchieved(milestones: FiMilestone[], limit: number = 3): FiMilestone[] {
  return milestones
    .filter(m => m.isAchieved)
    .sort((a, b) => {
      // Sort by targetValue descending within type to get most recent achievements
      if (a.type === b.type) return b.targetValue - a.targetValue;
      return 0;
    })
    .slice(0, limit);
}

/**
 * Get the top N soonest upcoming milestones across all types
 */
function getUpcomingMilestones(milestones: FiMilestone[], limit: number = 3): FiMilestone[] {
  return milestones
    .filter(m => !m.isAchieved && m.year !== null)
    .sort((a, b) => {
      const yearDiff = (a.year ?? Infinity) - (b.year ?? Infinity);
      if (yearDiff !== 0) return yearDiff;
      return (a.month ?? 7) - (b.month ?? 7);
    })
    .slice(0, limit);
}

export function MilestoneProgressCard({ primaryProjection }: MilestoneProgressCardProps) {
  const { fiMilestones, currentFiProgress, currentNetWorth, projections, scenario } = primaryProjection;
  const currentMonthlySpend = projections[0]?.monthlySpend ?? 0;
  const currentFiTarget = projections[0]?.fiTarget ?? 0;
  const currentYear = new Date().getFullYear();

  // Find the absolute next milestone (soonest across all types)
  const nextMilestone = useMemo(
    () => findNextMilestoneAcrossTypes(fiMilestones.milestones),
    [fiMilestones.milestones]
  );

  // Calculate progress within the current segment
  const segmentProgress = useMemo(() => {
    if (!nextMilestone) return 100;
    return calculateSegmentProgress(
      nextMilestone,
      fiMilestones.milestones,
      currentNetWorth.total,
      currentFiProgress,
      currentMonthlySpend,
      scenario.swr,
    );
  }, [nextMilestone, fiMilestones.milestones, currentNetWorth.total, currentFiProgress, currentMonthlySpend, scenario.swr]);

  // Amount needed
  const amountToNext = useMemo(() => {
    if (!nextMilestone) return 0;
    return calculateAmountToMilestone(nextMilestone, currentNetWorth.total, currentMonthlySpend, currentFiTarget, scenario.swr);
  }, [nextMilestone, currentNetWorth.total, currentMonthlySpend, currentFiTarget, scenario.swr]);

  // Get upcoming milestones (excluding the primary next one)
  const upcomingMilestones = useMemo(() => {
    const upcoming = getUpcomingMilestones(fiMilestones.milestones, 4);
    return upcoming.filter(m => m.id !== nextMilestone?.id).slice(0, 3);
  }, [fiMilestones.milestones, nextMilestone]);

  // Count achieved milestones
  const achievedCount = useMemo(
    () => fiMilestones.milestones.filter(m => m.isAchieved).length,
    [fiMilestones.milestones]
  );
  const totalCount = fiMilestones.milestones.length;

  if (!nextMilestone) return null;

  const typeColor = nextMilestone.color;
  const typeLabel = getMilestoneTypeLabel(nextMilestone.type);

  // Calculate days until milestone for dramatic display
  const daysUntil = nextMilestone.year
    ? (() => {
        const targetDate = new Date(nextMilestone.year, (nextMilestone.month ?? 7) - 1, 1);
        const now = new Date();
        const diff = targetDate.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      })()
    : null;

  return (
    <div className="bg-[#0f1629] rounded-xl border border-slate-800 overflow-hidden">
      {/* Top accent bar with gradient */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${typeColor}40 0%, ${typeColor} ${Math.min(100, segmentProgress)}%, ${typeColor}20 ${Math.min(100, segmentProgress)}%, #1e293b 100%)`,
        }}
      />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${typeColor}18` }}
            >
              <svg className="w-5 h-5" style={{ color: typeColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Next Milestone</h2>
              <p className="text-xs text-slate-500">{achievedCount} of {totalCount} achieved</p>
            </div>
          </div>
          <div
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${typeColor}18`, color: typeColor }}
          >
            {typeLabel}
          </div>
        </div>

        {/* Main milestone info */}
        <div className="mb-5">
          <h3 className="text-2xl font-bold text-white mb-1">
            {nextMilestone.shortName}
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {nextMilestone.description}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Progress</span>
            <span className="text-sm font-mono font-semibold" style={{ color: typeColor }}>
              {segmentProgress.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out relative"
              style={{
                width: `${Math.min(100, segmentProgress)}%`,
                background: `linear-gradient(90deg, ${typeColor}90, ${typeColor})`,
              }}
            >
              {/* Animated shimmer effect */}
              <div
                className="absolute inset-0 rounded-full opacity-30 animate-shimmer"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Amount to Go</p>
            <SimpleTrackedValue
              value={amountToNext}
              name="Amount to Next Milestone"
              description={`Amount needed to reach ${nextMilestone.shortName}`}
              formula="Milestone Target - Current Net Worth"
              inputs={[
                { name: 'Current Net Worth', value: currentNetWorth.total, unit: '$' },
              ]}
              className="text-sm font-mono font-semibold text-white"
            />
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Projected</p>
            <p className="text-sm font-mono font-semibold text-white">
              {formatProjectedDate(nextMilestone)}
            </p>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">
              {daysUntil !== null && daysUntil <= 365 ? 'Days Left' : nextMilestone.age ? 'At Age' : 'Years Away'}
            </p>
            <p className="text-sm font-mono font-semibold" style={{ color: typeColor }}>
              {daysUntil !== null && daysUntil <= 365
                ? daysUntil.toLocaleString()
                : nextMilestone.age
                  ? nextMilestone.age
                  : nextMilestone.yearsFromNow !== null
                    ? `${nextMilestone.yearsFromNow}y`
                    : '—'}
            </p>
          </div>
        </div>

        {/* Upcoming milestones queue */}
        {upcomingMilestones.length > 0 && (
          <div className="pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 font-medium mb-3">Coming Up</p>
            <div className="space-y-2">
              {upcomingMilestones.map(milestone => {
                const mColor = milestone.color;
                const mTypeLabel = getMilestoneTypeLabel(milestone.type);
                return (
                  <div
                    key={milestone.id}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: mColor }}
                      />
                      <span className="text-sm text-slate-300">{milestone.shortName}</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${getMilestoneTypeColor(milestone.type)}12`, color: getMilestoneTypeColor(milestone.type) }}
                      >
                        {mTypeLabel}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-400">
                        {formatProjectedDate(milestone)}
                      </span>
                      {milestone.age && (
                        <span className="text-xs text-slate-600 ml-1.5">
                          age {milestone.age}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
