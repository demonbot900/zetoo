<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded"
    :class="[sizeClass, config.bg]"
    :title="config.label"
    :aria-label="config.label"
  >
    <svg class="fill-white" viewBox="0 0 20 20" :width="iconSize" :height="iconSize">
      <path :d="config.path" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IssueType } from '@/types/planner'

const props = withDefaults(defineProps<{ type: IssueType; size?: 'sm' | 'md' }>(), {
  size: 'sm',
})

const icons: Record<IssueType, { label: string; bg: string; path: string }> = {
  epic: {
    label: 'Epic',
    bg: 'bg-brand-500',
    path: 'M11.2 2 4.5 11.2h4.1L8.2 18l7.3-9.6h-4.6L11.2 2Z',
  },
  story: {
    label: 'Story',
    bg: 'bg-success-500',
    path: 'M4 4.8A1.8 1.8 0 0 1 5.8 3h8.4A1.8 1.8 0 0 1 16 4.8v10.4a.8.8 0 0 1-1.28.64L10 12.9l-4.72 2.94A.8.8 0 0 1 4 15.2V4.8Z',
  },
  task: {
    label: 'Task',
    bg: 'bg-blue-light-500',
    path: 'M4.5 3.5h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Zm8.7 3.9a.9.9 0 0 0-1.3-1.25l-3.2 3.3-1.5-1.5A.9.9 0 0 0 5.9 9.2l2.1 2.15a.9.9 0 0 0 1.3 0l3.9-3.95Z',
  },
  bug: {
    label: 'Bug',
    bg: 'bg-error-500',
    path: 'M10 2.5a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
  },
}

const config = computed(() => icons[props.type])
const sizeClass = computed(() => (props.size === 'md' ? 'h-6 w-6' : 'h-4 w-4'))
const iconSize = computed(() => (props.size === 'md' ? 16 : 12))
</script>
