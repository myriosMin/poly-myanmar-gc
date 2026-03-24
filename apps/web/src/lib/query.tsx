/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import type { Session } from '@/lib/domain'
import { mockApi } from '@/lib/mock-api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export function useSessionQuery() {
  return useQuery<Session>({
    queryKey: ['session'],
    queryFn: () => mockApi.getSession(),
  })
}
