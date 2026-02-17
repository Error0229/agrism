import { NextResponse } from "next/server";
import { getPlannerEvents } from "@/lib/server/planner-event-store";
import { replayPlannerEvents } from "@/lib/planner/events";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fieldId = searchParams.get("fieldId") ?? undefined;
    const at = searchParams.get("at") ?? undefined;

    const events = await getPlannerEvents({ fieldId, at });
    const fields = replayPlannerEvents(events, at ? { at } : undefined);
    return NextResponse.json({ fields, events });
  } catch (error) {
    console.error("Planner state read error:", error);
    return NextResponse.json({ error: "Failed to read planner state." }, { status: 500 });
  }
}

