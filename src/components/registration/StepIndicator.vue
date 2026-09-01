<template>
  <ol class="flex flex-col gap-1">
    <li v-for="(item, index) in steps" :key="item.id">
      <button
        type="button"
        class="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
        :class="[
          index === current ? 'bg-brand-50 dark:bg-brand-500/10' : '',
          index < current ? 'hover:bg-gray-50 dark:hover:bg-white/[0.03]' : '',
          index > current ? 'cursor-default opacity-60' : '',
        ]"
        @click="$emit('go', index)"
      >
        <span
          class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-theme-xs font-semibold transition-colors"
          :class="
            index < current
              ? 'bg-success-500 text-white'
              : index === current
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          "
        >
          <svg v-if="index < current" width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path
              d="M11.7 3.5 5.25 9.95 2.3 7"
              stroke="currentColor"
              stroke-width="1.9"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span class="min-w-0">
          <span
            class="block text-theme-sm font-medium"
            :class="index === current ? 'text-brand-500' : 'text-gray-800 dark:text-white/90'"
          >
            {{ item.title }}
          </span>
          <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ item.blurb }}</span>
        </span>
      </button>
    </li>
  </ol>
</template>

<script setup lang="ts">
import type { WizardStep } from '@/composables/useRegistration'

defineProps<{ steps: WizardStep[]; current: number }>()
defineEmits<{ go: [index: number] }>()
</script>
