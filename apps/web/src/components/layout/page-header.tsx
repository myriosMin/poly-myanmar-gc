import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <Card className="mb-6 border-border/70 bg-white/85 shadow-none">
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-3">
            {eyebrow}
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            {description}
          </p>
        </div>
        {actions ? <div className={cn('flex flex-wrap gap-2')}>{actions}</div> : null}
      </CardContent>
    </Card>
  )
}
