import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell, PublicShell } from '@/components/layout/shell'
import { useSessionQuery } from '@/lib/query'
import type { Session } from '@/lib/domain'
import { AuthPage } from '@/pages/auth-page'
import { CompleteProfilePage } from '@/pages/complete-profile-page'
import { PendingApprovalPage } from '@/pages/pending-approval-page'
import { ProfilesPage } from '@/pages/profiles-page'
import { EventsPage } from '@/pages/events-page'
import { ResourcesPage } from '@/pages/resources-page'
import { CollabPage } from '@/pages/collab-page'
import { AdminPage } from '@/pages/admin-page'
import { SettingsPage } from '@/pages/settings-page'
import { LoadingScreen } from '@/components/layout/loading-screen'

const LegalPage = lazy(async () => {
  const module = await import('@/pages/legal-page')
  return { default: module.LegalPage }
})

function requiresProfileCompletion(session: Session): boolean {
  return !session.polytechnic || !session.course?.trim()
}

function RequireApproved({ children }: { children: ReactNode }) {
  const { data: session, isLoading } = useSessionQuery()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!session) {
    return <Navigate replace to="/auth" />
  }

  if (session.approvalState !== 'approved') {
    return <Navigate replace to="/pending-approval" />
  }

  if (requiresProfileCompletion(session)) {
    return <Navigate replace to="/complete-profile" />
  }

  return <>{children}</>
}

function RequirePendingApproval({ children }: { children: ReactNode }) {
  const { data: session, isLoading } = useSessionQuery()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!session) {
    return <Navigate replace to="/auth" />
  }

  if (session.approvalState === 'approved') {
    return <Navigate replace to={requiresProfileCompletion(session) ? '/complete-profile' : '/profiles'} />
  }

  return <>{children}</>
}

function RequireProfileCompletion({ children }: { children: ReactNode }) {
  const { data: session, isLoading } = useSessionQuery()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!session) {
    return <Navigate replace to="/auth" />
  }

  if (session.approvalState !== 'approved') {
    return <Navigate replace to="/pending-approval" />
  }

  if (!requiresProfileCompletion(session)) {
    return <Navigate replace to="/profiles" />
  }

  return <>{children}</>
}

function RequireReviewer({ children }: { children: ReactNode }) {
  const { data: session } = useSessionQuery()

  if (!session) {
    return <Navigate replace to="/auth" />
  }

  if (session.role === 'reviewer' || session.role === 'superadmin') {
    return <>{children}</>
  }

  return <Navigate replace to="/profiles" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate replace to="/auth" />} />
        <Route
          path="/auth"
          element={
            <PublicShell>
              <AuthPage />
            </PublicShell>
          }
        />
        <Route path="/privacy" element={<Navigate replace to="/legal/privacy" />} />
        <Route path="/terms" element={<Navigate replace to="/legal/terms" />} />
        <Route
          path="/pending-approval"
          element={
            <PublicShell>
              <RequirePendingApproval>
                <PendingApprovalPage />
              </RequirePendingApproval>
            </PublicShell>
          }
        />
        <Route
          path="/complete-profile"
          element={
            <PublicShell>
              <RequireProfileCompletion>
                <CompleteProfilePage />
              </RequireProfileCompletion>
            </PublicShell>
          }
        />
        <Route
          path="/legal/:slug"
          element={
            <PublicShell>
              <Suspense fallback={<LoadingScreen />}>
                <LegalPage />
              </Suspense>
            </PublicShell>
          }
        />
        <Route
          element={
            <RequireApproved>
              <AppShell />
            </RequireApproved>
          }
        >
          <Route index element={<Navigate replace to="/profiles" />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/collab" element={<CollabPage />} />
          <Route
            path="/admin"
            element={
              <RequireReviewer>
                <AdminPage />
              </RequireReviewer>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate replace to="/profiles" />} />
      </Routes>
    </BrowserRouter>
  )
}
