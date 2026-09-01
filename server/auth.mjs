import { randomBytes } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { db } from './db.mjs'

/**
 * Google sign-in.
 *
 * Uses Google Identity Services' ID-token flow: the browser gets a signed JWT
 * from Google, posts it here, and this module verifies the signature against
 * Google's public keys. That needs only a client ID — no client secret, no
 * redirect round-trip to maintain.
 *
 * Configure with GOOGLE_CLIENT_ID (see .env.example). Without it every auth
 * route reports that sign-in is unconfigured rather than failing obscurely,
 * and the frontend hides the button.
 */

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''

export const isConfigured = () => GOOGLE_CLIENT_ID.length > 0

const client = isConfigured() ? new OAuth2Client(GOOGLE_CLIENT_ID) : null

const SESSION_COOKIE = 'zetoo_session'
const SESSION_DAYS = 30

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ */

const createSession = (email) => {
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000)
  db.prepare(
    'INSERT INTO sessions (token, email, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(token, email, now.toISOString(), expires.toISOString())
  return { token, expires }
}

const readSession = (token) => {
  if (!token) return null
  const row = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token)
  if (!row) return null
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }
  return row
}

const dropSession = (token) => {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

/** Removes sessions that have already lapsed. Cheap enough to run on boot. */
export const pruneSessions = () =>
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString()).changes

/* ------------------------------------------------------------------ *
 * Members
 * ------------------------------------------------------------------ */

export const memberByEmail = (email) =>
  db.prepare('SELECT * FROM members WHERE lower(email) = lower(?)').get(email)

/**
 * The tenant a request belongs to, derived from the session cookie only.
 *
 * Never from anything the client sends: that is exactly how one Google account
 * ended up looking at another company's workspace.
 */
export const companyForRequest = (req) => {
  const session = readSession(req.cookies?.[SESSION_COOKIE])
  if (!session) return null
  const member = memberByEmail(session.email)
  return member?.company_id || null
}

export const sessionEmail = (req) => readSession(req.cookies?.[SESSION_COOKIE])?.email ?? null

const accentFor = (seed) => {
  const palette = ['#3641F5', '#12B76A', '#F79009', '#F04438', '#7A5AF8', '#0BA5EC']
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return palette[hash % palette.length]
}

/**
 * Looks up the member behind a Google account.
 *
 * Deliberately does *not* create one. Membership is what decides which company
 * an account sees, so an unknown address must land in the registration wizard
 * and get its own workspace — never join whichever company happens to exist.
 */
const linkMember = (profile) => {
  const existing = memberByEmail(profile.email)
  if (!existing) return null
  // Keep the photo fresh, but never overwrite a name the workspace curated.
  if (profile.picture && !existing.avatar) {
    db.prepare('UPDATE members SET avatar = ? WHERE id = ?').run(profile.picture, existing.id)
  }
  return memberByEmail(profile.email)
}

/**
 * Creates a company owned by `email` and returns the new member row.
 * Used by the registration wizard; refuses if the address already belongs
 * somewhere, since one address maps to exactly one workspace.
 */
export const createCompanyForEmail = ({ email, name, picture, companyName }) => {
  const existing = memberByEmail(email)
  if (existing) return existing

  const now = new Date().toISOString()
  const companyId = `c-${randomBytes(5).toString('hex')}`
  db.prepare('INSERT INTO company (id, name, slug, created_at) VALUES (?, ?, ?, ?)').run(
    companyId,
    companyName || 'Neuer Arbeitsbereich',
    '',
    now,
  )

  const [firstName = '', ...rest] = (name ?? email.split('@')[0]).split(' ')
  db.prepare(
    `INSERT INTO members (
       id, company_id, first_name, last_name, email, job_title, department, role,
       status, avatar, accent, phone, location, timezone, bio, skills,
       capacity_hours, started_at, links, position
     ) VALUES (?, ?, ?, ?, ?, '', '', 'owner', 'active', ?, ?, '', '', '', '', '[]', 0, ?, '{}', 0)`,
  ).run(
    `m-${randomBytes(5).toString('hex')}`,
    companyId,
    firstName,
    rest.join(' '),
    email,
    picture ?? '',
    accentFor(email),
    now.slice(0, 10),
  )

  return memberByEmail(email)
}

const publicMember = (row) =>
  row && {
    id: row.id,
    companyId: row.company_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    avatar: row.avatar,
    accent: row.accent,
  }

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */

export const registerAuthRoutes = (app) => {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    // The dev server is plain HTTP; only ask for Secure once actually on HTTPS.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }

  /** Lets the frontend decide whether to render the Google button at all. */
  app.get('/api/auth/config', (_req, res) => {
    res.json({ google: isConfigured(), clientId: GOOGLE_CLIENT_ID })
  })

  app.get('/api/auth/session', (req, res) => {
    const session = readSession(req.cookies?.[SESSION_COOKIE])
    if (!session) {
      res.json({ user: null })
      return
    }
    const member = memberByEmail(session.email)
    if (!member) {
      // The address no longer belongs to anyone in this workspace.
      dropSession(session.token)
      res.json({ user: null })
      return
    }
    res.json({ user: publicMember(member) })
  })

  app.post('/api/auth/google', async (req, res, next) => {
    try {
      if (!client) {
        res.status(503).json({
          error:
            'Google-Anmeldung ist nicht konfiguriert. GOOGLE_CLIENT_ID in der .env setzen und die API neu starten.',
        })
        return
      }

      const credential = req.body?.credential
      if (typeof credential !== 'string' || !credential) {
        res.status(400).json({ error: 'Kein Google-Token übermittelt.' })
        return
      }

      // Verification failing is a rejected credential, not a server fault —
      // keep it in its own try so it can never surface as a 500.
      let payload
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID,
        })
        payload = ticket.getPayload()
      } catch (verifyError) {
        res.status(401).json({
          error: `Google hat das Token abgelehnt: ${verifyError.message}`,
        })
        return
      }

      if (!payload?.email) {
        res.status(401).json({ error: 'Google hat keine E-Mail-Adresse übermittelt.' })
        return
      }
      if (payload.email_verified === false) {
        res.status(401).json({ error: 'Diese Google-Adresse ist nicht bestätigt.' })
        return
      }

      const now = new Date().toISOString()
      db.prepare(
        `INSERT INTO google_identities (sub, email, name, picture, created_at, last_login)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(sub) DO UPDATE SET
           email = excluded.email,
           name = excluded.name,
           picture = excluded.picture,
           last_login = excluded.last_login`,
      ).run(payload.sub, payload.email, payload.name ?? '', payload.picture ?? '', now, now)

      const member = linkMember({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      })

      // The session is issued either way: an address without a workspace is
      // signed in but has nowhere to go yet, and the client sends it to the
      // registration wizard to create one.
      const { token, expires } = createSession(payload.email)
      res.cookie(SESSION_COOKIE, token, { ...cookieOptions, expires })
      res.json({
        user: member ? publicMember(member) : null,
        email: payload.email,
        name: payload.name ?? '',
        picture: payload.picture ?? '',
        needsWorkspace: !member,
      })
    } catch (error) {
      next(error)
    }
  })

  /**
   * Claims a workspace for the signed-in address, or for the address the
   * wizard collected when nobody is signed in yet.
   */
  app.post('/api/auth/register', (req, res) => {
    const email = (sessionEmail(req) || req.body?.email || '').trim()
    if (!email) {
      res.status(400).json({ error: 'Ohne E-Mail-Adresse lässt sich kein Arbeitsbereich anlegen.' })
      return
    }

    const existing = memberByEmail(email)
    if (existing) {
      // Already belongs somewhere: hand back that workspace instead of
      // silently creating a second one for the same person.
      const { token, expires } = createSession(existing.email)
      res.cookie(SESSION_COOKIE, token, { ...cookieOptions, expires })
      res.json({ user: publicMember(existing), created: false })
      return
    }

    const member = createCompanyForEmail({
      email,
      name: req.body?.name,
      companyName: req.body?.companyName,
    })
    const { token, expires } = createSession(member.email)
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions, expires })
    res.json({ user: publicMember(member), created: true })
  })

  app.post('/api/auth/logout', (req, res) => {
    dropSession(req.cookies?.[SESSION_COOKIE])
    res.clearCookie(SESSION_COOKIE, cookieOptions)
    res.json({ ok: true })
  })
}
