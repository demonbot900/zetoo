<template>
  <header
    class="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6 sm:py-5"
  >
    <div class="flex min-w-0 items-start gap-3">
      <span
        v-if="$slots.icon"
        class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300"
      >
        <slot name="icon" />
      </span>
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="truncate text-lg font-semibold text-gray-800 dark:text-white/90">
            {{ title }}
          </h2>
          <slot name="badges" />
        </div>
        <p v-if="subtitle" class="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
          {{ subtitle }}
        </p>
      </div>
    </div>

    <button
      type="button"
      class="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
      aria-label="Close"
      @click="$emit('close')"
    >
      <svg class="stroke-current" width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M5 5l10 10M15 5L5 15" stroke-width="1.7" stroke-linecap="round" />
      </svg>
    </button>
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
defineEmits<{ close: [] }>()
</script>
