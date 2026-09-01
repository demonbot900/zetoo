<template>
  <header
    :class="[
      'fixed top-0 left-0 z-99 w-full transition-colors duration-300',
      isScrolled
        ? 'border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90'
        : 'border-b border-transparent bg-transparent',
    ]"
  >
    <div class="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <router-link to="/" class="flex items-center">
        <ZetooLogo variant="full" :width="140" />
      </router-link>

      <nav class="hidden items-center gap-8 lg:flex">
        <a
          v-for="link in navLinks"
          :key="link.href"
          :href="link.href"
          class="text-sm font-medium text-gray-600 transition-colors hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
        >
          {{ link.label }}
        </a>
      </nav>

      <div class="flex items-center gap-3">
        <ThemeToggler />

        <router-link
          to="/signin"
          class="hidden rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.05] dark:hover:text-white sm:inline-flex"
        >
          Sign in
        </router-link>

        <router-link
          to="/dashboard"
          class="hidden items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 sm:inline-flex"
        >
          Live preview
        </router-link>

        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.05] lg:hidden"
          :aria-expanded="isMenuOpen"
          aria-label="Toggle navigation"
          @click="isMenuOpen = !isMenuOpen"
        >
          <svg
            v-if="!isMenuOpen"
            class="stroke-current"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M4 7h16M4 12h16M4 17h16" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <svg v-else class="stroke-current" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile navigation -->
    <div
      v-if="isMenuOpen"
      class="border-t border-gray-200 bg-white px-4 pb-6 pt-4 dark:border-gray-800 dark:bg-gray-900 lg:hidden"
    >
      <nav class="flex flex-col gap-1">
        <a
          v-for="link in navLinks"
          :key="link.href"
          :href="link.href"
          class="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-brand-500 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-brand-400"
          @click="isMenuOpen = false"
        >
          {{ link.label }}
        </a>
      </nav>
      <div class="mt-4 flex flex-col gap-3">
        <router-link
          to="/signin"
          class="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]"
        >
          Sign in
        </router-link>
        <router-link
          to="/dashboard"
          class="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Live preview
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import ZetooLogo from '@/components/common/ZetooLogo.vue'
import { onMounted, onUnmounted, ref } from 'vue'
import ThemeToggler from '../common/ThemeToggler.vue'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Preview', href: '#preview' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

const isScrolled = ref(false)
const isMenuOpen = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 8
}

onMounted(() => {
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>
