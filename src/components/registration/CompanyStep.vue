<template>
  <div class="flex flex-col gap-6">
    <div class="grid gap-5 sm:grid-cols-2">
      <div class="sm:col-span-2">
        <label for="company-name" class="zt-label">
          Company name<span class="text-error-500">*</span>
        </label>
        <input
          id="company-name"
          :value="draft.company.name"
          type="text"
          placeholder="Northwind Studio GmbH"
          class="zt-input"
          @input="setName(($event.target as HTMLInputElement).value)"
        />
        <span v-if="showError('name')" class="zt-error">{{ errors.name }}</span>
      </div>

      <div class="sm:col-span-2">
        <label for="company-slug" class="zt-label">Workspace URL</label>
        <div
          class="flex h-11 items-center overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700"
        >
          <span
            class="h-full shrink-0 border-r border-gray-300 bg-gray-50 px-3 text-theme-sm leading-[2.75rem] text-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400"
          >
            zetoo.app/
          </span>
          <input
            id="company-slug"
            v-model="draft.company.slug"
            type="text"
            placeholder="northwind-studio"
            class="h-full w-full bg-transparent px-3 text-theme-sm text-gray-800 outline-none dark:text-white/90"
            @blur="draft.company.slug = slugify(draft.company.slug)"
          />
        </div>
        <span v-if="showError('slug')" class="zt-error">{{ errors.slug }}</span>
      </div>

      <div>
        <label for="company-industry" class="zt-label">Industry</label>
        <ZSelect
          id="company-industry"
          v-model="draft.company.industry"
          :options="industryOptions"
          aria-label="Industry"
        />
      </div>

      <div>
        <label for="company-website" class="zt-label">Website</label>
        <input
          id="company-website"
          v-model="draft.company.website"
          type="url"
          placeholder="https://northwind.example"
          class="zt-input"
        />
        <span v-if="showError('website')" class="zt-error">{{ errors.website }}</span>
      </div>
    </div>

    <div>
      <span class="zt-label">Company size</span>
      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <button
          v-for="size in companySizes"
          :key="size.value"
          type="button"
          class="rounded-xl border px-3 py-3 text-left transition-colors"
          :class="
            draft.company.size === size.value
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
          "
          @click="draft.company.size = size.value"
        >
          <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {{ size.label }}
          </span>
          <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ size.hint }}</span>
        </button>
      </div>
    </div>

    <div>
      <span class="zt-label">Logo</span>
      <div class="flex flex-wrap items-center gap-4">
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
          :style="draft.company.logo ? {} : { backgroundColor: appearance.brand }"
        >
          <img
            v-if="draft.company.logo"
            :src="draft.company.logo"
            alt="Company logo"
            class="h-full w-full object-cover"
          />
          <span v-else class="text-xl font-semibold" :style="{ color: 'var(--brand-contrast)' }">
            {{ monogram }}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <label class="zt-btn-ghost cursor-pointer">
            Upload logo
            <input type="file" accept="image/*" class="hidden" @change="onLogoChange" />
          </label>
          <button
            v-if="draft.company.logo"
            type="button"
            class="zt-btn-ghost"
            @click="draft.company.logo = ''"
          >
            Remove
          </button>
          <p class="text-theme-xs text-gray-500 dark:text-gray-400">
            PNG or SVG, up to 1 MB. Without one we use your monogram.
          </p>
        </div>
      </div>
      <span v-if="logoError" class="zt-error">{{ logoError }}</span>
    </div>

    <div class="grid gap-5 sm:grid-cols-2">
      <div class="sm:col-span-2">
        <label for="company-address" class="zt-label">Street and number</label>
        <input
          id="company-address"
          v-model="draft.company.addressLine"
          type="text"
          placeholder="Torstraße 12"
          class="zt-input"
        />
      </div>
      <div>
        <label for="company-postal" class="zt-label">Postal code</label>
        <input
          id="company-postal"
          v-model="draft.company.postalCode"
          type="text"
          class="zt-input"
        />
      </div>
      <div>
        <label for="company-city" class="zt-label">City</label>
        <input id="company-city" v-model="draft.company.city" type="text" class="zt-input" />
      </div>
      <div>
        <label for="company-country" class="zt-label">Country</label>
        <ZSelect
          id="company-country"
          v-model="draft.company.country"
          :options="countryOptions"
          aria-label="Country"
        />
      </div>
      <div>
        <label for="company-vat" class="zt-label">VAT / tax ID</label>
        <input
          id="company-vat"
          v-model="draft.company.vatId"
          type="text"
          placeholder="DE123456789"
          class="zt-input"
        />
      </div>
    </div>

    <div class="grid gap-5 sm:grid-cols-2">
      <div>
        <label for="company-language" class="zt-label">Workspace language</label>
        <LanguageSelect id="company-language" show-hint />
      </div>

      <div>
        <label for="company-tz" class="zt-label">Workspace time zone</label>
        <ZSelect
          id="company-tz"
          v-model="draft.company.timezone"
          :options="timezoneOptions"
          aria-label="Workspace time zone"
        />
      </div>
      <div>
        <label for="company-hours" class="zt-label">Hours per working day</label>
        <input
          id="company-hours"
          v-model.number="draft.company.hoursPerDay"
          type="number"
          min="1"
          max="12"
          step="0.5"
          class="zt-input"
        />
      </div>
      <div class="sm:col-span-2">
        <span class="zt-label">Working days</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="day in weekDays"
            :key="day.value"
            type="button"
            class="h-10 min-w-14 rounded-lg border px-3 text-theme-sm font-medium transition-colors"
            :class="
              draft.company.workDays.includes(day.value)
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]'
            "
            @click="toggleWorkDay(day.value)"
          >
            {{ day.label }}
          </button>
        </div>
        <span v-if="showError('workDays')" class="zt-error">{{ errors.workDays }}</span>
        <p class="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
          Sprint capacity is calculated from this: {{ capacityPerSprint }}h per person per two-week
          sprint.
        </p>
      </div>
    </div>

    <div>
      <span class="zt-label">Plan</span>
      <div class="grid gap-3 md:grid-cols-3">
        <button
          v-for="plan in plans"
          :key="plan.id"
          type="button"
          class="rounded-2xl border p-4 text-left transition-colors"
          :class="
            draft.company.plan === plan.id
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
          "
          @click="draft.company.plan = plan.id"
        >
          <div class="flex items-center justify-between">
            <span class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {{ plan.name }}
            </span>
            <span
              v-if="draft.company.plan === plan.id"
              class="rounded-full bg-brand-500 px-2 py-0.5 text-theme-xs font-medium text-white"
            >
              Selected
            </span>
          </div>
          <p class="mt-1 text-theme-sm text-brand-500">{{ plan.price }}</p>
          <p class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{{ plan.blurb }}</p>
          <ul class="mt-3 space-y-1">
            <li
              v-for="perk in plan.perks"
              :key="perk"
              class="flex items-center gap-2 text-theme-xs text-gray-600 dark:text-gray-300"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-success-500"></span>
              {{ perk }}
            </li>
          </ul>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRegistration } from '@/composables/useRegistration'
import {
  companySizes,
  countries,
  industries,
  plans,
  slugify,
  timezones,
} from '@/composables/useWorkspace'
import { useAppearance } from '@/composables/useAppearance'
import ZSelect from '@/components/ui/ZSelect.vue'
import LanguageSelect from '@/components/common/LanguageSelect.vue'
import { toOptions } from '@/utils/options'

const { draft, errors, setName, toggleWorkDay } = useRegistration()
const { appearance } = useAppearance()

const industryOptions = toOptions(industries)
const countryOptions = toOptions(countries)
const timezoneOptions = toOptions(timezones)

const touched = ref(false)
const logoError = ref('')

const weekDays = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

// Errors only appear once the field has been visited at least once.
const showError = (key: string) =>
  Boolean(errors.value[key]) && (touched.value || draft.company.name !== '')

const monogram = computed(
  () =>
    draft.company.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || 'Z',
)

const capacityPerSprint = computed(
  () => draft.company.workDays.length * draft.company.hoursPerDay * 2,
)

const onLogoChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  logoError.value = ''
  if (!file) return
  if (file.size > 1024 * 1024) {
    logoError.value = 'That file is larger than 1 MB.'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    draft.company.logo = String(reader.result ?? '')
    touched.value = true
  }
  reader.readAsDataURL(file)
}
</script>
