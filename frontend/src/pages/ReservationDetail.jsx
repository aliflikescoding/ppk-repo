import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiCalendar, FiClock, FiFileText, FiUser } from 'react-icons/fi'
import { readReservationById } from '../api/index.js'
import { formatReservationTime, reservationStatusLabel } from '../validation/reservation.js'

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
  return <div className="reservation-page">
    <Link to={readOnly ? '/user/reservations' : '/admin/reservations'} className="auth-back"><FiArrowLeft aria-hidden="true" /> Back to reservations</Link>
    {error ? <div role="alert" className="facilities-state"><p>{error}</p><button className="btn auth-submit" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !reservation ? <p role="status" className="facilities-state">Loading reservation…</p> : <>
      <section className="facilities-heading reservation-detail-heading" aria-labelledby="reservation-title">
        <div><p className="auth-eyebrow">YOUR RESERVATION DETAILS</p><h1 id="reservation-title">Reservation #{reservation.id}</h1><p className="facilities-intro">{reservation.facility?.name || `Facility ${reservation.facility_id}`}</p></div>
        <span className={`reservation-status status-${reservation.status}`}>{reservationStatusLabel(reservation)}</span>
      </section>
      <div className="reservation-detail-grid">
        <section className="reservation-detail-panel" aria-labelledby="schedule-title">
          <h2 id="schedule-title"><FiCalendar aria-hidden="true" /> Your booking</h2>
          <p className="reservation-timezone">All times in Asia/Jakarta</p>
          <dl className="reservation-detail-data">
            <div><dt>Facility</dt><dd>{reservation.facility?.name || reservation.facility_id}</dd></div>
            <div><dt><FiClock aria-hidden="true" /> Start time</dt><dd>{formatReservationTime(reservation.start_time)}</dd></div>
            <div><dt><FiClock aria-hidden="true" /> End time</dt><dd>{formatReservationTime(reservation.end_time)}</dd></div>
          </dl>
        </section>
        <section className="reservation-detail-panel" aria-labelledby="reserved-title">
          <h2 id="reserved-title"><FiUser aria-hidden="true" /> Reservation information</h2>
          <dl className="reservation-detail-data">
            <div><dt>Reserved by</dt><dd>{reservation.user?.user_name || reservation.user_id}{reservation.user?.email && <span className="reservation-detail-email">{reservation.user.email}</span>}</dd></div>
            <div><dt>Created (Asia/Jakarta)</dt><dd>{formatReservationTime(reservation.created_at)}</dd></div>
            <div><dt>Status</dt><dd><span className={`reservation-status status-${reservation.status}`}>{reservationStatusLabel(reservation)}</span></dd></div>
          </dl>
        </section>
        <section className="reservation-detail-panel reservation-reason-panel" aria-labelledby="reason-title"><h2 id="reason-title"><FiFileText aria-hidden="true" /> Reason</h2><p className="reservation-detail-reason">{reservation.reason || 'No reason provided.'}</p></section>
      </div>
      {!readOnly && <Link to={`/admin/updateReservation/${reservation.id}`} className="btn auth-submit mt-6">Edit reservation</Link>}
    </>}
  </div>
}
