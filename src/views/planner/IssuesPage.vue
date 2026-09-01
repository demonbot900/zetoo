<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Issues" />

    <div
      class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <header
        class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800"
      >
        <div class="flex flex-wrap items-center gap-3">
          <input
            v-model="search"
            type="search"
            placeholder="Search issues"
            class="h-11 w-56 rounded-lg border border-gray-300 bg-transparent px-3.5 text-theme-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90"
          />
          <ZSelect
            v-model="status"
            :options="statusOptions"
            aria-label="Filter by status"
            class="w-44"
          />
          <ZSelect
            v-model="assignee"
            :options="assigneeOptions"
            aria-label="Filter by assignee"
            class="w-48"
          />
          <ZSelect
            v-model="sprint"
            :options="sprintOptions"
            aria-label="Filter by sprint"
            class="w-44"
          />
        </div>

        <p class="text-theme-sm text-gray-500 dark:text-gray-400">
          {{ rows.length }} issues · {{ totalHours }}h estimated
        </p>
      </header>

      <div class="max-w-full overflow-x-auto custom-scrollbar">
        <table class="min-w-full">
          <thead class="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                class="px-5 py-3 text-left text-theme-xs font-medium uppercase tracking-wide text-gray-400"
                :class="column.class"
              >
                <button
                  v-if="column.sortable"
                  type="button"
                  class="inline-flex items-center gap-1 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
                  @click="toggleSort(column.key)"
                >
                  {{ column.label }}
                  <span v-if="sortKey === column.key" class="text-brand-500">
                    {{ sortAsc ? '↑' : '↓' }}
                  </span>
                </button>
                <span v-else>{{ column.label }}</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="issue in rows"
              :key="issue.id"
              class="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]"
              @click="selectIssue(issue.id)"
            >
              <td class="px-5 py-3">
                <div class="flex items-center gap-2.5">
                  <IssueTypeIcon :type="issue.type" />
                  <span class="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {{ issue.id }}
                  </span>
                </div>
              </td>
              <td class="px-5 py-3">
                <span class="text-theme-sm text-gray-800 dark:text-white/90">
                  {{ issue.title }}
                </span>
              </td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full px-2.5 py-0.5 text-theme-xs font-medium"
                  :class="statusChip(issue.status)"
                >
                  {{ statusLabels[issue.status] }}
                </span>
              </td>
              <td class="px-5 py-3">
                <PriorityIcon :priority="issue.priority" />
              </td>
              <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <UserAvatar :member="memberById(issue.assigneeId)" size="xs" />
                  <span class="text-theme-sm text-gray-600 dark:text-gray-300">
                    {{ memberById(issue.assigneeId)?.name ?? 'Unassigned' }}
                  </span>
                </div>
              </td>
              <td class="px-5 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                {{ sprintById(issue.sprintId)?.name ?? 'Backlog' }}
              </td>
              <td class="px-5 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                {{ issue.loggedHours }}/{{ issue.estimateHours }}h
              </td>
              <td
                class="px-5 py-3 text-theme-sm"
                :class="isOverdue(issue) ? 'text-error-500' : 'text-gray-600 dark:text-gray-300'"
              >
                {{ formatDate(issue.dueDate) }}
              </td>
            </tr>
          </tbody>
        </table>

        <p
          v-if="rows.length === 0"
          class="px-5 py-10 text-center text-theme-sm text-gray-400 dark:text-gray-500"
        >
          No issues match these filters.
        </p>
      </div>
    </div>

    <IssueDetailPanel />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import IssueTypeIcon from '@/components/planner/IssueTypeIcon.vue'
import PriorityIcon from '@/components/planner/PriorityIcon.vue'
import UserAvatar from '@/components/planner/UserAvatar.vue'
import IssueDetailPanel from '@/components/planner/IssueDetailPanel.vue'
import {
  formatDate,
  priorityOrder,
  statusLabels,
  today,
  usePlanner,
} from '@/composables/usePlanner'
import type { Issue, IssueStatus } from '@/types/planner'
import ZSelect from '@/components/ui/ZSelect.vue'

const { issues, team, sprints, memberById, sprintById, selectIssue } = usePlanner()

const statusOptions = computed(() => [
  { value: 'all', label: 'All statuses' },
  ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
])

const assigneeOptions = computed(() => [
  { value: 'all', label: 'All assignees' },
  { value: 'none', label: 'Unassigned' },
  ...team.map((member) => ({ value: member.id, label: member.name, hint: member.role })),
])

const sprintOptions = computed(() => [
  { value: 'all', label: 'All sprints' },
  { value: 'backlog', label: 'Backlog' },
  ...sprints.map((item) => ({ value: item.id, label: item.name })),
])

const columns = [
  { key: 'id', label: 'Key', sortable: true, class: 'w-28' },
  { key: 'title', label: 'Summary', sortable: true, class: '' },
  { key: 'status', label: 'Status', sortable: true, class: 'w-32' },
  { key: 'priority', label: 'Priority', sortable: true, class: 'w-24' },
  { key: 'assignee', label: 'Assignee', sortable: false, class: 'w-48' },
  { key: 'sprint', label: 'Sprint', sortable: false, class: 'w-32' },
  { key: 'time', label: 'Time', sortable: true, class: 'w-28' },
  { key: 'dueDate', label: 'Due', sortable: true, class: 'w-28' },
]

const search = ref('')
const status = ref('all')
const assignee = ref('all')
const sprint = ref('all')
const sortKey = ref('dueDate')
const sortAsc = ref(true)

const isOverdue = (issue: Issue) =>
  issue.status !== 'done' && issue.dueDate !== null && issue.dueDate < today

const statusChip = (value: IssueStatus) =>
  ({
    backlog: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    todo: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    in_progress: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
    review: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
    done: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
  })[value]

const filtered = computed(() =>
  issues.filter((issue) => {
    const term = search.value.trim().toLowerCase()
    const matchesSearch = term === '' || `${issue.id} ${issue.title}`.toLowerCase().includes(term)
    const matchesStatus = status.value === 'all' || issue.status === status.value
    const matchesAssignee =
      assignee.value === 'all' ||
      (assignee.value === 'none' ? issue.assigneeId === null : issue.assigneeId === assignee.value)
    const matchesSprint =
      sprint.value === 'all' ||
      (sprint.value === 'backlog' ? issue.sprintId === null : issue.sprintId === sprint.value)
    return matchesSearch && matchesStatus && matchesAssignee && matchesSprint
  }),
)

const sortValue = (issue: Issue, key: string): string | number => {
  switch (key) {
    case 'priority':
      return priorityOrder.indexOf(issue.priority)
    case 'time':
      return issue.estimateHours
    case 'dueDate':
      return issue.dueDate ?? '9999-12-31'
    case 'status':
      return issue.status
    case 'title':
      return issue.title.toLowerCase()
    default:
      return issue.id
  }
}

const rows = computed(() =>
  [...filtered.value].sort((a, b) => {
    const left = sortValue(a, sortKey.value)
    const right = sortValue(b, sortKey.value)
    if (left === right) return 0
    return (left < right ? -1 : 1) * (sortAsc.value ? 1 : -1)
  }),
)

const totalHours = computed(() => rows.value.reduce((sum, issue) => sum + issue.estimateHours, 0))

const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
    return
  }
  sortKey.value = key
  sortAsc.value = true
}
</script>
