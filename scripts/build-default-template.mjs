/**
 * Generates the bundled Leistungsnachweis template.
 *
 * The output is a normal Word file whose text happens to contain docxtemplater
 * placeholders, so it doubles as the worked example a customer can download,
 * restyle in Word and upload again as their own design template.
 *
 * Run with `npm run build:template` after changing anything here.
 *
 * Every placeholder must sit inside a single TextRun. Word splits a paragraph
 * into runs on the smallest formatting change, and docxtemplater cannot see a
 * tag that got cut in half across two `<w:t>` elements.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../public/templates/leistungsnachweis-standard.docx')

const ACCENT = '1D4ED8'
const RULE = 'D1D5DB'
const HEADER_FILL = 'F3F4F6'

const text = (value, options = {}) =>
  new TextRun({ text: value, font: 'Calibri', size: 20, ...options })

/** Column widths in percent, mirroring the sample document. */
const COLUMNS = [14, 16, 12, 22, 36]

const cellText = (value, options = {}) =>
  new Paragraph({
    alignment: options.align ?? AlignmentType.LEFT,
    spacing: { before: 0, after: 0 },
    children: [text(value, { bold: options.bold, color: options.color })],
  })

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: RULE },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE },
  left: { style: BorderStyle.SINGLE, size: 4, color: RULE },
  right: { style: BorderStyle.SINGLE, size: 4, color: RULE },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: RULE },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: RULE },
}

/** Header row of the position table. */
const headerRow = new TableRow({
  tableHeader: true,
  children: ['Datum', 'Kategorie', 'Dauer in Stunden', 'Name des Mitarbeitenden', 'Durchgeführte Arbeiten'].map(
    (label, index) =>
      new TableCell({
        width: { size: COLUMNS[index], type: WidthType.PERCENTAGE },
        shading: { fill: HEADER_FILL },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [cellText(label, { bold: true })],
      }),
  ),
})

/**
 * The repeating row. docxtemplater duplicates a `<w:tr>` when the opening tag
 * sits in the first cell and the closing tag in the last cell of the same row,
 * which is why `{#positionen}` and `{/positionen}` are glued to the first and
 * last placeholder rather than living on their own line.
 */
const loopRow = new TableRow({
  children: [
    ['{#positionen}{datum}', AlignmentType.LEFT],
    ['{kategorie}', AlignmentType.LEFT],
    ['{stunden}', AlignmentType.RIGHT],
    ['{name}', AlignmentType.LEFT],
    ['{beschreibung}{/positionen}', AlignmentType.LEFT],
  ].map(([value, align], index) =>
    new TableCell({
      width: { size: COLUMNS[index], type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.TOP,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [cellText(value, { align })],
    }),
  ),
})

/** Closing row with the automatic total the requirement asks for. */
const totalRow = new TableRow({
  children: [
    new TableCell({
      columnSpan: 2,
      shading: { fill: HEADER_FILL },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [cellText('Gesamtstunden', { bold: true })],
    }),
    new TableCell({
      shading: { fill: HEADER_FILL },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [cellText('{gesamtstunden}', { bold: true, align: AlignmentType.RIGHT })],
    }),
    new TableCell({
      columnSpan: 2,
      shading: { fill: HEADER_FILL },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [cellText('')],
    }),
  ],
})

/** Two-column block naming both parties. */
const partiesTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.NONE },
    insideVertical: { style: BorderStyle.NONE },
  },
  rows: [
    ['Auftraggeber:', '{auftraggeber}'],
    ['Auftragnehmer:', '{auftragnehmer}'],
    ['Projekt:', '{projekt}'],
    ['Zeitraum:', '{zeitraum_von} – {zeitraum_bis}'],
  ].map(
    ([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 0, right: 120 },
            children: [cellText(label, { bold: true })],
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 0, right: 0 },
            children: [cellText(value)],
          }),
        ],
      }),
  ),
})

const doc = new Document({
  creator: 'Zetoo',
  title: 'Leistungsnachweis',
  description: 'Standardvorlage für Leistungsnachweise. Platzhalter in geschweiften Klammern.',
  sections: [
    {
      properties: {
        page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } },
      },
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 80 },
          children: [text('Leistungsnachweis', { bold: true, size: 36, color: ACCENT })],
        }),
        new Paragraph({
          spacing: { after: 320 },
          children: [text('{referenznummer}', { bold: true, size: 24 })],
        }),
        partiesTable,
        new Paragraph({ spacing: { after: 320 }, children: [text('')] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: [headerRow, loopRow, totalRow],
        }),
        new Paragraph({
          spacing: { before: 400 },
          children: [
            text('Erstellt am {erstellt_am} mit Zetoo.', { size: 16, color: '6B7280' }),
          ],
        }),
      ],
    },
  ],
})

mkdirSync(dirname(OUT), { recursive: true })
const buffer = await Packer.toBuffer(doc)
writeFileSync(OUT, buffer)
console.log(`Standardvorlage geschrieben: ${OUT} (${buffer.length} Bytes)`)
