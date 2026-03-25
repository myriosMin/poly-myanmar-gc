import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-border/70 bg-background/90 px-4 py-2 text-sm text-foreground shadow-[0_14px_40px_-28px_rgba(39,27,18,0.24)] outline-none transition duration-200 ease-out focus:border-primary/50 focus:ring-2 focus:ring-ring/30',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
