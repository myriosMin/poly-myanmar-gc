import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, PlusCircle, ShieldCheck } from 'lucide-react'
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
import { resourceCategories } from '@/lib/domain'
import type { ResourceSubmissionInput } from '@/lib/domain'
import {
  resourceSubmissionSchema,
  type ResourceSubmissionForm,
} from '@/lib/schemas'

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

  const categoryPills = resourcesQuery.data?.categories ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="resources"
        title="Share links and keep them reviewable."
        description="Members can submit resource links with categories. The submission appears in a moderation queue before it becomes visible to everyone."
        actions={<Badge variant="outline">{resourcesQuery.data?.items.length ?? 0} approved</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border/70 bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PlusCircle className="h-5 w-5 text-primary" />
              Submit a resource
            </CardTitle>
            <CardDescription>
              Users can select categories and add custom ones without posting to a feed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="space-y-4"
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
                  placeholder="Custom categories, comma separated"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? 'Submitting...' : 'Send for approval'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/70 bg-white/90">
            <CardHeader>
              <CardTitle className="text-xl">Category overview</CardTitle>
              <CardDescription>
                Mirrors a server-side aggregation for quick browsing.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {categoryPills.map((item) => (
                <Badge key={item.value} variant="secondary">
                  {item.value} · {item.count}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {resourcesQuery.data?.items.map((resource) => (
              <Card key={resource.id} className="border-border/70 bg-white/90">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                      <CardDescription>{resource.description}</CardDescription>
                    </div>
                    <Badge variant={resource.status === 'approved' ? 'secondary' : 'outline'}>
                      {resource.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resource.categories.map((category) => (
                      <Badge key={category} variant="outline">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Submitted by {resource.submittedBy} · {new Date(resource.createdAt).toLocaleDateString()}
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <a href={resource.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {resourcesQuery.data?.submissions.length ? (
            <Card className="border-amber-200/80 bg-amber-50/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Pending submissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {resourcesQuery.data.submissions.map((resource) => (
                  <div key={resource.id} className="rounded-3xl border border-border bg-white p-4">
                    <p className="font-semibold">{resource.title}</p>
                    <p className="text-sm text-muted-foreground">{resource.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {!resourcesQuery.data?.items.length ? (
            <EmptyState
              title="No approved resources yet"
              description="Approved links will appear here after moderation."
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
