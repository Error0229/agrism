import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./_helpers";

/**
 * Get the current user's farm and role.
 * Returns null if not authenticated or no farm exists.
 */
export const getMyFarm = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const membership = await ctx.db
      .query("farmMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!membership) return null;

    const farm = await ctx.db.get(membership.farmId);
    if (!farm) return null;

    return { farm, role: membership.role };
  },
});

/**
 * Ensure a farm exists for the current user.
 * Creates farm + membership if none found.
 */
export const ensureFarm = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuth(ctx);

    // Check existing membership
    const existing = await ctx.db
      .query("farmMembers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (existing) {
      const farm = await ctx.db.get(existing.farmId);
      return { farm, role: existing.role };
    }

    // Create farm + membership
    const farmName = `${identity.name ?? "我的"}農場`;
    const farmId = await ctx.db.insert("farms", {
      clerkUserId: identity.subject,
      name: farmName,
      createdAt: Date.now(),
    });

    await ctx.db.insert("farmMembers", {
      farmId,
      clerkUserId: identity.subject,
      role: "owner",
      createdAt: Date.now(),
    });

    // Seed default crops for the new farm
    await ctx.scheduler.runAfter(0, internal.crops.seedDefaultsInternal, { farmId });

    const farm = await ctx.db.get(farmId);
    return { farm, role: "owner" as const };
  },
});
