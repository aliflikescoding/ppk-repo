import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { deleteFacility, readFacilities, facilityImageUrl } from '../api/index.js'

const pageSize = 20

export default function Facilities({ manage = false }) {
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
        const data = await readFacilities(page, pageSize)
        if (active) { setFacilities(data.facilities); setHasNext(data.has_next) }
      } catch (err) {
        if (active) {
          setError(err.response?.status === 403
            ? 'Only admins can view facilities.'
            : 'Unable to load facilities. Please try again.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadFacilities()
    return () => { active = false }
  }, [page, attempt])

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
        {manage && <div>
          <Link to="/admin/createFacility" className="btn">
            Create Facility
          </Link>
        </div>}
      </div>

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
          <div className="overflow-x-auto">
            <table className="table w-full text-left">
              <caption className="sr-only">
                Facilities, page {page}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Capacity</th>
                  <th scope="col">Type</th>
                  <th scope="col">Location</th>
                  <th scope="col">Status</th>
                  {manage && <th scope="col" className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {facilities.map((facility) => (
                  <tr key={facility.id}>
                    <td><div className="flex items-center gap-3">{facility.images?.[0] && <img src={facilityImageUrl(facility.images[0].image_url)} alt={facility.name} className="h-16 w-24 rounded object-cover" />}<span>{facility.name}</span></div></td>
                    <td>{facility.capacity}</td>
                    <td>{facility.type?.name || facility.type_id}</td>
                    <td>{facility.location?.name || facility.location_id}</td>
                    <td>
                      <span className={`badge ${facility.is_active === true ? 'badge-success' : facility.is_active === false ? 'badge-error' : 'badge-outline'}`}>
                        {facility.is_active === true ? 'Active' : facility.is_active === false ? 'Inactive' : 'Unknown'}
                      </span>
                    </td>
                    {manage && <td>
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/updateFacility/${facility.id}`} className="btn btn-sm" aria-label={`Edit ${facility.name}`}>Edit</Link>
                        <button type="button" className="btn btn-error btn-sm" onClick={() => openDelete(facility)} aria-label={`Delete ${facility.name}`}>Delete</button>
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
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
