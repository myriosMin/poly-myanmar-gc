import * as React from 'react'
import { cn } from '@/lib/utils'

const Switch = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      className={cn(
        'inline-flex h-[var(--control-height)] cursor-pointer items-center gap-3 rounded-full border border-border/70 bg-background/80 px-4 text-sm text-foreground shadow-[0_12px_30px_-24px_rgba(39,27,18,0.28)]',
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        className="peer sr-only"
        {...props}
      />
      <span className="relative h-5 w-9 rounded-full bg-muted transition duration-200 peer-checked:bg-primary/90">
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition duration-200 peer-checked:translate-x-4 dark:bg-background" />
      </span>
      <span className="text-sm font-medium text-foreground">
        {props['aria-label']}
      </span>
    </label>
  )
})

Switch.displayName = 'Switch'

export { Switch }
