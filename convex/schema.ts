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
    // Financial assumptions
    currentRate: v.number(), // Expected annual return rate
    swr: v.number(), // Safe withdrawal rate
    yearlyContribution: v.number(), // Annual contribution amount
    inflationRate: v.number(), // Expected inflation rate
    baseMonthlyBudget: v.number(), // Floor spending for levels system
    spendingGrowthRate: v.number(), // % of net worth per year for additional spending
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Cash flow plans - detailed breakdown of income, taxes, and savings for scenarios
  cashFlowPlans: defineTable({
    scenarioId: v.id("scenarios"),
    userId: v.id("users"),
    // Income
    grossAnnualIncome: v.number(),
    // Pre-tax savings
    preTax401k: v.number(),
    preTaxHsa: v.number(),
    preTaxTraditionalIra: v.number(),
    preTaxOther: v.number(),
    // Tax calculation
    effectiveTaxRate: v.number(),
    estimatedAnnualTax: v.number(),
    // Post-tax savings
    postTaxRoth: v.number(),
    postTaxBrokerage: v.number(),
    postTaxSavings: v.number(),
    postTaxOther: v.number(),
    // Calculated fields
    totalPreTaxSavings: v.number(),
    totalPostTaxSavings: v.number(),
    totalSavings: v.number(),
    taxableIncome: v.number(),
    takeHomePay: v.number(),
    annualSpending: v.number(),
    monthlyBudget: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_scenario", ["scenarioId"])
    .index("by_user", ["userId"]),
});
