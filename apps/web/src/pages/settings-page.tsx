import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Eye, UserCog } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/layout/page-header'
import { publicProfileFields, studentStatuses } from '@/lib/domain'
import { mockApi } from '@/lib/mock-api'
import { settingsSchema, type SettingsForm } from '@/lib/schemas'

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
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => mockApi.getSettings(),
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
    mutationFn: mockApi.updateSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      await queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })

  const publicFields = form.watch('publicFields')

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Control what members see first, and what stays private."
        description="Your profile should feel intentional: enough detail to be discoverable, not so much that it becomes noisy."
        actions={<Badge variant="outline">Member-only visibility</Badge>}
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="surface-panel rounded-[2rem] p-8">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            <p className="font-display text-3xl font-semibold">Profile details</p>
          </div>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
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

            <div className="rounded-[1.7rem] bg-muted/62 p-5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <p className="font-medium">Public profile fields</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
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
          <div className="surface-panel rounded-[2rem] bg-primary p-8 text-primary-foreground">
            <Eye className="h-5 w-5" />
            <p className="mt-4 font-display text-3xl font-semibold">
              Visibility should feel deliberate.
            </p>
            <p className="mt-3 text-sm text-primary-foreground/80">
              Members should understand your school, direction, and availability quickly, without
              you exposing more than you want.
            </p>
          </div>

          <div className="surface-panel rounded-[2rem] p-8">
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
          </div>
        </div>
      </section>
    </div>
  )
}
