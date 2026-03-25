import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Filter, MapPin, Users, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/layout/empty-state'
import { MobileDrawer } from '@/components/layout/overlay'
import { PageHeader } from '@/components/layout/page-header'
import { mockApi } from '@/lib/mock-api'
import { cn, formatDateTime } from '@/lib/utils'

export function EventsPage() {
  const [kindFilter, setKindFilter] = useState('')
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
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

  const filteredEvents = useMemo(() => {
    if (!eventsQuery.data?.items) {
      return []
    }

    if (!kindFilter) {
      return eventsQuery.data.items
    }

    return eventsQuery.data.items.filter((event) => event.kind === kindFilter)
  }, [eventsQuery.data?.items, kindFilter])

  const sidebar = (
    <div className="filter-panel sticky-rail">
      <div className="flex items-start justify-between gap-4 lg:block">
        <div>
          <p className="section-kicker">Event type</p>
          <p className="section-title mt-3">Filter the calendar</p>
          <p className="body-copy mt-2">
            Start by the kind of moment you want to join.
          </p>
        </div>

        <Button
          type="button"
          size="icon"
          variant="outline"
          className="lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
          aria-label="Close filters"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setKindFilter('')}
          className={cn(
            'filter-option',
            kindFilter === '' && 'filter-option-active',
          )}
        >
          <p className="text-sm font-semibold">All events</p>
          <p
            className={cn(
              'mt-1 text-sm',
              kindFilter === '' ? 'text-primary-foreground/78' : 'text-muted-foreground',
            )}
          >
            {eventsQuery.data?.total ?? 0} total
          </p>
        </button>

        {eventsQuery.data?.kinds.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setKindFilter(item.value)
              setShowMobileSidebar(false)
            }}
            className={cn(
              'filter-option',
              kindFilter === item.value && 'filter-option-active',
            )}
          >
            <p className="text-sm font-semibold capitalize">{item.value}</p>
            <p
              className={cn(
                'mt-1 text-sm',
                kindFilter === item.value ? 'text-primary-foreground/78' : 'text-muted-foreground',
              )}
            >
              {item.count} event{item.count === 1 ? '' : 's'}
            </p>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Events"
        title="See the right event, decide quickly, and RSVP."
        description="Keep the calendar useful: filter by type, scan the essentials, and commit without extra clutter."
        actions={
          <>
            <Badge variant="outline" className="h-11 px-4 text-sm normal-case tracking-[0.14em]">
              {filteredEvents.length} visible
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

      <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">{sidebar}</aside>

        <div className="space-y-4">
          {filteredEvents.length ? (
            filteredEvents.map((event) => (
              <div key={event.id} className="content-row">
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

                  <div className="meta-block text-right">
                    <p className="section-kicker">Your RSVP</p>
                    <p className="mt-2 text-sm font-medium capitalize">
                      {event.myRsvp.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="meta-block">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <p className="mt-3 text-muted-foreground">When</p>
                    <p className="mt-1 font-medium text-foreground">{formatDateTime(event.startsAt)}</p>
                  </div>
                  <div className="meta-block">
                    <MapPin className="h-4 w-4 text-primary" />
                    <p className="mt-3 text-muted-foreground">Where</p>
                    <p className="mt-1 font-medium text-foreground">{event.location}</p>
                  </div>
                  <div className="meta-block">
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
              title="No events match this filter"
              description="Try another event type to widen the calendar."
              actionLabel="Show all events"
              onAction={() => setKindFilter('')}
            />
          )}
        </div>
      </section>

      <MobileDrawer open={showMobileSidebar} onClose={() => setShowMobileSidebar(false)}>
        {sidebar}
      </MobileDrawer>
    </div>
  )
}
