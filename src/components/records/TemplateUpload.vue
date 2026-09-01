<template>
  <section class="rounded-2xl border border-gray-200 p-4 dark:border-gray-800 sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
          Individuelle Design-Vorlage
        </h4>
        <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          Eigene Word-Datei mit Platzhaltern. Ohne Vorlage wird das Standardlayout verwendet.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <label class="zt-btn-ghost cursor-pointer py-2.5">
          {{ templateName ? 'Ersetzen' : 'Vorlage wählen' }}
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            class="hidden"
            @change="onChange"
          />
        </label>
        <button v-if="templateName" type="button" class="zt-btn-ghost py-2.5" @click="$emit('clear')">
          Entfernen
        </button>
        <a class="zt-btn-ghost py-2.5" :href="DEFAULT_TEMPLATE_URL" download>
          Muster laden
        </a>
      </div>
    </div>

    <p v-if="templateName" class="mt-3 flex items-center gap-2 text-theme-sm">
      <span class="zt-chip">DOCX</span>
      <span class="text-gray-700 dark:text-gray-300">{{ templateName }}</span>
    </p>
    <p v-else class="mt-3 text-theme-sm text-gray-500 dark:text-gray-400">
      Standardvorlage aktiv.
    </p>

    <p v-if="error" class="zt-error">{{ error }}</p>

    <details class="mt-4">
      <summary
        class="cursor-pointer text-theme-xs font-medium text-brand-500 hover:text-brand-600"
      >
        Welche Platzhalter kennt die Vorlage?
      </summary>
      <ul class="mt-3 flex flex-col gap-1.5 text-theme-xs text-gray-600 dark:text-gray-300">
        <li v-for="row in placeholders" :key="row.tag">
          <code class="zt-chip">{{ row.tag }}</code>
          <span class="ml-2">{{ row.description }}</span>
        </li>
      </ul>
      <p class="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
        Die Tabellenzeile zwischen
        <code class="zt-chip">{{ '{#positionen}' }}</code> und
        <code class="zt-chip">{{ '{/positionen}' }}</code>
        wird je Leistung wiederholt. Am einfachsten das Muster herunterladen und in Word umgestalten.
      </p>
    </details>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DEFAULT_TEMPLATE_URL } from '@/utils/leistungsnachweis'

defineProps<{ templateName: string }>()
const emit = defineEmits<{ select: [payload: { name: string; data: string }]; clear: [] }>()

/**
 * Data URLs are held in localStorage alongside the rest of the workspace, and
 * browsers cap that at roughly 5 MB in total. Refusing oversized files here is
 * friendlier than letting the whole store fail to persist later on.
 */
const MAX_BYTES = 3 * 1024 * 1024

const error = ref('')

const placeholders = [
  { tag: '{referenznummer}', description: 'Aufgelöste Referenznummer' },
  { tag: '{auftraggeber}', description: 'Auftraggeber des Projekts' },
  { tag: '{auftragnehmer}', description: 'Auftragnehmer' },
  { tag: '{projekt}', description: 'Projektname' },
  { tag: '{zeitraum_von}', description: 'Beginn des Zeitraums' },
  { tag: '{zeitraum_bis}', description: 'Ende des Zeitraums' },
  { tag: '{datum}', description: 'Datum der Leistung (je Zeile)' },
  { tag: '{kategorie}', description: 'Leistungskategorie (je Zeile)' },
  { tag: '{stunden}', description: 'Dauer in Stunden (je Zeile)' },
  { tag: '{name}', description: 'Name des Mitarbeitenden (je Zeile)' },
  { tag: '{beschreibung}', description: 'Durchgeführte Arbeit (je Zeile)' },
  { tag: '{gesamtstunden}', description: 'Automatische Summe' },
  { tag: '{erstellt_am}', description: 'Erstellungsdatum' },
]

const onChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  error.value = ''
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.docx')) {
    error.value = 'Bitte eine Word-Datei im Format .docx wählen.'
    input.value = ''
    return
  }
  if (file.size > MAX_BYTES) {
    error.value = 'Die Vorlage ist größer als 3 MB und passt nicht in den Browser-Speicher.'
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    emit('select', { name: file.name, data: String(reader.result ?? '') })
  }
  reader.onerror = () => {
    error.value = 'Die Datei konnte nicht gelesen werden.'
  }
  reader.readAsDataURL(file)
  input.value = ''
}
</script>
