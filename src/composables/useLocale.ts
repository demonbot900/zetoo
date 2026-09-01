import { computed, ref, watch } from 'vue'
import { baseMessages, messages, type MessageKey } from '@/locales/messages'
import { isRtl as codeIsRtl, languageByCode, languages, type Language } from '@/locales/languages'

const STORAGE_KEY = 'zetoo.locale.v1'
const FALLBACK = 'en-GB'

/** True when a message catalogue ships for this language. */
export const isTranslated = (code: string): boolean => code in messages

const detect = (): string => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && languages.some((language) => language.code === stored)) return stored
  } catch {
    // Storage blocked: fall through to the browser languages.
  }

  const candidates = typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? [])]
  for (const candidate of candidates) {
    const exact = languages.find((language) => language.code === candidate)
    if (exact) return exact.code
    const base = languages.find(
      (language) => language.code.split('-')[0] === candidate.split('-')[0],
    )
    if (base) return base.code
  }

  return FALLBACK
}

const locale = ref<string>(detect())

/**
 * Applies the locale to the document so screen readers and CSS see it too.
 * `dir` flips for Arabic, Hebrew, Persian, Urdu and the other RTL scripts,
 * which is what makes Tailwind's logical properties lay the app out mirrored.
 */
export const applyLocale = () => {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale.value
  document.documentElement.dir = codeIsRtl(locale.value) ? 'rtl' : 'ltr'
}

watch(
  locale,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // ignore
    }
    applyLocale()
  },
  { immediate: true },
)

export function useLocale() {
  const language = computed<Language>(() => languageByCode(locale.value))

  const catalogue = computed(() => messages[locale.value] ?? {})

  /**
   * Translates a key, falling back to English per key so a partially
   * translated language never shows a raw key.
   */
  const t = (key: MessageKey): string => catalogue.value[key] ?? baseMessages[key] ?? key

  const setLocale = (code: string) => {
    locale.value = languageByCode(code).code
  }

  /** Date formatting bound to the chosen language — works for every entry. */
  const d = (
    value: string | Date | null,
    options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
  ): string => {
    if (!value) return '—'
    const date = typeof value === 'string' ? new Date(`${value.slice(0, 10)}T00:00:00`) : value
    if (Number.isNaN(date.getTime())) return '—'
    try {
      return new Intl.DateTimeFormat(locale.value, options).format(date)
    } catch {
      return new Intl.DateTimeFormat(FALLBACK, options).format(date)
    }
  }

  const n = (value: number, options: Intl.NumberFormatOptions = {}): string => {
    try {
      return new Intl.NumberFormat(locale.value, options).format(value)
    } catch {
      return new Intl.NumberFormat(FALLBACK, options).format(value)
    }
  }

  return {
    locale,
    language,
    languages,
    isTranslated: computed(() => isTranslated(locale.value)),
    isRtl: computed(() => codeIsRtl(locale.value)),
    setLocale,
    t,
    d,
    n,
    applyLocale,
  }
}
