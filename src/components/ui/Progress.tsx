'use client'

import React from 'react'
import { Progress as BaseProgress } from '@base-ui/react/progress'

interface ProgressProps {
  value: number
  max?: number
  color?: string
  height?: string
  className?: string
}

export function Progress({ value, max = 100, color = 'bg-emerald-500', height = 'h-2', className = '' }: ProgressProps) {
  const percent = Math.min(100, (value / max) * 100)

  return (
    <BaseProgress.Root value={value} className={`${height} bg-slate-700 rounded-full overflow-hidden ${className}`}>
      <BaseProgress.Track>
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </BaseProgress.Track>
    </BaseProgress.Root>
  )
}
