'use client'

import React from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  maxWidth?: string
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, title, maxWidth = 'max-w-3xl', children }: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <BaseDialog.Popup
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto`}
        >
          <div className={`bg-slate-800 rounded-xl border border-slate-700 w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
            {title && (
              <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between z-10">
                <BaseDialog.Title className="text-xl font-semibold text-slate-200">
                  {title}
                </BaseDialog.Title>
                <BaseDialog.Close className="p-1.5 text-slate-400 hover:text-slate-200 rounded transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </BaseDialog.Close>
              </div>
            )}
            {children}
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}

/** Convenience sub-components for dialog content structure */
Dialog.Body = function DialogBody({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 space-y-6 ${className}`} {...props} />
}

Dialog.Footer = function DialogFooter({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`sticky bottom-0 bg-slate-800 border-t border-slate-700 p-4 flex justify-end gap-3 ${className}`} {...props} />
}
