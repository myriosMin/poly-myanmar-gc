import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Sparkles,
  ShieldCheck,
  Users2,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { OnboardingInput } from '@/lib/domain'
import { useSessionQuery } from '@/lib/query'
import {
  getAuthenticatedUser,
  isSupabaseAuthConfigured,
  signInOrSignUpWithPassword,
} from '@/lib/supabase'
import { onboardingSchema, type OnboardingForm } from '@/lib/schemas'

const ONBOARDING_DRAFT_KEY = 'onboarding-draft'

function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string
  children: ReactNode
  hint?: string
  error?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function AuthPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = useSessionQuery()
  const [notice, setNotice] = useState<string | null>(null)

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      username: '',
      email: session?.email ?? '',
      linkedinUrl: 'https://linkedin.com/in/',
      password: '',
    },
  })

  const submitMutation = useMutation({
    mutationFn: async (values: OnboardingForm) => {
      setNotice(null)

      const onboardingPayload: OnboardingInput = {
        username: values.username,
        email: values.email,
        linkedinUrl: values.linkedinUrl,
      }

      const authResult = await signInOrSignUpWithPassword(values.email, values.password)
      if (authResult.kind === 'email-confirmation-required') {
        globalThis.localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(onboardingPayload))
        setNotice('Check your inbox to confirm your email. We will finish onboarding automatically after verification.')
        return null
      }

      return api.submitOnboarding(onboardingPayload)
    },
    onSuccess: async (updatedSession) => {
      if (!updatedSession) {
        return
      }

      globalThis.localStorage.removeItem(ONBOARDING_DRAFT_KEY)
      globalThis.localStorage.setItem('actor-id', updatedSession.id)
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      navigate('/pending-approval')
    },
  })

  useEffect(() => {
    const rawDraft = globalThis.localStorage.getItem(ONBOARDING_DRAFT_KEY)
    if (!rawDraft) {
      return
    }

    let cancelled = false

    const resumeOnboarding = async () => {
      try {
        const draft = JSON.parse(rawDraft) as OnboardingInput
        await getAuthenticatedUser()
        const updatedSession = await api.submitOnboarding(draft)
        if (cancelled) {
          return
        }

        globalThis.localStorage.removeItem(ONBOARDING_DRAFT_KEY)
        globalThis.localStorage.setItem('actor-id', updatedSession.id)
        await queryClient.invalidateQueries({ queryKey: ['session'] })
        navigate('/pending-approval')
      } catch {
        // Keep the draft for retry on the next visit after auth is fully established.
      }
    }

    void resumeOnboarding()

    return () => {
      cancelled = true
    }
  }, [navigate, queryClient])

  return (
    <div className="space-y-8 pb-12">
      <section className="page-reveal grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="relative overflow-hidden px-6 py-8 md:px-8 md:py-10">
          <div className="absolute inset-x-0 top-0 h-40 from-primary/8 via-transparent to-transparent" />
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
                  title: 'Real collabs',
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

          </div>
        </div>

        <div className="surface-panel page-reveal self-start p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">Join Poly Myanmar</p>
              <h2 className="section-title mt-3">Apply for access</h2>
              <p className="body-copy mt-3 max-w-md !text-sm">
                Start with three basics. You can complete the rest of your profile after approval.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>

          <form
            className="mt-6 grid gap-4"
            noValidate
            onSubmit={form.handleSubmit((values) => submitMutation.mutate(values))}
          >
            {!isSupabaseAuthConfigured ? (
              <div className="rounded-[1rem] border border-destructive/35 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                Supabase auth is not configured in the frontend environment. Add
                VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.
              </div>
            ) : null}

            {submitMutation.error instanceof Error ? (
              <div className="rounded-[1rem] border border-destructive/35 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {submitMutation.error.message}
              </div>
            ) : null}

            {notice ? (
              <div className="rounded-[1rem] border border-primary/30 bg-primary/8 px-4 py-3 text-sm text-foreground">
                {notice}
              </div>
            ) : null}

            <Button type="button" variant="outline" className="w-full" disabled>
              <Sparkles className="h-4 w-4" />
              Continue with Google (coming soon)
            </Button>

            <Button type="button" variant="outline" className="w-full" disabled>
              <Briefcase className="h-4 w-4" />
              Continue with LinkedIn (coming soon)
            </Button>

            <Field
              label="Username"
              hint="How you want others to see you in the community."
              error={form.formState.errors.username?.message}
            >
              <Input {...form.register('username')} placeholder="hanni" />
            </Field>

            <Field
              label="Email"
              hint="We will use this to reach you after review."
              error={form.formState.errors.email?.message}
            >
              <Input {...form.register('email')} type="email" placeholder="you@email.com" />
            </Field>

            <Field
              label="LinkedIn"
              hint="Required for club verification."
              error={form.formState.errors.linkedinUrl?.message}
            >
              <Input {...form.register('linkedinUrl')} placeholder="https://linkedin.com/in/..." />
            </Field>

            <Field
              label="Password"
              hint="Use at least 8 characters."
              error={form.formState.errors.password?.message}
            >
              <Input {...form.register('password')} type="password" placeholder="********" />
            </Field>

            <Button type="submit" className="mt-2 w-full" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Creating account...' : 'Create account and apply'}
              {!submitMutation.isPending ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
