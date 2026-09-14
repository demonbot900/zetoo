<template>
  <div
    class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
  >
    <div>
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Velocity</h3>
      <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
        Committed against completed story points, {{ average }} points average.
      </p>
    </div>

    <div class="mt-4 max-w-full overflow-x-auto custom-scrollbar">
      <div class="min-w-[480px]">
        <VueApexCharts type="bar" height="280" :options="options" :series="series" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { usePlanner } from '@/composables/usePlanner'

const { velocity } = usePlanner()

const series = computed(() => [
  { name: 'Committed', data: velocity.value.committed },
  { name: 'Completed', data: velocity.value.completed },
])

const average = computed(() => {
  const values = velocity.value.completed
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
})

const options = computed<ApexOptions>(() => ({
  chart: { fontFamily: 'Outfit, sans-serif', type: 'bar', toolbar: { show: false } },
  colors: ['#C2D6FF', '#465FFF'],
  plotOptions: { bar: { columnWidth: '45%', borderRadius: 5, borderRadiusApplication: 'end' } },
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
  },
  xaxis: {
    categories: velocity.value.categories,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#98A2B3', fontSize: '12px' } },
  },
  yaxis: {
    title: { text: 'Story points', style: { color: '#98A2B3', fontWeight: 500 } },
    labels: { style: { colors: '#98A2B3', fontSize: '12px' } },
  },
  tooltip: { y: { formatter: (value: number) => `${value} pts` } },
}))
</script>
