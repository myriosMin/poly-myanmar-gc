import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ReactNode } from 'react'

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
    <Card className="border-dashed border-border/80 bg-white/70 shadow-none">
      <CardContent className="flex flex-col items-start gap-4 p-6">
        {icon}
        <div>
          <p className="font-display text-lg font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
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
