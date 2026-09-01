<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Company settings" />

    <div v-if="company" class="flex flex-col gap-6">
      <!-- Identity -------------------------------------------------- -->
      <section class="zt-card p-5 sm:p-6">
        <h3 class="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Company profile</h3>

        <div class="mb-6 flex flex-wrap items-center gap-4">
          <div
            class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
            :style="company.logo ? {} : { backgroundColor: appearance.brand }"
          >
            <img
              v-if="company.logo"
              :src="company.logo"
              alt="Logo"
              class="h-full w-full object-cover"
            />
            <span v-else class="text-xl font-semibold" :style="{ color: 'var(--brand-contrast)' }">
              {{ monogram }}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <label class="zt-btn-ghost cursor-pointer">
              Replace logo
              <input type="file" accept="image/*" class="hidden" @change="onLogoChange" />
            </label>
            <button
              v-if="company.logo"
              type="button"
              class="zt-btn-ghost"
              @click="updateCompany({ logo: '' })"
            >
              Remove
            </button>
            <span v-if="logoError" class="text-theme-xs text-error-500">{{ logoError }}</span>
          </div>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label for="settings-name" class="zt-label">Company name</label>
            <input
              id="settings-name"
              :value="company.name"
              type="text"
              class="zt-input"
              @change="updateCompany({ name: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label for="settings-slug" class="zt-label">Workspace URL</label>
            <input
              id="settings-slug"
              :value="company.slug"
              type="text"
              class="zt-input"
              @change="updateCompany({ slug: slugify(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div>
            <label for="settings-industry" class="zt-label">Industry</label>
            <ZSelect
              id="settings-industry"
              :model-value="company.industry"
              :options="industryOptions"
              aria-label="Industry"
              @update:model-value="updateCompany({ industry: String($event) })"
            />
          </div>
          <div>
            <label for="settings-size" class="zt-label">Company size</label>
            <ZSelect
              id="settings-size"
              :model-value="company.size"
              :options="sizeOptions"
              aria-label="Company size"
              @update:model-value="updateCompany({ size: $event as CompanySize })"
            />
          </div>
          <div>
            <label for="settings-website" class="zt-label">Website</label>
            <input
              id="settings-website"
              :value="company.website"
              type="url"
              class="zt-input"
              @change="updateCompany({ website: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label for="settings-vat" class="zt-label">VAT / tax ID</label>
            <input
              id="settings-vat"
              :value="company.vatId"
              type="text"
              class="zt-input"
              @change="updateCompany({ vatId: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div class="sm:col-span-2">
            <label for="settings-address" class="zt-label">Street and number</label>
            <input
              id="settings-address"
              :value="company.addressLine"
              type="text"
              class="zt-input"
              @change="updateCompany({ addressLine: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label for="settings-postal" class="zt-label">Postal code</label>
            <input
              id="settings-postal"
              :value="company.postalCode"
              type="text"
              class="zt-input"
              @change="updateCompany({ postalCode: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label for="settings-city" class="zt-label">City</label>
            <input
              id="settings-city"
              :value="company.city"
              type="text"
              class="zt-input"
              @change="updateCompany({ city: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div>
            <label for="settings-country" class="zt-label">Country</label>
            <ZSelect
              id="settings-country"
              :model-value="company.country"
              :options="countryOptions"
              aria-label="Country"
              @update:model-value="updateCompany({ country: String($event) })"
            />
          </div>
          <div>
            <label for="settings-tz" class="zt-label">Time zone</label>
            <ZSelect
              id="settings-tz"
              :model-value="company.timezone"
              :options="timezoneOptions"
              aria-label="Time zone"
              @update:model-value="updateCompany({ timezone: String($event) })"
            />
          </div>
        </div>
      </section>

      <!-- Working week ---------------------------------------------- -->
      <section class="zt-card p-5 sm:p-6">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Working week</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="day in weekDays"
            :key="day.value"
            type="button"
            class="h-10 min-w-14 rounded-lg border px-3 text-theme-sm font-medium transition-colors"
            :class="
              company.workDays.includes(day.value)
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]'
            "
            @click="toggleDay(day.value)"
          >
            {{ day.label }}
          </button>
        </div>
        <div class="mt-4 max-w-xs">
          <label for="settings-hours" class="zt-label">Hours per working day</label>
          <input
            id="settings-hours"
            :value="company.hoursPerDay"
            type="number"
            min="1"
            max="12"
            step="0.5"
            class="zt-input"
            @change="
              updateCompany({ hoursPerDay: Number(($event.target as HTMLInputElement).value) })
            "
          />
        </div>
        <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
          Default sprint capacity: {{ company.workDays.length * company.hoursPerDay * 2 }}h per
          person.
        </p>
      </section>

      <!-- Plan ------------------------------------------------------- -->
      <section class="zt-card p-5 sm:p-6">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Plan</h3>
        <div class="grid gap-3 md:grid-cols-3">
          <button
            v-for="plan in plans"
            :key="plan.id"
            type="button"
            class="rounded-2xl border p-4 text-left transition-colors"
            :class="
              company.plan === plan.id
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
            "
            @click="updateCompany({ plan: plan.id })"
          >
            <p class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {{ plan.name }}
            </p>
            <p class="mt-1 text-theme-sm text-brand-500">{{ plan.price }}</p>
            <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{{ plan.blurb }}</p>
          </button>
        </div>
        <p class="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
          {{ members.length }} seats in use · workspace created
          {{ formatDate(company.createdAt.slice(0, 10), { dateStyle: 'medium' }) }}
        </p>
      </section>

      <!-- Board template --------------------------------------------- -->
      <section class="zt-card p-5 sm:p-6">
        <h3 class="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Board workflow</h3>
        <p class="mb-4 text-theme-sm text-gray-500 dark:text-gray-400">
          Switching template rewrites the columns. Cards are remapped column by column, so nothing
          is lost.
        </p>
        <div class="grid gap-3 md:grid-cols-2">
          <button
            v-for="template in boardTemplates"
            :key="template.id"
            type="button"
            class="rounded-2xl border border-gray-200 p-4 text-left transition-colors hover:border-brand-400 dark:border-gray-800"
            @click="switchTemplate(template.id)"
          >
            <p class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {{ template.name }}
            </p>
            <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              {{ template.description }}
            </p>
          </button>
        </div>
        <p v-if="templateApplied" class="mt-3 text-theme-xs text-success-600">Columns updated.</p>
      </section>

      <!-- Danger zone ------------------------------------------------ -->
      <section class="rounded-2xl border border-error-200 p-5 dark:border-error-500/30 sm:p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Danger zone</h3>
        <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          Deleting the workspace removes the company, every profile and the saved board from this
          browser. You will be sent back to registration.
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" class="zt-btn-ghost" @click="resetBoardOnly">
            Reset board to sample data
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-error-500 px-4 py-3 text-theme-sm font-medium text-white transition-colors hover:bg-error-600"
            @click="confirmingDelete = true"
          >
            Delete workspace
          </button>
        </div>

        <div
          v-if="confirmingDelete"
          class="mt-4 rounded-xl border border-error-200 bg-error-25 p-4 dark:border-error-500/30 dark:bg-error-500/10"
        >
          <p class="text-theme-sm text-gray-700 dark:text-gray-300">
            Type <span class="font-mono font-medium">{{ company.slug }}</span> to confirm.
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <input v-model="deleteConfirmation" type="text" class="zt-input max-w-xs" />
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg bg-error-500 px-4 py-3 text-theme-sm font-medium text-white disabled:bg-error-300"
              :disabled="deleteConfirmation !== company.slug"
              @click="destroy"
            >
              Delete permanently
            </button>
            <button type="button" class="zt-btn-ghost" @click="confirmingDelete = false">
              Cancel
            </button>
          </div>
        </div>
      </section>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import {
  companySizes,
  countries,
  industries,
  plans,
  slugify,
  timezones,
  useWorkspace,
} from '@/composables/useWorkspace'
import { boardTemplates, formatDate, usePlanner } from '@/composables/usePlanner'
import { useAppearance } from '@/composables/useAppearance'
import ZSelect from '@/components/ui/ZSelect.vue'
import { toOptions } from '@/utils/options'
import { resetEverything } from '@/utils/sync'
import type { CompanySize } from '@/types/company'

const { company, members, updateCompany, resetWorkspace } = useWorkspace()
const { applyBoardTemplate, resetBoard } = usePlanner()
const { appearance } = useAppearance()

const logoError = ref('')
const confirmingDelete = ref(false)
const deleteConfirmation = ref('')
const templateApplied = ref(false)

const industryOptions = toOptions(industries)
const countryOptions = toOptions(countries)
const timezoneOptions = toOptions(timezones)
const sizeOptions = companySizes.map((size) => ({
  value: size.value,
  label: size.label,
  hint: size.hint,
}))

const weekDays = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

const monogram = computed(
  () =>
    (company.value?.name ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || 'Z',
)

const toggleDay = (day: number) => {
  if (!company.value) return
  const days = [...company.value.workDays]
  const index = days.indexOf(day)
  if (index === -1) days.push(day)
  else days.splice(index, 1)
  updateCompany({ workDays: days.sort() })
}

const onLogoChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  logoError.value = ''
  if (!file) return
  if (file.size > 1024 * 1024) {
    logoError.value = 'Pick an image under 1 MB.'
    return
  }
  const reader = new FileReader()
  reader.onload = () => updateCompany({ logo: String(reader.result ?? '') })
  reader.readAsDataURL(file)
}

const switchTemplate = (templateId: string) => {
  applyBoardTemplate(templateId, { keepIssues: true })
  templateApplied.value = true
  window.setTimeout(() => {
    templateApplied.value = false
  }, 2500)
}

const resetBoardOnly = () => resetBoard()

const destroy = async () => {
  // Clears the database and this browser's mirror before reloading into the
  // registration wizard; `resetEverything` navigates once both are gone.
  resetWorkspace()
  await resetEverything()
}
</script>
