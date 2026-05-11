import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--surface)] border border-[var(--border)] rounded-xl',
        onClick && 'cursor-pointer hover:border-[var(--border-h)] transition-colors',
        className
      )}
    >
      {children}
    </div>
  )
}
