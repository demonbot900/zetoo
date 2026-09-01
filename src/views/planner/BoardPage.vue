<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Board" />

    <BoardPicker v-if="!activeBoard" />

    <div v-else class="flex flex-col gap-6">
      <SprintHeader @create="openCreate(defaultStatus)" />

      <div class="flex flex-wrap items-center gap-3">
        <BoardFilters v-model:search="search" v-model:assignee="assignee" v-model:type="type" />

        <div class="ml-auto flex items-center gap-2">
          <button
            type="button"
            class="zt-btn-ghost py-2.5"
            :class="appearance.boardCompactCards ? 'border-brand-500 text-brand-500' : ''"
            @click="appearance.boardCompactCards = !appearance.boardCompactCards"
          >
            {{ appearance.boardCompactCards ? t('board.detailedCards') : t('board.compactCards') }}
          </button>
          <button type="button" class="zt-btn-ghost py-2.5" @click="open">
            {{ t('board.customise') }}
          </button>
        </div>
      </div>

      <!-- Columns ---------------------------------------------------- -->
      <div class="-mx-1 overflow-x-auto px-1 pb-2">
        <div class="flex items-start gap-5">
          <draggable
            :model-value="columns"
            item-key="id"
            handle=".column-drag-handle"
            :group="{ name: 'board-columns' }"
            ghost-class="board-column-ghost"
            :animation="appearance.reduceMotion ? 0 : 180"
            class="flex items-start gap-5"
            @update:model-value="onColumnsReordered"
          >
            <template #item="{ element }: { element: StatusColumn }">
              <BoardColumn
                :column="element"
                :issues="columnIssues(element.id)"
                @reorder="onCardsReordered"
                @update="updateColumn"
                @remove="removeColumn"
                @toggle-collapsed="toggleColumnCollapsed"
                @create="onQuickCreate"
                @open-full="openCreate"
                @open="selectIssue"
              />
            </template>
          </draggable>

          <!-- Add column ---------------------------------------------- -->
          <section class="w-72 shrink-0">
            <div
              v-if="isAddingColumn"
              class="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]"
            >
              <input
                ref="columnInput"
                v-model="newColumnName"
                type="text"
                placeholder="Column name"
                class="zt-input"
                @keyup.enter="commitColumn"
                @keyup.esc="cancelColumn"
              />
              <div class="mt-3 flex flex-wrap gap-1.5">
                <button
                  v-for="swatch in columnColors"
                  :key="swatch"
                  type="button"
                  class="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                  :style="{ backgroundColor: swatch }"
                  :class="
                    newColumnColor === swatch
                      ? 'border-gray-900 dark:border-white'
                      : 'border-transparent'
                  "
                  @click="newColumnColor = swatch"
                ></button>
              </div>
              <div class="mt-3 flex gap-2">
                <button type="button" class="zt-btn-primary px-3 py-2" @click="commitColumn">
                  {{ t('board.addColumn') }}
                </button>
                <button type="button" class="zt-btn-ghost px-3 py-2" @click="cancelColumn">
                  Cancel
                </button>
              </div>
            </div>

            <button
              v-else
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 py-4 text-theme-sm text-gray-500 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400"
              @click="startColumn"
            >
              <svg class="stroke-current" width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 4.5v11M4.5 10h11" stroke-width="1.6" stroke-linecap="round" />
              </svg>
              Add column
            </button>
          </section>
        </div>
      </div>

      <p class="text-theme-xs text-gray-500 dark:text-gray-400">
        Drag cards between columns to change status, drag the handle in a column header to reorder
        the workflow, and double-click a column name to rename it.
      </p>
    </div>

    <NewIssueModal :open="isCreateOpen" @close="isCreateOpen = false" @created="onCreated" />
    <IssueDetailPanel />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import draggable from 'vuedraggable'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BoardPicker from '@/components/planner/BoardPicker.vue'
import SprintHeader from '@/components/planner/SprintHeader.vue'
import BoardFilters from '@/components/planner/BoardFilters.vue'
import BoardColumn from '@/components/planner/BoardColumn.vue'
import IssueDetailPanel from '@/components/planner/IssueDetailPanel.vue'
import NewIssueModal from '@/components/planner/NewIssueModal.vue'
import { columnColors, usePlanner } from '@/composables/usePlanner'
import { useAppearance } from '@/composables/useAppearance'
import { useCustomizer } from '@/composables/useCustomizer'
import { useLocale } from '@/composables/useLocale'
import type { Issue, IssueStatus, StatusColumn } from '@/types/planner'

const {
  columns,
  sprintIssues,
  createIssue,
  selectIssue,
  updateIssue,
  setColumnOrder,
  normaliseOrder,
  addColumn,
  updateColumn,
  removeColumn,
  reorderColumns,
  toggleColumnCollapsed, activeBoard } = usePlanner()
const { appearance } = useAppearance()
const { open } = useCustomizer()
const { t } = useLocale()

const search = ref('')
const assignee = ref('all')
const type = ref('all')
const isCreateOpen = ref(false)
const pendingStatus = ref<IssueStatus | null>(null)
const isAddingColumn = ref(false)
const newColumnName = ref('')
const newColumnColor = ref(columnColors[1])
const columnInput = ref<HTMLInputElement | null>(null)

const defaultStatus = computed(() => columns[0]?.id ?? 'todo')

const filtered = computed(() =>
  sprintIssues.value.filter((issue) => {
    const matchesSearch =
      search.value.trim() === '' ||
      `${issue.id} ${issue.title} ${issue.labels.join(' ')}`
        .toLowerCase()
        .includes(search.value.trim().toLowerCase())
    const matchesAssignee = assignee.value === 'all' || issue.assigneeId === assignee.value
    const matchesType = type.value === 'all' || issue.type === type.value
    return matchesSearch && matchesAssignee && matchesType
  }),
)

const columnIssues = (status: IssueStatus) =>
  filtered.value.filter((issue) => issue.status === status).sort((a, b) => a.order - b.order)

/** Cards were dropped into (or reordered inside) one column. */
const onCardsReordered = (status: IssueStatus, items: Issue[]) => {
  setColumnOrder(
    status,
    items.map((issue) => issue.id),
  )
  normaliseOrder(status)
}

const onColumnsReordered = (items: StatusColumn[]) => {
  reorderColumns(items.map((column) => column.id))
}

const onQuickCreate = (status: IssueStatus, title: string) => {
  createIssue({ title, status })
}

const openCreate = (status: IssueStatus) => {
  pendingStatus.value = status
  isCreateOpen.value = true
}

// The modal always creates in its own default column; move it where it was asked for.
const onCreated = (id: string) => {
  if (pendingStatus.value) {
    updateIssue(id, { status: pendingStatus.value })
    normaliseOrder(pendingStatus.value)
    pendingStatus.value = null
  }
  selectIssue(id)
}

const startColumn = async () => {
  isAddingColumn.value = true
  await nextTick()
  columnInput.value?.focus()
}

const commitColumn = () => {
  const name = newColumnName.value.trim()
  if (!name) {
    cancelColumn()
    return
  }
  addColumn(name, newColumnColor.value)
  newColumnName.value = ''
  isAddingColumn.value = false
}

const cancelColumn = () => {
  isAddingColumn.value = false
  newColumnName.value = ''
}
</script>
