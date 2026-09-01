<template>
  <ZModal
    :open="open"
    :title="project ? 'Projekt bearbeiten' : 'Projekt anlegen'"
    subtitle="Auftraggeber, Referenznummer und Leistungskategorien für den Leistungsnachweis."
    size="lg"
    @close="$emit('close')"
  >
    <div class="flex flex-col gap-6">
      <section class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label for="project-name" class="zt-label">
            Projektname<span class="text-error-500">*</span>
          </label>
          <input
            id="project-name"
            v-model="form.name"
            type="text"
            class="zt-input"
            placeholder="z. B. Retainer 2026"
          />
          <span v-if="errors.name" class="zt-error">{{ errors.name }}</span>
        </div>

        <div>
          <label for="project-client" class="zt-label">
            Auftraggeber<span class="text-error-500">*</span>
          </label>
          <input
            id="project-client"
            v-model="form.client"
            type="text"
            class="zt-input"
            placeholder="Musterkunde GmbH"
          />
          <span v-if="errors.client" class="zt-error">{{ errors.client }}</span>
        </div>

        <div>
          <label for="project-contractor" class="zt-label">Auftragnehmer</label>
          <input
            id="project-contractor"
            v-model="form.contractor"
            type="text"
            class="zt-input"
            placeholder="Ihr Unternehmen"
          />
        </div>
      </section>

      <!-- Reference number ------------------------------------------- -->
      <section class="rounded-2xl border border-gray-200 p-4 dark:border-gray-800 sm:p-5">
        <label for="project-reference" class="zt-label">Referenznummer</label>
        <input
          id="project-reference"
          v-model="form.reference"
          type="text"
          class="zt-input font-mono"
          placeholder="CODIN-RE-{YYYY}-{NR}"
        />
        <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
          Platzhalter:
          <code class="zt-chip">{YYYY}</code> Jahr,
          <code class="zt-chip">{MM}</code> Monat,
          <code class="zt-chip">{NR}</code> laufende Nummer. Beides bezieht sich auf den Beginn des
          abgerechneten Zeitraums.
        </p>
        <p class="mt-3 text-theme-sm text-gray-600 dark:text-gray-300">
          Beispiel-Dateiname:
          <span class="font-mono text-gray-800 dark:text-white/90">{{ fileNamePreview }}.docx</span>
        </p>
      </section>

      <!-- Categories ------------------------------------------------- -->
      <section class="rounded-2xl border border-gray-200 p-4 dark:border-gray-800 sm:p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h4 class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
              Leistungskategorien
            </h4>
            <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              Leer lassen, um die Standardkategorien zu verwenden.
            </p>
          </div>
          <button type="button" class="zt-btn-ghost py-2" @click="resetCategories">
            Standard
          </button>
        </div>

        <ul class="mt-4 flex flex-wrap gap-2">
          <li v-for="(category, index) in form.categories" :key="index">
            <span class="zt-chip">
              {{ category }}
              <button
                type="button"
                class="text-gray-400 transition-colors hover:text-error-500"
                :aria-label="`${category} entfernen`"
                @click="form.categories.splice(index, 1)"
              >
                &times;
              </button>
            </span>
          </li>
          <li v-if="!form.categories.length" class="text-theme-xs text-gray-500 dark:text-gray-400">
            {{ defaultCategories.join(' · ') }}
          </li>
        </ul>

        <div class="mt-4 flex gap-2">
          <input
            v-model="newCategory"
            type="text"
            class="zt-input"
            placeholder="Kategorie hinzufügen"
            @keydown.enter.prevent="addCategory"
          />
          <button type="button" class="zt-btn-ghost whitespace-nowrap" @click="addCategory">
            Hinzufügen
          </button>
        </div>
      </section>

      <!-- Word template ---------------------------------------------- -->
      <TemplateUpload
        :template-name="form.templateName"
        @select="onTemplateSelect"
        @clear="clearTemplateOnForm"
      />
    </div>

    <template #footer>
      <button type="button" class="zt-btn-ghost" @click="$emit('close')">Abbrechen</button>
      <button type="button" class="zt-btn-primary" @click="submit">
        {{ project ? 'Speichern' : 'Anlegen' }}
      </button>
    </template>
  </ZModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import ZModal from '@/components/ui/ZModal.vue'
import TemplateUpload from '@/components/records/TemplateUpload.vue'
import { defaultCategories, defaultReferencePattern, useRecords } from '@/composables/useRecords'
import { buildFileName, resolveReference } from '@/utils/leistungsnachweis'
import type { Project } from '@/types/records'

const props = defineProps<{ open: boolean; project: Project | null }>()
const emit = defineEmits<{ close: []; saved: [project: Project] }>()

const { createProject, updateProject, period, nextReferenceNumber } = useRecords()

const blank = () => ({
  name: '',
  client: '',
  contractor: '',
  reference: defaultReferencePattern,
  categories: [] as string[],
  templateName: '',
  templateData: '',
})

const form = reactive(blank())
const newCategory = ref('')
const errors = reactive<{ name?: string; client?: string }>({})

watch(
  () => [props.open, props.project] as const,
  ([open]) => {
    if (!open) return
    Object.assign(form, blank())
    errors.name = undefined
    errors.client = undefined
    newCategory.value = ''
    if (props.project) {
      Object.assign(form, {
        name: props.project.name,
        client: props.project.client,
        contractor: props.project.contractor,
        reference: props.project.reference,
        categories: [...props.project.categories],
        templateName: props.project.templateName,
        templateData: props.project.templateData,
      })
    }
  },
  { immediate: true },
)

/** Shows the operator what the exported file will be called. */
const fileNamePreview = computed(() =>
  buildFileName(period, resolveReference(form.reference || '', period, nextReferenceNumber())),
)

const addCategory = () => {
  const value = newCategory.value.trim()
  if (!value || form.categories.includes(value)) return
  form.categories.push(value)
  newCategory.value = ''
}

const resetCategories = () => {
  form.categories.splice(0, form.categories.length)
}

const onTemplateSelect = (payload: { name: string; data: string }) => {
  form.templateName = payload.name
  form.templateData = payload.data
}

const clearTemplateOnForm = () => {
  form.templateName = ''
  form.templateData = ''
}

const submit = () => {
  errors.name = form.name.trim() ? undefined : 'Bitte einen Projektnamen angeben.'
  errors.client = form.client.trim() ? undefined : 'Bitte einen Auftraggeber angeben.'
  if (errors.name || errors.client) return

  if (props.project) {
    updateProject(props.project.id, { ...form, categories: [...form.categories] })
    emit('saved', props.project)
  } else {
    emit('saved', createProject({ ...form, categories: [...form.categories] }))
  }
  emit('close')
}
</script>
