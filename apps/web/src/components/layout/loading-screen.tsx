import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg bg-card/85">
        <CardContent className="flex items-center gap-4 p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div>
            <p className="section-kicker">Private access</p>
            <p className="mt-1 font-display text-2xl font-semibold">Loading Poly Myanmar</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Checking your approval state and preparing the member space.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
