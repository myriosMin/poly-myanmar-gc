import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Filter,
  Globe,
  RefreshCw,
  Search,
  UsersRound,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/app/theme'
import { EmptyState } from '@/components/layout/empty-state'
import { HeaderSocialLinks } from '@/components/layout/header-social-links'
import { PageHeader } from '@/components/layout/page-header'
import { api } from '@/lib/api'
import {
  alwaysPublicProfileFields,
  defaultPublicProfileFields,
  type ProfileFilters,
  type PublicProfileField,
} from '@/lib/domain'
import { useSessionQuery } from '@/lib/query'
import { formatDate } from '@/lib/utils'

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
  visibleFields,
  onClose,
}: {
  profile: Awaited<ReturnType<typeof api.getProfiles>>['items'][number]
  visibleFields: PublicProfileField[]
  onClose: () => void
}) {
  const { theme } = useTheme()
  const canShow = (field: PublicProfileField) => visibleFields.includes(field)

  const socialLinks = [
    {
      label: 'LinkedIn',
      href: profile.linkedinUrl,
      iconSrc: theme === 'dark' ? '/LinkedIn_dark.png' : '/LinkedIn.png',
      iconAlt: 'LinkedIn',
    },
    canShow('githubUrl') && profile.githubUrl
      ? {
          label: 'GitHub',
          href: profile.githubUrl,
          iconSrc: theme === 'dark' ? '/GitHub_dark.svg' : '/GitHub.svg',
          iconAlt: 'GitHub',
        }
      : null,
    canShow('portfolioUrl') && profile.portfolioUrl
      ? {
          label: 'Portfolio',
          href: profile.portfolioUrl,
          icon: Globe,
          iconAlt: 'Portfolio',
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string
    href: string
    iconAlt: string
    icon?: typeof Globe
    iconSrc?: string
  }>

  const statuses = [
    profile.statusBadge,
    ...(canShow('jobSeeking') && profile.jobSeeking ? ['job seeking'] : []),
    ...(profile.openToCollab ? ['open to collab'] : []),
  ]

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

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-3 pb-4 pt-0 sm:px-4 md:px-0 md:pb-8">
        <div className="surface-blur flex items-center justify-between rounded-b-[2rem] rounded-t-none px-4 py-4 md:px-6">
          <div>
            <p className="section-kicker">Member profile</p>
            <p className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{profile.name}</p>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 grid flex-1 gap-6 px-4 md:px-6 lg:grid-cols-[minmax(240px,25%)_minmax(0,1fr)]">
          <aside className="surface-panel h-fit rounded-[2rem] p-6 md:p-7 lg:sticky lg:top-24">
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="mx-auto h-32 w-32 rounded-full border border-border/60 object-cover sm:h-40 sm:w-40 md:h-48 md:w-48"
            />
            <div className="mt-5">
              <h2 className="font-display text-3xl font-semibold leading-none sm:text-4xl">{profile.name}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{profile.polytechnic}</p>
              <p className="mt-1 text-sm text-muted-foreground">{profile.course}</p>
            </div>

            <div className="soft-divider mt-6 pt-6 text-sm">
              <div className="flex items-center justify-between gap-4 py-2">
                <span className="text-muted-foreground">Class of</span>
                <span className="font-medium text-foreground">{profile.graduationYear}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <span className="text-muted-foreground">Joined on</span>
                <span className="font-medium text-foreground">{formatDate(profile.joinedAt)}</span>
              </div>
              {canShow('email') ? (
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-muted-foreground">Email</span>
                  <span className="truncate text-right font-medium text-foreground">
                    {profile.gmail}
                  </span>
                </div>
              ) : null}
            </div>
          </aside>

          <div className="space-y-4">
            <section className="surface-panel rounded-[2rem] p-6 md:p-7">
              <p className="section-kicker">Socials</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {socialLinks.map((item) => {
                  return (
                    <Button key={item.label} asChild variant="outline" size="sm">
                      <a href={item.href} target="_blank" rel="noreferrer">
                        {item.iconSrc ? (
                          <img src={item.iconSrc} alt={item.iconAlt} className="h-4 w-4" />
                        ) : item.icon ? (
                          <item.icon className="h-4 w-4" />
                        ) : null}
                        {item.label}
                      </a>
                    </Button>
                  )
                })}
              </div>
            </section>

            <section className="surface-panel rounded-[2rem] p-6 md:p-7">
              <p className="section-kicker">Status</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <Badge key={status} variant="secondary">
                    {status}
                  </Badge>
                ))}
              </div>
            </section>

            <section className="surface-panel rounded-[2rem] p-6 md:p-7">
              <p className="section-kicker">About</p>
              <p className="mt-4 max-w-3xl text-sm text-foreground">{profile.bio}</p>
            </section>

            {canShow('skills') || canShow('hobbies') ? (
              <section className="grid gap-4 xl:grid-cols-2">
                {canShow('skills') ? (
                  <div className="surface-panel rounded-[2rem] p-6 md:p-7">
                    <p className="section-kicker">Skills</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.skills.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {canShow('hobbies') ? (
                  <div className="surface-panel rounded-[2rem] p-6 md:p-7">
                    <p className="section-kicker">Hobbies</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile.hobbies.map((hobby) => (
                        <Badge key={hobby} variant="outline">
                          {hobby}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="surface-panel rounded-[2rem] p-6 md:p-7">
              <p className="section-kicker">Activity</p>
              <p className="mt-4 text-sm text-muted-foreground">
                Event and collaboration history is not available in the current API response.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function ProfilesPage() {
  const { theme } = useTheme()
  const { data: session } = useSessionQuery()
  const isReviewer = session?.role === 'reviewer' || session?.role === 'superadmin'
  const isSuperadmin = session?.role === 'superadmin'
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
    queryKey: ['profiles-directory'],
    queryFn: () => api.getDirectory(),
    staleTime: 5 * 60 * 1000, // 5 minutes - aggressive caching for client-side filtering
  })

  const reviewerApprovalsQuery = useQuery({
    queryKey: ['reviewer-approvals'],
    queryFn: () => api.getPendingApprovals(),
    enabled: isReviewer,
  })

  const adminProfilesQuery = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: () => api.getAdminProfiles(),
    enabled: isSuperadmin,
  })

  const reviewApprovalMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      action === 'approve' ? api.approveUserApplication(id) : api.rejectUserApplication(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reviewer-approvals'] })
      await queryClient.invalidateQueries({ queryKey: ['profiles-directory'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-profiles'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-queue'] })
    },
  })

  const banMutation = useMutation({
    mutationFn: (userId: string) => api.banUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profiles-directory'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-profiles'] })
      await queryClient.invalidateQueries({ queryKey: ['reviewer-approvals'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-queue'] })
    },
  })

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => api.unbanUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profiles-directory'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-profiles'] })
      await queryClient.invalidateQueries({ queryKey: ['reviewer-approvals'] })
      await queryClient.invalidateQueries({ queryKey: ['admin-queue'] })
    },
  })

  // Apply filters client-side to the cached data
  const filteredProfilesData = useMemo(() => {
    if (!profilesQuery.data) return null

    const allProfiles = profilesQuery.data.items

    // Apply client-side filtering
    const filtered = allProfiles.filter((profile) => {
      // Search filter
      if (filters.search.trim()) {
        const searchLower = filters.search.toLowerCase()
        if (!profile.name.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Polytechnic filter
      if (filters.polytechnic && profile.polytechnic !== filters.polytechnic) {
        return false
      }

      // Course filter
      if (filters.course.trim() && profile.course.toLowerCase() !== filters.course.toLowerCase()) {
        return false
      }

      // Graduation year filter
      if (filters.graduationYear.trim() && profile.graduationYear !== parseInt(filters.graduationYear)) {
        return false
      }

      // Status filter
      if (filters.status && profile.statusBadge !== filters.status) {
        return false
      }

      // Availability filters
      if (filters.openToCollab && !profile.openToCollab) {
        return false
      }

      if (filters.jobSeeking && !profile.jobSeeking) {
        return false
      }

      return true
    })

    // Calculate counts from filtered results
    const polytechnicCounts = new Map<string, number>()
    const statusCounts = new Map<string, number>()

    filtered.forEach((profile) => {
      polytechnicCounts.set(profile.polytechnic, (polytechnicCounts.get(profile.polytechnic) ?? 0) + 1)
      statusCounts.set(profile.statusBadge, (statusCounts.get(profile.statusBadge) ?? 0) + 1)
    })

    return {
      items: filtered,
      total: filtered.length,
      counts: {
        polytechnics: profilesQuery.data.counts.polytechnics.map((p) => ({
          value: p.value,
          count: polytechnicCounts.get(p.value) ?? 0,
        })),
        statuses: profilesQuery.data.counts.statuses.map((s) => ({
          value: s.value,
          count: statusCounts.get(s.value) ?? 0,
        })),
      },
    }
  }, [profilesQuery.data, filters])

  const selectedProfileFromList =
    filteredProfilesData?.items.find((profile) => profile.id === selectedProfileId) ?? null

  const selectedProfileQuery = useQuery({
    queryKey: ['profile', selectedProfileId],
    queryFn: () => (selectedProfileId ? api.getProfileById(selectedProfileId) : null),
    enabled: Boolean(selectedProfileId),
  })

  const selectedProfile = selectedProfileQuery.data ?? selectedProfileFromList
  const selectedProfileVisibleFields = useMemo<PublicProfileField[]>(() => {
    const baseline = defaultPublicProfileFields
    if (!selectedProfile || !session) {
      return baseline
    }

    if (selectedProfile.id === session.id) {
      return Array.from(new Set<PublicProfileField>([...alwaysPublicProfileFields, ...session.publicFields]))
    }

    return baseline
  }, [selectedProfile, session])

  const resetFilters = () => {
    setSearchDraft('')
    setFilters(defaultFilters)
  }

  const refreshDirectory = async () => {
    await queryClient.invalidateQueries({ queryKey: ['profiles-directory'] })
  }

  const sidebar = (
    <div className="sticky-rail">
      <div className="surface-panel overflow-hidden p-0">
        <div className="border-b border-border/55 px-6 py-5">
          <p className="section-kicker">Who are you looking for?</p>
          <p className="section-title mt-2 !text-[2rem]">Filter by</p>
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
                <span>{filteredProfilesData?.total ?? 0}</span>
              </button>
              {filteredProfilesData?.counts.polytechnics.map((item) => (
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
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => setFilters((current) => ({ ...current, status: '' }))}
                className="flex w-full items-center justify-between text-left text-sm text-muted-foreground transition hover:text-foreground"
              >
                <span className="inline-flex items-center gap-3">
                  <span
                    className={`h-4 w-4 rounded border ${filters.status === '' ? 'border-primary bg-primary' : 'border-border bg-background'}`}
                  />
                  Any status
                </span>
                <span>{filteredProfilesData?.total ?? 0}</span>
              </button>
              {filteredProfilesData?.counts.statuses.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      status: current.status === item.value ? '' : item.value,
                    }))
                  }
                  className="flex w-full items-center justify-between text-left text-sm text-muted-foreground transition hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-3">
                    <span
                      className={`h-4 w-4 rounded border ${filters.status === item.value ? 'border-primary bg-primary' : 'border-border bg-background'}`}
                    />
                    {item.value}
                  </span>
                  <span>{item.count}</span>
                </button>
              ))}
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

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 justify-center" onClick={resetFilters}>
                Reset filters
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => void refreshDirectory()}
                disabled={profilesQuery.isFetching}
                title="Refresh directory cache"
              >
                <RefreshCw className={`h-4 w-4 ${profilesQuery.isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Profiles"
        title="Meet the right member without wading through noise."
        description="Start from name, school, course, job-seeking status, and LinkedIn. Open a profile only when you want more context."
        actions={
          <>
            <HeaderSocialLinks />
            <Badge variant="outline" className="h-10 px-3 text-xs normal-case tracking-[0.1em] sm:h-11 sm:px-4 sm:text-sm sm:tracking-[0.14em]">
              <UsersRound className="mr-1 h-3.5 w-3.5" />
              {filteredProfilesData?.total ?? 0} members
            </Badge>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-3 text-xs sm:h-11 sm:px-4 sm:text-sm lg:hidden"
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
          {isReviewer ? (
            <div className="content-row bg-card/84">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="section-kicker">Reviewer controls</p>
                  <p className="section-title mt-2">Pending user applications</p>
                </div>
                <Badge variant="outline">{reviewerApprovalsQuery.data?.length ?? 0}</Badge>
              </div>

              <div className="mt-4 space-y-3">
                {(reviewerApprovalsQuery.data ?? []).length ? (
                  reviewerApprovalsQuery.data?.map((approval) => (
                    <div key={approval.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{String(approval.submitted_payload.username ?? approval.user_id)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{String(approval.submitted_payload.email ?? 'No email')}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => reviewApprovalMutation.mutate({ id: approval.id, action: 'approve' })}
                            disabled={reviewApprovalMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reviewApprovalMutation.mutate({ id: approval.id, action: 'reject' })}
                            disabled={reviewApprovalMutation.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No pending applications right now.</p>
                )}
              </div>
            </div>
          ) : null}

          {isSuperadmin ? (
            <div className="content-row bg-card/84">
              <p className="section-kicker">Superadmin controls</p>
              <p className="section-title mt-2">Banned users</p>
              <div className="mt-4 space-y-3">
                {(adminProfilesQuery.data ?? [])
                  .filter((profile) => profile.approval_status === 'banned')
                  .map((profile) => (
                    <div key={profile.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{profile.username}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => unbanMutation.mutate(profile.id)}
                          disabled={unbanMutation.isPending}
                        >
                          Unban
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}

          {filteredProfilesData?.items.length ? (
            <section className="grid gap-4 xl:grid-cols-2">
              {filteredProfilesData.items.map((profile) => (
                <div
                  key={profile.id}
                  className="text-left focus:outline-hidden"
                >
                  <div className="surface-panel card-float h-full rounded-[2rem] px-5 py-5 md:px-6 md:py-6">
                    <div className="flex h-full flex-col justify-between gap-6">
                      <div className="flex items-start justify-between gap-5">
                        <div className="min-w-0 flex-1">
                          <p className="section-kicker">
                            {profile.polytechnic}
                          </p>
                          <p className="mt-3 truncate font-display text-2xl font-semibold sm:text-3xl">
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

                        <button
                          type="button"
                          className="relative shrink-0"
                          onClick={() => setSelectedProfileId(profile.id)}
                          aria-label={`View ${profile.name} profile`}
                        >
                          <img
                            src={profile.avatarUrl}
                            alt={profile.name}
                            className="h-20 w-20 rounded-full border-[2px] border-border object-cover sm:h-24 sm:w-24 md:h-36 md:w-36"
                          />
                          <ArrowUpRight className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-card text-muted-foreground" />
                        </button>
                      </div>

                      <div className="flex items-end justify-between gap-4">
                        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                          <BriefcaseBusiness className="h-4 w-4 text-primary" />
                          {profile.jobSeeking ? 'OPEN TO WORK' : 'SETTLED'}
                        </div>
                        <div className="flex items-center gap-2">
                          {isSuperadmin ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                banMutation.mutate(profile.id)
                              }}
                              disabled={banMutation.isPending}
                            >
                              Ban
                            </Button>
                          ) : null}
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="px-0 text-sm text-foreground hover:bg-transparent"
                          >
                            <a href={profile.linkedinUrl} target="_blank" rel="noreferrer">
                              <img
                                src={theme === 'dark' ? '/LinkedIn_dark.png' : '/LinkedIn.png'}
                                alt="LinkedIn"
                                className="h-4 w-4"
                              />
                              LinkedIn
                            </a>
                          </Button>
                        </div>
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
              <div className="relative inset-x-0 mx-3 mb-3 mt-0 sm:mx-4 sm:mb-4">
                <div className="surface-panel rounded-t-none rounded-b-[2rem] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="section-kicker">Filters</p>
                      <p className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Discovery panel</p>
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
        <ProfileOverlay
          profile={selectedProfile}
          visibleFields={selectedProfileVisibleFields}
          onClose={() => setSelectedProfileId(null)}
        />
      ) : null}
    </div>
  )
}
