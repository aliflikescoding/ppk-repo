import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { readReservationById, updateReservation } from '../api/index.js'
import ReservationForm from '../components/ReservationForm.jsx'

export default function UpdateReservation() {
  const { id } = useParams()
  return <UpdateReservationPage key={id} id={id} />
}

function UpdateReservationPage({ id }) {
  const [reservation, setReservation] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    readReservationById(id).then((data) => { if (active) setReservation(data) }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load reservation. Please try again.')
    })
    return () => { active = false }
  }, [id, attempt])
  async function save(data) {
    if (Object.keys(data).length) await updateReservation(id, data)
    toast.success('Reservation updated successfully.')
    navigate('/admin/reservations')
  }
  return <div className="mx-auto max-w-lg"><Link to="/admin/reservations" className="link link-primary">Back to reservations</Link>
    {error ? <div role="alert" className="mt-4"><p>{error}</p><button className="btn mt-3" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !reservation ? <p role="status" className="mt-4">Loading reservation…</p> : <section className="card mt-4 border border-base-300 bg-base-100 shadow-sm"><div className="card-body"><h1 className="text-3xl font-bold">Update reservation</h1><ReservationForm reservation={reservation} onSave={save} /></div></section>}
  </div>
}
