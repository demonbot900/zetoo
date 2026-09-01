<template>
  <div class="flex flex-col gap-6">
    <ThemePreview :name="draft.company.name" />

    <p class="text-theme-sm text-gray-500 dark:text-gray-400">
      Everything here applies instantly and is saved with the workspace. You can change all of it
      later under Settings → Appearance.
    </p>

    <ThemeControls :sections="['presets', 'colors', 'typography', 'layout']" />
  </div>
</template>

<script setup lang="ts">
import ThemeControls from '@/components/theme/ThemeControls.vue'
import ThemePreview from '@/components/theme/ThemePreview.vue'
import { useRegistration } from '@/composables/useRegistration'

const { draft } = useRegistration()
</script>
