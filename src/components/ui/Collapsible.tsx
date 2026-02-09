'use client'

import React from 'react'
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible'

interface CollapsibleProps {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Collapsible({
  defaultOpen = false,
  open,
  onOpenChange,
  trigger,
  children,
  className = '',
}: CollapsibleProps) {
  return (
    <BaseCollapsible.Root
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      className={className}
    >
      <BaseCollapsible.Trigger className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        {trigger}
      </BaseCollapsible.Trigger>
      <BaseCollapsible.Panel>
        {children}
      </BaseCollapsible.Panel>
    </BaseCollapsible.Root>
  )
}
