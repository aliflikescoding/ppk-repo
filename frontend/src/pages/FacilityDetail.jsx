import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import FacilityCalendar from '../components/FacilityCalendar.jsx'
import { facilityImageUrl, readFacilityById } from '../api/index.js'

export default function FacilityDetail({ manage = false }) {
  const { id } = useParams()
  return <Detail key={id} id={id} manage={manage} />
}

function Detail({ id, manage }) {
  const [facility, setFacility] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    readFacilityById(id).then((data) => {
      if (active) setFacility(data)
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load facility. Please try again.')
    })
    return () => { active = false }
  }, [id, attempt])

  return <div className="mx-auto max-w-4xl">
    <Link to={manage ? '/admin/facilities' : '/facilities'} className="link link-primary">Back to facilities</Link>
    {error ? <div role="alert" className="mt-4"><p>{error}</p><button type="button" className="btn mt-3" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !facility ? <p role="status" className="mt-4">Loading facility…</p> : <section className="card mt-4 border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold break-words">{facility.name}</h1>
          <span className={`badge ${facility.is_active ? 'badge-success' : 'badge-error'}`}>{facility.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {[['Capacity', `${facility.capacity} people`], ['Type', facility.type?.name || facility.type_id], ['Location', facility.location?.name || facility.location_id]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}
        </dl>
        <div className="card-actions mt-5">
          <Link to={`/facilities/${facility.id}/report`} className="btn">Submit a report</Link>
          <Link to={`/facilities/${facility.id}/reserve`} className="btn btn-primary">Submit a reservation</Link>
        </div>
        <FacilityCalendar facilityId={facility.id} active={facility.is_active} />
        <h2 className="mt-6 text-xl font-semibold">Photos</h2>
        {facility.images?.length ? <div className="mt-3 grid gap-4 sm:grid-cols-2">{facility.images.map((image, index) => <a key={image.id || image.image_url} href={facilityImageUrl(image.image_url)} target="_blank" rel="noreferrer" className="rounded-box focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={`Open ${facility.name} photo ${index + 1}`}><img src={facilityImageUrl(image.image_url)} alt={`${facility.name}, photo ${index + 1}`} loading="lazy" className="h-64 w-full rounded-box bg-base-200 object-contain" /></a>)}</div> : <p className="mt-2 text-base-content/60">No photos available.</p>}
        {manage && <div className="card-actions mt-6"><Link to={`/admin/updateFacility/${facility.id}`} className="btn btn-primary">Edit facility</Link></div>}
      </div>
    </section>}
  </div>
}
