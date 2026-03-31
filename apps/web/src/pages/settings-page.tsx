import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Eye, LogOut, Trash2, UserCog } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import { api } from '@/lib/api'
import { publicProfileFields, studentStatuses } from '@/lib/domain'
import { settingsSchema, type SettingsForm } from '@/lib/schemas'
import { signOut } from '@/lib/supabase'

const alwaysPublicFields = ['polytechnic', 'course', 'statusBadge', 'linkedinUrl'] as const
const optionalPublicFields = publicProfileFields.filter(
  (field) => !alwaysPublicFields.includes(field as (typeof alwaysPublicFields)[number]),
)

const fieldLabels: Record<(typeof publicProfileFields)[number], string> = {
  polytechnic: 'Polytechnic',
  course: 'Course',
  statusBadge: 'Status',
  jobSeeking: 'Job-seeking status',
  linkedinUrl: 'LinkedIn',
  email: 'Email',
  skills: 'Skills',
  hobbies: 'Hobbies',
  githubUrl: 'GitHub',
  portfolioUrl: 'Portfolio',
}

export function SettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [accountActionMessage, setAccountActionMessage] = useState<string | null>(null)
  const [deletionDraft, setDeletionDraft] = useState<string>('')
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  })

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      graduationYearInput: '',
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      skillsInput: '',
      hobbiesInput: '',
      statusBadge: 'mentor',
      openToCollab: true,
      jobSeeking: false,
      publicFields: ['polytechnic', 'course', 'statusBadge', 'jobSeeking', 'linkedinUrl', 'email', 'skills', 'hobbies'],
    },
  })

  useEffect(() => {
    if (!settingsQuery.data) {
      return
    }

    form.reset({
      name: settingsQuery.data.name ?? '',
      graduationYearInput: settingsQuery.data.graduationYear ? String(settingsQuery.data.graduationYear) : '',
      linkedinUrl: settingsQuery.data.linkedinUrl ?? '',
      githubUrl: settingsQuery.data.githubUrl ?? '',
      portfolioUrl: settingsQuery.data.portfolioUrl ?? '',
      skillsInput: settingsQuery.data.skills.join(', '),
      hobbiesInput: settingsQuery.data.hobbies.join(', '),
      statusBadge: settingsQuery.data.statusBadge,
      openToCollab: settingsQuery.data.openToCollab,
      jobSeeking: settingsQuery.data.jobSeeking,
      publicFields: settingsQuery.data.publicFields,
    })
  }, [form, settingsQuery.data])

  const saveMutation = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      await queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut()
      globalThis.localStorage.removeItem('actor-id')
      globalThis.localStorage.removeItem('onboarding-draft')
    },
    onSuccess: async () => {
      await queryClient.cancelQueries()
      queryClient.clear()
      navigate('/auth', { replace: true })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to log out right now.'
      setAccountActionMessage(message)
    },
  })

  const deleteRequestMutation = useMutation({
    mutationFn: async () => {
      const settings = settingsQuery.data ?? await api.getSettings()
      const draft = [
        'Deletion request',
        `Full name: ${settings.name || '(please fill)'}`,
        `Google sign-in email: ${settings.email}`,
        `LinkedIn URL: ${settings.linkedinUrl || '(please fill)'}`,
        'Request: Please delete my account and associated profile data.',
      ].join('\n')

      if (globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(draft)
      }

      const result = await api.requestAccountDeletion(draft)
      return { draft, result }
    },
    onSuccess: ({ draft, result }) => {
      setDeletionDraft(draft)
      const requestState = result.already_exists ? 'already open' : 'submitted'
      setAccountActionMessage(`${result.message} Request ID: ${result.request_id} (${requestState}).`)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to prepare deletion request.'
      setAccountActionMessage(message)
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const publicFields = form.watch('publicFields')

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Control what members see first, and what stays private."
        description="Your profile should feel intentional: enough detail to be discoverable, not so much that it becomes noisy."
        actions={
          <Badge variant="outline" className="h-11 px-4 text-sm normal-case tracking-[0.14em]">
            Member-only visibility
          </Badge>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="surface-panel p-8">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <p className="section-title">Profile details</p>
          </div>
          <p className="body-copy mt-3 max-w-md">
            These settings shape how you appear inside the directory and how easy you are to
            approach.
          </p>

          <form
            className="mt-6 grid gap-4"
            onSubmit={form.handleSubmit((values) => {
              const parseTags = (value: string | undefined) =>
                (value ?? '')
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean)

              const graduationYear = values.graduationYearInput?.trim()
                ? Number(values.graduationYearInput)
                : null

              saveMutation.mutate({
                name: values.name,
                graduationYear: Number.isFinite(graduationYear) ? graduationYear : null,
                linkedinUrl: values.linkedinUrl,
                githubUrl: values.githubUrl || undefined,
                portfolioUrl: values.portfolioUrl || undefined,
                skills: parseTags(values.skillsInput),
                hobbies: parseTags(values.hobbiesInput),
                statusBadge: values.statusBadge,
                openToCollab: values.openToCollab,
                jobSeeking: values.jobSeeking,
                publicFields: Array.from(new Set([...alwaysPublicFields, ...values.publicFields])),
              })
            })}
          >
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={settingsQuery.data?.username ?? ''} disabled readOnly />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={settingsQuery.data?.email ?? ''} disabled readOnly />
            </div>

            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input {...form.register('name')} placeholder="Enter your full name" />
            </div>

            <div className="surface-inset grid gap-4 p-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Polytechnic</Label>
                <Input value={settingsQuery.data?.polytechnic ?? ''} disabled readOnly />
              </div>
              <div className="space-y-2">
                <Label>Course</Label>
                <Input value={settingsQuery.data?.course ?? ''} disabled readOnly />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Graduation year</Label>
              <Input type="number" {...form.register('graduationYearInput')} placeholder="2026" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input {...form.register('linkedinUrl')} placeholder="https://linkedin.com/in/your-handle" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex flex-wrap gap-2">
                  {studentStatuses.map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={form.watch('statusBadge') === status ? 'default' : 'outline'}
                      onClick={() => form.setValue('statusBadge', status, { shouldValidate: true })}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>GitHub</Label>
                <Input {...form.register('githubUrl')} placeholder="https://github.com/your-handle" />
              </div>
              <div className="space-y-2">
                <Label>Portfolio</Label>
                <Input {...form.register('portfolioUrl')} placeholder="https://your-site.com" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Skills</Label>
                <Input {...form.register('skillsInput')} placeholder="react, python, design" />
              </div>
              <div className="space-y-2">
                <Label>Hobbies</Label>
                <Input {...form.register('hobbiesInput')} placeholder="photography, football" />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Switch
                aria-label="Open to collab"
                checked={form.watch('openToCollab')}
                onChange={(event) => form.setValue('openToCollab', event.target.checked)}
              />
              <Switch
                aria-label="Job seeking"
                checked={form.watch('jobSeeking')}
                onChange={(event) => form.setValue('jobSeeking', event.target.checked)}
              />
            </div>

            <div className="surface-inset p-5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <p className="font-medium">Public profile fields</p>
              </div>
              <p className="body-copy mt-2 text-sm!">
                Polytechnic, Course, Status, and LinkedIn are always public. Choose the optional fields below.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {alwaysPublicFields.map((field) => (
                  <Badge key={field} variant="secondary">
                    {fieldLabels[field]}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {optionalPublicFields.map((field) => {
                  const active = publicFields.includes(field)
                  return (
                    <Button
                      key={field}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      onClick={() => {
                        const next = active
                          ? publicFields.filter((item) => item !== field)
                          : [...publicFields, field]
                        form.setValue('publicFields', next, { shouldValidate: true })
                      }}
                    >
                      {fieldLabels[field]}
                    </Button>
                  )
                })}
              </div>
            </div>

            <Button type="submit" className="w-full md:w-auto" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
        </div>

        <div className="grid gap-4">
          <div className="surface-panel bg-primary p-8 text-primary-foreground">
            <Eye className="h-5 w-5" />
            <p className="section-title mt-4 text-primary-foreground">
              Visibility should feel deliberate.
            </p>
            <p className="body-copy mt-3 text-primary-foreground/80">
              Members should understand your school, direction, and availability quickly, without
              you exposing more than you want.
            </p>
          </div>

          <div className="surface-panel p-8">
            <p className="section-kicker">Current account</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>{settingsQuery.data?.approvalState ?? 'loading'}</Badge>
              <Badge variant="secondary">{settingsQuery.data?.polytechnic ?? 'SP'}</Badge>
              <Badge variant="outline">{settingsQuery.data?.role ?? 'member'}</Badge>
            </div>

            <div className="soft-divider mt-6 pt-6">
              <p className="section-kicker">Visible now</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[...alwaysPublicFields, ...publicFields].map((field) => (
                  <Badge key={field} variant="outline">
                    {fieldLabels[field]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="soft-divider mt-6 space-y-4 pt-6">
              <p className="section-kicker">Account actions</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending || deleteRequestMutation.isPending}
                >
                  <LogOut className="h-4 w-4" />
                  {logoutMutation.isPending ? 'Logging out...' : 'Log out'}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteRequestMutation.mutate()}
                  disabled={logoutMutation.isPending || deleteRequestMutation.isPending || settingsQuery.isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteRequestMutation.isPending ? 'Preparing request...' : 'Delete account'}
                </Button>
              </div>

              <p className="body-copy text-sm!">
                Deletion follows policy: requests are reviewed by admins and may retain minimal audit or moderation records.
              </p>

              {deletionDraft ? (
                <div className="space-y-2">
                  <Label>Deletion request template</Label>
                  <Textarea value={deletionDraft} readOnly />
                </div>
              ) : null}

              {accountActionMessage ? (
                <p className="text-sm text-muted-foreground">{accountActionMessage}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
