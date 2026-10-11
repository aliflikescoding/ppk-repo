import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiArrowRight, FiGrid, FiInfo, FiMapPin, FiRefreshCw, FiUsers } from 'react-icons/fi'
import { facilityImageUrl, readFacilities, updateFacility } from '../api/index.js'

export default function EmployeeFacilities() {
  const [facilities, setFacilities] = useState([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const pending = useRef(false)

  useEffect(() => {
    let active = true
    readFacilities(page, 20).then((data) => {
      if (active) {
        setFacilities(data.facilities)
        setHasNext(data.has_next)
      }
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load facilities. Please try again.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, attempt])

  function reload(nextPage = page) {
    if (pending.current) return
    setLoading(true)
    setError('')
    setSaveError(null)
    setPage(nextPage)
    setAttempt((value) => value + 1)
  }

  async function toggle(facility, isActive) {
    if (pending.current) return
    pending.current = true
    setSavingId(facility.id)
    setSaveError(null)
    try {
      const updated = await updateFacility(facility.id, { is_active: isActive })
      setFacilities((current) => current.map((item) => item.id === facility.id ? updated : item))
      toast.success(`${facility.name} is now ${updated.is_active ? 'active' : 'inactive'}.`)
    } catch (err) {
      setSaveError({ id: facility.id, message: err.response?.data?.message || 'Unable to change facility status. Please try again.' })
    } finally {
      pending.current = false
      setSavingId(null)
    }
  }

  return (
    <section className="facilities-page" aria-labelledby="employee-facilities-title">
      <Link to="/employee" className="auth-back"><FiArrowLeft aria-hidden="true" /> Back to dashboard</Link>
      <div className="facilities-heading">
        <div>
          <p className="auth-eyebrow">YOUR CAMPUS SPACES</p>
          <h1 id="employee-facilities-title">Facility availability</h1>
          <p className="facilities-intro">Keep campus spaces ready for what’s next. Review facilities and manage their availability.</p>
        </div>
        <button type="button" className="btn auth-submit" disabled={loading || savingId !== null} onClick={() => reload()}><FiRefreshCw aria-hidden="true" /> Refresh</button>
      </div>
      <p className="reservation-notice"><FiInfo aria-hidden="true" /><span>Use the availability switch to mark a facility active or inactive. Both remain in this list so you can update them at any time.</span></p>
      <div className="facilities-results" aria-busy={loading}>
        <div className="facilities-results-heading"><h2>Campus spaces</h2><p aria-live="polite">{loading ? 'Loading spaces…' : error ? 'Unable to load spaces' : `${facilities.length} ${facilities.length === 1 ? 'space' : 'spaces'} on this page`}</p></div>
        {loading ? <div role="status" className="facilities-state"><span className="loading loading-spinner text-primary" aria-hidden="true" /><p>Loading facilities…</p></div> : error ? (
          <div role="alert" className="facilities-state"><p>{error}</p><button type="button" className="btn btn-primary btn-sm mt-3" onClick={() => reload()}>Try again</button></div>
        ) : facilities.length === 0 ? <div role="status" className="facilities-state"><FiGrid aria-hidden="true" className="text-3xl text-primary" /><h3>No facilities found.</h3><p>Campus spaces will appear here when they’re added.</p></div> : (
          <div className="facilities-grid">
            {facilities.map((facility) => (
              <article key={facility.id} className="facility-card employee-facility-card">
                <div className="facility-card-image">
                  {facility.images?.[0] ? <img src={facilityImageUrl(facility.images[0].image_url)} alt={facility.name} loading="lazy" /> : <div className="facility-card-placeholder"><FiGrid aria-hidden="true" /><span>Space for your next idea</span><small>No photo available</small></div>}
                  <span className={`facility-status ${facility.is_active ? 'is-active' : 'is-inactive'}`}>{facility.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="facility-card-body">
                  <p className="auth-eyebrow">{facility.type?.name || `Type ${facility.type_id}`}</p>
                  <h3>{facility.name}</h3>
                  <dl className="facility-card-meta">
                    <div><dt><FiMapPin aria-hidden="true" /><span className="sr-only">Location</span></dt><dd>{facility.location?.name || `Location ${facility.location_id}`}</dd></div>
                    <div><dt><FiUsers aria-hidden="true" /><span className="sr-only">Capacity</span></dt><dd>{facility.capacity} people</dd></div>
                  </dl>
                  <div className="employee-availability-control">
                    <label htmlFor={`facility-active-${facility.id}`}><span>Facility active</span><small>{facility.is_active ? 'Marked as available' : 'Marked as unavailable'}</small></label>
                    <input id={`facility-active-${facility.id}`} type="checkbox" role="switch" className="toggle toggle-primary" checked={facility.is_active === true} disabled={savingId !== null} aria-label={`Activate ${facility.name}`} aria-describedby={saveError?.id === facility.id ? `facility-status-error-${facility.id}` : undefined} onChange={(event) => toggle(facility, event.target.checked)} />
                  </div>
                  {savingId === facility.id && <p role="status" className="employee-availability-feedback"><span className="loading loading-spinner loading-xs" aria-hidden="true" /> Saving…</p>}
                  {saveError?.id === facility.id && <p id={`facility-status-error-${facility.id}`} role="alert" className="mt-3 text-sm text-error">{saveError.message}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <nav className="facilities-pagination" aria-label="Facility availability pagination">
        <button type="button" className="btn btn-sm" disabled={loading || savingId !== null || page === 1} onClick={() => reload(page - 1)}><FiArrowLeft aria-hidden="true" /> Previous</button>
        <span aria-live="polite">Page {page}</span>
        <button type="button" className="btn btn-sm" disabled={loading || savingId !== null || Boolean(error) || !hasNext} onClick={() => reload(page + 1)}>Next <FiArrowRight aria-hidden="true" /></button>
      </nav>
    </section>
  )
}
