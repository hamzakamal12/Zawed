'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden',
          className,
        )}
      >
        {(title || description) && (
          <div className="p-6 border-b border-secondary-100">
            {title && <h2 className="text-lg font-semibold text-secondary-900">{title}</h2>}
            {description && (
              <p className="text-sm text-secondary-500 mt-1">{description}</p>
            )}
          </div>
        )}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="p-4 border-t border-secondary-100 flex items-center justify-end gap-2 bg-secondary-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
