import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// User profile - personal info only
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return profile;
  },
});

export const saveProfile = mutation({
  args: {
    birthDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfile")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      return await ctx.db.insert("userProfile", {
        userId,
        ...args,
      });
    }
  },
});

// Legacy compatibility - get function that returns profile data
// This allows gradual migration of existing code
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    // Return profile with default values for backward compatibility
    if (!profile) {
      return null;
    }

    return {
      birthDate: profile.birthDate,
      // These defaults are only for backward compatibility during migration
      monthlySpend: 0,
      currentRate: 7,
      swr: 4,
      yearlyContribution: 0,
      inflationRate: 3,
      baseMonthlyBudget: 3000,
      spendingGrowthRate: 2,
    };
  },
});

// Legacy save - redirects to saveProfile
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
      .query("userProfile")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const profileData = {
      birthDate: args.birthDate,
    };

    if (existing) {
      await ctx.db.patch(existing._id, profileData);
      return existing._id;
    } else {
      return await ctx.db.insert("userProfile", {
        userId,
        ...profileData,
      });
    }
  },
});
