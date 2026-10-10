import { useEffect, useState } from 'react'
import { readFacilityCalendar } from '../api/index.js'
import { daySlots, jakartaDay, monthDate, shiftMonth } from '../utils/calendar.js'

const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
const monthLabel = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', month: 'long', year: 'numeric' })
const dayLabel = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', dateStyle: 'full' })

export default function FacilityCalendar({ facilityId, active }) {
  const [month, setMonth] = useState(() => jakartaDay().slice(0, 7))
  const [day, setDay] = useState(() => jakartaDay())
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${facilityId}/${month}/${attempt}`
  const loading = result?.key !== requestKey
  const error = loading ? '' : result.error
  const reservations = loading || error ? [] : result.reservations

  useEffect(() => {
    const controller = new AbortController()
    readFacilityCalendar(facilityId, `${month}-01T00:00:00+07:00`, `${shiftMonth(month, 1)}-01T00:00:00+07:00`, controller.signal).then((data) => {
      if (!controller.signal.aborted) setResult({ key: requestKey, reservations: data, error: '' })
    }).catch((err) => {
      if (!controller.signal.aborted) setResult({ key: requestKey, reservations: [], error: err.response?.data?.message || 'Unable to load availability. Please try again.' })
    })
    return () => controller.abort()
  }, [facilityId, month, requestKey])

  function changeMonth(offset) {
    const next = shiftMonth(month, offset)
    setMonth(next); setDay(monthDate(next))
  }
  const first = new Date(`${month}-01T00:00:00Z`)
  const blanks = (first.getUTCDay() + 6) % 7
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()

  return <section className="mt-6 border-t border-base-300 pt-6" aria-labelledby="availability-title" aria-busy={loading}>
    <h2 id="availability-title" className="text-xl font-semibold">Reservation calendar</h2>
    <p className="mt-2 text-sm">Asia/Jakarta (UTC+7), 07:00–20:00. Select a day to see reserved and free time ranges.</p>
    {!active && <p className="mt-2 text-warning">This facility is inactive and cannot accept reservation requests.</p>}
    <div className="my-4 flex flex-wrap items-center justify-between gap-3">
      <button type="button" className="btn btn-sm" onClick={() => changeMonth(-1)} aria-label="Previous month">Previous</button>
      <h3 className="font-semibold" aria-live="polite">{monthLabel.format(new Date(`${month}-01T00:00:00+07:00`))}</h3>
      <button type="button" className="btn btn-sm" onClick={() => changeMonth(1)} aria-label="Next month">Next</button>
    </div>
    {loading ? <p role="status">Loading reservations…</p> : error ? <div role="alert"><p className="text-error">{error}</p><button type="button" className="btn btn-sm mt-2" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div> : <>
      <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-label="Choose a calendar day">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => <div key={label} className="py-2 text-center text-xs font-semibold sm:text-sm">{label}</div>)}
        {Array.from({ length: blanks }, (_, index) => <div key={`blank-${index}`} aria-hidden="true" />)}
        {Array.from({ length: count }, (_, index) => {
          const date = monthDate(month, index + 1)
          const reserved = daySlots(date, reservations).some((slot) => slot.reserved)
          return <button key={date} type="button" aria-pressed={day === date} aria-label={`${date}, ${reserved ? 'has reserved times' : 'no reservations'}`} onClick={() => setDay(date)} className={`min-h-16 rounded-box border p-1 text-center sm:min-h-20 ${day === date ? 'border-primary ring-2 ring-primary' : 'border-base-300'} ${reserved ? 'bg-error/10' : 'bg-base-200'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}>
            <span className="block font-semibold">{index + 1}</span><span className="mt-1 block text-[10px] sm:text-xs">{reserved ? 'Reserved times' : 'No bookings'}</span>
          </button>
        })}
      </div>
      <div className="mt-5" aria-live="polite"><h3 className="font-semibold">{dayLabel.format(new Date(`${day}T12:00:00+07:00`))}</h3>
        <ul className="mt-3 space-y-2">{daySlots(day, reservations).map((slot) => <li key={slot.start} className="flex flex-wrap items-center justify-between gap-2 rounded-box bg-base-200 p-3"><span>{clock.format(slot.start)}–{clock.format(slot.end)}</span><span className={`badge ${slot.reserved ? 'badge-error' : active ? 'badge-success' : 'badge-outline'}`}>{slot.reserved ? 'Reserved' : active ? 'Free' : 'No booking · Inactive'}</span></li>)}</ul>
      </div>
      <button type="button" className="btn btn-sm mt-4" onClick={() => setAttempt((value) => value + 1)}>Refresh availability</button>
      <p className="mt-2 text-sm text-base-content/60">Availability can change. A reservation is confirmed only after approval.</p>
    </>}
  </section>
}
