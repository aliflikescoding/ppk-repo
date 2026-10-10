import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { roles, useAuth } from '../auth/auth.js'
import SessionStatus from '../auth/SessionStatus.jsx'

export default function Login({ role }) {
  const { user, loading, error: sessionError, login } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const config = roles[role]

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending) return
    const values = new FormData(event.currentTarget)
    const email = values.get('email').trim()
    const password = values.get('password')
    if (new TextEncoder().encode(password).length > 72) {
      setError('Password must be at most 72 bytes.')
      return
    }
    setPending(true)
    setError('')
    try {
      await login({ email, password }, role)
      navigate(config.dashboard, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || (err.response ? 'Unable to sign in. Please try again.' : err.request ? 'Unable to reach the server. Please try again.' : err.message))
    } finally {
      setPending(false)
    }
  }

  if (loading || sessionError) return <SessionStatus />
  if (user) return <Navigate to={roles[user.role].dashboard} replace />

  return (
    <section className="card mx-auto max-w-md bg-base-100 shadow-sm">
      <div className="card-body">
        <h1 className="card-title text-2xl">{config.label} login</h1>
        <p>Sign in with your {config.label.toLowerCase()} account.</p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <fieldset disabled={pending} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block font-medium">Email</label>
              <input id="email" name="email" type="email" autoComplete="username" maxLength={50} required className="input w-full" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block font-medium">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="input w-full" />
            </div>
            {error && <p role="alert" className="text-error">{error}</p>}
            <button type="submit" className="btn btn-primary w-full">{pending ? 'Signing in…' : 'Sign in'}</button>
          </fieldset>
        </form>
        <nav aria-label="Other login options" className="mt-4 flex flex-wrap gap-4 text-sm">
          {Object.entries(roles).filter(([key]) => key !== role).map(([key, value]) => (
            <Link key={key} to={value.login} className="link link-primary">{value.label} login</Link>
          ))}
        </nav>
      </div>
    </section>
  )
}
