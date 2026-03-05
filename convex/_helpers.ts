// convex/_helpers.ts
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get the authenticated user's identity or throw.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("未登入，無法執行此操作");
  }
  return identity;
}

/**
 * Resolve the authenticated user's farm ID.
 * Looks up the first farm where the user is a member.
 */
export async function requireFarmId(ctx: QueryCtx | MutationCtx) {
  const identity = await requireAuth(ctx);
  const membership = await ctx.db
    .query("farmMembers")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .first();
  if (!membership) {
    throw new Error("找不到農場，請先建立農場");
  }
  return { farmId: membership.farmId, clerkUserId: identity.subject };
}

/**
 * Verify the authenticated user is a member of the specified farm.
 * Use this when the caller provides a farmId explicitly.
 */
export async function requireFarmMembership(ctx: QueryCtx | MutationCtx, farmId: Id<"farms">) {
  const identity = await requireAuth(ctx);
  const membership = await ctx.db
    .query("farmMembers")
    .withIndex("by_farmId_clerkUserId", (q) =>
      q.eq("farmId", farmId).eq("clerkUserId", identity.subject)
    )
    .first();
  if (!membership) throw new Error("無權限存取此農場資料");
  return { farmId, clerkUserId: identity.subject, role: membership.role };
}
