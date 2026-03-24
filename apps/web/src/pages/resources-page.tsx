import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, PlusCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/layout/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import type { ResourceSubmissionInput } from '@/lib/domain'
import { resourceCategories } from '@/lib/domain'
import { mockApi } from '@/lib/mock-api'
import { resourceSubmissionSchema, type ResourceSubmissionForm } from '@/lib/schemas'

export function ResourcesPage() {
  const queryClient = useQueryClient()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
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
      await queryClient.invalidateQueries({ queryKey: ['resources'] })
    },
  })

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resources"
        title="Keep only what members will realistically reuse."
        description="Internship trackers, interview notes, and practical links belong here. Everything else should stay out."
        actions={
          <Badge variant="outline" className="h-11 px-4 text-sm normal-case tracking-[0.14em]">
            {resourcesQuery.data?.items.length ?? 0} visible
          </Badge>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel rounded-[2rem] p-8">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            <p className="font-display text-3xl font-semibold">Share a resource</p>
          </div>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Keep submissions practical, concise, and easy to trust.
          </p>

          <form
            className="mt-6 space-y-4"
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
          >
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
        </div>

        <div className="space-y-4">
          <div className="surface-panel rounded-[2rem] p-6">
            <div className="flex flex-wrap gap-2">
              {resourcesQuery.data?.categories.map((item) => (
                <Badge key={item.value} variant="secondary">
                  {item.value} · {item.count}
                </Badge>
              ))}
            </div>
          </div>

          {resourcesQuery.data?.items.length ? (
            resourcesQuery.data.items.map((resource) => (
              <div key={resource.id} className="surface-panel card-float rounded-[2rem] p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-2xl">
                    <p className="font-display text-3xl font-semibold">{resource.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{resource.description}</p>
                  </div>
                  <Badge variant="outline">{resource.status}</Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {resource.categories.map((category) => (
                    <Badge key={category} variant="outline">
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
              title="No resources yet"
              description="Useful links and notes will appear here once members start sharing them."
            />
          )}
        </div>
      </section>
    </div>
  )
}
