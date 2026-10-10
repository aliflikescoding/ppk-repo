import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { createReport, createReservation, readFacilityById } from '../api/index.js'
import { useAuth } from '../auth/auth.js'
import SessionStatus from '../auth/SessionStatus.jsx'
import ReportForm from './ReportForm.jsx'
import ReservationForm from './ReservationForm.jsx'
import FacilityCalendar from './FacilityCalendar.jsx'

export default function FacilitySubmission({ kind }) {
  const { id } = useParams()
  return <Submission key={`${kind}/${id}`} id={id} kind={kind} />
}

function Submission({ id, kind }) {
  const { user, loading, error: sessionError } = useAuth()
  const [facility, setFacility] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const navigate = useNavigate()
  const report = kind === 'report'

  useEffect(() => {
    let active = true
    readFacilityById(id).then((data) => { if (active) setFacility(data) }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load facility. Please try again.')
    })
    return () => { active = false }
  }, [id, attempt])

  async function save(data) {
    const result = await (report ? createReport(data) : createReservation(data))
    toast.success(report ? 'Report submitted successfully. Status: new.' : 'Reservation request submitted. Status: new; awaiting approval.')
    const basePath = user.role === 'admin' ? '/admin' : user.role === 'employee' ? '/employee' : '/user'
    navigate(`${basePath}/${report ? 'reports' : 'reservations'}/${result.id}${user.role === 'employee' ? '/resolve' : ''}`)
  }

  if (loading || sessionError) return <SessionStatus />
  return <div className="mx-auto max-w-2xl">
    <Link to={`/facilities/${id}`} className="link link-primary">Back to facility</Link>
    <section className="card mt-4 border border-base-300 bg-base-100 shadow-sm"><div className="card-body">
      <h1 className="text-3xl font-bold">{report ? 'Submit a report' : 'Submit a reservation'}</h1>
      {!user ? <p className="mt-3">Please <Link to="/login" state={{ returnTo: `/facilities/${id}/${report ? 'report' : 'reserve'}` }} className="link link-primary">sign in</Link> to submit {report ? 'a report' : 'a reservation request'}.</p> : !report && user.role === 'employee' ? <p role="alert">Employees cannot submit reservation requests. Sign in with a user account to reserve a facility.</p> : error ? <div role="alert"><p>{error}</p><button type="button" className="btn mt-3" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !facility ? <p role="status">Loading facility…</p> : <>
        <p className="mt-2 font-semibold">{facility.name}</p>
        <p className="text-sm">{report ? 'Describe the issue and attach a photo. Your report will start with status new.' : 'Choose a time for your reservation request. It starts with status new and needs approval before the slot is confirmed.'}</p>
        {report ? <ReportForm facility={facility} onSave={save} /> : <>
          {!facility.is_active && <p role="alert" className="mt-3 text-warning">This facility is inactive and cannot accept reservation requests.</p>}
          {facility.is_active && <ReservationForm facility={facility} userSubmission onSave={save} />}
          <FacilityCalendar facilityId={facility.id} active={facility.is_active} />
        </>}
      </>}
    </div></section>
  </div>
}
