<template>
  <aside
    class="app-sidebar"
    :class="[
      'fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-[calc(100dvh-4rem)] lg:h-screen transition-all duration-300 ease-in-out z-99999 border-r border-gray-200',
      {
        'lg:w-[290px]': isExpanded || isMobileOpen || isHovered,
        'lg:w-[90px]': !isExpanded && !isHovered,
        'translate-x-0 w-[290px]': isMobileOpen,
        '-translate-x-full': !isMobileOpen,
        'lg:translate-x-0': true,
      },
    ]"
    @mouseenter="!isExpanded && (isHovered = true)"
    @mouseleave="isHovered = false"
  >
    <div :class="['py-8 flex', !isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start']">
      <router-link to="/dashboard" class="flex flex-col gap-3">
        <ZetooLogo v-if="isExpanded || isHovered || isMobileOpen" variant="full" :width="150" />
        <ZetooLogo v-else variant="icon" :width="32" />
      </router-link>
    </div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
      <nav class="mb-6">
        <div class="flex flex-col gap-4">
          <div v-for="(menuGroup, groupIndex) in menuGroups" :key="groupIndex">
            <h2
              :class="[
                'mb-4 text-xs uppercase flex leading-[20px] text-gray-400',
                !isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start',
              ]"
            >
              <template v-if="isExpanded || isHovered || isMobileOpen">
                {{ menuGroup.title }}
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-4">
              <li v-for="item in menuGroup.items" :key="item.name">
                <router-link
                  :to="item.path"
                  :class="[
                    'menu-item group',
                    {
                      'menu-item-active': isActive(item.path),
                      'menu-item-inactive': !isActive(item.path),
                    },
                  ]"
                >
                  <span
                    :class="[
                      isActive(item.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="item.icon" />
                  </span>
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{
                    item.name
                  }}</span>
                </router-link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <SidebarWidget v-if="isExpanded || isHovered || isMobileOpen" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import {
  GridIcon,
  CalenderIcon,
  UserCircleIcon,
  UserGroupIcon,
  PieChartIcon,
  HorizontalDots,
  SettingsIcon,
  TableIcon,
  ListIcon,
  TaskIcon,
  FolderIcon,
  DraftIcon,
  DocsIcon,
  BellIcon,
  BarChartIcon,
} from '../../icons'
import SidebarWidget from './SidebarWidget.vue'
import ZetooLogo from '@/components/common/ZetooLogo.vue'
import BoxCubeIcon from '@/icons/BoxCubeIcon.vue'
import { useSidebar } from '@/composables/useSidebar'
import { useLocale } from '@/composables/useLocale'

const route = useRoute()
const { t } = useLocale()

const { isExpanded, isMobileOpen, isHovered } = useSidebar()

// Labels come from the message catalogue so the navigation follows the
// language picked in the header.
const menuGroups = computed(() => [
  {
    title: t('group.planning'),
    items: [
      { icon: GridIcon, name: t('nav.dashboard'), path: '/dashboard' },
      { icon: TableIcon, name: t('nav.boards'), path: '/boards' },
      { icon: BoxCubeIcon, name: t('nav.board'), path: '/board' },
      { icon: ListIcon, name: t('nav.backlog'), path: '/backlog' },
      { icon: TaskIcon, name: t('nav.timeline'), path: '/timeline' },
    ],
  },
  {
    title: t('group.work'),
    items: [
      { icon: TableIcon, name: t('nav.issues'), path: '/issues' },
      { icon: CalenderIcon, name: t('nav.schedule'), path: '/schedule' },
      { icon: PieChartIcon, name: t('nav.reports'), path: '/reports' },
      { icon: UserGroupIcon, name: t('nav.team'), path: '/team' },
      { icon: UserCircleIcon, name: t('nav.profile'), path: '/profile' },
      { icon: BarChartIcon, name: t('nav.leaderboard'), path: '/leaderboard' },
    ],
  },
  {
    title: t('group.records'),
    items: [
      { icon: FolderIcon, name: t('nav.projects'), path: '/projects' },
      { icon: DraftIcon, name: t('nav.time'), path: '/time' },
      { icon: DocsIcon, name: t('nav.records'), path: '/records' },
    ],
  },
  {
    title: t('group.workspace'),
    items: [
      { icon: BoxCubeIcon, name: t('nav.appearance'), path: '/settings/appearance' },
      { icon: SettingsIcon, name: t('nav.company'), path: '/settings/company' },
      { icon: BellIcon, name: t('nav.notifications'), path: '/settings/notifications' },
      { icon: DraftIcon, name: t('nav.import'), path: '/settings/import' },
    ],
  },
])

const isActive = (path: string) => route.path === path
</script>
