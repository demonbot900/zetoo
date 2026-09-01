<template>
  <ZModal
    :open="open"
    title="Create issue"
    subtitle="It lands in the first board column unless you send it to the backlog."
    size="md"
    @close="$emit('close')"
  >
    <div class="flex flex-col gap-5">
      <div>
        <label for="new-issue-title" class="zt-label">
          Summary<span class="text-error-500">*</span>
        </label>
        <input
          id="new-issue-title"
          ref="titleInput"
          v-model="form.title"
          class="zt-input"
          placeholder="What needs to happen?"
          @keyup.enter="submit"
        />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="zt-label">Type</label>
          <ZSelect v-model="form.type" :options="typeOptions" aria-label="Type" />
        </div>
        <div>
          <label class="zt-label">Priority</label>
          <ZSelect v-model="form.priority" :options="priorityOptions" aria-label="Priority" />
        </div>
        <div>
          <label class="zt-label">Assignee</label>
          <ZSelect v-model="form.assigneeId" :options="assigneeOptions" aria-label="Assignee" />
        </div>
        <div>
          <label for="new-issue-estimate" class="zt-label">Estimate (h)</label>
          <input
            id="new-issue-estimate"
            v-model.number="form.estimateHours"
            type="number"
            min="0"
            class="zt-input"
          />
        </div>
        <div>
          <label for="new-issue-start" class="zt-label">Start date</label>
          <input id="new-issue-start" v-model="form.startDate" type="date" class="zt-input" />
        </div>
        <div>
          <label for="new-issue-due" class="zt-label">Due date</label>
          <input id="new-issue-due" v-model="form.dueDate" type="date" class="zt-input" />
        </div>
      </div>

      <div>
        <label class="zt-label">Destination</label>
        <ZSelect v-model="form.sprintId" :options="destinationOptions" aria-label="Destination" />
      </div>

      <p v-if="error" class="zt-error">{{ error }}</p>
    </div>

    <template #footer>
      <button type="button" class="zt-btn-ghost py-2.5" @click="$emit('close')">Cancel</button>
      <button type="button" class="zt-btn-primary py-2.5" @click="submit">Create issue</button>
    </template>
  </ZModal>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import ZModal from '@/components/ui/ZModal.vue'
import ZSelect from '@/components/ui/ZSelect.vue'
import { addDays, priorityLabels, today, typeLabels, usePlanner } from '@/composables/usePlanner'
import type { IssuePriority, IssueType } from '@/types/planner'

const props = defineProps<{ open: boolean; defaultSprintId?: string | null }>()
const emit = defineEmits<{ close: []; created: [id: string] }>()

const { team, sprints, createIssue, activeSprint, columns } = usePlanner()

const titleInput = ref<HTMLInputElement | null>(null)
const error = ref('')

const typeOptions = Object.entries(typeLabels).map(([value, label]) => ({ value, label }))
const priorityOptions = Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))

const assigneeOptions = computed(() => [
  { value: null, label: 'Unassigned' },
  ...team.map((member) => ({ value: member.id, label: member.name, hint: member.role })),
])

const destinationOptions = computed(() => [
  { value: null, label: 'Backlog' },
  ...sprints.value.map((sprint) => ({ value: sprint.id, label: sprint.name, hint: sprint.goal })),
])

const blank = () => ({
  title: '',
  type: 'task' as IssueType,
  priority: 'medium' as IssuePriority,
  assigneeId: null as string | null,
  estimateHours: 4,
  startDate: today,
  dueDate: addDays(today, 5),
  sprintId: props.defaultSprintId ?? activeSprint.value?.id ?? null,
})

const form = reactive(blank())

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    Object.assign(form, blank())
    error.value = ''
    await nextTick()
    titleInput.value?.focus()
  },
)

const submit = () => {
  if (!form.title.trim()) {
    error.value = 'Give the issue a summary first.'
    return
  }
  const issue = createIssue({
    ...form,
    // New work lands in the board's first column unless it goes to the backlog.
    status: form.sprintId === null ? 'backlog' : (columns[0]?.id ?? 'todo'),
  })
  emit('created', issue.id)
  emit('close')
}
</script>
