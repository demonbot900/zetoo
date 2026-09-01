<template>
  <div
    class="sidebar-widget mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 dark:bg-white/[0.03]"
  >
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-theme-sm font-semibold text-gray-900 dark:text-white">
        {{ activeSprint.name }}
      </h3>
      <span
        class="rounded-full bg-brand-50 px-2 py-0.5 text-theme-xs font-medium text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
      >
        Active
      </span>
    </div>

    <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
      {{ sprintDays.remaining }} of {{ sprintDays.total }} days left · {{ sprintTotals.remaining }}h
      remaining
    </p>

    <div class="mt-3 h-2 rounded-full bg-gray-200 dark:bg-gray-800">
      <div class="h-2 rounded-full bg-success-500" :style="{ width: `${percentDone}%` }"></div>
    </div>

    <router-link
      to="/backlog"
      class="mt-4 flex items-center justify-center rounded-lg bg-brand-500 p-2.5 text-theme-sm font-medium text-white transition-colors hover:bg-brand-600"
    >
      Plan next sprint
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlanner } from '@/composables/usePlanner'

const { activeSprint, sprintTotals, sprintDays } = usePlanner()

const percentDone = computed(() =>
  sprintTotals.value.issues === 0
    ? 0
    : Math.round((sprintTotals.value.done / sprintTotals.value.issues) * 100),
)
</script>
