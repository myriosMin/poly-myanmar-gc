import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md">
        <CardContent className="flex items-center gap-3 p-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="font-display text-lg font-semibold">Loading member hub</p>
            <p className="text-sm text-muted-foreground">
              Checking access, approvals, and private workspace state.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
