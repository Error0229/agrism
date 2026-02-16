"use client";

import { ChatInterface } from "@/components/ai-assistant/chat-interface";

export default function AIAssistantPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">AI 助手</h1>
        <p className="text-muted-foreground">花蓮種植 AI 顧問，為您提供在地化種植建議</p>
      </div>
      <ChatInterface />
    </div>
  );
}
