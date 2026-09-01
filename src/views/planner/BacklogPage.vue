<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Backlog" />

    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-theme-sm text-gray-500 dark:text-gray-400">
          Drag issues between the sprints and the backlog to plan the next two weeks.
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white transition-colors hover:bg-brand-600"
          @click="isCreateOpen = true"
        >
          <svg class="stroke-current" width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 4.5v11M4.5 10h11" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          New issue
        </button>
      </div>

      <section
        v-for="group in groups"
        :key="group.key"
        class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <header
          class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800"
        >
          <div>
            <div class="flex items-center gap-2.5">
              <h3 class="font-semibold text-gray-800 dark:text-white/90">{{ group.name }}</h3>
              <span
                v-if="group.badge"
                class="rounded-full px-2.5 py-0.5 text-theme-xs font-medium"
                :class="group.badgeClass"
              >
                {{ group.badge }}
              </span>
              <span class="text-theme-xs text-gray-500 dark:text-gray-400">
                {{ group.issues.length }} issues
              </span>
            </div>
            <p v-if="group.meta" class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              {{ group.meta }}
            </p>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-theme-xs text-gray-500 dark:text-gray-400">Estimated</p>
              <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {{ group.hours }}h
              </p>
            </div>
            <div class="text-right">
              <p class="text-theme-xs text-gray-500 dark:text-gray-400">Points</p>
              <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {{ group.points }}
              </p>
            </div>
          </div>
        </header>

        <draggable
          :model-value="group.issues"
          :group="{ name: 'backlog' }"
          item-key="id"
          class="flex min-h-16 flex-col divide-y divide-gray-100 dark:divide-gray-800"
          ghost-class="opacity-40"
          @update:model-value="(items: Issue[]) => onDrop(items, group.sprintId)"
        >
          <template #item="{ element }: { element: Issue }">
            <div
              class="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]"
              @click="selectIssue(element.id)"
            >
              <IssueTypeIcon :type="element.type" />
              <span
                class="w-16 shrink-0 text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                {{ element.id }}
              </span>
              <span class="flex-1 min-w-48 text-theme-sm text-gray-800 dark:text-white/90">
                {{ element.title }}
              </span>
              <span
                v-for="label in element.labels"
                :key="label"
                class="rounded bg-gray-100 px-1.5 py-0.5 text-theme-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                {{ label }}
              </span>
              <PriorityIcon :priority="element.priority" />
              <span class="w-14 shrink-0 text-right text-theme-xs text-gray-500 dark:text-gray-400">
                {{ element.estimateHours }}h
              </span>
              <span
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-theme-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                {{ element.storyPoints }}
              </span>
              <UserAvatar :member="memberById(element.assigneeId)" size="xs" />
            </div>
          </template>
        </draggable>

        <p
          v-if="group.issues.length === 0"
          class="px-5 py-6 text-center text-theme-sm text-gray-400 dark:text-gray-500"
        >
          Drop issues here to plan them into {{ group.name }}.
        </p>
      </section>
    </div>

    <NewIssueModal
      :open="isCreateOpen"
      :default-sprint-id="null"
      @close="isCreateOpen = false"
      @created="selectIssue"
    />
    <IssueDetailPanel />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import draggable from 'vuedraggable'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import IssueTypeIcon from '@/components/planner/IssueTypeIcon.vue'
import PriorityIcon from '@/components/planner/PriorityIcon.vue'
import UserAvatar from '@/components/planner/UserAvatar.vue'
import IssueDetailPanel from '@/components/planner/IssueDetailPanel.vue'
import NewIssueModal from '@/components/planner/NewIssueModal.vue'
import { formatDate, usePlanner } from '@/composables/usePlanner'
import type { Issue } from '@/types/planner'

const { issues, sprints, memberById, selectIssue, updateIssue } = usePlanner()

const isCreateOpen = ref(false)

const openSprints = computed(() => sprints.filter((sprint) => sprint.state !== 'completed'))

const groups = computed(() => {
  const sprintGroups = openSprints.value.map((sprint) => {
    const list = issues.filter((issue) => issue.sprintId === sprint.id)
    return {
      key: sprint.id,
      sprintId: sprint.id as string | null,
      name: sprint.name,
      badge: sprint.state === 'active' ? 'Active' : 'Planned',
      badgeClass:
        sprint.state === 'active'
          ? 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
      meta: `${formatDate(sprint.startDate)} – ${formatDate(sprint.endDate)} · ${sprint.goal}`,
      issues: list,
      hours: list.reduce((sum, issue) => sum + issue.estimateHours, 0),
      points: list.reduce((sum, issue) => sum + issue.storyPoints, 0),
    }
  })

  const backlog = issues.filter((issue) => issue.sprintId === null)

  return [
    ...sprintGroups,
    {
      key: 'backlog',
      sprintId: null as string | null,
      name: 'Backlog',
      badge: '',
      badgeClass: '',
      meta: 'Unplanned work, ordered by priority.',
      issues: backlog,
      hours: backlog.reduce((sum, issue) => sum + issue.estimateHours, 0),
      points: backlog.reduce((sum, issue) => sum + issue.storyPoints, 0),
    },
  ]
})

const onDrop = (items: Issue[], sprintId: string | null) => {
  items.forEach((issue) => {
    if (issue.sprintId === sprintId) return
    updateIssue(issue.id, {
      sprintId,
      status: sprintId === null ? 'backlog' : issue.status === 'backlog' ? 'todo' : issue.status,
    })
  })
}
</script>
