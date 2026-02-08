/**
 * TrackedNumber — Immutable wrapper that makes every arithmetic operation self-documenting.
 *
 * Each TrackedNumber carries a `TrackedCalculation` trace tree.  Arithmetic
 * methods (add, subtract, multiply, divide, pow) return new instances whose
 * traces reference both operands as drillable inputs.  Leaf nodes (settings,
 * constants, inputs) are terminal.  Convert to the existing `TrackedValue` type
 * via `.toTrackedValue()` so the existing `<TrackedValue>` component works
 * unchanged.
 */

import type {
  TrackedCalculation,
  TrackedValue,
  CalculationCategory,
  CalculationInput,
  ValueSource,
} from './calculationTrace';

// ============================================================================
// OPTIONS
// ============================================================================

export interface TrackedNumberOpts {
  /** Human-readable name for this value */
  name?: string;
  /** Unit for display ('$', '%', 'years', etc.) */
  unit?: string;
  /** Short description shown in tooltips */
  description?: string;
  /** Calculation category */
  category?: CalculationCategory;
  /** Override the formula string */
  formula?: string;
}

// ============================================================================
// TRACKED NUMBER CLASS
// ============================================================================

let _idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}_${++_idCounter}`;
}

export class TrackedNumber {
  /** The raw numeric value */
  readonly value: number;
  /** Full calculation trace */
  readonly trace: TrackedCalculation;

  /** @internal — use static factories instead */
  constructor(value: number, trace: TrackedCalculation) {
    this.value = value;
    this.trace = trace;
  }

  /** Alias for `.value` — handy in expressions */
  get val(): number {
    return this.value;
  }

  // --------------------------------------------------------------------------
  // Static factories — leaf nodes in the trace tree
  // --------------------------------------------------------------------------

  /** General purpose leaf node */
  static from(value: number, name: string, opts?: TrackedNumberOpts): TrackedNumber {
    return new TrackedNumber(value, {
      id: nextId('tn'),
      name,
      description: opts?.description ?? '',
      category: opts?.category ?? 'projection',
      formula: opts?.formula ?? `= ${value}`,
      inputs: [],
      result: value,
      unit: opts?.unit ?? '',
      timestamp: Date.now(),
    });
  }

  /** Scenario setting (source: 'setting') */
  static setting(
    value: number,
    name: string,
    settingKey: string,
    opts?: TrackedNumberOpts,
  ): TrackedNumber {
    const tn = TrackedNumber.from(value, name, opts);
    // Mark the single implicit input as a setting
    return new TrackedNumber(value, {
      ...tn.trace,
      inputs: [
        {
          name,
          value,
          unit: opts?.unit,
          source: 'setting' as ValueSource,
          settingKey,
          description: opts?.description ?? `From scenario setting: ${settingKey}`,
        },
      ],
    });
  }

  /** Fixed constant (source: 'constant') */
  static constant(value: number, name: string, opts?: TrackedNumberOpts): TrackedNumber {
    const tn = TrackedNumber.from(value, name, opts);
    return new TrackedNumber(value, {
      ...tn.trace,
      inputs: [
        {
          name,
          value,
          unit: opts?.unit,
          source: 'constant' as ValueSource,
          description: opts?.description,
        },
      ],
    });
  }

  /** User input (source: 'input') */
  static input(value: number, name: string, opts?: TrackedNumberOpts): TrackedNumber {
    const tn = TrackedNumber.from(value, name, opts);
    return new TrackedNumber(value, {
      ...tn.trace,
      inputs: [
        {
          name,
          value,
          unit: opts?.unit,
          source: 'input' as ValueSource,
          description: opts?.description,
        },
      ],
    });
  }

  /** Interop: wrap an existing TrackedValue */
  static fromTrackedValue(tv: TrackedValue): TrackedNumber {
    return new TrackedNumber(tv.value, tv.trace);
  }

  // --------------------------------------------------------------------------
  // Arithmetic methods — internal nodes in the trace tree
  // --------------------------------------------------------------------------

  private static _binaryOp(
    left: TrackedNumber,
    right: TrackedNumber,
    op: '+' | '-' | '×' | '÷',
    result: number,
    opts?: TrackedNumberOpts,
  ): TrackedNumber {
    const opWord =
      op === '+' ? 'plus' : op === '-' ? 'minus' : op === '×' ? 'times' : 'div';
    const name = opts?.name ?? `${left.trace.name} ${op} ${right.trace.name}`;
    const formula = opts?.formula ?? `${left.trace.name} ${op} ${right.trace.name}`;
    const unit = opts?.unit ?? left.trace.unit;

    const leftInput: CalculationInput = {
      name: left.trace.name,
      value: left.value,
      unit: left.trace.unit || undefined,
      source: left.trace.inputs.length <= 1 && left.trace.inputs[0]?.source
        ? left.trace.inputs[0].source
        : 'calculated',
      trace: left.trace.inputs.length > 0 || left.trace.steps ? left.trace : undefined,
    };

    const rightInput: CalculationInput = {
      name: right.trace.name,
      value: right.value,
      unit: right.trace.unit || undefined,
      source: right.trace.inputs.length <= 1 && right.trace.inputs[0]?.source
        ? right.trace.inputs[0].source
        : 'calculated',
      trace: right.trace.inputs.length > 0 || right.trace.steps ? right.trace : undefined,
    };

    return new TrackedNumber(result, {
      id: nextId(`tn_${opWord}`),
      name,
      description: opts?.description ?? '',
      category: opts?.category ?? left.trace.category,
      formula,
      inputs: [leftInput, rightInput],
      result,
      unit,
      timestamp: Date.now(),
    });
  }

  add(other: TrackedNumber, opts?: TrackedNumberOpts): TrackedNumber {
    return TrackedNumber._binaryOp(this, other, '+', this.value + other.value, opts);
  }

  subtract(other: TrackedNumber, opts?: TrackedNumberOpts): TrackedNumber {
    return TrackedNumber._binaryOp(this, other, '-', this.value - other.value, opts);
  }

  multiply(other: TrackedNumber, opts?: TrackedNumberOpts): TrackedNumber {
    return TrackedNumber._binaryOp(this, other, '×', this.value * other.value, opts);
  }

  divide(other: TrackedNumber, opts?: TrackedNumberOpts): TrackedNumber {
    if (other.value === 0) {
      return TrackedNumber.from(0, opts?.name ?? 'Division by zero', {
        ...opts,
        description: opts?.description ?? 'Division by zero — result is 0',
      });
    }
    return TrackedNumber._binaryOp(this, other, '÷', this.value / other.value, opts);
  }

  pow(exponent: TrackedNumber, opts?: TrackedNumberOpts): TrackedNumber {
    const result = Math.pow(this.value, exponent.value);
    const name = opts?.name ?? `${this.trace.name} ^ ${exponent.trace.name}`;
    const formula = opts?.formula ?? `${this.trace.name} ^ ${exponent.trace.name}`;
    const unit = opts?.unit ?? this.trace.unit;

    const baseInput: CalculationInput = {
      name: this.trace.name,
      value: this.value,
      unit: this.trace.unit || undefined,
      source: this.trace.inputs.length <= 1 && this.trace.inputs[0]?.source
        ? this.trace.inputs[0].source
        : 'calculated',
      trace: this.trace.inputs.length > 0 || this.trace.steps ? this.trace : undefined,
    };

    const expInput: CalculationInput = {
      name: exponent.trace.name,
      value: exponent.value,
      unit: exponent.trace.unit || undefined,
      source: exponent.trace.inputs.length <= 1 && exponent.trace.inputs[0]?.source
        ? exponent.trace.inputs[0].source
        : 'calculated',
      trace: exponent.trace.inputs.length > 0 || exponent.trace.steps ? exponent.trace : undefined,
    };

    return new TrackedNumber(result, {
      id: nextId('tn_pow'),
      name,
      description: opts?.description ?? '',
      category: opts?.category ?? this.trace.category,
      formula,
      inputs: [baseInput, expInput],
      result,
      unit,
      timestamp: Date.now(),
    });
  }

  // --------------------------------------------------------------------------
  // Conversion
  // --------------------------------------------------------------------------

  /** Convert to the TrackedValue type that `<TrackedValue>` accepts */
  toTrackedValue(): TrackedValue {
    return { value: this.value, trace: this.trace };
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/** Shorthand for `TrackedNumber.from` */
export function tn(value: number, name: string, unit?: string): TrackedNumber {
  return TrackedNumber.from(value, name, { unit });
}

/** Sum an array of TrackedNumbers */
export function sum(values: TrackedNumber[], opts?: TrackedNumberOpts): TrackedNumber {
  if (values.length === 0) {
    return TrackedNumber.from(0, opts?.name ?? 'Sum (empty)', opts);
  }
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = result.add(values[i]);
  }
  // Re-wrap with the caller's name/description if provided
  if (opts?.name) {
    return new TrackedNumber(result.value, {
      ...result.trace,
      id: nextId('tn_sum'),
      name: opts.name,
      description: opts.description ?? result.trace.description,
      unit: opts.unit ?? result.trace.unit,
      category: opts.category ?? result.trace.category,
    });
  }
  return result;
}
