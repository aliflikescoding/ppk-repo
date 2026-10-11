import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { FiArrowLeft, FiArrowUpRight, FiCheck, FiClipboard, FiFileText, FiImage, FiInfo, FiUser, FiX } from 'react-icons/fi'
import { readReportById, reportImageUrl, updateReport } from '../api/index.js'

export default function ResolveReport() {
  const { id } = useParams()
  return <ResolveReportPage key={id} id={id} />
}

function ResolveReportPage({ id }) {
  const [report, setReport] = useState(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    async function load() {
      try {
        let data = await readReportById(id)
        if (!active) return
        if (data.status === 'new') data = await updateReport(id, { status: 'processed' })
        if (active) {
          setReport(data)
          setReason(data.reason || '')
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Unable to open report for resolution. Please try again.')
      }
    }
    load()
    return () => { active = false }
  }, [id, attempt])

  async function finish(event) {
    event.preventDefault()
    if (pending.current || report?.status !== 'processed') return
    const status = event.nativeEvent.submitter?.value
    if (!['done', 'rejected'].includes(status)) return
    const trimmed = reason.trim()
    if (!trimmed || trimmed.length > 500) {
      setSaveError('Enter a reason containing 1–500 characters before completing or rejecting this report.')
      return
    }
    pending.current = true
    setSaving(true)
    setSaveError('')
    try {
      await updateReport(id, { status, reason: trimmed })
      toast.success(`Report ${status === 'done' ? 'completed' : 'rejected'} successfully.`)
      navigate('/employee/reports')
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Unable to resolve report. Please try again.')
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return <div className="reservation-page">
    {saving ? <p role="status" className="auth-back">Saving resolution…</p> : <Link to="/employee/reports" className="auth-back"><FiArrowLeft aria-hidden="true" /> Back to reports</Link>}
    {error ? <div role="alert" className="facilities-state"><p>{error}</p><button type="button" className="btn auth-submit" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !report ? <p role="status" className="facilities-state">Loading report and preparing resolution…</p> : <>
      <section className="facilities-heading reservation-detail-heading" aria-labelledby="resolve-title">
        <div><p className="auth-eyebrow">CAMPUS CARE · REPORT REVIEW</p><h1 id="resolve-title">{report.status === 'processed' ? 'Resolve' : 'Review'} report #{report.id}</h1><p className="facilities-intro">{report.facility?.name || `Facility ${report.facility_id}`}</p></div>
        <span className={`reservation-status status-${report.status}`}>{report.status}</span>
      </section>
      <div className="reservation-detail-grid">
        <section className="reservation-detail-panel" aria-labelledby="report-info-title"><h2 id="report-info-title"><FiClipboard aria-hidden="true" /> Report information</h2><dl className="reservation-detail-data"><div><dt>Facility</dt><dd>{report.facility?.name || report.facility_id}</dd></div><div><dt>Category</dt><dd>{report.category?.name || report.category_id}</dd></div><div><dt>Status</dt><dd><span className={`reservation-status status-${report.status}`}>{report.status}</span></dd></div></dl></section>
        <section className="reservation-detail-panel" aria-labelledby="reporter-title"><h2 id="reporter-title"><FiUser aria-hidden="true" /> Reported by</h2><dl className="reservation-detail-data"><div><dt>Name</dt><dd>{report.user?.user_name || report.user?.email || report.user_id}</dd></div>{report.user?.email && <div><dt>Email address</dt><dd>{report.user.email}</dd></div>}</dl></section>
        <section className="reservation-detail-panel reservation-reason-panel" aria-labelledby="description-title"><h2 id="description-title"><FiFileText aria-hidden="true" /> What happened</h2><p className="reservation-detail-reason">{report.description}</p></section>
        <section className="reservation-detail-panel reservation-reason-panel" aria-labelledby="photo-title"><h2 id="photo-title"><FiImage aria-hidden="true" /> Submitted photo</h2>{report.photo_report ? <a href={reportImageUrl(report.photo_report)} target="_blank" rel="noreferrer" className="report-photo-link"><img src={reportImageUrl(report.photo_report)} alt={`Photo submitted for report ${report.id}`} className="report-detail-photo" /><span>Open full photo <FiArrowUpRight aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></span></a> : <p className="reservation-detail-reason">No photo available.</p>}</section>
      </div>
      <section className="reservation-detail-panel resolution-panel" aria-labelledby="decision-title"><h2 id="decision-title"><FiFileText aria-hidden="true" /> {report.status === 'processed' ? 'Resolve this report' : 'Resolution'}</h2>
        {report.status === 'processed' ? <form className="resolution-form" noValidate onSubmit={finish} aria-busy={saving}><fieldset disabled={saving}>
          <p className="reservation-notice"><FiInfo aria-hidden="true" /><span>This report stays processed when you go back. Enter a reason to complete or reject it.</span></p>
          <label htmlFor="resolution-reason">Reason <span>(required)</span></label>
          <textarea id="resolution-reason" className="textarea w-full" placeholder="Describe the resolution or explain why this report is being rejected." required maxLength={500} rows={5} value={reason} onChange={(event) => { setReason(event.target.value); setSaveError('') }} aria-invalid={Boolean(saveError)} aria-describedby={saveError ? 'resolution-hint resolution-error' : 'resolution-hint'} />
          <p id="resolution-hint" className="resolution-hint">Use 1–500 characters. {reason.length}/500</p>
          {saveError && <p id="resolution-error" role="alert" className="mt-2 text-error">{saveError}</p>}
          <div className="resolution-actions"><button type="submit" value="done" className="btn auth-submit"><FiCheck aria-hidden="true" />{saving ? 'Saving…' : 'Mark done'}</button><button type="submit" value="rejected" className="btn resolution-reject"><FiX aria-hidden="true" />Reject report</button></div>
        </fieldset></form> : <div><p className="reservation-notice"><FiInfo aria-hidden="true" /><span>This report has already been {report.status === 'done' ? 'completed' : 'rejected'}.</span></p><h3 className="mt-6 font-semibold">Reason</h3><p className="reservation-detail-reason">{report.reason || 'No reason provided.'}</p></div>}
      </section>
    </>}
  </div>
}
