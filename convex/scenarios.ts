import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Default scenario colors for new scenarios
const SCENARIO_COLORS = [
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const scenarios = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return scenarios.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const get = query({
  args: { id: v.id("scenarios") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const scenario = await ctx.db.get(args.id);
    if (!scenario || scenario.userId !== userId) return null;

    return scenario;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    currentRate: v.number(),
    swr: v.number(),
    yearlyContribution: v.number(),
    inflationRate: v.number(),
    baseMonthlyBudget: v.number(),
    spendingGrowthRate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get existing scenarios to determine next color
    const existingScenarios = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const colorIndex = existingScenarios.length % SCENARIO_COLORS.length;
    const color = args.color || SCENARIO_COLORS[colorIndex];

    const now = Date.now();
    return await ctx.db.insert("scenarios", {
      userId,
      name: args.name,
      description: args.description,
      color,
      isActive: true,
      currentRate: args.currentRate,
      swr: args.swr,
      yearlyContribution: args.yearlyContribution,
      inflationRate: args.inflationRate,
      baseMonthlyBudget: args.baseMonthlyBudget,
      spendingGrowthRate: args.spendingGrowthRate,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("scenarios"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    currentRate: v.optional(v.number()),
    swr: v.optional(v.number()),
    yearlyContribution: v.optional(v.number()),
    inflationRate: v.optional(v.number()),
    baseMonthlyBudget: v.optional(v.number()),
    spendingGrowthRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scenario = await ctx.db.get(args.id);
    if (!scenario || scenario.userId !== userId) {
      throw new Error("Scenario not found");
    }

    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("scenarios") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scenario = await ctx.db.get(args.id);
    if (!scenario || scenario.userId !== userId) {
      throw new Error("Scenario not found");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const duplicate = mutation({
  args: { id: v.id("scenarios") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scenario = await ctx.db.get(args.id);
    if (!scenario || scenario.userId !== userId) {
      throw new Error("Scenario not found");
    }

    // Get existing scenarios to determine next color
    const existingScenarios = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const colorIndex = existingScenarios.length % SCENARIO_COLORS.length;

    const now = Date.now();
    return await ctx.db.insert("scenarios", {
      userId,
      name: `${scenario.name} (Copy)`,
      description: scenario.description,
      color: SCENARIO_COLORS[colorIndex],
      isActive: true,
      currentRate: scenario.currentRate,
      swr: scenario.swr,
      yearlyContribution: scenario.yearlyContribution,
      inflationRate: scenario.inflationRate,
      baseMonthlyBudget: scenario.baseMonthlyBudget,
      spendingGrowthRate: scenario.spendingGrowthRate,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const toggleActive = mutation({
  args: { id: v.id("scenarios") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scenario = await ctx.db.get(args.id);
    if (!scenario || scenario.userId !== userId) {
      throw new Error("Scenario not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !scenario.isActive,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
