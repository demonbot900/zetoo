<template>
  <div class="overflow-x-auto">
    <table class="min-w-full">
      <thead>
        <tr class="border-b border-gray-200 dark:border-gray-800">
          <th
            v-for="column in columns"
            :key="column.key"
            class="px-4 py-3 text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
            :class="column.align === 'right' ? 'text-right' : 'text-left'"
          >
            {{ column.label }}
          </th>
          <th v-if="editable" class="px-4 py-3 text-right">
            <span class="sr-only">Aktionen</span>
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="entry in entries"
          :key="entry.id"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800/60"
        >
          <td class="whitespace-nowrap px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">
            {{ formatDateDE(entry.date) }}
          </td>
          <td class="whitespace-nowrap px-4 py-3">
            <span class="zt-chip">{{ entry.category }}</span>
          </td>
          <td
            class="whitespace-nowrap px-4 py-3 text-right text-theme-sm tabular-nums text-gray-800 dark:text-white/90"
          >
            {{ formatHours(entry.hours) }}
          </td>
          <td class="whitespace-nowrap px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">
            {{ memberName(entry.memberId) }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-400">
            <span v-if="entry.description">{{ entry.description }}</span>
            <span v-else class="text-gray-400 dark:text-gray-600">—</span>
            <RouterLink
              v-if="entry.issueId"
              :to="'/issues'"
              class="ml-2 text-theme-xs text-brand-500 hover:text-brand-600"
            >
              aus Vorgang
            </RouterLink>
          </td>
          <td v-if="editable" class="whitespace-nowrap px-4 py-3 text-right">
            <div class="inline-flex gap-1">
              <button
                type="button"
                class="rounded-lg px-2 py-1 text-theme-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05]"
                @click="$emit('edit', entry)"
              >
                Bearbeiten
              </button>
              <button
                type="button"
                class="rounded-lg px-2 py-1 text-theme-xs font-medium text-gray-500 transition-colors hover:bg-error-50 hover:text-error-600 dark:text-gray-400 dark:hover:bg-error-500/15"
                @click="$emit('remove', entry)"
              >
                Löschen
              </button>
            </div>
          </td>
        </tr>

        <tr v-if="!entries.length">
          <td
            :colspan="editable ? columns.length + 1 : columns.length"
            class="px-4 py-10 text-center text-theme-sm text-gray-500 dark:text-gray-400"
          >
            Für diesen Zeitraum sind keine Leistungen erfasst.
          </td>
        </tr>
      </tbody>

      <tfoot v-if="entries.length">
        <tr class="border-t-2 border-gray-200 dark:border-gray-700">
          <td
            colspan="2"
            class="px-4 py-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90"
          >
            Gesamtstunden
          </td>
          <td
            class="px-4 py-3 text-right text-theme-sm font-semibold tabular-nums text-gray-800 dark:text-white/90"
          >
            {{ formatHours(total) }}
          </td>
          <td :colspan="editable ? 3 : 2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatDateDE, formatHours, useRecords } from '@/composables/useRecords'
import type { TimeEntry } from '@/types/records'

withDefaults(
  defineProps<{ entries: TimeEntry[]; total: number; editable?: boolean }>(),
  { editable: false },
)

defineEmits<{ edit: [entry: TimeEntry]; remove: [entry: TimeEntry] }>()

const { memberName } = useRecords()

// Column order mirrors the sample document so the preview reads like the export.
const columns = [
  { key: 'date', label: 'Datum' },
  { key: 'category', label: 'Kategorie' },
  { key: 'hours', label: 'Dauer in Stunden', align: 'right' as const },
  { key: 'member', label: 'Name des Mitarbeitenden' },
  { key: 'description', label: 'Durchgeführte Arbeiten' },
]
</script>
