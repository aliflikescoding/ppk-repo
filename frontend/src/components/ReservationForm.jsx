import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { readAllFacilities, readAllUsers } from '../api/index.js'
import { buildReservationData, buildUserReservationData, reservationSchema, reservationStatuses, toJakartaInput } from '../validation/reservation.js'

export default function ReservationForm({ reservation, facility, userSubmission = false, onSave }) {
  const [options, setOptions] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const { register, handleSubmit, setError: setFormError, clearErrors, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(reservationSchema),
    defaultValues: { facility_id: reservation?.facility_id ?? facility?.id ?? '', start_time: toJakartaInput(reservation?.start_time), end_time: toJakartaInput(reservation?.end_time), status: reservation?.status ?? 'new', reason: reservation?.reason ?? '', user_id: '' },
  })
  useEffect(() => {
    let active = true
    Promise.all([facility ? Promise.resolve([facility]) : readAllFacilities(), reservation || userSubmission ? Promise.resolve([]) : readAllUsers()]).then(([facilities, users]) => {
      if (active) setOptions({ facilities, users })
    }).catch((err) => { if (active) setError(err.response?.data?.message || 'Unable to load reservation options.') })
    return () => { active = false }
  }, [reservation, facility, userSubmission, attempt])
  async function submit(values) {
    clearErrors('root')
    try {
      const data = userSubmission ? buildUserReservationData(values) : buildReservationData(values, Boolean(reservation))
      if (reservation) {
        // Status-only changes should release a slot without rechecking unchanged times.
        for (const key of ['facility_id', 'status', 'reason']) if (data[key] === reservation[key]) delete data[key]
        for (const key of ['start_time', 'end_time']) if (new Date(data[key]).getTime() === new Date(reservation[key]).getTime()) delete data[key]
      }
      await onSave(data)
    }
    catch (err) { setFormError('root.server', { message: err.response?.data?.message || 'Unable to save reservation. Please try again.' }) }
  }
  const fieldError = (name) => errors[name] && <p id={`${name}-error`} role="alert" className="text-sm text-error">{errors[name].message}</p>
  const accessibility = (name) => ({ 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : undefined })
  return <form className="mt-4" noValidate onSubmit={handleSubmit(submit)} aria-busy={isSubmitting}>
    <fieldset disabled={isSubmitting} className="space-y-4">
      {error ? <div role="alert"><p className="text-error">{error}</p><button type="button" className="btn btn-sm mt-2" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !options && <p role="status">Loading reservation options…</p>}
      <div><label htmlFor="facility_id" className="mb-1 block font-medium">Facility</label>{facility ? <><input type="hidden" {...register('facility_id')} /><p className="rounded-box bg-base-200 p-3">{facility.name}</p></> : <select id="facility_id" className="select w-full" {...register('facility_id')} {...accessibility('facility_id')} disabled={!options || Boolean(facility)}><option value="">Select a facility</option>{options?.facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}{facility.is_active ? '' : ' (inactive)'}</option>)}</select>}{fieldError('facility_id')}{options && !options.facilities.length && <p role="status">Create a facility before saving a reservation.</p>}</div>
      {!reservation && !userSubmission && <div><label htmlFor="user_id" className="mb-1 block font-medium">Reserve for</label><select id="user_id" className="select w-full" {...register('user_id')} {...accessibility('user_id')} disabled={!options}><option value="">My account</option>{options?.users.map((user) => <option key={user.id} value={user.id}>{user.user_name} ({user.email})</option>)}</select>{fieldError('user_id')}</div>}
      <p className="text-sm">All times use Asia/Jakarta (UTC+7). Start and end on the same day between 07:00 and 20:00.</p>
      {[['start_time', 'Start time'], ['end_time', 'End time']].map(([name, label]) => <div key={name}><label htmlFor={name} className="mb-1 block font-medium">{label}</label><input id={name} type="datetime-local" step="any" className="input w-full" {...register(name)} {...accessibility(name)} />{fieldError(name)}</div>)}
      {!userSubmission && <>
      <div><label htmlFor="status" className="mb-1 block font-medium">Status</label><select id="status" className="select w-full" {...register('status')} {...accessibility('status')}>{reservationStatuses.map((status) => <option key={status}>{status}</option>)}</select>{fieldError('status')}<p className="mt-1 text-sm">Done reserves the time slot. Rejected releases it; add a reason below to explain the rejection.</p></div>
      <div><label htmlFor="reason" className="mb-1 block font-medium">Reason (optional)</label><textarea id="reason" maxLength={500} className="textarea w-full" {...register('reason')} {...accessibility('reason')} />{fieldError('reason')}<p className="text-sm">Clear this field to remove an existing reason.</p></div>
      </>}
      {errors.root?.server && <p role="alert" className="text-error">{errors.root.server.message}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={!options?.facilities.length || Boolean(error) || (userSubmission && facility && !facility.is_active)}>{isSubmitting ? 'Saving…' : reservation ? 'Save changes' : userSubmission ? 'Submit reservation request' : 'Create reservation'}</button>
    </fieldset>
  </form>
}
