import { bumpGeneration, db } from '../server/db.mjs'

/**
 * One-off repair for the links a cascading delete removed.
 *
 * Until `replaceAll` was changed to update rows in place, every save deleted
 * and re-inserted a tenant's rows. Foreign keys are on, so deleting the members
 * fired `ON DELETE SET NULL` on `time_entries.member_id` and
 * `issues.assignee_id`, and deleting the issues did the same to
 * `time_entries.issue_id`. Re-inserting the identical ids did not restore them.
 *
 * Entries whose text reads "Arbeit an: <issue title>" were created by logging
 * time on that issue, which stamps both the issue and the person booking it.
 * Those are restored here; anything else is left alone rather than guessed at.
 *
 *   node scripts/repair-entry-links.mjs --dry            nur zählen
 *   node scripts/repair-entry-links.mjs                  Vorgänge zurücksetzen
 *   node scripts/repair-entry-links.mjs --member <id>    zusätzlich die Person
 *
 * `--member` ist bewusst ausdrücklich: mit mehreren Personen im Arbeitsbereich
 * lässt sich nicht aus den Daten ableiten, wer gebucht hat.
 */

const DRY = process.argv.includes('--dry')
const MEMBER = (() => {
  const at = process.argv.indexOf('--member')
  return at === -1 ? null : process.argv[at + 1]
})()
const PREFIX = 'Arbeit an: '

// Jira titles carry non-breaking spaces; compare on a flattened form.
const flat = (value) => (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

for (const company of db.prepare('SELECT id, name FROM company').all()) {
  const byTitle = new Map()
  for (const issue of db.prepare('SELECT id, title FROM issues WHERE company_id = ?').all(company.id)) {
    const key = flat(issue.title)
    byTitle.set(key, byTitle.has(key) ? 'AMBIG' : issue.id)
  }

  let member = null
  if (MEMBER) {
    member = db.prepare('SELECT id, first_name, last_name FROM members WHERE id = ? AND company_id = ?').get(MEMBER, company.id)
    if (!member) {
      console.error(`${company.name}: kein Mitglied ${MEMBER} in diesem Arbeitsbereich.`)
      process.exit(1)
    }
  }

  const plan = []
  let ambiguous = 0
  let skipped = 0

  const candidates = db
    .prepare(
      `SELECT id, description, member_id, issue_id FROM time_entries
       WHERE company_id = ? AND (issue_id IS NULL OR (? = 1 AND member_id IS NULL))`,
    )
    .all(company.id, member ? 1 : 0)

  for (const entry of candidates) {
    const text = flat(entry.description)
    if (!text.startsWith(PREFIX)) {
      skipped += 1
      continue
    }
    const issueId = byTitle.get(text.slice(PREFIX.length))
    if (!issueId) skipped += 1
    else if (issueId === 'AMBIG') ambiguous += 1
    else
      plan.push({
        entryId: entry.id,
        issueId: entry.issue_id ?? issueId,
        memberId: entry.member_id ?? member?.id ?? null,
      })
  }

  console.log(`${company.name} (${company.id})`)
  console.log(`  betroffen:                    ${plan.length}`)
  console.log(`  Titel mehrfach, übersprungen: ${ambiguous}`)
  console.log(`  ohne Vorgangsbezug, gelassen: ${skipped}`)
  if (member) console.log(`  Person wird gesetzt auf:      ${member.first_name} ${member.last_name} (${member.id})`)

  if (DRY || !plan.length) continue

  const update = db.prepare(
    'UPDATE time_entries SET issue_id = ?, member_id = ? WHERE id = ? AND company_id = ?',
  )
  db.transaction(() => {
    for (const row of plan) update.run(row.issueId, row.memberId, row.entryId, company.id)
  })()

  const after = db
    .prepare(
      `SELECT COUNT(*) gesamt, SUM(issue_id IS NOT NULL) mitVorgang, SUM(member_id IS NOT NULL) mitPerson
       FROM time_entries WHERE company_id = ?`,
    )
    .get(company.id)
  console.log(`  geschrieben: ${plan.length} · Zeiteinträge jetzt ${JSON.stringify(after)}`)

  // Any tab still holding the damaged copy must reload instead of pushing it back.
  console.log(`  Generationsmarke: ${bumpGeneration(company.id)}`)
}

if (DRY) console.log('\nTrockenprobe — nichts geschrieben.')
