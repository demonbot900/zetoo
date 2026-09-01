<template>
  <Teleport to="body">
    <transition name="z-overlay">
      <div
        v-if="open"
        class="fixed inset-0 z-99999 bg-gray-900/45 backdrop-blur-[3px]"
        aria-hidden="true"
        @click="onBackdrop"
      ></div>
    </transition>

    <transition :name="side === 'right' ? 'z-drawer-right' : 'z-drawer-left'">
      <aside
        v-if="open"
        ref="panel"
        class="fixed top-0 z-999999 flex h-dvh w-full flex-col bg-white shadow-theme-xl outline-none dark:bg-gray-900"
        :class="[side === 'right' ? 'right-0' : 'left-0', widthClass]"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
        @keydown.esc.stop="$emit('close')"
      >
        <ZOverlayChrome :title="title" :subtitle="subtitle" @close="$emit('close')">
          <template v-if="$slots.icon" #icon><slot name="icon" /></template>
          <template v-if="$slots.badges" #badges><slot name="badges" /></template>
        </ZOverlayChrome>

        <!-- Optional tab rail -->
        <nav
          v-if="tabs.length > 1"
          class="flex gap-1 overflow-x-auto border-b border-gray-200 px-3 no-scrollbar dark:border-gray-800 sm:px-4"
        >
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="relative -mb-px shrink-0 border-b-2 px-3 py-3 text-theme-sm font-medium transition-colors"
            :class="
              tab.id === activeTab
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            "
            @click="$emit('update:activeTab', tab.id)"
          >
            {{ tab.label }}
            <span
              v-if="tab.count !== undefined"
              class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            >
              {{ tab.count }}
            </span>
          </button>
        </nav>

        <div class="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <slot />
        </div>

        <footer
          v-if="$slots.footer"
          class="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6"
        >
          <slot name="footer" />
        </footer>
      </aside>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import ZOverlayChrome from './ZOverlayChrome.vue'
import { useScrollLock } from '@/composables/useScrollLock'

export interface DrawerTab {
  id: string
  label: string
  count?: number
}

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    subtitle?: string
    side?: 'right' | 'left'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    closeOnBackdrop?: boolean
    tabs?: DrawerTab[]
    activeTab?: string
  }>(),
  {
    subtitle: undefined,
    side: 'right',
    size: 'md',
    closeOnBackdrop: true,
    tabs: () => [],
    activeTab: undefined,
  },
)

const emit = defineEmits<{ close: []; 'update:activeTab': [id: string] }>()

const panel = ref<HTMLElement | null>(null)

const widthClass = computed(
  () =>
    ({
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-xl',
      xl: 'max-w-3xl',
    })[props.size],
)

const onBackdrop = () => {
  if (props.closeOnBackdrop) emit('close')
}

useScrollLock(toRef(props, 'open'))

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    await nextTick()
    panel.value?.focus()
  },
  { immediate: true },
)
</script>

<style scoped>
.z-overlay-enter-active,
.z-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.z-overlay-enter-from,
.z-overlay-leave-to {
  opacity: 0;
}

.z-drawer-right-enter-active,
.z-drawer-right-leave-active,
.z-drawer-left-enter-active,
.z-drawer-left-leave-active {
  transition: transform 0.26s cubic-bezier(0.32, 0.72, 0, 1);
}

.z-drawer-right-enter-from,
.z-drawer-right-leave-to {
  transform: translateX(100%);
}

.z-drawer-left-enter-from,
.z-drawer-left-leave-to {
  transform: translateX(-100%);
}
</style>
