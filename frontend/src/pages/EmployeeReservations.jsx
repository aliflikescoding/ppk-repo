import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'
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

  return <div className="mx-auto max-w-5xl">
    <Link to={basePath} className="link link-primary">Back to dashboard</Link>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">{history ? 'Reservation history' : 'Reservations'}</h1><p className="mt-2">{history ? 'View your reservations and their status.' : 'Review facility bookings and approve or reject reservation requests.'}</p></div></div>
    {history && <p className="mt-4 rounded-box bg-base-100 p-4 text-sm">You can cancel a reservation only while its status is new and its start time is at least 5 hours away. Cancellation changes its status to rejected and records it as cancelled.</p>}
    <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={(event) => {
      event.preventDefault(); setLoading(true); setError(''); setPage(1)
      setFilters({ ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}) })
    }}>
      <div className="flex-1"><label htmlFor="reservation-search" className="mb-1 block">Search reservations</label><input id="reservation-search" className="input w-full" maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Facility name" /></div>
      <div><label htmlFor="reservation-status" className="mb-1 block">Status</label><select id="reservation-status" className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{reservationStatuses.map((value) => <option key={value}>{value}</option>)}</select></div>
      <button className="btn" type="submit">Apply filters</button>
    </form>
    <section className="mt-6 rounded-box border border-base-300 bg-base-100 p-4" aria-label="Reservations list" aria-busy={loading}>
      {loading ? <p role="status">Loading reservations…</p> : error ? <div role="alert"><p>{error}</p><button className="btn mt-3" onClick={() => reload()}>Try again</button></div> : !data?.reservations.length ? <p role="status">No reservations found.</p> : <><p className="mb-3 text-sm">{data.total} reservations</p><div className="overflow-x-auto"><table className="table"><caption className="sr-only">Reservations, page {page}</caption><thead><tr><th scope="col">Reservation</th><th scope="col">Facility</th><th scope="col">Time (Asia/Jakarta)</th><th scope="col">Reserved by</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>{data.reservations.map((reservation) => <tr key={reservation.id}>
        <td><Link to={`${basePath}/reservations/${reservation.id}${history ? '' : '/resolve'}`} className="link link-primary">Reservation #{reservation.id}</Link><p className="max-w-xs whitespace-pre-wrap break-words">{reservation.reason}</p></td>
        <td>{reservation.facility?.name || reservation.facility_id}</td><td>{formatReservationTime(reservation.start_time)}<br />to {formatReservationTime(reservation.end_time)}</td><td>{reservation.user?.user_name || reservation.user?.email || reservation.user_id}</td><td><span className={`badge ${reservation.status === 'done' ? 'badge-success' : reservation.status === 'rejected' ? 'badge-error' : reservation.status === 'processed' ? 'badge-info' : 'badge-outline'}`}>{reservationStatusLabel(reservation)}</span></td>
        <td><div className="flex flex-wrap gap-2"><Link to={`${basePath}/reservations/${reservation.id}${history ? '' : '/resolve'}`} className="btn btn-primary btn-sm" aria-label={`${history || ['done', 'rejected'].includes(reservation.status) ? 'View' : 'Resolve'} reservation ${reservation.id}`}>{history || ['done', 'rejected'].includes(reservation.status) ? 'View' : 'Resolve'}</Link>
          {history && reservation.status === 'new' && <button type="button" className="btn btn-error btn-sm" disabled={cancelling || !canCancelReservation(reservation, now)} aria-label={`Cancel reservation ${reservation.id}`} onClick={() => { setSelected(reservation); setCancelError(''); dialog.current.showModal() }}>Cancel</button>}
          {history && reservation.status === 'new' && <p className="w-full text-xs">{canCancelReservation(reservation, now) ? `Cancel by ${formatReservationTime(cancellationCutoff(reservation))} (Asia/Jakarta)` : 'Cancellation deadline passed.'}</p>}
        </div></td>
      </tr>)}</tbody></table></div></>}
    </section>
    <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Reservations pagination"><button className="btn btn-sm" disabled={loading || page === 1} onClick={() => reload(page - 1)}>Previous</button><span aria-live="polite">Page {page}</span><button className="btn btn-sm" disabled={loading || Boolean(error) || !data?.has_next} onClick={() => reload(page + 1)}>Next</button></nav>

    {history && <dialog ref={dialog} className="modal" aria-labelledby="cancel-reservation-title" aria-describedby="cancel-reservation-description" onCancel={(event) => { if (pending.current) event.preventDefault() }}>
      <div className="modal-box"><h2 id="cancel-reservation-title" className="text-xl font-bold">Cancel reservation?</h2>
        <p id="cancel-reservation-description" className="mt-3">Cancel reservation #{selected?.id} for {selected?.facility?.name || selected?.facility_id}? This will change its status to rejected. This cannot be undone.</p>
        {selected && <p className="mt-2 text-sm">Starts {formatReservationTime(selected.start_time)} (Asia/Jakarta). Cancellation is allowed at least 5 hours before the start.</p>}
        {cancelError && <p role="alert" className="mt-3 text-error">{cancelError}</p>}
        <div className="modal-action"><button type="button" className="btn" autoFocus disabled={cancelling} onClick={() => dialog.current.close()}>Keep reservation</button><button type="button" className="btn btn-error" disabled={cancelling || !canCancelReservation(selected, now)} onClick={cancelReservation}>{cancelling ? 'Cancelling…' : 'Confirm cancellation'}</button></div>
      </div>
    </dialog>}
  </div>
}
