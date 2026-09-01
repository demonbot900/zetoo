<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Migration" />

    <div class="mx-auto flex max-w-3xl flex-col gap-4 md:gap-6">
      <!-- Step 1: connect ------------------------------------------------ -->
      <section class="zt-card p-5 sm:p-6">
        <header class="mb-4 flex items-center gap-3">
          <span class="zt-step" :class="step >= 1 ? 'zt-step-on' : ''">1</span>
          <div>
            <h3 class="font-semibold text-gray-800 dark:text-white/90">Mit Jira verbinden</h3>
            <p class="text-theme-sm text-gray-500 dark:text-gray-400">
              API-Token unter
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noreferrer"
                class="text-brand-500 hover:text-brand-600"
                >id.atlassian.com</a
              >
              erzeugen. Die Zugangsdaten werden nicht gespeichert.
            </p>
          </div>
        </header>

        <div class="grid gap-4 sm:grid-cols-3">
          <div class="sm:col-span-3">
            <label for="jira-url" class="zt-label">Jira-URL</label>
            <input
              id="jira-url"
              v-model="form.baseUrl"
              type="url"
              class="zt-input"
              placeholder="https://deinefirma.atlassian.net"
            />
          </div>
          <div class="sm:col-span-2">
            <label for="jira-email" class="zt-label">E-Mail</label>
            <input id="jira-email" v-model="form.email" type="email" class="zt-input" />
          </div>
          <div>
            <label for="jira-token" class="zt-label">API-Token</label>
            <input id="jira-token" v-model="form.token" type="password" class="zt-input" />
          </div>
        </div>

        <div class="mt-4 flex items-center gap-3">
          <button type="button" class="zt-btn-primary py-2.5" :disabled="busy !== ''" @click="connect">
            {{ busy === 'connect' ? 'Verbinde…' : 'Verbinden' }}
          </button>
          <span v-if="connectedAs" class="zt-chip">
            angemeldet als {{ connectedAs.displayName }}
          </span>
        </div>
      </section>

      <!-- Step 2: projects ----------------------------------------------- -->
      <section v-if="projects.length" class="zt-card p-5 sm:p-6">
        <header class="mb-4 flex items-center gap-3">
          <span class="zt-step" :class="chosen.length ? 'zt-step-on' : ''">2</span>
          <div>
            <h3 class="font-semibold text-gray-800 dark:text-white/90">Projekte wählen</h3>
            <p class="text-theme-sm text-gray-500 dark:text-gray-400">
              Jedes Jira-Projekt wird ein Board.
            </p>
          </div>
        </header>

        <ul class="grid gap-2 sm:grid-cols-2">
          <li v-for="project in projects" :key="project.key">
            <label
              class="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
            >
              <input
                v-model="chosen"
                type="checkbox"
                :value="project.key"
                class="h-4 w-4 rounded border-gray-300 text-brand-500 dark:border-gray-700"
              />
              <span class="min-w-0">
                <span class="block truncate text-theme-sm text-gray-800 dark:text-white/90">
                  {{ project.name }}
                </span>
                <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
                  {{ project.key }}
                </span>
              </span>
            </label>
          </li>
        </ul>

        <button
          type="button"
          class="zt-btn-ghost mt-4 py-2.5"
          :disabled="!chosen.length || busy !== ''"
          @click="loadUsers"
        >
          {{ busy === 'users' ? 'Lade Personen…' : 'Weiter zur Zuordnung' }}
        </button>
      </section>

      <!-- Step 3: people -------------------------------------------------- -->
      <section v-if="users.length" class="zt-card p-5 sm:p-6">
        <header class="mb-4 flex items-center gap-3">
          <span class="zt-step zt-step-on">3</span>
          <div>
            <h3 class="font-semibold text-gray-800 dark:text-white/90">Personen zuordnen</h3>
            <p class="text-theme-sm text-gray-500 dark:text-gray-400">
              Jira Cloud gibt E-Mail-Adressen meist nicht heraus, deshalb ist die Zuordnung von
              Hand nötig. Nicht zugeordnete Personen kommen ohne Zuweisung an.
            </p>
          </div>
        </header>

        <ul class="flex flex-col gap-2">
          <li
            v-for="user in users"
            :key="user.externalId"
            class="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate text-theme-sm text-gray-800 dark:text-white/90">
                {{ user.displayName }}
              </span>
              <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
                {{ user.email ?? 'keine E-Mail von Jira' }}
              </span>
            </span>
            <ZSelect
              v-model="accountToMember[user.externalId]"
              :options="memberOptions"
              aria-label="Zuordnung"
              size="sm"
            />
          </li>
        </ul>

        <label class="mt-4 flex items-center gap-2 text-theme-sm text-gray-600 dark:text-gray-300">
          <input
            v-model="withWorklogs"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-brand-500 dark:border-gray-700"
          />
          Gebuchte Zeiten übernehmen (wird je Projekt zu einem Abrechnungsprojekt)
        </label>

        <button type="button" class="zt-btn-primary mt-4 py-2.5" :disabled="busy !== ''" @click="start">
          Migration starten
        </button>
      </section>

      <!-- Step 4: progress ------------------------------------------------ -->
      <section v-if="run" class="zt-card p-5 sm:p-6">
        <header class="mb-4 flex items-center gap-3">
          <span class="zt-step zt-step-on">4</span>
          <h3 class="font-semibold text-gray-800 dark:text-white/90">
            {{ run.status === 'done' ? 'Fertig' : run.status === 'failed' ? 'Abgebrochen' : 'Läuft' }}
          </h3>
        </header>

        <p class="text-theme-sm text-gray-600 dark:text-gray-300">{{ run.step }}</p>
        <div class="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            class="h-2 rounded-full transition-all"
            :class="run.status === 'failed' ? 'bg-error-500' : 'bg-brand-500'"
            :style="{ width: `${percent}%` }"
          ></div>
        </div>
        <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
          {{ run.done }} von {{ run.total || '?' }} Vorgängen
        </p>

        <p v-if="run.error" class="zt-error">{{ run.error }}</p>

        <div
          v-if="run.status === 'done'"
          class="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
        >
          <h4 class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
            Nicht übernommen
          </h4>
          <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            Zetoo hat dafür kein Gegenstück.
          </p>
          <ul class="mt-3 flex flex-wrap gap-2">
            <li v-for="row in skippedRows" :key="row.label">
              <span class="zt-chip">{{ row.label }}: {{ row.value }}</span>
            </li>
          </ul>
          <RouterLink to="/boards" class="zt-btn-primary mt-4 inline-flex py-2.5">
            Zu den Boards
          </RouterLink>
        </div>
      </section>

      <p v-if="error" class="zt-error text-center">{{ error }}</p>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ZSelect from '@/components/ui/ZSelect.vue'

interface JiraProject {
  id: string
  key: string
  name: string
}
interface JiraUser {
  externalId: string
  displayName: string
  email: string | null
  suggestedMemberId: string | null
}
interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
}
interface Run {
  id: string
  status: string
  step: string
  total: number
  done: number
  error: string
  skipped: Record<string, number>
}

const form = reactive({ baseUrl: '', email: '', token: '' })
const busy = ref<'connect' | 'users' | 'start' | ''>('')
const error = ref('')

const connectedAs = ref<{ displayName: string } | null>(null)
const projects = ref<JiraProject[]>([])
const chosen = ref<string[]>([])
const users = ref<JiraUser[]>([])
const members = ref<Member[]>([])
const accountToMember = reactive<Record<string, string>>({})
const withWorklogs = ref(true)
const run = ref<Run | null>(null)

let poll: ReturnType<typeof setInterval> | null = null
onUnmounted(() => {
  if (poll) clearInterval(poll)
})

const step = computed(() => (connectedAs.value ? 1 : 0))

const percent = computed(() => {
  if (!run.value) return 0
  if (run.value.status === 'done') return 100
  return run.value.total ? Math.min(100, Math.round((run.value.done / run.value.total) * 100)) : 5
})

const LABELS: Record<string, string> = {
  comments: 'Kommentare',
  attachments: 'Anhänge',
  unmappedUsers: 'Vorgänge ohne Zuordnung',
  worklogsWithoutMember: 'Zeiten ohne Person',
}

const skippedRows = computed(() =>
  Object.entries(run.value?.skipped ?? {}).map(([key, value]) => ({
    label: LABELS[key] ?? key,
    value,
  })),
)

const memberOptions = computed(() => [
  { value: '', label: 'Nicht zuordnen' },
  ...members.value.map((member) => ({
    value: member.id,
    label: `${member.first_name} ${member.last_name}`.trim() || member.email,
  })),
])

const post = async (path: string, body: Record<string, unknown>) => {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...form, ...body }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Die Anfrage ist fehlgeschlagen.')
  return data
}

const connect = async () => {
  busy.value = 'connect'
  error.value = ''
  try {
    const data = await post('/api/import/jira/connect', {})
    connectedAs.value = data.connectedAs
    projects.value = data.projects
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Verbindung fehlgeschlagen.'
  } finally {
    busy.value = ''
  }
}

const loadUsers = async () => {
  busy.value = 'users'
  error.value = ''
  try {
    const data = await post('/api/import/jira/users', { projectKeys: chosen.value })
    members.value = data.members
    users.value = data.users
    // Pre-fill what could be matched by email.
    for (const user of data.users as JiraUser[]) {
      accountToMember[user.externalId] = user.suggestedMemberId ?? ''
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Personen konnten nicht geladen werden.'
  } finally {
    busy.value = ''
  }
}

const start = async () => {
  busy.value = 'start'
  error.value = ''
  try {
    const mapping = Object.fromEntries(
      Object.entries(accountToMember).filter(([, memberId]) => memberId),
    )
    const { runId } = await post('/api/import/jira/start', {
      projectKeys: chosen.value,
      accountToMember: mapping,
      withWorklogs: withWorklogs.value,
    })

    poll = setInterval(async () => {
      const response = await fetch(`/api/import/${runId}`)
      if (!response.ok) return
      run.value = await response.json()
      if (run.value && run.value.status !== 'running' && poll) {
        clearInterval(poll)
        poll = null
      }
    }, 1000)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Die Migration ließ sich nicht starten.'
  } finally {
    busy.value = ''
  }
}
</script>
