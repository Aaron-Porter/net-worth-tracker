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
 * Generate projection data for the specified number of years
 */
export function generateProjections(
  latestEntry: NetWorthEntry | null,
  currentNetWorth: number,
  currentAppreciation: number,
  settings: UserSettings,
  applyInflation: boolean = false,
  useSpendingLevels: boolean = false
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
  
  // "Now" row
  const currentSpend = useSpendingLevels 
    ? calculateLevelBasedSpending(currentNetWorth, settings, 0)
    : monthlySpend;
  const currentFiTarget = calculateFiTarget(currentSpend, swr);
  const currentSwrAmounts = calculateSwrAmounts(currentNetWorth, swr);
  const currentSwrCoversSpend = currentSpend > 0 && currentSwrAmounts.monthly >= currentSpend;
  const currentCoastFiYear = findCoastFiYear(currentNetWorth, currentYear, 0, settings, applyInflation, useSpendingLevels);
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
    
    // Get spending for this year (may be based on projected net worth)
    const yearSpend = getSpendingForYear(i, fv.total);
    const yearFiTarget = calculateFiTarget(yearSpend, swr);
    const fiProgress = yearFiTarget > 0 ? (fv.total / yearFiTarget) * 100 : 0;
    
    // Calculate SWR amounts
    const swrAmounts = calculateSwrAmounts(fv.total, swr);
    const swrCoversSpend = yearSpend > 0 && swrAmounts.monthly >= yearSpend;
    
    // Check milestones
    const isFiYear = swrCoversSpend && !fiYearFound;
    if (isFiYear) fiYearFound = true;
    
    const isCrossover = fv.totalInterest > fv.totalContributed && !crossoverFound && fv.totalContributed > 0;
    if (isCrossover) crossoverFound = true;
    
    // Coast FI
    const coastFiYear = findCoastFiYear(fv.total, year, i, settings, applyInflation, useSpendingLevels);
    
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
// INCOME & TAX CALCULATIONS
// ============================================================================

export type FilingStatus = 'single' | 'married_jointly' | 'married_separately' | 'head_of_household';

// 2024 Federal Tax Brackets
const FEDERAL_TAX_BRACKETS: Record<FilingStatus, { min: number; max: number; rate: number }[]> = {
  single: [
    { min: 0, max: 11600, rate: 10 },
    { min: 11600, max: 47150, rate: 12 },
    { min: 47150, max: 100525, rate: 22 },
    { min: 100525, max: 191950, rate: 24 },
    { min: 191950, max: 243725, rate: 32 },
    { min: 243725, max: 609350, rate: 35 },
    { min: 609350, max: Infinity, rate: 37 },
  ],
  married_jointly: [
    { min: 0, max: 23200, rate: 10 },
    { min: 23200, max: 94300, rate: 12 },
    { min: 94300, max: 201050, rate: 22 },
    { min: 201050, max: 383900, rate: 24 },
    { min: 383900, max: 487450, rate: 32 },
    { min: 487450, max: 731200, rate: 35 },
    { min: 731200, max: Infinity, rate: 37 },
  ],
  married_separately: [
    { min: 0, max: 11600, rate: 10 },
    { min: 11600, max: 47150, rate: 12 },
    { min: 47150, max: 100525, rate: 22 },
    { min: 100525, max: 191950, rate: 24 },
    { min: 191950, max: 243725, rate: 32 },
    { min: 243725, max: 365600, rate: 35 },
    { min: 365600, max: Infinity, rate: 37 },
  ],
  head_of_household: [
    { min: 0, max: 16550, rate: 10 },
    { min: 16550, max: 63100, rate: 12 },
    { min: 63100, max: 100500, rate: 22 },
    { min: 100500, max: 191950, rate: 24 },
    { min: 191950, max: 243700, rate: 32 },
    { min: 243700, max: 609350, rate: 35 },
    { min: 609350, max: Infinity, rate: 37 },
  ],
};

// 2024 Standard Deductions
const STANDARD_DEDUCTIONS: Record<FilingStatus, number> = {
  single: 14600,
  married_jointly: 29200,
  married_separately: 14600,
  head_of_household: 21900,
};

// State tax rates (simplified - using flat effective rates for most states)
// These are approximations; actual state taxes vary significantly
export const STATE_TAX_RATES: Record<string, { name: string; rate: number }> = {
  AL: { name: 'Alabama', rate: 4.0 },
  AK: { name: 'Alaska', rate: 0 },
  AZ: { name: 'Arizona', rate: 2.5 },
  AR: { name: 'Arkansas', rate: 4.4 },
  CA: { name: 'California', rate: 9.3 },
  CO: { name: 'Colorado', rate: 4.4 },
  CT: { name: 'Connecticut', rate: 5.0 },
  DE: { name: 'Delaware', rate: 5.5 },
  FL: { name: 'Florida', rate: 0 },
  GA: { name: 'Georgia', rate: 5.49 },
  HI: { name: 'Hawaii', rate: 8.25 },
  ID: { name: 'Idaho', rate: 5.8 },
  IL: { name: 'Illinois', rate: 4.95 },
  IN: { name: 'Indiana', rate: 3.05 },
  IA: { name: 'Iowa', rate: 5.7 },
  KS: { name: 'Kansas', rate: 5.7 },
  KY: { name: 'Kentucky', rate: 4.0 },
  LA: { name: 'Louisiana', rate: 4.25 },
  ME: { name: 'Maine', rate: 7.15 },
  MD: { name: 'Maryland', rate: 5.0 },
  MA: { name: 'Massachusetts', rate: 5.0 },
  MI: { name: 'Michigan', rate: 4.25 },
  MN: { name: 'Minnesota', rate: 7.85 },
  MS: { name: 'Mississippi', rate: 4.7 },
  MO: { name: 'Missouri', rate: 4.8 },
  MT: { name: 'Montana', rate: 5.9 },
  NE: { name: 'Nebraska', rate: 5.84 },
  NV: { name: 'Nevada', rate: 0 },
  NH: { name: 'New Hampshire', rate: 0 },
  NJ: { name: 'New Jersey', rate: 6.37 },
  NM: { name: 'New Mexico', rate: 4.9 },
  NY: { name: 'New York', rate: 6.85 },
  NC: { name: 'North Carolina', rate: 4.75 },
  ND: { name: 'North Dakota', rate: 2.5 },
  OH: { name: 'Ohio', rate: 3.75 },
  OK: { name: 'Oklahoma', rate: 4.75 },
  OR: { name: 'Oregon', rate: 9.0 },
  PA: { name: 'Pennsylvania', rate: 3.07 },
  RI: { name: 'Rhode Island', rate: 5.0 },
  SC: { name: 'South Carolina', rate: 6.4 },
  SD: { name: 'South Dakota', rate: 0 },
  TN: { name: 'Tennessee', rate: 0 },
  TX: { name: 'Texas', rate: 0 },
  UT: { name: 'Utah', rate: 4.65 },
  VT: { name: 'Vermont', rate: 6.6 },
  VA: { name: 'Virginia', rate: 5.75 },
  WA: { name: 'Washington', rate: 0 },
  WV: { name: 'West Virginia', rate: 5.12 },
  WI: { name: 'Wisconsin', rate: 5.3 },
  WY: { name: 'Wyoming', rate: 0 },
  DC: { name: 'Washington DC', rate: 8.5 },
};

// FICA rates (Social Security + Medicare)
const SOCIAL_SECURITY_RATE = 6.2;
const SOCIAL_SECURITY_WAGE_CAP = 168600; // 2024 cap
const MEDICARE_RATE = 1.45;
const MEDICARE_ADDITIONAL_RATE = 0.9; // Additional Medicare tax for high earners
const MEDICARE_ADDITIONAL_THRESHOLD_SINGLE = 200000;
const MEDICARE_ADDITIONAL_THRESHOLD_MARRIED = 250000;

// 2024 Contribution Limits
export const CONTRIBUTION_LIMITS = {
  traditional401k: 23000,
  traditional401kCatchUp: 7500, // Age 50+
  traditionalIRA: 7000,
  traditionalIRACatchUp: 1000, // Age 50+
  hsa_individual: 4150,
  hsa_family: 8300,
  hsaCatchUp: 1000, // Age 55+
  roth401k: 23000,
  rothIRA: 7000,
};

export interface PreTaxContributions {
  traditional401k: number;
  traditionalIRA: number;
  hsa: number;
  other: number;
}

export interface TaxCalculation {
  grossIncome: number;
  filingStatus: FilingStatus;
  stateCode: string | null;
  
  // Pre-tax deductions
  preTaxContributions: PreTaxContributions;
  totalPreTaxContributions: number;
  standardDeduction: number;
  
  // Taxable incomes
  adjustedGrossIncome: number; // Gross - pre-tax contributions
  taxableIncome: number; // AGI - standard deduction
  
  // Tax breakdown
  federalTax: number;
  stateTax: number;
  socialSecurityTax: number;
  medicareTax: number;
  ficaTax: number;
  totalTax: number;
  
  // Effective rates
  effectiveFederalRate: number;
  effectiveStateRate: number;
  effectiveTotalRate: number;
  marginalFederalRate: number;
  
  // Net income
  netIncome: number; // After all taxes
  monthlyNetIncome: number;
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
 * Calculate federal tax using progressive brackets
 */
export function calculateFederalTax(taxableIncome: number, filingStatus: FilingStatus): { tax: number; marginalRate: number } {
  if (taxableIncome <= 0) return { tax: 0, marginalRate: 10 };
  
  const brackets = FEDERAL_TAX_BRACKETS[filingStatus];
  let tax = 0;
  let marginalRate = 10;
  
  for (const bracket of brackets) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      tax += taxableInBracket * (bracket.rate / 100);
      marginalRate = bracket.rate;
    }
  }
  
  return { tax, marginalRate };
}

/**
 * Calculate state tax (simplified flat rate)
 */
export function calculateStateTax(taxableIncome: number, stateCode: string | null): number {
  if (!stateCode || taxableIncome <= 0) return 0;
  const stateInfo = STATE_TAX_RATES[stateCode.toUpperCase()];
  if (!stateInfo) return 0;
  return taxableIncome * (stateInfo.rate / 100);
}

/**
 * Calculate FICA taxes (Social Security + Medicare)
 */
export function calculateFICATax(grossIncome: number, filingStatus: FilingStatus): { socialSecurity: number; medicare: number; total: number } {
  // Social Security (capped at wage base)
  const socialSecurityWages = Math.min(grossIncome, SOCIAL_SECURITY_WAGE_CAP);
  const socialSecurity = socialSecurityWages * (SOCIAL_SECURITY_RATE / 100);
  
  // Medicare (no cap, but additional tax for high earners)
  const medicareThreshold = filingStatus === 'married_jointly' 
    ? MEDICARE_ADDITIONAL_THRESHOLD_MARRIED 
    : MEDICARE_ADDITIONAL_THRESHOLD_SINGLE;
  
  let medicare = grossIncome * (MEDICARE_RATE / 100);
  if (grossIncome > medicareThreshold) {
    medicare += (grossIncome - medicareThreshold) * (MEDICARE_ADDITIONAL_RATE / 100);
  }
  
  return {
    socialSecurity,
    medicare,
    total: socialSecurity + medicare,
  };
}

/**
 * Complete tax calculation
 */
export function calculateTaxes(
  grossIncome: number,
  filingStatus: FilingStatus,
  stateCode: string | null,
  preTaxContributions: PreTaxContributions
): TaxCalculation {
  const totalPreTaxContributions = 
    preTaxContributions.traditional401k + 
    preTaxContributions.traditionalIRA + 
    preTaxContributions.hsa + 
    preTaxContributions.other;
  
  // Adjusted Gross Income (AGI)
  const adjustedGrossIncome = Math.max(0, grossIncome - totalPreTaxContributions);
  
  // Standard deduction
  const standardDeduction = STANDARD_DEDUCTIONS[filingStatus];
  
  // Taxable income
  const taxableIncome = Math.max(0, adjustedGrossIncome - standardDeduction);
  
  // Federal tax
  const { tax: federalTax, marginalRate: marginalFederalRate } = calculateFederalTax(taxableIncome, filingStatus);
  
  // State tax (on AGI, simplified)
  const stateTax = calculateStateTax(adjustedGrossIncome, stateCode);
  
  // FICA (on gross income, not reduced by pre-tax contributions except HSA doesn't reduce FICA in reality, but simplifying)
  const fica = calculateFICATax(grossIncome, filingStatus);
  
  const totalTax = federalTax + stateTax + fica.total;
  const netIncome = grossIncome - totalTax - totalPreTaxContributions;
  
  return {
    grossIncome,
    filingStatus,
    stateCode,
    preTaxContributions,
    totalPreTaxContributions,
    standardDeduction,
    adjustedGrossIncome,
    taxableIncome,
    federalTax,
    stateTax,
    socialSecurityTax: fica.socialSecurity,
    medicareTax: fica.medicare,
    ficaTax: fica.total,
    totalTax,
    effectiveFederalRate: grossIncome > 0 ? (federalTax / grossIncome) * 100 : 0,
    effectiveStateRate: grossIncome > 0 ? (stateTax / grossIncome) * 100 : 0,
    effectiveTotalRate: grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0,
    marginalFederalRate,
    netIncome,
    monthlyNetIncome: netIncome / 12,
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
  
  // Calculate post-tax savings
  const postTaxSavings = Math.max(0, taxCalc.netIncome - annualSpending);
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
