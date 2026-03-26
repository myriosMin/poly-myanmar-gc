import { Loader2 } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="surface-panel w-full max-w-lg bg-card/85 p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div>
            <p className="section-kicker">Private access</p>
            <p className="section-title mt-1">Loading Poly Myanmar</p>
            <p className="body-copy mt-2">
              Checking your approval state and preparing the member space.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
