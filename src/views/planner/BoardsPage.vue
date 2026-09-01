<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Boards" />

    <div class="flex flex-col gap-4 md:gap-6">
      <!-- Totals across every board ------------------------------------ -->
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <article v-for="tile in totals" :key="tile.label" class="zt-card p-5">
          <p class="text-theme-sm text-gray-500 dark:text-gray-400">{{ tile.label }}</p>
          <p
            class="mt-2 text-title-sm font-semibold tabular-nums"
            :class="tile.alert ? 'text-error-500' : 'text-gray-800 dark:text-white/90'"
          >
            {{ tile.value }}
          </p>
        </article>
      </section>

      <!-- Boards -------------------------------------------------------- -->
      <section class="zt-card">
        <header
          class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800"
        >
          <div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Boards</h3>
            <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              Ein Board je Kundenauftrag — eigene Spalten, Sprints und Vorgänge.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <label class="flex items-center gap-2 text-theme-sm text-gray-600 dark:text-gray-300">
              <input
                v-model="showArchived"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-brand-500 dark:border-gray-700"
              />
              Archivierte zeigen
            </label>
            <button type="button" class="zt-btn-primary py-2.5" @click="openCreate">
              Board anlegen
            </button>
          </div>
        </header>

        <div class="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="row in visible"
            :key="row.board.id"
            class="flex flex-col rounded-2xl border p-5 transition-colors"
            :class="
              row.board.id === activeBoardId
                ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-500/10'
                : 'border-gray-200 dark:border-gray-800'
            "
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span
                    class="h-2.5 w-2.5 shrink-0 rounded-full"
                    :style="{ backgroundColor: row.board.color || '#98a2b3' }"
                  ></span>
                  <h4 class="truncate font-medium text-gray-800 dark:text-white/90">
                    {{ row.board.name }}
                  </h4>
                  <span
                    v-if="row.board.archived"
                    class="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  >
                    archiviert
                  </span>
                </div>
                <p class="mt-1 truncate text-theme-sm text-gray-500 dark:text-gray-400">
                  {{ row.board.client || 'Kein Auftraggeber' }}
                </p>
              </div>
              <span v-if="row.overdue" class="zt-chip bg-error-50 text-error-600 dark:bg-error-500/15">
                {{ row.overdue }} überfällig
              </span>
            </div>

            <p class="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
              {{ row.sprint ? row.sprint.name : 'Kein aktiver Sprint' }}
            </p>

            <div class="mt-4">
              <div class="flex items-center justify-between text-theme-xs">
                <span class="text-gray-500 dark:text-gray-400">
                  {{ row.done }} von {{ row.issues }} erledigt
                </span>
                <span class="tabular-nums text-gray-600 dark:text-gray-300">{{ row.percent }}%</span>
              </div>
              <div class="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  class="h-2 rounded-full bg-brand-500"
                  :style="{ width: `${row.percent}%` }"
                ></div>
              </div>
            </div>

            <dl class="mt-4 grid grid-cols-2 gap-3 text-theme-xs">
              <div>
                <dt class="text-gray-500 dark:text-gray-400">Geschätzt</dt>
                <dd class="tabular-nums text-gray-800 dark:text-white/90">{{ row.estimate }} h</dd>
              </div>
              <div>
                <dt class="text-gray-500 dark:text-gray-400">Gebucht</dt>
                <dd class="tabular-nums text-gray-800 dark:text-white/90">{{ row.logged }} h</dd>
              </div>
            </dl>

            <div class="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                v-if="row.board.id !== activeBoardId && !row.board.archived"
                type="button"
                class="zt-btn-ghost py-2"
                @click="open(row.board.id)"
              >
                Öffnen
              </button>
              <span v-else-if="!row.board.archived" class="zt-chip">geöffnet</span>
              <button type="button" class="zt-row-action" @click="openEdit(row.board)">
                Bearbeiten
              </button>
              <button
                type="button"
                class="zt-row-action"
                @click="archiveBoard(row.board.id, !row.board.archived)"
              >
                {{ row.board.archived ? 'Reaktivieren' : 'Archivieren' }}
              </button>
              <button
                type="button"
                class="zt-row-action hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/15"
                @click="deleting = row.board"
              >
                Löschen
              </button>
            </div>
          </article>

          <p
            v-if="!visible.length"
            class="col-span-full py-12 text-center text-theme-sm text-gray-500 dark:text-gray-400"
          >
            Noch kein Board angelegt.
            <button
              type="button"
              class="ml-1 font-medium text-brand-500 hover:text-brand-600"
              @click="openCreate"
            >
              Jetzt anlegen
            </button>
          </p>
        </div>
      </section>
    </div>

    <BoardFormModal :open="formOpen" :board="editing" @close="formOpen = false" />

    <ZModal
      :open="deleting !== null"
      title="Board löschen"
      subtitle="Vorgänge, Sprints und Spalten dieses Boards werden mitgelöscht."
      size="sm"
      @close="deleting = null"
    >
      <p class="text-theme-sm text-gray-600 dark:text-gray-300">
        <strong class="text-gray-800 dark:text-white/90">{{ deleting?.name }}</strong>
        wirklich löschen? Betroffen sind {{ issueCountOf(deleting?.id) }} Vorgänge. Das lässt sich
        nicht rückgängig machen.
      </p>
      <template #footer>
        <button type="button" class="zt-btn-ghost" @click="deleting = null">Abbrechen</button>
        <button type="button" class="zt-btn-primary bg-error-500 hover:bg-error-600" @click="doDelete">
          Löschen
        </button>
      </template>
    </ZModal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ZModal from '@/components/ui/ZModal.vue'
import BoardFormModal from '@/components/planner/BoardFormModal.vue'
import { usePlanner } from '@/composables/usePlanner'
import type { Board } from '@/types/planner'

const router = useRouter()
const { boardSummaries, activeBoardId, switchBoard, archiveBoard, deleteBoard, allIssues } =
  usePlanner()

const showArchived = ref(false)
const formOpen = ref(false)
const editing = ref<Board | null>(null)
const deleting = ref<Board | null>(null)

const visible = computed(() =>
  showArchived.value
    ? boardSummaries.value
    : boardSummaries.value.filter((row) => !row.board.archived),
)

const round = (hours: number) => Math.round(hours * 10) / 10

const totals = computed(() => {
  const rows = boardSummaries.value.filter((row) => !row.board.archived)
  const overdue = rows.reduce((sum, row) => sum + row.overdue, 0)
  return [
    { label: 'Aktive Boards', value: String(rows.length), alert: false },
    {
      label: 'Offene Vorgänge',
      value: String(rows.reduce((sum, row) => sum + (row.issues - row.done), 0)),
      alert: false,
    },
    {
      label: 'Gebuchte Stunden',
      value: `${round(rows.reduce((sum, row) => sum + row.logged, 0))} h`,
      alert: false,
    },
    { label: 'Überfällig', value: String(overdue), alert: overdue > 0 },
  ]
})

const issueCountOf = (boardId?: string) =>
  boardId ? allIssues.filter((issue) => issue.boardId === boardId).length : 0

const open = (id: string) => {
  switchBoard(id)
  router.push('/board')
}

const openCreate = () => {
  editing.value = null
  formOpen.value = true
}

const openEdit = (board: Board) => {
  editing.value = board
  formOpen.value = true
}

const doDelete = () => {
  if (deleting.value) deleteBoard(deleting.value.id)
  deleting.value = null
}
</script>
