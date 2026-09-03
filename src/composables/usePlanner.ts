import { computed, reactive, ref, watch } from 'vue'
import type {
  Board,
  BoardTemplate,
  Epic,
  Issue,
  IssuePriority,
  IssueStatus,
  IssueType,
  Sprint,
  StatusColumn,
  TeamMember,
} from '@/types/planner'
import { useWorkspace, workspaceVersion, fullName, initialsOf } from '@/composables/useWorkspace'
import { recordTimeEntry } from '@/composables/useRecords'
import { load as syncLoad, save as syncSave } from '@/utils/sync'

const BOARD_STORAGE_KEY = 'zetoo.board.v1'

/* ------------------------------------------------------------------ *
 * Date helpers, shared by the board, timeline and burndown views.
 * ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Formats a `Date` as `YYYY-MM-DD` in the *local* calendar.
 *
 * Deliberately not `toISOString()`: that converts to UTC first, so local
 * midnight anywhere east of Greenwich formats as the previous day. Every date
 * in this app is a calendar day, not an instant — dragging an issue onto the
 * 15th has to store the 15th.
 */
export const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

/**
 * Adds calendar days. Uses `setDate` rather than millisecond arithmetic so the
 * clock change either side of a DST switch does not swallow or duplicate a day.
 */
export const addDays = (date: string | Date, days: number): string => {
  const base = typeof date === 'string' ? new Date(`${date}T00:00:00`) : new Date(date)
  base.setDate(base.getDate() + days)
  return toISODate(base)
}

export const daysBetween = (from: string, to: string): number =>
  Math.round(
    (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / DAY_MS,
  )

export const formatDate = (date: string | null, opts?: Intl.DateTimeFormatOptions): string => {
  if (!date) return '—'
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    'en-US',
    opts ?? { month: 'short', day: 'numeric' },
  )
}

export const today = toISODate(new Date())

/* ------------------------------------------------------------------ *
 * Static reference data
 * ------------------------------------------------------------------ */

/** Column palette offered when a column is created or recoloured. */
export const columnColors = [
  '#98a2b3',
  '#465fff',
  '#0ba5ec',
  '#12b76a',
  '#f79009',
  '#fb6514',
  '#f04438',
  '#ec4899',
  '#7a5af8',
  '#0f172a',
]

export const boardTemplates: BoardTemplate[] = [
  {
    id: 'scrum',
    name: 'Scrum',
    description: 'To Do → In Progress → In Review → Done, with a sprint backlog.',
    columns: [
      { name: 'To Do', color: '#98a2b3', wipLimit: null },
      { name: 'In Progress', color: '#465fff', wipLimit: 5 },
      { name: 'In Review', color: '#f79009', wipLimit: 3 },
      { name: 'Done', color: '#12b76a', wipLimit: null },
    ],
  },
  {
    id: 'kanban',
    name: 'Kanban',
    description: 'Continuous flow with an explicit blocked lane.',
    columns: [
      { name: 'Next Up', color: '#98a2b3', wipLimit: null },
      { name: 'Doing', color: '#465fff', wipLimit: 4 },
      { name: 'Blocked', color: '#f04438', wipLimit: null },
      { name: 'Verify', color: '#f79009', wipLimit: 3 },
      { name: 'Shipped', color: '#12b76a', wipLimit: null },
    ],
  },
  {
    id: 'simple',
    name: 'Simple',
    description: 'Three columns, nothing else to think about.',
    columns: [
      { name: 'To Do', color: '#98a2b3', wipLimit: null },
      { name: 'Doing', color: '#465fff', wipLimit: null },
      { name: 'Done', color: '#12b76a', wipLimit: null },
    ],
  },
  {
    id: 'delivery',
    name: 'Client delivery',
    description: 'Agency flow from brief to client sign-off.',
    columns: [
      { name: 'Brief', color: '#98a2b3', wipLimit: null },
      { name: 'In Production', color: '#465fff', wipLimit: 6 },
      { name: 'Internal Review', color: '#7a5af8', wipLimit: 4 },
      { name: 'Client Review', color: '#f79009', wipLimit: null },
      { name: 'Approved', color: '#12b76a', wipLimit: null },
    ],
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Triage queue for incoming tickets.',
    columns: [
      { name: 'Inbox', color: '#98a2b3', wipLimit: null },
      { name: 'Triaged', color: '#0ba5ec', wipLimit: null },
      { name: 'Working', color: '#465fff', wipLimit: 8 },
      { name: 'Waiting on Customer', color: '#f79009', wipLimit: null },
      { name: 'Resolved', color: '#12b76a', wipLimit: null },
    ],
  },
]

export const columnIdFrom = (name: string, taken: string[] = []): string => {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'column'
  if (!taken.includes(base)) return base
  let suffix = 2
  while (taken.includes(`${base}_${suffix}`)) suffix += 1
  return `${base}_${suffix}`
}

const defaultColumns = (boardId = ''): StatusColumn[] => [
  {
    id: 'todo',
    boardId,
    name: 'To Do',
    color: '#98a2b3',
    wipLimit: null,
    order: 0,
    collapsed: false,
    isDone: false,
  },
  {
    id: 'in_progress',
    boardId,
    name: 'In Progress',
    color: '#465fff',
    wipLimit: 5,
    order: 1,
    collapsed: false,
    isDone: false,
  },
  {
    id: 'review',
    boardId,
    name: 'In Review',
    color: '#f79009',
    wipLimit: 3,
    order: 2,
    collapsed: false,
    isDone: false,
  },
  {
    id: 'done',
    boardId,
    name: 'Done',
    color: '#12b76a',
    wipLimit: null,
    order: 3,
    collapsed: false,
    isDone: true,
  },
]

/* ------------------------------------------------------------------ *
 * Boards
 * ------------------------------------------------------------------ */

/** Every board in the workspace, one per client engagement. */
const boards = reactive<Board[]>([])
const activeBoardId = ref<string>('')

/**
 * Columns of the boards that are *not* currently open.
 *
 * `statusColumns` always holds the active board's columns so the whole board
 * UI — adding, renaming, reordering, WIP limits — keeps operating on a plain
 * reactive array. Switching boards parks the outgoing set here and loads the
 * incoming one; saving merges both halves back together.
 */
const columnsByBoard = new Map<string, StatusColumn[]>()

/**
 * The live columns of the board currently open. Reactive array so every
 * consumer that already imports `statusColumns` keeps working while columns
 * are added, renamed, recoloured or reordered.
 */
export const statusColumns = reactive<StatusColumn[]>([])

/** Column id → label, kept in sync with `statusColumns`. */
export const statusLabels = reactive<Record<string, string>>({ backlog: 'Backlog' })

const syncStatusLabels = () => {
  for (const key of Object.keys(statusLabels)) {
    if (key !== 'backlog') delete statusLabels[key]
  }
  for (const column of statusColumns) statusLabels[column.id] = column.name
}

syncStatusLabels()
watch(statusColumns, syncStatusLabels, { deep: true })

export const priorityLabels: Record<IssuePriority, string> = {
  highest: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const priorityOrder: IssuePriority[] = ['highest', 'high', 'medium', 'low']

export const typeLabels: Record<IssueType, string> = {
  epic: 'Epic',
  story: 'Story',
  task: 'Task',
  bug: 'Bug',
}

/**
 * The people shown on the board — a projection of the workspace member list,
 * so anyone added during registration or later in Team settings is
 * immediately assignable. Empty until a workspace exists.
 */
const team = reactive<TeamMember[]>([])

const workspaceMembers = useWorkspace().members

const syncTeam = () => {
  const next: TeamMember[] = workspaceMembers.value
    .filter((member) => member.status !== 'inactive')
    .map((member) => ({
      id: member.id,
      name: fullName(member) || member.email,
      role: member.jobTitle,
      avatar: member.avatar,
      capacityHours: member.capacityHours,
      accent: member.accent,
      initials: initialsOf(member),
    }))
  team.splice(0, team.length, ...next)
}

watch(workspaceMembers, syncTeam, { deep: true, immediate: true })
watch(workspaceVersion, syncTeam)

/**
 * Sprints and epics come from the database. A fresh workspace starts with the
 * one sprint the registration wizard creates; epics are optional throughout.
 */
const sprints = reactive<Sprint[]>([])
const epics = reactive<Epic[]>([])

const issues = reactive<Issue[]>([])


/* ------------------------------------------------------------------ *
 * Shared UI state
 * ------------------------------------------------------------------ */

const activeSprintId = ref<string>('')
const selectedIssueId = ref<string | null>(null)
let issueCounter = 150

/* ------------------------------------------------------------------ *
 * Persistence — the board survives a reload, like the workspace does.
 * ------------------------------------------------------------------ */

interface BoardSnapshot {
  boards: Board[]
  activeBoardId: string
  issues: Issue[]
  sprints: Sprint[]
  epics: Epic[]
  columns: StatusColumn[]
  activeSprintId: string
  issueCounter: number
}

/** The active board's live columns plus every parked board's set. */
const allColumns = (): StatusColumn[] => {
  const live = new Set(boards.map((board) => board.id))
  const parked = [...columnsByBoard.entries()]
    // A deleted board leaves its columns behind in the map; writing them back
    // would keep resurrecting rows that point at nothing.
    .filter(([boardId]) => boardId !== activeBoardId.value && live.has(boardId))
    .flatMap(([, columns]) => columns)
  return [...parked, ...statusColumns.map((column) => ({ ...column }))]
}

let isRestoringBoard = true
/** Set once the user edits, so a slow server response cannot overwrite them. */
let isBoardDirty = false
/**
 * Nothing is written before the database has answered.
 *
 * A save is a whole-document replace, so a store that has not hydrated yet
 * would push its empty state over the top and delete every row. That is not
 * hypothetical: it is how a freshly opened tab wiped boards it had never
 * loaded.
 */
let hasHydratedBoard = false

const saveBoard = () => {
  if (isRestoringBoard || !hasHydratedBoard) return
  isBoardDirty = true
  syncSave('board', BOARD_STORAGE_KEY, {
    boards: boards.map((board) => ({ ...board })),
    activeBoardId: activeBoardId.value,
    issues: issues.map((issue) => ({ ...issue })),
    sprints: sprints.map((sprint) => ({ ...sprint })),
    epics: epics.map((epic) => ({ ...epic })),
    columns: allColumns(),
    activeSprintId: activeSprintId.value,
    issueCounter,
  } satisfies BoardSnapshot)
}

const applyBoard = (snapshot: Partial<BoardSnapshot> | null) => {
  if (!snapshot) return

  if (Array.isArray(snapshot.boards)) {
    boards.splice(0, boards.length, ...snapshot.boards)
  }
  // Keep the stored choice when that board still exists. A workspace with a
  // single board selects it automatically; beyond that the user picks.
  const stored = snapshot.activeBoardId
  const open = boards.filter((board) => !board.archived)
  activeBoardId.value =
    stored && boards.some((board) => board.id === stored)
      ? stored
      : open.length === 1
        ? open[0].id
        : ''

  if (Array.isArray(snapshot.sprints)) {
    sprints.splice(0, sprints.length, ...snapshot.sprints)
  }
  if (Array.isArray(snapshot.epics)) {
    epics.splice(0, epics.length, ...snapshot.epics)
  }
  if (Array.isArray(snapshot.columns) && snapshot.columns.length) {
    // Split one flat list back into "the open board's" and "everyone else's".
    columnsByBoard.clear()
    for (const column of snapshot.columns) {
      const boardId = column.boardId ?? ''
      if (!columnsByBoard.has(boardId)) columnsByBoard.set(boardId, [])
      columnsByBoard.get(boardId)!.push(column)
    }
    const active = columnsByBoard.get(activeBoardId.value) ?? []
    statusColumns.splice(0, statusColumns.length, ...active.sort((a, b) => a.order - b.order))
    syncStatusLabels()
  }
  if (Array.isArray(snapshot.issues)) {
    issues.splice(
      0,
      issues.length,
      ...snapshot.issues.map((issue, index) => ({
        ...issue,
        coverColor: issue.coverColor ?? '',
        checklist: issue.checklist ?? [],
        order: issue.order ?? index,
      })),
    )
  }
  if (snapshot.activeSprintId) activeSprintId.value = snapshot.activeSprintId
  if (typeof snapshot.issueCounter === 'number') issueCounter = snapshot.issueCounter
}

/** Paint from the local mirror immediately, then reconcile with the database. */
const restoreBoard = () => {
  try {
    const raw = localStorage.getItem(BOARD_STORAGE_KEY)
    if (raw) applyBoard(JSON.parse(raw) as Partial<BoardSnapshot>)
  } catch {
    // Corrupt payload: keep the seeded board.
  }
}

restoreBoard()
isRestoringBoard = false

watch([issues, sprints, epics, boards, statusColumns, activeSprintId, activeBoardId], saveBoard, {
  deep: true,
})

void syncLoad<BoardSnapshot>(
  'board',
  BOARD_STORAGE_KEY,
  (value) => !value.boards?.length && !value.issues?.length,
).then(
  (remote) => {
    if (remote && !isBoardDirty) {
      isRestoringBoard = true
      applyBoard(remote)
      isRestoringBoard = false
    }
    hasHydratedBoard = true
  },
)

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

export function usePlanner() {
  /* ---------------- Boards ---------------- */

  /**
   * Column ids that finish work on the open board.
   *
   * Everything that counts progress goes through this rather than comparing
   * against a literal `done`, which silently reports 0% on any board whose
   * last column was renamed or came from a translated Jira workflow.
   */
  const doneColumnIds = computed(
    () => new Set(statusColumns.filter((column) => column.isDone).map((column) => column.id)),
  )

  const isDoneStatus = (status: IssueStatus) => doneColumnIds.value.has(status)

  const activeBoards = computed(() => boards.filter((board) => !board.archived))

  /**
   * The board currently open, or null when none is chosen.
   *
   * Deliberately no "just take the first one" fallback: with several client
   * engagements in the workspace, silently showing an arbitrary board is worse
   * than showing nothing and asking which one.
   */
  const activeBoard = computed<Board | null>(
    () => boards.find((board) => board.id === activeBoardId.value) ?? null,
  )

  const boardById = (id: string | null) =>
    id ? boards.find((board) => board.id === id) : undefined

  /** Everything below is scoped to the board currently open. */
  const boardIssues = computed(() =>
    issues.filter((issue) => issue.boardId === activeBoard.value?.id),
  )
  const boardSprints = computed(() =>
    sprints.filter((sprint) => sprint.boardId === activeBoard.value?.id),
  )
  const boardEpics = computed(() => epics.filter((epic) => epic.boardId === activeBoard.value?.id))

  const createBoard = (input: Partial<Board> = {}): Board => {
    const board: Board = {
      id: input.id ?? `b-${Math.random().toString(36).slice(2, 8)}`,
      name: input.name?.trim() || `Board ${boards.length + 1}`,
      client: input.client?.trim() ?? '',
      description: input.description?.trim() ?? '',
      color: input.color ?? columnColors[boards.length % columnColors.length],
      projectId: input.projectId ?? null,
      archived: false,
      createdAt: new Date().toISOString(),
    }
    boards.push(board)
    // A board needs columns and somewhere to plan, or its board view opens on
    // an empty screen with no way forward.
    columnsByBoard.set(board.id, defaultColumns(board.id))
    createSprint({ boardId: board.id, name: 'Sprint 1', state: 'active' })
    if (!activeBoardId.value) switchBoard(board.id)
    return board
  }

  /**
   * Opens another board: parks the current columns, loads the target's.
   * The active sprint follows, so the sprint header never shows a sprint that
   * belongs to a different client.
   */
  const switchBoard = (id: string) => {
    if (!boards.some((board) => board.id === id)) return
    if (activeBoardId.value && activeBoardId.value !== id) {
      columnsByBoard.set(
        activeBoardId.value,
        statusColumns.map((column) => ({ ...column })),
      )
    }
    activeBoardId.value = id
    const next = columnsByBoard.get(id) ?? defaultColumns(id)
    columnsByBoard.set(id, next)
    statusColumns.splice(0, statusColumns.length, ...next.map((column) => ({ ...column })))
    syncStatusLabels()
    selectedIssueId.value = null

    const sprint =
      sprints.find((item) => item.boardId === id && item.state === 'active') ??
      sprints.find((item) => item.boardId === id)
    activeSprintId.value = sprint?.id ?? ''
  }

  const updateBoard = (id: string, patch: Partial<Board>) => {
    const board = boardById(id)
    if (board) Object.assign(board, patch)
  }

  const archiveBoard = (id: string, archived = true) => {
    updateBoard(id, { archived })
    if (archived && activeBoardId.value === id) {
      const next = activeBoards.value[0]
      if (next) switchBoard(next.id)
      else activeBoardId.value = ''
    }
  }

  /** Removes the board together with its issues, sprints, epics and columns. */
  const deleteBoard = (id: string) => {
    const index = boards.findIndex((board) => board.id === id)
    if (index === -1) return
    boards.splice(index, 1)
    columnsByBoard.delete(id)
    for (const list of [issues, sprints, epics] as { boardId: string }[][]) {
      for (let i = list.length - 1; i >= 0; i -= 1) {
        if (list[i].boardId === id) list.splice(i, 1)
      }
    }
    if (activeBoardId.value === id) {
      const next = activeBoards.value[0]
      if (next) switchBoard(next.id)
      else activeBoardId.value = ''
    }
  }

  /** One row per board for the overview screen. */
  const boardSummaries = computed(() =>
    boards.map((board) => {
      const own = issues.filter((issue) => issue.boardId === board.id)
      const finished = new Set(
        (board.id === activeBoard.value?.id
          ? statusColumns
          : (columnsByBoard.get(board.id) ?? [])
        )
          .filter((column) => column.isDone)
          .map((column) => column.id),
      )
      const done = own.filter((issue) => finished.has(issue.status))
      const sprint =
        sprints.find((item) => item.boardId === board.id && item.state === 'active') ?? null
      return {
        board,
        sprint,
        issues: own.length,
        done: done.length,
        percent: own.length ? Math.round((done.length / own.length) * 100) : 0,
        estimate: own.reduce((sum, issue) => sum + issue.estimateHours, 0),
        logged: own.reduce((sum, issue) => sum + issue.loggedHours, 0),
        overdue: own.filter(
          (issue) => !finished.has(issue.status) && issue.dueDate !== null && issue.dueDate < today,
        ).length,
      }
    }),
  )

  /**
   * The sprint the board is showing, or null when the workspace has none.
   * Consumers must guard: a brand-new workspace has no sprint until one is
   * created.
   */
  const activeSprint = computed<Sprint | null>(
    () =>
      boardSprints.value.find((sprint) => sprint.id === activeSprintId.value) ??
      boardSprints.value.find((sprint) => sprint.state === 'active') ??
      boardSprints.value[0] ??
      null,
  )

  const memberById = (id: string | null): TeamMember | undefined =>
    team.find((member) => member.id === id)

  const epicById = (id: string | null) => epics.find((epic) => epic.id === id)

  const sprintById = (id: string | null) => sprints.find((sprint) => sprint.id === id)

  const issueById = (id: string | null) => issues.find((issue) => issue.id === id)

  const sprintIssues = computed(() =>
    activeSprint.value
      ? boardIssues.value.filter((issue) => issue.sprintId === activeSprint.value?.id)
      : [],
  )

  const backlogIssues = computed(() =>
    boardIssues.value.filter((issue) => issue.sprintId === null),
  )

  const issuesByStatus = (status: IssueStatus, list?: Issue[]) =>
    (list ?? sprintIssues.value).filter((issue) => issue.status === status)

  const selectedIssue = computed(() => issueById(selectedIssueId.value) ?? null)

  const selectIssue = (id: string | null) => {
    selectedIssueId.value = id
  }

  const updateIssue = (id: string, patch: Partial<Issue>) => {
    const issue = issueById(id)
    if (!issue) return
    Object.assign(issue, patch)
    if (patch.status === 'done' && !issue.completedAt) {
      issue.completedAt = today
    }
    if (patch.status && patch.status !== 'done') {
      issue.completedAt = null
    }
  }

  /** Rewrites `order` for one column so it matches the on-screen sequence. */
  const normaliseOrder = (status: IssueStatus) => {
    issues
      .filter((issue) => issue.status === status)
      .sort((a, b) => a.order - b.order)
      .forEach((issue, index) => {
        issue.order = index
      })
  }

  /**
   * Board drop handler: moves an issue into `status` at `index`, pushing the
   * cards below it down. Called for both cross-column and in-column drags.
   */
  const moveIssue = (id: string, status: IssueStatus, index?: number) => {
    const issue = issueById(id)
    if (!issue) return
    const previousStatus = issue.status

    if (previousStatus !== status) updateIssue(id, { status })

    const siblings = issues
      .filter((candidate) => candidate.status === status && candidate.id !== id)
      .sort((a, b) => a.order - b.order)

    const target =
      index === undefined ? siblings.length : Math.max(0, Math.min(index, siblings.length))
    siblings.splice(target, 0, issue)
    siblings.forEach((candidate, position) => {
      candidate.order = position
    })

    if (previousStatus !== status) normaliseOrder(previousStatus)
  }

  /** Applies the exact card sequence a column ended up with after a drag. */
  const setColumnOrder = (status: IssueStatus, orderedIds: string[]) => {
    orderedIds.forEach((issueId, index) => {
      const issue = issueById(issueId)
      if (!issue) return
      if (issue.status !== status) updateIssue(issueId, { status })
      issue.order = index
    })
  }

  /* ---------------- Column management ---------------- */

  const addColumn = (name: string, color = columnColors[1]): StatusColumn => {
    const column: StatusColumn = {
      id: columnIdFrom(
        name,
        statusColumns.map((item) => item.id),
      ),
      boardId: activeBoard.value?.id ?? '',
      name: name.trim() || 'New column',
      color,
      wipLimit: null,
      isDone: false,
      order: statusColumns.length,
      collapsed: false,
    }
    statusColumns.push(column)
    return column
  }

  const updateColumn = (id: IssueStatus, patch: Partial<StatusColumn>) => {
    const column = statusColumns.find((item) => item.id === id)
    if (!column) return
    Object.assign(column, patch)
  }

  /** Removes a column and rehomes its cards into `moveTo` (or the backlog). */
  const removeColumn = (id: IssueStatus, moveTo?: IssueStatus) => {
    const index = statusColumns.findIndex((column) => column.id === id)
    if (index === -1 || statusColumns.length <= 1) return
    const fallback = moveTo ?? statusColumns.find((column) => column.id !== id)?.id ?? 'backlog'
    issues
      .filter((issue) => issue.status === id)
      .forEach((issue) => {
        issue.status = fallback
      })
    statusColumns.splice(index, 1)
    statusColumns.forEach((column, position) => {
      column.order = position
    })
    normaliseOrder(fallback)
  }

  const reorderColumns = (orderedIds: IssueStatus[]) => {
    const next = orderedIds
      .map((id) => statusColumns.find((column) => column.id === id))
      .filter((column): column is StatusColumn => Boolean(column))
    if (next.length !== statusColumns.length) return
    next.forEach((column, index) => {
      column.order = index
    })
    statusColumns.splice(0, statusColumns.length, ...next)
  }

  const toggleColumnCollapsed = (id: IssueStatus) => {
    const column = statusColumns.find((item) => item.id === id)
    if (column) column.collapsed = !column.collapsed
  }

  /* ---------------- Checklists ---------------- */

  const addChecklistItem = (issueId: string, text: string) => {
    const issue = issueById(issueId)
    if (!issue || !text.trim()) return
    issue.checklist.push({
      id: `cl-${Math.random().toString(36).slice(2, 8)}`,
      text: text.trim(),
      done: false,
    })
  }

  const toggleChecklistItem = (issueId: string, itemId: string) => {
    const item = issueById(issueId)?.checklist.find((entry) => entry.id === itemId)
    if (item) item.done = !item.done
  }

  const removeChecklistItem = (issueId: string, itemId: string) => {
    const issue = issueById(issueId)
    if (!issue) return
    const index = issue.checklist.findIndex((entry) => entry.id === itemId)
    if (index !== -1) issue.checklist.splice(index, 1)
  }

  /* ---------------- Board setup ---------------- */

  /**
   * Swaps in a template's columns. Existing cards are remapped column by
   * column so nothing is orphaned; with `keepIssues: false` the board starts
   * empty, which is what a brand new company gets.
   */
  const applyBoardTemplate = (
    templateId: string,
    options: { keepIssues?: boolean; reassignTo?: string[] } = {},
  ) => {
    const template = boardTemplates.find((item) => item.id === templateId) ?? boardTemplates[0]
    const previous = statusColumns.map((column) => column.id)

    const taken: string[] = []
    const next: StatusColumn[] = template.columns.map((column, index) => {
      const id = columnIdFrom(column.name, taken)
      taken.push(id)
      return {
        id,
        boardId: activeBoard.value?.id ?? '',
        name: column.name,
        color: column.color,
        wipLimit: column.wipLimit,
        order: index,
        // Templates end on their finished column, so the last one closes work.
        isDone: index === template.columns.length - 1,
        collapsed: false,
      }
    })

    statusColumns.splice(0, statusColumns.length, ...next)
    syncStatusLabels()

    if (options.keepIssues === false) {
      issues.splice(0, issues.length)
      selectedIssueId.value = null
      return
    }

    issues.forEach((issue, index) => {
      if (issue.status === 'backlog') return
      const previousIndex = previous.indexOf(issue.status)
      const mapped = previousIndex === -1 ? 0 : Math.min(previousIndex, next.length - 1)
      issue.status = next[mapped].id
      if (options.reassignTo?.length && issue.assigneeId) {
        issue.assigneeId = options.reassignTo[index % options.reassignTo.length]
      }
    })

    next.forEach((column) => normaliseOrder(column.id))
  }

  /* ---------------- Sprints ---------------- */

  /**
   * Creates a sprint. A new workspace gets its first one from the registration
   * wizard; after that they are created from the sprint header.
   */
  const createSprint = (input: Partial<Sprint> = {}): Sprint => {
    const start = input.startDate ?? today
    const sprint: Sprint = {
      id: input.id ?? `s-${Math.random().toString(36).slice(2, 8)}`,
      boardId: input.boardId ?? activeBoard.value?.id ?? '',
      name: input.name?.trim() || `Sprint ${sprints.length + 1}`,
      goal: input.goal?.trim() ?? '',
      state: input.state ?? 'active',
      startDate: start,
      // Two weeks is the default cadence the capacity figures assume.
      endDate: input.endDate ?? addDays(start, 13),
    }
    sprints.push(sprint)
    // Only take over the header when the sprint belongs to the open board.
    if (
      sprint.boardId === activeBoard.value?.id &&
      (!activeSprintId.value || sprint.state === 'active')
    ) {
      activeSprintId.value = sprint.id
    }
    return sprint
  }

  const updateSprint = (id: string, patch: Partial<Sprint>) => {
    const sprint = sprints.find((item) => item.id === id)
    if (sprint) Object.assign(sprint, patch)
  }

  const deleteSprint = (id: string) => {
    const index = sprints.findIndex((sprint) => sprint.id === id)
    if (index === -1) return
    sprints.splice(index, 1)
    // Orphaned issues fall back to the backlog rather than disappearing.
    issues.forEach((issue) => {
      if (issue.sprintId === id) issue.sprintId = null
    })
    if (activeSprintId.value === id) activeSprintId.value = sprints[0]?.id ?? ''
  }

  /** Clears the board back to the default columns and no issues. */
  const resetBoard = () => {
    statusColumns.splice(0, statusColumns.length, ...defaultColumns(activeBoard.value?.id ?? ''))
    issues.splice(0, issues.length)
    selectedIssueId.value = null
    syncStatusLabels()
  }

  const createIssue = (input: Partial<Issue>): Issue => {
    issueCounter += 1
    const issue: Issue = {
      id: `ZT-${issueCounter}`,
      boardId: input.boardId ?? activeBoard.value?.id ?? '',
      title: input.title?.trim() || 'Untitled issue',
      description: input.description ?? '',
      type: input.type ?? 'task',
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      assigneeId: input.assigneeId ?? null,
      sprintId: input.sprintId ?? activeSprint.value?.id ?? null,
      epicId: input.epicId ?? null,
      estimateHours: input.estimateHours ?? 4,
      loggedHours: 0,
      storyPoints: input.storyPoints ?? 2,
      startDate: input.startDate ?? today,
      dueDate: input.dueDate ?? addDays(today, 5),
      completedAt: null,
      labels: input.labels ?? [],
      order: input.order ?? -Date.now(),
      coverColor: input.coverColor ?? '',
      checklist: input.checklist ?? [],
    }
    issues.unshift(issue)
    normaliseOrder(issue.status)
    return issue
  }

  const deleteIssue = (id: string) => {
    const index = issues.findIndex((issue) => issue.id === id)
    if (index !== -1) issues.splice(index, 1)
    if (selectedIssueId.value === id) selectedIssueId.value = null
  }

  /**
   * Books time on an issue and mirrors it into the Leistungsnachweis records,
   * so hours logged on the board can be invoiced without retyping them.
   * `meta` lets the caller supply the columns the record needs; sensible
   * defaults keep every existing call site working unchanged.
   */
  const logTime = (
    id: string,
    hours: number,
    meta: { date?: string; category?: string; description?: string } = {},
  ) => {
    const issue = issueById(id)
    if (!issue || hours <= 0) return
    issue.loggedHours = Math.round((issue.loggedHours + hours) * 10) / 10

    recordTimeEntry({
      date: meta.date,
      category: meta.category,
      hours,
      memberId: issue.assigneeId ?? '',
      description: meta.description?.trim() || issue.title,
      issueId: issue.id,
    })
  }

  /* ---------------- Derived metrics ---------------- */

  const sprintTotals = computed(() => {
    const list = sprintIssues.value
    const estimate = list.reduce((sum, issue) => sum + issue.estimateHours, 0)
    const logged = list.reduce((sum, issue) => sum + issue.loggedHours, 0)
    const done = list.filter((issue) => isDoneStatus(issue.status))
    const remaining = list
      .filter((issue) => !isDoneStatus(issue.status))
      .reduce((sum, issue) => sum + issue.estimateHours, 0)

    return {
      issues: list.length,
      done: done.length,
      estimate,
      logged,
      remaining,
      points: list.reduce((sum, issue) => sum + issue.storyPoints, 0),
      donePoints: done.reduce((sum, issue) => sum + issue.storyPoints, 0),
    }
  })

  const sprintDays = computed(() => {
    if (!activeSprint.value) return { total: 0, elapsed: 0, remaining: 0 }
    const { startDate, endDate } = activeSprint.value
    const total = daysBetween(startDate, endDate) + 1
    const elapsed = Math.min(Math.max(daysBetween(startDate, today) + 1, 0), total)
    return { total, elapsed, remaining: Math.max(total - elapsed, 0) }
  })

  /** Remaining-hours burndown: ideal line against what is actually left. */
  const burndown = computed(() => {
    const empty = { categories: [] as string[], ideal: [] as number[], actual: [] as (number | null)[] }
    if (!activeSprint.value) return empty
    const { startDate } = activeSprint.value
    const { total } = sprintDays.value
    if (total < 2) return empty
    const totalEstimate = sprintTotals.value.estimate
    const list = sprintIssues.value

    const categories: string[] = []
    const ideal: number[] = []
    const actual: (number | null)[] = []

    for (let day = 0; day < total; day += 1) {
      const date = addDays(startDate, day)
      categories.push(formatDate(date))
      ideal.push(Math.round(totalEstimate * (1 - day / (total - 1)) * 10) / 10)

      if (date > today) {
        actual.push(null)
        continue
      }

      const burned = list
        .filter((issue) => issue.completedAt !== null && issue.completedAt <= date)
        .reduce((sum, issue) => sum + issue.estimateHours, 0)
      actual.push(Math.max(totalEstimate - burned, 0))
    }

    return { categories, ideal, actual }
  })

  /** Committed vs completed story points for every closed sprint. */
  const velocity = computed(() => {
    const closed = boardSprints.value.filter((sprint) => sprint.state !== 'planned')
    return {
      categories: closed.map((sprint) => sprint.name),
      committed: closed.map((sprint) =>
        issues
          .filter((issue) => issue.sprintId === sprint.id)
          .reduce((sum, issue) => sum + issue.storyPoints, 0),
      ),
      completed: closed.map((sprint) =>
        issues
          .filter((issue) => issue.sprintId === sprint.id && isDoneStatus(issue.status))
          .reduce((sum, issue) => sum + issue.storyPoints, 0),
      ),
    }
  })

  /** Assigned hours against capacity for the active sprint. */
  const workload = computed(() =>
    team.map((member) => {
      const assigned = sprintIssues.value.filter((issue) => issue.assigneeId === member.id)
      const hours = assigned.reduce((sum, issue) => sum + issue.estimateHours, 0)
      return {
        member,
        issues: assigned.length,
        hours,
        capacity: member.capacityHours,
        utilisation: Math.round((hours / member.capacityHours) * 100),
      }
    }),
  )

  const upcomingDeadlines = computed(() =>
    boardIssues.value
      .filter((issue) => !isDoneStatus(issue.status) && issue.dueDate !== null)
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
      .slice(0, 6),
  )

  const overdueIssues = computed(() =>
    boardIssues.value.filter(
      (issue) => !isDoneStatus(issue.status) && issue.dueDate !== null && issue.dueDate < today,
    ),
  )

  return {
    // boards
    boards,
    activeBoards,
    activeBoard,
    activeBoardId,
    boardById,
    boardSummaries,
    createBoard,
    switchBoard,
    updateBoard,
    archiveBoard,
    deleteBoard,
    // reference data, scoped to the open board
    team,
    sprints: boardSprints,
    epics: boardEpics,
    issues: boardIssues,
    /** Every issue in the workspace, for cross-board views. */
    allIssues: issues,
    statusColumns,
    // state
    activeSprintId,
    activeSprint,
    selectedIssue,
    selectIssue,
    // lookups
    isDoneStatus,
    memberById,
    epicById,
    sprintById,
    issueById,
    // collections
    sprintIssues,
    backlogIssues,
    issuesByStatus,
    // mutations
    createIssue,
    updateIssue,
    moveIssue,
    setColumnOrder,
    normaliseOrder,
    deleteIssue,
    logTime,
    // board configuration
    columns: statusColumns,
    boardTemplates,
    columnColors,
    addColumn,
    updateColumn,
    removeColumn,
    reorderColumns,
    toggleColumnCollapsed,
    applyBoardTemplate,
    resetBoard,
    // sprints
    createSprint,
    updateSprint,
    deleteSprint,
    // checklists
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    // metrics
    sprintTotals,
    sprintDays,
    burndown,
    velocity,
    workload,
    upcomingDeadlines,
    overdueIssues,
  }
}
