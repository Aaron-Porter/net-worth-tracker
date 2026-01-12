import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return settings;
  },
});

export const save = mutation({
  args: {
    currentRate: v.number(),
    swr: v.number(),
    yearlyContribution: v.number(),
    birthDate: v.string(),
    monthlySpend: v.number(),
    inflationRate: v.number(),
    baseMonthlyBudget: v.optional(v.number()),
    spendingGrowthRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      return await ctx.db.insert("userSettings", {
        userId,
        ...args,
      });
    }
  },
});
