import * as React from 'react'
import { cn } from '@/lib/utils'

const Switch = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-3 rounded-full border border-border bg-background px-3 py-2 text-sm',
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        className="peer sr-only"
        {...props}
      />
      <span className="h-5 w-9 rounded-full bg-muted transition peer-checked:bg-primary" />
      <span className="text-sm font-semibold text-foreground">
        {props.checked ? props['aria-label'] : props['aria-label']}
      </span>
    </label>
  )
})

Switch.displayName = 'Switch'

export { Switch }
