import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { readReports, reportImageUrl } from '../api/index.js'
import { reportStatuses } from '../validation/report.js'

export default function EmployeeReports() {
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [filters, setFilters] = useState({})

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

  return <div className="mx-auto max-w-5xl">
    <Link to="/employee" className="link link-primary">Back to dashboard</Link>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Reports</h1><p className="mt-2">Manage facility reports and their progress.</p></div></div>
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
        <td><Link to={`/employee/reports/${report.id}/resolve`} className="link link-primary">Report #{report.id}</Link><img src={reportImageUrl(report.photo_report)} alt={`Report ${report.id} photo`} className="my-2 h-16 w-24 rounded object-cover" /><p className="max-w-xs whitespace-pre-wrap break-words">{report.description}</p></td>
        <td>{report.facility?.name || report.facility_id}</td><td>{report.category?.name || report.category_id}</td><td>{report.user?.user_name || report.user?.email || report.user_id}</td><td><span className={`badge ${report.status === 'done' ? 'badge-success' : report.status === 'rejected' ? 'badge-error' : report.status === 'processed' ? 'badge-info' : 'badge-outline'}`}>{report.status}</span></td>
        <td><Link to={`/employee/reports/${report.id}/resolve`} className="btn btn-primary btn-sm" aria-label={`${['done', 'rejected'].includes(report.status) ? 'View' : 'Resolve'} report ${report.id}`}>{['done', 'rejected'].includes(report.status) ? 'View' : 'Resolve'}</Link></td>
      </tr>)}</tbody></table></div></>}
    </section>
    <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Reports pagination"><button className="btn btn-sm" disabled={loading || page === 1} onClick={() => reload(page - 1)}>Previous</button><span aria-live="polite">Page {page}</span><button className="btn btn-sm" disabled={loading || Boolean(error) || !data?.has_next} onClick={() => reload(page + 1)}>Next</button></nav>

  </div>
}
