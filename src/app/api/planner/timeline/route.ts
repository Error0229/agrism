import { NextResponse } from "next/server";
import { getPlannerEvents } from "@/lib/server/planner-event-store";
import { detectSpatialConflictsAt, replayPlannerEvents } from "@/lib/planner/events";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import { ensureUserFarmMembership, getDefaultFarmIdForUser } from "@/lib/server/auth-db";
import type { Session } from "next-auth";

function dateOnly(dateLike: string) {
  return dateLike.split("T")[0];
}

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
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const requestedFarmId = searchParams.get("farmId") ?? undefined;

    const farmId = requestedFarmId || (await getDefaultFarmIdForUser(userId));
    if (!farmId) {
      return NextResponse.json({ error: "No farm membership found." }, { status: 403 });
    }

    const allowed = await ensureUserFarmMembership(userId, farmId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden farm scope." }, { status: 403 });
    }

    const events = await getPlannerEvents({ userId, farmId, fieldId, at, from, to });

    const anchors = Array.from(
      new Set(
        events.flatMap((event) => {
          const dates = [dateOnly(event.occurredAt)];
          if (event.type === "crop_planted" || event.type === "crop_updated") {
            const payload = event.payload as { plantedDate?: string };
            if (payload.plantedDate) dates.push(dateOnly(payload.plantedDate));
          }
          if (event.type === "crop_harvested") {
            const payload = event.payload as { harvestedDate?: string };
            if (payload.harvestedDate) dates.push(dateOnly(payload.harvestedDate));
          }
          return dates;
        })
      )
    ).sort((a, b) => a.localeCompare(b));

    const timelineAt = at ?? (anchors.length > 0 ? `${anchors[anchors.length - 1]}T23:59:59.999Z` : undefined);
    const fieldsAt = timelineAt
      ? replayPlannerEvents(events, { at: timelineAt, respectPlantedDate: true })
      : replayPlannerEvents(events, { respectPlantedDate: true });

    const conflictsAt = timelineAt ? detectSpatialConflictsAt(events, timelineAt) : [];

    return NextResponse.json({
      events,
      anchors,
      fieldsAt,
      conflictsAt,
      timelineAt: timelineAt ?? null,
    });
  } catch (error) {
    console.error("Planner timeline read error:", error);
    return NextResponse.json({ error: "Failed to read planner timeline." }, { status: 500 });
  }
}
