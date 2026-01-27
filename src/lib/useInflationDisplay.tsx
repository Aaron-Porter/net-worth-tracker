/**
 * Inflation Display Context
 * 
 * Provides global state for the inflation display mode toggle.
 * This allows users to switch between viewing values in:
 * - "Today's Dollars" (real): Shows values in current purchasing power
 * - "Future Dollars" (nominal): Shows actual future amounts
 */

'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { InflationDisplayMode } from './inflation';

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
  isRealDollars: boolean;
  /** Whether mode is "nominal" (future dollars) */
  isNominalDollars: boolean;
  /** Get label for current mode */
  modeLabel: string;
  /** Get short label for current mode */
  modeLabelShort: string;
  /** Get description of current mode */
  modeDescription: string;
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

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'nominal' || stored === 'real') {
        setModeState(stored);
      }
    } catch (e) {
      // localStorage not available (SSR or privacy mode)
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage when mode changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      // localStorage not available
    }
  }, [mode, isHydrated]);

  const setMode = useCallback((newMode: InflationDisplayMode) => {
    setModeState(newMode);
  }, []);

  const toggle = useCallback(() => {
    setModeState(prev => prev === 'nominal' ? 'real' : 'nominal');
  }, []);

  const value: InflationDisplayContextType = {
    mode,
    setMode,
    toggle,
    isRealDollars: mode === 'real',
    isNominalDollars: mode === 'nominal',
    modeLabel: mode === 'real' ? "Today's Dollars" : "Future Dollars",
    modeLabelShort: mode === 'real' ? "Today's $" : "Future $",
    modeDescription: mode === 'real'
      ? "Values shown in today's purchasing power. This helps you understand what future amounts are actually worth."
      : "Values shown as actual future amounts. This is what you'll actually see in your accounts.",
  };

  return (
    <InflationDisplayContext.Provider value={value}>
      {children}
    </InflationDisplayContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access the inflation display mode
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { mode, toggle, modeLabel } = useInflationDisplay();
 *   
 *   return (
 *     <div>
 *       <button onClick={toggle}>{modeLabel}</button>
 *       <span>{mode === 'real' ? row.netWorth.real : row.netWorth.nominal}</span>
 *     </div>
 *   );
 * }
 * ```
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
// UTILITY HOOK FOR GETTING VALUES
// ============================================================================

import type { InflatedValue } from './inflation';
import { getDisplayValue } from './inflation';

/**
 * Hook to get the display value from an InflatedValue based on current mode
 * 
 * @example
 * ```tsx
 * function NetWorthDisplay({ netWorth }: { netWorth: InflatedValue }) {
 *   const displayValue = useInflatedValue(netWorth);
 *   return <span>{formatCurrency(displayValue)}</span>;
 * }
 * ```
 */
export function useInflatedValue(value: InflatedValue): number {
  const { mode } = useInflationDisplay();
  return getDisplayValue(value, mode);
}

/**
 * Hook to get the display value from an optional InflatedValue
 * Returns undefined if value is undefined
 */
export function useInflatedValueOptional(value: InflatedValue | undefined): number | undefined {
  const { mode } = useInflationDisplay();
  if (value === undefined) return undefined;
  return getDisplayValue(value, mode);
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface InflationModeIndicatorProps {
  /** Show short or long label */
  short?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Small indicator showing the current inflation display mode
 * Can be placed next to values to indicate what they represent
 */
export function InflationModeIndicator({ 
  short = true, 
  className = '' 
}: InflationModeIndicatorProps) {
  const { modeLabelShort, modeLabel, mode } = useInflationDisplay();
  
  return (
    <span 
      className={`text-xs text-slate-500 ${className}`}
      title={mode === 'real' 
        ? "Value shown in today's purchasing power"
        : "Value shown as actual future amount"
      }
    >
      ({short ? modeLabelShort : modeLabel})
    </span>
  );
}

/**
 * Wrapper that shows values with automatic mode indicator
 */
interface InflatedValueDisplayProps {
  value: InflatedValue;
  formatter?: (value: number) => string;
  showIndicator?: boolean;
  className?: string;
}

export function InflatedValueDisplay({
  value,
  formatter = (v) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
  showIndicator = false,
  className = '',
}: InflatedValueDisplayProps) {
  const displayValue = useInflatedValue(value);
  
  return (
    <span className={className}>
      {formatter(displayValue)}
      {showIndicator && <InflationModeIndicator className="ml-1" />}
    </span>
  );
}
