<template>
  <div class="flex flex-col gap-6">
    <div class="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
      <div>
        <label for="invite-email" class="zt-label">Work email</label>
        <input
          id="invite-email"
          v-model="email"
          type="email"
          placeholder="teammate@northwind.example"
          class="zt-input"
          @keydown.enter.prevent="add"
        />
      </div>
      <div>
        <label for="invite-role" class="zt-label">Role</label>
        <ZSelect
          id="invite-role"
          v-model="role"
          :options="roleOptions"
          aria-label="Invite role"
          class="sm:w-52"
        />
      </div>
      <div class="flex items-end">
        <button type="button" class="zt-btn-primary h-11 w-full sm:w-auto" @click="add">
          Add invite
        </button>
      </div>
    </div>

    <div>
      <label for="invite-title" class="zt-label">Job title (optional)</label>
      <input
        id="invite-title"
        v-model="jobTitle"
        type="text"
        placeholder="Frontend Engineer"
        class="zt-input"
        @keydown.enter.prevent="add"
      />
      <span v-if="error" class="zt-error">{{ error }}</span>
      <p class="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
        {{ roleHint }}
      </p>
    </div>

    <div>
      <button
        type="button"
        class="text-theme-sm font-medium text-brand-500 hover:text-brand-600"
        @click="showBulk = !showBulk"
      >
        {{ showBulk ? 'Hide bulk invite' : 'Invite several people at once' }}
      </button>
      <div v-if="showBulk" class="mt-3">
        <textarea
          v-model="bulk"
          rows="3"
          placeholder="amara@example.com, diego@example.com, priya@example.com"
          class="zt-textarea"
        ></textarea>
        <button type="button" class="zt-btn-ghost mt-2" @click="addBulk">Add all</button>
      </div>
    </div>

    <div>
      <div class="mb-2 flex items-center justify-between">
        <h4 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          Invites ({{ draft.invites.length }})
        </h4>
        <span class="text-theme-xs text-gray-500 dark:text-gray-400">
          {{ seatCount }} seats including you
        </span>
      </div>

      <ul v-if="draft.invites.length" class="flex flex-col gap-2">
        <li
          v-for="invite in draft.invites"
          :key="invite.id"
          class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
        >
          <div class="flex min-w-0 items-center gap-3">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-theme-xs font-semibold text-white"
              :style="{ backgroundColor: colorFromString(invite.email) }"
            >
              {{ invite.email.slice(0, 2).toUpperCase() }}
            </span>
            <div class="min-w-0">
              <p class="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {{ invite.email }}
              </p>
              <p class="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                {{ roleLabel(invite.role) }}
                <template v-if="invite.jobTitle"> · {{ invite.jobTitle }}</template>
              </p>
            </div>
          </div>
          <button
            type="button"
            class="text-theme-xs font-medium text-gray-500 transition-colors hover:text-error-500"
            @click="removeInvite(invite.id)"
          >
            Remove
          </button>
        </li>
      </ul>

      <p
        v-else
        class="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-theme-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
      >
        No invites yet. You can also skip this and add people later from the Team page.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRegistration } from '@/composables/useRegistration'
import { isEmail, memberRoles } from '@/composables/useWorkspace'
import type { MemberRole } from '@/types/company'
import { colorFromString } from '@/utils/color'
import ZSelect from '@/components/ui/ZSelect.vue'

const { draft, addInvite, removeInvite } = useRegistration()

const email = ref('')
const role = ref<MemberRole>('member')
const jobTitle = ref('')
const error = ref('')
const bulk = ref('')
const showBulk = ref(false)

const seatCount = computed(() => draft.invites.length + 1)

const roleOptions = memberRoles.map((option) => ({
  value: option.value,
  label: option.label,
  hint: option.description,
}))

const roleLabel = (value: MemberRole) =>
  memberRoles.find((option) => option.value === value)?.label ?? value

const roleHint = computed(
  () => memberRoles.find((option) => option.value === role.value)?.description ?? '',
)

const add = () => {
  error.value = ''
  if (!isEmail(email.value)) {
    error.value = 'Enter a valid email address.'
    return
  }
  if (!addInvite(email.value, role.value, jobTitle.value)) {
    error.value = 'That address is already on the list.'
    return
  }
  email.value = ''
  jobTitle.value = ''
}

const addBulk = () => {
  error.value = ''
  const candidates = bulk.value
    .split(/[\s,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
  const rejected = candidates.filter((candidate) => !addInvite(candidate, role.value))
  bulk.value = rejected.join(', ')
  if (rejected.length) error.value = `${rejected.length} address(es) were invalid or duplicated.`
}
</script>
