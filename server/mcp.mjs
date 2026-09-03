import { randomBytes } from 'node:crypto'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { bumpGeneration, db } from './db.mjs'
import { leaderboard } from './gamification.mjs'

/**
 * Zetoo MCP server.
 *
 * Lets Claude read and manage a workspace directly in SQLite — projects, time
 * entries, boards and issues. Speaks stdio, so it is launched by the MCP
 * client (Claude Desktop, Claude Code) rather than run as a service.
 *
 * Tenancy: the workspace is chosen by `ZETOO_COMPANY` (id or name) or, when a
 * database holds exactly one company, that one. There is no session here, so
 * being explicit beats guessing.
 *
 * Writes bump the generation marker, which makes any open browser tab reload
 * instead of overwriting these changes with its own cached copy.
 */

const uid = (prefix) => `${prefix}${randomBytes(4).toString('hex')}`

/* ------------------------------------------------------------------ *
 * Tenant
 * ------------------------------------------------------------------ */

const resolveCompany = () => {
  const wanted = process.env.ZETOO_COMPANY?.trim()
  const companies = db.prepare('SELECT id, name FROM company ORDER BY created_at').all()

  if (wanted) {
    const match = companies.find(
      (c) => c.id === wanted || c.name.toLowerCase() === wanted.toLowerCase(),
    )
    if (!match) {
      throw new Error(
        `Kein Arbeitsbereich "${wanted}". Vorhanden: ${
          companies.map((c) => c.name).join(', ') || '(keiner)'
        }`,
      )
    }
    return match
  }

  if (companies.length === 1) return companies[0]
  if (companies.length === 0) throw new Error('Die Datenbank enthält noch keinen Arbeitsbereich.')
  throw new Error(
    `Mehrere Arbeitsbereiche vorhanden (${companies
      .map((c) => c.name)
      .join(', ')}). ZETOO_COMPANY setzen.`,
  )
}

/** Resolved per call, so a workspace created after start-up is picked up. */
const companyId = () => resolveCompany().id

const touched = () => bumpGeneration(companyId())


/* ------------------------------------------------------------------ *
 * Shared write helpers
 * ------------------------------------------------------------------ */

/** Verifies a row belongs to this workspace before anything touches it. */
const owned = (table, id) => {
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND company_id = ?`).get(id, companyId())
  if (!row) throw new Error(`${table}: ${id} gehört nicht zu diesem Arbeitsbereich.`)
  return row
}

/**
 * Applies only the fields actually supplied.
 *
 * `mapping` is argument name → column. An empty string clears a nullable
 * column, which is how a value gets removed rather than blanked.
 */
const patch = (table, id, mapping, args, nullable = []) => {
  owned(table, id)
  const sets = []
  const params = []
  for (const [key, column] of Object.entries(mapping)) {
    if (args[key] === undefined) continue
    sets.push(`${column} = ?`)
    params.push(args[key] === '' && nullable.includes(key) ? null : args[key])
  }
  if (!sets.length) throw new Error('Keine Felder zum Ändern übergeben.')
  params.push(id, companyId())
  db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`).run(params)
  touched()
  return { updated: sets.length }
}

const remove = (table, id) => {
  owned(table, id)
  db.prepare(`DELETE FROM ${table} WHERE id = ? AND company_id = ?`).run(id, companyId())
  touched()
  return { deleted: id }
}

const bool01 = (value) => (value ? 1 : 0)

/**
 * Collapses the whitespace people cannot see.
 *
 * Text pasted out of Jira or Word carries non-breaking spaces (U+00A0), so a
 * search for "Aufgabe 1" typed with an ordinary space finds nothing. Both
 * sides of a comparison go through this.
 */
const flatten = (value) => String(value ?? '').replace(/[\u00a0\u2007\u202f]/g, ' ')

const jsonArray = (value, fallback = []) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : fallback
    } catch {
      // A plain comma-separated list is friendlier than demanding JSON.
      return value.split(',').map((part) => part.trim()).filter(Boolean)
    }
  }
  return fallback
}

/**
 * Column ids that mean "finished" on a board.
 *
 * Boards translate and rename their last column, so progress can never be read
 * off a literal `done`. `is_done` is set by the importer from Jira's status
 * category, and by migration for boards that predate the flag.
 */
const doneColumns = (boardId) =>
  new Set(
    db
      .prepare('SELECT id FROM status_columns WHERE company_id = ? AND board_id = ? AND is_done = 1')
      .all(companyId(), boardId)
      .map((row) => row.id),
  )


/** The board the web app currently opens on. */
const getActiveBoardId = () =>
  db
    .prepare("SELECT value FROM app_state WHERE company_id = ? AND key = 'activeBoardId'")
    .get(companyId())?.value ?? null

const isoDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

/* ------------------------------------------------------------------ *
 * Tools
 * ------------------------------------------------------------------ */

const str = (description) => ({ type: 'string', description })
const num = (description) => ({ type: 'number', description })

const TOOLS = [
  {
    name: 'zetoo_workspace',
    description:
      'Overview of the workspace: company, members, boards, projects and totals. Start here.',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      const company = resolveCompany()
      const id = company.id
      const count = (table) =>
        db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE company_id = ?`).get(id).n
      return {
        company,
        members: db
          .prepare('SELECT id, first_name, last_name, email, role FROM members WHERE company_id = ?')
          .all(id),
        boards: db
          .prepare('SELECT id, name, client, archived FROM boards WHERE company_id = ?')
          .all(id),
        projects: db
          .prepare('SELECT id, name, client, reference FROM projects WHERE company_id = ?')
          .all(id),
        totals: {
          issues: count('issues'),
          openIssues: db
            .prepare(
              "SELECT COUNT(*) AS n FROM issues WHERE company_id = ? AND status <> 'done'",
            )
            .get(id).n,
          timeEntries: count('time_entries'),
          loggedHours:
            db
              .prepare('SELECT COALESCE(SUM(hours), 0) AS h FROM time_entries WHERE company_id = ?')
              .get(id).h ?? 0,
        },
      }
    },
  },

  {
    name: 'zetoo_list_issues',
    description: 'Issues, optionally filtered by board, status, assignee or free text.',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: str('Restrict to one board'),
        status: str('Column id, e.g. todo, in_progress, done'),
        assigneeId: str('Member id'),
        search: str('Case-insensitive match on the title'),
        limit: num('Maximum rows, default 50'),
      },
    },
    handler: (args) => {
      const id = companyId()
      const where = ['i.company_id = ?']
      const params = [id]
      if (args.boardId) {
        where.push('i.board_id = ?')
        params.push(args.boardId)
      }
      if (args.status) {
        where.push('i.status = ?')
        params.push(args.status)
      }
      if (args.assigneeId) {
        where.push('i.assignee_id = ?')
        params.push(args.assigneeId)
      }
      if (args.search) {
        // replace() mirrors `flatten` inside SQLite so a normal space matches
        // a non-breaking one.
        where.push("lower(replace(i.title, char(160), ' ')) LIKE ?")
        params.push(`%${flatten(args.search).toLowerCase()}%`)
      }
      params.push(Math.min(Number(args.limit) || 50, 200))

      return db
        .prepare(
          `SELECT i.id, i.title, i.status, i.priority, i.estimate_hours AS estimateHours,
                  i.logged_hours AS loggedHours, i.due_date AS dueDate,
                  b.name AS board, m.first_name || ' ' || m.last_name AS assignee
           FROM issues i
           LEFT JOIN boards b ON b.id = i.board_id
           LEFT JOIN members m ON m.id = i.assignee_id
           WHERE ${where.join(' AND ')}
           ORDER BY i.position LIMIT ?`,
        )
        .all(params)
    },
  },

  {
    name: 'zetoo_create_issue',
    description: 'Creates an issue on a board.',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: str('Board the issue belongs to'),
        title: str('Issue title'),
        description: str('Longer description'),
        type: str('epic | story | task | bug, default task'),
        status: str('Column id, default the board first column'),
        priority: str('highest | high | medium | low, default medium'),
        assigneeId: str('Member id'),
        epicId: str('Epic the issue belongs to'),
        sprintId: str('Sprint to plan it into; defaults to the active one'),
        estimateHours: num('Estimate in hours'),
        storyPoints: num('Story points'),
        startDate: str('Start date, YYYY-MM-DD'),
        dueDate: str('Due date, YYYY-MM-DD'),
      },
      required: ['boardId', 'title'],
    },
    handler: (args) => {
      const id = companyId()
      const board = db
        .prepare('SELECT id FROM boards WHERE id = ? AND company_id = ?')
        .get(args.boardId, id)
      if (!board) throw new Error(`Board ${args.boardId} gehört nicht zu diesem Arbeitsbereich.`)

      const status =
        args.status ??
        db
          .prepare(
            'SELECT id FROM status_columns WHERE company_id = ? AND board_id = ? ORDER BY position LIMIT 1',
          )
          .get(id, args.boardId)?.id ??
        'todo'

      const sprint = db
        .prepare(
          "SELECT id FROM sprints WHERE company_id = ? AND board_id = ? AND state = 'active' LIMIT 1",
        )
        .get(id, args.boardId)

      const issueId = uid('ZT-')
      db.prepare(
        `INSERT INTO issues (
           id, company_id, board_id, title, description, type, status, priority,
           assignee_id, sprint_id, epic_id, estimate_hours, logged_hours,
           story_points, start_date, due_date, completed_at, labels, position,
           cover_color, checklist
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, '[]', ?, '', '[]')`,
      ).run(
        issueId,
        id,
        args.boardId,
        args.title,
        args.description ?? '',
        args.type ?? 'task',
        status,
        args.priority ?? 'medium',
        args.assigneeId ?? null,
        args.sprintId ?? sprint?.id ?? null,
        args.epicId ?? null,
        Number(args.estimateHours) || 0,
        Number(args.storyPoints) || 0,
        args.startDate ?? null,
        args.dueDate ?? null,
        db.prepare('SELECT COUNT(*) AS n FROM issues WHERE company_id = ?').get(id).n,
      )
      touched()
      return { id: issueId, status, sprintId: sprint?.id ?? null }
    },
  },

  {
    name: 'zetoo_update_issue',
    description: 'Changes fields on an existing issue. Only the fields given are touched.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Issue id'),
        title: str(''),
        description: str(''),
        type: str('epic | story | task | bug'),
        status: str('Column id'),
        priority: str('highest | high | medium | low'),
        assigneeId: str('Member id, or empty string to unassign'),
        epicId: str('Epic id, or empty string to detach'),
        sprintId: str('Sprint id, or empty string for the backlog'),
        estimateHours: num(''),
        loggedHours: num('Hours already spent'),
        storyPoints: num(''),
        coverColor: str('Hex colour shown on the card'),
        labels: str('Comma-separated, or a JSON array'),
        startDate: str('YYYY-MM-DD, or empty string to clear'),
        dueDate: str('YYYY-MM-DD, or empty string to clear'),
      },
      required: ['id'],
    },
    handler: (args) => {
      const id = companyId()
      const columns = {
        title: 'title',
        description: 'description',
        status: 'status',
        priority: 'priority',
        type: 'type',
        assigneeId: 'assignee_id',
        epicId: 'epic_id',
        sprintId: 'sprint_id',
        estimateHours: 'estimate_hours',
        loggedHours: 'logged_hours',
        storyPoints: 'story_points',
        coverColor: 'cover_color',
        labels: 'labels',
        startDate: 'start_date',
        dueDate: 'due_date',
      }
      const nullable = ['assigneeId', 'epicId', 'sprintId', 'startDate', 'dueDate']
      if (args.labels !== undefined) args = { ...args, labels: JSON.stringify(jsonArray(args.labels)) }
      const sets = []
      const params = []
      for (const [key, column] of Object.entries(columns)) {
        if (args[key] === undefined) continue
        sets.push(`${column} = ?`)
        params.push(args[key] === '' && nullable.includes(key) ? null : args[key])
      }
      if (!sets.length) throw new Error('Keine Felder zum Ändern übergeben.')

      params.push(args.id, id)
      const result = db
        .prepare(`UPDATE issues SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`)
        .run(params)
      if (!result.changes) throw new Error(`Vorgang ${args.id} nicht gefunden.`)
      touched()
      return { updated: sets.length }
    },
  },

  {
    name: 'zetoo_list_time_entries',
    description: 'Logged hours, filtered by project, date range or member.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: str('Restrict to one project'),
        from: str('Inclusive start date, YYYY-MM-DD'),
        to: str('Inclusive end date, YYYY-MM-DD'),
        memberId: str('Member id'),
      },
    },
    handler: (args) => {
      const id = companyId()
      const where = ['t.company_id = ?']
      const params = [id]
      if (args.projectId) {
        where.push('t.project_id = ?')
        params.push(args.projectId)
      }
      if (args.from) {
        where.push('t.date >= ?')
        params.push(args.from)
      }
      if (args.to) {
        where.push('t.date <= ?')
        params.push(args.to)
      }
      if (args.memberId) {
        where.push('t.member_id = ?')
        params.push(args.memberId)
      }

      const rows = db
        .prepare(
          `SELECT t.id, t.date, t.category, t.hours, t.description,
                  p.name AS project, m.first_name || ' ' || m.last_name AS member
           FROM time_entries t
           LEFT JOIN projects p ON p.id = t.project_id
           LEFT JOIN members m ON m.id = t.member_id
           WHERE ${where.join(' AND ')}
           ORDER BY t.date`,
        )
        .all(params)

      return {
        entries: rows,
        totalHours: Math.round(rows.reduce((sum, row) => sum + row.hours, 0) * 100) / 100,
      }
    },
  },

  {
    name: 'zetoo_log_time',
    description:
      'Books hours against a project. Durations are rounded to quarter hours, as everywhere else in Zetoo.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: str('Project the hours belong to'),
        date: str('YYYY-MM-DD'),
        hours: num('Duration; rounded to the nearest 0.25'),
        category: str('e.g. PM, Konzeption, Entwicklung'),
        memberId: str('Member id; defaults to the workspace owner'),
        issueId: str('Issue the work belongs to'),
        description: str('What was done — one line of the Leistungsnachweis'),
      },
      required: ['projectId', 'date', 'hours'],
    },
    handler: (args) => {
      const id = companyId()
      const project = db
        .prepare('SELECT id FROM projects WHERE id = ? AND company_id = ?')
        .get(args.projectId, id)
      if (!project) throw new Error(`Projekt ${args.projectId} gehört nicht zu diesem Arbeitsbereich.`)

      const member =
        (args.memberId &&
          db.prepare('SELECT id FROM members WHERE id = ? AND company_id = ?').get(args.memberId, id)) ||
        db
          .prepare("SELECT id FROM members WHERE company_id = ? ORDER BY role = 'owner' DESC LIMIT 1")
          .get(id)

      const hours = Math.max(0.25, Math.round((Number(args.hours) || 0) / 0.25) * 0.25)
      const entryId = uid('t-')
      db.prepare(
        `INSERT INTO time_entries
           (id, company_id, project_id, date, category, hours, member_id, description, issue_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        entryId,
        id,
        args.projectId,
        args.date,
        args.category ?? 'Entwicklung',
        hours,
        member?.id ?? null,
        args.description ?? '',
        args.issueId ?? null,
      )
      touched()
      return { id: entryId, hours }
    },
  },

  {
    name: 'zetoo_record_summary',
    description:
      'The Leistungsnachweis figures for a project and period: rows, hours per category and per person, and the total.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: str('Project to report on'),
        from: str('Inclusive start date, YYYY-MM-DD'),
        to: str('Inclusive end date, YYYY-MM-DD'),
      },
      required: ['projectId', 'from', 'to'],
    },
    handler: (args) => {
      const id = companyId()
      const rows = db
        .prepare(
          `SELECT t.date, t.category, t.hours, t.description,
                  m.first_name || ' ' || m.last_name AS member
           FROM time_entries t
           LEFT JOIN members m ON m.id = t.member_id
           WHERE t.company_id = ? AND t.project_id = ? AND t.date BETWEEN ? AND ?
           ORDER BY t.date`,
        )
        .all(id, args.projectId, args.from, args.to)

      const group = (key) => {
        const map = new Map()
        for (const row of rows) map.set(row[key], (map.get(row[key]) ?? 0) + row.hours)
        return [...map].map(([name, hours]) => ({ name, hours: Math.round(hours * 100) / 100 }))
      }

      return {
        project: db.prepare('SELECT name, client, reference FROM projects WHERE id = ?').get(args.projectId),
        period: { from: args.from, to: args.to },
        positions: rows,
        byCategory: group('category'),
        byMember: group('member'),
        totalHours: Math.round(rows.reduce((sum, row) => sum + row.hours, 0) * 100) / 100,
      }
    },
  },

  {
    name: 'zetoo_leaderboard',
    description:
      'Time-tracking standings: points, level, streak and coverage per person. Points are derived from the entries, never stored, so a corrected entry corrects the score.',
    inputSchema: {
      type: 'object',
      properties: {
        days: num('How far back to score, default 90'),
      },
    },
    handler: (args) => {
      const rows = leaderboard(companyId(), { days: args.days ? Number(args.days) : 90 })
      return {
        scoring: {
          perBookedDay: 10,
          sameDayBonus: 5,
          fullDayBonus: 5,
          perStreakDay: '2, capped at 10 days',
          pointsPerLevel: 250,
        },
        openToday: rows.filter((row) => !row.bookedToday).map((row) => row.name),
        rows,
      }
    },
  },

  {
    name: 'zetoo_create_project',
    description: 'Creates a billing project the hours are logged against.',
    inputSchema: {
      type: 'object',
      properties: {
        name: str('Project name'),
        client: str('Auftraggeber'),
        reference: str('Reference pattern, e.g. RE-{YYYY}-{NR}'),
      },
      required: ['name'],
    },
    handler: (args) => {
      const id = companyId()
      const projectId = uid('p-')
      db.prepare(
        `INSERT INTO projects
           (id, company_id, name, client, reference, contractor, categories,
            template_name, template_data, archived, created_at)
         VALUES (?, ?, ?, ?, ?, ?, '[]', '', '', 0, ?)`,
      ).run(
        projectId,
        id,
        args.name,
        args.client ?? '',
        args.reference ?? 'RE-{YYYY}-{NR}',
        resolveCompany().name,
        new Date().toISOString(),
      )
      touched()
      return { id: projectId }
    },
  },

  {
    name: 'zetoo_create_board',
    description: 'Creates a board for a client engagement, with default columns and a first sprint.',
    inputSchema: {
      type: 'object',
      properties: { name: str('Board name'), client: str('Auftraggeber') },
      required: ['name'],
    },
    handler: (args) => {
      const id = companyId()
      const boardId = uid('b-')
      const now = new Date()
      const iso = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const end = new Date(now)
      end.setDate(end.getDate() + 13)

      db.prepare(
        `INSERT INTO boards (id, company_id, name, client, description, color, project_id, archived, created_at, position)
         VALUES (?, ?, ?, ?, '', '#465fff', NULL, 0, ?, ?)`,
      ).run(
        boardId,
        id,
        args.name,
        args.client ?? '',
        now.toISOString(),
        db.prepare('SELECT COUNT(*) AS n FROM boards WHERE company_id = ?').get(id).n,
      )

      const columns = [
        ['todo', 'To Do', '#98a2b3', null],
        ['in_progress', 'In Progress', '#465fff', 5],
        ['review', 'In Review', '#f79009', 3],
        ['done', 'Done', '#12b76a', null],
      ]
      columns.forEach(([colId, name, color, wip], index) => {
        db.prepare(
          `INSERT INTO status_columns (id, company_id, board_id, name, color, wip_limit, position, collapsed, dot, is_done)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)`,
        ).run(colId, id, boardId, name, color, wip, index, colId === 'done' ? 1 : 0)
      })

      db.prepare(
        `INSERT INTO sprints (id, company_id, board_id, name, goal, state, start_date, end_date, position)
         VALUES (?, ?, ?, 'Sprint 1', '', 'active', ?, ?, 0)`,
      ).run(uid('s-'), id, boardId, iso(now), iso(end))

      touched()
      return { id: boardId }
    },
  },
  /* ---------------- Dashboard ---------------- */

  {
    name: 'zetoo_dashboard',
    description:
      'Everything the dashboard shows in one call: per-board progress, active sprint, workload per member, overdue work and hours booked this month. Use this to answer "how are we doing".',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      const id = companyId()
      const today = isoDate(new Date())
      const monthStart = today.slice(0, 8) + '01'

      const boards = db
        .prepare('SELECT id, name, client, archived FROM boards WHERE company_id = ? ORDER BY position')
        .all(id)

      return {
        company: resolveCompany(),
        boards: boards.map((board) => {
          const issues = db
            .prepare(
              'SELECT status, estimate_hours, logged_hours, due_date FROM issues WHERE company_id = ? AND board_id = ?',
            )
            .all(id, board.id)
          const finished = doneColumns(board.id)
          const done = issues.filter((i) => finished.has(i.status)).length
          return {
            ...board,
            sprint:
              db
                .prepare(
                  "SELECT name, start_date, end_date FROM sprints WHERE company_id = ? AND board_id = ? AND state = 'active'",
                )
                .get(id, board.id) ?? null,
            issues: issues.length,
            done,
            percent: issues.length ? Math.round((done / issues.length) * 100) : 0,
            estimateHours: issues.reduce((sum, i) => sum + i.estimate_hours, 0),
            loggedHours: issues.reduce((sum, i) => sum + i.logged_hours, 0),
            overdue: issues.filter(
              (i) => !finished.has(i.status) && i.due_date && i.due_date < today,
            ).length,
          }
        }),
        workload: db
          .prepare(
            `SELECT m.id, m.first_name || ' ' || m.last_name AS name, m.capacity_hours AS capacity,
                    COALESCE(SUM(CASE WHEN c.is_done IS NOT 1 THEN i.estimate_hours END), 0) AS assigned
             FROM members m
             LEFT JOIN issues i ON i.assignee_id = m.id AND i.company_id = m.company_id
             LEFT JOIN status_columns c ON c.board_id = i.board_id AND c.id = i.status
             WHERE m.company_id = ? GROUP BY m.id ORDER BY assigned DESC`,
          )
          .all(id),
        overdue: db
          .prepare(
            `SELECT i.id, i.title, i.due_date AS dueDate, b.name AS board
             FROM issues i
             LEFT JOIN boards b ON b.id = i.board_id
             LEFT JOIN status_columns c ON c.board_id = i.board_id AND c.id = i.status
             WHERE i.company_id = ? AND c.is_done IS NOT 1
               AND i.due_date IS NOT NULL AND i.due_date < ?
             ORDER BY i.due_date`,
          )
          .all(id, today),
        hoursThisMonth:
          db
            .prepare(
              'SELECT COALESCE(SUM(hours), 0) AS h FROM time_entries WHERE company_id = ? AND date >= ?',
            )
            .get(id, monthStart).h ?? 0,
      }
    },
  },

  /* ---------------- Company and people ---------------- */

  {
    name: 'zetoo_update_company',
    description: 'Changes the company details shown on documents and in settings.',
    inputSchema: {
      type: 'object',
      properties: {
        name: str(''),
        industry: str(''),
        website: str(''),
        addressLine: str(''),
        city: str(''),
        postalCode: str(''),
        country: str(''),
        vatId: str(''),
        timezone: str(''),
        hoursPerDay: num('Working hours per day'),
        size: str('1-10 | 11-50 | 51-200 | 201-1000 | 1000+'),
        plan: str('starter | team | business'),
        logo: str('Image URL or data URL'),
        workDays: str('ISO weekday numbers, e.g. "1,2,3,4,5"'),
      },
    },
    handler: (args) => {
      const id = companyId()
      const mapping = {
        name: 'name',
        industry: 'industry',
        website: 'website',
        addressLine: 'address_line',
        city: 'city',
        postalCode: 'postal_code',
        country: 'country',
        vatId: 'vat_id',
        timezone: 'timezone',
        hoursPerDay: 'hours_per_day',
        size: 'size',
        plan: 'plan',
        logo: 'logo',
        workDays: 'work_days',
      }
      const sets = []
      const params = []
      for (const [key, column] of Object.entries(mapping)) {
        if (args[key] === undefined) continue
        sets.push(`${column} = ?`)
        params.push(
          key === 'workDays' ? JSON.stringify(jsonArray(args[key]).map(Number)) : args[key],
        )
      }
      if (!sets.length) throw new Error('Keine Felder zum Aendern uebergeben.')
      params.push(id)
      db.prepare(`UPDATE company SET ${sets.join(', ')} WHERE id = ?`).run(params)
      touched()
      return { updated: sets.length }
    },
  },

  {
    name: 'zetoo_create_member',
    description:
      'Adds a person to the workspace. The address must not already belong to another workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        firstName: str(''),
        lastName: str(''),
        email: str('Must be unique across all workspaces'),
        jobTitle: str(''),
        role: str('owner | admin | manager | member | viewer, default member'),
        capacityHours: num('Hours available per two-week sprint'),
      },
      required: ['firstName', 'email'],
    },
    handler: (args) => {
      const id = companyId()
      const clash = db
        .prepare('SELECT company_id FROM members WHERE lower(email) = lower(?)')
        .get(args.email)
      if (clash) throw new Error(`${args.email} gehoert bereits zu einem Arbeitsbereich.`)

      const memberId = uid('m-')
      db.prepare(
        `INSERT INTO members (id, company_id, first_name, last_name, email, job_title, department,
           role, status, avatar, accent, phone, location, timezone, bio, skills, capacity_hours,
           started_at, links, position)
         VALUES (?, ?, ?, ?, ?, ?, '', ?, 'active', '', '#465fff', '', '', '', '', '[]', ?, ?, '{}', ?)`,
      ).run(
        memberId,
        id,
        args.firstName,
        args.lastName ?? '',
        args.email,
        args.jobTitle ?? '',
        args.role ?? 'member',
        Number(args.capacityHours) || 0,
        isoDate(new Date()),
        db.prepare('SELECT COUNT(*) AS n FROM members WHERE company_id = ?').get(id).n,
      )
      touched()
      return { id: memberId }
    },
  },

  {
    name: 'zetoo_update_member',
    description: 'Changes a person: name, job title, role, capacity or status.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Member id'),
        firstName: str(''),
        lastName: str(''),
        jobTitle: str(''),
        department: str(''),
        role: str('owner | admin | manager | member | viewer'),
        status: str('active | invited | inactive'),
        capacityHours: num(''),
        email: str('Must stay unique across all workspaces'),
        phone: str(''),
        location: str(''),
        timezone: str(''),
        bio: str(''),
        avatar: str('Image URL'),
        accent: str('Hex colour behind the initials'),
        skills: str('Comma-separated, or a JSON array'),
      },
      required: ['id'],
    },
    handler: (args) => {
      if (args.email) {
        const clash = db
          .prepare('SELECT id FROM members WHERE lower(email) = lower(?) AND id <> ?')
          .get(args.email, args.id)
        if (clash) throw new Error(`${args.email} gehoert bereits zu einem anderen Konto.`)
      }
      const payload = { ...args }
      if (payload.skills !== undefined) payload.skills = JSON.stringify(jsonArray(payload.skills))
      return patch(
        'members',
        args.id,
        {
          firstName: 'first_name',
          lastName: 'last_name',
          jobTitle: 'job_title',
          department: 'department',
          role: 'role',
          status: 'status',
          capacityHours: 'capacity_hours',
          email: 'email',
          phone: 'phone',
          location: 'location',
          timezone: 'timezone',
          bio: 'bio',
          avatar: 'avatar',
          accent: 'accent',
          skills: 'skills',
        },
        payload,
      )
    },
  },

  {
    name: 'zetoo_delete_member',
    description: 'Removes a person. Their issues stay but become unassigned.',
    inputSchema: { type: 'object', properties: { id: str('Member id') }, required: ['id'] },
    handler: (args) => remove('members', args.id),
  },

  /* ---------------- Boards, columns, sprints, epics ---------------- */

  {
    name: 'zetoo_update_board',
    description: 'Renames a board, changes its client, colour, linked project or archived state.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Board id'),
        name: str(''),
        client: str(''),
        description: str(''),
        color: str('Hex colour'),
        projectId: str('Billing project id, empty string to unlink'),
        archived: { type: 'boolean', description: 'Archive or reactivate' },
      },
      required: ['id'],
    },
    handler: (args) => {
      const payload = { ...args }
      if (payload.archived !== undefined) payload.archived = bool01(payload.archived)
      return patch(
        'boards',
        args.id,
        {
          name: 'name',
          client: 'client',
          description: 'description',
          color: 'color',
          projectId: 'project_id',
          archived: 'archived',
        },
        payload,
        ['projectId'],
      )
    },
  },

  {
    name: 'zetoo_delete_board',
    description: 'Deletes a board with its issues, sprints, epics and columns.',
    inputSchema: { type: 'object', properties: { id: str('Board id') }, required: ['id'] },
    handler: (args) => {
      const id = companyId()
      owned('boards', args.id)
      for (const table of ['issues', 'sprints', 'epics', 'status_columns']) {
        db.prepare(`DELETE FROM ${table} WHERE company_id = ? AND board_id = ?`).run(id, args.id)
      }
      db.prepare('DELETE FROM boards WHERE id = ? AND company_id = ?').run(args.id, id)
      touched()
      return { deleted: args.id }
    },
  },

  {
    name: 'zetoo_list_columns',
    description: 'The workflow columns of a board, in order.',
    inputSchema: { type: 'object', properties: { boardId: str('Board id') }, required: ['boardId'] },
    handler: (args) =>
      db
        .prepare(
          'SELECT id, name, color, wip_limit AS wipLimit, position FROM status_columns WHERE company_id = ? AND board_id = ? ORDER BY position',
        )
        .all(companyId(), args.boardId),
  },

  {
    name: 'zetoo_create_column',
    description: 'Adds a workflow column to a board.',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: str('Board id'),
        name: str('Column name'),
        color: str('Hex colour'),
        wipLimit: num('Cards allowed before the column warns'),
        isDone: { type: 'boolean', description: 'Issues here count as finished' },
      },
      required: ['boardId', 'name'],
    },
    handler: (args) => {
      const id = companyId()
      owned('boards', args.boardId)
      const base =
        args.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') || 'column'
      const taken = db
        .prepare('SELECT id FROM status_columns WHERE company_id = ? AND board_id = ?')
        .all(id, args.boardId)
        .map((r) => r.id)
      let columnId = base
      let suffix = 2
      while (taken.includes(columnId)) columnId = `${base}_${suffix++}`

      db.prepare(
        `INSERT INTO status_columns (id, company_id, board_id, name, color, wip_limit, position, collapsed, dot, is_done)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)`,
      ).run(
        columnId,
        id,
        args.boardId,
        args.name,
        args.color ?? '#98a2b3',
        args.wipLimit === undefined ? null : Number(args.wipLimit),
        taken.length,
        args.isDone ? 1 : 0,
      )
      touched()
      return { id: columnId }
    },
  },

  {
    name: 'zetoo_update_column',
    description: 'Renames a column, recolours it, sets its WIP limit or moves it.',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: str('Board id'),
        id: str('Column id'),
        name: str(''),
        color: str(''),
        wipLimit: num('Use -1 to remove the limit'),
        position: num('Zero-based order'),
      },
      required: ['boardId', 'id'],
    },
    handler: (args) => {
      const id = companyId()
      const sets = []
      const params = []
      if (args.name !== undefined) {
        sets.push('name = ?')
        params.push(args.name)
      }
      if (args.color !== undefined) {
        sets.push('color = ?')
        params.push(args.color)
      }
      if (args.wipLimit !== undefined) {
        sets.push('wip_limit = ?')
        params.push(Number(args.wipLimit) < 0 ? null : Number(args.wipLimit))
      }
      if (args.position !== undefined) {
        sets.push('position = ?')
        params.push(Number(args.position))
      }
      if (!sets.length) throw new Error('Keine Felder zum Aendern uebergeben.')

      params.push(args.id, args.boardId, id)
      const result = db
        .prepare(
          `UPDATE status_columns SET ${sets.join(', ')} WHERE id = ? AND board_id = ? AND company_id = ?`,
        )
        .run(params)
      if (!result.changes) throw new Error(`Spalte ${args.id} nicht gefunden.`)
      touched()
      return { updated: sets.length }
    },
  },

  {
    name: 'zetoo_delete_column',
    description: 'Removes a column and moves its issues to another one.',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: str('Board id'),
        id: str('Column to remove'),
        moveTo: str('Column that takes the issues; defaults to the first remaining one'),
      },
      required: ['boardId', 'id'],
    },
    handler: (args) => {
      const id = companyId()
      const rest = db
        .prepare(
          'SELECT id FROM status_columns WHERE company_id = ? AND board_id = ? AND id <> ? ORDER BY position',
        )
        .all(id, args.boardId, args.id)
      if (!rest.length) throw new Error('Die letzte Spalte eines Boards laesst sich nicht loeschen.')

      const target = args.moveTo ?? rest[0].id
      db.prepare('UPDATE issues SET status = ? WHERE company_id = ? AND board_id = ? AND status = ?').run(
        target,
        id,
        args.boardId,
        args.id,
      )
      db.prepare('DELETE FROM status_columns WHERE id = ? AND board_id = ? AND company_id = ?').run(
        args.id,
        args.boardId,
        id,
      )
      touched()
      return { deleted: args.id, movedTo: target }
    },
  },

  {
    name: 'zetoo_list_sprints',
    description: 'Sprints, optionally for one board.',
    inputSchema: { type: 'object', properties: { boardId: str('Board id') } },
    handler: (args) => {
      const id = companyId()
      const select =
        'SELECT id, board_id AS boardId, name, goal, state, start_date AS startDate, end_date AS endDate FROM sprints WHERE company_id = ?'
      return args.boardId
        ? db.prepare(`${select} AND board_id = ? ORDER BY position`).all(id, args.boardId)
        : db.prepare(`${select} ORDER BY position`).all(id)
    },
  },

  {
    name: 'zetoo_create_sprint',
    description: 'Opens a sprint on a board. Defaults to two weeks from today.',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: str('Board id'),
        name: str('Sprint name'),
        goal: str('Sprint goal'),
        startDate: str('YYYY-MM-DD'),
        endDate: str('YYYY-MM-DD'),
        state: str('planned | active | completed, default planned'),
      },
      required: ['boardId', 'name'],
    },
    handler: (args) => {
      const id = companyId()
      owned('boards', args.boardId)
      const start = args.startDate ?? isoDate(new Date())
      let end = args.endDate
      if (!end) {
        const d = new Date(`${start}T00:00:00`)
        d.setDate(d.getDate() + 13)
        end = isoDate(d)
      }

      if ((args.state ?? 'planned') === 'active') {
        // A board runs one active sprint at a time.
        db.prepare(
          "UPDATE sprints SET state = 'completed' WHERE company_id = ? AND board_id = ? AND state = 'active'",
        ).run(id, args.boardId)
      }

      const sprintId = uid('s-')
      db.prepare(
        `INSERT INTO sprints (id, company_id, board_id, name, goal, state, start_date, end_date, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        sprintId,
        id,
        args.boardId,
        args.name,
        args.goal ?? '',
        args.state ?? 'planned',
        start,
        end,
        db
          .prepare('SELECT COUNT(*) AS n FROM sprints WHERE company_id = ? AND board_id = ?')
          .get(id, args.boardId).n,
      )
      touched()
      return { id: sprintId, startDate: start, endDate: end }
    },
  },

  {
    name: 'zetoo_update_sprint',
    description: 'Renames a sprint, changes its goal, dates or state.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Sprint id'),
        name: str(''),
        goal: str(''),
        state: str('planned | active | completed'),
        startDate: str('YYYY-MM-DD'),
        endDate: str('YYYY-MM-DD'),
      },
      required: ['id'],
    },
    handler: (args) => {
      if (args.state === 'active') {
        const sprint = owned('sprints', args.id)
        db.prepare(
          "UPDATE sprints SET state = 'completed' WHERE company_id = ? AND board_id = ? AND state = 'active' AND id <> ?",
        ).run(companyId(), sprint.board_id, args.id)
      }
      return patch(
        'sprints',
        args.id,
        { name: 'name', goal: 'goal', state: 'state', startDate: 'start_date', endDate: 'end_date' },
        args,
      )
    },
  },

  {
    name: 'zetoo_create_epic',
    description: 'Adds an epic used to group issues on the timeline.',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: str('Board id'),
        name: str('Epic name'),
        color: str('Tailwind class, e.g. bg-brand-500'),
      },
      required: ['boardId', 'name'],
    },
    handler: (args) => {
      const id = companyId()
      owned('boards', args.boardId)
      const epicId = uid('e-')
      db.prepare(
        'INSERT INTO epics (id, company_id, board_id, name, color, position) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(
        epicId,
        id,
        args.boardId,
        args.name,
        args.color ?? 'bg-brand-500',
        db.prepare('SELECT COUNT(*) AS n FROM epics WHERE company_id = ?').get(id).n,
      )
      touched()
      return { id: epicId }
    },
  },

  /* ---------------- Issue actions ---------------- */

  {
    name: 'zetoo_move_issue',
    description: 'Moves an issue to another column, sprint or board.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Issue id'),
        status: str('Target column id'),
        sprintId: str('Target sprint id, empty string for the backlog'),
        boardId: str('Move to another board'),
      },
      required: ['id'],
    },
    handler: (args) => {
      const result = patch(
        'issues',
        args.id,
        { status: 'status', sprintId: 'sprint_id', boardId: 'board_id' },
        args,
        ['sprintId'],
      )
      // Completion is what the burndown reads, so keep it in step with the column.
      if (args.status !== undefined) {
        db.prepare(
          `UPDATE issues SET completed_at = CASE
             WHEN EXISTS (
               SELECT 1 FROM status_columns c
               WHERE c.board_id = issues.board_id AND c.id = issues.status AND c.is_done = 1
             ) THEN date('now') ELSE NULL END
           WHERE id = ? AND company_id = ?`,
        ).run(args.id, companyId())
      }
      return result
    },
  },

  {
    name: 'zetoo_delete_issue',
    description: 'Deletes an issue.',
    inputSchema: { type: 'object', properties: { id: str('Issue id') }, required: ['id'] },
    handler: (args) => remove('issues', args.id),
  },

  /* ---------------- Projects and time ---------------- */

  {
    name: 'zetoo_update_project',
    description: 'Changes a billing project: name, client, reference pattern or archived state.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Project id'),
        name: str(''),
        client: str(''),
        reference: str('e.g. RE-{YYYY}-{NR}'),
        contractor: str(''),
        categories: str('Service categories, comma-separated or a JSON array'),
        archived: { type: 'boolean', description: '' },
      },
      required: ['id'],
    },
    handler: (args) => {
      const payload = { ...args }
      if (payload.archived !== undefined) payload.archived = bool01(payload.archived)
      if (payload.categories !== undefined) {
        payload.categories = JSON.stringify(jsonArray(payload.categories))
      }
      return patch(
        'projects',
        args.id,
        {
          name: 'name',
          client: 'client',
          reference: 'reference',
          contractor: 'contractor',
          categories: 'categories',
          archived: 'archived',
        },
        payload,
      )
    },
  },

  {
    name: 'zetoo_delete_project',
    description: 'Deletes a project together with its logged hours.',
    inputSchema: { type: 'object', properties: { id: str('Project id') }, required: ['id'] },
    handler: (args) => {
      owned('projects', args.id)
      db.prepare('DELETE FROM time_entries WHERE company_id = ? AND project_id = ?').run(
        companyId(),
        args.id,
      )
      return remove('projects', args.id)
    },
  },

  {
    name: 'zetoo_update_time_entry',
    description: 'Corrects a booked entry. Hours are rounded to quarter hours.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Entry id'),
        date: str('YYYY-MM-DD'),
        category: str(''),
        hours: num(''),
        memberId: str('Member id'),
        issueId: str('Issue id, or empty string to detach'),
        description: str(''),
      },
      required: ['id'],
    },
    handler: (args) => {
      const payload = { ...args }
      if (payload.hours !== undefined) {
        payload.hours = Math.max(0.25, Math.round((Number(payload.hours) || 0) / 0.25) * 0.25)
      }
      return patch(
        'time_entries',
        args.id,
        {
          date: 'date',
          category: 'category',
          hours: 'hours',
          memberId: 'member_id',
          issueId: 'issue_id',
          description: 'description',
        },
        payload,
        ['issueId'],
      )
    },
  },

  {
    name: 'zetoo_delete_time_entry',
    description: 'Removes a booked entry.',
    inputSchema: { type: 'object', properties: { id: str('Entry id') }, required: ['id'] },
    handler: (args) => remove('time_entries', args.id),
  },

  /* ---------------- Reading one thing in full ---------------- */

  {
    name: 'zetoo_get_issue',
    description:
      'Everything about one issue: description, labels, checklist, epic, sprint and the hours booked against it. Accepts the Zetoo id or a migrated key such as SCRUM-2.',
    inputSchema: {
      type: 'object',
      properties: { id: str('Issue id, or the external key it was imported under') },
      required: ['id'],
    },
    handler: (args) => {
      const cid = companyId()
      const row =
        db.prepare('SELECT * FROM issues WHERE company_id = ? AND id = ?').get(cid, args.id) ??
        db.prepare('SELECT * FROM issues WHERE company_id = ? AND external_key = ?').get(cid, args.id)
      if (!row) throw new Error(`Vorgang ${args.id} nicht gefunden.`)

      const name = (table, id) =>
        id ? (db.prepare(`SELECT name FROM ${table} WHERE id = ?`).get(id)?.name ?? null) : null

      return {
        id: row.id,
        externalKey: row.external_key,
        title: row.title,
        description: row.description,
        type: row.type,
        status: row.status,
        statusName: db
          .prepare('SELECT name FROM status_columns WHERE board_id = ? AND id = ?')
          .get(row.board_id, row.status)?.name ?? row.status,
        priority: row.priority,
        board: name('boards', row.board_id),
        boardId: row.board_id,
        sprint: name('sprints', row.sprint_id),
        sprintId: row.sprint_id,
        epic: name('epics', row.epic_id),
        epicId: row.epic_id,
        assignee: row.assignee_id
          ? db
              .prepare("SELECT first_name || ' ' || last_name AS n FROM members WHERE id = ?")
              .get(row.assignee_id)?.n
          : null,
        assigneeId: row.assignee_id,
        estimateHours: row.estimate_hours,
        loggedHours: row.logged_hours,
        storyPoints: row.story_points,
        startDate: row.start_date,
        dueDate: row.due_date,
        completedAt: row.completed_at,
        labels: jsonArray(row.labels),
        checklist: jsonArray(row.checklist),
        timeEntries: db
          .prepare('SELECT id, date, category, hours, description FROM time_entries WHERE issue_id = ? ORDER BY date')
          .all(row.id),
      }
    },
  },

  /* ---------------- Listing ---------------- */

  {
    name: 'zetoo_list_boards',
    description: 'All boards with their client, colour, linked billing project and counts.',
    inputSchema: {
      type: 'object',
      properties: { includeArchived: { type: 'boolean', description: 'Default false' } },
    },
    handler: (args) => {
      const cid = companyId()
      return db
        .prepare(
          `SELECT b.id, b.name, b.client, b.description, b.color, b.archived,
                  b.project_id AS projectId, p.name AS project,
                  (SELECT COUNT(*) FROM issues i WHERE i.board_id = b.id) AS issues
           FROM boards b LEFT JOIN projects p ON p.id = b.project_id
           WHERE b.company_id = ? ${args.includeArchived ? '' : 'AND b.archived = 0'}
           ORDER BY b.position`,
        )
        .all(cid)
        .map((r) => ({ ...r, archived: r.archived === 1, active: r.id === getActiveBoardId() }))
    },
  },

  {
    name: 'zetoo_list_members',
    description: 'Everyone in the workspace, with role, capacity and current assigned hours.',
    inputSchema: { type: 'object', properties: {} },
    handler: () =>
      db
        .prepare(
          `SELECT m.id, m.first_name AS firstName, m.last_name AS lastName, m.email, m.job_title AS jobTitle,
                  m.department, m.role, m.status, m.capacity_hours AS capacityHours, m.timezone, m.location,
                  COALESCE(SUM(CASE WHEN c.is_done IS NOT 1 THEN i.estimate_hours END), 0) AS assignedHours
           FROM members m
           LEFT JOIN issues i ON i.assignee_id = m.id
           LEFT JOIN status_columns c ON c.board_id = i.board_id AND c.id = i.status
           WHERE m.company_id = ? GROUP BY m.id ORDER BY m.position`,
        )
        .all(companyId()),
  },

  {
    name: 'zetoo_list_projects',
    description: 'Billing projects with their reference pattern, categories and booked hours.',
    inputSchema: {
      type: 'object',
      properties: { includeArchived: { type: 'boolean', description: 'Default false' } },
    },
    handler: (args) => {
      const cid = companyId()
      return db
        .prepare(
          `SELECT p.id, p.name, p.client, p.reference, p.contractor, p.categories, p.archived,
                  p.template_name AS templateName,
                  (SELECT COUNT(*) FROM time_entries t WHERE t.project_id = p.id) AS entries,
                  (SELECT COALESCE(SUM(hours), 0) FROM time_entries t WHERE t.project_id = p.id) AS hours
           FROM projects p
           WHERE p.company_id = ? ${args.includeArchived ? '' : 'AND p.archived = 0'}
           ORDER BY p.created_at`,
        )
        .all(cid)
        .map((r) => ({ ...r, archived: r.archived === 1, categories: jsonArray(r.categories) }))
    },
  },

  {
    name: 'zetoo_list_epics',
    description: 'Epics with how much work hangs under each.',
    inputSchema: { type: 'object', properties: { boardId: str('Restrict to one board') } },
    handler: (args) => {
      const cid = companyId()
      const where = args.boardId ? 'AND e.board_id = ?' : ''
      const params = args.boardId ? [cid, args.boardId] : [cid]
      return db
        .prepare(
          `SELECT e.id, e.name, e.color, e.board_id AS boardId,
                  COUNT(i.id) AS issues,
                  COALESCE(SUM(i.estimate_hours), 0) AS estimateHours,
                  COALESCE(SUM(i.story_points), 0) AS storyPoints
           FROM epics e LEFT JOIN issues i ON i.epic_id = e.id
           WHERE e.company_id = ? ${where} GROUP BY e.id ORDER BY e.position`,
        )
        .all(params)
    },
  },

  /* ---------------- Epics and sprints, the rest of the way ---------------- */

  {
    name: 'zetoo_update_epic',
    description: 'Renames an epic or recolours it.',
    inputSchema: {
      type: 'object',
      properties: {
        id: str('Epic id'),
        name: str(''),
        color: str('Tailwind class, e.g. bg-brand-500'),
      },
      required: ['id'],
    },
    handler: (args) => patch('epics', args.id, { name: 'name', color: 'color' }, args),
  },

  {
    name: 'zetoo_delete_epic',
    description: 'Removes an epic. Its issues stay and simply lose the grouping.',
    inputSchema: { type: 'object', properties: { id: str('Epic id') }, required: ['id'] },
    handler: (args) => {
      owned('epics', args.id)
      db.prepare('UPDATE issues SET epic_id = NULL WHERE company_id = ? AND epic_id = ?').run(
        companyId(),
        args.id,
      )
      return remove('epics', args.id)
    },
  },

  {
    name: 'zetoo_delete_sprint',
    description: 'Removes a sprint. Its issues fall back to the backlog rather than disappearing.',
    inputSchema: { type: 'object', properties: { id: str('Sprint id') }, required: ['id'] },
    handler: (args) => {
      owned('sprints', args.id)
      db.prepare('UPDATE issues SET sprint_id = NULL WHERE company_id = ? AND sprint_id = ?').run(
        companyId(),
        args.id,
      )
      return remove('sprints', args.id)
    },
  },

  /* ---------------- Checklists ---------------- */

  {
    name: 'zetoo_checklist',
    description:
      "Edits an issue's checklist — the sub-steps a migrated Jira sub-task becomes. Use `action` to add, tick, untick, remove or clear.",
    inputSchema: {
      type: 'object',
      properties: {
        issueId: str('Issue id'),
        action: str('add | toggle | done | undone | remove | clear'),
        text: str('Item text, for add'),
        itemId: str('Item id, for toggle/done/undone/remove'),
      },
      required: ['issueId', 'action'],
    },
    handler: (args) => {
      const cid = companyId()
      const row = db
        .prepare('SELECT id, checklist FROM issues WHERE company_id = ? AND id = ?')
        .get(cid, args.issueId)
      if (!row) throw new Error(`Vorgang ${args.issueId} nicht gefunden.`)

      let items = jsonArray(row.checklist)
      const find = () => items.find((item) => item.id === args.itemId)

      switch (args.action) {
        case 'add': {
          if (!args.text) throw new Error('`text` fehlt.')
          items.push({ id: uid('c-'), text: args.text, done: false })
          break
        }
        case 'toggle': {
          const item = find()
          if (!item) throw new Error(`Punkt ${args.itemId} nicht gefunden.`)
          item.done = !item.done
          break
        }
        case 'done':
        case 'undone': {
          const item = find()
          if (!item) throw new Error(`Punkt ${args.itemId} nicht gefunden.`)
          item.done = args.action === 'done'
          break
        }
        case 'remove': {
          items = items.filter((item) => item.id !== args.itemId)
          break
        }
        case 'clear': {
          items = []
          break
        }
        default:
          throw new Error(`Unbekannte Aktion: ${args.action}`)
      }

      db.prepare('UPDATE issues SET checklist = ? WHERE id = ? AND company_id = ?').run(
        JSON.stringify(items),
        row.id,
        cid,
      )
      touched()
      return { checklist: items }
    },
  },

  /* ---------------- Which board the app shows ---------------- */

  {
    name: 'zetoo_set_active_board',
    description:
      'Chooses the board the web app opens on. Without this the app asks which board to show once more than one exists.',
    inputSchema: { type: 'object', properties: { boardId: str('Board id') }, required: ['boardId'] },
    handler: (args) => {
      const cid = companyId()
      owned('boards', args.boardId)
      db.prepare(
        "INSERT INTO app_state (company_id, key, value) VALUES (?, 'activeBoardId', ?) ON CONFLICT(company_id, key) DO UPDATE SET value = excluded.value",
      ).run(cid, args.boardId)
      touched()
      return { activeBoardId: args.boardId }
    },
  },

]

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */

const server = new Server(
  { name: 'zetoo', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = TOOLS.find((item) => item.name === request.params.name)
  if (!tool) throw new Error(`Unbekanntes Werkzeug: ${request.params.name}`)

  try {
    const result = tool.handler(request.params.arguments ?? {})
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  } catch (error) {
    // Reported as tool output rather than a protocol error, so the model can
    // read the reason and correct itself.
    return {
      isError: true,
      content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
    }
  }
})

await server.connect(new StdioServerTransport())
