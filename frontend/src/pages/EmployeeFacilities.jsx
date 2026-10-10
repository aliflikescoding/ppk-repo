import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
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
    <section className="mx-auto max-w-4xl" aria-labelledby="employee-facilities-title">
      <Link to="/employee" className="link link-primary">Back to dashboard</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 id="employee-facilities-title" className="text-3xl font-bold">Facility availability</h1>
          <p className="mt-2">Toggle facilities active or inactive. Both remain in this list.</p>
        </div>
        <button type="button" className="btn" disabled={loading || savingId !== null} onClick={() => reload()}>Refresh</button>
      </div>
      <div className="mt-4 rounded-box border border-base-300 bg-base-100 p-4" aria-busy={loading}>
        {loading ? <p role="status">Loading facilities…</p> : error ? (
          <div role="alert"><p>{error}</p><button type="button" className="btn btn-primary btn-sm mt-3" onClick={() => reload()}>Try again</button></div>
        ) : facilities.length === 0 ? <p role="status">No facilities found.</p> : (
          <div className="overflow-x-auto">
            <table className="table w-full text-left">
              <caption className="sr-only">Facility availability, page {page}</caption>
              <thead><tr><th scope="col">Facility</th><th scope="col">Type</th><th scope="col">Location</th><th scope="col">Status</th><th scope="col">Active</th></tr></thead>
              <tbody>{facilities.map((facility) => (
                <tr key={facility.id}>
                  <td><div className="flex items-center gap-3">{facility.images?.[0] && <img src={facilityImageUrl(facility.images[0].image_url)} alt={facility.name} className="h-16 w-24 rounded object-cover" />}<span>{facility.name}</span></div></td>
                  <td>{facility.type?.name || facility.type_id}</td>
                  <td>{facility.location?.name || facility.location_id}</td>
                  <td><span className={`badge ${facility.is_active ? 'badge-success' : 'badge-error'}`}>{facility.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <input type="checkbox" role="switch" className="toggle toggle-success" checked={facility.is_active === true} disabled={savingId !== null} aria-label={`Activate ${facility.name}`} aria-describedby={saveError?.id === facility.id ? `facility-status-error-${facility.id}` : undefined} onChange={(event) => toggle(facility, event.target.checked)} />
                    {savingId === facility.id && <p role="status" className="mt-2 text-sm">Saving…</p>}
                    {saveError?.id === facility.id && <p id={`facility-status-error-${facility.id}`} role="alert" className="mt-2 text-sm text-error">{saveError.message}</p>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Facility availability pagination">
        <button type="button" className="btn btn-sm" disabled={loading || savingId !== null || page === 1} onClick={() => reload(page - 1)}>Previous</button>
        <span aria-live="polite">Page {page}</span>
        <button type="button" className="btn btn-sm" disabled={loading || savingId !== null || Boolean(error) || !hasNext} onClick={() => reload(page + 1)}>Next</button>
      </nav>
    </section>
  )
}
