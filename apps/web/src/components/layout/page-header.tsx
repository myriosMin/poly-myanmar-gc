import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        'page-reveal page-stack grid border-b border-border/50 pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end',
        className,
      )}
    >
      <div className="max-w-3xl">
        <p className="section-kicker">{eyebrow}</p>
        <h1 className="page-title mt-4 max-w-2xl">{title}</h1>
        <p className="body-copy mt-3 max-w-xl">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
    </section>
  )
}
