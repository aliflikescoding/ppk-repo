import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { readReservationById } from '../api/index.js'
import { formatReservationTime } from '../validation/reservation.js'

export default function ReservationDetail({ readOnly = false }) {
  const { id } = useParams()
  return <Detail key={id} id={id} readOnly={readOnly} />
}

function Detail({ id, readOnly }) {
  const [reservation, setReservation] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    readReservationById(id).then((data) => { if (active) setReservation(data) }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load reservation. Please try again.')
    })
    return () => { active = false }
  }, [id, attempt])
  return <div className="mx-auto max-w-2xl"><Link to={readOnly ? '/user/reservations' : '/admin/reservations'} className="link link-primary">Back to reservations</Link>
    {error ? <div role="alert" className="mt-4"><p>{error}</p><button className="btn mt-3" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !reservation ? <p role="status" className="mt-4">Loading reservation…</p> : <section className="card mt-4 border border-base-300 bg-base-100"><div className="card-body">
      <h1 className="text-3xl font-bold">Reservation #{reservation.id}</h1>
      <dl className="space-y-3">
        <div><dt className="font-semibold">Facility</dt><dd>{reservation.facility?.name || reservation.facility_id}</dd></div>
        <div><dt className="font-semibold">Reserved by</dt><dd>{reservation.user?.user_name || reservation.user_id}{reservation.user?.email && ` (${reservation.user.email})`}</dd></div>
        <div><dt className="font-semibold">Start (Asia/Jakarta)</dt><dd>{formatReservationTime(reservation.start_time)}</dd></div>
        <div><dt className="font-semibold">End (Asia/Jakarta)</dt><dd>{formatReservationTime(reservation.end_time)}</dd></div>
        <div><dt className="font-semibold">Status</dt><dd className={`badge ${reservation.status === 'rejected' ? 'badge-error' : reservation.status === 'done' ? 'badge-success' : 'badge-outline'}`}>{reservation.status}</dd></div>
        <div><dt className="font-semibold">Reason</dt><dd className="whitespace-pre-wrap break-words">{reservation.reason || 'No reason provided.'}</dd></div>
        <div><dt className="font-semibold">Created (Asia/Jakarta)</dt><dd>{formatReservationTime(reservation.created_at)}</dd></div>
      </dl>
      {!readOnly && <Link to={`/admin/updateReservation/${reservation.id}`} className="btn btn-primary mt-4">Edit reservation</Link>}
    </div></section>}
  </div>
}
