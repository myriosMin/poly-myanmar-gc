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
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import { api } from '@/lib/api'
import { publicProfileFields, studentStatuses } from '@/lib/domain'
import { settingsSchema, type SettingsForm } from '@/lib/schemas'
import { signOut } from '@/lib/supabase'

const fieldLabels: Record<(typeof publicProfileFields)[number], string> = {
  polytechnic: 'Polytechnic',
  course: 'Course',
  statusBadge: 'Status',
  jobSeeking: 'Job-seeking status',
  linkedinUrl: 'LinkedIn',
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
      linkedinUrl: 'https://linkedin.com/in/',
      githubUrl: '',
      portfolioUrl: '',
      statusBadge: 'mentor',
      openToCollab: true,
      jobSeeking: false,
      publicFields: ['polytechnic', 'course', 'statusBadge', 'jobSeeking', 'linkedinUrl'],
    },
  })

  useEffect(() => {
    if (!settingsQuery.data) {
      return
    }

    form.reset({
      name: settingsQuery.data.name,
      linkedinUrl: settingsQuery.data.linkedinUrl ?? 'https://linkedin.com/in/min-thu',
      githubUrl: settingsQuery.data.githubUrl ?? '',
      portfolioUrl: settingsQuery.data.portfolioUrl ?? '',
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

      return draft
    },
    onSuccess: (draft) => {
      setDeletionDraft(draft)
      setAccountActionMessage('Deletion request template is ready. Send it via the community admin channel or Telegram review contact.')
      navigate('/legal/deletion')
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
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register('name')} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input {...form.register('linkedinUrl')} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select {...form.register('statusBadge')}>
                  {studentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>GitHub</Label>
                <Input {...form.register('githubUrl')} />
              </div>
              <div className="space-y-2">
                <Label>Portfolio</Label>
                <Input {...form.register('portfolioUrl')} />
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
              <p className="body-copy mt-2 !text-sm">
                Choose what appears on your member profile. Keep at least one field visible.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {publicProfileFields.map((field) => {
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

                        if (next.length > 0) {
                          form.setValue('publicFields', next, { shouldValidate: true })
                        }
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
                {publicFields.map((field) => (
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

              <p className="body-copy !text-sm">
                Deletion follows policy: requests are reviewed by admins and may retain minimal audit/moderation records.
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
