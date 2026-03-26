import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Filter, Link2, Plus, Users, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/layout/empty-state'
import { HeaderSocialLinks } from '@/components/layout/header-social-links'
import { FullscreenModal, MobileDrawer } from '@/components/layout/overlay'
import { PageHeader } from '@/components/layout/page-header'
import type { CollabCreateInput } from '@/lib/domain'
import { collabTypes } from '@/lib/domain'
import { mockApi } from '@/lib/mock-api'
import { collabCreateSchema, type CollabCreateForm } from '@/lib/schemas'
import { cn } from '@/lib/utils'

function CollabModal({
  form,
  createMutation,
  onSubmit,
  onClose,
}: {
  form: ReturnType<typeof useForm<CollabCreateForm>>
  createMutation: { isPending: boolean }
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <FullscreenModal open onClose={onClose} eyebrow="Create collaboration" title="Post a new board">
      <p className="body-copy max-w-md">
        Share enough context for someone to decide quickly whether to join.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
    </FullscreenModal>
  )
}

export function CollabPage() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
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
      setShowCreateModal(false)
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

  const filteredProjects = useMemo(() => {
    const items = collabQuery.data?.items ?? []

    if (!typeFilter) {
      return items
    }

    return items.filter((project) => project.type === typeFilter)
  }, [collabQuery.data?.items, typeFilter])

  const sidebar = (
    <div className="filter-panel sticky-rail">
      <div className="flex items-start justify-between gap-4 lg:block">
        <div>
          <p className="section-kicker">Collab type</p>
          <p className="section-title mt-3">Filter boards</p>
          <p className="body-copy mt-2">
            Browse by the kind of collaboration you want to join.
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
          aria-label="Close filters"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            setTypeFilter('')
            setShowMobileSidebar(false)
          }}
          className={cn(
            'filter-option',
            typeFilter === '' && 'filter-option-active',
          )}
        >
          <p className="text-sm font-semibold">All boards</p>
          <p
            className={cn(
              'mt-1 text-sm',
              typeFilter === '' ? 'text-primary-foreground/78' : 'text-muted-foreground',
            )}
          >
            {collabQuery.data?.items.length ?? 0} total
          </p>
        </button>

        {collabQuery.data?.types
          .filter((item) => item.count > 0)
          .map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setTypeFilter(item.value)
                setShowMobileSidebar(false)
              }}
              className={cn(
                'filter-option',
                typeFilter === item.value && 'filter-option-active',
              )}
            >
              <p className="text-sm font-semibold">{item.value}</p>
              <p
                className={cn(
                  'mt-1 text-sm',
                  typeFilter === item.value
                    ? 'text-primary-foreground/78'
                    : 'text-muted-foreground',
                )}
              >
                {item.count} board{item.count === 1 ? '' : 's'}
              </p>
            </button>
          ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Collab"
        title="Start with the right brief, then let people opt in."
        description="Filter the board by type, scan the essentials, and post a new collaboration only when you have clear context."
        actions={
          <>
            <HeaderSocialLinks />
            <Badge variant="outline" className="h-11 px-4 text-sm normal-case tracking-[0.14em]">
              {filteredProjects.length} visible
            </Badge>
            <Button type="button" variant="outline" className="h-11 px-4 lg:hidden" onClick={() => setShowMobileSidebar(true)}>
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
            <Button type="button" className="h-11 px-4" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              Post collab
            </Button>
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">{sidebar}</aside>

        <div className="space-y-4">
          {filteredProjects.length ? (
            filteredProjects.map((project) => (
              <div key={project.id} className="content-row">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{project.type}</Badge>
                      <Badge variant="outline">{project.status}</Badge>
                    </div>
                    <p className="mt-4 font-display text-3xl font-semibold">{project.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
                  </div>
                  <div className="meta-block">
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
              title="No boards match this filter"
              description="Try another type to widen the collaboration board."
              actionLabel="Show all boards"
              onAction={() => setTypeFilter('')}
            />
          )}
        </div>
      </section>

      <MobileDrawer open={showMobileSidebar} onClose={() => setShowMobileSidebar(false)}>
        {sidebar}
      </MobileDrawer>

      {showCreateModal ? (
        <CollabModal
          form={form}
          createMutation={createMutation}
          onSubmit={form.handleSubmit((values) =>
            createMutation.mutate(values as CollabCreateInput),
          )}
          onClose={() => setShowCreateModal(false)}
        />
      ) : null}
    </div>
  )
}
