import { z } from 'zod'

const positiveInteger = z.coerce.number().int('Enter a whole number.').min(1, 'Enter a positive number.').max(2147483647, 'Number is too large.')
export const facilitySchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(50, 'Use at most 50 characters.'),
  capacity: positiveInteger,
  type_id: positiveInteger,
  location_id: positiveInteger,
  is_active: z.boolean(),
})

export function validateImages(files) {
  if (files.length > 20) return 'Select at most 20 images.'
  if (files.some((file) => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) return 'Use PNG, JPEG, or WebP images.'
  if (files.some((file) => file.size > 5 * 1024 * 1024)) return 'Each image must be at most 5 MB.'
  return ''
}

export function parseImageUrls(text) {
  const urls = text.split(/\r?\n/).map((url) => url.trim()).filter(Boolean)
  if (urls.length > 20) throw new Error('Use at most 20 image URLs.')
  for (const url of urls) {
    let valid = false
    try { valid = url.length <= 500 && ['http:', 'https:'].includes(new URL(url).protocol) } catch { /* Invalid URL. */ }
    if (!valid) throw new Error('Use valid HTTP or HTTPS image URLs of at most 500 characters.')
  }
  return urls
}
