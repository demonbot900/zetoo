<template>
  <div class="flex flex-wrap items-end gap-3">
    <div class="min-w-55">
      <label for="period-range" class="zt-label">Zeitraum</label>
      <flat-pickr
        id="period-range"
        v-model="range"
        :config="rangeConfig"
        class="zt-input"
        placeholder="Zeitraum wählen"
      />
    </div>

    <div class="flex flex-wrap gap-2 pb-0.5">
      <button
        v-for="preset in presets"
        :key="preset.label"
        type="button"
        class="rounded-lg border px-3 py-2 text-theme-xs font-medium transition-colors"
        :class="
          isActive(preset.range())
            ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]'
        "
        @click="apply(preset.range())"
      >
        {{ preset.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import flatPickr from 'vue-flatpickr-component'
import {
  currentMonthRange,
  lastMonthRange,
  lastQuarterRange,
  useRecords,
} from '@/composables/useRecords'
import type { Period } from '@/types/records'

const { period, setPeriod } = useRecords()

const toISO = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

/**
 * flatpickr formats a range into one input string using its own separator, so
 * reading that string back is brittle. `onChange` hands over the picked dates
 * as `Date[]` instead — unambiguous, and it only fires with both ends set.
 */
const range = ref<string[]>([period.from, period.to])

const rangeConfig = {
  mode: 'range' as const,
  dateFormat: 'Y-m-d',
  altInput: true,
  altFormat: 'd.m.Y',
  onChange: (dates: Date[]) => {
    if (dates.length < 2) return
    setPeriod({ from: toISO(dates[0]), to: toISO(dates[1]) })
  },
}

// Preset buttons write to the store; mirror that back into the picker.
watch(
  () => [period.from, period.to] as const,
  ([from, to]) => {
    if (range.value[0] !== from || range.value[1] !== to) range.value = [from, to]
  },
)

const presets = [
  { label: 'Vormonat', range: lastMonthRange },
  { label: 'Aktueller Monat', range: currentMonthRange },
  { label: 'Letztes Quartal', range: lastQuarterRange },
]

const isActive = (candidate: Period) => candidate.from === period.from && candidate.to === period.to

const apply = (next: Period) => setPeriod(next)
</script>
