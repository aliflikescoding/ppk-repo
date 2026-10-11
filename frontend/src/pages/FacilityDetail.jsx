import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiCalendar, FiClipboard, FiGrid, FiImage, FiInfo, FiMapPin, FiTool, FiUsers } from 'react-icons/fi'
import { useAuth } from '../auth/auth.js'
import FacilityCalendar from '../components/FacilityCalendar.jsx'
import { facilityImageUrl, readFacilityById } from '../api/index.js'

export default function FacilityDetail({ manage = false }) {
  const { id } = useParams()
  return <Detail key={id} id={id} manage={manage} />
}

function Detail({ id, manage }) {
  const { user, loading: sessionLoading } = useAuth()
  const [facility, setFacility] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    readFacilityById(id).then((data) => {
      if (active) setFacility(data)
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load facility. Please try again.')
    })
    return () => { active = false }
  }, [id, attempt])

  const canSubmit = Boolean(user) && !sessionLoading && facility?.is_active === true

  return <div className="facilities-page facility-detail-page">
    <Link to={manage ? '/admin/facilities' : '/facilities'} className="auth-back"><FiArrowLeft aria-hidden="true" /> Back to facilities</Link>
    {error ? <div role="alert" className="facilities-state"><p>{error}</p><button type="button" className="btn auth-submit" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !facility ? <p role="status" className="facilities-state">Loading facility…</p> : <>
      <section className="facilities-heading reservation-detail-heading" aria-labelledby="facility-title"><div><p className="auth-eyebrow">YOUR CAMPUS SPACES</p><h1 id="facility-title">{facility.name}</h1><p className="facilities-intro">A closer look at your next campus space.</p></div><span className={`reservation-status ${facility.is_active ? 'status-done' : 'status-rejected'}`}>{facility.is_active ? 'Active' : 'Under maintenance'}</span></section>
      <section className="facility-detail-overview" aria-label="Facility information">
        <div className="facility-detail-cover">{facility.images?.[0] ? <img src={facilityImageUrl(facility.images[0].image_url)} alt={facility.name} /> : <div className="facility-card-placeholder"><FiGrid aria-hidden="true" /><span>Space for your next idea</span><small>No photo available</small></div>}</div>
        <div className="facility-detail-summary"><h2>About this space</h2><dl className="reservation-detail-data">{[[FiUsers, 'Capacity', `${facility.capacity} people`], [FiGrid, 'Type', facility.type?.name || facility.type_id], [FiMapPin, 'Location', facility.location?.name || facility.location_id]].map(([Icon, label, value]) => <div key={label}><dt><Icon aria-hidden="true" /> {label}</dt><dd>{value}</dd></div>)}</dl></div>
      </section>
      <section className="reservation-detail-panel facility-detail-actions" aria-labelledby="facility-action-title">
        <h2 id="facility-action-title"><FiCalendar aria-hidden="true" /> Plan your next step</h2>
        {!facility.is_active && <p id="facility-maintenance" role="status" className="reservation-notice"><FiTool aria-hidden="true" /><span>Sorry, this facility is under maintenance. Reports and reservations are unavailable until it is active again.</span></p>}
        {!sessionLoading && !user && <p id="facility-sign-in" className="reservation-notice"><FiInfo aria-hidden="true" /><span>Please <Link to="/login" className="underline font-semibold">sign in</Link> to submit a report or reservation.</span></p>}
        {sessionLoading && <p role="status" className="reservation-timezone">Checking your session…</p>}
        <div className="resolution-actions">
          {canSubmit ? <><Link to={`/facilities/${facility.id}/reserve`} className="btn auth-submit"><FiCalendar aria-hidden="true" /> Submit a reservation</Link><Link to={`/facilities/${facility.id}/report`} className="btn facility-report-button"><FiClipboard aria-hidden="true" /> Submit a report</Link></> : <><button type="button" disabled className="btn auth-submit" aria-describedby={!facility.is_active ? 'facility-maintenance' : !user && !sessionLoading ? 'facility-sign-in' : undefined}><FiCalendar aria-hidden="true" /> Submit a reservation</button><button type="button" disabled className="btn facility-report-button" aria-describedby={!facility.is_active ? 'facility-maintenance' : !user && !sessionLoading ? 'facility-sign-in' : undefined}><FiClipboard aria-hidden="true" /> Submit a report</button></>}
        </div>
      </section>
      <div className="reservation-detail-panel facility-calendar-panel"><FacilityCalendar facilityId={facility.id} active={facility.is_active} /></div>
      <section className="reservation-detail-panel facility-photos-panel" aria-labelledby="facility-photos-title"><h2 id="facility-photos-title"><FiImage aria-hidden="true" /> Photos</h2>
        {facility.images?.length ? <div className="facility-photo-grid">{facility.images.map((image, index) => <a key={image.id || image.image_url} href={facilityImageUrl(image.image_url)} target="_blank" rel="noreferrer" className="facility-photo-link" aria-label={`Open ${facility.name} photo ${index + 1} (opens in a new tab)`}><img src={facilityImageUrl(image.image_url)} alt={`${facility.name}, photo ${index + 1}`} loading="lazy" /><span>Photo {index + 1} · View full image</span></a>)}</div> : <p className="reservation-detail-reason">No photos available.</p>}
      </section>
      {manage && <Link to={`/admin/updateFacility/${facility.id}`} className="btn auth-submit mt-6">Edit facility</Link>}
    </>}
  </div>
}
