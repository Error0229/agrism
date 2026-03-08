'use client'

import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface MarkdownProps {
  children: string
  className?: string
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        'prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5',
        'prose-headings:text-sm prose-headings:font-semibold prose-headings:my-2',
        className
      )}
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}
