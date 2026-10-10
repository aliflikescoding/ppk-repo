import { z } from 'zod'
import { validateImages } from './facility.js'

const positiveId = z.coerce.number().int('Select a valid ID.').min(1, 'Select a valid ID.').max(2147483647, 'ID is too large.')
export const reportStatuses = ['new', 'processed', 'done', 'rejected']
export const reportSchema = z.object({
  facility_id: positiveId,
  category_id: positiveId,
  description: z.string().trim().min(1, 'Description is required.').max(500, 'Use at most 500 characters.'),
})
export const updateReportSchema = reportSchema.extend({
  status: z.enum(reportStatuses),
  reason: z.string().trim().max(500, 'Use at most 500 characters.'),
})

export function buildReportData(values, { editing = false, mode, file, url = '' }) {
  const data = { ...values }
  // An empty reason clears it in JSON. Multipart empty reasons are rejected.
  if (editing) data.reason = values.reason?.trim() || null
  else { delete data.reason; delete data.status }
  if (editing && mode === 'keep') return data
  if (mode === 'urls') {
    const photo = url.trim()
    let valid = false
    try { valid = photo.length <= 2000 && ['http:', 'https:'].includes(new URL(photo).protocol) } catch { /* Invalid URL. */ }
    if (!valid) throw new Error('Enter an HTTP or HTTPS photo URL of at most 2000 characters.')
    return { ...data, photo_report: photo }
  }
  if (!file) throw new Error('Select a report photo.')
  const message = validateImages([file])
  if (message) throw new Error(message)
  const form = new FormData()
  Object.entries(data).forEach(([key, value]) => { if (value !== null) form.append(key, String(value)) })
  form.append('photo_report', file)
  return form
}
