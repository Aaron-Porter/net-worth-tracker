/**
 * Comprehensive Inflation Display System
 * 
 * This module provides a complete system for handling inflation across the app.
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
import type { InflationDisplayMode, InflatedValue } from './inflation';
import { nominalToReal, inflationMultiplier, getDisplayValue, createInflatedValueFromNominal } from './inflation';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

interface InflationDisplayContextType {
  /** Current display mode */
  mode: InflationDisplayMode;
  /** Update the display mode */
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
// STORAGE KEY
// ============================================================================

const STORAGE_KEY = 'inflation-display-mode';
const DEFAULT_MODE: InflationDisplayMode = 'real'; // Default to "today's dollars"

// ============================================================================
// PROVIDER
// ============================================================================

interface InflationDisplayProviderProps {
  children: ReactNode;
  /** Override the default mode (useful for testing) */
  defaultMode?: InflationDisplayMode;
}

export function InflationDisplayProvider({ 
  children, 
  defaultMode = DEFAULT_MODE 
}: InflationDisplayProviderProps) {
  const [mode, setModeState] = useState<InflationDisplayMode>(defaultMode);
  const [isHydrated, setIsHydrated] = useState(false);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'nominal' || stored === 'real') {
        setModeState(stored);
      }
    } catch {
      // localStorage not available (SSR or privacy mode)
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage when mode changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage not available
    }
  }, [mode, isHydrated]);

  const setMode = useCallback((newMode: InflationDisplayMode) => {
    setModeState(newMode);
  }, []);

  const toggle = useCallback(() => {
    setModeState(prev => prev === 'nominal' ? 'real' : 'nominal');
  }, []);

  // Core adjustment function
  const adjustValue = useCallback((value: number, year: number, inflationRate: number): number => {
    if (mode === 'nominal') return value;
    const yearsFromNow = Math.max(0, year - currentYear);
    if (yearsFromNow === 0) return value;
    return nominalToReal(value, yearsFromNow, inflationRate);
  }, [mode, currentYear]);

  const getDisplayValueFn = useCallback((value: InflatedValue): number => {
    return getDisplayValue(value, mode);
  }, [mode]);

  const createInflatedValueFn = useCallback((nominal: number, year: number, inflationRate: number): InflatedValue => {
    const yearsFromNow = Math.max(0, year - currentYear);
    return createInflatedValueFromNominal(nominal, yearsFromNow, inflationRate);
  }, [currentYear]);

  const value: InflationDisplayContextType = {
    mode,
    setMode,
    toggle,
    isRealMode: mode === 'real',
    isNominalMode: mode === 'nominal',
    modeLabel: mode === 'real' ? "Today's Dollars" : "Future Dollars",
    modeLabelShort: mode === 'real' ? "Today's $" : "Future $",
    modeDescription: mode === 'real'
      ? "Values shown in today's purchasing power. This helps you understand what future amounts are actually worth."
      : "Values shown as actual future amounts. This is what you'll actually see in your accounts.",
    currentYear,
    adjustValue,
    getDisplayValue: getDisplayValueFn,
    createInflatedValue: createInflatedValueFn,
  };

  return (
    <InflationDisplayContext.Provider value={value}>
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
 * 
 * @example
 * ```tsx
 * // For a projected value in 2035
 * const displayValue = useAdjustedValue(projection.netWorth, 2035, 3);
 * ```
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
 * 
 * @example
 * ```tsx
 * // Current value (no adjustment)
 * <InflationAwareValue value={500000} />
 * 
 * // Future value (auto-adjusted based on mode)
 * <InflationAwareValue value={750000} year={2035} inflationRate={3} />
 * ```
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
}

/**
 * Toggle between "Today's Dollars" and "Future Dollars" display modes
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
 * Inline toggle for use in tight spaces
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
// UTILITY FUNCTION FOR FORMATTING
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
