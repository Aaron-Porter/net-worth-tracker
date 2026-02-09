'use client'

import React from 'react'
import { Switch as BaseSwitch } from '@base-ui/react/switch'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  className?: string
}

export function Switch({ checked, onCheckedChange, label, className = '' }: SwitchProps) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
      <BaseSwitch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-slate-600'
        }`}
      >
        <BaseSwitch.Thumb
          className={`block w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </BaseSwitch.Root>
      {label && <span className="text-sm text-slate-300">{label}</span>}
    </label>
  )
}
