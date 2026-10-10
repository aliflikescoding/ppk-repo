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
  return <div className="mx-auto max-w-lg"><Link to="/admin/reservations" className="link link-primary">Back to reservations</Link><section className="card mt-4 border border-base-300 bg-base-100 shadow-sm"><div className="card-body"><h1 className="text-3xl font-bold">Create reservation</h1><p>Create a reservation for your account or another user.</p><ReservationForm onSave={save} /></div></section></div>
}
