'use client'

import React from 'react'
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group'
import { Toggle as BaseToggle } from '@base-ui/react/toggle'

interface ToggleGroupItem {
  value: string
  label: React.ReactNode
}

interface ToggleGroupProps {
  value: string
  onValueChange: (value: string) => void
  items: ToggleGroupItem[]
  className?: string
}

export function ToggleGroup({ value, onValueChange, items, className = '' }: ToggleGroupProps) {
  return (
    <BaseToggleGroup
      value={[value]}
      onValueChange={(vals: string[]) => {
        const newVal = vals.find((v: string) => v !== value) || value
        onValueChange(newVal)
      }}
      className={`inline-flex rounded-lg bg-slate-900/70 p-0.5 ${className}`}
    >
      {items.map((item) => (
        <BaseToggle
          key={item.value}
          value={item.value}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === item.value
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {item.label}
        </BaseToggle>
      ))}
    </BaseToggleGroup>
  )
}
