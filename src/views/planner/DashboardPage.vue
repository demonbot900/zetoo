<template>
  <AdminLayout>
    <div class="flex flex-col gap-4 md:gap-6">
      <SprintHeader @create="isCreateOpen = true" />

      <PlannerMetrics />

      <div class="grid gap-4 md:gap-6 xl:grid-cols-3">
        <div class="xl:col-span-2">
          <BurndownChart />
        </div>
        <WorkloadPanel />
      </div>

      <div class="grid gap-4 md:gap-6 xl:grid-cols-3">
        <!-- My work -->
        <section
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
        >
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">My work</h3>
            <ZSelect
              v-model="currentUserId"
              :options="memberOptions"
              aria-label="Select team member"
              size="sm"
              class="w-48"
            />
          </div>

          <ul class="mt-5 flex flex-col gap-3">
            <li v-for="issue in myWork" :key="issue.id">
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition-colors hover:border-brand-300 dark:border-gray-800 dark:hover:border-brand-500/50"
                @click="selectIssue(issue.id)"
              >
                <IssueTypeIcon :type="issue.type" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-theme-sm text-gray-800 dark:text-white/90">
                    {{ issue.title }}
                  </span>
                  <span class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                    {{ issue.id }} · {{ statusLabels[issue.status] }} · {{ issue.loggedHours }}/{{
                      issue.estimateHours
                    }}h
                  </span>
                </span>
                <PriorityIcon :priority="issue.priority" />
              </button>
            </li>
            <li
              v-if="myWork.length === 0"
              class="py-6 text-center text-theme-sm text-gray-400 dark:text-gray-500"
            >
              Nothing assigned in this sprint.
            </li>
          </ul>
        </section>

        <!-- Due next -->
        <section
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Due next</h3>
          <ul class="mt-5 flex flex-col gap-4">
            <li
              v-for="issue in upcomingDeadlines"
              :key="issue.id"
              class="flex cursor-pointer items-center gap-3"
              @click="selectIssue(issue.id)"
            >
              <span
                class="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-theme-xs font-medium"
                :class="
                  issue.dueDate! < today
                    ? 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                "
              >
                {{ formatDate(issue.dueDate, { day: 'numeric' }) }}
                <span class="text-[10px] uppercase">
                  {{ formatDate(issue.dueDate, { month: 'short' }) }}
                </span>
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-theme-sm text-gray-800 dark:text-white/90">
                  {{ issue.title }}
                </span>
                <span class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                  {{ issue.id }} · {{ memberById(issue.assigneeId)?.name ?? 'Unassigned' }}
                </span>
              </span>
              <UserAvatar :member="memberById(issue.assigneeId)" size="xs" />
            </li>
          </ul>
        </section>

        <!-- Status breakdown -->
        <section
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Sprint breakdown</h3>
          <ul class="mt-5 flex flex-col gap-4">
            <li v-for="column in statusColumns" :key="column.id">
              <div class="flex items-center justify-between text-theme-sm">
                <span class="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span
                    class="h-2 w-2 rounded-full"
                    :style="{ backgroundColor: column.color }"
                  ></span>
                  {{ column.name }}
                </span>
                <span class="text-gray-500 dark:text-gray-400">
                  {{ countFor(column.id) }} · {{ hoursFor(column.id) }}h
                </span>
              </div>
              <div class="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  class="h-2 rounded-full"
                  :style="{ backgroundColor: column.color, width: `${sharePercent(column.id)}%` }"
                ></div>
              </div>
            </li>
          </ul>

          <router-link
            to="/board"
            class="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-300 py-2.5 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            Open the board
          </router-link>
        </section>
      </div>
    </div>

    <NewIssueModal :open="isCreateOpen" @close="isCreateOpen = false" @created="selectIssue" />
    <IssueDetailPanel />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import ZSelect from '@/components/ui/ZSelect.vue'
import SprintHeader from '@/components/planner/SprintHeader.vue'
import PlannerMetrics from '@/components/planner/PlannerMetrics.vue'
import BurndownChart from '@/components/planner/BurndownChart.vue'
import WorkloadPanel from '@/components/planner/WorkloadPanel.vue'
import IssueTypeIcon from '@/components/planner/IssueTypeIcon.vue'
import PriorityIcon from '@/components/planner/PriorityIcon.vue'
import UserAvatar from '@/components/planner/UserAvatar.vue'
import IssueDetailPanel from '@/components/planner/IssueDetailPanel.vue'
import NewIssueModal from '@/components/planner/NewIssueModal.vue'
import {
  formatDate,
  statusColumns,
  statusLabels,
  today,
  usePlanner,
} from '@/composables/usePlanner'
import type { IssueStatus } from '@/types/planner'

const { team, sprintIssues, sprintTotals, upcomingDeadlines, memberById, selectIssue } =
  usePlanner()

const currentUserId = ref('u2')

const memberOptions = computed(() =>
  team.map((member) => ({ value: member.id, label: member.name, hint: member.role })),
)

// Fall back to the first person when the seeded id is not in this workspace.
watch(
  team,
  (list) => {
    if (list.length && !list.some((member) => member.id === currentUserId.value)) {
      currentUserId.value = list[0].id
    }
  },
  { immediate: true },
)
const isCreateOpen = ref(false)

const myWork = computed(() =>
  sprintIssues.value
    .filter((issue) => issue.assigneeId === currentUserId.value && issue.status !== 'done')
    .slice(0, 5),
)

const countFor = (status: IssueStatus) =>
  sprintIssues.value.filter((issue) => issue.status === status).length

const hoursFor = (status: IssueStatus) =>
  sprintIssues.value
    .filter((issue) => issue.status === status)
    .reduce((sum, issue) => sum + issue.estimateHours, 0)

const sharePercent = (status: IssueStatus) =>
  sprintTotals.value.issues === 0
    ? 0
    : Math.round((countFor(status) / sprintTotals.value.issues) * 100)
</script>
