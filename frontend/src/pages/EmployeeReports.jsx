import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiArrowRight, FiClipboard, FiMapPin, FiSearch } from 'react-icons/fi'
import { readMyReports, readReports, reportImageUrl } from '../api/index.js'
import { reportStatuses } from '../validation/report.js'

export default function EmployeeReports({ history = false }) {
  const basePath = history ? '/user' : '/employee'
  const readHistory = history ? readMyReports : readReports
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
    readHistory({ page, limit: 20, ...filters }).then((result) => {
      if (active) setData(result)
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load reports. Please try again.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, filters, attempt, readHistory])

  function reload(nextPage = page) {
    setError(''); setLoading(true); setPage(nextPage); setAttempt((value) => value + 1)
  }

  return <div className="reservation-page">
    <Link to={basePath} className="auth-back"><FiArrowLeft aria-hidden="true" /> Back to dashboard</Link>
    <div className="facilities-heading"><div><p className="auth-eyebrow">KEEPING CAMPUS AT ITS BEST</p><h1 className="text-3xl font-bold">{history ? 'Report history' : 'Reports'}</h1><p className="mt-2">{history ? 'Follow the issues you’ve reported and see how they’re progressing.' : 'Manage facility reports and their progress.'}</p></div></div>
    <form className="reservation-filters facilities-filters" aria-label="Report filters" onSubmit={(event) => {
      event.preventDefault(); setLoading(true); setError(''); setPage(1)
      setFilters({ ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}) })
    }}>
      <div className="flex-1"><label htmlFor="report-search" className="mb-1 block">Search reports</label><input id="report-search" className="input w-full" maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Description, facility, or category" /></div>
      <div><label htmlFor="report-status" className="mb-1 block">Status</label><select id="report-status" className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{reportStatuses.map((value) => <option key={value}>{value}</option>)}</select></div>
      <button className="btn auth-submit" type="submit"><FiSearch aria-hidden="true" /> Apply filters</button>
    </form>
    <section className="reservation-results" aria-label="Reports list" aria-busy={loading}>
      {loading ? <p role="status" className="facilities-state">Loading reports…</p> : error ? <div role="alert" className="facilities-state"><p>{error}</p><button className="btn mt-3" onClick={() => reload()}>Try again</button></div> : !data?.reports.length ? <div role="status" className="facilities-state"><FiClipboard aria-hidden="true" /><p>No reports found.</p>{history && <Link to="/facilities" className="landing-text-link">Explore facilities <FiArrowRight aria-hidden="true" /></Link>}</div> : <><div className="facilities-results-heading"><h2>{history ? 'Your reports' : 'Campus reports'}</h2><p>{data.total} reports</p></div><div className="reservation-grid">{data.reports.map((report) => <article key={report.id} className="facility-card report-history-card">
        <div className="facility-card-image">{report.photo_report ? <img src={reportImageUrl(report.photo_report)} alt={`Photo submitted for report ${report.id}`} loading="lazy" /> : <div className="facility-card-placeholder"><FiClipboard aria-hidden="true" /><span>No photo available</span></div>}</div>
        <div className="report-history-body">
          <div className="reservation-card-top"><p className="auth-eyebrow">REPORT #{report.id}</p><span className={`reservation-status status-${report.status}`}>{report.status}</span></div>
          <h3>{report.facility?.name || `Facility ${report.facility_id}`}</h3>
          <p className="report-category"><FiMapPin aria-hidden="true" /> {report.category?.name || `Category ${report.category_id}`}</p>
          <p className="report-summary">{report.description}</p>
          {!history && <p className="report-card-reporter"><strong>Reported by</strong><br />{report.user?.user_name || report.user?.email || report.user_id}</p>}
          <Link to={`${basePath}/reports/${report.id}${history ? '' : '/resolve'}`} className="facility-details-link" aria-label={`View report ${report.id}`}><span className="facility-animated-text">{history || ['done', 'rejected'].includes(report.status) ? 'View report' : 'Resolve report'}</span><FiArrowRight aria-hidden="true" /></Link>
        </div>
      </article>)}</div></>}
    </section>
    <nav className="facilities-pagination" aria-label="Reports pagination"><button className="btn btn-sm" disabled={loading || page === 1} onClick={() => reload(page - 1)}>Previous</button><span aria-live="polite">Page {page}</span><button className="btn btn-sm" disabled={loading || Boolean(error) || !data?.has_next} onClick={() => reload(page + 1)}>Next</button></nav>

  </div>
}
