<template>
  <div
    class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Sprint burndown</h3>
        <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          Remaining hours against the ideal line for {{ activeSprint?.name ?? "the sprint" }}.
        </p>
      </div>
      <span
        class="shrink-0 rounded-full px-2.5 py-0.5 text-theme-xs font-medium"
        :class="
          onTrack
            ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500'
            : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
        "
      >
        {{ onTrack ? 'On track' : 'Behind' }}
      </span>
    </div>

    <div class="mt-4 max-w-full overflow-x-auto custom-scrollbar">
      <div class="min-w-[600px]">
        <VueApexCharts type="line" height="290" :options="options" :series="series" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { usePlanner } from '@/composables/usePlanner'

const { burndown, activeSprint } = usePlanner()

const series = computed(() => [
  { name: 'Ideal', data: burndown.value.ideal },
  { name: 'Remaining', data: burndown.value.actual },
])

const onTrack = computed(() => {
  const actual = burndown.value.actual
  const lastIndex = actual.reduce<number>(
    (last, value, index) => (value === null ? last : index),
    0,
  )
  const current = actual[lastIndex]
  return current === null || current <= burndown.value.ideal[lastIndex] + 4
})

const options = computed<ApexOptions>(() => ({
  chart: {
    fontFamily: 'Outfit, sans-serif',
    type: 'line',
    toolbar: { show: false },
  },
  colors: ['#98A2B3', '#465FFF'],
  stroke: { curve: 'straight', width: [2, 3], dashArray: [5, 0] },
  markers: { size: 0, hover: { size: 5 } },
  dataLabels: { enabled: false },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    fontFamily: 'Outfit, sans-serif',
    labels: { colors: '#98A2B3' },
    markers: { shape: 'circle' },
  },
  grid: {
    borderColor: 'rgba(152, 162, 179, 0.2)',
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
  },
  xaxis: {
    categories: burndown.value.categories,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#98A2B3', fontSize: '12px' } },
    tooltip: { enabled: false },
  },
  yaxis: {
    title: { text: 'Hours remaining', style: { color: '#98A2B3', fontWeight: 500 } },
    labels: { style: { colors: '#98A2B3', fontSize: '12px' } },
  },
  tooltip: { y: { formatter: (value: number | null) => (value === null ? '—' : `${value} h`) } },
}))
</script>
