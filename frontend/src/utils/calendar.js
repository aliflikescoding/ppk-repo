export const jakartaDay = (value = new Date()) => new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 10)
export const monthDate = (month, day = 1) => `${month}-${String(day).padStart(2, '0')}`
export function shiftMonth(month, offset) {
  const date = new Date(`${month}-01T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + offset)
  return date.toISOString().slice(0, 7)
}
export function daySlots(day, reservations) {
  const start = new Date(`${day}T07:00:00+07:00`).getTime()
  const end = new Date(`${day}T20:00:00+07:00`).getTime()
  const occupied = reservations.map((item) => ({ start: Math.max(start, new Date(item.start_time).getTime()), end: Math.min(end, new Date(item.end_time).getTime()) })).filter((item) => item.end > item.start).sort((a, b) => a.start - b.start)
  const merged = []
  for (const slot of occupied) {
    const last = merged.at(-1)
    if (last && slot.start <= last.end) last.end = Math.max(last.end, slot.end)
    else merged.push({ ...slot })
  }
  const slots = []
  let cursor = start
  for (const slot of merged) {
    if (slot.start > cursor) slots.push({ start: cursor, end: slot.start, reserved: false })
    slots.push({ ...slot, reserved: true })
    cursor = slot.end
  }
  if (cursor < end) slots.push({ start: cursor, end, reserved: false })
  return slots
}
