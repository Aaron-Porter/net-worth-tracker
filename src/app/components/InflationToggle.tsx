'use client';

import { useInflationDisplay } from '../../lib/useInflationDisplay';

interface InflationToggleProps {
  /** Show in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Toggle between "Today's Dollars" and "Future Dollars" display modes
 * 
 * In "Today's Dollars" mode:
 * - All projected values are shown in current purchasing power
 * - Helps users understand what future amounts are actually worth
 * - Spending stays "flat" because purchasing power is maintained
 * 
 * In "Future Dollars" mode:
 * - Values show actual future amounts (inflated)
 * - This is what you'll actually see in your accounts
 * - Spending grows to maintain lifestyle
 */
export function InflationToggle({ compact = false, className = '' }: InflationToggleProps) {
  const { mode, setMode, modeDescription } = useInflationDisplay();

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => setMode(mode === 'nominal' ? 'real' : 'nominal')}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors text-sm"
          title={modeDescription}
        >
          <svg 
            className="w-3.5 h-3.5 text-slate-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <span className={mode === 'real' ? 'text-emerald-400' : 'text-amber-400'}>
            {mode === 'real' ? "Today's $" : "Future $"}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">View as:</span>
        <div className="flex rounded-lg overflow-hidden border border-slate-600">
          <button
            onClick={() => setMode('real')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'real'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title="Show values in today's purchasing power"
          >
            Today's Dollars
          </button>
          <button
            onClick={() => setMode('nominal')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'nominal'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title="Show actual future amounts"
          >
            Future Dollars
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">{modeDescription}</p>
    </div>
  );
}

/**
 * Inline toggle for use in tight spaces (e.g., table headers)
 */
export function InflationToggleInline({ className = '' }: { className?: string }) {
  const { mode, toggle, modeLabel } = useInflationDisplay();

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700 border border-slate-600 transition-colors ${className}`}
      title={`Currently showing: ${modeLabel}. Click to toggle.`}
    >
      <svg 
        className="w-3 h-3" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" 
        />
      </svg>
      <span className={mode === 'real' ? 'text-emerald-400' : 'text-amber-400'}>
        {mode === 'real' ? "Today's $" : "Future $"}
      </span>
    </button>
  );
}

/**
 * Info tooltip explaining inflation display modes
 */
export function InflationModeInfo({ className = '' }: { className?: string }) {
  return (
    <div className={`text-xs text-slate-500 ${className}`}>
      <p className="font-medium text-slate-400 mb-1">About Inflation Display</p>
      <p className="mb-2">
        <strong className="text-emerald-400">Today's Dollars:</strong> Shows what future amounts are worth 
        in current purchasing power. Your spending stays "flat" because the lifestyle is maintained.
      </p>
      <p>
        <strong className="text-amber-400">Future Dollars:</strong> Shows actual amounts you'll see 
        in your accounts. Spending grows over time due to inflation.
      </p>
    </div>
  );
}
