import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
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

  return <div className="mx-auto max-w-2xl">
    {saving ? <span className="text-sm">Saving resolution…</span> : <Link to="/employee/reports" className="link link-primary">Back to reports</Link>}
    {error ? <div role="alert" className="mt-4"><p>{error}</p><button type="button" className="btn mt-3" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !report ? <p role="status" className="mt-4">Loading report and preparing resolution…</p> : <section className="card mt-4 border border-base-300 bg-base-100 shadow-sm"><div className="card-body">
      <h1 className="text-3xl font-bold">Resolve report #{report.id}</h1>
      <dl className="mt-3 space-y-3">{[['Facility', report.facility?.name || report.facility_id], ['Category', report.category?.name || report.category_id], ['Reporter', report.user?.user_name || report.user?.email || report.user_id], ['Status', report.status], ['Description', report.description]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>
      <a href={reportImageUrl(report.photo_report)} target="_blank" rel="noreferrer" className="mt-3"><img src={reportImageUrl(report.photo_report)} alt={`Report ${report.id} photo`} className="max-h-96 w-full rounded object-contain" /></a>
      {report.status === 'processed' ? <form className="mt-4" noValidate onSubmit={finish} aria-busy={saving}><fieldset disabled={saving}>
        <p className="mb-3">This report stays processed when you go back. Enter a reason to complete or reject it.</p>
        <label htmlFor="resolution-reason" className="mb-1 block font-medium">Reason (required)</label>
        <textarea id="resolution-reason" className="textarea w-full" required maxLength={500} value={reason} onChange={(event) => { setReason(event.target.value); setSaveError('') }} aria-invalid={Boolean(saveError)} aria-describedby={saveError ? 'resolution-error' : undefined} />
        {saveError && <p id="resolution-error" role="alert" className="mt-2 text-error">{saveError}</p>}
        <div className="mt-4 flex gap-3"><button type="submit" value="done" className="btn btn-success">{saving ? 'Saving…' : 'Mark done'}</button><button type="submit" value="rejected" className="btn btn-error">Reject</button></div>
      </fieldset></form> : <div className="mt-4"><p>This report has already been {report.status === 'done' ? 'completed' : 'rejected'}.</p><h2 className="mt-3 font-semibold">Reason</h2><p className="whitespace-pre-wrap break-words">{report.reason || 'No reason provided.'}</p></div>}
    </div></section>}
  </div>
}
