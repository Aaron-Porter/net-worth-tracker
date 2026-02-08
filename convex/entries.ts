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
    cash: v.optional(v.number()),
    retirement: v.optional(v.number()),
    hsa: v.optional(v.number()),
    brokerage: v.optional(v.number()),
    debts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const hasBreakdown = args.cash !== undefined || args.retirement !== undefined ||
      args.hsa !== undefined || args.brokerage !== undefined || args.debts !== undefined;

    // When breakdown is provided, compute amount server-side
    const amount = hasBreakdown
      ? (args.cash ?? 0) + (args.retirement ?? 0) + (args.hsa ?? 0) + (args.brokerage ?? 0) - (args.debts ?? 0)
      : args.amount;

    return await ctx.db.insert("netWorthEntries", {
      userId,
      amount,
      timestamp: args.timestamp,
      ...(hasBreakdown ? {
        cash: args.cash ?? 0,
        retirement: args.retirement ?? 0,
        hsa: args.hsa ?? 0,
        brokerage: args.brokerage ?? 0,
        debts: args.debts ?? 0,
      } : {}),
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
