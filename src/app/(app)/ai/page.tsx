'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useFarmId } from '@/hooks/use-farm-id'
import { Send, Loader2 } from 'lucide-react'
import type { UIMessage } from 'ai'

const quickQuestions = [
  '根據我的作物產生種植排程建議',
  '這個月適合種什麼？',
  '颱風季該如何準備？',
  '花蓮適合新手種的蔬菜有哪些？',
]

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className="size-8 shrink-0">
        <AvatarFallback
          className={
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-green-100 text-green-700'
          }
        >
          {isUser ? '我' : '🌱'}
        </AvatarFallback>
      </Avatar>
      <div
        className={`rounded-lg px-4 py-2 max-w-[80%] text-sm whitespace-pre-wrap ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text') return <span key={i}>{part.text}</span>
          return null
        })}
      </div>
    </div>
  )
}

export default function AiAssistantPage() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const farmId = useFarmId()

  // Fetch aggregated farm context from server-side Convex query
  const contextData = useQuery(
    api.aiContext.buildChatContext,
    farmId ? { farmId } : 'skip',
  )
  const contextLoading = farmId !== undefined && contextData === undefined
  const context = contextData ?? ''

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({ context }),
    }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const text = input
    setInput('')
    await sendMessage({ text })
  }

  const handleQuickQuestion = async (question: string) => {
    setInput('')
    await sendMessage({ text: question })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">AI 助手</h1>
        <p className="text-muted-foreground">
          花蓮種植 AI 顧問，為您提供在地化種植建議
        </p>
        {contextLoading && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Loader2 className="size-3 animate-spin" />
            正在載入農場資料...
          </p>
        )}
      </div>

      <div className="flex flex-col h-[calc(100dvh-10rem)] sm:h-[calc(100dvh-14rem)]">
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <span className="text-4xl">🌱</span>
                <h3 className="mt-4 font-semibold text-lg">花蓮種植小幫手</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  你好！我是花蓮種植 AI
                  助手，可以回答種植相關問題。
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
            {isLoading &&
              messages.length > 0 &&
              messages[messages.length - 1].role === 'user' && (
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
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
