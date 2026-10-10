import { Navigate, Outlet } from 'react-router-dom'
import { roles, useAuth } from './auth.js'
import SessionStatus from './SessionStatus.jsx'

export default function ProtectedRoute({ role }) {
  const { user, loading, error } = useAuth()
  if (loading || error) return <SessionStatus />
  if (!user) return <Navigate to={roles[role].login} replace />
  if (user.role !== role) return <Navigate to={roles[user.role].dashboard} replace />
  return <Outlet />
}
