'use client'

import { cn } from '@/lib/utils'

interface ProgressRingProps {
  completed: number
  total: number
  size?: number
  strokeWidth?: number
  className?: string
}

/**
 * Circular SVG progress ring.
 * Fills with a green gradient as tasks are completed.
 * Shows "4/6" centered text.
 */
export function ProgressRing({
  completed,
  total,
  size = 56,
  strokeWidth = 3.5,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percent = total > 0 ? completed / total : 0
  const offset = circumference * (1 - percent)

  const isComplete = total > 0 && completed >= total

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/15"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isComplete ? '#10b981' : '#22c55e'} />
            <stop offset="100%" stopColor={isComplete ? '#059669' : '#16a34a'} />
          </linearGradient>
        </defs>
      </svg>
      {/* Centered text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(
          'text-xs font-bold leading-none tabular-nums',
          isComplete ? 'text-emerald-600' : 'text-foreground',
        )}>
          {completed}/{total}
        </span>
      </div>
    </div>
  )
}
