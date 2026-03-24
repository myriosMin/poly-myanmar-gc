import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Sparkles, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import type { OnboardingInput } from '@/lib/domain'
import { polytechnics, studentStatuses } from '@/lib/domain'
import { onboardingSchema, type OnboardingForm } from '@/lib/schemas'
import { mockApi } from '@/lib/mock-api'
import { useSessionQuery } from '@/lib/query'

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function AuthPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = useSessionQuery()

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: session?.name ?? '',
      polytechnic: session?.polytechnic ?? 'SP',
      course: 'Diploma in Information Technology',
      graduationYear: '2026',
      linkedinUrl: 'https://linkedin.com/in/',
      githubUrl: '',
      portfolioUrl: '',
      skills: 'React, FastAPI, Supabase',
      hobbies: 'travelling, coffee, badminton',
      openToCollab: true,
      jobSeeking: true,
      statusBadge: 'current student',
    },
  })

  const submitMutation = useMutation({
    mutationFn: mockApi.submitOnboarding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      navigate('/pending-approval')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="auth + onboarding"
        title="Google sign-in, LinkedIn verification, and approval review."
        description="The frontend simulates the actual graduate-club flow: sign in, register with a LinkedIn URL, and wait for reviewer approval before accessing the private member workspace."
        actions={
          <>
            <Badge variant="outline">Google OAuth</Badge>
            <Badge variant="outline">LinkedIn required</Badge>
            <Badge variant="outline">manual proof fallback</Badge>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-primary text-primary-foreground shadow-glow">
          <CardHeader>
            <CardTitle className="text-2xl">Private club, not a social feed.</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Profiles, events, resources, and collab live behind approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: 'Strict approval',
                body: 'LinkedIn first, manual proof if needed, reviewer or superadmin decides.',
              },
              {
                icon: UserRoundCheck,
                title: 'Member access',
                body: 'Approved users see the member directory, event RSVP, and resources.',
              },
              {
                icon: Sparkles,
                title: 'Collaboration ready',
                body: 'Teams can form around hackathons, projects, and open source work.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/15 bg-white/10 p-4"
              >
                <item.icon className="mb-4 h-5 w-5" />
                <p className="font-display text-lg font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-primary-foreground/80">{item.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/90">
          <CardHeader>
            <CardTitle className="text-xl">Member application</CardTitle>
            <CardDescription>
              Registered users are tracked in the mock API and moved to pending review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit((values) =>
                submitMutation.mutate(values as OnboardingInput),
              )}
            >
              <Field label="Full name">
                <Input {...form.register('name')} placeholder="Min Thu" />
              </Field>
              <Field label="Polytechnic">
                <select
                  className="h-10 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                  {...form.register('polytechnic')}
                >
                  {polytechnics.map((polytechnic) => (
                    <option key={polytechnic} value={polytechnic}>
                      {polytechnic}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Course">
                <Input {...form.register('course')} placeholder="Diploma in..." />
              </Field>
              <Field label="Graduation year">
                <Input {...form.register('graduationYear')} inputMode="numeric" />
              </Field>
              <Field label="LinkedIn profile">
                <Input {...form.register('linkedinUrl')} placeholder="https://linkedin.com/in/..." />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="GitHub">
                  <Input {...form.register('githubUrl')} placeholder="Optional" />
                </Field>
                <Field label="Portfolio">
                  <Input {...form.register('portfolioUrl')} placeholder="Optional" />
                </Field>
              </div>
              <Field label="Skills">
                <Textarea {...form.register('skills')} rows={3} />
              </Field>
              <Field label="Hobbies">
                <Textarea {...form.register('hobbies')} rows={3} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Status badge">
                  <select
                    className="h-10 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                    {...form.register('statusBadge')}
                  >
                    {studentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="space-y-2">
                  <Label>Availability</Label>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm">
                      <input type="checkbox" {...form.register('openToCollab')} />
                      Open to collab
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm">
                      <input type="checkbox" {...form.register('jobSeeking')} />
                      Job seeking
                    </label>
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? 'Submitting...' : 'Submit for review'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
