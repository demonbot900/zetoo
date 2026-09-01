<template>
  <img
    v-if="member?.avatar"
    :src="member.avatar"
    :alt="member.name"
    :title="member.name"
    class="shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-gray-900"
    :class="sizeClass"
  />
  <span
    v-else-if="member"
    class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-gray-900"
    :class="[sizeClass, textClass]"
    :style="{ backgroundColor: member.accent || colorFromString(member.name) }"
    :title="member.name"
  >
    {{ member.initials || member.name.slice(0, 2).toUpperCase() }}
  </span>
  <span
    v-else
    class="inline-flex shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 ring-2 ring-white dark:bg-gray-800 dark:ring-gray-900"
    :class="sizeClass"
    title="Unassigned"
  >
    <svg class="fill-current" width="14" height="14" viewBox="0 0 20 20">
      <path
        d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1.5c-3 0-5.5 1.8-5.5 4v1h11v-1c0-2.2-2.5-4-5.5-4Z"
      />
    </svg>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TeamMember } from '@/types/planner'
import { colorFromString } from '@/utils/color'

const props = withDefaults(defineProps<{ member?: TeamMember; size?: 'xs' | 'sm' | 'md' }>(), {
  size: 'sm',
})

const sizeClass = computed(() => ({ xs: 'h-6 w-6', sm: 'h-7 w-7', md: 'h-10 w-10' })[props.size])

const textClass = computed(
  () => ({ xs: 'text-[9px]', sm: 'text-[10px]', md: 'text-theme-xs' })[props.size],
)
</script>
