import { onBeforeUnmount, watch, type Ref } from 'vue'

/**
 * Page scroll lock shared by every overlay. Counted, so a modal closing while a
 * drawer is still open does not hand scrolling back to the page underneath.
 */
let openOverlays = 0

const apply = () => {
  document.body.style.overflow = openOverlays > 0 ? 'hidden' : ''
}

export function useScrollLock(isOpen: Ref<boolean>) {
  let holding = false

  const release = () => {
    if (!holding) return
    holding = false
    openOverlays = Math.max(openOverlays - 1, 0)
    apply()
  }

  const acquire = () => {
    if (holding) return
    holding = true
    openOverlays += 1
    apply()
  }

  watch(isOpen, (value) => (value ? acquire() : release()), { immediate: true })

  onBeforeUnmount(release)
}
