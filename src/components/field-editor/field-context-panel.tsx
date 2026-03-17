'use client'

import { Component, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wheat, ListChecks } from 'lucide-react'
import { getTaskTheme } from '@/components/task-hub/task-row'

// ---------------------------------------------------------------------------
// Error boundary — catches query/render errors for graceful degradation
// ---------------------------------------------------------------------------

class PanelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Sub-panels (each wrapped in its own error boundary)
// ---------------------------------------------------------------------------

function HarvestPanel({ fieldId }: { fieldId: Id<'fields'> }) {
  const harvestLogs = useQuery(api.harvest.getByFieldId, { fieldId, limit: 5 })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Wheat className="size-4 text-orange-500" />
          近期收成
        </CardTitle>
      </CardHeader>
      <CardContent>
        {harvestLogs === undefined ? (
          <p className="text-xs text-muted-foreground">載入中...</p>
        ) : harvestLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground">此田區尚無收穫紀錄</p>
        ) : (
          <div className="space-y-2">
            {harvestLogs.map((log) => (
              <div
                key={log._id}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground whitespace-nowrap">{log.date}</span>
                  {log.cropId && log.cropName ? (
                    <Link
                      href={`/crops/${log.cropId}`}
                      className="text-primary hover:underline underline-offset-2 truncate"
                    >
                      {log.cropName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <span className="text-muted-foreground whitespace-nowrap ml-2">
                  {log.quantity} {log.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TasksPanel({ fieldId }: { fieldId: Id<'fields'> }) {
  const activeTasks = useQuery(api.tasks.getByFieldId, { fieldId, limit: 10 })
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0]!, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ListChecks className="size-4 text-blue-500" />
          進行中任務
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeTasks === undefined ? (
          <p className="text-xs text-muted-foreground">載入中...</p>
        ) : activeTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">此田區目前無進行中任務</p>
        ) : (
          <div className="space-y-2">
            {activeTasks.map((task) => {
              const theme = getTaskTheme(task)
              const isOverdue = task.dueDate && task.dueDate < todayStr

              return (
                <div
                  key={task._id}
                  className="flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      {theme.label}
                    </Badge>
                    <span className="truncate">{task.title}</span>
                  </div>
                  {task.dueDate && (
                    <span
                      className={`whitespace-nowrap ml-2 ${isOverdue ? 'text-rose-600 font-medium' : 'text-muted-foreground'}`}
                    >
                      {task.dueDate}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface FieldContextPanelProps {
  fieldId: Id<'fields'>
}

export function FieldContextPanel({ fieldId }: FieldContextPanelProps) {
  return (
    <>
      <PanelErrorBoundary
        fallback={
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">無法載入收穫資料</p>
            </CardContent>
          </Card>
        }
      >
        <HarvestPanel fieldId={fieldId} />
      </PanelErrorBoundary>

      <PanelErrorBoundary
        fallback={
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">無法載入任務資料</p>
            </CardContent>
          </Card>
        }
      >
        <TasksPanel fieldId={fieldId} />
      </PanelErrorBoundary>
    </>
  )
}
