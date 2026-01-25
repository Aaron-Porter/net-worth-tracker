/**
 * Centralized Financial Calculations Module
 * 
 * All financial calculations should be derived from this module to ensure
 * consistency across the application. Settings are the single source of truth.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface UserSettings {
  currentRate: number;        // Expected annual return rate (e.g., 7 for 7%)
  swr: number;                // Safe withdrawal rate (e.g., 4 for 4%)
  yearlyContribution: number; // Annual contribution amount
  birthDate: string;          // YYYY-MM-DD format
  monthlySpend: number;       // Current monthly expenses
  inflationRate: number;      // Expected inflation rate (e.g., 3 for 3%)
  baseMonthlyBudget: number;  // Base spending floor for levels system
  spendingGrowthRate: number; // % of net worth allowed as additional spending
  incomeGrowthRate?: number;  // Annual income growth rate (e.g., 3 for 3%) - optional
}

export interface NetWorthEntry {
  _id: string;
  userId: string;
  amount: number;
  timestamp: number;
}

export interface ProjectionRow {
  year: number;
  age: number | null;
  yearsFromEntry: number;
  netWorth: number;
  interest: number;
  contributed: number;
  annualSwr: number;
  monthlySwr: number;
  weeklySwr: number;
  dailySwr: number;
  monthlySpend: number;      // Inflation-adjusted spending target
  annualSpending: number;     // Annual spending (monthlySpend * 12)
  annualSavings: number;      // Annual savings after spending increase is accounted for
  fiTarget: number;           // Net worth needed for FI
  fiProgress: number;         // Percentage toward FI (0-100+)
  coastFiYear: number | null;
  coastFiAge: number | null;
  isFiYear: boolean;          // First year where SWR covers expenses
  isCrossover: boolean;       // First year where interest > contributions
  swrCoversSpend: boolean;    // Whether SWR covers monthly spend
  // Tax information (only available when using dynamic projections)
  grossIncome?: number;       // Gross income for the year
  totalTax?: number;          // Total taxes paid (federal + state + FICA)
  netIncome?: number;         // After-tax income (grossIncome - totalTax - preTaxContributions)
  preTaxContributions?: number; // Pre-tax retirement contributions
}

/** Monthly projection row - for month-by-month detail where spending updates with net worth */
export interface MonthlyProjectionRow {
  month: number;              // Month number (1-12)
  year: number;               // Calendar year
  monthIndex: number;         // Sequential month index from start (0, 1, 2, ...)
  yearsFromStart: number;     // Fractional years from start
  netWorth: number;           // Net worth at end of month
  startingNetWorth: number;   // Net worth at start of month
  monthlyInterest: number;    // Interest earned this month
  monthlyContribution: number; // Contribution added this month
  monthlySpending: number;    // Spending for this month (based on start-of-month NW)
  monthlySavings: number;     // Net savings (contribution - spending) or (income - tax - spending)
  cumulativeInterest: number; // Total interest earned since start
  cumulativeContributions: number; // Total contributions since start
  monthlySwr: number;         // SWR amount for this month
  fiTarget: number;           // FI target based on this month's spending
  fiProgress: number;         // Progress to FI
  swrCoversSpend: boolean;    // Whether SWR covers this month's spending
}

export interface GrowthRates {
  perSecond: number;
  perMinute: number;
  perHour: number;
  perDay: number;
  perYear: number;
  yearlyAppreciation: number;
  yearlyContributions: number;
}

export interface LevelThreshold {
  level: number;
  name: string;
  threshold: number;
}

export interface LevelInfo {
  currentLevel: LevelThreshold & { monthlyBudget: number };
  currentLevelIndex: number;
  nextLevel: (LevelThreshold & { monthlyBudget: number }) | null;
  progressToNext: number;
  amountToNext: number;
  unlockedAtLevel: number;
  unlockedAtNetWorth: number;
  nextLevelSpendingIncrease: number;
  currentSpend: number;
  spendingStatus: 'within_budget' | 'slightly_over' | 'over_budget';
  levelsWithStatus: Array<LevelThreshold & {
    monthlyBudget: number;
    isUnlocked: boolean;
    isCurrent: boolean;
    isNext: boolean;
  }>;
  netWorth: number;
  baseBudgetOriginal: number;
  baseBudgetInflationAdjusted: number;
  spendingRate: number;
  netWorthPortion: number;
  yearsElapsed: number;
  inflation: number;
}

export interface RealTimeNetWorth {
  total: number;
  baseAmount: number;
  appreciation: number;
  contributions: number;
}

export interface CalculatedFinancials {
  currentNetWorth: RealTimeNetWorth;
  growthRates: GrowthRates;
  projections: ProjectionRow[];
  levelInfo: LevelInfo;
  fiYear: number | null;
  fiAge: number | null;
  crossoverYear: number | null;
  currentFiProgress: number;
  currentMonthlySwr: number;
  currentAnnualSwr: number;
}

// ============================================================================
// FI MILESTONES - Goals along the journey to 100% FI
// ============================================================================

export type FiMilestoneType = 
  | 'percentage'      // Based on FI progress percentage (10%, 25%, 50%, 75%, 100%)
  | 'lifestyle'       // Based on spending levels (Lean FI, Regular FI, Fat FI)
  | 'special'         // Special milestones (Coast FI, Barista FI, Crossover)
  | 'security'        // Short-term security milestones (emergency fund, runway targets)
  | 'compounding';    // Compounding advantage milestones (when money works harder for you)

export interface FiMilestone {
  id: string;
  name: string;
  shortName: string;
  description: string;
  type: FiMilestoneType;
  // For percentage milestones, this is the FI progress % target
  // For lifestyle milestones, this is a multiplier of base spending
  targetValue: number;
  // When this milestone was/will be achieved
  year: number | null;
  age: number | null;
  yearsFromNow: number | null;
  // Status
  isAchieved: boolean;
  // The net worth at achievement (actual or projected)
  netWorthAtMilestone: number | null;
  // For display - color/icon hints
  color: string;
  icon: string;
}

export interface FiMilestonesInfo {
  milestones: FiMilestone[];
  currentMilestone: FiMilestone | null;  // Most recently achieved
  nextMilestone: FiMilestone | null;     // Next to achieve
  progressToNext: number;                 // 0-100
  amountToNext: number;                   // $ needed
}

// Predefined milestone definitions
export interface FiMilestoneDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  type: FiMilestoneType;
  targetValue: number;
  color: string;
  icon: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const LEVEL_THRESHOLDS: readonly LevelThreshold[] = [
  { level: 1, name: 'Starter', threshold: 0 },
  { level: 2, name: 'Saver', threshold: 10000 },
  { level: 3, name: 'Builder', threshold: 25000 },
  { level: 4, name: 'Momentum', threshold: 50000 },
  { level: 5, name: 'Foundation', threshold: 75000 },
  { level: 6, name: 'Traction', threshold: 100000 },
  { level: 7, name: 'Accelerator', threshold: 150000 },
  { level: 8, name: 'Velocity', threshold: 200000 },
  { level: 9, name: 'Milestone', threshold: 250000 },
  { level: 10, name: 'Cruising', threshold: 300000 },
  { level: 11, name: 'Advancing', threshold: 350000 },
  { level: 12, name: 'Thriving', threshold: 400000 },
  { level: 13, name: 'Flourishing', threshold: 450000 },
  { level: 14, name: 'Half Million', threshold: 500000 },
  { level: 15, name: 'Expanding', threshold: 550000 },
  { level: 16, name: 'Growing', threshold: 600000 },
  { level: 17, name: 'Ascending', threshold: 650000 },
  { level: 18, name: 'Rising', threshold: 700000 },
  { level: 19, name: 'Surging', threshold: 750000 },
  { level: 20, name: 'Climbing', threshold: 800000 },
  { level: 21, name: 'Soaring', threshold: 850000 },
  { level: 22, name: 'Elevating', threshold: 900000 },
  { level: 23, name: 'Approaching', threshold: 950000 },
  { level: 24, name: 'Millionaire', threshold: 1000000 },
  { level: 25, name: 'Established', threshold: 1100000 },
  { level: 26, name: 'Prospering', threshold: 1200000 },
  { level: 27, name: 'Abundant', threshold: 1300000 },
  { level: 28, name: 'Wealthy', threshold: 1400000 },
  { level: 29, name: 'Accomplished', threshold: 1500000 },
  { level: 30, name: 'Distinguished', threshold: 1750000 },
  { level: 31, name: 'Double Million', threshold: 2000000 },
  { level: 32, name: 'Exceptional', threshold: 2250000 },
  { level: 33, name: 'Remarkable', threshold: 2500000 },
  { level: 34, name: 'Outstanding', threshold: 2750000 },
  { level: 35, name: 'Triple Million', threshold: 3000000 },
  { level: 36, name: 'Elite', threshold: 3500000 },
  { level: 37, name: 'Premier', threshold: 4000000 },
  { level: 38, name: 'Pinnacle', threshold: 4500000 },
  { level: 39, name: 'Five Million', threshold: 5000000 },
  { level: 40, name: 'Apex', threshold: 6000000 },
  { level: 41, name: 'Summit', threshold: 7000000 },
  { level: 42, name: 'Zenith', threshold: 8000000 },
  { level: 43, name: 'Crown', threshold: 9000000 },
  { level: 44, name: 'Decamillionaire', threshold: 10000000 },
  { level: 45, name: 'Titan', threshold: 15000000 },
  { level: 46, name: 'Magnate', threshold: 20000000 },
  { level: 47, name: 'Mogul', threshold: 30000000 },
  { level: 48, name: 'Tycoon', threshold: 50000000 },
  { level: 49, name: 'Dynasty', threshold: 75000000 },
  { level: 50, name: 'Legacy', threshold: 100000000 },
] as const;

export const DEFAULT_SETTINGS: UserSettings = {
  currentRate: 7,
  swr: 4,
  yearlyContribution: 0,
  birthDate: '',
  monthlySpend: 0,
  inflationRate: 3,
  baseMonthlyBudget: 3000,
  spendingGrowthRate: 2,
};

/**
 * FI Milestone Definitions
 * These represent key goals along the journey to financial independence.
 * 
 * Percentage milestones: Based on FI progress (net worth / FI target)
 * Lifestyle milestones: Based on spending multiples (Lean = 0.7x, Regular = 1x, Fat = 1.5x)
 * Special milestones: Crossover point, Coast FI, Barista FI
 */
export const FI_MILESTONE_DEFINITIONS: readonly FiMilestoneDefinition[] = [
  // Percentage-based milestones (FI progress %)
  {
    id: 'fi_10',
    name: '10% FI - First Steps',
    shortName: '10% FI',
    description: 'You\'ve taken the first meaningful steps toward financial independence. Your investments are starting to work for you.',
    type: 'percentage',
    targetValue: 10,
    color: '#94a3b8', // slate-400
    icon: 'seedling',
  },
  {
    id: 'fi_25',
    name: '25% FI - Quarter Way',
    shortName: '25% FI',
    description: 'A quarter of the way to FI! Your portfolio is gaining momentum and compound growth is becoming visible.',
    type: 'percentage',
    targetValue: 25,
    color: '#60a5fa', // blue-400
    icon: 'sprout',
  },
  {
    id: 'fi_50',
    name: '50% FI - Halfway',
    shortName: '50% FI',
    description: 'You\'re halfway to financial independence! This is a major psychological milestone.',
    type: 'percentage',
    targetValue: 50,
    color: '#a78bfa', // violet-400
    icon: 'plant',
  },
  {
    id: 'fi_75',
    name: '75% FI - Home Stretch',
    shortName: '75% FI',
    description: 'Three-quarters of the way! The finish line is in sight and compound growth is accelerating.',
    type: 'percentage',
    targetValue: 75,
    color: '#f59e0b', // amber-500
    icon: 'tree',
  },
  {
    id: 'fi_100',
    name: '100% FI - Financial Independence',
    shortName: 'FI',
    description: 'You\'ve reached financial independence! Your safe withdrawal rate covers your desired lifestyle.',
    type: 'percentage',
    targetValue: 100,
    color: '#10b981', // emerald-500
    icon: 'flag',
  },
  
  // Lifestyle-based milestones (spending multipliers)
  {
    id: 'lean_fi',
    name: 'Lean FI',
    shortName: 'Lean FI',
    description: 'Your SWR covers a lean/minimal lifestyle (70% of your regular spending). You could survive without a traditional job.',
    type: 'lifestyle',
    targetValue: 0.7, // 70% of regular spending
    color: '#22c55e', // green-500
    icon: 'leaf',
  },
  {
    id: 'barista_fi',
    name: 'Barista FI',
    shortName: 'Barista FI',
    description: 'Your SWR covers most expenses (85%). A part-time job would cover the rest, giving you flexibility.',
    type: 'lifestyle',
    targetValue: 0.85, // 85% of regular spending
    color: '#14b8a6', // teal-500
    icon: 'coffee',
  },
  {
    id: 'regular_fi',
    name: 'Regular FI',
    shortName: 'Regular FI',
    description: 'Your SWR fully covers your regular lifestyle. This is the traditional FI target.',
    type: 'lifestyle',
    targetValue: 1.0, // 100% of regular spending
    color: '#10b981', // emerald-500
    icon: 'check-circle',
  },
  {
    id: 'fat_fi',
    name: 'Fat FI',
    shortName: 'Fat FI',
    description: 'Your SWR supports an enhanced lifestyle (150% of regular spending), with room for luxuries and unexpected expenses.',
    type: 'lifestyle',
    targetValue: 1.5, // 150% of regular spending
    color: '#eab308', // yellow-500
    icon: 'star',
  },
  
  // Special milestones
  {
    id: 'crossover',
    name: 'Crossover Point',
    shortName: 'Crossover',
    description: 'Your investment income (interest/gains) exceeds your contributions. Your money is now working harder than you.',
    type: 'special',
    targetValue: 0, // Calculated differently - when interest > contributions
    color: '#8b5cf6', // violet-500
    icon: 'arrows-cross',
  },
  {
    id: 'coast_fi',
    name: 'Coast FI',
    shortName: 'Coast FI',
    description: 'You could stop saving today and still reach FI by traditional retirement age through compound growth alone.',
    type: 'special',
    targetValue: 65, // Default target retirement age for Coast FI calculation
    color: '#06b6d4', // cyan-500
    icon: 'sailboat',
  },
  {
    id: 'flamingo_fi',
    name: 'Flamingo FI',
    shortName: 'Flamingo FI',
    description: 'You\'re 50% to FI and could semi-retire now, letting your investments grow while working part-time.',
    type: 'special',
    targetValue: 50, // 50% FI - can semi-retire and let investments compound
    color: '#ec4899', // pink-500
    icon: 'flamingo',
  },
  
  // ============================================================================
  // SHORT-TERM SECURITY MILESTONES
  // These provide peace of mind and protection against unexpected events
  // ============================================================================
  
  {
    id: 'emergency_3mo',
    name: '3-Month Emergency Fund',
    shortName: '3mo Runway',
    description: 'You have 3 months of expenses saved. This covers most short-term disruptions like job transitions or unexpected costs.',
    type: 'security',
    targetValue: 3, // 3 months of expenses
    color: '#f97316', // orange-500
    icon: 'shield',
  },
  {
    id: 'emergency_6mo',
    name: '6-Month Emergency Fund',
    shortName: '6mo Runway',
    description: 'The recommended emergency fund. You can weather a typical job search or extended illness without touching investments.',
    type: 'security',
    targetValue: 6, // 6 months of expenses
    color: '#eab308', // yellow-500
    icon: 'shield-check',
  },
  {
    id: 'emergency_12mo',
    name: '1-Year Runway',
    shortName: '1yr Runway',
    description: 'A full year of expenses covered. You\'re protected against recessions, extended job searches, or career pivots.',
    type: 'security',
    targetValue: 12, // 12 months of expenses
    color: '#84cc16', // lime-500
    icon: 'fortress',
  },
  {
    id: 'emergency_24mo',
    name: '2-Year Runway ("F-You Money")',
    shortName: '2yr Runway',
    description: 'Two years of freedom. You can walk away from any toxic situation, take time to find the right opportunity, or pursue a passion.',
    type: 'security',
    targetValue: 24, // 24 months of expenses  
    color: '#22c55e', // green-500
    icon: 'castle',
  },
  {
    id: 'layoff_proof',
    name: 'Layoff-Proof',
    shortName: 'Layoff-Proof',
    description: 'You have enough that even a layoff followed by a market crash wouldn\'t derail your long-term plans. 2 years expenses + 20% buffer for market recovery.',
    type: 'security',
    targetValue: 2.4, // 2 years * 1.2 buffer = 2.4 years worth
    color: '#14b8a6', // teal-500
    icon: 'shield-star',
  },
  
  // ============================================================================
  // COMPOUNDING ADVANTAGE MILESTONES  
  // When your money starts working harder than you - the "post-economic" feeling
  // ============================================================================
  
  {
    id: 'first_10k',
    name: 'First $10,000',
    shortName: '$10K Saved',
    description: 'The hardest psychological milestone! Getting to 5 figures proves you can save. Most people never reach this.',
    type: 'compounding',
    targetValue: 10000,
    color: '#94a3b8', // slate-400
    icon: 'seed',
  },
  {
    id: 'first_25k',
    name: 'First $25,000',
    shortName: '$25K Saved',
    description: 'A quarter of the way to six figures. Your money is starting to generate noticeable returns.',
    type: 'compounding',
    targetValue: 25000,
    color: '#a1a1aa', // zinc-400
    icon: 'sprout',
  },
  {
    id: 'first_50k',
    name: 'First $50,000',
    shortName: '$50K Saved',
    description: 'Halfway to $100K. At 7% returns, you\'re earning ~$3,500/year from investments alone.',
    type: 'compounding',
    targetValue: 50000,
    color: '#60a5fa', // blue-400
    icon: 'sapling',
  },
  {
    id: 'first_100k',
    name: 'First $100,000',
    shortName: '$100K Saved',
    description: 'The hardest $100K you\'ll ever make - but the most important. Charlie Munger said "The first $100,000 is a b****." Now compounding accelerates.',
    type: 'compounding',
    targetValue: 100000,
    color: '#a78bfa', // violet-400
    icon: 'tree',
  },
  {
    id: 'compound_equals_contribution',
    name: 'Compound Equals Contribution',
    shortName: 'Compounding Matches',
    description: 'Your annual investment returns now equal your annual contributions. Every dollar you save is matched by compound growth!',
    type: 'compounding',
    targetValue: 0, // Calculated dynamically based on returns matching contributions
    color: '#f472b6', // pink-400
    icon: 'balance',
  },
  {
    id: 'first_250k',
    name: 'Quarter Millionaire',
    shortName: '$250K Saved',
    description: 'At 7% returns, you\'re earning ~$17,500/year. Your money works a part-time job for you.',
    type: 'compounding',
    targetValue: 250000,
    color: '#818cf8', // indigo-400
    icon: 'growth',
  },
  {
    id: 'compound_doubles_contribution',
    name: 'Compound Doubles Contribution',
    shortName: 'Compounding 2x',
    description: 'Investment returns are now TWICE your contributions. Congratulations, your money is working harder than you are!',
    type: 'compounding',
    targetValue: 0, // Calculated dynamically
    color: '#c084fc', // purple-400
    icon: 'rocket',
  },
  {
    id: 'first_500k',
    name: 'Half Millionaire',
    shortName: '$500K Saved',
    description: 'At 7% returns, you\'re earning ~$35,000/year - many people\'s full salary. You\'re generating serious wealth.',
    type: 'compounding',
    targetValue: 500000,
    color: '#2dd4bf', // teal-400
    icon: 'mountain',
  },
  {
    id: 'post_economic',
    name: 'Post-Economic Security',
    shortName: 'Bulletproof',
    description: 'Even if you stopped saving entirely AND markets crashed 50%, you\'d still be on track for FI by 65. You can blow your paycheck guilt-free.',
    type: 'compounding',
    targetValue: 0, // Calculated: needs enough that even worst case (50% crash + no more saving) still reaches FI by 65
    color: '#fbbf24', // amber-400
    icon: 'crown',
  },
] as const;

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const PROJECTION_YEARS = 61;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a number as currency
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a timestamp as a readable date
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate age from birth date at a given year
 */
export function calculateAge(birthDate: string, year: number): number | null {
  if (!birthDate) return null;
  const birthYear = new Date(birthDate).getFullYear();
  return year - birthYear;
}

/**
 * Get time elapsed description from a timestamp
 */
export function getTimeSinceEntry(timestamp: number): string {
  const elapsed = Date.now() - timestamp;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`;
  return `${seconds}s ago`;
}

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate inflation-adjusted value
 */
export function adjustForInflation(
  baseValue: number,
  yearsFromNow: number,
  inflationRate: number
): number {
  return baseValue * Math.pow(1 + inflationRate / 100, yearsFromNow);
}

/**
 * Calculate the FI target (net worth needed for financial independence)
 * Based on: (monthly spend * 12) / SWR
 */
export function calculateFiTarget(monthlySpend: number, swr: number): number {
  if (monthlySpend <= 0 || swr <= 0) return 0;
  return (monthlySpend * 12) / (swr / 100);
}

/**
 * Calculate safe withdrawal amounts at different time periods
 */
export function calculateSwrAmounts(netWorth: number, swr: number): {
  annual: number;
  monthly: number;
  weekly: number;
  daily: number;
} {
  const swrDecimal = swr / 100;
  const annual = netWorth * swrDecimal;
  return {
    annual,
    monthly: annual / 12,
    weekly: annual / 52,
    daily: annual / 365,
  };
}

/**
 * Calculate compound growth with contributions
 * Uses the future value of an annuity formula for contributions
 */
export function calculateFutureValue(
  principal: number,
  yearlyRate: number,
  years: number,
  yearlyContribution: number
): { 
  total: number; 
  compoundedPrincipal: number; 
  contributionGrowth: number;
  totalContributed: number;
  totalInterest: number;
} {
  const r = yearlyRate / 100;
  const fullYears = Math.floor(years);
  const partialYear = years - fullYears;
  
  // Compound growth on principal
  const compoundedPrincipal = principal * Math.pow(1 + r, years);
  
  // Future value of annual contributions (end-of-year deposits)
  // Plus partial year contribution with partial growth
  let contributionGrowth: number;
  if (r > 0 && fullYears > 0) {
    // FV of annuity formula: PMT * ((1+r)^n - 1) / r
    contributionGrowth = yearlyContribution * ((Math.pow(1 + r, fullYears) - 1) / r);
  } else {
    contributionGrowth = yearlyContribution * fullYears;
  }
  
  // Add partial year contribution with growth
  const partialContribution = partialYear * yearlyContribution;
  const partialContributionGrowth = partialContribution * Math.pow(1 + r, partialYear / 2); // Average growth
  contributionGrowth += partialContributionGrowth;
  
  const totalContributed = (fullYears + partialYear) * yearlyContribution;
  const total = compoundedPrincipal + contributionGrowth;
  const totalInterest = total - principal - totalContributed;
  
  return {
    total,
    compoundedPrincipal,
    contributionGrowth,
    totalContributed,
    totalInterest,
  };
}

/**
 * Calculate real-time net worth with appreciation since last entry
 */
export function calculateRealTimeNetWorth(
  latestEntry: NetWorthEntry | null,
  settings: UserSettings,
  includeContributions: boolean = false
): RealTimeNetWorth {
  if (!latestEntry) {
    return { total: 0, baseAmount: 0, appreciation: 0, contributions: 0 };
  }

  const now = Date.now();
  const elapsed = now - latestEntry.timestamp;
  const yearsElapsed = elapsed / MS_PER_YEAR;
  const yearlyRate = settings.currentRate / 100;
  
  // Simple interest approximation for real-time display
  // (Using compound would cause jumpy updates)
  const msRate = yearlyRate / MS_PER_YEAR;
  const appreciation = latestEntry.amount * msRate * elapsed;
  
  let contributions = 0;
  if (includeContributions && settings.yearlyContribution > 0) {
    // Continuous contribution approximation
    contributions = settings.yearlyContribution * yearsElapsed;
    // Add average growth on contributions (half the time period)
    contributions += contributions * msRate * (elapsed / 2);
  }
  
  return {
    total: latestEntry.amount + appreciation + contributions,
    baseAmount: latestEntry.amount,
    appreciation,
    contributions,
  };
}

/**
 * Calculate growth rates at different time intervals
 */
export function calculateGrowthRates(
  currentNetWorth: number,
  settings: UserSettings,
  includeContributions: boolean = false
): GrowthRates {
  const yearlyAppreciation = currentNetWorth * (settings.currentRate / 100);
  const yearlyContributions = includeContributions ? settings.yearlyContribution : 0;
  const yearlyTotal = yearlyAppreciation + yearlyContributions;
  
  return {
    perSecond: yearlyTotal / (365.25 * 24 * 60 * 60),
    perMinute: yearlyTotal / (365.25 * 24 * 60),
    perHour: yearlyTotal / (365.25 * 24),
    perDay: yearlyTotal / 365.25,
    perYear: yearlyTotal,
    yearlyAppreciation,
    yearlyContributions,
  };
}

/**
 * Find the Coast FI year - the year when you can stop contributing and still reach FI
 */
export function findCoastFiYear(
  startingValue: number,
  startYear: number,
  startYearsFromNow: number,
  settings: UserSettings,
  applyInflation: boolean = false,
  useSpendingLevels: boolean = false
): number | null {
  const { monthlySpend, swr, currentRate, inflationRate } = settings;
  
  // For spending levels, we need base budget; for fixed spending, we need monthlySpend
  const hasValidSpending = useSpendingLevels 
    ? settings.baseMonthlyBudget > 0 
    : monthlySpend > 0;
  
  if (!hasValidSpending || swr <= 0 || currentRate <= 0) return null;
  
  const r = currentRate / 100;
  
  for (let y = 0; y <= 100; y++) {
    const futureValue = startingValue * Math.pow(1 + r, y);
    const yearsFuture = startYearsFromNow + y;
    
    // Calculate spending based on mode
    let futureSpend: number;
    if (useSpendingLevels) {
      // Use level-based spending that scales with future net worth
      futureSpend = calculateLevelBasedSpending(futureValue, settings, yearsFuture);
    } else if (applyInflation) {
      futureSpend = adjustForInflation(monthlySpend, yearsFuture, inflationRate);
    } else {
      futureSpend = monthlySpend;
    }
    
    const futureTarget = calculateFiTarget(futureSpend, swr);
    
    if (futureValue >= futureTarget) {
      return startYear + y;
    }
  }
  
  return null;
}

/**
 * Calculate the spending budget based on the levels system
 */
export function calculateUnlockedSpending(
  netWorth: number,
  baseBudget: number,
  spendingRate: number,
  yearsElapsed: number = 0,
  inflationRate: number = 0
): number {
  // Adjust base for inflation
  const inflatedBase = baseBudget * Math.pow(1 + inflationRate / 100, yearsElapsed);
  // Add net worth portion (annual rate / 12 for monthly)
  return inflatedBase + (netWorth * (spendingRate / 100) / 12);
}

/**
 * Calculate level information based on current net worth
 */
export function calculateLevelInfo(
  currentNetWorth: number,
  settings: UserSettings,
  entries: NetWorthEntry[]
): LevelInfo {
  const {
    monthlySpend,
    baseMonthlyBudget,
    spendingGrowthRate,
    inflationRate,
  } = settings;
  
  const spendingRate = spendingGrowthRate / 100;
  const inflation = inflationRate / 100;
  
  // Calculate years elapsed since first entry (for inflation adjustment)
  const oldestEntry = entries.length > 0
    ? entries.reduce((oldest, e) => e.timestamp < oldest.timestamp ? e : oldest, entries[0])
    : null;
  const yearsElapsed = oldestEntry
    ? (Date.now() - oldestEntry.timestamp) / MS_PER_YEAR
    : 0;
  
  // Adjust base budget for inflation
  const baseBudgetInflationAdjusted = baseMonthlyBudget * Math.pow(1 + inflation, yearsElapsed);
  
  // Find current level (highest threshold we've passed)
  let currentLevelIndex = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (currentNetWorth >= LEVEL_THRESHOLDS[i].threshold) {
      currentLevelIndex = i;
      break;
    }
  }
  
  const currentLevel = LEVEL_THRESHOLDS[currentLevelIndex];
  const nextLevel = LEVEL_THRESHOLDS[currentLevelIndex + 1] || null;
  
  // Calculate progress to next level
  let progressToNext = 100;
  let amountToNext = 0;
  if (nextLevel) {
    const range = nextLevel.threshold - currentLevel.threshold;
    const progress = currentNetWorth - currentLevel.threshold;
    progressToNext = Math.min((progress / range) * 100, 100);
    amountToNext = nextLevel.threshold - currentNetWorth;
  }
  
  // Calculate unlocked spending at level threshold
  const unlockedAtLevel = calculateUnlockedSpending(
    currentLevel.threshold,
    baseMonthlyBudget,
    spendingGrowthRate,
    yearsElapsed,
    inflationRate
  );
  
  // Calculate what's unlocked at actual net worth
  const unlockedAtNetWorth = calculateUnlockedSpending(
    currentNetWorth,
    baseMonthlyBudget,
    spendingGrowthRate,
    yearsElapsed,
    inflationRate
  );
  
  // Net worth derived portion
  const netWorthPortion = currentNetWorth * spendingRate / 12;
  
  // Spending status
  let spendingStatus: 'within_budget' | 'slightly_over' | 'over_budget';
  if (monthlySpend <= unlockedAtLevel) {
    spendingStatus = 'within_budget';
  } else if (monthlySpend <= unlockedAtLevel * 1.1) {
    spendingStatus = 'slightly_over';
  } else {
    spendingStatus = 'over_budget';
  }
  
  // Calculate all levels with their unlock status
  const levelsWithStatus = LEVEL_THRESHOLDS.map((level, index) => ({
    ...level,
    monthlyBudget: calculateUnlockedSpending(
      level.threshold,
      baseMonthlyBudget,
      spendingGrowthRate,
      yearsElapsed,
      inflationRate
    ),
    isUnlocked: index <= currentLevelIndex,
    isCurrent: index === currentLevelIndex,
    isNext: index === currentLevelIndex + 1,
  }));
  
  // Next level spending increase
  const nextLevelSpendingIncrease = nextLevel
    ? calculateUnlockedSpending(nextLevel.threshold, baseMonthlyBudget, spendingGrowthRate, yearsElapsed, inflationRate) - unlockedAtLevel
    : 0;
  
  return {
    currentLevel: { ...currentLevel, monthlyBudget: unlockedAtLevel },
    currentLevelIndex,
    nextLevel: nextLevel
      ? {
          ...nextLevel,
          monthlyBudget: calculateUnlockedSpending(
            nextLevel.threshold,
            baseMonthlyBudget,
            spendingGrowthRate,
            yearsElapsed,
            inflationRate
          ),
        }
      : null,
    progressToNext,
    amountToNext,
    unlockedAtLevel,
    unlockedAtNetWorth,
    nextLevelSpendingIncrease,
    currentSpend: monthlySpend,
    spendingStatus,
    levelsWithStatus,
    netWorth: currentNetWorth,
    baseBudgetOriginal: baseMonthlyBudget,
    baseBudgetInflationAdjusted,
    spendingRate,
    netWorthPortion,
    yearsElapsed,
    inflation,
  };
}

/**
 * Calculate spending based on the levels system for a given net worth
 * This accounts for both the base budget (inflation-adjusted) and net worth portion
 */
export function calculateLevelBasedSpending(
  netWorth: number,
  settings: UserSettings,
  yearsFromNow: number = 0
): number {
  const { baseMonthlyBudget, spendingGrowthRate, inflationRate } = settings;
  
  // Adjust base for inflation
  const inflatedBase = baseMonthlyBudget * Math.pow(1 + inflationRate / 100, yearsFromNow);
  
  // Add net worth portion (annual rate / 12 for monthly)
  return inflatedBase + (netWorth * (spendingGrowthRate / 100) / 12);
}

/**
 * Calculate FI milestones from projections
 * Returns information about achieved and upcoming milestones on the path to FI
 */
export function calculateFiMilestones(
  projections: ProjectionRow[],
  settings: UserSettings,
  birthYear: number | null
): FiMilestonesInfo {
  if (!projections.length) {
    return {
      milestones: [],
      currentMilestone: null,
      nextMilestone: null,
      progressToNext: 0,
      amountToNext: 0,
    };
  }
  
  const currentYear = new Date().getFullYear();
  const currentRow = projections[0];
  const currentNetWorth = currentRow.netWorth;
  const currentFiProgress = currentRow.fiProgress;
  const currentMonthlySpend = currentRow.monthlySpend;
  const currentFiTarget = currentRow.fiTarget;
  
  const milestones: FiMilestone[] = [];
  
  // Process each milestone definition
  for (const def of FI_MILESTONE_DEFINITIONS) {
    let milestone: FiMilestone;
    
    if (def.type === 'percentage') {
      // Percentage-based milestones (10%, 25%, 50%, 75%, 100%)
      const targetProgress = def.targetValue;
      const isAchieved = currentFiProgress >= targetProgress;
      
      // Find the first year when this milestone is/was achieved
      let milestoneYear: number | null = null;
      let milestoneNetWorth: number | null = null;
      
      for (const row of projections) {
        if (row.fiProgress >= targetProgress) {
          milestoneYear = row.year;
          milestoneNetWorth = row.netWorth;
          break;
        }
      }
      
      milestone = {
        ...def,
        year: milestoneYear,
        age: milestoneYear && birthYear ? milestoneYear - birthYear : null,
        yearsFromNow: milestoneYear ? milestoneYear - currentYear : null,
        isAchieved,
        netWorthAtMilestone: milestoneNetWorth,
      };
    } else if (def.type === 'lifestyle') {
      // Lifestyle-based milestones (based on spending multipliers)
      const spendingMultiplier = def.targetValue;
      const adjustedSpend = currentMonthlySpend * spendingMultiplier;
      const lifestyleFiTarget = calculateFiTarget(adjustedSpend, settings.swr);
      const lifestyleFiProgress = lifestyleFiTarget > 0 ? (currentNetWorth / lifestyleFiTarget) * 100 : 0;
      const isAchieved = lifestyleFiProgress >= 100;
      
      // Find the first year when this lifestyle FI is achieved
      let milestoneYear: number | null = null;
      let milestoneNetWorth: number | null = null;
      
      for (const row of projections) {
        const rowSpend = row.monthlySpend * spendingMultiplier;
        const rowTarget = calculateFiTarget(rowSpend, settings.swr);
        if (row.netWorth >= rowTarget) {
          milestoneYear = row.year;
          milestoneNetWorth = row.netWorth;
          break;
        }
      }
      
      milestone = {
        ...def,
        year: milestoneYear,
        age: milestoneYear && birthYear ? milestoneYear - birthYear : null,
        yearsFromNow: milestoneYear ? milestoneYear - currentYear : null,
        isAchieved,
        netWorthAtMilestone: milestoneNetWorth,
      };
    } else if (def.type === 'security') {
      // Security milestones - based on months of expenses covered
      const monthsOfExpenses = def.targetValue;
      
      // For layoff_proof, it's a multiplier including buffer (2.4 = 2 years * 1.2 buffer)
      const targetNetWorth = def.id === 'layoff_proof' 
        ? currentMonthlySpend * 12 * monthsOfExpenses  // Years worth with buffer
        : currentMonthlySpend * monthsOfExpenses;       // Months of expenses
      
      const isAchieved = currentNetWorth >= targetNetWorth;
      
      // Find the first year when this is achieved
      let milestoneYear: number | null = null;
      let milestoneNetWorth: number | null = null;
      
      for (const row of projections) {
        const rowTarget = def.id === 'layoff_proof'
          ? row.monthlySpend * 12 * monthsOfExpenses
          : row.monthlySpend * monthsOfExpenses;
        
        if (row.netWorth >= rowTarget) {
          milestoneYear = row.year;
          milestoneNetWorth = row.netWorth;
          break;
        }
      }
      
      milestone = {
        ...def,
        year: milestoneYear,
        age: milestoneYear && birthYear ? milestoneYear - birthYear : null,
        yearsFromNow: milestoneYear ? milestoneYear - currentYear : null,
        isAchieved,
        netWorthAtMilestone: milestoneNetWorth,
      };
    } else if (def.type === 'compounding') {
      // Compounding advantage milestones
      
      if (def.id === 'compound_equals_contribution') {
        // When annual returns equal annual contributions
        // At 7% return, this happens at ~$214k if contributing $15k/year
        // Formula: NW * rate = contribution, so NW = contribution / rate
        const annualContribution = settings.yearlyContribution || 0;
        const returnRate = settings.currentRate / 100;
        const targetNetWorth = returnRate > 0 && annualContribution > 0 
          ? annualContribution / returnRate 
          : Infinity;
        
        const isAchieved = currentNetWorth >= targetNetWorth && targetNetWorth !== Infinity;
        
        let milestoneYear: number | null = null;
        let milestoneNetWorth: number | null = null;
        
        for (const row of projections) {
          if (row.netWorth >= targetNetWorth && targetNetWorth !== Infinity) {
            milestoneYear = row.year;
            milestoneNetWorth = row.netWorth;
            break;
          }
        }
        
        milestone = {
          ...def,
          year: milestoneYear,
          age: milestoneYear && birthYear ? milestoneYear - birthYear : null,
          yearsFromNow: milestoneYear ? milestoneYear - currentYear : null,
          isAchieved,
          netWorthAtMilestone: milestoneNetWorth,
        };
      } else if (def.id === 'compound_doubles_contribution') {
        // When annual returns are 2x annual contributions
        const annualContribution = settings.yearlyContribution || 0;
        const returnRate = settings.currentRate / 100;
        const targetNetWorth = returnRate > 0 && annualContribution > 0 
          ? (annualContribution * 2) / returnRate 
          : Infinity;
        
        const isAchieved = currentNetWorth >= targetNetWorth && targetNetWorth !== Infinity;
        
        let milestoneYear: number | null = null;
        let milestoneNetWorth: number | null = null;
        
        for (const row of projections) {
          if (row.netWorth >= targetNetWorth && targetNetWorth !== Infinity) {
            milestoneYear = row.year;
            milestoneNetWorth = row.netWorth;
            break;
          }
        }
        
        milestone = {
          ...def,
          year: milestoneYear,
          age: milestoneYear && birthYear ? milestoneYear - birthYear : null,
          yearsFromNow: milestoneYear ? milestoneYear - currentYear : null,
          isAchieved,
          netWorthAtMilestone: milestoneNetWorth,
        };
      } else if (def.id === 'post_economic') {
        // Post-economic security: Even with 50% market crash + no more saving, still reach FI by 65
        // Calculate: what net worth today, if halved (50% crash), grows at return rate to age 65
        // and equals FI target at that time?
        // Formula: (NW * 0.5) * (1 + r)^yearsTo65 >= FI_target_at_65
        // NW >= FI_target_at_65 / (0.5 * (1 + r)^yearsTo65)
        
        const returnRate = settings.currentRate / 100;
        const currentAge = birthYear ? currentYear - birthYear : null;
        const yearsTo65 = currentAge ? Math.max(0, 65 - currentAge) : 25; // Default 25 years if no age
        
        // Calculate FI target at 65 (with inflation)
        const inflatedMonthlySpend = adjustForInflation(currentMonthlySpend, yearsTo65, settings.inflationRate);
        const fiTargetAt65 = calculateFiTarget(inflatedMonthlySpend, settings.swr);
        
        // What you need today such that even with 50% crash + no saving, you reach FI at 65
        const growthFactor = Math.pow(1 + returnRate, yearsTo65);
        const crashFactor = 0.5; // 50% market crash
        const targetNetWorth = fiTargetAt65 / (crashFactor * growthFactor);
        
        const isAchieved = currentNetWorth >= targetNetWorth && targetNetWorth > 0;
        
        let milestoneYear: number | null = null;
        let milestoneNetWorth: number | null = null;
        
        for (const row of projections) {
          // Recalculate target for each future year (fewer years to 65)
          const rowAge = birthYear ? row.year - birthYear : null;
          const rowYearsTo65 = rowAge ? Math.max(0, 65 - rowAge) : Math.max(0, 25 - row.yearsFromEntry);
          const rowInflatedSpend = adjustForInflation(row.monthlySpend, rowYearsTo65, settings.inflationRate);
          const rowFiTarget = calculateFiTarget(rowInflatedSpend, settings.swr);
          const rowGrowthFactor = Math.pow(1 + returnRate, rowYearsTo65);
          const rowTarget = rowFiTarget / (crashFactor * rowGrowthFactor);
          
          if (row.netWorth >= rowTarget && rowTarget > 0) {
            milestoneYear = row.year;
            milestoneNetWorth = row.netWorth;
            break;
          }
        }
        
        milestone = {
          ...def,
          year: milestoneYear,
          age: milestoneYear && birthYear ? milestoneYear - birthYear : null,
          yearsFromNow: milestoneYear ? milestoneYear - currentYear : null,
          isAchieved,
          netWorthAtMilestone: milestoneNetWorth,
        };
      } else {
        // Fixed net worth threshold milestones ($10k, $25k, $50k, $100k, $250k, $500k)
        const targetNetWorth = def.targetValue;
        const isAchieved = currentNetWorth >= targetNetWorth;
        
        let milestoneYear: number | null = null;
        let milestoneNetWorth: number | null = null;
        
        for (const row of projections) {
          if (row.netWorth >= targetNetWorth) {
            milestoneYear = row.year;
            milestoneNetWorth = row.netWorth;
            break;
          }
        }
        
        milestone = {
          ...def,
          year: milestoneYear,
          age: milestoneYear && birthYear ? milestoneYear - birthYear : null,
          yearsFromNow: milestoneYear ? milestoneYear - currentYear : null,
          isAchieved,
          netWorthAtMilestone: milestoneNetWorth,
        };
      }
    } else {
      // Special milestones
      if (def.id === 'crossover') {
        // Crossover Point - when interest exceeds contributions
        const crossoverRow = projections.find(p => p.isCrossover);
        const isAchieved = projections.some(p => p.interest > p.contributed && p.contributed > 0);
        
        // For current achievement, check if already achieved
        let currentlyAchieved = false;
        if (currentRow.interest > currentRow.contributed && currentRow.contributed > 0) {
          currentlyAchieved = true;
        }
        
        milestone = {
          ...def,
          year: crossoverRow?.year ?? null,
          age: crossoverRow?.year && birthYear ? crossoverRow.year - birthYear : null,
          yearsFromNow: crossoverRow?.year ? crossoverRow.year - currentYear : null,
          isAchieved: currentlyAchieved,
          netWorthAtMilestone: crossoverRow?.netWorth ?? null,
        };
      } else if (def.id === 'coast_fi') {
        // Coast FI - when you can stop saving and still reach FI at retirement age
        // Use the existing coastFiYear calculation from projections
        const coastFiYear = currentRow.coastFiYear;
        const isAchieved = coastFiYear !== null && coastFiYear <= currentYear;
        
        milestone = {
          ...def,
          year: coastFiYear,
          age: coastFiYear && birthYear ? coastFiYear - birthYear : null,
          yearsFromNow: coastFiYear ? coastFiYear - currentYear : null,
          isAchieved,
          netWorthAtMilestone: isAchieved ? currentNetWorth : null,
        };
      } else if (def.id === 'flamingo_fi') {
        // Flamingo FI - 50% of the way to FI (same as 50% FI but framed differently)
        const isAchieved = currentFiProgress >= 50;
        
        let milestoneYear: number | null = null;
        let milestoneNetWorth: number | null = null;
        
        for (const row of projections) {
          if (row.fiProgress >= 50) {
            milestoneYear = row.year;
            milestoneNetWorth = row.netWorth;
            break;
          }
        }
        
        milestone = {
          ...def,
          year: milestoneYear,
          age: milestoneYear && birthYear ? milestoneYear - birthYear : null,
          yearsFromNow: milestoneYear ? milestoneYear - currentYear : null,
          isAchieved,
          netWorthAtMilestone: milestoneNetWorth,
        };
      } else {
        // Unknown special milestone
        milestone = {
          ...def,
          year: null,
          age: null,
          yearsFromNow: null,
          isAchieved: false,
          netWorthAtMilestone: null,
        };
      }
    }
    
    milestones.push(milestone);
  }
  
  // Sort milestones by achievement status and then by years from now
  // Achieved milestones first (sorted by recency), then upcoming (sorted by proximity)
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (a.isAchieved && !b.isAchieved) return -1;
    if (!a.isAchieved && b.isAchieved) return 1;
    
    // Both achieved or both not achieved - sort by year
    const yearA = a.year ?? Infinity;
    const yearB = b.year ?? Infinity;
    return yearA - yearB;
  });
  
  // Find current and next milestones (use percentage-based for primary tracking)
  const percentageMilestones = milestones.filter(m => m.type === 'percentage');
  const achievedPercentage = percentageMilestones.filter(m => m.isAchieved);
  const upcomingPercentage = percentageMilestones.filter(m => !m.isAchieved);
  
  const currentMilestone = achievedPercentage.length > 0 
    ? achievedPercentage[achievedPercentage.length - 1] 
    : null;
  const nextMilestone = upcomingPercentage.length > 0 
    ? upcomingPercentage[0] 
    : null;
  
  // Calculate progress to next milestone
  let progressToNext = 0;
  let amountToNext = 0;
  
  if (nextMilestone) {
    const targetProgress = nextMilestone.targetValue;
    const currentProgress = currentFiProgress;
    const previousTarget = currentMilestone?.targetValue ?? 0;
    
    if (targetProgress > previousTarget) {
      progressToNext = ((currentProgress - previousTarget) / (targetProgress - previousTarget)) * 100;
      progressToNext = Math.max(0, Math.min(100, progressToNext));
    }
    
    // Calculate amount needed to reach next milestone
    const targetNetWorth = currentFiTarget * (targetProgress / 100);
    amountToNext = Math.max(0, targetNetWorth - currentNetWorth);
  }
  
  return {
    milestones: sortedMilestones,
    currentMilestone,
    nextMilestone,
    progressToNext,
    amountToNext,
  };
}

/**
 * Get a summary of key FI milestones for display
 * Returns a condensed view with the most important milestones
 */
export function getFiMilestonesSummary(
  milestonesInfo: FiMilestonesInfo
): {
  achieved: FiMilestone[];
  upcoming: FiMilestone[];
  nextPercentage: FiMilestone | null;
  nextLifestyle: FiMilestone | null;
} {
  const { milestones, nextMilestone } = milestonesInfo;
  
  const achieved = milestones.filter(m => m.isAchieved);
  const upcoming = milestones.filter(m => !m.isAchieved && m.year !== null);
  
  // Find the next lifestyle milestone
  const lifestyleMilestones = milestones.filter(m => m.type === 'lifestyle');
  const nextLifestyle = lifestyleMilestones.find(m => !m.isAchieved) ?? null;
  
  return {
    achieved,
    upcoming,
    nextPercentage: nextMilestone,
    nextLifestyle,
  };
}

// ============================================================================
// SHORT-TERM YEARLY TARGETS
// Provides actionable year-by-year goals for the next 5 years
// ============================================================================

export interface YearlyTarget {
  year: number;
  age: number | null;
  yearsFromNow: number;
  targetNetWorth: number;            // What to aim for by end of year
  projectedNetWorth: number;         // What projections say you'll have
  onTrack: boolean;                  // Whether projected >= target
  gapToTarget: number;               // Difference (positive = ahead, negative = behind)
  monthlyContributionNeeded: number; // Extra monthly saving needed to hit target
  // Security metrics at this point
  monthsOfRunway: number;            // Months of expenses covered
  compoundingAdvantage: number;      // How much compound growth helps (as % of total growth)
  // Key milestone that could be hit this year
  potentialMilestone: string | null;
  // Motivation
  message: string;
}

export interface ShortTermTargetsInfo {
  targets: YearlyTarget[];
  fiveYearGoal: number;               // Recommended 5-year net worth target
  fiveYearProjected: number;          // What projections show for 5 years out
  onTrackForFiveYear: boolean;
  // The "magic number" - net worth that provides post-economic security
  magicNumber: number;
  yearsToMagicNumber: number | null;
  // Diminishing returns threshold
  diminishingReturnsThreshold: number; // Net worth where saving more has less impact
  currentSavingsEfficiency: number;    // How much each dollar saved helps (0-1)
}

/**
 * Calculate short-term yearly targets for the next 5 years
 * Provides actionable goals that balance saving and enjoying life
 */
export function calculateShortTermTargets(
  projections: ProjectionRow[],
  settings: UserSettings,
  birthYear: number | null,
  fiMilestones: FiMilestonesInfo
): ShortTermTargetsInfo {
  if (!projections.length || projections.length < 6) {
    return {
      targets: [],
      fiveYearGoal: 0,
      fiveYearProjected: 0,
      onTrackForFiveYear: false,
      magicNumber: 0,
      yearsToMagicNumber: null,
      diminishingReturnsThreshold: 0,
      currentSavingsEfficiency: 1,
    };
  }
  
  const currentYear = new Date().getFullYear();
  const currentRow = projections[0];
  const currentNetWorth = currentRow.netWorth;
  const currentMonthlySpend = currentRow.monthlySpend;
  const annualContribution = settings.yearlyContribution || 0;
  const returnRate = settings.currentRate / 100;
  
  const targets: YearlyTarget[] = [];
  
  // Generate targets for the next 5 years
  for (let i = 1; i <= 5; i++) {
    const projRow = projections[i];
    if (!projRow) continue;
    
    const targetYear = currentYear + i;
    const yearsFromNow = i;
    const age = birthYear ? targetYear - birthYear : null;
    
    // Calculate an aspirational but achievable target
    // Target is the projected value with a small stretch (5% above projections)
    // This provides motivation without being discouraging
    const projectedNetWorth = projRow.netWorth;
    const stretchFactor = 1.05; // 5% stretch goal
    const targetNetWorth = Math.round(projectedNetWorth * stretchFactor);
    
    const gapToTarget = projectedNetWorth - targetNetWorth;
    const onTrack = gapToTarget >= 0;
    
    // Calculate extra monthly contribution needed to hit target
    const shortfall = Math.max(0, targetNetWorth - projectedNetWorth);
    const monthsRemaining = yearsFromNow * 12;
    // Simple approximation: extra needed per month (with some growth)
    const monthlyContributionNeeded = shortfall > 0 
      ? shortfall / (monthsRemaining * (1 + returnRate * yearsFromNow / 2))
      : 0;
    
    // Calculate months of runway at this point
    const futureMonthlySpend = projRow.monthlySpend;
    const monthsOfRunway = futureMonthlySpend > 0 
      ? projectedNetWorth / futureMonthlySpend 
      : 0;
    
    // Calculate compounding advantage (what % of growth comes from compound returns)
    const totalGrowth = projectedNetWorth - currentNetWorth;
    const contributionsPortion = annualContribution * yearsFromNow;
    const compoundGrowth = totalGrowth - contributionsPortion;
    const compoundingAdvantage = totalGrowth > 0 
      ? Math.max(0, compoundGrowth / totalGrowth) 
      : 0;
    
    // Find potential milestones for this year
    let potentialMilestone: string | null = null;
    const milestoneThisYear = fiMilestones.milestones.find(m => 
      m.year === targetYear && !m.isAchieved
    );
    if (milestoneThisYear) {
      potentialMilestone = milestoneThisYear.shortName;
    }
    
    // Generate motivational message based on the year
    let message: string;
    if (i === 1) {
      message = monthsOfRunway >= 12 
        ? "You'll have 1+ years of runway - major security milestone!"
        : `Building toward ${Math.ceil(12 - monthsOfRunway)} more months of runway`;
    } else if (i === 2) {
      message = compoundingAdvantage >= 0.5
        ? "Compound growth is pulling its weight - your money works for you"
        : "Stay consistent - compound growth is building momentum";
    } else if (i === 3) {
      message = potentialMilestone 
        ? `Could hit ${potentialMilestone} this year!`
        : "The midpoint - your habits are now ingrained";
    } else if (i === 4) {
      message = "Past the hardest part - momentum is on your side";
    } else {
      message = onTrack 
        ? "5-year goal in sight - you're building real security"
        : "Stretch goal - each dollar counts";
    }
    
    targets.push({
      year: targetYear,
      age,
      yearsFromNow,
      targetNetWorth,
      projectedNetWorth,
      onTrack,
      gapToTarget,
      monthlyContributionNeeded,
      monthsOfRunway,
      compoundingAdvantage,
      potentialMilestone,
      message,
    });
  }
  
  // Calculate 5-year goal (the target for year 5)
  const fiveYearTarget = targets.find(t => t.yearsFromNow === 5);
  const fiveYearGoal = fiveYearTarget?.targetNetWorth ?? 0;
  const fiveYearProjected = fiveYearTarget?.projectedNetWorth ?? 0;
  const onTrackForFiveYear = fiveYearProjected >= fiveYearGoal;
  
  // Calculate the "magic number" - post-economic security threshold
  // This is the amount where even with a 50% crash + no more saving, you reach FI by 65
  const currentAge = birthYear ? currentYear - birthYear : null;
  const yearsTo65 = currentAge ? Math.max(0, 65 - currentAge) : 25;
  const inflatedSpend = adjustForInflation(currentMonthlySpend, yearsTo65, settings.inflationRate);
  const fiTargetAt65 = calculateFiTarget(inflatedSpend, settings.swr);
  const crashFactor = 0.5;
  const growthFactor = Math.pow(1 + returnRate, yearsTo65);
  const magicNumber = fiTargetAt65 / (crashFactor * growthFactor);
  
  // Find years to magic number
  let yearsToMagicNumber: number | null = null;
  for (const row of projections) {
    if (row.netWorth >= magicNumber) {
      yearsToMagicNumber = row.year - currentYear;
      break;
    }
  }
  
  // Calculate diminishing returns threshold
  // This is where compound growth equals 2x contributions - beyond this, saving more matters less
  const diminishingReturnsThreshold = returnRate > 0 && annualContribution > 0
    ? (annualContribution * 2) / returnRate
    : 500000; // Default to $500k if can't calculate
  
  // Current savings efficiency: how much impact does each saved dollar have
  // At low net worth, each dollar is crucial (efficiency = 1)
  // As you approach diminishing returns threshold, efficiency decreases
  const currentSavingsEfficiency = currentNetWorth < diminishingReturnsThreshold
    ? 1 - (currentNetWorth / diminishingReturnsThreshold) * 0.5 // Goes from 1 to 0.5
    : 0.5 - Math.min(0.4, (currentNetWorth - diminishingReturnsThreshold) / (diminishingReturnsThreshold * 4)); // Approaches 0.1
  
  return {
    targets,
    fiveYearGoal,
    fiveYearProjected,
    onTrackForFiveYear,
    magicNumber,
    yearsToMagicNumber,
    diminishingReturnsThreshold,
    currentSavingsEfficiency: Math.max(0.1, Math.min(1, currentSavingsEfficiency)),
  };
}

/**
 * Generate projection data for the specified number of years
 * 
 * IMPORTANT: This function now properly accounts for spending increases reducing savings.
 * As spending increases over time (due to inflation and spending growth rate), the
 * available savings decrease. Net worth growth is calculated iteratively to reflect this.
 */
export function generateProjections(
  latestEntry: NetWorthEntry | null,
  currentNetWorth: number,
  currentAppreciation: number,
  settings: UserSettings,
  applyInflation: boolean = false,
  useSpendingLevels: boolean = false,
  dynamicProjections?: YearlyProjectedFinancials[] | null
): ProjectionRow[] {
  if (!latestEntry) return [];
  
  const {
    currentRate,
    swr,
    yearlyContribution,
    monthlySpend,
    inflationRate,
    birthDate,
    incomeGrowthRate,
  } = settings;
  
  const r = currentRate / 100;
  const currentYear = new Date().getFullYear();
  const birthYear = birthDate ? new Date(birthDate).getFullYear() : null;
  
  const data: ProjectionRow[] = [];
  let fiYearFound = false;
  let crossoverFound = false;
  
  // Helper function to get spending for a given year and net worth
  const getSpendingForYear = (yearsFromNow: number, netWorthAtYear: number) => {
    if (useSpendingLevels) {
      // Use level-based spending that scales with net worth
      return calculateLevelBasedSpending(netWorthAtYear, settings, yearsFromNow);
    } else if (applyInflation) {
      // Use fixed spending with inflation adjustment
      return adjustForInflation(monthlySpend, yearsFromNow, inflationRate);
    } else {
      // Use fixed spending
      return monthlySpend;
    }
  };
  
  // Calculate base spending (year 0) - this is our reference point
  const baseMonthlySpend = useSpendingLevels 
    ? calculateLevelBasedSpending(currentNetWorth, settings, 0)
    : monthlySpend;
  const baseAnnualSpend = baseMonthlySpend * 12;
  
  // Check if currently FI (to prevent marking future years as FI year)
  const currentSpend = baseMonthlySpend;
  const currentSwrAmounts = calculateSwrAmounts(currentNetWorth, swr);
  const currentSwrCoversSpend = currentSpend > 0 && currentSwrAmounts.monthly >= currentSpend;
  if (currentSwrCoversSpend) fiYearFound = true;
  
  // Track cumulative values for proper calculation
  let previousNetWorth = currentNetWorth;
  let cumulativeInterest = currentAppreciation;
  let cumulativeContributed = 0;
  
  // Future projection rows - now calculated iteratively with dynamic savings
  for (let i = 0; i < PROJECTION_YEARS; i++) {
    const year = currentYear + i;
    const age = birthYear ? year - birthYear : null;
    
    // Calculate spending for this year based on previous year's ending net worth
    const yearMonthlySpend = getSpendingForYear(i, previousNetWorth);
    const yearAnnualSpending = yearMonthlySpend * 12;

    // Determine savings for this year
    // If dynamic projections are available, use their tax-aware savings calculations
    // Otherwise, use basic income-growth-adjusted calculation
    let yearAnnualSavings: number;

    if (dynamicProjections && dynamicProjections[i]) {
      // Use tax-aware savings from dynamic projections
      yearAnnualSavings = dynamicProjections[i].totalSavings;
    } else {
      // Calculate contribution for this year, applying income growth if specified
      const growthMultiplier = incomeGrowthRate ? Math.pow(1 + incomeGrowthRate / 100, i) : 1;
      const yearlyContributionGrown = yearlyContribution * growthMultiplier;

      // Calculate savings: base contribution (with growth) minus the spending increase from base level
      // Can be negative if spending increase exceeds income growth - represents drawing from net worth
      const spendingIncrease = yearAnnualSpending - baseAnnualSpend;
      yearAnnualSavings = yearlyContributionGrown - spendingIncrease;
    }

    // Calculate this year's interest on previous net worth
    const yearInterest = previousNetWorth * r;

    // New net worth = previous + interest + savings for this year
    const yearNetWorth = previousNetWorth + yearInterest + yearAnnualSavings;
    
    // Update cumulative trackers
    cumulativeInterest += yearInterest;
    cumulativeContributed += yearAnnualSavings;
    
    // Calculate years from entry for reference
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
    const yearsFromEntry = (endOfYear - latestEntry.timestamp) / MS_PER_YEAR;
    
    // FI calculations
    const yearFiTarget = calculateFiTarget(yearMonthlySpend, swr);
    const fiProgress = yearFiTarget > 0 ? (yearNetWorth / yearFiTarget) * 100 : 0;
    
    // Calculate SWR amounts
    const swrAmounts = calculateSwrAmounts(yearNetWorth, swr);
    const swrCoversSpend = yearMonthlySpend > 0 && swrAmounts.monthly >= yearMonthlySpend;
    
    // Check milestones
    const isFiYear = swrCoversSpend && !fiYearFound;
    if (isFiYear) fiYearFound = true;
    
    const isCrossover = cumulativeInterest > cumulativeContributed && !crossoverFound && cumulativeContributed > 0;
    if (isCrossover) crossoverFound = true;
    
    // Coast FI
    const coastFiYear = findCoastFiYear(yearNetWorth, year, i, settings, applyInflation, useSpendingLevels);
    
    // Extract tax info from dynamic projections if available
    const dynamicRow = dynamicProjections && dynamicProjections[i];

    data.push({
      year,
      age,
      yearsFromEntry,
      netWorth: yearNetWorth,
      interest: cumulativeInterest,
      contributed: cumulativeContributed,
      annualSwr: swrAmounts.annual,
      monthlySwr: swrAmounts.monthly,
      weeklySwr: swrAmounts.weekly,
      dailySwr: swrAmounts.daily,
      monthlySpend: yearMonthlySpend,
      annualSpending: yearAnnualSpending,
      annualSavings: yearAnnualSavings,
      fiTarget: yearFiTarget,
      fiProgress,
      coastFiYear,
      coastFiAge: coastFiYear && birthYear ? coastFiYear - birthYear : null,
      isFiYear,
      // Add tax information from dynamic projections if available
      grossIncome: dynamicRow?.grossIncome,
      totalTax: dynamicRow?.totalTax,
      netIncome: dynamicRow?.netIncome,
      preTaxContributions: dynamicRow?.preTaxContributions,
      isCrossover,
      swrCoversSpend,
    });
    
    // Update for next iteration
    previousNetWorth = yearNetWorth;
  }
  
  return data;
}

/**
 * Generate monthly projections with spending that updates each month based on net worth
 * 
 * This provides more accurate projections than yearly calculations because:
 * 1. Spending updates monthly as net worth changes (important for level-based spending)
 * 2. Interest compounds monthly
 * 3. Contributions are distributed monthly
 */
export function generateMonthlyProjections(
  startingNetWorth: number,
  settings: UserSettings,
  months: number = 120, // Default 10 years
  monthlyContribution?: number, // Override for monthly contribution (defaults to yearlyContribution / 12)
  monthlyNetIncome?: number // If provided, use this for savings calculation instead of contribution
): MonthlyProjectionRow[] {
  const {
    currentRate,
    swr,
    yearlyContribution,
    baseMonthlyBudget,
    spendingGrowthRate,
    inflationRate,
  } = settings;

  const monthlyRate = currentRate / 100 / 12; // Monthly return rate
  const contribution = monthlyContribution ?? yearlyContribution / 12;
  
  const data: MonthlyProjectionRow[] = [];
  let netWorth = startingNetWorth;
  let cumulativeInterest = 0;
  let cumulativeContributions = 0;

  for (let i = 0; i < months; i++) {
    const monthIndex = i;
    const yearsFromStart = i / 12;
    const year = new Date().getFullYear() + Math.floor(i / 12);
    const month = (i % 12) + 1; // 1-12

    const startingNW = netWorth;

    // Calculate this month's spending based on current net worth
    // This is the key difference from yearly projections - spending updates each month
    const monthlySpending = calculateLevelBasedSpending(netWorth, settings, yearsFromStart);

    // Calculate monthly savings
    let monthlySavings: number;
    if (monthlyNetIncome !== undefined) {
      // If we have net income info, calculate savings as income - spending
      monthlySavings = monthlyNetIncome - monthlySpending;
    } else {
      // Otherwise use the contribution amount
      monthlySavings = contribution;
    }

    // Calculate interest on current balance
    const monthlyInterest = netWorth * monthlyRate;
    cumulativeInterest += monthlyInterest;

    // Add contribution
    cumulativeContributions += contribution;

    // Calculate end-of-month net worth
    // Net worth grows by interest, plus we add savings (which could be negative if spending > income)
    netWorth = netWorth + monthlyInterest + monthlySavings;

    // SWR calculations
    const swrAmounts = calculateSwrAmounts(netWorth, swr);
    const fiTarget = calculateFiTarget(monthlySpending, swr);
    const fiProgress = fiTarget > 0 ? (netWorth / fiTarget) * 100 : 0;
    const swrCoversSpend = monthlySpending > 0 && swrAmounts.monthly >= monthlySpending;

    data.push({
      month,
      year,
      monthIndex,
      yearsFromStart,
      netWorth,
      startingNetWorth: startingNW,
      monthlyInterest,
      monthlyContribution: contribution,
      monthlySpending,
      monthlySavings,
      cumulativeInterest,
      cumulativeContributions,
      monthlySwr: swrAmounts.monthly,
      fiTarget,
      fiProgress,
      swrCoversSpend,
    });
  }

  return data;
}

/**
 * Generate yearly projections using monthly granularity internally
 * This provides more accurate spending calculations than the original yearly approach
 */
export function generateProjectionsWithMonthlySpending(
  latestEntry: NetWorthEntry | null,
  currentNetWorth: number,
  settings: UserSettings,
  years: number = PROJECTION_YEARS
): ProjectionRow[] {
  if (!latestEntry) return [];

  const { swr, birthDate } = settings;
  const currentYear = new Date().getFullYear();
  const birthYear = birthDate ? new Date(birthDate).getFullYear() : null;

  // Generate monthly projections
  const monthlyData = generateMonthlyProjections(currentNetWorth, settings, years * 12);

  // Aggregate monthly data into yearly summaries
  const yearlyData: ProjectionRow[] = [];
  let fiYearFound = false;
  let crossoverFound = false;

  for (let yearIdx = 0; yearIdx < years; yearIdx++) {
    const year = currentYear + yearIdx;
    const age = birthYear ? year - birthYear : null;

    // Get the 12 months for this year
    const startMonth = yearIdx * 12;
    const endMonth = startMonth + 12;
    const yearMonths = monthlyData.slice(startMonth, endMonth);

    if (yearMonths.length === 0) continue;

    // End of year values from the last month
    const lastMonth = yearMonths[yearMonths.length - 1];
    const yearNetWorth = lastMonth.netWorth;

    // Sum up the year's values
    const yearInterest = yearMonths.reduce((sum, m) => sum + m.monthlyInterest, 0);
    const yearContributions = yearMonths.reduce((sum, m) => sum + m.monthlyContribution, 0);
    const yearSpending = yearMonths.reduce((sum, m) => sum + m.monthlySpending, 0);
    const yearSavings = yearMonths.reduce((sum, m) => sum + m.monthlySavings, 0);

    // Average monthly spending for the year (for FI target calculation)
    const avgMonthlySpend = yearSpending / 12;

    // SWR and FI calculations based on year-end values
    const swrAmounts = calculateSwrAmounts(yearNetWorth, swr);
    const yearFiTarget = calculateFiTarget(avgMonthlySpend, swr);
    const fiProgress = yearFiTarget > 0 ? (yearNetWorth / yearFiTarget) * 100 : 0;
    const swrCoversSpend = avgMonthlySpend > 0 && swrAmounts.monthly >= avgMonthlySpend;

    // Milestones
    const isFiYear = swrCoversSpend && !fiYearFound;
    if (isFiYear) fiYearFound = true;

    const isCrossover = lastMonth.cumulativeInterest > lastMonth.cumulativeContributions && 
                        !crossoverFound && lastMonth.cumulativeContributions > 0;
    if (isCrossover) crossoverFound = true;

    // Years from entry
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
    const yearsFromEntry = (endOfYear - latestEntry.timestamp) / MS_PER_YEAR;

    yearlyData.push({
      year,
      age,
      yearsFromEntry,
      netWorth: yearNetWorth,
      interest: lastMonth.cumulativeInterest,
      contributed: lastMonth.cumulativeContributions,
      annualSwr: swrAmounts.annual,
      monthlySwr: swrAmounts.monthly,
      weeklySwr: swrAmounts.weekly,
      dailySwr: swrAmounts.daily,
      monthlySpend: avgMonthlySpend,
      annualSpending: yearSpending,
      annualSavings: yearSavings,
      fiTarget: yearFiTarget,
      fiProgress,
      coastFiYear: null, // TODO: Calculate if needed
      coastFiAge: null,
      isFiYear,
      isCrossover,
      swrCoversSpend,
    });
  }

  return yearlyData;
}

/**
 * Master calculation function - computes all derived values from settings and entries
 */
export function calculateAllFinancials(
  settings: UserSettings,
  entries: NetWorthEntry[],
  includeContributions: boolean = false,
  applyInflation: boolean = false,
  useSpendingLevels: boolean = false
): CalculatedFinancials {
  const latestEntry = entries[0] || null;
  
  // Real-time net worth
  const currentNetWorth = calculateRealTimeNetWorth(latestEntry, settings, includeContributions);
  
  // Growth rates
  const growthRates = calculateGrowthRates(currentNetWorth.total, settings, includeContributions);
  
  // Projections
  const projections = generateProjections(
    latestEntry,
    currentNetWorth.total,
    currentNetWorth.appreciation,
    settings,
    applyInflation,
    useSpendingLevels
  );
  
  // Level info
  const levelInfo = calculateLevelInfo(currentNetWorth.total, settings, entries);
  
  // Key milestones
  const fiRow = projections.find(p => p.isFiYear);
  const crossoverRow = projections.find(p => p.isCrossover);
  
  // Current SWR
  const currentSwrAmounts = calculateSwrAmounts(currentNetWorth.total, settings.swr);
  
  // Current FI progress - use level-based spending if enabled
  const currentSpendForFi = useSpendingLevels
    ? calculateLevelBasedSpending(currentNetWorth.total, settings, 0)
    : settings.monthlySpend;
  const currentFiTarget = calculateFiTarget(currentSpendForFi, settings.swr);
  const currentFiProgress = currentFiTarget > 0 
    ? (currentNetWorth.total / currentFiTarget) * 100 
    : 0;
  
  return {
    currentNetWorth,
    growthRates,
    projections,
    levelInfo,
    fiYear: typeof fiRow?.year === 'number' ? fiRow.year : null,
    fiAge: fiRow?.age ?? null,
    crossoverYear: typeof crossoverRow?.year === 'number' ? crossoverRow.year : null,
    currentFiProgress,
    currentMonthlySwr: currentSwrAmounts.monthly,
    currentAnnualSwr: currentSwrAmounts.annual,
  };
}

/**
 * Hook-compatible function to merge partial settings with defaults
 */
export function mergeWithDefaults(
  partial: Partial<UserSettings> | null | undefined
): UserSettings {
  if (!partial) return DEFAULT_SETTINGS;
  return {
    currentRate: partial.currentRate ?? DEFAULT_SETTINGS.currentRate,
    swr: partial.swr ?? DEFAULT_SETTINGS.swr,
    yearlyContribution: partial.yearlyContribution ?? DEFAULT_SETTINGS.yearlyContribution,
    birthDate: partial.birthDate ?? DEFAULT_SETTINGS.birthDate,
    monthlySpend: partial.monthlySpend ?? DEFAULT_SETTINGS.monthlySpend,
    inflationRate: partial.inflationRate ?? DEFAULT_SETTINGS.inflationRate,
    baseMonthlyBudget: partial.baseMonthlyBudget ?? DEFAULT_SETTINGS.baseMonthlyBudget,
    spendingGrowthRate: partial.spendingGrowthRate ?? DEFAULT_SETTINGS.spendingGrowthRate,
  };
}

// ============================================================================
// INCOME & TAX CALCULATIONS - Ultra-Precise with Marginal Brackets
// ============================================================================

export type FilingStatus = 'single' | 'married_jointly' | 'married_separately' | 'head_of_household';

// Tax bracket interface for precise marginal calculations
interface TaxBracket {
  min: number;
  max: number;
  rate: number; // Percentage (e.g., 10 for 10%)
}

// ============================================================================
// 2025 FEDERAL TAX BRACKETS (IRS Rev. Proc. 2024-40)
// ============================================================================
const FEDERAL_TAX_BRACKETS: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { min: 0, max: 11925, rate: 10 },
    { min: 11925, max: 48475, rate: 12 },
    { min: 48475, max: 103350, rate: 22 },
    { min: 103350, max: 197300, rate: 24 },
    { min: 197300, max: 250525, rate: 32 },
    { min: 250525, max: 626350, rate: 35 },
    { min: 626350, max: Infinity, rate: 37 },
  ],
  married_jointly: [
    { min: 0, max: 23850, rate: 10 },
    { min: 23850, max: 96950, rate: 12 },
    { min: 96950, max: 206700, rate: 22 },
    { min: 206700, max: 394600, rate: 24 },
    { min: 394600, max: 501050, rate: 32 },
    { min: 501050, max: 751600, rate: 35 },
    { min: 751600, max: Infinity, rate: 37 },
  ],
  married_separately: [
    { min: 0, max: 11925, rate: 10 },
    { min: 11925, max: 48475, rate: 12 },
    { min: 48475, max: 103350, rate: 22 },
    { min: 103350, max: 197300, rate: 24 },
    { min: 197300, max: 250525, rate: 32 },
    { min: 250525, max: 375800, rate: 35 },
    { min: 375800, max: Infinity, rate: 37 },
  ],
  head_of_household: [
    { min: 0, max: 17000, rate: 10 },
    { min: 17000, max: 64850, rate: 12 },
    { min: 64850, max: 103350, rate: 22 },
    { min: 103350, max: 197300, rate: 24 },
    { min: 197300, max: 250500, rate: 32 },
    { min: 250500, max: 626350, rate: 35 },
    { min: 626350, max: Infinity, rate: 37 },
  ],
};

// 2025 Standard Deductions
const STANDARD_DEDUCTIONS: Record<FilingStatus, number> = {
  single: 15000,
  married_jointly: 30000,
  married_separately: 15000,
  head_of_household: 22500,
};

// ============================================================================
// STATE TAX BRACKETS - Full Progressive Brackets for All States
// Based on 2025 tax year data (or latest available)
// ============================================================================

interface StateTaxInfo {
  name: string;
  type: 'none' | 'flat' | 'progressive';
  flatRate?: number; // For flat-rate states
  brackets?: {
    single: TaxBracket[];
    married_jointly: TaxBracket[];
    married_separately?: TaxBracket[];
    head_of_household?: TaxBracket[];
  };
  standardDeduction?: {
    single: number;
    married_jointly: number;
    married_separately?: number;
    head_of_household?: number;
  };
  personalExemption?: {
    single: number;
    married_jointly: number;
    dependent?: number;
  };
}

export const STATE_TAX_INFO: Record<string, StateTaxInfo> = {
  // NO STATE INCOME TAX
  AK: { name: 'Alaska', type: 'none' },
  FL: { name: 'Florida', type: 'none' },
  NV: { name: 'Nevada', type: 'none' },
  NH: { name: 'New Hampshire', type: 'none' }, // No tax on wages (interest/dividends only)
  SD: { name: 'South Dakota', type: 'none' },
  TN: { name: 'Tennessee', type: 'none' },
  TX: { name: 'Texas', type: 'none' },
  WA: { name: 'Washington', type: 'none' },
  WY: { name: 'Wyoming', type: 'none' },

  // FLAT RATE STATES
  AZ: { name: 'Arizona', type: 'flat', flatRate: 2.5 },
  CO: { name: 'Colorado', type: 'flat', flatRate: 4.4 },
  GA: { name: 'Georgia', type: 'flat', flatRate: 5.49 },
  ID: { name: 'Idaho', type: 'flat', flatRate: 5.8 },
  IL: { name: 'Illinois', type: 'flat', flatRate: 4.95 },
  IN: { name: 'Indiana', type: 'flat', flatRate: 3.05 },
  KY: { name: 'Kentucky', type: 'flat', flatRate: 4.0 },
  MA: { name: 'Massachusetts', type: 'flat', flatRate: 5.0 }, // Plus 4% surtax on income > $1M
  MI: { name: 'Michigan', type: 'flat', flatRate: 4.25 },
  MS: { name: 'Mississippi', type: 'flat', flatRate: 4.7 },
  NC: { name: 'North Carolina', type: 'flat', flatRate: 4.5 },
  PA: { name: 'Pennsylvania', type: 'flat', flatRate: 3.07 },
  UT: { name: 'Utah', type: 'flat', flatRate: 4.65 },

  // PROGRESSIVE STATES - Full Bracket Details

  AL: {
    name: 'Alabama',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 500, rate: 2 },
        { min: 500, max: 3000, rate: 4 },
        { min: 3000, max: Infinity, rate: 5 },
      ],
      married_jointly: [
        { min: 0, max: 1000, rate: 2 },
        { min: 1000, max: 6000, rate: 4 },
        { min: 6000, max: Infinity, rate: 5 },
      ],
    },
    standardDeduction: { single: 2500, married_jointly: 7500 },
    personalExemption: { single: 1500, married_jointly: 3000, dependent: 1000 },
  },

  AR: {
    name: 'Arkansas',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 4400, rate: 0 },
        { min: 4400, max: 8800, rate: 2 },
        { min: 8800, max: 13200, rate: 3 },
        { min: 13200, max: 22000, rate: 3.4 },
        { min: 22000, max: 87000, rate: 4.4 },
        { min: 87000, max: Infinity, rate: 4.4 },
      ],
      married_jointly: [
        { min: 0, max: 4400, rate: 0 },
        { min: 4400, max: 8800, rate: 2 },
        { min: 8800, max: 13200, rate: 3 },
        { min: 13200, max: 22000, rate: 3.4 },
        { min: 22000, max: 87000, rate: 4.4 },
        { min: 87000, max: Infinity, rate: 4.4 },
      ],
    },
  },

  CA: {
    name: 'California',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 10412, rate: 1 },
        { min: 10412, max: 24684, rate: 2 },
        { min: 24684, max: 38959, rate: 4 },
        { min: 38959, max: 54081, rate: 6 },
        { min: 54081, max: 68350, rate: 8 },
        { min: 68350, max: 349137, rate: 9.3 },
        { min: 349137, max: 418961, rate: 10.3 },
        { min: 418961, max: 698271, rate: 11.3 },
        { min: 698271, max: 1000000, rate: 12.3 },
        { min: 1000000, max: Infinity, rate: 13.3 }, // Mental Health Services Tax
      ],
      married_jointly: [
        { min: 0, max: 20824, rate: 1 },
        { min: 20824, max: 49368, rate: 2 },
        { min: 49368, max: 77918, rate: 4 },
        { min: 77918, max: 108162, rate: 6 },
        { min: 108162, max: 136700, rate: 8 },
        { min: 136700, max: 698274, rate: 9.3 },
        { min: 698274, max: 837922, rate: 10.3 },
        { min: 837922, max: 1396542, rate: 11.3 },
        { min: 1396542, max: 2000000, rate: 12.3 },
        { min: 2000000, max: Infinity, rate: 13.3 },
      ],
    },
    standardDeduction: { single: 5706, married_jointly: 11412 }, // 2025 values
    // IMPORTANT: California does NOT allow HSA deductions for state tax purposes
    // This is handled in the calculateTaxes() function by adding back HSA contributions
  },

  CT: {
    name: 'Connecticut',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 10000, rate: 2 },
        { min: 10000, max: 50000, rate: 4.5 },
        { min: 50000, max: 100000, rate: 5.5 },
        { min: 100000, max: 200000, rate: 6 },
        { min: 200000, max: 250000, rate: 6.5 },
        { min: 250000, max: 500000, rate: 6.9 },
        { min: 500000, max: Infinity, rate: 6.99 },
      ],
      married_jointly: [
        { min: 0, max: 20000, rate: 2 },
        { min: 20000, max: 100000, rate: 4.5 },
        { min: 100000, max: 200000, rate: 5.5 },
        { min: 200000, max: 400000, rate: 6 },
        { min: 400000, max: 500000, rate: 6.5 },
        { min: 500000, max: 1000000, rate: 6.9 },
        { min: 1000000, max: Infinity, rate: 6.99 },
      ],
    },
    personalExemption: { single: 15000, married_jointly: 24000 },
  },

  DE: {
    name: 'Delaware',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 2000, rate: 0 },
        { min: 2000, max: 5000, rate: 2.2 },
        { min: 5000, max: 10000, rate: 3.9 },
        { min: 10000, max: 20000, rate: 4.8 },
        { min: 20000, max: 25000, rate: 5.2 },
        { min: 25000, max: 60000, rate: 5.55 },
        { min: 60000, max: Infinity, rate: 6.6 },
      ],
      married_jointly: [
        { min: 0, max: 2000, rate: 0 },
        { min: 2000, max: 5000, rate: 2.2 },
        { min: 5000, max: 10000, rate: 3.9 },
        { min: 10000, max: 20000, rate: 4.8 },
        { min: 20000, max: 25000, rate: 5.2 },
        { min: 25000, max: 60000, rate: 5.55 },
        { min: 60000, max: Infinity, rate: 6.6 },
      ],
    },
    standardDeduction: { single: 3250, married_jointly: 6500 },
    personalExemption: { single: 110, married_jointly: 220, dependent: 110 },
  },

  DC: {
    name: 'Washington DC',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 10000, rate: 4 },
        { min: 10000, max: 40000, rate: 6 },
        { min: 40000, max: 60000, rate: 6.5 },
        { min: 60000, max: 250000, rate: 8.5 },
        { min: 250000, max: 500000, rate: 9.25 },
        { min: 500000, max: 1000000, rate: 9.75 },
        { min: 1000000, max: Infinity, rate: 10.75 },
      ],
      married_jointly: [
        { min: 0, max: 10000, rate: 4 },
        { min: 10000, max: 40000, rate: 6 },
        { min: 40000, max: 60000, rate: 6.5 },
        { min: 60000, max: 250000, rate: 8.5 },
        { min: 250000, max: 500000, rate: 9.25 },
        { min: 500000, max: 1000000, rate: 9.75 },
        { min: 1000000, max: Infinity, rate: 10.75 },
      ],
    },
    standardDeduction: { single: 12950, married_jointly: 25900 },
  },

  HI: {
    name: 'Hawaii',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 2400, rate: 1.4 },
        { min: 2400, max: 4800, rate: 3.2 },
        { min: 4800, max: 9600, rate: 5.5 },
        { min: 9600, max: 14400, rate: 6.4 },
        { min: 14400, max: 19200, rate: 6.8 },
        { min: 19200, max: 24000, rate: 7.2 },
        { min: 24000, max: 36000, rate: 7.6 },
        { min: 36000, max: 48000, rate: 7.9 },
        { min: 48000, max: 150000, rate: 8.25 },
        { min: 150000, max: 175000, rate: 9 },
        { min: 175000, max: 200000, rate: 10 },
        { min: 200000, max: Infinity, rate: 11 },
      ],
      married_jointly: [
        { min: 0, max: 4800, rate: 1.4 },
        { min: 4800, max: 9600, rate: 3.2 },
        { min: 9600, max: 19200, rate: 5.5 },
        { min: 19200, max: 28800, rate: 6.4 },
        { min: 28800, max: 38400, rate: 6.8 },
        { min: 38400, max: 48000, rate: 7.2 },
        { min: 48000, max: 72000, rate: 7.6 },
        { min: 72000, max: 96000, rate: 7.9 },
        { min: 96000, max: 300000, rate: 8.25 },
        { min: 300000, max: 350000, rate: 9 },
        { min: 350000, max: 400000, rate: 10 },
        { min: 400000, max: Infinity, rate: 11 },
      ],
    },
    standardDeduction: { single: 2200, married_jointly: 4400 },
  },

  IA: {
    name: 'Iowa',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 6210, rate: 4.4 },
        { min: 6210, max: 31050, rate: 4.82 },
        { min: 31050, max: Infinity, rate: 5.7 },
      ],
      married_jointly: [
        { min: 0, max: 12420, rate: 4.4 },
        { min: 12420, max: 62100, rate: 4.82 },
        { min: 62100, max: Infinity, rate: 5.7 },
      ],
    },
  },

  KS: {
    name: 'Kansas',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 15000, rate: 3.1 },
        { min: 15000, max: 30000, rate: 5.25 },
        { min: 30000, max: Infinity, rate: 5.7 },
      ],
      married_jointly: [
        { min: 0, max: 30000, rate: 3.1 },
        { min: 30000, max: 60000, rate: 5.25 },
        { min: 60000, max: Infinity, rate: 5.7 },
      ],
    },
    standardDeduction: { single: 3500, married_jointly: 8000 },
  },

  LA: {
    name: 'Louisiana',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 12500, rate: 1.85 },
        { min: 12500, max: 50000, rate: 3.5 },
        { min: 50000, max: Infinity, rate: 4.25 },
      ],
      married_jointly: [
        { min: 0, max: 25000, rate: 1.85 },
        { min: 25000, max: 100000, rate: 3.5 },
        { min: 100000, max: Infinity, rate: 4.25 },
      ],
    },
  },

  ME: {
    name: 'Maine',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 24500, rate: 5.8 },
        { min: 24500, max: 58050, rate: 6.75 },
        { min: 58050, max: Infinity, rate: 7.15 },
      ],
      married_jointly: [
        { min: 0, max: 49050, rate: 5.8 },
        { min: 49050, max: 116100, rate: 6.75 },
        { min: 116100, max: Infinity, rate: 7.15 },
      ],
    },
    standardDeduction: { single: 14600, married_jointly: 29200 },
    personalExemption: { single: 4700, married_jointly: 9400, dependent: 4700 },
  },

  MD: {
    name: 'Maryland',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 1000, rate: 2 },
        { min: 1000, max: 2000, rate: 3 },
        { min: 2000, max: 3000, rate: 4 },
        { min: 3000, max: 100000, rate: 4.75 },
        { min: 100000, max: 125000, rate: 5 },
        { min: 125000, max: 150000, rate: 5.25 },
        { min: 150000, max: 250000, rate: 5.5 },
        { min: 250000, max: Infinity, rate: 5.75 },
      ],
      married_jointly: [
        { min: 0, max: 1000, rate: 2 },
        { min: 1000, max: 2000, rate: 3 },
        { min: 2000, max: 3000, rate: 4 },
        { min: 3000, max: 150000, rate: 4.75 },
        { min: 150000, max: 175000, rate: 5 },
        { min: 175000, max: 225000, rate: 5.25 },
        { min: 225000, max: 300000, rate: 5.5 },
        { min: 300000, max: Infinity, rate: 5.75 },
      ],
    },
    standardDeduction: { single: 2550, married_jointly: 5100 },
    personalExemption: { single: 3200, married_jointly: 6400, dependent: 3200 },
  },

  MN: {
    name: 'Minnesota',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 31690, rate: 5.35 },
        { min: 31690, max: 104090, rate: 6.8 },
        { min: 104090, max: 183340, rate: 7.85 },
        { min: 183340, max: Infinity, rate: 9.85 },
      ],
      married_jointly: [
        { min: 0, max: 46330, rate: 5.35 },
        { min: 46330, max: 184040, rate: 6.8 },
        { min: 184040, max: 321450, rate: 7.85 },
        { min: 321450, max: Infinity, rate: 9.85 },
      ],
    },
    standardDeduction: { single: 14575, married_jointly: 29150 },
  },

  MO: {
    name: 'Missouri',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 1207, rate: 0 },
        { min: 1207, max: 2414, rate: 2 },
        { min: 2414, max: 3621, rate: 2.5 },
        { min: 3621, max: 4828, rate: 3 },
        { min: 4828, max: 6035, rate: 3.5 },
        { min: 6035, max: 7242, rate: 4 },
        { min: 7242, max: 8449, rate: 4.5 },
        { min: 8449, max: Infinity, rate: 4.8 },
      ],
      married_jointly: [
        { min: 0, max: 1207, rate: 0 },
        { min: 1207, max: 2414, rate: 2 },
        { min: 2414, max: 3621, rate: 2.5 },
        { min: 3621, max: 4828, rate: 3 },
        { min: 4828, max: 6035, rate: 3.5 },
        { min: 6035, max: 7242, rate: 4 },
        { min: 7242, max: 8449, rate: 4.5 },
        { min: 8449, max: Infinity, rate: 4.8 },
      ],
    },
    standardDeduction: { single: 14600, married_jointly: 29200 },
  },

  MT: {
    name: 'Montana',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 20500, rate: 4.7 },
        { min: 20500, max: Infinity, rate: 5.9 },
      ],
      married_jointly: [
        { min: 0, max: 41000, rate: 4.7 },
        { min: 41000, max: Infinity, rate: 5.9 },
      ],
    },
    standardDeduction: { single: 14600, married_jointly: 29200 },
  },

  NE: {
    name: 'Nebraska',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 3700, rate: 2.46 },
        { min: 3700, max: 22170, rate: 3.51 },
        { min: 22170, max: 35730, rate: 5.01 },
        { min: 35730, max: Infinity, rate: 5.84 },
      ],
      married_jointly: [
        { min: 0, max: 7390, rate: 2.46 },
        { min: 7390, max: 44350, rate: 3.51 },
        { min: 44350, max: 71460, rate: 5.01 },
        { min: 71460, max: Infinity, rate: 5.84 },
      ],
    },
    standardDeduction: { single: 7900, married_jointly: 15800 },
  },

  NJ: {
    name: 'New Jersey',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 20000, rate: 1.4 },
        { min: 20000, max: 35000, rate: 1.75 },
        { min: 35000, max: 40000, rate: 3.5 },
        { min: 40000, max: 75000, rate: 5.525 },
        { min: 75000, max: 500000, rate: 6.37 },
        { min: 500000, max: 1000000, rate: 8.97 },
        { min: 1000000, max: Infinity, rate: 10.75 },
      ],
      married_jointly: [
        { min: 0, max: 20000, rate: 1.4 },
        { min: 20000, max: 50000, rate: 1.75 },
        { min: 50000, max: 70000, rate: 2.45 },
        { min: 70000, max: 80000, rate: 3.5 },
        { min: 80000, max: 150000, rate: 5.525 },
        { min: 150000, max: 500000, rate: 6.37 },
        { min: 500000, max: 1000000, rate: 8.97 },
        { min: 1000000, max: Infinity, rate: 10.75 },
      ],
    },
  },

  NM: {
    name: 'New Mexico',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 5500, rate: 1.7 },
        { min: 5500, max: 11000, rate: 3.2 },
        { min: 11000, max: 16000, rate: 4.7 },
        { min: 16000, max: 210000, rate: 4.9 },
        { min: 210000, max: Infinity, rate: 5.9 },
      ],
      married_jointly: [
        { min: 0, max: 8000, rate: 1.7 },
        { min: 8000, max: 16000, rate: 3.2 },
        { min: 16000, max: 24000, rate: 4.7 },
        { min: 24000, max: 315000, rate: 4.9 },
        { min: 315000, max: Infinity, rate: 5.9 },
      ],
    },
    standardDeduction: { single: 14600, married_jointly: 29200 },
  },

  NY: {
    name: 'New York',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 8500, rate: 4 },
        { min: 8500, max: 11700, rate: 4.5 },
        { min: 11700, max: 13900, rate: 5.25 },
        { min: 13900, max: 80650, rate: 5.5 },
        { min: 80650, max: 215400, rate: 6 },
        { min: 215400, max: 1077550, rate: 6.85 },
        { min: 1077550, max: 5000000, rate: 9.65 },
        { min: 5000000, max: 25000000, rate: 10.3 },
        { min: 25000000, max: Infinity, rate: 10.9 },
      ],
      married_jointly: [
        { min: 0, max: 17150, rate: 4 },
        { min: 17150, max: 23600, rate: 4.5 },
        { min: 23600, max: 27900, rate: 5.25 },
        { min: 27900, max: 161550, rate: 5.5 },
        { min: 161550, max: 323200, rate: 6 },
        { min: 323200, max: 2155350, rate: 6.85 },
        { min: 2155350, max: 5000000, rate: 9.65 },
        { min: 5000000, max: 25000000, rate: 10.3 },
        { min: 25000000, max: Infinity, rate: 10.9 },
      ],
    },
    standardDeduction: { single: 8000, married_jointly: 16050 },
  },

  ND: {
    name: 'North Dakota',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 44725, rate: 0 },
        { min: 44725, max: 225975, rate: 1.95 },
        { min: 225975, max: Infinity, rate: 2.5 },
      ],
      married_jointly: [
        { min: 0, max: 74750, rate: 0 },
        { min: 74750, max: 275100, rate: 1.95 },
        { min: 275100, max: Infinity, rate: 2.5 },
      ],
    },
  },

  OH: {
    name: 'Ohio',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 26050, rate: 0 },
        { min: 26050, max: 100000, rate: 2.75 },
        { min: 100000, max: Infinity, rate: 3.5 },
      ],
      married_jointly: [
        { min: 0, max: 26050, rate: 0 },
        { min: 26050, max: 100000, rate: 2.75 },
        { min: 100000, max: Infinity, rate: 3.5 },
      ],
    },
  },

  OK: {
    name: 'Oklahoma',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 1000, rate: 0.25 },
        { min: 1000, max: 2500, rate: 0.75 },
        { min: 2500, max: 3750, rate: 1.75 },
        { min: 3750, max: 4900, rate: 2.75 },
        { min: 4900, max: 7200, rate: 3.75 },
        { min: 7200, max: Infinity, rate: 4.75 },
      ],
      married_jointly: [
        { min: 0, max: 2000, rate: 0.25 },
        { min: 2000, max: 5000, rate: 0.75 },
        { min: 5000, max: 7500, rate: 1.75 },
        { min: 7500, max: 9800, rate: 2.75 },
        { min: 9800, max: 12200, rate: 3.75 },
        { min: 12200, max: Infinity, rate: 4.75 },
      ],
    },
    standardDeduction: { single: 6350, married_jointly: 12700 },
  },

  OR: {
    name: 'Oregon',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 4050, rate: 4.75 },
        { min: 4050, max: 10200, rate: 6.75 },
        { min: 10200, max: 125000, rate: 8.75 },
        { min: 125000, max: Infinity, rate: 9.9 },
      ],
      married_jointly: [
        { min: 0, max: 8100, rate: 4.75 },
        { min: 8100, max: 20400, rate: 6.75 },
        { min: 20400, max: 250000, rate: 8.75 },
        { min: 250000, max: Infinity, rate: 9.9 },
      ],
    },
    standardDeduction: { single: 2605, married_jointly: 5210 },
  },

  RI: {
    name: 'Rhode Island',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 73450, rate: 3.75 },
        { min: 73450, max: 166950, rate: 4.75 },
        { min: 166950, max: Infinity, rate: 5.99 },
      ],
      married_jointly: [
        { min: 0, max: 73450, rate: 3.75 },
        { min: 73450, max: 166950, rate: 4.75 },
        { min: 166950, max: Infinity, rate: 5.99 },
      ],
    },
    standardDeduction: { single: 10550, married_jointly: 21150 },
  },

  SC: {
    name: 'South Carolina',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 3460, rate: 0 },
        { min: 3460, max: 17330, rate: 3 },
        { min: 17330, max: Infinity, rate: 6.2 },
      ],
      married_jointly: [
        { min: 0, max: 3460, rate: 0 },
        { min: 3460, max: 17330, rate: 3 },
        { min: 17330, max: Infinity, rate: 6.2 },
      ],
    },
    standardDeduction: { single: 14600, married_jointly: 29200 },
  },

  VT: {
    name: 'Vermont',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 45400, rate: 3.35 },
        { min: 45400, max: 110050, rate: 6.6 },
        { min: 110050, max: 229550, rate: 7.6 },
        { min: 229550, max: Infinity, rate: 8.75 },
      ],
      married_jointly: [
        { min: 0, max: 75850, rate: 3.35 },
        { min: 75850, max: 183400, rate: 6.6 },
        { min: 183400, max: 279450, rate: 7.6 },
        { min: 279450, max: Infinity, rate: 8.75 },
      ],
    },
    standardDeduction: { single: 7000, married_jointly: 14350 },
  },

  VA: {
    name: 'Virginia',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 3000, rate: 2 },
        { min: 3000, max: 5000, rate: 3 },
        { min: 5000, max: 17000, rate: 5 },
        { min: 17000, max: Infinity, rate: 5.75 },
      ],
      married_jointly: [
        { min: 0, max: 3000, rate: 2 },
        { min: 3000, max: 5000, rate: 3 },
        { min: 5000, max: 17000, rate: 5 },
        { min: 17000, max: Infinity, rate: 5.75 },
      ],
    },
    standardDeduction: { single: 8500, married_jointly: 17000 },
  },

  WV: {
    name: 'West Virginia',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 10000, rate: 2.36 },
        { min: 10000, max: 25000, rate: 3.15 },
        { min: 25000, max: 40000, rate: 3.54 },
        { min: 40000, max: 60000, rate: 4.72 },
        { min: 60000, max: Infinity, rate: 5.12 },
      ],
      married_jointly: [
        { min: 0, max: 10000, rate: 2.36 },
        { min: 10000, max: 25000, rate: 3.15 },
        { min: 25000, max: 40000, rate: 3.54 },
        { min: 40000, max: 60000, rate: 4.72 },
        { min: 60000, max: Infinity, rate: 5.12 },
      ],
    },
  },

  WI: {
    name: 'Wisconsin',
    type: 'progressive',
    brackets: {
      single: [
        { min: 0, max: 14320, rate: 3.5 },
        { min: 14320, max: 28640, rate: 4.4 },
        { min: 28640, max: 315310, rate: 5.3 },
        { min: 315310, max: Infinity, rate: 7.65 },
      ],
      married_jointly: [
        { min: 0, max: 19090, rate: 3.5 },
        { min: 19090, max: 38190, rate: 4.4 },
        { min: 38190, max: 420420, rate: 5.3 },
        { min: 420420, max: Infinity, rate: 7.65 },
      ],
    },
    standardDeduction: { single: 13230, married_jointly: 24500 },
  },
};

// Legacy flat rate mapping for backwards compatibility
export const STATE_TAX_RATES: Record<string, { name: string; rate: number }> = Object.fromEntries(
  Object.entries(STATE_TAX_INFO).map(([code, info]) => {
    let rate = 0;
    if (info.type === 'flat' && info.flatRate) {
      rate = info.flatRate;
    } else if (info.type === 'progressive' && info.brackets) {
      // Use top marginal rate as approximation
      const topBracket = info.brackets.single[info.brackets.single.length - 1];
      rate = topBracket.rate;
    }
    return [code, { name: info.name, rate }];
  })
);

// ============================================================================
// FICA TAXES - Social Security & Medicare (2025 rates)
// ============================================================================

// Social Security
const SOCIAL_SECURITY_RATE = 6.2; // Employee portion
const SOCIAL_SECURITY_WAGE_CAP = 176100; // 2025 cap (increased from 168,600 in 2024)

// Medicare
const MEDICARE_RATE = 1.45; // Base rate
const MEDICARE_ADDITIONAL_RATE = 0.9; // Additional Medicare tax for high earners (ACA)
const MEDICARE_ADDITIONAL_THRESHOLD_SINGLE = 200000;
const MEDICARE_ADDITIONAL_THRESHOLD_MARRIED_JOINTLY = 250000;
const MEDICARE_ADDITIONAL_THRESHOLD_MARRIED_SEPARATELY = 125000;

// ============================================================================
// 2025 Contribution Limits
// ============================================================================

export const CONTRIBUTION_LIMITS = {
  traditional401k: 23500, // Increased from $23,000 in 2024
  traditional401kCatchUp: 7500, // Age 50-59 and 64+
  traditional401kSuperCatchUp: 11250, // Age 60-63 (new for 2025 under SECURE 2.0)
  traditionalIRA: 7000,
  traditionalIRACatchUp: 1000, // Age 50+
  hsa_individual: 4300, // Increased from $4,150 in 2024
  hsa_family: 8550, // Increased from $8,300 in 2024
  hsaCatchUp: 1000, // Age 55+
  roth401k: 23500,
  rothIRA: 7000,
};

export interface PreTaxContributions {
  traditional401k: number;
  traditionalIRA: number;
  hsa: number;
  other: number;
}

// Detailed bracket breakdown for transparency
export interface BracketBreakdown {
  bracketMin: number;
  bracketMax: number;
  rate: number;           // Percentage rate for this bracket
  taxableInBracket: number; // Amount of income taxed at this rate
  taxFromBracket: number;   // Tax amount from this bracket
}

// Detailed FICA breakdown
export interface FICABreakdown {
  // Social Security
  socialSecurityWages: number;        // Wages subject to SS (capped)
  socialSecurityRate: number;         // 6.2%
  socialSecurityTax: number;
  socialSecurityWageCap: number;      // 2025: $176,100
  wagesAboveSsCap: number;            // Income not subject to SS
  
  // Medicare
  medicareWages: number;              // All wages (no cap)
  medicareBaseRate: number;           // 1.45%
  medicareBaseTax: number;
  
  // Additional Medicare Tax (0.9% above threshold)
  additionalMedicareThreshold: number;
  additionalMedicareWages: number;    // Wages above threshold
  additionalMedicareRate: number;     // 0.9%
  additionalMedicareTax: number;
  
  // Totals
  totalMedicareTax: number;
  totalFicaTax: number;
  effectiveFicaRate: number;
}

export interface TaxCalculation {
  grossIncome: number;
  filingStatus: FilingStatus;
  stateCode: string | null;
  
  // Pre-tax deductions
  preTaxContributions: PreTaxContributions;
  totalPreTaxContributions: number;
  
  // Deductions
  federalStandardDeduction: number;
  stateStandardDeduction: number;
  statePersonalExemption: number;
  
  // Taxable incomes
  adjustedGrossIncome: number;        // Gross - pre-tax contributions (for federal)
  stateAdjustedGrossIncome: number;   // State AGI (may differ from federal - e.g., CA doesn't allow HSA deductions)
  federalTaxableIncome: number;       // AGI - federal standard deduction
  stateTaxableIncome: number;         // State AGI - state deductions (varies by state)
  
  // Federal Tax Details
  federalTax: number;
  federalBracketBreakdown: BracketBreakdown[];
  marginalFederalRate: number;
  effectiveFederalRate: number;
  
  // State Tax Details
  stateTax: number;
  stateTaxType: 'none' | 'flat' | 'progressive';
  stateBracketBreakdown: BracketBreakdown[];
  marginalStateRate: number;
  effectiveStateRate: number;
  
  // FICA Details (Social Security + Medicare)
  fica: FICABreakdown;
  
  // Summary
  totalIncomeTax: number;             // Federal + State
  totalTax: number;                   // Federal + State + FICA
  
  // Legacy fields for compatibility
  socialSecurityTax: number;
  medicareTax: number;
  ficaTax: number;
  
  // Effective rates (as percentage of gross income)
  effectiveTotalRate: number;
  effectiveFicaRate: number;
  
  // Net income
  netIncome: number;                  // Gross - all taxes - pre-tax contributions
  monthlyNetIncome: number;
  monthlyGrossIncome: number;
}

export interface ScenarioIncomeBreakdown {
  // Tax calculation
  taxes: TaxCalculation;
  
  // Spending
  monthlySpending: number;
  annualSpending: number;
  
  // Savings breakdown
  totalPreTaxSavings: number; // 401k, IRA, HSA
  postTaxSavingsAvailable: number; // Net income - spending
  totalAnnualSavings: number; // Pre-tax + post-tax
  monthlySavingsAvailable: number;
  
  // Rates and ratios
  savingsRateOfGross: number; // Total savings / gross income
  savingsRateOfNet: number; // Post-tax savings / net income
  spendingRateOfGross: number;
  spendingRateOfNet: number;
  
  // Allocations (percentages of gross)
  allocationTaxes: number;
  allocationPreTaxSavings: number;
  allocationSpending: number;
  allocationPostTaxSavings: number;
  
  // Net worth context
  currentNetWorth: number;
  yearsOfExpenses: number;
  netWorthToIncomeRatio: number;
  
  // Warnings/suggestions
  warnings: string[];
  suggestions: string[];
}

/**
 * Calculate tax using progressive brackets with detailed breakdown
 * This is a generic function used for both federal and state calculations
 */
function calculateProgressiveTax(
  taxableIncome: number,
  brackets: { min: number; max: number; rate: number }[]
): { tax: number; marginalRate: number; breakdown: BracketBreakdown[] } {
  if (taxableIncome <= 0) {
    return { 
      tax: 0, 
      marginalRate: brackets[0]?.rate || 0, 
      breakdown: [] 
    };
  }
  
  let totalTax = 0;
  let marginalRate = brackets[0]?.rate || 0;
  const breakdown: BracketBreakdown[] = [];
  
  for (const bracket of brackets) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      const taxFromBracket = taxableInBracket * (bracket.rate / 100);
      
      totalTax += taxFromBracket;
      marginalRate = bracket.rate;
      
      if (taxableInBracket > 0) {
        breakdown.push({
          bracketMin: bracket.min,
          bracketMax: bracket.max,
          rate: bracket.rate,
          taxableInBracket,
          taxFromBracket,
        });
      }
    }
  }
  
  return { tax: totalTax, marginalRate, breakdown };
}

/**
 * Calculate federal tax using 2025 progressive brackets with detailed breakdown
 */
export function calculateFederalTax(
  taxableIncome: number, 
  filingStatus: FilingStatus
): { tax: number; marginalRate: number; breakdown: BracketBreakdown[] } {
  const brackets = FEDERAL_TAX_BRACKETS[filingStatus];
  return calculateProgressiveTax(taxableIncome, brackets);
}

/**
 * Get the appropriate state tax brackets for filing status
 */
function getStateBrackets(
  stateInfo: StateTaxInfo, 
  filingStatus: FilingStatus
): { min: number; max: number; rate: number }[] | null {
  if (!stateInfo.brackets) return null;
  
  // Try exact match first
  if (filingStatus === 'single' && stateInfo.brackets.single) {
    return stateInfo.brackets.single;
  }
  if (filingStatus === 'married_jointly' && stateInfo.brackets.married_jointly) {
    return stateInfo.brackets.married_jointly;
  }
  if (filingStatus === 'married_separately') {
    return stateInfo.brackets.married_separately || stateInfo.brackets.single;
  }
  if (filingStatus === 'head_of_household') {
    return stateInfo.brackets.head_of_household || stateInfo.brackets.single;
  }
  
  return stateInfo.brackets.single;
}

/**
 * Get state standard deduction
 */
function getStateStandardDeduction(
  stateInfo: StateTaxInfo,
  filingStatus: FilingStatus
): number {
  if (!stateInfo.standardDeduction) return 0;
  
  if (filingStatus === 'single') {
    return stateInfo.standardDeduction.single || 0;
  }
  if (filingStatus === 'married_jointly') {
    return stateInfo.standardDeduction.married_jointly || 0;
  }
  if (filingStatus === 'married_separately') {
    return stateInfo.standardDeduction.married_separately || 
           (stateInfo.standardDeduction.married_jointly ? stateInfo.standardDeduction.married_jointly / 2 : 0);
  }
  if (filingStatus === 'head_of_household') {
    return stateInfo.standardDeduction.head_of_household || stateInfo.standardDeduction.single || 0;
  }
  
  return 0;
}

/**
 * Get state personal exemption
 */
function getStatePersonalExemption(
  stateInfo: StateTaxInfo,
  filingStatus: FilingStatus
): number {
  if (!stateInfo.personalExemption) return 0;
  
  if (filingStatus === 'single' || filingStatus === 'head_of_household') {
    return stateInfo.personalExemption.single || 0;
  }
  if (filingStatus === 'married_jointly') {
    return stateInfo.personalExemption.married_jointly || 0;
  }
  if (filingStatus === 'married_separately') {
    return (stateInfo.personalExemption.married_jointly || 0) / 2;
  }
  
  return 0;
}

/**
 * Calculate state tax with full progressive bracket support
 */
export function calculateStateTax(
  adjustedGrossIncome: number,
  stateCode: string | null,
  filingStatus: FilingStatus
): { 
  tax: number; 
  marginalRate: number; 
  breakdown: BracketBreakdown[]; 
  type: 'none' | 'flat' | 'progressive';
  standardDeduction: number;
  personalExemption: number;
  taxableIncome: number;
} {
  if (!stateCode || adjustedGrossIncome <= 0) {
    return { 
      tax: 0, 
      marginalRate: 0, 
      breakdown: [], 
      type: 'none',
      standardDeduction: 0,
      personalExemption: 0,
      taxableIncome: 0,
    };
  }
  
  const stateInfo = STATE_TAX_INFO[stateCode.toUpperCase()];
  if (!stateInfo) {
    return { 
      tax: 0, 
      marginalRate: 0, 
      breakdown: [], 
      type: 'none',
      standardDeduction: 0,
      personalExemption: 0,
      taxableIncome: 0,
    };
  }
  
  // No state income tax
  if (stateInfo.type === 'none') {
    return { 
      tax: 0, 
      marginalRate: 0, 
      breakdown: [], 
      type: 'none',
      standardDeduction: 0,
      personalExemption: 0,
      taxableIncome: 0,
    };
  }
  
  // Get state deductions
  const standardDeduction = getStateStandardDeduction(stateInfo, filingStatus);
  const personalExemption = getStatePersonalExemption(stateInfo, filingStatus);
  const taxableIncome = Math.max(0, adjustedGrossIncome - standardDeduction - personalExemption);
  
  // Flat rate state
  if (stateInfo.type === 'flat' && stateInfo.flatRate !== undefined) {
    const tax = taxableIncome * (stateInfo.flatRate / 100);
    
    // Handle Massachusetts millionaire's tax
    if (stateCode.toUpperCase() === 'MA' && taxableIncome > 1000000) {
      const baseAmount = 1000000;
      const excessAmount = taxableIncome - baseAmount;
      const regularTax = baseAmount * (stateInfo.flatRate / 100);
      const surtax = excessAmount * 4 / 100; // 4% surtax on income over $1M
      const totalTax = regularTax + surtax;
      
      return {
        tax: totalTax,
        marginalRate: stateInfo.flatRate + 4,
        breakdown: [
          {
            bracketMin: 0,
            bracketMax: 1000000,
            rate: stateInfo.flatRate,
            taxableInBracket: baseAmount,
            taxFromBracket: regularTax,
          },
          {
            bracketMin: 1000000,
            bracketMax: Infinity,
            rate: stateInfo.flatRate + 4,
            taxableInBracket: excessAmount,
            taxFromBracket: surtax,
          },
        ],
        type: 'flat',
        standardDeduction,
        personalExemption,
        taxableIncome,
      };
    }
    
    return {
      tax,
      marginalRate: stateInfo.flatRate,
      breakdown: taxableIncome > 0 ? [{
        bracketMin: 0,
        bracketMax: Infinity,
        rate: stateInfo.flatRate,
        taxableInBracket: taxableIncome,
        taxFromBracket: tax,
      }] : [],
      type: 'flat',
      standardDeduction,
      personalExemption,
      taxableIncome,
    };
  }
  
  // Progressive state
  if (stateInfo.type === 'progressive') {
    const brackets = getStateBrackets(stateInfo, filingStatus);
    if (!brackets) {
      return { 
        tax: 0, 
        marginalRate: 0, 
        breakdown: [], 
        type: 'progressive',
        standardDeduction,
        personalExemption,
        taxableIncome,
      };
    }
    
    const result = calculateProgressiveTax(taxableIncome, brackets);
    return {
      ...result,
      type: 'progressive',
      standardDeduction,
      personalExemption,
      taxableIncome,
    };
  }
  
  return { 
    tax: 0, 
    marginalRate: 0, 
    breakdown: [], 
    type: 'none',
    standardDeduction: 0,
    personalExemption: 0,
    taxableIncome: 0,
  };
}

/**
 * Calculate FICA taxes (Social Security + Medicare) with detailed breakdown
 */
export function calculateFICATax(
  grossIncome: number, 
  filingStatus: FilingStatus
): FICABreakdown {
  // Social Security (capped at wage base)
  const socialSecurityWages = Math.min(grossIncome, SOCIAL_SECURITY_WAGE_CAP);
  const socialSecurityTax = socialSecurityWages * (SOCIAL_SECURITY_RATE / 100);
  const wagesAboveSsCap = Math.max(0, grossIncome - SOCIAL_SECURITY_WAGE_CAP);
  
  // Medicare base tax (no cap)
  const medicareBaseTax = grossIncome * (MEDICARE_RATE / 100);
  
  // Additional Medicare Tax threshold depends on filing status
  let additionalMedicareThreshold: number;
  switch (filingStatus) {
    case 'married_jointly':
      additionalMedicareThreshold = MEDICARE_ADDITIONAL_THRESHOLD_MARRIED_JOINTLY;
      break;
    case 'married_separately':
      additionalMedicareThreshold = MEDICARE_ADDITIONAL_THRESHOLD_MARRIED_SEPARATELY;
      break;
    default:
      additionalMedicareThreshold = MEDICARE_ADDITIONAL_THRESHOLD_SINGLE;
  }
  
  // Additional Medicare Tax (0.9% on wages above threshold)
  const additionalMedicareWages = Math.max(0, grossIncome - additionalMedicareThreshold);
  const additionalMedicareTax = additionalMedicareWages * (MEDICARE_ADDITIONAL_RATE / 100);
  
  const totalMedicareTax = medicareBaseTax + additionalMedicareTax;
  const totalFicaTax = socialSecurityTax + totalMedicareTax;
  
  return {
    socialSecurityWages,
    socialSecurityRate: SOCIAL_SECURITY_RATE,
    socialSecurityTax,
    socialSecurityWageCap: SOCIAL_SECURITY_WAGE_CAP,
    wagesAboveSsCap,
    
    medicareWages: grossIncome,
    medicareBaseRate: MEDICARE_RATE,
    medicareBaseTax,
    
    additionalMedicareThreshold,
    additionalMedicareWages,
    additionalMedicareRate: MEDICARE_ADDITIONAL_RATE,
    additionalMedicareTax,
    
    totalMedicareTax,
    totalFicaTax,
    effectiveFicaRate: grossIncome > 0 ? (totalFicaTax / grossIncome) * 100 : 0,
  };
}

/**
 * Complete tax calculation with ultra-precise marginal bracket calculations
 * for federal, state, Social Security, and Medicare taxes.
 */
export function calculateTaxes(
  grossIncome: number,
  filingStatus: FilingStatus,
  stateCode: string | null,
  preTaxContributions: PreTaxContributions
): TaxCalculation {
  // Calculate total pre-tax contributions
  const totalPreTaxContributions = 
    preTaxContributions.traditional401k + 
    preTaxContributions.traditionalIRA + 
    preTaxContributions.hsa + 
    preTaxContributions.other;
  
  // Adjusted Gross Income (AGI) - Gross minus pre-tax contributions
  const adjustedGrossIncome = Math.max(0, grossIncome - totalPreTaxContributions);
  
  // Federal Standard Deduction (2025)
  const federalStandardDeduction = STANDARD_DEDUCTIONS[filingStatus];
  
  // Federal Taxable Income
  const federalTaxableIncome = Math.max(0, adjustedGrossIncome - federalStandardDeduction);
  
  // Calculate Federal Tax with detailed bracket breakdown
  const federalResult = calculateFederalTax(federalTaxableIncome, filingStatus);
  
  // Calculate State Tax with detailed bracket breakdown
  // Note: State taxes are typically calculated on AGI with state-specific deductions
  // IMPORTANT: California and New Jersey do NOT allow HSA deductions
  // For these states, we need to add back HSA contributions to AGI
  const stateAGI = (stateCode?.toUpperCase() === 'CA' || stateCode?.toUpperCase() === 'NJ')
    ? adjustedGrossIncome + preTaxContributions.hsa
    : adjustedGrossIncome;
  const stateResult = calculateStateTax(stateAGI, stateCode, filingStatus);
  
  // Calculate FICA with detailed breakdown
  // Note: FICA is calculated on gross wages, NOT reduced by 401k/IRA contributions
  // However, HSA contributions through payroll DO reduce FICA taxes
  // For simplicity, we're applying FICA to gross income
  const ficaResult = calculateFICATax(grossIncome, filingStatus);
  
  // Calculate totals
  const totalIncomeTax = federalResult.tax + stateResult.tax;
  const totalTax = totalIncomeTax + ficaResult.totalFicaTax;
  
  // Net income after all taxes and pre-tax contributions
  const netIncome = grossIncome - totalTax - totalPreTaxContributions;
  
  return {
    grossIncome,
    filingStatus,
    stateCode,
    
    // Pre-tax deductions
    preTaxContributions,
    totalPreTaxContributions,
    
    // Deductions
    federalStandardDeduction,
    stateStandardDeduction: stateResult.standardDeduction,
    statePersonalExemption: stateResult.personalExemption,
    
    // Taxable incomes
    adjustedGrossIncome,
    stateAdjustedGrossIncome: stateAGI,
    federalTaxableIncome,
    stateTaxableIncome: stateResult.taxableIncome,
    
    // Federal Tax Details
    federalTax: federalResult.tax,
    federalBracketBreakdown: federalResult.breakdown,
    marginalFederalRate: federalResult.marginalRate,
    effectiveFederalRate: grossIncome > 0 ? (federalResult.tax / grossIncome) * 100 : 0,
    
    // State Tax Details
    stateTax: stateResult.tax,
    stateTaxType: stateResult.type,
    stateBracketBreakdown: stateResult.breakdown,
    marginalStateRate: stateResult.marginalRate,
    effectiveStateRate: grossIncome > 0 ? (stateResult.tax / grossIncome) * 100 : 0,
    
    // FICA Details
    fica: ficaResult,
    
    // Summary
    totalIncomeTax,
    totalTax,
    
    // Legacy fields for compatibility
    socialSecurityTax: ficaResult.socialSecurityTax,
    medicareTax: ficaResult.totalMedicareTax,
    ficaTax: ficaResult.totalFicaTax,
    
    // Effective rates
    effectiveTotalRate: grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0,
    effectiveFicaRate: ficaResult.effectiveFicaRate,
    
    // Net income
    netIncome,
    monthlyNetIncome: netIncome / 12,
    monthlyGrossIncome: grossIncome / 12,
  };
}

/**
 * Calculate complete scenario income breakdown
 */
export function calculateScenarioIncome(
  grossIncome: number,
  filingStatus: FilingStatus,
  stateCode: string | null,
  preTaxContributions: PreTaxContributions,
  monthlySpending: number,
  currentNetWorth: number
): ScenarioIncomeBreakdown {
  const taxes = calculateTaxes(grossIncome, filingStatus, stateCode, preTaxContributions);
  
  const annualSpending = monthlySpending * 12;
  const totalPreTaxSavings = taxes.totalPreTaxContributions;
  const postTaxSavingsAvailable = Math.max(0, taxes.netIncome - annualSpending);
  const totalAnnualSavings = totalPreTaxSavings + postTaxSavingsAvailable;
  
  // Calculate rates
  const savingsRateOfGross = grossIncome > 0 ? (totalAnnualSavings / grossIncome) * 100 : 0;
  const savingsRateOfNet = taxes.netIncome > 0 ? (postTaxSavingsAvailable / taxes.netIncome) * 100 : 0;
  const spendingRateOfGross = grossIncome > 0 ? (annualSpending / grossIncome) * 100 : 0;
  const spendingRateOfNet = taxes.netIncome > 0 ? (annualSpending / taxes.netIncome) * 100 : 0;
  
  // Allocations as percentage of gross
  const allocationTaxes = taxes.effectiveTotalRate;
  const allocationPreTaxSavings = grossIncome > 0 ? (totalPreTaxSavings / grossIncome) * 100 : 0;
  const allocationSpending = spendingRateOfGross;
  const allocationPostTaxSavings = grossIncome > 0 ? (postTaxSavingsAvailable / grossIncome) * 100 : 0;
  
  // Net worth context
  const yearsOfExpenses = annualSpending > 0 ? currentNetWorth / annualSpending : 0;
  const netWorthToIncomeRatio = grossIncome > 0 ? currentNetWorth / grossIncome : 0;
  
  // Generate warnings and suggestions
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (annualSpending > taxes.netIncome) {
    warnings.push('Your annual spending exceeds your net income after taxes.');
  }
  
  if (preTaxContributions.traditional401k > CONTRIBUTION_LIMITS.traditional401k) {
    warnings.push(`401k contribution exceeds the ${new Date().getFullYear()} limit of ${formatCurrency(CONTRIBUTION_LIMITS.traditional401k)}.`);
  }
  
  if (preTaxContributions.traditionalIRA > CONTRIBUTION_LIMITS.traditionalIRA) {
    warnings.push(`Traditional IRA contribution exceeds the ${new Date().getFullYear()} limit of ${formatCurrency(CONTRIBUTION_LIMITS.traditionalIRA)}.`);
  }
  
  if (savingsRateOfGross < 15 && grossIncome > 50000) {
    suggestions.push('Consider increasing your savings rate to at least 15% of gross income for long-term financial security.');
  }
  
  if (preTaxContributions.traditional401k < CONTRIBUTION_LIMITS.traditional401k && postTaxSavingsAvailable > 0) {
    const room = CONTRIBUTION_LIMITS.traditional401k - preTaxContributions.traditional401k;
    suggestions.push(`You have ${formatCurrency(room)} of unused 401k contribution room which could reduce your tax burden.`);
  }
  
  if (!preTaxContributions.hsa && grossIncome > 0) {
    suggestions.push('If you have a high-deductible health plan, consider contributing to an HSA for triple tax benefits.');
  }
  
  return {
    taxes,
    monthlySpending,
    annualSpending,
    totalPreTaxSavings,
    postTaxSavingsAvailable,
    totalAnnualSavings,
    monthlySavingsAvailable: postTaxSavingsAvailable / 12,
    savingsRateOfGross,
    savingsRateOfNet,
    spendingRateOfGross,
    spendingRateOfNet,
    allocationTaxes,
    allocationPreTaxSavings,
    allocationSpending,
    allocationPostTaxSavings,
    currentNetWorth,
    yearsOfExpenses,
    netWorthToIncomeRatio,
    warnings,
    suggestions,
  };
}

// Keep legacy interface for backwards compatibility
export interface IncomeBreakdown {
  grossIncome: number;
  effectiveTaxRate: number;
  annualTaxes: number;
  netIncome: number;
  monthlyGross: number;
  monthlyTaxes: number;
  monthlyNet: number;
  annualSpending: number;
  monthlySpending: number;
  annualSavingsPotential: number;
  monthlySavingsPotential: number;
  savingsRate: number;
  netSavingsRate: number;
  taxBurdenPercent: number;
  spendingToGrossPercent: number;
  spendingToNetPercent: number;
  currentNetWorth: number;
  yearsOfExpensesInNetWorth: number;
  netWorthToIncomeRatio: number;
}

// Legacy function - kept for backwards compatibility
export const TAX_RATE_PRESETS = [
  { label: 'Very Low (~10%)', rate: 10, description: 'Under $50k single / $100k married' },
  { label: 'Low (~15%)', rate: 15, description: '$50k-$90k single / $100k-$180k married' },
  { label: 'Moderate (~20%)', rate: 20, description: '$90k-$170k single / $180k-$340k married' },
  { label: 'Medium (~25%)', rate: 25, description: '$170k-$215k single / $340k-$430k married' },
  { label: 'Higher (~30%)', rate: 30, description: '$215k-$540k single / $430k+ married' },
  { label: 'High (~35%)', rate: 35, description: '$540k+ single / High income with state taxes' },
] as const;

// Legacy function
export function calculateIncomeBreakdown(
  grossIncome: number,
  effectiveTaxRate: number,
  monthlySpending: number,
  currentNetWorth: number
): IncomeBreakdown {
  const taxRateDecimal = effectiveTaxRate / 100;
  const annualTaxes = grossIncome * taxRateDecimal;
  const netIncome = grossIncome - annualTaxes;
  const monthlyGross = grossIncome / 12;
  const monthlyTaxes = annualTaxes / 12;
  const monthlyNet = netIncome / 12;
  const annualSpending = monthlySpending * 12;
  const annualSavingsPotential = Math.max(0, netIncome - annualSpending);
  const monthlySavingsPotential = annualSavingsPotential / 12;
  const savingsRate = grossIncome > 0 ? (annualSavingsPotential / grossIncome) * 100 : 0;
  const netSavingsRate = netIncome > 0 ? (annualSavingsPotential / netIncome) * 100 : 0;
  const taxBurdenPercent = grossIncome > 0 ? (annualTaxes / grossIncome) * 100 : 0;
  const spendingToGrossPercent = grossIncome > 0 ? (annualSpending / grossIncome) * 100 : 0;
  const spendingToNetPercent = netIncome > 0 ? (annualSpending / netIncome) * 100 : 0;
  const yearsOfExpensesInNetWorth = annualSpending > 0 ? currentNetWorth / annualSpending : 0;
  const netWorthToIncomeRatio = grossIncome > 0 ? currentNetWorth / grossIncome : 0;
  
  return {
    grossIncome, effectiveTaxRate, annualTaxes, netIncome, monthlyGross, monthlyTaxes,
    monthlyNet, annualSpending, monthlySpending, annualSavingsPotential, monthlySavingsPotential,
    savingsRate, netSavingsRate, taxBurdenPercent, spendingToGrossPercent, spendingToNetPercent,
    currentNetWorth, yearsOfExpensesInNetWorth, netWorthToIncomeRatio,
  };
}

/**
 * Format a percentage with specified decimals
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ============================================================================
// DYNAMIC PROJECTION CALCULATIONS
// ============================================================================

export interface DynamicIncomeParams {
  grossIncome: number;
  incomeGrowthRate: number; // % per year
  filingStatus: FilingStatus;
  stateCode: string | null;
  preTaxContributions: PreTaxContributions;
  preTaxGrowthRate?: number; // % increase in pre-tax contributions per year (default matches income growth)
}

export interface DynamicSpendingParams {
  baseMonthlyBudget: number;
  spendingGrowthRate: number; // % of net worth added to monthly budget
  inflationRate: number; // % per year for base budget
}

export interface YearlyProjectedFinancials {
  year: number;
  yearsFromNow: number;
  
  // Income
  grossIncome: number;
  preTaxContributions: number;
  
  // Taxes
  federalTax: number;
  stateTax: number;
  ficaTax: number;
  totalTax: number;
  effectiveTaxRate: number;
  
  // Net Income
  netIncome: number;
  
  // Spending (variable based on net worth)
  baseMonthlyBudget: number; // Inflation-adjusted
  netWorthSpendingPortion: number;
  totalMonthlySpending: number;
  annualSpending: number;
  
  // Savings
  postTaxSavings: number;
  totalSavings: number; // Pre-tax + post-tax
  savingsRate: number; // % of gross
  
  // Net Worth (projected)
  startOfYearNetWorth: number;
  endOfYearNetWorth: number;
  investmentGrowth: number;
}

/**
 * Calculate projected financials for a specific year in the future
 * Accounts for income growth, tax bracket changes, and variable spending
 */
export function calculateYearProjection(
  yearsFromNow: number,
  startNetWorth: number,
  incomeParams: DynamicIncomeParams,
  spendingParams: DynamicSpendingParams,
  investmentReturnRate: number
): YearlyProjectedFinancials {
  const currentYear = new Date().getFullYear();
  const year = currentYear + yearsFromNow;
  
  // Project income with growth
  const incomeGrowthMultiplier = Math.pow(1 + incomeParams.incomeGrowthRate / 100, yearsFromNow);
  const grossIncome = incomeParams.grossIncome * incomeGrowthMultiplier;
  
  // Project pre-tax contributions (grow with income, capped at limits)
  const preTaxGrowthRate = incomeParams.preTaxGrowthRate ?? incomeParams.incomeGrowthRate;
  const preTaxGrowthMultiplier = Math.pow(1 + preTaxGrowthRate / 100, yearsFromNow);
  
  // Apply growth but cap at contribution limits (which we'll assume grow with inflation)
  const inflationMultiplier = Math.pow(1 + spendingParams.inflationRate / 100, yearsFromNow);
  const adjusted401kLimit = CONTRIBUTION_LIMITS.traditional401k * inflationMultiplier;
  const adjustedIRALimit = CONTRIBUTION_LIMITS.traditionalIRA * inflationMultiplier;
  const adjustedHSALimit = CONTRIBUTION_LIMITS.hsa_family * inflationMultiplier;
  
  const projected401k = Math.min(
    incomeParams.preTaxContributions.traditional401k * preTaxGrowthMultiplier,
    adjusted401kLimit
  );
  const projectedIRA = Math.min(
    incomeParams.preTaxContributions.traditionalIRA * preTaxGrowthMultiplier,
    adjustedIRALimit
  );
  const projectedHSA = Math.min(
    incomeParams.preTaxContributions.hsa * preTaxGrowthMultiplier,
    adjustedHSALimit
  );
  const projectedOther = incomeParams.preTaxContributions.other * preTaxGrowthMultiplier;
  
  const totalPreTax = projected401k + projectedIRA + projectedHSA + projectedOther;
  
  // Calculate taxes on projected income
  const taxCalc = calculateTaxes(
    grossIncome,
    incomeParams.filingStatus,
    incomeParams.stateCode,
    {
      traditional401k: projected401k,
      traditionalIRA: projectedIRA,
      hsa: projectedHSA,
      other: projectedOther,
    }
  );
  
  // Calculate spending based on start-of-year net worth
  const inflationAdjustedBaseBudget = spendingParams.baseMonthlyBudget * inflationMultiplier;
  const netWorthPortion = startNetWorth * (spendingParams.spendingGrowthRate / 100) / 12;
  const totalMonthlySpending = inflationAdjustedBaseBudget + netWorthPortion;
  const annualSpending = totalMonthlySpending * 12;
  
  // Calculate post-tax savings (can be negative if spending exceeds income)
  // When negative, this represents drawing from net worth to cover overspending
  const postTaxSavings = taxCalc.netIncome - annualSpending;
  const totalSavings = totalPreTax + postTaxSavings;
  const savingsRate = grossIncome > 0 ? (totalSavings / grossIncome) * 100 : 0;
  
  // Calculate end-of-year net worth
  // Net worth grows by: investment returns + total savings
  const investmentGrowth = startNetWorth * (investmentReturnRate / 100);
  const endOfYearNetWorth = startNetWorth + investmentGrowth + totalSavings;
  
  return {
    year,
    yearsFromNow,
    grossIncome,
    preTaxContributions: totalPreTax,
    federalTax: taxCalc.federalTax,
    stateTax: taxCalc.stateTax,
    ficaTax: taxCalc.ficaTax,
    totalTax: taxCalc.totalTax,
    effectiveTaxRate: taxCalc.effectiveTotalRate,
    netIncome: taxCalc.netIncome,
    baseMonthlyBudget: inflationAdjustedBaseBudget,
    netWorthSpendingPortion: netWorthPortion,
    totalMonthlySpending,
    annualSpending,
    postTaxSavings,
    totalSavings,
    savingsRate,
    startOfYearNetWorth: startNetWorth,
    endOfYearNetWorth,
    investmentGrowth,
  };
}

/**
 * Generate multi-year projection with dynamic income, taxes, and spending
 */
export function generateDynamicProjections(
  startingNetWorth: number,
  incomeParams: DynamicIncomeParams,
  spendingParams: DynamicSpendingParams,
  investmentReturnRate: number,
  years: number = 30
): YearlyProjectedFinancials[] {
  const projections: YearlyProjectedFinancials[] = [];
  let currentNetWorth = startingNetWorth;
  
  for (let i = 0; i <= years; i++) {
    const yearProjection = calculateYearProjection(
      i,
      currentNetWorth,
      incomeParams,
      spendingParams,
      investmentReturnRate
    );
    projections.push(yearProjection);
    
    // Next year starts with this year's ending net worth
    currentNetWorth = yearProjection.endOfYearNetWorth;
  }
  
  return projections;
}
