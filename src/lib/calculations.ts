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
}

export interface NetWorthEntry {
  _id: string;
  userId: string;
  amount: number;
  timestamp: number;
}

export interface ProjectionRow {
  year: number | 'Now';
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
  fiTarget: number;           // Net worth needed for FI
  fiProgress: number;         // Percentage toward FI (0-100+)
  coastFiYear: number | null;
  coastFiAge: number | null;
  isFiYear: boolean;          // First year where SWR covers expenses
  isCrossover: boolean;       // First year where interest > contributions
  swrCoversSpend: boolean;    // Whether SWR covers monthly spend
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
  applyInflation: boolean = false
): number | null {
  const { monthlySpend, swr, currentRate, inflationRate } = settings;
  
  if (monthlySpend <= 0 || swr <= 0 || currentRate <= 0) return null;
  
  const r = currentRate / 100;
  
  for (let y = 0; y <= 100; y++) {
    const futureValue = startingValue * Math.pow(1 + r, y);
    const yearsFuture = startYearsFromNow + y;
    const futureSpend = applyInflation 
      ? adjustForInflation(monthlySpend, yearsFuture, inflationRate)
      : monthlySpend;
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
 * Generate projection data for the specified number of years
 */
export function generateProjections(
  latestEntry: NetWorthEntry | null,
  currentNetWorth: number,
  currentAppreciation: number,
  settings: UserSettings,
  applyInflation: boolean = false
): ProjectionRow[] {
  if (!latestEntry) return [];
  
  const {
    currentRate,
    swr,
    yearlyContribution,
    monthlySpend,
    inflationRate,
    birthDate,
  } = settings;
  
  const r = currentRate / 100;
  const currentYear = new Date().getFullYear();
  const birthYear = birthDate ? new Date(birthDate).getFullYear() : null;
  
  const data: ProjectionRow[] = [];
  let fiYearFound = false;
  let crossoverFound = false;
  
  // Helper function for inflation-adjusted spend
  const getInflatedSpend = (yearsFromNow: number) =>
    applyInflation
      ? adjustForInflation(monthlySpend, yearsFromNow, inflationRate)
      : monthlySpend;
  
  // "Now" row
  const currentSpend = monthlySpend;
  const currentFiTarget = calculateFiTarget(currentSpend, swr);
  const currentSwrAmounts = calculateSwrAmounts(currentNetWorth, swr);
  const currentSwrCoversSpend = monthlySpend > 0 && currentSwrAmounts.monthly >= currentSpend;
  const currentCoastFiYear = findCoastFiYear(currentNetWorth, currentYear, 0, settings, applyInflation);
  const currentFiProgress = currentFiTarget > 0 ? (currentNetWorth / currentFiTarget) * 100 : 0;
  
  if (currentSwrCoversSpend) fiYearFound = true;
  
  data.push({
    year: 'Now',
    age: birthYear ? currentYear - birthYear : null,
    yearsFromEntry: 0,
    netWorth: currentNetWorth,
    interest: currentAppreciation,
    contributed: 0,
    annualSwr: currentSwrAmounts.annual,
    monthlySwr: currentSwrAmounts.monthly,
    weeklySwr: currentSwrAmounts.weekly,
    dailySwr: currentSwrAmounts.daily,
    monthlySpend: currentSpend,
    fiTarget: currentFiTarget,
    fiProgress: currentFiProgress,
    coastFiYear: currentCoastFiYear,
    coastFiAge: currentCoastFiYear && birthYear ? currentCoastFiYear - birthYear : null,
    isFiYear: false,
    isCrossover: false,
    swrCoversSpend: currentSwrCoversSpend,
  });
  
  // Future projection rows
  for (let i = 0; i < PROJECTION_YEARS; i++) {
    const year = currentYear + i;
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
    const yearsFromEntry = (endOfYear - latestEntry.timestamp) / MS_PER_YEAR;
    const age = birthYear ? year - birthYear : null;
    
    // Calculate future value
    const fv = calculateFutureValue(
      latestEntry.amount,
      currentRate,
      yearsFromEntry,
      yearlyContribution
    );
    
    // Get inflation-adjusted spend for this year
    const yearSpend = getInflatedSpend(i);
    const yearFiTarget = calculateFiTarget(yearSpend, swr);
    const fiProgress = yearFiTarget > 0 ? (fv.total / yearFiTarget) * 100 : 0;
    
    // Calculate SWR amounts
    const swrAmounts = calculateSwrAmounts(fv.total, swr);
    const swrCoversSpend = monthlySpend > 0 && swrAmounts.monthly >= yearSpend;
    
    // Check milestones
    const isFiYear = swrCoversSpend && !fiYearFound;
    if (isFiYear) fiYearFound = true;
    
    const isCrossover = fv.totalInterest > fv.totalContributed && !crossoverFound && fv.totalContributed > 0;
    if (isCrossover) crossoverFound = true;
    
    // Coast FI
    const coastFiYear = findCoastFiYear(fv.total, year, i, settings, applyInflation);
    
    data.push({
      year,
      age,
      yearsFromEntry,
      netWorth: fv.total,
      interest: fv.totalInterest,
      contributed: fv.totalContributed,
      annualSwr: swrAmounts.annual,
      monthlySwr: swrAmounts.monthly,
      weeklySwr: swrAmounts.weekly,
      dailySwr: swrAmounts.daily,
      monthlySpend: yearSpend,
      fiTarget: yearFiTarget,
      fiProgress,
      coastFiYear,
      coastFiAge: coastFiYear && birthYear ? coastFiYear - birthYear : null,
      isFiYear,
      isCrossover,
      swrCoversSpend,
    });
  }
  
  return data;
}

/**
 * Master calculation function - computes all derived values from settings and entries
 */
export function calculateAllFinancials(
  settings: UserSettings,
  entries: NetWorthEntry[],
  includeContributions: boolean = false,
  applyInflation: boolean = false
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
    applyInflation
  );
  
  // Level info
  const levelInfo = calculateLevelInfo(currentNetWorth.total, settings, entries);
  
  // Key milestones
  const fiRow = projections.find(p => p.isFiYear);
  const crossoverRow = projections.find(p => p.isCrossover);
  
  // Current SWR
  const currentSwrAmounts = calculateSwrAmounts(currentNetWorth.total, settings.swr);
  
  // Current FI progress
  const currentFiTarget = calculateFiTarget(settings.monthlySpend, settings.swr);
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
