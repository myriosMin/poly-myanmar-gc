import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  CalendarDays,
  FileText,
  Menu,
  Moon,
  Settings2,
  Sparkles,
  SunMedium,
  Users,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SiteFooter } from '@/components/layout/site-footer'
import { useTheme } from '@/app/theme'
import { cn } from '@/lib/utils'

const privateNav = [
  { to: '/profiles', label: 'Profiles', icon: Users },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/resources', label: 'Resources', icon: FileText },
  { to: '/collab', label: 'Collab', icon: Sparkles },
]

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className="shrink-0"
    >
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
    </Button>
  )
}

function DesktopNav() {
  const location = useLocation()
  const navRef = useRef<HTMLDivElement | null>(null)
  const [pillStyle, setPillStyle] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    const updatePill = () => {
      const activeItem = navRef.current?.querySelector<HTMLElement>('[data-active="true"]')
      if (!navRef.current) {
        return
      }

      if (!activeItem) {
        setPillStyle({
          width: '0px',
          opacity: 0,
        })
        return
      }

      const containerRect = navRef.current.getBoundingClientRect()
      const itemRect = activeItem.getBoundingClientRect()

      setPillStyle({
        left: `${itemRect.left - containerRect.left}px`,
        width: `${itemRect.width}px`,
        opacity: 1,
      })
    }

    updatePill()
    window.addEventListener('resize', updatePill)
    return () => window.removeEventListener('resize', updatePill)
  }, [location.pathname])

  return (
    <nav className="hidden min-w-0 flex-1 justify-center lg:flex">
      <div
        ref={navRef}
        className="relative flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border/70 bg-background/72 p-1 shadow-[0_20px_50px_-34px_hsla(var(--shadow-color),0.42)]"
      >
        <div
          className="pointer-events-none absolute inset-y-1 rounded-full border border-primary/10 bg-primary shadow-[0_18px_36px_-22px_hsla(var(--shadow-color),0.55)] transition-all duration-300 ease-out"
          style={pillStyle}
        />
        {privateNav.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.to
          return (
            <NavLink
              key={item.to}
              to={item.to}
              data-active={isActive ? 'true' : 'false'}
              className={cn(
                'relative z-10 inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition duration-200',
                isActive
                  ? 'text-white! [&_*]:text-white!'
                  : 'text-foreground/72 hover:bg-muted/80 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

function MobileMenu({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  if (!open) {
    return null
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border/60 pt-3 lg:hidden">
      <nav className="grid gap-2">
        {privateNav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center justify-between rounded-[1.2rem] border border-border/60 bg-background/70 px-4 py-3 text-sm font-medium transition duration-200',
                  isActive
                    ? 'border-primary/20 bg-primary text-white! [&_*]:text-white!'
                    : 'text-foreground/80 hover:bg-muted/80 hover:text-foreground',
                )
              }
            >
              <span className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
            </NavLink>
          )
        })}
      </nav>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button asChild variant="outline" className="flex-1 justify-center">
          <NavLink to="/settings" onClick={onClose}>
            <Settings2 className="h-4 w-4" />
            Settings
          </NavLink>
        </Button>
      </div>
    </div>
  )
}

export function AppShell() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const pageTheme =
    location.pathname === '/events'
      ? 'events'
      : location.pathname === '/resources'
        ? 'resources'
        : location.pathname === '/collab'
          ? 'collab'
          : location.pathname === '/settings'
            ? 'settings'
            : 'profiles'

  useEffect(() => {
    document.documentElement.dataset.pageTheme = pageTheme
  }, [pageTheme])

  return (
    <div className="min-h-screen app-shell-background text-foreground">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 h-28">
        <div className="h-full bg-background/55 backdrop-blur-md [mask-image:linear-gradient(180deg,rgba(0,0,0,0.92),rgba(0,0,0,0.58),transparent)]" />
      </div>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="editorial-grid absolute inset-x-0 top-0 h-72 opacity-60" />
        <div className="shell-glow-left absolute left-[-6rem] top-[-8rem] h-64 w-64 rounded-full blur-3xl" />
        <div className="shell-glow-right absolute right-[-4rem] top-24 h-64 w-64 rounded-full blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-3 pb-8 pt-3 sm:px-4 sm:pb-10 sm:pt-4 md:px-6">
        <header className="surface-blur sticky top-3 z-30 rounded-[1.4rem] px-3 py-3 sm:top-4 sm:rounded-[2rem] sm:px-4 sm:py-4 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 shrink-0">
              <p className="section-kicker">Graduate club</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <NavLink to="/profiles" className="block font-display text-[1.45rem] font-semibold leading-none sm:text-[2rem]">
                  Poly Myanmar
                </NavLink>
                <span className="hidden h-5 w-px bg-border/70 xl:block" />
                <p className="hidden text-sm text-muted-foreground xl:block">Let&apos;s keep in touch!</p>
              </div>
            </div>

            <DesktopNav />

            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              <ThemeToggle />
              <Button asChild size="icon" variant="outline" aria-label="Settings">
                <NavLink to="/settings">
                  <Settings2 className="h-4 w-4" />
                </NavLink>
              </Button>
            </div>

            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="lg:hidden"
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        </header>

        <main className="mx-auto w-full max-w-[1380px] flex-1 px-0 pt-6 sm:pt-8">
          <Outlet />
        </main>

        <SiteFooter />
      </div>
    </div>
  )
}

export function PublicShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.pageTheme = 'public'

    return () => {
      delete document.documentElement.dataset.pageTheme
    }
  }, [])

  return (
    <div className="min-h-screen app-shell-background text-foreground">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 h-28">
        <div className="h-full bg-background/55 backdrop-blur-md [mask-image:linear-gradient(180deg,rgba(0,0,0,0.92),rgba(0,0,0,0.58),transparent)]" />
      </div>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="editorial-grid absolute inset-x-0 top-0 h-96 opacity-70" />
        <div className="shell-glow-left absolute left-[-6rem] top-[-8rem] h-64 w-64 rounded-full blur-3xl" />
        <div className="shell-glow-right absolute right-[-4rem] top-24 h-64 w-64 rounded-full blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-[1480px] flex-col px-3 py-3 sm:px-4 sm:py-4 md:px-6">
        <header className="surface-blur sticky top-3 z-20 rounded-[1.4rem] px-3 py-3 sm:top-4 sm:rounded-[2rem] sm:px-4 sm:py-4 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Graduate Club</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="font-display text-2xl font-semibold sm:text-3xl">Poly Myanmar</p>
                <Badge variant="outline">Private access</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button asChild variant="outline">
                <NavLink to="/legal/privacy">Privacy</NavLink>
              </Button>
            </div>
          </div>
        </header>
        <div className="flex-1 pt-8">{children}</div>
        <SiteFooter />
      </div>
    </div>
  )
}
