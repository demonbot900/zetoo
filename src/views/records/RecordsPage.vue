<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Leistungsnachweis" />

    <div class="flex flex-col gap-4 md:gap-6">
      <!-- Controls -------------------------------------------------- -->
      <section class="zt-card p-5 sm:p-6">
        <div class="flex flex-wrap items-end gap-4">
          <div class="min-w-52">
            <label for="record-project" class="zt-label">Projekt</label>
            <ZSelect
              id="record-project"
              v-model="selectedProjectId"
              :options="projectOptions"
              aria-label="Projekt"
              block
            />
          </div>
          <PeriodPicker />
        </div>

        <div class="mt-5 grid gap-4 border-t border-gray-200 pt-5 dark:border-gray-800 sm:grid-cols-2">
          <div>
            <label for="record-reference" class="zt-label">Referenznummer</label>
            <input
              id="record-reference"
              v-model="reference"
              type="text"
              class="zt-input font-mono"
              placeholder="CODIN-RE-2026-0001"
            />
            <p class="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
              Vorbelegt aus dem Projektmuster
              <code class="font-mono">{{ selectedProject?.reference || '—' }}</code
              >. Hier frei überschreibbar.
            </p>
          </div>

          <div>
            <span class="zt-label">Dateiname des Exports</span>
            <p
              class="flex h-11 items-center overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 px-4 font-mono text-theme-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            >
              {{ fileName }}.docx&nbsp;/&nbsp;.pdf
            </p>
            <p class="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
              Datum folgt dem Beginn des gewählten Zeitraums.
            </p>
          </div>
        </div>
      </section>

      <!-- Document preview ------------------------------------------ -->
      <section class="zt-card">
        <header
          class="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6"
        >
          <div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
              Leistungsnachweis
            </h3>
            <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              {{ selectedProject?.client || 'Kein Auftraggeber hinterlegt' }} ·
              {{ formatDateDE(period.from) }} – {{ formatDateDE(period.to) }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span v-if="selectedProject?.templateName" class="zt-chip">
              {{ selectedProject.templateName }}
            </span>
            <span v-else class="zt-chip">Standardvorlage</span>
            <button
              type="button"
              class="zt-btn-ghost py-2.5"
              :disabled="!canExport || exporting !== null"
              @click="exportDocument('pdf')"
            >
              {{ exporting === 'pdf' ? 'Wird erstellt…' : 'Als PDF speichern' }}
            </button>
            <button
              type="button"
              class="zt-btn-primary py-2.5"
              :disabled="!canExport || exporting !== null"
              @click="exportDocument('docx')"
            >
              {{ exporting === 'docx' ? 'Wird erstellt…' : 'Als Word exportieren' }}
            </button>
          </div>
        </header>

        <p v-if="exportError" class="border-b border-error-200 bg-error-50 px-5 py-3 text-theme-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400 sm:px-6">
          {{ exportError }}
        </p>
        <p
          v-else-if="exportSuccess"
          class="border-b border-success-200 bg-success-50 px-5 py-3 text-theme-sm text-success-600 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-500 sm:px-6"
        >
          {{ exportSuccess }}
        </p>

        <!-- Header block mirroring the document -->
        <dl
          class="grid gap-x-8 gap-y-3 border-b border-gray-200 px-5 py-5 dark:border-gray-800 sm:grid-cols-2 sm:px-6"
        >
          <div v-for="row in headerRows" :key="row.label" class="flex gap-3">
            <dt class="w-32 shrink-0 text-theme-sm text-gray-500 dark:text-gray-400">
              {{ row.label }}
            </dt>
            <dd class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ row.value || '—' }}
            </dd>
          </div>
        </dl>

        <RecordPreviewTable :entries="entriesInPeriod" :total="totalHours" />
      </section>

      <!-- Breakdown -------------------------------------------------- -->
      <section v-if="entriesInPeriod.length" class="grid gap-4 md:gap-6 xl:grid-cols-2">
        <article class="zt-card p-5 sm:p-6">
          <h4 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            Stunden je Kategorie
          </h4>
          <ul class="mt-4 flex flex-col gap-3">
            <li v-for="row in hoursByCategory" :key="row.category">
              <div class="flex items-center justify-between text-theme-sm">
                <span class="text-gray-600 dark:text-gray-300">{{ row.category }}</span>
                <span class="tabular-nums text-gray-500 dark:text-gray-400">
                  {{ formatHours(row.hours) }} h
                </span>
              </div>
              <div class="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  class="h-2 rounded-full bg-brand-500"
                  :style="{ width: `${percent(row.hours)}%` }"
                ></div>
              </div>
            </li>
          </ul>
        </article>

        <article class="zt-card p-5 sm:p-6">
          <h4 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            Stunden je Mitarbeitende
          </h4>
          <ul class="mt-4 flex flex-col gap-3">
            <li v-for="row in hoursByMember" :key="row.memberId">
              <div class="flex items-center justify-between text-theme-sm">
                <span class="text-gray-600 dark:text-gray-300">{{ row.name }}</span>
                <span class="tabular-nums text-gray-500 dark:text-gray-400">
                  {{ formatHours(row.hours) }} h
                </span>
              </div>
              <div class="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  class="h-2 rounded-full bg-blue-light-500"
                  :style="{ width: `${percent(row.hours)}%` }"
                ></div>
              </div>
            </li>
          </ul>
        </article>
      </section>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ZSelect from '@/components/ui/ZSelect.vue'
import PeriodPicker from '@/components/records/PeriodPicker.vue'
import RecordPreviewTable from '@/components/records/RecordPreviewTable.vue'
import { formatDateDE, formatHours, useRecords } from '@/composables/useRecords'
import {
  buildFileName,
  downloadBlob,
  loadTemplate,
  renderDocx,
  renderPdf,
  resolveReference,
} from '@/utils/leistungsnachweis'
import type { RecordDocumentData } from '@/types/records'

const {
  activeProjects,
  selectedProjectId,
  selectedProject,
  period,
  entriesInPeriod,
  totalHours,
  hoursByCategory,
  hoursByMember,
  memberName,
  nextReferenceNumber,
  consumeReferenceNumber,
} = useRecords()

const reference = ref('')
type ExportFormat = 'docx' | 'pdf'

const exporting = ref<ExportFormat | null>(null)
const exportError = ref('')
const exportSuccess = ref('')

const projectOptions = computed(() =>
  activeProjects.value.map((project) => ({ value: project.id, label: project.name })),
)

/**
 * The reference field is prefilled from the project pattern but stays
 * editable, so switching project or period refreshes the suggestion without
 * overwriting a number the operator typed by hand.
 */
const suggestedReference = computed(() =>
  selectedProject.value
    ? resolveReference(selectedProject.value.reference, period, nextReferenceNumber())
    : '',
)

let referenceTouched = false

watch(
  suggestedReference,
  (next) => {
    if (!referenceTouched) reference.value = next
  },
  { immediate: true },
)

watch(reference, (value) => {
  if (value !== suggestedReference.value) referenceTouched = true
  exportError.value = ''
  exportSuccess.value = ''
})

const fileName = computed(() => buildFileName(period, reference.value))

const headerRows = computed(() => [
  { label: 'Auftraggeber', value: selectedProject.value?.client ?? '' },
  { label: 'Auftragnehmer', value: selectedProject.value?.contractor ?? '' },
  { label: 'Projekt', value: selectedProject.value?.name ?? '' },
  { label: 'Referenznummer', value: reference.value },
])

const canExport = computed(() => Boolean(selectedProject.value) && entriesInPeriod.value.length > 0)

const maxHours = computed(() =>
  Math.max(
    ...hoursByCategory.value.map((row) => row.hours),
    ...hoursByMember.value.map((row) => row.hours),
    1,
  ),
)

const percent = (hours: number) => Math.round((hours / maxHours.value) * 100)

const documentData = (): RecordDocumentData => ({
  referenznummer: reference.value,
  auftraggeber: selectedProject.value?.client ?? '',
  auftragnehmer: selectedProject.value?.contractor ?? '',
  projekt: selectedProject.value?.name ?? '',
  zeitraum_von: formatDateDE(period.from),
  zeitraum_bis: formatDateDE(period.to),
  // Same source as the preview above, so document and screen cannot drift.
  positionen: entriesInPeriod.value.map((entry) => ({
    datum: formatDateDE(entry.date),
    kategorie: entry.category,
    stunden: formatHours(entry.hours),
    name: memberName(entry.memberId),
    beschreibung: entry.description,
  })),
  gesamtstunden: formatHours(totalHours.value),
  erstellt_am: formatDateDE(new Date().toISOString().slice(0, 10)),
})

const exportDocument = async (format: ExportFormat) => {
  if (!selectedProject.value || exporting.value) return
  exporting.value = format
  exportError.value = ''
  exportSuccess.value = ''

  try {
    // Both formats render from the same payload, so the PDF and the Word file
    // can never disagree about the hours.
    const data = documentData()
    const blob =
      format === 'pdf'
        ? await renderPdf(data)
        : renderDocx(await loadTemplate(selectedProject.value), data)

    downloadBlob(blob, fileName.value, `.${format}`)

    // Only burn a running number once a document actually left the app.
    if (!referenceTouched) consumeReferenceNumber()
    exportSuccess.value = `${fileName.value}.${format} wurde erstellt.`
  } catch (error) {
    exportError.value =
      error instanceof Error ? error.message : 'Der Export ist unerwartet fehlgeschlagen.'
  } finally {
    exporting.value = null
  }
}
</script>
