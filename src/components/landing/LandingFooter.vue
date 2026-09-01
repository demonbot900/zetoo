<template>
  <footer class="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div class="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div class="max-w-sm">
          <router-link to="/" class="inline-flex">
            <ZetooLogo variant="full" :width="140" />
          </router-link>
          <p class="mt-5 text-sm leading-6 text-gray-500 dark:text-gray-400">
            Sprint planning, issue tracking and time logging in one place — so the estimate, the
            board and the burndown never disagree.
          </p>
          <div class="mt-6 flex items-center gap-3">
            <a
              v-for="social in socials"
              :key="social.label"
              :href="social.href"
              :aria-label="social.label"
              class="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-brand-500 hover:text-brand-500 dark:border-gray-800 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
            >
              <svg class="fill-current" width="18" height="18" viewBox="0 0 24 24">
                <path :d="social.path" />
              </svg>
            </a>
          </div>
        </div>

        <div v-for="column in columns" :key="column.title">
          <h3 class="text-sm font-semibold text-gray-800 dark:text-white/90">
            {{ column.title }}
          </h3>
          <ul class="mt-4 flex flex-col gap-3">
            <li v-for="item in column.items" :key="item.label">
              <component
                :is="item.to ? RouterLink : 'a'"
                v-bind="item.to ? { to: item.to } : { href: item.href }"
                class="text-sm text-gray-500 transition-colors hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
              >
                {{ item.label }}
              </component>
            </li>
          </ul>
        </div>
      </div>

      <div
        class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">
          &copy; {{ currentYear }} Zetoo. All rights reserved.
        </p>
        <div class="flex items-center gap-6">
          <a
            href="#"
            class="text-sm text-gray-500 transition-colors hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
          >
            Privacy
          </a>
          <a
            href="#"
            class="text-sm text-gray-500 transition-colors hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
          >
            Terms
          </a>
          <a
            href="#"
            class="text-sm text-gray-500 transition-colors hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
          >
            Status
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import ZetooLogo from '@/components/common/ZetooLogo.vue'
import { RouterLink } from 'vue-router'

const currentYear = new Date().getFullYear()

type FooterItem = { label: string; to?: string; href?: string }

const columns: { title: string; items: FooterItem[] }[] = [
  {
    title: 'Product',
    items: [
      { label: 'Features', href: '#features' },
      { label: 'Preview', href: '#preview' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Schedule', to: '/schedule' },
    ],
  },
  {
    title: 'Plan',
    items: [
      { label: 'Board', to: '/board' },
      { label: 'Backlog', to: '/backlog' },
      { label: 'Timeline', to: '/timeline' },
      { label: 'Reports', to: '/reports' },
    ],
  },
  {
    title: 'Company',
    items: [
      { label: 'FAQ', href: '#faq' },
      { label: 'Sign in', to: '/signin' },
      { label: 'Create account', to: '/signup' },
      { label: 'Support', href: '#' },
    ],
  },
]

const socials = [
  {
    label: 'X',
    href: '#',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z',
  },
  {
    label: 'GitHub',
    href: '#',
    path: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.523 2 12 2Z',
  },
  {
    label: 'LinkedIn',
    href: '#',
    path: 'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0Z',
  },
]
</script>
