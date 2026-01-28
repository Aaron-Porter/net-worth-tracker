/**
 * Comprehensive Inflation Display System
 * 
 * This module provides a complete system for handling inflation across the app.
 * The display mode is stored as a user preference in the database.
 * 
 * Key Concepts:
 * - NOMINAL: Actual future dollar amounts (what you'll see in accounts)
 * - REAL: Today's purchasing power equivalent (what it's worth now)
 * 
 * Key Rules:
 * - Current year (year 0) values: nominal = real (no adjustment)
 * - Future year values: adjusted based on display mode
 * - FI Progress %: Same in both modes (ratio cancels out inflation)
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { InflationDisplayMode, InflatedValue } from './inflation';
import { nominalToReal, inflationMultiplier, getDisplayValue, createInflatedValueFromNominal } from './inflation';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

interface InflationDisplayContextType {
  /** Current display mode */
  mode: InflationDisplayMode;
  /** Update the display mode (saves to database) */
  setMode: (mode: InflationDisplayMode) => void;
  /** Toggle between modes */
  toggle: () => void;
  /** Whether mode is "real" (today's dollars) */
  isRealMode: boolean;
  /** Whether mode is "nominal" (future dollars) */
  isNominalMode: boolean;
  /** Get label for current mode */
  modeLabel: string;
  /** Get short label for current mode */
  modeLabelShort: string;
  /** Get description of current mode */
  modeDescription: string;
  /** Current year (reference point) */
  currentYear: number;
  /** Whether the mode is loading from server */
  isLoading: boolean;
  
  /** 
   * Adjust a value for display based on current mode 
   * @param value - The nominal (future) value
   * @param year - The year this value applies to
   * @param inflationRate - The inflation rate to use
   */
  adjustValue: (value: number, year: number, inflationRate: number) => number;
  
  /**
   * Get display value from an InflatedValue based on current mode
   */
  getDisplayValue: (value: InflatedValue) => number;
  
  /**
   * Create an InflatedValue from a nominal value
   */
  createInflatedValue: (nominal: number, year: number, inflationRate: number) => InflatedValue;
}

// ============================================================================
// CONTEXT
// ============================================================================

const InflationDisplayContext = createContext<InflationDisplayContextType | null>(null);

// ============================================================================
// DEFAULT MODE
// ============================================================================

const DEFAULT_MODE: InflationDisplayMode = 'real'; // Default to "today's dollars"

// ============================================================================
// PROVIDER
// ============================================================================

interface InflationDisplayProviderProps {
  children: ReactNode;
}

export function InflationDisplayProvider({ children }: InflationDisplayProviderProps) {
  // Get mode from database
  const profile = useQuery(api.settings.getProfile);
  const setModeMutation = useMutation(api.settings.setInflationDisplayMode);
  
  // Local state for immediate UI response
  const [localMode, setLocalMode] = useState<InflationDisplayMode>(DEFAULT_MODE);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const isLoading = profile === undefined;

  // Sync local state with database
  useEffect(() => {
    if (profile !== undefined && !hasInitialized) {
      const serverMode = profile?.inflationDisplayMode;
      if (serverMode === 'nominal' || serverMode === 'real') {
        setLocalMode(serverMode);
      }
      setHasInitialized(true);
    }
  }, [profile, hasInitialized]);

  const setMode = useCallback((newMode: InflationDisplayMode) => {
    // Update local state immediately for responsive UI
    setLocalMode(newMode);
    // Persist to database
    setModeMutation({ mode: newMode }).catch(console.error);
  }, [setModeMutation]);

  const toggle = useCallback(() => {
    const newMode = localMode === 'nominal' ? 'real' : 'nominal';
    setMode(newMode);
  }, [localMode, setMode]);

  // Core adjustment function
  const adjustValue = useCallback((value: number, year: number, inflationRate: number): number => {
    if (localMode === 'nominal') return value;
    const yearsFromNow = Math.max(0, year - currentYear);
    if (yearsFromNow === 0) return value;
    return nominalToReal(value, yearsFromNow, inflationRate);
  }, [localMode, currentYear]);

  const getDisplayValueFn = useCallback((value: InflatedValue): number => {
    return getDisplayValue(value, localMode);
  }, [localMode]);

  const createInflatedValueFn = useCallback((nominal: number, year: number, inflationRate: number): InflatedValue => {
    const yearsFromNow = Math.max(0, year - currentYear);
    return createInflatedValueFromNominal(nominal, yearsFromNow, inflationRate);
  }, [currentYear]);

  const contextValue: InflationDisplayContextType = {
    mode: localMode,
    setMode,
    toggle,
    isRealMode: localMode === 'real',
    isNominalMode: localMode === 'nominal',
    modeLabel: localMode === 'real' ? "Today's Dollars" : "Future Dollars",
    modeLabelShort: localMode === 'real' ? "Today's $" : "Future $",
    modeDescription: localMode === 'real'
      ? "Values shown in today's purchasing power. This helps you understand what future amounts are actually worth."
      : "Values shown as actual future amounts. This is what you'll actually see in your accounts.",
    currentYear,
    isLoading,
    adjustValue,
    getDisplayValue: getDisplayValueFn,
    createInflatedValue: createInflatedValueFn,
  };

  return (
    <InflationDisplayContext.Provider value={contextValue}>
      {children}
    </InflationDisplayContext.Provider>
  );
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook to access the inflation display system
 */
export function useInflationDisplay(): InflationDisplayContextType {
  const context = useContext(InflationDisplayContext);
  
  if (!context) {
    throw new Error(
      'useInflationDisplay must be used within an InflationDisplayProvider. ' +
      'Wrap your app with <InflationDisplayProvider> in your layout.'
    );
  }
  
  return context;
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook to get an inflation-adjusted value for display
 * 
 * @param nominalValue - The nominal (future) value
 * @param year - The year this value applies to (undefined = current year)
 * @param inflationRate - The inflation rate percentage (e.g., 3 for 3%)
 */
export function useAdjustedValue(
  nominalValue: number,
  year: number | undefined,
  inflationRate: number
): number {
  const { adjustValue, currentYear } = useInflationDisplay();
  return adjustValue(nominalValue, year ?? currentYear, inflationRate);
}

/**
 * Hook to get the display value from an InflatedValue
 */
export function useInflatedValue(value: InflatedValue): number {
  const { getDisplayValue } = useInflationDisplay();
  return getDisplayValue(value);
}

/**
 * Hook to get the display value from an optional InflatedValue
 */
export function useInflatedValueOptional(value: InflatedValue | undefined): number | undefined {
  const { getDisplayValue } = useInflationDisplay();
  if (value === undefined) return undefined;
  return getDisplayValue(value);
}

// ============================================================================
// INFLATION-AWARE MONETARY DISPLAY COMPONENT
// ============================================================================

interface InflationAwareValueProps {
  /** The nominal (future) value to display */
  value: number;
  /** The year this value applies to. If undefined, treated as current year (no adjustment) */
  year?: number;
  /** The inflation rate percentage (e.g., 3 for 3%). Required for future values. */
  inflationRate?: number;
  /** Custom formatter function */
  formatter?: (value: number) => string;
  /** CSS class name */
  className?: string;
  /** Whether to show the mode indicator */
  showIndicator?: boolean;
  /** Additional props to pass to the span */
  style?: React.CSSProperties;
}

/**
 * Component that displays a monetary value with automatic inflation adjustment
 */
export function InflationAwareValue({
  value,
  year,
  inflationRate = 3,
  formatter = defaultCurrencyFormatter,
  className = '',
  showIndicator = false,
  style,
}: InflationAwareValueProps) {
  const { adjustValue, currentYear, mode, modeLabelShort } = useInflationDisplay();
  
  const targetYear = year ?? currentYear;
  const isFutureValue = targetYear > currentYear;
  const displayValue = adjustValue(value, targetYear, inflationRate);
  
  return (
    <span className={className} style={style}>
      {formatter(displayValue)}
      {showIndicator && isFutureValue && (
        <span className={`ml-1 text-xs opacity-60`}>
          ({modeLabelShort})
        </span>
      )}
    </span>
  );
}

// Default currency formatter
function defaultCurrencyFormatter(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

// ============================================================================
// TOGGLE COMPONENTS
// ============================================================================

interface InflationToggleProps {
  /** Show in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show as a prominent setting */
  prominent?: boolean;
}

/**
 * Toggle between "Today's Dollars" and "Future Dollars" display modes
 */
export function InflationToggle({ compact = false, className = '', prominent = false }: InflationToggleProps) {
  const { mode, setMode, modeDescription, isLoading } = useInflationDisplay();

  if (prominent) {
    return (
      <div className={`bg-slate-800/50 rounded-xl p-4 border border-slate-700 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-300">Inflation Display</h3>
            <p className="text-xs text-slate-500 mt-0.5">How to show projected values</p>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-slate-600">
            <button
              onClick={() => setMode('real')}
              disabled={isLoading}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'real'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Show values in today's purchasing power"
            >
              Today's $
            </button>
            <button
              onClick={() => setMode('nominal')}
              disabled={isLoading}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'nominal'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Show actual future amounts"
            >
              Future $
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400">{modeDescription}</p>
        <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-500">
          {mode === 'real' ? (
            <p>
              <span className="text-emerald-400 font-medium">Today's Dollars:</span> Spending appears "flat" because lifestyle is maintained. 
              Future $100k shown as ~$74k reflects what you can buy with it today.
            </p>
          ) : (
            <p>
              <span className="text-amber-400 font-medium">Future Dollars:</span> Spending grows over time due to inflation. 
              This is what you'll actually see in your accounts.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => setMode(mode === 'nominal' ? 'real' : 'nominal')}
          disabled={isLoading}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors text-sm ${isLoading ? 'opacity-50' : ''}`}
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
            disabled={isLoading}
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
            disabled={isLoading}
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
 * Inline toggle for use in tight spaces
 */
export function InflationToggleInline({ className = '' }: { className?: string }) {
  const { mode, toggle, modeLabel, isLoading } = useInflationDisplay();

  return (
    <button
      onClick={toggle}
      disabled={isLoading}
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700 border border-slate-600 transition-colors ${className} ${isLoading ? 'opacity-50' : ''}`}
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

// ============================================================================
// INDICATOR COMPONENTS
// ============================================================================

interface InflationModeIndicatorProps {
  /** Show short or long label */
  short?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Only show for future values */
  onlyIfFuture?: boolean;
  /** The year to check if future */
  year?: number;
}

/**
 * Small indicator showing the current inflation display mode
 */
export function InflationModeIndicator({ 
  short = true, 
  className = '',
  onlyIfFuture = false,
  year,
}: InflationModeIndicatorProps) {
  const { modeLabelShort, modeLabel, mode, currentYear } = useInflationDisplay();
  
  if (onlyIfFuture && year !== undefined && year <= currentYear) {
    return null;
  }
  
  return (
    <span 
      className={`text-xs ${mode === 'real' ? 'text-emerald-400/60' : 'text-amber-400/60'} ${className}`}
      title={mode === 'real' 
        ? "Value shown in today's purchasing power"
        : "Value shown as actual future amount"
      }
    >
      ({short ? modeLabelShort : modeLabel})
    </span>
  );
}

// ============================================================================
// INFO COMPONENT
// ============================================================================

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a currency value with inflation mode indicator
 */
export function formatCurrencyWithMode(
  value: number,
  mode: InflationDisplayMode,
  isFuture: boolean = false
): string {
  const formatted = value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  
  if (!isFuture) return formatted;
  
  const suffix = mode === 'real' ? " (today's $)" : " (future $)";
  return formatted + suffix;
}

/**
 * Helper to format currency with automatic inflation adjustment
 */
export function useInflationAwareFormatter() {
  const { adjustValue, mode, currentYear } = useInflationDisplay();
  
  return useCallback((
    value: number, 
    year: number | undefined, 
    inflationRate: number,
    decimals: number = 0
  ): string => {
    const targetYear = year ?? currentYear;
    const adjustedValue = adjustValue(value, targetYear, inflationRate);
    return adjustedValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: decimals,
    });
  }, [adjustValue, currentYear, mode]);
}
