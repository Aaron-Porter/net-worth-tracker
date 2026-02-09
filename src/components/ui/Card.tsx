'use client'

import React from 'react'

type CardVariant = 'default' | 'highlighted' | 'glass'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-[#0f1629] border border-slate-800',
  highlighted: 'bg-[#0f1629] border border-emerald-500/20',
  glass: 'bg-slate-800/30 backdrop-blur border border-slate-700/50',
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'lg', className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-xl shadow-lg ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'
