import { NextResponse } from "next/server";
import { z } from "zod";
import { createUserWithDefaultFarm } from "@/lib/server/auth-db";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(60).optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "資料格式錯誤" }, { status: 400 });
    }

    const user = await createUserWithDefaultFarm(parsed.data);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "註冊失敗";
    const status = message.includes("exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

