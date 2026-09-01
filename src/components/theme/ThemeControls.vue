<template>
  <div class="flex flex-col gap-7">
    <!-- Presets ---------------------------------------------------- -->
    <section v-if="has('presets')">
      <header class="mb-3">
        <h4 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">Presets</h4>
        <p class="text-theme-xs text-gray-500 dark:text-gray-400">
          A starting point. Every value stays editable afterwards.
        </p>
      </header>
      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <button
          v-for="preset in themePresets"
          :key="preset.id"
          type="button"
          class="rounded-xl border p-3 text-left transition-colors"
          :class="
            isPresetActive(preset.id)
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
          "
          @click="applyPreset(preset.id)"
        >
          <div class="flex gap-1">
            <span
              class="h-5 w-5 rounded-full"
              :style="{ backgroundColor: preset.values.brand ?? defaultAppearance.brand }"
            ></span>
            <span
              class="h-5 w-5 rounded-full"
              :style="{ backgroundColor: preset.values.accent ?? defaultAppearance.accent }"
            ></span>
          </div>
          <p class="mt-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {{ preset.name }}
          </p>
          <p class="text-theme-xs text-gray-500 dark:text-gray-400">{{ preset.blurb }}</p>
        </button>
      </div>
    </section>

    <!-- Colours ---------------------------------------------------- -->
    <section v-if="has('colors')">
      <header class="mb-3">
        <h4 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">Colours</h4>
        <p class="text-theme-xs text-gray-500 dark:text-gray-400">
          The brand colour generates a full 12-step ramp used across the app.
        </p>
      </header>

      <div class="flex flex-col gap-5">
        <div>
          <span class="zt-label">Brand</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="swatch in brandSwatches"
              :key="swatch"
              type="button"
              class="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
              :style="{ backgroundColor: swatch }"
              :class="
                appearance.brand.toLowerCase() === swatch
                  ? 'border-gray-900 dark:border-white'
                  : 'border-transparent'
              "
              :title="swatch"
              @click="appearance.brand = swatch"
            ></button>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <input
              type="color"
              :value="appearance.brand"
              class="h-11 w-14 cursor-pointer rounded-lg border border-gray-300 bg-transparent p-1 dark:border-gray-700"
              aria-label="Brand colour picker"
              @input="appearance.brand = ($event.target as HTMLInputElement).value"
            />
            <input
              :value="appearance.brand"
              type="text"
              class="zt-input font-mono"
              aria-label="Brand colour hex"
              @change="setHex('brand', ($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="mt-3 flex overflow-hidden rounded-lg">
            <span
              v-for="(hex, step) in brandRamp"
              :key="step"
              class="h-6 flex-1"
              :style="{ backgroundColor: hex }"
              :title="`brand-${step} · ${hex}`"
            ></span>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div v-for="field in colorFields" :key="field.key">
            <span class="zt-label">{{ field.label }}</span>
            <div class="flex items-center gap-2">
              <input
                type="color"
                :value="appearance[field.key]"
                class="h-11 w-14 cursor-pointer rounded-lg border border-gray-300 bg-transparent p-1 dark:border-gray-700"
                :aria-label="`${field.label} colour picker`"
                @input="appearance[field.key] = ($event.target as HTMLInputElement).value"
              />
              <input
                :value="appearance[field.key]"
                type="text"
                class="zt-input font-mono"
                :aria-label="`${field.label} hex`"
                @change="setHex(field.key, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="zt-label">
              Neutral hue
              <span class="font-normal text-gray-400">{{ appearance.neutralHue }}°</span>
            </span>
            <input
              v-model.number="appearance.neutralHue"
              type="range"
              min="0"
              max="360"
              step="1"
              class="w-full accent-brand-500"
            />
          </label>
          <label class="block">
            <span class="zt-label">
              Neutral saturation
              <span class="font-normal text-gray-400">{{ appearance.neutralSaturation }}%</span>
            </span>
            <input
              v-model.number="appearance.neutralSaturation"
              type="range"
              min="0"
              max="30"
              step="1"
              class="w-full accent-brand-500"
            />
          </label>
        </div>
      </div>
    </section>

    <!-- Typography ------------------------------------------------- -->
    <section v-if="has('typography')">
      <header class="mb-3">
        <h4 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">Typography</h4>
        <p class="text-theme-xs text-gray-500 dark:text-gray-400">
          Fonts load from Google Fonts the moment you pick them.
        </p>
      </header>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="font-body" class="zt-label">Body font</label>
          <ZSelect
            id="font-body"
            v-model="appearance.fontBody"
            :options="fontSelectOptions"
            aria-label="Body font"
            searchable
          />
        </div>
        <div>
          <label for="font-heading" class="zt-label">Heading font</label>
          <ZSelect
            id="font-heading"
            v-model="appearance.fontHeading"
            :options="fontSelectOptions"
            aria-label="Heading font"
            searchable
          />
        </div>
        <div>
          <label for="font-mono" class="zt-label">Monospace font</label>
          <ZSelect
            id="font-mono"
            v-model="appearance.fontMono"
            :options="monoOptions"
            aria-label="Monospace font"
          />
        </div>
        <div>
          <label for="heading-weight" class="zt-label">Heading weight</label>
          <ZSelect
            id="heading-weight"
            v-model="appearance.headingWeight"
            :options="headingWeightOptions"
            aria-label="Heading weight"
          />
        </div>

        <label class="block">
          <span class="zt-label">
            Base size <span class="font-normal text-gray-400">{{ appearance.fontSize }}px</span>
          </span>
          <input
            v-model.number="appearance.fontSize"
            type="range"
            min="13"
            max="19"
            step="1"
            class="w-full accent-brand-500"
          />
        </label>
        <label class="block">
          <span class="zt-label">
            Line height
            <span class="font-normal text-gray-400">{{ appearance.lineHeight.toFixed(2) }}×</span>
          </span>
          <input
            v-model.number="appearance.lineHeight"
            type="range"
            min="0.9"
            max="1.3"
            step="0.05"
            class="w-full accent-brand-500"
          />
        </label>
        <label class="block sm:col-span-2">
          <span class="zt-label">
            Heading letter spacing
            <span class="font-normal text-gray-400"
              >{{ appearance.letterSpacing.toFixed(3) }}em</span
            >
          </span>
          <input
            v-model.number="appearance.letterSpacing"
            type="range"
            min="-0.04"
            max="0.08"
            step="0.005"
            class="w-full accent-brand-500"
          />
        </label>
      </div>

      <div class="mt-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <h3 class="text-theme-xl text-gray-800 dark:text-white/90">Sprint 24 planning</h3>
        <p class="mt-1 text-theme-sm text-gray-600 dark:text-gray-300">
          The quick brown fox jumps over the lazy dog — 0123456789.
        </p>
        <p class="mt-2 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
          ZT-142 · estimate 12h · logged 7.5h
        </p>
      </div>
    </section>

    <!-- Layout ----------------------------------------------------- -->
    <section v-if="has('layout')">
      <header class="mb-3">
        <h4 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">Shape & layout</h4>
      </header>

      <div class="flex flex-col gap-4">
        <div>
          <span class="zt-label">Appearance mode</span>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="mode in colorModes"
              :key="mode.value"
              type="button"
              class="rounded-lg border px-3 py-2.5 text-theme-sm font-medium transition-colors"
              :class="
                appearance.colorMode === mode.value
                  ? 'border-brand-500 bg-brand-50 text-brand-500 dark:bg-brand-500/10'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05]'
              "
              @click="setColorMode(mode.value)"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>

        <div>
          <span class="zt-label">Density</span>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="option in densities"
              :key="option.value"
              type="button"
              class="rounded-lg border px-3 py-2.5 text-left transition-colors"
              :class="
                appearance.density === option.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                  : 'border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.05]'
              "
              @click="appearance.density = option.value"
            >
              <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {{ option.label }}
              </span>
              <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
                {{ option.hint }}
              </span>
            </button>
          </div>
        </div>

        <div>
          <span class="zt-label">Sidebar</span>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="style in sidebarStyles"
              :key="style.value"
              type="button"
              class="rounded-lg border px-3 py-2.5 text-theme-sm font-medium transition-colors"
              :class="
                appearance.sidebarStyle === style.value
                  ? 'border-brand-500 bg-brand-50 text-brand-500 dark:bg-brand-500/10'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05]'
              "
              @click="appearance.sidebarStyle = style.value"
            >
              {{ style.label }}
            </button>
          </div>
        </div>

        <label class="block">
          <span class="zt-label">
            Corner radius
            <span class="font-normal text-gray-400">{{ appearance.radius.toFixed(2) }}×</span>
          </span>
          <input
            v-model.number="appearance.radius"
            type="range"
            min="0"
            max="2"
            step="0.05"
            class="w-full accent-brand-500"
          />
        </label>

        <label class="block">
          <span class="zt-label">
            Shadow strength
            <span class="font-normal text-gray-400"
              >{{ appearance.shadowIntensity.toFixed(2) }}×</span
            >
          </span>
          <input
            v-model.number="appearance.shadowIntensity"
            type="range"
            min="0"
            max="2"
            step="0.05"
            class="w-full accent-brand-500"
          />
        </label>

        <label class="block">
          <span class="zt-label">
            Border strength
            <span class="font-normal text-gray-400">{{ appearance.borderIntensity }}%</span>
          </span>
          <input
            v-model.number="appearance.borderIntensity"
            type="range"
            min="10"
            max="100"
            step="5"
            class="w-full accent-brand-500"
          />
        </label>
      </div>
    </section>

    <!-- Board & motion --------------------------------------------- -->
    <section v-if="has('board')">
      <header class="mb-3">
        <h4 class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">Board & motion</h4>
      </header>
      <div class="flex flex-col gap-2.5">
        <label
          v-for="toggle in toggles"
          :key="toggle.key"
          class="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
        >
          <span>
            <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ toggle.label }}
            </span>
            <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
              {{ toggle.hint }}
            </span>
          </span>
          <span class="relative inline-flex shrink-0">
            <input v-model="appearance[toggle.key]" type="checkbox" class="peer sr-only" />
            <span
              class="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-brand-500 dark:bg-gray-700"
            ></span>
            <span
              class="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"
            ></span>
          </span>
        </label>
      </div>
    </section>

    <!-- Export / reset --------------------------------------------- -->
    <section v-if="has('actions')" class="flex flex-col gap-3">
      <div class="flex flex-wrap gap-2">
        <button type="button" class="zt-btn-ghost" @click="copyTheme">
          {{ copied ? 'Copied' : 'Copy theme JSON' }}
        </button>
        <button type="button" class="zt-btn-ghost" @click="showImport = !showImport">
          Paste theme
        </button>
        <button type="button" class="zt-btn-ghost" @click="reset">Reset to default</button>
      </div>
      <div v-if="showImport">
        <textarea
          v-model="importPayload"
          rows="4"
          placeholder='{ "brand": "#465fff", ... }'
          class="zt-textarea font-mono"
        ></textarea>
        <div class="mt-2 flex items-center gap-2">
          <button type="button" class="zt-btn-primary" @click="runImport">Apply</button>
          <span v-if="importError" class="text-theme-xs text-error-500">{{ importError }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  brandSwatches,
  defaultAppearance,
  densities,
  fontOptions,
  sidebarStyles,
  themePresets,
  useAppearance,
} from '@/composables/useAppearance'
import type { Appearance, ColorMode } from '@/types/appearance'
import { isValidHex, normalizeHex } from '@/utils/color'
import ZSelect from '@/components/ui/ZSelect.vue'

type Section = 'presets' | 'colors' | 'typography' | 'layout' | 'board' | 'actions'

const props = withDefaults(defineProps<{ sections?: Section[] }>(), {
  sections: () => ['presets', 'colors', 'typography', 'layout', 'board', 'actions'],
})

const { appearance, brandRamp, applyPreset, reset, setColorMode, exportTheme, importTheme } =
  useAppearance()

const has = (section: Section) => props.sections.includes(section)

const colorFields: { key: 'accent' | 'success' | 'warning' | 'error'; label: string }[] = [
  { key: 'accent', label: 'Accent' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'error', label: 'Error' },
]

const colorModes: { value: ColorMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

const headingWeights = [400, 500, 600, 700, 800, 900]

const weightNames: Record<number, string> = {
  400: 'Regular',
  500: 'Medium',
  600: 'Semibold',
  700: 'Bold',
  800: 'Extrabold',
  900: 'Black',
}

const monoFonts = computed(() => fontOptions.filter((font) => font.category === 'mono'))

const groupLabels: Record<string, string> = {
  sans: 'Sans',
  display: 'Display',
  serif: 'Serif',
  mono: 'Mono',
}

const fontSelectOptions = computed(() =>
  (['sans', 'display', 'serif', 'mono'] as const).flatMap((category) =>
    fontOptions
      .filter((font) => font.category === category)
      .map((font) => ({ value: font.family, label: font.family, group: groupLabels[category] })),
  ),
)

const monoOptions = computed(() =>
  monoFonts.value.map((font) => ({ value: font.family, label: font.family })),
)

const headingWeightOptions = headingWeights.map((weight) => ({
  value: weight,
  label: String(weight),
  hint: weightNames[weight],
}))

const toggles: {
  key: 'boardCardCovers' | 'boardCompactCards' | 'reduceMotion'
  label: string
  hint: string
}[] = [
  {
    key: 'boardCardCovers',
    label: 'Card covers',
    hint: 'Show the colour strip on board cards.',
  },
  {
    key: 'boardCompactCards',
    label: 'Compact cards',
    hint: 'Hide meta rows to fit more cards per column.',
  },
  {
    key: 'reduceMotion',
    label: 'Reduce motion',
    hint: 'Disable transitions and animations everywhere.',
  },
]

const isPresetActive = (id: string) => {
  const preset = themePresets.find((item) => item.id === id)
  if (!preset) return false
  return Object.entries(preset.values).every(
    ([key, value]) => appearance[key as keyof Appearance] === value,
  )
}

const setHex = (key: 'brand' | 'accent' | 'success' | 'warning' | 'error', value: string) => {
  if (!isValidHex(value)) return
  appearance[key] = normalizeHex(value)
}

const copied = ref(false)
const showImport = ref(false)
const importPayload = ref('')
const importError = ref('')

const copyTheme = async () => {
  try {
    await navigator.clipboard.writeText(exportTheme())
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch {
    importError.value = 'Clipboard unavailable — copy from the paste box instead.'
    showImport.value = true
    importPayload.value = exportTheme()
  }
}

const runImport = () => {
  importError.value = importTheme(importPayload.value) ? '' : 'That is not a valid theme payload.'
  if (!importError.value) showImport.value = false
}
</script>
