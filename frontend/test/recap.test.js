import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRecap, recapPeriod } from '../src/utils/recap.js'

const facilities = [
  { id: 1, name: 'Room A', location_id: 1, location: { name: 'Building A' } },
  { id: 2, name: 'Room B', location_id: 1, location: { name: 'Building A' } },
  { id: 3, name: 'Room C', location_id: 2, location: { name: 'Building B' } },
]
const booking = (start, end, status = 'done') => ({ facility_id: 1, status, start_time: `2026-10-11T${start}:00+07:00`, end_time: `2026-10-11T${end}:00+07:00` })
const filters = { from: '2026-10-11', to: '2026-10-11', location_id: '', facility_id: '', category_id: '' }
const reports = [
  { facility_id: 1, category_id: 1, status: 'new' },
  { facility_id: 1, category_id: 1, status: 'done' },
  { facility_id: 1, category_id: 1, status: 'rejected' },
  { facility_id: 2, category_id: 2, status: 'processed' },
]
test('occupancy merges overlaps, clips business hours and weights locations by facility hours', () => {
  const recap = buildRecap(facilities, [booking('06:00', '09:00'), booking('08:00', '10:00'), booking('10:00', '11:00'), booking('11:00', '12:00', 'new')], reports, filters)
  assert.equal(recap.facilities[0].occupiedHours, 4)
  assert.equal(recap.facilities[0].bookings, 3)
  assert.equal(recap.facilities[0].damageCount, 2)
  assert.equal(recap.facilities[2].occupiedHours, 0)
  assert.equal(recap.locations[0].availableHours, 26)
  assert.equal(recap.locations[0].occupancy, 4 / 26 * 100)
  assert.equal(recap.locations[0].damageCount, 3)
})
test('date, location, facility, and category filters apply independently', () => {
  const recap = buildRecap(facilities, [booking('09:00', '10:00')], reports, { ...filters, from: '2026-10-12', to: '2026-10-13', location_id: '1', facility_id: '2', category_id: '1' })
  assert.equal(recap.facilities.length, 1)
  assert.equal(recap.facilities[0].id, 2)
  assert.equal(recap.facilities[0].occupiedHours, 0)
  assert.equal(recap.facilities[0].availableHours, 26)
  assert.equal(recap.facilities[0].damageCount, 0)
  assert.throws(() => recapPeriod('2026-10-12', '2026-10-11'))
  assert.throws(() => recapPeriod('2025-01-01', '2026-10-11'))
})
test('exports valid paginated PDF files', async () => {
  const { buildRecapFile } = await import('../src/utils/recap-export.js')
  const recap = buildRecap(facilities, [booking('09:00', '10:00')], reports, filters)
  const large = { facilities: Array.from({ length: 100 }, () => recap.facilities[0]), locations: recap.locations }
  const pdf = await buildRecapFile(large, ['Period note'])
  const text = new TextDecoder().decode(pdf.data)
  assert.ok(text.startsWith('%PDF-'))
  assert.ok(text.includes('Per fasilitas'))
  assert.ok(text.includes('Per lokasi'))
  assert.ok((text.match(/\/Type \/Page\b/g) || []).length > 2)
})
