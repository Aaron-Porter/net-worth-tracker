'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TrackedCalculation, TrackedValue as TrackedValueType, CalculationInput, ValueSource, formatNumber } from '../../lib/calculationTrace'
import { useInflationDisplay } from '../../lib/useInflationDisplay'

// ============================================================================
// TYPES
// ============================================================================

interface TrackedValueProps {
  /** The tracked value with calculation trace */
  value: TrackedValueType;
  /** Number of decimal places to display */
  decimals?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the currency symbol */
  showCurrency?: boolean;
  /** Custom formatter function */
  formatter?: (value: number) => string;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
}

/** Input definition for SimpleTrackedValue */
export interface SimpleInput {
  name: string;
  value: number | string;
  unit?: string;
  /** Where this value comes from */
  source?: ValueSource;
  /** For settings: which scenario setting this maps to */
  settingKey?: string;
  /** For calculated values: nested trace */
  trace?: TrackedCalculation;
}

interface SimpleTrackedValueProps {
  /** The numeric value */
  value: number;
  /** Name of the calculation */
  name: string;
  /** Description of what this value represents */
  description: string;
  /** The formula used */
  formula: string;
  /** Input values used in the calculation */
  inputs?: SimpleInput[];
  /** Calculation steps showing the work */
  steps?: Array<{
    description: string;
    formula?: string;
    result?: number;
    unit?: string;
  }>;
  /** Number of decimal places */
  decimals?: number;
  /** Additional CSS classes */
  className?: string;
  /** Unit for display (deprecated - use formatAs instead) */
  unit?: string;
  /** Format type: 'currency', 'percent', or 'number' */
  formatAs?: 'currency' | 'percent' | 'number';
}

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

/** Get color and label for value source */
function getSourceDisplay(source?: ValueSource): { color: string; label: string; icon: string } {
  switch (source) {
    case 'setting':
      return { color: 'text-violet-400', label: 'Setting', icon: '⚙️' };
    case 'calculated':
      return { color: 'text-emerald-400', label: 'Calculated', icon: '📊' };
    case 'input':
      return { color: 'text-sky-400', label: 'User Input', icon: '✏️' };
    case 'constant':
      return { color: 'text-amber-400', label: 'Constant', icon: '📌' };
    case 'api':
      return { color: 'text-blue-400', label: 'API', icon: '🌐' };
    case 'derived':
      return { color: 'text-orange-400', label: 'Derived', icon: '🔗' };
    default:
      return { color: 'text-slate-400', label: '', icon: '' };
  }
}

/** Component to display an input with source info and expandable nested calculations */
function InputDisplay({ input, depth = 0 }: { input: CalculationInput; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const sourceDisplay = getSourceDisplay(input.source);
  const hasNestedTrace = input.trace && input.source === 'calculated';
  
  return (
    <div className={`text-xs ${depth > 0 ? 'ml-3 pl-3 border-l border-slate-700' : ''}`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Source indicator */}
            {input.source && (
              <span className={`${sourceDisplay.color} text-[10px]`} title={sourceDisplay.label}>
                {sourceDisplay.icon}
              </span>
            )}
            {/* Name */}
            <span className="text-slate-300 truncate">{input.name}</span>
            {/* Setting key indicator */}
            {input.settingKey && (
              <span className="text-violet-400/70 text-[10px] font-mono">({input.settingKey})</span>
            )}
            {/* Expand button for nested calculations */}
            {hasNestedTrace && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
                title="Show calculation breakdown"
              >
                <svg 
                  className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
          {/* Description */}
          {input.description && !input.settingKey && (
            <div className="text-slate-500 text-[10px] mt-0.5 truncate">{input.description}</div>
          )}
        </div>
        {/* Value */}
        <span className="font-mono text-slate-200 shrink-0">
          {typeof input.value === 'number' 
            ? formatNumber(input.value, input.unit)
            : String(input.value)}
        </span>
      </div>
      
      {/* Nested calculation breakdown */}
      {expanded && input.trace && (
        <div className="mt-2 bg-slate-900/50 rounded p-2 space-y-2">
          <div className="text-slate-400 text-[10px] font-medium mb-1">
            How {input.name} is calculated:
          </div>
          {/* Formula */}
          <div className="font-mono text-[10px] text-emerald-400/80 bg-slate-900/50 rounded px-2 py-1">
            {input.trace.formula}
          </div>
          {/* Nested inputs */}
          {input.trace.inputs.length > 0 && (
            <div className="space-y-1">
              {input.trace.inputs.map((nestedInput, idx) => (
                <InputDisplay key={idx} input={nestedInput} depth={depth + 1} />
              ))}
            </div>
          )}
          {/* Steps if any */}
          {input.trace.steps && input.trace.steps.length > 0 && (
            <div className="space-y-1 mt-2">
              <div className="text-slate-500 text-[10px] font-medium">Steps:</div>
              {input.trace.steps.map((step, idx) => (
                <div key={idx} className="text-[10px] bg-slate-800/50 rounded p-1.5">
                  <span className="text-slate-500">{idx + 1}.</span>{' '}
                  <span className="text-slate-300">{step.description}</span>
                  {step.formula && (
                    <div className="font-mono text-slate-500 mt-0.5">{step.formula}</div>
                  )}
                  {step.intermediateResult !== undefined && (
                    <div className="text-emerald-400 font-mono">
                      = {formatNumber(step.intermediateResult, step.unit || input.trace?.unit)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TooltipProps {
  trace: TrackedCalculation;
  targetRect: DOMRect;
  onClose: () => void;
}

function CalculationTooltip({ trace, targetRect, onClose }: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!tooltipRef.current) return

    const tooltip = tooltipRef.current
    const tooltipRect = tooltip.getBoundingClientRect()
    
    // Calculate position - prefer above the element
    let top = targetRect.top - tooltipRect.height - 8
    let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2)
    
    // If tooltip would go off top of screen, show below
    if (top < 8) {
      top = targetRect.bottom + 8
    }
    
    // Keep within horizontal bounds
    if (left < 8) {
      left = 8
    } else if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8
    }

    setPosition({ top, left })
  }, [targetRect])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    
    // Close on escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[100] bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 max-w-md text-sm"
      style={{
        top: position.top,
        left: position.left,
        opacity: position.top === 0 ? 0 : 1,
        transition: 'opacity 0.15s ease-in-out',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
        <div>
          <h3 className="font-semibold text-slate-100">{trace.name}</h3>
          <span className="text-xs text-slate-500 capitalize">{trace.category.replace('_', ' ')}</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Description */}
      {trace.description && (
        <p className="text-slate-400 text-xs mb-3">{trace.description}</p>
      )}

      {/* Formula */}
      <div className="bg-slate-900/50 rounded-md p-2 mb-3 font-mono text-xs">
        <span className="text-slate-500">Formula: </span>
        <span className="text-emerald-400">{trace.formula}</span>
      </div>

      {/* Inputs */}
      {trace.inputs.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-slate-400 mb-2">Inputs</h4>
          <div className="space-y-2">
            {trace.inputs.map((input, idx) => (
              <InputDisplay key={idx} input={input} />
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      {trace.steps && trace.steps.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-slate-400 mb-2">Calculation Steps</h4>
          <div className="space-y-2">
            {trace.steps.map((step, idx) => (
              <div key={idx} className="text-xs bg-slate-900/30 rounded p-2">
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">{idx + 1}.</span>
                  <div className="flex-1">
                    <span className="text-slate-300">{step.description}</span>
                    {step.formula && (
                      <div className="font-mono text-slate-500 mt-0.5">{step.formula}</div>
                    )}
                    {step.intermediateResult !== undefined && (
                      <div className="text-emerald-400 font-mono mt-0.5">
                        = {formatNumber(step.intermediateResult, trace.unit)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      <div className="flex justify-between items-center pt-2 border-t border-slate-700">
        <span className="text-slate-400 font-medium">Result</span>
        <span className="font-mono text-lg text-emerald-400 font-semibold">
          {formatNumber(trace.result, trace.unit)}
        </span>
      </div>
    </div>,
    document.body
  )
}

// ============================================================================
// MAIN COMPONENTS
// ============================================================================

/**
 * TrackedValue component - displays a number with hover tooltip showing calculation details
 */
export function TrackedValue({
  value,
  decimals = 2,
  className = '',
  showCurrency = true,
  formatter,
  disabled = false,
}: TrackedValueProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const elementRef = useRef<HTMLSpanElement>(null)

  const handleClick = () => {
    if (disabled || !elementRef.current) return
    setTargetRect(elementRef.current.getBoundingClientRect())
    setShowTooltip(true)
  }

  const displayValue = formatter 
    ? formatter(value.value)
    : showCurrency 
      ? formatNumber(value.value, '$')
      : value.value.toLocaleString('en-US', { maximumFractionDigits: decimals });

  return (
    <>
      <span
        ref={elementRef}
        onClick={handleClick}
        className={`cursor-help border-b border-dotted border-current hover:border-emerald-400 hover:text-emerald-400 transition-colors ${className}`}
        title="Click to see calculation details"
      >
        {displayValue}
      </span>
      {showTooltip && targetRect && (
        <CalculationTooltip
          trace={value.trace}
          targetRect={targetRect}
          onClose={() => setShowTooltip(false)}
        />
      )}
    </>
  )
}

/**
 * SimpleTrackedValue - for cases where you want tooltip functionality without a full TrackedValue object
 */
export function SimpleTrackedValue({
  value,
  name,
  description,
  formula,
  inputs = [],
  steps = [],
  decimals = 2,
  className = '',
  unit = '$',
  formatAs,
}: SimpleTrackedValueProps) {
  // Determine the display unit based on formatAs or legacy unit prop
  const displayUnit = formatAs === 'percent' ? '%' : formatAs === 'number' ? '' : (formatAs === 'currency' || unit === '$') ? '$' : unit

  const trackedValue: TrackedValueType = {
    value,
    trace: {
      id: `simple_${name}_${Date.now()}`,
      name,
      description,
      category: 'projection',
      formula,
      inputs: inputs.map(i => ({ 
        name: i.name, 
        value: i.value,
        unit: i.unit,
        source: i.source,
        settingKey: i.settingKey,
        trace: i.trace,
      })),
      steps: steps.length > 0 ? steps.map(s => ({
        description: s.description,
        formula: s.formula,
        intermediateResult: s.result,
        unit: s.unit,
        inputs: [],
      })) : undefined,
      result: value,
      unit: displayUnit,
      timestamp: Date.now(),
    },
  }

  // Custom formatter for percentages
  const formatter = formatAs === 'percent' 
    ? (v: number) => `${v.toFixed(decimals)}%`
    : undefined

  return (
    <TrackedValue
      value={trackedValue}
      decimals={decimals}
      className={className}
      showCurrency={displayUnit === '$'}
      formatter={formatter}
    />
  )
}

/**
 * Inline calculation display - shows a value with its formula inline (no tooltip)
 */
export function InlineCalculation({
  value,
  formula,
  className = '',
  unit = '$',
}: {
  value: number;
  formula: string;
  className?: string;
  unit?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="font-mono">{formatNumber(value, unit)}</span>
      <span className="text-xs text-slate-500">({formula})</span>
    </span>
  )
}

/**
 * Calculation card - displays a calculation with full details visible
 */
export function CalculationCard({
  trace,
  className = '',
}: {
  trace: TrackedCalculation;
  className?: string;
}) {
  return (
    <div className={`bg-slate-800/50 rounded-lg p-4 border border-slate-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-200">{trace.name}</h3>
        <span className="text-xs text-slate-500 capitalize bg-slate-900/50 px-2 py-1 rounded">
          {trace.category.replace('_', ' ')}
        </span>
      </div>

      {/* Description */}
      {trace.description && (
        <p className="text-slate-400 text-sm mb-3">{trace.description}</p>
      )}

      {/* Formula */}
      <div className="bg-slate-900/50 rounded-md p-3 mb-3 font-mono text-sm">
        <span className="text-emerald-400">{trace.formula}</span>
      </div>

      {/* Inputs */}
      {trace.inputs.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-slate-400 mb-2">Inputs</h4>
          <div className="grid grid-cols-2 gap-2">
            {trace.inputs.map((input, idx) => (
              <div key={idx} className="bg-slate-900/30 rounded p-2">
                <div className="text-xs text-slate-500">{input.name}</div>
                <div className="font-mono text-slate-200">
                  {typeof input.value === 'number' 
                    ? formatNumber(input.value, input.unit)
                    : String(input.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      <div className="flex justify-between items-center pt-3 border-t border-slate-700">
        <span className="text-slate-400 font-medium">Result</span>
        <span className="font-mono text-xl text-emerald-400 font-semibold">
          {formatNumber(trace.result, trace.unit)}
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to create a tracked value on the fly
 */
export function useTrackedValue(
  value: number,
  name: string,
  description: string,
  formula: string,
  inputs: Array<{ name: string; value: number | string; unit?: string }> = [],
  unit: string = '$'
): TrackedValueType {
  return React.useMemo(() => ({
    value,
    trace: {
      id: `hook_${name}_${Date.now()}`,
      name,
      description,
      category: 'projection' as const,
      formula,
      inputs,
      result: value,
      unit,
      timestamp: Date.now(),
    },
  }), [value, name, description, formula, inputs, unit])
}

// ============================================================================
// INFLATION-AWARE COMPONENTS
// ============================================================================

interface InflationAwareTrackedValueProps extends Omit<SimpleTrackedValueProps, 'value'> {
  /** The nominal (future) value */
  value: number;
  /** The year this value applies to. If undefined, treated as current year (no adjustment) */
  year?: number;
  /** The inflation rate percentage (e.g., 3 for 3%) */
  inflationRate?: number;
  /** Whether to show the inflation mode indicator */
  showModeIndicator?: boolean;
}

/**
 * Inflation-aware SimpleTrackedValue - automatically adjusts value based on display mode
 * 
 * Use this for all projected monetary values that need inflation adjustment.
 * Current year values (year undefined or equal to current) are not adjusted.
 * 
 * @example
 * ```tsx
 * // Future projected value
 * <InflationAwareTrackedValue
 *   value={1500000}
 *   year={2035}
 *   inflationRate={3}
 *   name="Projected Net Worth"
 *   description="Your net worth in 2035"
 *   formula="Current NW × (1 + rate)^years"
 * />
 * 
 * // Current value (no adjustment)
 * <InflationAwareTrackedValue
 *   value={500000}
 *   name="Current Net Worth"
 *   description="Your net worth today"
 *   formula="Sum of all assets"
 * />
 * ```
 */
export function InflationAwareTrackedValue({
  value,
  year,
  inflationRate = 3,
  name,
  description,
  formula,
  inputs = [],
  steps = [],
  decimals = 2,
  className = '',
  unit = '$',
  formatAs,
  showModeIndicator = false,
}: InflationAwareTrackedValueProps) {
  const { adjustValue, currentYear, mode, modeLabelShort } = useInflationDisplay();
  
  const targetYear = year ?? currentYear;
  const isFutureValue = targetYear > currentYear;
  const displayValue = adjustValue(value, targetYear, inflationRate);
  
  // Add inflation info to description and inputs
  const enhancedDescription = isFutureValue
    ? `${description}${mode === 'real' ? " (shown in today's purchasing power)" : " (shown as future amount)"}`
    : description;
  
  const enhancedInputs: SimpleInput[] = [
    ...inputs,
    ...(isFutureValue ? [
      { name: 'Display Mode', value: modeLabelShort },
      { name: 'Inflation Rate', value: `${inflationRate}%` },
      { name: 'Years from now', value: targetYear - currentYear },
    ] : []),
  ];
  
  return (
    <span className="inline-flex items-center gap-1">
      <SimpleTrackedValue
        value={displayValue}
        name={name}
        description={enhancedDescription}
        formula={formula}
        inputs={enhancedInputs}
        steps={steps}
        decimals={decimals}
        className={className}
        unit={unit}
        formatAs={formatAs}
      />
      {showModeIndicator && isFutureValue && (
        <span className={`text-xs ${mode === 'real' ? 'text-emerald-400/60' : 'text-amber-400/60'}`}>
          ({modeLabelShort})
        </span>
      )}
    </span>
  );
}

/**
 * Shorthand for common inflation-aware currency display
 */
export function InflationAwareCurrency({
  value,
  year,
  inflationRate = 3,
  name,
  className = '',
  showModeIndicator = false,
}: {
  value: number;
  year?: number;
  inflationRate?: number;
  name?: string;
  className?: string;
  showModeIndicator?: boolean;
}) {
  const { adjustValue, currentYear, mode, modeLabelShort } = useInflationDisplay();
  
  const targetYear = year ?? currentYear;
  const isFutureValue = targetYear > currentYear;
  const displayValue = adjustValue(value, targetYear, inflationRate);
  
  const formatted = displayValue.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  
  return (
    <span 
      className={className}
      title={name ? `${name}${isFutureValue ? ` - ${mode === 'real' ? "today's dollars" : "future dollars"}` : ''}` : undefined}
    >
      {formatted}
      {showModeIndicator && isFutureValue && (
        <span className={`ml-1 text-xs ${mode === 'real' ? 'text-emerald-400/60' : 'text-amber-400/60'}`}>
          ({modeLabelShort})
        </span>
      )}
    </span>
  );
}

/**
 * Hook to get an inflation-adjusted value
 */
export function useInflationAdjustedValue(
  nominalValue: number,
  year: number | undefined,
  inflationRate: number = 3
): { displayValue: number; isFuture: boolean; mode: string } {
  const { adjustValue, currentYear, mode, modeLabelShort } = useInflationDisplay();
  
  const targetYear = year ?? currentYear;
  const isFuture = targetYear > currentYear;
  const displayValue = adjustValue(nominalValue, targetYear, inflationRate);
  
  return { displayValue, isFuture, mode: modeLabelShort };
}
