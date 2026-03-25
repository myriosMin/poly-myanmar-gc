import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  Sparkles,
  Users2,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { OnboardingInput } from '@/lib/domain'
import { polytechnics, studentStatuses } from '@/lib/domain'
import { mockApi } from '@/lib/mock-api'
import { useSessionQuery } from '@/lib/query'
import { onboardingSchema, type OnboardingForm } from '@/lib/schemas'

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
      skills: 'React, FastAPI, community building',
      hobbies: 'coffee chats, badminton, travelling',
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
    <div className="space-y-8 pb-12">
      <section className="page-reveal grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="mandalay-arch relative overflow-hidden px-6 py-8 md:px-8 md:py-10">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/8 via-transparent to-transparent" />
          <div className="relative space-y-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Approved members</Badge>
              <Badge variant="secondary">Singapore-based</Badge>
            </div>

            <div className="max-w-4xl">
              <p className="section-kicker">Private network for Myanmar polytechnic students</p>
              <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[0.96] md:text-7xl">
                Warm access to the right people, events, and opportunities.
              </h1>
              <p className="body-copy mt-5 max-w-xl !text-base md:!text-lg">
                Poly Myanmar keeps discovery focused: who to meet, what to attend, and where to
                build together next.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Users2,
                  title: 'Credible circle',
                  body: 'Members are reviewed before entry, so outreach starts with trust.',
                },
                {
                  icon: CalendarDays,
                  title: 'Useful events',
                  body: 'Career fairs, hack nights, and community moments stay visible.',
                },
                {
                  icon: Sparkles,
                  title: 'Real collaboration',
                  body: 'Find classmates and graduates who are open to building something concrete.',
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="card-float rounded-[1.8rem] border border-border/60 bg-background/62 p-5"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="section-title mt-5 !text-[1.9rem] leading-tight">
                    {item.title}
                  </p>
                  <p className="body-copy mt-2 !text-sm">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 border-t border-border/60 pt-6 md:grid-cols-[0.7fr_1.3fr]">
              <div>
                <p className="section-kicker">Why the club matters</p>
                <p className="section-title mt-3 leading-tight">
                  Small enough to feel personal. Serious enough to shape your next step.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {['Members discover each other faster', 'Events stay opportunity-led', 'Collab starts with clear intent'].map((line) => (
                  <div key={line} className="surface-inset p-4 text-sm text-muted-foreground">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="surface-panel page-reveal p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">Join Poly Myanmar</p>
              <h2 className="section-title mt-3">Apply for access</h2>
              <p className="body-copy mt-3 max-w-md !text-sm">
                Keep it concise. LinkedIn is required because approvals stay human and trust-led.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {['Add profile basics', 'Share credibility links', 'Wait for review'].map((step, index) => (
              <div key={step} className="surface-inset p-4">
                <p className="section-kicker">0{index + 1}</p>
                <p className="mt-2 text-sm font-medium">{step}</p>
              </div>
            ))}
          </div>

          <form
            className="mt-6 grid gap-4"
            onSubmit={form.handleSubmit((values) => submitMutation.mutate(values as OnboardingInput))}
          >
            <Field label="Full name">
              <Input {...form.register('name')} placeholder="Min Thu" />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Polytechnic">
                <Select {...form.register('polytechnic')}>
                  {polytechnics.map((polytechnic) => (
                    <option key={polytechnic} value={polytechnic}>
                      {polytechnic}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Graduation year">
                <Input {...form.register('graduationYear')} inputMode="numeric" />
              </Field>
            </div>

            <Field label="Course">
              <Input {...form.register('course')} placeholder="Diploma in..." />
            </Field>

            <Field label="LinkedIn" hint="Required for club verification.">
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

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Skills">
                <Textarea {...form.register('skills')} rows={3} />
              </Field>
              <Field label="Interests">
                <Textarea {...form.register('hobbies')} rows={3} />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Status">
                <Select {...form.register('statusBadge')}>
                  {studentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="space-y-2">
                <Label>Signals</Label>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/84 px-4 py-3 text-sm">
                    <input type="checkbox" {...form.register('openToCollab')} />
                    Open to collab
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/84 px-4 py-3 text-sm">
                    <input type="checkbox" {...form.register('jobSeeking')} />
                    Job seeking
                  </label>
                </div>
              </div>
            </div>

            <Button type="submit" className="mt-2 w-full" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Sending application...' : 'Apply for access'}
              {!submitMutation.isPending ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
