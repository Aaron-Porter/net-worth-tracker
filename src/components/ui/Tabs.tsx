'use client'

import React from 'react'
import { Tabs as BaseTabs } from '@base-ui/react/tabs'

interface TabConfig {
  value: string
  label: React.ReactNode
  /** Optional accent color override (e.g., violet for scenarios) */
  activeColor?: string
}

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  tabs: TabConfig[]
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, tabs, children, className = '' }: TabsProps) {
  return (
    <BaseTabs.Root
      value={value}
      onValueChange={(val) => onValueChange(val as string)}
      className={className}
    >
      <BaseTabs.List className="flex gap-1 items-center min-w-0">
        {tabs.map((tab) => {
          const isActive = value === tab.value
          const color = tab.activeColor || 'emerald'
          return (
            <BaseTabs.Tab
              key={tab.value}
              value={tab.value}
              className={`px-3 py-3 sm:px-6 sm:py-4 font-medium transition-colors relative whitespace-nowrap ${
                isActive
                  ? `text-${color}-400`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {isActive && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${color}-400`} />
              )}
            </BaseTabs.Tab>
          )
        })}
      </BaseTabs.List>
      {children}
    </BaseTabs.Root>
  )
}

export const TabPanel = BaseTabs.Panel
