import { randomBytes } from 'node:crypto'
import { bumpGeneration, db } from '../../db.mjs'
import { createClient } from './client.mjs'
import {
  findSprintField,
  findStartDateField,
  findStoryPointField,
  mapIssue,
  mapProjectToBoard,
  mapSprint,
  mapStatusesToColumns,
  mapWorklog,
  subtasksToChecklist,
} from './map.mjs'

/**
 * Runs a Jira migration into one Zetoo workspace.
 *
 * Every write is an upsert keyed on `(company_id, external_source,
 * external_id)`, so an import that dies at issue 3000 can simply be started
 * again: it updates what already arrived instead of duplicating it.
 */

const uid = (prefix) => `${prefix}${randomBytes(5).toString('hex')}`
const SOURCE = 'jira'

/**
 * Fields to request per issue.
 *
 * Named explicitly rather than with `*navigable`: the current search endpoint
 * returns only id and key unless asked, and naming them keeps the payload
 * small on a migration of thousands of issues.
 */
const BASE_FIELDS = [
  'summary',
  'description',
  'issuetype',
  'status',
  'priority',
  'assignee',
  'reporter',
  'timeoriginalestimate',
  'timeestimate',
  'timespent',
  'duedate',
  'resolutiondate',
  'labels',
  'parent',
  'comment',
  'attachment',
  'subtasks',
]

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

export const createRun = (companyId) => {
  const id = uid('imp-')
  db.prepare(
    `INSERT INTO imports (id, company_id, source, status, step, started_at)
     VALUES (?, ?, ?, 'running', 'Verbinden', ?)`,
  ).run(id, companyId, SOURCE, new Date().toISOString())
  return id
}

const progress = (runId, patch) => {
  const sets = []
  const params = []
  for (const [key, value] of Object.entries(patch)) {
    sets.push(`${key} = ?`)
    params.push(value)
  }
  params.push(runId)
  db.prepare(`UPDATE imports SET ${sets.join(', ')} WHERE id = ?`).run(params)
}

export const readRun = (runId) => {
  const row = db.prepare('SELECT * FROM imports WHERE id = ?').get(runId)
  return row && { ...row, skipped: JSON.parse(row.skipped || '{}') }
}

/* ------------------------------------------------------------------ *
 * Upserts
 * ------------------------------------------------------------------ */

/** Existing Zetoo id for a record already imported from this source. */
const existingId = (table, companyId, externalId) =>
  db
    .prepare(
      `SELECT id FROM ${table} WHERE company_id = ? AND external_source = ? AND external_id = ?`,
    )
    .get(companyId, SOURCE, String(externalId))?.id ?? null

const nextPosition = (table, companyId) =>
  db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE company_id = ?`).get(companyId).n

const upsertBoard = (companyId, board) => {
  const found = existingId('boards', companyId, board.externalId)
  if (found) {
    db.prepare('UPDATE boards SET name = ?, description = ? WHERE id = ?').run(
      board.name,
      board.description,
      found,
    )
    return found
  }
  const id = uid('b-')
  db.prepare(
    `INSERT INTO boards (id, company_id, name, client, description, color, project_id,
       archived, created_at, position, external_source, external_id)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?, ?, ?, ?)`,
  ).run(
    id,
    companyId,
    board.name,
    board.client,
    board.description,
    board.color,
    new Date().toISOString(),
    nextPosition('boards', companyId),
    SOURCE,
    String(board.externalId),
  )
  return id
}

const upsertColumns = (companyId, boardId, columns) => {
  const map = {}
  for (const column of columns) {
    db.prepare(
      `INSERT INTO status_columns (id, company_id, board_id, name, color, wip_limit, position, collapsed, dot, is_done)
       VALUES (?, ?, ?, ?, ?, NULL, ?, 0, NULL, ?)
       ON CONFLICT(board_id, id) DO UPDATE SET
         name = excluded.name, position = excluded.position, is_done = excluded.is_done`,
    ).run(
      column.id,
      companyId,
      boardId,
      column.name,
      column.color,
      column.order,
      column.isDone ? 1 : 0,
    )
    map[column.name] = column.id
  }
  return map
}

const upsertSprint = (companyId, boardId, sprint) => {
  const found = existingId('sprints', companyId, sprint.externalId)
  if (found) {
    db.prepare('UPDATE sprints SET name = ?, goal = ?, state = ?, start_date = ?, end_date = ? WHERE id = ?').run(
      sprint.name,
      sprint.goal,
      sprint.state,
      sprint.startDate,
      sprint.endDate ?? sprint.startDate,
      found,
    )
    return found
  }
  const id = uid('s-')
  db.prepare(
    `INSERT INTO sprints (id, company_id, board_id, name, goal, state, start_date, end_date,
       position, external_source, external_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    companyId,
    boardId,
    sprint.name,
    sprint.goal,
    sprint.state,
    sprint.startDate,
    sprint.endDate ?? sprint.startDate,
    nextPosition('sprints', companyId),
    SOURCE,
    String(sprint.externalId),
  )
  return id
}

const upsertIssue = (companyId, boardId, issue, fallbackStatus) => {
  const found = existingId('issues', companyId, issue.externalId)
  const status = issue.status ?? fallbackStatus
  const values = [
    issue.title,
    issue.description,
    issue.type,
    status,
    issue.priority,
    issue.assigneeId,
    issue.sprintId,
    issue.epicId,
    issue.estimateHours,
    issue.loggedHours,
    issue.storyPoints,
    issue.startDate,
    issue.dueDate,
    issue.completedAt,
    JSON.stringify(issue.labels),
    JSON.stringify(issue.checklist ?? []),
  ]

  if (found) {
    db.prepare(
      `UPDATE issues SET title = ?, description = ?, type = ?, status = ?, priority = ?,
         assignee_id = ?, sprint_id = ?, epic_id = ?, estimate_hours = ?, logged_hours = ?,
         story_points = ?, start_date = ?, due_date = ?, completed_at = ?, labels = ?, checklist = ?
       WHERE id = ?`,
    ).run([...values, found])
    return found
  }

  const id = uid('ZT-')
  db.prepare(
    `INSERT INTO issues (id, company_id, board_id, title, description, type, status, priority,
       assignee_id, sprint_id, epic_id, estimate_hours, logged_hours, story_points,
       start_date, due_date, completed_at, labels, position, cover_color, checklist,
       external_source, external_id, external_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?)`,
  ).run([
    id,
    companyId,
    boardId,
    ...values.slice(0, 15),
    nextPosition('issues', companyId),
    values[15],
    SOURCE,
    String(issue.externalId),
    issue.externalKey,
  ])
  return id
}

/**
 * Jira epics become Zetoo epics, not issues.
 *
 * In Jira an epic is just another issue; in Zetoo it is the lane the timeline
 * groups by. Importing it as both would put a card on the board that competes
 * with the work it contains and skews every "x of y done" figure.
 */
const upsertEpic = (companyId, boardId, epic) => {
  const found = existingId('epics', companyId, epic.externalId)
  if (found) {
    db.prepare('UPDATE epics SET name = ? WHERE id = ?').run(epic.title, found)
    return found
  }
  const id = uid('e-')
  const palette = ['bg-brand-500', 'bg-success-500', 'bg-orange-400', 'bg-blue-light-500']
  db.prepare(
    `INSERT INTO epics (id, company_id, board_id, name, color, position, external_source, external_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    companyId,
    boardId,
    epic.title,
    palette[nextPosition('epics', companyId) % palette.length],
    nextPosition('epics', companyId),
    SOURCE,
    String(epic.externalId),
  )
  return id
}

const upsertWorklog = (companyId, projectId, entry, issueId) => {
  const found = existingId('time_entries', companyId, entry.externalId)
  if (found) {
    db.prepare(
      'UPDATE time_entries SET date = ?, hours = ?, member_id = ?, description = ?, category = ? WHERE id = ?',
    ).run(entry.date, entry.hours, entry.memberId, entry.description, entry.category, found)
    return found
  }
  const id = uid('t-')
  db.prepare(
    `INSERT INTO time_entries (id, company_id, project_id, date, category, hours, member_id,
       description, issue_id, external_source, external_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    companyId,
    projectId,
    entry.date,
    entry.category,
    entry.hours,
    entry.memberId,
    entry.description,
    issueId,
    SOURCE,
    String(entry.externalId),
  )
  return id
}

/** The billing project the imported worklogs are booked against. */
const ensureProject = (companyId, name) => {
  const found = db
    .prepare('SELECT id FROM projects WHERE company_id = ? AND lower(name) = lower(?)')
    .get(companyId, name)
  if (found) return found.id

  const id = uid('p-')
  const company = db.prepare('SELECT name FROM company WHERE id = ?').get(companyId)
  db.prepare(
    `INSERT INTO projects (id, company_id, name, client, reference, contractor, categories,
       template_name, template_data, archived, created_at)
     VALUES (?, ?, ?, '', 'RE-{YYYY}-{NR}', ?, '[]', '', '', 0, ?)`,
  ).run(id, companyId, name, company?.name ?? '', new Date().toISOString())
  return id
}

/* ------------------------------------------------------------------ *
 * The job
 * ------------------------------------------------------------------ */

/**
 * @param options.accountToMember Jira accountId → Zetoo member id. Built by
 *   the wizard, because Jira Cloud usually withholds email addresses and the
 *   two sides cannot be matched automatically.
 */
export const runImport = async ({
  runId,
  companyId,
  credentials,
  projectKeys,
  accountToMember = {},
  categoryByType = {},
  withWorklogs = true,
  fetchImpl,
}) => {
  const client = createClient({ ...credentials, fetchImpl })
  const skipped = { comments: 0, attachments: 0, unmappedUsers: 0, worklogsWithoutMember: 0 }

  try {
    progress(runId, { step: 'Felder lesen' })
    const fields = await client.fields()
    const storyPointField = findStoryPointField(fields)
    const sprintField = findSprintField(fields)
    const startDateField = findStartDateField(fields)

    const projects = await client.projects()
    const chosen = projects.filter((p) => projectKeys.includes(p.key))
    if (!chosen.length) throw new Error('Keines der gewählten Projekte ist über die API sichtbar.')

    let done = 0
    let total = 0

    for (const project of chosen) {
      progress(runId, { step: `Projekt ${project.key}: Struktur` })

      const boardId = upsertBoard(companyId, mapProjectToBoard(project))

      // Columns come from the project's own status list, so an imported board
      // mirrors the workflow the team already knows.
      const statusPayload = await client.statuses(project.key).catch(() => [])
      const statuses = statusPayload.flatMap((entry) => entry.statuses ?? [])
      const columns = mapStatusesToColumns(statuses)
      const statusToColumn = upsertColumns(companyId, boardId, columns)
      const fallbackStatus = columns[0]?.id ?? 'todo'

      // Sprints live on the agile board, which may not exist for a
      // company-managed project without a board.
      const sprintByExternalId = {}
      for (const agileBoard of await client.boards(project.key).catch(() => [])) {
        for (const sprint of await client.sprints(agileBoard.id).catch(() => [])) {
          const mapped = mapSprint(sprint)
          sprintByExternalId[mapped.externalId] = upsertSprint(companyId, boardId, mapped)
        }
      }

      const projectId = withWorklogs ? ensureProject(companyId, project.name ?? project.key) : null
      if (projectId) {
        db.prepare('UPDATE boards SET project_id = ? WHERE id = ?').run(projectId, boardId)
      }

      // Two passes: parents first, so a sub-task can attach itself to an
      // issue that already exists.
      const issuesByKey = new Map()
      const subtasksByParent = new Map()
      const epicByExternalKey = new Map()

      progress(runId, { step: `Projekt ${project.key}: Vorgänge` })

      const jql = `project = "${project.key}" ORDER BY created ASC`
      const issueFields = [...BASE_FIELDS, storyPointField, sprintField, startDateField]
        .filter(Boolean)
        .join(',')

      // The token-paged endpoint reports no total, so the count comes from a
      // separate call. It is approximate, hence `Math.max` rather than a
      // straight assignment.
      total = Math.max(total, await client.approximateCount(jql).catch(() => 0))
      progress(runId, { total })

      for await (const page of client.searchIssues(jql, { fields: issueFields })) {
        if (page.total) total = Math.max(total, page.total)
        progress(runId, { total })

        for (const raw of page.issues) {
          const issue = mapIssue(raw, {
            storyPointField,
            sprintField,
            startDateField,
            statusToColumn,
            accountToMember,
            sprintByExternalId,
            epicByExternalId: {},
          })

          if (raw.fields?.comment?.total) skipped.comments += raw.fields.comment.total
          if (raw.fields?.attachment?.length) skipped.attachments += raw.fields.attachment.length
          if (raw.fields?.assignee && !issue.assigneeId) skipped.unmappedUsers += 1

          if (issue.isSubtask && issue.parentKey) {
            const list = subtasksByParent.get(issue.parentKey) ?? []
            list.push(raw)
            subtasksByParent.set(issue.parentKey, list)
            continue
          }

          if (issue.type === 'epic') {
            epicByExternalKey.set(issue.externalKey, upsertEpic(companyId, boardId, issue))
            continue
          }

          issue.checklist = []
          const id = upsertIssue(companyId, boardId, issue, fallbackStatus)
          issuesByKey.set(issue.externalKey, { id, raw, issue, parentKey: issue.parentKey })

          done += 1
          if (done % 25 === 0) progress(runId, { done })
        }
      }

      // `parent` carries the epic link for ordinary issues, and only becomes
      // resolvable once every epic has been created.
      for (const { id, parentKey } of issuesByKey.values()) {
        const epicId = parentKey ? epicByExternalKey.get(parentKey) : null
        if (epicId) db.prepare('UPDATE issues SET epic_id = ? WHERE id = ?').run(epicId, id)
      }

      // Sub-tasks ride along as checklist items on their parent.
      for (const [parentKey, subtasks] of subtasksByParent) {
        const parent = issuesByKey.get(parentKey)
        if (!parent) continue
        db.prepare('UPDATE issues SET checklist = ? WHERE id = ?').run(
          JSON.stringify(subtasksToChecklist(subtasks)),
          parent.id,
        )
      }

      if (withWorklogs) {
        progress(runId, { step: `Projekt ${project.key}: Zeiten` })
        for (const { id, raw } of issuesByKey.values()) {
          if (!raw.fields?.timespent) continue
          for (const worklog of await client.worklogs(raw.key)) {
            const entry = mapWorklog(worklog, raw, { accountToMember, categoryByType })
            if (!entry.memberId) skipped.worklogsWithoutMember += 1
            if (!entry.date) continue
            upsertWorklog(companyId, projectId, entry, id)
          }
        }
      }
    }

    bumpGeneration(companyId)
    progress(runId, {
      status: 'done',
      step: 'Fertig',
      done,
      skipped: JSON.stringify(skipped),
      finished_at: new Date().toISOString(),
    })
    return { done, skipped }
  } catch (error) {
    progress(runId, {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      skipped: JSON.stringify(skipped),
      finished_at: new Date().toISOString(),
    })
    throw error
  }
}
