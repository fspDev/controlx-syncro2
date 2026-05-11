import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Dialog({ open, onClose, title, children, className, size = 'md' }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={cn(
        'bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col max-h-[90vh] w-full',
        size === 'sm' && 'max-w-sm',
        size === 'md' && 'max-w-lg',
        size === 'lg' && 'max-w-2xl',
        className
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-base font-semibold text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 transition-colors rounded-lg p-1 hover:bg-[var(--surface-2)] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', danger = true }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-400 mb-6">{message}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-[var(--surface-2)] rounded-lg transition-all cursor-pointer">
          Cancelar
        </button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={cn(
            'px-4 py-2 text-sm rounded-lg font-medium transition-all cursor-pointer',
            danger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-brand-500 hover:bg-brand-600 text-white'
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
