<template>
  <div ref="root" class="relative" :class="block ? 'w-full' : ''">
    <button
      :id="id"
      ref="trigger"
      type="button"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-controls="`${listId}`"
      :aria-label="ariaLabel"
      :disabled="disabled"
      class="flex w-full items-center justify-between gap-2 rounded-lg border bg-transparent text-left transition-colors focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-900"
      :class="[
        sizeClass,
        isOpen
          ? 'border-brand-400 dark:border-brand-500'
          : 'border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600',
      ]"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span class="flex min-w-0 items-center gap-2">
        <span v-if="selected?.icon" class="shrink-0 text-base leading-none">{{ selected.icon }}</span>
        <span
          v-if="selected?.color"
          class="h-2.5 w-2.5 shrink-0 rounded-full"
          :style="{ backgroundColor: selected.color }"
        ></span>
        <span
          class="truncate"
          :class="
            selected ? 'text-gray-800 dark:text-white/90' : 'text-gray-400 dark:text-white/30'
          "
        >
          {{ selected?.short ?? selected?.label ?? placeholder }}
        </span>
      </span>

      <svg
        class="shrink-0 stroke-current text-gray-400 transition-transform"
        :class="isOpen ? 'rotate-180' : ''"
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path
          d="m5 7.5 5 5 5-5"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <transition name="z-select">
      <div
        v-if="isOpen"
        :id="listId"
        role="listbox"
        class="absolute left-0 z-99999 mt-2 w-full min-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
        :class="dropUp ? 'bottom-full mb-2 mt-0' : ''"
      >
        <div v-if="isSearchable" class="border-b border-gray-200 p-2 dark:border-gray-800">
          <input
            ref="searchInput"
            v-model="query"
            type="text"
            :placeholder="searchPlaceholder"
            class="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-theme-sm text-gray-800 outline-none focus:border-brand-400 dark:border-gray-700 dark:text-white/90"
            @keydown="onSearchKeydown"
          />
        </div>

        <ul ref="list" class="max-h-64 overflow-y-auto p-1.5">
          <template v-for="entry in visibleEntries" :key="entry.key">
            <li
              v-if="entry.type === 'group'"
              class="px-2.5 pb-1 pt-2.5 text-theme-xs font-medium uppercase tracking-wide text-gray-400"
            >
              {{ entry.label }}
            </li>
            <li v-else>
              <button
                type="button"
                role="option"
                :aria-selected="entry.option.value === modelValue"
                class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors"
                :class="[
                  entry.index === activeIndex ? 'bg-gray-100 dark:bg-white/[0.06]' : '',
                  entry.option.value === modelValue
                    ? 'text-brand-500 dark:text-brand-400'
                    : 'text-gray-700 dark:text-gray-300',
                ]"
                @click="choose(entry.option)"
                @mousemove="activeIndex = entry.index"
              >
                <span v-if="entry.option.icon" class="shrink-0 text-base leading-none">
                  {{ entry.option.icon }}
                </span>
                <span
                  v-if="entry.option.color"
                  class="h-2.5 w-2.5 shrink-0 rounded-full"
                  :style="{ backgroundColor: entry.option.color }"
                ></span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-theme-sm">{{ entry.option.label }}</span>
                  <span
                    v-if="entry.option.hint"
                    class="block truncate text-theme-xs text-gray-500 dark:text-gray-400"
                  >
                    {{ entry.option.hint }}
                  </span>
                </span>
                <svg
                  v-if="entry.option.value === modelValue"
                  class="shrink-0 stroke-current"
                  width="15"
                  height="15"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="m4.5 10.5 3.5 3.5 7.5-7.5"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </li>
          </template>

          <li
            v-if="!optionEntries.length"
            class="px-2.5 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
          >
            Nothing matches “{{ query }}”.
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface ZSelectOption {
  value: string | number | null
  label: string
  /** Emoji rendered before the label — used for language flags. */
  icon?: string
  /** Shorter label for the closed trigger, e.g. a language code. */
  short?: string
  /** Secondary line under the label. */
  hint?: string
  /** Optional dot colour, e.g. a board column. */
  color?: string
  /** Options sharing a group render under one heading. */
  group?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null
    options: ZSelectOption[]
    placeholder?: string
    ariaLabel?: string
    id?: string
    disabled?: boolean
    block?: boolean
    size?: 'sm' | 'md'
    /** Forces the search box on or off; by default it appears from 8 options. */
    searchable?: boolean | null
    searchPlaceholder?: string
  }>(),
  {
    placeholder: 'Select…',
    ariaLabel: undefined,
    id: undefined,
    disabled: false,
    block: true,
    size: 'md',
    searchable: null,
    searchPlaceholder: 'Search…',
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number | null] }>()

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const list = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(0)
const dropUp = ref(false)

const listId = `z-select-${Math.random().toString(36).slice(2, 8)}`

const sizeClass = computed(() =>
  props.size === 'sm' ? 'h-9 px-3 text-theme-sm' : 'h-11 px-4 text-theme-sm',
)

const selected = computed(
  () => props.options.find((option) => option.value === props.modelValue) ?? null,
)

const isSearchable = computed(() =>
  props.searchable === null ? props.options.length > 8 : props.searchable,
)

const matches = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return props.options
  return props.options.filter((option) =>
    `${option.label} ${option.hint ?? ''} ${option.group ?? ''}`.toLowerCase().includes(term),
  )
})

/** Flattened render list: group headings interleaved with selectable options. */
const visibleEntries = computed(() => {
  const entries: (
    | { type: 'group'; key: string; label: string }
    | { type: 'option'; key: string; option: ZSelectOption; index: number }
  )[] = []
  let currentGroup: string | undefined
  let index = 0

  for (const option of matches.value) {
    if (option.group && option.group !== currentGroup) {
      currentGroup = option.group
      entries.push({ type: 'group', key: `group-${option.group}`, label: option.group })
    }
    entries.push({ type: 'option', key: `option-${String(option.value)}`, option, index })
    index += 1
  }

  return entries
})

const optionEntries = computed(() =>
  visibleEntries.value.filter(
    (entry): entry is { type: 'option'; key: string; option: ZSelectOption; index: number } =>
      entry.type === 'option',
  ),
)

const open = async () => {
  if (props.disabled) return
  isOpen.value = true
  query.value = ''
  activeIndex.value = Math.max(
    optionEntries.value.findIndex((entry) => entry.option.value === props.modelValue),
    0,
  )

  await nextTick()
  // Flip the panel upwards when there is no room below.
  const rect = trigger.value?.getBoundingClientRect()
  dropUp.value = rect ? window.innerHeight - rect.bottom < 280 && rect.top > 280 : false
  if (isSearchable.value) searchInput.value?.focus()
  scrollActiveIntoView()
}

const close = () => {
  isOpen.value = false
  query.value = ''
}

const toggle = () => (isOpen.value ? close() : open())

const choose = (option: ZSelectOption) => {
  emit('update:modelValue', option.value)
  close()
  trigger.value?.focus()
}

const scrollActiveIntoView = () => {
  const active = list.value?.querySelectorAll('[role="option"]')[activeIndex.value]
  if (active instanceof HTMLElement) active.scrollIntoView({ block: 'nearest' })
}

const move = (delta: number) => {
  const total = optionEntries.value.length
  if (!total) return
  activeIndex.value = (activeIndex.value + delta + total) % total
  scrollActiveIntoView()
}

const commitActive = () => {
  const entry = optionEntries.value[activeIndex.value]
  if (entry) choose(entry.option)
}

const onTriggerKeydown = (event: KeyboardEvent) => {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
    if (!isOpen.value) {
      event.preventDefault()
      open()
      return
    }
  }
  if (!isOpen.value) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    commitActive()
  } else if (event.key === 'Escape') {
    // Swallow it: closing the dropdown must not also close a host drawer.
    event.preventDefault()
    event.stopPropagation()
    close()
  }
}

const onSearchKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    commitActive()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
    trigger.value?.focus()
  }
}

watch(query, () => {
  activeIndex.value = 0
})

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return
  if (root.value && !root.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<style scoped>
.z-select-enter-active,
.z-select-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}

.z-select-enter-from,
.z-select-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
