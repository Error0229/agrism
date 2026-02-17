"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { useFields } from "@/lib/store/fields-context";
import { useTasks } from "@/lib/store/tasks-context";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { Send } from "lucide-react";

const quickQuestions = [
  "根據我的作物產生種植排程建議",
  "這個月適合種什麼？",
  "颱風季該如何準備？",
  "花蓮適合新手種的蔬菜有哪些？",
];

export function ChatInterface() {
  const { fields } = useFields();
  const { tasks } = useTasks();
  const allCrops = useAllCrops();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const context = useMemo(() => {
    const plantedInfo = fields.flatMap((f) =>
      f.plantedCrops
        .filter((c) => c.status === "growing")
        .map((c) => {
          const crop = allCrops.find((cr) => cr.id === c.cropId);
          return `- ${crop?.name}（${f.name}），種植日期：${c.plantedDate.split("T")[0]}`;
        })
    );
    const pendingTasks = tasks
      .filter((t) => !t.completed)
      .slice(0, 10)
      .map((t) => `- ${t.title}，預定：${t.dueDate.split("T")[0]}`);

    if (plantedInfo.length === 0 && pendingTasks.length === 0) return "";

    let ctx = "";
    if (plantedInfo.length > 0) {
      ctx += `已種植作物：\n${plantedInfo.join("\n")}`;
    }
    if (pendingTasks.length > 0) {
      ctx += `\n\n待完成任務：\n${pendingTasks.join("\n")}`;
    }
    return ctx;
  }, [allCrops, fields, tasks]);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ context }),
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    await sendMessage({ text });
  };

  const handleQuickQuestion = async (question: string) => {
    setInput("");
    await sendMessage({ text: question });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl">🌱</span>
              <h3 className="mt-4 font-semibold text-lg">花蓮種植小幫手</h3>
              <p className="text-sm text-muted-foreground mt-1">
                你好！我是花蓮種植 AI 助手，可以回答種植相關問題。
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {quickQuestions.map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickQuestion(q)}
                    className="text-xs"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
            <div className="flex gap-3">
              <div className="size-8 rounded-full bg-green-100 flex items-center justify-center text-sm shrink-0">
                🌱
              </div>
              <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">
                思考中...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-4 border-t">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="輸入您的種植問題..."
          className="min-h-[44px] max-h-[120px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button onClick={handleSend} size="icon" disabled={isLoading || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
