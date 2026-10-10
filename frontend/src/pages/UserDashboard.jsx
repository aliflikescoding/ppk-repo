import { useAuth } from '../auth/auth.js'

export default function UserDashboard() {
  const { user } = useAuth()
  const label = 'User'

  return (
    <section className="card mx-auto max-w-2xl border border-base-300 bg-base-100 shadow-sm">
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
  )
}
