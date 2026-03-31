import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check, ShieldAlert, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/layout/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { api } from '@/lib/api'

export function AdminPage() {
  const queryClient = useQueryClient()
  const adminQuery = useQuery({
    queryKey: ['admin-queue'],
    queryFn: () => api.getAdminQueue(),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' | 'ban' | 'dismiss_flag' }) =>
      api.reviewQueueItem(id, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-queue'] })
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      await queryClient.invalidateQueries({ queryKey: ['resources'] })
      await queryClient.invalidateQueries({ queryKey: ['collab'] })
    },
  })

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Review the club queue with the same quiet clarity as the rest of the product."
        description="Applications, submissions, and safety actions stay readable and fast to process."
        actions={<Badge variant="outline">{adminQuery.data?.items.length ?? 0} items</Badge>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {[
          ['user_application', 'Applications'],
          ['resource_submission', 'Resources'],
          ['draft_event', 'Draft events'],
          ['collab_flag', 'Flags'],
        ].map(([key, label]) => (
          <div key={key} className="surface-panel bg-card/82 p-4 sm:p-6">
              <p className="section-kicker">{label}</p>
              <p className="section-title mt-2 !text-[1.6rem] sm:!text-[2rem]">
                {adminQuery.data?.totals[key as keyof typeof adminQuery.data.totals] ?? 0}
              </p>
          </div>
        ))}
      </div>

      {adminQuery.data?.items.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {adminQuery.data.items.map((item) => (
            <div key={item.id} className="content-row bg-card/88">
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge variant="secondary">{item.type}</Badge>
                    <p className="section-title mt-4">{item.title}</p>
                    <p className="body-copy mt-2 !text-sm">{item.summary}</p>
                  </div>
                </div>
                <p className="micro-copy uppercase tracking-[0.18em]">
                  {item.submittedBy} • {new Date(item.createdAt).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2">
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
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Queue empty"
          description="New applications and moderation items will appear here when something needs attention."
        />
      )}
    </div>
  )
}
