import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import type { Period, Project, RecordDocumentData } from '@/types/records'

/**
 * Word export for Leistungsnachweise.
 *
 * Free of Vue imports on purpose: the filename and payload rules are the part
 * most likely to need checking against the customer's naming scheme, so they
 * stay callable from a plain script or a test.
 */

export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Shipped fallback used whenever a project has no template of its own. */
export const DEFAULT_TEMPLATE_URL = '/templates/leistungsnachweis-standard.docx'

/**
 * Resolves a reference pattern such as `CODIN-RE-{YYYY}-{NR}`.
 *
 * `{YYYY}` and `{MM}` come from the start of the reported period rather than
 * today, so re-exporting an old month keeps the number it had. `{NR}` is the
 * running number, zero-padded to four digits like the sample document.
 */
export const resolveReference = (pattern: string, period: Period, runningNumber: number): string => {
  const [year = '', month = ''] = period.from.split('-')
  return pattern
    .replace(/\{YYYY\}/g, year)
    .replace(/\{YY\}/g, year.slice(-2))
    .replace(/\{MM\}/g, month)
    .replace(/\{NR\}/g, String(runningNumber).padStart(4, '0'))
}

/**
 * `2026-06-01_Leistungsnachweis_CODIN-RE-2026-0042`
 *
 * The date prefix is the first day of the reported period and the trailing
 * reference is whatever the project's pattern resolved to — the variable part
 * the requirement asks to keep adjustable.
 */
export const buildFileName = (period: Period, reference: string): string => {
  const safeReference = reference.trim().replace(/[\\/:*?"<>|]/g, '-')
  return `${period.from}_Leistungsnachweis_${safeReference}`
}

/** Reads a `data:` URL into the byte buffer PizZip expects. */
const dataUrlToArrayBuffer = async (dataUrl: string): Promise<ArrayBuffer> => {
  const response = await fetch(dataUrl)
  return response.arrayBuffer()
}

/**
 * The project's own template when one is stored, the bundled default
 * otherwise.
 */
export const loadTemplate = async (project: Project): Promise<ArrayBuffer> => {
  if (project.templateData) return dataUrlToArrayBuffer(project.templateData)

  const response = await fetch(DEFAULT_TEMPLATE_URL)
  if (!response.ok) {
    throw new Error(
      'Die Standardvorlage konnte nicht geladen werden. Bitte eine eigene Word-Vorlage hinterlegen.',
    )
  }
  return response.arrayBuffer()
}

/** Turns docxtemplater's nested error shape into one readable sentence. */
const describeTemplateError = (error: unknown): string => {
  const fallback = 'Die Word-Vorlage konnte nicht verarbeitet werden.'
  if (!(error instanceof Error)) return fallback

  const properties = (error as { properties?: { errors?: unknown[]; explanation?: string } })
    .properties

  if (properties?.errors?.length) {
    const details = properties.errors
      .map((item) => {
        const explanation = (item as { properties?: { explanation?: string } }).properties
          ?.explanation
        return explanation ?? (item as Error).message
      })
      .filter(Boolean)
    if (details.length) return `${fallback} ${details.join(' ')}`
  }

  if (properties?.explanation) return `${fallback} ${properties.explanation}`
  return `${fallback} ${error.message}`
}

/**
 * Fills a .docx template with one record's data.
 *
 * Throws a plain `Error` carrying a readable German message so the calling
 * screen can show it next to the upload field instead of dying on an
 * unhandled docxtemplater exception.
 */
export const renderDocx = (template: ArrayBuffer, data: RecordDocumentData): Blob => {
  let doc: Docxtemplater
  try {
    doc = new Docxtemplater(new PizZip(template), {
      paragraphLoop: true,
      linebreaks: true,
    })
  } catch (error) {
    throw new Error(
      `Die Datei ist keine gültige Word-Vorlage. ${error instanceof Error ? error.message : ''}`.trim(),
    )
  }

  try {
    doc.render(data)
  } catch (error) {
    throw new Error(describeTemplateError(error))
  }

  return doc.getZip().generate({ type: 'blob', mimeType: DOCX_MIME }) as Blob
}

/** Hands the finished document to the browser as a download. */
export const downloadBlob = (blob: Blob, fileName: string, extension = '.docx'): void => {
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName.endsWith(extension) ? fileName : `${fileName}${extension}`
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Renders the same record as a PDF.
 *
 * Built programmatically rather than from the Word template: a `.docx` cannot
 * be converted in the browser, and the two outputs are fed from one
 * `RecordDocumentData` so they can never show different numbers.
 */
export const renderPdf = async (data: RecordDocumentData): Promise<Blob> => {
  // Loaded on demand so the ~350 kB PDF stack stays out of the initial bundle.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const MARGIN = 18
  const width = doc.internal.pageSize.getWidth()

  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor('#1d4ed8')
  doc.text('Leistungsnachweis', MARGIN, 24)

  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor('#111827')
  doc.text(data.referenznummer, MARGIN, 32)

  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor('#374151')
  const header: [string, string][] = [
    ['Auftraggeber:', data.auftraggeber],
    ['Auftragnehmer:', data.auftragnehmer],
    ['Projekt:', data.projekt],
    ['Zeitraum:', `${data.zeitraum_von} – ${data.zeitraum_bis}`],
  ]
  header.forEach(([label, value], index) => {
    const y = 44 + index * 6
    doc.setFont('helvetica', 'bold').text(label, MARGIN, y)
    doc.setFont('helvetica', 'normal').text(value || '—', MARGIN + 32, y)
  })

  autoTable(doc, {
    startY: 44 + header.length * 6 + 6,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Datum', 'Kategorie', 'Dauer in Stunden', 'Name des Mitarbeitenden', 'Durchgeführte Arbeiten']],
    body: data.positionen.map((row) => [
      row.datum,
      row.kategorie,
      row.stunden,
      row.name,
      row.beschreibung,
    ]),
    foot: [['Gesamtstunden', '', data.gesamtstunden, '', '']],
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.2, textColor: '#374151' },
    headStyles: { fillColor: '#f3f4f6', textColor: '#111827', fontStyle: 'bold' },
    footStyles: { fillColor: '#f3f4f6', textColor: '#111827', fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 26 },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 38 },
      4: { cellWidth: 'auto' },
    },
    // Repeat the header on every page so a long month stays readable.
    showHead: 'everyPage',
    theme: 'grid',
    tableLineColor: '#d1d5db',
    tableLineWidth: 0.1,
  })

  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor('#6b7280')
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    const y = doc.internal.pageSize.getHeight() - 10
    doc.text(`Erstellt am ${data.erstellt_am} mit Zetoo.`, MARGIN, y)
    doc.text(`Seite ${page} von ${pages}`, width - MARGIN, y, { align: 'right' })
  }

  return doc.output('blob')
}
