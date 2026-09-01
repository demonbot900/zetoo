<template>
  <div :class="variant === 'compact' ? 'w-auto' : 'w-full'">
    <label v-if="showLabel" :for="id" class="zt-label">{{ t('language.label') }}</label>

    <ZSelect
      :id="id"
      :model-value="locale"
      :options="options"
      :size="variant === 'compact' ? 'sm' : 'md'"
      :aria-label="t('language.label')"
      searchable
      search-placeholder="Search languages…"
      :class="variant === 'compact' ? 'w-[7.5rem]' : ''"
      @update:model-value="onChange"
    />

    <p v-if="showHint" class="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
      {{ isTranslated ? t('language.hint') : t('language.untranslated') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ZSelect from '@/components/ui/ZSelect.vue'
import { useLocale, isTranslated as hasCatalogue } from '@/composables/useLocale'
import { languagesByRegion } from '@/locales/languages'

const props = withDefaults(
  defineProps<{
    /** `full` fills its container; `compact` is the flag-and-code header button. */
    variant?: 'full' | 'compact'
    showLabel?: boolean
    showHint?: boolean
    id?: string
  }>(),
  { variant: 'full', showLabel: false, showHint: false, id: 'language-select' },
)

const { locale, setLocale, isTranslated, t } = useLocale()

const options = computed(() =>
  languagesByRegion().map((language) => ({
    value: language.code,
    label: language.native,
    // The closed button stays narrow; the list keeps the full native name.
    short: language.code.split('-')[0].toUpperCase(),
    // The English name keeps the search box useful for people who do not read
    // the native spelling, and marks the languages that carry a catalogue.
    hint: hasCatalogue(language.code)
      ? `${language.english} · ${t('language.translated')}`
      : language.english,
    icon: language.flag,
    group: language.region,
  })),
)

const onChange = (value: string | number | null) => setLocale(String(value))
</script>
