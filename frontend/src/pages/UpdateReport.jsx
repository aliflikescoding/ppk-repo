import PageHeading from '../components/PageHeading.jsx'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { readReportById, updateReport } from '../api/index.js'
import ReportForm from '../components/ReportForm.jsx'

export default function UpdateReport() {
  const { id } = useParams()
  return <UpdateReportPage key={id} id={id} />
}

function UpdateReportPage({ id }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    readReportById(id).then((data) => { if (active) setReport(data) }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load report. Please try again.')
    })
    return () => { active = false }
  }, [id, attempt])
  async function save(data, options) {
    await updateReport(id, data, options)
    toast.success('Report updated successfully.')
    navigate('/admin/reports')
  }
  return <div className="workspace-page workspace-form-page"><Link to="/admin/reports" className="auth-back">← Back to reports</Link>
    {error ? <div role="alert" className="mt-4"><p>{error}</p><button className="btn mt-3" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !report ? <p role="status" className="mt-4">Loading report…</p> : <section className="workspace-panel mt-4"><div className="workspace-panel-body"><PageHeading>Update report</PageHeading><ReportForm report={report} onSave={save} /></div></section>}
  </div>
}
