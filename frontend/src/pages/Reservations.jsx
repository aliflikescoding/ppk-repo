import PageHeading from '../components/PageHeading.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { deleteReservation, readReservations } from '../api/index.js'
import { formatReservationTime, reservationStatuses } from '../validation/reservation.js'

export default function Reservations() {
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState({})
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const dialog = useRef(null)

  useEffect(() => {
    let active = true
    readReservations({ page, limit: 20, ...filters }).then((result) => {
      if (active) setData(result)
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load reservations. Please try again.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, filters, attempt])

  function reload(nextPage = page) {
    setError(''); setLoading(true); setPage(nextPage); setAttempt((value) => value + 1)
  }
  async function remove() {
    if (!selected || deleting) return
    setDeleting(true); setDeleteError('')
    try {
      await deleteReservation(selected.id)
      dialog.current.close(); setSelected(null)
      toast.success('Reservation deleted successfully.')
      reload(data.reservations.length === 1 && page > 1 ? page - 1 : page)
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Unable to delete reservation. Please try again.')
    } finally { setDeleting(false) }
  }

  return <div className="workspace-page workspace-list-page">
    <Link to="/admin" className="auth-back">← Back to dashboard</Link>
    <div className="workspace-toolbar"><div><PageHeading>Reservations</PageHeading><p className="mt-2">Manage bookings, approvals, and reservation rejections.</p></div><div className="flex gap-2"><Link to="/admin/createReservation" className="btn auth-submit">Create reservation</Link></div></div>
    <form className="reservation-filters facilities-filters" onSubmit={(event) => {
      event.preventDefault(); setLoading(true); setError(''); setPage(1)
      setFilters({ ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}) })
    }}>
      <div className="flex-1"><label htmlFor="reservation-search" className="mb-1 block">Search reservations</label><input id="reservation-search" className="input w-full" maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Facility name" /></div>
      <div><label htmlFor="reservation-status" className="mb-1 block">Status</label><select id="reservation-status" className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{reservationStatuses.map((value) => <option key={value}>{value}</option>)}</select></div>
      <button className="btn auth-submit" type="submit">Apply filters</button>
    </form>
    <section className="workspace-panel mt-6" aria-label="Reservations list" aria-busy={loading}>
      {loading ? <p role="status">Loading reservations…</p> : error ? <div role="alert"><p>{error}</p><button className="btn mt-3" onClick={() => reload()}>Try again</button></div> : !data?.reservations.length ? <p role="status">No reservations found.</p> : <><p className="mb-3 text-sm">{data.total} reservations</p><div className="overflow-x-auto"><table className="table"><caption className="sr-only">Reservations, page {page}</caption><thead><tr><th scope="col">Reservation</th><th scope="col">Facility</th><th scope="col">Time (Asia/Jakarta)</th><th scope="col">Reserved by</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>{data.reservations.map((reservation) => <tr key={reservation.id}>
        <td><Link to={`/admin/reservations/${reservation.id}`} className="link link-primary">Reservation #{reservation.id}</Link><p className="max-w-xs whitespace-pre-wrap break-words">{reservation.reason || 'No reason provided'}</p></td>
        <td>{reservation.facility?.name || reservation.facility_id}</td><td>{formatReservationTime(reservation.start_time)}<br />to {formatReservationTime(reservation.end_time)}</td><td>{reservation.user?.user_name || reservation.user?.email || reservation.user_id}</td><td><span className={`reservation-status status-${reservation.status}`}>{reservation.status}</span></td>
        <td><div className="flex gap-2"><Link to={`/admin/reservations/${reservation.id}`} className="btn btn-sm" aria-label={`View reservation ${reservation.id}`}>View</Link><Link to={`/admin/updateReservation/${reservation.id}`} className="btn btn-sm" aria-label={`Edit reservation ${reservation.id}`}>Edit</Link><button className="btn btn-error btn-sm" disabled={deleting} aria-label={`Delete reservation ${reservation.id}`} onClick={() => { setSelected(reservation); setDeleteError(''); dialog.current.showModal() }}>Delete</button></div></td>
      </tr>)}</tbody></table></div></>}
    </section>
    <nav className="facilities-pagination" aria-label="Reservations pagination"><button className="btn btn-sm" disabled={loading || page === 1} onClick={() => reload(page - 1)}>Previous</button><span aria-live="polite">Page {page}</span><button className="btn btn-sm" disabled={loading || Boolean(error) || !data?.has_next} onClick={() => reload(page + 1)}>Next</button></nav>
    <dialog ref={dialog} className="modal" aria-labelledby="reservation-delete-title" aria-describedby="reservation-delete-description" onCancel={(event) => { if (deleting) event.preventDefault() }}><div className="modal-box reservation-modal"><h2 id="reservation-delete-title" className="text-xl font-bold">Delete reservation</h2><p id="reservation-delete-description" className="mt-3">Delete reservation #{selected?.id}? This cannot be undone.</p>{deleteError && <p role="alert" className="mt-3 text-error">{deleteError}</p>}<div className="modal-action"><button className="btn" autoFocus disabled={deleting} onClick={() => dialog.current.close()}>Cancel</button><button className="btn btn-error" disabled={deleting} onClick={remove}>{deleting ? 'Deleting…' : 'Delete reservation'}</button></div></div></dialog>
  </div>
}
