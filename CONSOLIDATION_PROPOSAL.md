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

### Dashboard Complexity Analysis

The home page currently has **3 cards with 11 sub-sections**:

```
┌─────────────────────────────────────────────────────────────┐
│  CARD 1: Current Net Worth                                  │
│  ├── Real-time net worth display                           │
│  ├── Base Amount + Appreciation breakdown                  │
│  └── Last updated time                                      │
├─────────────────────────────────────────────────────────────┤
│  CARD 2: Metrics                                            │
│  ├── Appreciation Rate (per sec/min/hour/day/year)         │
│  ├── Safe Withdrawal Rate (annual/monthly)                 │
│  ├── Monthly Spending Budget (with breakdown)              │
│  └── FI Progress (target + percentage) ←── DUPLICATE       │
├─────────────────────────────────────────────────────────────┤
│  CARD 3: FI Milestones                                      │
│  ├── Progress Overview (bar + next milestone) ←── DUPLICATE│
│  ├── Runway Milestones (6mo, 1yr, 2yr, 5yr, 10yr)         │
│  ├── Coast Milestones (25%, 50%, 75%, 100%)               │
│  ├── Retirement Income ($20k, $30k, $40k...)              │
│  ├── Progress Milestones (10%, 25%, 50%, 75%, 100%)       │
│  ├── Lifestyle Milestones (Lean, Regular, Fat FI)         │
│  └── Special Milestones (Crossover)                        │
└─────────────────────────────────────────────────────────────┘
```

**Problems:**
1. FI Progress shown in BOTH Metrics card AND Milestones card
2. Progress Milestones (10-100%) are just another view of FI Progress %
3. Runway, Coast, and Retirement Income are 3 ways of asking "how secure am I?"
4. Lifestyle milestones (Lean/Fat FI) overlap with percentage milestones
5. Too much scrolling to see everything
6. Cognitive overload - user can't focus on what matters

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

### 4. Unified Dashboard Design

**Before:** 3 cards, 11 sub-sections, redundant information everywhere

**After:** 2 cards with clear hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  CARD 1: Your Money (Current State)                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  $847,234.56                    [scenario indicator]    ││
│  │  ↑ $2.34/sec · $8,472/day · $141,205/yr appreciation   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Safe to      │  │ Monthly      │  │ Runway       │      │
│  │ Withdraw     │  │ Budget       │  │              │      │
│  │ $2,824/mo    │  │ $4,200/mo    │  │ 16.8 years   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CARD 2: Your Progress (Journey to FI)                      │
│                                                             │
│  [=============================............] 67.4%          │
│   0%      25%      50%      75%     100%                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🎯 Next: 75% FI ($63,200 to go) · 2027 (age 42)        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Key Numbers:                                               │
│  • Coast to 142% FI if you stopped saving now              │
│  • $47,800/yr retirement income (today's dollars)          │
│  • FI target: $1.26M at current spending                   │
│                                                             │
│  [▼ Show all milestones]  ← expandable, collapsed default  │
└─────────────────────────────────────────────────────────────┘
```

**Key Design Principles:**

1. **Card 1 = Present** (what you have now)
2. **Card 2 = Future** (where you're going)
3. **One progress bar** (not duplicated)
4. **Three key metrics** that answer different questions:
   - **Runway**: "How long could I survive without income?"
   - **Coast %**: "What if I stopped saving today?"
   - **Retirement Income**: "What lifestyle can I afford at 65?"
5. **Milestones collapsed by default** — power users can expand

### Current vs New Information Architecture

| Current (11 sections) | New (6 sections) | What Changed |
|----------------------|------------------|--------------|
| Net Worth display | Your Money → hero number | Same |
| Appreciation Rate (5 time periods) | Your Money → single line | Condensed to one line |
| Safe Withdrawal Rate | Your Money → "Safe to Withdraw" | Kept, renamed |
| Monthly Spending Budget | Your Money → "Monthly Budget" | Kept |
| FI Progress (in Metrics) | **REMOVED** (duplicate) | Merged into Progress card |
| Progress Overview | Your Progress → progress bar | Kept |
| Runway Milestones (5 items) | Your Progress → "Runway" number | Single number, details in expandable |
| Coast Milestones (4 items) | Your Progress → "Coast to X%" | Single number, details in expandable |
| Retirement Income (5+ items) | Your Progress → "$X/yr income" | Single number, details in expandable |
| Progress Milestones (5 items) | Your Progress → progress bar markers | Built into the bar |
| Lifestyle Milestones (3 items) | Expandable section | Only if user wants detail |
| Special Milestones (1 item) | Expandable section | Only if user wants detail |

### The Unified Milestone List (Expandable)

When the user clicks "Show all milestones", they see ONE sorted list:

```tsx
interface UnifiedMilestone {
  name: string;           // "50% FI", "2-Year Runway", "Coast to 100%"
  isAchieved: boolean;
  year: number | null;
  age: number | null;
  amountNeeded: number;   // $0 if achieved
}

// All milestones sorted by: achieved first, then by year/amount
const milestones = [
  { name: "6-Month Runway", isAchieved: true, year: 2021, ... },
  { name: "1-Year Runway", isAchieved: true, year: 2022, ... },
  { name: "25% FI", isAchieved: true, year: 2023, ... },
  { name: "Coast to 50%", isAchieved: true, year: 2024, ... },
  // --- achieved above, upcoming below ---
  { name: "50% FI", isAchieved: false, year: 2026, amountNeeded: 42000 },
  { name: "2-Year Runway", isAchieved: false, year: 2026, ... },
  { name: "Lean FI", isAchieved: false, year: 2027, ... },
  ...
];
```

This replaces 6 separate filtered lists with ONE unified, sortable list.

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

### Phase 1: Dashboard Consolidation (High Impact, User-Facing)

**Goal:** Transform the 11-section dashboard into a clean 2-card layout

1. **Create new `DashboardCard` component** with:
   - Hero net worth number with inline growth rate
   - 3-metric grid (SWR, Budget, Runway)
   
2. **Create new `ProgressCard` component** with:
   - Single progress bar with milestone markers
   - "Next milestone" highlight
   - 3 key numbers (Coast %, Retirement Income, FI Target)
   - Expandable unified milestone list

3. **Delete old components:**
   - Remove 6 separate milestone section renderers
   - Remove duplicate FI Progress display
   - Remove verbose appreciation rate grid (6 values → 1 line)

**Estimated code reduction:** ~400 lines from page.tsx

### Phase 2: Data Model Simplification

1. **Delete `useFinancials.ts`** — Unused legacy code
2. **Consolidate milestone types** — 6 types → 1 unified model
3. **Remove `/projections` route** — Already just redirects

**Files affected:**
- Delete: `src/lib/useFinancials.ts`
- Simplify: `src/lib/calculations.ts` (remove 6 milestone creator functions)
- Simplify: `src/lib/trackedScenarioValues.ts` (remove specialized create functions)

### Phase 3: Tab Structure

1. **Merge Projections into Scenarios tab**
2. **Rename Entries → History**
3. **Result:** 3 tabs (Dashboard, History, Scenarios)

### Phase 4: Library Refactor (Lower Priority)

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

### Quantitative

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Dashboard cards | 3 | 2 | 33% |
| Dashboard sections | 11 | 6 | 45% |
| Milestone type handlers | 6 | 1 | 83% |
| Tabs | 4 | 3 | 25% |
| Custom hooks | 2 | 1 | 50% |
| Lines in page.tsx | ~5000 | ~3000 | 40% |
| TrackedValue create functions | 12+ | 1 | 90%+ |
| Scrolling required on Dashboard | ~3 screens | ~1.5 screens | 50% |

### Qualitative

| Aspect | Before | After |
|--------|--------|-------|
| **User Focus** | Scattered across 11 sections | Clear hierarchy: Money → Progress |
| **Key Question** | Buried in noise | Front and center: "67.4% to FI" |
| **Cognitive Load** | High (remember where things are) | Low (everything in 2 cards) |
| **Mobile Experience** | Lots of scrolling | Most info above fold |
| **New User Onboarding** | Overwhelming | Clear story: here's what you have, here's where you're going |

---

## Detailed Dashboard Mockup

### Card 1: Your Money (Current State)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                        ┌─────────────────────┐                     │
│                        │ 🟢 Base Plan        │  ← scenario chip    │
│                        └─────────────────────┘                     │
│                                                                     │
│                        $847,234.56                                 │
│                        ═══════════                                 │
│                     ↑ $2.34/sec · $141K/yr                         │
│                                                                     │
│         (click any number to see how it's calculated)              │
│                                                                     │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│  │ 💰 Safe to       │ │ 🏠 Monthly       │ │ 🛡️ Runway        │   │
│  │    Withdraw      │ │    Budget        │ │                  │   │
│  │                  │ │                  │ │                  │   │
│  │  $2,824/mo       │ │  $4,200/mo       │ │  16.8 years      │   │
│  │  $33,889/yr      │ │  $50,400/yr      │ │                  │   │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**What each metric answers:**
- **Safe to Withdraw**: "How much can I spend forever without running out?"
- **Monthly Budget**: "What's my current spending level?"
- **Runway**: "If I lost my income today, how long before I'm broke?"

### Card 2: Your Progress (Journey to FI)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Your FI Journey                                                   │
│                                                                     │
│  [███████████████████████████████░░░░░░░░░░░░░] 67.4%              │
│   ↑         ↑              ↑              ↑          ↑             │
│   0%       25%            50%            75%       100%            │
│            ✓              ✓                                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🎯 Next Milestone: 75% FI                                  │   │
│  │     $95,600 to go · Expected 2027 (age 42)                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌───────────────────┐ ┌───────────────────┐ ┌─────────────────┐   │
│  │ If you stopped    │ │ Retirement Income │ │ FI Target       │   │
│  │ saving today...   │ │ at 65 (today's $) │ │                 │   │
│  │                   │ │                   │ │                 │   │
│  │ Coast to 142% FI  │ │ $47,800/year      │ │ $1,260,000      │   │
│  │ by age 65         │ │ $3,983/month      │ │                 │   │
│  └───────────────────┘ └───────────────────┘ └─────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ▶ View all 23 milestones (14 achieved)                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**What each metric answers:**
- **Coast %**: "What if I stopped contributing and let it grow?"
- **Retirement Income**: "What lifestyle can I afford at 65?"
- **FI Target**: "What's my finish line?"

### Expanded Milestone List (When Clicked)

```
┌─────────────────────────────────────────────────────────────────────┐
│  All Milestones                                          [Collapse] │
│                                                                     │
│  ✅ Achieved                                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  ✓ 6-Month Runway          2021   age 36                           │
│  ✓ 1-Year Runway           2022   age 37                           │
│  ✓ 10% FI                  2022   age 37                           │
│  ✓ 25% FI                  2023   age 38                           │
│  ✓ Coast to 25%            2023   age 38                           │
│  ✓ 2-Year Runway           2024   age 39                           │
│  ✓ Coast to 50%            2024   age 39                           │
│  ✓ 50% FI                  2025   age 40                           │
│  ✓ Barista FI              2025   age 40                           │
│  ✓ $30k Retirement Income  2025   age 40                           │
│  ... (4 more)                                                       │
│                                                                     │
│  ⏳ Upcoming                                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  ○ 75% FI                  2027   age 42   $95,600 to go           │
│  ○ 5-Year Runway           2027   age 42   $108,000 to go          │
│  ○ Lean FI                 2028   age 43   $142,000 to go          │
│  ○ Coast to 100%           2028   age 43   $156,000 to go          │
│  ○ $50k Retirement Income  2029   age 44   $189,000 to go          │
│  ○ 100% FI                 2030   age 45   $412,766 to go          │
│  ○ Crossover Point         2030   age 45                           │
│  ○ Fat FI                  2033   age 48   $876,000 to go          │
│  ○ 10-Year Runway          2034   age 49   $924,000 to go          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key improvements:**
1. **One sorted list** instead of 6 separate sections
2. **Clear achieved/upcoming split**
3. **All milestone types mixed together** (runway, coast, percentage, lifestyle)
4. **Consistent format** for every milestone
5. **Amount to go** shown for upcoming milestones

---

## The Core Insight

Your app answers one question: **"Am I on track for financial independence?"**

Everything else—milestones, projections, scenarios—are just different lenses on that question. The eigensolution is to model that question directly, then derive all views from it, rather than building separate systems for each view.

The current architecture evolved organically (which is natural), but now it's time to recognize the underlying unity and refactor toward it.

---

## Summary: What Changes, What Stays

### Removed (Redundant)
- ❌ Duplicate FI Progress displays
- ❌ 6 separate milestone sections
- ❌ Verbose appreciation rate grid (6 values)
- ❌ `useFinancials` hook
- ❌ 12+ milestone create functions

### Consolidated (Unified)
- 🔄 6 milestone types → 1 unified model with views
- 🔄 11 dashboard sections → 6 sections in 2 cards
- 🔄 4 tabs → 3 tabs
- 🔄 Projections tab → merged into Scenarios

### Kept (Valuable)
- ✅ Real-time net worth updates
- ✅ Click-to-see-calculation transparency
- ✅ Scenario comparison
- ✅ All milestone tracking (just unified, not removed)
- ✅ Tax calculations
- ✅ Level-based spending
- ✅ Income projections

---

## Next Steps

1. **Review this proposal** — Does this match your vision?
2. **Pick a starting point** — I recommend Phase 1 (Dashboard consolidation) first since it's the most user-facing
3. **Iterate** — We can adjust as we go

Let me know which direction resonates, and I'll start implementing.
