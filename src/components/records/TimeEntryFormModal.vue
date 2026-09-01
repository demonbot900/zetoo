<template>
  <ZModal
    :open="open"
    :title="entry ? 'Leistung bearbeiten' : 'Leistung erfassen'"
    subtitle="Datum, Kategorie und Dauer bilden eine Zeile im Leistungsnachweis."
    size="lg"
    @close="$emit('close')"
  >
    <div class="flex flex-col gap-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="entry-project" class="zt-label">Projekt</label>
          <ZSelect
            id="entry-project"
            v-model="form.projectId"
            :options="projectOptions"
            aria-label="Projekt"
            block
          />
        </div>

        <div>
          <label for="entry-date" class="zt-label">
            Datum der Leistung<span class="text-error-500">*</span>
          </label>
          <flat-pickr
            id="entry-date"
            v-model="form.date"
            :config="dateConfig"
            class="zt-input"
            placeholder="Datum wählen"
          />
        </div>

        <div>
          <label for="entry-category" class="zt-label">Leistungskategorie</label>
          <ZSelect
            id="entry-category"
            v-model="form.category"
            :options="categoryOptions"
            aria-label="Leistungskategorie"
            block
          />
        </div>

        <div>
          <label for="entry-member" class="zt-label">Mitarbeitende Person</label>
          <ZSelect
            id="entry-member"
            v-model="form.memberId"
            :options="memberOptions"
            aria-label="Mitarbeitende Person"
            block
          />
        </div>

        <div>
          <label for="entry-hours" class="zt-label">
            Dauer in Stunden<span class="text-error-500">*</span>
          </label>
          <input
            id="entry-hours"
            v-model.number="form.hours"
            type="number"
            step="0.25"
            min="0.25"
            class="zt-input"
            @blur="form.hours = toQuarter(form.hours)"
          />
          <p class="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
            Wird auf 0,25-Schritte gerundet.
          </p>
        </div>

        <div class="flex items-end">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in quickHours"
              :key="preset"
              type="button"
              class="zt-chip transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/15"
              @click="form.hours = preset"
            >
              {{ formatHours(preset) }} h
            </button>
          </div>
        </div>
      </div>

      <div>
        <label for="entry-description" class="zt-label">Durchgeführte Arbeit</label>
        <textarea
          id="entry-description"
          v-model="form.description"
          rows="3"
          class="zt-textarea"
          placeholder="z. B. Softwareentwicklung Backend"
        ></textarea>
      </div>

      <p v-if="error" class="zt-error">{{ error }}</p>
    </div>

    <template #footer>
      <button type="button" class="zt-btn-ghost" @click="$emit('close')">Abbrechen</button>
      <button type="button" class="zt-btn-primary" @click="submit">
        {{ entry ? 'Speichern' : 'Erfassen' }}
      </button>
    </template>
  </ZModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import flatPickr from 'vue-flatpickr-component'
import ZModal from '@/components/ui/ZModal.vue'
import ZSelect from '@/components/ui/ZSelect.vue'
import { formatHours, toQuarter, useRecords } from '@/composables/useRecords'
import { useWorkspace } from '@/composables/useWorkspace'
import type { TimeEntry } from '@/types/records'

const props = defineProps<{ open: boolean; entry: TimeEntry | null; projectId?: string }>()
const emit = defineEmits<{ close: [] }>()

const { activeProjects, categoriesFor, createEntry, updateEntry, selectedProjectId } = useRecords()
const { activeMembers, currentUser } = useWorkspace()

const dateConfig = { dateFormat: 'Y-m-d', altInput: true, altFormat: 'd.m.Y' }
const quickHours = [0.25, 0.5, 1, 2, 4, 8]

const today = () => new Date().toISOString().slice(0, 10)

const blank = () => ({
  projectId: props.projectId || selectedProjectId.value || activeProjects.value[0]?.id || '',
  date: today(),
  category: '',
  hours: 1,
  memberId: currentUser.value?.id ?? activeMembers.value[0]?.id ?? '',
  description: '',
})

const form = reactive(blank())
const error = ref('')

watch(
  () => [props.open, props.entry] as const,
  ([open]) => {
    if (!open) return
    error.value = ''
    Object.assign(form, blank())
    if (props.entry) {
      Object.assign(form, {
        projectId: props.entry.projectId,
        date: props.entry.date,
        category: props.entry.category,
        hours: props.entry.hours,
        memberId: props.entry.memberId,
        description: props.entry.description,
      })
    }
    if (!form.category) form.category = categoriesFor(form.projectId)[0] ?? ''
    // The workspace may still have been loading when `blank()` ran.
    if (!form.memberId) form.memberId = currentUser.value?.id ?? activeMembers.value[0]?.id ?? ''
  },
  { immediate: true },
)

// Switching project may change the category list; keep the field valid.
watch(
  () => form.projectId,
  (projectId) => {
    const allowed = categoriesFor(projectId)
    if (!allowed.includes(form.category)) form.category = allowed[0] ?? ''
  },
)

const projectOptions = computed(() =>
  activeProjects.value.map((project) => ({ value: project.id, label: project.name })),
)

const categoryOptions = computed(() =>
  categoriesFor(form.projectId).map((category) => ({ value: category, label: category })),
)

const memberOptions = computed(() =>
  activeMembers.value.map((member) => ({
    value: member.id,
    label: `${member.firstName} ${member.lastName}`.trim() || member.email,
    hint: member.jobTitle,
  })),
)

const submit = () => {
  if (!form.projectId) {
    error.value = 'Bitte zuerst ein Projekt anlegen.'
    return
  }
  if (!form.date) {
    error.value = 'Bitte ein Datum wählen.'
    return
  }
  if (!form.memberId) {
    error.value = 'Bitte eine mitarbeitende Person wählen.'
    return
  }
  const payload = { ...form, hours: toQuarter(form.hours) }

  if (props.entry) updateEntry(props.entry.id, payload)
  else createEntry(payload)

  emit('close')
}
</script>
