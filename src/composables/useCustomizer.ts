import { ref } from 'vue'

/** Shared open state for the theme slide-over, driven from the app header. */
const isCustomizerOpen = ref(false)

export function useCustomizer() {
  const open = () => {
    isCustomizerOpen.value = true
  }
  const close = () => {
    isCustomizerOpen.value = false
  }
  const toggle = () => {
    isCustomizerOpen.value = !isCustomizerOpen.value
  }

  return { isCustomizerOpen, open, close, toggle }
}
