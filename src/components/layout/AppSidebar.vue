<template>
  <aside
    class="app-sidebar"
    :class="[
      'fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-99999 border-r border-gray-200',
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

        <!-- Which workspace this Zetoo instance is showing. -->
        <span
          v-if="(isExpanded || isHovered || isMobileOpen) && company"
          class="flex items-center gap-2"
        >
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md text-[10px] font-bold"
            :style="
              company.logo ? {} : { backgroundColor: brandColor, color: 'var(--brand-contrast)' }
            "
          >
            <img
              v-if="company.logo"
              :src="company.logo"
              alt="Company logo"
              class="h-full w-full object-cover"
            />
            <template v-else>{{ monogram }}</template>
          </span>
          <span class="truncate text-theme-xs font-medium text-gray-500 dark:text-gray-400">
            {{ company.name }}
          </span>
        </span>
      </router-link>
    </div>
    <div class="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
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
              <li v-for="(item, index) in menuGroup.items" :key="item.name">
                <button
                  v-if="item.subItems"
                  @click="toggleSubmenu(groupIndex, index)"
                  :class="[
                    'menu-item group w-full',
                    {
                      'menu-item-active': isSubmenuOpen(groupIndex, index),
                      'menu-item-inactive': !isSubmenuOpen(groupIndex, index),
                    },
                    !isExpanded && !isHovered ? 'lg:justify-center' : 'lg:justify-start',
                  ]"
                >
                  <span
                    :class="[
                      isSubmenuOpen(groupIndex, index)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="item.icon" />
                  </span>
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{
                    item.name
                  }}</span>
                  <ChevronDownIcon
                    v-if="isExpanded || isHovered || isMobileOpen"
                    :class="[
                      'ml-auto w-5 h-5 transition-transform duration-200',
                      {
                        'rotate-180 text-brand-500': isSubmenuOpen(groupIndex, index),
                      },
                    ]"
                  />
                </button>
                <router-link
                  v-else-if="item.path"
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
                <transition
                  @enter="startTransition"
                  @after-enter="endTransition"
                  @before-leave="startTransition"
                  @after-leave="endTransition"
                >
                  <div
                    v-show="
                      isSubmenuOpen(groupIndex, index) && (isExpanded || isHovered || isMobileOpen)
                    "
                  >
                    <ul class="mt-2 space-y-1 ml-9">
                      <li v-for="subItem in item.subItems" :key="subItem.name">
                        <router-link
                          :to="subItem.path"
                          :class="[
                            'menu-dropdown-item',
                            {
                              'menu-dropdown-item-active': isActive(subItem.path),
                              'menu-dropdown-item-inactive': !isActive(subItem.path),
                            },
                          ]"
                        >
                          {{ subItem.name }}
                          <span class="flex items-center gap-1 ml-auto">
                            <span
                              v-if="subItem.new"
                              :class="[
                                'menu-dropdown-badge',
                                {
                                  'menu-dropdown-badge-active': isActive(subItem.path),
                                  'menu-dropdown-badge-inactive': !isActive(subItem.path),
                                },
                              ]"
                            >
                              new
                            </span>
                            <span
                              v-if="subItem.pro"
                              :class="[
                                'menu-dropdown-badge',
                                {
                                  'menu-dropdown-badge-active': isActive(subItem.path),
                                  'menu-dropdown-badge-inactive': !isActive(subItem.path),
                                },
                              ]"
                            >
                              pro
                            </span>
                          </span>
                        </router-link>
                      </li>
                    </ul>
                  </div>
                </transition>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <SidebarWidget v-if="isExpanded || isHovered || isMobileOpen" />
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

import {
  GridIcon,
  CalenderIcon,
  UserCircleIcon,
  UserGroupIcon,
  PieChartIcon,
  ChevronDownIcon,
  HorizontalDots,
  SettingsIcon,
  TableIcon,
  ListIcon,
  TaskIcon,
} from '../../icons'
import SidebarWidget from './SidebarWidget.vue'
import ZetooLogo from '@/components/common/ZetooLogo.vue'
import BoxCubeIcon from '@/icons/BoxCubeIcon.vue'
import { useSidebar } from '@/composables/useSidebar'
import { useWorkspace } from '@/composables/useWorkspace'
import { useAppearance } from '@/composables/useAppearance'
import { useLocale } from '@/composables/useLocale'

const route = useRoute()
const { company } = useWorkspace()
const { appearance } = useAppearance()
const { t } = useLocale()

const brandColor = computed(() => appearance.brand)

const monogram = computed(
  () =>
    (company.value?.name ?? 'Zetoo')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || 'Z',
)

const { isExpanded, isMobileOpen, isHovered, openSubmenu } = useSidebar()

// Labels come from the message catalogue so the navigation follows the
// language picked in the header.
const menuGroups = computed(() => [
  {
    title: t('group.planning'),
    items: [
      { icon: GridIcon, name: t('nav.dashboard'), path: '/dashboard' },
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
    ],
  },
  {
    title: t('group.workspace'),
    items: [
      { icon: BoxCubeIcon, name: t('nav.appearance'), path: '/settings/appearance' },
      { icon: SettingsIcon, name: t('nav.company'), path: '/settings/company' },
    ],
  },
])

const isActive = (path) => route.path === path

const toggleSubmenu = (groupIndex, itemIndex) => {
  const key = `${groupIndex}-${itemIndex}`
  openSubmenu.value = openSubmenu.value === key ? null : key
}

const isAnySubmenuRouteActive = computed(() => {
  return menuGroups.value.some((group) =>
    group.items.some(
      (item) => item.subItems && item.subItems.some((subItem) => isActive(subItem.path)),
    ),
  )
})

const isSubmenuOpen = (groupIndex, itemIndex) => {
  const key = `${groupIndex}-${itemIndex}`
  return (
    openSubmenu.value === key ||
    (isAnySubmenuRouteActive.value &&
      menuGroups.value[groupIndex].items[itemIndex].subItems?.some((subItem) =>
        isActive(subItem.path),
      ))
  )
}

const startTransition = (el) => {
  el.style.height = 'auto'
  const height = el.scrollHeight
  el.style.height = '0px'
  el.offsetHeight // force reflow
  el.style.height = height + 'px'
}

const endTransition = (el) => {
  el.style.height = ''
}
</script>
