import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-xs font-medium text-gray-400">{label}</label>}
        <select
          ref={ref}
          className={cn(
            'w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-gray-200',
            'focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all cursor-pointer',
            className
          )}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    )
  }
)
Select.displayName = 'Select'
