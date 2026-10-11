import PageHeading from '../components/PageHeading.jsx'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import { createUser } from '../api/index.js'
import { roles } from '../auth/auth.js'
import { createUserSchema } from '../validation/user.js'

export default function CreateUser() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: { user_name: '', email: '', password: '', role: 'user' },
  })

  async function onSubmit(values) {
    clearErrors('root')
    try {
      await createUser(values)
      toast.success('User created successfully.')
      navigate('/admin/users')
    } catch (error) {
      setError('root.server', {
        message: error.response?.data?.message || 'Unable to create user. Please try again.',
      })
    }
  }

  return (
    <div className="workspace-page workspace-form-page">
      <Link to="/admin/users" className="auth-back">← Back to users</Link>
      <section className="workspace-panel mt-4">
        <div className="workspace-panel-body">
          <PageHeading>Create user</PageHeading>
          <p>Add a new account and choose its role.</p>
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
                <p id="password-hint" className="mt-1 text-sm">At least 8 characters and at most 72 bytes.</p>
                {errors.password && <p id="password-error" role="alert" className="mt-1 text-sm text-error">{errors.password.message}</p>}
              </div>
              <div>
                <label htmlFor="user-role" className="mb-1 block font-medium">Role</label>
                <select id="user-role" className="select w-full" {...register('role')}
                  aria-invalid={Boolean(errors.role)} aria-describedby={errors.role ? 'role-error' : undefined}>
                  {Object.entries(roles).filter(([value]) => value !== 'admin').map(([value, role]) => <option key={value} value={value}>{role.label}</option>)}
                </select>
                {errors.role && <p id="role-error" role="alert" className="mt-1 text-sm text-error">{errors.role.message}</p>}
              </div>
              {errors.root?.server && <p role="alert" className="text-error">{errors.root.server.message}</p>}
              <button type="submit" className="btn auth-submit w-full">{isSubmitting ? 'Creating user…' : 'Create user'}</button>
            </fieldset>
          </form>
        </div>
      </section>
    </div>
  )
}
