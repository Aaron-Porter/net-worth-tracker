import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get cash flow plan for a scenario
export const getByScenario = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const plan = await ctx.db
      .query("cashFlowPlans")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", args.scenarioId))
      .first();

    if (!plan || plan.userId !== userId) return null;

    return plan;
  },
});

// Create or update a cash flow plan for a scenario
export const upsert = mutation({
  args: {
    scenarioId: v.id("scenarios"),
    grossAnnualIncome: v.number(),
    preTax401k: v.number(),
    preTaxHsa: v.number(),
    preTaxTraditionalIra: v.number(),
    preTaxOther: v.number(),
    effectiveTaxRate: v.number(),
    postTaxRoth: v.number(),
    postTaxBrokerage: v.number(),
    postTaxSavings: v.number(),
    postTaxOther: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify the scenario belongs to the user
    const scenario = await ctx.db.get(args.scenarioId);
    if (!scenario || scenario.userId !== userId) {
      throw new Error("Scenario not found");
    }

    // Calculate derived fields
    const totalPreTaxSavings =
      args.preTax401k +
      args.preTaxHsa +
      args.preTaxTraditionalIra +
      args.preTaxOther;

    const totalPostTaxSavings =
      args.postTaxRoth +
      args.postTaxBrokerage +
      args.postTaxSavings +
      args.postTaxOther;

    const totalSavings = totalPreTaxSavings + totalPostTaxSavings;
    const taxableIncome = args.grossAnnualIncome - totalPreTaxSavings;
    const estimatedAnnualTax = taxableIncome * (args.effectiveTaxRate / 100);
    const takeHomePay = taxableIncome - estimatedAnnualTax;
    const annualSpending = takeHomePay - totalPostTaxSavings;
    const monthlyBudget = annualSpending / 12;

    // Check if plan already exists
    const existingPlan = await ctx.db
      .query("cashFlowPlans")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", args.scenarioId))
      .first();

    const now = Date.now();
    const planData = {
      userId,
      scenarioId: args.scenarioId,
      grossAnnualIncome: args.grossAnnualIncome,
      preTax401k: args.preTax401k,
      preTaxHsa: args.preTaxHsa,
      preTaxTraditionalIra: args.preTaxTraditionalIra,
      preTaxOther: args.preTaxOther,
      effectiveTaxRate: args.effectiveTaxRate,
      estimatedAnnualTax,
      postTaxRoth: args.postTaxRoth,
      postTaxBrokerage: args.postTaxBrokerage,
      postTaxSavings: args.postTaxSavings,
      postTaxOther: args.postTaxOther,
      totalPreTaxSavings,
      totalPostTaxSavings,
      totalSavings,
      taxableIncome,
      takeHomePay,
      annualSpending,
      monthlyBudget,
      updatedAt: now,
    };

    if (existingPlan) {
      await ctx.db.patch(existingPlan._id, planData);
      return existingPlan._id;
    } else {
      return await ctx.db.insert("cashFlowPlans", {
        ...planData,
        createdAt: now,
      });
    }
  },
});

// Delete a cash flow plan
export const remove = mutation({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = await ctx.db
      .query("cashFlowPlans")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", args.scenarioId))
      .first();

    if (!plan || plan.userId !== userId) {
      throw new Error("Cash flow plan not found");
    }

    await ctx.db.delete(plan._id);
    return plan._id;
  },
});

// Sync cash flow plan values to scenario
export const syncToScenario = mutation({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = await ctx.db
      .query("cashFlowPlans")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", args.scenarioId))
      .first();

    if (!plan || plan.userId !== userId) {
      throw new Error("Cash flow plan not found");
    }

    // Update scenario with calculated values from cash flow plan
    await ctx.db.patch(args.scenarioId, {
      yearlyContribution: plan.totalSavings,
      baseMonthlyBudget: plan.monthlyBudget,
      updatedAt: Date.now(),
    });

    return args.scenarioId;
  },
});
