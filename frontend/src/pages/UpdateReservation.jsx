import PageHeading from '../components/PageHeading.jsx'
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
  return <div className="workspace-page workspace-form-page"><Link to="/admin/reservations" className="auth-back">← Back to reservations</Link>
    {error ? <div role="alert" className="mt-4"><p>{error}</p><button className="btn mt-3" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !reservation ? <p role="status" className="mt-4">Loading reservation…</p> : <section className="workspace-panel mt-4"><div className="workspace-panel-body"><PageHeading>Update reservation</PageHeading><ReservationForm reservation={reservation} onSave={save} /></div></section>}
  </div>
}
