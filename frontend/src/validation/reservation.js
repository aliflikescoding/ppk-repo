import { z } from 'zod'

export const reservationStatuses = ['new', 'processed', 'done', 'rejected']
const localTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/, 'Enter a valid date and time.')
export const reservationSchema = z.object({
  facility_id: z.coerce.number().int().min(1, 'Select a facility.').max(2147483647),
  start_time: localTime,
  end_time: localTime,
  status: z.enum(reservationStatuses),
  reason: z.string().trim().max(500, 'Use at most 500 characters.'),
  user_id: z.union([z.literal(''), z.string().uuid('Select a valid user.')]).optional(),
}).superRefine((values, context) => {
  const start = new Date(toReservationTimestamp(values.start_time))
  const end = new Date(toReservationTimestamp(values.end_time))
  // Compare the local date separately to catch impossible calendar dates.
  for (const [key, date] of [['start_time', start], ['end_time', end]]) {
    if (!Number.isFinite(date.getTime()) || toJakartaInput(date).slice(0, 10) !== values[key].slice(0, 10)) {
      context.addIssue({ code: 'custom', path: [key], message: 'Enter a valid calendar date.' })
    }
  }
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return
  if (end <= start) context.addIssue({ code: 'custom', path: ['end_time'], message: 'End time must be later than start time.' })
  if (values.start_time.slice(0, 10) !== values.end_time.slice(0, 10) || values.start_time.slice(11) < '07:00' || values.end_time.slice(11) > '20:00:00.000') {
    context.addIssue({ code: 'custom', path: ['end_time'], message: 'Use the same day between 07:00 and 20:00 Asia/Jakarta.' })
  }
})

export function toReservationTimestamp(value) {
  return `${value.length === 16 ? `${value}:00` : value}+07:00`
}

export function toJakartaInput(value) {
  if (!value) return ''
  return new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 23).replace(/\.000$/, '')
}

export function buildReservationData(values, editing = false) {
  const { user_id, ...data } = values
  data.start_time = toReservationTimestamp(values.start_time)
  data.end_time = toReservationTimestamp(values.end_time)
  data.reason = values.reason.trim() || null
  if (!editing && user_id) data.user_id = user_id
  return data
}

export function formatReservationTime(value) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
