<template>
  <div class="zt-card overflow-hidden">
    <div class="flex">
      <!-- Mini sidebar ------------------------------------------------ -->
      <aside
        class="hidden w-40 shrink-0 flex-col gap-1 border-r border-gray-200 p-3 dark:border-gray-800 sm:flex"
        :style="sidebarStyle"
      >
        <div class="mb-2 flex items-center gap-2">
          <span
            class="flex h-7 w-7 items-center justify-center rounded-lg text-theme-xs font-semibold"
            :style="{ backgroundColor: appearance.brand, color: 'var(--brand-contrast)' }"
          >
            {{ monogram }}
          </span>
          <span class="truncate text-theme-sm font-semibold" :style="sidebarText">
            {{ companyName }}
          </span>
        </div>
        <span
          v-for="(item, index) in navItems"
          :key="item"
          class="rounded-lg px-2.5 py-2 text-theme-xs"
          :style="index === 0 ? activeNavStyle : navStyle"
        >
          {{ item }}
        </span>
      </aside>

      <!-- Mini board -------------------------------------------------- -->
      <div class="flex-1 p-4">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h4 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">Sprint 24</h4>
            <p class="text-theme-xs text-gray-500 dark:text-gray-400">Live preview of your theme</p>
          </div>
          <span
            class="rounded-lg px-3 py-1.5 text-theme-xs font-medium"
            :style="{ backgroundColor: appearance.brand, color: 'var(--brand-contrast)' }"
          >
            New issue
          </span>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div
            v-for="column in previewColumns"
            :key="column.name"
            class="rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-white/[0.02]"
          >
            <div class="mb-2 flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: column.color }"></span>
              <span class="text-theme-xs font-medium text-gray-700 dark:text-gray-300">
                {{ column.name }}
              </span>
            </div>
            <div
              v-for="card in column.cards"
              :key="card.title"
              class="mb-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <span
                v-if="appearance.boardCardCovers"
                class="block h-1.5"
                :style="{ backgroundColor: card.cover }"
              ></span>
              <div class="p-2.5">
                <p class="text-theme-xs font-medium text-gray-800 dark:text-white/90">
                  {{ card.title }}
                </p>
                <div v-if="!appearance.boardCompactCards" class="mt-2 flex items-center gap-1.5">
                  <span class="zt-chip">{{ card.tag }}</span>
                  <span
                    class="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                    :style="{ backgroundColor: appearance.accent }"
                  >
                    {{ card.who }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppearance } from '@/composables/useAppearance'
import { useWorkspace } from '@/composables/useWorkspace'
import { buildRamp, readableTextOn, withAlpha } from '@/utils/color'

const props = defineProps<{ name?: string }>()

const { appearance } = useAppearance()
const { company } = useWorkspace()

const companyName = computed(() => props.name || company.value?.name || 'Your workspace')

const monogram = computed(
  () =>
    companyName.value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || 'Z',
)

const navItems = ['Board', 'Backlog', 'Timeline', 'Reports']

const previewColumns = computed(() => [
  {
    name: 'To Do',
    color: '#98a2b3',
    cards: [{ title: 'Draft onboarding copy', tag: 'design', who: 'LB', cover: appearance.accent }],
  },
  {
    name: 'In Progress',
    color: appearance.brand,
    cards: [{ title: 'Board drag and drop', tag: 'frontend', who: 'DM', cover: appearance.brand }],
  },
  {
    name: 'Done',
    color: appearance.success,
    cards: [{ title: 'Worklog entry form', tag: 'shipped', who: 'PR', cover: appearance.success }],
  },
])

const sidebarSkin = computed(() => {
  if (appearance.sidebarStyle === 'brand') {
    const ramp = buildRamp(appearance.brand)
    return { bg: ramp[600], fg: readableTextOn(ramp[600]) }
  }
  if (appearance.sidebarStyle === 'dark') return { bg: '#101828', fg: '#ffffff' }
  return null
})

const sidebarStyle = computed(() =>
  sidebarSkin.value ? { backgroundColor: sidebarSkin.value.bg, borderColor: 'transparent' } : {},
)

const sidebarText = computed(() =>
  sidebarSkin.value ? { color: sidebarSkin.value.fg } : { color: 'var(--color-gray-800)' },
)

const navStyle = computed(() =>
  sidebarSkin.value
    ? { color: withAlpha(sidebarSkin.value.fg, 0.72) }
    : { color: 'var(--color-gray-500)' },
)

const activeNavStyle = computed(() =>
  sidebarSkin.value
    ? { backgroundColor: withAlpha('#ffffff', 0.18), color: sidebarSkin.value.fg }
    : { backgroundColor: 'var(--color-brand-50)', color: 'var(--color-brand-500)' },
)
</script>
