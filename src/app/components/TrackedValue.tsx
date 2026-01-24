'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TrackedCalculation, TrackedValue as TrackedValueType, formatNumber } from '../../lib/calculationTrace'

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
  inputs?: Array<{ name: string; value: number | string; unit?: string }>;
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
          <div className="space-y-1">
            {trace.inputs.map((input, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <span className="text-slate-400">
                  {input.name}
                  {input.description && (
                    <span className="text-slate-600 ml-1">({input.description})</span>
                  )}
                </span>
                <span className="font-mono text-slate-200">
                  {typeof input.value === 'number' 
                    ? formatNumber(input.value, input.unit)
                    : String(input.value)}
                </span>
              </div>
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
      inputs: inputs.map(i => ({ ...i, value: i.value })),
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
