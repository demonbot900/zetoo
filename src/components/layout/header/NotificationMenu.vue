<template>
  <div ref="dropdownRef" class="relative">
    <button
      class="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      :aria-label="`${alerts.length} offene Hinweise`"
      @click="toggleDropdown"
    >
      <span
        v-if="alerts.length"
        class="absolute right-0 top-0.5 z-1 flex h-2 w-2 rounded-full"
        :class="hasOverdue ? 'bg-error-500' : 'bg-orange-400'"
      >
        <span
          class="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full opacity-75"
          :class="hasOverdue ? 'bg-error-500' : 'bg-orange-400'"
        ></span>
      </span>
      <svg
        class="fill-current"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
          fill=""
        />
      </svg>
    </button>

    <div
      v-if="dropdownOpen"
      class="absolute right-0 mt-[17px] flex max-h-[70dvh] w-[calc(100vw-1.5rem)] max-w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] sm:max-w-none"
    >
      <div
        class="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800"
      >
        <h5 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ t('nav.alerts') }}</h5>
        <button
          class="text-gray-500 dark:text-gray-400"
          :aria-label="t('action.close')"
          @click="closeDropdown"
        >
          <svg
            class="fill-current"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
              fill=""
            />
          </svg>
        </button>
      </div>

      <ul class="custom-scrollbar flex h-auto flex-col overflow-y-auto">
        <li v-for="alert in alerts" :key="alert.issue.id">
          <RouterLink
            to="/issues"
            class="flex gap-3 rounded-lg border-b border-gray-100 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
            @click="closeDropdown"
          >
            <span
              class="mt-0.5 block h-2.5 w-2.5 shrink-0 rounded-full"
              :class="alert.overdue ? 'bg-error-500' : 'bg-orange-400'"
            ></span>

            <span class="block">
              <span class="mb-1.5 block text-theme-sm text-gray-500 dark:text-gray-400">
                <span class="font-medium text-gray-800 dark:text-white/90">
                  {{ alert.issue.title }}
                </span>
              </span>
              <span class="flex items-center gap-2 text-theme-xs text-gray-500 dark:text-gray-400">
                <span :class="alert.overdue ? 'text-error-500' : ''">{{ alert.label }}</span>
                <span class="h-1 w-1 rounded-full bg-gray-400"></span>
                <span>{{ assigneeName(alert.issue.assigneeId) }}</span>
              </span>
            </span>
          </RouterLink>
        </li>

        <li v-if="!alerts.length" class="px-4.5 py-10 text-center">
          <p class="text-theme-sm text-gray-500 dark:text-gray-400">
            Keine offenen Fristen. Alles im Plan.
          </p>
        </li>
      </ul>

      <RouterLink
        to="/issues"
        class="mt-3 flex justify-center rounded-lg border border-gray-300 bg-white p-3 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
        @click="closeDropdown"
      >
        Alle Vorgänge öffnen
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { formatDate, today, usePlanner } from '@/composables/usePlanner'
import { useLocale } from '@/composables/useLocale'
import type { Issue } from '@/types/planner'

/**
 * Deadline alerts drawn from the board — overdue issues first, then what is
 * coming up. There is no separate notification feed in the app, so this is the
 * real signal rather than a stored inbox.
 */
const { overdueIssues, upcomingDeadlines, memberById } = usePlanner()
const { t } = useLocale()

const dropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const dayLabel = (dueDate: string): string => {
  const days = Math.round((Date.parse(dueDate) - Date.parse(today)) / 86_400_000)
  if (days < 0) return `${Math.abs(days)} Tage überfällig`
  if (days === 0) return 'Heute fällig'
  if (days === 1) return 'Morgen fällig'
  return `Fällig am ${formatDate(dueDate)}`
}

const alerts = computed(() => {
  const overdue = overdueIssues.value.map((issue) => ({
    issue,
    overdue: true,
    label: dayLabel(issue.dueDate as string),
  }))
  const seen = new Set(overdue.map((entry) => entry.issue.id))
  const upcoming = upcomingDeadlines.value
    .filter((issue) => !seen.has(issue.id))
    .map((issue) => ({ issue, overdue: false, label: dayLabel(issue.dueDate as string) }))

  return [...overdue, ...upcoming].slice(0, 8)
})

const hasOverdue = computed(() => alerts.value.some((alert) => alert.overdue))

const assigneeName = (assigneeId: Issue['assigneeId']): string =>
  memberById(assigneeId)?.name ?? 'Nicht zugewiesen'

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) closeDropdown()
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
