<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Zeiterfassung" />

    <div class="flex flex-col gap-4 md:gap-6">
      <!-- Filters -------------------------------------------------- -->
      <section class="zt-card p-5 sm:p-6">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div class="flex flex-wrap items-end gap-3">
            <div class="min-w-52">
              <label for="filter-project" class="zt-label">Projekt</label>
              <ZSelect
                id="filter-project"
                v-model="selectedProjectId"
                :options="projectOptions"
                aria-label="Projekt"
                block
              />
            </div>
            <div class="min-w-44">
              <label for="filter-member" class="zt-label">Mitarbeitende Person</label>
              <ZSelect
                id="filter-member"
                v-model="memberFilter"
                :options="memberOptions"
                aria-label="Mitarbeitende Person"
                block
              />
            </div>
            <PeriodPicker />
          </div>

          <button
            type="button"
            class="zt-btn-primary py-2.5"
            :disabled="!selectedProjectId"
            @click="openCreate"
          >
            Leistung erfassen
          </button>
        </div>
      </section>

      <!-- Totals --------------------------------------------------- -->
      <section class="grid gap-4 sm:grid-cols-3 md:gap-6">
        <article class="zt-card p-5">
          <p class="text-theme-sm text-gray-500 dark:text-gray-400">Stunden im Zeitraum</p>
          <p class="mt-2 text-title-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
            {{ formatHours(filteredTotal) }}
          </p>
        </article>
        <article class="zt-card p-5">
          <p class="text-theme-sm text-gray-500 dark:text-gray-400">Erfasste Positionen</p>
          <p class="mt-2 text-title-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
            {{ filteredEntries.length }}
          </p>
        </article>
        <article class="zt-card p-5">
          <p class="text-theme-sm text-gray-500 dark:text-gray-400">Kategorien</p>
          <ul class="mt-2 flex flex-wrap gap-1.5">
            <li v-for="row in categoryTotals" :key="row.category">
              <span class="zt-chip">{{ row.category }} · {{ formatHours(row.hours) }}</span>
            </li>
            <li
              v-if="!categoryTotals.length"
              class="text-theme-sm text-gray-500 dark:text-gray-400"
            >
              —
            </li>
          </ul>
        </article>
      </section>

      <!-- Entries -------------------------------------------------- -->
      <section class="zt-card">
        <header class="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Leistungen</h3>
          <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {{ formatDateDE(period.from) }} – {{ formatDateDE(period.to) }}
          </p>
        </header>

        <RecordPreviewTable
          :entries="filteredEntries"
          :total="filteredTotal"
          editable
          @edit="openEdit"
          @remove="confirmRemove"
        />
      </section>
    </div>

    <TimeEntryFormModal
      :open="formOpen"
      :entry="editing"
      :project-id="selectedProjectId"
      @close="formOpen = false"
    />

    <ZModal
      :open="removing !== null"
      title="Leistung löschen"
      size="sm"
      @close="removing = null"
    >
      <p class="text-theme-sm text-gray-600 dark:text-gray-300">
        Eintrag vom {{ removing ? formatDateDE(removing.date) : '' }} über
        {{ removing ? formatHours(removing.hours) : '' }} Stunden wirklich löschen?
      </p>
      <template #footer>
        <button type="button" class="zt-btn-ghost" @click="removing = null">Abbrechen</button>
        <button
          type="button"
          class="zt-btn-primary bg-error-500 hover:bg-error-600"
          @click="doRemove"
        >
          Löschen
        </button>
      </template>
    </ZModal>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ZSelect from '@/components/ui/ZSelect.vue'
import ZModal from '@/components/ui/ZModal.vue'
import PeriodPicker from '@/components/records/PeriodPicker.vue'
import RecordPreviewTable from '@/components/records/RecordPreviewTable.vue'
import TimeEntryFormModal from '@/components/records/TimeEntryFormModal.vue'
import { formatDateDE, formatHours, useRecords } from '@/composables/useRecords'
import { useWorkspace } from '@/composables/useWorkspace'
import type { TimeEntry } from '@/types/records'

const { activeProjects, selectedProjectId, period, entriesInPeriod, sumHours, deleteEntry } =
  useRecords()
const { activeMembers } = useWorkspace()

const memberFilter = ref<string>('')
const formOpen = ref(false)
const editing = ref<TimeEntry | null>(null)
const removing = ref<TimeEntry | null>(null)

const projectOptions = computed(() =>
  activeProjects.value.map((project) => ({ value: project.id, label: project.name })),
)

const memberOptions = computed(() => [
  { value: '', label: 'Alle' },
  ...activeMembers.value.map((member) => ({
    value: member.id,
    label: `${member.firstName} ${member.lastName}`.trim() || member.email,
  })),
])

const filteredEntries = computed(() =>
  memberFilter.value
    ? entriesInPeriod.value.filter((entry) => entry.memberId === memberFilter.value)
    : entriesInPeriod.value,
)

const filteredTotal = computed(() => sumHours(filteredEntries.value))

const categoryTotals = computed(() => {
  const map = new Map<string, number>()
  filteredEntries.value.forEach((entry) => {
    map.set(entry.category, (map.get(entry.category) ?? 0) + entry.hours)
  })
  return [...map.entries()]
    .map(([category, hours]) => ({ category, hours: Math.round(hours * 100) / 100 }))
    .sort((a, b) => b.hours - a.hours)
})

const openCreate = () => {
  editing.value = null
  formOpen.value = true
}

const openEdit = (entry: TimeEntry) => {
  editing.value = entry
  formOpen.value = true
}

const confirmRemove = (entry: TimeEntry) => {
  removing.value = entry
}

const doRemove = () => {
  if (removing.value) deleteEntry(removing.value.id)
  removing.value = null
}
</script>
