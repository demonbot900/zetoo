import express from 'express'
import cookieParser from 'cookie-parser'
import {
  DB_PATH,
  readBoard,
  readRecords,
  readWorkspace,
  stats,
  writeBoard,
  getGeneration,
  resetAll,
  writeRecords,
  writeWorkspace,
} from './db.mjs'
import {
  companyForRequest,
  isConfigured as isGoogleConfigured,
  pruneSessions,
  registerAuthRoutes,
} from './auth.mjs'
import { registerImportRoutes } from './import/routes.mjs'

/**
 * Zetoo API.
 *
 * Three documents, one per client store. GET returns what the database holds,
 * PUT replaces it. Vite proxies /api here in development, so the browser talks
 * to the same origin and no CORS handling is needed.
 */

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

// Word templates are stored as data URLs, so a workspace payload can be a few
// megabytes. The default 100kb limit would reject those.
app.use(express.json({ limit: '25mb' }))
app.use(cookieParser())

registerAuthRoutes(app)

/**
 * Resolves the tenant from the session, or answers 401.
 *
 * Everything below is scoped to the workspace of whoever is signed in — the
 * request body has no say in it.
 */
const withCompany = (req, res) => {
  const companyId = companyForRequest(req)
  if (!companyId) {
    res.status(401).json({ error: 'Kein Arbeitsbereich für diese Sitzung.', needsWorkspace: true })
    return null
  }
  return companyId
}

const resource = (path, read, write) => {
  app.get(path, (req, res) => {
    const companyId = withCompany(req, res)
    if (!companyId) return
    res.json({ ...read(companyId), generation: getGeneration(companyId) })
  })

  app.put(path, (req, res) => {
    const companyId = withCompany(req, res)
    if (!companyId) return
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'Erwartet wird ein JSON-Objekt.' })
      return
    }

    const current = getGeneration(companyId)
    // A client that loaded before a reset must not push its stale copy back.
    // First-time clients send nothing and are simply adopted.
    if (req.body.generation && req.body.generation !== current) {
      res.status(409).json({
        error: 'Der Arbeitsbereich wurde zurückgesetzt. Diese Ansicht ist veraltet.',
        generation: current,
        ...read(companyId),
      })
      return
    }

    write(companyId, req.body)
    res.json({ ...read(companyId), generation: current })
  })
}

resource('/api/workspace', readWorkspace, writeWorkspace)
resource('/api/board', readBoard, writeBoard)
resource('/api/records', readRecords, writeRecords)

/**
 * Empties the whole workspace. Reached from the reset action in the company
 * settings, which clears the browser's mirror in the same step.
 */
app.post('/api/reset', (req, res) => {
  const companyId = withCompany(req, res)
  if (!companyId) return
  const generation = resetAll(companyId)
  res.json({ ok: true, generation, rows: stats(companyId) })
})

registerImportRoutes(app, withCompany)

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: DB_PATH,
    googleSignIn: isGoogleConfigured() ? 'configured' : 'not configured',
    // Workspace-wide counts; a signed-in request sees only its own tenant.
    rows: stats(companyForRequest(req)),
  })
})

// Any thrown error from better-sqlite3 lands here rather than killing the
// process, and the client gets a message it can show.
app.use((error, _req, res, _next) => {
  console.error('[api]', error)
  res.status(500).json({ error: error.message ?? 'Unbekannter Serverfehler' })
})

app.listen(PORT, () => {
  const pruned = pruneSessions()
  console.log(`Zetoo API auf http://localhost:${PORT}`)
  console.log(`Datenbank: ${DB_PATH}`)
  if (pruned) console.log(`${pruned} abgelaufene Sitzung(en) entfernt`)
  console.log(
    isGoogleConfigured()
      ? 'Google-Anmeldung: aktiv'
      : 'Google-Anmeldung: inaktiv (GOOGLE_CLIENT_ID nicht gesetzt)',
  )
})
