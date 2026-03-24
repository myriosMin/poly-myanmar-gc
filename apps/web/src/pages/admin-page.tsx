import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Bot, Check, ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { mockApi } from '@/lib/mock-api'
import { EmptyState } from '@/components/layout/empty-state'

export function AdminPage() {
  const queryClient = useQueryClient()
  const adminQuery = useQuery({
    queryKey: ['admin-queue'],
    queryFn: () => mockApi.getAdminQueue(),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' | 'ban' | 'dismiss_flag' }) =>
      mockApi.reviewQueueItem(id, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-queue'] })
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      await queryClient.invalidateQueries({ queryKey: ['resources'] })
      await queryClient.invalidateQueries({ queryKey: ['collab'] })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="admin"
        title="Fallback review queues for Telegram or web."
        description="The admin screen mirrors Telegram inline actions and preserves the same review logic as the bot webhook."
        actions={<Badge variant="outline">{adminQuery.data?.items.length ?? 0} queue items</Badge>}
      />

      <Card className="border-border/70 bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Bot className="h-5 w-5 text-primary" />
            Telegram-first review loop
          </CardTitle>
          <CardDescription>
            Approve, reject, ban, or dismiss from the queue. Every action is mirrored across
            the mock frontend state.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {[
            ['user_application', 'Applications'],
            ['resource_submission', 'Resources'],
            ['draft_event', 'Draft events'],
            ['collab_flag', 'Flags'],
          ].map(([key, label]) => (
            <div key={key} className="rounded-3xl border border-border bg-muted p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="font-display text-2xl font-bold">
                {adminQuery.data?.totals[key] ?? 0}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {adminQuery.data?.items.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {adminQuery.data.items.map((item) => (
            <Card key={item.id} className="border-border/70 bg-white/90">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.summary}</CardDescription>
                  </div>
                  <Badge variant="secondary">{item.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  submitted by {item.submittedBy} · {new Date(item.createdAt).toLocaleString()}
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {item.actions.includes('approve') ? (
                  <Button
                    size="sm"
                    onClick={() => reviewMutation.mutate({ id: item.id, action: 'approve' })}
                    disabled={reviewMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                ) : null}
                {item.actions.includes('reject') ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reviewMutation.mutate({ id: item.id, action: 'reject' })}
                    disabled={reviewMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                ) : null}
                {item.actions.includes('ban') ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => reviewMutation.mutate({ id: item.id, action: 'ban' })}
                    disabled={reviewMutation.isPending}
                  >
                    <Ban className="h-4 w-4" />
                    Ban
                  </Button>
                ) : null}
                {item.actions.includes('dismiss_flag') ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      reviewMutation.mutate({ id: item.id, action: 'dismiss_flag' })
                    }
                    disabled={reviewMutation.isPending}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Dismiss
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Queue empty"
          description="When approvals, submissions, or alerts arrive, they will appear here."
        />
      )}
    </div>
  )
}
