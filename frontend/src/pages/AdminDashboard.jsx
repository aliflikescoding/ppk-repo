import { roles, useAuth } from '../auth/auth.js'
import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  const { user } = useAuth()
  return (
    <>
      <h1 className="text-3xl font-bold">{roles[user.role].label} dashboard</h1>
      <p className="mt-3">Welcome, {user.user_name}.</p>
      <p className="mt-2">Signed in as {user.email}.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/admin/facility-recap" className="btn btn-primary">Rekap okupansi &amp; kerusakan</Link>
        <Link to="/admin/facility-types" className="btn">Manage facility types</Link>
        <Link to="/admin/facility-locations" className="btn">Manage facility locations</Link>
        <Link to="/admin/facilities" className="btn btn-primary">View facilities</Link>
        <Link to="/admin/reservations" className="btn btn-primary">View reservations</Link>
        <Link to="/admin/reports" className="btn btn-primary">View reports</Link>
        <Link to="/admin/report-categories" className="btn">Manage report categories</Link>
        <Link to="/admin/users" className="btn btn-primary">View users</Link>
        <Link to="/admin/approve-users" className="btn btn-success">Approve users</Link>
      </div>
    </>
  )
}
