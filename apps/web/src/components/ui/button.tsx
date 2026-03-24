/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_16px_40px_-20px_hsla(var(--shadow-color),0.5)] hover:-translate-y-0.5 hover:opacity-95',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[0_12px_30px_-20px_hsla(var(--shadow-color),0.35)] hover:-translate-y-0.5 hover:brightness-[0.98]',
        outline:
          'border border-border/70 bg-background/75 text-foreground hover:-translate-y-0.5 hover:bg-muted/70',
        ghost: 'text-foreground/80 hover:bg-muted/80 hover:text-foreground',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[0_16px_40px_-20px_rgba(190,52,52,0.45)] hover:-translate-y-0.5 hover:opacity-95',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 px-3.5 text-xs',
        lg: 'h-12 px-6 text-sm',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
