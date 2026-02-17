import { NextResponse } from "next/server";
import type { PlannerEvent } from "@/lib/planner/events";
import { appendPlannerEvent } from "@/lib/server/planner-event-store";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import { ensureUserFarmMembership, getDefaultFarmIdForUser } from "@/lib/server/auth-db";
import type { Session } from "next-auth";

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as (Session & { user: { id: string } }) | null;
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = (await req.json()) as PlannerEvent;
    if (!event?.id || !event?.type || !event?.occurredAt) {
      return NextResponse.json({ error: "Invalid planner event payload." }, { status: 400 });
    }

    const requestedFarmId = (req.headers.get("x-farm-id") ?? "").trim();
    const farmId = requestedFarmId || (await getDefaultFarmIdForUser(userId));
    if (!farmId) {
      return NextResponse.json({ error: "No farm membership found." }, { status: 403 });
    }

    const allowed = await ensureUserFarmMembership(userId, farmId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden farm scope." }, { status: 403 });
    }

    const persisted = await appendPlannerEvent(event, { userId, farmId });
    return NextResponse.json({ ok: true, persisted });
  } catch (error) {
    console.error("Planner command append error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
