'use client'

import React, { useState } from 'react'
import { FiMilestone, FI_MILESTONE_DEFINITIONS } from '../../lib/calculations'

interface MilestoneBadgesProps {
  milestones: FiMilestone[];
  maxVisible?: number;
}

export function MilestoneBadges({ milestones, maxVisible = 3 }: MilestoneBadgesProps) {
  const [expanded, setExpanded] = useState(false);

  if (milestones.length === 0) return null;

  const visibleMilestones = expanded ? milestones : milestones.slice(0, maxVisible);
  const overflowCount = milestones.length - maxVisible;
  const hasOverflow = overflowCount > 0;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visibleMilestones.map(m => (
        <span
          key={m.id}
          className={`text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
            m.isAchieved ? '' : 'opacity-70'
          }`}
          style={{
            backgroundColor: `${m.color}20`,
            color: m.color,
            border: `1px solid ${m.color}40`
          }}
          title={FI_MILESTONE_DEFINITIONS.find(d => d.id === m.id)?.description || m.shortName}
        >
          {m.shortName}
        </span>
      ))}
      {hasOverflow && !expanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-300 transition-colors border border-slate-600/50"
          title={`Show ${overflowCount} more milestone${overflowCount > 1 ? 's' : ''}`}
        >
          +{overflowCount}
        </button>
      )}
      {expanded && hasOverflow && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 hover:text-slate-300 transition-colors border border-slate-600/50"
          title="Show less"
        >
          −
        </button>
      )}
    </div>
  );
}
