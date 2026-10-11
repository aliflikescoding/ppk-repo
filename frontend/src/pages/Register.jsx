import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerUser } from '../api/index.js'
import { roles, useAuth } from '../auth/auth.js'
import SessionStatus from '../auth/SessionStatus.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi'
import { registerSchema } from '../validation/user.js'

export default function Register() {
  const { user, loading, error: sessionError } = useAuth()
  const [registered, setRegistered] = useState(false)
  const {
    register,
    reset,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { user_name: '', email: '', password: '' },
  })

  async function onSubmit(values) {
    clearErrors('root')
    try {
      await registerUser(values)
      reset()
      setRegistered(true)
    } catch (error) {
      setError('root.server', {
        message: error.response?.data?.message || 'Unable to register. Please try again.',
      })
    }
  }

  if (loading || sessionError) return <SessionStatus />
  if (user) return <Navigate to={roles[user.role].dashboard} replace />
  if (registered) return (
    <AuthLayout registration>
      <div className="auth-form-content">
        <FiCheckCircle className="mb-6 text-5xl text-success" aria-hidden="true" />
        <h1 className="auth-title">You’re on the list.</h1>
        <p role="status">Your account has been created. An admin must activate it before you can sign in.</p>
        <Link to="/login" className="btn auth-submit mt-6">Back to login</Link>
      </div>
    </AuthLayout>
  )

  return (
    <AuthLayout registration>
      <Link to="/login" className="auth-back"><FiArrowLeft aria-hidden="true" /> Back to login</Link>
      <section>
        <div className="auth-form-content">
          <p className="auth-eyebrow">JOIN YOUR CAMPUS COMMUNITY</p>
          <h1 className="auth-title">Make yourself at home.</h1>
          <p className="auth-description">Create your account to reserve spaces and report issues. An admin will approve your account before you can sign in.</p>
          <form className="auth-form mt-6" noValidate onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
            <fieldset disabled={isSubmitting} className="space-y-4">
              <div>
                <label htmlFor="user-name" className="mb-1 block font-medium">Name</label>
                <input id="user-name" type="text" autoComplete="username" placeholder="Your name" className="input w-full"
                  {...register('user_name')} aria-invalid={Boolean(errors.user_name)} aria-describedby={errors.user_name ? 'name-error' : undefined} />
                {errors.user_name && <p id="name-error" role="alert" className="mt-1 text-sm text-error">{errors.user_name.message}</p>}
              </div>
              <div>
                <label htmlFor="user-email" className="mb-1 block font-medium">Email</label>
                <input id="user-email" type="email" autoComplete="email" placeholder="you@example.com" className="input w-full"
                  {...register('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
                {errors.email && <p id="email-error" role="alert" className="mt-1 text-sm text-error">{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="user-password" className="mb-1 block font-medium">Password</label>
                <input id="user-password" type="password" autoComplete="new-password" placeholder="Create a password" className="input w-full"
                  {...register('password')} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-hint password-error' : 'password-hint'} />
                <p id="password-hint" className="mt-1 text-sm">At least 8 characters and at most 72 bytes.</p>
                {errors.password && <p id="password-error" role="alert" className="mt-1 text-sm text-error">{errors.password.message}</p>}
              </div>
              {errors.root?.server && <p role="alert" className="text-error">{errors.root.server.message}</p>}
              <button type="submit" className="btn auth-submit w-full">{isSubmitting ? 'Registering…' : 'Create account'}</button>
            </fieldset>
          </form>
        </div>
      </section>
    </AuthLayout>
  )
}
