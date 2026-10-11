import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiCalendar, FiCheck, FiFileText, FiInfo, FiUser, FiX } from 'react-icons/fi'
import { formatReservationTime, reservationStatusLabel } from '../validation/reservation.js'
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

  return <div className="reservation-page">
    {saving ? <p role="status" className="auth-back">Saving resolution…</p> : <Link to="/employee/reservations" className="auth-back"><FiArrowLeft aria-hidden="true" /> Back to reservations</Link>}
    {error ? <div role="alert" className="facilities-state"><p>{error}</p><button type="button" className="btn auth-submit" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !reservation ? <p role="status" className="facilities-state">Loading reservation and preparing resolution…</p> : <>
      <section className="facilities-heading reservation-detail-heading" aria-labelledby="resolve-title">
        <div><p className="auth-eyebrow">CAMPUS BOOKING REVIEW</p><h1 id="resolve-title">{reservation.status === 'processed' ? 'Resolve' : 'Review'} reservation #{reservation.id}</h1><p className="facilities-intro">{reservation.facility?.name || `Facility ${reservation.facility_id}`}</p></div>
        <span className={`reservation-status status-${reservation.status}`}>{reservationStatusLabel(reservation)}</span>
      </section>
      <div className="reservation-detail-grid">
        <section className="reservation-detail-panel" aria-labelledby="booking-title"><h2 id="booking-title"><FiCalendar aria-hidden="true" /> Booking details</h2><p className="reservation-timezone">All times in Asia/Jakarta</p>
          <dl className="reservation-detail-data">{[['Facility', reservation.facility?.name || reservation.facility_id], ['Start time', formatReservationTime(reservation.start_time)], ['End time', formatReservationTime(reservation.end_time)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>
        <section className="reservation-detail-panel" aria-labelledby="requester-title"><h2 id="requester-title"><FiUser aria-hidden="true" /> Reserved by</h2><dl className="reservation-detail-data"><div><dt>Name</dt><dd>{reservation.user?.user_name || reservation.user?.email || reservation.user_id}</dd></div>{reservation.user?.email && <div><dt>Email address</dt><dd>{reservation.user.email}</dd></div>}<div><dt>Status</dt><dd><span className={`reservation-status status-${reservation.status}`}>{reservationStatusLabel(reservation)}</span></dd></div></dl></section>
      </div>
      <section className="reservation-detail-panel resolution-panel" aria-labelledby="decision-title">
        <h2 id="decision-title"><FiFileText aria-hidden="true" /> {reservation.status === 'processed' ? 'Make a decision' : 'Resolution'}</h2>
        {reservation.status === 'processed' ? <form className="resolution-form" noValidate onSubmit={finish} aria-busy={saving}><fieldset disabled={saving}>
          <p className="reservation-notice"><FiInfo aria-hidden="true" /><span>This reservation stays processed when you go back. Enter a reason to approve or reject it. Approval marks it done and reserves the time slot; overlapping bookings cannot be approved.</span></p>
          <label htmlFor="resolution-reason">Reason <span>(required)</span></label>
          <textarea id="resolution-reason" className="textarea w-full" placeholder="Explain your decision so the requester knows what happens next." required maxLength={500} rows={5} value={reason} onChange={(event) => { setReason(event.target.value); setSaveError('') }} aria-invalid={Boolean(saveError)} aria-describedby={saveError ? 'resolution-hint resolution-error' : 'resolution-hint'} />
          <p id="resolution-hint" className="resolution-hint">Use 1–500 characters. {reason.length}/500</p>
          {saveError && <p id="resolution-error" role="alert" className="mt-2 text-error">{saveError}</p>}
          <div className="resolution-actions"><button type="submit" value="done" className="btn auth-submit"><FiCheck aria-hidden="true" />{saving ? 'Saving…' : 'Approve reservation'}</button><button type="submit" value="rejected" className="btn resolution-reject"><FiX aria-hidden="true" />Reject reservation</button></div>
        </fieldset></form> : <div><p className="reservation-notice"><FiInfo aria-hidden="true" /><span>{reservationStatusLabel(reservation) === 'Cancelled' ? 'This reservation was cancelled by the user.' : `This reservation has already been ${reservation.status === 'done' ? 'approved' : 'rejected'}.`}</span></p><h3 className="mt-6 font-semibold">Reason</h3><p className="reservation-detail-reason">{reservation.reason || 'No reason provided.'}</p></div>}
      </section>
    </>}
  </div>
}
