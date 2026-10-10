import { roles, useAuth } from '../auth/auth.js'

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <>
      <h1 className="text-3xl font-bold">{roles[user.role].label} dashboard</h1>
      <p className="mt-3">Welcome, {user.user_name}.</p>
      <p className="mt-2">Signed in as {user.email}.</p>
    </>
  )
}
