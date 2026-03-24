import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { ShieldCheck, UserCog } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/page-header'
import { studentStatuses } from '@/lib/domain'
import { mockApi } from '@/lib/mock-api'
import { settingsSchema, type SettingsForm } from '@/lib/schemas'

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
    })
  }, [form, settingsQuery.data])

  const saveMutation = useMutation({
    mutationFn: mockApi.updateSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      await queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="settings"
        title="Profile visibility, links, and private workspace controls."
        description="This screen keeps the member profile editable while staying inside the approved-member boundary."
        actions={
          <>
            <Badge variant="outline">minimal data</Badge>
            <Badge variant="outline">private only</Badge>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70 bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserCog className="h-5 w-5 text-primary" />
              Editable profile controls
            </CardTitle>
            <CardDescription>
              The settings page edits the same record used by the member directory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
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
                  <Label>Status badge</Label>
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
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save settings'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/70 bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Privacy posture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Only approved, logged-in members can view profiles, events, resources, and collab.</p>
              <p>Minimal data is captured for onboarding and review, with LinkedIn as the primary proof.</p>
              <p>Telegram moderation activity is logged and mirrored in the admin fallback panel.</p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-white/90">
            <CardHeader>
              <CardTitle className="text-lg">Current snapshot</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>{settingsQuery.data?.approvalState ?? 'loading'}</Badge>
              <Badge variant="secondary">{settingsQuery.data?.polytechnic ?? 'SP'}</Badge>
              <Badge variant="outline">{settingsQuery.data?.role ?? 'member'}</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
