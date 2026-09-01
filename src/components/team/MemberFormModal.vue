<template>
  <ZModal
    :open="open"
    :title="member ? 'Edit profile' : 'Add a team member'"
    subtitle="Profiles drive assignment, capacity planning and the workload report."
    size="lg"
    @close="$emit('close')"
  >
    <div class="flex flex-col gap-6">
      <!-- Identity ------------------------------------------------- -->
      <section class="rounded-2xl border border-gray-200 p-4 dark:border-gray-800 sm:p-5">
        <div class="flex flex-wrap items-center gap-4">
          <MemberAvatar :member="form" size="lg" />
          <div class="flex flex-wrap items-center gap-2">
            <label class="zt-btn-ghost cursor-pointer py-2.5">
              Upload photo
              <input type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
            </label>
            <button
              v-if="form.avatar"
              type="button"
              class="zt-btn-ghost py-2.5"
              @click="form.avatar = ''"
            >
              Remove
            </button>
          </div>
          <label class="ml-auto flex items-center gap-2">
            <span class="text-theme-xs text-gray-500 dark:text-gray-400">Monogram</span>
            <input
              v-model="form.accent"
              type="color"
              class="h-9 w-12 cursor-pointer rounded-lg border border-gray-300 bg-transparent p-1 dark:border-gray-700"
              aria-label="Monogram colour"
            />
          </label>
        </div>
        <p v-if="avatarError" class="zt-error">{{ avatarError }}</p>

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label for="member-first" class="zt-label">
              First name<span class="text-error-500">*</span>
            </label>
            <input id="member-first" v-model="form.firstName" type="text" class="zt-input" />
          </div>
          <div>
            <label for="member-last" class="zt-label">
              Last name<span class="text-error-500">*</span>
            </label>
            <input id="member-last" v-model="form.lastName" type="text" class="zt-input" />
          </div>
          <div>
            <label for="member-email" class="zt-label">
              Email<span class="text-error-500">*</span>
            </label>
            <input id="member-email" v-model="form.email" type="email" class="zt-input" />
          </div>
          <div>
            <label for="member-phone" class="zt-label">Phone</label>
            <input id="member-phone" v-model="form.phone" type="tel" class="zt-input" />
          </div>
        </div>
      </section>

      <!-- Role and work --------------------------------------------- -->
      <section>
        <h4 class="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          Role & work
        </h4>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="member-title" class="zt-label">Job title</label>
            <input id="member-title" v-model="form.jobTitle" type="text" class="zt-input" />
          </div>
          <div>
            <label for="member-dept" class="zt-label">Department</label>
            <ZSelect
              id="member-dept"
              v-model="form.department"
              :options="departmentOptions"
              aria-label="Department"
            />
          </div>
          <div>
            <label for="member-role" class="zt-label">Workspace role</label>
            <ZSelect
              id="member-role"
              v-model="form.role"
              :options="roleOptions"
              aria-label="Workspace role"
            />
          </div>
          <div>
            <label for="member-status" class="zt-label">Status</label>
            <ZSelect
              id="member-status"
              v-model="form.status"
              :options="statusOptions"
              aria-label="Status"
            />
          </div>
          <div>
            <label for="member-capacity" class="zt-label">Sprint capacity (hours)</label>
            <input
              id="member-capacity"
              v-model.number="form.capacityHours"
              type="number"
              min="0"
              max="120"
              class="zt-input"
            />
          </div>
          <div>
            <label for="member-start" class="zt-label">Start date</label>
            <input id="member-start" v-model="form.startedAt" type="date" class="zt-input" />
          </div>
          <div>
            <label for="member-location" class="zt-label">Location</label>
            <input id="member-location" v-model="form.location" type="text" class="zt-input" />
          </div>
          <div>
            <label for="member-tz" class="zt-label">Time zone</label>
            <ZSelect
              id="member-tz"
              v-model="form.timezone"
              :options="timezoneOptions"
              aria-label="Time zone"
            />
          </div>
        </div>
      </section>

      <!-- Profile ---------------------------------------------------- -->
      <section>
        <h4 class="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">Profile</h4>

        <label for="member-skills" class="zt-label">Skills</label>
        <div v-if="form.skills.length" class="mb-2 flex flex-wrap gap-1.5">
          <span v-for="skill in form.skills" :key="skill" class="zt-chip">
            {{ skill }}
            <button
              type="button"
              class="text-gray-400 transition-colors hover:text-error-500"
              :aria-label="`Remove ${skill}`"
              @click="removeSkill(skill)"
            >
              ×
            </button>
          </span>
        </div>
        <input
          id="member-skills"
          v-model="skillDraft"
          type="text"
          placeholder="Type a skill and press Enter"
          class="zt-input"
          @keydown.enter.prevent="addSkill"
        />

        <label for="member-bio" class="zt-label mt-4">Bio</label>
        <textarea id="member-bio" v-model="form.bio" rows="3" class="zt-textarea"></textarea>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div v-for="link in linkFields" :key="link.key">
            <label :for="`member-${link.key}`" class="zt-label">{{ link.label }}</label>
            <input
              :id="`member-${link.key}`"
              v-model="form.links[link.key]"
              type="url"
              :placeholder="link.placeholder"
              class="zt-input"
            />
          </div>
        </div>
      </section>

      <p v-if="error" class="zt-error">{{ error }}</p>
    </div>

    <template #footer>
      <button type="button" class="zt-btn-ghost py-2.5" @click="$emit('close')">Cancel</button>
      <button type="button" class="zt-btn-primary py-2.5" @click="save">
        {{ member ? 'Save changes' : 'Add member' }}
      </button>
    </template>
  </ZModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ZModal from '@/components/ui/ZModal.vue'
import ZSelect from '@/components/ui/ZSelect.vue'
import MemberAvatar from './MemberAvatar.vue'
import type { MemberProfile } from '@/types/company'
import {
  createMemberProfile,
  departments,
  isEmail,
  memberRoles,
  timezones,
  useWorkspace,
} from '@/composables/useWorkspace'
import { toOptions } from '@/utils/options'

const props = defineProps<{ open: boolean; member?: MemberProfile | null }>()
const emit = defineEmits<{ close: []; saved: [id: string] }>()

const { addMember, updateMember } = useWorkspace()

const departmentOptions = toOptions(departments)
const timezoneOptions = toOptions(timezones)
const roleOptions = memberRoles.map((option) => ({
  value: option.value,
  label: option.label,
  hint: option.description,
}))
const statusOptions = [
  { value: 'active', label: 'Active', color: '#12b76a' },
  { value: 'invited', label: 'Invited', color: '#f79009' },
  { value: 'inactive', label: 'Inactive', color: '#98a2b3' },
]

const form = ref<MemberProfile>(createMemberProfile())
const skillDraft = ref('')
const error = ref('')
const avatarError = ref('')

const linkFields: {
  key: 'linkedin' | 'github' | 'x' | 'website'
  label: string
  placeholder: string
}[] = [
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/…' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/…' },
  { key: 'x', label: 'X', placeholder: 'https://x.com/…' },
  { key: 'website', label: 'Website', placeholder: 'https://…' },
]

// Reload the form each time the modal opens so edits never leak between members.
watch(
  () => [props.open, props.member?.id],
  () => {
    if (!props.open) return
    error.value = ''
    avatarError.value = ''
    skillDraft.value = ''
    form.value = props.member
      ? { ...props.member, skills: [...props.member.skills], links: { ...props.member.links } }
      : createMemberProfile()
  },
  { immediate: true },
)

const addSkill = () => {
  const value = skillDraft.value.trim()
  if (!value || form.value.skills.includes(value)) return
  form.value.skills.push(value)
  skillDraft.value = ''
}

const removeSkill = (skill: string) => {
  form.value.skills = form.value.skills.filter((item) => item !== skill)
}

const onAvatarChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  avatarError.value = ''
  if (!file) return
  if (file.size > 1024 * 1024) {
    avatarError.value = 'Pick an image under 1 MB.'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    form.value.avatar = String(reader.result ?? '')
  }
  reader.readAsDataURL(file)
}

const save = () => {
  if (!form.value.firstName.trim() || !form.value.lastName.trim()) {
    error.value = 'First and last name are required.'
    return
  }
  if (!isEmail(form.value.email)) {
    error.value = 'Enter a valid email address.'
    return
  }

  if (props.member) {
    updateMember(props.member.id, form.value)
    emit('saved', props.member.id)
  } else {
    const created = addMember(form.value)
    emit('saved', created.id)
  }
  emit('close')
}
</script>
