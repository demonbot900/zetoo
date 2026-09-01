<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
    <div
      v-for="metric in metrics"
      :key="metric.label"
      class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
    >
      <span class="flex h-12 w-12 items-center justify-center rounded-xl" :class="metric.iconClass">
        <svg class="fill-current" width="22" height="22" viewBox="0 0 20 20">
          <path :d="metric.path" />
        </svg>
      </span>

      <div class="mt-5 flex items-end justify-between gap-2">
        <div>
          <p class="text-theme-sm text-gray-500 dark:text-gray-400">{{ metric.label }}</p>
          <h4 class="mt-1.5 text-title-sm font-semibold text-gray-800 dark:text-white/90">
            {{ metric.value }}
          </h4>
        </div>
        <span
          class="rounded-full px-2.5 py-0.5 text-theme-xs font-medium"
          :class="metric.badgeClass"
        >
          {{ metric.badge }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlanner } from '@/composables/usePlanner'

const { sprintTotals, sprintDays, overdueIssues, workload } = usePlanner()

const neutral = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
const good = 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500'
const bad = 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'

const overloaded = computed(() => workload.value.filter((row) => row.utilisation > 100).length)

const metrics = computed(() => [
  {
    label: 'Sprint progress',
    value: `${sprintTotals.value.done}/${sprintTotals.value.issues}`,
    badge: `${sprintDays.value.remaining}d left`,
    badgeClass: neutral,
    iconClass: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
    path: 'M4.5 3.5h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Zm8.7 3.9a.9.9 0 0 0-1.3-1.25l-3.2 3.3-1.5-1.5A.9.9 0 0 0 5.9 9.2l2.1 2.15a.9.9 0 0 0 1.3 0l3.9-3.95Z',
  },
  {
    label: 'Hours remaining',
    value: `${sprintTotals.value.remaining}h`,
    badge: `${sprintTotals.value.logged}h logged`,
    badgeClass: neutral,
    iconClass: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15',
    path: 'M10 1.7a8.3 8.3 0 1 0 0 16.6 8.3 8.3 0 0 0 0-16.6Zm.75 4.05a.75.75 0 0 0-1.5 0V10c0 .28.16.54.41.67l3 1.5a.75.75 0 1 0 .68-1.34l-2.59-1.3V5.75Z',
  },
  {
    label: 'Overdue issues',
    value: `${overdueIssues.value.length}`,
    badge: overdueIssues.value.length === 0 ? 'Clear' : 'Needs attention',
    badgeClass: overdueIssues.value.length === 0 ? good : bad,
    iconClass: 'bg-error-50 text-error-500 dark:bg-error-500/15',
    path: 'M10 1.7 1.7 17.3h16.6L10 1.7Zm.75 5.55v5h-1.5v-5h1.5Zm-.75 8.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
  },
  {
    label: 'Over capacity',
    value: `${overloaded.value}`,
    badge: overloaded.value === 0 ? 'Balanced' : 'Rebalance',
    badgeClass: overloaded.value === 0 ? good : bad,
    iconClass: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
    path: 'M7 9.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Zm7.5.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM7 11c-3 0-5.5 1.7-5.5 3.9V17h11v-2.1C12.5 12.7 10 11 7 11Zm7.5.5c-.6 0-1.2.07-1.74.2A5.2 5.2 0 0 1 14 14.9V17h4.5v-1.9c0-1.9-1.9-3.6-4-3.6Z',
  },
])
</script>
