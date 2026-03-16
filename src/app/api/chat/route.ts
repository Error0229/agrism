import { NextResponse } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { auth } from "@clerk/nextjs/server";
import { systemPrompt } from "@/lib/ai/system-prompt";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let messages: UIMessage[];
  let context: string | undefined;
  try {
    const body = await req.json();
    messages = body.messages;
    context = body.context;
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "缺少 messages 參數" }, { status: 400 });
  }

  try {
    const result = streamText({
      model: openrouter("openai/gpt-4o"),
      system: systemPrompt + (context ? `\n\n使用者目前的種植資料:\n${context}` : ""),
      messages: await convertToModelMessages(messages),
      abortSignal: AbortSignal.timeout(30_000),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    return NextResponse.json(
      {
        error: isTimeout ? "AI 回應逾時，請稍後再試" : "AI 服務暫時無法使用，請稍後再試",
        code: isTimeout ? "TIMEOUT" : "AI_ERROR",
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
