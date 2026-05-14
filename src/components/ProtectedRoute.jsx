import { Outlet } from 'react-router-dom'
import { useAuth } from '@/components/AuthContext'
import UserNotRegisteredError from '@/components/UserNotRegisteredError'

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
  </div>
)

export default function ProtectedRoute({
  fallback = <DefaultFallback />,
  unauthenticatedElement = null,
}) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError } = useAuth()

  if (isLoadingAuth || !authChecked) {
    return fallback
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />
  }

  if (!isAuthenticated) {
    return unauthenticatedElement
  }

  return <Outlet />
}
