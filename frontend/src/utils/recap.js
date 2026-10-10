const dayMs = 86400000
const hourMs = 3600000

export function recapPeriod(from, to) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error('Pilih tanggal mulai dan akhir yang valid.')
  const start = new Date(`${from}T00:00:00+07:00`).getTime()
  const last = new Date(`${to}T00:00:00+07:00`).getTime()
  const actualDay = (stamp) => new Date(stamp + 7 * hourMs).toISOString().slice(0, 10)
  if (!Number.isFinite(start) || !Number.isFinite(last) || actualDay(start) !== from || actualDay(last) !== to || last < start) throw new Error('Tanggal akhir tidak boleh sebelum tanggal mulai.')
  const days = (last - start) / dayMs + 1
  if (days > 366) throw new Error('Pilih periode maksimal 366 hari.')
  return { start, end: last + dayMs, days, from: `${from}T00:00:00+07:00`, to: new Date(last + dayMs).toISOString() }
}

export function buildRecap(facilities, reservations, reports, filters) {
  const period = recapPeriod(filters.from, filters.to)
  const selected = facilities.filter((facility) => (!filters.location_id || String(facility.location_id) === filters.location_id) && (!filters.facility_id || String(facility.id) === filters.facility_id))
  const occupancy = new Map()
  const bookingCounts = new Map()
  for (const booking of reservations) {
    if (booking.status !== 'done') continue
    const start = Math.max(period.start, new Date(booking.start_time).getTime())
    const end = Math.min(period.end, new Date(booking.end_time).getTime())
    if (!(end > start)) continue
    bookingCounts.set(booking.facility_id, (bookingCounts.get(booking.facility_id) || 0) + 1)
    const intervals = occupancy.get(booking.facility_id) || []
    // Limit occupied hours to the backend's 07:00–20:00 Jakarta business window.
    for (let day = period.start; day < period.end; day += dayMs) {
      const a = Math.max(start, day + 7 * hourMs), b = Math.min(end, day + 20 * hourMs)
      if (b > a) intervals.push([a, b])
    }
    occupancy.set(booking.facility_id, intervals)
  }
  const counts = new Map()
  for (const report of reports) {
    if (report.status === 'rejected' || (filters.category_id && String(report.category_id) !== filters.category_id)) continue
    const row = counts.get(report.facility_id) || { new: 0, processed: 0, done: 0 }
    if (Object.hasOwn(row, report.status)) row[report.status]++
    counts.set(report.facility_id, row)
  }
  const rows = selected.map((facility) => {
    const intervals = (occupancy.get(facility.id) || []).sort((a, b) => a[0] - b[0])
    let duration = 0, current = null
    for (const interval of intervals) {
      if (current && interval[0] <= current[1]) current[1] = Math.max(current[1], interval[1])
      else { if (current) duration += current[1] - current[0]; current = [...interval] }
    }
    if (current) duration += current[1] - current[0]
    const statuses = counts.get(facility.id) || { new: 0, processed: 0, done: 0 }
    const occupiedHours = duration / hourMs
    const availableHours = period.days * 13
    return { id: facility.id, facility: facility.name, locationId: facility.location_id, location: facility.location?.name || String(facility.location_id), facilityCount: 1, bookings: bookingCounts.get(facility.id) || 0, occupiedHours, availableHours, occupancy: occupiedHours / availableHours * 100, ...statuses, damageCount: statuses.new + statuses.processed + statuses.done }
  }).sort((a, b) => a.location.localeCompare(b.location) || a.facility.localeCompare(b.facility))
  const locations = new Map()
  for (const row of rows) {
    const summary = locations.get(row.locationId) || { location: row.location, facilityCount: 0, bookings: 0, occupiedHours: 0, availableHours: 0, new: 0, processed: 0, done: 0, damageCount: 0 }
    for (const key of ['facilityCount', 'bookings', 'occupiedHours', 'availableHours', 'new', 'processed', 'done', 'damageCount']) summary[key] += row[key]
    summary.occupancy = summary.occupiedHours / summary.availableHours * 100
    locations.set(row.locationId, summary)
  }
  return { facilities: rows, locations: [...locations.values()].sort((a, b) => a.location.localeCompare(b.location)) }
}

export const recapHeaders = (group) => [group === 'facilities' ? 'Fasilitas' : 'Lokasi', ...(group === 'facilities' ? ['Lokasi'] : ['Jumlah fasilitas']), 'Reservasi done', 'Jam terpakai', 'Jam operasional', 'Okupansi (%)', 'Laporan kerusakan', 'New', 'Processed', 'Done']
export const recapValues = (row, group) => [group === 'facilities' ? row.facility : row.location, group === 'facilities' ? row.location : row.facilityCount, row.bookings, Number(row.occupiedHours.toFixed(2)), row.availableHours, Number(row.occupancy.toFixed(2)), row.damageCount, row.new, row.processed, row.done]
