import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
          size === 'sm' && 'px-2.5 py-1.5 text-xs',
          size === 'md' && 'px-4 py-2 text-sm',
          size === 'lg' && 'px-5 py-2.5 text-sm',
          variant === 'primary'   && 'bg-brand-500 hover:bg-brand-600 text-white',
          variant === 'secondary' && 'bg-[var(--surface-2)] hover:bg-[var(--surface-2h)] text-gray-200 border border-[var(--border)]',
          variant === 'ghost'     && 'hover:bg-[var(--surface-2)] text-gray-400 hover:text-gray-200',
          variant === 'danger'    && 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20',
          variant === 'outline'   && 'border border-[var(--border)] hover:bg-[var(--surface-2)] text-gray-300',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
