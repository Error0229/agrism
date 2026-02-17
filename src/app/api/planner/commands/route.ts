import { NextResponse } from "next/server";
import type { PlannerEvent } from "@/lib/planner/events";
import { appendPlannerEvent } from "@/lib/server/planner-event-store";

export async function POST(req: Request) {
  try {
    const event = (await req.json()) as PlannerEvent;
    if (!event?.id || !event?.type || !event?.occurredAt) {
      return NextResponse.json({ error: "Invalid planner event payload." }, { status: 400 });
    }

    const persisted = await appendPlannerEvent(event);
    return NextResponse.json({ ok: true, persisted });
  } catch (error) {
    console.error("Planner command append error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

