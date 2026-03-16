'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface QueryErrorBoundaryProps {
  children: React.ReactNode
  fallback?: (error: Error, retry: () => void) => React.ReactNode
}

interface QueryErrorBoundaryState {
  error: Error | null
}

/**
 * React error boundary that catches render errors in a section of the UI.
 * Provides a default zh-TW fallback with a retry button, or accepts a custom fallback renderer.
 */
export class QueryErrorBoundary extends React.Component<
  QueryErrorBoundaryProps,
  QueryErrorBoundaryState
> {
  constructor(props: QueryErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): QueryErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[QueryErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    const { children, fallback } = this.props

    if (error) {
      if (fallback) {
        return fallback(error, this.handleRetry)
      }

      return (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle className="size-8 text-destructive/70" />
            <div>
              <p className="text-sm font-medium">發生錯誤</p>
              <p className="text-xs text-muted-foreground mt-1">
                此區塊載入失敗，請稍後重試
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={this.handleRetry}>
              重試
            </Button>
          </CardContent>
        </Card>
      )
    }

    return children
  }
}
