<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="relative flex-1 min-w-56">
      <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
        <svg class="fill-current" width="18" height="18" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M3.04 9.37a6.33 6.33 0 1 1 11.2 4.02l3.06 3.06a.75.75 0 1 1-1.06 1.06l-3.06-3.06A6.33 6.33 0 0 1 3.04 9.37Zm6.33-4.83a4.83 4.83 0 1 0 0 9.66 4.83 4.83 0 0 0 0-9.66Z"
            clip-rule="evenodd"
          />
        </svg>
      </span>
      <input
        :value="search"
        type="search"
        placeholder="Search issues"
        class="h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-11 pr-4 text-theme-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white/90"
        @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="flex items-center gap-1.5">
      <button
        v-for="member in team"
        :key="member.id"
        type="button"
        class="rounded-full transition-all"
        :class="assignee === member.id ? 'ring-2 ring-brand-500' : 'opacity-70 hover:opacity-100'"
        :title="member.name"
        @click="$emit('update:assignee', assignee === member.id ? 'all' : member.id)"
      >
        <UserAvatar :member="member" size="sm" />
      </button>
    </div>

    <ZSelect
      :model-value="type"
      :options="typeOptions"
      aria-label="Filter by type"
      class="w-40"
      @update:model-value="$emit('update:type', String($event))"
    />

    <button
      v-if="isFiltered"
      type="button"
      class="h-11 rounded-lg border border-gray-300 px-4 text-theme-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]"
      @click="reset"
    >
      Clear
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UserAvatar from './UserAvatar.vue'
import ZSelect from '@/components/ui/ZSelect.vue'
import { typeLabels, usePlanner } from '@/composables/usePlanner'

const props = defineProps<{ search: string; assignee: string; type: string }>()
const emit = defineEmits<{
  'update:search': [value: string]
  'update:assignee': [value: string]
  'update:type': [value: string]
}>()

const { team } = usePlanner()

const typeOptions = [
  { value: 'all', label: 'All types' },
  ...Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
]

const isFiltered = computed(
  () => props.search !== '' || props.assignee !== 'all' || props.type !== 'all',
)

const reset = () => {
  emit('update:search', '')
  emit('update:assignee', 'all')
  emit('update:type', 'all')
}
</script>
