'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EditorLayout } from './editor-layout'
import { FieldContextPanel } from './field-context-panel'
import type { Id } from '../../../convex/_generated/dataModel'

interface FieldDetailWrapperProps {
  fieldId: string
}

export function FieldDetailWrapper({ fieldId }: FieldDetailWrapperProps) {
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div className="flex h-full flex-col">
      {/* Main editor - takes available space */}
      <div className={cn('flex-1 min-h-0', panelOpen && 'flex-[2]')}>
        <EditorLayout fieldId={fieldId} />
      </div>

      {/* Collapsible bottom context panel */}
      <div className="border-t bg-background">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 rounded-none text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={() => setPanelOpen(!panelOpen)}
        >
          {panelOpen ? (
            <>
              <ChevronDown className="size-3" />
              收合田區資訊
            </>
          ) : (
            <>
              <ChevronUp className="size-3" />
              展開田區資訊（收成 · 任務）
            </>
          )}
        </Button>

        {panelOpen && (
          <div className="max-h-[300px] overflow-y-auto px-4 pb-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldContextPanel fieldId={fieldId as Id<'fields'>} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
