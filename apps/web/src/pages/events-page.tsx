import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/layout/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { mockApi } from '@/lib/mock-api'
import { formatDateTime } from '@/lib/utils'

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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Events"
        title="Show up with context before the opportunity starts."
        description="The event view stays light: what it is, when it happens, where it is, and whether you want in."
        actions={
          <Badge variant="outline" className="h-11 px-4 text-sm normal-case tracking-[0.14em]">
            {eventsQuery.data?.total ?? 0} upcoming
          </Badge>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-panel rounded-[2rem] p-8">
          <p className="section-kicker">Event rhythm</p>
          <p className="mt-3 max-w-lg font-display text-4xl font-semibold">
            Career fairs, warm-ups, hack nights, and small useful gatherings.
          </p>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            RSVP quickly, see who is already in, and use the calendar to create better
            introductions before you arrive.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {eventsQuery.data?.kinds.map((item) => (
              <div key={item.value} className="rounded-[1.6rem] bg-muted/62 p-4">
                <p className="section-kicker">{item.value}</p>
                <p className="mt-2 font-display text-3xl font-semibold">{item.count}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel rounded-[2rem] bg-primary p-8 text-primary-foreground">
          <p className="section-kicker text-primary-foreground/70">Best use of this page</p>
          <p className="mt-3 max-w-md font-display text-4xl font-semibold">
            See the event, decide the signal, and move on.
          </p>
          <p className="mt-4 max-w-md text-sm text-primary-foreground/82">
            The point is not endless browsing. It is quick commitment around moments that matter.
          </p>
        </div>
      </section>

      <div className="space-y-4">
        {eventsQuery.data?.items.length ? (
          eventsQuery.data.items.map((event) => (
            <div key={event.id} className="surface-panel card-float rounded-[2rem] p-7">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{event.kind}</Badge>
                    <Badge variant="outline">{event.source}</Badge>
                  </div>
                  <h2 className="mt-4 max-w-2xl font-display text-4xl font-semibold">
                    {event.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                    {event.description}
                  </p>
                </div>

                <div className="rounded-[1.6rem] bg-muted/62 px-4 py-3 text-right">
                  <p className="section-kicker">Your RSVP</p>
                  <p className="mt-2 text-sm font-medium capitalize">
                    {event.myRsvp.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.5rem] bg-background/80 p-4 text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-muted-foreground">When</p>
                  <p className="mt-1 font-medium text-foreground">{formatDateTime(event.startsAt)}</p>
                </div>
                <div className="rounded-[1.5rem] bg-background/80 p-4 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-muted-foreground">Where</p>
                  <p className="mt-1 font-medium text-foreground">{event.location}</p>
                </div>
                <div className="rounded-[1.5rem] bg-background/80 p-4 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-muted-foreground">Attendance</p>
                  <p className="mt-1 font-medium text-foreground">
                    {event.attendees.length}/{event.capacity} going
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Attending: {event.attendees.join(', ') || 'No attendees yet'}
                </p>
                <div className="flex flex-wrap gap-2">
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
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="No events yet"
            description="New meetups and curated opportunities will appear here."
          />
        )}
      </div>
    </div>
  )
}
