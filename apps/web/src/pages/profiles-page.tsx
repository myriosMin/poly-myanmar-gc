import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Filter,
  Linkedin,
  Search,
  UsersRound,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/layout/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { mockApi } from '@/lib/mock-api'
import { studentStatuses, type ProfileFilters } from '@/lib/domain'

const defaultFilters: ProfileFilters = {
  polytechnic: '',
  course: '',
  graduationYear: '',
  status: '',
  openToCollab: false,
  jobSeeking: false,
  search: '',
}

function DiscoveryBadge({ label, active }: { label: string; active?: boolean }) {
  return <Badge variant={active ? 'secondary' : 'outline'}>{label}</Badge>
}

function ProfilePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-xs font-medium capitalize text-primary-foreground">
      {label}
    </span>
  )
}

function ProfileOverlay({
  profile,
  onClose,
}: {
  profile: Awaited<ReturnType<typeof mockApi.getProfiles>>['items'][number]
  onClose: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background/88 backdrop-blur-2xl">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close member profile"
        onClick={onClose}
      />

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-0 pb-6 pt-0 md:px-0 md:pb-8 md:pt-0">
        <div className="surface-blur flex items-center justify-between rounded-b-[2rem] rounded-t-none px-4 py-4 md:px-6">
          <div>
            <p className="section-kicker">Member profile</p>
            <p className="mt-2 font-display text-3xl font-semibold">{profile.name}</p>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 grid flex-1 gap-6 px-4 md:px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="surface-panel rounded-[2rem] p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-5">
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-28 w-24 rounded-[1.5rem] object-cover md:h-36 md:w-28"
                />
                <div>
                  <p className="section-kicker">{profile.polytechnic}</p>
                  <h2 className="mt-3 font-display text-5xl font-semibold">{profile.name}</h2>
                  <p className="mt-4 max-w-2xl text-base text-muted-foreground">
                    {profile.course} • Class of {profile.graduationYear}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">{profile.statusBadge}</Badge>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {profile.openToCollab ? <Badge variant="secondary">Open to collab</Badge> : null}
              {profile.jobSeeking ? <Badge variant="secondary">Job seeking</Badge> : null}
              {profile.badges.map((badge) => (
                <Badge key={badge} variant="outline">
                  {badge}
                </Badge>
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.7rem] bg-muted/62 p-5">
                <p className="section-kicker">What they do</p>
                <p className="mt-3 text-sm text-foreground">{profile.skills.join(' • ')}</p>
              </div>
              <div className="rounded-[1.7rem] bg-muted/62 p-5">
                <p className="section-kicker">Beyond class</p>
                <p className="mt-3 text-sm text-foreground">{profile.hobbies.join(' • ')}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.7rem] border border-border/60 bg-background/74 p-5">
                <p className="section-kicker">Availability</p>
                <p className="mt-3 font-medium">
                  {profile.openToCollab ? 'Open to projects' : 'Keeping things light for now'}
                </p>
              </div>
              <div className="rounded-[1.7rem] border border-border/60 bg-background/74 p-5">
                <p className="section-kicker">Career</p>
                <p className="mt-3 font-medium">
                  {profile.jobSeeking ? 'Exploring opportunities' : 'Not actively searching'}
                </p>
              </div>
              <div className="rounded-[1.7rem] border border-border/60 bg-background/74 p-5">
                <p className="section-kicker">Events</p>
                <p className="mt-3 font-medium">
                  {profile.attendingEvents ? 'Usually active at events' : 'Less event-focused'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="surface-panel rounded-[2rem] bg-primary p-8 text-primary-foreground">
              <p className="section-kicker text-primary-foreground/70">Reach out</p>
              <p className="mt-3 font-display text-3xl font-semibold">
                Start with context, not a cold ask.
              </p>
              <p className="mt-3 text-sm text-primary-foreground/82">
                Mention the event, role, or project you have in mind so the conversation starts
                naturally.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="secondary">
                  <a href={profile.linkedinUrl} target="_blank" rel="noreferrer">
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
                </Button>
                {profile.githubUrl ? (
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/25 bg-white/10 text-white hover:bg-white/15"
                  >
                    <a href={profile.githubUrl} target="_blank" rel="noreferrer">
                      GitHub
                    </a>
                  </Button>
                ) : null}
                {profile.portfolioUrl ? (
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/25 bg-white/10 text-white hover:bg-white/15"
                  >
                    <a href={profile.portfolioUrl} target="_blank" rel="noreferrer">
                      Portfolio
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="surface-panel rounded-[2rem] p-8">
              <p className="section-kicker">Private member details</p>
              <div className="mt-5 space-y-4 text-sm text-muted-foreground">
                <div>
                  <p className="text-foreground">Email</p>
                  <p>{profile.gmail}</p>
                </div>
                <div>
                  <p className="text-foreground">LinkedIn</p>
                  <p>{profile.linkedinUrl}</p>
                </div>
                {profile.portfolioUrl ? (
                  <div>
                    <p className="text-foreground">Portfolio</p>
                    <p>{profile.portfolioUrl}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function ProfilesPage() {
  const [filters, setFilters] = useState<ProfileFilters>(defaultFilters)
  const [searchDraft, setSearchDraft] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchDraft }))
    }, 220)

    return () => window.clearTimeout(timer)
  }, [searchDraft])

  useEffect(() => {
    if (!isResizing) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = Math.min(Math.max(event.clientX - 24, 220), 420)
      setSidebarWidth(nextWidth)
    }

    const handlePointerUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isResizing])

  const profilesQuery = useQuery({
    queryKey: ['profiles', filters],
    queryFn: () => mockApi.getProfiles(filters),
  })

  const selectedProfile =
    profilesQuery.data?.items.find((profile) => profile.id === selectedProfileId) ?? null

  const resetFilters = () => {
    setSearchDraft('')
    setFilters(defaultFilters)
    void queryClient.invalidateQueries({ queryKey: ['profiles'] })
  }

  const sidebar = (
    <div className="lg:sticky lg:top-28">
      <div className="surface-panel overflow-hidden rounded-[2rem] p-0">
        <div className="border-b border-border/55 px-6 py-5">
          <p className="section-kicker">Who are you looking for?</p>
          <p className="mt-2 font-display text-2xl font-semibold">Filter by</p>
        </div>

        <div className="space-y-0">
          <div className="border-b border-border/55 px-6 py-5">
            <p className="text-lg font-semibold text-foreground">Search</p>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Name or skill"
                className="pl-11"
              />
            </div>
          </div>

          <div className="border-b border-border/55 px-6 py-5">
            <p className="text-lg font-semibold text-foreground">Polytechnic</p>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => setFilters((current) => ({ ...current, polytechnic: '' }))}
                className="flex w-full items-center justify-between text-left text-sm text-muted-foreground transition hover:text-foreground"
              >
                <span className="inline-flex items-center gap-3">
                  <span
                    className={`h-4 w-4 rounded border ${filters.polytechnic === '' ? 'border-primary bg-primary' : 'border-border bg-background'}`}
                  />
                  All polytechnics
                </span>
                <span>{profilesQuery.data?.total ?? 0}</span>
              </button>
              {profilesQuery.data?.counts.polytechnics.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      polytechnic: current.polytechnic === item.value ? '' : item.value,
                    }))
                  }
                  className="flex w-full items-center justify-between text-left text-sm text-muted-foreground transition hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-3">
                    <span
                      className={`h-4 w-4 rounded border ${filters.polytechnic === item.value ? 'border-primary bg-primary' : 'border-border bg-background'}`}
                    />
                    {item.value}
                  </span>
                  <span>{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-border/55 px-6 py-5">
            <p className="text-lg font-semibold text-foreground">Status</p>
            <div className="mt-4">
              <Select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="">Any status</option>
                {studentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="border-b border-border/55 px-6 py-5">
            <p className="text-lg font-semibold text-foreground">Availability</p>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    openToCollab: !current.openToCollab,
                  }))
                }
                className="flex w-full items-center justify-between text-left text-sm text-muted-foreground transition hover:text-foreground"
              >
                <span className="inline-flex items-center gap-3">
                  <span
                    className={`h-4 w-4 rounded border ${filters.openToCollab ? 'border-primary bg-primary' : 'border-border bg-background'}`}
                  />
                  Open to collab
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    jobSeeking: !current.jobSeeking,
                  }))
                }
                className="flex w-full items-center justify-between text-left text-sm text-muted-foreground transition hover:text-foreground"
              >
                <span className="inline-flex items-center gap-3">
                  <span
                    className={`h-4 w-4 rounded border ${filters.jobSeeking ? 'border-primary bg-primary' : 'border-border bg-background'}`}
                  />
                  Job seeking
                </span>
              </button>
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="text-lg font-semibold text-foreground">Active filters</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <DiscoveryBadge label="LinkedIn-led trust" active />
              {filters.openToCollab ? <DiscoveryBadge label="Open to collab" active /> : null}
              {filters.jobSeeking ? <DiscoveryBadge label="Job seeking" active /> : null}
              {filters.polytechnic ? (
                <DiscoveryBadge label={filters.polytechnic} active />
              ) : null}
              {filters.status ? <DiscoveryBadge label={filters.status} active /> : null}
            </div>

            <Button variant="ghost" className="mt-4 w-full justify-center" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Profiles"
        title="Meet the right member without wading through noise."
        description="Start from name, school, course, job-seeking status, and LinkedIn. Open a profile only when you want more context."
        actions={
          <>
            <Badge variant="outline" className="h-11 px-4 text-sm normal-case tracking-[0.14em]">
              <UsersRound className="mr-1 h-3.5 w-3.5" />
              {profilesQuery.data?.total ?? 0} members
            </Badge>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4 lg:hidden"
              onClick={() => setShowMobileSidebar(true)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </>
        }
      />

      <section
        className="block gap-6 lg:grid"
        style={{
          gridTemplateColumns:
            typeof window === 'undefined'
              ? undefined
              : `minmax(220px, ${sidebarWidth}px) minmax(0, 1fr)`,
        }}
      >
        <div className="relative hidden lg:block">
          <aside>{sidebar}</aside>
          <button
            type="button"
            aria-label="Resize filter panel"
            onPointerDown={() => setIsResizing(true)}
            className="absolute bottom-0 right-[-15px] top-0 z-10 w-5 cursor-col-resize"
          />
        </div>

        <div className="space-y-4">
          {profilesQuery.data?.items.length ? (
            <section className="grid gap-4 xl:grid-cols-2">
              {profilesQuery.data.items.map((profile) => (
                <div
                  key={profile.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedProfileId(profile.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedProfileId(profile.id)
                    }
                  }}
                  className="text-left focus:outline-none"
                >
                  <div className="surface-panel card-float h-full rounded-[2rem] px-5 py-5 md:px-6 md:py-6">
                    <div className="flex h-full flex-col justify-between gap-6">
                      <div className="flex items-start justify-between gap-5">
                        <div className="min-w-0 flex-1">
                          <p className="section-kicker">
                            {profile.polytechnic}
                          </p>
                          <p className="mt-3 truncate font-display text-3xl font-semibold">
                            {profile.name}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {profile.course}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <ProfilePill label={profile.statusBadge} />
                            <ProfilePill label={`Class of ${profile.graduationYear}`} />
                          </div>
                        </div>

                        <div className="relative shrink-0">
                          <img
                            src={profile.avatarUrl}
                            alt={profile.name}
                            className="h-24 w-24 rounded-full border-[2px] border-border object-cover md:h-36 md:w-36"
                          />
                          <ArrowUpRight className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-card text-muted-foreground" />
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-4">
                        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                          <BriefcaseBusiness className="h-4 w-4 text-primary" />
                          {profile.jobSeeking ? 'OPEN TO WORK' : 'SETTLED'}
                        </div>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="px-0 text-sm text-foreground hover:bg-transparent"
                        >
                          <a href={profile.linkedinUrl} target="_blank" rel="noreferrer">
                            <Linkedin className="h-4 w-4" />
                            LinkedIn
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <EmptyState
              title="No members match this search"
              description="Try fewer filters or clear the search to widen the member list."
              actionLabel="Reset filters"
              onAction={resetFilters}
            />
          )}
        </div>
      </section>

      {showMobileSidebar
        ? createPortal(
            <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-background/80 backdrop-blur-xl lg:hidden">
              <button
                type="button"
                className="absolute inset-0"
                aria-label="Close filters"
                onClick={() => setShowMobileSidebar(false)}
              />
              <div className="relative inset-x-0 mx-4 mb-4 mt-0">
                <div className="surface-panel rounded-t-none rounded-b-[2rem] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="section-kicker">Filters</p>
                      <p className="mt-2 font-display text-3xl font-semibold">Discovery panel</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowMobileSidebar(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {sidebar}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {selectedProfile ? (
        <ProfileOverlay profile={selectedProfile} onClose={() => setSelectedProfileId(null)} />
      ) : null}
    </div>
  )
}
