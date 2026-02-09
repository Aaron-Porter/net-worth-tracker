'use client'

import React from 'react'

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  suffix?: string
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ label, suffix, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-300 mb-2">
            {label}
            {suffix && <span className="text-slate-500 ml-1">({suffix})</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type="number"
          className={`w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 ${className}`}
          {...props}
        />
      </div>
    )
  }
)
NumberInput.displayName = 'NumberInput'
