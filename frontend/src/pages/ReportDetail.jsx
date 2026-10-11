import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiArrowUpRight, FiClipboard, FiFileText, FiImage, FiUser } from 'react-icons/fi'
import { readReportById, reportImageUrl } from '../api/index.js'

export default function ReportDetail({ readOnly = false }) {
  const { id } = useParams()
  return <Detail key={id} id={id} readOnly={readOnly} />
}

function Detail({ id, readOnly }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    readReportById(id).then((data) => { if (active) setReport(data) }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load report. Please try again.')
    })
    return () => { active = false }
  }, [id, attempt])
  return <div className="reservation-page">
    <Link to={readOnly ? '/user/reports' : '/admin/reports'} className="auth-back"><FiArrowLeft aria-hidden="true" /> Back to reports</Link>
    {error ? <div role="alert" className="facilities-state"><p>{error}</p><button className="btn auth-submit" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !report ? <p role="status" className="facilities-state">Loading report…</p> : <>
      <section className="facilities-heading reservation-detail-heading" aria-labelledby="report-title">
        <div><p className="auth-eyebrow">CAMPUS CARE · REPORT DETAILS</p><h1 id="report-title">Report #{report.id}</h1><p className="facilities-intro">{report.facility?.name || `Facility ${report.facility_id}`}</p></div>
        <span className={`reservation-status status-${report.status}`}>{report.status}</span>
      </section>
      <div className="reservation-detail-grid">
        <section className="reservation-detail-panel" aria-labelledby="report-info-title">
          <h2 id="report-info-title"><FiClipboard aria-hidden="true" /> Report information</h2>
          <dl className="reservation-detail-data">
            <div><dt>Facility</dt><dd>{report.facility?.name || report.facility_id}</dd></div>
            <div><dt>Category</dt><dd>{report.category?.name || report.category_id}</dd></div>
            <div><dt>Status</dt><dd><span className={`reservation-status status-${report.status}`}>{report.status}</span></dd></div>
          </dl>
        </section>
        <section className="reservation-detail-panel" aria-labelledby="reporter-title">
          <h2 id="reporter-title"><FiUser aria-hidden="true" /> Reported by</h2>
          <dl className="reservation-detail-data"><div><dt>Name</dt><dd>{report.user?.user_name || report.user_id}</dd></div><div><dt>Email address</dt><dd>{report.user?.email || '—'}</dd></div></dl>
        </section>
        <section className="reservation-detail-panel reservation-reason-panel" aria-labelledby="description-title"><h2 id="description-title"><FiFileText aria-hidden="true" /> What happened</h2><p className="reservation-detail-reason">{report.description}</p><div className="report-reason"><h3>Reason</h3><p className="reservation-detail-reason">{report.reason || 'No reason provided.'}</p></div></section>
        <section className="reservation-detail-panel reservation-reason-panel" aria-labelledby="photo-title"><h2 id="photo-title"><FiImage aria-hidden="true" /> Submitted photo</h2>
          {report.photo_report ? <a href={reportImageUrl(report.photo_report)} target="_blank" rel="noreferrer" className="report-photo-link"><img src={reportImageUrl(report.photo_report)} alt={`Photo submitted for report ${id}`} className="report-detail-photo" /><span>Open full photo <FiArrowUpRight aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></span></a> : <p className="reservation-detail-reason">No photo available.</p>}
        </section>
      </div>
      {!readOnly && <Link to={`/admin/updateReport/${id}`} className="btn auth-submit mt-6">Edit report</Link>}
    </>}
  </div>
}
