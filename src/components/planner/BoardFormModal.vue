<template>
  <ZModal
    :open="open"
    :title="board ? 'Board bearbeiten' : 'Board anlegen'"
    subtitle="Ein Board bündelt Spalten, Sprints und Vorgänge eines Kundenauftrags."
    size="md"
    @close="$emit('close')"
  >
    <div class="flex flex-col gap-4">
      <div>
        <label for="board-name" class="zt-label">
          Name<span class="text-error-500">*</span>
        </label>
        <input
          id="board-name"
          v-model="form.name"
          type="text"
          class="zt-input"
          placeholder="z. B. Relaunch Website"
        />
        <span v-if="error" class="zt-error">{{ error }}</span>
      </div>

      <div>
        <label for="board-client" class="zt-label">Auftraggeber</label>
        <input
          id="board-client"
          v-model="form.client"
          type="text"
          class="zt-input"
          placeholder="Musterkunde GmbH"
        />
      </div>

      <div>
        <label for="board-project" class="zt-label">Abrechnungsprojekt</label>
        <ZSelect
          id="board-project"
          v-model="form.projectId"
          :options="projectOptions"
          aria-label="Abrechnungsprojekt"
          block
        />
        <p class="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
          Verknüpft das Board mit einem Projekt aus der Abrechnung.
        </p>
      </div>

      <div>
        <label for="board-description" class="zt-label">Beschreibung</label>
        <textarea
          id="board-description"
          v-model="form.description"
          rows="2"
          class="zt-textarea"
        ></textarea>
      </div>

      <div>
        <span class="zt-label">Farbe</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="color in columnColors"
            :key="color"
            type="button"
            class="h-8 w-8 rounded-full border-2 transition-transform"
            :class="form.color === color ? 'scale-110 border-gray-800 dark:border-white' : 'border-transparent'"
            :style="{ backgroundColor: color }"
            :aria-label="`Farbe ${color}`"
            @click="form.color = color"
          ></button>
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="zt-btn-ghost" @click="$emit('close')">Abbrechen</button>
      <button type="button" class="zt-btn-primary" @click="submit">
        {{ board ? 'Speichern' : 'Anlegen' }}
      </button>
    </template>
  </ZModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import ZModal from '@/components/ui/ZModal.vue'
import ZSelect from '@/components/ui/ZSelect.vue'
import { columnColors, usePlanner } from '@/composables/usePlanner'
import { useRecords } from '@/composables/useRecords'
import type { Board } from '@/types/planner'

const props = defineProps<{ open: boolean; board: Board | null }>()
const emit = defineEmits<{ close: [] }>()

const { boards, createBoard, updateBoard } = usePlanner()
const { activeProjects } = useRecords()

const blank = () => ({
  name: '',
  client: '',
  description: '',
  color: columnColors[boards.length % columnColors.length],
  projectId: '' as string,
})

const form = reactive(blank())
const error = ref('')

watch(
  () => [props.open, props.board] as const,
  ([open]) => {
    if (!open) return
    error.value = ''
    Object.assign(form, blank())
    if (props.board) {
      Object.assign(form, {
        name: props.board.name,
        client: props.board.client,
        description: props.board.description,
        color: props.board.color,
        projectId: props.board.projectId ?? '',
      })
    }
  },
  { immediate: true },
)

const projectOptions = computed(() => [
  { value: '', label: 'Nicht verknüpft' },
  ...activeProjects.value.map((project) => ({ value: project.id, label: project.name })),
])

const submit = () => {
  if (!form.name.trim()) {
    error.value = 'Bitte einen Namen angeben.'
    return
  }
  const payload = { ...form, projectId: form.projectId || null }

  if (props.board) updateBoard(props.board.id, payload)
  else createBoard(payload)

  emit('close')
}
</script>
