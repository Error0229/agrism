import { NextResponse } from "next/server";
import { getIntegrationOverview } from "@/lib/integration/service";

export async function GET() {
  try {
    const data = await getIntegrationOverview();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Integration overview error:", error);
    return NextResponse.json({ error: "無法取得整合資料總覽" }, { status: 500 });
  }
}
