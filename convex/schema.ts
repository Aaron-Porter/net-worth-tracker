import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // User profile - personal info only, not financial assumptions
  userProfile: defineTable({
    userId: v.id("users"),
    birthDate: v.string(),
  }).index("by_user", ["userId"]),

  netWorthEntries: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    timestamp: v.number(),
  }).index("by_user", ["userId"]),

  // Scenarios are the primary entity - each contains a complete set of financial assumptions
  scenarios: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.string(), // Hex color for chart visualization
    isSelected: v.boolean(), // Whether this scenario is selected for viewing projections
    order: v.optional(v.number()), // Display order (0-based), optional for backward compatibility
    
    // Investment assumptions
    currentRate: v.number(), // Expected annual return rate
    swr: v.number(), // Safe withdrawal rate
    inflationRate: v.number(), // Expected inflation rate
    
    // Spending assumptions (for levels system)
    baseMonthlyBudget: v.number(), // Floor spending for levels system
    spendingGrowthRate: v.number(), // % of net worth per year for additional spending
    startDate: v.optional(v.number()), // When this scenario started (for inflation calculations) - defaults to createdAt
    
    // Income & Tax (for guided scenario builder)
    grossIncome: v.optional(v.number()), // Annual gross income
    incomeGrowthRate: v.optional(v.number()), // Expected annual income growth rate (e.g., 3 for 3%)
    filingStatus: v.optional(v.string()), // "single", "married_jointly", "married_separately", "head_of_household"
    stateCode: v.optional(v.string()), // Two-letter state code for state tax calculation
    
    // Pre-tax savings (reduces taxable income)
    preTax401k: v.optional(v.number()), // Annual 401k/403b contributions
    preTaxIRA: v.optional(v.number()), // Traditional IRA contributions
    preTaxHSA: v.optional(v.number()), // HSA contributions
    preTaxOther: v.optional(v.number()), // Other pre-tax deductions
    
    // Calculated/derived field (can be overridden)
    yearlyContribution: v.number(), // Total annual savings (pre-tax + post-tax) - used in projections
    
    // Legacy field kept for backwards compatibility
    effectiveTaxRate: v.optional(v.number()), // Manual override if user prefers
    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
