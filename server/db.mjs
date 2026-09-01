import Database from 'better-sqlite3'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * SQLite access layer.
 *
 * The client keeps three reactive stores (workspace, board, records) and syncs
 * each as a whole document. This module is what turns those documents into
 * real rows and back, so the database stays queryable with plain SQL instead
 * of holding opaque JSON blobs.
 */

const HERE = dirname(fileURLToPath(import.meta.url))

export const DB_PATH = process.env.ZETOO_DB ?? resolve(HERE, 'data/zetoo.db')

mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new Database(DB_PATH)
db.exec(readFileSync(join(HERE, 'schema.sql'), 'utf8'))

/**
 * Adds columns that `CREATE TABLE IF NOT EXISTS` cannot add to a table that
 * already exists. Keeps databases created before a feature landed working
 * without asking anyone to throw their workspace away.
 */
const ensureColumns = () => {
  const wanted = {
    members: { external_source: 'TEXT', external_id: 'TEXT' },
    boards: { external_source: 'TEXT', external_id: 'TEXT' },
    sprints: { external_source: 'TEXT', external_id: 'TEXT' },
    epics: { external_source: 'TEXT', external_id: 'TEXT' },
    issues: { external_source: 'TEXT', external_id: 'TEXT', external_key: 'TEXT' },
    time_entries: { external_source: 'TEXT', external_id: 'TEXT' },
  }

  for (const [table, columns] of Object.entries(wanted)) {
    const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name))
    for (const [column, type] of Object.entries(columns)) {
      if (!existing.has(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
    }
  }

  // One imported row per source record, so re-running an import updates
  // instead of duplicating.
  for (const table of Object.keys(wanted)) {
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_external
       ON ${table} (company_id, external_source, external_id)
       WHERE external_id IS NOT NULL`,
    )
  }
}

ensureColumns()

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const json = (value, fallback) => {
  if (value === null || value === undefined) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const bool = (value) => value === 1 || value === true
const int = (value) => (value ? 1 : 0)

/**
 * Replaces one tenant's rows in a table.
 *
 * Scoped on purpose: the client syncs whole documents, and an unscoped DELETE
 * would wipe every other company's data on the first save.
 */
const replaceAll = (companyId, table, columns, rows) => {
  const cols = ['company_id', ...columns]
  const placeholders = cols.map(() => '?').join(', ')
  const insert = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`)
  const run = db.transaction((items) => {
    db.prepare(`DELETE FROM ${table} WHERE company_id = ?`).run(companyId)
    for (const item of items) insert.run([companyId, ...item])
  })
  run(rows)
}

const getState = (companyId, key, fallback = null) => {
  const row = db
    .prepare('SELECT value FROM app_state WHERE company_id = ? AND key = ?')
    .get(companyId, key)
  return row ? row.value : fallback
}

const setStateStmt = db.prepare(
  'INSERT INTO app_state (company_id, key, value) VALUES (?, ?, ?) ' +
    'ON CONFLICT(company_id, key) DO UPDATE SET value = excluded.value',
)

const setState = { run: (companyId, key, value) => setStateStmt.run(companyId, key, value) }

/* ------------------------------------------------------------------ *
 * Workspace
 * ------------------------------------------------------------------ */

const companyToRow = (c) => [
  c.id,
  c.name ?? '',
  c.slug ?? '',
  c.industry ?? '',
  c.size ?? '1-10',
  c.website ?? '',
  c.logo ?? '',
  c.addressLine ?? '',
  c.city ?? '',
  c.postalCode ?? '',
  c.country ?? '',
  c.vatId ?? '',
  c.timezone ?? 'Europe/Berlin',
  JSON.stringify(c.workDays ?? [1, 2, 3, 4, 5]),
  c.hoursPerDay ?? 8,
  c.plan ?? 'starter',
  c.createdAt ?? new Date().toISOString(),
]

const rowToCompany = (r) =>
  r && {
    id: r.id,
    name: r.name,
    slug: r.slug,
    industry: r.industry,
    size: r.size,
    website: r.website,
    logo: r.logo,
    addressLine: r.address_line,
    city: r.city,
    postalCode: r.postal_code,
    country: r.country,
    vatId: r.vat_id,
    timezone: r.timezone,
    workDays: json(r.work_days, [1, 2, 3, 4, 5]),
    hoursPerDay: r.hours_per_day,
    plan: r.plan,
    createdAt: r.created_at,
  }

const rowToMember = (r) => ({
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  email: r.email,
  jobTitle: r.job_title,
  department: r.department,
  role: r.role,
  status: r.status,
  avatar: r.avatar,
  accent: r.accent,
  phone: r.phone,
  location: r.location,
  timezone: r.timezone,
  bio: r.bio,
  skills: json(r.skills, []),
  capacityHours: r.capacity_hours,
  startedAt: r.started_at,
  links: json(r.links, { linkedin: '', github: '', x: '', website: '' }),
})

export const readWorkspace = (companyId) => ({
  company: rowToCompany(db.prepare('SELECT * FROM company WHERE id = ?').get(companyId)) ?? null,
  members: db.prepare('SELECT * FROM members WHERE company_id = ? ORDER BY position').all(companyId).map(rowToMember),
  invites: db
    .prepare('SELECT * FROM invites WHERE company_id = ?')
    .all(companyId)
    .map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      jobTitle: r.job_title,
      sentAt: r.sent_at,
    })),
  currentUserId: getState(companyId, 'currentUserId'),
})

export const writeWorkspace = db.transaction((companyId, snapshot) => {
  db.prepare('DELETE FROM company WHERE id = ?').run(companyId)
  if (snapshot.company) {
    db.prepare(
      `INSERT INTO company (
         id, name, slug, industry, size, website, logo, address_line, city,
         postal_code, country, vat_id, timezone, work_days, hours_per_day,
         plan, created_at
       ) VALUES (${Array(17).fill('?').join(', ')})`,
      // The session decides the tenant id; the client's own id is ignored so a
      // save can never re-point a workspace at another company.
    ).run(companyToRow({ ...snapshot.company, id: companyId }))
  }

  replaceAll(
    companyId,
    'members',
    [
      'id',
      'first_name',
      'last_name',
      'email',
      'job_title',
      'department',
      'role',
      'status',
      'avatar',
      'accent',
      'phone',
      'location',
      'timezone',
      'bio',
      'skills',
      'capacity_hours',
      'started_at',
      'links',
      'position',
    ],
    (snapshot.members ?? []).map((m, index) => [
      m.id,
      m.firstName ?? '',
      m.lastName ?? '',
      m.email ?? '',
      m.jobTitle ?? '',
      m.department ?? '',
      m.role ?? 'member',
      m.status ?? 'active',
      m.avatar ?? '',
      m.accent ?? '',
      m.phone ?? '',
      m.location ?? '',
      m.timezone ?? '',
      m.bio ?? '',
      JSON.stringify(m.skills ?? []),
      m.capacityHours ?? 0,
      m.startedAt ?? '',
      JSON.stringify(m.links ?? {}),
      index,
    ]),
  )

  replaceAll(
    companyId,
    'invites',
    ['id', 'email', 'role', 'job_title', 'sent_at'],
    (snapshot.invites ?? []).map((i) => [
      i.id,
      i.email ?? '',
      i.role ?? 'member',
      i.jobTitle ?? '',
      i.sentAt ?? '',
    ]),
  )

  if (snapshot.currentUserId) setState.run(companyId, 'currentUserId', snapshot.currentUserId)
})

/* ------------------------------------------------------------------ *
 * Board
 * ------------------------------------------------------------------ */

const rowToIssue = (r) => ({
  id: r.id,
  boardId: r.board_id,
  title: r.title,
  description: r.description,
  type: r.type,
  status: r.status,
  priority: r.priority,
  assigneeId: r.assignee_id,
  sprintId: r.sprint_id,
  epicId: r.epic_id,
  estimateHours: r.estimate_hours,
  loggedHours: r.logged_hours,
  storyPoints: r.story_points,
  startDate: r.start_date,
  dueDate: r.due_date,
  completedAt: r.completed_at,
  labels: json(r.labels, []),
  order: r.position,
  coverColor: r.cover_color,
  checklist: json(r.checklist, []),
})

export const readBoard = (companyId) => ({
  boards: db
    .prepare('SELECT * FROM boards WHERE company_id = ? ORDER BY position')
    .all(companyId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      client: r.client,
      description: r.description,
      color: r.color,
      projectId: r.project_id,
      archived: bool(r.archived),
      createdAt: r.created_at,
    })),
  activeBoardId: getState(companyId, 'activeBoardId', ''),
  issues: db.prepare('SELECT * FROM issues WHERE company_id = ? ORDER BY position').all(companyId).map(rowToIssue),
  sprints: db
    .prepare('SELECT * FROM sprints WHERE company_id = ? ORDER BY position')
    .all(companyId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      goal: r.goal,
      state: r.state,
      boardId: r.board_id,
      startDate: r.start_date,
      endDate: r.end_date,
    })),
  epics: db
    .prepare('SELECT * FROM epics WHERE company_id = ? ORDER BY position')
    .all(companyId)
    .map((r) => ({ id: r.id, boardId: r.board_id, name: r.name, color: r.color })),
  columns: db
    .prepare('SELECT * FROM status_columns WHERE company_id = ? ORDER BY position')
    .all(companyId)
    .map((r) => ({
      id: r.id,
      boardId: r.board_id,
      name: r.name,
      color: r.color,
      wipLimit: r.wip_limit,
      order: r.position,
      collapsed: bool(r.collapsed),
      dot: r.dot ?? undefined,
    })),
  activeSprintId: getState(companyId, 'activeSprintId', ''),
  issueCounter: Number(getState(companyId, 'issueCounter', '0')),
})

export const writeBoard = db.transaction((companyId, snapshot) => {
  replaceAll(
    companyId,
    'boards',
    ['id', 'name', 'client', 'description', 'color', 'project_id', 'archived', 'created_at', 'position'],
    (snapshot.boards ?? []).map((b, index) => [
      b.id,
      b.name ?? '',
      b.client ?? '',
      b.description ?? '',
      b.color ?? '',
      b.projectId ?? null,
      int(b.archived),
      b.createdAt ?? '',
      index,
    ]),
  )

  replaceAll(
    companyId,
    'sprints',
    ['id', 'board_id', 'name', 'goal', 'state', 'start_date', 'end_date', 'position'],
    (snapshot.sprints ?? []).map((s, index) => [
      s.id,
      s.boardId ?? '',
      s.name ?? '',
      s.goal ?? '',
      s.state ?? 'planned',
      s.startDate ?? '',
      s.endDate ?? '',
      index,
    ]),
  )

  replaceAll(
    companyId,
    'epics',
    ['id', 'board_id', 'name', 'color', 'position'],
    (snapshot.epics ?? []).map((e, index) => [
      e.id,
      e.boardId ?? '',
      e.name ?? '',
      e.color ?? '',
      index,
    ]),
  )

  replaceAll(
    companyId,
    'status_columns',
    ['id', 'board_id', 'name', 'color', 'wip_limit', 'position', 'collapsed', 'dot'],
    (snapshot.columns ?? []).map((c, index) => [
      c.id,
      c.boardId ?? '',
      c.name ?? '',
      c.color ?? '',
      c.wipLimit ?? null,
      c.order ?? index,
      int(c.collapsed),
      c.dot ?? null,
    ]),
  )

  replaceAll(
    companyId,
    'issues',
    [
      'id',
      'board_id',
      'title',
      'description',
      'type',
      'status',
      'priority',
      'assignee_id',
      'sprint_id',
      'epic_id',
      'estimate_hours',
      'logged_hours',
      'story_points',
      'start_date',
      'due_date',
      'completed_at',
      'labels',
      'position',
      'cover_color',
      'checklist',
    ],
    (snapshot.issues ?? []).map((i, index) => [
      i.id,
      i.boardId ?? '',
      i.title ?? '',
      i.description ?? '',
      i.type ?? 'task',
      i.status ?? 'backlog',
      i.priority ?? 'medium',
      // Assignees and issues arrive in the same sync, and the client may point
      // at a member this database has not stored yet. Null keeps the foreign
      // key honest instead of rejecting the whole write.
      memberExists(i.assigneeId) ? i.assigneeId : null,
      i.sprintId ?? null,
      i.epicId ?? null,
      i.estimateHours ?? 0,
      i.loggedHours ?? 0,
      i.storyPoints ?? 0,
      i.startDate ?? null,
      i.dueDate ?? null,
      i.completedAt ?? null,
      JSON.stringify(i.labels ?? []),
      i.order ?? index,
      i.coverColor ?? '',
      JSON.stringify(i.checklist ?? []),
    ]),
  )

  if (snapshot.activeBoardId) setState.run(companyId, 'activeBoardId', String(snapshot.activeBoardId))
  if (snapshot.activeSprintId) setState.run(companyId, 'activeSprintId', String(snapshot.activeSprintId))
  if (snapshot.issueCounter !== undefined) {
    setState.run(companyId, 'issueCounter', String(snapshot.issueCounter))
  }
})

const memberExists = (id) =>
  Boolean(id) && Boolean(db.prepare('SELECT 1 FROM members WHERE id = ?').get(id))

const issueExists = (id) =>
  Boolean(id) && Boolean(db.prepare('SELECT 1 FROM issues WHERE id = ?').get(id))

/* ------------------------------------------------------------------ *
 * Records — projects and time entries
 * ------------------------------------------------------------------ */

export const readRecords = (companyId) => ({
  projects: db
    .prepare('SELECT * FROM projects WHERE company_id = ? ORDER BY created_at')
    .all(companyId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      client: r.client,
      reference: r.reference,
      contractor: r.contractor,
      categories: json(r.categories, []),
      templateName: r.template_name,
      templateData: r.template_data,
      archived: bool(r.archived),
      createdAt: r.created_at,
    })),
  entries: db
    .prepare('SELECT * FROM time_entries WHERE company_id = ? ORDER BY date, id')
    .all(companyId)
    .map((r) => ({
      id: r.id,
      projectId: r.project_id,
      date: r.date,
      category: r.category,
      hours: r.hours,
      memberId: r.member_id ?? '',
      description: r.description,
      issueId: r.issue_id,
    })),
  selectedProjectId: getState(companyId, 'selectedProjectId', ''),
  period: {
    from: getState(companyId, 'periodFrom', ''),
    to: getState(companyId, 'periodTo', ''),
  },
  referenceCounter: Number(getState(companyId, 'referenceCounter', '1')),
})

export const writeRecords = db.transaction((companyId, snapshot) => {
  replaceAll(
    companyId,
    'projects',
    [
      'id',
      'name',
      'client',
      'reference',
      'contractor',
      'categories',
      'template_name',
      'template_data',
      'archived',
      'created_at',
    ],
    (snapshot.projects ?? []).map((p) => [
      p.id,
      p.name ?? '',
      p.client ?? '',
      p.reference ?? '',
      p.contractor ?? '',
      JSON.stringify(p.categories ?? []),
      p.templateName ?? '',
      p.templateData ?? '',
      int(p.archived),
      p.createdAt ?? '',
    ]),
  )

  const projectIds = new Set((snapshot.projects ?? []).map((p) => p.id))

  replaceAll(
    companyId,
    'time_entries',
    ['id', 'project_id', 'date', 'category', 'hours', 'member_id', 'description', 'issue_id'],
    (snapshot.entries ?? [])
      // An entry without its project would violate the foreign key; dropping it
      // matches what the client shows, since it filters by project anyway.
      .filter((e) => projectIds.has(e.projectId))
      .map((e) => [
        e.id,
        e.projectId,
        e.date,
        e.category ?? '',
        e.hours ?? 0,
        memberExists(e.memberId) ? e.memberId : null,
        e.description ?? '',
        issueExists(e.issueId) ? e.issueId : null,
      ]),
  )

  if (snapshot.selectedProjectId !== undefined) {
    setState.run(companyId, 'selectedProjectId', String(snapshot.selectedProjectId ?? ''))
  }
  if (snapshot.period?.from) setState.run(companyId, 'periodFrom', snapshot.period.from)
  if (snapshot.period?.to) setState.run(companyId, 'periodTo', snapshot.period.to)
  if (snapshot.referenceCounter !== undefined) {
    setState.run(companyId, 'referenceCounter', String(snapshot.referenceCounter))
  }
})

/**
 * Identifies the current incarnation of the database.
 *
 * A browser tab that was open across a reset still holds the old workspace in
 * its mirror and would happily push it back on the next edit. Clients send the
 * generation they loaded with; a mismatch means their copy predates a reset,
 * and the write is refused rather than resurrecting deleted data.
 */
export const getGeneration = (companyId) => {
  const current = getState(companyId, 'generation')
  if (current) return current
  const fresh = Date.now().toString(36)
  setState.run(companyId, 'generation', fresh)
  return fresh
}

/**
 * Invalidates every open browser tab.
 *
 * Called after a write that did not come from the web app — an MCP tool, say.
 * Tabs hold a whole-document copy and would otherwise overwrite the change on
 * their next save; a bumped generation makes them reload instead.
 */
export const bumpGeneration = (companyId) => newGeneration(companyId)

const newGeneration = (companyId) => {
  const fresh = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  setState.run(companyId, 'generation', fresh)
  return fresh
}

/** Tables emptied by a workspace reset, children before parents. */
const RESETTABLE = [
  'sessions',
  'google_identities',
  'time_entries',
  'projects',
  'issues',
  'sprints',
  'epics',
  'boards',
  'status_columns',
  'invites',
  'members',
  'company',
  'app_state',
]

/**
 * Empties every table, returning the database to its just-created state.
 * The schema itself is left alone, so the next write needs no migration.
 */
/**
 * Empties one workspace. Sessions and Google identities of its members go too,
 * so a reset really does return the tenant to "never registered".
 */
export const resetAll = db.transaction((companyId) => {
  const emails = db
    .prepare('SELECT email FROM members WHERE company_id = ?')
    .all(companyId)
    .map((row) => row.email)

  for (const table of RESETTABLE) {
    if (table === 'sessions' || table === 'google_identities') continue
    if (table === 'company') db.prepare('DELETE FROM company WHERE id = ?').run(companyId)
    else db.prepare(`DELETE FROM ${table} WHERE company_id = ?`).run(companyId)
  }

  for (const email of emails) {
    db.prepare('DELETE FROM sessions WHERE lower(email) = lower(?)').run(email)
    db.prepare('DELETE FROM google_identities WHERE lower(email) = lower(?)').run(email)
  }

  return newGeneration(companyId)
})

/** Row counts, used by the health endpoint and the CLI. */
export const stats = (companyId) =>
  Object.fromEntries(
    [
      'company',
      'members',
      'invites',
      'boards',
      'sprints',
      'epics',
      'issues',
      'status_columns',
      'projects',
      'time_entries',
    ].map(
      (table) => [
        table,
        companyId
          ? db
              .prepare(
                `SELECT COUNT(*) AS n FROM ${table} WHERE ${
                  table === 'company' ? 'id' : 'company_id'
                } = ?`,
              )
              .get(companyId).n
          : db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n,
      ],
    ),
  )
