import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { roles, useAuth } from '../auth/auth.js'
import SessionStatus from '../auth/SessionStatus.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import { loginSchema } from '../validation/user.js'

export default function Login({ role }) {
  const { user, loading, error: sessionError, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const config = roles[role]
  const returnTo = role === 'user' && /^\/facilities\/[1-9]\d*\/(report|reserve)$/.test(location.state?.returnTo || '') ? location.state.returnTo : config.dashboard
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values) {
    clearErrors('root')
    try {
      await login(values, role)
      navigate(returnTo, { replace: true })
    } catch (err) {
      setError('root.server', {
        message: err.response?.data?.message || (err.response ? 'Unable to sign in. Please try again.' : err.request ? 'Unable to reach the server. Please try again.' : err.message),
      })
    }
  }

  if (loading || sessionError) return <SessionStatus />
  if (user) return <Navigate to={user.role === role ? returnTo : roles[user.role].dashboard} replace />

  return (
    <AuthLayout>
      <div className="auth-form-content">
        <p className="auth-eyebrow">{config.label} portal</p>
        <h1 className="auth-title">Welcome back.</h1>
        <p className="auth-description">Sign in with your {config.label.toLowerCase()} account to pick up where you left off.</p>
        <form className="auth-form mt-8 space-y-4" noValidate onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
          <fieldset disabled={isSubmitting} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block font-medium">Email</label>
              <input id="email" type="email" autoComplete="username" className="input w-full" placeholder="you@example.com"
                {...register('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
              {errors.email && <p id="email-error" role="alert" className="mt-1 text-sm text-error">{errors.email.message}</p>}
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block font-medium">Password</label>
              <input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" className="input w-full"
                {...register('password')} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} />
              {errors.password && <p id="password-error" role="alert" className="mt-1 text-sm text-error">{errors.password.message}</p>}
            </div>
            {errors.root?.server && <p role="alert" className="text-error">{errors.root.server.message}</p>}
            <button type="submit" className="btn auth-submit w-full">{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
          </fieldset>
        </form>
        {role === 'user' && (
          <p className="mt-6 text-center text-sm">Don’t have an account? <Link to="/register" className="link link-primary">Register</Link></p>
        )}
        <nav aria-label="Other login options" className="auth-other-options">
          {Object.entries(roles).filter(([key]) => key !== role).map(([key, value]) => (
            <Link key={key} to={value.login} className="link link-primary">{value.label} login</Link>
          ))}
        </nav>
      </div>
    </AuthLayout>
  )
}
