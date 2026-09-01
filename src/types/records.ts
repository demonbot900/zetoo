/**
 * Leistungsnachweis — proof-of-service records.
 *
 * A `Project` carries everything the exported document needs about the
 * engagement itself (who bills whom, under which reference, with which Word
 * template). A `TimeEntry` is one line in that document.
 */

/** Smallest bookable slice of an hour. Every duration is a multiple of this. */
export const HOUR_STEP = 0.25

export interface Project {
  id: string
  name: string
  /** Auftraggeber — the client the record is issued to. */
  client: string
  /**
   * Reference-number pattern, e.g. `CODIN-RE-{YYYY}-{NR}`. Resolved at export
   * time; see `resolveReference` in `@/utils/leistungsnachweis`.
   */
  reference: string
  /** Auftragnehmer. Seeded from the workspace company name. */
  contractor: string
  /** Overrides the workspace defaults when non-empty. */
  categories: string[]
  /** File name of the uploaded template, empty for the bundled default. */
  templateName: string
  /** Data URL of the uploaded .docx, empty for the bundled default. */
  templateData: string
  archived: boolean
  createdAt: string
}

export interface TimeEntry {
  id: string
  projectId: string
  /** ISO date, `YYYY-MM-DD`. */
  date: string
  /** One of the project's categories: PM, Konzeption, Entwicklung, … */
  category: string
  /** Always a multiple of `HOUR_STEP`. */
  hours: number
  memberId: string
  /** Freely worded description of the work — one cell in the document. */
  description: string
  /** Set when the entry was created by logging time on a board issue. */
  issueId: string | null
}

/** Inclusive date range, both ends ISO `YYYY-MM-DD`. */
export interface Period {
  from: string
  to: string
}

/** One rendered table row, as handed to the Word template. */
export interface RecordPosition {
  datum: string
  kategorie: string
  stunden: string
  name: string
  beschreibung: string
}

/** The full payload a Word template is rendered against. */
export interface RecordDocumentData extends Record<string, unknown> {
  referenznummer: string
  auftraggeber: string
  auftragnehmer: string
  projekt: string
  zeitraum_von: string
  zeitraum_bis: string
  positionen: RecordPosition[]
  gesamtstunden: string
  erstellt_am: string
}
