import PageHeading from '../components/PageHeading.jsx'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { readAllFacilityReferences, readAllReportCategories, readRecapData } from '../api/index.js'
import { jakartaDay } from '../utils/calendar.js'
import { buildRecap, recapHeaders, recapPeriod, recapValues } from '../utils/recap.js'
import { exportRecap } from '../utils/recap-export.js'

const initialFilters = () => { const today = jakartaDay(); return { from: `${today.slice(0, 7)}-01`, to: today, location_id: '', facility_id: '', category_id: '' } }

export default function FacilityRecap() {
  const [draft, setDraft] = useState(initialFilters)
  const [filters, setFilters] = useState(initialFilters)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const [options, setOptions] = useState(null)
  const [validationError, setValidationError] = useState('')
  const [exportError, setExportError] = useState('')
  const [exporting, setExporting] = useState(false)
  const key = JSON.stringify([filters, attempt])
  const loading = result?.key !== key
  const error = loading ? '' : result.error
  const recap = loading || error ? null : result.recap

  useEffect(() => {
    let active = true
    const period = recapPeriod(filters.from, filters.to)
    Promise.all([readRecapData(period.from, period.to), readAllFacilityReferences('locations'), readAllReportCategories()]).then(([data, locations, categories]) => {
      if (!active) return
      setOptions({ facilities: data.facilities, locations, categories })
      setResult({ key, recap: buildRecap(data.facilities, data.reservations, data.reports, filters), error: '', loadedAt: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) })
    }).catch((err) => { if (active) setResult({ key, error: err.response?.data?.message || 'Tidak dapat memuat rekap. Silakan coba lagi.' }) })
    return () => { active = false }
  }, [filters, key])

  function update(name, value) {
    setDraft((current) => ({ ...current, [name]: value, ...(name === 'location_id' ? { facility_id: '' } : {}) }))
    setValidationError('')
  }
  function apply(event) {
    event.preventDefault()
    try { recapPeriod(draft.from, draft.to) } catch (err) { setValidationError(err.message); return }
    setFilters({ ...draft }); setAttempt((value) => value + 1); setExportError('')
  }
  const category = options?.categories.find((item) => String(item.id) === filters.category_id)?.name || 'Semua kategori'
  const location = options?.locations.find((item) => String(item.id) === filters.location_id)?.name || 'Semua lokasi'
  const facility = options?.facilities.find((item) => String(item.id) === filters.facility_id)?.name || 'Semua fasilitas'
  const notes = [
    `Periode okupansi: ${filters.from} s.d. ${filters.to} (inklusif), Asia/Jakarta.`,
    `Filter: ${location}; ${facility}; kategori laporan: ${category}.`,
    'Okupansi = jam reservasi done / (13 jam operasional per hari x jumlah fasilitas) x 100%. Jadwal 07:00-20:00 setiap hari.',
    'Mengukur pemakaian waktu fasilitas, bukan jumlah orang. Fasilitas aktif dan nonaktif disertakan; riwayat perubahan ketersediaan belum tersedia.',
    'Frekuensi kerusakan = jumlah laporan new, processed, dan done sepanjang waktu. Laporan rejected tidak dihitung. Satu laporan belum tentu satu kejadian unik.',
    'Laporan belum memiliki tanggal di backend, sehingga periode hanya berlaku untuk okupansi. Pilih kategori kerusakan yang relevan bila diperlukan.',
    `Data dimuat: ${result?.loadedAt || '-'} (Asia/Jakarta).`,
  ]
  async function download() {
    if (!recap || exporting) return
    setExporting(true); setExportError('')
    try { await exportRecap(recap, notes, `rekap-fasilitas-${filters.from}-${filters.to}`) }
    catch { setExportError('Ekspor gagal. Silakan coba lagi.') }
    finally { setExporting(false) }
  }
  return <div className="workspace-page workspace-list-page">
    <Link to="/admin" className="auth-back">← Kembali ke dashboard</Link>
    <PageHeading>Rekap okupansi dan kerusakan</PageHeading>
    <p className="mt-2">Bandingkan penggunaan dan laporan kerusakan per fasilitas atau lokasi, lalu ekspor hasilnya.</p>
    <form onSubmit={apply} className="workspace-panel mt-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[['from', 'Tanggal mulai okupansi'], ['to', 'Tanggal akhir okupansi']].map(([name, label]) => <div key={name}><label htmlFor={`recap-${name}`} className="mb-1 block">{label}</label><input id={`recap-${name}`} type="date" required className="input w-full" value={draft[name]} onChange={(event) => update(name, event.target.value)} /></div>)}
        {[['location_id', 'Lokasi', options?.locations], ['facility_id', 'Fasilitas', options?.facilities.filter((item) => !draft.location_id || String(item.location_id) === draft.location_id)], ['category_id', 'Kategori laporan kerusakan', options?.categories]].map(([name, label, items]) => <div key={name}><label htmlFor={`recap-${name}`} className="mb-1 block">{label}</label><select id={`recap-${name}`} className="select w-full" disabled={!options} value={draft[name]} onChange={(event) => update(name, event.target.value)}><option value="">Semua</option>{items?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>)}
      </div>
      <p className="mt-3 text-sm">Maksimal 366 hari. Frekuensi laporan dihitung sepanjang waktu karena tanggal laporan belum tersedia.</p>
      {validationError && <p role="alert" className="mt-2 text-error">{validationError}</p>}
      <button type="submit" className="btn auth-submit mt-4" disabled={Boolean(exporting)}>Tampilkan rekap</button>
    </form>
    <section className="mt-6" aria-busy={loading} aria-label="Hasil rekap">
      {loading ? <p role="status">Memuat seluruh halaman data rekap…</p> : error ? <div role="alert"><p>{error}</p><button type="button" className="btn mt-3" onClick={() => setAttempt((value) => value + 1)}>Coba lagi</button></div> : <>
        <button type="button" className="btn" disabled={exporting || !recap.facilities.length} onClick={download}>{exporting ? 'Mengekspor…' : 'Ekspor PDF'}</button>
        {exportError && <p role="alert" className="mt-3 text-error">{exportError}</p>}
        <details className="mt-4 rounded-box bg-base-100 p-4"><summary className="cursor-pointer font-semibold">Periode dan cara perhitungan</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{notes.map((note) => <li key={note}>{note}</li>)}</ul></details>
        {!recap.facilities.length ? <p role="status" className="mt-4">Tidak ada fasilitas untuk filter ini.</p> : ['facilities', 'locations'].map((group) => <section key={group} className="workspace-panel mt-6"><h2 className="mb-3 text-xl font-semibold">{group === 'facilities' ? 'Per fasilitas' : 'Per lokasi'}</h2><div className="overflow-x-auto"><table className="table"><caption className="sr-only">{group === 'facilities' ? 'Rekap per fasilitas' : 'Rekap per lokasi'}</caption><thead><tr>{recapHeaders(group).map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{recap[group].map((row, index) => <tr key={row.id || index}>{recapValues(row, group).map((value, column) => <td key={column}>{value}</td>)}</tr>)}</tbody></table></div></section>)}
      </>}
    </section>
  </div>
}
