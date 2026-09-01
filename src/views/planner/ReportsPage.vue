<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Reports" />

    <div class="flex flex-col gap-4 md:gap-6">
      <PlannerMetrics />

      <div class="grid gap-4 md:gap-6 xl:grid-cols-2">
        <BurndownChart />
        <VelocityChart />
      </div>

      <div class="grid gap-4 md:gap-6 xl:grid-cols-3">
        <div class="xl:col-span-2">
          <WorkloadPanel />
        </div>

        <section
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Estimate accuracy</h3>
          <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Logged against estimated hours on finished work.
          </p>

          <div class="mt-6 flex items-end gap-3">
            <span class="text-title-sm font-semibold text-gray-800 dark:text-white/90">
              {{ accuracy }}%
            </span>
            <span
              class="mb-1.5 rounded-full px-2.5 py-0.5 text-theme-xs font-medium"
              :class="
                accuracy <= 110
                  ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500'
                  : 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400'
              "
            >
              {{ accuracy <= 110 ? 'Within tolerance' : 'Running long' }}
            </span>
          </div>

          <ul class="mt-6 flex flex-col gap-4">
            <li v-for="row in epicBreakdown" :key="row.id">
              <div class="flex items-center justify-between text-theme-sm">
                <span class="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span class="h-2.5 w-2.5 rounded-full" :class="row.color"></span>
                  {{ row.name }}
                </span>
                <span class="text-gray-500 dark:text-gray-400">
                  {{ row.done }}/{{ row.total }} done
                </span>
              </div>
              <div class="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  class="h-2 rounded-full"
                  :class="row.color"
                  :style="{ width: `${row.percent}%` }"
                ></div>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <IssueDetailPanel />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import PlannerMetrics from '@/components/planner/PlannerMetrics.vue'
import BurndownChart from '@/components/planner/BurndownChart.vue'
import VelocityChart from '@/components/planner/VelocityChart.vue'
import WorkloadPanel from '@/components/planner/WorkloadPanel.vue'
import IssueDetailPanel from '@/components/planner/IssueDetailPanel.vue'
import { usePlanner } from '@/composables/usePlanner'

const { issues, epics } = usePlanner()

const accuracy = computed(() => {
  const done = issues.value.filter((issue) => issue.status === 'done')
  const estimated = done.reduce((sum, issue) => sum + issue.estimateHours, 0)
  const logged = done.reduce((sum, issue) => sum + issue.loggedHours, 0)
  return estimated === 0 ? 0 : Math.round((logged / estimated) * 100)
})

const epicBreakdown = computed(() =>
  epics.value.map((epic) => {
    const list = issues.value.filter((issue) => issue.epicId === epic.id)
    const done = list.filter((issue) => issue.status === 'done').length
    return {
      id: epic.id,
      name: epic.name,
      color: epic.color,
      total: list.length,
      done,
      percent: list.length === 0 ? 0 : Math.round((done / list.length) * 100),
    }
  }),
)
</script>
