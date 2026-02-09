'use client'

import React from 'react'
import { Menu as BaseMenu } from '@base-ui/react/menu'

interface MenuItem {
  label: React.ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

interface MenuProps {
  trigger: React.ReactElement
  items: MenuItem[]
  className?: string
}

export function Menu({ trigger, items, className = '' }: MenuProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={4}>
          <BaseMenu.Popup className={`z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[160px] ${className}`}>
            {items.map((item, idx) => (
              <BaseMenu.Item
                key={idx}
                disabled={item.disabled}
                onClick={item.onClick}
                className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                  item.danger
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-slate-200 hover:bg-slate-700/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {item.label}
              </BaseMenu.Item>
            ))}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  )
}
