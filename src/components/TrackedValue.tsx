'use client'

import React, { useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { TrackedCalculation, TrackedValue as TrackedValueType, CalculationInput, ValueSource, formatNumber } from '../lib/calculationTrace'

// ============================================================================
// TYPES
// ============================================================================

interface TrackedValueProps {
  value: TrackedValueType;
  decimals?: number;
  className?: string;
  showCurrency?: boolean;
  formatter?: (value: number) => string;
  disabled?: boolean;
}

export interface SimpleInput {
  name: string;
  value: number | string;
  unit?: string;
  source?: ValueSource;
  settingKey?: string;
  trace?: TrackedCalculation;
}

interface SimpleTrackedValueProps {
  value: number;
  name: string;
  description: string;
  formula: string;
  inputs?: SimpleInput[];
  steps?: Array<{
    description: string;
    formula?: string;
    result?: number;
    unit?: string;
  }>;
  decimals?: number;
  className?: string;
  unit?: string;
  formatAs?: 'currency' | 'percent' | 'number';
}

// ============================================================================
// HELPERS
// ============================================================================

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

// ============================================================================
// INPUT DISPLAY (nested expandable)
// ============================================================================

function InputDisplay({ input, depth = 0 }: { input: CalculationInput; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const sourceDisplay = getSourceDisplay(input.source);
  const hasNestedTrace = input.trace && input.source === 'calculated';

  return (
    <div className={`text-xs ${depth > 0 ? 'ml-3 pl-3 border-l border-slate-700' : ''}`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {input.source && (
              <span className={`${sourceDisplay.color} text-[10px]`} title={sourceDisplay.label}>
                {sourceDisplay.icon}
              </span>
            )}
            <span className="text-slate-300 truncate">{input.name}</span>
            {input.settingKey && (
              <span className="text-violet-400/70 text-[10px] font-mono">({input.settingKey})</span>
            )}
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
          {input.description && !input.settingKey && (
            <div className="text-slate-500 text-[10px] mt-0.5 truncate">{input.description}</div>
          )}
        </div>
        <span className="font-mono text-slate-200 shrink-0">
          {typeof input.value === 'number'
            ? formatNumber(input.value, input.unit)
            : String(input.value)}
        </span>
      </div>

      {expanded && input.trace && (
        <div className="mt-2 bg-slate-900/50 rounded p-2 space-y-2">
          <div className="text-slate-400 text-[10px] font-medium mb-1">
            How {input.name} is calculated:
          </div>
          <div className="font-mono text-[10px] text-emerald-400/80 bg-slate-900/50 rounded px-2 py-1">
            {input.trace.formula}
          </div>
          {input.trace.inputs.length > 0 && (
            <div className="space-y-1">
              {input.trace.inputs.map((nestedInput, idx) => (
                <InputDisplay key={idx} input={nestedInput} depth={depth + 1} />
              ))}
            </div>
          )}
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

// ============================================================================
// CALCULATION POPOVER CONTENT
// ============================================================================

function CalculationPopoverContent({ trace, onClose }: { trace: TrackedCalculation; onClose: () => void }) {
  return (
    <>
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
                        = {formatNumber(step.intermediateResult, step.unit || trace.unit)}
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
    </>
  );
}

// ============================================================================
// MAIN COMPONENTS
// ============================================================================

export function TrackedValue({
  value,
  decimals = 2,
  className = '',
  showCurrency = true,
  formatter,
  disabled = false,
}: TrackedValueProps) {
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    if (disabled) return
    setOpen(true)
  }

  const displayValue = formatter
    ? formatter(value.value)
    : showCurrency
      ? formatNumber(value.value, '$')
      : value.value.toLocaleString('en-US', { maximumFractionDigits: decimals });

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        onClick={handleClick}
        render={
          <span
            className={`cursor-help border-b border-dotted border-current hover:border-emerald-400 hover:text-emerald-400 transition-colors ${className}`}
            title="Click to see calculation details"
          />
        }
      >
        {displayValue}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={8}>
          <Popover.Popup className="z-[100] bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 max-w-md text-sm">
            <CalculationPopoverContent trace={value.trace} onClose={() => setOpen(false)} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

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

  const formatFn = formatAs === 'percent'
    ? (v: number) => `${v.toFixed(decimals)}%`
    : undefined

  return (
    <TrackedValue
      value={trackedValue}
      decimals={decimals}
      className={className}
      showCurrency={displayUnit === '$'}
      formatter={formatFn}
    />
  )
}

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

export function CalculationCard({
  trace,
  className = '',
}: {
  trace: TrackedCalculation;
  className?: string;
}) {
  return (
    <div className={`bg-slate-800/50 rounded-lg p-4 border border-slate-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-200">{trace.name}</h3>
        <span className="text-xs text-slate-500 capitalize bg-slate-900/50 px-2 py-1 rounded">
          {trace.category.replace('_', ' ')}
        </span>
      </div>
      {trace.description && (
        <p className="text-slate-400 text-sm mb-3">{trace.description}</p>
      )}
      <div className="bg-slate-900/50 rounded-md p-3 mb-3 font-mono text-sm">
        <span className="text-emerald-400">{trace.formula}</span>
      </div>
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
      <div className="flex justify-between items-center pt-3 border-t border-slate-700">
        <span className="text-slate-400 font-medium">Result</span>
        <span className="font-mono text-xl text-emerald-400 font-semibold">
          {formatNumber(trace.result, trace.unit)}
        </span>
      </div>
    </div>
  )
}

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
