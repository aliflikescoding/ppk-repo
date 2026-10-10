import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import { readUserById, updateUser } from '../api/index.js'
import { roles } from '../auth/auth.js'
import { updateUserSchema } from '../validation/user.js'

export default function UpdateUser() {
  const { id } = useParams()
  return <UpdateUserForm key={id} id={id} />
}

function UpdateUserForm({ id }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const navigate = useNavigate()
  const {
    register,
    reset,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { user_name: '', email: '', password: '', role: 'user' },
  })

  useEffect(() => {
    let active = true
    async function loadUser() {
      try {
        const user = await readUserById(id)
        if (!active) return
        setProfile(user)
        reset({ user_name: user.user_name, email: user.email, password: '', role: user.role === 'admin' ? undefined : user.role })
      } catch (error) {
        if (active) setLoadError(error.response?.data?.message || 'Unable to load user. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadUser()
    return () => { active = false }
  }, [id, reset, attempt])

  async function onSubmit(values) {
    clearErrors('root')
    try {
      const data = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined))
      await updateUser(id, data)
      toast.success('User updated successfully.')
      navigate('/admin/users')
    } catch (error) {
      setError('root.server', {
        message: error.response?.data?.message || 'Unable to update user. Please try again.',
      })
    }
  }

  if (loading || loadError) return (
    <div className="mx-auto w-full max-w-lg">
      <Link to="/admin/users" className="link link-primary">Back to users</Link>
      {loading ? <p className="mt-4" role="status">Loading user…</p> : (
        <div className="mt-4" role="alert">
          <p>{loadError}</p>
          <button type="button" className="btn mt-3" onClick={() => {
            setLoading(true)
            setLoadError('')
            setAttempt((value) => value + 1)
          }}>Try again</button>
        </div>
      )}
    </div>
  )

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link to="/admin/users" className="link link-primary">Back to users</Link>
      <section className="card mt-4 border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
          <h1 className="text-3xl font-bold">Update user</h1>
          <p>Edit the account details below.</p>
          <form className="mt-4" noValidate onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
            <fieldset disabled={isSubmitting} className="space-y-4">
              <div>
                <label htmlFor="user-name" className="mb-1 block font-medium">Name</label>
                <input id="user-name" type="text" autoComplete="off" className="input w-full"
                  {...register('user_name')} aria-invalid={Boolean(errors.user_name)} aria-describedby={errors.user_name ? 'name-error' : undefined} />
                {errors.user_name && <p id="name-error" role="alert" className="mt-1 text-sm text-error">{errors.user_name.message}</p>}
              </div>
              <div>
                <label htmlFor="user-email" className="mb-1 block font-medium">Email</label>
                <input id="user-email" type="email" autoComplete="off" className="input w-full"
                  {...register('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />
                {errors.email && <p id="email-error" role="alert" className="mt-1 text-sm text-error">{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="user-password" className="mb-1 block font-medium">Password</label>
                <input id="user-password" type="password" autoComplete="new-password" className="input w-full"
                  {...register('password')} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-hint password-error' : 'password-hint'} />
                <p id="password-hint" className="mt-1 text-sm">Leave blank to keep the current password. New passwords must be at least 8 characters and at most 72 bytes.</p>
                {errors.password && <p id="password-error" role="alert" className="mt-1 text-sm text-error">{errors.password.message}</p>}
              </div>
              <div>
                <label htmlFor="user-role" className="mb-1 block font-medium">Role</label>
                {profile.role === 'admin' ? <p id="user-role">Admin</p> : <select id="user-role" className="select w-full" {...register('role')}
                  aria-invalid={Boolean(errors.role)} aria-describedby={errors.role ? 'role-error' : undefined}>
                  {Object.entries(roles).filter(([value]) => value !== 'admin').map(([value, role]) => <option key={value} value={value}>{role.label}</option>)}
                </select>}
                {errors.role && <p id="role-error" role="alert" className="mt-1 text-sm text-error">{errors.role.message}</p>}
              </div>
              {errors.root?.server && <p role="alert" className="text-error">{errors.root.server.message}</p>}
              <button type="submit" className="btn btn-primary w-full">{isSubmitting ? 'Saving changes…' : 'Save changes'}</button>
            </fieldset>
          </form>
        </div>
      </section>
    </div>
  )
}
