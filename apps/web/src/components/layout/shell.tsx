import type { ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowUpRight,
  CircleGauge,
  FileText,
  LayoutGrid,
  Megaphone,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useSessionQuery } from '@/lib/query'
import { cn } from '@/lib/utils'

const privateNav = [
  { to: '/profiles', label: 'Profiles', icon: Users },
  { to: '/events', label: 'Events', icon: Megaphone },
  { to: '/resources', label: 'Resources', icon: FileText },
  { to: '/collab', label: 'Collab', icon: Sparkles },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, reviewerOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

export function AppShell() {
  const { data: session } = useSessionQuery()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-shell-gradient text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-10rem] h-72 w-72 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="absolute right-[-4rem] top-24 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-[1700px] flex-col lg:flex-row">
        <aside className="hidden w-80 shrink-0 border-r border-border/70 bg-white/70 px-5 py-6 backdrop-blur xl:flex xl:flex-col">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-xl font-bold tracking-tight">
                Poly Myanmar GC
              </p>
              <p className="text-sm text-muted-foreground">
                private graduate club for SG poly students
              </p>
            </div>
            <Badge variant="secondary">private</Badge>
          </div>
          <Separator className="my-5" />
          <nav className="space-y-2">
            {privateNav.map((item) => {
              if (item.reviewerOnly && session?.role === 'member') {
                return null
              }

              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground/80 hover:bg-muted',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
          <div className="mt-auto space-y-4 pt-6">
            <Card className="border-amber-200/70 bg-amber-50/70 shadow-none">
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">Approval state</CardTitle>
                <CardDescription>
                  Current access is controlled through the mock session adapter.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Badge>{session?.approvalState ?? 'loading'}</Badge>
                <Badge variant="outline">{session?.role ?? 'guest'}</Badge>
              </CardContent>
            </Card>
            <Button asChild className="w-full" variant="outline">
              <a href="https://github.com/myriosMin/poly-myanmar-gc" target="_blank" rel="noreferrer">
                <ArrowUpRight className="h-4 w-4" />
                Open GitHub
              </a>
            </Button>
          </div>
        </aside>
        <div className="flex-1">
          <header className="sticky top-0 z-20 border-b border-border/60 bg-white/75 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-bold tracking-tight">
                    Private member workspace
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Focused on networking, events, resources, and collab.
                  </p>
                </div>
                <div className="flex gap-2 xl:hidden">
                  <Badge variant="secondary">{session?.polytechnic}</Badge>
                  <Badge>{session?.statusBadge}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">route: {location.pathname}</Badge>
                <Badge variant="secondary">{session?.polytechnic}</Badge>
                <Badge>{session?.statusBadge}</Badge>
                <Badge variant="outline">{session?.role}</Badge>
                <Button asChild size="sm" variant="outline">
                  <NavLink to="/pending-approval">
                    <CircleGauge className="h-4 w-4" />
                    Access flow
                  </NavLink>
                </Button>
              </div>
            </div>
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
              {privateNav.map((item) => {
                if (item.reviewerOnly && session?.role === 'member') {
                  return null
                }

                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition',
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-white hover:bg-muted',
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                )
              })}
            </nav>
          </header>
          <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-shell-gradient text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-10rem] h-72 w-72 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="absolute right-[-4rem] top-24 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-display text-2xl font-bold tracking-tight">
              Poly Myanmar GC
            </p>
            <p className="text-sm text-muted-foreground">
              private graduate club for Myanmar polytechnics in Singapore
            </p>
          </div>
          <Button asChild variant="outline">
            <NavLink to="/profiles">
              <LayoutGrid className="h-4 w-4" />
              Member view
            </NavLink>
          </Button>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
