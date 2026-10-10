import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
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
    <div className="mx-auto w-full max-w-4xl">
      {manage && <Link to="/admin" className="link link-primary">Back to dashboard</Link>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Facilities</h1>
          <p className="mt-2">Explore facilities, capacity, and locations.</p>
        </div>
        {manage && <div className="flex flex-wrap gap-2">
          <Link to="/admin/facility-types" className="btn">Manage types</Link>
          <Link to="/admin/facility-locations" className="btn">Manage locations</Link>
          <Link to="/admin/createFacility" className="btn">
            Create Facility
          </Link>
        </div>}
      </div>

      <form className="mt-6 rounded-box border border-base-300 bg-base-100 p-4" onSubmit={applyFilters} noValidate aria-label="Facility filters">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><label htmlFor="facility-search" className="mb-1 block font-medium">Search facilities</label><input id="facility-search" type="search" maxLength={100} className="input w-full" placeholder="Facility, type, or location name" value={draftFilters.search} onChange={(event) => updateFilter('search', event.target.value)} /></div>
          {[['location_id', 'Location', 'locations'], ['type_id', 'Type', 'types']].map(([key, label, kind]) => <div key={key}><label htmlFor={`facility-${key}`} className="mb-1 block font-medium">{label}</label><select id={`facility-${key}`} className="select w-full" value={draftFilters[key]} disabled={!references} onChange={(event) => updateFilter(key, event.target.value)}><option value="">All {kind}</option>{references?.[kind].map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>)}
          {[['min_capacity', 'Minimum capacity'], ['max_capacity', 'Maximum capacity']].map(([key, label]) => <div key={key}><label htmlFor={`facility-${key}`} className="mb-1 block font-medium">{label}</label><input id={`facility-${key}`} type="number" min="1" max="2147483647" step="1" className="input w-full" placeholder="Any capacity" value={draftFilters[key]} onChange={(event) => updateFilter(key, event.target.value)} aria-invalid={Boolean(filterError)} aria-describedby={filterError ? 'facility-filter-error' : undefined} /></div>)}
          <div><label htmlFor="facility-availability" className="mb-1 block font-medium">Availability</label><select id="facility-availability" className="select w-full" value={draftFilters.is_active} onChange={(event) => updateFilter('is_active', event.target.value)}><option value="">All facilities</option><option value="true">Active</option><option value="false">Inactive</option></select></div>
        </div>
        {referenceError ? <div role="alert" className="mt-3"><p className="text-error">{referenceError}</p><button type="button" className="btn btn-sm mt-2" onClick={() => { setReferenceError(''); setReferenceAttempt((value) => value + 1) }}>Retry loading filters</button></div> : !references && <p role="status" className="mt-3">Loading locations and types…</p>}
        {filterError && <p id="facility-filter-error" role="alert" className="mt-3 text-error">{filterError}</p>}
        <div className="mt-4 flex gap-2"><button type="submit" className="btn btn-primary">Apply filters</button><button type="button" className="btn" onClick={resetFilters}>Reset filters</button></div>
      </form>

      <section
        className="mt-6 rounded-box border border-base-300 bg-base-100 p-4"
        aria-label="Facilities list"
        aria-busy={loading}
      >
        {loading ? (
          <p role="status">Loading facilities…</p>
        ) : error ? (
          <div role="alert">
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
          <p role="status">
            {page === 1 ? "No facilities found." : "No more facilities on this page."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {facilities.map((facility) => (
              <article key={facility.id} className="card relative overflow-hidden border border-base-300 bg-base-100 shadow-sm transition-shadow hover:shadow-md">
                {facility.images?.[0] ? <figure><img src={facilityImageUrl(facility.images[0].image_url)} alt={facility.name} loading="lazy" className="h-48 w-full object-cover" /></figure> : <div className="flex h-48 items-center justify-center bg-base-200 text-base-content/60">No photo available</div>}
                <div className="card-body">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="card-title break-words"><Link to={`${manage ? '/admin' : ''}/facilities/${facility.id}`} className="after:absolute after:inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={`View ${facility.name} details`}>{facility.name}</Link></h2>
                    <span className={`badge shrink-0 ${facility.is_active ? 'badge-success' : 'badge-error'}`}>{facility.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <dl className="mt-2 space-y-2">
                    {[['Capacity', `${facility.capacity} people`], ['Type', facility.type?.name || facility.type_id], ['Location', facility.location?.name || facility.location_id]].map(([label, value]) => <div key={label}><dt className="text-sm text-base-content/60">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}
                  </dl>
                  <p className="mt-3 text-sm text-primary">View details →</p>
                  {manage && <div className="card-actions relative z-10 mt-3 justify-end">
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
        className="mt-4 flex items-center justify-center gap-3"
        aria-label="Facilities pagination"
      >
        <button
          type="button"
          className="btn btn-sm"
          disabled={loading || page === 1}
          onClick={() => changePage(page - 1)}
        >
          Previous
        </button>
        <span aria-live="polite">Page {page}</span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={loading || Boolean(error) || !hasNext}
          onClick={() => changePage(page + 1)}
        >
          Next
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
