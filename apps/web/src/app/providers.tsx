import type { ReactNode } from 'react'
import { AppProviders as QueryAppProviders } from '@/lib/query'

export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryAppProviders>{children}</QueryAppProviders>
}
