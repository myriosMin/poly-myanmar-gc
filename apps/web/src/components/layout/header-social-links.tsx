import { useTheme } from '@/app/theme'

export function HeaderSocialLinks() {
  const { theme } = useTheme()

  return (
    <div className="inline-flex items-center gap-2">
      <a
        href="https://www.facebook.com/share/g/1Aq9w2bpfh/"
        target="_blank"
        rel="noreferrer"
        aria-label="Open Facebook group"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/80 transition hover:-translate-y-0.5 hover:bg-muted/70"
      >
        <img src={theme === 'dark' ? '/Facebook_dark.svg' : '/Facebook.svg'} alt="Facebook" className="h-4 w-4" />
      </a>
      <a
        href="https://m.me/cm/AbbjLB5qe9-2wAm3/?send_source=cm%3Acopy_invite_link"
        target="_blank"
        rel="noreferrer"
        aria-label="Open Messenger invite"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/80 transition hover:-translate-y-0.5 hover:bg-muted/70"
      >
        <img
          src={theme === 'dark' ? '/Messenger_dark.svg' : '/Messenger.svg'}
          alt="Messenger"
          className="h-4 w-4"
        />
      </a>
    </div>
  )
}