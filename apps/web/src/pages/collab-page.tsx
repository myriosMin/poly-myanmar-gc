import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Github, Link2, Plus, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/layout/empty-state'
import { mockApi } from '@/lib/mock-api'
import { collabTypes } from '@/lib/domain'
import type { CollabCreateInput } from '@/lib/domain'
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="collab"
        title="Teams for hackathons, projects, open source, and startup ideas."
        description="The board is intentionally structured for collaboration, not open-ended social posting. Users create a project, join existing teams, or leave when plans change."
        actions={<Badge variant="outline">{collabQuery.data?.items.length ?? 0} projects</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/70 bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Plus className="h-5 w-5 text-primary" />
              Create a collaboration
            </CardTitle>
            <CardDescription>
              Use commas to add needed roles and skills. No comment threads or messaging.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="space-y-4"
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
                <select
                  className="h-10 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                  {...form.register('type')}
                >
                  {collabTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
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
                {createMutation.isPending ? 'Creating...' : 'Create collaboration'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/70 bg-white/90">
            <CardHeader>
              <CardTitle className="text-xl">Project board</CardTitle>
              <CardDescription>Join or leave with one action. No in-app messages.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {collabQuery.data?.types.map((item) => (
                <div key={item.value} className="rounded-3xl border border-border bg-muted p-4">
                  <p className="text-sm text-muted-foreground">{item.value}</p>
                  <p className="font-display text-2xl font-bold">{item.count}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {collabQuery.data?.items.length ? (
            <div className="space-y-4">
              {collabQuery.data.items.map((project) => (
                <Card key={project.id} className="border-border/70 bg-white/90">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                        <CardDescription>{project.description}</CardDescription>
                      </div>
                      <Badge variant="secondary">{project.type}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        {project.members.length}/{project.teamSize} members
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-primary" />
                        deadline {project.deadline}
                      </span>
                      <span>created by {project.createdBy}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => joinMutation.mutate(project.id)}
                        disabled={joinMutation.isPending}
                      >
                        Join
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => leaveMutation.mutate(project.id)}
                        disabled={leaveMutation.isPending}
                      >
                        Leave
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <a href={project.contactLink} target="_blank" rel="noreferrer">
                          <Github className="h-4 w-4" />
                          Contact
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No collabs yet"
              description="Create the first team or open source sprint to get the board moving."
            />
          )}
        </div>
      </div>
    </div>
  )
}
