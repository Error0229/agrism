import { NextResponse } from "next/server";
import { getPlannerEvents } from "@/lib/server/planner-event-store";
import { replayPlannerEvents } from "@/lib/planner/events";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import { ensureUserFarmMembership, getDefaultFarmIdForUser } from "@/lib/server/auth-db";
import type { Session } from "next-auth";

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as (Session & { user: { id: string } }) | null;
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fieldId = searchParams.get("fieldId") ?? undefined;
    const at = searchParams.get("at") ?? undefined;
    const requestedFarmId = searchParams.get("farmId") ?? undefined;
    const farmId = requestedFarmId || (await getDefaultFarmIdForUser(userId));
    if (!farmId) {
      return NextResponse.json({ error: "No farm membership found." }, { status: 403 });
    }

    const allowed = await ensureUserFarmMembership(userId, farmId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden farm scope." }, { status: 403 });
    }

    const events = await getPlannerEvents({ userId, farmId, fieldId, at });
    const fields = replayPlannerEvents(events, at ? { at } : undefined);
    return NextResponse.json({ fields, events });
  } catch (error) {
    console.error("Planner state read error:", error);
    return NextResponse.json({ error: "Failed to read planner state." }, { status: 500 });
  }
}
