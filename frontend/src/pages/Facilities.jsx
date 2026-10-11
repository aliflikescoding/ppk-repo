import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiArrowRight, FiGrid, FiMapPin, FiSearch, FiSliders, FiUsers } from 'react-icons/fi'
import { deleteFacility, readFacilities, readAllFacilityReferences, facilityImageUrl } from '../api/index.js'

const pageSize = 20
const emptyFilters = { search: '', location_id: '', type_id: '', min_capacity: '', max_capacity: '', is_active: '' }

export default function Facilities({ manage = false }) {
  const [draftFilters, setDraftFilters] = useState(emptyFilters)
  const [filters, setFilters] = useState({})
  const [filterError, setFilterError] = useState('')
  const [references, setReferences] = useState(null)
  const [referenceError, setReferenceError] = useState('')
  const [referenceAttempt, setReferenceAttempt] = useState(0)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const deleteDialog = useRef(null)

  useEffect(() => {
    let active = true
    Promise.all([readAllFacilityReferences('locations'), readAllFacilityReferences('types')]).then(([locations, types]) => {
      if (active) setReferences({ locations, types })
    }).catch((err) => {
      if (active) setReferenceError(err.response?.data?.message || 'Unable to load locations and types. Please try again.')
    })
    return () => { active = false }
  }, [referenceAttempt])

  function applyFilters(event) {
    event.preventDefault()
    for (const key of ['min_capacity', 'max_capacity']) {
      const value = draftFilters[key]
      if (value && (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647)) {
        setFilterError('Capacity must be a positive whole number up to 2147483647.')
        return
      }
    }
    if (draftFilters.min_capacity && draftFilters.max_capacity && Number(draftFilters.min_capacity) > Number(draftFilters.max_capacity)) {
      setFilterError('Minimum capacity cannot exceed maximum capacity.')
      return
    }
    setFilterError(''); setError(''); setLoading(true); setPage(1)
    setFilters(Object.fromEntries(Object.entries(draftFilters).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value !== '')))
  }

  function resetFilters() {
    setDraftFilters(emptyFilters); setFilters({}); setFilterError(''); setError(''); setLoading(true); setPage(1)
  }

  function updateFilter(key, value) {
    setDraftFilters((current) => ({ ...current, [key]: value }))
    setFilterError('')
  }

  function openDelete(facility) {
    setSelectedFacility(facility)
    setDeleteError('')
    deleteDialog.current.showModal()
  }

  async function confirmDelete() {
    if (!selectedFacility || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteFacility(selectedFacility.id)
      deleteDialog.current.close()
      setSelectedFacility(null)
      toast.success('Facility deleted successfully.')
      if (facilities.length === 1 && page > 1) changePage(page - 1)
      else retry()
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Unable to delete facility. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    let active = true

    async function loadFacilities() {
      try {
        const data = await readFacilities(page, pageSize, filters)
        if (active) { setFacilities(data.facilities); setHasNext(data.has_next) }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Unable to load facilities. Please try again.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadFacilities()
    return () => { active = false }
  }, [page, attempt, filters])

  function changePage(nextPage) {
    setLoading(true)
    setError('')
    setPage(nextPage)
  }

  function retry() {
    setLoading(true)
    setError('')
    setAttempt((value) => value + 1)
  }

  return (
    <div className="facilities-page">
      {manage && <Link to="/admin" className="auth-back"><FiArrowLeft aria-hidden="true" /> Back to dashboard</Link>}
      <div className="facilities-heading">
        <div>
          <p className="auth-eyebrow">ROOM FOR YOUR NEXT PLAN</p>
          <h1>{manage ? 'Manage campus spaces.' : 'Find your next space.'}</h1>
          <p className="facilities-intro">Explore campus facilities, find the right fit, and make room for what’s next.</p>
        </div>
        {manage && <div className="flex flex-wrap gap-2">
          <Link to="/admin/facility-types" className="btn">Manage types</Link>
          <Link to="/admin/facility-locations" className="btn">Manage locations</Link>
          <Link to="/admin/createFacility" className="btn auth-submit">
            Create Facility
          </Link>
        </div>}
      </div>

      <form className="facilities-filters" onSubmit={applyFilters} noValidate aria-label="Facility filters">
        <div className="facilities-filter-heading"><span><FiSliders aria-hidden="true" /> Find your fit</span><p>Narrow it down to the space you need.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><label htmlFor="facility-search" className="mb-1 block font-medium">Search facilities</label><input id="facility-search" type="search" maxLength={100} className="input w-full" placeholder="Facility, type, or location name" value={draftFilters.search} onChange={(event) => updateFilter('search', event.target.value)} /></div>
          {[['location_id', 'Location', 'locations'], ['type_id', 'Type', 'types']].map(([key, label, kind]) => <div key={key}><label htmlFor={`facility-${key}`} className="mb-1 block font-medium">{label}</label><select id={`facility-${key}`} className="select w-full" value={draftFilters[key]} disabled={!references} onChange={(event) => updateFilter(key, event.target.value)}><option value="">All {kind}</option>{references?.[kind].map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>)}
          {[['min_capacity', 'Minimum capacity'], ['max_capacity', 'Maximum capacity']].map(([key, label]) => <div key={key}><label htmlFor={`facility-${key}`} className="mb-1 block font-medium">{label}</label><input id={`facility-${key}`} type="number" min="1" max="2147483647" step="1" className="input w-full" placeholder="Any capacity" value={draftFilters[key]} onChange={(event) => updateFilter(key, event.target.value)} aria-invalid={Boolean(filterError)} aria-describedby={filterError ? 'facility-filter-error' : undefined} /></div>)}
          <div><label htmlFor="facility-availability" className="mb-1 block font-medium">Availability</label><select id="facility-availability" className="select w-full" value={draftFilters.is_active} onChange={(event) => updateFilter('is_active', event.target.value)}><option value="">All facilities</option><option value="true">Active</option><option value="false">Inactive</option></select></div>
        </div>
        {referenceError ? <div role="alert" className="mt-3"><p className="text-error">{referenceError}</p><button type="button" className="btn btn-sm mt-2" onClick={() => { setReferenceError(''); setReferenceAttempt((value) => value + 1) }}>Retry loading filters</button></div> : !references && <p role="status" className="mt-3">Loading locations and types…</p>}
        {filterError && <p id="facility-filter-error" role="alert" className="mt-3 text-error">{filterError}</p>}
        <div className="mt-4 flex gap-2"><button type="submit" className="btn auth-submit"><FiSearch aria-hidden="true" /> Apply filters</button><button type="button" className="btn" onClick={resetFilters}>Reset filters</button></div>
      </form>

      <section
        className="facilities-results"
        aria-label="Facilities list"
        aria-busy={loading}
      >
        <div className="facilities-results-heading"><h2>Campus spaces</h2><p aria-live="polite">{loading ? 'Finding your spaces…' : error ? 'Unable to load spaces' : `${facilities.length} ${facilities.length === 1 ? 'space' : 'spaces'} on this page`}</p></div>
        {loading ? (
          <div className="facilities-state" role="status"><span className="loading loading-spinner text-primary" aria-hidden="true" /><p>Loading facilities…</p></div>
        ) : error ? (
          <div role="alert" className="facilities-state">
            <p>{error}</p>
            <button
              type="button"
              onClick={retry}
              className="btn btn-primary btn-sm mt-3"
            >
              Try again
            </button>
          </div>
        ) : facilities.length === 0 ? (
          <div className="facilities-state" role="status">
            <FiSearch aria-hidden="true" className="text-3xl text-primary" />
            <h3>{page === 1 ? 'No spaces found.' : 'You’ve reached the end.'}</h3>
            <p>{page === 1 ? 'Try another search or adjust your filters to explore more facilities.' : 'Go back a page to keep exploring.'}</p>
            {page === 1 && Object.keys(filters).length > 0 && <button type="button" className="btn auth-submit" onClick={resetFilters}>Clear filters</button>}
          </div>
        ) : (
          <div className="facilities-grid">
            {facilities.map((facility) => (
              <article key={facility.id} className="facility-card">
                <div className="facility-card-image">
                  {facility.images?.[0] ? <img src={facilityImageUrl(facility.images[0].image_url)} alt={facility.name} loading="lazy" /> : <div className="facility-card-placeholder"><FiGrid aria-hidden="true" /><span>Space for your next idea</span><small>No photo available</small></div>}
                  <span className={`facility-status ${facility.is_active ? 'is-active' : 'is-inactive'}`}>{facility.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="facility-card-body">
                  <p className="auth-eyebrow">{facility.type?.name || `Type ${facility.type_id}`}</p>
                  <h3><Link to={`${manage ? '/admin' : ''}/facilities/${facility.id}`} className="facility-title-link" aria-label={`View ${facility.name} details`}><span className="facility-animated-text">{facility.name}</span></Link></h3>
                  <dl className="facility-card-meta">
                    <div><dt><FiMapPin aria-hidden="true" /><span className="sr-only">Location</span></dt><dd>{facility.location?.name || `Location ${facility.location_id}`}</dd></div>
                    <div><dt><FiUsers aria-hidden="true" /><span className="sr-only">Capacity</span></dt><dd>{facility.capacity} people</dd></div>
                  </dl>
                  <Link to={`${manage ? '/admin' : ''}/facilities/${facility.id}`} className="facility-details-link" aria-label={`View details for ${facility.name}`}><span className="facility-animated-text">View details</span><FiArrowRight aria-hidden="true" /></Link>
                  {manage && <div className="facility-admin-actions">
                    <Link to={`/admin/updateFacility/${facility.id}`} className="btn btn-sm" aria-label={`Edit ${facility.name}`}>Edit</Link>
                    <button type="button" className="btn btn-error btn-sm" disabled={deleting} onClick={() => openDelete(facility)} aria-label={`Delete ${facility.name}`}>Delete</button>
                  </div>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <nav
        className="facilities-pagination"
        aria-label="Facilities pagination"
      >
        <button
          type="button"
          className="btn btn-sm"
          disabled={loading || page === 1}
          onClick={() => changePage(page - 1)}
        >
          <FiArrowLeft aria-hidden="true" /> Previous
        </button>
        <span aria-live="polite">Page {page}</span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={loading || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
        >
          Next <FiArrowRight aria-hidden="true" />
        </button>
      </nav>
      <dialog ref={deleteDialog} className="modal" aria-labelledby="delete-title" aria-describedby="delete-description"
        onCancel={(event) => { if (deleting) event.preventDefault() }}>
        <div className="modal-box">
          <h2 id="delete-title" className="text-xl font-bold">Delete facility</h2>
          <p id="delete-description" className="mt-3">
            Delete {selectedFacility?.name} and its images? This cannot be undone.
          </p>
          {deleteError && <p role="alert" className="mt-3 text-error">{deleteError}</p>}
          <div className="modal-action">
            <button type="button" className="btn" autoFocus disabled={deleting} onClick={() => deleteDialog.current.close()}>Cancel</button>
            <button type="button" className="btn btn-error" disabled={deleting} onClick={confirmDelete}>{deleting ? 'Deleting…' : 'Delete facility'}</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
