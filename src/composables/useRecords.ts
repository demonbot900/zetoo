import { computed, reactive, ref, watch } from 'vue'
import type { Period, Project, TimeEntry } from '@/types/records'
import { HOUR_STEP } from '@/types/records'
import { useWorkspace, workspaceReady } from '@/composables/useWorkspace'
import { load as syncLoad, save as syncSave } from '@/utils/sync'

/**
 * Leistungsnachweis store.
 *
 * Deliberately one-directional: this module reads the workspace for member
 * names but never imports the planner. `usePlanner` imports *this* module to
 * mirror logged time, so keeping the arrow pointing one way avoids a cycle
 * between two modules that both run restore logic at import time.
 */

const STORAGE_KEY = 'zetoo.records.v1'

const uid = (prefix: string): string =>
  `${prefix}${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`

/* ------------------------------------------------------------------ *
 * Dates
 * ------------------------------------------------------------------ */

const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

/** First and last day of a month, `month` being 0-based like `Date`. */
export const monthRange = (year: number, month: number): Period => ({
  from: toISODate(new Date(year, month, 1)),
  to: toISODate(new Date(year, month + 1, 0)),
})

/**
 * The requirement asks for last month to be preselected, so this is what the
 * period falls back to whenever nothing has been stored yet.
 */
export const lastMonthRange = (today = new Date()): Period =>
  monthRange(today.getFullYear(), today.getMonth() - 1)

export const currentMonthRange = (today = new Date()): Period =>
  monthRange(today.getFullYear(), today.getMonth())

/** The three months before the current one. */
export const lastQuarterRange = (today = new Date()): Period => ({
  from: monthRange(today.getFullYear(), today.getMonth() - 3).from,
  to: monthRange(today.getFullYear(), today.getMonth() - 1).to,
})

/* ------------------------------------------------------------------ *
 * Hours
 * ------------------------------------------------------------------ */

/**
 * Durations are booked in quarter hours. This is the only place that decides
 * what "0.3 hours" means, so preview, totals and the exported document can
 * never disagree.
 */
export const toQuarter = (hours: number): number => {
  if (!Number.isFinite(hours) || hours <= 0) return HOUR_STEP
  return Math.max(HOUR_STEP, Math.round(hours / HOUR_STEP) * HOUR_STEP)
}

/** German decimal notation, as the document expects: `0,75`. */
export const formatHours = (hours: number): string =>
  hours.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatDateDE = (iso: string): string => {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

/* ------------------------------------------------------------------ *
 * Reference data
 * ------------------------------------------------------------------ */

export const defaultCategories = [
  'PM',
  'Konzeption',
  'Entwicklung',
  'Design',
  'Test',
  'Support',
]

/** Placeholder pattern offered when a project is created. */
export const defaultReferencePattern = 'RE-{YYYY}-{NR}'

/* ------------------------------------------------------------------ *
 * State
 * ------------------------------------------------------------------ */

const projects = reactive<Project[]>([])
const entries = reactive<TimeEntry[]>([])
const selectedProjectId = ref<string>('')
const period = reactive<Period>(lastMonthRange())
/** Running number behind `{NR}`; incremented after every export. */
const referenceCounter = ref(1)

interface RecordsSnapshot {
  projects: Project[]
  entries: TimeEntry[]
  selectedProjectId: string
  period: Period
  referenceCounter: number
}

let isRestoring = true
/** Set once the user edits, so a slow server response cannot overwrite them. */
let isDirty = false
/**
 * Nothing is written before the database has answered.
 *
 * A save is a whole-document replace, so a store that has not hydrated yet
 * would push its empty state over the top and delete every row. That is not
 * hypothetical: it is how a freshly opened tab wiped boards it had never
 * loaded.
 */
let hasHydrated = false

const snapshotOf = (): RecordsSnapshot => ({
  projects: projects.map((project) => ({ ...project })),
  entries: entries.map((entry) => ({ ...entry })),
  selectedProjectId: selectedProjectId.value,
  period: { ...period },
  referenceCounter: referenceCounter.value,
})

const save = () => {
  if (isRestoring || !hasHydrated) return
  isDirty = true
  syncSave('records', STORAGE_KEY, snapshotOf())
}

const apply = (snapshot: Partial<RecordsSnapshot> | null) => {
  if (!snapshot) return
  if (Array.isArray(snapshot.projects)) {
    projects.splice(
      0,
      projects.length,
      ...snapshot.projects.map((project) => ({
        ...project,
        categories: project.categories ?? [],
        templateName: project.templateName ?? '',
        templateData: project.templateData ?? '',
        archived: project.archived ?? false,
      })),
    )
  }
  if (Array.isArray(snapshot.entries)) {
    entries.splice(
      0,
      entries.length,
      ...snapshot.entries.map((entry) => ({
        ...entry,
        hours: toQuarter(entry.hours),
        issueId: entry.issueId ?? null,
      })),
    )
  }
  if (snapshot.selectedProjectId) selectedProjectId.value = snapshot.selectedProjectId
  if (snapshot.period?.from && snapshot.period?.to) Object.assign(period, snapshot.period)
  if (typeof snapshot.referenceCounter === 'number') {
    referenceCounter.value = snapshot.referenceCounter
  }
}

/** Paint from the local mirror immediately, then reconcile with the database. */
const restore = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) apply(JSON.parse(raw) as Partial<RecordsSnapshot>)
  } catch {
    // Corrupt payload: start from an empty set rather than crashing the page.
  }
}

restore()
isRestoring = false

watch([projects, entries, selectedProjectId, period, referenceCounter], save, { deep: true })

/**
 * Resolves once the database has had its say.
 *
 * Waits on the workspace too, so member names are resolvable by the time the
 * first screen renders its table.
 */
export const recordsReady: Promise<void> = Promise.all([
  syncLoad<RecordsSnapshot>(
    'records',
    STORAGE_KEY,
    (value) => !value.projects?.length && !value.entries?.length,
  ),
  workspaceReady,
]).then(([remote]) => {
  if (remote && !isDirty) {
    isRestoring = true
    apply(remote)
    isRestoring = false
  }
  hasHydrated = true
})

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

export function useRecords() {
  const workspace = useWorkspace()

  const activeProjects = computed(() => projects.filter((project) => !project.archived))

  const projectById = (id: string | null): Project | undefined =>
    id ? projects.find((project) => project.id === id) : undefined

  const selectedProject = computed(() => projectById(selectedProjectId.value))

  /** Project-specific categories when set, workspace defaults otherwise. */
  const categoriesFor = (projectId: string | null): string[] => {
    const project = projectById(projectId)
    return project?.categories.length ? project.categories : defaultCategories
  }

  const memberName = (id: string): string => {
    const member = workspace.memberById(id)
    if (!member) return '—'
    return `${member.firstName} ${member.lastName}`.trim() || member.email
  }

  /* ---------------- Projects ---------------- */

  const createProject = (input: Partial<Project> = {}): Project => {
    const project: Project = {
      id: uid('p-'),
      name: input.name?.trim() || 'Neues Projekt',
      client: input.client?.trim() ?? '',
      reference: input.reference?.trim() || defaultReferencePattern,
      contractor: input.contractor?.trim() || workspace.company.value?.name || '',
      categories: input.categories ?? [],
      templateName: input.templateName ?? '',
      templateData: input.templateData ?? '',
      archived: false,
      createdAt: new Date().toISOString(),
    }
    projects.push(project)
    if (!selectedProjectId.value) selectedProjectId.value = project.id
    return project
  }

  const updateProject = (id: string, patch: Partial<Project>) => {
    const project = projectById(id)
    if (!project) return
    Object.assign(project, patch)
  }

  const archiveProject = (id: string, archived = true) => {
    updateProject(id, { archived })
    if (archived && selectedProjectId.value === id) {
      selectedProjectId.value = activeProjects.value[0]?.id ?? ''
    }
  }

  /** Removes the project and every entry booked against it. */
  const deleteProject = (id: string) => {
    const index = projects.findIndex((project) => project.id === id)
    if (index === -1) return
    projects.splice(index, 1)
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      if (entries[i].projectId === id) entries.splice(i, 1)
    }
    if (selectedProjectId.value === id) {
      selectedProjectId.value = activeProjects.value[0]?.id ?? ''
    }
  }

  const setTemplate = (id: string, templateName: string, templateData: string) =>
    updateProject(id, { templateName, templateData })

  const clearTemplate = (id: string) => updateProject(id, { templateName: '', templateData: '' })

  /* ---------------- Entries ---------------- */

  const createEntry = (input: Partial<TimeEntry> = {}): TimeEntry | undefined => {
    const projectId = input.projectId || selectedProjectId.value
    if (!projectId) return undefined
    const entry: TimeEntry = {
      id: uid('t-'),
      projectId,
      date: input.date || toISODate(new Date()),
      category: input.category || categoriesFor(projectId)[0],
      hours: toQuarter(input.hours ?? HOUR_STEP),
      // Never store an entry without a person: the Leistungsnachweis has a
      // column for it, and an empty cell makes the document unusable.
      memberId:
        input.memberId ||
        workspace.currentUser.value?.id ||
        workspace.activeMembers.value[0]?.id ||
        '',
      description: input.description?.trim() ?? '',
      issueId: input.issueId ?? null,
    }
    entries.push(entry)
    return entry
  }

  const updateEntry = (id: string, patch: Partial<TimeEntry>) => {
    const entry = entries.find((item) => item.id === id)
    if (!entry) return
    Object.assign(entry, patch)
    if (patch.hours !== undefined) entry.hours = toQuarter(patch.hours)
  }

  const deleteEntry = (id: string) => {
    const index = entries.findIndex((entry) => entry.id === id)
    if (index !== -1) entries.splice(index, 1)
  }

  /* ---------------- Period ---------------- */

  const setPeriod = (next: Period) => Object.assign(period, next)
  const setLastMonth = () => setPeriod(lastMonthRange())
  const setCurrentMonth = () => setPeriod(currentMonthRange())
  const setLastQuarter = () => setPeriod(lastQuarterRange())

  /* ---------------- Derived ---------------- */

  /** Entries of one project inside a range, oldest first. */
  const entriesFor = (projectId: string, range: Period): TimeEntry[] =>
    entries
      .filter(
        (entry) =>
          entry.projectId === projectId && entry.date >= range.from && entry.date <= range.to,
      )
      .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)))

  const entriesInPeriod = computed(() =>
    selectedProjectId.value ? entriesFor(selectedProjectId.value, period) : [],
  )

  const sumHours = (list: TimeEntry[]): number =>
    Math.round(list.reduce((total, entry) => total + entry.hours, 0) * 100) / 100

  const totalHours = computed(() => sumHours(entriesInPeriod.value))

  const hoursByCategory = computed(() => {
    const map = new Map<string, number>()
    entriesInPeriod.value.forEach((entry) => {
      map.set(entry.category, (map.get(entry.category) ?? 0) + entry.hours)
    })
    return [...map.entries()]
      .map(([category, hours]) => ({ category, hours: Math.round(hours * 100) / 100 }))
      .sort((a, b) => b.hours - a.hours)
  })

  const hoursByMember = computed(() => {
    const map = new Map<string, number>()
    entriesInPeriod.value.forEach((entry) => {
      map.set(entry.memberId, (map.get(entry.memberId) ?? 0) + entry.hours)
    })
    return [...map.entries()]
      .map(([memberId, hours]) => ({
        memberId,
        name: memberName(memberId),
        hours: Math.round(hours * 100) / 100,
      }))
      .sort((a, b) => b.hours - a.hours)
  })

  const projectHours = (projectId: string): number =>
    sumHours(entries.filter((entry) => entry.projectId === projectId))

  const nextReferenceNumber = () => referenceCounter.value
  const consumeReferenceNumber = () => {
    referenceCounter.value += 1
  }

  return {
    // reference data
    defaultCategories,
    defaultReferencePattern,
    // state
    projects,
    activeProjects,
    entries,
    selectedProjectId,
    selectedProject,
    period,
    // lookups
    projectById,
    categoriesFor,
    memberName,
    // projects
    createProject,
    updateProject,
    archiveProject,
    deleteProject,
    setTemplate,
    clearTemplate,
    // entries
    createEntry,
    updateEntry,
    deleteEntry,
    entriesFor,
    // period
    setPeriod,
    setLastMonth,
    setCurrentMonth,
    setLastQuarter,
    // derived
    entriesInPeriod,
    totalHours,
    hoursByCategory,
    hoursByMember,
    projectHours,
    sumHours,
    // reference numbering
    nextReferenceNumber,
    consumeReferenceNumber,
  }
}

/**
 * Module-level entry point for `usePlanner`, which mirrors board time into the
 * records store. Kept separate from `useRecords()` so it never triggers demo
 * seeding as a side effect of logging time.
 */
export const recordTimeEntry = (input: Partial<TimeEntry>): TimeEntry | undefined => {
  const projectId = input.projectId || selectedProjectId.value || projects[0]?.id
  if (!projectId) return undefined
  const entry: TimeEntry = {
    id: uid('t-'),
    projectId,
    date: input.date || toISODate(new Date()),
    category: input.category || defaultCategories[0],
    hours: toQuarter(input.hours ?? HOUR_STEP),
    memberId: input.memberId ?? '',
    description: input.description?.trim() ?? '',
    issueId: input.issueId ?? null,
  }
  entries.push(entry)
  return entry
}
