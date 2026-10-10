import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
  return <div className="mx-auto max-w-2xl"><Link to={readOnly ? '/user/reports' : '/admin/reports'} className="link link-primary">Back to reports</Link>
    {error ? <div role="alert" className="mt-4"><p>{error}</p><button className="btn mt-3" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !report ? <p role="status" className="mt-4">Loading report…</p> : <section className="card mt-4 border border-base-300 bg-base-100"><div className="card-body"><div className="flex items-center justify-between gap-3"><h1 className="text-3xl font-bold">Report #{report.id}</h1>{!readOnly && <Link to={`/admin/updateReport/${id}`} className="btn">Edit report</Link>}</div><dl className="space-y-3">{[['Facility', report.facility?.name || report.facility_id], ['Category', report.category?.name || report.category_id], ['Reporter', report.user?.user_name || report.user_id], ['Email', report.user?.email || '—'], ['Status', report.status], ['Description', report.description], ['Reason', report.reason || 'No reason provided.']].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div>)}</dl><a href={reportImageUrl(report.photo_report)} target="_blank" rel="noreferrer" className="mt-3"><img src={reportImageUrl(report.photo_report)} alt={`Report ${id} photo`} className="max-h-96 w-full rounded object-contain" /></a></div></section>}
  </div>
}
