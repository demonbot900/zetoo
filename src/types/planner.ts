export type IssueType = 'epic' | 'story' | 'task' | 'bug'

/**
 * Column ids are open ended: 'backlog' plus whatever columns the workspace
 * created on its board. The built-in ids are still the ones the seed data and
 * the Scrum template use.
 */
export type IssueStatus = string

export type BuiltInStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
export type IssuePriority = 'highest' | 'high' | 'medium' | 'low'
export type SprintState = 'completed' | 'active' | 'planned'

export interface TeamMember {
  id: string
  name: string
  role: string
  avatar: string
  /** Hours this member can commit to a two-week sprint. */
  capacityHours: number
  /** Hex colour behind the initials when there is no avatar image. */
  accent?: string
  initials?: string
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

/** A board is one client engagement: its own columns, sprints and issues. */
export interface Board {
  id: string
  name: string
  /** Auftraggeber this board delivers for. */
  client: string
  description: string
  /** Hex accent used for the board's dot and header. */
  color: string
  /** Billing project the logged hours belong to, when one is linked. */
  projectId: string | null
  archived: boolean
  createdAt: string
}

export interface Sprint {
  id: string
  boardId: string
  name: string
  goal: string
  state: SprintState
  /** ISO date string, inclusive. */
  startDate: string
  /** ISO date string, inclusive. */
  endDate: string
}

export interface Issue {
  id: string
  boardId: string
  title: string
  description: string
  type: IssueType
  status: IssueStatus
  priority: IssuePriority
  assigneeId: string | null
  sprintId: string | null
  epicId: string | null
  estimateHours: number
  loggedHours: number
  storyPoints: number
  startDate: string | null
  dueDate: string | null
  completedAt: string | null
  labels: string[]
  /** Position inside its board column, ascending. */
  order: number
  /** Optional Trello-style cover colour (hex) shown on the card. */
  coverColor: string
  checklist: ChecklistItem[]
}

export interface StatusColumn {
  id: IssueStatus
  boardId: string
  name: string
  /** Hex colour for the column dot and header accent. */
  color: string
  /** Cards allowed before the column warns, or null for no limit. */
  wipLimit: number | null
  order: number
  collapsed: boolean
  /** Legacy Tailwind dot class kept for the seeded columns. */
  dot?: string
}

export interface BoardTemplate {
  id: string
  name: string
  description: string
  columns: { name: string; color: string; wipLimit: number | null }[]
}

export interface Epic {
  id: string
  boardId: string
  name: string
  /** Tailwind background class used for the dot and progress bar. */
  color: string
}
