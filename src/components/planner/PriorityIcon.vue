<template>
  <span
    class="inline-flex shrink-0 items-center justify-center"
    :class="config.color"
    :title="`${config.label} priority`"
    :aria-label="`${config.label} priority`"
  >
    <svg class="fill-current" width="14" height="14" viewBox="0 0 16 16">
      <path :d="config.path" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IssuePriority } from '@/types/planner'

const props = defineProps<{ priority: IssuePriority }>()

const up = 'M8 3l5 5.5H9.6V13H6.4V8.5H3L8 3Z'
const down = 'M8 13 3 7.5h3.4V3h3.2v4.5H13L8 13Z'
const flat = 'M3 6.6h10v1.8H3V6.6Zm0 3.4h10v1.8H3V10Z'

const map: Record<IssuePriority, { label: string; color: string; path: string }> = {
  highest: { label: 'Highest', color: 'text-error-500', path: up },
  high: { label: 'High', color: 'text-orange-500', path: up },
  medium: { label: 'Medium', color: 'text-brand-500', path: flat },
  low: { label: 'Low', color: 'text-gray-400', path: down },
}

const config = computed(() => map[props.priority])
</script>
