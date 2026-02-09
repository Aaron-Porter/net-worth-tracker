'use client'

import React from 'react'
import { ScrollArea as BaseScrollArea } from '@base-ui/react/scroll-area'

interface ScrollAreaProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical' | 'both'
}

export function ScrollArea({ children, className = '', orientation = 'vertical' }: ScrollAreaProps) {
  return (
    <BaseScrollArea.Root className={`overflow-hidden ${className}`}>
      <BaseScrollArea.Viewport className="h-full w-full">
        {children}
      </BaseScrollArea.Viewport>
      {(orientation === 'vertical' || orientation === 'both') && (
        <BaseScrollArea.Scrollbar orientation="vertical" className="flex w-1.5 touch-none p-0.5">
          <BaseScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-600" />
        </BaseScrollArea.Scrollbar>
      )}
      {(orientation === 'horizontal' || orientation === 'both') && (
        <BaseScrollArea.Scrollbar orientation="horizontal" className="flex h-1.5 touch-none p-0.5 flex-col">
          <BaseScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-600" />
        </BaseScrollArea.Scrollbar>
      )}
    </BaseScrollArea.Root>
  )
}
