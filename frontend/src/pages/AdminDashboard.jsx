import { roles, useAuth } from '../auth/auth.js'
import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  const { user } = useAuth()
  return (
    <>
      <h1 className="text-3xl font-bold">{roles[user.role].label} dashboard</h1>
      <p className="mt-3">Welcome, {user.user_name}.</p>
      <p className="mt-2">Signed in as {user.email}.</p>
      <Link to="/admin/users" className="btn btn-primary mt-6">View users</Link>
    </>
  )
}
