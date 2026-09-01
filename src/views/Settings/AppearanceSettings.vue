<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Appearance" />

    <div class="flex flex-col gap-6">
      <section class="zt-card p-5 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
              Workspace appearance
            </h3>
            <p class="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              Every control writes CSS variables straight onto the page — no reload, and the choices
              are stored in this browser.
            </p>
          </div>
          <button type="button" class="zt-btn-ghost" @click="reset">Reset to default</button>
        </div>
      </section>

      <section class="zt-card p-5 sm:p-6">
        <div class="mb-4 flex items-start gap-3">
          <span
            class="fi mt-1 h-6 w-8 shrink-0 rounded-xs shadow-xs ring-1 ring-black/10 dark:ring-white/15"
            :class="`fi-${language.flag}`"
          ></span>
          <div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
              Language &amp; region
            </h3>
            <p class="mt-0.5 text-theme-sm text-gray-500 dark:text-gray-400">
              {{ languages.length }} languages across Europe, the Middle East and Asia —
              {{ translatedCount }} with a full interface translation. The rest still format dates
              and numbers their own way.
            </p>
          </div>
        </div>

        <div class="grid gap-5 lg:grid-cols-[minmax(0,20rem)_1fr]">
          <LanguageSelect show-label show-hint />

          <div class="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
            <p class="mb-3 text-theme-xs font-medium uppercase tracking-wide text-gray-400">
              Preview · {{ language.native }}
            </p>
            <dl class="grid gap-3 sm:grid-cols-2">
              <div v-for="row in formatPreview" :key="row.label">
                <dt class="text-theme-xs text-gray-500 dark:text-gray-400">{{ row.label }}</dt>
                <dd class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {{ row.value }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <ThemePreview />

      <div class="grid gap-6 xl:grid-cols-2">
        <section class="zt-card p-5 sm:p-6">
          <ThemeControls :sections="['presets', 'colors']" />
        </section>
        <section class="zt-card p-5 sm:p-6">
          <ThemeControls :sections="['typography']" />
        </section>
        <section class="zt-card p-5 sm:p-6">
          <ThemeControls :sections="['layout']" />
        </section>
        <section class="zt-card p-5 sm:p-6">
          <ThemeControls :sections="['board', 'actions']" />
        </section>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ThemeControls from '@/components/theme/ThemeControls.vue'
import ThemePreview from '@/components/theme/ThemePreview.vue'
import { useAppearance } from '@/composables/useAppearance'
import LanguageSelect from '@/components/common/LanguageSelect.vue'
import { useLocale } from '@/composables/useLocale'
import { messages } from '@/locales/messages'

const { reset } = useAppearance()
const { language, languages, isRtl, d, n } = useLocale()

const translatedCount = Object.keys(messages).length

const formatPreview = computed(() => [
  { label: 'Long date', value: d(new Date(), { dateStyle: 'full' }) },
  { label: 'Short date', value: d(new Date(), { dateStyle: 'short' }) },
  { label: 'Number', value: n(1234567.89, { maximumFractionDigits: 2 }) },
  { label: 'Percent', value: n(0.732, { style: 'percent', maximumFractionDigits: 1 }) },
  { label: 'Writing direction', value: isRtl.value ? 'Right to left' : 'Left to right' },
])
</script>
