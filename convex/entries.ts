import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const entries = await ctx.db
      .query("netWorthEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Sort by timestamp descending (newest first)
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  },
});

export const add = mutation({
  args: {
    amount: v.number(),
    timestamp: v.number(),
    // Optional breakdown by asset type
    cashChecking: v.optional(v.number()),
    cashSavings: v.optional(v.number()),
    investments: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("netWorthEntries", {
      userId,
      amount: args.amount,
      timestamp: args.timestamp,
      cashChecking: args.cashChecking,
      cashSavings: args.cashSavings,
      investments: args.investments,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("netWorthEntries"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== userId) {
      throw new Error("Entry not found or not authorized");
    }

    await ctx.db.delete(args.id);
  },
});
