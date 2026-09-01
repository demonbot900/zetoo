import { computed, reactive, ref, watch } from 'vue'
import type {
  BoardTemplate,
  ChecklistItem,
  Issue,
  IssuePriority,
  IssueStatus,
  IssueType,
  Sprint,
  StatusColumn,
  TeamMember,
} from '@/types/planner'
import { useWorkspace, workspaceVersion, fullName, initialsOf } from '@/composables/useWorkspace'

const BOARD_STORAGE_KEY = 'zetoo.board.v1'

/* ------------------------------------------------------------------ *
 * Date helpers — the seed data is anchored to the current week so the
 * board, timeline and burndown always look live.
 * ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000

export const toISODate = (date: Date): string => date.toISOString().slice(0, 10)

export const addDays = (date: string | Date, days: number): string => {
  const base = typeof date === 'string' ? new Date(`${date}T00:00:00`) : new Date(date)
  return toISODate(new Date(base.getTime() + days * DAY_MS))
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

/** Monday of the current week, used as the anchor for all seeded dates. */
const currentMonday = (): string => {
  const now = new Date()
  const offset = (now.getDay() + 6) % 7
  return toISODate(new Date(now.getTime() - offset * DAY_MS))
}

const MONDAY = currentMonday()
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

const defaultColumns = (): StatusColumn[] => [
  { id: 'todo', name: 'To Do', color: '#98a2b3', wipLimit: null, order: 0, collapsed: false },
  {
    id: 'in_progress',
    name: 'In Progress',
    color: '#465fff',
    wipLimit: 5,
    order: 1,
    collapsed: false,
  },
  { id: 'review', name: 'In Review', color: '#f79009', wipLimit: 3, order: 2, collapsed: false },
  { id: 'done', name: 'Done', color: '#12b76a', wipLimit: null, order: 3, collapsed: false },
]

/**
 * The live board columns. Reactive array so every consumer that already
 * imports `statusColumns` keeps working while columns are added, renamed,
 * recoloured or reordered.
 */
export const statusColumns = reactive<StatusColumn[]>(defaultColumns())

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

const DEMO_TEAM: TeamMember[] = [
  {
    id: 'u1',
    name: 'Amara Osei',
    role: 'Product Lead',
    avatar: '/images/user/user-01.jpg',
    capacityHours: 56,
  },
  {
    id: 'u2',
    name: 'Diego Marín',
    role: 'Frontend Engineer',
    avatar: '/images/user/user-02.jpg',
    capacityHours: 64,
  },
  {
    id: 'u3',
    name: 'Priya Raman',
    role: 'Staff Engineer',
    avatar: '/images/user/user-03.jpg',
    capacityHours: 60,
  },
  {
    id: 'u4',
    name: 'Noah Feldman',
    role: 'Backend Engineer',
    avatar: '/images/user/user-04.jpg',
    capacityHours: 64,
  },
  {
    id: 'u5',
    name: 'Lena Bauer',
    role: 'Designer',
    avatar: '/images/user/user-05.jpg',
    capacityHours: 48,
  },
  {
    id: 'u6',
    name: 'Tomas Silva',
    role: 'QA Engineer',
    avatar: '/images/user/user-06.jpg',
    capacityHours: 52,
  },
]

/**
 * The people shown on the board. Mirrors the workspace member list so anyone
 * added during registration — or later in Team settings — is immediately
 * assignable, and falls back to the demo roster before registration.
 */
const team = reactive<TeamMember[]>([...DEMO_TEAM])

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
  team.splice(0, team.length, ...(next.length ? next : DEMO_TEAM))
}

watch(workspaceMembers, syncTeam, { deep: true, immediate: true })
watch(workspaceVersion, syncTeam)

const sprints: Sprint[] = [
  {
    id: 's1',
    name: 'Sprint 22',
    goal: 'Ship the reporting export pipeline.',
    state: 'completed',
    startDate: addDays(MONDAY, -28),
    endDate: addDays(MONDAY, -15),
  },
  {
    id: 's2',
    name: 'Sprint 23',
    goal: 'Reduce onboarding drop-off to under 20%.',
    state: 'completed',
    startDate: addDays(MONDAY, -14),
    endDate: addDays(MONDAY, -1),
  },
  {
    id: 's3',
    name: 'Sprint 24',
    goal: 'Time tracking on every issue, end to end.',
    state: 'active',
    startDate: MONDAY,
    endDate: addDays(MONDAY, 13),
  },
  {
    id: 's4',
    name: 'Sprint 25',
    goal: 'Capacity planning and workload balancing.',
    state: 'planned',
    startDate: addDays(MONDAY, 14),
    endDate: addDays(MONDAY, 27),
  },
]

const epics = [
  { id: 'e1', name: 'Time tracking', color: 'bg-brand-500' },
  { id: 'e2', name: 'Planning & capacity', color: 'bg-success-500' },
  { id: 'e3', name: 'Reporting', color: 'bg-orange-400' },
  { id: 'e4', name: 'Platform health', color: 'bg-blue-light-500' },
]

/* ------------------------------------------------------------------ *
 * Seed issues
 * ------------------------------------------------------------------ */

type SeedIssue = Omit<
  Issue,
  'loggedHours' | 'completedAt' | 'description' | 'order' | 'coverColor' | 'checklist'
> &
  Partial<Pick<Issue, 'loggedHours' | 'completedAt' | 'description' | 'coverColor'>>

const seed: SeedIssue[] = [
  // --- Active sprint: done -------------------------------------------------
  {
    id: 'ZT-118',
    title: 'Worklog entry form on the issue detail panel',
    type: 'story',
    status: 'done',
    priority: 'high',
    assigneeId: 'u2',
    sprintId: 's3',
    epicId: 'e1',
    estimateHours: 12,
    loggedHours: 13,
    storyPoints: 5,
    startDate: MONDAY,
    dueDate: addDays(MONDAY, 2),
    completedAt: addDays(MONDAY, 2),
    labels: ['frontend'],
  },
  {
    id: 'ZT-119',
    title: 'Persist worklog entries against the issue timeline',
    type: 'task',
    status: 'done',
    priority: 'high',
    assigneeId: 'u4',
    sprintId: 's3',
    epicId: 'e1',
    estimateHours: 10,
    loggedHours: 9,
    storyPoints: 3,
    startDate: MONDAY,
    dueDate: addDays(MONDAY, 3),
    completedAt: addDays(MONDAY, 3),
    labels: ['backend', 'api'],
  },
  {
    id: 'ZT-121',
    title: 'Sprint header shows remaining working days',
    type: 'task',
    status: 'done',
    priority: 'medium',
    assigneeId: 'u3',
    sprintId: 's3',
    epicId: 'e2',
    estimateHours: 6,
    loggedHours: 5,
    storyPoints: 2,
    startDate: addDays(MONDAY, 1),
    dueDate: addDays(MONDAY, 4),
    completedAt: addDays(MONDAY, 4),
    labels: ['frontend'],
  },
  // --- Active sprint: in review -------------------------------------------
  {
    id: 'ZT-124',
    title: 'Estimate vs logged variance badge on cards',
    type: 'story',
    status: 'review',
    priority: 'medium',
    assigneeId: 'u2',
    sprintId: 's3',
    epicId: 'e1',
    estimateHours: 8,
    loggedHours: 7,
    storyPoints: 3,
    startDate: addDays(MONDAY, 3),
    dueDate: addDays(MONDAY, 6),
    labels: ['frontend'],
  },
  {
    id: 'ZT-127',
    title: 'Reject worklogs dated outside the sprint window',
    type: 'bug',
    status: 'review',
    priority: 'high',
    assigneeId: 'u6',
    sprintId: 's3',
    epicId: 'e1',
    estimateHours: 4,
    loggedHours: 5,
    storyPoints: 2,
    startDate: addDays(MONDAY, 4),
    dueDate: addDays(MONDAY, 6),
    labels: ['qa', 'validation'],
  },
  // --- Active sprint: in progress -----------------------------------------
  {
    id: 'ZT-129',
    title: 'Burndown chart driven by real remaining hours',
    type: 'story',
    status: 'in_progress',
    priority: 'highest',
    assigneeId: 'u3',
    sprintId: 's3',
    epicId: 'e3',
    estimateHours: 16,
    loggedHours: 9,
    storyPoints: 8,
    startDate: addDays(MONDAY, 3),
    dueDate: addDays(MONDAY, 8),
    labels: ['reporting', 'charts'],
  },
  {
    id: 'ZT-130',
    title: 'Drag and drop between board columns',
    type: 'story',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 'u2',
    sprintId: 's3',
    epicId: 'e2',
    estimateHours: 10,
    loggedHours: 4,
    storyPoints: 5,
    startDate: addDays(MONDAY, 5),
    dueDate: addDays(MONDAY, 9),
    labels: ['frontend'],
  },
  {
    id: 'ZT-131',
    title: 'Timeline lane rendering for epics',
    type: 'task',
    status: 'in_progress',
    priority: 'medium',
    assigneeId: 'u5',
    sprintId: 's3',
    epicId: 'e2',
    estimateHours: 12,
    loggedHours: 3,
    storyPoints: 5,
    startDate: addDays(MONDAY, 5),
    dueDate: addDays(MONDAY, 10),
    labels: ['design'],
  },
  {
    id: 'ZT-133',
    title: 'Worklog API returns 500 on concurrent writes',
    type: 'bug',
    status: 'in_progress',
    priority: 'highest',
    assigneeId: 'u4',
    sprintId: 's3',
    epicId: 'e4',
    estimateHours: 8,
    loggedHours: 6,
    storyPoints: 3,
    startDate: addDays(MONDAY, 6),
    dueDate: addDays(MONDAY, 8),
    labels: ['backend', 'incident'],
  },
  // --- Active sprint: to do ------------------------------------------------
  {
    id: 'ZT-136',
    title: 'Capacity bar per assignee in the sprint header',
    type: 'story',
    status: 'todo',
    priority: 'high',
    assigneeId: 'u1',
    sprintId: 's3',
    epicId: 'e2',
    estimateHours: 10,
    storyPoints: 5,
    startDate: addDays(MONDAY, 8),
    dueDate: addDays(MONDAY, 11),
    labels: ['planning'],
  },
  {
    id: 'ZT-137',
    title: 'Bulk move issues to the next sprint',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'u3',
    sprintId: 's3',
    epicId: 'e2',
    estimateHours: 6,
    storyPoints: 3,
    startDate: addDays(MONDAY, 9),
    dueDate: addDays(MONDAY, 12),
    labels: ['backlog'],
  },
  {
    id: 'ZT-138',
    title: 'Keyboard shortcuts for status transitions',
    type: 'task',
    status: 'todo',
    priority: 'low',
    assigneeId: 'u5',
    sprintId: 's3',
    epicId: 'e4',
    estimateHours: 5,
    storyPoints: 2,
    startDate: addDays(MONDAY, 10),
    dueDate: addDays(MONDAY, 13),
    labels: ['a11y'],
  },
  {
    id: 'ZT-139',
    title: 'Regression pass on the worklog validation rules',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'u6',
    sprintId: 's3',
    epicId: 'e1',
    estimateHours: 8,
    storyPoints: 3,
    startDate: addDays(MONDAY, 10),
    dueDate: addDays(MONDAY, 13),
    labels: ['qa'],
  },
  // --- Next sprint (planned) ----------------------------------------------
  {
    id: 'ZT-141',
    title: 'Workload rebalancing suggestions',
    type: 'story',
    status: 'todo',
    priority: 'high',
    assigneeId: 'u3',
    sprintId: 's4',
    epicId: 'e2',
    estimateHours: 16,
    storyPoints: 8,
    startDate: addDays(MONDAY, 14),
    dueDate: addDays(MONDAY, 20),
    labels: ['planning'],
  },
  {
    id: 'ZT-142',
    title: 'Team capacity settings per sprint',
    type: 'story',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'u1',
    sprintId: 's4',
    epicId: 'e2',
    estimateHours: 12,
    storyPoints: 5,
    startDate: addDays(MONDAY, 15),
    dueDate: addDays(MONDAY, 22),
    labels: ['planning'],
  },
  {
    id: 'ZT-143',
    title: 'Velocity report with rolling three-sprint average',
    type: 'story',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'u4',
    sprintId: 's4',
    epicId: 'e3',
    estimateHours: 14,
    storyPoints: 5,
    startDate: addDays(MONDAY, 16),
    dueDate: addDays(MONDAY, 24),
    labels: ['reporting'],
  },
  // --- Backlog -------------------------------------------------------------
  {
    id: 'ZT-145',
    title: 'Time-off calendar feeds into sprint capacity',
    type: 'story',
    status: 'backlog',
    priority: 'high',
    assigneeId: null,
    sprintId: null,
    epicId: 'e2',
    estimateHours: 20,
    storyPoints: 8,
    startDate: null,
    dueDate: null,
    labels: ['planning'],
  },
  {
    id: 'ZT-146',
    title: 'Export timesheets as CSV per person and per sprint',
    type: 'story',
    status: 'backlog',
    priority: 'medium',
    assigneeId: null,
    sprintId: null,
    epicId: 'e3',
    estimateHours: 12,
    storyPoints: 5,
    startDate: null,
    dueDate: null,
    labels: ['reporting'],
  },
  {
    id: 'ZT-147',
    title: 'Dependency links block issue start dates',
    type: 'story',
    status: 'backlog',
    priority: 'high',
    assigneeId: null,
    sprintId: null,
    epicId: 'e2',
    estimateHours: 24,
    storyPoints: 13,
    startDate: null,
    dueDate: null,
    labels: ['timeline'],
  },
  {
    id: 'ZT-148',
    title: 'Idle timer stops logging after 30 minutes',
    type: 'bug',
    status: 'backlog',
    priority: 'medium',
    assigneeId: null,
    sprintId: null,
    epicId: 'e1',
    estimateHours: 6,
    storyPoints: 3,
    startDate: null,
    dueDate: null,
    labels: ['tracking'],
  },
  {
    id: 'ZT-149',
    title: 'Slack notification when a sprint is at risk',
    type: 'task',
    status: 'backlog',
    priority: 'low',
    assigneeId: null,
    sprintId: null,
    epicId: 'e4',
    estimateHours: 8,
    storyPoints: 3,
    startDate: null,
    dueDate: null,
    labels: ['integrations'],
  },
  {
    id: 'ZT-150',
    title: 'Archive completed sprints after 90 days',
    type: 'task',
    status: 'backlog',
    priority: 'low',
    assigneeId: null,
    sprintId: null,
    epicId: 'e4',
    estimateHours: 5,
    storyPoints: 2,
    startDate: null,
    dueDate: null,
    labels: ['maintenance'],
  },
  // --- Closed sprints, kept for velocity ----------------------------------
  {
    id: 'ZT-104',
    title: 'CSV export pipeline for reports',
    type: 'story',
    status: 'done',
    priority: 'high',
    assigneeId: 'u4',
    sprintId: 's1',
    epicId: 'e3',
    estimateHours: 20,
    loggedHours: 22,
    storyPoints: 8,
    startDate: addDays(MONDAY, -28),
    dueDate: addDays(MONDAY, -18),
    completedAt: addDays(MONDAY, -17),
    labels: ['reporting'],
  },
  {
    id: 'ZT-106',
    title: 'Scheduled report delivery',
    type: 'story',
    status: 'done',
    priority: 'medium',
    assigneeId: 'u3',
    sprintId: 's1',
    epicId: 'e3',
    estimateHours: 16,
    loggedHours: 15,
    storyPoints: 5,
    startDate: addDays(MONDAY, -26),
    dueDate: addDays(MONDAY, -16),
    completedAt: addDays(MONDAY, -16),
    labels: ['reporting'],
  },
  {
    id: 'ZT-109',
    title: 'Onboarding checklist component',
    type: 'story',
    status: 'done',
    priority: 'high',
    assigneeId: 'u2',
    sprintId: 's2',
    epicId: 'e4',
    estimateHours: 14,
    loggedHours: 12,
    storyPoints: 5,
    startDate: addDays(MONDAY, -14),
    dueDate: addDays(MONDAY, -6),
    completedAt: addDays(MONDAY, -6),
    labels: ['frontend'],
  },
  {
    id: 'ZT-112',
    title: 'Guided tour for first-run projects',
    type: 'story',
    status: 'done',
    priority: 'medium',
    assigneeId: 'u5',
    sprintId: 's2',
    epicId: 'e4',
    estimateHours: 18,
    loggedHours: 20,
    storyPoints: 8,
    startDate: addDays(MONDAY, -12),
    dueDate: addDays(MONDAY, -3),
    completedAt: addDays(MONDAY, -2),
    labels: ['design'],
  },
  {
    id: 'ZT-114',
    title: 'Drop-off funnel instrumentation',
    type: 'task',
    status: 'done',
    priority: 'medium',
    assigneeId: 'u4',
    sprintId: 's2',
    epicId: 'e3',
    estimateHours: 10,
    loggedHours: 11,
    storyPoints: 3,
    startDate: addDays(MONDAY, -10),
    dueDate: addDays(MONDAY, -2),
    completedAt: addDays(MONDAY, -2),
    labels: ['analytics'],
  },
]

const buildSeedIssues = (): Issue[] =>
  seed.map((item, index) => ({
    description:
      'Tracked in the current plan. Update the estimate as soon as the work is broken down.',
    loggedHours: 0,
    completedAt: null,
    order: index,
    coverColor: '',
    checklist: [] as ChecklistItem[],
    ...item,
  }))

const issues = reactive<Issue[]>(buildSeedIssues())

/* ------------------------------------------------------------------ *
 * Shared UI state
 * ------------------------------------------------------------------ */

const activeSprintId = ref<string>('s3')
const selectedIssueId = ref<string | null>(null)
let issueCounter = 150

/* ------------------------------------------------------------------ *
 * Persistence — the board survives a reload, like the workspace does.
 * ------------------------------------------------------------------ */

interface BoardSnapshot {
  issues: Issue[]
  columns: StatusColumn[]
  activeSprintId: string
  issueCounter: number
}

let isRestoringBoard = true

const saveBoard = () => {
  if (isRestoringBoard) return
  try {
    const snapshot: BoardSnapshot = {
      issues: issues.map((issue) => ({ ...issue })),
      columns: statusColumns.map((column) => ({ ...column })),
      activeSprintId: activeSprintId.value,
      issueCounter,
    }
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Storage unavailable: the board still works for this session.
  }
}

const restoreBoard = () => {
  try {
    const raw = localStorage.getItem(BOARD_STORAGE_KEY)
    if (!raw) return
    const snapshot = JSON.parse(raw) as Partial<BoardSnapshot>
    if (Array.isArray(snapshot.columns) && snapshot.columns.length) {
      statusColumns.splice(0, statusColumns.length, ...snapshot.columns)
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
  } catch {
    // Corrupt payload: keep the seeded board.
  }
}

restoreBoard()
isRestoringBoard = false

watch([issues, statusColumns, activeSprintId], saveBoard, { deep: true })

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

export function usePlanner() {
  const activeSprint = computed(
    () => sprints.find((sprint) => sprint.id === activeSprintId.value) ?? sprints[2],
  )

  const memberById = (id: string | null): TeamMember | undefined =>
    team.find((member) => member.id === id)

  const epicById = (id: string | null) => epics.find((epic) => epic.id === id)

  const sprintById = (id: string | null) => sprints.find((sprint) => sprint.id === id)

  const issueById = (id: string | null) => issues.find((issue) => issue.id === id)

  const sprintIssues = computed(() =>
    issues.filter((issue) => issue.sprintId === activeSprint.value.id),
  )

  const backlogIssues = computed(() => issues.filter((issue) => issue.sprintId === null))

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
      name: name.trim() || 'New column',
      color,
      wipLimit: null,
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
        name: column.name,
        color: column.color,
        wipLimit: column.wipLimit,
        order: index,
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

    issues.splice(0, issues.length, ...buildSeedIssues())

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

  const resetBoard = () => {
    statusColumns.splice(0, statusColumns.length, ...defaultColumns())
    issues.splice(0, issues.length, ...buildSeedIssues())
    selectedIssueId.value = null
    syncStatusLabels()
  }

  const createIssue = (input: Partial<Issue>): Issue => {
    issueCounter += 1
    const issue: Issue = {
      id: `ZT-${issueCounter}`,
      title: input.title?.trim() || 'Untitled issue',
      description: input.description ?? '',
      type: input.type ?? 'task',
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      assigneeId: input.assigneeId ?? null,
      sprintId: input.sprintId ?? activeSprint.value.id,
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

  const logTime = (id: string, hours: number) => {
    const issue = issueById(id)
    if (!issue || hours <= 0) return
    issue.loggedHours = Math.round((issue.loggedHours + hours) * 10) / 10
  }

  /* ---------------- Derived metrics ---------------- */

  const sprintTotals = computed(() => {
    const list = sprintIssues.value
    const estimate = list.reduce((sum, issue) => sum + issue.estimateHours, 0)
    const logged = list.reduce((sum, issue) => sum + issue.loggedHours, 0)
    const done = list.filter((issue) => issue.status === 'done')
    const remaining = list
      .filter((issue) => issue.status !== 'done')
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
    const { startDate, endDate } = activeSprint.value
    const total = daysBetween(startDate, endDate) + 1
    const elapsed = Math.min(Math.max(daysBetween(startDate, today) + 1, 0), total)
    return { total, elapsed, remaining: Math.max(total - elapsed, 0) }
  })

  /** Remaining-hours burndown: ideal line against what is actually left. */
  const burndown = computed(() => {
    const { startDate } = activeSprint.value
    const { total } = sprintDays.value
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
    const closed = sprints.filter((sprint) => sprint.state !== 'planned')
    return {
      categories: closed.map((sprint) => sprint.name),
      committed: closed.map((sprint) =>
        issues
          .filter((issue) => issue.sprintId === sprint.id)
          .reduce((sum, issue) => sum + issue.storyPoints, 0),
      ),
      completed: closed.map((sprint) =>
        issues
          .filter((issue) => issue.sprintId === sprint.id && issue.status === 'done')
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
    issues
      .filter((issue) => issue.status !== 'done' && issue.dueDate !== null)
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
      .slice(0, 6),
  )

  const overdueIssues = computed(() =>
    issues.filter(
      (issue) => issue.status !== 'done' && issue.dueDate !== null && issue.dueDate < today,
    ),
  )

  return {
    // reference data
    team,
    sprints,
    epics,
    issues,
    statusColumns,
    // state
    activeSprintId,
    activeSprint,
    selectedIssue,
    selectIssue,
    // lookups
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
