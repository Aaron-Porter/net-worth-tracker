'use client'

import React, { useState } from 'react'
import { FiMilestone } from '../../lib/calculations'
import { SimpleTrackedValue } from './TrackedValue'

interface MilestoneRowProps {
  milestone: FiMilestone;
  currentYear: number;
}

export function MilestoneRow({ milestone, currentYear }: MilestoneRowProps) {
  const [showDescription, setShowDescription] = useState(false);

  return (
    <div
      className={`rounded-lg p-3 transition-colors cursor-pointer ${
        milestone.isAchieved
          ? 'bg-emerald-900/30 border border-emerald-500/30'
          : 'bg-slate-800/30 hover:bg-slate-800/50'
      }`}
      onClick={() => setShowDescription(!showDescription)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${milestone.isAchieved ? 'bg-emerald-400' : 'bg-slate-600'}`}
            style={!milestone.isAchieved ? { borderColor: milestone.color, borderWidth: 2 } : { backgroundColor: milestone.color }}
          />
          <div>
            <span className={`text-sm font-medium ${milestone.isAchieved ? 'text-emerald-300' : 'text-slate-300'}`}>
              {milestone.shortName}
            </span>
            {milestone.isAchieved && (
              <span className="ml-2 text-xs text-emerald-400">Achieved</span>
            )}
          </div>
        </div>

        <div className="text-right">
          {milestone.year ? (
            <>
              <span className={`text-sm font-mono ${milestone.isAchieved ? 'text-emerald-400' : 'text-slate-400'}`}>
                {milestone.year}
              </span>
              {milestone.age && (
                <span className="text-xs text-slate-500 ml-2">
                  (age {milestone.age})
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-500">Not projected</span>
          )}
        </div>
      </div>

      {showDescription && (
        <p className="mt-2 text-xs text-slate-400 pl-6">
          {milestone.description}
          {milestone.netWorthAtMilestone && (
            <span className="block mt-1 text-slate-500">
              Net worth at milestone: <SimpleTrackedValue
                value={milestone.netWorthAtMilestone}
                name={`${milestone.shortName} Net Worth`}
                description={`Projected net worth when reaching ${milestone.shortName}`}
                formula="Projected value at milestone achievement"
                inputs={[
                  { name: 'Milestone', value: milestone.shortName },
                  { name: 'Year', value: milestone.year || 'N/A' },
                ]}
                className="text-slate-500"
              />
            </span>
          )}
        </p>
      )}
    </div>
  );
}
