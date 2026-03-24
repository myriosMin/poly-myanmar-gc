import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock3, MailCheck, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Application received"
        title="Your application is waiting for review."
        description="We keep the space private and credible by reviewing each new member before access is granted."
        actions={<Badge variant="secondary">{session?.approvalState ?? 'pending'}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-card/85">
          <CardContent className="space-y-6 p-8">
            <div className="flex items-center gap-3 rounded-[1.6rem] bg-muted/70 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-display text-2xl font-semibold">{session?.name ?? 'Applicant'}</p>
                <p className="text-sm text-muted-foreground">
                  {session?.polytechnic ?? 'Polytechnic'} member application
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: MailCheck,
                  title: 'Application sent',
                  body: 'Your profile and LinkedIn link are already in the review queue.',
                },
                {
                  icon: Clock3,
                  title: 'Review in progress',
                  body: 'The club checks identity and fit before granting access.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Private access after approval',
                  body: 'Profiles, events, resources, and collab open once you are approved.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[1.6rem] border border-border/60 bg-background/70 p-5">
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-4 font-medium">{item.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>

            <Button
              className="w-full md:w-auto"
              variant="outline"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Approving...' : 'Simulate reviewer approval'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex h-full flex-col justify-between gap-6 p-8">
            <div>
              <p className="section-kicker text-primary-foreground/70">What happens next</p>
              <p className="mt-4 font-display text-4xl font-semibold">You will hear back after review.</p>
            </div>
            <p className="text-sm text-primary-foreground/80">
              Once approved, your sign-in details can be activated and you will be able to explore
              members, RSVP to events, and start collaborations inside the club.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
