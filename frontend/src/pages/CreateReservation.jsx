import PageHeading from '../components/PageHeading.jsx'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { createReservation } from '../api/index.js'
import ReservationForm from '../components/ReservationForm.jsx'

export default function CreateReservation() {
  const navigate = useNavigate()
  async function save(data) {
    await createReservation(data)
    toast.success('Reservation created successfully.')
    navigate('/admin/reservations')
  }
  return <div className="workspace-page workspace-form-page"><Link to="/admin/reservations" className="auth-back">← Back to reservations</Link><section className="workspace-panel mt-4"><div className="workspace-panel-body"><PageHeading>Create reservation</PageHeading><p>Create a reservation for your account or another user.</p><ReservationForm onSave={save} /></div></section></div>
}
