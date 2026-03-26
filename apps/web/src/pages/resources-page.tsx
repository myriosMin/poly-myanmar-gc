import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Filter, PlusCircle, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/layout/empty-state'
import { HeaderSocialLinks } from '@/components/layout/header-social-links'
import { FullscreenModal, MobileDrawer } from '@/components/layout/overlay'
import { PageHeader } from '@/components/layout/page-header'
import type { ResourceSubmissionInput } from '@/lib/domain'
import { resourceCategories } from '@/lib/domain'
import { mockApi } from '@/lib/mock-api'
import { resourceSubmissionSchema, type ResourceSubmissionForm } from '@/lib/schemas'
import { cn } from '@/lib/utils'

function ResourceModal({
  form,
  selectedCategories,
  setSelectedCategories,
  submitMutation,
  onSubmit,
  onClose,
}: {
  form: ReturnType<typeof useForm<ResourceSubmissionForm>>
  selectedCategories: string[]
  setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>
  submitMutation: { isPending: boolean }
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <FullscreenModal open onClose={onClose} eyebrow="Share a resource" title="Post something useful">
      <p className="body-copy max-w-md">
        Share something practical that another member can act on quickly.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input {...form.register('title')} placeholder="Interview prep notes" />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input {...form.register('url')} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea {...form.register('description')} rows={4} />
              </div>
              <div className="space-y-3">
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {resourceCategories.map((category) => {
                    const active = selectedCategories.includes(category)
                    return (
                      <Button
                        key={category}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          setSelectedCategories((current) =>
                            current.includes(category)
                              ? current.filter((item) => item !== category)
                              : [...current, category],
                          )
                        }
                      >
                        {category}
                      </Button>
                    )
                  })}
                </div>
                <Input
                  {...form.register('categoryInput')}
                  placeholder="Add custom categories, separated by commas"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? 'Submitting...' : 'Share with the club'}
              </Button>
      </form>
    </FullscreenModal>
  )
}

export function ResourcesPage() {
  const queryClient = useQueryClient()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const resourcesQuery = useQuery({
    queryKey: ['resources'],
    queryFn: () => mockApi.getResources(),
  })

  const form = useForm<ResourceSubmissionForm>({
    resolver: zodResolver(resourceSubmissionSchema),
    defaultValues: {
      title: '',
      url: '',
      description: '',
      categoryInput: '',
    },
  })

  const submitMutation = useMutation({
    mutationFn: mockApi.submitResource,
    onSuccess: async () => {
      setSelectedCategories([])
      form.reset()
      setShowCreateModal(false)
      await queryClient.invalidateQueries({ queryKey: ['resources'] })
    },
  })

  const filteredResources = useMemo(() => {
    if (!resourcesQuery.data?.items) {
      return []
    }

    if (!categoryFilter) {
      return resourcesQuery.data.items
    }

    return resourcesQuery.data.items.filter((resource) =>
      resource.categories.includes(categoryFilter),
    )
  }, [categoryFilter, resourcesQuery.data?.items])

  const sidebar = (
    <div className="filter-panel sticky-rail">
      <div className="flex items-start justify-between gap-4 lg:block">
        <div>
          <p className="section-kicker">Resource category</p>
          <p className="section-title mt-3">Filter resources</p>
          <p className="body-copy mt-2">
            Narrow the list to the kind of help you need right now.
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
            setCategoryFilter('')
            setShowMobileSidebar(false)
          }}
          className={cn(
            'filter-option',
            categoryFilter === '' && 'filter-option-active',
          )}
        >
          <p className="text-sm font-semibold">All resources</p>
          <p
            className={cn(
              'mt-1 text-sm',
              categoryFilter === '' ? 'text-primary-foreground/78' : 'text-muted-foreground',
            )}
          >
            {resourcesQuery.data?.items.length ?? 0} total
          </p>
        </button>

        {resourcesQuery.data?.categories
          .filter((item) => item.count > 0)
          .map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setCategoryFilter(item.value)
                setShowMobileSidebar(false)
              }}
              className={cn(
                'filter-option',
                categoryFilter === item.value && 'filter-option-active',
              )}
            >
              <p className="text-sm font-semibold">{item.value}</p>
              <p
                className={cn(
                  'mt-1 text-sm',
                  categoryFilter === item.value
                    ? 'text-primary-foreground/78'
                    : 'text-muted-foreground',
                )}
              >
                {item.count} resource{item.count === 1 ? '' : 's'}
              </p>
            </button>
          ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resources"
        title="Keep useful links in one calm, searchable place."
        description="Scan by category, open what matters, and post only resources another member would realistically reuse."
        actions={
          <>
            <HeaderSocialLinks />
            <Badge variant="outline" className="h-11 px-4 text-sm normal-case tracking-[0.14em]">
              {filteredResources.length} visible
            </Badge>
            <Button type="button" variant="outline" className="h-11 px-4 lg:hidden" onClick={() => setShowMobileSidebar(true)}>
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
            <Button type="button" className="h-11 px-4" onClick={() => setShowCreateModal(true)}>
              <PlusCircle className="h-4 w-4" />
              Post resource
            </Button>
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden lg:block">{sidebar}</aside>

        <div className="space-y-4">
          {filteredResources.length ? (
            filteredResources.map((resource) => (
              <div key={resource.id} className="content-row">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-2xl">
                    <p className="font-display text-3xl font-semibold">{resource.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{resource.description}</p>
                  </div>
                  <Badge variant="outline">{resource.status}</Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {resource.categories.map((category) => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Shared by {resource.submittedBy} •{' '}
                    {new Date(resource.createdAt).toLocaleDateString()}
                  </p>
                  <Button asChild variant="outline">
                    <a href={resource.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </a>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No resources match this filter"
              description="Try another category to widen the list."
              actionLabel="Show all resources"
              onAction={() => setCategoryFilter('')}
            />
          )}
        </div>
      </section>

      <MobileDrawer open={showMobileSidebar} onClose={() => setShowMobileSidebar(false)}>
        {sidebar}
      </MobileDrawer>

      {showCreateModal ? (
        <ResourceModal
          form={form}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          submitMutation={submitMutation}
          onSubmit={form.handleSubmit((values) =>
            submitMutation.mutate({
              title: values.title,
              url: values.url,
              description: values.description,
              categories: [
                ...selectedCategories,
                ...(values.categoryInput ?? '')
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              ],
            } as ResourceSubmissionInput),
          )}
          onClose={() => setShowCreateModal(false)}
        />
      ) : null}
    </div>
  )
}
