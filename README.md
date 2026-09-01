# Zetoo — Sprint & Time Planning

Zetoo is issue tracking with time planning built in. Board, backlog, timeline and
burndown share one estimate, so capacity problems surface while you can still fix
them — and the hours you log turn into a client-ready **Leistungsnachweis** without
being retyped.

Built with Vue 3, Vite, TypeScript and Tailwind CSS 4, on a Node/Express API backed
by SQLite.

## What it does

**Planning**

- **Board** — drag-and-drop columns, WIP limits, custom column sets and templates
- **Backlog** — grooming and sprint assignment
- **Timeline** — dated work laid out across the sprint
- **Dashboard & Reports** — burndown, velocity, workload and estimate accuracy

**Billing**

- **Projekte** — one entry per engagement: client, contractor, reference-number
  pattern and an optional Word design template
- **Zeiterfassung** — hours booked in 0.25 steps against a date, a category, a
  person and a free-text description; time logged on a board issue lands here too
- **Leistungsnachweis** — pick a project and a period (last month is preselected),
  check the preview, export a `.docx`

**Workspace** — company registration wizard, team and member profiles, appearance
and theming, and a language picker covering interface text plus date and number
formats.

## Requirements

- Node.js `^20.19.0 || >=22.12.0`
- npm

No database server to install: SQLite lives in a single file.

## Getting started

```sh
npm install
npm run dev
```

That starts two processes side by side:

| Process | Port | What it is |
| --- | --- | --- |
| `api` | 3001 | Express + SQLite, serving `/api/*` |
| `web` | 5173 | Vite dev server, proxying `/api` to the API |

Open <http://localhost:5173>. The first run walks you through creating a workspace.

Run them separately with `npm run dev:api` and `npm run dev:web` if you prefer.

### Other commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Type-check and build the frontend into `dist/` |
| `npm start` | Run the API on its own (serves a built frontend's data) |
| `npm run type-check` | `vue-tsc` across the project |
| `npm run lint` | ESLint with `--fix` |
| `npm run format` | Prettier over `src/` |
| `npm run build:template` | Regenerate the bundled Word template |
| `npm run mcp` | Run the MCP server on stdio |

## Workspaces and sign-in

The database is multi-tenant: one row in `company` per workspace, and every
business table carries `company_id`. Which workspace a request sees is decided
by the session cookie alone — never by anything the client sends.

- An email address belongs to exactly one workspace (enforced by a unique index
  on `members.email`).
- Signing in with an address that has no workspace lands in the registration
  wizard and creates a new one; it never joins an existing company.
- Signing out clears this browser's cached copy, so the next account starts from
  the server rather than from the previous session's data.

## Google sign-in

Optional, and off until configured.

1. Open <https://console.cloud.google.com/apis/credentials> and create an
   **OAuth 2.0 Client ID** of type *Web application*.
2. Under **Authorised JavaScript origins**, add both:
   - `http://localhost:5173`
   - `http://localhost:3001`
3. Copy `.env.example` to `.env` and paste the ID into `GOOGLE_CLIENT_ID`.
4. Restart the API. It prints `Google-Anmeldung: aktiv` on boot.

No client secret and no redirect URI are needed: Zetoo uses the Google Identity
Services ID-token flow. The browser receives a signed token, the server verifies
it against Google's public keys and issues an httpOnly session cookie.

The first person to sign in becomes the workspace owner; anyone signing in
afterwards joins as a member. Accounts are matched to members by email address.

Without a client ID the sign-in page simply says so and email sign-in still
works.

## Claude via MCP

`server/mcp.mjs` is an MCP server that lets Claude read and manage a workspace:

Thirty tools covering the whole dashboard, so you can just say what you want:
*"open a board for Kunde X, add an Abnahme column, put Lena on the concept and
book three hours on it."*

| Area | Tools |
| --- | --- |
| Overview | `zetoo_dashboard`, `zetoo_workspace` |
| Company | `zetoo_update_company` |
| People | `zetoo_create_member`, `zetoo_update_member`, `zetoo_delete_member` |
| Boards | `zetoo_create_board`, `zetoo_update_board`, `zetoo_delete_board` |
| Columns | `zetoo_list_columns`, `zetoo_create_column`, `zetoo_update_column`, `zetoo_delete_column` |
| Sprints | `zetoo_list_sprints`, `zetoo_create_sprint`, `zetoo_update_sprint` |
| Epics | `zetoo_create_epic` |
| Issues | `zetoo_list_issues`, `zetoo_create_issue`, `zetoo_update_issue`, `zetoo_move_issue`, `zetoo_delete_issue` |
| Projects | `zetoo_create_project`, `zetoo_update_project`, `zetoo_delete_project` |
| Time | `zetoo_log_time`, `zetoo_list_time_entries`, `zetoo_update_time_entry`, `zetoo_delete_time_entry` |
| Reporting | `zetoo_record_summary` |

Every tool is scoped to one workspace and refuses to touch rows belonging to
another. `zetoo_dashboard` is the one to start from: it returns per-board
progress, the active sprint, workload per person, overdue work and the hours
booked this month.

Add it to your MCP client (Claude Desktop's `claude_desktop_config.json`, or
`claude mcp add`):

```json
{
  "mcpServers": {
    "zetoo": {
      "command": "node",
      "args": ["C:/path/to/zetoo/server/mcp.mjs"],
      "env": { "ZETOO_COMPANY": "Your company name" }
    }
  }
}
```

`ZETOO_COMPANY` picks the workspace by id or name. With exactly one company in
the database it can be omitted; with several the server refuses rather than
guessing. Run it standalone with `npm run mcp`.

It talks to SQLite directly, so the API does not have to be running. Writes bump
the workspace's generation marker, which makes any open browser tab reload
instead of overwriting Claude's changes with its cached copy.

## Migrating from Jira

**Workspace → Migration** walks through it: connect, pick projects, map people,
run. Jira REST **v2** is used throughout — v3 returns descriptions as Atlassian
Document Format, v2 as plain strings, which removes a whole renderer.

| Jira | Zetoo |
| --- | --- |
| Project | Board (plus a billing project for the worklogs) |
| Workflow status | Board column, ordered To Do → In Progress → Done |
| Sprint | Sprint, with state and dates |
| Issue | Issue, keeping the `PROJ-123` key as `external_key` |
| Sub-task | Checklist item on its parent |
| Worklog | Time entry, rounded to quarter hours |
| Original estimate / time spent | `estimateHours` / `loggedHours` |
| Priority (5 levels) | Priority (4) — Lowest folds into low |

**Re-running is safe.** Every row carries `external_source` + `external_id` with
a unique index, so a second run updates what is already there instead of
duplicating it. An import that dies at issue 3000 can simply be started again.

**Mapping people is a manual step, by necessity.** Jira Cloud withholds email
addresses, so accounts cannot be matched automatically. The wizard lists
everyone it found and pre-fills only where Jira did reveal an address.

**Not carried over**, because Zetoo has no equivalent: comments, attachments,
change history, issue links and permission schemes. The closing report counts
them rather than quietly dropping them.

Story points live in a custom field whose id differs per site, so it is
discovered by name from `/rest/api/2/field` rather than hard-coded.

## Resetting the workspace

**Company settings → Reset workspace** empties the database, clears this
browser's cache and returns to the registration wizard.

Other tabs that were open across a reset cannot push their stale copy back: the
database carries a generation marker, and a write from a pre-reset tab is
refused with `409` and reloads that tab instead.

## Data and storage

The API owns the data. It writes to `server/data/zetoo.db` — a normal SQLite
database with real tables (`company`, `members`, `projects`, `time_entries`,
`issues`, `status_columns`, …), so you can inspect it with any SQLite client:

```sh
sqlite3 server/data/zetoo.db "SELECT date, category, hours FROM time_entries ORDER BY date"
```

Point `ZETOO_DB` at another path to use a different file.

The browser keeps a `localStorage` mirror of what it last loaded. It is a cache,
not the source of truth: the app opens with it instantly and still works if the
API is down, then reconciles as soon as the API answers.

A new workspace starts genuinely empty — one sprint, the board columns from the
template you picked, and nothing else. There is no sample data to delete.

### API

Three documents, one per client store. `GET` reads, `PUT` replaces.

| Endpoint | Contents |
| --- | --- |
| `/api/workspace` | Company, members, invites, current user |
| `/api/board` | Issues, board columns, active sprint |
| `/api/records` | Projects, time entries, reporting period |
| `/api/health` | Status, database path, row counts |
| `/api/auth/*` | Google sign-in, session, sign-out |
| `/api/reset` | Empties the workspace |

## Word export

`Leistungsnachweis` renders a `.docx` through
[docxtemplater](https://docxtemplater.com/). Without a template of your own, the
bundled `public/templates/leistungsnachweis-standard.docx` is used.

To use your own layout, download the standard file from the upload panel, restyle
it in Word, and upload it against the project. Keep the placeholders intact:

| Placeholder | Contents |
| --- | --- |
| `{referenznummer}` | Resolved reference number |
| `{auftraggeber}` / `{auftragnehmer}` | Both parties |
| `{projekt}` | Project name |
| `{zeitraum_von}` / `{zeitraum_bis}` | Reported period |
| `{#positionen}` … `{/positionen}` | Repeats its table row per line item |
| `{datum}` `{kategorie}` `{stunden}` `{name}` `{beschreibung}` | Per line item |
| `{gesamtstunden}` | Automatic total |
| `{erstellt_am}` | Creation date |

Each placeholder must sit in a single Word text run — retyping one in one go is
enough; splitting it across formatting changes hides it from the renderer.

### File names

Exports are named `<period start>_Leistungsnachweis_<reference>.docx`, e.g.
`2026-06-01_Leistungsnachweis_CODIN-RE-2026-0042.docx`.

The reference comes from the project's pattern and is editable per export.
`{YYYY}` and `{MM}` resolve against the start of the reported period, so
re-exporting an old month keeps the number it had; `{NR}` is a running,
zero-padded counter.

## Project layout

```
server/          Express API, SQLite schema and mapping layer
scripts/         Generator for the bundled Word template
src/
  components/    Feature components (planner, records, team, layout, ui)
  composables/   Reactive stores: workspace, planner, records, appearance, locale
  views/         Routed pages
  types/         Shared TypeScript interfaces
  utils/         Word export, API sync, colour helpers
  locales/       Message catalogues; `en-GB` is the source of truth
```

## Tech stack

Vue 3.5 · Vite 6 · TypeScript 5.7 · Tailwind CSS 4 · Vue Router 4 ·
Express 5 · better-sqlite3 · ApexCharts · FullCalendar · flatpickr ·
docxtemplater

## Licence

Zetoo is released under the MIT Licence.
