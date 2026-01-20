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

// Default scenario settings
const DEFAULT_SCENARIO = {
  name: "Base Plan",
  description: "Your primary financial projection",
  currentRate: 7,
  swr: 4,
  yearlyContribution: 0,
  inflationRate: 3,
  baseMonthlyBudget: 3000,
  spendingGrowthRate: 2,
  grossIncome: undefined as number | undefined,
  effectiveTaxRate: undefined as number | undefined,
};

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

export const getSelected = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const scenarios = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return scenarios.filter(s => s.isSelected).sort((a, b) => a.createdAt - b.createdAt);
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
    isSelected: v.optional(v.boolean()),
    grossIncome: v.optional(v.number()),
    effectiveTaxRate: v.optional(v.number()),
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
    
    // If this is the first scenario, auto-select it
    const isSelected = args.isSelected ?? (existingScenarios.length === 0);

    const now = Date.now();
    return await ctx.db.insert("scenarios", {
      userId,
      name: args.name,
      description: args.description,
      color,
      isSelected,
      currentRate: args.currentRate,
      swr: args.swr,
      yearlyContribution: args.yearlyContribution,
      inflationRate: args.inflationRate,
      baseMonthlyBudget: args.baseMonthlyBudget,
      spendingGrowthRate: args.spendingGrowthRate,
      grossIncome: args.grossIncome,
      effectiveTaxRate: args.effectiveTaxRate,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create a default scenario for new users
export const createDefault = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user already has scenarios
    const existingScenarios = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingScenarios.length > 0) {
      // Return the first selected scenario, or the first scenario
      const selected = existingScenarios.find(s => s.isSelected);
      return selected?._id || existingScenarios[0]._id;
    }

    const now = Date.now();
    return await ctx.db.insert("scenarios", {
      userId,
      name: DEFAULT_SCENARIO.name,
      description: DEFAULT_SCENARIO.description,
      color: SCENARIO_COLORS[0],
      isSelected: true,
      currentRate: DEFAULT_SCENARIO.currentRate,
      swr: DEFAULT_SCENARIO.swr,
      yearlyContribution: DEFAULT_SCENARIO.yearlyContribution,
      inflationRate: DEFAULT_SCENARIO.inflationRate,
      baseMonthlyBudget: DEFAULT_SCENARIO.baseMonthlyBudget,
      spendingGrowthRate: DEFAULT_SCENARIO.spendingGrowthRate,
      grossIncome: DEFAULT_SCENARIO.grossIncome,
      effectiveTaxRate: DEFAULT_SCENARIO.effectiveTaxRate,
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
    isSelected: v.optional(v.boolean()),
    currentRate: v.optional(v.number()),
    swr: v.optional(v.number()),
    yearlyContribution: v.optional(v.number()),
    inflationRate: v.optional(v.number()),
    baseMonthlyBudget: v.optional(v.number()),
    spendingGrowthRate: v.optional(v.number()),
    grossIncome: v.optional(v.number()),
    effectiveTaxRate: v.optional(v.number()),
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

    // Check if this is the last scenario
    const allScenarios = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (allScenarios.length <= 1) {
      throw new Error("Cannot delete your last scenario. Create another one first.");
    }

    await ctx.db.delete(args.id);

    // If the deleted scenario was selected and there are other scenarios,
    // select the first remaining one
    if (scenario.isSelected) {
      const remaining = allScenarios.filter(s => s._id !== args.id);
      const hasSelectedRemaining = remaining.some(s => s.isSelected);
      if (!hasSelectedRemaining && remaining.length > 0) {
        await ctx.db.patch(remaining[0]._id, { isSelected: true, updatedAt: Date.now() });
      }
    }

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
      isSelected: false, // Don't auto-select duplicates
      currentRate: scenario.currentRate,
      swr: scenario.swr,
      yearlyContribution: scenario.yearlyContribution,
      inflationRate: scenario.inflationRate,
      baseMonthlyBudget: scenario.baseMonthlyBudget,
      spendingGrowthRate: scenario.spendingGrowthRate,
      grossIncome: scenario.grossIncome,
      effectiveTaxRate: scenario.effectiveTaxRate,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const toggleSelected = mutation({
  args: { id: v.id("scenarios") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scenario = await ctx.db.get(args.id);
    if (!scenario || scenario.userId !== userId) {
      throw new Error("Scenario not found");
    }

    // If trying to deselect, check if there are other selected scenarios
    if (scenario.isSelected) {
      const allScenarios = await ctx.db
        .query("scenarios")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      
      const otherSelected = allScenarios.filter(s => s._id !== args.id && s.isSelected);
      if (otherSelected.length === 0) {
        throw new Error("At least one scenario must be selected");
      }
    }

    await ctx.db.patch(args.id, {
      isSelected: !scenario.isSelected,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Select only one scenario (deselect all others)
export const selectOnly = mutation({
  args: { id: v.id("scenarios") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scenario = await ctx.db.get(args.id);
    if (!scenario || scenario.userId !== userId) {
      throw new Error("Scenario not found");
    }

    // Get all scenarios
    const allScenarios = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const now = Date.now();

    // Deselect all others, select this one
    for (const s of allScenarios) {
      if (s._id === args.id) {
        if (!s.isSelected) {
          await ctx.db.patch(s._id, { isSelected: true, updatedAt: now });
        }
      } else if (s.isSelected) {
        await ctx.db.patch(s._id, { isSelected: false, updatedAt: now });
      }
    }

    return args.id;
  },
});

// Select multiple scenarios at once
export const setSelected = mutation({
  args: { ids: v.array(v.id("scenarios")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.ids.length === 0) {
      throw new Error("At least one scenario must be selected");
    }

    // Verify all IDs belong to this user
    for (const id of args.ids) {
      const scenario = await ctx.db.get(id);
      if (!scenario || scenario.userId !== userId) {
        throw new Error("Scenario not found");
      }
    }

    // Get all scenarios
    const allScenarios = await ctx.db
      .query("scenarios")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const now = Date.now();
    const selectedSet = new Set(args.ids);

    // Update selection state for all scenarios
    for (const s of allScenarios) {
      const shouldBeSelected = selectedSet.has(s._id);
      if (s.isSelected !== shouldBeSelected) {
        await ctx.db.patch(s._id, { isSelected: shouldBeSelected, updatedAt: now });
      }
    }

    return args.ids;
  },
});
