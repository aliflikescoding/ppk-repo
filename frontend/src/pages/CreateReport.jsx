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
  return <div className="mx-auto max-w-lg"><Link to="/admin/reports" className="link link-primary">Back to reports</Link><section className="card mt-4 border border-base-300 bg-base-100 shadow-sm"><div className="card-body"><h1 className="text-3xl font-bold">Create report</h1><p>Reports are created under your account with status new.</p><ReportForm onSave={save} /></div></section></div>
}
