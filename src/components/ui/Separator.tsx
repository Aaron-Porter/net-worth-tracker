'use client'

import React from 'react'
import { Separator as BaseSeparator } from '@base-ui/react/separator'

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Separator({ orientation = 'horizontal', className = '' }: SeparatorProps) {
  return (
    <BaseSeparator
      className={`${
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full'
      } bg-slate-700 ${className}`}
    />
  )
}
