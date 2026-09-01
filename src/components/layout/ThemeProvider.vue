<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { onMounted, provide } from 'vue'
import { useAppearance } from '@/composables/useAppearance'

/**
 * Light/dark handling now lives in the appearance store together with the rest
 * of the theme, so both the header toggle and the customiser drive the same
 * state. This provider only mirrors it onto the old `useTheme()` contract.
 */
const { isDark, toggleColorMode, applyAppearance } = useAppearance()

onMounted(applyAppearance)

provide('theme', {
  isDarkMode: isDark,
  toggleTheme: toggleColorMode,
})
</script>

<script lang="ts">
import { inject } from 'vue'
import type { ComputedRef } from 'vue'

export interface ThemeContext {
  isDarkMode: ComputedRef<boolean>
  toggleTheme: () => void
}

export function useTheme(): ThemeContext {
  const theme = inject<ThemeContext>('theme')
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return theme
}
</script>
