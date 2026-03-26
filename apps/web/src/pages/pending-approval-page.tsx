import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock3, MailCheck, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
        <div className="surface-panel bg-card/85 p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 rounded-[1.6rem] bg-muted/70 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="section-title !text-[2rem]">{session?.name ?? 'Applicant'}</p>
                <p className="body-copy">
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
                <div key={item.title} className="surface-inset p-5">
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-4 font-medium">{item.title}</p>
                  <p className="body-copy mt-2 !text-sm">{item.body}</p>
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
          </div>
        </div>

        <div className="surface-panel flex h-full flex-col justify-between gap-6 bg-primary p-8 text-primary-foreground">
            <div>
              <p className="section-kicker text-primary-foreground/70">What happens next</p>
              <p className="page-title mt-4 !text-[3rem] text-primary-foreground">You will hear back after review.</p>
            </div>
            <p className="body-copy text-primary-foreground/80">
              Once approved, your sign-in details can be activated and you will be able to explore
              members, RSVP to events, and start collaborations inside the club.
            </p>
        </div>
      </div>
    </div>
  )
}
