<template>
  <article
    class="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs transition-colors hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/50"
    @click="$emit('open', issue.id)"
  >
    <span
      v-if="appearance.boardCardCovers && issue.coverColor"
      class="block h-2 w-full"
      :style="{ backgroundColor: issue.coverColor }"
    ></span>

    <div :class="compact ? 'p-2.5' : 'p-3.5'">
      <div class="flex items-start justify-between gap-2">
        <p class="text-theme-sm font-medium leading-5 text-gray-800 dark:text-white/90">
          {{ issue.title }}
        </p>
        <span
          v-if="epic"
          class="mt-1 h-2 w-2 shrink-0 rounded-full"
          :class="epic.color"
          :title="epic.name"
        ></span>
      </div>

      <div v-if="issue.labels.length && !compact" class="mt-2.5 flex flex-wrap gap-1.5">
        <span
          v-for="label in issue.labels"
          :key="label"
          class="rounded bg-gray-100 px-1.5 py-0.5 text-theme-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          {{ label }}
        </span>
      </div>

      <div class="mt-3 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <IssueTypeIcon :type="issue.type" />
          <span class="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
            {{ issue.id }}
          </span>
          <PriorityIcon :priority="issue.priority" />
          <span
            v-if="issue.checklist.length"
            class="inline-flex items-center gap-1 text-theme-xs"
            :class="
              checklistDone === issue.checklist.length
                ? 'text-success-600'
                : 'text-gray-500 dark:text-gray-400'
            "
            :title="`${checklistDone} of ${issue.checklist.length} checklist items done`"
          >
            <svg class="fill-current" width="12" height="12" viewBox="0 0 20 20">
              <path
                d="M4 3h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm4.6 10.2 5.2-5.2-1.1-1.1-4.1 4.1-1.9-1.9-1.1 1.1 3 3Z"
              />
            </svg>
            {{ checklistDone }}/{{ issue.checklist.length }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <span
            v-if="!compact"
            class="rounded bg-gray-100 px-1.5 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            :title="`${issue.loggedHours}h logged of ${issue.estimateHours}h estimated`"
          >
            {{ issue.loggedHours }}/{{ issue.estimateHours }}h
          </span>
          <UserAvatar :member="assignee" size="xs" />
        </div>
      </div>

      <template v-if="!compact">
        <div class="mt-3 h-1 rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            class="h-1 rounded-full transition-all"
            :class="isOver ? 'bg-error-500' : 'bg-brand-500'"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>

        <p
          v-if="issue.dueDate"
          class="mt-2.5 inline-flex items-center gap-1.5 text-theme-xs"
          :class="isOverdue ? 'text-error-500' : 'text-gray-500 dark:text-gray-400'"
        >
          <svg class="fill-current" width="13" height="13" viewBox="0 0 20 20">
            <path
              d="M6.5 2v1.5h7V2H15v1.5h1.5A1.5 1.5 0 0 1 18 5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 16V5a1.5 1.5 0 0 1 1.5-1.5H5V2h1.5ZM16.5 8h-13v8h13V8Z"
            />
          </svg>
          {{ formatDate(issue.dueDate) }}
        </p>
      </template>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IssueTypeIcon from './IssueTypeIcon.vue'
import PriorityIcon from './PriorityIcon.vue'
import UserAvatar from './UserAvatar.vue'
import { formatDate, today, usePlanner } from '@/composables/usePlanner'
import { useAppearance } from '@/composables/useAppearance'
import type { Issue } from '@/types/planner'

const props = defineProps<{ issue: Issue }>()
defineEmits<{ open: [id: string] }>()

const { memberById, epicById } = usePlanner()
const { appearance } = useAppearance()

const compact = computed(() => appearance.boardCompactCards)

const assignee = computed(() => memberById(props.issue.assigneeId))
const epic = computed(() => epicById(props.issue.epicId))

const checklistDone = computed(() => props.issue.checklist.filter((item) => item.done).length)

const progress = computed(() => {
  if (props.issue.estimateHours === 0) return 0
  return Math.min(Math.round((props.issue.loggedHours / props.issue.estimateHours) * 100), 100)
})

const isOver = computed(() => props.issue.loggedHours > props.issue.estimateHours)

const isOverdue = computed(
  () =>
    props.issue.status !== 'done' && props.issue.dueDate !== null && props.issue.dueDate < today,
)
</script>
