'use client'

import React from 'react'
import { Toggle as BaseToggle } from '@base-ui/react/toggle'

interface ToggleProps {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  children: React.ReactNode
  className?: string
}

export function Toggle({ pressed, onPressedChange, children, className = '' }: ToggleProps) {
  return (
    <BaseToggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        pressed
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'text-slate-500 hover:text-slate-300'
      } ${className}`}
    >
      {children}
    </BaseToggle>
  )
}
