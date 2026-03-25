import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="surface-panel card-float flex flex-col items-start gap-5 border-dashed border-border/70 bg-card/80 p-8 shadow-none">
        {icon}
        <div className="space-y-2">
          <p className="section-kicker">Nothing yet</p>
          <p className="section-title">{title}</p>
          <p className="body-copy max-w-lg">{description}</p>
        </div>
        {actionLabel && onAction ? (
          <Button onClick={onAction} variant="outline">
            {actionLabel}
          </Button>
        ) : null}
    </div>
  )
}
