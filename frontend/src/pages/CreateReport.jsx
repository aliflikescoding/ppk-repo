import PageHeading from '../components/PageHeading.jsx'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { createReport } from '../api/index.js'
import ReportForm from '../components/ReportForm.jsx'

export default function CreateReport() {
  const navigate = useNavigate()
  async function save(data) {
    await createReport(data)
    toast.success('Report created successfully.')
    navigate('/admin/reports')
  }
  return <div className="workspace-page workspace-form-page"><Link to="/admin/reports" className="auth-back">← Back to reports</Link><section className="workspace-panel mt-4"><div className="workspace-panel-body"><PageHeading>Create report</PageHeading><p>Reports are created under your account with status new.</p><ReportForm onSave={save} /></div></section></div>
}
