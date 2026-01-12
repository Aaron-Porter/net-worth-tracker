import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  userSettings: defineTable({
    userId: v.id("users"),
    currentRate: v.number(),
    swr: v.number(),
    yearlyContribution: v.number(),
    birthDate: v.string(),
    monthlySpend: v.number(),
    inflationRate: v.number(),
    // Levels system settings
    baseMonthlyBudget: v.optional(v.number()), // Floor spending regardless of net worth
    spendingGrowthRate: v.optional(v.number()), // % of net worth per year allowed as additional spending
  }).index("by_user", ["userId"]),

  netWorthEntries: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    timestamp: v.number(),
  }).index("by_user", ["userId"]),
});
