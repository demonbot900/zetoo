<template>
  <ZDrawer
    :open="issue !== null"
    :title="issue?.id ?? 'Issue'"
    :subtitle="subtitle"
    size="xl"
    :tabs="tabs"
    :active-tab="activeTab"
    @update:active-tab="activeTab = $event"
    @close="close"
  >
    <template v-if="issue" #icon>
      <IssueTypeIcon :type="issue.type" size="md" />
    </template>

    <template v-if="issue" #badges>
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-theme-xs font-medium"
        :class="statusColumn ? '' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'"
        :style="statusBadgeStyle"
      >
        <span
          v-if="statusColumn"
          class="h-1.5 w-1.5 rounded-full"
          :style="{ backgroundColor: statusColumn.color }"
        ></span>
        {{ statusLabels[issue.status] ?? issue.status }}
      </span>
      <span class="zt-chip">
        <PriorityIcon :priority="issue.priority" />
        {{ priorityLabels[issue.priority] }}
      </span>
    </template>

    <template v-if="issue">
      <!-- Summary strip, visible on every tab -->
      <div
        class="mb-6 grid gap-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-800 sm:grid-cols-4"
      >
        <div class="flex items-center gap-2.5">
          <UserAvatar :member="assignee" size="sm" />
          <span class="min-w-0">
            <span class="block text-theme-xs text-gray-500 dark:text-gray-400">Assignee</span>
            <span class="block truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ assignee?.name ?? 'Unassigned' }}
            </span>
          </span>
        </div>
        <div v-for="stat in summaryStats" :key="stat.label">
          <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ stat.label }}</span>
          <span
            class="block text-theme-sm font-medium"
            :class="stat.alert ? 'text-error-500' : 'text-gray-800 dark:text-white/90'"
          >
            {{ stat.value }}
          </span>
        </div>
      </div>

      <!-- Details ------------------------------------------------------ -->
      <div v-if="activeTab === 'details'" class="flex flex-col gap-6">
        <div>
          <label for="issue-title" class="zt-label">Summary</label>
          <input
            id="issue-title"
            v-model="issue.title"
            class="w-full rounded-xl border border-gray-200 bg-transparent px-3.5 py-2.5 text-lg font-semibold text-gray-800 outline-none transition-colors focus:border-brand-400 dark:border-gray-800 dark:text-white/90"
          />
        </div>

        <div>
          <label for="issue-description" class="zt-label">Description</label>
          <textarea
            id="issue-description"
            v-model="issue.description"
            rows="4"
            class="zt-textarea"
            placeholder="What has to happen, and how do we know it is done?"
          ></textarea>
        </div>

        <dl class="grid gap-4 sm:grid-cols-2">
          <div>
            <dt class="zt-label">Status</dt>
            <ZSelect
              v-model="issue.status"
              :options="statusOptions"
              aria-label="Status"
              @update:model-value="onStatusChange"
            />
          </div>
          <div>
            <dt class="zt-label">Assignee</dt>
            <ZSelect v-model="issue.assigneeId" :options="assigneeOptions" aria-label="Assignee" />
          </div>
          <div>
            <dt class="zt-label">Priority</dt>
            <ZSelect v-model="issue.priority" :options="priorityOptions" aria-label="Priority" />
          </div>
          <div>
            <dt class="zt-label">Type</dt>
            <ZSelect v-model="issue.type" :options="typeOptions" aria-label="Type" />
          </div>
          <div>
            <dt class="zt-label">Sprint</dt>
            <ZSelect v-model="issue.sprintId" :options="sprintOptions" aria-label="Sprint" />
          </div>
          <div>
            <dt class="zt-label">Epic</dt>
            <ZSelect v-model="issue.epicId" :options="epicOptions" aria-label="Epic" />
          </div>
          <div>
            <dt class="zt-label">Estimate (h)</dt>
            <input v-model.number="issue.estimateHours" type="number" min="0" class="zt-input" />
          </div>
          <div>
            <dt class="zt-label">Story points</dt>
            <input v-model.number="issue.storyPoints" type="number" min="0" class="zt-input" />
          </div>
          <div>
            <dt class="zt-label">Start date</dt>
            <div class="relative">
              <flat-pickr
                v-model="issue.startDate"
                :config="dateConfig"
                class="zt-input pr-9"
                placeholder="Datum wählen"
              />
              <button
                v-if="issue.startDate"
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-theme-xs text-gray-400 hover:text-error-500"
                aria-label="Startdatum entfernen"
                @click="issue.startDate = null"
              >
                &times;
              </button>
            </div>
          </div>
          <div>
            <dt class="zt-label">Due date</dt>
            <div class="relative">
              <flat-pickr
                v-model="issue.dueDate"
                :config="dateConfig"
                class="zt-input pr-9"
                placeholder="Datum wählen"
              />
              <button
                v-if="issue.dueDate"
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-theme-xs text-gray-400 hover:text-error-500"
                aria-label="Fälligkeitsdatum entfernen"
                @click="issue.dueDate = null"
              >
                &times;
              </button>
            </div>
          </div>
        </dl>
      </div>

      <!-- Time --------------------------------------------------------- -->
      <div v-else-if="activeTab === 'time'" class="flex flex-col gap-5">
        <section class="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h3 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              Logged against estimate
            </h3>
            <span class="text-theme-sm text-gray-500 dark:text-gray-400">
              {{ issue.loggedHours }}h / {{ issue.estimateHours }}h
            </span>
          </div>

          <div class="mt-3 h-2.5 rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              class="h-2.5 rounded-full transition-all"
              :class="isOverEstimate ? 'bg-error-500' : 'bg-brand-500'"
              :style="{ width: `${loggedPercent}%` }"
            ></div>
          </div>

          <p
            class="mt-2 text-theme-xs"
            :class="isOverEstimate ? 'text-error-500' : 'text-gray-500 dark:text-gray-400'"
          >
            {{ varianceLabel }}
          </p>
        </section>

        <section class="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
          <h3 class="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            Log time
          </h3>
          <div class="flex flex-wrap items-end gap-3">
            <label class="min-w-32 flex-1">
              <span class="zt-label">Hours</span>
              <input
                v-model.number="hoursToLog"
                type="number"
                min="0"
                step="0.25"
                class="zt-input"
                @keyup.enter="submitTime"
              />
            </label>
            <button
              type="button"
              class="zt-btn-primary"
              :disabled="hoursToLog <= 0"
              @click="submitTime"
            >
              Log time
            </button>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <button
              v-for="preset in [0.25, 0.5, 1, 2, 4, 8]"
              :key="preset"
              type="button"
              class="zt-chip transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/15"
              @click="logPreset(preset)"
            >
              +{{ preset }}h
            </button>
            <button
              v-if="hoursToLog > 0"
              type="button"
              class="text-theme-xs font-medium text-gray-500 hover:text-error-500"
              @click="hoursToLog = 0"
            >
              Zurücksetzen
            </button>
          </div>
          <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
            Die Schnellwahl addiert auf das Feld. Gebucht wird erst mit „Log time" — als ein
            Eintrag im Leistungsnachweis.
          </p>
        </section>
      </div>

      <!-- Checklist ---------------------------------------------------- -->
      <div v-else-if="activeTab === 'checklist'" class="flex flex-col gap-4">
        <div v-if="issue.checklist.length">
          <div
            class="flex items-center justify-between text-theme-xs text-gray-500 dark:text-gray-400"
          >
            <span>{{ checklistDone }} of {{ issue.checklist.length }} done</span>
            <span>{{ checklistPercent }}%</span>
          </div>
          <div class="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              class="h-1.5 rounded-full bg-success-500 transition-all"
              :style="{ width: `${checklistPercent}%` }"
            ></div>
          </div>
        </div>

        <ul class="flex flex-col gap-2">
          <li
            v-for="item in issue.checklist"
            :key="item.id"
            class="group flex items-center gap-3 rounded-xl border border-gray-200 px-3.5 py-2.5 transition-colors hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
          >
            <input
              type="checkbox"
              :checked="item.done"
              class="h-4.5 w-4.5 rounded border-gray-300 text-brand-500 dark:border-gray-700"
              @change="toggleChecklistItem(issue.id, item.id)"
            />
            <span
              class="flex-1 text-theme-sm"
              :class="
                item.done
                  ? 'text-gray-400 line-through dark:text-gray-500'
                  : 'text-gray-700 dark:text-gray-300'
              "
            >
              {{ item.text }}
            </span>
            <button
              type="button"
              class="text-theme-xs text-gray-400 opacity-0 transition-opacity hover:text-error-500 group-hover:opacity-100"
              @click="removeChecklistItem(issue.id, item.id)"
            >
              Remove
            </button>
          </li>
          <li
            v-if="!issue.checklist.length"
            class="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-theme-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
          >
            Break the work down into steps — they show as progress on the board card.
          </li>
        </ul>

        <input
          v-model="checklistDraft"
          type="text"
          placeholder="Add an item and press Enter"
          class="zt-input"
          @keyup.enter="submitChecklistItem"
        />
      </div>

      <!-- Card style ---------------------------------------------------- -->
      <div v-else class="flex flex-col gap-6">
        <section>
          <h3 class="zt-label">Labels</h3>
          <div v-if="issue.labels.length" class="mb-2 flex flex-wrap gap-1.5">
            <span v-for="label in issue.labels" :key="label" class="zt-chip">
              {{ label }}
              <button
                type="button"
                class="text-gray-400 transition-colors hover:text-error-500"
                :aria-label="`Remove ${label}`"
                @click="removeLabel(label)"
              >
                ×
              </button>
            </span>
          </div>
          <input
            v-model="labelDraft"
            type="text"
            placeholder="Add a label and press Enter"
            class="zt-input"
            @keyup.enter="submitLabel"
          />
        </section>

        <section>
          <h3 class="zt-label">Card cover</h3>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-xl border-2 text-theme-sm text-gray-500"
              :class="
                issue.coverColor === ''
                  ? 'border-gray-900 dark:border-white'
                  : 'border-gray-200 dark:border-gray-700'
              "
              title="No cover"
              @click="issue.coverColor = ''"
            >
              ×
            </button>
            <button
              v-for="swatch in columnColors"
              :key="swatch"
              type="button"
              class="h-9 w-9 rounded-xl border-2 transition-transform hover:scale-105"
              :style="{ backgroundColor: swatch }"
              :class="
                issue.coverColor === swatch
                  ? 'border-gray-900 dark:border-white'
                  : 'border-transparent'
              "
              @click="issue.coverColor = swatch"
            ></button>
          </div>
          <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
            Covers can be hidden globally in the appearance customiser.
          </p>
        </section>
      </div>
    </template>

    <template #footer>
      <button
        type="button"
        class="rounded-lg px-4 py-2.5 text-theme-sm font-medium text-error-500 transition-colors hover:bg-error-50 dark:hover:bg-error-500/10"
        @click="remove"
      >
        Delete issue
      </button>
      <button type="button" class="zt-btn-primary py-2.5" @click="close">Done</button>
    </template>
  </ZDrawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IssueTypeIcon from './IssueTypeIcon.vue'
import PriorityIcon from './PriorityIcon.vue'
import UserAvatar from './UserAvatar.vue'
import ZDrawer from '@/components/ui/ZDrawer.vue'
import ZSelect from '@/components/ui/ZSelect.vue'
import {
  columnColors,
  formatDate,
  priorityLabels,
  statusLabels,
  today,
  typeLabels,
  usePlanner,
} from '@/composables/usePlanner'
import { withAlpha } from '@/utils/color'
import flatPickr from 'vue-flatpickr-component'

/**
 * Same picker the rest of the app uses. `altInput` shows the German format
 * while the model keeps the ISO date every other screen expects.
 */
const dateConfig = {
  dateFormat: 'Y-m-d',
  altInput: true,
  altFormat: 'd.m.Y',
  allowInput: true,
  locale: { firstDayOfWeek: 1 },
}

const {
  isDoneStatus,
  selectedIssue,
  selectIssue,
  team,
  sprints,
  epics,
  columns,
  memberById,
  sprintById,
  logTime,
  deleteIssue,
  addChecklistItem,
  toggleChecklistItem,
  removeChecklistItem,
  normaliseOrder,
} = usePlanner()

const issue = selectedIssue
const hoursToLog = ref<number>(0)
const checklistDraft = ref('')
const labelDraft = ref('')
const activeTab = ref('details')

// Every issue opens on its details, never on the tab left over from the last one.
watch(
  () => issue.value?.id,
  () => {
    activeTab.value = 'details'
    hoursToLog.value = 0
    checklistDraft.value = ''
    labelDraft.value = ''
  },
)

const tabs = computed(() => [
  { id: 'details', label: 'Details' },
  { id: 'time', label: 'Time' },
  { id: 'checklist', label: 'Checklist', count: issue.value?.checklist.length },
  { id: 'card', label: 'Card' },
])

const assignee = computed(() => memberById(issue.value?.assigneeId ?? null))

const subtitle = computed(() => {
  if (!issue.value) return ''
  const sprint = sprintById(issue.value.sprintId)
  return `${typeLabels[issue.value.type]} · ${sprint?.name ?? 'Backlog'}`
})

const isOverdue = computed(
  () =>
    issue.value !== null &&
    issue.value.status !== 'done' &&
    issue.value.dueDate !== null &&
    issue.value.dueDate < today,
)

const summaryStats = computed(() => {
  if (!issue.value) return []
  return [
    { label: 'Due', value: formatDate(issue.value.dueDate), alert: isOverdue.value },
    {
      label: 'Time',
      value: `${issue.value.loggedHours}/${issue.value.estimateHours}h`,
      alert: issue.value.loggedHours > issue.value.estimateHours,
    },
    { label: 'Points', value: String(issue.value.storyPoints), alert: false },
  ]
})

const statusOptions = computed(() => [
  ...columns.map((column) => ({ value: column.id, label: column.name, color: column.color })),
  { value: 'backlog', label: 'Backlog' },
])

const priorityOptions = Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))
const typeOptions = Object.entries(typeLabels).map(([value, label]) => ({ value, label }))

const assigneeOptions = computed(() => [
  { value: null, label: 'Unassigned' },
  ...team.map((member) => ({ value: member.id, label: member.name, hint: member.role })),
])

const sprintOptions = computed(() => [
  { value: null, label: 'Backlog' },
  ...sprints.value.map((sprint) => ({ value: sprint.id, label: sprint.name })),
])

const epicOptions = computed(() => [
  { value: null, label: 'None' },
  ...epics.value.map((epic) => ({ value: epic.id, label: epic.name })),
])

const checklistDone = computed(() => issue.value?.checklist.filter((item) => item.done).length ?? 0)

const checklistPercent = computed(() => {
  const total = issue.value?.checklist.length ?? 0
  return total === 0 ? 0 : Math.round((checklistDone.value / total) * 100)
})

const loggedPercent = computed(() => {
  if (!issue.value || issue.value.estimateHours === 0) return 0
  return Math.min(Math.round((issue.value.loggedHours / issue.value.estimateHours) * 100), 100)
})

const isOverEstimate = computed(
  () => issue.value !== null && issue.value.loggedHours > issue.value.estimateHours,
)

const varianceLabel = computed(() => {
  if (!issue.value) return ''
  const delta = Math.round((issue.value.estimateHours - issue.value.loggedHours) * 10) / 10
  if (delta === 0) return 'Exactly on estimate.'
  return delta > 0 ? `${delta}h of the estimate left.` : `${Math.abs(delta)}h over the estimate.`
})

const statusColumn = computed(
  () => columns.find((entry) => entry.id === issue.value?.status) ?? null,
)

/** The badge borrows its column's colour at low opacity so it stays readable. */
const statusBadgeStyle = computed(() =>
  statusColumn.value
    ? {
        backgroundColor: withAlpha(statusColumn.value.color, 0.14),
        color: statusColumn.value.color,
      }
    : {},
)

const submitChecklistItem = () => {
  if (!issue.value) return
  addChecklistItem(issue.value.id, checklistDraft.value)
  checklistDraft.value = ''
}

const submitLabel = () => {
  const label = labelDraft.value.trim()
  if (!issue.value || !label || issue.value.labels.includes(label)) return
  issue.value.labels.push(label)
  labelDraft.value = ''
}

const removeLabel = (label: string) => {
  if (!issue.value) return
  issue.value.labels = issue.value.labels.filter((entry) => entry !== label)
}

const onStatusChange = () => {
  if (!issue.value) return
  issue.value.completedAt = isDoneStatus(issue.value.status) ? today : null
  normaliseOrder(issue.value.status)
}

const submitTime = () => {
  if (!issue.value || hoursToLog.value <= 0) return
  logTime(issue.value.id, hoursToLog.value)
  hoursToLog.value = 0
}

/**
 * Quick buttons add to the pending amount instead of booking on the spot.
 * Clicking +1h three times has to end up as one three-hour line on the
 * Leistungsnachweis, not three.
 */
const logPreset = (hours: number) => {
  hoursToLog.value = Math.round((hoursToLog.value + hours) * 100) / 100
}

const remove = () => {
  if (issue.value) deleteIssue(issue.value.id)
}

const close = () => selectIssue(null)
</script>
