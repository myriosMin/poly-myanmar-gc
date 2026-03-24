import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell, PublicShell } from '@/components/layout/shell'
import { useSessionQuery } from '@/lib/query'
import { AuthPage } from '@/pages/auth-page'
import { PendingApprovalPage } from '@/pages/pending-approval-page'
import { ProfilesPage } from '@/pages/profiles-page'
import { EventsPage } from '@/pages/events-page'
import { ResourcesPage } from '@/pages/resources-page'
import { CollabPage } from '@/pages/collab-page'
import { AdminPage } from '@/pages/admin-page'
import { SettingsPage } from '@/pages/settings-page'
import { LegalPage } from '@/pages/legal-page'
import { LoadingScreen } from '@/components/layout/loading-screen'

function RequireApproved({ children }: { children: ReactNode }) {
  const { data: session, isLoading } = useSessionQuery()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!session || session.approvalState !== 'approved') {
    return <Navigate replace to="/pending-approval" />
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
        <Route
          path="/auth"
          element={
            <PublicShell>
              <AuthPage />
            </PublicShell>
          }
        />
        <Route
          path="/pending-approval"
          element={
            <PublicShell>
              <PendingApprovalPage />
            </PublicShell>
          }
        />
        <Route
          path="/legal/:slug"
          element={
            <PublicShell>
              <LegalPage />
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
