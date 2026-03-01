import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const CATEGORY_COLORS = [
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#10b981", // emerald
  "#ef4444", // red
  "#84cc16", // lime
  "#f97316", // orange
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const categories = await ctx.db
      .query("budgetCategories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return categories.sort((a, b) => a.order - b.order);
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    monthlyAmount: v.number(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("budgetCategories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Pick next available color
    const usedColors = new Set(existing.map((c) => c.color));
    const color =
      args.color ||
      CATEGORY_COLORS.find((c) => !usedColors.has(c)) ||
      CATEGORY_COLORS[existing.length % CATEGORY_COLORS.length];

    const maxOrder = existing.reduce((max, c) => Math.max(max, c.order), -1);

    return await ctx.db.insert("budgetCategories", {
      userId,
      name: args.name,
      monthlyAmount: args.monthlyAmount,
      color,
      order: maxOrder + 1,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("budgetCategories"),
    name: v.optional(v.string()),
    monthlyAmount: v.optional(v.number()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const category = await ctx.db.get(args.id);
    if (!category || category.userId !== userId) {
      throw new Error("Category not found");
    }

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(id, filtered);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("budgetCategories") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const category = await ctx.db.get(args.id);
    if (!category || category.userId !== userId) {
      throw new Error("Category not found");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const reorder = mutation({
  args: { orderedIds: v.array(v.id("budgetCategories")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    for (let i = 0; i < args.orderedIds.length; i++) {
      const category = await ctx.db.get(args.orderedIds[i]);
      if (!category || category.userId !== userId) {
        throw new Error("Category not found");
      }
      await ctx.db.patch(args.orderedIds[i], { order: i });
    }

    return args.orderedIds;
  },
});
