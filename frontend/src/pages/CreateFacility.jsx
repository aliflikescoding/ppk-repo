import PageHeading from '../components/PageHeading.jsx'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { createFacility } from '../api/index.js'
import FacilityForm from '../components/FacilityForm.jsx'

export default function CreateFacility() {
  const navigate = useNavigate()
  async function save(data) {
    await createFacility(data)
    toast.success('Facility created successfully.')
    navigate('/admin/facilities')
  }
  return <div className="workspace-page workspace-form-page"><Link to="/admin/facilities" className="auth-back">← Back to facilities</Link><section className="workspace-panel mt-4"><div className="workspace-panel-body"><PageHeading>Create facility</PageHeading><FacilityForm onSave={save} /></div></section></div>
}
