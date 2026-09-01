<template>
  <div class="flex flex-col gap-6">
    <div class="grid gap-5 sm:grid-cols-2">
      <div>
        <label for="owner-first" class="zt-label">
          First name<span class="text-error-500">*</span>
        </label>
        <input
          id="owner-first"
          v-model="draft.owner.firstName"
          type="text"
          placeholder="Amara"
          class="zt-input"
        />
        <span v-if="errors.firstName" class="zt-error">{{ errors.firstName }}</span>
      </div>
      <div>
        <label for="owner-last" class="zt-label">
          Last name<span class="text-error-500">*</span>
        </label>
        <input
          id="owner-last"
          v-model="draft.owner.lastName"
          type="text"
          placeholder="Osei"
          class="zt-input"
        />
        <span v-if="errors.lastName" class="zt-error">{{ errors.lastName }}</span>
      </div>

      <div class="sm:col-span-2">
        <label for="owner-email" class="zt-label">
          Work email<span class="text-error-500">*</span>
        </label>
        <input
          id="owner-email"
          v-model="draft.owner.email"
          type="email"
          placeholder="amara@northwind.example"
          class="zt-input"
        />
        <span v-if="errors.email" class="zt-error">{{ errors.email }}</span>
        <p v-else class="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
          This becomes the workspace owner account. It can be changed later in settings.
        </p>
      </div>

      <div>
        <label for="owner-title" class="zt-label">Job title</label>
        <input
          id="owner-title"
          v-model="draft.owner.jobTitle"
          type="text"
          placeholder="Head of Product"
          class="zt-input"
        />
      </div>
      <div>
        <label for="owner-phone" class="zt-label">Phone</label>
        <input
          id="owner-phone"
          v-model="draft.owner.phone"
          type="tel"
          placeholder="+49 30 1234567"
          class="zt-input"
        />
      </div>

      <div class="sm:col-span-2">
        <label for="owner-tz" class="zt-label">Your time zone</label>
        <ZSelect
          id="owner-tz"
          v-model="draft.owner.timezone"
          :options="timezoneOptions"
          aria-label="Your time zone"
        />
      </div>

      <div class="sm:col-span-2">
        <label for="owner-password" class="zt-label">
          Password<span class="text-error-500">*</span>
        </label>
        <div class="relative">
          <input
            id="owner-password"
            v-model="draft.owner.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="At least 10 characters"
            class="zt-input pr-11"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-theme-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>

        <div class="mt-2.5 flex items-center gap-2">
          <div class="flex flex-1 gap-1">
            <span
              v-for="bar in 4"
              :key="bar"
              class="h-1.5 flex-1 rounded-full transition-colors"
              :class="bar <= strength.score ? strengthColor : 'bg-gray-200 dark:bg-gray-800'"
            ></span>
          </div>
          <span class="text-theme-xs text-gray-500 dark:text-gray-400">{{ strength.label }}</span>
        </div>
        <p
          v-if="strength.hints.length"
          class="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400"
        >
          Still missing: {{ strength.hints.join(', ') }}.
        </p>
      </div>

      <div class="sm:col-span-2">
        <label for="owner-confirm" class="zt-label">
          Confirm password<span class="text-error-500">*</span>
        </label>
        <input
          id="owner-confirm"
          v-model="confirmPassword"
          type="password"
          class="zt-input"
          placeholder="Repeat the password"
        />
        <span v-if="mismatch" class="zt-error">The two passwords do not match.</span>
      </div>
    </div>

    <div
      class="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]"
    >
      <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
        You will be the workspace owner
      </p>
      <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
        Owners manage billing, members and every board. You can hand the role to someone else at any
        time from Team settings.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRegistration } from '@/composables/useRegistration'
import { scorePassword, timezones } from '@/composables/useWorkspace'
import ZSelect from '@/components/ui/ZSelect.vue'
import { toOptions } from '@/utils/options'

const timezoneOptions = toOptions(timezones)

const { draft, errors, confirmPassword } = useRegistration()

const showPassword = ref(false)

const strength = computed(() => scorePassword(draft.owner.password))

const strengthColor = computed(() => {
  if (strength.value.score <= 1) return 'bg-error-500'
  if (strength.value.score === 2) return 'bg-warning-500'
  if (strength.value.score === 3) return 'bg-blue-light-500'
  return 'bg-success-500'
})

const mismatch = computed(
  () => confirmPassword.value.length > 0 && confirmPassword.value !== draft.owner.password,
)

// Keep the confirmation in step when the wizard is reset.
watch(
  () => draft.owner.password,
  (value) => {
    if (value === '') confirmPassword.value = ''
  },
)
</script>
