<template>
  <AdminLayout>
    <PageBreadcrumb :page-title="member ? fullName(member) : 'Profile'" />

    <div v-if="member" class="flex flex-col gap-6">
      <!-- Header ---------------------------------------------------- -->
      <section class="zt-card p-5 sm:p-6">
        <div class="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div class="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <MemberAvatar :member="member" size="xl" status />
            <div class="text-center sm:text-left">
              <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {{ fullName(member) }}
                </h3>
                <span class="zt-chip">{{ roleLabel }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-theme-xs font-medium"
                  :class="statusChip"
                >
                  {{ member.status }}
                </span>
              </div>
              <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                {{ member.jobTitle }} · {{ member.department }}
              </p>
              <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                {{ member.location || 'No location set' }} · {{ member.timezone }} ·
                {{ localTime }}
              </p>
              <p
                v-if="member.bio"
                class="mt-3 max-w-xl text-theme-sm text-gray-600 dark:text-gray-300"
              >
                {{ member.bio }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-2 xl:justify-end">
            <a
              v-for="link in activeLinks"
              :key="link.key"
              :href="link.url"
              target="_blank"
              rel="noopener"
              class="zt-btn-ghost py-2"
            >
              {{ link.label }}
            </a>
            <button type="button" class="zt-btn-ghost py-2" @click="isFormOpen = true">
              Edit profile
            </button>
            <button
              v-if="!isCurrentUser"
              type="button"
              class="zt-btn-primary py-2"
              @click="setCurrentUser(member.id)"
            >
              Sign in as
            </button>
          </div>
        </div>
      </section>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Details ------------------------------------------------- -->
        <section class="zt-card p-5 sm:p-6">
          <h4 class="mb-4 text-theme-sm font-semibold text-gray-800 dark:text-white/90">Details</h4>
          <dl class="flex flex-col gap-3.5">
            <div v-for="row in details" :key="row.label">
              <dt class="text-theme-xs text-gray-500 dark:text-gray-400">{{ row.label }}</dt>
              <dd class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {{ row.value }}
              </dd>
            </div>
          </dl>

          <div v-if="member.skills.length" class="mt-5">
            <p class="mb-2 text-theme-xs text-gray-500 dark:text-gray-400">Skills</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="skill in member.skills" :key="skill" class="zt-chip">{{ skill }}</span>
            </div>
          </div>
        </section>

        <!-- Workload ------------------------------------------------ -->
        <section class="zt-card p-5 sm:p-6 lg:col-span-2">
          <div class="mb-4 flex items-center justify-between">
            <h4 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              This sprint
            </h4>
            <span class="text-theme-xs text-gray-500 dark:text-gray-400">
              {{ activeSprint.name }}
            </span>
          </div>

          <div class="grid gap-4 sm:grid-cols-4">
            <div v-for="stat in workStats" :key="stat.label">
              <p class="text-theme-xs text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
              <p class="mt-0.5 text-lg font-semibold text-gray-800 dark:text-white/90">
                {{ stat.value }}
              </p>
            </div>
          </div>

          <div class="mt-4">
            <div
              class="flex items-center justify-between text-theme-xs text-gray-500 dark:text-gray-400"
            >
              <span>Capacity used</span>
              <span>{{ utilisation }}%</span>
            </div>
            <div class="mt-1.5 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                class="h-2 rounded-full transition-all"
                :class="utilisation > 100 ? 'bg-error-500' : 'bg-brand-500'"
                :style="{ width: `${Math.min(utilisation, 100)}%` }"
              ></div>
            </div>
          </div>

          <div class="mt-5">
            <p class="mb-2 text-theme-xs text-gray-500 dark:text-gray-400">Assigned issues</p>
            <ul class="flex flex-col gap-2">
              <li
                v-for="issue in assignedIssues"
                :key="issue.id"
                class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
              >
                <div class="min-w-0">
                  <p class="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
                    {{ issue.title }}
                  </p>
                  <p class="text-theme-xs text-gray-500 dark:text-gray-400">
                    {{ issue.id }} · {{ statusLabels[issue.status] ?? issue.status }} ·
                    {{ issue.loggedHours }}/{{ issue.estimateHours }}h
                  </p>
                </div>
                <button
                  type="button"
                  class="shrink-0 text-theme-xs font-medium text-brand-500 hover:text-brand-600"
                  @click="openIssue(issue.id)"
                >
                  Open
                </button>
              </li>
              <li
                v-if="!assignedIssues.length"
                class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-theme-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
              >
                Nothing assigned in this sprint.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>

    <p v-else class="zt-card p-10 text-center text-theme-sm text-gray-500 dark:text-gray-400">
      That profile does not exist.
      <router-link to="/team" class="font-medium text-brand-500">Back to the team</router-link>
    </p>

    <MemberFormModal :open="isFormOpen" :member="member" @close="isFormOpen = false" />
    <IssueDetailPanel />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MemberAvatar from '@/components/team/MemberAvatar.vue'
import MemberFormModal from '@/components/team/MemberFormModal.vue'
import IssueDetailPanel from '@/components/planner/IssueDetailPanel.vue'
import { fullName, memberRoles, useWorkspace } from '@/composables/useWorkspace'
import { formatDate, statusLabels, usePlanner } from '@/composables/usePlanner'

const route = useRoute()
const { members, currentUser, setCurrentUser } = useWorkspace()
const { sprintIssues, activeSprint, selectIssue } = usePlanner()

const isFormOpen = ref(false)

const memberId = computed(() => (route.params.id as string) || currentUser.value?.id || '')

const member = computed(() => members.value.find((entry) => entry.id === memberId.value) ?? null)

const isCurrentUser = computed(() => member.value?.id === currentUser.value?.id)

const roleLabel = computed(
  () => memberRoles.find((option) => option.value === member.value?.role)?.label ?? '',
)

const statusChip = computed(
  () =>
    ({
      active: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400',
      invited: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400',
      inactive: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    })[member.value?.status ?? 'inactive'],
)

const localTime = computed(() => {
  if (!member.value) return ''
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: member.value.timezone,
    }).format(new Date())
  } catch {
    return ''
  }
})

const activeLinks = computed(() => {
  if (!member.value) return []
  return (
    [
      { key: 'linkedin', label: 'LinkedIn', url: member.value.links.linkedin },
      { key: 'github', label: 'GitHub', url: member.value.links.github },
      { key: 'x', label: 'X', url: member.value.links.x },
      { key: 'website', label: 'Website', url: member.value.links.website },
    ] as const
  ).filter((link) => link.url)
})

const details = computed(() => {
  if (!member.value) return []
  return [
    { label: 'Email', value: member.value.email },
    { label: 'Phone', value: member.value.phone || '—' },
    { label: 'Department', value: member.value.department },
    { label: 'Sprint capacity', value: `${member.value.capacityHours}h` },
    { label: 'Started', value: formatDate(member.value.startedAt, { dateStyle: 'medium' }) },
  ]
})

const assignedIssues = computed(() =>
  sprintIssues.value.filter((issue) => issue.assigneeId === memberId.value),
)

const workStats = computed(() => {
  const estimate = assignedIssues.value.reduce((sum, issue) => sum + issue.estimateHours, 0)
  const logged = assignedIssues.value.reduce((sum, issue) => sum + issue.loggedHours, 0)
  const done = assignedIssues.value.filter((issue) => issue.status === 'done').length
  return [
    { label: 'Issues', value: String(assignedIssues.value.length) },
    { label: 'Done', value: String(done) },
    { label: 'Estimated', value: `${estimate}h` },
    { label: 'Logged', value: `${logged}h` },
  ]
})

const utilisation = computed(() => {
  if (!member.value?.capacityHours) return 0
  const estimate = assignedIssues.value.reduce((sum, issue) => sum + issue.estimateHours, 0)
  return Math.round((estimate / member.value.capacityHours) * 100)
})

const openIssue = (id: string) => selectIssue(id)
</script>
