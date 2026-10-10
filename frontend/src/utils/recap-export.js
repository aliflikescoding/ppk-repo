import { recapHeaders, recapValues } from './recap.js'

function download(data, type, filename) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename
  document.body.append(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function buildRecapFile(recap, notes) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(16); doc.text('Rekap okupansi dan laporan kerusakan', 14, 16)
  doc.setFontSize(9)
  const text = doc.splitTextToSize(notes.join('\n'), 265)
  doc.text(text, 14, 24)
  for (const [index, group] of ['facilities', 'locations'].entries()) {
    if (index) doc.addPage()
    const start = index ? 16 : 30 + text.length * 4
    doc.setFontSize(12); doc.text(group === 'facilities' ? 'Per fasilitas' : 'Per lokasi', 14, start)
    autoTable(doc, { startY: start + 5, head: [recapHeaders(group)], body: recap[group].map((row) => recapValues(row, group)), styles: { fontSize: 8, overflow: 'linebreak' }, margin: { bottom: 16 }, didDrawPage: () => { doc.setFontSize(8); doc.text(`Revesrv - Halaman ${doc.getNumberOfPages()}`, 14, 202) } })
  }
  return { data: doc.output('arraybuffer'), type: 'application/pdf', extension: 'pdf' }
}

export async function exportRecap(recap, notes, filename) {
  const file = await buildRecapFile(recap, notes)
  download(file.data, file.type, `${filename}.${file.extension}`)
}
