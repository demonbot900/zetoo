<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Projekte" />

    <div class="zt-card">
      <header
        class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800"
      >
        <div>
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Projekte</h3>
          <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Grundlage für Zeiterfassung und Leistungsnachweis.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <label class="flex items-center gap-2 text-theme-sm text-gray-600 dark:text-gray-300">
            <input
              v-model="showArchived"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700"
            />
            Archivierte zeigen
          </label>
          <button type="button" class="zt-btn-primary py-2.5" @click="openCreate">
            Projekt anlegen
          </button>
        </div>
      </header>

      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th
                class="px-5 py-3 text-left text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Projekt
              </th>
              <th
                class="px-5 py-3 text-left text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Auftraggeber
              </th>
              <th
                class="px-5 py-3 text-left text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Referenz
              </th>
              <th
                class="px-5 py-3 text-left text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Vorlage
              </th>
              <th
                class="px-5 py-3 text-right text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Stunden
              </th>
              <th class="px-5 py-3 text-right">
                <span class="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="project in visibleProjects"
              :key="project.id"
              class="border-b border-gray-100 last:border-0 dark:border-gray-800/60"
            >
              <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-800 dark:text-white/90">
                    {{ project.name }}
                  </span>
                  <span
                    v-if="project.archived"
                    class="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  >
                    archiviert
                  </span>
                </div>
                <p class="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
                  {{ project.contractor || '—' }}
                </p>
              </td>
              <td class="px-5 py-4 text-theme-sm text-gray-700 dark:text-gray-300">
                {{ project.client || '—' }}
              </td>
              <td class="px-5 py-4">
                <code class="font-mono text-theme-xs text-gray-600 dark:text-gray-400">
                  {{ project.reference }}
                </code>
              </td>
              <td class="px-5 py-4">
                <span v-if="project.templateName" class="zt-chip" :title="project.templateName">
                  eigene Vorlage
                </span>
                <span v-else class="text-theme-sm text-gray-500 dark:text-gray-400">Standard</span>
              </td>
              <td
                class="px-5 py-4 text-right text-theme-sm tabular-nums text-gray-800 dark:text-white/90"
              >
                {{ formatHours(projectHours(project.id)) }}
              </td>
              <td class="whitespace-nowrap px-5 py-4 text-right">
                <div class="inline-flex gap-1">
                  <button type="button" class="zt-row-action" @click="openEdit(project)">
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    class="zt-row-action"
                    @click="archiveProject(project.id, !project.archived)"
                  >
                    {{ project.archived ? 'Reaktivieren' : 'Archivieren' }}
                  </button>
                  <button
                    type="button"
                    class="zt-row-action hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/15"
                    @click="confirmDelete(project)"
                  >
                    Löschen
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!visibleProjects.length">
              <td
                colspan="6"
                class="px-5 py-12 text-center text-theme-sm text-gray-500 dark:text-gray-400"
              >
                Noch kein Projekt angelegt.
                <button
                  type="button"
                  class="ml-1 font-medium text-brand-500 hover:text-brand-600"
                  @click="openCreate"
                >
                  Jetzt anlegen
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ProjectFormModal :open="formOpen" :project="editing" @close="formOpen = false" />

    <ZModal
      :open="deleting !== null"
      title="Projekt löschen"
      subtitle="Die erfassten Leistungen dieses Projekts werden mitgelöscht."
      size="sm"
      @close="deleting = null"
    >
      <p class="text-theme-sm text-gray-600 dark:text-gray-300">
        <strong class="text-gray-800 dark:text-white/90">{{ deleting?.name }}</strong>
        wirklich löschen? Betroffen sind
        {{ deleting ? entriesOf(deleting.id) : 0 }} erfasste Leistungen. Das lässt sich nicht
        rückgängig machen.
      </p>
      <template #footer>
        <button type="button" class="zt-btn-ghost" @click="deleting = null">Abbrechen</button>
        <button
          type="button"
          class="zt-btn-primary bg-error-500 hover:bg-error-600"
          @click="doDelete"
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
import ZModal from '@/components/ui/ZModal.vue'
import ProjectFormModal from '@/components/records/ProjectFormModal.vue'
import { formatHours, useRecords } from '@/composables/useRecords'
import type { Project } from '@/types/records'

const { projects, entries, archiveProject, deleteProject, projectHours } = useRecords()

const showArchived = ref(false)
const formOpen = ref(false)
const editing = ref<Project | null>(null)
const deleting = ref<Project | null>(null)

const visibleProjects = computed(() =>
  showArchived.value ? projects : projects.filter((project) => !project.archived),
)

const entriesOf = (projectId: string) =>
  entries.filter((entry) => entry.projectId === projectId).length

const openCreate = () => {
  editing.value = null
  formOpen.value = true
}

const openEdit = (project: Project) => {
  editing.value = project
  formOpen.value = true
}

const confirmDelete = (project: Project) => {
  deleting.value = project
}

const doDelete = () => {
  if (deleting.value) deleteProject(deleting.value.id)
  deleting.value = null
}
</script>
