<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Benachrichtigungen" />

    <div class="mx-auto flex max-w-3xl flex-col gap-4 md:gap-6">
      <!-- Google Chat ---------------------------------------------------- -->
      <section class="zt-card p-5 sm:p-6">
        <h3 class="font-semibold text-gray-800 dark:text-white/90">Google Chat verbinden</h3>
        <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          Zetoo schickt die Erinnerung in einen Chat-Bereich deiner Wahl.
        </p>

        <details class="mt-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <summary class="cursor-pointer text-theme-sm font-medium text-brand-500">
            Wie komme ich an die Adresse?
          </summary>
          <ol class="mt-3 list-decimal space-y-1.5 pl-5 text-theme-sm text-gray-600 dark:text-gray-300">
            <li>In Google Chat einen Bereich öffnen oder anlegen.</li>
            <li>Oben auf den Bereichsnamen klicken → <strong>Apps und Integrationen</strong>.</li>
            <li><strong>Webhooks verwalten</strong> → Namen vergeben → <strong>Speichern</strong>.</li>
            <li>Die erzeugte Adresse kopieren und hier einfügen.</li>
          </ol>
          <p class="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
            Eingehende Webhooks gibt es nur in <strong>Google Workspace</strong>. Mit einem privaten
            Gmail-Konto fehlt der Menüpunkt — die Erinnerung erscheint dann nur hier in Zetoo.
          </p>
        </details>

        <div class="mt-4">
          <label for="chat-webhook" class="zt-label">Webhook-Adresse</label>
          <input
            id="chat-webhook"
            v-model="webhook"
            type="url"
            class="zt-input font-mono text-theme-xs"
            :placeholder="settings.hasWebhook ? settings.chatWebhook : 'https://chat.googleapis.com/v1/spaces/…'"
          />
          <p class="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
            <span v-if="settings.hasWebhook" class="text-success-600">Hinterlegt.</span>
            Wird nie zurückgegeben, nur ersetzt — wer die Adresse hat, kann in den Bereich schreiben.
          </p>
        </div>
      </section>

      <!-- Reminder ------------------------------------------------------- -->
      <section class="zt-card p-5 sm:p-6">
        <label class="flex cursor-pointer items-start justify-between gap-4">
          <span>
            <span class="block font-semibold text-gray-800 dark:text-white/90">
              Erinnerung am Tagesende
            </span>
            <span class="mt-1 block text-theme-sm text-gray-500 dark:text-gray-400">
              Nur wenn für den Tag noch nichts erfasst ist. Höchstens eine Nachricht pro Tag.
            </span>
          </span>
          <span class="relative mt-1 inline-flex shrink-0">
            <input v-model="reminderEnabled" type="checkbox" class="peer sr-only" />
            <span
              class="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-brand-500 dark:bg-gray-700"
            ></span>
            <span
              class="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"
            ></span>
          </span>
        </label>

        <div v-if="reminderEnabled" class="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label for="reminder-time" class="zt-label">Uhrzeit</label>
            <input id="reminder-time" v-model="reminderTime" type="time" class="zt-input" />
            <p class="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
              In deiner Zeitzone{{ timezone ? ` (${timezone})` : '' }}.
            </p>
          </div>
          <div>
            <span class="zt-label">An diesen Tagen</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="day in WEEKDAYS"
                :key="day.value"
                type="button"
                class="rounded-lg border px-2.5 py-1.5 text-theme-xs font-medium transition-colors"
                :class="
                  reminderDays.includes(day.value)
                    ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15'
                    : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                "
                @click="toggleDay(day.value)"
              >
                {{ day.label }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Standing ------------------------------------------------------- -->
      <section v-if="me" class="zt-card p-5 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="font-semibold text-gray-800 dark:text-white/90">
              Level {{ me.level }} · {{ me.levelName }}
            </h3>
            <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              {{ me.points }} Punkte · Serie {{ me.streak }}
              {{ me.streak === 1 ? 'Tag' : 'Tage' }} · {{ me.coverage }}% der Arbeitstage erfasst
            </p>
          </div>
          <RouterLink to="/leaderboard" class="zt-btn-ghost py-2.5">Rangliste</RouterLink>
        </div>
        <div v-if="me.nextAt" class="mt-4">
          <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              class="h-2 rounded-full bg-brand-500"
              :style="{ width: `${Math.min(100, Math.round((me.points / me.nextAt) * 100))}%` }"
            ></div>
          </div>
          <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
            Noch {{ me.nextAt - me.points }} Punkte bis zum nächsten Level.
          </p>
        </div>
      </section>

      <!-- Actions -------------------------------------------------------- -->
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" class="zt-btn-primary py-2.5" :disabled="busy !== ''" @click="save">
          {{ busy === 'save' ? 'Speichere…' : 'Speichern' }}
        </button>
        <button
          type="button"
          class="zt-btn-ghost py-2.5"
          :disabled="busy !== ''"
          @click="sendTest"
        >
          {{ busy === 'test' ? 'Sende…' : 'Testnachricht senden' }}
        </button>
        <span v-if="note" class="text-theme-sm text-success-600">{{ note }}</span>
        <span v-if="error" class="text-theme-sm text-error-500">{{ error }}</span>
      </div>

      <!-- History -------------------------------------------------------- -->
      <section v-if="recent.length" class="zt-card">
        <header class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h3 class="font-semibold text-gray-800 dark:text-white/90">Zuletzt gesendet</h3>
        </header>
        <ul class="divide-y divide-gray-100 dark:divide-gray-800/60">
          <li v-for="item in recent" :key="item.id" class="px-5 py-3">
            <div class="flex items-center justify-between gap-3">
              <span class="text-theme-sm text-gray-800 dark:text-white/90">{{ item.title }}</span>
              <span class="zt-chip">{{ item.channel === 'chat' ? 'Google Chat' : 'In Zetoo' }}</span>
            </div>
            <p class="mt-1 whitespace-pre-line text-theme-xs text-gray-500 dark:text-gray-400">
              {{ item.body }}
            </p>
          </li>
        </ul>
      </section>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useWorkspace } from '@/composables/useWorkspace'

interface Settings {
  chatWebhook: string
  hasWebhook: boolean
  reminderEnabled: boolean
  reminderTime: string
  reminderDays: number[]
}
interface Notice {
  id: string
  title: string
  body: string
  channel: string
}
interface Score {
  memberId: string
  name: string
  levelName: string
  points: number
  level: number
  streak: number
  coverage: number
  nextAt: number | null
}

const WEEKDAYS = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 7, label: 'So' },
]

const { currentUser } = useWorkspace()

const settings = ref<Settings>({
  chatWebhook: '',
  hasWebhook: false,
  reminderEnabled: false,
  reminderTime: '17:00',
  reminderDays: [1, 2, 3, 4, 5],
})
const webhook = ref('')
const reminderEnabled = ref(false)
const reminderTime = ref('17:00')
const reminderDays = ref<number[]>([1, 2, 3, 4, 5])
const recent = ref<Notice[]>([])
const me = ref<Score | null>(null)
const timezone = ref('')
const busy = ref<'save' | 'test' | ''>('')
const note = ref('')
const error = ref('')

const toggleDay = (value: number) => {
  reminderDays.value = reminderDays.value.includes(value)
    ? reminderDays.value.filter((day) => day !== value)
    : [...reminderDays.value, value].sort()
}

const load = async () => {
  const response = await fetch('/api/me/notifications')
  if (!response.ok) return
  const data = (await response.json()) as { settings: Settings; recent: Notice[] }
  settings.value = data.settings
  reminderEnabled.value = data.settings.reminderEnabled
  reminderTime.value = data.settings.reminderTime
  reminderDays.value = data.settings.reminderDays
  recent.value = data.recent
  timezone.value = currentUser.value?.timezone ?? ''

  const board = await fetch('/api/leaderboard')
  if (board.ok) {
    const rows = ((await board.json()) as { rows: Score[] }).rows
    me.value = rows.find((row) => row.memberId === currentUser.value?.id) ?? null
  }
}

const save = async () => {
  busy.value = 'save'
  note.value = ''
  error.value = ''
  try {
    const body: Record<string, unknown> = {
      reminderEnabled: reminderEnabled.value,
      reminderTime: reminderTime.value,
      reminderDays: reminderDays.value,
    }
    // Only send the webhook when something was typed: an empty field means
    // "leave it as it is", not "delete it".
    if (webhook.value.trim()) body.chatWebhook = webhook.value.trim()

    const response = await fetch('/api/me/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Speichern fehlgeschlagen.')
    settings.value = data.settings
    webhook.value = ''
    note.value = 'Gespeichert.'
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Speichern fehlgeschlagen.'
  } finally {
    busy.value = ''
  }
}

const sendTest = async () => {
  busy.value = 'test'
  note.value = ''
  error.value = ''
  try {
    const response = await fetch('/api/me/notifications/test', { method: 'POST' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Test fehlgeschlagen.')
    note.value =
      data.channel === 'chat' ? 'In Google Chat zugestellt.' : 'In Zetoo abgelegt — kein Webhook aktiv.'
    if (data.error) error.value = `Google Chat: ${data.error}`
    await load()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Test fehlgeschlagen.'
  } finally {
    busy.value = ''
  }
}

onMounted(load)
</script>
