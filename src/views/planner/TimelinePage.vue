<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Timeline" />

    <BoardPicker v-if="!activeBoard" />

    <div v-else
      class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <header
        class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800"
      >
        <div>
          <h2 class="font-semibold text-gray-800 dark:text-white/90">Delivery timeline</h2>
          <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(range.start, longDate) }} – {{ formatDate(range.end, longDate) }} ·
            grouped by epic
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <span
            v-for="epic in epics"
            :key="epic.id"
            class="inline-flex items-center gap-2 text-theme-xs text-gray-600 dark:text-gray-300"
          >
            <span class="h-2.5 w-2.5 rounded-full" :class="epic.color"></span>
            {{ epic.name }}
          </span>
        </div>
      </header>

      <div class="max-w-full overflow-x-auto custom-scrollbar">
        <div class="min-w-max">
          <!-- Month / day scale -->
          <div class="flex border-b border-gray-200 dark:border-gray-800">
            <div
              class="sticky left-0 z-2 w-64 shrink-0 border-r border-gray-200 bg-white px-5 py-3 text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:bg-gray-900"
            >
              Issue
            </div>
            <div class="flex">
              <div
                v-for="day in days"
                :key="day.date"
                class="shrink-0 border-r border-gray-100 py-2 text-center dark:border-gray-800/60"
                :class="[
                  dayWidthClass,
                  day.isWeekend ? 'bg-gray-50 dark:bg-white/[0.02]' : '',
                  day.isToday ? 'bg-brand-50 dark:bg-brand-500/10' : '',
                ]"
              >
                <p class="text-theme-xs text-gray-400">{{ day.weekday }}</p>
                <p
                  class="text-theme-xs font-medium"
                  :class="
                    day.isToday
                      ? 'text-brand-500 dark:text-brand-400'
                      : 'text-gray-600 dark:text-gray-300'
                  "
                >
                  {{ day.dayNumber }}
                </p>
              </div>
            </div>
          </div>

          <!-- Nothing to lay out yet -->
          <p
            v-if="!lanes.length"
            class="sticky left-0 px-5 py-16 text-center text-theme-sm text-gray-500 dark:text-gray-400"
          >
            Keine terminierten Vorgänge. Setze auf einem Vorgang ein Start- und ein Fälligkeitsdatum,
            damit er hier erscheint.
          </p>

          <!-- Lanes -->
          <div v-for="lane in lanes" :key="lane.id">
            <div
              class="flex border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]"
            >
              <div
                class="sticky left-0 z-2 flex w-64 shrink-0 items-center gap-2 border-r border-gray-200 bg-gray-50 px-5 py-2.5 dark:border-gray-800 dark:bg-gray-900"
              >
                <span class="h-2.5 w-2.5 rounded-full" :class="lane.color"></span>
                <span class="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ lane.name }}
                </span>
              </div>
              <div :style="{ width: `${days.length * dayWidth}px` }"></div>
            </div>

            <div
              v-for="issue in lane.issues"
              :key="issue.id"
              class="flex border-b border-gray-100 dark:border-gray-800/60"
            >
              <button
                type="button"
                class="sticky left-0 z-2 flex w-64 shrink-0 items-center gap-2 border-r border-gray-200 bg-white px-5 py-2.5 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-white/[0.03]"
                @click="selectIssue(issue.id)"
              >
                <IssueTypeIcon :type="issue.type" />
                <span class="truncate text-theme-sm text-gray-700 dark:text-gray-300">
                  {{ issue.title }}
                </span>
              </button>

              <div class="relative flex" :style="{ width: `${days.length * dayWidth}px` }">
                <div
                  v-for="day in days"
                  :key="day.date"
                  class="shrink-0 border-r border-gray-100 dark:border-gray-800/60"
                  :class="[
                    dayWidthClass,
                    day.isWeekend ? 'bg-gray-50 dark:bg-white/[0.02]' : '',
                    day.isToday ? 'bg-brand-50/60 dark:bg-brand-500/10' : '',
                  ]"
                ></div>

                <button
                  type="button"
                  class="absolute top-1.5 flex h-7 items-center gap-2 rounded-md px-2.5 text-theme-xs font-medium text-white transition-opacity hover:opacity-90"
                  :class="barColor(issue)"
                  :style="barStyle(issue)"
                  @click="selectIssue(issue.id)"
                >
                  <span class="truncate">{{ issue.id }}</span>
                  <UserAvatar
                    v-if="memberById(issue.assigneeId)"
                    :member="memberById(issue.assigneeId)"
                    size="xs"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <IssueDetailPanel />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BoardPicker from '@/components/planner/BoardPicker.vue'
import IssueTypeIcon from '@/components/planner/IssueTypeIcon.vue'
import UserAvatar from '@/components/planner/UserAvatar.vue'
import IssueDetailPanel from '@/components/planner/IssueDetailPanel.vue'
import { addDays, daysBetween, formatDate, today, usePlanner } from '@/composables/usePlanner'
import type { Issue } from '@/types/planner'

const { issues, epics, memberById, selectIssue, activeBoard } = usePlanner()

const dayWidth = 44
const dayWidthClass = 'w-11'
const longDate: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }

const scheduled = computed(() =>
  issues.value.filter((issue) => issue.startDate !== null && issue.dueDate !== null),
)

const range = computed(() => {
  const starts = scheduled.value.map((issue) => issue.startDate!)
  const ends = scheduled.value.map((issue) => issue.dueDate!)
  const start = starts.length ? starts.reduce((a, b) => (a < b ? a : b)) : today
  const end = ends.length ? ends.reduce((a, b) => (a > b ? a : b)) : addDays(today, 14)
  return { start: addDays(start, -1), end: addDays(end, 1) }
})

const days = computed(() => {
  const total = daysBetween(range.value.start, range.value.end) + 1
  return Array.from({ length: total }, (_, index) => {
    const date = addDays(range.value.start, index)
    const parsed = new Date(`${date}T00:00:00`)
    return {
      date,
      weekday: parsed.toLocaleDateString('en-US', { weekday: 'narrow' }),
      dayNumber: parsed.getDate(),
      isWeekend: parsed.getDay() === 0 || parsed.getDay() === 6,
      isToday: date === today,
    }
  })
})

/**
 * One lane per epic, plus a catch-all.
 *
 * Epics are optional, so grouping by them alone hides every issue in a
 * workspace that does not use them — which is every new workspace.
 */
const lanes = computed(() => {
  const known = new Set(epics.value.map((epic) => epic.id))

  const epicLanes = epics.value.map((epic) => ({
    id: epic.id,
    name: epic.name,
    color: epic.color,
    issues: scheduled.value.filter((issue) => issue.epicId === epic.id),
  }))

  const loose = scheduled.value.filter(
    (issue) => issue.epicId === null || !known.has(issue.epicId),
  )

  return [
    ...epicLanes,
    { id: '__none__', name: 'Ohne Epic', color: 'bg-gray-400', issues: loose },
  ].filter((lane) => lane.issues.length > 0)
})

const barStyle = (issue: Issue) => {
  const offset = daysBetween(range.value.start, issue.startDate!)
  const span = Math.max(daysBetween(issue.startDate!, issue.dueDate!) + 1, 1)
  return {
    left: `${offset * dayWidth + 4}px`,
    width: `${span * dayWidth - 8}px`,
  }
}

const barColor = (issue: Issue) => {
  if (issue.status === 'done') return 'bg-success-500'
  if (issue.dueDate !== null && issue.dueDate < today) return 'bg-error-500'
  if (issue.status === 'in_progress') return 'bg-brand-500'
  return 'bg-brand-400'
}
</script>
