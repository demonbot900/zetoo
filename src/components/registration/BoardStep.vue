<template>
  <div class="flex flex-col gap-6">
    <div>
      <span class="zt-label">Board template</span>
      <div class="grid gap-3 md:grid-cols-2">
        <button
          v-for="template in boardTemplates"
          :key="template.id"
          type="button"
          class="rounded-2xl border p-4 text-left transition-colors"
          :class="
            draft.boardTemplate === template.id
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
          "
          @click="draft.boardTemplate = template.id"
        >
          <p class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {{ template.name }}
          </p>
          <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            {{ template.description }}
          </p>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-for="column in template.columns"
              :key="column.name"
              class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-theme-xs text-gray-600 dark:border-gray-700 dark:text-gray-300"
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :style="{ backgroundColor: column.color }"
              ></span>
              {{ column.name }}
              <span v-if="column.wipLimit" class="text-gray-400">· max {{ column.wipLimit }}</span>
            </span>
          </div>
        </button>
      </div>
    </div>

    <label
      class="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
    >
      <span>
        <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
          Start with sample work
        </span>
        <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
          Fills the board, backlog and reports with an example sprint so you can try everything
          straight away. Turn it off for an empty workspace.
        </span>
      </span>
      <span class="relative inline-flex shrink-0">
        <input v-model="draft.seedSampleData" type="checkbox" class="peer sr-only" />
        <span
          class="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-brand-500 dark:bg-gray-700"
        ></span>
        <span
          class="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"
        ></span>
      </span>
    </label>

    <!-- Review ------------------------------------------------------- -->
    <section class="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
      <h4 class="mb-4 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
        Review before creating
      </h4>
      <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <div v-for="row in summary" :key="row.label" class="min-w-0">
          <dt class="text-theme-xs text-gray-500 dark:text-gray-400">{{ row.label }}</dt>
          <dd class="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {{ row.value }}
          </dd>
        </div>
      </dl>
    </section>

    <label
      for="accept-terms"
      class="flex cursor-pointer items-start gap-3 text-theme-sm text-gray-600 dark:text-gray-300"
    >
      <input
        id="accept-terms"
        v-model="draft.acceptedTerms"
        type="checkbox"
        class="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700"
      />
      <span>
        I accept the Terms of Service and the Data Processing Agreement, and confirm I may create
        this workspace on behalf of
        <span class="font-medium text-gray-800 dark:text-white/90">
          {{ draft.company.name || 'my company' }}</span
        >.
      </span>
    </label>
    <span v-if="errors.terms" class="zt-error -mt-4">{{ errors.terms }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRegistration } from '@/composables/useRegistration'
import { boardTemplates } from '@/composables/usePlanner'
import { plans } from '@/composables/useWorkspace'

const { draft, errors } = useRegistration()

const summary = computed(() => [
  { label: 'Company', value: draft.company.name || '—' },
  { label: 'Workspace URL', value: `zetoo.app/${draft.company.slug || '—'}` },
  { label: 'Industry', value: draft.company.industry },
  { label: 'Company size', value: draft.company.size },
  {
    label: 'Owner',
    value: `${draft.owner.firstName} ${draft.owner.lastName}`.trim() || '—',
  },
  { label: 'Owner email', value: draft.owner.email || '—' },
  { label: 'Plan', value: plans.find((plan) => plan.id === draft.company.plan)?.name ?? '—' },
  { label: 'Time zone', value: draft.company.timezone },
  {
    label: 'Working week',
    value: `${draft.company.workDays.length} days × ${draft.company.hoursPerDay}h`,
  },
  { label: 'Invites', value: `${draft.invites.length} pending` },
  {
    label: 'Board',
    value: boardTemplates.find((template) => template.id === draft.boardTemplate)?.name ?? '—',
  },
  { label: 'Sample work', value: draft.seedSampleData ? 'Included' : 'Empty workspace' },
])
</script>
