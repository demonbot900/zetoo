/**
 * Jira → Zetoo shape mapping.
 *
 * Pure functions on purpose: no database, no network. The awkward parts of a
 * migration are decisions, not plumbing, and decisions are worth testing on
 * their own.
 *
 * Everything here assumes Jira REST **v2**, not v3. v3 returns descriptions as
 * Atlassian Document Format — nested JSON that would need a full renderer —
 * while v2 hands back a plain string. That one choice removes a large chunk of
 * work; see `describe` for what is left to clean up.
 */

const HOUR = 3600

/** Jira has five priorities, Zetoo four. Lowest folds into low. */
const PRIORITY = {
  highest: 'highest',
  high: 'high',
  medium: 'medium',
  low: 'low',
  lowest: 'low',
  blocker: 'highest',
  critical: 'highest',
  major: 'high',
  minor: 'low',
  trivial: 'low',
}

export const mapPriority = (name) => PRIORITY[String(name ?? '').toLowerCase()] ?? 'medium'

/** Zetoo knows four types; anything else is work, so it becomes a task. */
export const mapIssueType = (type) => {
  const name = String(type?.name ?? type ?? '').toLowerCase()
  if (type?.subtask) return 'subtask'
  if (name.includes('epic')) return 'epic'
  if (name.includes('story')) return 'story'
  if (name.includes('bug') || name.includes('defect')) return 'bug'
  if (name.includes('sub-task') || name.includes('subtask')) return 'subtask'
  return 'task'
}

/** `PT2H30M`-free: Jira reports work in seconds. */
export const secondsToHours = (seconds) =>
  seconds ? Math.round((Number(seconds) / HOUR) * 100) / 100 : 0

/** Worklogs are booked in quarter hours, like everything else in Zetoo. */
export const toQuarter = (hours) => {
  if (!Number.isFinite(hours) || hours <= 0) return 0.25
  return Math.max(0.25, Math.round(hours / 0.25) * 0.25)
}

/** `2026-08-14T09:12:00.000+0200` → `2026-08-14`, in the offset Jira sent. */
export const toISODate = (value) => {
  if (!value) return null
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

/**
 * Flattens a Jira description into the plain string Zetoo stores.
 *
 * v2 gives wiki markup on Server and mostly-plain text on Cloud; a v3 payload
 * may still slip through, so ADF is walked for its text nodes rather than
 * dropped. Formatting is deliberately lost — Zetoo has no rich text.
 */
export const describe = (description) => {
  if (!description) return ''
  if (typeof description === 'string') {
    return description
      .replace(/\{code(:[^}]*)?\}|\{noformat\}/g, '')
      .replace(/[*_+^~-]{2,}/g, '')
      .trim()
  }
  // ADF: collect every text node in order.
  const out = []
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (typeof node.text === 'string') out.push(node.text)
    if (node.type === 'paragraph' || node.type === 'listItem') out.push('\n')
    for (const child of node.content ?? []) walk(child)
  }
  walk(description)
  return out.join('').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Finds the story-point field.
 *
 * Its id differs per Jira instance, so it is discovered by name from
 * `/rest/api/2/field` rather than hard-coded to the customfield_10016 that
 * happens to be right on some sites.
 */
export const findStoryPointField = (fields = []) => {
  const match = fields.find((field) => {
    const name = String(field.name ?? '').toLowerCase()
    return name === 'story points' || name === 'story point estimate'
  })
  return match?.id ?? null
}

/**
 * The start-date field, found by name.
 *
 * Its id varies per site and it is localised — "Start date", "Startdatum" —
 * so both the English and the German label are matched rather than betting on
 * customfield_10015 being right everywhere.
 */
export const findStartDateField = (fields = []) =>
  fields.find((field) => /^(start date|startdatum|start)$/i.test(String(field.name ?? '').trim()))
    ?.id ?? null

export const findSprintField = (fields = []) =>
  fields.find((field) => String(field.name ?? '').toLowerCase() === 'sprint')?.id ?? null

/* ------------------------------------------------------------------ *
 * Entities
 * ------------------------------------------------------------------ */

export const mapProjectToBoard = (project) => ({
  externalId: String(project.id),
  name: project.name ?? project.key,
  client: '',
  description: `Aus Jira übernommen (${project.key})`,
  color: '#465fff',
})

/**
 * Jira statuses become board columns.
 *
 * Order follows the status category — To Do, then In Progress, then Done — so
 * an imported board reads left to right even when Jira reported the statuses
 * in an arbitrary order.
 */
const CATEGORY_RANK = { new: 0, indeterminate: 1, done: 2 }
const CATEGORY_COLOR = { new: '#98a2b3', indeterminate: '#465fff', done: '#12b76a' }

export const mapStatusesToColumns = (statuses = []) => {
  const seen = new Map()
  for (const status of statuses) {
    const key = String(status.statusCategory?.key ?? 'indeterminate')
    if (!seen.has(status.name)) {
      seen.set(status.name, {
        id: slug(status.name, [...seen.values()].map((c) => c.id)),
        name: status.name,
        color: CATEGORY_COLOR[key] ?? '#98a2b3',
        rank: CATEGORY_RANK[key] ?? 1,
        // Jira already knows which statuses finish work; carrying that over is
        // what lets progress be counted on a board with translated columns.
        isDone: key === 'done',
        wipLimit: null,
      })
    }
  }
  return [...seen.values()]
    .sort((a, b) => a.rank - b.rank)
    .map((column, index) => ({ ...column, order: index }))
}

export const slug = (name, taken = []) => {
  const base =
    String(name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'column'
  if (!taken.includes(base)) return base
  let suffix = 2
  while (taken.includes(`${base}_${suffix}`)) suffix += 1
  return `${base}_${suffix}`
}

const SPRINT_STATE = { closed: 'completed', active: 'active', future: 'planned' }

export const mapSprint = (sprint) => ({
  externalId: String(sprint.id),
  name: sprint.name ?? `Sprint ${sprint.id}`,
  goal: sprint.goal ?? '',
  state: SPRINT_STATE[String(sprint.state ?? '').toLowerCase()] ?? 'planned',
  startDate: toISODate(sprint.startDate) ?? toISODate(new Date().toISOString()),
  endDate: toISODate(sprint.endDate ?? sprint.completeDate) ?? null,
})

/**
 * Jira Cloud usually withholds email addresses, so an account cannot be
 * matched automatically. `email` is null in that case and the operator has to
 * map the person by hand — which is why the wizard has a mapping step.
 */
export const mapUser = (user) => ({
  externalId: user.accountId ?? user.key ?? user.name,
  displayName: user.displayName ?? '',
  email: user.emailAddress ?? null,
  avatar: user.avatarUrls?.['48x48'] ?? '',
})

/**
 * One Jira issue in Zetoo's shape.
 *
 * `context` carries what cannot be read off the issue itself: the field ids
 * discovered earlier, and the lookup tables the wizard produced.
 */
export const mapIssue = (issue, context = {}) => {
  const {
    storyPointField,
    startDateField,
    statusToColumn = {},
    accountToMember = {},
    sprintByExternalId = {},
    epicByExternalId = {},
  } = context

  const fields = issue.fields ?? {}
  const type = mapIssueType(fields.issuetype)

  const sprintId = lastSprintId(fields, context.sprintField)
  const epicKey = fields.parent?.key ?? fields.epic?.key ?? null

  return {
    externalId: String(issue.id),
    externalKey: issue.key,
    title: fields.summary ?? issue.key,
    description: describe(fields.description),
    type: type === 'subtask' ? 'task' : type,
    isSubtask: type === 'subtask',
    parentKey: fields.parent?.key ?? null,
    status: statusToColumn[fields.status?.name] ?? null,
    priority: mapPriority(fields.priority?.name),
    assigneeId: accountToMember[mapUser(fields.assignee ?? {}).externalId] ?? null,
    sprintId: sprintByExternalId[sprintId] ?? null,
    epicId: epicByExternalId[epicKey] ?? null,
    estimateHours: secondsToHours(fields.timeoriginalestimate ?? fields.timeestimate),
    loggedHours: secondsToHours(fields.timespent),
    storyPoints: storyPointField ? (Number(fields[storyPointField]) || 0) : 0,
    startDate: toISODate(
      (startDateField ? fields[startDateField] : null) ?? fields.startDate ?? null,
    ),
    dueDate: toISODate(fields.duedate),
    completedAt: toISODate(fields.resolutiondate),
    labels: Array.isArray(fields.labels) ? fields.labels : [],
  }
}

/**
 * An issue can have travelled through several sprints; the last entry is the
 * one it belongs to now. Jira reports this either as objects (newer) or as
 * `com.atlassian.greenhopper...[id=42,...]` strings (older).
 */
const lastSprintId = (fields, sprintField) => {
  const raw = fields[sprintField] ?? fields.sprint ?? null
  if (!raw) return null
  const list = Array.isArray(raw) ? raw : [raw]
  const last = list[list.length - 1]
  if (!last) return null
  if (typeof last === 'object') return String(last.id)
  const match = String(last).match(/id=(\d+)/)
  return match ? match[1] : null
}

/**
 * A Jira worklog becomes one line of the Leistungsnachweis.
 *
 * Jira has no notion of a service category, so it is derived from the issue
 * type unless the wizard supplied a mapping — better than leaving the column
 * blank on an invoice.
 */
export const mapWorklog = (worklog, issue, context = {}) => {
  const { accountToMember = {}, categoryByType = {}, defaultCategory = 'Entwicklung' } = context
  const type = mapIssueType(issue?.fields?.issuetype)

  return {
    externalId: String(worklog.id),
    date: toISODate(worklog.started),
    hours: toQuarter(secondsToHours(worklog.timeSpentSeconds)),
    memberId: accountToMember[mapUser(worklog.author ?? {}).externalId] ?? null,
    description:
      describe(worklog.comment) || `${issue?.key ?? ''} ${issue?.fields?.summary ?? ''}`.trim(),
    category: categoryByType[type] ?? defaultCategory,
    issueExternalId: issue ? String(issue.id) : null,
  }
}

/** Sub-tasks have no home in Zetoo, so they ride along as checklist items. */
export const subtasksToChecklist = (subtasks = []) =>
  subtasks.map((subtask) => ({
    id: `c-${subtask.id}`,
    text: subtask.fields?.summary ?? subtask.key,
    done: String(subtask.fields?.status?.statusCategory?.key ?? '') === 'done',
  }))
