import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-xs font-medium text-gray-400">{label}</label>}
        <input
          ref={ref}
          className={cn(
            'w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600',
            'focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all',
            error && 'border-red-500/50',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'
