import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { readAllFacilities, readAllReportCategories, reportImageUrl } from '../api/index.js'
import { useAuth } from '../auth/auth.js'
import { buildReportData, reportSchema, updateReportSchema, reportStatuses } from '../validation/report.js'
import { validateImages } from '../validation/facility.js'

function PhotoPreview({ file }) {
  const image = useRef(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    image.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <img ref={image} alt="Selected report photo" className="mt-2 max-h-64 rounded object-contain" />
}

export default function ReportForm({ report, onSave }) {
  const { user } = useAuth()
  const admin = user.role === 'admin'
  const [references, setReferences] = useState(null)
  const [referenceError, setReferenceError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [mode, setMode] = useState(report ? 'keep' : 'files')
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [photoError, setPhotoError] = useState('')
  const { register, control, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(report ? updateReportSchema : reportSchema),
    defaultValues: { facility_id: report?.facility_id ?? '', category_id: report?.category_id ?? '', description: report?.description ?? '', status: report?.status ?? 'new', reason: report?.reason ?? '' },
  })
  useEffect(() => {
    let active = true
    Promise.all([readAllFacilities(), admin ? readAllReportCategories() : Promise.resolve([])]).then(([facilities, categories]) => {
      if (active) setReferences({ facilities, categories })
    }).catch((error) => { if (active) setReferenceError(error.response?.data?.message || 'Unable to load report options.') })
    return () => { active = false }
  }, [admin, attempt])

  async function submit(values) {
    clearErrors('root')
    setPhotoError('')
    let data
    try { data = buildReportData(values, { editing: Boolean(report), mode, file, url }) }
    catch (error) { setPhotoError(error.message); return }
    try { await onSave(data, { clearReason: Boolean(report && data instanceof FormData && !values.reason.trim()) }) }
    catch (error) { setError('root.server', { message: error.response?.data?.message || error.message || 'Unable to save report. Please try again.' }) }
  }

  return <form className="mt-4" noValidate onSubmit={handleSubmit(submit)} aria-busy={isSubmitting}>
    <fieldset disabled={isSubmitting} className="space-y-4">
      {referenceError ? <div role="alert"><p className="text-error">{referenceError}</p><button type="button" className="btn btn-sm mt-2" onClick={() => { setReferenceError(''); setAttempt((value) => value + 1) }}>Try again</button></div> : !references && <p role="status">Loading report options…</p>}
      {[['facility_id', 'Facility', 'facilities'], ...(admin ? [['category_id', 'Category', 'categories']] : [])].map(([name, label, kind]) => <div key={name}>
        <label htmlFor={name} className="mb-1 block font-medium">{label}</label>
        <Controller name={name} control={control} render={({ field }) => <select {...field} id={name} className="select w-full" disabled={!references?.[kind].length} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined}>
          <option value="">Select a {label.toLowerCase()}</option>
          {references?.[kind].map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>} />
        {errors[name] && <p id={`${name}-error`} role="alert" className="text-sm text-error">{errors[name].message}</p>}
        {references && !references[kind].length && <p role="status">Create a {label.toLowerCase()} before saving a report.</p>}
      </div>)}
      {admin ? <Link to="/admin/report-categories" className="link link-primary text-sm">Manage categories</Link> : <div>
        <label htmlFor="category_id" className="mb-1 block font-medium">Category ID</label>
        <input id="category_id" type="number" min="1" step="1" className="input w-full" {...register('category_id')} aria-invalid={Boolean(errors.category_id)} aria-describedby="category-hint category_id-error" />
        <p id="category-hint" className="text-sm">Enter the category ID provided by an administrator.</p>
        {errors.category_id && <p id="category_id-error" role="alert" className="text-sm text-error">{errors.category_id.message}</p>}
      </div>}
      <div><label htmlFor="description" className="mb-1 block font-medium">Description</label><textarea id="description" className="textarea w-full" maxLength={500} {...register('description')} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-error' : undefined} />{errors.description && <p id="description-error" role="alert" className="text-sm text-error">{errors.description.message}</p>}</div>
      {report && <>
        <div><label htmlFor="status" className="mb-1 block font-medium">Status</label><select id="status" className="select w-full" {...register('status')}>{reportStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
        <div><label htmlFor="reason" className="mb-1 block font-medium">Reason (optional)</label><textarea id="reason" className="textarea w-full" maxLength={500} {...register('reason')} aria-invalid={Boolean(errors.reason)} />{errors.reason && <p role="alert" className="text-sm text-error">{errors.reason.message}</p>}</div>
        <div><p className="mb-2 font-medium">Current photo</p><img src={reportImageUrl(report.photo_report)} alt="Current report photo" className="max-h-64 rounded object-contain" /></div>
      </>}
      <div><label htmlFor="photo-mode" className="mb-1 block font-medium">Report photo</label><select id="photo-mode" className="select w-full" value={mode} onChange={(event) => { setMode(event.target.value); setPhotoError('') }}>
        {report && <option value="keep">Keep current photo</option>}<option value="files">{report ? 'Replace with uploaded photo' : 'Upload photo'}</option><option value="urls">{report ? 'Replace with image URL' : 'Use image URL'}</option>
      </select></div>
      {mode === 'files' && <div><label htmlFor="photo_report" className="mb-1 block font-medium">Photo file</label><input id="photo_report" type="file" accept="image/png,image/jpeg,image/webp" className="file-input w-full" aria-invalid={Boolean(photoError)} aria-describedby="photo-hint photo-error" onChange={(event) => {
        const selected = event.target.files?.[0]
        const message = selected ? validateImages([selected]) : ''
        setPhotoError(message); setFile(message ? null : selected || null)
        if (message) event.target.value = ''
      }} /><p id="photo-hint" className="mt-2 text-sm">One PNG, JPEG, or WebP image, at most 5 MB.</p>{file && <PhotoPreview file={file} />}</div>}
      {mode === 'urls' && <div><label htmlFor="photo-url" className="mb-1 block font-medium">Image URL</label><input id="photo-url" type="url" maxLength={2000} className="input w-full" value={url} onChange={(event) => setUrl(event.target.value)} aria-invalid={Boolean(photoError)} aria-describedby="photo-error" /></div>}
      <p id="photo-error" role={photoError ? 'alert' : undefined} className="text-sm text-error">{photoError}</p>
      {errors.root?.server && <p role="alert" className="text-error">{errors.root.server.message}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={!references?.facilities.length || (admin && !references?.categories.length)}>{isSubmitting ? 'Saving…' : report ? 'Save changes' : 'Create report'}</button>
    </fieldset>
  </form>
}
