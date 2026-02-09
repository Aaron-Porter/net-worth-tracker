'use client'

import React from 'react'
import { Accordion as BaseAccordion } from '@base-ui/react/accordion'

interface AccordionItem {
  value: string
  trigger: React.ReactNode
  content: React.ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  multiple?: boolean
  defaultValue?: string[]
  className?: string
}

export function Accordion({ items, multiple = false, defaultValue, className = '' }: AccordionProps) {
  return (
    <BaseAccordion.Root
      multiple={multiple}
      defaultValue={defaultValue}
      className={`space-y-2 ${className}`}
    >
      {items.map((item) => (
        <BaseAccordion.Item key={item.value} value={item.value}>
          <BaseAccordion.Header>
            <BaseAccordion.Trigger className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors rounded-lg text-left">
              {item.trigger}
              <svg
                className="w-5 h-5 text-slate-400 transition-transform [[data-open]>&]:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </BaseAccordion.Trigger>
          </BaseAccordion.Header>
          <BaseAccordion.Panel className="overflow-hidden">
            {item.content}
          </BaseAccordion.Panel>
        </BaseAccordion.Item>
      ))}
    </BaseAccordion.Root>
  )
}
