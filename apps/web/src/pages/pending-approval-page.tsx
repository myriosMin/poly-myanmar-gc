import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock3, MailWarning, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { mockApi } from '@/lib/mock-api'
import { useSessionQuery } from '@/lib/query'

export function PendingApprovalPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = useSessionQuery()

  const approveMutation = useMutation({
    mutationFn: mockApi.simulateApproval,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      navigate('/profiles')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="approval queue"
        title="Pending approval is a first-class state."
        description="This screen reflects the strict review flow: LinkedIn verification, optional manual proof, and reviewer action through Telegram or the admin fallback."
        actions={
          <>
            <Badge variant="outline">pending</Badge>
            <Badge variant="outline">reviewer</Badge>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/70 bg-white/90">
          <CardHeader>
            <CardTitle className="text-xl">Current review state</CardTitle>
            <CardDescription>
              The mock session tracks the same state transitions the backend will enforce.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-3xl bg-muted px-4 py-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">{session?.name ?? 'Applicant'}</p>
                <p className="text-sm text-muted-foreground">
                  {session?.polytechnic ?? 'Polytechnic'} · {session?.approvalState ?? 'pending'}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                ['1', 'Google OAuth', 'Identity captured during sign-in.'],
                ['2', 'LinkedIn review', 'Verified against the submitted profile link.'],
                ['3', 'Reviewer approval', 'Telegram buttons or admin panel finalize access.'],
              ].map(([step, title, body]) => (
                <div key={step} className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {step}
                  </div>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Simulating approval...' : 'Simulate reviewer approval'}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-border/70 bg-white/90">
            <CardHeader>
              <CardTitle>What reviewers see in Telegram</CardTitle>
              <CardDescription>
                Each action is a single click with an audit trail attached.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {[
                {
                  icon: MailWarning,
                  title: 'User application',
                  body: 'Approve, reject, or escalate to manual review.',
                },
                {
                  icon: Clock3,
                  title: 'Queue freshness',
                  body: 'Pending items stay visible until handled.',
                },
                {
                  icon: TriangleAlert,
                  title: 'Suspicious activity',
                  body: 'Rules-based alerts surface questionable links or bursts.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-border bg-muted p-4">
                  <item.icon className="mb-3 h-5 w-5 text-primary" />
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-dashed border-border/70 bg-white/70">
            <CardHeader>
              <CardTitle className="text-lg">Access note</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Private routes remain blocked while approval is pending. The mock frontend uses
                the same state to gate the profile directory, events, resources, collab, and
                admin surfaces.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
