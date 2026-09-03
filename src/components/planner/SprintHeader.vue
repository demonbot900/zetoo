<template>
  <section
    class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
  >
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <!-- Board switcher: which client engagement this sprint belongs to. -->
        <div v-if="activeBoards.length > 1" class="mb-3 w-56">
          <ZSelect
            :model-value="activeBoardId"
            :options="boardOptions"
            aria-label="Board"
            size="sm"
            block
            @update:model-value="(id) => switchBoard(String(id))"
          />
        </div>
        <div v-else-if="activeBoard" class="mb-2 flex items-center gap-2">
          <span
            class="h-2.5 w-2.5 rounded-full"
            :style="{ backgroundColor: activeBoard.color || '#98a2b3' }"
          ></span>
          <span class="text-theme-xs text-gray-500 dark:text-gray-400">
            {{ activeBoard.name }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <!--
            With more than one sprint the heading becomes a picker: the board
            shows exactly one sprint, and without this there is no way to reach
            the others.
          -->
          <ZSelect
            v-if="sprintOptions.length > 1"
            :model-value="activeSprint?.id ?? ''"
            :options="sprintOptions"
            aria-label="Sprint"
            menu-class="w-72"
            @update:model-value="(id) => (activeSprintId = String(id))"
          />
          <h2 v-else class="text-lg font-semibold text-gray-800 dark:text-white/90">
            {{ activeSprint?.name ?? 'Kein Sprint' }}
          </h2>
          <span
            v-if="activeSprint"
            class="rounded-full px-2.5 py-0.5 text-theme-xs font-medium"
            :class="
              activeSprint.state === 'active'
                ? 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400'
                : activeSprint.state === 'completed'
                  ? 'bg-success-50 text-success-600 dark:bg-success-500/15'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            "
          >
            {{
              activeSprint.state === 'active'
                ? 'Aktiv'
                : activeSprint.state === 'completed'
                  ? 'Abgeschlossen'
                  : 'Geplant'
            }}
          </span>
        </div>
        <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          {{ activeSprint?.goal || "Noch kein Sprintziel gesetzt." }}
        </p>
        <p class="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
          <template v-if="activeSprint">
            {{ formatDate(activeSprint.startDate) }} – {{ formatDate(activeSprint.endDate) }} ·
            {{ sprintDays.remaining }} of {{ sprintDays.total }} days left
          </template>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-6">
        <div v-for="stat in stats" :key="stat.label">
          <p class="text-theme-xs text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
          <p class="mt-0.5 text-lg font-semibold text-gray-800 dark:text-white/90">
            {{ stat.value }}
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white transition-colors hover:bg-brand-600"
          @click="$emit('create')"
        >
          <svg class="stroke-current" width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 4.5v11M4.5 10h11" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          New issue
        </button>
      </div>
    </div>

    <div class="mt-5">
      <div class="flex items-center justify-between text-theme-xs text-gray-500 dark:text-gray-400">
        <span>{{ sprintTotals.done }} of {{ sprintTotals.issues }} issues done</span>
        <span>{{ percentDone }}%</span>
      </div>
      <div class="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
        <div class="h-2 rounded-full bg-success-500" :style="{ width: `${percentDone}%` }"></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDate, usePlanner } from '@/composables/usePlanner'
import ZSelect from '@/components/ui/ZSelect.vue'

defineEmits<{ create: [] }>()

const {
  activeSprint,
  activeSprintId,
  sprints,
  issues,
  sprintTotals,
  sprintDays,
  activeBoard,
  activeBoards,
  activeBoardId,
  switchBoard,
} = usePlanner()

/** Every sprint of the open board, with how much work sits in it. */
const sprintOptions = computed(() =>
  sprints.value.map((sprint) => ({
    value: sprint.id,
    label: sprint.name,
    hint: `${issues.value.filter((issue) => issue.sprintId === sprint.id).length} Vorgänge · ${formatDate(sprint.startDate)} – ${formatDate(sprint.endDate)}`,
  })),
)

const boardOptions = computed(() =>
  activeBoards.value.map((board) => ({
    value: board.id,
    label: board.name,
    hint: board.client,
    color: board.color,
  })),
)

const percentDone = computed(() =>
  sprintTotals.value.issues === 0
    ? 0
    : Math.round((sprintTotals.value.done / sprintTotals.value.issues) * 100),
)

const stats = computed(() => [
  { label: 'Estimated', value: `${sprintTotals.value.estimate}h` },
  { label: 'Logged', value: `${sprintTotals.value.logged}h` },
  { label: 'Remaining', value: `${sprintTotals.value.remaining}h` },
  { label: 'Points', value: `${sprintTotals.value.donePoints}/${sprintTotals.value.points}` },
])
</script>
