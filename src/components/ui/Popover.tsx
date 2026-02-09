'use client'

import React from 'react'
import { Popover as BasePopover } from '@base-ui/react/popover'

interface PopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  content: React.ReactNode
  className?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function Popover({ open, onOpenChange, children, content, className = '', side = 'top' }: PopoverProps) {
  return (
    <BasePopover.Root open={open} onOpenChange={onOpenChange}>
      <BasePopover.Trigger render={<span />}>
        {children}
      </BasePopover.Trigger>
      <BasePopover.Portal>
        <BasePopover.Positioner side={side} sideOffset={8}>
          <BasePopover.Popup
            className={`z-[100] bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 max-w-md text-sm ${className}`}
          >
            {content}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  )
}

/** Re-export sub-components for advanced usage */
export const PopoverRoot = BasePopover.Root
export const PopoverTrigger = BasePopover.Trigger
export const PopoverPortal = BasePopover.Portal
export const PopoverPositioner = BasePopover.Positioner
export const PopoverPopup = BasePopover.Popup
export const PopoverArrow = BasePopover.Arrow
export const PopoverTitle = BasePopover.Title
export const PopoverDescription = BasePopover.Description
