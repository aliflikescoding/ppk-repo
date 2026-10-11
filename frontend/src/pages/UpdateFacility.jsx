import PageHeading from '../components/PageHeading.jsx'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { readFacilityById, updateFacility } from '../api/index.js'
import FacilityForm from '../components/FacilityForm.jsx'

export default function UpdateFacility() {
  const { id } = useParams()
  return <UpdateFacilityPage key={id} id={id} />
}

function UpdateFacilityPage({ id }) {
  const [facility, setFacility] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    readFacilityById(id).then((data) => { if (active) setFacility(data) }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load facility. Please try again.')
    })
    return () => { active = false }
  }, [id, attempt])
  async function save(data) {
    await updateFacility(id, data)
    toast.success('Facility updated successfully.')
    navigate('/admin/facilities')
  }
  return <div className="workspace-page workspace-form-page"><Link to="/admin/facilities" className="auth-back">← Back to facilities</Link>
    {error ? <div role="alert" className="mt-4"><p>{error}</p><button className="btn mt-3" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !facility ? <p role="status" className="mt-4">Loading facility…</p> : <section className="workspace-panel mt-4"><div className="workspace-panel-body"><PageHeading>Update facility</PageHeading><FacilityForm facility={facility} onSave={save} /></div></section>}
  </div>
}
