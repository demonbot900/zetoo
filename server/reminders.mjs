import { randomBytes } from 'node:crypto'
import { db } from './db.mjs'
import { leaderboard, missingBookings, scoreFor } from './gamification.mjs'

/**
 * End-of-day nudges for unbooked time.
 *
 * Two delivery channels, because one of them is not available to everyone:
 * a Google Chat incoming webhook when the person has pasted one, and an
 * in-app notification always. Incoming webhooks are a Google **Workspace**
 * feature — a personal Gmail account cannot create one, so the in-app copy is
 * what those people get.
 *
 * The scheduler ticks every minute and is deliberately idempotent: a member is
 * marked as reminded for a date before the message goes out, so a restart or a
 * slow webhook can never produce a second nudge.
 */

const uid = (prefix) => `${prefix}${randomBytes(5).toString('hex')}`

const iso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

const DEFAULTS = {
  chat_webhook: '',
  reminder_enabled: 0,
  reminder_time: '17:00',
  reminder_days: '[1,2,3,4,5]',
  last_reminded_on: '',
}

export const readSettings = (email) => {
  const row = db.prepare('SELECT * FROM member_settings WHERE lower(email) = lower(?)').get(email)
  const merged = { ...DEFAULTS, ...(row ?? {}) }
  return {
    email,
    // Never hand the webhook back to the browser in full: it is a bearer URL,
    // and anyone holding it can post into the space.
    chatWebhook: merged.chat_webhook ? maskWebhook(merged.chat_webhook) : '',
    hasWebhook: Boolean(merged.chat_webhook),
    reminderEnabled: merged.reminder_enabled === 1,
    reminderTime: merged.reminder_time,
    reminderDays: JSON.parse(merged.reminder_days || '[1,2,3,4,5]'),
  }
}

const maskWebhook = (url) => {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname.slice(0, 24)}…`
  } catch {
    return '…'
  }
}

export const writeSettings = (companyId, email, patch) => {
  const current = db.prepare('SELECT * FROM member_settings WHERE lower(email) = lower(?)').get(email)
  const next = {
    ...DEFAULTS,
    ...(current ?? {}),
    company_id: companyId,
    email,
  }

  if (patch.chatWebhook !== undefined) {
    const value = String(patch.chatWebhook).trim()
    if (value && !/^https:\/\/chat\.googleapis\.com\//.test(value)) {
      throw new Error(
        'Das sieht nicht nach einem Google-Chat-Webhook aus. Erwartet wird eine URL, die mit https://chat.googleapis.com/ beginnt.',
      )
    }
    next.chat_webhook = value
  }
  if (patch.reminderEnabled !== undefined) next.reminder_enabled = patch.reminderEnabled ? 1 : 0
  if (patch.reminderTime !== undefined) {
    if (!/^\d{2}:\d{2}$/.test(patch.reminderTime)) throw new Error('Uhrzeit im Format HH:MM angeben.')
    next.reminder_time = patch.reminderTime
  }
  if (patch.reminderDays !== undefined) {
    next.reminder_days = JSON.stringify(
      (Array.isArray(patch.reminderDays) ? patch.reminderDays : []).map(Number).filter((d) => d >= 1 && d <= 7),
    )
  }

  db.prepare(
    `INSERT INTO member_settings (email, company_id, chat_webhook, reminder_enabled, reminder_time, reminder_days, last_reminded_on)
     VALUES (@email, @company_id, @chat_webhook, @reminder_enabled, @reminder_time, @reminder_days, @last_reminded_on)
     ON CONFLICT(email) DO UPDATE SET
       company_id = excluded.company_id,
       chat_webhook = excluded.chat_webhook,
       reminder_enabled = excluded.reminder_enabled,
       reminder_time = excluded.reminder_time,
       reminder_days = excluded.reminder_days`,
  ).run(next)

  return readSettings(email)
}

/* ------------------------------------------------------------------ *
 * Delivery
 * ------------------------------------------------------------------ */

/** Google Chat renders these cards; plain `text` is the fallback. */
const buildMessage = (member, score, day) => {
  const missing = `Für ${day} ist bei dir noch keine Zeit erfasst.`
  const streak =
    score.streak > 0
      ? `Deine Serie steht bei ${score.streak} ${score.streak === 1 ? 'Tag' : 'Tagen'} — heute eintragen und sie hält.`
      : 'Trag deine Zeiten ein und starte eine neue Serie.'

  return {
    text: `⏱️ ${member.first_name}, ${missing}\n${streak}\n${score.points} Punkte · Level ${score.level} (${score.levelName})`,
  }
}

export const sendToChat = async (webhook, message, fetchImpl = fetch) => {
  const response = await fetchImpl(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(message),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Google Chat antwortet ${response.status}${body ? `: ${body.slice(0, 160)}` : ''}`)
  }
  return true
}

const record = (companyId, email, title, body, channel) => {
  db.prepare(
    `INSERT INTO notifications (id, company_id, email, kind, title, body, channel, created_at)
     VALUES (?, ?, ?, 'reminder', ?, ?, ?, ?)`,
  ).run(uid('n-'), companyId, email, title, body, channel, new Date().toISOString())
}

/**
 * Sends one person's nudge.
 *
 * Marked as sent *before* the webhook call: a failed delivery still leaves the
 * in-app notification, and a retry loop that hammers a broken webhook every
 * minute would be worse than a missed message.
 */
export const remind = async (companyId, member, day, { fetchImpl = fetch } = {}) => {
  const settings = db
    .prepare('SELECT * FROM member_settings WHERE lower(email) = lower(?)')
    .get(member.email)

  db.prepare('UPDATE member_settings SET last_reminded_on = ? WHERE lower(email) = lower(?)').run(
    day,
    member.email,
  )

  const score = scoreFor(companyId, member, { today: day })
  const message = buildMessage(member, score, day)

  let channel = 'app'
  let error = null
  if (settings?.chat_webhook) {
    try {
      await sendToChat(settings.chat_webhook, message, fetchImpl)
      channel = 'chat'
    } catch (caught) {
      error = caught.message
    }
  }

  record(companyId, member.email, 'Zeiterfassung fehlt', message.text, channel)
  return { email: member.email, channel, error }
}

/* ------------------------------------------------------------------ *
 * Scheduler
 * ------------------------------------------------------------------ */

/** Local time in a member's own zone, so 17:00 means their 17:00. */
const localNow = (timezone) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date())
    const get = (type) => parts.find((p) => p.type === type)?.value
    return { day: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
  } catch {
    const now = new Date()
    return { day: iso(now), time: now.toTimeString().slice(0, 5) }
  }
}

export const runDueReminders = async ({ fetchImpl = fetch } = {}) => {
  const sent = []

  for (const settings of db.prepare('SELECT * FROM member_settings WHERE reminder_enabled = 1').all()) {
    const member = db
      .prepare('SELECT * FROM members WHERE lower(email) = lower(?)')
      .get(settings.email)
    if (!member) continue

    const { day, time } = localNow(member.timezone)
    if (settings.last_reminded_on === day) continue
    if (time < settings.reminder_time) continue

    let days = [1, 2, 3, 4, 5]
    try {
      const parsed = JSON.parse(settings.reminder_days || '[]')
      if (Array.isArray(parsed) && parsed.length) days = parsed
    } catch {
      // Keep the working-week default.
    }
    const weekday = ((new Date(`${day}T00:00:00`).getDay() + 6) % 7) + 1
    if (!days.includes(weekday)) continue

    // Nothing to nag about if the day is already booked.
    if (!missingBookings(member.company_id, day).some((m) => m.id === member.id)) continue

    sent.push(await remind(member.company_id, member, day, { fetchImpl }))
  }

  return sent
}

let timer = null

export const startScheduler = () => {
  if (timer) return
  // A minute is fine: reminder times have minute resolution, and the check is
  // a couple of indexed queries.
  timer = setInterval(() => {
    runDueReminders().catch((error) => console.error('[reminders]', error.message))
  }, 60_000)
  timer.unref?.()
}

export { leaderboard }
