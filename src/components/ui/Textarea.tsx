import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-xs font-medium text-gray-400">{label}</label>}
        <textarea
          ref={ref}
          rows={3}
          className={cn(
            'w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 resize-none',
            'focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
