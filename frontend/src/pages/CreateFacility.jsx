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
  return <div className="mx-auto max-w-lg"><Link to="/admin/facilities" className="link link-primary">Back to facilities</Link><section className="card mt-4 border border-base-300 bg-base-100 shadow-sm"><div className="card-body"><h1 className="text-3xl font-bold">Create facility</h1><FacilityForm onSave={save} /></div></section></div>
}
