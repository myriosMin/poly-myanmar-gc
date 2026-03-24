import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  Filter,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/layout/empty-state'
import { mockApi } from '@/lib/mock-api'
import { polytechnics, studentStatuses, type ProfileFilters } from '@/lib/domain'

const defaultFilters: ProfileFilters = {
  polytechnic: '',
  course: '',
  graduationYear: '',
  status: '',
  openToCollab: false,
  jobSeeking: false,
  search: '',
}

function ProfileCard({
  profile,
}: {
  profile: Awaited<ReturnType<typeof mockApi.getProfiles>>['items'][number]
}) {
  return (
    <Card className="h-full border-border/70 bg-white/90">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserRound className="h-4 w-4 text-primary" />
              {profile.name}
            </CardTitle>
            <CardDescription>
              {profile.course} · {profile.graduationYear}
            </CardDescription>
          </div>
          <Badge variant="secondary">{profile.polytechnic}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.badges.map((badge) => (
            <Badge key={badge} variant="outline">
              {badge}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Skills: {profile.skills.join(' · ')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge>{profile.openToCollab ? 'open to collab' : 'not collab-ready'}</Badge>
          <Badge variant="outline">
            {profile.jobSeeking ? 'looking for job' : 'not job-seeking'}
          </Badge>
          <Badge variant="outline">
            {profile.attendingEvents ? 'attending events' : 'maybe available'}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={profile.linkedinUrl} target="_blank" rel="noreferrer">
              <ArrowUpRight className="h-4 w-4" />
              LinkedIn
            </a>
          </Button>
          {profile.githubUrl ? (
            <Button asChild size="sm" variant="ghost">
              <a href={profile.githubUrl} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </Button>
          ) : null}
          {profile.portfolioUrl ? (
            <Button asChild size="sm" variant="ghost">
              <a href={profile.portfolioUrl} target="_blank" rel="noreferrer">
                Portfolio
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function ProfilesPage() {
  const [filters, setFilters] = useState<ProfileFilters>(defaultFilters)
  const [searchDraft, setSearchDraft] = useState('')
  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchDraft }))
    }, 250)

    return () => window.clearTimeout(timer)
  }, [searchDraft])

  const profilesQuery = useQuery({
    queryKey: ['profiles', filters],
    queryFn: () => mockApi.getProfiles(filters),
  })

  const resetFilters = () => {
    setSearchDraft('')
    setFilters(defaultFilters)
    void queryClient.invalidateQueries({ queryKey: ['profiles'] })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="profiles"
        title="See other members by polytechnic, course, and job state."
        description="The directory is server-filtered, approved-members only, and optimized for quick scanning across the five Singapore polytechnics."
        actions={
          <>
            <Badge variant="outline">
              <UsersRound className="mr-1 h-3.5 w-3.5" />
              {profilesQuery.data?.total ?? 0} members
            </Badge>
            <Badge variant="outline">
              <Filter className="mr-1 h-3.5 w-3.5" />
              query params
            </Badge>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="h-fit border-border/70 bg-white/90">
          <CardHeader>
            <CardTitle className="text-lg">Directory filters</CardTitle>
            <CardDescription>These map directly to backend filtering.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Search</label>
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Name or skill"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Polytechnic</label>
              <select
                className="h-10 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                value={filters.polytechnic}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, polytechnic: event.target.value }))
                }
              >
                <option value="">All</option>
                {polytechnics.map((polytechnic) => (
                  <option key={polytechnic} value={polytechnic}>
                    {polytechnic}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Course contains</label>
              <Input
                value={filters.course}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, course: event.target.value }))
                }
                placeholder="IT, Business..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Graduation year</label>
              <Input
                value={filters.graduationYear}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, graduationYear: event.target.value }))
                }
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Status badge</label>
              <select
                className="h-10 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="">All</option>
                {studentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={filters.openToCollab ? 'default' : 'outline'}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    openToCollab: !current.openToCollab,
                  }))
                }
              >
                Open to collab
              </Button>
              <Button
                size="sm"
                variant={filters.jobSeeking ? 'default' : 'outline'}
                onClick={() =>
                  setFilters((current) => ({ ...current, jobSeeking: !current.jobSeeking }))
                }
              >
                Job seeking
              </Button>
              <Button size="sm" variant="ghost" onClick={resetFilters}>
                Reset
              </Button>
            </div>
            <div className="rounded-3xl bg-muted p-4 text-sm text-muted-foreground">
              Query keys stay server-side, so filtering stays cheap even as the directory grows.
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {profilesQuery.data?.counts.polytechnics.map((item) => (
              <Card key={item.value} className="border-border/70 bg-white/90">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">{item.value}</p>
                  <p className="mt-2 font-display text-2xl font-bold">{item.count}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {profilesQuery.data?.items.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {profilesQuery.data.items.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No profiles matched"
              description="Try loosening the filters or clearing the search field."
              actionLabel="Reset filters"
              onAction={resetFilters}
              icon={<Search className="h-5 w-5 text-primary" />}
            />
          )}
        </div>
      </div>
    </div>
  )
}
