<template>
  <div
    class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Team workload</h3>
        <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          Assigned hours against sprint capacity.
        </p>
      </div>
      <span class="text-theme-xs text-gray-500 dark:text-gray-400">{{ activeSprint?.name ?? "—" }}</span>
    </div>

    <ul class="mt-5 flex flex-col gap-4">
      <li v-for="row in workload" :key="row.member.id" class="flex items-center gap-3">
        <UserAvatar :member="row.member" size="md" />

        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-3">
            <p class="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ row.member.name }}
            </p>
            <p class="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400">
              {{ row.hours }}h / {{ row.capacity }}h · {{ row.issues }} issues
            </p>
          </div>

          <div class="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              class="h-2 rounded-full transition-all"
              :class="barColor(row.utilisation)"
              :style="{ width: `${Math.min(row.utilisation, 100)}%` }"
            ></div>
          </div>
        </div>

        <span
          class="w-14 shrink-0 text-right text-theme-sm font-medium"
          :class="textColor(row.utilisation)"
        >
          {{ row.utilisation }}%
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import UserAvatar from './UserAvatar.vue'
import { usePlanner } from '@/composables/usePlanner'

const { workload, activeSprint } = usePlanner()

const barColor = (utilisation: number) => {
  if (utilisation > 100) return 'bg-error-500'
  if (utilisation > 85) return 'bg-orange-400'
  return 'bg-success-500'
}

const textColor = (utilisation: number) => {
  if (utilisation > 100) return 'text-error-500'
  if (utilisation > 85) return 'text-orange-500'
  return 'text-gray-600 dark:text-gray-300'
}
</script>
