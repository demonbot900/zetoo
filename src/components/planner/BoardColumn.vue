<template>
  <!-- Collapsed rail ------------------------------------------------- -->
  <section
    v-if="column.collapsed"
    class="flex w-12 shrink-0 cursor-pointer flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.02]"
    :title="`Expand ${column.name}`"
    @click="$emit('toggle-collapsed', column.id)"
  >
    <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: column.color }"></span>
    <span
      class="whitespace-nowrap text-theme-xs font-medium text-gray-600 dark:text-gray-300"
      style="writing-mode: vertical-rl"
    >
      {{ column.name }} · {{ issues.length }}
    </span>
  </section>

  <!-- Full column ---------------------------------------------------- -->
  <section
    v-else
    class="flex w-full shrink-0 flex-col rounded-2xl border bg-gray-50 p-4 dark:bg-white/[0.02] md:w-80"
    :class="
      overLimit
        ? 'border-error-300 dark:border-error-500/40'
        : 'border-gray-200 dark:border-gray-800'
    "
  >
    <header class="mb-4">
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <span
            class="column-drag-handle cursor-grab active:cursor-grabbing"
            title="Drag to reorder the column"
          >
            <svg class="fill-current text-gray-400" width="12" height="12" viewBox="0 0 20 20">
              <path
                d="M7 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM7 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM7 13a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
              />
            </svg>
          </span>
          <span
            class="h-2 w-2 shrink-0 rounded-full"
            :style="{ backgroundColor: column.color }"
          ></span>

          <input
            v-if="isRenaming"
            ref="renameInput"
            v-model="renameDraft"
            class="w-full rounded border border-brand-400 bg-white px-1.5 py-0.5 text-theme-sm font-medium text-gray-800 outline-none dark:bg-gray-900 dark:text-white/90"
            @keyup.enter="commitRename"
            @keyup.esc="isRenaming = false"
            @blur="commitRename"
          />
          <h3
            v-else
            class="truncate text-theme-sm font-medium text-gray-700 dark:text-gray-300"
            @dblclick="startRename"
          >
            {{ column.name }}
          </h3>

          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-theme-xs font-medium"
            :class="
              overLimit
                ? 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400'
                : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            "
          >
            {{ issues.length }}<template v-if="column.wipLimit">/{{ column.wipLimit }}</template>
          </span>
        </div>

        <div class="relative shrink-0">
          <button
            type="button"
            class="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-white/[0.06]"
            :aria-label="`${column.name} column options`"
            @click="isMenuOpen = !isMenuOpen"
          >
            <svg class="fill-current" width="16" height="16" viewBox="0 0 20 20">
              <path
                d="M10 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
              />
            </svg>
          </button>

          <template v-if="isMenuOpen">
            <div class="fixed inset-0 z-9" @click="isMenuOpen = false"></div>
            <div
              class="absolute right-0 top-9 z-99 w-60 rounded-xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <button
                type="button"
                class="block w-full rounded-lg px-2.5 py-2 text-left text-theme-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                @click="startRename"
              >
                Rename column
              </button>
              <button
                type="button"
                class="block w-full rounded-lg px-2.5 py-2 text-left text-theme-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
                @click="collapse"
              >
                Collapse column
              </button>

              <div class="my-2 border-t border-gray-200 pt-2 dark:border-gray-800">
                <p class="mb-1.5 text-theme-xs text-gray-500 dark:text-gray-400">Colour</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="swatch in columnColors"
                    :key="swatch"
                    type="button"
                    class="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                    :style="{ backgroundColor: swatch }"
                    :class="
                      column.color === swatch
                        ? 'border-gray-900 dark:border-white'
                        : 'border-transparent'
                    "
                    @click="$emit('update', column.id, { color: swatch })"
                  ></button>
                </div>
              </div>

              <div class="my-2 border-t border-gray-200 pt-2 dark:border-gray-800">
                <label
                  :for="`wip-${column.id}`"
                  class="mb-1.5 block text-theme-xs text-gray-500 dark:text-gray-400"
                >
                  WIP limit (0 = none)
                </label>
                <input
                  :id="`wip-${column.id}`"
                  type="number"
                  min="0"
                  max="50"
                  :value="column.wipLimit ?? 0"
                  class="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2.5 text-theme-sm text-gray-800 outline-none dark:border-gray-700 dark:text-white/90"
                  @change="setWipLimit(($event.target as HTMLInputElement).value)"
                />
              </div>

              <div class="mt-2 border-t border-gray-200 pt-2 dark:border-gray-800">
                <button
                  type="button"
                  class="block w-full rounded-lg px-2.5 py-2 text-left text-theme-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06] !text-error-500"
                  @click="requestRemove"
                >
                  Delete column
                </button>
                <p class="mt-1 text-theme-xs text-gray-400">
                  Cards move to the first remaining column.
                </p>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div
        class="mt-2 flex items-center justify-between text-theme-xs text-gray-500 dark:text-gray-400"
      >
        <span>{{ hours }}h estimated</span>
        <span v-if="overLimit" class="font-medium text-error-500">Over WIP limit</span>
      </div>
    </header>

    <draggable
      :model-value="issues"
      :group="{ name: 'board-cards' }"
      item-key="id"
      class="flex min-h-24 flex-1 flex-col gap-3"
      ghost-class="board-card-ghost"
      drag-class="board-card-drag"
      :animation="appearance.reduceMotion ? 0 : 180"
      @update:model-value="(items: Issue[]) => $emit('reorder', column.id, items)"
    >
      <template #item="{ element }: { element: Issue }">
        <div>
          <IssueCard :issue="element" @open="$emit('open', $event)" />
        </div>
      </template>
    </draggable>

    <!-- Composer -------------------------------------------------- -->
    <div v-if="isComposing" class="mt-3">
      <textarea
        ref="composerInput"
        v-model="composerTitle"
        rows="2"
        placeholder="What needs to happen?"
        class="w-full rounded-xl border border-brand-400 bg-white p-3 text-theme-sm text-gray-800 outline-none dark:bg-gray-900 dark:text-white/90"
        @keydown.enter.prevent="commitCompose"
        @keyup.esc="cancelCompose"
      ></textarea>
      <div class="mt-2 flex items-center gap-2">
        <button type="button" class="zt-btn-primary px-3 py-2" @click="commitCompose">
          Add card
        </button>
        <button type="button" class="zt-btn-ghost px-3 py-2" @click="cancelCompose">Cancel</button>
        <button
          type="button"
          class="ml-auto text-theme-xs font-medium text-brand-500 hover:text-brand-600"
          @click="$emit('open-full', column.id)"
        >
          Add details
        </button>
      </div>
    </div>

    <button
      v-else
      type="button"
      class="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-theme-sm text-gray-500 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400"
      @click="startCompose"
    >
      <svg class="stroke-current" width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M10 4.5v11M4.5 10h11" stroke-width="1.6" stroke-linecap="round" />
      </svg>
      {{ t('board.addCard') }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import draggable from 'vuedraggable'
import IssueCard from './IssueCard.vue'
import { columnColors } from '@/composables/usePlanner'
import { useAppearance } from '@/composables/useAppearance'
import { useLocale } from '@/composables/useLocale'
import type { Issue, IssueStatus, StatusColumn } from '@/types/planner'

const props = defineProps<{ column: StatusColumn; issues: Issue[] }>()

const emit = defineEmits<{
  reorder: [status: IssueStatus, items: Issue[]]
  update: [status: IssueStatus, patch: Partial<StatusColumn>]
  remove: [status: IssueStatus]
  'toggle-collapsed': [status: IssueStatus]
  create: [status: IssueStatus, title: string]
  'open-full': [status: IssueStatus]
  open: [id: string]
}>()

const { appearance } = useAppearance()
const { t } = useLocale()

const isMenuOpen = ref(false)
const isRenaming = ref(false)
const renameDraft = ref('')
const renameInput = ref<HTMLInputElement | null>(null)
const isComposing = ref(false)
const composerTitle = ref('')
const composerInput = ref<HTMLTextAreaElement | null>(null)

const hours = computed(() => props.issues.reduce((sum, issue) => sum + issue.estimateHours, 0))

const overLimit = computed(
  () => props.column.wipLimit !== null && props.issues.length > props.column.wipLimit,
)

const collapse = () => {
  emit('toggle-collapsed', props.column.id)
  isMenuOpen.value = false
}

const requestRemove = () => {
  emit('remove', props.column.id)
  isMenuOpen.value = false
}

const startRename = async () => {
  renameDraft.value = props.column.name
  isRenaming.value = true
  isMenuOpen.value = false
  await nextTick()
  renameInput.value?.focus()
  renameInput.value?.select()
}

const commitRename = () => {
  if (!isRenaming.value) return
  const name = renameDraft.value.trim()
  if (name && name !== props.column.name) emit('update', props.column.id, { name })
  isRenaming.value = false
}

const setWipLimit = (value: string) => {
  const parsed = Number(value)
  emit('update', props.column.id, {
    wipLimit: Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null,
  })
}

const startCompose = async () => {
  isComposing.value = true
  await nextTick()
  composerInput.value?.focus()
}

const commitCompose = () => {
  const title = composerTitle.value.trim()
  if (!title) {
    cancelCompose()
    return
  }
  emit('create', props.column.id, title)
  composerTitle.value = ''
  // Stay open so several cards can be added in a row, the way Trello does.
  composerInput.value?.focus()
}

const cancelCompose = () => {
  isComposing.value = false
  composerTitle.value = ''
}
</script>
