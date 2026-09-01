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

    <transition name="z-modal">
      <div
        v-if="open"
        class="fixed inset-0 z-999999 flex items-end justify-center p-0 sm:items-center sm:p-6"
        @keydown.esc.stop="$emit('close')"
      >
        <div
          ref="panel"
          class="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-theme-xl outline-none dark:bg-gray-900 sm:rounded-3xl"
          :class="widthClass"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <ZOverlayChrome :title="title" :subtitle="subtitle" @close="$emit('close')">
            <template v-if="$slots.icon" #icon><slot name="icon" /></template>
            <template v-if="$slots.badges" #badges><slot name="badges" /></template>
          </ZOverlayChrome>

          <div class="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import ZOverlayChrome from './ZOverlayChrome.vue'
import { useScrollLock } from '@/composables/useScrollLock'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    subtitle?: string
    size?: 'sm' | 'md' | 'lg'
    closeOnBackdrop?: boolean
  }>(),
  { subtitle: undefined, size: 'md', closeOnBackdrop: true },
)

const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)

const widthClass = computed(() => ({ sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' })[props.size])

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

.z-modal-enter-active,
.z-modal-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
}

.z-modal-enter-from,
.z-modal-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
