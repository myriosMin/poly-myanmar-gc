import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

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
    <Card className="card-float border-dashed border-border/70 bg-card/80 shadow-none">
      <CardContent className="flex flex-col items-start gap-5 p-8">
        {icon}
        <div className="space-y-2">
          <p className="section-kicker">Nothing yet</p>
          <p className="font-display text-2xl font-semibold">{title}</p>
          <p className="max-w-lg text-sm text-muted-foreground">{description}</p>
        </div>
        {actionLabel && onAction ? (
          <Button onClick={onAction} variant="outline">
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
