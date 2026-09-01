<template>
  <span
    class="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
    :class="sizeClass"
    :style="member?.avatar ? {} : { backgroundColor: background, color: '#ffffff' }"
    :title="label"
  >
    <img
      v-if="member?.avatar"
      :src="member.avatar"
      :alt="label"
      class="h-full w-full object-cover"
    />
    <span v-else class="font-semibold">{{ initials }}</span>
    <span
      v-if="status && member"
      class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900"
      :class="statusClass"
    ></span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MemberProfile } from '@/types/company'
import { fullName, initialsOf } from '@/composables/useWorkspace'
import { colorFromString } from '@/utils/color'

const props = withDefaults(
  defineProps<{
    member?: MemberProfile | null
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    status?: boolean
  }>(),
  { member: null, size: 'md', status: false },
)

const sizeClass = computed(
  () =>
    ({
      xs: 'h-6 w-6 text-[10px]',
      sm: 'h-8 w-8 text-theme-xs',
      md: 'h-11 w-11 text-theme-sm',
      lg: 'h-16 w-16 text-lg',
      xl: 'h-24 w-24 text-title-sm',
    })[props.size],
)

const initials = computed(() => (props.member ? initialsOf(props.member) : '?'))

const label = computed(() => (props.member ? fullName(props.member) : 'Unassigned'))

const background = computed(
  () => props.member?.accent || colorFromString(props.member?.email ?? 'unassigned'),
)

const statusClass = computed(
  () =>
    ({
      active: 'bg-success-500',
      invited: 'bg-warning-500',
      inactive: 'bg-gray-400',
    })[props.member?.status ?? 'inactive'],
)
</script>
