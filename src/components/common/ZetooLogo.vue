<template>
  <span class="inline-flex items-center" :class="$attrs.class as string">
    <img
      :src="src"
      :alt="alt"
      :width="renderWidth"
      :style="{ width: `${renderWidth}px`, height: 'auto' }"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppearance } from '@/composables/useAppearance'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** `full` is the wordmark, `icon` the square mark, `auth` the large lockup. */
    variant?: 'full' | 'icon' | 'auth'
    width?: number
    alt?: string
  }>(),
  { variant: 'full', width: undefined, alt: 'Zetoo' },
)

const { isDark } = useAppearance()

// The logo files embed artwork and are large, so only the variant actually
// shown is requested — no light/dark pair loaded on every page.
const sources = {
  full: { light: '/images/logo/logo.svg', dark: '/images/logo/logo-dark.svg' },
  icon: { light: '/images/logo/logo-icon.svg', dark: '/images/logo/logo-icon.svg' },
  auth: { light: '/images/logo/auth-logo.svg', dark: '/images/logo/auth-logo.svg' },
}

const defaultWidth = { full: 140, icon: 32, auth: 231 }

const src = computed(() => sources[props.variant][isDark.value ? 'dark' : 'light'])

const renderWidth = computed(() => props.width ?? defaultWidth[props.variant])
</script>
