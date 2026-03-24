import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { mockApi } from '@/lib/mock-api'
import { formatDateTime } from '@/lib/utils'
import { EmptyState } from '@/components/layout/empty-state'

export function EventsPage() {
  const queryClient = useQueryClient()
  const eventsQuery = useQuery({
    queryKey: ['events'],
    queryFn: () => mockApi.getEvents(),
  })

  const rsvpMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'going' | 'interested' | 'not_going' }) =>
      mockApi.setRsvp(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="events"
        title="Career fairs, hackathons, and meetups with RSVP states."
        description="Events stay published-only inside the member workspace. The same model is used for admin-created events and weekly worker-sourced drafts."
        actions={<Badge variant="outline">{eventsQuery.data?.total ?? 0} live events</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          {eventsQuery.data?.items.length ? (
            eventsQuery.data.items.map((event) => (
              <Card key={event.id} className="border-border/70 bg-white/90">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        {event.title}
                        <Badge variant="secondary">{event.kind}</Badge>
                      </CardTitle>
                      <CardDescription>{event.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{event.source}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {formatDateTime(event.startsAt)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {event.location}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      {event.attendees.length}/{event.capacity} going
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  {(['going', 'interested', 'not_going'] as const).map((status) => (
                    <Button
                      key={status}
                      variant={event.myRsvp === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => rsvpMutation.mutate({ id: event.id, status })}
                      disabled={rsvpMutation.isPending}
                    >
                      {status.replace('_', ' ')}
                    </Button>
                  ))}
                  <Badge variant="secondary">Your RSVP: {event.myRsvp.replace('_', ' ')}</Badge>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No events yet"
              description="Published events and approved drafts will show up here."
            />
          )}
        </div>

        <Card className="h-fit border-border/70 bg-white/90">
          <CardHeader>
            <CardTitle className="text-xl">Why this view matters</CardTitle>
            <CardDescription>
              The frontend keeps attendance visible without turning into a social feed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {eventsQuery.data?.items.slice(0, 2).map((event) => (
              <div key={event.id} className="rounded-3xl border border-border bg-muted p-4">
                <p className="font-semibold">{event.title}</p>
                <p className="text-sm text-muted-foreground">
                  {event.attendees.join(', ') || 'No attendees yet'}
                </p>
              </div>
            ))}
            <div className="rounded-3xl bg-primary/10 p-4 text-sm leading-6 text-foreground">
              The same route structure will later consume API-backed event drafts, Telegram
              approvals, and attendance summaries.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
