import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { formatReservationTime } from '../validation/reservation.js'
import { readReservationById, updateReservation } from '../api/index.js'

export default function ResolveReservation() {
  const { id } = useParams()
  return <ResolveReservationPage key={id} id={id} />
}

function ResolveReservationPage({ id }) {
  const [reservation, setReservation] = useState(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    async function load() {
      try {
        let data = await readReservationById(id)
        if (!active) return
        if (data.status === 'new') data = await updateReservation(id, { status: 'processed' })
        if (active) {
          setReservation(data)
          setReason(data.reason || '')
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Unable to open reservation for resolution. Please try again.')
      }
    }
    load()
    return () => { active = false }
  }, [id, attempt])

  async function finish(event) {
    event.preventDefault()
    if (pending.current || reservation?.status !== 'processed') return
    const status = event.nativeEvent.submitter?.value
    if (!['done', 'rejected'].includes(status)) return
    const trimmed = reason.trim()
    if (!trimmed || trimmed.length > 500) {
      setSaveError('Enter a reason containing 1–500 characters before approving or rejecting this reservation.')
      return
    }
    pending.current = true
    setSaving(true)
    setSaveError('')
    try {
      await updateReservation(id, { status, reason: trimmed })
      toast.success(`Reservation ${status === 'done' ? 'approved' : 'rejected'} successfully.`)
      navigate('/employee/reservations')
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Unable to resolve reservation. Please try again.')
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return <div className="mx-auto max-w-2xl">
    {saving ? <span className="text-sm">Saving resolution…</span> : <Link to="/employee/reservations" className="link link-primary">Back to reservations</Link>}
    {error ? <div role="alert" className="mt-4"><p>{error}</p><button type="button" className="btn mt-3" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !reservation ? <p role="status" className="mt-4">Loading reservation and preparing resolution…</p> : <section className="card mt-4 border border-base-300 bg-base-100 shadow-sm"><div className="card-body">
      <h1 className="text-3xl font-bold">Resolve reservation #{reservation.id}</h1>
      <dl className="mt-3 space-y-3">{[['Facility', reservation.facility?.name || reservation.facility_id], ['Reserved by', reservation.user?.user_name || reservation.user?.email || reservation.user_id], ['Start (Asia/Jakarta)', formatReservationTime(reservation.start_time)], ['End (Asia/Jakarta)', formatReservationTime(reservation.end_time)], ['Status', reservation.status]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>
      {reservation.status === 'processed' ? <form className="mt-4" noValidate onSubmit={finish} aria-busy={saving}><fieldset disabled={saving}>
        <p className="mb-3">This reservation stays processed when you go back. Enter a reason to approve or reject it. Approval marks it done and reserves the time slot; overlapping bookings cannot be approved.</p>
        <label htmlFor="resolution-reason" className="mb-1 block font-medium">Reason (required)</label>
        <textarea id="resolution-reason" className="textarea w-full" required maxLength={500} value={reason} onChange={(event) => { setReason(event.target.value); setSaveError('') }} aria-invalid={Boolean(saveError)} aria-describedby={saveError ? 'resolution-error' : undefined} />
        {saveError && <p id="resolution-error" role="alert" className="mt-2 text-error">{saveError}</p>}
        <div className="mt-4 flex gap-3"><button type="submit" value="done" className="btn btn-success">{saving ? 'Saving…' : 'Approve reservation'}</button><button type="submit" value="rejected" className="btn btn-error">Reject</button></div>
      </fieldset></form> : <div className="mt-4"><p>This reservation has already been {reservation.status === 'done' ? 'approved' : 'rejected'}.</p><h2 className="mt-3 font-semibold">Reason</h2><p className="whitespace-pre-wrap break-words">{reservation.reason || 'No reason provided.'}</p></div>}
    </div></section>}
  </div>
}
