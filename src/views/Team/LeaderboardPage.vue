<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Rangliste" />

    <div class="flex flex-col gap-4 md:gap-6">
      <section class="zt-card p-5 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
              Wer trägt seine Zeiten ein
            </h3>
            <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              Punkte für jeden erfassten Arbeitstag, extra fürs Eintragen am selben Tag und für
              volle Tage. Abzüge gibt es keine — nur die Serie reißt.
            </p>
          </div>
          <div class="flex gap-2">
            <button
              v-for="option in RANGES"
              :key="option.days"
              type="button"
              class="rounded-lg border px-3 py-2 text-theme-xs font-medium transition-colors"
              :class="
                days === option.days
                  ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15'
                  : 'border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400'
              "
              @click="select(option.days)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </section>

      <!-- Podium ---------------------------------------------------------- -->
      <section v-if="rows.length" class="grid gap-4 sm:grid-cols-3 md:gap-6">
        <article
          v-for="row in rows.slice(0, 3)"
          :key="row.memberId"
          class="zt-card p-5 text-center"
          :class="row.rank === 1 ? 'border-brand-500' : ''"
        >
          <p class="text-title-sm">{{ MEDALS[row.rank - 1] }}</p>
          <p class="mt-2 truncate font-semibold text-gray-800 dark:text-white/90">{{ row.name }}</p>
          <p class="text-theme-xs text-gray-500 dark:text-gray-400">
            Level {{ row.level }} · {{ row.levelName }}
          </p>
          <p class="mt-3 text-title-sm font-semibold tabular-nums text-brand-500">
            {{ row.points }}
          </p>
          <p class="text-theme-xs text-gray-500 dark:text-gray-400">Punkte</p>
        </article>
      </section>

      <!-- Table ----------------------------------------------------------- -->
      <section class="zt-card">
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-800">
                <th
                  v-for="column in COLUMNS"
                  :key="column.key"
                  class="px-4 py-3 text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  :class="column.align === 'right' ? 'text-right' : 'text-left'"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.memberId"
                class="border-b border-gray-100 last:border-0 dark:border-gray-800/60"
                :class="row.memberId === currentUser?.id ? 'bg-brand-50/40 dark:bg-brand-500/10' : ''"
              >
                <td class="px-4 py-3 text-theme-sm tabular-nums text-gray-500">{{ row.rank }}</td>
                <td class="px-4 py-3">
                  <span class="font-medium text-gray-800 dark:text-white/90">{{ row.name }}</span>
                  <span
                    v-if="!row.bookedToday"
                    class="ml-2 rounded-full bg-orange-50 px-2 py-0.5 text-theme-xs text-orange-600 dark:bg-orange-500/15"
                  >
                    heute offen
                  </span>
                </td>
                <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                  {{ row.levelName }}
                </td>
                <td class="px-4 py-3 text-right text-theme-sm tabular-nums">
                  <span v-if="row.streak" class="font-medium text-gray-800 dark:text-white/90">
                    {{ row.streak }}&nbsp;🔥
                  </span>
                  <span v-else class="text-gray-400">—</span>
                </td>
                <td class="px-4 py-3 text-right text-theme-sm tabular-nums text-gray-600 dark:text-gray-300">
                  {{ row.bookedDays }} / {{ row.expectedDays }}
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <div class="h-2 w-16 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        class="h-2 rounded-full"
                        :class="row.coverage >= 80 ? 'bg-success-500' : row.coverage >= 50 ? 'bg-orange-400' : 'bg-error-500'"
                        :style="{ width: `${Math.min(100, row.coverage)}%` }"
                      ></div>
                    </div>
                    <span class="w-10 text-theme-sm tabular-nums text-gray-600 dark:text-gray-300">
                      {{ row.coverage }}%
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 text-right text-theme-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
                  {{ row.points }}
                </td>
              </tr>

              <tr v-if="!rows.length">
                <td colspan="7" class="px-4 py-12 text-center text-theme-sm text-gray-500">
                  Noch keine erfassten Zeiten.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- How it is counted ------------------------------------------------ -->
      <section class="zt-card p-5 sm:p-6">
        <h4 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          So kommen die Punkte zustande
        </h4>
        <ul class="mt-3 grid gap-2 text-theme-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
          <li v-for="rule in RULES" :key="rule.label" class="flex items-baseline gap-2">
            <span class="w-14 shrink-0 font-medium tabular-nums text-brand-500">{{ rule.points }}</span>
            <span>{{ rule.label }}</span>
          </li>
        </ul>
        <p class="mt-4 text-theme-xs text-gray-500 dark:text-gray-400">
          Punkte werden bei jedem Aufruf aus den Zeiteinträgen berechnet, nicht gespeichert. Wird ein
          Eintrag korrigiert oder gelöscht, stimmt der Stand sofort wieder.
        </p>
      </section>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useWorkspace } from '@/composables/useWorkspace'

interface Row {
  rank: number
  memberId: string
  name: string
  level: number
  levelName: string
  points: number
  streak: number
  bookedDays: number
  expectedDays: number
  coverage: number
  bookedToday: boolean
}

const MEDALS = ['🥇', '🥈', '🥉']

const RANGES = [
  { days: 30, label: '30 Tage' },
  { days: 90, label: '90 Tage' },
  { days: 365, label: 'Jahr' },
]

const COLUMNS = [
  { key: 'rank', label: '#' },
  { key: 'name', label: 'Person' },
  { key: 'level', label: 'Level' },
  { key: 'streak', label: 'Serie', align: 'right' as const },
  { key: 'days', label: 'Tage erfasst', align: 'right' as const },
  { key: 'coverage', label: 'Abdeckung', align: 'right' as const },
  { key: 'points', label: 'Punkte', align: 'right' as const },
]

const RULES = [
  { points: '+10', label: 'je Arbeitstag, an dem Zeit erfasst wurde' },
  { points: '+5', label: 'wenn am selben Tag eingetragen, nicht nachgetragen' },
  { points: '+5', label: 'wenn der Tag die eigene Tageskapazität erreicht' },
  { points: '+2', label: 'je Tag laufender Serie, gedeckelt bei 10' },
]

const { currentUser } = useWorkspace()
const rows = ref<Row[]>([])
const days = ref(90)

const load = async () => {
  const response = await fetch(`/api/leaderboard?days=${days.value}`)
  if (!response.ok) return
  rows.value = ((await response.json()) as { rows: Row[] }).rows
}

const select = (value: number) => {
  days.value = value
  load()
}

onMounted(load)
</script>
