import type { ReactNode } from 'react'
import { ThemeProvider } from '@/app/theme'
import { AppProviders as QueryAppProviders } from '@/lib/query'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryAppProviders>{children}</QueryAppProviders>
    </ThemeProvider>
  )
}
