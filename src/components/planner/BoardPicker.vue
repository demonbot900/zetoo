<template>
  <section class="zt-card p-8 text-center sm:p-12">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
      {{ activeBoards.length ? 'Board auswählen' : 'Noch kein Board' }}
    </h3>
    <p class="mx-auto mt-2 max-w-md text-theme-sm text-gray-500 dark:text-gray-400">
      {{
        activeBoards.length
          ? 'Vorgänge, Sprints und Spalten gehören zu je einem Kundenauftrag. Wähle das Board, an dem du arbeiten möchtest.'
          : 'Lege ein Board für deinen ersten Kundenauftrag an.'
      }}
    </p>

    <ul v-if="activeBoards.length" class="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
      <li v-for="row in summaries" :key="row.board.id">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-brand-500 hover:bg-brand-50/40 dark:border-gray-800 dark:hover:bg-brand-500/10"
          @click="switchBoard(row.board.id)"
        >
          <span
            class="h-3 w-3 shrink-0 rounded-full"
            :style="{ backgroundColor: row.board.color || '#98a2b3' }"
          ></span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium text-gray-800 dark:text-white/90">
              {{ row.board.name }}
            </span>
            <span class="block truncate text-theme-xs text-gray-500 dark:text-gray-400">
              {{ row.board.client || 'Kein Auftraggeber' }} · {{ row.issues }} Vorgänge
            </span>
          </span>
        </button>
      </li>
    </ul>

    <RouterLink to="/boards" class="zt-btn-primary mt-8 inline-flex">
      {{ activeBoards.length ? 'Alle Boards verwalten' : 'Board anlegen' }}
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { usePlanner } from '@/composables/usePlanner'

const { activeBoards, boardSummaries, switchBoard } = usePlanner()

const summaries = computed(() => boardSummaries.value.filter((row) => !row.board.archived))
</script>
