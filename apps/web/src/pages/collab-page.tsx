import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, Plus, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/layout/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import type { CollabCreateInput } from '@/lib/domain'
import { collabTypes } from '@/lib/domain'
import { mockApi } from '@/lib/mock-api'
import { collabCreateSchema, type CollabCreateForm } from '@/lib/schemas'

export function CollabPage() {
  const queryClient = useQueryClient()
  const collabQuery = useQuery({
    queryKey: ['collab'],
    queryFn: () => mockApi.getCollabProjects(),
  })

  const form = useForm<CollabCreateForm>({
    resolver: zodResolver(collabCreateSchema),
    defaultValues: {
      title: '',
      type: 'project',
      description: '',
      neededRoles: 'Frontend, Design',
      neededSkills: 'React, Figma',
      deadline: '2026-04-30',
      teamSize: 4,
      contactLink: 'https://linkedin.com/in/',
    },
  })

  const createMutation = useMutation({
    mutationFn: mockApi.createCollabProject,
    onSuccess: async () => {
      form.reset()
      await queryClient.invalidateQueries({ queryKey: ['collab'] })
    },
  })

  const joinMutation = useMutation({
    mutationFn: mockApi.joinCollab,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['collab'] })
    },
  })

  const leaveMutation = useMutation({
    mutationFn: mockApi.leaveCollab,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['collab'] })
    },
  })

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Collab"
        title="Make starting a project feel clear, not awkward."
        description="Open a brief, define the roles, and let the right members opt in quickly."
        actions={
          <Badge variant="outline" className="h-11 px-4 text-sm normal-case tracking-[0.14em]">
            {collabQuery.data?.items.length ?? 0} active boards
          </Badge>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel rounded-[2rem] p-8">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <p className="font-display text-3xl font-semibold">Create a collaboration</p>
          </div>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Write enough for someone to decide in under a minute.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={form.handleSubmit((values) =>
              createMutation.mutate(values as CollabCreateInput),
            )}
          >
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...form.register('title')} placeholder="Team up for..." />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select {...form.register('type')}>
                {collabTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...form.register('description')} rows={4} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Needed roles</Label>
                <Input {...form.register('neededRoles')} />
              </div>
              <div className="space-y-2">
                <Label>Needed skills</Label>
                <Input {...form.register('neededSkills')} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input type="date" {...form.register('deadline')} />
              </div>
              <div className="space-y-2">
                <Label>Team size</Label>
                <Input type="number" min={2} max={20} {...form.register('teamSize')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contact link</Label>
              <Input {...form.register('contactLink')} />
            </div>
            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Open collaboration'}
            </Button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {collabQuery.data?.types.map((item) => (
              <div key={item.value} className="surface-panel rounded-[2rem] p-6">
                <p className="section-kicker">{item.value}</p>
                <p className="mt-2 font-display text-3xl font-semibold">{item.count}</p>
              </div>
            ))}
          </div>

          {collabQuery.data?.items.length ? (
            collabQuery.data.items.map((project) => (
              <div key={project.id} className="surface-panel card-float rounded-[2rem] p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{project.type}</Badge>
                      <Badge variant="outline">{project.status}</Badge>
                    </div>
                    <p className="mt-4 font-display text-3xl font-semibold">{project.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-muted/62 p-4 text-sm">
                    <p className="section-kicker">Created by</p>
                    <p className="mt-2 font-medium">{project.createdBy}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {project.neededRoles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))}
                  {project.neededSkills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {project.members.length}/{project.teamSize} members
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    deadline {project.deadline}
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => joinMutation.mutate(project.id)}
                    disabled={joinMutation.isPending}
                  >
                    Join
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => leaveMutation.mutate(project.id)}
                    disabled={leaveMutation.isPending}
                  >
                    Leave
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a href={project.contactLink} target="_blank" rel="noreferrer">
                      Contact
                    </a>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No collaborations yet"
              description="Create the first project, sprint, or hackathon team to get things moving."
            />
          )}
        </div>
      </section>
    </div>
  )
}
