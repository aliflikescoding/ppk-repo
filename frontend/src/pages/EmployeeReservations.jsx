import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { readMyReservations, readReservations } from '../api/index.js'
import { formatReservationTime, reservationStatuses } from '../validation/reservation.js'

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
        <td>{reservation.facility?.name || reservation.facility_id}</td><td>{formatReservationTime(reservation.start_time)}<br />to {formatReservationTime(reservation.end_time)}</td><td>{reservation.user?.user_name || reservation.user?.email || reservation.user_id}</td><td><span className={`badge ${reservation.status === 'done' ? 'badge-success' : reservation.status === 'rejected' ? 'badge-error' : reservation.status === 'processed' ? 'badge-info' : 'badge-outline'}`}>{reservation.status}</span></td>
        <td><Link to={`${basePath}/reservations/${reservation.id}${history ? '' : '/resolve'}`} className="btn btn-primary btn-sm" aria-label={`${history || ['done', 'rejected'].includes(reservation.status) ? 'View' : 'Resolve'} reservation ${reservation.id}`}>{history || ['done', 'rejected'].includes(reservation.status) ? 'View' : 'Resolve'}</Link></td>
      </tr>)}</tbody></table></div></>}
    </section>
    <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Reservations pagination"><button className="btn btn-sm" disabled={loading || page === 1} onClick={() => reload(page - 1)}>Previous</button><span aria-live="polite">Page {page}</span><button className="btn btn-sm" disabled={loading || Boolean(error) || !data?.has_next} onClick={() => reload(page + 1)}>Next</button></nav>

  </div>
}
