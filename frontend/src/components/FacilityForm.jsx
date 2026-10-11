import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { facilityImageUrl, readAllFacilityReferences } from '../api/index.js'
import { facilitySchema, parseImageUrls, validateImages } from '../validation/facility.js'

function FilePreview({ file, index }) {
  const image = useRef(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    image.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <img ref={image} alt={`Selected image ${index + 1}`} className="h-24 w-32 rounded object-cover" />
}

function FilePreviews({ files }) {
  return <div className="flex flex-wrap gap-2">{files.map((file, index) => <FilePreview key={`${file.name}-${file.lastModified}-${index}`} file={file} index={index} />)}</div>
}

export default function FacilityForm({ facility, onSave }) {
  const [mode, setMode] = useState(facility ? 'keep' : 'files')
  const [files, setFiles] = useState([])
  const [urlText, setUrlText] = useState('')
  const [imageError, setImageError] = useState('')
  const [references, setReferences] = useState(null)
  const [referenceError, setReferenceError] = useState('')
  const [referenceAttempt, setReferenceAttempt] = useState(0)
  const { register, handleSubmit, clearErrors, setError, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(facilitySchema),
    defaultValues: facility ? { name: facility.name, capacity: facility.capacity, type_id: facility.type_id, location_id: facility.location_id, is_active: facility.is_active } : { name: '', capacity: '', type_id: '', location_id: '', is_active: false },
  })

  useEffect(() => {
    let active = true
    Promise.all([readAllFacilityReferences('types'), readAllFacilityReferences('locations')]).then(([types, locations]) => {
      if (active) {
        setReferences({ types, locations })
      }
    }).catch((error) => {
      if (active) setReferenceError(error.response?.data?.message || 'Unable to load types and locations. Please try again.')
    })
    return () => { active = false }
  }, [referenceAttempt])

  async function submit(values) {
    if (!references?.types.length || !references?.locations.length) return
    clearErrors('root')
    setImageError('')
    let data = values
    if (mode === 'files') {
      const message = validateImages(files)
      if (message || (facility && !files.length)) {
        setImageError(message || 'Select images to replace the current images.')
        return
      }
      if (files.length) {
        data = new FormData()
        Object.entries(values).forEach(([key, value]) => data.append(key, String(value)))
        files.forEach((file) => data.append('images', file))
      }
    } else if (mode === 'urls') {
      try { data = { ...values, image_urls: parseImageUrls(urlText) } }
      catch (error) { setImageError(error.message); return }
    } else if (mode === 'remove') data = { ...values, image_urls: [] }
    try { await onSave(data) }
    catch (error) { setError('root.server', { message: error.response?.data?.message || 'Unable to save facility. Please try again.' }) }
  }

  return <form className="workspace-form mt-6" noValidate onSubmit={handleSubmit(submit)} aria-busy={isSubmitting}>
    <fieldset disabled={isSubmitting} className="space-y-4">
      {[['name', 'Name'], ['capacity', 'Capacity']].map(([field, label]) => <div key={field}>
        <label htmlFor={field} className="mb-1 block font-medium">{label}</label>
        <input id={field} type={field === 'name' ? 'text' : 'number'} min={field === 'name' ? undefined : 1} step={field === 'name' ? undefined : 1} className="input w-full" {...register(field)} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined} />
        {errors[field] && <p id={`${field}-error`} role="alert" className="mt-1 text-sm text-error">{errors[field].message}</p>}
      </div>)}
      {referenceError ? <div role="alert"><p className="text-error">{referenceError}</p><button type="button" className="btn btn-sm mt-2" onClick={() => { setReferenceError(''); setReferenceAttempt((value) => value + 1) }}>Try again</button></div> : !references && <p role="status">Loading types and locations…</p>}
      {[['type_id', 'Type', 'types'], ['location_id', 'Location', 'locations']].map(([field, label, kind]) => <div key={field}>
        <label htmlFor={field} className="mb-1 block font-medium">{label}</label>
        <Controller name={field} control={control} render={({ field: selectField }) => (
          <select {...selectField} value={selectField.value ?? ''} id={field} className="select w-full" disabled={!references || !references[kind].length} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined}>
            <option value="">Select a {label.toLowerCase()}</option>
            {references?.[kind].map((record) => <option key={record.id} value={record.id}>{record.name}</option>)}
          </select>
        )} />
        {errors[field] && <p id={`${field}-error`} role="alert" className="mt-1 text-sm text-error">Select a {label.toLowerCase()}.</p>}
        {references && !references[kind].length && <p role="status" className="mt-1 text-sm">Create a {label.toLowerCase()} before saving a facility.</p>}
        <Link to={`/admin/facility-${kind}`} className="link link-primary mt-1 inline-block text-sm">Manage {kind}</Link>
      </div>)}
      <label className="flex items-center gap-2"><input type="checkbox" className="checkbox" {...register('is_active')} />Active</label>
      {facility?.images?.length > 0 && <div><p className="mb-2 font-medium">Current images</p><div className="flex flex-wrap gap-2">{facility.images.map((image) => <img key={image.id} src={facilityImageUrl(image.image_url)} alt={facility.name} className="h-24 w-32 rounded object-cover" />)}</div></div>}
      <div>
        <label htmlFor="image-mode" className="mb-1 block font-medium">Images</label>
        <select id="image-mode" className="select w-full" value={mode} onChange={(event) => { setMode(event.target.value); setImageError('') }}>
          {facility && <option value="keep">Keep current images</option>}
          <option value="files">{facility ? 'Replace with uploaded images' : 'Upload images'}</option>
          <option value="urls">{facility ? 'Replace with image URLs' : 'Use image URLs'}</option>
          {facility && <option value="remove">Remove all images</option>}
        </select>
      </div>
      {mode === 'files' && <div>
        <label htmlFor="images" className="mb-1 block font-medium">Image files</label>
        <input id="images" type="file" multiple accept="image/png,image/jpeg,image/webp" className="file-input w-full" aria-invalid={Boolean(imageError)} aria-describedby="image-hint image-error" onChange={(event) => {
          const selected = Array.from(event.target.files || [])
          const message = validateImages(selected)
          setImageError(message)
          setFiles(message ? [] : selected)
          if (message) event.target.value = ''
        }} />
        <p id="image-hint" className="my-2 text-sm">Up to 20 PNG, JPEG, or WebP images, 5 MB each.{facility && ' Uploading replaces all current images.'}</p>
        <FilePreviews files={files} />
      </div>}
      {mode === 'urls' && <div><label htmlFor="image-urls" className="mb-1 block font-medium">Image URLs (one per line)</label><textarea id="image-urls" className="textarea w-full" value={urlText} onChange={(event) => setUrlText(event.target.value)} aria-invalid={Boolean(imageError)} aria-describedby="image-error" /><p className="text-sm">Up to 20 HTTP or HTTPS URLs. Leave empty to save without images.</p></div>}
      {mode === 'remove' && <p>All current images will be removed when you save.</p>}
      <p id="image-error" role={imageError ? 'alert' : undefined} className="text-sm text-error">{imageError}</p>
      {errors.root?.server && <p role="alert" className="text-error">{errors.root.server.message}</p>}
      <button type="submit" className="btn auth-submit w-full" disabled={!references?.types.length || !references?.locations.length}>{isSubmitting ? 'Saving…' : facility ? 'Save changes' : 'Create facility'}</button>
    </fieldset>
  </form>
}
