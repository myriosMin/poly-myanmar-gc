import { Link } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const primaryLinks = [
  { to: '/profiles', label: 'Profiles' },
  { to: '/events', label: 'Events' },
  { to: '/resources', label: 'Resources' },
  { to: '/collab', label: 'Collab' },
]

const legalLinks = [
  { to: '/legal/privacy', label: 'Privacy' },
  { to: '/legal/terms', label: 'Terms & Conditions' },
  { to: '/legal/guidelines', label: 'Guidelines' },
  { to: '/legal/deletion', label: 'Data Deletion' },
]

const mobileLinks = [
  { to: '/legal/privacy', label: 'Privacy' },
  { to: '/legal/terms', label: 'Terms' },
  { to: '/legal/guidelines', label: 'Guidelines' },
]

const externalLinks = [
  { href: 'https://www.facebook.com/share/g/1Aq9w2bpfh/', label: 'Facebook' },
  {
    href: 'https://m.me/cm/AbbjLB5qe9-2wAm3/?send_source=cm%3Acopy_invite_link',
    label: 'Messenger',
  },
  { href: 'https://github.com/myriosMin/poly-myanmar-gc', label: 'GitHub' },
]

function FooterLinkGroup({
  links,
  className,
}: {
  links: Array<{ to: string; label: string }>
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground', className)}>
      {links.map((item) => (
        <Link key={item.to} to={item.to} className="transition hover:text-foreground">
          {item.label}
        </Link>
      ))}
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-10 w-full max-w-[1380px]">
      <div className="surface-panel bg-card/90 p-5 md:p-6">
        <div className="flex flex-col gap-6 md:gap-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="space-y-2">
              <p className="font-display text-2xl font-semibold tracking-[-0.03em]">Poly Myanmar</p>
              <p className="text-sm text-muted-foreground">Together we fly.</p>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Connect with us on Socials!
              </p>
            </div>

            <div className="hidden max-w-[460px] justify-end gap-x-4 gap-y-2 text-sm text-muted-foreground sm:flex sm:flex-wrap">
              {externalLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-3 sm:hidden">
            <FooterLinkGroup links={mobileLinks} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {externalLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <Separator className="bg-border/70" />

          <div className="hidden grid-cols-2 gap-4 text-sm sm:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="space-y-2">
              <p className="section-kicker">Navigate</p>
              <FooterLinkGroup links={primaryLinks} />
            </div>
            <div className="space-y-2 md:text-right">
              <p className="section-kicker">Legal & Policy</p>
              <FooterLinkGroup links={legalLinks} className="justify-start md:justify-end" />
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Poly Myanmar. MIT licensed open source project.</p>
            <p>PDPA-aware community operations. Not affiliated with any Singapore government agency.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}