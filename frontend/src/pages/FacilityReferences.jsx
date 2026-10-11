import PageHeading from '../components/PageHeading.jsx'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { deleteFacilityReference, readFacilityReferences, saveFacilityReference, deleteReportCategory, readReportCategories, saveReportCategory } from '../api/index.js'

export default function FacilityReferences({ kind }) {
  const category = kind === 'categories'
  const label = category ? 'category' : kind === 'types' ? 'type' : 'location'
  const title = category ? 'Report categories' : kind === 'types' ? 'Facility types' : 'Facility locations'
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [records, setRecords] = useState([])
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const dialog = useRef(null)

  useEffect(() => {
    let active = true
    const request = (category ? readReportCategories(page) : readFacilityReferences(kind, page))
    request.then((data) => {
      if (active) { setRecords(data[kind]); setHasNext(data.has_next) }
    }).catch((error) => {
      if (active) setLoadError(error.response?.data?.message || `Unable to load ${kind}. Please try again.`)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [kind, category, page, attempt])

  function reload(nextPage = page) {
    setLoading(true)
    setLoadError('')
    setPage(nextPage)
    setAttempt((value) => value + 1)
  }

  async function save(event) {
    event.preventDefault()
    if (saving) return
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > 50) { setFormError('Enter a name containing 1–50 characters.'); return }
    setSaving(true)
    setFormError('')
    try {
      await (category ? saveReportCategory(trimmed, editing?.id) : saveFacilityReference(kind, trimmed, editing?.id))
      toast.success(`${category ? 'Report' : 'Facility'} ${label} ${editing ? 'updated' : 'created'} successfully.`)
      setEditing(null)
      setName('')
      reload()
    } catch (error) {
      setFormError(error.response?.data?.message || `Unable to save ${label}. Please try again.`)
    } finally { setSaving(false) }
  }

  async function remove() {
    if (!selected || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await (category ? deleteReportCategory(selected.id) : deleteFacilityReference(kind, selected.id))
      dialog.current.close()
      if (editing?.id === selected.id) { setEditing(null); setName(''); setFormError('') }
      setSelected(null)
      toast.success(`${category ? 'Report' : 'Facility'} ${label} deleted successfully.`)
      reload(records.length === 1 && page > 1 ? page - 1 : page)
    } catch (error) {
      setDeleteError(error.response?.data?.message || `Unable to delete ${label}. Please try again.`)
    } finally { setDeleting(false) }
  }

  return <div className="workspace-page workspace-list-page">
    <Link to="/admin" className="auth-back">← Back to dashboard</Link>
    <PageHeading>{title}</PageHeading>
    <p className="mt-2">Manage the {kind} available in {category ? 'report' : 'facility'} dropdowns.</p>
    <nav className="mt-4 flex flex-wrap gap-3" aria-label="Facility management">
      <Link to={category ? "/admin/reports" : "/admin/facilities"} className="btn btn-sm">{category ? "Reports" : "Facilities"}</Link>
      {!category && <Link to={`/admin/facility-${kind === 'types' ? 'locations' : 'types'}`} className="btn btn-sm">{kind === 'types' ? 'Locations' : 'Types'}</Link>}
    </nav>
    <section className="workspace-panel mt-6">
      <h2 className="text-xl font-bold">{editing ? `Edit ${label}` : `Create ${label}`}</h2>
      <form className="mt-3" noValidate onSubmit={save} aria-busy={saving}>
        <fieldset disabled={saving}>
          <label htmlFor="reference-name" className="mb-1 block font-medium">Name</label>
          <input id="reference-name" className="input w-full" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(formError)} aria-describedby={formError ? 'reference-error' : undefined} />
          {formError && <p id="reference-error" role="alert" className="mt-2 text-error">{formError}</p>}
          <div className="mt-3 flex gap-2"><button className="btn auth-submit" type="submit">{saving ? 'Saving…' : editing ? 'Save changes' : `Create ${label}`}</button>
            {editing && <button className="btn" type="button" onClick={() => { setEditing(null); setName(''); setFormError('') }}>Cancel edit</button>}
          </div>
        </fieldset>
      </form>
    </section>
    <section className="workspace-panel mt-6" aria-label={title} aria-busy={loading}>
      {loading ? <p role="status">Loading {kind}…</p> : loadError ? <div role="alert"><p>{loadError}</p><button className="btn mt-3" onClick={() => reload()}>Try again</button></div> : records.length === 0 ? <p role="status">No {kind} found.</p> : <div className="overflow-x-auto"><table className="table">
        <caption className="sr-only">{title}, page {page}</caption>
        <thead><tr><th scope="col">Name</th><th scope="col" className="text-right">Actions</th></tr></thead>
        <tbody>{records.map((record) => <tr key={record.id}><td>{record.name}</td><td><div className="flex justify-end gap-2">
          <button className="btn btn-sm" disabled={saving || deleting} aria-label={`Edit ${record.name}`} onClick={() => { setEditing(record); setName(record.name); setFormError(''); document.getElementById('reference-name').focus() }}>Edit</button>
          <button className="btn btn-error btn-sm" disabled={saving || deleting} aria-label={`Delete ${record.name}`} onClick={() => { setSelected(record); setDeleteError(''); dialog.current.showModal() }}>Delete</button>
        </div></td></tr>)}</tbody>
      </table></div>}
    </section>
    <nav className="facilities-pagination" aria-label={`${title} pagination`}>
      <button className="btn btn-sm" disabled={loading || page === 1} onClick={() => reload(page - 1)}>Previous</button><span aria-live="polite">Page {page}</span><button className="btn btn-sm" disabled={loading || Boolean(loadError) || !hasNext} onClick={() => reload(page + 1)}>Next</button>
    </nav>
    <dialog ref={dialog} className="modal" aria-labelledby="reference-delete-title" aria-describedby="reference-delete-description" onCancel={(event) => { if (deleting) event.preventDefault() }}><div className="modal-box reservation-modal">
      <h2 id="reference-delete-title" className="text-xl font-bold">Delete {label}</h2>
      <p id="reference-delete-description" className="mt-3">Delete {selected?.name}? This cannot be undone. A {label} used by a {category ? 'report' : 'facility'} cannot be deleted.</p>
      {deleteError && <p role="alert" className="mt-3 text-error">{deleteError}</p>}
      <div className="modal-action"><button className="btn" autoFocus disabled={deleting} onClick={() => dialog.current.close()}>Cancel</button><button className="btn btn-error" disabled={deleting} onClick={remove}>{deleting ? 'Deleting…' : `Delete ${label}`}</button></div>
    </div></dialog>
  </div>
}
