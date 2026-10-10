import { Link } from 'react-router-dom'
import { useAuth } from '../auth/auth.js'

export default function UserDashboard() {
  const { user } = useAuth()
  const label = 'User'

  return (
    <div className="mx-auto max-w-4xl">
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body">
        <h1 className="text-3xl font-bold">{label} dashboard</h1>
        <p className="mt-3 text-lg">Hello, {user.user_name}.</p>
        <p>Welcome to your {label.toLowerCase()} dashboard.</p>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="font-semibold">Email</dt>
            <dd className="break-words">{user.email}</dd>
          </div>
          <div>
            <dt className="font-semibold">Role</dt>
            <dd>{label}</dd>
          </div>
        </dl>
      </div>
    </section>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link to="/user/reports" className="btn btn-primary">Report history</Link>
      <Link to="/user/reservations" className="btn btn-primary">Reservation history</Link>
    </div>
    </div>
  )
}
