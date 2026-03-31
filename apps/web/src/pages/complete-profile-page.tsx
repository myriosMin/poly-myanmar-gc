import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GraduationCap } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/page-header'
import { api } from '@/lib/api'
import { polytechnics } from '@/lib/domain'

const completeProfileSchema = z.object({
  polytechnic: z.enum(polytechnics),
  course: z.string().min(2, 'Course is required'),
})

type CompleteProfileForm = z.input<typeof completeProfileSchema>

export function CompleteProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const form = useForm<CompleteProfileForm>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      polytechnic: 'SP',
      course: '',
    },
  })

  const completeMutation = useMutation({
    mutationFn: (values: CompleteProfileForm) =>
      api.updateSettings({
        polytechnic: values.polytechnic,
        course: values.course,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      navigate('/profiles')
    },
  })

  const selectedPolytechnic = form.watch('polytechnic')

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="One more step"
        title="Complete your profile to enter the network."
        description="Polytechnic and course are required for member discovery. Everything else can be added later in settings."
        actions={<Badge variant="secondary">Required now</Badge>}
      />

      <section className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="surface-panel p-4 sm:p-6 lg:p-8">
          <form
            className="grid gap-4"
            noValidate
            onSubmit={form.handleSubmit((values) => completeMutation.mutate(values))}
          >
            {completeMutation.error instanceof Error ? (
              <div className="rounded-2xl border border-destructive/35 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {completeMutation.error.message}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Polytechnic</Label>
              <div className="flex flex-wrap gap-2">
                {polytechnics.map((polytechnic) => {
                  const active = selectedPolytechnic === polytechnic
                  return (
                    <Button
                      key={polytechnic}
                      type="button"
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      className="rounded-full px-4"
                      onClick={() =>
                        form.setValue('polytechnic', polytechnic, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    >
                      {polytechnic}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Course</Label>
              <Input {...form.register('course')} placeholder="Diploma in Information Technology" />
              {form.formState.errors.course?.message ? (
                <p className="text-xs text-destructive">{form.formState.errors.course.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="mt-2 w-full md:w-auto" disabled={completeMutation.isPending}>
              {completeMutation.isPending ? 'Saving...' : 'Save and continue'}
            </Button>
          </form>
        </div>

        <div className="surface-panel bg-primary p-4 sm:p-6 lg:p-8 text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
          <p className="section-title mt-4 text-primary-foreground">Why we ask these two fields</p>
          <p className="body-copy mt-3 text-primary-foreground/80">
            The member directory and collab matching depend on school and course context. You can
            keep other profile details empty until you are ready.
          </p>
        </div>
      </section>
    </div>
  )
}
