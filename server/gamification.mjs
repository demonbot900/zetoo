import { db } from './db.mjs'

/**
 * Scoring for time-tracking discipline.
 *
 * Points are *derived* from the time entries every time they are asked for,
 * never stored. A stored counter drifts the moment an entry is corrected or
 * deleted, and a leaderboard nobody trusts is worse than none.
 *
 * The model rewards three things, in order of how much they matter:
 *   1. booking at all,
 *   2. booking on the day the work happened,
 *   3. keeping it up.
 * There are no penalties — a bad week costs the streak, which is discouraging
 * enough without also taking points away.
 */

const POINTS_PER_DAY = 10
const PUNCTUAL_BONUS = 5
const COMPLETE_BONUS = 5
const STREAK_STEP = 2
const STREAK_CAP = 10
const POINTS_PER_LEVEL = 250

const iso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

const addDays = (day, n) => {
  const d = new Date(`${day}T00:00:00`)
  d.setDate(d.getDate() + n)
  return iso(d)
}

/** ISO weekday, 1 = Monday. */
const weekday = (day) => ((new Date(`${day}T00:00:00`).getDay() + 6) % 7) + 1

const isWorkday = (day, workDays) => workDays.includes(weekday(day))

export const LEVELS = [
  'Neuling',
  'Mitläufer',
  'Verlässlich',
  'Vorbild',
  'Taktgeber',
  'Legende',
]

export const levelFor = (points) => {
  const index = Math.min(Math.floor(points / POINTS_PER_LEVEL), LEVELS.length - 1)
  return {
    level: index + 1,
    // Deliberately not `name`: a score also carries the person's name, and one
    // spread would silently overwrite the other.
    levelName: LEVELS[index],
    points,
    nextAt: index === LEVELS.length - 1 ? null : (index + 1) * POINTS_PER_LEVEL,
  }
}

/**
 * The days a person booked, with how much and whether it was booked on time.
 *
 * `created_at` only exists on entries written after that column landed, so an
 * entry without one counts as punctual rather than being penalised for the
 * app's own history.
 */
const bookedDays = (companyId, memberId, from, to) => {
  const rows = db
    .prepare(
      `SELECT date,
              SUM(hours) AS hours,
              MIN(COALESCE(substr(created_at, 1, 10), date)) AS firstBooked
       FROM time_entries
       WHERE company_id = ? AND member_id = ? AND date BETWEEN ? AND ?
       GROUP BY date ORDER BY date`,
    )
    .all(companyId, memberId, from, to)

  return rows.map((row) => ({
    date: row.date,
    hours: Math.round(row.hours * 100) / 100,
    punctual: row.firstBooked <= row.date,
  }))
}

/** Working days the person was expected to book, up to and including today. */
const expectedDays = (from, to, workDays) => {
  const out = []
  for (let day = from; day <= to; day = addDays(day, 1)) {
    if (isWorkday(day, workDays)) out.push(day)
  }
  return out
}

/**
 * Consecutive expected working days booked, counting back from today.
 *
 * Today is not held against anyone until it is over: a streak that breaks at
 * 09:00 because the day is not booked yet would be nonsense.
 */
const streakFor = (booked, workDays, today) => {
  const done = new Set(booked.map((entry) => entry.date))
  let streak = 0
  let day = done.has(today) ? today : addDays(today, -1)

  for (let guard = 0; guard < 400; guard += 1) {
    if (!isWorkday(day, workDays)) {
      day = addDays(day, -1)
      continue
    }
    if (!done.has(day)) break
    streak += 1
    day = addDays(day, -1)
  }
  return streak
}

/**
 * One person's standing.
 *
 * @param options.days How far back to score, default 90.
 */
export const scoreFor = (companyId, member, options = {}) => {
  const today = options.today ?? iso(new Date())
  const from = addDays(today, -(options.days ?? 90))
  const workDays = options.workDays ?? [1, 2, 3, 4, 5]

  // A fortnight of capacity spread over ten working days is the daily target.
  const dailyTarget = member.capacity_hours ? member.capacity_hours / 10 : 0

  const booked = bookedDays(companyId, member.id, from, today)
  const expected = expectedDays(from, today, workDays)
  const streak = streakFor(booked, workDays, today)

  let points = 0
  let punctualDays = 0
  let completeDays = 0

  for (const day of booked) {
    points += POINTS_PER_DAY
    if (day.punctual) {
      points += PUNCTUAL_BONUS
      punctualDays += 1
    }
    if (dailyTarget && day.hours >= dailyTarget) {
      points += COMPLETE_BONUS
      completeDays += 1
    }
  }
  points += Math.min(streak, STREAK_CAP) * STREAK_STEP

  const expectedSoFar = expected.filter((day) => day < today).length

  return {
    memberId: member.id,
    name: `${member.first_name} ${member.last_name}`.trim() || member.email,
    email: member.email,
    points,
    ...levelFor(points),
    streak,
    bookedDays: booked.length,
    punctualDays,
    completeDays,
    expectedDays: expectedSoFar,
    coverage: expectedSoFar ? Math.round((booked.length / expectedSoFar) * 100) : 0,
    hours: Math.round(booked.reduce((sum, day) => sum + day.hours, 0) * 100) / 100,
    bookedToday: booked.some((day) => day.date === today),
  }
}

/** Everyone in the workspace, best first. */
export const leaderboard = (companyId, options = {}) => {
  const company = db.prepare('SELECT work_days FROM company WHERE id = ?').get(companyId)
  let workDays = [1, 2, 3, 4, 5]
  try {
    const parsed = JSON.parse(company?.work_days ?? '[]')
    if (Array.isArray(parsed) && parsed.length) workDays = parsed
  } catch {
    // Keep the Monday-to-Friday default.
  }

  return db
    .prepare("SELECT * FROM members WHERE company_id = ? AND status = 'active' ORDER BY position")
    .all(companyId)
    .map((member) => scoreFor(companyId, member, { ...options, workDays }))
    .sort((a, b) => b.points - a.points || b.streak - a.streak)
    .map((row, index) => ({ rank: index + 1, ...row }))
}

/** Who has not booked anything for a given day yet. */
export const missingBookings = (companyId, day) =>
  db
    .prepare(
      `SELECT m.* FROM members m
       WHERE m.company_id = ? AND m.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM time_entries t
           WHERE t.member_id = m.id AND t.date = ?
         )`,
    )
    .all(companyId, day)
