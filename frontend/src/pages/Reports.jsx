import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { deleteReport, readReports, reportImageUrl } from '../api/index.js'
import { reportStatuses } from '../validation/report.js'

export default function Reports() {
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState({})
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const dialog = useRef(null)

  useEffect(() => {
    let active = true
    readReports({ page, limit: 20, ...filters }).then((result) => {
      if (active) setData(result)
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load reports. Please try again.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, filters, attempt])

  function reload(nextPage = page) {
    setError(''); setLoading(true); setPage(nextPage); setAttempt((value) => value + 1)
  }
  async function remove() {
    if (!selected || deleting) return
    setDeleting(true); setDeleteError('')
    try {
      await deleteReport(selected.id)
      dialog.current.close(); setSelected(null)
      toast.success('Report deleted successfully.')
      reload(data.reports.length === 1 && page > 1 ? page - 1 : page)
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Unable to delete report. Please try again.')
    } finally { setDeleting(false) }
  }

  return <div className="mx-auto max-w-5xl">
    <Link to="/admin" className="link link-primary">Back to dashboard</Link>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Reports</h1><p className="mt-2">Manage facility reports and their progress.</p></div><div className="flex gap-2"><Link to="/admin/report-categories" className="btn">Manage categories</Link><Link to="/admin/createReport" className="btn btn-primary">Create report</Link></div></div>
    <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={(event) => {
      event.preventDefault(); setLoading(true); setError(''); setPage(1)
      setFilters({ ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}) })
    }}>
      <div className="flex-1"><label htmlFor="report-search" className="mb-1 block">Search reports</label><input id="report-search" className="input w-full" maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Description, facility, or category" /></div>
      <div><label htmlFor="report-status" className="mb-1 block">Status</label><select id="report-status" className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{reportStatuses.map((value) => <option key={value}>{value}</option>)}</select></div>
      <button className="btn" type="submit">Apply filters</button>
    </form>
    <section className="mt-6 rounded-box border border-base-300 bg-base-100 p-4" aria-label="Reports list" aria-busy={loading}>
      {loading ? <p role="status">Loading reports…</p> : error ? <div role="alert"><p>{error}</p><button className="btn mt-3" onClick={() => reload()}>Try again</button></div> : !data?.reports.length ? <p role="status">No reports found.</p> : <><p className="mb-3 text-sm">{data.total} reports</p><div className="overflow-x-auto"><table className="table"><caption className="sr-only">Reports, page {page}</caption><thead><tr><th scope="col">Report</th><th scope="col">Facility</th><th scope="col">Category</th><th scope="col">Reporter</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>{data.reports.map((report) => <tr key={report.id}>
        <td><Link to={`/admin/reports/${report.id}`} className="link link-primary">Report #{report.id}</Link><img src={reportImageUrl(report.photo_report)} alt={`Report ${report.id} photo`} className="my-2 h-16 w-24 rounded object-cover" /><p className="max-w-xs whitespace-pre-wrap break-words">{report.description}</p></td>
        <td>{report.facility?.name || report.facility_id}</td><td>{report.category?.name || report.category_id}</td><td>{report.user?.user_name || report.user?.email || report.user_id}</td><td><span className={`badge ${report.status === 'done' ? 'badge-success' : report.status === 'rejected' ? 'badge-error' : report.status === 'processed' ? 'badge-info' : 'badge-outline'}`}>{report.status}</span></td>
        <td><div className="flex gap-2"><Link to={`/admin/reports/${report.id}`} className="btn btn-sm" aria-label={`View report ${report.id}`}>View</Link><Link to={`/admin/updateReport/${report.id}`} className="btn btn-sm" aria-label={`Edit report ${report.id}`}>Edit</Link><button className="btn btn-error btn-sm" disabled={deleting} aria-label={`Delete report ${report.id}`} onClick={() => { setSelected(report); setDeleteError(''); dialog.current.showModal() }}>Delete</button></div></td>
      </tr>)}</tbody></table></div></>}
    </section>
    <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Reports pagination"><button className="btn btn-sm" disabled={loading || page === 1} onClick={() => reload(page - 1)}>Previous</button><span aria-live="polite">Page {page}</span><button className="btn btn-sm" disabled={loading || Boolean(error) || !data?.has_next} onClick={() => reload(page + 1)}>Next</button></nav>
    <dialog ref={dialog} className="modal" aria-labelledby="report-delete-title" aria-describedby="report-delete-description" onCancel={(event) => { if (deleting) event.preventDefault() }}><div className="modal-box"><h2 id="report-delete-title" className="text-xl font-bold">Delete report</h2><p id="report-delete-description" className="mt-3">Delete report #{selected?.id} and its uploaded photo? This cannot be undone.</p>{deleteError && <p role="alert" className="mt-3 text-error">{deleteError}</p>}<div className="modal-action"><button className="btn" autoFocus disabled={deleting} onClick={() => dialog.current.close()}>Cancel</button><button className="btn btn-error" disabled={deleting} onClick={remove}>{deleting ? 'Deleting…' : 'Delete report'}</button></div></div></dialog>
  </div>
}
