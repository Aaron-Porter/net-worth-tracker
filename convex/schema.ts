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
    // Income & Tax assumptions (optional - for income calculator)
    grossIncome: v.optional(v.number()), // Annual gross income
    effectiveTaxRate: v.optional(v.number()), // Effective tax rate as percentage (e.g., 22 for 22%)
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
