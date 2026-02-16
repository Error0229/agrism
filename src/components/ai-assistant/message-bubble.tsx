"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { UIMessage } from "ai";

export function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-green-100 text-green-700"}>
          {isUser ? "我" : "🌱"}
        </AvatarFallback>
      </Avatar>
      <div
        className={`rounded-lg px-4 py-2 max-w-[80%] text-sm whitespace-pre-wrap ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") return <span key={i}>{part.text}</span>;
          return null;
        })}
      </div>
    </div>
  );
}
