import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  title?: React.ReactNode
  width?: number | string
  children: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
  onOk?: () => void
  okText?: string
  cancelText?: string
  maskClosable?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  width = 520,
  children,
  footer,
  onClose,
  onOk,
  okText = '确定',
  cancelText = '取消',
  maskClosable = true,
}) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => maskClosable && onClose()}
      />
      <div
        className="relative bg-white rounded-md shadow-lg max-h-[90vh] flex flex-col"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
            <div className="font-semibold text-[var(--color-text-primary)] text-[15px]">{title}</div>
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto px-5 py-4">{children}</div>
        {footer !== null && (
          <div className="px-5 py-3 border-t border-[var(--color-border)] flex justify-end gap-2">
            {footer || (
              <>
                <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
                {onOk && <Button variant="primary" onClick={onOk}>{okText}</Button>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
