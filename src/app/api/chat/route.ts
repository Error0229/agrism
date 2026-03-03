import { NextResponse } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { auth } from "@/server/auth";
import { systemPrompt } from "@/lib/ai/system-prompt";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, context }: { messages: UIMessage[]; context?: string } = await req.json();

  const result = streamText({
    model: openrouter("openai/gpt-4o"),
    system: systemPrompt + (context ? `\n\n使用者目前的種植資料:\n${context}` : ""),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
