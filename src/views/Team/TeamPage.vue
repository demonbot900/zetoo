<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Team" />

    <div class="flex flex-col gap-6">
      <!-- Summary --------------------------------------------------- -->
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="stat in stats" :key="stat.label" class="zt-card p-5">
          <p class="text-theme-xs text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
          <p class="mt-1 text-title-sm font-semibold text-gray-800 dark:text-white/90">
            {{ stat.value }}
          </p>
          <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{{ stat.hint }}</p>
        </div>
      </section>

      <!-- Toolbar --------------------------------------------------- -->
      <section class="flex flex-wrap items-center gap-3">
        <input
          v-model="search"
          type="search"
          placeholder="Search name, title or skill"
          class="zt-input max-w-xs"
        />
        <ZSelect
          v-model="roleFilter"
          :options="roleFilterOptions"
          aria-label="Filter by role"
          class="w-44"
        />
        <ZSelect
          v-model="departmentFilter"
          :options="departmentFilterOptions"
          aria-label="Filter by department"
          class="w-52"
        />
        <div class="ml-auto flex items-center gap-2">
          <button type="button" class="zt-btn-ghost" @click="openInvite">Invite by email</button>
          <button type="button" class="zt-btn-primary" @click="openCreate">Add member</button>
        </div>
      </section>

      <!-- Invite row ------------------------------------------------ -->
      <section v-if="showInvite" class="zt-card p-5">
        <div class="flex flex-wrap items-end gap-3">
          <div class="min-w-56 flex-1">
            <label for="invite-address" class="zt-label">Email</label>
            <input
              id="invite-address"
              v-model="inviteEmail"
              type="email"
              placeholder="teammate@company.com"
              class="zt-input"
              @keydown.enter.prevent="sendInvite"
            />
          </div>
          <div class="w-52">
            <label for="invite-role-select" class="zt-label">Role</label>
            <ZSelect
              id="invite-role-select"
              v-model="inviteRole"
              :options="roleOptions"
              aria-label="Invite role"
            />
          </div>
          <button type="button" class="zt-btn-primary" @click="sendInvite">Send invite</button>
          <button type="button" class="zt-btn-ghost" @click="showInvite = false">Close</button>
        </div>
        <p v-if="inviteError" class="zt-error">{{ inviteError }}</p>
        <p v-else class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
          Invited people get a placeholder profile immediately, so you can assign work before they
          accept.
        </p>
      </section>

      <!-- Grid ------------------------------------------------------ -->
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="member in filtered"
          :key="member.id"
          class="zt-card flex flex-col gap-4 p-5"
        >
          <div class="flex items-start gap-4">
            <MemberAvatar :member="member" size="lg" status />
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <router-link
                    :to="`/team/${member.id}`"
                    class="block truncate text-theme-sm font-semibold text-gray-800 hover:text-brand-500 dark:text-white/90"
                  >
                    {{ fullName(member) }}
                  </router-link>
                  <p class="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                    {{ member.jobTitle }} · {{ member.department }}
                  </p>
                </div>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-theme-xs font-medium"
                  :class="roleChip(member.role)"
                >
                  {{ roleLabel(member.role) }}
                </span>
              </div>
              <p class="mt-1 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                {{ member.email }}
              </p>
            </div>
          </div>

          <div v-if="member.skills.length" class="flex flex-wrap gap-1.5">
            <span v-for="skill in member.skills.slice(0, 4)" :key="skill" class="zt-chip">
              {{ skill }}
            </span>
          </div>

          <div>
            <div
              class="flex items-center justify-between text-theme-xs text-gray-500 dark:text-gray-400"
            >
              <span>{{ load(member.id).hours }}h of {{ member.capacityHours }}h</span>
              <span>{{ load(member.id).utilisation }}%</span>
            </div>
            <div class="mt-1.5 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                class="h-2 rounded-full transition-all"
                :class="load(member.id).utilisation > 100 ? 'bg-error-500' : 'bg-brand-500'"
                :style="{ width: `${Math.min(load(member.id).utilisation, 100)}%` }"
              ></div>
            </div>
          </div>

          <div class="mt-auto flex items-center gap-2">
            <router-link :to="`/team/${member.id}`" class="zt-btn-ghost flex-1 py-2">
              View profile
            </router-link>
            <button type="button" class="zt-btn-ghost py-2" @click="edit(member)">Edit</button>
            <button
              v-if="member.role !== 'owner'"
              type="button"
              class="zt-btn-ghost py-2 text-error-500"
              @click="confirmRemove = member.id"
            >
              Remove
            </button>
          </div>

          <div
            v-if="confirmRemove === member.id"
            class="rounded-xl border border-error-200 bg-error-25 p-3 dark:border-error-500/30 dark:bg-error-500/10"
          >
            <p class="text-theme-xs text-gray-700 dark:text-gray-300">
              Remove {{ fullName(member) }}? Their assigned issues become unassigned.
            </p>
            <div class="mt-2 flex gap-2">
              <button
                type="button"
                class="rounded-lg bg-error-500 px-3 py-1.5 text-theme-xs font-medium text-white"
                @click="remove(member.id)"
              >
                Remove
              </button>
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-theme-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300"
                @click="confirmRemove = null"
              >
                Keep
              </button>
            </div>
          </div>
        </article>

        <p
          v-if="!filtered.length"
          class="col-span-full rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-theme-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
        >
          No one matches those filters.
        </p>
      </section>
    </div>

    <MemberFormModal
      :open="isFormOpen"
      :member="editing"
      @close="isFormOpen = false"
      @saved="isFormOpen = false"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MemberAvatar from '@/components/team/MemberAvatar.vue'
import MemberFormModal from '@/components/team/MemberFormModal.vue'
import ZSelect from '@/components/ui/ZSelect.vue'
import { toOptions } from '@/utils/options'
import {
  departments,
  fullName,
  isEmail,
  memberRoles,
  useWorkspace,
} from '@/composables/useWorkspace'
import { usePlanner } from '@/composables/usePlanner'
import type { MemberProfile, MemberRole } from '@/types/company'

const { members, inviteMember, removeMember } = useWorkspace()
const { sprintIssues, issues } = usePlanner()

const search = ref('')
const roleFilter = ref<string>('all')
const departmentFilter = ref<string>('all')
const isFormOpen = ref(false)
const editing = ref<MemberProfile | null>(null)
const confirmRemove = ref<string | null>(null)
const showInvite = ref(false)
const inviteEmail = ref('')
const inviteRole = ref<MemberRole>('member')
const inviteError = ref('')

const roleOptions = memberRoles.map((option) => ({
  value: option.value,
  label: option.label,
  hint: option.description,
}))
const roleFilterOptions = [{ value: 'all', label: 'All roles' }, ...roleOptions]
const departmentFilterOptions = [
  { value: 'all', label: 'All departments' },
  ...toOptions(departments),
]

const filtered = computed(() =>
  members.value.filter((member) => {
    const haystack =
      `${fullName(member)} ${member.jobTitle} ${member.email} ${member.skills.join(' ')}`.toLowerCase()
    const matchesSearch =
      search.value.trim() === '' || haystack.includes(search.value.trim().toLowerCase())
    const matchesRole = roleFilter.value === 'all' || member.role === roleFilter.value
    const matchesDepartment =
      departmentFilter.value === 'all' || member.department === departmentFilter.value
    return matchesSearch && matchesRole && matchesDepartment
  }),
)

const load = (memberId: string) => {
  const assigned = sprintIssues.value.filter((issue) => issue.assigneeId === memberId)
  const hours = assigned.reduce((sum, issue) => sum + issue.estimateHours, 0)
  const capacity = members.value.find((member) => member.id === memberId)?.capacityHours || 1
  return { hours, utilisation: Math.round((hours / capacity) * 100) }
}

const stats = computed(() => {
  const active = members.value.filter((member) => member.status === 'active').length
  const invited = members.value.filter((member) => member.status === 'invited').length
  const capacity = members.value.reduce((sum, member) => sum + member.capacityHours, 0)
  const assigned = sprintIssues.value.reduce((sum, issue) => sum + issue.estimateHours, 0)
  const unassigned = issues.value.filter(
    (issue) => issue.assigneeId === null && issue.status !== 'done',
  )

  return [
    {
      label: 'People',
      value: String(members.value.length),
      hint: `${active} active, ${invited} invited`,
    },
    { label: 'Sprint capacity', value: `${capacity}h`, hint: 'Sum of every profile' },
    {
      label: 'Committed',
      value: `${assigned}h`,
      hint: capacity
        ? `${Math.round((assigned / capacity) * 100)}% of capacity`
        : 'No capacity set',
    },
    { label: 'Unassigned work', value: String(unassigned.length), hint: 'Issues with no owner' },
  ]
})

const roleLabel = (role: MemberRole) =>
  memberRoles.find((option) => option.value === role)?.label ?? role

const roleChip = (role: MemberRole) =>
  ({
    owner: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
    admin: 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400',
    manager: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400',
    member: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    viewer: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  })[role]

const openCreate = () => {
  editing.value = null
  isFormOpen.value = true
}

const edit = (member: MemberProfile) => {
  editing.value = member
  isFormOpen.value = true
}

const remove = (id: string) => {
  removeMember(id)
  issues.value.forEach((issue) => {
    if (issue.assigneeId === id) issue.assigneeId = null
  })
  confirmRemove.value = null
}

const openInvite = () => {
  showInvite.value = true
  inviteError.value = ''
}

const sendInvite = () => {
  if (!isEmail(inviteEmail.value)) {
    inviteError.value = 'Enter a valid email address.'
    return
  }
  if (
    members.value.some((member) => member.email.toLowerCase() === inviteEmail.value.toLowerCase())
  ) {
    inviteError.value = 'Someone with that address is already in the workspace.'
    return
  }
  inviteMember({ email: inviteEmail.value.trim(), role: inviteRole.value })
  inviteEmail.value = ''
  inviteError.value = ''
}
</script>
