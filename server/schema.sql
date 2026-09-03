-- Zetoo database schema.
--
-- Multi-tenant: one row in `company` per workspace, and every other business
-- table carries `company_id`. Which tenant a request sees is decided by the
-- session cookie, never by the client — see resolveCompany in index.mjs. Columns are snake_case here and mapped to
-- the camelCase shapes the client uses in db.mjs, so neither side has to bend
-- to the other's conventions.
--
-- JSON is used only for genuinely list-shaped leaf values (labels, skills,
-- checklists) that are never queried on their own.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS company (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL DEFAULT '',
  industry      TEXT NOT NULL DEFAULT '',
  size          TEXT NOT NULL DEFAULT '1-10',
  website       TEXT NOT NULL DEFAULT '',
  logo          TEXT NOT NULL DEFAULT '',
  address_line  TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  postal_code   TEXT NOT NULL DEFAULT '',
  country       TEXT NOT NULL DEFAULT '',
  vat_id        TEXT NOT NULL DEFAULT '',
  timezone      TEXT NOT NULL DEFAULT 'Europe/Berlin',
  work_days     TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  hours_per_day REAL NOT NULL DEFAULT 8,
  plan          TEXT NOT NULL DEFAULT 'starter',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id             TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  first_name     TEXT NOT NULL DEFAULT '',
  last_name      TEXT NOT NULL DEFAULT '',
  email          TEXT NOT NULL DEFAULT '',
  job_title      TEXT NOT NULL DEFAULT '',
  department     TEXT NOT NULL DEFAULT '',
  role           TEXT NOT NULL DEFAULT 'member',
  status         TEXT NOT NULL DEFAULT 'active',
  avatar         TEXT NOT NULL DEFAULT '',
  accent         TEXT NOT NULL DEFAULT '',
  phone          TEXT NOT NULL DEFAULT '',
  location       TEXT NOT NULL DEFAULT '',
  timezone       TEXT NOT NULL DEFAULT '',
  bio            TEXT NOT NULL DEFAULT '',
  skills         TEXT NOT NULL DEFAULT '[]',
  capacity_hours REAL NOT NULL DEFAULT 0,
  started_at     TEXT NOT NULL DEFAULT '',
  links          TEXT NOT NULL DEFAULT '{}',
  position       INTEGER NOT NULL DEFAULT 0,
  -- Where this row came from, when it was migrated in. See server/import.
  external_source TEXT,
  external_id     TEXT
);

-- One address belongs to one workspace, which is how a sign-in resolves to a
-- tenant. Without this, a second company could claim an existing user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email ON members (lower(email));
CREATE INDEX IF NOT EXISTS idx_members_company ON members (company_id);

CREATE TABLE IF NOT EXISTS invites (
  id        TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  email     TEXT NOT NULL DEFAULT '',
  role      TEXT NOT NULL DEFAULT 'member',
  job_title TEXT NOT NULL DEFAULT '',
  sent_at   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS status_columns (
  -- Column ids repeat across boards ("todo" on each), so the key is the pair.
  id         TEXT NOT NULL,
  company_id TEXT NOT NULL DEFAULT '',
  board_id   TEXT NOT NULL DEFAULT '',
  name      TEXT NOT NULL,
  color     TEXT NOT NULL DEFAULT '',
  wip_limit INTEGER,
  position  INTEGER NOT NULL DEFAULT 0,
  collapsed INTEGER NOT NULL DEFAULT 0,
  dot       TEXT,
  -- Which columns count as finished. Boards rename and translate their last
  -- column ("Erledigt", "Shipped", "Approved"), so progress cannot be read off
  -- a hard-coded id.
  is_done   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (board_id, id)
);

-- One board per client engagement. Issues, sprints and columns all belong to
-- exactly one board, so two clients never see each other's workflow.
CREATE TABLE IF NOT EXISTS boards (
  id          TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  name        TEXT NOT NULL,
  client      TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '',
  -- Optional link to the billing project the hours land on.
  project_id  TEXT,
  archived    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  -- Where this row came from, when it was migrated in. See server/import.
  external_source TEXT,
  external_id     TEXT
);

CREATE TABLE IF NOT EXISTS sprints (
  id         TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  board_id   TEXT NOT NULL DEFAULT '',
  name       TEXT NOT NULL,
  goal       TEXT NOT NULL DEFAULT '',
  state      TEXT NOT NULL DEFAULT 'planned',
  start_date TEXT NOT NULL,
  end_date   TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  external_source TEXT,
  external_id     TEXT
);

CREATE TABLE IF NOT EXISTS epics (
  id       TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  board_id TEXT NOT NULL DEFAULT '',
  name     TEXT NOT NULL,
  color    TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  external_source TEXT,
  external_id     TEXT
);

CREATE TABLE IF NOT EXISTS issues (
  id             TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  board_id       TEXT NOT NULL DEFAULT '',
  title          TEXT NOT NULL DEFAULT '',
  description    TEXT NOT NULL DEFAULT '',
  type           TEXT NOT NULL DEFAULT 'task',
  status         TEXT NOT NULL DEFAULT 'backlog',
  priority       TEXT NOT NULL DEFAULT 'medium',
  assignee_id    TEXT REFERENCES members (id) ON DELETE SET NULL,
  sprint_id      TEXT,
  epic_id        TEXT,
  estimate_hours REAL NOT NULL DEFAULT 0,
  logged_hours   REAL NOT NULL DEFAULT 0,
  story_points   REAL NOT NULL DEFAULT 0,
  start_date     TEXT,
  due_date       TEXT,
  completed_at   TEXT,
  labels         TEXT NOT NULL DEFAULT '[]',
  position       INTEGER NOT NULL DEFAULT 0,
  cover_color    TEXT NOT NULL DEFAULT '',
  checklist      TEXT NOT NULL DEFAULT '[]',
  external_source TEXT,
  external_id     TEXT,
  -- The human-readable key people still refer to, e.g. PROJ-123.
  external_key    TEXT
);

CREATE INDEX IF NOT EXISTS idx_issues_board ON issues (board_id);
CREATE INDEX IF NOT EXISTS idx_sprints_board ON sprints (board_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues (status);
CREATE INDEX IF NOT EXISTS idx_issues_sprint ON issues (sprint_id);

CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  name          TEXT NOT NULL,
  client        TEXT NOT NULL DEFAULT '',
  reference     TEXT NOT NULL DEFAULT '',
  contractor    TEXT NOT NULL DEFAULT '',
  categories    TEXT NOT NULL DEFAULT '[]',
  template_name TEXT NOT NULL DEFAULT '',
  template_data TEXT NOT NULL DEFAULT '',
  archived      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS time_entries (
  id          TEXT PRIMARY KEY,
  company_id TEXT NOT NULL DEFAULT '',
  project_id  TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  hours       REAL NOT NULL DEFAULT 0,
  member_id   TEXT REFERENCES members (id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  issue_id    TEXT REFERENCES issues (id) ON DELETE SET NULL,
  external_source TEXT,
  external_id     TEXT
);

-- The report screen filters by project and date range on every keystroke.
CREATE INDEX IF NOT EXISTS idx_time_entries_project_date
  ON time_entries (project_id, date);

-- Scalars that belong to the workspace rather than to any one row:
-- current user, active sprint, counters, the selected reporting period.
CREATE TABLE IF NOT EXISTS app_state (
  company_id TEXT NOT NULL DEFAULT '',
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  PRIMARY KEY (company_id, key)
);

-- Google identities and the sessions handed out after a successful sign-in.
--
-- Both key on the email address rather than on members.id. A workspace save
-- replaces the members table wholesale, so a foreign key here would cascade
-- every login away on each save. Email is the stable link between a Google
-- account and whoever holds that address in the workspace.
CREATE TABLE IF NOT EXISTS google_identities (
  sub        TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  picture    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  last_login TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_google_identities_email ON google_identities (email);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions (email);

CREATE INDEX IF NOT EXISTS idx_boards_company ON boards (company_id);
CREATE INDEX IF NOT EXISTS idx_issues_company ON issues (company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects (company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_company ON time_entries (company_id);

-- Migration runs: one row per import, so a long job can report progress and
-- a failed one can be picked apart afterwards.
CREATE TABLE IF NOT EXISTS imports (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'jira',
  status      TEXT NOT NULL DEFAULT 'pending',
  step        TEXT NOT NULL DEFAULT '',
  total       INTEGER NOT NULL DEFAULT 0,
  done        INTEGER NOT NULL DEFAULT 0,
  skipped     TEXT NOT NULL DEFAULT '{}',
  error       TEXT NOT NULL DEFAULT '',
  started_at  TEXT NOT NULL DEFAULT '',
  finished_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_imports_company ON imports (company_id, started_at);

-- Per-person notification settings.
--
-- Keyed on the email address, not members.id: a workspace save replaces the
-- members table wholesale, and settings must not travel with it.
CREATE TABLE IF NOT EXISTS member_settings (
  email             TEXT PRIMARY KEY,
  company_id        TEXT NOT NULL DEFAULT '',
  -- Google Chat incoming webhook. A Workspace feature; personal Gmail
  -- accounts cannot create one, hence the in-app fallback.
  chat_webhook      TEXT NOT NULL DEFAULT '',
  reminder_enabled  INTEGER NOT NULL DEFAULT 0,
  -- Local time of day the nudge goes out, HH:MM.
  reminder_time     TEXT NOT NULL DEFAULT '17:00',
  -- ISO weekdays the person is expected to book, 1 = Monday.
  reminder_days     TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  last_reminded_on  TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_member_settings_company ON member_settings (company_id);

-- Nudges already delivered, so a restart cannot send the same one twice and
-- the in-app inbox has something to show.
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  email      TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'reminder',
  title      TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL DEFAULT '',
  channel    TEXT NOT NULL DEFAULT 'app',
  created_at TEXT NOT NULL,
  read_at    TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_notifications_email ON notifications (email, created_at);
