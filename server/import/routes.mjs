import { db } from '../db.mjs'
import { createClient } from './jira/client.mjs'
import { mapUser } from './jira/map.mjs'
import { createRun, readRun, runImport } from './jira/run.mjs'

/**
 * Migration endpoints.
 *
 * The wizard is deliberately several steps: Jira Cloud usually withholds email
 * addresses, so accounts cannot be matched to members automatically and a
 * person has to confirm the mapping before anything is written.
 *
 * Credentials are never stored. They travel with each request and live only
 * for the duration of a call, or of a run in memory.
 */

/** Runs in flight, so progress can be polled without holding the request. */
const active = new Map()

const credentialsFrom = (body) => {
  const { baseUrl, email, token } = body ?? {}
  if (!baseUrl || !email || !token) {
    throw new Error('Jira-URL, E-Mail und API-Token werden benötigt.')
  }
  return { baseUrl, email, token }
}

export const registerImportRoutes = (app, withCompany) => {
  /** Verifies the credentials and lists what could be imported. */
  app.post('/api/import/jira/connect', async (req, res) => {
    const companyId = withCompany(req, res)
    if (!companyId) return
    try {
      const client = createClient(credentialsFrom(req.body))
      const me = await client.me()
      const projects = await client.projects()
      res.json({
        connectedAs: mapUser(me),
        projects: projects.map((project) => ({
          id: project.id,
          key: project.key,
          name: project.name,
        })),
      })
    } catch (error) {
      res.status(400).json({ error: error.message })
    }
  })

  /**
   * The people involved in the chosen projects, with a suggested match.
   *
   * Matching is by email where Jira reveals one; everyone else has to be
   * mapped by hand, which is exactly what this endpoint is for.
   */
  app.post('/api/import/jira/users', async (req, res) => {
    const companyId = withCompany(req, res)
    if (!companyId) return
    try {
      const client = createClient(credentialsFrom(req.body))
      const keys = req.body?.projectKeys ?? []
      if (!keys.length) throw new Error('Bitte mindestens ein Projekt wählen.')

      const members = db
        .prepare('SELECT id, first_name, last_name, email FROM members WHERE company_id = ?')
        .all(companyId)

      const seen = new Map()
      for (const key of keys) {
        // One page is enough to see who appears on a project; a full scan
        // would cost minutes for no extra benefit at this stage.
        for await (const page of client.searchIssues(`project = "${key}"`, {
          fields: 'assignee,reporter',
          pageSize: 100,
        })) {
          for (const issue of page.issues) {
            for (const person of [issue.fields?.assignee, issue.fields?.reporter]) {
              if (!person) continue
              const user = mapUser(person)
              if (user.externalId) seen.set(user.externalId, user)
            }
          }
          break
        }
      }

      res.json({
        members,
        users: [...seen.values()].map((user) => ({
          ...user,
          suggestedMemberId:
            (user.email &&
              members.find((m) => m.email.toLowerCase() === user.email.toLowerCase())?.id) ||
            null,
        })),
      })
    } catch (error) {
      res.status(400).json({ error: error.message })
    }
  })

  /** Starts the import and answers immediately with a run id to poll. */
  app.post('/api/import/jira/start', (req, res) => {
    const companyId = withCompany(req, res)
    if (!companyId) return
    try {
      const credentials = credentialsFrom(req.body)
      const projectKeys = req.body?.projectKeys ?? []
      if (!projectKeys.length) throw new Error('Bitte mindestens ein Projekt wählen.')

      const runId = createRun(companyId)
      const promise = runImport({
        runId,
        companyId,
        credentials,
        projectKeys,
        accountToMember: req.body?.accountToMember ?? {},
        categoryByType: req.body?.categoryByType ?? {},
        withWorklogs: req.body?.withWorklogs !== false,
      })
        .catch(() => {
          // The failure is recorded on the run row; nothing to do here.
        })
        .finally(() => active.delete(runId))

      active.set(runId, promise)
      res.json({ runId })
    } catch (error) {
      res.status(400).json({ error: error.message })
    }
  })

  app.get('/api/import/:runId', (req, res) => {
    const companyId = withCompany(req, res)
    if (!companyId) return
    const run = readRun(req.params.runId)
    if (!run || run.company_id !== companyId) {
      res.status(404).json({ error: 'Unbekannter Import.' })
      return
    }
    res.json({
      id: run.id,
      status: run.status,
      step: run.step,
      total: run.total,
      done: run.done,
      skipped: run.skipped,
      error: run.error,
    })
  })

  /** Past runs, newest first — the migration history of a workspace. */
  app.get('/api/import', (req, res) => {
    const companyId = withCompany(req, res)
    if (!companyId) return
    res.json(
      db
        .prepare(
          'SELECT id, source, status, step, total, done, error, started_at, finished_at FROM imports WHERE company_id = ? ORDER BY started_at DESC LIMIT 20',
        )
        .all(companyId),
    )
  })
}
