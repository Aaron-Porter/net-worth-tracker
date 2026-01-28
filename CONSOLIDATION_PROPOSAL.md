# App Consolidation Proposal: Chasing the Eigensolution

## Executive Summary

After reviewing the codebase, I've identified several areas where bespoke features can be unified without losing functionality. The goal is to find the **eigensolution**—the minimal, elegant abstraction that captures all functionality while dramatically simplifying the mental model and codebase.

---

## Current Architecture Analysis

### What You Have Now

```
┌─────────────────────────────────────────────────────────────┐
│  4 Tabs: Dashboard │ Entries │ Projections │ Scenarios     │
├─────────────────────────────────────────────────────────────┤
│  6 Milestone Types: percentage, runway, coast, lifestyle,  │
│                     retirement_income, special             │
├─────────────────────────────────────────────────────────────┤
│  2 Hooks: useScenarios (primary) + useFinancials (legacy)  │
├─────────────────────────────────────────────────────────────┤
│  3 Calculation Files: calculations.ts (139KB),             │
│                       calculationTrace.ts, trackedValues.ts│
├─────────────────────────────────────────────────────────────┤
│  2 Projection Views: Table (yearly/monthly) + Chart        │
├─────────────────────────────────────────────────────────────┤
│  3 Scenario Access Points: Tab, Panel in Projections,      │
│                            Editor Modal                     │
└─────────────────────────────────────────────────────────────┘
```

### Core Issues

1. **Multiple ways to express the same concept** (milestones, progress metrics)
2. **Overlapping hooks** with duplicated logic
3. **Scattered scenario management** across multiple UI surfaces
4. **Calculation library has grown into a monolith**
5. **Too many milestone types** that are variations of the same core question: "When can I stop working?"

---

## The Eigensolution: One Core Concept

### The Insight

All your FI milestones are actually variations of **one question**:

> **"Given my current net worth and trajectory, what lifestyle can I sustain, and when?"**

The different "milestone types" are just different framings:
- **Percentage milestones** → % of full FI
- **Runway milestones** → months/years of expenses covered
- **Coast milestones** → % of FI you'll reach if you stop saving now
- **Lifestyle milestones** → multipliers of base spending (lean/fat)
- **Retirement income** → projected income at age 65
- **Special milestones** (crossover) → when passive income > contributions

All of these can be derived from **one unified model**:

```typescript
interface FinancialState {
  netWorth: number;
  monthlySpending: number;
  annualSavings: number;
  returnRate: number;
  inflationRate: number;
  swr: number;
  currentAge: number | null;
  retirementAge: number;
}
```

From this single state, you can compute ANY milestone as a simple function.

---

## Proposed Consolidated Architecture

### 1. Unified Progress Model (Replaces 6 Milestone Types)

**Before:** 6 separate milestone type handlers with complex create functions

**After:** One `FiProgress` type with computed views

```typescript
interface FiProgress {
  // Core metrics (the "eigenvalues")
  percentOfFi: number;           // 0-100+, replaces percentage milestones
  runwayYears: number;           // years of expenses covered, replaces runway milestones
  coastToPercentAtRetirement: number; // what % FI you'd hit if you stop now
  
  // Derived views (computed on demand, not stored)
  isLeanFi: boolean;             // percentOfFi >= 70
  isFatFi: boolean;              // percentOfFi >= 150
  isCoastFi: boolean;            // coastToPercentAtRetirement >= 100
  isCrossover: boolean;          // passive income > contributions
  
  // Year projections
  yearToReach: (targetPercent: number) => number | null;
  ageToReach: (targetPercent: number) => number | null;
}
```

This eliminates:
- `createTrackedPercentageMilestone`
- `createTrackedRunwayMilestone`
- `createTrackedCoastMilestone`
- `createTrackedLifestyleMilestone`
- `createTrackedRetirementIncomeMilestone`
- `createTrackedCrossoverMilestone`

And replaces them with **one function** that computes everything.

### 2. Merge Hooks (useScenarios absorbs useFinancials)

**Before:** Two hooks with overlapping concerns

**After:** Single `useScenarios` hook (delete `useFinancials.ts`)

The `useFinancials` hook appears to be legacy code. All its functionality is already in `useScenarios`. Simply delete it and update any imports.

### 3. Consolidated Tab Structure

**Before:** 4 tabs with overlapping content

**After:** 3 focused tabs

```
┌────────────────────────────────────────────────┐
│  Dashboard    │  History    │  Scenarios       │
├────────────────────────────────────────────────┤
│  - Current NW │  - Entries  │  - List/Compare  │
│  - Progress   │  - Chart    │  - Edit/Create   │
│  - Milestones │             │  - Projections   │
│  - Metrics    │             │                  │
└────────────────────────────────────────────────┘
```

**Changes:**
- **Merge "Projections" into "Scenarios"** — Projections only make sense in the context of scenarios. They're intrinsically linked.
- **Rename "Entries" to "History"** — Clearer, and could expand to show net worth chart over time
- **Dashboard stays focused** — Current state and progress, not future projections

### 4. Simplified Milestone Display

**Before:** Dashboard shows 6 sections of milestones (Runway, Coast, Retirement Income, Progress, Lifestyle, Special)

**After:** One unified "Progress" section with configurable views

```tsx
// Instead of 6 separate milestone sections, one unified view
<ProgressCard>
  <ProgressBar percent={fiProgress.percentOfFi} />
  
  <MetricRow label="Runway" value={`${fiProgress.runwayYears} years`} />
  <MetricRow label="Coast to" value={`${fiProgress.coastToPercentAtRetirement}% FI`} />
  <MetricRow label="Next milestone" value={nextMilestone.name} eta={nextMilestone.yearsAway} />
  
  <ExpandableSection title="All Milestones">
    {/* Simple list, not 6 separate sections */}
    <MilestoneList milestones={milestones} />
  </ExpandableSection>
</ProgressCard>
```

### 5. Calculation Library Refactor

**Before:** One 139KB `calculations.ts` file

**After:** Split into focused modules

```
src/lib/calculations/
├── index.ts              # Re-exports, main types
├── core.ts              # Core financial math (compound growth, SWR)
├── projections.ts       # Year-by-year and monthly projections
├── taxes.ts             # Federal, state, FICA calculations
├── progress.ts          # FI progress and milestones (unified)
├── spending.ts          # Level-based spending calculations
└── formatters.ts        # Currency, date, percent formatting
```

Each file is focused and testable. Total code likely reduces by 30-40% through consolidation.

### 6. TrackedValue Simplification

**Before:** Complex tracing system with many specialized create functions

**After:** Simpler approach—trace on demand, not everywhere

The TrackedValue system is clever but adds significant complexity. Consider:

1. **Keep the tooltip mechanism** — users clicking to see calculation details is valuable
2. **Simplify the trace creation** — use a single generic function instead of 10+ specialized ones
3. **Lazy trace computation** — only build the trace when the user clicks, not for every render

```typescript
// Instead of 10+ specialized create functions:
function traceValue(
  value: number,
  name: string,
  inputs: Record<string, number>,
  formula: string
): TrackedValue {
  return {
    value,
    trace: { name, inputs, formula, /* ... */ }
  };
}
```

---

## Implementation Priorities

### Phase 1: Quick Wins (Low Risk, High Impact)

1. **Delete `useFinancials.ts`** — It's unused legacy code
2. **Remove `/projections` route** — It already just redirects to main page
3. **Consolidate milestone types into one model** — Biggest code reduction

### Phase 2: UI Consolidation (Medium Risk)

1. **Merge Projections tab into Scenarios tab**
2. **Simplify Dashboard milestone display**
3. **Rename Entries → History, add net worth chart**

### Phase 3: Library Refactor (Higher Risk, Do Last)

1. **Split calculations.ts into modules**
2. **Simplify TrackedValue system**
3. **Clean up unused code paths**

---

## What You're NOT Losing

This consolidation preserves:

✅ All milestone tracking (just unified, not removed)
✅ Scenario comparison
✅ Tax calculations
✅ Real-time net worth updates
✅ Calculation transparency (click to see details)
✅ Income-based projections
✅ Level-based spending
✅ Monthly and yearly projections

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Tabs | 4 | 3 |
| Milestone types | 6 | 1 (with views) |
| Custom hooks | 2 | 1 |
| Calculation files | 3 (139KB total) | 6 (~70KB total) |
| Lines in page.tsx | ~5000 | ~3000 |
| TrackedValue create functions | 12+ | 1 |

---

## The Core Insight

Your app answers one question: **"Am I on track for financial independence?"**

Everything else—milestones, projections, scenarios—are just different lenses on that question. The eigensolution is to model that question directly, then derive all views from it, rather than building separate systems for each view.

The current architecture evolved organically (which is natural), but now it's time to recognize the underlying unity and refactor toward it.

---

## Next Steps

1. **Review this proposal** — Does this match your vision?
2. **Pick a starting point** — I recommend Phase 1 (quick wins) first
3. **Iterate** — We can adjust as we go

Let me know which direction resonates, and I'll start implementing.
