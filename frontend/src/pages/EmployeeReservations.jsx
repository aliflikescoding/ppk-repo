import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiArrowRight, FiCalendar, FiClock, FiInfo, FiSearch } from 'react-icons/fi'
import { readMyReservations, readReservations, updateReservation } from '../api/index.js'
import { canCancelReservation, cancellationCutoff, reservationStatusLabel, formatReservationTime, reservationStatuses } from '../validation/reservation.js'

export default function EmployeeReservations({ history = false }) {
  const basePath = history ? '/user' : '/employee'
  const readHistory = history ? readMyReservations : readReservations
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState({})
  const [selected, setSelected] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const dialog = useRef(null)
  const pending = useRef(false)

  useEffect(() => {
    if (!history) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [history])

  async function cancelReservation() {
    if (!selected || pending.current) return
    if (!canCancelReservation(selected)) {
      setCancelError('The cancellation deadline has passed. Reservations must be cancelled at least 5 hours before they start.')
      return
    }
    pending.current = true; setCancelling(true); setCancelError('')
    try {
      await updateReservation(selected.id, { status: 'rejected' })
      dialog.current.close(); setSelected(null)
      toast.success('Reservation cancelled successfully.')
      reload()
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Unable to cancel reservation. Please try again.')
    } finally { pending.current = false; setCancelling(false) }
  }

  useEffect(() => {
    let active = true
    readHistory({ page, limit: 20, ...filters }).then((result) => {
      if (active) setData(result)
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load reservations. Please try again.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, filters, attempt, readHistory])

  function reload(nextPage = page) {
    setError(''); setLoading(true); setPage(nextPage); setAttempt((value) => value + 1)
  }

  return <div className="reservation-page">
    <Link to={basePath} className="auth-back"><FiArrowLeft aria-hidden="true" /> Back to dashboard</Link>
    <div className="facilities-heading"><div><p className="auth-eyebrow">{history ? 'YOUR CAMPUS PLANS' : 'CAMPUS BOOKING REQUESTS'}</p><h1 className="text-3xl font-bold">{history ? 'Reservation history' : 'Reservations'}</h1><p className="mt-2">{history ? 'Keep your plans in view. Review your bookings and follow their progress.' : 'Review facility bookings and approve or reject reservation requests.'}</p></div></div>
    {history && <p className="reservation-notice"><FiInfo aria-hidden="true" /> <span>You can cancel a reservation only while its status is new and its start time is at least 5 hours away. Cancellation changes its status to rejected and records it as cancelled.</span></p>}
    <form className="reservation-filters facilities-filters" aria-label="Reservation filters" onSubmit={(event) => {
      event.preventDefault(); setLoading(true); setError(''); setPage(1)
      setFilters({ ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}) })
    }}>
      <div className="flex-1"><label htmlFor="reservation-search" className="mb-1 block">Search reservations</label><input id="reservation-search" className="input w-full" maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Facility name" /></div>
      <div><label htmlFor="reservation-status" className="mb-1 block">Status</label><select id="reservation-status" className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{reservationStatuses.map((value) => <option key={value}>{value}</option>)}</select></div>
      <button className="btn auth-submit" type="submit"><FiSearch aria-hidden="true" /> Apply filters</button>
    </form>
    <section className="reservation-results" aria-label="Reservations list" aria-busy={loading}>
      {loading ? <p role="status" className="facilities-state">Loading reservations…</p> : error ? <div role="alert" className="facilities-state"><p>{error}</p><button className="btn mt-3" onClick={() => reload()}>Try again</button></div> : !data?.reservations.length ? <div role="status" className="facilities-state"><FiCalendar aria-hidden="true" /><p>No reservations found.</p>{history && <Link to="/facilities" className="landing-text-link">Explore facilities <FiArrowRight aria-hidden="true" /></Link>}</div> : <><div className="facilities-results-heading"><h2>{history ? 'Your reservations' : 'Reservation requests'}</h2><p>{data.total} reservations</p></div><div className="reservation-grid">{data.reservations.map((reservation) => <article key={reservation.id} className="reservation-card facility-card">
        <div className="reservation-card-top"><span className="landing-feature-icon"><FiCalendar aria-hidden="true" /></span><span className={`reservation-status status-${reservation.status}`}>{reservationStatusLabel(reservation)}</span></div>
        <p className="auth-eyebrow mt-5">RESERVATION #{reservation.id}</p><h3>{reservation.facility?.name || `Facility ${reservation.facility_id}`}</h3>
        <dl className="reservation-times"><div><dt><FiClock aria-hidden="true" /> Starts</dt><dd>{formatReservationTime(reservation.start_time)}</dd></div><div><dt>Ends</dt><dd>{formatReservationTime(reservation.end_time)}</dd></div></dl>
        <p className="reservation-timezone">All times in Asia/Jakarta</p>
        {!history && <p className="reservation-card-reason"><strong>Reserved by</strong><br />{reservation.user?.user_name || reservation.user?.email || reservation.user_id}</p>}
        {reservation.reason && <p className="reservation-card-reason">{reservation.reason}</p>}
        <div className="reservation-card-actions"><Link to={`${basePath}/reservations/${reservation.id}${history ? '' : '/resolve'}`} className="facility-details-link" aria-label={`View reservation ${reservation.id}`}><span className="facility-animated-text">{history || ['done', 'rejected'].includes(reservation.status) ? 'View reservation' : 'Resolve reservation'}</span><FiArrowRight aria-hidden="true" /></Link>
          {history && reservation.status === 'new' && <button type="button" className="btn btn-sm reservation-cancel" disabled={cancelling || !canCancelReservation(reservation, now)} aria-label={`Cancel reservation ${reservation.id}`} onClick={() => { setSelected(reservation); setCancelError(''); dialog.current.showModal() }}>Cancel</button>}
        </div>
        {history && reservation.status === 'new' && <p className="reservation-deadline">{canCancelReservation(reservation, now) ? `Cancel by ${formatReservationTime(cancellationCutoff(reservation))} (Asia/Jakarta)` : 'Cancellation deadline passed.'}</p>}
      </article>)}</div></>}
    </section>
    <nav className="facilities-pagination" aria-label="Reservations pagination"><button className="btn btn-sm" disabled={loading || page === 1} onClick={() => reload(page - 1)}>Previous</button><span aria-live="polite">Page {page}</span><button className="btn btn-sm" disabled={loading || Boolean(error) || !data?.has_next} onClick={() => reload(page + 1)}>Next</button></nav>

    {history && <dialog ref={dialog} className="modal" aria-labelledby="cancel-reservation-title" aria-describedby="cancel-reservation-description" onCancel={(event) => { if (pending.current) event.preventDefault() }}>
      <div className="modal-box reservation-modal"><h2 id="cancel-reservation-title" className="text-xl font-bold">Cancel reservation?</h2>
        <p id="cancel-reservation-description" className="mt-3">Cancel reservation #{selected?.id} for {selected?.facility?.name || selected?.facility_id}? This will change its status to rejected. This cannot be undone.</p>
        {selected && <p className="mt-2 text-sm">Starts {formatReservationTime(selected.start_time)} (Asia/Jakarta). Cancellation is allowed at least 5 hours before the start.</p>}
        {cancelError && <p role="alert" className="mt-3 text-error">{cancelError}</p>}
        <div className="modal-action"><button type="button" className="btn" autoFocus disabled={cancelling} onClick={() => dialog.current.close()}>Keep reservation</button><button type="button" className="btn btn-error" disabled={cancelling || !canCancelReservation(selected, now)} onClick={cancelReservation}>{cancelling ? 'Cancelling…' : 'Confirm cancellation'}</button></div>
      </div>
    </dialog>}
  </div>
}
